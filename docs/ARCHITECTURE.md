# 📐 Gossip System Architecture & Cryptographic Specification

## 1. Cryptographic Primitives & Post-Quantum Hybrid Layer

Gossip uses a Defense-in-Depth hybrid encryption approach combining classical elliptic-curve cryptography with quantum-resistant lattice-based KEM:

### 1.1 Lattice-Based Post-Quantum KEM (ML-KEM-768 / Kyber)
* **Standard**: NIST FIPS 203 / CRYSTALS-Kyber.
* **Algebraic Ring**: $\mathcal{R}_q = \mathbb{Z}_q[X] / (X^n + 1)$, where $n=256, q=3329, k=3$.
* **Security Category**: NIST Level 3 (Equivalent to AES-192 against quantum Grover/Shor attacks).
* **Polynomial Operations**: Constant-time polynomial arithmetic with centered binomial distributions $\beta_\eta$.
* **Hybrid Secret Derivation**:
  $$\text{SharedSecret} = \text{HKDF-Extract-Expand}(\text{Secret}_{\text{ECDH}} \parallel \text{Secret}_{\text{ML-KEM}}, \text{Salt}, \text{Info})$$

### 1.2 Group Messaging (Message Layer Security — RFC 9420)
* **Tree Structure**: Left-balanced binary ratchet trees.
* **Complexity**: Key update / Proposal commit operations run in $O(\log N)$ network bandwidth.
* **Epoch Secret Schedule**:
  * `EpochSecret` $\rightarrow$ `EncryptionSecret`, `SenderDataSecret`, `ConfirmationKey`.
  * `ApplicationSecret` $\rightarrow$ Per-sender ratchet keys.

### 1.3 1-on-1 Direct Messaging (Double Ratchet + X3DH)
* **KDF Chains**: Symmetric-key ratchet with SHA-256 HKDF.
* **DH Ratchet**: Curve25519 per-message key exchange.
* **Out-of-Order Delivery**: Skipped message keys stored in SQLCipher/IndexedDB with configurable TTL.

---

## 2. Microservice Layer & Zero-Knowledge Relay

```
[ Client A ] ───(Encrypted Payload)───► [ Envoy / GatewayNode ]
                                               │
                                               ▼
                                      [ ScyllaDB Storage ]
                                      (Stores Ciphertext Only)
                                               │
                                               ▼
[ Client B ] ◄───(Encrypted Payload)─── [ Kafka Fanout ]
```

### 2.1 Storage Layer:
* **PostgreSQL (Users & Attestations)**: User registration hashes (SRP-6a verifiers), device IDs, Enterprise license records.
* **ScyllaDB (E2EE Messages)**: Bucket-partitioned message storage `((channel_id, bucket_id), timeuuid)`. Zero plaintext access.
* **Redis (Transient Sessions)**: Active user socket routing, sliding rate-limiters, pub/sub presence.
* **Kafka (Broker)**: Distributed message fanout between gateway workers.

---

## 3. Zero-Knowledge Admin Console

The administrator dashboard is designed to provide complete operational visibility without exposing user private communications:
1. **Aggregated Metrics**: Active user sessions, storage volume, node health, license validation.
2. **Device Attestation**: Telemetry showing verified vs unverified client builds.
3. **B2B Pipeline**: Enterprise On-Premise lead management and automated license generation.
