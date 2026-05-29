use async_trait::async_trait;
use crate::protocol::LinkFrame;
use super::{LinkTransport, TransportError, TransportMode, TransportState};
use super::crypto::SessionKeys;

/// Encrypted transport wrapper.
/// Wraps any transport with E2EE using ChaCha20-Poly1305.
/// The inner transport sees only ciphertext.
pub struct EncryptedTransport {
    inner: Box<dyn LinkTransport>,
    keys: SessionKeys,
    session_id: String,
    handshake_complete: bool,
}

impl EncryptedTransport {
    pub fn new(inner: Box<dyn LinkTransport>, session_id: impl Into<String>) -> Self {
        Self {
            inner,
            keys: SessionKeys::generate(),
            session_id: session_id.into(),
            handshake_complete: false,
        }
    }

    /// Get our public key for the handshake
    pub fn our_public_key(&self) -> &[u8] {
        &self.keys.our_public
    }

    /// Complete the handshake with the peer's public key
    pub fn complete_handshake(&mut self, peer_public: &[u8]) -> Result<(), TransportError> {
        self.keys.complete_exchange(peer_public)
            .map_err(|e| TransportError::Protocol(e.to_string()))?;
        self.keys.derive_key(&self.session_id)
            .map_err(|e| TransportError::Protocol(e.to_string()))?;
        self.handshake_complete = true;
        Ok(())
    }

    /// Build AAD (Additional Authenticated Data) for a frame
    /// This prevents tampering even if the server can't decrypt
    fn build_aad(frame: &LinkFrame) -> Vec<u8> {
        format!("{}|{}|{}|{}|{}|{}|{}",
            frame.v,
            frame.session_id,
            frame.stream_id,
            frame.seq,
            frame.from_peer,
            frame.to_peer,
            serde_json::to_string(&frame.kind).unwrap_or_default(),
        ).into_bytes()
    }
}

#[async_trait]
impl LinkTransport for EncryptedTransport {
    async fn connect(&mut self) -> Result<(), TransportError> {
        self.inner.connect().await
    }

    async fn send(&mut self, frame: &LinkFrame) -> Result<(), TransportError> {
        if !self.handshake_complete {
            // During handshake, send frames unencrypted
            return self.inner.send(frame).await;
        }

        // Encrypt the payload
        let payload_bytes = serde_json::to_vec(&frame.payload)
            .map_err(|e| TransportError::SendFailed(e.to_string()))?;

        let aad = Self::build_aad(frame);
        let encrypted = self.keys.encrypt(&payload_bytes, &aad)
            .map_err(|e| TransportError::SendFailed(e.to_string()))?;

        // Create encrypted frame
        let mut enc_frame = frame.clone();
        enc_frame.payload = serde_json::Value::String(
            base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &encrypted)
        );
        enc_frame.flags.encrypted = true;

        self.inner.send(&enc_frame).await
    }

    async fn recv(&mut self) -> Result<LinkFrame, TransportError> {
        let frame = self.inner.recv().await?;

        if !self.handshake_complete || !frame.flags.encrypted {
            return Ok(frame);
        }

        // Decrypt the payload
        let encrypted_b64 = frame.payload.as_str()
            .ok_or_else(|| TransportError::Protocol("Encrypted frame missing payload".into()))?;

        let encrypted = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            encrypted_b64,
        ).map_err(|e| TransportError::Protocol(e.to_string()))?;

        let aad = Self::build_aad(&frame);
        let plaintext = self.keys.decrypt(&encrypted, &aad)
            .map_err(|e| TransportError::RecvFailed(e.to_string()))?;

        let payload: serde_json::Value = serde_json::from_slice(&plaintext)
            .map_err(|e| TransportError::Protocol(e.to_string()))?;

        let mut dec_frame = frame;
        dec_frame.payload = payload;
        dec_frame.flags.encrypted = false;

        Ok(dec_frame)
    }

    async fn close(&mut self) -> Result<(), TransportError> {
        self.inner.close().await
    }

    fn state(&self) -> TransportState {
        self.inner.state()
    }

    fn mode(&self) -> TransportMode {
        self.inner.mode()
    }

    fn can_upgrade(&self) -> bool {
        self.inner.can_upgrade()
    }
}
