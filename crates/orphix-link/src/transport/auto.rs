use async_trait::async_trait;
use crate::protocol::LinkFrame;
use super::{LinkTransport, TransportError, TransportMode, TransportState};
use super::websocket::WebSocketRelayTransport;
use super::webrtc::WebRtcTransport;

/// Auto transport mode.
/// Starts with WebSocket relay, attempts WebRTC upgrade in background.
/// Falls back to relay if WebRTC fails.
pub struct AutoTransport {
    state: TransportState,
    relay: WebSocketRelayTransport,
    webrtc: Option<WebRtcTransport>,
    using_webrtc: bool,
    upgrade_attempted: bool,
    session_id: String,
}

impl AutoTransport {
    pub fn new(
        link_url: impl Into<String>,
        session_id: impl Into<String>,
        access_token: impl Into<String>,
        device_id: impl Into<String>,
        role: impl Into<String>,
    ) -> Self {
        let session_id_str = session_id.into();
        Self {
            state: TransportState::Disconnected,
            relay: WebSocketRelayTransport::new(link_url, &session_id_str, access_token, device_id, role),
            webrtc: None,
            using_webrtc: false,
            upgrade_attempted: false,
            session_id: session_id_str,
        }
    }

    /// Attempt to upgrade to WebRTC in background
    async fn try_upgrade(&mut self) {
        if self.upgrade_attempted || self.using_webrtc {
            return;
        }
        self.upgrade_attempted = true;

        let mut webrtc = WebRtcTransport::new(&self.session_id);
        match webrtc.connect().await {
            Ok(()) => {
                self.webrtc = Some(webrtc);
                self.using_webrtc = true;
                // TODO: Migrate active streams to WebRTC
            }
            Err(_) => {
                // WebRTC failed, stay on relay
            }
        }
    }
}

#[async_trait]
impl LinkTransport for AutoTransport {
    async fn connect(&mut self) -> Result<(), TransportError> {
        self.state = TransportState::Connecting;

        // Always start with relay
        self.relay.connect().await?;
        self.state = TransportState::Connected;

        // Try WebRTC upgrade in background
        // In production, this would be spawned as a background task
        // For now, we'll attempt it synchronously after relay connects
        self.try_upgrade().await;

        Ok(())
    }

    async fn send(&mut self, frame: &LinkFrame) -> Result<(), TransportError> {
        if self.using_webrtc {
            if let Some(webrtc) = self.webrtc.as_mut() {
                return webrtc.send(frame).await;
            }
        }
        self.relay.send(frame).await
    }

    async fn recv(&mut self) -> Result<LinkFrame, TransportError> {
        if self.using_webrtc {
            if let Some(webrtc) = self.webrtc.as_mut() {
                match webrtc.recv().await {
                    Ok(frame) => return Ok(frame),
                    Err(_) => {
                        // WebRTC failed, fall back to relay
                        self.using_webrtc = false;
                        self.webrtc = None;
                    }
                }
            }
        }
        self.relay.recv().await
    }

    async fn close(&mut self) -> Result<(), TransportError> {
        if let Some(webrtc) = self.webrtc.as_mut() {
            let _ = webrtc.close().await;
        }
        self.relay.close().await?;
        self.state = TransportState::Disconnected;
        Ok(())
    }

    fn state(&self) -> TransportState {
        if self.using_webrtc {
            self.webrtc.as_ref().map(|w| w.state()).unwrap_or(self.state)
        } else {
            self.relay.state()
        }
    }

    fn mode(&self) -> TransportMode {
        if self.using_webrtc {
            TransportMode::WebRtc
        } else {
            TransportMode::WebSocket
        }
    }

    fn can_upgrade(&self) -> bool {
        !self.using_webrtc && self.relay.state() == TransportState::Connected
    }
}
