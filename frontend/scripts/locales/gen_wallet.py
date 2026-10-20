# -*- coding: utf-8 -*-
import json
import os

data = {
  "ru": {
    "title": "Криптокошелек TON",
    "tabs": {
      "overview": "Обзор",
      "send": "Отправить",
      "deposit": "Пополнить",
      "history": "История"
    },
    "overview": {
      "totalBalance": "Общий баланс",
      "tonBalance": "{{amount}} TON",
      "usdtBalance": "{{amount}} USDT",
      "fiatEquivalent": "≈ {{fiat}}",
      "connectWallet": "Подключить TON Connect",
      "disconnect": "Отключить кошелек",
      "connectedAs": "Подключен: {{address}}",
      "quickSend": "Отправить",
      "quickReceive": "Получить",
      "refreshBalances": "Обновить баланс"
    },
    "send": {
      "recipientLabel": "Адрес получателя или .ton домен",
      "recipientPlaceholder": "EQ... или domain.ton",
      "amountLabel": "Сумма перевода",
      "amountPlaceholder": "0.00",
      "memoLabel": "Комментарий (Memo / Tag)",
      "memoPlaceholder": "Опционально",
      "assetSelect": "Валюта",
      "available": "Доступно: {{amount}} {{symbol}}",
      "sendButton": "Отправить {{amount}} {{symbol}}",
      "confirming": "Подписание транзакции в кошельке...",
      "success": "Перевод успешно отправлен!",
      "invalidAddress": "Некорректный адрес сети TON",
      "insufficientFunds": "Недостаточно средств на балансе"
    },
    "deposit": {
      "title": "Пополнение баланса",
      "desc": "Отправьте TON или USDT на ваш персональный адрес:",
      "copyAddress": "Скопировать адрес",
      "shareQr": "Поделиться QR-кодом",
      "warning": "Отправляйте только активы сети TON (The Open Network). Отправка других токенов приведет к их безвозвратной потере."
    },
    "history": {
      "title": "История транзакций",
      "empty": "Транзакции отсутствуют",
      "incoming": "Входящий перевод",
      "outgoing": "Исходящий перевод",
      "fee": "Комиссия сети: {{fee}} TON",
      "viewExplorer": "Посмотреть в TonScan"
    },
    "inChat": {
      "transferButton": "Перевести в чате",
      "invoiceButton": "Выставить счет",
      "receiptTitle": "Квитанция перевода TON",
      "receiptSent": "Вы отправили {{amount}} {{currency}}",
      "receiptReceived": "Вы получили {{amount}} {{currency}}",
      "invoiceTitle": "Счет на оплату",
      "payInvoice": "Оплатить {{amount}} {{currency}}",
      "invoicePaid": "Счет оплачен"
    },
    "paperWallet": {
      "title": "Бумажный кошелек (Paper Wallet)",
      "desc": "Локальная генерация пары ключей Ed25519 без подключения к сети.",
      "generateButton": "Сгенерировать холодный кошелек",
      "mnemonicTitle": "Мнемоника холодного кошелька",
      "saveWarning": "Распечатайте или перепишите эту фразу. Она хранится только в оперативной памяти."
    },
    "hub": {
      "title": "TON Connect 2.0 & Криптокошелек",
      "connectBannerTitle": "Подключение по протоколу TON Connect 2.0",
      "connectBannerDesc": "Подключите ваш некастодиальный кошелек для безопасных мгновенных P2P-переводов и оплаты инвойсов без комиссий сервиса.",
      "selectWallet": "Выберите кошелек для подключения:",
      "popularBadge": "Популярный",
      "watchOnlyPresets": "Быстрые ончейн-пресеты (Watch-Only):",
      "watchOnlyMonitoring": "Ончейн-мониторинг",
      "customAddressTitle": "Ввод адреса кошелька (Watch-Only / Ручное подключение)",
      "customAddressDesc": "Введите ваш публичный TON-адрес (начинается на UQ..., EQ... или 0:...) для проверки ончейн-баланса и формирования переводов:",
      "connectAddressButton": "Подключить адрес",
      "checkingAddress": "Проверка адреса..."
    },
    "invoice": {
      "title": "Счет на оплату",
      "statusPending": "Ожидает оплаты",
      "statusCompleted": "Оплачен",
      "statusExpired": "Срок действия истек",
      "payButton": "Оплатить {{amount}} {{currency}}"
    },
    "receipt": {
      "title": "Квитанция перевода",
      "txHash": "Хэш транзакции"
    }
  },
  "en": {
    "title": "TON Crypto Wallet",
    "tabs": {
      "overview": "Overview",
      "send": "Send",
      "deposit": "Receive",
      "history": "History"
    },
    "overview": {
      "totalBalance": "Total Balance",
      "tonBalance": "{{amount}} TON",
      "usdtBalance": "{{amount}} USDT",
      "fiatEquivalent": "≈ {{fiat}}",
      "connectWallet": "Connect TON Wallet",
      "disconnect": "Disconnect Wallet",
      "connectedAs": "Connected: {{address}}",
      "quickSend": "Send",
      "quickReceive": "Receive",
      "refreshBalances": "Refresh Balances"
    },
    "send": {
      "recipientLabel": "Recipient address or .ton domain",
      "recipientPlaceholder": "EQ... or domain.ton",
      "amountLabel": "Transfer amount",
      "amountPlaceholder": "0.00",
      "memoLabel": "Comment (Memo / Tag)",
      "memoPlaceholder": "Optional",
      "assetSelect": "Asset",
      "available": "Available: {{amount}} {{symbol}}",
      "sendButton": "Send {{amount}} {{symbol}}",
      "confirming": "Signing transaction in wallet...",
      "success": "Transfer sent successfully!",
      "invalidAddress": "Invalid TON network address",
      "insufficientFunds": "Insufficient funds on balance"
    },
    "deposit": {
      "title": "Receive Assets",
      "desc": "Send TON or USDT to your personal address:",
      "copyAddress": "Copy Address",
      "shareQr": "Share QR Code",
      "warning": "Send only TON (The Open Network) assets. Sending other tokens will result in permanent loss."
    },
    "history": {
      "title": "Transaction History",
      "empty": "No transactions yet",
      "incoming": "Incoming Transfer",
      "outgoing": "Outgoing Transfer",
      "fee": "Network fee: {{fee}} TON",
      "viewExplorer": "View on TonScan"
    },
    "inChat": {
      "transferButton": "Transfer in Chat",
      "invoiceButton": "Create Invoice",
      "receiptTitle": "TON Transfer Receipt",
      "receiptSent": "You sent {{amount}} {{currency}}",
      "receiptReceived": "You received {{amount}} {{currency}}",
      "invoiceTitle": "Payment Invoice",
      "payInvoice": "Pay {{amount}} {{currency}}",
      "invoicePaid": "Invoice Paid"
    },
    "paperWallet": {
      "title": "Paper Wallet (Cold Storage)",
      "desc": "Local generation of Ed25519 keypair without network connection.",
      "generateButton": "Generate Cold Wallet",
      "mnemonicTitle": "Cold Wallet Mnemonic",
      "saveWarning": "Print or write down this seed phrase. It is stored in volatile memory only."
    },
    "hub": {
      "title": "TON Connect 2.0 & Crypto Wallet",
      "connectBannerTitle": "Connection via TON Connect 2.0",
      "connectBannerDesc": "Connect your non-custodial wallet for secure instant P2P transfers and fee-free invoice payments.",
      "selectWallet": "Select a wallet to connect:",
      "popularBadge": "Popular",
      "watchOnlyPresets": "Quick Onchain Presets (Watch-Only):",
      "watchOnlyMonitoring": "Onchain Monitoring",
      "customAddressTitle": "Enter Wallet Address (Watch-Only / Manual Connect)",
      "customAddressDesc": "Enter your public TON address (starts with UQ..., EQ... or 0:...) to view onchain balance and prepare transfers:",
      "connectAddressButton": "Connect Address",
      "checkingAddress": "Checking address..."
    },
    "invoice": {
      "title": "Payment Invoice",
      "statusPending": "Awaiting Payment",
      "statusCompleted": "Paid",
      "statusExpired": "Expired",
      "payButton": "Pay {{amount}} {{currency}}"
    },
    "receipt": {
      "title": "Transfer Receipt",
      "txHash": "Transaction Hash"
    }
  },
  "es": {
    "title": "Billetera cripto TON",
    "tabs": {
      "overview": "Resumen",
      "send": "Enviar",
      "deposit": "Recibir",
      "history": "Historial"
    },
    "overview": {
      "totalBalance": "Saldo total",
      "tonBalance": "{{amount}} TON",
      "usdtBalance": "{{amount}} USDT",
      "fiatEquivalent": "≈ {{fiat}}",
      "connectWallet": "Conectar TON Connect",
      "disconnect": "Desconectar billetera",
      "connectedAs": "Conectado: {{address}}",
      "quickSend": "Enviar",
      "quickReceive": "Recibir",
      "refreshBalances": "Actualizar saldos"
    },
    "send": {
      "recipientLabel": "Dirección de destino o dominio .ton",
      "recipientPlaceholder": "EQ... o dominio.ton",
      "amountLabel": "Monto a transferir",
      "amountPlaceholder": "0.00",
      "memoLabel": "Comentario (Memo / Tag)",
      "memoPlaceholder": "Opcional",
      "assetSelect": "Moneda",
      "available": "Disponible: {{amount}} {{symbol}}",
      "sendButton": "Enviar {{amount}} {{symbol}}",
      "confirming": "Firmando transacción en la billetera...",
      "success": "¡Transferencia enviada con éxito!",
      "invalidAddress": "Dirección de red TON no válida",
      "insufficientFunds": "Fondos insuficientes en el saldo"
    },
    "deposit": {
      "title": "Recibir fondos",
      "desc": "Envía TON o USDT a tu dirección personal:",
      "copyAddress": "Copiar dirección",
      "shareQr": "Compartir código QR",
      "warning": "Envía únicamente activos de la red TON (The Open Network). Enviar otros tokens resultará en su pérdida permanente."
    },
    "history": {
      "title": "Historial de transacciones",
      "empty": "No hay transacciones aún",
      "incoming": "Transferencia entrante",
      "outgoing": "Transferencia saliente",
      "fee": "Comisión de red: {{fee}} TON",
      "viewExplorer": "Ver en TonScan"
    },
    "inChat": {
      "transferButton": "Transferir en el chat",
      "invoiceButton": "Crear factura",
      "receiptTitle": "Recibo de transferencia TON",
      "receiptSent": "Has enviado {{amount}} {{currency}}",
      "receiptReceived": "Has recibido {{amount}} {{currency}}",
      "invoiceTitle": "Factura de pago",
      "payInvoice": "Pagar {{amount}} {{currency}}",
      "invoicePaid": "Factura pagada"
    },
    "paperWallet": {
      "title": "Billetera de papel (Paper Wallet)",
      "desc": "Generación local de pares de claves Ed25519 sin conexión a la red.",
      "generateButton": "Generar billetera fría",
      "mnemonicTitle": "Mnemónica de billetera fría",
      "saveWarning": "Imprime o anota esta frase semilla. Solo se almacena en la memoria volátil."
    },
    "hub": {
      "title": "TON Connect 2.0 y Billetera Cripto",
      "connectBannerTitle": "Conexión mediante TON Connect 2.0",
      "connectBannerDesc": "Conecta tu billetera sin custodia para transferencias P2P instantáneas y pago de facturas sin comisiones.",
      "selectWallet": "Selecciona una billetera para conectar:",
      "popularBadge": "Popular",
      "watchOnlyPresets": "Ajustes rápidos onchain (Solo lectura):",
      "watchOnlyMonitoring": "Monitoreo onchain",
      "customAddressTitle": "Ingresar dirección de billetera (Solo lectura / Manual)",
      "customAddressDesc": "Ingresa tu dirección pública TON (empieza por UQ..., EQ... o 0:...) para consultar saldo y preparar transferencias:",
      "connectAddressButton": "Conectar dirección",
      "checkingAddress": "Comprobando dirección..."
    },
    "invoice": {
      "title": "Factura de pago",
      "statusPending": "Pendiente de pago",
      "statusCompleted": "Pagada",
      "statusExpired": "Expirada",
      "payButton": "Pagar {{amount}} {{currency}}"
    },
    "receipt": {
      "title": "Recibo de transferencia",
      "txHash": "Hash de transacción"
    }
  },
  "zh": {
    "title": "TON 加密钱包",
    "tabs": {
      "overview": "概览",
      "send": "转账",
      "deposit": "充值",
      "history": "历史"
    },
    "overview": {
      "totalBalance": "总资产",
      "tonBalance": "{{amount}} TON",
      "usdtBalance": "{{amount}} USDT",
      "fiatEquivalent": "≈ {{fiat}}",
      "connectWallet": "连接 TON Connect",
      "disconnect": "断开钱包连接",
      "connectedAs": "已连接: {{address}}",
      "quickSend": "转账",
      "quickReceive": "收款",
      "refreshBalances": "刷新余额"
    },
    "send": {
      "recipientLabel": "接收方地址或 .ton 域名",
      "recipientPlaceholder": "EQ... 或 domain.ton",
      "amountLabel": "转账金额",
      "amountPlaceholder": "0.00",
      "memoLabel": "备注附言 (Memo / Tag)",
      "memoPlaceholder": "选填",
      "assetSelect": "币种",
      "available": "可用余额: {{amount}} {{symbol}}",
      "sendButton": "发送 {{amount}} {{symbol}}",
      "confirming": "正在钱包中签名交易...",
      "success": "转账发送成功！",
      "invalidAddress": "无效的 TON 网络地址",
      "insufficientFunds": "账户余额不足"
    },
    "deposit": {
      "title": "充值收款",
      "desc": "将 TON 或 USDT 发送到您的专属地址：",
      "copyAddress": "复制地址",
      "shareQr": "分享二维码",
      "warning": "请仅充值 TON (The Open Network) 网络资产。发送其他网络代币将造成无法找回的资产损失。"
    },
    "history": {
      "title": "交易历史记录",
      "empty": "暂无交易记录",
      "incoming": "收款转入",
      "outgoing": "转账支出",
      "fee": "网络手续费: {{fee}} TON",
      "viewExplorer": "在 TonScan 查看"
    },
    "inChat": {
      "transferButton": "会话中转账",
      "invoiceButton": "发起收款单",
      "receiptTitle": "TON 转账收据",
      "receiptSent": "您已发送 {{amount}} {{currency}}",
      "receiptReceived": "您已收到 {{amount}} {{currency}}",
      "invoiceTitle": "支付账单",
      "payInvoice": "支付 {{amount}} {{currency}}",
      "invoicePaid": "账单已支付"
    },
    "paperWallet": {
      "title": "纸钱包 (Paper Wallet 冷钱包)",
      "desc": "无需连接互联网，在本地离线生成 Ed25519 密钥对。",
      "generateButton": "生成冷钱包",
      "mnemonicTitle": "冷钱包助记词",
      "saveWarning": "请打印或手抄记下此助记词。它仅临时保存在内存中。"
    },
    "hub": {
      "title": "TON Connect 2.0 与加密钱包",
      "connectBannerTitle": "通过 TON Connect 2.0 协议连接",
      "connectBannerDesc": "连接您的非托管钱包，享受安全即时的 P2P 转账与零平台手续费账单支付。",
      "selectWallet": "选择要连接的钱包：",
      "popularBadge": "热门",
      "watchOnlyPresets": "快捷链上预设 (只读观察模式)：",
      "watchOnlyMonitoring": "链上监控",
      "customAddressTitle": "输入钱包地址 (观察模式 / 手动连接)",
      "customAddressDesc": "输入您的公开 TON 地址（以 UQ...、EQ... 或 0:... 开头）以查看链上资产并准备转账：",
      "connectAddressButton": "连接地址",
      "checkingAddress": "正在验证地址..."
    },
    "invoice": {
      "title": "收款账单",
      "statusPending": "等待支付",
      "statusCompleted": "已完成支付",
      "statusExpired": "账单已过期",
      "payButton": "立即支付 {{amount}} {{currency}}"
    },
    "receipt": {
      "title": "转账收据",
      "txHash": "交易哈希 (TxHash)"
    }
  },
  "ar": {
    "title": "محفظة TON المشفرة",
    "tabs": {
      "overview": "نظرة عامة",
      "send": "إرسال",
      "deposit": "استلام",
      "history": "السجل"
    },
    "overview": {
      "totalBalance": "إجمالي الرصيد",
      "tonBalance": "{{amount}} TON",
      "usdtBalance": "{{amount}} USDT",
      "fiatEquivalent": "≈ {{fiat}}",
      "connectWallet": "ربط محفظة TON Connect",
      "disconnect": "فصل المحفظة",
      "connectedAs": "متصل: {{address}}",
      "quickSend": "إرسال",
      "quickReceive": "استلام",
      "refreshBalances": "تحديث الأرصدة"
    },
    "send": {
      "recipientLabel": "عنوان المستلم أو نطاق .ton",
      "recipientPlaceholder": "EQ... أو domain.ton",
      "amountLabel": "مبلغ التحويل",
      "amountPlaceholder": "0.00",
      "memoLabel": "ملاحظة (Memo / Tag)",
      "memoPlaceholder": "اختياري",
      "assetSelect": "العملة",
      "available": "المتاح: {{amount}} {{symbol}}",
      "sendButton": "إرسال {{amount}} {{symbol}}",
      "confirming": "جارٍ توقيع المعاملة في المحفظة...",
      "success": "تم إرسال التحويل بنجاح!",
      "invalidAddress": "عنوان غير صالح في شبكة TON",
      "insufficientFunds": "الرصيد غير كافٍ"
    },
    "deposit": {
      "title": "استلام الأصول",
      "desc": "أرسل TON أو USDT إلى عنوانك الشخصي:",
      "copyAddress": "نسخ العنوان",
      "shareQr": "مشاركة رمز QR",
      "warning": "أرسل فقط أصول شبكة TON (The Open Network). إرسال رموز أخرى سيؤدي إلى فقدانها بشكل نهائي."
    },
    "history": {
      "title": "سجل المعاملات",
      "empty": "لا توجد معاملات بعد",
      "incoming": "تحويل وارد",
      "outgoing": "تحويل صادر",
      "fee": "رسوم الشبكة: {{fee}} TON",
      "viewExplorer": "عرض في TonScan"
    },
    "inChat": {
      "transferButton": "تحويل في المحادثة",
      "invoiceButton": "إنشاء فاتورة",
      "receiptTitle": "إيصال تحويل TON",
      "receiptSent": "لقد أرسلت {{amount}} {{currency}}",
      "receiptReceived": "لقد استلمت {{amount}} {{currency}}",
      "invoiceTitle": "فاتورة دفع",
      "payInvoice": "دفع {{amount}} {{currency}}",
      "invoicePaid": "تم دفع الفاتورة"
    },
    "paperWallet": {
      "title": "المحفظة الورقية (Paper Wallet)",
      "desc": "توليد محلي لزوج مفاتيح Ed25519 دون اتصال بالإنترنت.",
      "generateButton": "توليد محفظة باردة",
      "mnemonicTitle": "عبارة استرداد المحفظة الباردة",
      "saveWarning": "اطبع أو اكتب هذه العبارة. يتم تخزينها في الذاكرة المؤقتة فقط."
    },
    "hub": {
      "title": "TON Connect 2.0 والمحفظة المشفرة",
      "connectBannerTitle": "الاتصال عبر بروتوكول TON Connect 2.0",
      "connectBannerDesc": "اربط محفظتك غير الحاضنة لإجراء تحويلات P2P فورية وآمنة ودفع الفواتير بدون أي عمولات.",
      "selectWallet": "اختر محفظة للربط:",
      "popularBadge": "شائع",
      "watchOnlyPresets": "إعدادات مسبقة سريعة (وضع المشاهدة فقط):",
      "watchOnlyMonitoring": "مراقبة البلوكشين",
      "customAddressTitle": "إدخال عنوان المحفظة (وضع المراقبة / يدوي)",
      "customAddressDesc": "أدخل عنوان TON العام الخاص بك (يبدأ بـ UQ... أو EQ... أو 0:...) للاطلاع على الرصيد وتجهيز التحويلات:",
      "connectAddressButton": "ربط العنوان",
      "checkingAddress": "جارٍ التحقق من العنوان..."
    },
    "invoice": {
      "title": "فاتورة دفع",
      "statusPending": "في انتظار الدفع",
      "statusCompleted": "مدفوعة",
      "statusExpired": "منتهية الصلاحية",
      "payButton": "دفع {{amount}} {{currency}}"
    },
    "receipt": {
      "title": "إيصال التحويل",
      "txHash": "تجزئة المعاملة (TxHash)"
    }
  },
  "fa": {
    "title": "کیف پول رمزارز TON",
    "tabs": {
      "overview": "نمای کلی",
      "send": "ارسال",
      "deposit": "دریافت",
      "history": "تاریخچه"
    },
    "overview": {
      "totalBalance": "موجودی کل",
      "tonBalance": "{{amount}} TON",
      "usdtBalance": "{{amount}} USDT",
      "fiatEquivalent": "≈ {{fiat}}",
      "connectWallet": "اتصال به TON Connect",
      "disconnect": "قطع اتصال کیف پول",
      "connectedAs": "متصل: {{address}}",
      "quickSend": "ارسال",
      "quickReceive": "دریافت",
      "refreshBalances": "تازه‌سازی موجودی"
    },
    "send": {
      "recipientLabel": "آدرس گیرنده یا دامنه .ton",
      "recipientPlaceholder": "EQ... یا domain.ton",
      "amountLabel": "مبلغ انتقال",
      "amountPlaceholder": "0.00",
      "memoLabel": "یادداشت (Memo / Tag)",
      "memoPlaceholder": "اختیاری",
      "assetSelect": "ارز",
      "available": "موجود: {{amount}} {{symbol}}",
      "sendButton": "ارسال {{amount}} {{symbol}}",
      "confirming": "در حال امضای تراکنش در کیف پول...",
      "success": "انتقال با موفقیت ارسال شد!",
      "invalidAddress": "آدرس شبکه TON نامعتبر است",
      "insufficientFunds": "موجودی کافی نیست"
    },
    "deposit": {
      "title": "دریافت دارایی",
      "desc": "ارز TON یا USDT را به آدرس شخصی خود ارسال کنید:",
      "copyAddress": "کپی آدرس",
      "shareQr": "اشتراک‌گذاری کد QR",
      "warning": "فقط دارایی‌های شبکه TON (The Open Network) را ارسال کنید. ارسال سایر توکن‌ها منجر به از دست رفتن دائمی آنها می‌شود."
    },
    "history": {
      "title": "تاریخچه تراکنش‌ها",
      "empty": "هنوز تراکنشی ثبت نشده است",
      "incoming": "انتقال دریافتی",
      "outgoing": "انتقال ارسالی",
      "fee": "کارمزد شبکه: {{fee}} TON",
      "viewExplorer": "مشاهده در TonScan"
    },
    "inChat": {
      "transferButton": "انتقال در گفتگو",
      "invoiceButton": "صدور فاکتور",
      "receiptTitle": "رسید انتقال TON",
      "receiptSent": "شما {{amount}} {{currency}} ارسال کردید",
      "receiptReceived": "شما {{amount}} {{currency}} دریافت کردید",
      "invoiceTitle": "فاکتور پرداخت",
      "payInvoice": "پرداخت {{amount}} {{currency}}",
      "invoicePaid": "فاکتور پرداخت شد"
    },
    "paperWallet": {
      "title": "کیف پول کاغذی (Paper Wallet)",
      "desc": "تولید محلی جفت‌کلید Ed25519 بدون اتصال به شبکه اینترنت.",
      "generateButton": "تولید کیف پول سرد",
      "mnemonicTitle": "عبارت بازیابی کیف پول سرد",
      "saveWarning": "این عبارت را چاپ یا یادداشت کنید. این عبارت فقط در حافظه موقت نگهداری می‌شود."
    },
    "hub": {
      "title": "TON Connect 2.0 و کیف پول رمزارز",
      "connectBannerTitle": "اتصال از طریق پروتکل TON Connect 2.0",
      "connectBannerDesc": "کیف پول غیرحضانتی خود را برای انتقال‌های فوری و امن P2P و پرداخت فاکتورها بدون کارمزد متصل کنید.",
      "selectWallet": "کیف پول مورد نظر برای اتصال را انتخاب کنید:",
      "popularBadge": "محبوب",
      "watchOnlyPresets": "پیش‌تنظیم‌های سریع آن‌چین (فقط مشاهده):",
      "watchOnlyMonitoring": "نظارت آن‌چین",
      "customAddressTitle": "ورود آدرس کیف پول (فقط مشاهده / دستی)",
      "customAddressDesc": "آدرس عمومی TON خود را (با UQ... یا EQ... یا 0:... شروع می‌شود) برای مشاهده موجودی وارد کنید:",
      "connectAddressButton": "اتصال آدرس",
      "checkingAddress": "در حال بررسی آدرس..."
    },
    "invoice": {
      "title": "فاکتور پرداخت",
      "statusPending": "در انتظار پرداخت",
      "statusCompleted": "پرداخت شده",
      "statusExpired": "منقضی شده",
      "payButton": "پرداخت {{amount}} {{currency}}"
    },
    "receipt": {
      "title": "رسید انتقال",
      "txHash": "هش تراکنش (TxHash)"
    }
  },
  "fr": {
    "title": "Portefeuille Crypto TON",
    "tabs": {
      "overview": "Aperçu",
      "send": "Envoyer",
      "deposit": "Recevoir",
      "history": "Historique"
    },
    "overview": {
      "totalBalance": "Solde total",
      "tonBalance": "{{amount}} TON",
      "usdtBalance": "{{amount}} USDT",
      "fiatEquivalent": "≈ {{fiat}}",
      "connectWallet": "Connecter TON Connect",
      "disconnect": "Déconnecter le portefeuille",
      "connectedAs": "Connecté : {{address}}",
      "quickSend": "Envoyer",
      "quickReceive": "Recevoir",
      "refreshBalances": "Actualiser les soldes"
    },
    "send": {
      "recipientLabel": "Adresse du destinataire ou domaine .ton",
      "recipientPlaceholder": "EQ... ou domaine.ton",
      "amountLabel": "Montant du transfert",
      "amountPlaceholder": "0.00",
      "memoLabel": "Commentaire (Memo / Tag)",
      "memoPlaceholder": "Facultatif",
      "assetSelect": "Devise",
      "available": "Disponible : {{amount}} {{symbol}}",
      "sendButton": "Envoyer {{amount}} {{symbol}}",
      "confirming": "Signature de la transaction dans le portefeuille...",
      "success": "Transfert envoyé avec succès !",
      "invalidAddress": "Adresse de réseau TON invalide",
      "insufficientFunds": "Fonds insuffisants"
    },
    "deposit": {
      "title": "Recevoir des actifs",
      "desc": "Envoyez des TON ou USDT à votre adresse personnelle :",
      "copyAddress": "Copier l'adresse",
      "shareQr": "Partager le code QR",
      "warning": "Envoyez uniquement des actifs du réseau TON (The Open Network). L'envoi d'autres jetons entraînera leur perte définitive."
    },
    "history": {
      "title": "Historique des transactions",
      "empty": "Aucune transaction pour le moment",
      "incoming": "Transfert entrant",
      "outgoing": "Transfert sortant",
      "fee": "Frais de réseau : {{fee}} TON",
      "viewExplorer": "Voir sur TonScan"
    },
    "inChat": {
      "transferButton": "Transférer dans la discussion",
      "invoiceButton": "Créer une facture",
      "receiptTitle": "Reçu de transfert TON",
      "receiptSent": "Vous avez envoyé {{amount}} {{currency}}",
      "receiptReceived": "Vous avez reçu {{amount}} {{currency}}",
      "invoiceTitle": "Facture de paiement",
      "payInvoice": "Payer {{amount}} {{currency}}",
      "invoicePaid": "Facture payée"
    },
    "paperWallet": {
      "title": "Portefeuille papier (Paper Wallet)",
      "desc": "Génération locale de paires de clés Ed25519 sans connexion Internet.",
      "generateButton": "Générer un portefeuille froid",
      "mnemonicTitle": "Mnémonique du portefeuille froid",
      "saveWarning": "Imprimez ou notez cette phrase de récupération. Elle est stockée uniquement en mémoire volatile."
    },
    "hub": {
      "title": "TON Connect 2.0 et Portefeuille Crypto",
      "connectBannerTitle": "Connexion via TON Connect 2.0",
      "connectBannerDesc": "Connectez votre portefeuille non-gardien pour des transferts P2P instantanés et sécurisés sans frais de service.",
      "selectWallet": "Sélectionnez un portefeuille à connecter :",
      "popularBadge": "Populaire",
      "watchOnlyPresets": "Préréglages Onchain (Mode lecture seule) :",
      "watchOnlyMonitoring": "Surveillance Onchain",
      "customAddressTitle": "Entrer l'adresse du portefeuille (Lecture seule / Manuel)",
      "customAddressDesc": "Entrez votre adresse TON publique (commençant par UQ..., EQ... ou 0:...) pour consulter le solde :",
      "connectAddressButton": "Connecter l'adresse",
      "checkingAddress": "Vérification de l'adresse..."
    },
    "invoice": {
      "title": "Facture de paiement",
      "statusPending": "En attente de paiement",
      "statusCompleted": "Payée",
      "statusExpired": "Expirée",
      "payButton": "Payer {{amount}} {{currency}}"
    },
    "receipt": {
      "title": "Reçu de transfert",
      "txHash": "Hash de transaction"
    }
  },
  "de": {
    "title": "TON-Krypto-Wallet",
    "tabs": {
      "overview": "Übersicht",
      "send": "Senden",
      "deposit": "Empfangen",
      "history": "Verlauf"
    },
    "overview": {
      "totalBalance": "Gesamtguthaben",
      "tonBalance": "{{amount}} TON",
      "usdtBalance": "{{amount}} USDT",
      "fiatEquivalent": "≈ {{fiat}}",
      "connectWallet": "TON Connect verbinden",
      "disconnect": "Wallet trennen",
      "connectedAs": "Verbunden: {{address}}",
      "quickSend": "Senden",
      "quickReceive": "Empfangen",
      "refreshBalances": "Guthaben aktualisieren"
    },
    "send": {
      "recipientLabel": "Empfängeradresse oder .ton-Domain",
      "recipientPlaceholder": "EQ... oder domain.ton",
      "amountLabel": "Überweisungsbetrag",
      "amountPlaceholder": "0.00",
      "memoLabel": "Kommentar (Memo / Tag)",
      "memoPlaceholder": "Optional",
      "assetSelect": "Währung",
      "available": "Verfügbar: {{amount}} {{symbol}}",
      "sendButton": "{{amount}} {{symbol}} senden",
      "confirming": "Transaktion wird in Wallet signiert...",
      "success": "Überweisung erfolgreich gesendet!",
      "invalidAddress": "Ungültige TON-Netzwerkadresse",
      "insufficientFunds": "Unzureichendes Guthaben"
    },
    "deposit": {
      "title": "Guthaben aufladen",
      "desc": "Senden Sie TON oder USDT an Ihre persönliche Adresse:",
      "copyAddress": "Adresse kopieren",
      "shareQr": "QR-Code teilen",
      "warning": "Senden Sie ausschließlich Vermögenswerte des TON-Netzwerks (The Open Network). Das Senden anderer Token führt zum dauerhaften Verlust."
    },
    "history": {
      "title": "Transaktionsverlauf",
      "empty": "Noch keine Transaktionen vorhanden",
      "incoming": "Eingehende Überweisung",
      "outgoing": "Ausgehende Überweisung",
      "fee": "Netzwerkgebühr: {{fee}} TON",
      "viewExplorer": "Auf TonScan ansehen"
    },
    "inChat": {
      "transferButton": "Im Chat überweisen",
      "invoiceButton": "Rechnung erstellen",
      "receiptTitle": "TON-Überweisungsbeleg",
      "receiptSent": "Sie haben {{amount}} {{currency}} gesendet",
      "receiptReceived": "Sie haben {{amount}} {{currency}} empfangen",
      "invoiceTitle": "Zahlungsrechnung",
      "payInvoice": "{{amount}} {{currency}} bezahlen",
      "invoicePaid": "Rechnung bezahlt"
    },
    "paperWallet": {
      "title": "Papier-Wallet (Paper Wallet)",
      "desc": "Lokale Generierung von Ed25519-Schlüsselpaaren ohne Internetverbindung.",
      "generateButton": "Cold-Wallet generieren",
      "mnemonicTitle": "Cold-Wallet-Seed-Phrase",
      "saveWarning": "Drucken oder notieren Sie diese Phrase. Sie wird nur im flüchtigen Speicher aufbewahrt."
    },
    "hub": {
      "title": "TON Connect 2.0 & Krypto-Wallet",
      "connectBannerTitle": "Verbindung über TON Connect 2.0",
      "connectBannerDesc": "Verbinden Sie Ihre Non-Custodial-Wallet für sichere P2P-Sofortüberweisungen und gebührenfreie Rechnungszahlungen.",
      "selectWallet": "Wallet zum Verbinden auswählen:",
      "popularBadge": "Beliebt",
      "watchOnlyPresets": "Schnelle Onchain-Voreinstellungen (Nur-Lese-Modus):",
      "watchOnlyMonitoring": "Onchain-Überwachung",
      "customAddressTitle": "Wallet-Adresse eingeben (Nur-Lese-Modus / Manuell)",
      "customAddressDesc": "Geben Sie Ihre öffentliche TON-Adresse ein (beginnt mit UQ..., EQ... oder 0:...), um den Kontostand einzusehen:",
      "connectAddressButton": "Adresse verbinden",
      "checkingAddress": "Adresse wird überprüft..."
    },
    "invoice": {
      "title": "Zahlungsrechnung",
      "statusPending": "Zahlung ausstehend",
      "statusCompleted": "Bezahlt",
      "statusExpired": "Abgelaufen",
      "payButton": "{{amount}} {{currency}} bezahlen"
    },
    "receipt": {
      "title": "Überweisungsbeleg",
      "txHash": "Transaktions-Hash"
    }
  }
}

def generate(base_dir):
    for lang, content in data.items():
        lang_dir = os.path.join(base_dir, lang)
        os.makedirs(lang_dir, exist_ok=True)
        with open(os.path.join(lang_dir, "wallet.json"), "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
    print("✓ wallet.json generated for all 8 languages")

if __name__ == "__main__":
    generate("e:/Boltalka/frontend/src/i18n/locales")
