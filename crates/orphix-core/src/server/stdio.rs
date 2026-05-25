use std::io::{self, BufRead, Write};
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::mpsc;

use crate::protocol::CreateTerminalRequest;
use crate::terminal::events::CoreEvent;
use crate::terminal::manager::TerminalManager;
use crate::terminal::shell;

#[derive(Debug, Deserialize)]
struct Request {
    id: Value,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Debug, Serialize)]
struct Response {
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct EventMessage {
    event: String,
    data: Value,
}

pub fn run() {
    let (event_tx, mut event_rx) = mpsc::unbounded_channel::<CoreEvent>();

    let manager = Arc::new(Mutex::new(TerminalManager::new(event_tx)));

    let stdout = io::stdout();
    let stdout_lock = Arc::new(Mutex::new(stdout));

    // Spawn event writer thread
    let stdout_clone = stdout_lock.clone();
    let event_thread = std::thread::spawn(move || {
        while let Some(event) = event_rx.blocking_recv() {
            let (event_name, data) = match &event {
                CoreEvent::Output(chunk) => (
                    "terminal.output".to_string(),
                    serde_json::to_value(chunk).unwrap_or(Value::Null),
                ),
                CoreEvent::Exit {
                    session_id,
                    exit_code,
                } => {
                    let data = serde_json::json!({
                        "session_id": session_id,
                        "exit_code": exit_code,
                    });
                    ("terminal.exit".to_string(), data)
                }
                CoreEvent::State {
                    session_id,
                    status,
                } => {
                    let data = serde_json::json!({
                        "session_id": session_id,
                        "status": status,
                    });
                    ("terminal.state".to_string(), data)
                }
                CoreEvent::Error {
                    session_id,
                    error,
                } => {
                    let data = serde_json::json!({
                        "session_id": session_id,
                        "error": error,
                    });
                    ("terminal.error".to_string(), data)
                }
            };

            let msg = EventMessage {
                event: event_name,
                data,
            };
            if let Ok(json) = serde_json::to_string(&msg) {
                let mut out = stdout_clone.lock();
                let _ = writeln!(out, "{}", json);
                let _ = out.flush();
            }
        }
    });

    // Read requests from stdin
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        if line.trim().is_empty() {
            continue;
        }

        let request: Request = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                let resp = Response {
                    id: Value::from(0),
                    result: None,
                    error: Some(format!("Invalid request: {e}")),
                };
                write_response(&stdout_lock, &resp);
                continue;
            }
        };

        eprintln!("[core] recv: {} params={}", request.method, request.params);
        let response = dispatch(&manager, &request);
        if let Some(ref err) = response.error {
            eprintln!("[core] error: {} -> {}", request.method, err);
        }
        write_response(&stdout_lock, &response);
    }

    // Cleanup
    drop(manager);
    let _ = event_thread.join();
}

fn write_response(stdout: &Arc<Mutex<io::Stdout>>, resp: &Response) {
    if let Ok(json) = serde_json::to_string(resp) {
        let mut out = stdout.lock();
        let _ = writeln!(out, "{}", json);
        let _ = out.flush();
    }
}

fn dispatch(manager: &Arc<Mutex<TerminalManager>>, req: &Request) -> Response {
    let result = handle_method(manager, &req.method, &req.params);
    match result {
        Ok(value) => Response {
            id: req.id.clone(),
            result: Some(value),
            error: None,
        },
        Err(e) => Response {
            id: req.id.clone(),
            result: None,
            error: Some(e),
        },
    }
}

fn handle_method(
    manager: &Arc<Mutex<TerminalManager>>,
    method: &str,
    params: &Value,
) -> Result<Value, String> {
    match method {
        "terminal.create" => {
            let request: CreateTerminalRequest = serde_json::from_value(params.clone())
                .map_err(|e| format!("Invalid params: {e}"))?;
            let info = manager.lock().create(request)?;
            serde_json::to_value(&info).map_err(|e| format!("Serialize error: {e}"))
        }
        "terminal.write" => {
            let session_id = params
                .get("session_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing session_id")?;
            let data = params
                .get("data")
                .and_then(|v| v.as_str())
                .ok_or("Missing data")?;
            manager.lock().write(session_id, data)?;
            Ok(Value::Null)
        }
        "terminal.resize" => {
            let session_id = params
                .get("session_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing session_id")?;
            let cols = params
                .get("cols")
                .and_then(|v| v.as_u64())
                .ok_or("Missing cols")? as u16;
            let rows = params
                .get("rows")
                .and_then(|v| v.as_u64())
                .ok_or("Missing rows")? as u16;
            manager.lock().resize(session_id, cols, rows)?;
            Ok(Value::Null)
        }
        "terminal.kill" => {
            let session_id = params
                .get("session_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing session_id")?;
            manager.lock().kill(session_id)?;
            Ok(Value::Null)
        }
        "terminal.list" => {
            let list = manager.lock().list();
            serde_json::to_value(&list).map_err(|e| format!("Serialize error: {e}"))
        }
        "terminal.attach" => {
            let session_id = params
                .get("session_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing session_id")?;
            let snap = manager.lock().attach(session_id)?;
            serde_json::to_value(&snap).map_err(|e| format!("Serialize error: {e}"))
        }
        "terminal.output_range" => {
            let session_id = params
                .get("session_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing session_id")?;
            let from_seq = params
                .get("from_seq")
                .and_then(|v| v.as_u64())
                .ok_or("Missing from_seq")?;
            let to_seq = params
                .get("to_seq")
                .and_then(|v| v.as_u64())
                .ok_or("Missing to_seq")?;
            let chunks = manager.lock().output_range(session_id, from_seq, to_seq)?;
            serde_json::to_value(&chunks).map_err(|e| format!("Serialize error: {e}"))
        }
        "terminal.list_shells" => {
            let shells = shell::list_available_shells();
            let dtos: Vec<crate::protocol::ShellInfoDto> = shells
                .into_iter()
                .map(|s| crate::protocol::ShellInfoDto {
                    program: s.program,
                    args: s.args,
                    label: s.label,
                })
                .collect();
            serde_json::to_value(&dtos).map_err(|e| format!("Serialize error: {e}"))
        }
        "system.home_dir" => {
            let home = shell::default_cwd();
            Ok(Value::String(home.to_string_lossy().to_string()))
        }
        _ => Err(format!("Unknown method: {method}")),
    }
}
