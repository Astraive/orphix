use std::collections::HashMap;

/// RelayBridge tracks which terminal sessions are being relayed through
/// the link API (as opposed to direct WebRTC DataChannel).
pub struct RelayBridge {
    /// Maps terminal_id → relay session_id
    terminal_to_session: HashMap<String, String>,
    /// Maps relay session_id → terminal_id
    session_to_terminal: HashMap<String, String>,
}

impl RelayBridge {
    pub fn new() -> Self {
        Self {
            terminal_to_session: HashMap::new(),
            session_to_terminal: HashMap::new(),
        }
    }

    pub fn start_session(&mut self, session_id: &str, terminal_id: &str) {
        self.terminal_to_session
            .insert(terminal_id.to_string(), session_id.to_string());
        self.session_to_terminal
            .insert(session_id.to_string(), terminal_id.to_string());
    }

    pub fn stop_session(&mut self, session_id: &str) {
        if let Some(terminal_id) = self.session_to_terminal.remove(session_id) {
            self.terminal_to_session.remove(&terminal_id);
        }
    }

    pub fn get_session_for_terminal(&self, terminal_id: &str) -> Option<String> {
        self.terminal_to_session.get(terminal_id).cloned()
    }

    pub fn get_terminal_for_session(&self, session_id: &str) -> Option<String> {
        self.session_to_terminal.get(session_id).cloned()
    }

    pub fn is_active(&self) -> bool {
        !self.session_to_terminal.is_empty()
    }
}
