# -*- coding: utf-8 -*-
import json
import os

data = {
  "ru": {
    "hero": {
      "badge": "MLS E2EE • TON Connect 2.0 • ZK-Pulse",
      "title": "Суверенный мессенджер с квантовой защитой и криптоэкономикой",
      "subtitle": "Gossip объединяет сквозное шифрование сообщений нового поколения (MLS IETF RFC 9420), встроенный TON-кошелек и радар P2P-намерений Pulse в едином безопасном интерфейсе.",
      "getStarted": "Начать общение",
      "learnMore": "Архитектура протокола",
      "downloadApk": "Скачать Android APK"
    },
    "features": {
      "title": "Технологический фундамент Gossip",
      "e2eeTitle": "X3DH + Double Ratchet E2EE",
      "e2eeDesc": "Сквозное шифрование для личных диалогов с совершенной прямой секретностью (PFS) и пост-компрометационным восстановлением.",
      "mlsTitle": "MLS Архитектура (RFC 9420)",
      "mlsDesc": "Криптографический протокол Messaging Layer Security с древовидным обменом ключами TreeKEM для безопасных групп любого размера.",
      "tonTitle": "TON Connect 2.0 & Платежи",
      "tonDesc": "Встроенный кошелек, мгновенные P2P-переводы в чате, выставление счетов и смарт-эскроу без комиссий сервиса.",
      "pulseTitle": "Pulse & Радар намерений",
      "pulseDesc": "Sovereign Economic Layer для поиска локальных офферов, P2P-сделок, ZK-голосований и работы с защитой DvP.",
      "dlpTitle": "Сейф-Контур (DLP защита)",
      "dlpDesc": "Аппаратная изоляция конфиденциальных папок: запрет скриншотов, копирования текста и пересылки файлов.",
      "offlineTitle": "BLE Mesh & Локальная связь",
      "offlineDesc": "Автономный обмен сообщениями через Bluetooth Low Energy в условиях отсутствия интернета и сотовой связи."
    },
    "comparison": {
      "title": "Сравнение с аналогами",
      "columnGossip": "Gossip",
      "columnTg": "Telegram",
      "columnSignal": "Signal",
      "rowE2eeGroups": "E2EE в групповых чатах по умолчанию",
      "rowCrypto": "Нативный некастодиальный криптокошелек",
      "rowDlp": "DLP Сейф-Контур против утечек",
      "rowMesh": "Автономная передача через BLE Mesh",
      "rowP2pRadar": "Радар P2P-намерений и DvP Смарт-Эскроу"
    },
    "footer": {
      "copyright": "© 2026 Gossip Protocol. Все права защищены.",
      "privacy": "Политика конфиденциальности",
      "terms": "Условия использования",
      "github": "Исходный код на GitHub",
      "docs": "Техническая документация RFC"
    }
  },
  "en": {
    "hero": {
      "badge": "MLS E2EE • TON Connect 2.0 • ZK-Pulse",
      "title": "Sovereign Messenger with Post-Quantum Security & Crypto Economy",
      "subtitle": "Gossip combines next-generation end-to-end encryption (MLS IETF RFC 9420), embedded TON wallet, and the Pulse P2P intent radar in a single unified, secure client.",
      "getStarted": "Get Started",
      "learnMore": "Protocol Architecture",
      "downloadApk": "Download Android APK"
    },
    "features": {
      "title": "Gossip Technology Foundation",
      "e2eeTitle": "X3DH + Double Ratchet E2EE",
      "e2eeDesc": "End-to-end encryption for 1-on-1 dialogues with Perfect Forward Secrecy (PFS) and Post-Compromise Security.",
      "mlsTitle": "MLS Architecture (RFC 9420)",
      "mlsDesc": "Messaging Layer Security cryptographic protocol with TreeKEM key exchange for secure groups of any size.",
      "tonTitle": "TON Connect 2.0 & Payments",
      "tonDesc": "Non-custodial wallet, instant in-chat P2P transfers, invoices and smart escrow without platform fees.",
      "pulseTitle": "Pulse & Intent Radar",
      "pulseDesc": "Sovereign Economic Layer for local offer discovery, P2P deals, ZK voting, and DvP protected gig execution.",
      "dlpTitle": "Safe Contour (DLP Protection)",
      "dlpDesc": "Hardware-backed isolation of confidential folders: screenshot prevention, anti-copying, and forward blocking.",
      "offlineTitle": "BLE Mesh & Local Comms",
      "offlineDesc": "Off-grid message exchange over Bluetooth Low Energy during Internet blackouts and cellular outages."
    },
    "comparison": {
      "title": "Competitive Comparison",
      "columnGossip": "Gossip",
      "columnTg": "Telegram",
      "columnSignal": "Signal",
      "rowE2eeGroups": "Default E2EE in group chats",
      "rowCrypto": "Native non-custodial crypto wallet",
      "rowDlp": "DLP Safe Contour anti-leak protection",
      "rowMesh": "Offline transmission via BLE Mesh",
      "rowP2pRadar": "P2P intent radar & DvP Smart Escrow"
    },
    "footer": {
      "copyright": "© 2026 Gossip Protocol. All rights reserved.",
      "privacy": "Privacy Policy",
      "terms": "Terms of Service",
      "github": "Source Code on GitHub",
      "docs": "Technical RFC Documentation"
    }
  },
  "es": {
    "hero": {
      "badge": "MLS E2EE • TON Connect 2.0 • ZK-Pulse",
      "title": "Mensajero soberano con seguridad post-cuántica y economía cripto",
      "subtitle": "Gossip combina el cifrado de extremo a extremo de nueva generación (MLS IETF RFC 9420), billetera TON integrada y el radar de intenciones P2P Pulse en un cliente seguro y unificado.",
      "getStarted": "Comenzar",
      "learnMore": "Arquitectura del protocolo",
      "downloadApk": "Descargar APK de Android"
    },
    "features": {
      "title": "Fundamentos tecnológicos de Gossip",
      "e2eeTitle": "X3DH + Double Ratchet E2EE",
      "e2eeDesc": "Cifrado de extremo a extremo para diálogos individuales con secreto perfecto hacia adelante (PFS).",
      "mlsTitle": "Arquitectura MLS (RFC 9420)",
      "mlsDesc": "Protocolo criptográfico Messaging Layer Security con intercambio TreeKEM para grupos seguros de cualquier tamaño.",
      "tonTitle": "TON Connect 2.0 y Pagos",
      "tonDesc": "Billetera sin custodia, transferencias P2P instantáneas en el chat, facturación y depósitos inteligentes sin comisiones.",
      "pulseTitle": "Pulse y Radar de intenciones",
      "pulseDesc": "Capa económica soberana para descubrir ofertas locales, tratos P2P, votaciones ZK y trabajo protegido por DvP.",
      "dlpTitle": "Contorno Seguro (Protección DLP)",
      "dlpDesc": "Aislamiento de carpetas confidenciales: bloqueo de capturas de pantalla, copia de texto y reenvío.",
      "offlineTitle": "BLE Mesh y Comunicación local",
      "offlineDesc": "Intercambio de mensajes fuera de red mediante Bluetooth Low Energy sin conexión a Internet ni red celular."
    },
    "comparison": {
      "title": "Comparación con alternativas",
      "columnGossip": "Gossip",
      "columnTg": "Telegram",
      "columnSignal": "Signal",
      "rowE2eeGroups": "E2EE predeterminado en chats grupales",
      "rowCrypto": "Billetera cripto nativa sin custodia",
      "rowDlp": "Contorno Seguro DLP antifugas",
      "rowMesh": "Transmisión sin red vía BLE Mesh",
      "rowP2pRadar": "Radar de intenciones P2P y Smart Escrow DvP"
    },
    "footer": {
      "copyright": "© 2026 Protocolo Gossip. Todos los derechos reservados.",
      "privacy": "Política de privacidad",
      "terms": "Términos del servicio",
      "github": "Código fuente en GitHub",
      "docs": "Documentación técnica RFC"
    }
  },
  "zh": {
    "hero": {
      "badge": "MLS E2EE • TON Connect 2.0 • ZK-Pulse",
      "title": "具备抗量子级安全与主权加密经济的下一代通信应用",
      "subtitle": "Gossip 将新一代端到端加密体系 (MLS IETF RFC 9420)、内置原生 TON 钱包以及 Pulse P2P 意图雷达融合于一体，为您打造极致安全的数字堡垒。",
      "getStarted": "立即开启体验",
      "learnMore": "深入了解底层架构",
      "downloadApk": "下载 Android APK"
    },
    "features": {
      "title": "Gossip 核心技术矩阵",
      "e2eeTitle": "X3DH + Double Ratchet E2EE",
      "e2eeDesc": "单聊端到端强力加密，具备完美前向安全 (PFS) 与后妥协自愈能力。",
      "mlsTitle": "MLS 群组架构 (RFC 9420)",
      "mlsDesc": "基于 TreeKEM 树状密钥交换的 Messaging Layer Security 协议，保障任意规模群聊极致安全。",
      "tonTitle": "TON Connect 2.0 支付集成",
      "tonDesc": "内置非托管钱包，支持会话内无缝 P2P 转账、账单结算及零服务费智能担保。",
      "pulseTitle": "Pulse 与意图雷达",
      "pulseDesc": "主权经济协作层，支持发现同城需求、P2P 交易、ZK 匿名投票及 DvP 担保交付。",
      "dlpTitle": "安全隔离区 (DLP 防泄露)",
      "dlpDesc": "机密分组硬件级安全隔离：禁止截屏、禁止文本复制及禁止文件向外转发。",
      "offlineTitle": "BLE Mesh 离网通信",
      "offlineDesc": "在完全断网和无蜂窝信号环境下，通过低功耗蓝牙 (BLE) 网状网络实现端到端脱网离线通信。"
    },
    "comparison": {
      "title": "同类产品深度对比",
      "columnGossip": "Gossip",
      "columnTg": "Telegram",
      "columnSignal": "Signal",
      "rowE2eeGroups": "群聊默认全量开启 E2EE 端到端加密",
      "rowCrypto": "内置原生去中心化非托管加密钱包",
      "rowDlp": "DLP 安全隔离区与防泄密合规防护",
      "rowMesh": "BLE Mesh 离网脱机无网通信网络",
      "rowP2pRadar": "P2P 意图雷达与 DvP 智能担保体系"
    },
    "footer": {
      "copyright": "© 2026 Gossip Protocol. 保留所有权利。",
      "privacy": "隐私保护政策",
      "terms": "服务协议条款",
      "github": "GitHub 开源代码库",
      "docs": "技术白皮书与 RFC 文档"
    }
  },
  "ar": {
    "hero": {
      "badge": "MLS E2EE • TON Connect 2.0 • ZK-Pulse",
      "title": "تطبيق مراسلة سيادي بحماية ما بعد الكم واقتصاد مشفر متكامل",
      "subtitle": "يجمع Gossip بين التشفير الشامل من الجيل التالي (MLS IETF RFC 9420)، ومحفظة TON المدمجة، ورادار النوايا P2P في واجهة واحدة موحدة وفائقة الأمان.",
      "getStarted": "ابدأ الآن",
      "learnMore": "بنية البروتوكول",
      "downloadApk": "تحميل تطبيق Android APK"
    },
    "features": {
      "title": "الركائز التقنية لـ Gossip",
      "e2eeTitle": "X3DH + Double Ratchet E2EE",
      "e2eeDesc": "تشفير شامل للمحادثات الفردية مع السرية التامة للأمام (PFS) والأمان بعد الاختراق.",
      "mlsTitle": "بنية MLS (RFC 9420)",
      "mlsDesc": "بروتوكول Messaging Layer Security بتبادل مفاتيح TreeKEM لمجموعات آمنة بأي حجم.",
      "tonTitle": "TON Connect 2.0 والمدفوعات",
      "tonDesc": "محفظة غير حاضنة، تحويلات P2P فورية داخل المحادثة، فواتير وضمان ذكي بدون رسوم.",
      "pulseTitle": "Pulse ورادار النوايا",
      "pulseDesc": "طبقة اقتصادية سيادية لاكتشاف العروض المحلية، صفقات P2P، تصويت ZK وعمل محمي بـ DvP.",
      "dlpTitle": "النطاق الآمن (حماية DLP)",
      "dlpDesc": "عزل المجلدات الحساسة: منع لقطات الشاشة، منع النسخ ومنع إعادة التوجيه.",
      "offlineTitle": "شبكة BLE Mesh والتواصل المحلي",
      "offlineDesc": "تبادل الرسائل خارج الشبكة عبر Bluetooth Low Energy أثناء انقطاع الإنترنت والاتصالات."
    },
    "comparison": {
      "title": "مقارنة مع التطبيقات الأخرى",
      "columnGossip": "Gossip",
      "columnTg": "Telegram",
      "columnSignal": "Signal",
      "rowE2eeGroups": "تشفير E2EE افتراضي في المجموعات",
      "rowCrypto": "محفظة مشفرة أصلية غير حاضنة",
      "rowDlp": "نطاق آمن DLP لمنع التسريب",
      "rowMesh": "نقل خارج الشبكة عبر BLE Mesh",
      "rowP2pRadar": "رادار نوايا P2P وضمان DvP ذكي"
    },
    "footer": {
      "copyright": "© 2026 بروتوكول Gossip. جميع الحقوق محفوظة.",
      "privacy": "سياسة الخصوصية",
      "terms": "شروط الخدمة",
      "github": "الكود المصدري على GitHub",
      "docs": "التوثيق الفني RFC"
    }
  },
  "fa": {
    "hero": {
      "badge": "MLS E2EE • TON Connect 2.0 • ZK-Pulse",
      "title": "پیام‌رسان مستقل با امنیت پساکوانتومی و اقتصاد رمزارزی",
      "subtitle": "Gossip رمزنگاری سرتاسری نسل بعدی (MLS IETF RFC 9420)، کیف پول داخلی TON و رادار اهداف P2P را در یک پلتفرم امن یکپارچه ارائه می‌دهد.",
      "getStarted": "شروع گفتگو",
      "learnMore": "معماری پروتکل",
      "downloadApk": "دانلود فایل APK اندروید"
    },
    "features": {
      "title": "بنیان‌های فنی Gossip",
      "e2eeTitle": "X3DH + Double Ratchet E2EE",
      "e2eeDesc": "رمزنگاری سرتاسری برای گفتگوهای فردی با رازداری رو به جلو (PFS) و امنیت پس از نفوذ.",
      "mlsTitle": "معماری MLS (RFC 9420)",
      "mlsDesc": "پروتکل رمزنگاری Messaging Layer Security با تبادل کلید TreeKEM برای گروه‌های امن با هر تعداد کاربر.",
      "tonTitle": "TON Connect 2.0 و پرداخت‌ها",
      "tonDesc": "کیف پول غیرحضانتی، انتقال آنی P2P در گفتگو، صدور فاکتور و اسکروی هوشمند بدون کارمزد.",
      "pulseTitle": "Pulse و رادار اهداف",
      "pulseDesc": "لایه اقتصادی مستقل برای یافتن پیشنهادهای محلی، معاملات P2P، رأی‌گیری ZK و کارهای تحت حفاظت DvP.",
      "dlpTitle": "محدوده امن (حفاظت DLP)",
      "dlpDesc": "جداسازی پوشه‌های محرمانه: جلوگیری از اسکرین‌شات، کپی متن و هدایت پیام‌ها.",
      "offlineTitle": "شبکه BLE Mesh و ارتباط آفلاین",
      "offlineDesc": "تبادل پیام بدون اینترنت از طریق بلوتوث کم‌مصرف (BLE) هنگام قطعی سراسری شبکه."
    },
    "comparison": {
      "title": "مقایسه با سایر برنامه‌ها",
      "columnGossip": "Gossip",
      "columnTg": "Telegram",
      "columnSignal": "Signal",
      "rowE2eeGroups": "رمزنگاری E2EE پیش‌فرض در گروه‌ها",
      "rowCrypto": "کیف پول رمزارز بومی و غیرحضانتی",
      "rowDlp": "محدوده امن DLP ضد افشای داده‌ها",
      "rowMesh": "انتقال آفلاین از طریق BLE Mesh",
      "rowP2pRadar": "رادار اهداف P2P و اسکروی هوشمند DvP"
    },
    "footer": {
      "copyright": "© 2026 پروتکل Gossip. تمامی حقوق محفوظ است.",
      "privacy": "سیاست حفظ حریم خصوصی",
      "terms": "شرایط استفاده از خدمات",
      "github": "کد منبع در GitHub",
      "docs": "مستندات فنی RFC"
    }
  },
  "fr": {
    "hero": {
      "badge": "MLS E2EE • TON Connect 2.0 • ZK-Pulse",
      "title": "Messagerie souveraine avec sécurité post-quantique et économie crypto",
      "subtitle": "Gossip réunit le chiffrement de bout en bout nouvelle génération (MLS IETF RFC 9420), un portefeuille TON intégré et le radar d'intentions P2P Pulse dans une application sécurisée et unifiée.",
      "getStarted": "Commencer",
      "learnMore": "Architecture du protocole",
      "downloadApk": "Télécharger l'APK Android"
    },
    "features": {
      "title": "Fondements technologiques de Gossip",
      "e2eeTitle": "X3DH + Double Ratchet E2EE",
      "e2eeDesc": "Chiffrement de bout en bout pour les dialogues individuels avec confidentialité persistante parfaite (PFS).",
      "mlsTitle": "Architecture MLS (RFC 9420)",
      "mlsDesc": "Protocole cryptographique Messaging Layer Security avec échange TreeKEM pour des groupes sécurisés de toute taille.",
      "tonTitle": "TON Connect 2.0 et Paiements",
      "tonDesc": "Portefeuille non-gardien, transferts P2P instantanés dans le chat, factures et séquestre sans frais de service.",
      "pulseTitle": "Pulse et Radar d'intentions",
      "pulseDesc": "Couche économique souveraine pour trouver des offres locales, deals P2P, votes ZK et missions protégées DvP.",
      "dlpTitle": "Périmètre sécurisé (Protection DLP)",
      "dlpDesc": "Isolation des dossiers confidentiels : interdiction des captures d'écran, du copier-coller et du transfert.",
      "offlineTitle": "BLE Mesh et Comms locales",
      "offlineDesc": "Échange de messages hors réseau via Bluetooth Low Energy lors des pannes d'Internet et cellulaires."
    },
    "comparison": {
      "title": "Comparaison avec les alternatives",
      "columnGossip": "Gossip",
      "columnTg": "Telegram",
      "columnSignal": "Signal",
      "rowE2eeGroups": "E2EE par défaut dans les groupes",
      "rowCrypto": "Portefeuille crypto natif non-gardien",
      "rowDlp": "Périmètre sécurisé DLP anti-fuites",
      "rowMesh": "Transmission hors ligne via BLE Mesh",
      "rowP2pRadar": "Radar d'intentions P2P et Smart Escrow DvP"
    },
    "footer": {
      "copyright": "© 2026 Protocole Gossip. Tous droits réservés.",
      "privacy": "Politique de confidentialité",
      "terms": "Conditions d'utilisation",
      "github": "Code source sur GitHub",
      "docs": "Documentation technique RFC"
    }
  },
  "de": {
    "hero": {
      "badge": "MLS E2EE • TON Connect 2.0 • ZK-Pulse",
      "title": "Souveräner Messenger mit Post-Quanten-Sicherheit und Krypto-Ökonomie",
      "subtitle": "Gossip vereint Ende-zu-Ende-Verschlüsselung der nächsten Generation (MLS IETF RFC 9420), eine integrierte TON-Wallet und das Pulse-P2P-Absichtsradar in einer sicheren, einheitlichen Anwendung.",
      "getStarted": "Jetzt starten",
      "learnMore": "Protokoll-Architektur",
      "downloadApk": "Android APK herunterladen"
    },
    "features": {
      "title": "Technologisches Fundament von Gossip",
      "e2eeTitle": "X3DH + Double Ratchet E2EE",
      "e2eeDesc": "Ende-zu-Ende-Verschlüsselung für Einzelchats mit Perfect Forward Secrecy (PFS) und Post-Compromise-Sicherheit.",
      "mlsTitle": "MLS-Architektur (RFC 9420)",
      "mlsDesc": "Messaging Layer Security-Kryptoprotokoll mit TreeKEM-Schlüsselaustausch für sichere Gruppen jeder Größe.",
      "tonTitle": "TON Connect 2.0 & Zahlungen",
      "tonDesc": "Non-Custodial-Wallet, sofortige P2P-Überweisungen im Chat, Rechnungen und Smart Escrow ohne Plattformgebühren.",
      "pulseTitle": "Pulse & Absichtsradar",
      "pulseDesc": "Souveräne Wirtschaftsebene für lokale Angebote, P2P-Deals, ZK-Abstimmungen und DvP-geschützte Aufträge.",
      "dlpTitle": "Sicherheitsbereich (DLP-Schutz)",
      "dlpDesc": "Hardware-Isolation vertraulicher Ordner: Screenshot-Sperre, Kopierschutz und Weiterleitungsverbot.",
      "offlineTitle": "BLE Mesh & Lokale Kommunikation",
      "offlineDesc": "Netzunabhängiger Nachrichtenaustausch über Bluetooth Low Energy bei Internetausfällen und Funklöchern."
    },
    "comparison": {
      "title": "Vergleich mit Mitbewerbern",
      "columnGossip": "Gossip",
      "columnTg": "Telegram",
      "columnSignal": "Signal",
      "rowE2eeGroups": "Standard-E2EE in Gruppenchats",
      "rowCrypto": "Native Non-Custodial-Krypto-Wallet",
      "rowDlp": "DLP-Sicherheitsbereich gegen Datenlecks",
      "rowMesh": "Offline-Übertragung via BLE Mesh",
      "rowP2pRadar": "P2P-Absichtsradar & DvP-Smart-Treuhand"
    },
    "footer": {
      "copyright": "© 2026 Gossip-Protokoll. Alle Rechte vorbehalten.",
      "privacy": "Datenschutzerklärung",
      "terms": "Nutzungsbedingungen",
      "github": "Quellcode auf GitHub",
      "docs": "Technische RFC-Dokumentation"
    }
  }
}

def generate(base_dir):
    for lang, content in data.items():
        lang_dir = os.path.join(base_dir, lang)
        os.makedirs(lang_dir, exist_ok=True)
        with open(os.path.join(lang_dir, "landing.json"), "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
    print("✓ landing.json generated for all 8 languages")

if __name__ == "__main__":
    generate("e:/Boltalka/frontend/src/i18n/locales")
