use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};
use crate::device::DeviceIdentity;
use crate::message::LinkMessage;

pub struct LinkClient {
    pub device: DeviceIdentity,
    pub access_token: String,
    link_url: String,
    tx: Option<mpsc::Sender<LinkMessage>>,
    connected: Arc<Mutex<bool>>,
}

impl LinkClient {
    pub fn new(device: DeviceIdentity, access_token: String, link_url: String) -> Self {
        Self {
            device,
            access_token,
            link_url,
            tx: None,
            connected: Arc::new(Mutex::new(false)),
        }
    }

    pub async fn connect(&mut self, endpoint: &str) -> Result<mpsc::Receiver<LinkMessage>, String> {
        let url = format!("{}/v1/link/{}", self.link_url, endpoint);
        let (ws_stream, _) = connect_async(&url).await.map_err(|e| format!("WS connect failed: {}", e))?;
        let (mut write, mut read) = ws_stream.split();
        let (tx, mut rx) = mpsc::channel::<LinkMessage>(64);
        let (msg_tx, msg_rx) = mpsc::channel::<LinkMessage>(64);

        *self.connected.lock().await = true;
        self.tx = Some(tx.clone());

        // Outbound writer task
        let connected = self.connected.clone();
        tokio::spawn(async move {
            eprintln!("[link] WS writer task started");
            while let Some(msg) = rx.recv().await {
                if let Ok(json) = serde_json::to_string(&msg) {
                    eprintln!("[link] WS writer: sending {}", &json[..json.len().min(100)]);
                    if write.send(Message::Text(json.into())).await.is_err() {
                        eprintln!("[link] WS writer: send failed, disconnecting");
                        *connected.lock().await = false;
                        break;
                    }
                }
            }
            eprintln!("[link] WS writer task ended");
        });

        // Inbound reader task
        let connected = self.connected.clone();
        tokio::spawn(async move {
            while let Some(Ok(msg)) = read.next().await {
                if let Message::Text(text) = msg {
                    match serde_json::from_str::<LinkMessage>(&text) {
                        Ok(parsed) => { let _ = msg_tx.send(parsed).await; }
                        Err(e) => eprintln!("[link] Failed to parse message: {} — raw: {}", e, &text[..text.len().min(200)]),
                    }
                }
            }
            *connected.lock().await = false;
        });

        Ok(msg_rx)
    }

    pub async fn send(&self, msg: LinkMessage) -> Result<(), String> {
        let tx = self.tx.as_ref().ok_or("Not connected")?;
        tx.send(msg).await.map_err(|_| "Send failed".to_string())
    }

    pub async fn send_challenge_response(&self, nonce: &str, socket_id: &str) -> Result<(), String> {
        let timestamp = chrono::Utc::now().timestamp_millis();
        let signature = self.device.sign_challenge(nonce, socket_id, timestamp);

        self.send(LinkMessage::ChallengeResponse {
            device_id: self.device.device_id.clone(),
            access_token: self.access_token.clone(),
            nonce: nonce.to_string(),
            timestamp,
            signature,
        }).await
    }

    pub async fn send_desktop_hello(&self) -> Result<(), String> {
        // This is sent after receiving a challenge
        // The actual hello is sent via send_challenge_response
        Ok(())
    }

    pub async fn send_ping(&self) -> Result<(), String> {
        self.send(LinkMessage::Ping {
            ts: chrono::Utc::now().timestamp_millis(),
        }).await
    }

    pub async fn approve_link(&self, session_id: &str, approved: bool) -> Result<(), String> {
        self.send(LinkMessage::LinkApprove {
            session_id: session_id.to_string(),
            approved,
        }).await
    }

    pub async fn request_link(
        &self,
        desktop_device_id: &str,
        mode: &str,
        workspace_id: Option<&str>,
        window_id: Option<&str>,
        terminal_id: Option<&str>,
    ) -> Result<(), String> {
        self.send(LinkMessage::LinkRequest {
            desktop_device_id: desktop_device_id.to_string(),
            workspace_id: workspace_id.map(|s| s.to_string()),
            window_id: window_id.map(|s| s.to_string()),
            terminal_id: terminal_id.map(|s| s.to_string()),
            mode: mode.to_string(),
        }).await
    }

    pub async fn start_relay(&self, session_id: &str, terminal_id: &str) -> Result<(), String> {
        self.send(LinkMessage::RelayStart {
            session_id: session_id.to_string(),
            terminal_id: terminal_id.to_string(),
            mode: "full_control".to_string(),
        }).await
    }

    pub async fn send_relay_message(
        &self,
        session_id: &str,
        terminal_id: &str,
        data: &str,
        direction: &str,
    ) -> Result<(), String> {
        self.send(LinkMessage::RelayMessage {
            session_id: session_id.to_string(),
            terminal_id: terminal_id.to_string(),
            data: data.to_string(),
            direction: direction.to_string(),
        }).await
    }

    pub async fn stop_relay(&self, session_id: &str) -> Result<(), String> {
        self.send(LinkMessage::RelayStop {
            session_id: session_id.to_string(),
        }).await
    }

    pub async fn is_connected(&self) -> bool {
        *self.connected.lock().await
    }
}
