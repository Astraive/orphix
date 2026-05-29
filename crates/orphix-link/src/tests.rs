#[cfg(test)]
mod tests {
    use crate::protocol::{LinkFrame, FrameKind};
    use crate::transport::crypto::SessionKeys;

    // ── Frame Protocol Tests ──

    #[test]
    fn frame_roundtrip() {
        let frame = LinkFrame::new(
            FrameKind::TerminalStdin,
            "sess_123",
            serde_json::json!({"data": "ls -la\n"}),
        )
        .with_stream("term_1")
        .with_seq(42);

        let bytes = frame.to_bytes();
        let decoded = LinkFrame::from_bytes(&bytes).unwrap();

        assert_eq!(decoded.v, 1);
        assert_eq!(decoded.session_id, "sess_123");
        assert_eq!(decoded.stream_id, "term_1");
        assert_eq!(decoded.seq, 42);
        assert_eq!(decoded.kind, FrameKind::TerminalStdin);
        assert_eq!(decoded.payload["data"], "ls -la\n");
    }

    #[test]
    fn frame_peer_metadata_roundtrip() {
        let frame = LinkFrame::new(
            FrameKind::TerminalStdout,
            "sess_123",
            serde_json::json!({"data": "ok"}),
        )
        .with_stream("term_1")
        .with_peers("mobile_1", "desktop_1")
        .with_relay_metadata(crate::protocol::frame::RelayMetadata {
            active_transport: Some("websocket".to_string()),
            requested_mode: Some("auto".to_string()),
            packet_size: Some(128),
        });

        let decoded = LinkFrame::from_bytes(&frame.to_bytes()).unwrap();
        assert_eq!(decoded.from_peer, "mobile_1");
        assert_eq!(decoded.to_peer, "desktop_1");
        assert_eq!(decoded.relay.unwrap().active_transport.unwrap(), "websocket");
    }

    #[test]
    fn frame_kinds_serialization() {
        let kinds = vec![
            (FrameKind::SessionHello, "session.hello"),
            (FrameKind::TerminalStdin, "terminal.stdin"),
            (FrameKind::TerminalStdout, "terminal.stdout"),
            (FrameKind::TerminalCreate, "terminal.create"),
            (FrameKind::TerminalResize, "terminal.resize"),
            (FrameKind::TerminalExit, "terminal.exit"),
            (FrameKind::TransportWebrtcOffer, "transport.webrtc.offer"),
            (FrameKind::RpcRequest, "rpc.request"),
            (FrameKind::FileRead, "file.read"),
        ];

        for (kind, expected) in kinds {
            let json = serde_json::to_string(&kind).unwrap();
            assert_eq!(json, format!("\"{}\"", expected), "Failed for {:?}", kind);

            let decoded: FrameKind = serde_json::from_str(&json).unwrap();
            assert_eq!(decoded, kind, "Roundtrip failed for {:?}", kind);
        }
    }

    #[test]
    fn frame_kind_categories() {
        assert!(FrameKind::SessionHello.is_session());
        assert!(FrameKind::SessionHeartbeat.is_session());
        assert!(!FrameKind::TerminalStdin.is_session());

        assert!(FrameKind::TerminalCreate.is_terminal());
        assert!(FrameKind::TerminalStdin.is_terminal());
        assert!(!FrameKind::SessionHello.is_terminal());

        assert!(FrameKind::TransportWebrtcOffer.is_signaling());
        assert!(FrameKind::TransportWebrtcIce.is_signaling());
        assert!(!FrameKind::TerminalStdin.is_signaling());
    }

    #[test]
    fn frame_flags() {
        let frame = LinkFrame::new(FrameKind::TerminalStdout, "sess_1", serde_json::json!("hello"))
            .with_encrypted(true);

        assert!(frame.flags.encrypted);
        assert!(!frame.flags.compressed);

        let bytes = frame.to_bytes();
        let decoded = LinkFrame::from_bytes(&bytes).unwrap();
        assert!(decoded.flags.encrypted);
    }

    #[test]
    fn frame_empty_payload() {
        let frame = LinkFrame::new(FrameKind::SessionHeartbeat, "sess_1", serde_json::Value::Null);
        let bytes = frame.to_bytes();
        let decoded = LinkFrame::from_bytes(&bytes).unwrap();
        assert_eq!(decoded.payload, serde_json::Value::Null);
    }

    // ── E2EE Crypto Tests ──

