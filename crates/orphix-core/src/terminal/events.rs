use serde::Serialize;

use crate::protocol::TerminalOutputChunk;

pub const EVENT_OUTPUT: &str = "terminal.output";
pub const EVENT_STATE: &str = "terminal.state";
pub const EVENT_EXIT: &str = "terminal.exit";
pub const EVENT_ERROR: &str = "terminal.error";

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum CoreEvent {
    #[serde(rename = "terminal.output")]
    Output(TerminalOutputChunk),
    #[serde(rename = "terminal.exit")]
    Exit {
        session_id: String,
        exit_code: Option<i32>,
    },
    #[serde(rename = "terminal.state")]
    State {
        session_id: String,
        status: String,
        cwd: Option<String>,
        shell: Option<String>,
        cols: Option<u16>,
        rows: Option<u16>,
    },
    #[serde(rename = "terminal.error")]
    Error { session_id: String, error: String },

    // Link events
    #[serde(rename = "link.state")]
    LinkState { state: String, device_id: Option<String> },

    #[serde(rename = "link.approval")]
    LinkApproval {
        session_id: String,
        mobile_device_name: String,
        mobile_device_type: String,
        workspace_id: Option<String>,
        window_id: Option<String>,
        terminal_id: Option<String>,
        mode: String,
        transport_mode: Option<String>,
        require_e2ee: Option<bool>,
        expires_in: Option<u64>,
    },

    #[serde(rename = "link.webrtc")]
    LinkWebRTC {
        signal_type: String,
        session_id: String,
        sdp: Option<String>,
        candidate: Option<serde_json::Value>,
    },

    #[serde(rename = "link.relay.ready")]
    LinkRelayReady { session_id: String },

    #[serde(rename = "link.browser_rpc")]
    LinkBrowserRpc {
        terminal_id: String,
        request: serde_json::Value,
    },

    #[serde(rename = "link.error")]
    LinkError { error: String },
}

#[derive(Debug, Clone, Serialize)]
pub struct TerminalStatePayload {
    pub session_id: String,
    pub status: String,
    pub cwd: Option<String>,
    pub shell: Option<String>,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TerminalExitPayload {
    pub session_id: String,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TerminalErrorPayload {
    pub session_id: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TerminalOutputEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: TerminalOutputChunk,
}

#[derive(Debug, Clone, Serialize)]
pub struct TerminalExitEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: TerminalExitPayload,
}

#[derive(Debug, Clone, Serialize)]
pub struct TerminalStateEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: TerminalStatePayload,
}

#[derive(Debug, Clone, Serialize)]
pub struct TerminalErrorEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: TerminalErrorPayload,
}
