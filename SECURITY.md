# 🛡️ Gossip Security Policy, Cryptographic Verification & Bug Bounty

Gossip is engineered on a **Zero-Knowledge, Client-Side Trust** model inspired by Signal, SimpleX, and Proton. The backend infrastructure operates strictly as an untrusted cryptographic relay and blind directory.

---

## 1. Zero-Knowledge Threat Model & Cryptographic Primitives

| Layer | Protocol / Primitive | Security Guarantee |
| :--- | :--- | :--- |
| **Asynchronous Key Agreement** | **X3DH** (Extended Triple Diffie-Hellman, Curve25519 / Ed25519) | Establishes shared session secrets with offline peers using signed and one-time public prekeys (`OPK`). |
| **Post-Quantum Hybrid KEM** | **ML-KEM-768 (NIST FIPS 203)** + **X25519** | Protects session establishment against "Harvest Now, Decrypt Later" quantum adversaries. |
| **Message Ratcheting** | **Double Ratchet** (AES-256-GCM / HKDF-SHA256) | Provides Forward Secrecy (FS) and Post-Compromise Security (PCS) for every individual message. |
| **Voice & Media E2EE** | **Ephemeral AES-256-GCM** (`mediaKey` + `mediaIv` per attachment) | Media blobs are encrypted on the device before upload; the server stores only opaque `.enc` ciphertext. |
| **Non-Custodial Web3 Wallet** | **TON Wallet V4R2** (`@ton/crypto` Ed25519 + BIP-39 / TEP-74 Jettons) | Mnemonics and private keys are generated and encrypted locally via PBKDF2-HMAC-SHA256 (100,000 iterations) + AES-256-GCM. The server only broadcasts signed BOC payloads. |
| **Local Storage Vault** | **Encrypted IndexedDB / SQLite Vault** | All local session states and private keys are encrypted at rest on the client device. |

---

## 2. Public Prekey Directory Contract (Why Private Keys Never Leave Your Device)

To enable asynchronous end-to-end encrypted messaging when a recipient's device is offline, Gossip uses a standard X3DH Prekey Bundle directory (`POST /api/v1/crypto/prekey/publish`), implemented in [`frontend/src/core/crypto/e2ee.ts`](frontend/src/core/crypto/e2ee.ts):

- **What stays strictly on the device**:
  - Identity Private Key (`e2ee_ik_priv`)
  - Signed Prekey Private Key (`e2ee_spk_priv`)
  - One-Time Prekey Private Keys (`localOpks[id].priv`)
  - Double Ratchet root and chain keys (`rk`, `ckS`, `ckR`)
  - TON Wallet 24-word mnemonic phrase and Ed25519 secret key
- **What is published to the server relay**:
  - Only **public** keys (`identityKey: ikPub`, `signedPrekey.key: spkPub`, `oneTimePrekeys[].key: localOpks[id].pub`, `deviceKeyKyber: mlsKyberPub`).
- Anyone can audit [`ensureAndPublishPrekeys()`](frontend/src/core/crypto/e2ee.ts) in the open client repository to verify that `.priv` fields are never serialized into any network request.

---

## 3. Official Android APK Signature & Binary Verification

Every official release of the Gossip Android application (`com.gossip.app`) is cryptographically signed using our single canonical production hardware/release key (V1 + V2 + V3 + V4 APK Signature Schemes).

### Canonical Signing Certificate Fingerprint
- **Package Name**: `com.gossip.app`
- **Key Alias**: `gossip`
- **SHA-256 Certificate Fingerprint**:
  ```text
  EC:3E:02:AF:DE:F5:C9:56:A4:2C:7B:9F:6F:25:FE:91:AA:78:91:7D:DD:75:B7:7E:F8:D8:50:7D:11:E8:FE:A0
  ```
  *(Hex continuous: `ec3e02afdef5c956a42c7b9f6f25fe91aa78917ddd75b77ef8d8507d11e8fea0`)*

### How to Verify Downloaded APK Integrity
Before or after installing `gossip.apk`, security researchers and users can verify the cryptographic signature using the Android SDK `apksigner` or standard JDK `keytool`:

```bash
# Option A: Using Android SDK apksigner
apksigner verify --print-certs gossip.apk

# Option B: Using JDK keytool
keytool -printcert -jarfile gossip.apk | grep -i "SHA256"
```

**Strict Verification Rule**: If the SHA-256 digest does not exactly match `EC:3E:02:AF:DE:F5:C9:56:A4:2C:7B:9F:6F:25:FE:91:AA:78:91:7D:DD:75:B7:7E:F8:D8:50:7D:11:E8:FE:A0`, **do not install the binary** and report it immediately to `security@skuf-net.ru`.

### Reproducible Client Inspection
Because the Gossip client is built on Capacitor + Vite/TypeScript, researchers can directly inspect the exact JavaScript/WebAssembly bundle packaged inside any official `gossip.apk` and compare it against the public `frontend/` source tree:

```bash
unzip -q gossip.apk -d apk_extracted
ls -la apk_extracted/assets/public/assets/
```

---

## 4. Dual-Contour Open Source Policy (Open-Client / Closed-Core)

Following industry best practices established by **Telegram, Proton, and Signal**:
1. **Public Client & Cryptographic Core (`gossip-public`)**:
   - Full source code of the web, desktop, and mobile client (`frontend/`), including all E2EE protocols (X3DH, Double Ratchet, Safety Numbers), offline Bluetooth/Wi-Fi Mesh transport, and non-custodial TON Wallet signing.
2. **Private Infrastructure & Anti-DPI Core**:
   - Server-side Anti-DPI obfuscation rules, anti-fraud heuristics, cluster deployment topologies, and internal stress-test harnesses are maintained in a private repository to prevent censorship authorities (DPI/TSPU) from crafting targeted blocking signatures and to protect commercial intellectual property.

---

## 5. Bug Bounty & Responsible Disclosure Policy

We welcome independent security researchers and cryptographers to audit our client code and protocol implementations.

### Scope
- **Critical / High**:
  - E2EE cryptographic bypass, key recovery, or plaintext leakage in `frontend/src/core/crypto/`
  - Non-custodial TON Wallet key extraction or unauthorized transaction signing in `frontend/src/features/ton/`
  - Remote Code Execution (RCE), SQL Injection, or Authentication Bypass on production gateways
  - DvP Escrow state-machine manipulation or double-spend in Pulse decentralized market
- **Out of Scope**:
  - Volumetric DDoS attacks against relay nodes
  - Social engineering or physical device compromise with unlocked OS screen

### Reporting & Safe Harbor
- **Contact**: `security@skuf-net.ru`
- **SLA**: Initial acknowledgment within **24 hours**, triage and severity classification within **72 hours**.
- **Safe Harbor**: Good-faith security research conducted in accordance with this policy is authorized and exempt from legal pursuit. Please allow up to 30 days for remediation and coordinated patch rollout before public disclosure.
