use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer, Verifier};
use rand::rngs::OsRng;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct DeviceKeyPair {
    pub public_key: Vec<u8>,
    signing_key: SigningKey,
}

impl std::fmt::Debug for DeviceKeyPair {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DeviceKeyPair")
            .field("public_key", &BASE64.encode(&self.public_key))
            .finish()
    }
}

impl Serialize for DeviceKeyPair {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("DeviceKeyPair", 2)?;
        state.serialize_field("public_key", &BASE64.encode(&self.public_key))?;
        state.serialize_field("signing_key", &BASE64.encode(self.signing_key.to_bytes()))?;
        state.end()
    }
}

impl<'de> Deserialize<'de> for DeviceKeyPair {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        struct DeviceKeyPairData {
            public_key: String,
            signing_key: String,
        }
        let data = DeviceKeyPairData::deserialize(deserializer)?;
        let pk_bytes = BASE64.decode(&data.public_key).map_err(serde::de::Error::custom)?;
        let sk_bytes = BASE64.decode(&data.signing_key).map_err(serde::de::Error::custom)?;
        let sk_array: [u8; 32] = sk_bytes.try_into().map_err(|_| serde::de::Error::custom("Invalid signing key length"))?;
        let signing_key = SigningKey::from_bytes(&sk_array);
        Ok(Self { public_key: pk_bytes, signing_key })
    }
}

impl DeviceKeyPair {
    pub fn generate() -> Self {
        let signing_key = SigningKey::generate(&mut OsRng);
        let public_key = signing_key.verifying_key().to_bytes().to_vec();
        Self { public_key, signing_key }
    }

    pub fn from_seed(seed: &[u8; 32]) -> Self {
        let signing_key = SigningKey::from_bytes(seed);
        let public_key = signing_key.verifying_key().to_bytes().to_vec();
        Self { public_key, signing_key }
    }

    pub fn public_key_base64(&self) -> String {
        BASE64.encode(&self.public_key)
    }

    pub fn sign(&self, message: &[u8]) -> String {
        let signature = self.signing_key.sign(message);
        BASE64.encode(signature.to_bytes())
    }

    pub fn verify(public_key_bytes: &[u8], message: &[u8], signature_b64: &str) -> bool {
        let Ok(sig_bytes) = BASE64.decode(signature_b64) else { return false; };
        let Ok(sig) = Signature::from_slice(&sig_bytes) else { return false; };
        let Ok(pk_array) = <[u8; 32]>::try_from(public_key_bytes) else { return false; };
        let Ok(verifying_key) = VerifyingKey::from_bytes(&pk_array) else { return false; };
        verifying_key.verify(message, &sig).is_ok()
    }
}
