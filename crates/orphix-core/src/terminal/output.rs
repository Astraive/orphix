use std::io::Read;
use std::sync::Arc;
use std::thread;

use tokio::sync::mpsc::UnboundedSender;

use crate::terminal::events::CoreEvent;
use crate::terminal::ring_buffer::OutputRingBuffer;

pub fn spawn_output_reader(
    session_id: String,
    mut reader: Box<dyn Read + Send>,
    ring_buffer: Arc<OutputRingBuffer>,
    event_tx: UnboundedSender<CoreEvent>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    let _ = event_tx.send(CoreEvent::Exit {
                        session_id: session_id.clone(),
                        exit_code: None,
                    });
                    break;
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let chunk = ring_buffer.push(&session_id, data);
                    let _ = event_tx.send(CoreEvent::Output(chunk));
                }
                Err(_) => {
                    let _ = event_tx.send(CoreEvent::Exit {
                        session_id: session_id.clone(),
                        exit_code: None,
                    });
                    break;
                }
            }
        }
    })
}
