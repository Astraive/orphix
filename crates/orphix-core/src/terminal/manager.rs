use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use tokio::sync::mpsc::UnboundedSender;
use uuid::Uuid;

use crate::protocol::terminal::{
    AttachSnapshot, CreateTerminalRequest, TerminalKind, TerminalOutputChunk, TerminalSessionInfo,
};

use super::events::CoreEvent;
use super::output::spawn_output_reader;
use super::pty::create_pty;
use super::session::TerminalSession;
use super::shell;

pub struct TerminalManager {
    sessions: HashMap<String, Arc<Mutex<TerminalSession>>>,
    event_tx: UnboundedSender<CoreEvent>,
}

impl TerminalManager {
    pub fn new(event_tx: UnboundedSender<CoreEvent>) -> Self {
        Self {
            sessions: HashMap::new(),
            event_tx,
        }
    }

    pub fn create(
        &mut self,
        request: CreateTerminalRequest,
    ) -> Result<TerminalSessionInfo, String> {
        let id = Uuid::new_v4().to_string();
        let kind = request.kind.unwrap_or(TerminalKind::Shell);
        let cols = request.cols.unwrap_or(120);
        let rows = request.rows.unwrap_or(30);

        let shell_info = shell::detect_default_shell();
        let cwd = request
            .cwd
            .map(std::path::PathBuf::from)
            .unwrap_or_else(shell::default_cwd);

        let pty_handle = create_pty(&shell_info, &cwd, cols, rows)?;

        let reader = pty_handle.reader;

        let mut session = TerminalSession::new(
            id.clone(),
            kind,
            cwd,
            shell_info.program,
            shell_info.label,
            cols,
            rows,
            pty_handle.child,
            pty_handle.writer,
            pty_handle.master,
        );

        let session_id = id.clone();
        let ring_buffer = session.ring_buffer.clone();
        let event_tx = self.event_tx.clone();
        let handle = spawn_output_reader(session_id, reader, ring_buffer, event_tx);
        session.set_reader(handle);

        let session = Arc::new(Mutex::new(session));
        let info = session.lock().to_info();
        self.sessions.insert(id, session);

        Ok(info)
    }

    pub fn write(&self, session_id: &str, data: &str) -> Result<(), String> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| format!("Session not found: {session_id}"))?;
        session.lock().write_input(data.as_bytes())
    }

    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| format!("Session not found: {session_id}"))?;
        session.lock().resize(cols, rows)
    }

    pub fn kill(&mut self, session_id: &str) -> Result<(), String> {
        if let Some(session) = self.sessions.remove(session_id) {
            let session = session.lock();
            session.kill_process();
            let _ = self.event_tx.send(CoreEvent::Exit {
                session_id: session_id.to_string(),
                exit_code: None,
            });
            Ok(())
        } else {
            Err(format!("Session not found: {session_id}"))
        }
    }

    pub fn list(&self) -> Vec<TerminalSessionInfo> {
        self.sessions.values().map(|s| s.lock().to_info()).collect()
    }

    pub fn attach(&self, session_id: &str) -> Result<AttachSnapshot, String> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| format!("Session not found: {session_id}"))?;

        let session = session.lock();
        let ring = session.ring_buffer.clone();
        let recent = ring.recent(500);
        let latest_seq = ring.latest_seq();

        Ok(AttachSnapshot {
            session: session.to_info(),
            from_seq: 0,
            latest_seq,
            recent_chunks: recent,
        })
    }

    pub fn output_range(
        &self,
        session_id: &str,
        from_seq: u64,
        to_seq: u64,
    ) -> Result<Vec<TerminalOutputChunk>, String> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| format!("Session not found: {session_id}"))?;

        let session = session.lock();
        let ring = session.ring_buffer.clone();
        Ok(ring.range(from_seq, to_seq))
    }
}
