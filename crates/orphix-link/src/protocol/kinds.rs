use serde::{Deserialize, Serialize};

/// All frame kinds in the Orphix link protocol.
/// Organized by category: session, transport, terminal, file, rpc.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum FrameKind {
    // Session lifecycle
    #[serde(rename = "session.hello")]
    SessionHello,
    #[serde(rename = "session.resume")]
    SessionResume,
    #[serde(rename = "session.heartbeat")]
    SessionHeartbeat,
    #[serde(rename = "session.close")]
    SessionClose,

    // Transport signaling (goes through Link API)
    #[serde(rename = "transport.webrtc.offer")]
    TransportWebrtcOffer,
    #[serde(rename = "transport.webrtc.answer")]
    TransportWebrtcAnswer,
    #[serde(rename = "transport.webrtc.ice")]
    TransportWebrtcIce,
    #[serde(rename = "transport.fallback.begin")]
    TransportFallbackBegin,

    // Terminal I/O
    #[serde(rename = "terminal.create")]
    TerminalCreate,
    #[serde(rename = "terminal.stdin")]
    TerminalStdin,
    #[serde(rename = "terminal.stdout")]
    TerminalStdout,
    #[serde(rename = "terminal.resize")]
    TerminalResize,
    #[serde(rename = "terminal.exit")]
    TerminalExit,

    // File operations
    #[serde(rename = "file.read")]
    FileRead,
    #[serde(rename = "file.write")]
    FileWrite,
    #[serde(rename = "file.chunk")]
    FileChunk,
    #[serde(rename = "file.done")]
    FileDone,

    // RPC
    #[serde(rename = "rpc.request")]
    RpcRequest,
    #[serde(rename = "rpc.response")]
    RpcResponse,
    #[serde(rename = "rpc.error")]
    RpcError,
}

impl FrameKind {
    /// Whether this frame kind is transport signaling (should go through Link API)
    pub fn is_signaling(&self) -> bool {
        matches!(
            self,
            Self::TransportWebrtcOffer
                | Self::TransportWebrtcAnswer
                | Self::TransportWebrtcIce
                | Self::TransportFallbackBegin
        )
    }

    /// Whether this frame kind is a session lifecycle event
    pub fn is_session(&self) -> bool {
        matches!(
            self,
            Self::SessionHello | Self::SessionResume | Self::SessionHeartbeat | Self::SessionClose
        )
    }

    /// Whether this frame kind carries terminal data
    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            Self::TerminalCreate
                | Self::TerminalStdin
                | Self::TerminalStdout
                | Self::TerminalResize
                | Self::TerminalExit
        )
    }
}
