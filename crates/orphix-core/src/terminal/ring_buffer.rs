use parking_lot::Mutex;
use std::collections::VecDeque;

use crate::protocol::TerminalOutputChunk;

const DEFAULT_MAX_ENTRIES: usize = 5000;

pub struct OutputRingBuffer {
    entries: Mutex<VecDeque<TerminalOutputChunk>>,
    next_seq: Mutex<u64>,
    max_entries: usize,
}

impl OutputRingBuffer {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(VecDeque::with_capacity(256)),
            next_seq: Mutex::new(0),
            max_entries: DEFAULT_MAX_ENTRIES,
        }
    }

    pub fn push(&self, session_id: &str, data: String) -> TerminalOutputChunk {
        let mut seq_lock = self.next_seq.lock();
        let seq = *seq_lock;
        *seq_lock += 1;
        drop(seq_lock);

        let chunk = TerminalOutputChunk {
            session_id: session_id.to_string(),
            seq,
            data,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        let mut entries = self.entries.lock();
        if entries.len() >= self.max_entries {
            entries.pop_front();
        }
        entries.push_back(chunk.clone());

        chunk
    }

    pub fn latest_seq(&self) -> u64 {
        let seq = *self.next_seq.lock();
        if seq == 0 { 0 } else { seq - 1 }
    }

    pub fn recent(&self, count: usize) -> Vec<TerminalOutputChunk> {
        let entries = self.entries.lock();
        let len = entries.len();
        let start = if len > count { len - count } else { 0 };
        entries.range(start..).cloned().collect()
    }

    pub fn range(&self, from_seq: u64, to_seq: u64) -> Vec<TerminalOutputChunk> {
        let entries = self.entries.lock();
        entries
            .iter()
            .filter(|c| c.seq >= from_seq && c.seq <= to_seq)
            .cloned()
            .collect()
    }
}
