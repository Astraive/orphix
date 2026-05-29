use serde::{Deserialize, Serialize};
use super::kinds::FrameKind;

/// Unified frame protocol for all transports (WebSocket relay, WebRTC DataChannel).
/// Every message between client and desktop uses this format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkFrame {
    /// Protocol version
    pub v: u8,
    /// Session ID
    pub session_id: String,
    /// Stream ID (e.g., terminal ID, file handle)
    #[serde(default)]
    pub stream_id: String,
    /// Sequence number for ordering and replay protection
    pub seq: u64,
    /// Frame kind
    pub kind: FrameKind,
    /// Sending peer/device id
    #[serde(default)]
    pub from_peer: String,
    /// Target peer/device id
    #[serde(default)]
    pub to_peer: String,
    /// Frame flags
    #[serde(default)]
    pub flags: FrameFlags,
    /// Stable relay metadata. The Link API may inspect this, but never payload.
    #[serde(default)]
    pub relay: Option<RelayMetadata>,
    /// Payload (plaintext or encrypted base64)
    #[serde(default)]
    pub payload: serde_json::Value,
}

/// Frame flags for encryption and compression
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FrameFlags {
    #[serde(default)]
    pub encrypted: bool,
    #[serde(default)]
    pub compressed: bool,
}

/// Relay-visible metadata for routing/status only.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RelayMetadata {
    #[serde(default)]
    pub active_transport: Option<String>,
    #[serde(default)]
    pub requested_mode: Option<String>,
    #[serde(default)]
    pub packet_size: Option<usize>,
}

impl LinkFrame {
    pub fn new(kind: FrameKind, session_id: impl Into<String>, payload: serde_json::Value) -> Self {
        Self {
            v: 1,
            session_id: session_id.into(),
            stream_id: String::new(),
            seq: 0,
            kind,
            from_peer: String::new(),
            to_peer: String::new(),
            flags: FrameFlags::default(),
            relay: None,
            payload,
        }
    }

    pub fn with_stream(mut self, stream_id: impl Into<String>) -> Self {
        self.stream_id = stream_id.into();
        self
    }

    pub fn with_seq(mut self, seq: u64) -> Self {
        self.seq = seq;
        self
    }

    pub fn with_peers(mut self, from_peer: impl Into<String>, to_peer: impl Into<String>) -> Self {
        self.from_peer = from_peer.into();
        self.to_peer = to_peer.into();
        self
    }

    pub fn with_relay_metadata(mut self, relay: RelayMetadata) -> Self {
        self.relay = Some(relay);
        self
    }

    pub fn with_encrypted(mut self, encrypted: bool) -> Self {
        self.flags.encrypted = encrypted;
        self
    }

    /// Serialize to JSON bytes for transport
    pub fn to_bytes(&self) -> Vec<u8> {
        serde_json::to_vec(self).unwrap_or_default()
    }

    /// Deserialize from JSON bytes
    pub fn from_bytes(data: &[u8]) -> Result<Self, serde_json::Error> {
        serde_json::from_slice(data)
    }
}
