use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LinkSessionState {
    Idle,
    SocketConnecting,
    SocketReady,
    LinkRequesting,
    AwaitingDesktopApproval,
    P2PNegotiating,
    P2PConnected,
    TerminalAttached,
    // Failure states
    DesktopOffline,
    PermissionDenied,
    ApprovalRejected,
    P2PFailed,
    SessionExpired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkSession {
    pub session_id: Option<String>,
    pub desktop_device_id: Option<String>,
    pub workspace_id: Option<String>,
    pub window_id: Option<String>,
    pub terminal_id: Option<String>,
    pub mode: Option<String>,
    pub link_token: Option<String>,
    pub state: LinkSessionState,
}

impl LinkSession {
    pub fn new() -> Self {
        Self {
            session_id: None,
            desktop_device_id: None,
            workspace_id: None,
            window_id: None,
            terminal_id: None,
            mode: None,
            link_token: None,
            state: LinkSessionState::Idle,
        }
    }

    pub fn transition(&mut self, new_state: LinkSessionState) {
        self.state = new_state;
    }

    pub fn set_session(&mut self, session_id: String, desktop_device_id: String, mode: String) {
        self.session_id = Some(session_id);
        self.desktop_device_id = Some(desktop_device_id);
        self.mode = Some(mode);
    }

    pub fn set_approved(&mut self, link_token: String) {
        self.link_token = Some(link_token);
        self.state = LinkSessionState::P2PNegotiating;
    }

    pub fn set_rejected(&mut self) {
        self.state = LinkSessionState::ApprovalRejected;
    }

    pub fn set_target(&mut self, workspace_id: String, window_id: String, terminal_id: String) {
        self.workspace_id = Some(workspace_id);
        self.window_id = Some(window_id);
        self.terminal_id = Some(terminal_id);
    }

    pub fn reset(&mut self) {
        *self = Self::new();
    }
}
