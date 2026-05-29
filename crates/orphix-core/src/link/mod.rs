use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

use orphix_link::client::LinkClient;
use orphix_link::device::DeviceIdentity;
use orphix_link::message::LinkMessage;
use orphix_link::protocol::{FrameKind, LinkFrame};
use orphix_link::session::{LinkSession, LinkSessionState};

use crate::terminal::events::CoreEvent;
use crate::terminal::manager::TerminalManager;

mod relay;
pub use relay::RelayBridge;

const MAX_RECONNECT_ATTEMPTS: u32 = 10;
const BASE_RECONNECT_DELAY_MS: u64 = 5000;
const MAX_RECONNECT_DELAY_MS: u64 = 60000;

/// LinkManager runs inside orphix-core and handles all link functionality.
/// When enabled, it connects to apis/link via WebSocket, handles auth,
/// and bridges terminal I/O between the link API and the PTY manager.
///
/// Threading model:
/// - The background thread owns the tokio runtime and the LinkClient.
/// - Messages arrive via `inbound_rx` (polled by `process_inbound`).
/// - PTY relay output arrives via `relay_output_rx`.
/// - All state mutation happens under brief parking_lot lock windows.
pub struct LinkManager {
    session: LinkSession,
    device: Option<DeviceIdentity>,
    event_tx: mpsc::UnboundedSender<CoreEvent>,
    terminal_manager: Arc<Mutex<TerminalManager>>,
    link_url: String,
    control_url: String,
    relay: RelayBridge,

    // Channel for inbound messages from the background WS task
    inbound_rx: mpsc::Receiver<LinkMessage>,
    inbound_tx: mpsc::Sender<LinkMessage>,

    // Channel for relay PTY output (unbounded — sync send from event writer thread)
    relay_output_rx: mpsc::UnboundedReceiver<(String, String)>,
    relay_output_tx: mpsc::UnboundedSender<(String, String)>,

    // Channel for outbound messages to the background WS task
    outbound_tx: Option<mpsc::Sender<LinkMessage>>,

