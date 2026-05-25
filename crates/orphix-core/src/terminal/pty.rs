use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::Mutex;

use super::shell::ShellInfo;

pub struct PtyHandle {
    pub master: Box<dyn MasterPty + Send>,
    pub child: Arc<Mutex<Box<dyn Child + Send>>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub reader: Box<dyn Read + Send>,
}

pub fn create_pty(
    shell: &ShellInfo,
    cwd: &PathBuf,
    cols: u16,
    rows: u16,
) -> Result<PtyHandle, String> {
    let pty_system = native_pty_system();

    let pty_size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pty_pair = pty_system
        .openpty(pty_size)
        .map_err(|e| format!("Failed to open PTY: {e}"))?;

    let mut cmd = CommandBuilder::new(&shell.program);
    for arg in &shell.args {
        cmd.arg(arg);
    }
    cmd.cwd(cwd);

    cmd.env("TERM", "xterm-256color");

    let child = pty_pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell '{}': {e}", shell.program))?;

    let writer = pty_pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {e}"))?;

    let reader = pty_pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get PTY reader: {e}"))?;

    Ok(PtyHandle {
        master: pty_pair.master,
        child: Arc::new(Mutex::new(child)),
        writer: Arc::new(Mutex::new(writer)),
        reader,
    })
}

pub fn resize_pty(master: &dyn MasterPty, cols: u16, rows: u16) -> Result<(), String> {
    master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to resize PTY: {e}"))
}
