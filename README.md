# 🌌 Gossip (Boltalka) — Sovereign Post-Quantum Messenger & Zero-Knowledge Economic Layer

<p align="center">
  <img src="https://raw.githubusercontent.com/up1t3/Boltalka/master/frontend/public/favicon.svg" width="120" height="120" alt="Gossip Logo" />
</p>

<p align="center">
  <b>Sovereign communication mesh & economic layer with Post-Quantum Lattice Cryptography (NIST FIPS 203 ML-KEM-768), Offline BLE Mesh Radio, Non-Custodial TON/USDT Wallet, and Halo2 Zero-Knowledge Escrow.</b><br/>
  <i>Суверенный коммуникационный меш с постквантовым шифрованием на решетках (NIST FIPS 203), автономной радиосетью BLE Mesh, кошельком и Zero-Knowledge эскроу.</i>
</p>

<p align="center">
  🌍 <b>Available in 8 Languages inside the App:</b><br/>
  <a href="https://skuf-net.ru/?lang=en">🇺🇸 English</a> •
  <a href="https://skuf-net.ru/?lang=es">🇪🇸 Español</a> •
  <a href="https://skuf-net.ru/?lang=zh">🇨🇳 中文</a> •
  <a href="https://skuf-net.ru/?lang=ar">🇸🇦 العربية</a> •
  <a href="https://skuf-net.ru/?lang=fa">🇮🇷 فارسی</a> •
  <a href="https://skuf-net.ru/?lang=fr">🇫🇷 Français</a> •
  <a href="https://skuf-net.ru/?lang=de">🇩🇪 Deutsch</a> •
  <a href="https://skuf-net.ru/?lang=ru">🇷🇺 Русский</a>
</p>

<p align="center">
  <a href="#-security--architecture"><img src="https://img.shields.io/badge/Security-Post--Quantum%20ML--KEM--768-success?style=flat-square" alt="PQC Kyber"></a>
  <a href="#-offline-ble-mesh--dual-engine-transport"><img src="https://img.shields.io/badge/Off--Grid-BLE%20Mesh%200xFA21-critical?style=flat-square" alt="BLE Mesh"></a>
  <a href="#-sovereign-economic-layer-sel"><img src="https://img.shields.io/badge/ZK%20Engine-Halo2%20%2B%20DvP%20Escrow-blueviolet?style=flat-square" alt="Halo2 ZKP"></a>
  <a href="#-лицензия-и-открытый-исходный-код-open-core"><img src="https://img.shields.io/badge/License-BSL%201.1%20%2F%20Dual-blue?style=flat-square" alt="BSL 1.1"></a>
  <a href="https://skuf-net.ru/?lang=en"><img src="https://img.shields.io/badge/Live%20App-Launch%20Web%20%2F%20PWA-purple?style=flat-square" alt="Live Demo"></a>
</p>

---

## 🌐 English Overview (Global Edition)

**Gossip** is a high-load, distributed communication and peer-to-peer economic platform engineered on **Privacy-First & Zero-Trust** principles. The server infrastructure acts strictly as a **blind cryptographic relay**: messages, voice/video calls, files, and economic intents are encrypted on client devices and cannot be decrypted by the server even under full physical host compromise.

### ⚡ Three Pillars of Gossip

1. **For Security & Crypto Geeks (Post-Quantum E2EE & Zero-Knowledge):**
   * **Hybrid Post-Quantum Handshakes:** Combines **ML-KEM-768 (Kyber, NIST FIPS 203)** over the polynomial ring $\mathcal{R}_q = \mathbb{Z}_{3329}[X] / (X^{256} + 1)$ with **Curve25519 (X3DH + Double Ratchet)** to defeat *Harvest Now, Decrypt Later* attacks.
   * **Next-Gen Group Chats (PQ-MLS):** Decentralized **Message Layer Security (RFC 9420)** protocol with $O(\log N)$ key rotation and strict Forward Secrecy.
   * **Zero Phone Number / Zero SIM:** Sovereign authentication via **SRP-6a** and **12-word BIP-39 recovery mnemonics**. Private keys never leave `WebCrypto / OPFS / Secure Enclave`.
   * **Censorship Resistance (DPI Bypass):** Built-in **Fake-TLS Proxy** disguises protocol traffic as standard HTTPS to punch through national firewalls and Deep Packet Inspection.

