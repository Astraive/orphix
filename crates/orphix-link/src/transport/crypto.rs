use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305, Nonce,
};
use hkdf::Hkdf;
use rand::rngs::OsRng;
use sha2::Sha256;
use x25519_dalek::{EphemeralSecret, PublicKey, SharedSecret};

/// E2EE session keys for a link session.
/// Derived from X25519 key exchange between client and desktop.
pub struct SessionKeys {
    pub our_public: Vec<u8>,
    secret: Option<EphemeralSecret>,
    shared: Option<SharedSecret>,
    encryption_key: Option<[u8; 32]>,
}

impl SessionKeys {
    /// Generate a new ephemeral keypair for key exchange
    pub fn generate() -> Self {
        let secret = EphemeralSecret::random_from_rng(OsRng);
        let public = PublicKey::from(&secret);
        Self {
            our_public: public.as_bytes().to_vec(),
            secret: Some(secret),
            shared: None,
            encryption_key: None,
        }
    }

    /// Complete the key exchange by computing the shared secret
    /// `peer_public` is the other side's public key (32 bytes)
    pub fn complete_exchange(&mut self, peer_public: &[u8]) -> Result<(), CryptoError> {
        let secret = self.secret.take()
            .ok_or(CryptoError::AlreadyCompleted)?;

        let peer_array: [u8; 32] = peer_public.try_into()
            .map_err(|_| CryptoError::InvalidPublicKey)?;

        let peer_key = PublicKey::from(peer_array);
        let shared = secret.diffie_hellman(&peer_key);

        self.shared = Some(shared);
        Ok(())
    }

    /// Derive the encryption key from the shared secret.
    /// Uses HKDF-SHA256 with session_id as salt.
    pub fn derive_key(&mut self, session_id: &str) -> Result<(), CryptoError> {
        self.derive_key_with_nonce(session_id, "")
    }

    /// Derive the encryption key from the shared secret and approval nonce.
    /// Salt is session_id + approval_nonce, matching the Link protocol.
    pub fn derive_key_with_nonce(&mut self, session_id: &str, approval_nonce: &str) -> Result<(), CryptoError> {
        let shared = self.shared.as_ref()
            .ok_or(CryptoError::ExchangeNotComplete)?;

        let salt = format!("{}{}", session_id, approval_nonce);
        let hk = Hkdf::<Sha256>::new(
            Some(salt.as_bytes()),
            shared.as_bytes(),
        );

        let mut key = [0u8; 32];
        hk.expand(b"orphix-link-v1", &mut key)
            .map_err(|e| CryptoError::KeyDerivation(e.to_string()))?;

        self.encryption_key = Some(key);
        Ok(())
    }

    /// Encrypt a payload using ChaCha20-Poly1305
    /// Returns nonce (12 bytes) + ciphertext + tag
    pub fn encrypt(&self, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>, CryptoError> {
        let key = self.encryption_key
            .ok_or(CryptoError::KeyNotDerived)?;

        let cipher = ChaCha20Poly1305::new_from_slice(&key)
            .map_err(|e| CryptoError::Encryption(e.to_string()))?;

        // Generate random nonce
        let mut nonce_bytes = [0u8; 12];
        rand::RngCore::fill_bytes(&mut rand::rngs::OsRng, &mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        use chacha20poly1305::aead::Payload;
        let payload = Payload {
            msg: plaintext,
            aad,
        };

        let ciphertext = cipher.encrypt(nonce, payload)
            .map_err(|e| CryptoError::Encryption(e.to_string()))?;

        let mut result = Vec::with_capacity(12 + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    /// Decrypt a payload using ChaCha20-Poly1305
    /// Input: nonce (12 bytes) + ciphertext + tag
    pub fn decrypt(&self, data: &[u8], aad: &[u8]) -> Result<Vec<u8>, CryptoError> {
        let key = self.encryption_key
            .ok_or(CryptoError::KeyNotDerived)?;

        if data.len() < 12 {
            return Err(CryptoError::Decryption("Data too short".into()));
        }

        let (nonce_bytes, ciphertext) = data.split_at(12);

        let cipher = ChaCha20Poly1305::new_from_slice(&key)
            .map_err(|e| CryptoError::Decryption(e.to_string()))?;

        let nonce = Nonce::from_slice(nonce_bytes);

        use chacha20poly1305::aead::Payload;
        let payload = Payload {
            msg: ciphertext,
            aad,
        };

        cipher.decrypt(nonce, payload)
            .map_err(|e| CryptoError::Decryption(e.to_string()))
    }

    /// Check if the key exchange is complete
    pub fn is_ready(&self) -> bool {
        self.encryption_key.is_some()
    }
}

/// E2EE handshake message for the link protocol
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct HandshakeMessage {
    pub session_id: String,
    pub public_key: Vec<u8>,
    pub device_id: String,
    pub nonce: u64,
}

#[derive(Debug, Clone)]
pub enum CryptoError {
    InvalidPublicKey,
    AlreadyCompleted,
    ExchangeNotComplete,
    KeyNotDerived,
    KeyDerivation(String),
    Encryption(String),
    Decryption(String),
}

impl std::fmt::Display for CryptoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidPublicKey => write!(f, "Invalid public key"),
            Self::AlreadyCompleted => write!(f, "Key exchange already completed"),
            Self::ExchangeNotComplete => write!(f, "Key exchange not complete"),
            Self::KeyNotDerived => write!(f, "Encryption key not derived"),
            Self::KeyDerivation(msg) => write!(f, "Key derivation failed: {}", msg),
            Self::Encryption(msg) => write!(f, "Encryption failed: {}", msg),
            Self::Decryption(msg) => write!(f, "Decryption failed: {}", msg),
        }
    }
}

impl std::error::Error for CryptoError {}
