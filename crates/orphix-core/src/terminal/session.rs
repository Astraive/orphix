use std::path::PathBuf;
use std::sync::Arc;
use std::io::Write;
use std::thread;

use parking_lot::Mutex;

use crate::protocol::terminal::{TerminalKind, TerminalStatus, TerminalSessionInfo};
use super::ring_buffer::OutputRingBuffer;

pub struct TerminalSession {
    pub id: String,
    pub kind: TerminalKind,
    pub cwd: PathBuf,
    pub shell: String,
    pub label: String,
    pub cols: u16,
    pub rows: u16,
    pub status: TerminalStatus,
    pub child: Arc<Mutex<Box<dyn portable_pty::Child + Send>>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub master: Box<dyn portable_pty::MasterPty + Send>,
    pub reader_handle: Option<thread::JoinHandle<()>>,
    pub ring_buffer: Arc<OutputRingBuffer>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_activity_at: chrono::DateTime<chrono::Utc>,
}

impl TerminalSession {
    pub fn new(
        id: String,
        kind: TerminalKind,
        cwd: PathBuf,
        shell: String,
        label: String,
        cols: u16,
        rows: u16,
        child: Arc<Mutex<Box<dyn portable_pty::Child + Send>>>,
        writer: Arc<Mutex<Box<dyn Write + Send>>>,
        master: Box<dyn portable_pty::MasterPty + Send>,
    ) -> Self {
        let now = chrono::Utc::now();
        Self {
            id,
            kind,
            cwd,
            shell,
            label,
            cols,
            rows,
            status: TerminalStatus::Running,
            child,
            writer,
            master,
            reader_handle: None,
            ring_buffer: Arc::new(OutputRingBuffer::new()),
            created_at: now,
            last_activity_at: now,
        }
    }

    pub fn set_reader(&mut self, handle: thread::JoinHandle<()>) {
        self.reader_handle = Some(handle);
    }

    pub fn write_input(&self, data: &[u8]) -> Result<(), String> {
        let mut writer = self.writer.lock();
        writer
            .write_all(data)
            .map_err(|e| format!("Failed to write to PTY: {}", e))
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        super::pty::resize_pty(&*self.master, cols, rows)
    }

    pub fn kill_process(&self) {
        let mut child = self.child.lock();
        let _ = child.kill();
    }

    pub fn to_info(&self) -> TerminalSessionInfo {
        TerminalSessionInfo {
            id: self.id.clone(),
            kind: self.kind.clone(),
            cwd: self.cwd.to_string_lossy().to_string(),
            shell: self.label.clone(),
            cols: self.cols,
            rows: self.rows,
            status: self.status.clone(),
            created_at: self.created_at.to_rfc3339(),
            last_activity_at: self.last_activity_at.to_rfc3339(),
        }
    }
}
