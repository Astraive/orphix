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
    },
    #[serde(rename = "terminal.error")]
    Error {
        session_id: String,
        error: String,
    },
}

#[derive(Debug, Clone, Serialize)]
pub struct TerminalStatePayload {
    pub session_id: String,
    pub status: String,
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
