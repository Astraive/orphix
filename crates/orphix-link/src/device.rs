use serde::{Deserialize, Serialize};
use uuid::Uuid;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use crate::crypto::DeviceKeyPair;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceIdentity {
    pub device_id: String,
    pub device_type: String,
    pub device_name: String,
    pub platform: String,
    pub app_version: String,
    pub key_pair: DeviceKeyPair,
    /// SPKI DER public key (base64) — used for registration with the control API.
    /// When set, this overrides `public_key_base64()` in `to_registration_payload()`.
    /// Needed because the link API's `crypto.verify()` expects SPKI DER format.
    #[serde(default)]
    pub spki_der_public_key: Option<String>,
}

impl DeviceIdentity {
    pub fn new(device_type: &str, device_name: &str, platform: &str) -> Self {
        Self {
            device_id: format!("dev_{}", Uuid::new_v4().as_simple()),
            device_type: device_type.to_string(),
            device_name: device_name.to_string(),
            platform: platform.to_string(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            key_pair: DeviceKeyPair::generate(),
            spki_der_public_key: None,
        }
    }

    /// Create a DeviceIdentity from an existing device_id and PKCS8 DER private key.
    /// Used when the desktop has already registered the device and generated a keypair
    /// via Node.js `generateKeyPairSync("ed25519")`.
    ///
    /// Also accepts the SPKI DER public key (base64) from the desktop's device-identity.json.
    /// This is needed because the link API uses Node.js `crypto.verify()` which expects
    /// SPKI DER format, not raw 32-byte Ed25519 public keys.
    pub fn from_existing(
        device_id: &str,
        pkcs8_der_b64: &str,
        spki_der_pub_b64: &str,
    ) -> Result<Self, String> {
        let der_bytes = BASE64.decode(pkcs8_der_b64)
            .map_err(|e| format!("Invalid base64 private key: {}", e))?;

        // Extract 32-byte Ed25519 seed from PKCS8 DER
        // Node.js PKCS8 DER for Ed25519 is exactly 48 bytes:
        //   16-byte ASN.1 header + 32-byte seed
        // The header for Ed25519 is: 30 2e 02 01 00 30 05 06 03 2b 65 70 04 22 04 20
        const ED25519_PKCS8_HEADER: [u8; 16] = [
            0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
            0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
        ];

        let seed = if der_bytes.len() == 48 && der_bytes[..16] == ED25519_PKCS8_HEADER {
            // Standard Ed25519 PKCS8 DER
            let mut s = [0u8; 32];
            s.copy_from_slice(&der_bytes[16..48]);
            s
        } else if der_bytes.len() == 32 {
            // Raw 32-byte seed (no wrapping)
            let mut s = [0u8; 32];
            s.copy_from_slice(&der_bytes);
            s
        } else if der_bytes.len() > 48 {
            // Try offset 16 with header validation (handles some longer encodings)
            if der_bytes.len() >= 48 && der_bytes[..16] == ED25519_PKCS8_HEADER {
                let mut s = [0u8; 32];
                s.copy_from_slice(&der_bytes[16..48]);
                s
            } else {
                return Err(format!("DER length {} with unrecognized ASN.1 header", der_bytes.len()));
            }
        } else {
            return Err(format!("Unexpected DER length: {} bytes (expected 32 or 48)", der_bytes.len()));
        };

        let key_pair = DeviceKeyPair::from_seed(&seed);

        // Store the SPKI DER public key (base64) for the link API's crypto.verify
        // and cross-validate it matches the derived key
        let spki_public = if spki_der_pub_b64.is_empty() {
            None
        } else {
            let spki_bytes = BASE64.decode(spki_der_pub_b64)
                .map_err(|e| format!("Invalid base64 public key: {}", e))?;

            // SPKI DER for Ed25519: last 32 bytes are the raw public key
            if spki_bytes.len() >= 32 {
                let spki_pub = &spki_bytes[spki_bytes.len() - 32..];
                if spki_pub != key_pair.public_key.as_slice() {
                    return Err("Private key and public key do not match (derived key != SPKI key)".to_string());
                }
            }

            Some(spki_der_pub_b64.to_string())
        };

        Ok(Self {
            device_id: device_id.to_string(),
            device_type: "desktop".to_string(),
            device_name: actual_device_name(),
            platform: std::env::consts::OS.to_string(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            key_pair,
            spki_der_public_key: spki_public,
        })
    }

    pub fn public_key_base64(&self) -> String {
        self.spki_der_public_key.clone()
            .unwrap_or_else(|| self.key_pair.public_key_base64())
    }

    pub fn sign_challenge(&self, nonce: &str, socket_id: &str, timestamp: i64) -> String {
        let message = format!("{}{}{}", nonce, socket_id, timestamp);
        self.key_pair.sign(message.as_bytes())
    }

    pub fn to_registration_payload(&self) -> serde_json::Value {
        serde_json::json!({
            "deviceId": self.device_id,
            "deviceType": self.device_type,
            "deviceName": self.device_name,
            "publicKey": self.public_key_base64(),
            "platform": self.platform,
            "appVersion": self.app_version,
        })
    }
}

fn actual_device_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .ok()
        .map(|name| name.trim().to_string())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "Orphix Desktop".to_string())
}
