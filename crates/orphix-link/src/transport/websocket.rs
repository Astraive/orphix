use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream, tungstenite::Message};
use crate::protocol::LinkFrame;
use super::{LinkTransport, TransportError, TransportMode, TransportState};

/// WebSocket relay transport.
/// Connects through the Link API which acts as a dumb relay.
/// Payloads are E2EE (Link API sees only ciphertext).
pub struct WebSocketRelayTransport {
    state: TransportState,
    link_url: String,
    session_id: String,
    access_token: String,
    device_id: String,
    role: String,
    ws: Option<WebSocketStream<MaybeTlsStream<TcpStream>>>,
    seq_counter: u64,
}

impl WebSocketRelayTransport {
    pub fn new(
        link_url: impl Into<String>,
        session_id: impl Into<String>,
        access_token: impl Into<String>,
        device_id: impl Into<String>,
        role: impl Into<String>,
    ) -> Self {
        Self {
            state: TransportState::Disconnected,
            link_url: link_url.into(),
            session_id: session_id.into(),
            access_token: access_token.into(),
            device_id: device_id.into(),
            role: role.into(),
            ws: None,
            seq_counter: 0,
        }
    }

    fn next_seq(&mut self) -> u64 {
        self.seq_counter += 1;
        self.seq_counter
    }

    fn relay_url(&self) -> String {
        let base = self.link_url.replace("http://", "ws://").replace("https://", "wss://");
        format!("{}/v1/link/relay", base)
    }
}

#[async_trait]
impl LinkTransport for WebSocketRelayTransport {
    async fn connect(&mut self) -> Result<(), TransportError> {
        self.state = TransportState::Connecting;

        let url = self.relay_url();
        let (ws, _) = connect_async(&url).await
            .map_err(|e| TransportError::ConnectionFailed(e.to_string()))?;

        self.ws = Some(ws);
        self.state = TransportState::Connected;

        // Send relay.auth
        let auth = serde_json::json!({
            "type": "relay.auth",
            "sessionId": self.session_id,
            "accessToken": self.access_token,
            "deviceId": self.device_id,
            "role": self.role,
        });

        let ws = self.ws.as_mut().unwrap();
        ws.send(Message::Text(auth.to_string().into())).await
            .map_err(|e| TransportError::SendFailed(e.to_string()))?;

        // Wait for relay.ready
        if let Some(msg) = ws.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    let resp: serde_json::Value = serde_json::from_str(&text)
                        .map_err(|e| TransportError::Protocol(e.to_string()))?;

                    if resp["type"] == "relay.reject" {
                        let reason = resp["reason"].as_str().unwrap_or("rejected");
                        return Err(TransportError::ConnectionFailed(reason.to_string()));
                    }

                    if resp["type"] != "relay.ready" {
                        return Err(TransportError::Protocol(format!("Expected relay.ready, got {}", resp["type"])));
                    }
                }
                Ok(_) => return Err(TransportError::Protocol("Expected text message".into())),
                Err(e) => return Err(TransportError::ConnectionFailed(e.to_string())),
            }
        } else {
            return Err(TransportError::ConnectionFailed("Connection closed before auth".into()));
        }

        Ok(())
    }

    async fn send(&mut self, frame: &LinkFrame) -> Result<(), TransportError> {
        if self.state != TransportState::Connected {
            return Err(TransportError::SendFailed("Not connected".into()));
        }

        let mut frame = frame.clone();
        frame.seq = self.next_seq();

        let data = frame.to_bytes();
        let ws = self.ws.as_mut()
            .ok_or_else(|| TransportError::SendFailed("No WebSocket".into()))?;

        ws.send(Message::Binary(data.into())).await
            .map_err(|e| TransportError::SendFailed(e.to_string()))
    }

    async fn recv(&mut self) -> Result<LinkFrame, TransportError> {
        if self.state != TransportState::Connected {
            return Err(TransportError::RecvFailed("Not connected".into()));
        }

        let ws = self.ws.as_mut()
            .ok_or_else(|| TransportError::RecvFailed("No WebSocket".into()))?;

        loop {
            match ws.next().await {
                Some(Ok(Message::Binary(data))) => {
                    return LinkFrame::from_bytes(&data)
                        .map_err(|e| TransportError::Protocol(e.to_string()));
                }
                Some(Ok(Message::Text(text))) => {
                    // Handle relay control messages
                    let msg: serde_json::Value = serde_json::from_str(&text)
                        .map_err(|e| TransportError::Protocol(e.to_string()))?;

                    if msg["type"] == "relay.peer_disconnected" {
                        return Err(TransportError::Closed);
                    }

                    // Skip other text messages
                    continue;
                }
                Some(Ok(Message::Close(_))) => {
                    self.state = TransportState::Disconnected;
                    return Err(TransportError::Closed);
                }
                Some(Err(e)) => {
                    self.state = TransportState::Disconnected;
                    return Err(TransportError::RecvFailed(e.to_string()));
                }
                None => {
                    self.state = TransportState::Disconnected;
                    return Err(TransportError::Closed);
                }
                _ => continue,
            }
        }
    }

    async fn close(&mut self) -> Result<(), TransportError> {
        if let Some(ws) = self.ws.as_mut() {
            let _ = ws.close(None).await;
        }
        self.ws = None;
        self.state = TransportState::Disconnected;
        Ok(())
    }

    fn state(&self) -> TransportState {
        self.state
    }

    fn mode(&self) -> TransportMode {
        TransportMode::WebSocket
    }

    fn can_upgrade(&self) -> bool {
        self.state == TransportState::Connected
    }
}