    #[test]
    fn e2ee_full_handshake() {
        let mut alice = SessionKeys::generate();
        let mut bob = SessionKeys::generate();

        // Exchange public keys
        alice.complete_exchange(&bob.our_public).unwrap();
        bob.complete_exchange(&alice.our_public).unwrap();

        // Derive keys with same session ID
        alice.derive_key("sess_test").unwrap();
        bob.derive_key("sess_test").unwrap();

        assert!(alice.is_ready());
        assert!(bob.is_ready());
    }

    #[test]
    fn e2ee_approval_nonce_affects_key() {
        let mut alice = SessionKeys::generate();
        let mut bob = SessionKeys::generate();

        alice.complete_exchange(&bob.our_public).unwrap();
        bob.complete_exchange(&alice.our_public).unwrap();
        alice.derive_key_with_nonce("sess_1", "nonce_a").unwrap();
        bob.derive_key_with_nonce("sess_1", "nonce_b").unwrap();

        let encrypted = alice.encrypt(b"secret", b"aad").unwrap();
        assert!(bob.decrypt(&encrypted, b"aad").is_err());
    }

    #[test]
    fn e2ee_encrypt_decrypt_roundtrip() {
        let mut alice = SessionKeys::generate();
        let mut bob = SessionKeys::generate();

        alice.complete_exchange(&bob.our_public).unwrap();
        bob.complete_exchange(&alice.our_public).unwrap();
        alice.derive_key("sess_1").unwrap();
        bob.derive_key("sess_1").unwrap();

        let plaintext = b"Hello, Orphix!";
        let aad = b"session_id|stream_id|seq|kind";

        let encrypted = alice.encrypt(plaintext, aad).unwrap();
        let decrypted = bob.decrypt(&encrypted, aad).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn e2ee_different_session_keys() {
        let mut alice = SessionKeys::generate();
        let mut bob = SessionKeys::generate();

        alice.complete_exchange(&bob.our_public).unwrap();
        bob.complete_exchange(&alice.our_public).unwrap();
        alice.derive_key("session_A").unwrap();
        bob.derive_key("session_B").unwrap(); // Different session!

        let plaintext = b"secret";
        let aad = b"metadata";

        let encrypted = alice.encrypt(plaintext, aad).unwrap();
        let result = bob.decrypt(&encrypted, aad);

        assert!(result.is_err(), "Decrypt should fail with different session keys");
    }

    #[test]
    fn e2ee_wrong_aad_fails() {
        let mut alice = SessionKeys::generate();
        let mut bob = SessionKeys::generate();

        alice.complete_exchange(&bob.our_public).unwrap();
        bob.complete_exchange(&alice.our_public).unwrap();
        alice.derive_key("sess_1").unwrap();
        bob.derive_key("sess_1").unwrap();

        let plaintext = b"tamper me";
        let encrypted = alice.encrypt(plaintext, b"correct_aad").unwrap();

        // Try decrypt with wrong AAD
        let result = bob.decrypt(&encrypted, b"wrong_aad");
        assert!(result.is_err(), "Decrypt should fail with wrong AAD");
    }

    #[test]
    fn e2ee_random_nonces() {
        let mut alice = SessionKeys::generate();
        let mut bob = SessionKeys::generate();

        alice.complete_exchange(&bob.our_public).unwrap();
        bob.complete_exchange(&alice.our_public).unwrap();
        alice.derive_key("sess_1").unwrap();
        bob.derive_key("sess_1").unwrap();

        let plaintext = b"same message";
        let aad = b"metadata";

        let enc1 = alice.encrypt(plaintext, aad).unwrap();
        let enc2 = alice.encrypt(plaintext, aad).unwrap();

        // Different nonces = different ciphertext
        assert_ne!(enc1, enc2, "Same plaintext should produce different ciphertext");

        // Both should decrypt correctly
        assert_eq!(bob.decrypt(&enc1, aad).unwrap(), plaintext);
        assert_eq!(bob.decrypt(&enc2, aad).unwrap(), plaintext);
    }

    #[test]
    fn e2ee_wrong_key_fails() {
        let mut alice = SessionKeys::generate();
        let mut bob = SessionKeys::generate();

        alice.complete_exchange(&bob.our_public).unwrap();
        bob.complete_exchange(&alice.our_public).unwrap();
        alice.derive_key("sess_1").unwrap();
        bob.derive_key("sess_1").unwrap();

        let plaintext = b"secret";
        let encrypted = alice.encrypt(plaintext, b"aad").unwrap();

        // Try to decrypt with alice's key (should fail - different direction)
        // Actually both derive same key, so this tests wrong-key scenario via
        // a third party
        let mut eve = SessionKeys::generate();
        let mallory = SessionKeys::generate();
        eve.complete_exchange(&mallory.our_public).unwrap();
        eve.derive_key("sess_1").unwrap();

        let result = eve.decrypt(&encrypted, b"aad");
        assert!(result.is_err(), "Third party should not be able to decrypt");
    }

    #[test]
    fn e2ee_double_exchange_fails() {
        let mut alice = SessionKeys::generate();
        let bob = SessionKeys::generate();

        alice.complete_exchange(&bob.our_public).unwrap();
        let result = alice.complete_exchange(&bob.our_public);
        assert!(result.is_err(), "Double exchange should fail");
    }

    #[test]
    fn e2ee_derive_before_exchange_fails() {
        let mut keys = SessionKeys::generate();
        let result = keys.derive_key("sess_1");
        assert!(result.is_err(), "Derive before exchange should fail");
    }

    #[test]
    fn e2ee_encrypt_before_derive_fails() {
        let mut alice = SessionKeys::generate();
        let bob = SessionKeys::generate();
        alice.complete_exchange(&bob.our_public).unwrap();

        let result = alice.encrypt(b"test", b"aad");
        assert!(result.is_err(), "Encrypt before derive should fail");
    }

    #[test]
    fn e2ee_tampered_ciphertext_fails() {
        let mut alice = SessionKeys::generate();
        let mut bob = SessionKeys::generate();

        alice.complete_exchange(&bob.our_public).unwrap();
        bob.complete_exchange(&alice.our_public).unwrap();
        alice.derive_key("sess_1").unwrap();
        bob.derive_key("sess_1").unwrap();

        let mut encrypted = alice.encrypt(b"secret", b"aad").unwrap();
        // Tamper with ciphertext (flip a bit in the encrypted portion, not the nonce)
        if encrypted.len() > 15 {
            encrypted[15] ^= 0xff;
        }

        let result = bob.decrypt(&encrypted, b"aad");
        assert!(result.is_err(), "Tampered ciphertext should fail");
    }

    #[test]
    fn e2ee_large_payload() {
        let mut alice = SessionKeys::generate();
        let mut bob = SessionKeys::generate();

        alice.complete_exchange(&bob.our_public).unwrap();
        bob.complete_exchange(&alice.our_public).unwrap();
        alice.derive_key("sess_1").unwrap();
        bob.derive_key("sess_1").unwrap();

        // 64KB payload
        let plaintext: Vec<u8> = (0..65536).map(|i| (i % 256) as u8).collect();
        let aad = b"metadata";

        let encrypted = alice.encrypt(&plaintext, aad).unwrap();
        let decrypted = bob.decrypt(&encrypted, aad).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn e2ee_empty_payload() {
        let mut alice = SessionKeys::generate();
        let mut bob = SessionKeys::generate();

        alice.complete_exchange(&bob.our_public).unwrap();
        bob.complete_exchange(&alice.our_public).unwrap();
        alice.derive_key("sess_1").unwrap();
        bob.derive_key("sess_1").unwrap();

        let encrypted = alice.encrypt(b"", b"aad").unwrap();
        // nonce(12) + tag(16) = 28 bytes minimum
        assert!(encrypted.len() >= 28);
        let decrypted = bob.decrypt(&encrypted, b"aad").unwrap();
        assert!(decrypted.is_empty());
    }

    #[test]
    fn e2ee_100_sequential_messages() {
        let mut alice = SessionKeys::generate();
        let mut bob = SessionKeys::generate();

        alice.complete_exchange(&bob.our_public).unwrap();
        bob.complete_exchange(&alice.our_public).unwrap();
        alice.derive_key("sess_1").unwrap();
        bob.derive_key("sess_1").unwrap();

        for i in 0..100 {
            let msg = format!("message_{}", i);
            let encrypted = alice.encrypt(msg.as_bytes(), b"aad").unwrap();
            let decrypted = bob.decrypt(&encrypted, b"aad").unwrap();
            assert_eq!(decrypted, msg.as_bytes(), "Failed at message {}", i);
        }
    }

    #[test]
    fn e2ee_forward_secrecy() {
        // First session
        let mut alice1 = SessionKeys::generate();
        let bob1 = SessionKeys::generate();
        alice1.complete_exchange(&bob1.our_public).unwrap();
        let old_public = alice1.our_public.clone();

        // Second session (new ephemeral keys)
        let mut alice2 = SessionKeys::generate();
        let bob2 = SessionKeys::generate();
        alice2.complete_exchange(&bob2.our_public).unwrap();
        alice2.derive_key("sess_2").unwrap();

        // Different ephemeral keys = forward secrecy
        assert_ne!(old_public, alice2.our_public);
    }
}
