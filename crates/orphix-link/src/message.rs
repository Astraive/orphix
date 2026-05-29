use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum LinkMessage {
    // Server → Client (API sends camelCase)
    #[serde(rename = "challenge")]
    Challenge {
        nonce: String,
        #[serde(alias = "socketId")]
        socket_id: String,
    },

    #[serde(rename = "hello.ack")]
    HelloAck {
        #[serde(alias = "deviceId")]
        device_id: String,
        #[serde(alias = "socketId")]
        socket_id: String,
        status: String,
    },

    #[serde(rename = "hello.reject")]
    HelloReject { reason: String },

    #[serde(rename = "link.pending")]
    LinkPending {
        #[serde(alias = "sessionId")]
        session_id: String,
    },

    #[serde(rename = "link.approval_request")]
    LinkApprovalRequest {
        #[serde(alias = "sessionId")]
        session_id: String,
        #[serde(alias = "mobileDeviceName")]
        mobile_device_name: String,
        #[serde(alias = "mobileDeviceType")]
        mobile_device_type: String,
        #[serde(alias = "workspaceId")]
        workspace_id: Option<String>,
        #[serde(alias = "windowId")]
        window_id: Option<String>,
        #[serde(alias = "terminalId")]
        terminal_id: Option<String>,
        mode: String,
        #[serde(default, alias = "transportMode")]
        transport_mode: Option<String>,
        #[serde(default, alias = "requireE2ee")]
        require_e2ee: Option<bool>,
        #[serde(default, alias = "expiresIn")]
        expires_in: Option<u64>,
    },

    #[serde(rename = "link.approved")]
    LinkApproved {
        #[serde(alias = "sessionId")]
        session_id: String,
        #[serde(alias = "linkToken")]
        link_token: String,
    },

    #[serde(rename = "link.rejected")]
    LinkRejected {
        #[serde(alias = "sessionId")]
        session_id: String,
        reason: String,
    },

    #[serde(rename = "pong")]
    Pong { ts: i64 },

    // WebRTC signaling (forwarded — API sends camelCase)
    #[serde(rename = "webrtc.offer")]
    WebRTCOffer {
        #[serde(alias = "sessionId")]
        session_id: String,
        sdp: String,
    },

    #[serde(rename = "webrtc.answer")]
    WebRTCAnswer {
        #[serde(alias = "sessionId")]
        session_id: String,
        sdp: String,
    },

    #[serde(rename = "webrtc.ice")]
    WebRTCIce {
        #[serde(alias = "sessionId")]
        session_id: String,
        candidate: serde_json::Value,
    },

    // Client → Server (crate serializes as snake_case, API handles both)
    #[serde(rename = "desktop.hello")]
    DesktopHello {
        #[serde(alias = "deviceId")]
        device_id: String,
        #[serde(alias = "accessToken")]
        access_token: String,
        #[serde(alias = "deviceProof")]
        device_proof: DeviceProof,
    },

    #[serde(rename = "challenge.response")]
    ChallengeResponse {
        #[serde(alias = "deviceId")]
        device_id: String,
        #[serde(alias = "accessToken")]
        access_token: String,
        nonce: String,
        timestamp: i64,
        signature: String,
    },

    #[serde(rename = "mobile.hello")]
    MobileHello {
        #[serde(alias = "deviceId")]
        device_id: String,
        #[serde(alias = "accessToken")]
        access_token: String,
        #[serde(alias = "deviceProof")]
        device_proof: DeviceProof,
    },

    #[serde(rename = "link.request")]
    LinkRequest {
        #[serde(alias = "desktopDeviceId")]
        desktop_device_id: String,
        #[serde(alias = "workspaceId")]
        workspace_id: Option<String>,
        #[serde(alias = "windowId")]
        window_id: Option<String>,
        #[serde(alias = "terminalId")]
        terminal_id: Option<String>,
        mode: String,
    },

    #[serde(rename = "link.approve")]
    LinkApprove {
        #[serde(alias = "sessionId")]
        session_id: String,
        approved: bool,
    },

    #[serde(rename = "ping")]
    Ping { ts: i64 },

    // Relay transport
    #[serde(rename = "relay.start")]
    RelayStart {
        #[serde(alias = "sessionId")]
        session_id: String,
        #[serde(alias = "terminalId")]
        terminal_id: String,
        mode: String,
    },

    #[serde(rename = "relay.ready")]
    RelayReady {
        #[serde(alias = "sessionId")]
        session_id: String,
    },

    #[serde(rename = "relay.message")]
    RelayMessage {
        #[serde(alias = "sessionId")]
        session_id: String,
        #[serde(alias = "terminalId")]
        terminal_id: String,
        data: String,
        direction: String, // "input" or "output"
    },

    #[serde(rename = "relay.stop")]
    RelayStop {
        #[serde(alias = "sessionId")]
        session_id: String,
    },

    // Terminal management (from mobile/web → desktop)
    #[serde(rename = "terminal.create")]
    TerminalCreate {
        #[serde(alias = "sessionId")]
        session_id: Option<String>,
        #[serde(alias = "workspaceId")]
        workspace_id: Option<String>,
        #[serde(alias = "windowId")]
        window_id: Option<String>,
        cwd: Option<String>,
        shell: Option<String>,
    },

    // Workspace tree (desktop → mobile/web)
    #[serde(rename = "workspace.list")]
    WorkspaceList {
        workspaces: Vec<serde_json::Value>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceProof {
    pub nonce: String,
    pub signature: String,
}

// Terminal protocol messages (over P2P DataChannel)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum P2PMessage {
    #[serde(rename = "session.hello")]
    SessionHello {
        #[serde(alias = "sessionId")]
        session_id: String,
        #[serde(alias = "deviceId")]
        device_id: String,
        #[serde(alias = "linkToken")]
        link_token: String,
        nonce: String,
        signature: String,
    },

    #[serde(rename = "workspace.snapshot")]
    WorkspaceSnapshot { workspaces: Vec<serde_json::Value> },

    #[serde(rename = "terminal.attach")]
    TerminalAttach {
        #[serde(alias = "sessionId")]
        session_id: String,
        #[serde(alias = "workspaceId")]
        workspace_id: String,
        #[serde(alias = "windowId")]
        window_id: String,
        #[serde(alias = "terminalId")]
        terminal_id: String,
        mode: String,
        viewport: TerminalViewport,
    },

    #[serde(rename = "terminal.attached")]
    TerminalAttached {
        #[serde(alias = "terminalId")]
        terminal_id: String,
        status: String,
        title: String,
        cwd: String,
    },

    #[serde(rename = "terminal.output")]
    TerminalOutput {
        #[serde(alias = "terminalId")]
        terminal_id: String,
        seq: u64,
        data: String,
    },

    #[serde(rename = "terminal.input")]
    TerminalInput {
        #[serde(alias = "terminalId")]
        terminal_id: String,
        data: String,
    },

    #[serde(rename = "terminal.resize")]
    TerminalResize {
        #[serde(alias = "terminalId")]
        terminal_id: String,
        cols: u32,
        rows: u32,
    },

    #[serde(rename = "terminal.detach")]
    TerminalDetach {
        #[serde(alias = "terminalId")]
        terminal_id: String,
    },

    #[serde(rename = "session.ping")]
    SessionPing {
        #[serde(alias = "sessionId")]
        session_id: String,
        seq: u64,
    },

    #[serde(rename = "session.pong")]
    SessionPong {
        #[serde(alias = "sessionId")]
        session_id: String,
        seq: u64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalViewport {
    pub cols: u32,
    pub rows: u32,
}
