pub mod websocket;
pub mod crypto;
pub mod encrypted;
pub mod webrtc;
pub mod auto;

use async_trait::async_trait;
use crate::protocol::LinkFrame;

/// Transport mode selection
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransportMode {
    /// WebSocket relay through Link API (encrypted)
    WebSocket,
    /// Direct WebRTC DataChannel (P2P)
    WebRtc,
    /// Auto: WebSocket first, upgrade to WebRTC, fallback to WebSocket
    Auto,
    /// Local LAN direct connection
    Local,
}

impl Default for TransportMode {
    fn default() -> Self {
        Self::Auto
    }
}

/// Transport connection state
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransportState {
    Disconnected,
    Connecting,
    Connected,
    Upgrading, // Migrating from relay to P2P
    Failed,
}

/// Common transport trait for all link transports.
/// Implementations: WebSocketRelayTransport, WebRtcDataChannelTransport, AutoTransport
#[async_trait]
pub trait LinkTransport: Send + Sync {
    /// Connect to the remote peer
    async fn connect(&mut self) -> Result<(), TransportError>;

    /// Send a frame to the remote peer
    async fn send(&mut self, frame: &LinkFrame) -> Result<(), TransportError>;

    /// Receive a frame from the remote peer
    async fn recv(&mut self) -> Result<LinkFrame, TransportError>;

    /// Close the transport connection
    async fn close(&mut self) -> Result<(), TransportError>;

    /// Get current transport state
    fn state(&self) -> TransportState;

    /// Get transport mode
    fn mode(&self) -> TransportMode;

    /// Whether this transport supports upgrading to a better mode
    fn can_upgrade(&self) -> bool {
        false
    }
}

/// Transport error types
#[derive(Debug, Clone)]
pub enum TransportError {
    ConnectionFailed(String),
    SendFailed(String),
    RecvFailed(String),
    Closed,
    Timeout,
    Protocol(String),
}

impl std::fmt::Display for TransportError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ConnectionFailed(msg) => write!(f, "Connection failed: {}", msg),
            Self::SendFailed(msg) => write!(f, "Send failed: {}", msg),
            Self::RecvFailed(msg) => write!(f, "Recv failed: {}", msg),
            Self::Closed => write!(f, "Transport closed"),
            Self::Timeout => write!(f, "Transport timeout"),
            Self::Protocol(msg) => write!(f, "Protocol error: {}", msg),
        }
    }
}

impl std::error::Error for TransportError {}
