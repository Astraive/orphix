use std::io::{self, BufRead, Write};
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::mpsc;

use crate::link::{LinkManager, EnableParams};
use crate::protocol::CreateTerminalRequest;
use crate::terminal::events::CoreEvent;
use crate::terminal::manager::TerminalManager;
use crate::terminal::shell;
use orphix_link::message::WorkspaceSnapshotEnvelope;

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

    let terminal_manager = Arc::new(Mutex::new(TerminalManager::new(event_tx.clone())));
    let link_manager = Arc::new(Mutex::new(LinkManager::new(event_tx.clone(), terminal_manager.clone())));

    // Get relay output sender for forwarding PTY output to the relay bridge
    let relay_output_tx = {
        let lock = link_manager.lock();
        lock.relay_output_sender()
    };

    // Create a shared tokio runtime for async link operations
    let link_rt = tokio::runtime::Runtime::new().expect("Failed to create link tokio runtime");
    let link_rt_handle = link_rt.handle().clone();

    // Spawn background thread for link processing + reconnect
    {
        let lm = link_manager.clone();
        let handle = link_rt.handle().clone();
        std::thread::spawn(move || {
            let handle_for_spawn = handle.clone();
            handle.block_on(async move {
                let mut last_ping = std::time::Instant::now();
                const PING_INTERVAL: std::time::Duration = std::time::Duration::from_secs(30);
                loop {
                    let needs_reconnect = {
                        let mut lock = lm.lock();
                        let _ = lock.process_inbound();

                        // Send periodic ping to keep WS alive through NAT/proxies
                        if last_ping.elapsed() >= PING_INTERVAL {
                            lock.send_ping();
                            last_ping = std::time::Instant::now();
                        }

                        // Check if WS disconnected and we should reconnect
                        if !lock.is_ws_alive() && lock.should_reconnect() {
                            lock.clear_outbound();
                            true
                        } else {
                            false
                        }
                    };

                    if needs_reconnect {
                        let delay = {
                            let mut lock = lm.lock();
                            lock.next_reconnect_delay()
                        };

                        if let Some(delay_ms) = delay {
                            eprintln!("[link] Reconnecting in {}ms...", delay_ms);
                            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;

                            // Phase 1 (sync): prepare — hold lock briefly
                            let prepared = {
                                let params = {
                                    let lock = lm.lock();
                                    lock.get_stored_params()
                                };
                                if let Some(params) = params {
                                    let mut lock = lm.lock();
                                    match lock.prepare_enable(&params) {
                                        Ok(p) => Some(p),
                                        Err(e) => {
                                            eprintln!("[link] Reconnect prepare failed: {}", e);
                                            None
                                        }
                                    }
                                } else {
                                    None
                                }
                            };

                            if let Some(prepared) = prepared {
                                // Phase 2 (async): network — no lock held
                                let result = LinkManager::do_network_connect(prepared).await;
                                match result {
                                    Ok(conn_result) => {
                                        // Phase 3 (sync): apply — hold lock briefly
                                        let mut lock = lm.lock();
                                        match lock.apply_connection(conn_result, &handle_for_spawn) {
                                            Ok(_) => eprintln!("[link] Reconnect initiated"),
                                            Err(e) => {
                                                eprintln!("[link] Reconnect apply failed: {}", e);
                                                lock.clear_outbound();
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        eprintln!("[link] Reconnect failed: {}", e);
                                        let mut lock = lm.lock();
                                        lock.clear_outbound();
                                    }
                                }
                            }
                        }
                    }

                    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                }
            });
        });
    }

    let stdout = io::stdout();
    let stdout_lock = Arc::new(Mutex::new(stdout));

    // Spawn event writer thread
    let stdout_clone = stdout_lock.clone();
    let relay_sender = relay_output_tx;
    let link_for_events = link_manager.clone();
    let event_thread = std::thread::spawn(move || {
        while let Some(event) = event_rx.blocking_recv() {
            // Forward terminal output to relay bridge
            if let CoreEvent::Output(ref chunk) = event {
                let _ = relay_sender.send((chunk.session_id.clone(), chunk.data.clone()));
            }

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
                CoreEvent::State { session_id, status, cwd, shell, cols, rows } => {
                    let data = serde_json::json!({
                        "session_id": session_id,
                        "status": status,
                        "cwd": cwd,
                        "shell": shell,
                        "cols": cols,
                        "rows": rows,
                    });
                    ("terminal.state".to_string(), data)
                }
                CoreEvent::Error { session_id, error } => {
                    let data = serde_json::json!({
                        "session_id": session_id,
                        "error": error,
                    });
                    ("terminal.error".to_string(), data)
                }

                // Link events
                CoreEvent::LinkState { state, device_id } => {
                    let data = serde_json::json!({
                        "state": state,
                        "device_id": device_id,
                    });
                    ("link.state".to_string(), data)
                }
                CoreEvent::LinkApproval {
                    session_id,
                    mobile_device_name,
                    mobile_device_type,
                    workspace_id,
                    window_id,
                    terminal_id,
                    mode,
                    transport_mode,
                    require_e2ee,
                    expires_in,
                } => {
                    let data = serde_json::json!({
                        "session_id": session_id,
                        "mobile_device_name": mobile_device_name,
                        "mobile_device_type": mobile_device_type,
                        "workspace_id": workspace_id,
                        "window_id": window_id,
                        "terminal_id": terminal_id,
                        "mode": mode,
                        "transport_mode": transport_mode,
                        "require_e2ee": require_e2ee,
                        "expires_in": expires_in,
                    });
                    ("link.approval".to_string(), data)
                }
                CoreEvent::LinkWebRTC {
                    signal_type,
                    session_id,
                    sdp,
                    candidate,
                } => {
                    let mut data = serde_json::json!({
                        "type": signal_type,
                        "session_id": session_id,
                    });
                    if let Some(ref s) = sdp {
                        data["sdp"] = Value::String(s.clone());
                    }
                    if let Some(ref c) = candidate {
                        data["candidate"] = c.clone();
                    }
                    ("link.webrtc".to_string(), data)
                }
                CoreEvent::LinkRelayReady { session_id } => {
                    let data = serde_json::json!({
                        "session_id": session_id,
                    });
                    ("link.relay.ready".to_string(), data)
                }
                CoreEvent::LinkBrowserRpc { terminal_id, request } => {
                    let data = serde_json::json!({
                        "terminal_id": terminal_id,
                        "request": request,
                    });
                    ("link.browser_rpc".to_string(), data)
                }
                CoreEvent::LinkError { error } => {
                    let data = serde_json::json!({
                        "error": error,
                    });
                    ("link.error".to_string(), data)
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

            if matches!(event, CoreEvent::State { .. } | CoreEvent::Exit { .. }) {
                link_for_events.lock().send_workspace_snapshot();
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

        let response = dispatch(&terminal_manager, &link_manager, &link_rt_handle, &request);
        if let Some(ref err) = response.error {
            eprintln!("[core] error: {} -> {}", request.method, err);
        }
        write_response(&stdout_lock, &response);
    }

    // Cleanup
    drop(terminal_manager);
    drop(link_manager);
    let _ = event_thread.join();
}

fn write_response(stdout: &Arc<Mutex<io::Stdout>>, resp: &Response) {
    if let Ok(json) = serde_json::to_string(resp) {
        let mut out = stdout.lock();
        let _ = writeln!(out, "{}", json);
        let _ = out.flush();
    }
}

fn dispatch(
    manager: &Arc<Mutex<TerminalManager>>,
    link: &Arc<Mutex<LinkManager>>,
    link_rt: &tokio::runtime::Handle,
    req: &Request,
) -> Response {
    let result = handle_method(manager, link, link_rt, &req.method, &req.params);
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
    link: &Arc<Mutex<LinkManager>>,
    link_rt: &tokio::runtime::Handle,
    method: &str,
    params: &Value,
) -> Result<Value, String> {
    match method {
        // ── Link methods ──
        "link.enable" => {
            let access_token = required_str(params, "access_token")?.to_string();
            let link_url = optional_str(params, "link_url").map(|s| s.to_string());
            let control_url = optional_str(params, "control_url").map(|s| s.to_string());
            let device_id = optional_str(params, "device_id").map(|s| s.to_string());
            let device_private_key = optional_str(params, "device_private_key").map(|s| s.to_string());
            let device_public_key = optional_str(params, "device_public_key").map(|s| s.to_string());
            let transport_mode = optional_str(params, "transport_mode").map(|s| s.to_string());
            let require_e2ee = params.get("require_e2ee").and_then(|v| v.as_bool());
            let allow_plain_relay = params.get("allow_plain_relay").and_then(|v| v.as_bool());
            let ep = EnableParams { access_token, link_url, control_url, device_id, device_private_key, device_public_key, transport_mode, require_e2ee, allow_plain_relay };

            // Phase 1 (sync): validate and create identity — hold lock briefly
            let prepared = {
                let mut lock = link.lock();
                lock.prepare_enable(&ep)?
            };

            // Phase 2 (async): network I/O — NO lock held
            let result = link_rt.block_on(async move {
                LinkManager::do_network_connect(prepared).await
            });
            let result = match result {
                Ok(r) => r,
                Err(e) => return Err(e),
            };

            // Phase 3 (sync): apply connection — hold lock briefly
            let mut lock = link.lock();
            let status = lock.apply_connection(result, link_rt)?;
            serde_json::to_value(&status).map_err(|e| format!("Serialize error: {e}"))
        }
        "link.disable" => {
            link.lock().disable();
            Ok(Value::Null)
        }
        "link.status" => {
            let status = link.lock().status();
            serde_json::to_value(&status).map_err(|e| format!("Serialize error: {e}"))
        }
        "link.approve" => {
            let session_id = required_str(params, "session_id")?.to_string();
            let lm = link.clone();
            link_rt.block_on(async move {
                lm.lock().approve(&session_id).await
            })?;
            Ok(Value::Null)
        }
        "link.reject" => {
            let session_id = required_str(params, "session_id")?.to_string();
            let lm = link.clone();
            link_rt.block_on(async move {
                lm.lock().reject(&session_id).await
            })?;
            Ok(Value::Null)
        }
        "link.webrtc.signal" => {
            let msg = params.clone();
            let lm = link.clone();
            link_rt.block_on(async move {
                lm.lock().send_webrtc_signal(msg).await
            })?;
            Ok(Value::Null)
        }
        "link.workspace.update" => {
            let workspaces = params
                .get("workspaces")
                .and_then(|v| v.as_array())
                .cloned()
                .ok_or("Missing workspaces")?;
            let snapshot_version = params
                .get("snapshotVersion")
                .and_then(|value| value.as_u64())
                .and_then(|value| u32::try_from(value).ok());
            let browser_sessions = params
                .get("browserSessions")
                .and_then(|value| value.as_array())
                .cloned();
            let capabilities = params.get("capabilities").cloned();
            link.lock().set_workspace_snapshot(WorkspaceSnapshotEnvelope {
                snapshot_version,
                workspaces,
                browser_sessions,
                capabilities,
            });
            Ok(Value::Null)
        }
        "link.relay.rpc_response" => {
            let terminal_id = required_str(params, "terminal_id")?;
            let response = params
                .get("response")
                .cloned()
                .ok_or("Missing response")?;
            link.lock().send_relay_rpc_response(terminal_id, response)?;
            Ok(Value::Null)
        }

        // ── Terminal methods ──
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
        "system.workspace_dir" => {
            let cwd = std::env::current_dir()
                .map_err(|e| format!("Failed to read workspace dir: {e}"))?;
            Ok(Value::String(cwd.to_string_lossy().to_string()))
        }
        "fs.list" => {
            let path = required_str(params, "path")?;
            let entries = orphix_fs::list_dir(path)?;
            serde_json::to_value(&entries).map_err(|e| format!("Serialize error: {e}"))
        }
        "fs.read" => {
            let path = required_str(params, "path")?;
            let content = orphix_fs::read_file(path)?;
            Ok(serde_json::json!({ "content": content }))
        }
        "fs.write" => {
            let path = required_str(params, "path")?;
            let content = required_str(params, "content")?;
            orphix_fs::write_file(path, content)?;
            Ok(Value::Null)
        }
        "fs.create" => {
            let path = required_str(params, "path")?;
            let is_dir = params
                .get("is_dir")
                .or_else(|| params.get("isDir"))
                .and_then(|v| v.as_bool())
                .ok_or("Missing is_dir")?;
            orphix_fs::create(path, is_dir)?;
            Ok(Value::Null)
        }
        "fs.rename" => {
            let old_path = params
                .get("old_path")
                .or_else(|| params.get("oldPath"))
                .and_then(|v| v.as_str())
                .ok_or("Missing old_path")?;
            let new_path = params
                .get("new_path")
                .or_else(|| params.get("newPath"))
                .and_then(|v| v.as_str())
                .ok_or("Missing new_path")?;
            orphix_fs::rename(old_path, new_path)?;
            Ok(Value::Null)
        }
        "fs.delete" => {
            let path = required_str(params, "path")?;
            orphix_fs::delete(path)?;
            Ok(Value::Null)
        }
        "fs.copy" => {
            let src_path = params
                .get("src_path")
                .or_else(|| params.get("srcPath"))
                .and_then(|v| v.as_str())
                .ok_or("Missing src_path")?;
            let dest_path = params
                .get("dest_path")
                .or_else(|| params.get("destPath"))
                .and_then(|v| v.as_str())
                .ok_or("Missing dest_path")?;
            orphix_fs::copy(src_path, dest_path)?;
            Ok(Value::Null)
        }
        "fs.move" => {
            let src_path = params
                .get("src_path")
                .or_else(|| params.get("srcPath"))
                .and_then(|v| v.as_str())
                .ok_or("Missing src_path")?;
            let dest_path = params
                .get("dest_path")
                .or_else(|| params.get("destPath"))
                .and_then(|v| v.as_str())
                .ok_or("Missing dest_path")?;
            orphix_fs::move_path(src_path, dest_path)?;
            Ok(Value::Null)
        }
        "fs.stat" => {
            let path = required_str(params, "path")?;
            let entry = orphix_fs::stat(path)?;
            serde_json::to_value(&entry).map_err(|e| format!("Serialize error: {e}"))
        }
        "git.status" => {
            let cwd = required_str(params, "cwd")?;
            serde_json::to_value(orphix_git::status(cwd))
                .map_err(|e| format!("Serialize error: {e}"))
        }
        "git.branches" => {
            let cwd = required_str(params, "cwd")?;
            serde_json::to_value(orphix_git::branches(cwd))
                .map_err(|e| format!("Serialize error: {e}"))
        }
        "git.checkout" => {
            let cwd = required_str(params, "cwd")?;
            let branch = required_str(params, "branch")?;
            Ok(Value::Bool(orphix_git::checkout(cwd, branch)))
        }
        "git.diff" => {
            let cwd = required_str(params, "cwd")?;
            let file = required_str(params, "file")?;
            Ok(Value::String(orphix_git::diff(cwd, file)))
        }
        "git.stage" => {
            let cwd = required_str(params, "cwd")?;
            let files = string_array(params, "files")?;
            Ok(Value::Bool(orphix_git::stage(cwd, &files)))
        }
        "git.unstage" => {
            let cwd = required_str(params, "cwd")?;
            let files = string_array(params, "files")?;
            Ok(Value::Bool(orphix_git::unstage(cwd, &files)))
        }
        "git.commit" => {
            let cwd = required_str(params, "cwd")?;
            let message = required_str(params, "message")?;
            Ok(Value::Bool(orphix_git::commit(cwd, message)))
        }
        "git.fetch" => {
            let cwd = required_str(params, "cwd")?;
            Ok(Value::Bool(orphix_git::fetch(cwd)))
        }
        "git.pull" => {
            let cwd = required_str(params, "cwd")?;
            Ok(Value::Bool(orphix_git::pull(cwd)))
        }
        "git.push" => {
            let cwd = required_str(params, "cwd")?;
            Ok(Value::Bool(orphix_git::push(cwd)))
        }
        "git.sync" => {
            let cwd = required_str(params, "cwd")?;
            Ok(Value::Bool(orphix_git::sync(cwd)))
        }
        "git.stage_all" => {
            let cwd = required_str(params, "cwd")?;
            Ok(Value::Bool(orphix_git::stage_all(cwd)))
        }
        "git.unstage_all" => {
            let cwd = required_str(params, "cwd")?;
            Ok(Value::Bool(orphix_git::unstage_all(cwd)))
        }
        "git.discard" => {
            let cwd = required_str(params, "cwd")?;
            let files = string_array(params, "files")?;
            Ok(Value::Bool(orphix_git::discard(cwd, &files)))
        }
        "git.discard_all" => {
            let cwd = required_str(params, "cwd")?;
            Ok(Value::Bool(orphix_git::discard_all(cwd)))
        }
        "git.stash_push" => {
            let cwd = required_str(params, "cwd")?;
            let message = params.get("message").and_then(|v| v.as_str());
            Ok(Value::Bool(orphix_git::stash_push(cwd, message)))
        }
        "git.stash_pop" => {
            let cwd = required_str(params, "cwd")?;
            Ok(Value::Bool(orphix_git::stash_pop(cwd)))
        }
        "git.stash_apply" => {
            let cwd = required_str(params, "cwd")?;
            let stash = required_str(params, "stash")?;
            Ok(Value::Bool(orphix_git::stash_apply(cwd, stash)))
        }
        "git.stash_drop" => {
            let cwd = required_str(params, "cwd")?;
            let stash = required_str(params, "stash")?;
            Ok(Value::Bool(orphix_git::stash_drop(cwd, stash)))
        }
        "git.stash_list" => {
            let cwd = required_str(params, "cwd")?;
            serde_json::to_value(orphix_git::stash_list(cwd))
                .map_err(|e| format!("Serialize error: {e}"))
        }
        "docker.check_available" => Ok(Value::Bool(orphix_docker::check_available())),
        "docker.ps" => {
            let all = optional_bool(params, "all").unwrap_or(false);
            serde_json::to_value(orphix_docker::ps(all)?)
                .map_err(|e| format!("Serialize error: {e}"))
        }
        "docker.ps_all" => serde_json::to_value(orphix_docker::ps(true)?)
            .map_err(|e| format!("Serialize error: {e}")),
        "docker.start" => {
            let id = required_str(params, "id")?;
            orphix_docker::start(id)?;
            Ok(Value::Null)
        }
        "docker.stop" => {
            let id = required_str(params, "id")?;
            orphix_docker::stop(id)?;
            Ok(Value::Null)
        }
        "docker.restart" => {
            let id = required_str(params, "id")?;
            orphix_docker::restart(id)?;
            Ok(Value::Null)
        }
        "docker.remove" => {
            let id = required_str(params, "id")?;
            let force = optional_bool(params, "force").unwrap_or(false);
            orphix_docker::remove(id, force)?;
            Ok(Value::Null)
        }
        "docker.logs" => {
            let id = required_str(params, "id")?;
            let tail = optional_u32(params, "tail").unwrap_or(100);
            Ok(Value::String(orphix_docker::logs(id, tail)?))
        }
        "docker.inspect" => {
            let id = required_str(params, "id")?;
            serde_json::to_value(orphix_docker::inspect(id)?)
                .map_err(|e| format!("Serialize error: {e}"))
        }
        "docker.exec" => {
            let id = required_str(params, "id")?;
            let cmd = optional_str(params, "cmd").unwrap_or("/bin/sh");
            Ok(serde_json::json!({
                "shell": "docker",
                "args": ["exec", "-it", id, cmd],
            }))
        }
        "docker.images" => serde_json::to_value(orphix_docker::images()?)
            .map_err(|e| format!("Serialize error: {e}")),
        "docker.discover_workspace" => {
            let cwd = required_str(params, "cwd")?;
            serde_json::to_value(orphix_docker::discover_workspace_for_app(cwd)?)
                .map_err(|e| format!("Serialize error: {e}"))
        }
        "docker.image_remove" => {
            let id = required_str(params, "id")?;
            let force = optional_bool(params, "force").unwrap_or(false);
            orphix_docker::remove_image(id, force)?;
            Ok(Value::Null)
        }
        "docker.build" => {
            let context = required_str(params, "context")?;
            let tag = optional_str(params, "tag");
            let dockerfile = optional_str(params, "dockerfile");
            Ok(Value::String(orphix_docker::build(
                context, tag, dockerfile,
            )?))
        }
        "docker.pull" => {
            let image = required_str(params, "image")?;
            Ok(Value::String(orphix_docker::pull(image)?))
        }
        "docker.compose_ps" => {
            let cwd = optional_str(params, "cwd");
            serde_json::to_value(orphix_docker::compose_ps(cwd)?)
                .map_err(|e| format!("Serialize error: {e}"))
        }
        "docker.compose_up" => {
            let cwd = optional_str(params, "cwd");
            let detach = optional_bool(params, "detach").unwrap_or(true);
            Ok(Value::String(orphix_docker::compose_up(cwd, detach)?))
        }
        "docker.compose_down" => {
            let cwd = optional_str(params, "cwd");
            Ok(Value::String(orphix_docker::compose_down(cwd)?))
        }
        "docker.compose_logs" => {
            let cwd = optional_str(params, "cwd");
            let tail = optional_u32(params, "tail").unwrap_or(100);
            Ok(Value::String(orphix_docker::compose_logs(cwd, tail)?))
        }
        "docker.stats" => serde_json::to_value(orphix_docker::stats()?)
            .map_err(|e| format!("Serialize error: {e}")),
        _ => Err(format!("Unknown method: {method}")),
    }
}

fn required_str<'a>(params: &'a Value, key: &str) -> Result<&'a str, String> {
    params
        .get(key)
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("Missing {key}"))
}

fn optional_str<'a>(params: &'a Value, key: &str) -> Option<&'a str> {
    params.get(key).and_then(|v| v.as_str())
}

fn optional_bool(params: &Value, key: &str) -> Option<bool> {
    params.get(key).and_then(|v| v.as_bool())
}

fn optional_u32(params: &Value, key: &str) -> Option<u32> {
    params
        .get(key)
        .and_then(|v| v.as_u64())
        .and_then(|value| u32::try_from(value).ok())
}

fn string_array(params: &Value, key: &str) -> Result<Vec<String>, String> {
    let values = params
        .get(key)
        .and_then(|v| v.as_array())
        .ok_or_else(|| format!("Missing {key}"))?;

    values
        .iter()
        .map(|value| {
            value
                .as_str()
                .map(ToString::to_string)
                .ok_or_else(|| format!("{key} must contain only strings"))
        })
        .collect()
}