2. **For Survivalists & Off-Grid Operators (Dual-Engine BLE Mesh):**
   * **Autonomous BLE Mesh Radio (`0xFA21`):** When cell towers or ISPs go dark, smartphones automatically form a multi-hop Bluetooth Low Energy mesh network spanning up to **10 km**.
   * **Anti-Storm Synchronization:** Powered by **Trickle Suppression Timers (RFC 6206)** and **CRDTs (LWW / OR-Set)** for reliable store-and-forward delivery without battery drain.
   * **Blind Uplink Bridging:** Any edge node that catches a weak satellite or cellular signal acts as a `Zstd`-compressed blind relay to sync encrypted mesh packets with the global network.

3. **For Global Business, OTC & Sovereign Commerce (Sovereign Economic Layer — SEL):**
   * **Built-In Non-Custodial Wallet & Halo2 ZK Proofs:** Prove **Solvency** (e.g., holding $\ge \$100\text{k}$) and **Deposit Age** ($\ge 10,080$ blocks against flash-loans) via client-side WebAssembly **Halo2 ZK-SNARKs (Pasta curves)** without revealing your wallet address or balance.
   * **$O(1)$ Blind Semantic Matchmaking:** Match P2P liquidity, B2B commodity clearing, or private HR intents across **10,000,000+ orders in <1.2 µs** using **Uber H3** spatial hexagons and **128-bit BLAKE3 SimHashes** with zero PII exposure.
   * **4-Phase Atomic DvP Smart Escrow & Real-World Oracles:** Staged **10–40–30–20%** settlement with collateral slashing and a 3-Tier Oracle Bridge (**AIS/SOLAS satellite ship tracking**, **SGS PAdES** inspection certs, **TLSNotary 2PC-TLS** customs proofs, and **2-of-3 geo-stamped waybill multi-sig**).

👉 **Read the full Engineering Specifications & RFCs (001–005):** [docs/README.md](docs/README.md) | [Master Architectural Whitepaper](docs/architecture/GOSSIP-SOVEREIGN-ECONOMIC-LAYER-WHITEPAPER.md)

---

## 📖 О проекте

**Gossip** — это высоконагруженная, распределенная коммуникационная платформа, спроектированная по принципу **Privacy-First & Zero-Trust**. Серверная инфраструктура выступает в роли незрячего криптографического релея: сообщения, вложения, голосовые и видеозвонки шифруются на устройствах пользователей и не могут быть расшифрованы сервером даже при полном физическом компрометации хоста.

### 🌟 Ключевые преимущества
* **Постквантовая криптография (PQC)**: Реализация **ML-KEM-768 (Kyber, NIST FIPS 203)** в кольце многочленов $\mathcal{R}_q = \mathbb{Z}_{3329}[X] / (X^{256} + 1)$ в гибридной связке с Curve25519 (защита от атак «Harvest Now, Decrypt Later»).
* **Групповые чаты нового поколения (PQ-MLS)**: Децентрализованный протокол **Message Layer Security (RFC 9420)** с ротацией ключей $O(\log N)$ и Forward Secrecy.
* **Личные чаты (Double Ratchet + X3DH)**: Полноценная цепочка Диффи-Хеллмана с покадровым храповиком и постквантовым гибридом.
* **Zero-Knowledge Консоль Администратора**: Аналитика кластера, статистика лицензий и мониторинг инфраструктуры без доступа к метаданным и содержимому переписки.
* **Device & Binary Attestation Guard**: Проверка криптографической подлинности клиентских бинарников (Keystore SHA-256) для защиты от модифицированных клонов.
* **Устойчивость к цензуре (DPI Bypass)**: Fake TLS Proxy для маскировки служебного трафика под стандартный HTTPS.

---

## 🏗️ Архитектура системы

