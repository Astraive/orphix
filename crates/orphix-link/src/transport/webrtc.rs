use async_trait::async_trait;
use tokio::sync::mpsc;
use crate::protocol::LinkFrame;
use super::{LinkTransport, TransportError, TransportMode, TransportState};

/// WebRTC DataChannel transport.
/// Direct P2P connection between client and desktop.
/// Signaling goes through the Link API.
pub struct WebRtcTransport {
    state: TransportState,
    _session_id: String,
    // In production, these would be WebRTC DataChannel handles
    outbound_tx: Option<mpsc::Sender<LinkFrame>>,
    inbound_rx: Option<mpsc::Receiver<LinkFrame>>,
    seq_counter: u64,
}

impl WebRtcTransport {
    pub fn new(session_id: impl Into<String>) -> Self {
        Self {
            state: TransportState::Disconnected,
            _session_id: session_id.into(),
            outbound_tx: None,
            inbound_rx: None,
            seq_counter: 0,
        }
    }

    fn next_seq(&mut self) -> u64 {
        self.seq_counter += 1;
        self.seq_counter
    }

    /// Handle a WebRTC offer from the signaling channel
    pub async fn handle_offer(&mut self, _sdp: &str) -> Result<String, TransportError> {
        // TODO: Create RTCPeerConnection, set remote description, create answer
        // For now, return a stub answer
        self.state = TransportState::Connecting;
        Ok("v=0\r\n".to_string())
    }

    /// Handle a WebRTC answer from the signaling channel
    pub async fn handle_answer(&mut self, _sdp: &str) -> Result<(), TransportError> {
        // TODO: Set remote description
        Ok(())
    }

    /// Add an ICE candidate from the signaling channel
    pub async fn add_ice_candidate(&mut self, _candidate: &str) -> Result<(), TransportError> {
        // TODO: Add ICE candidate to peer connection
        Ok(())
    }
}

#[async_trait]
impl LinkTransport for WebRtcTransport {
    async fn connect(&mut self) -> Result<(), TransportError> {
        self.state = TransportState::Connecting;

        // TODO: Initialize WebRTC peer connection
        // 1. Create RTCPeerConnection with STUN/TURN config
        // 2. Create DataChannel
        // 3. Create offer
        // 4. Send offer through signaling (Link API)
        // 5. Wait for answer
        // 6. Set remote description
        // 7. Wait for DataChannel to open

        let (outbound_tx, _outbound_rx) = mpsc::channel(256);
        let (_inbound_tx, inbound_rx) = mpsc::channel(256);
        self.outbound_tx = Some(outbound_tx);
        self.inbound_rx = Some(inbound_rx);

        self.state = TransportState::Connected;
        Ok(())
    }

    async fn send(&mut self, frame: &LinkFrame) -> Result<(), TransportError> {
        if self.state != TransportState::Connected {
            return Err(TransportError::SendFailed("Not connected".into()));
        }

        let mut frame = frame.clone();
        frame.seq = self.next_seq();

        let tx = self.outbound_tx.as_ref()
            .ok_or_else(|| TransportError::SendFailed("No outbound channel".into()))?;

        tx.send(frame).await
            .map_err(|e| TransportError::SendFailed(e.to_string()))
    }

    async fn recv(&mut self) -> Result<LinkFrame, TransportError> {
        if self.state != TransportState::Connected {
            return Err(TransportError::RecvFailed("Not connected".into()));
        }

        let rx = self.inbound_rx.as_mut()
            .ok_or_else(|| TransportError::RecvFailed("No inbound channel".into()))?;

        rx.recv().await
            .ok_or(TransportError::Closed)
    }

    async fn close(&mut self) -> Result<(), TransportError> {
        self.state = TransportState::Disconnected;
        self.outbound_tx = None;
        self.inbound_rx = None;
        Ok(())
    }

    fn state(&self) -> TransportState {
        self.state
    }

    fn mode(&self) -> TransportMode {
        TransportMode::WebRtc
    }
}