    // Reconnect state
    reconnect_attempt: u32,
    auth_failed: bool,
    explicit_disconnect: bool,
    stored_params: Option<EnableParams>,
    workspace_override: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LinkStatus {
    pub state: String,
    pub device_id: Option<String>,
    pub session_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EnableParams {
    pub access_token: String,
    pub link_url: Option<String>,
    pub control_url: Option<String>,
    /// Device ID from the desktop's persisted identity (from device-identity.json).
    pub device_id: Option<String>,
    /// Base64-encoded PKCS8 DER private key from the desktop's persisted identity.
    pub device_private_key: Option<String>,
    /// Base64-encoded SPKI DER public key from the desktop's persisted identity.
    pub device_public_key: Option<String>,
    /// Link transport mode: auto | webrtc | websocket | local
    pub transport_mode: Option<String>,
    /// Whether relayed payloads must be end-to-end encrypted.
    pub require_e2ee: Option<bool>,
    /// Whether unencrypted relay frames are allowed. Dev-only.
    pub allow_plain_relay: Option<bool>,
}

/// Result of Phase 1 (sync validation).
pub struct PreparedEnable {
    pub device: DeviceIdentity,
    pub params: EnableParams,
    pub link_url: String,
    pub control_url: String,
}

/// Result of Phase 2 (async network I/O).
pub struct ConnectionResult {
    pub device: DeviceIdentity,
    pub device_id: String,
    pub client: LinkClient,
    pub msg_rx: mpsc::Receiver<LinkMessage>,
    pub params: EnableParams,
    pub link_url: String,
    pub control_url: String,
}

impl LinkManager {
    pub fn new(
        event_tx: mpsc::UnboundedSender<CoreEvent>,
        terminal_manager: Arc<Mutex<TerminalManager>>,
    ) -> Self {
        let (inbound_tx, inbound_rx) = mpsc::channel(64);
        let (relay_output_tx, relay_output_rx) = mpsc::unbounded_channel();

        Self {
            session: LinkSession::new(),
            device: None,
            event_tx,
            terminal_manager,
            link_url: std::env::var("ORPHIX_LINK_URL").unwrap_or_else(|_| "ws://localhost:2606".to_string()),
            control_url: std::env::var("ORPHIX_CONTROL_URL").unwrap_or_else(|_| "http://localhost:2605".to_string()),
            relay: RelayBridge::new(),
            inbound_rx,
            inbound_tx,
            relay_output_rx,
            relay_output_tx,
            outbound_tx: None,
            reconnect_attempt: 0,
            auth_failed: false,
            explicit_disconnect: false,
            stored_params: None,
            workspace_override: None,
        }
    }

    /// Get a sender for relay PTY output (given to the terminal event system).
    pub fn relay_output_sender(&self) -> mpsc::UnboundedSender<(String, String)> {
        self.relay_output_tx.clone()
    }

    /// Phase 1 (sync): Validate params and create device identity. No network I/O.
    /// Must be called with the parking_lot lock held.
    pub fn prepare_enable(&mut self, params: &EnableParams) -> Result<PreparedEnable, String> {
        if self.outbound_tx.is_some() {
            return Err("Link already enabled".to_string());
        }

        let link_url = params.link_url.clone().unwrap_or_else(|| self.link_url.clone());
        let control_url = params.control_url.clone().unwrap_or_else(|| self.control_url.clone());

        let device = match (&params.device_id, &params.device_private_key, &params.device_public_key) {
            (Some(device_id), Some(private_key), Some(public_key)) => {
                DeviceIdentity::from_existing(device_id, private_key, public_key)
                    .map_err(|e| format!("Failed to load device identity: {}", e))?
            }
            (Some(device_id), Some(private_key), None) => {
                eprintln!("[link] WARNING: No public key passed, challenge-response may fail");
                DeviceIdentity::from_existing(device_id, private_key, "")
                    .map_err(|e| format!("Failed to load device identity: {}", e))?
            }
            _ => {
                return Err("device_id and device_private_key required".to_string());
            }
        };

        Ok(PreparedEnable {
            device,
            params: params.clone(),
            link_url,
            control_url,
        })
    }

    /// Phase 2 (async): Network I/O — register device and connect WebSocket.
    /// Called WITHOUT the parking_lot lock held.
    pub async fn do_network_connect(prepared: PreparedEnable) -> Result<ConnectionResult, String> {
        let device_id = prepared.device.device_id.clone();

        // Register device with control API (idempotent)
        Self::register_device_static(
            &prepared.device,
            &prepared.params.access_token,
            &prepared.control_url,
        ).await?;

        // Create link client and connect
        let mut client = LinkClient::new(
            prepared.device.clone(),
            prepared.params.access_token.clone(),
            prepared.link_url.clone(),
        );

        let msg_rx = client
            .connect("desktop")
            .await
            .map_err(|e| format!("Link connect failed: {}", e))?;

        Ok(ConnectionResult {
            device: prepared.device,
            device_id,
            client,
            msg_rx,
            params: prepared.params,
            link_url: prepared.link_url,
            control_url: prepared.control_url,
        })
    }

    /// Phase 3 (sync): Apply connection results and spawn bridge tasks.
    /// Must be called with the parking_lot lock held.
    /// `rt_handle` is used for `spawn()` so this works from any thread context.
    pub fn apply_connection(&mut self, result: ConnectionResult, rt_handle: &tokio::runtime::Handle) -> Result<LinkStatus, String> {
        let ConnectionResult { device, device_id, client, msg_rx, params, link_url, control_url } = result;

        // Create outbound channel and spawn a task that bridges it to the WS writer
        let (outbound_tx, mut outbound_rx) = mpsc::channel::<LinkMessage>(64);
        let client_arc = Arc::new(tokio::sync::Mutex::new(client));

        {
            let client = client_arc.clone();
            rt_handle.spawn(async move {
                eprintln!("[link] outbound bridge task started");
                while let Some(msg) = outbound_rx.recv().await {
                    let lock = client.lock().await;
                    if let Err(e) = lock.send(msg).await {
                        eprintln!("[link] send error (connection lost): {}", e);
                        break;
                    }
                }
                eprintln!("[link] outbound bridge task ended");
            });
        }

        // Spawn a task that reads from msg_rx and forwards to inbound_tx
        {
            let inbound_tx = self.inbound_tx.clone();
            rt_handle.spawn(async move {
                let mut rx = msg_rx;
                while let Some(msg) = rx.recv().await {
                    if inbound_tx.send(msg).await.is_err() {
                        break;
                    }
                }
            });
        }

        self.session.transition(LinkSessionState::SocketConnecting);
        self.device = Some(device);
        self.outbound_tx = Some(outbound_tx);
        self.link_url = link_url;
        self.control_url = control_url;
        self.stored_params = Some(params);
        self.reconnect_attempt = 0;
        self.auth_failed = false;
        self.explicit_disconnect = false;

        let _ = self.event_tx.send(CoreEvent::LinkState {
            state: "connecting".to_string(),
            device_id: Some(device_id.clone()),
        });

        Ok(LinkStatus {
            state: "connecting".to_string(),
            device_id: Some(device_id),
            session_id: None,
        })
    }

    pub fn disable(&mut self) {
        self.explicit_disconnect = true;
        self.stored_params = None;
        self.auth_failed = false;
        self.outbound_tx = None;
        self.session = LinkSession::new();
        self.relay = RelayBridge::new();
        // Drain inbound channel
        while self.inbound_rx.try_recv().is_ok() {}

        let _ = self.event_tx.send(CoreEvent::LinkState {
            state: "disconnected".to_string(),
            device_id: None,
        });
    }

    pub fn status(&self) -> LinkStatus {
        let state_str = match self.session.state {
            LinkSessionState::Idle => "idle",
            LinkSessionState::SocketConnecting => "connecting",
            LinkSessionState::SocketReady => "authenticated",
            LinkSessionState::LinkRequesting => "requesting",
            LinkSessionState::AwaitingDesktopApproval => "awaiting_approval",
            LinkSessionState::P2PNegotiating => "p2p_connecting",
            LinkSessionState::P2PConnected => "p2p_connected",
            LinkSessionState::TerminalAttached => "terminal_attached",
            LinkSessionState::DesktopOffline => "desktop_offline",
            LinkSessionState::PermissionDenied => "permission_denied",
            LinkSessionState::ApprovalRejected => "approval_rejected",
            LinkSessionState::P2PFailed => "p2p_failed",
            LinkSessionState::SessionExpired => "session_expired",
        };

        LinkStatus {
            state: state_str.to_string(),
            device_id: self.device.as_ref().map(|d| d.device_id.clone()),
            session_id: self.session.session_id.clone(),
        }
    }

    pub async fn approve(&mut self, session_id: &str) -> Result<(), String> {
        let tx = self.outbound_tx.as_ref().ok_or("Link not connected")?;
        tx.send(LinkMessage::LinkApprove {
            session_id: session_id.to_string(),
            approved: true,
        })
        .await
        .map_err(|e| format!("Approve failed: {}", e))?;
        Ok(())
    }

    pub async fn reject(&mut self, session_id: &str) -> Result<(), String> {
        let tx = self.outbound_tx.as_ref().ok_or("Link not connected")?;
        tx.send(LinkMessage::LinkApprove {
            session_id: session_id.to_string(),
            approved: false,
        })
        .await
        .map_err(|e| format!("Reject failed: {}", e))?;
        Ok(())
    }

    /// Process all pending inbound messages and relay output. Non-blocking.
    /// Returns true if any messages were processed.
    /// IMPORTANT: Process inbound messages FIRST (handles RelayStart which sets up
    /// relay mappings), THEN drain relay output (mappings now exist).
    pub fn process_inbound(&mut self) -> bool {
        let mut processed = false;

        // Process inbound link messages FIRST (handles RelayStart, Challenge, etc.)
        while let Ok(msg) = self.inbound_rx.try_recv() {
            self.handle_message_sync(msg);
            processed = true;
        }

        // THEN process relay PTY output (relay mapping now exists from RelayStart)
        while let Ok((session_id, data)) = self.relay_output_rx.try_recv() {
            eprintln!("[link] relay output received for terminal: {} ({} bytes)", session_id, data.len());
            if let Some(relay_session_id) = self.relay.get_session_for_terminal(&session_id) {
                eprintln!("[link] relay output forwarding to session: {}", relay_session_id);
                if let Some(tx) = &self.outbound_tx {
                    if let Err(e) = tx.try_send(LinkMessage::RelayMessage {
                        session_id: relay_session_id.clone(),
                        terminal_id: session_id.clone(),
                        data,
                        direction: "output".to_string(),
                    }) {
                        eprintln!("[link] relay output send failed: {}", e);
                    }
                }
            } else {
                eprintln!("[link] relay output: no relay session for terminal {}", session_id);
            }
            processed = true;
        }

        processed
    }

    /// Synchronous message handler (no await needed — uses try_send for outbound).
    fn handle_message_sync(&mut self, msg: LinkMessage) {
        match msg {
            LinkMessage::Challenge { nonce, socket_id } => {
                // Sign the challenge and respond immediately
                if let (Some(device), Some(params)) = (&self.device, &self.stored_params) {
                    let timestamp = chrono::Utc::now().timestamp_millis();
                    let signature = device.sign_challenge(&nonce, &socket_id, timestamp);

                    if let Some(tx) = &self.outbound_tx {
                        let _ = tx.try_send(LinkMessage::ChallengeResponse {
                            device_id: device.device_id.clone(),
                            access_token: params.access_token.clone(),
                            nonce,
                            timestamp,
                            signature,
                        });
                    }
                }
            }

            LinkMessage::HelloAck { device_id, .. } => {
                self.session.transition(LinkSessionState::SocketReady);
                self.reconnect_attempt = 0;
                self.auth_failed = false;
                let _ = self.event_tx.send(CoreEvent::LinkState {
                    state: "authenticated".to_string(),
                    device_id: Some(device_id),
                });
            }

            LinkMessage::HelloReject { reason } => {
                self.auth_failed = true;
                let _ = self.event_tx.send(CoreEvent::LinkState {
                    state: "auth_failed".to_string(),
                    device_id: None,
                });
                let _ = self.event_tx.send(CoreEvent::LinkError { error: reason });
            }

            LinkMessage::LinkApprovalRequest {
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
                self.session.transition(LinkSessionState::AwaitingDesktopApproval);
                self.session.set_session(
                    session_id.clone(),
                    self.device.as_ref().map(|d| d.device_id.clone()).unwrap_or_default(),
                    mode.clone(),
                );

                let _ = self.event_tx.send(CoreEvent::LinkApproval {
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
                });
            }

            LinkMessage::LinkApproved { session_id, link_token } => {
                self.session.set_approved(link_token);
                let _ = self.event_tx.send(CoreEvent::LinkState {
                    state: "link_approved".to_string(),
                    device_id: Some(session_id),
                });
                self.send_workspace_snapshot();
            }

            LinkMessage::LinkRejected { session_id, .. } => {
                self.session.set_rejected();
                let _ = self.event_tx.send(CoreEvent::LinkState {
                    state: "link_rejected".to_string(),
                    device_id: Some(session_id),
                });
            }

            LinkMessage::WebRTCOffer { session_id, sdp } => {
                let _ = self.event_tx.send(CoreEvent::LinkWebRTC {
                    signal_type: "webrtc.offer".to_string(),
                    session_id,
                    sdp: Some(sdp),
                    candidate: None,
                });
            }

            LinkMessage::WebRTCIce { session_id, candidate } => {
                let _ = self.event_tx.send(CoreEvent::LinkWebRTC {
                    signal_type: "webrtc.ice".to_string(),
                    session_id,
                    sdp: None,
                    candidate: Some(candidate),
                });
            }

            LinkMessage::RelayStart { session_id, terminal_id, .. } => {
                eprintln!("[link] RelayStart: session={}, terminal={}", session_id, terminal_id);
                self.relay.start_session(&session_id, &terminal_id);
                let _ = self.event_tx.send(CoreEvent::LinkRelayReady {
                    session_id: session_id.clone(),
                });
                // Notify mobile via link API
                if let Some(tx) = &self.outbound_tx {
                    let _ = tx.try_send(LinkMessage::RelayReady {
                        session_id: session_id.clone(),
                    });
                    if let Ok(snapshot) = self.terminal_manager.lock().attach(&terminal_id) {
                        for chunk in snapshot.recent_chunks {
                            let _ = tx.try_send(LinkMessage::RelayMessage {
                                session_id: session_id.clone(),
                                terminal_id: terminal_id.clone(),
                                data: chunk.data,
                                direction: "output".to_string(),
                            });
                        }
                    }
                }
                self.send_workspace_snapshot();
            }

            LinkMessage::RelayMessage { terminal_id, data, direction, .. } => {
                eprintln!("[link] RelayMessage: terminal={}, direction={}, data_len={}", terminal_id, direction, data.len());
                if direction == "input" {
                    if let Ok(frame) = LinkFrame::from_bytes(data.as_bytes()) {
                        match frame.kind {
                            FrameKind::TerminalStdin => {
                                if let Some(input) = frame.payload.get("data").and_then(|v| v.as_str()) {
                                    let tm = self.terminal_manager.lock();
                                    let _ = tm.write(&terminal_id, input);
                                }
                            }
                            FrameKind::TerminalResize => {
                                let cols = frame.payload.get("cols").and_then(|v| v.as_u64()).unwrap_or(120) as u16;
                                let rows = frame.payload.get("rows").and_then(|v| v.as_u64()).unwrap_or(30) as u16;
                                let tm = self.terminal_manager.lock();
                                let _ = tm.resize(&terminal_id, cols, rows);
                            }
                            _ => {}
                        }
                    } else {
                        // Raw data — check if it's a resize command
                        let is_resize = data.starts_with('{') && serde_json::from_str::<serde_json::Value>(&data)
                            .ok()
                            .and_then(|msg| msg.get("type").and_then(|v| v.as_str()).map(|t| t == "resize"))
                            .unwrap_or(false);

                        if is_resize {
                            if let Ok(msg) = serde_json::from_str::<serde_json::Value>(&data) {
                                let cols = msg.get("cols").and_then(|v| v.as_u64()).unwrap_or(120) as u16;
                                let rows = msg.get("rows").and_then(|v| v.as_u64()).unwrap_or(30) as u16;
                                let tm = self.terminal_manager.lock();
                                let _ = tm.resize(&terminal_id, cols, rows);
                            }
                        } else {
                            // Raw PTY input
                            let tm = self.terminal_manager.lock();
                            let _ = tm.write(&terminal_id, &data);
                        }
                    }
                }
            }

            LinkMessage::RelayStop { session_id } => {
                self.relay.stop_session(&session_id);
            }

            LinkMessage::TerminalCreate { cwd, shell, .. } => {
                use crate::protocol::CreateTerminalRequest;
                let req = CreateTerminalRequest {
                    terminal_id: None,
                    cwd,
                    shell,
                    cols: Some(120),
                    rows: Some(30),
                    kind: None,
                };
                let result = self.terminal_manager.lock().create(req);
                match result {
                    Ok(info) => {
                        eprintln!("[link] Created terminal: {}", info.id);
                        self.send_workspace_snapshot();
                    }
                    Err(e) => {
                        eprintln!("[link] Failed to create terminal: {}", e);
                    }
                }
            }

            LinkMessage::Pong { .. } => {
                // Heartbeat acknowledged
            }

            _ => {
                // Other messages (LinkPending, etc.)
            }
        }
    }

    /// Build workspace tree from terminal sessions and send to mobile/web.
    pub fn send_workspace_snapshot(&self) {
        if let Some(workspaces) = &self.workspace_override {
            if let Some(tx) = &self.outbound_tx {
                let _ = tx.try_send(LinkMessage::WorkspaceList {
                    workspaces: workspaces.clone(),
                });
            }
            return;
        }

        let terminals = self.terminal_manager.lock().list();
        let terminal_nodes: Vec<serde_json::Value> = terminals.iter().map(|t| {
            serde_json::json!({
                "id": t.id,
                "name": t.shell,
                "status": format!("{:?}", t.status).to_lowercase(),
            })
        }).collect();

        let window = serde_json::json!({
            "id": "default",
            "name": "Window 1",
            "terminals": terminal_nodes,
        });

        let workspace = serde_json::json!({
            "id": "default",
            "name": "Workspace",
            "windows": [window],
        });

        if let Some(tx) = &self.outbound_tx {
            let _ = tx.try_send(LinkMessage::WorkspaceList {
                workspaces: vec![workspace],
            });
        }
    }

    pub fn set_workspace_snapshot(&mut self, workspaces: Vec<serde_json::Value>) {
        self.workspace_override = Some(workspaces);
        self.send_workspace_snapshot();
    }

    /// Check if the outbound channel is still alive (WS connected).
    pub fn is_ws_alive(&self) -> bool {
        self.outbound_tx.as_ref().map_or(false, |tx| !tx.is_closed())
    }

    /// Send a ping message to keep the WebSocket alive through NAT/proxies.
    pub fn send_ping(&self) {
        if let Some(tx) = &self.outbound_tx {
            let ts = chrono::Utc::now().timestamp_millis();
            let _ = tx.try_send(LinkMessage::Ping { ts });
        }
    }

    /// Returns true if reconnect should be attempted.
    pub fn should_reconnect(&self) -> bool {
        !self.explicit_disconnect && !self.auth_failed && self.stored_params.is_some()
    }

    /// Increment reconnect attempt and return the delay with jitter.
    pub fn next_reconnect_delay(&mut self) -> Option<u64> {
        if self.reconnect_attempt >= MAX_RECONNECT_ATTEMPTS {
            let _ = self.event_tx.send(CoreEvent::LinkError {
                error: format!("Max reconnect attempts ({}) reached", MAX_RECONNECT_ATTEMPTS),
            });
            return None;
        }

        let base_ms = std::cmp::min(
            BASE_RECONNECT_DELAY_MS * 2u64.saturating_pow(self.reconnect_attempt),
            MAX_RECONNECT_DELAY_MS,
        );
        // Add jitter: 50-100% of base using timestamp entropy to prevent thundering herd
        let jitter_nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .subsec_nanos();
        let jitter_frac = 0.5 + ((jitter_nanos % 1000) as f64 / 2000.0); // 0.5..1.0
        let delay_ms = (base_ms as f64 * jitter_frac) as u64;
        self.reconnect_attempt += 1;
        Some(delay_ms)
    }

    /// Get stored params for reconnect.
    pub fn get_stored_params(&self) -> Option<EnableParams> {
        self.stored_params.clone()
    }

    /// Clear the outbound channel (called when WS disconnects).
    pub fn clear_outbound(&mut self) {
        self.outbound_tx = None;
        self.session.transition(LinkSessionState::Idle);
    }

    /// Forward a WebRTC signaling message from the renderer to the link API.
    pub async fn send_webrtc_signal(&self, msg: serde_json::Value) -> Result<(), String> {
        let tx = self.outbound_tx.as_ref().ok_or("Link not connected")?;
        let link_msg: LinkMessage =
            serde_json::from_value(msg).map_err(|e| format!("Invalid signal message: {}", e))?;
        tx.send(link_msg)
            .await
            .map_err(|e| format!("Send failed: {}", e))
    }

    pub async fn register_device_static(
        device: &DeviceIdentity,
        access_token: &str,
        control_url: &str,
    ) -> Result<(), String> {
        let url = format!("{}/devices/register", control_url);
        let payload = device.to_registration_payload();

        let client = reqwest::Client::new();
        let resp = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Device registration request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Device registration failed: {} {}", status, body));
        }

        Ok(())
    }
}