```
                              [ Клиентские платформы ]
                  ┌───────────────┬───────────────┬──────────────┐
                  ▼               ▼               ▼              ▼
             Android APK       iOS PWA        Web Client      Electron
             (Capacitor)    (WebContainer)      (Vite)       (Desktop)
                  │               │               │              │
                  └───────────────┼───────────────┴──────────────┘
                                  │ (MLS E2EE / Kyber-768 / X3DH)
                                  ▼
                     ┌─────────────────────────┐
                     │ Nginx SSL / Fake TLS    │
                     │  (TLS 1.3 / DPI Bypass) │
                     └────────────┬────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
          ┌──────────────────┐        ┌──────────────────┐
          │   Envoy Proxy    │        │   MessageApi     │
          │   (WebSockets)   │        │   (FastAPI REST) │
          └─────────┬────────┘        └─────────┬────────┘
                    │                           │
         ┌──────────┴──────────┐      ┌─────────┴─────────┐
         ▼                     ▼      ▼                   ▼
  [ GatewayNode ]        [ ChatNode ] │   [ PostgreSQL ]  │ (Пользователи/Лицензии)
  (Push & Sessions)      (Fanout MQ)  │   [ ScyllaDB ]    │ (E2EE хранилище)
                                      │   [ Redis ]       │ (Сессии & Rate Limit)
                                      └───────────────────┘
```

---

## 🚀 Быстрый старт для разработчиков

### 1. Клонирование репозитория
```bash
git clone https://github.com/up1t3/Boltalka.git
cd Boltalka
```

### 2. Запуск локального окружения (Docker Compose)
Создайте файл `.env` на основе примера:
```bash
cp .env.example .env
docker compose up -d --build
```

### 3. Запуск веб-клиента для разработки
```bash
cd frontend
npm install
npm run dev
```
Фронтенд будет доступен по адресу: `http://localhost:5173`.

### 4. Сборка мобильного приложения (Android APK)
```bash
cd frontend
npm run build:apk    # Сборка отладочного APK
npm run apk:build    # Сборка релизного APK с подписью
```

### 5. Сборка Desktop-приложения (Electron)
```bash
cd frontend
npm run electron:build
```

---

## 🔐 Модель безопасности и Zero-Knowledge

1. **Сервер не хранит приватные ключи**: Идентификационные ключи (`IdentityKey`), прекеи (`PreKeys`) и деревья ключей MLS генерируются исключительно в безопасном хранилище браузера/устройства (`OPFS / IndexedDB / WebCrypto`).
2. **Медиафайлы**: Все вложения (фото, видео, голосовые сообщения) шифруются симметричным ключом AES-GCM-256 до отправки на сервер. Сервер сохраняет только зашифрованные блобы.
3. **Защита панели администратора**:
   * Вход защищен алгоритмом `hmac.compare_digest` (защита от тайминг-атак).
   * Встроенный **Rate Limiter**: блокировка IP на 15 минут после 5 неудачных попыток перебора.
   * Изоляция портов: СУБД (PostgreSQL, Redis, ScyllaDB, Kafka) слушают строго на `127.0.0.1`.

---

## 📜 Лицензия и Открытый Исходный Код (Open-Core)

Проект распространяется по модели **Dual License / Business Source License 1.1 (BSL 1.1)**:

* **Для частных лиц и сообщества**: Исходный код **100% открыт и бесплатен** для личного использования, образовательных целей, аудита безопасности и независимой сборки.
* **Для малого бизнеса (до 25 пользователей)**: Бесплатное коммерческое использование полного On-Premise функционала.
* **Для Enterprise (более 25 пользователей)**: Требуется коммерческая лицензия с поддержкой корпоративных интеграций (Active Directory / LDAP, SIEM, выделенный контур).
* **Автоматический переход в GPLv3**: Через 4 года каждая версия автоматически переходит под лицензию `GNU General Public License v3.0`.

Подробнее: см. файл [LICENSE](LICENSE).

---

## 🤝 Вклад в проект и Аудит Безопасности

Мы приветствуем независимый криптографический аудит и вклад сообщества:
1. Ознакомьтесь с [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
2. Соблюдайте политику ответственного раскрытия уязвимостей ([docs/SECURITY.md](docs/SECURITY.md)).
3. Создавайте Pull Request с подробным описанием изменений.
