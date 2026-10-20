# -*- coding: utf-8 -*-
import json
import os

data = {
  "ru": {
    "title": "Gossip Pulse & Радар Намерений",
    "tabs": {
      "forYou": "Для вас",
      "nearby": "Рядом (H3)",
      "subscriptions": "Подписки",
      "trends": "Тренды",
      "feed": "Лента намерений",
      "zkAttest": "ZK-Аттестаты",
      "escrow": "DvP Смарт-Эскроу"
    },
    "stories": {
      "title": "Истории",
      "create": "Создать историю",
      "viewAll": "Смотреть все"
    },
    "createModal": {
      "title": "Создать намерение в Pulse",
      "quickMode": "Быстрый пресет (30 сек)",
      "legoMode": "Lego-конструктор",
      "titleLabel": "Заголовок намерения",
      "titlePlaceholder": "Краткая суть вашего предложения или запроса...",
      "descLabel": "Подробное описание",
      "descPlaceholder": "Опишите условия, детали и требования...",
      "domainLabel": "Категория взаимодействия",
      "domains": {
        "p2p": "P2P Обмен / Сделка",
        "gig": "Фриланс / Работа (DvP)",
        "consensus": "Голосование / Опрос",
        "aid": "Взаимопомощь / Сбор",
        "events": "Событие / Встреча",
        "trade": "ВЭД & Торговля",
        "civic": "Гражданский выбор",
        "whistleblow": "Свидетельства"
      },
      "accordions": {
        "trust": "Доверие и ZK-Репутация",
        "escrow": "Смарт-Эскроу (DvP защита)",
        "privacy": "Приватность и анонимность",
        "settlement": "Валюта и расчеты",
        "spatial": "Гео-привязка H3 Res 8",
        "quorum": "Кворум и арбитраж"
      },
      "publishButton": "Опубликовать в Pulse",
      "publishing": "Публикация намерения...",
      "anonymousToggle": "Анонимная публикация (ZK-Nullifier)"
    },
    "card": {
      "anonymousAuthor": "Анонимный участник",
      "reputationScore": "ZK-Репутация: {{score}}",
      "expiresIn": "Осталось: {{time}}",
      "respondButton": "Откликнуться",
      "startDeal": "Открыть безопасную сделку",
      "tipTon": "Чаевые TON",
      "like": "Нравится",
      "comments": "Комментарии ({{count}})",
      "share": "Поделиться"
    },
    "hub": {
      "title": "Gossip Pulse & Sovereign Economic Layer",
      "subtitle": "От P2P-сделок до международных расчетов",
      "tabsFeed": "Лента намерений",
      "tabsZkAttest": "ZK-Аттестаты",
      "tabsEscrow": "DvP Смарт-Эскроу"
    },
    "feed": {
      "searchPlaceholder": "Поиск намерений, офферов, петиций и проектов...",
      "geoRadarBtn": "Радар: {{radius}} км",
      "geoRadarOff": "Гео-радар выкл",
      "filterAll": "Все домены",
      "filterP2p": "P2P Валюта",
      "filterTrade": "ВЭД & Торговля",
      "filterCivic": "Гражданский выбор",
      "filterAid": "Взаимопомощь",
      "filterGig": "Задачи & Работа",
      "filterWhistleblow": "Свидетельства"
    },
    "feedback": {
      "modalTitle": "⭐ Оценка контрагента (ZK Dual-Blind)",
      "counterparty": "Контрагент сделки",
      "ratingLabel": "Ваша оценка взаимодействия:",
      "tagsLabel": "Выберите теги (до 4):",
      "dualBlindInfo": "Dual-Blind Commit: ваша оценка запечатана хэшем и раскроется одновременно со второй стороной. Месть или зеркальный шантаж исключены.",
      "submit": "Подтвердить и отправить отзыв"
    }
  },
  "en": {
    "title": "Gossip Pulse & Intent Radar",
    "tabs": {
      "forYou": "For You",
      "nearby": "Nearby (H3)",
      "subscriptions": "Subscriptions",
      "trends": "Trends",
      "feed": "Intent Feed",
      "zkAttest": "ZK Attestations",
      "escrow": "DvP Smart Escrow"
    },
    "stories": {
      "title": "Stories",
      "create": "Create Story",
      "viewAll": "View All"
    },
    "createModal": {
      "title": "Create Pulse Intent",
      "quickMode": "Quick Preset (30s)",
      "legoMode": "Lego Builder",
      "titleLabel": "Intent Title",
      "titlePlaceholder": "Brief summary of your offer or request...",
      "descLabel": "Detailed Description",
      "descPlaceholder": "Describe conditions, details and requirements...",
      "domainLabel": "Interaction Category",
      "domains": {
        "p2p": "P2P Exchange / Deal",
        "gig": "Freelance / Gig (DvP)",
        "consensus": "Voting / Poll",
        "aid": "Mutual Aid / Crowdfund",
        "events": "Event / Meetup",
        "trade": "Trade & Export",
        "civic": "Civic Choice",
        "whistleblow": "Whistleblowing"
      },
      "accordions": {
        "trust": "Trust & ZK Reputation",
        "escrow": "Smart Escrow (DvP Protection)",
        "privacy": "Privacy & Anonymity",
        "settlement": "Settlement & Currency",
        "spatial": "Spatial H3 Res 8 Pin",
        "quorum": "Quorum & Dispute Resolution"
      },
      "publishButton": "Publish to Pulse",
      "publishing": "Publishing intent...",
      "anonymousToggle": "Anonymous Publication (ZK-Nullifier)"
    },
    "card": {
      "anonymousAuthor": "Anonymous Member",
      "reputationScore": "ZK Reputation: {{score}}",
      "expiresIn": "Expires in: {{time}}",
      "respondButton": "Respond",
      "startDeal": "Open Safe Deal",
      "tipTon": "Tip TON",
      "like": "Like",
      "comments": "Comments ({{count}})",
      "share": "Share"
    },
    "hub": {
      "title": "Gossip Pulse & Sovereign Economic Layer",
      "subtitle": "From P2P deals to global settlement",
      "tabsFeed": "Intent Feed",
      "tabsZkAttest": "ZK Attestations",
      "tabsEscrow": "DvP Smart Escrow"
    },
    "feed": {
      "searchPlaceholder": "Search intents, offers, petitions and projects...",
      "geoRadarBtn": "Radar: {{radius}} km",
      "geoRadarOff": "Geo Radar Off",
      "filterAll": "All Domains",
      "filterP2p": "P2P Currency",
      "filterTrade": "Trade & Export",
      "filterCivic": "Civic Choice",
      "filterAid": "Mutual Aid",
      "filterGig": "Tasks & Gigs",
      "filterWhistleblow": "Whistleblowing"
    },
    "feedback": {
      "modalTitle": "⭐ Rate Counterparty (ZK Dual-Blind)",
      "counterparty": "Deal Counterparty",
      "ratingLabel": "Your interaction rating:",
      "tagsLabel": "Select tags (up to 4):",
      "dualBlindInfo": "Dual-Blind Commit: your rating is hash-sealed and revealed only when both parties submit. Retaliation and blackmail are impossible.",
      "submit": "Confirm and Submit Feedback"
    }
  },
  "es": {
    "title": "Gossip Pulse y Radar de Intenciones",
    "tabs": {
      "forYou": "Para ti",
      "nearby": "Cerca (H3)",
      "subscriptions": "Suscripciones",
      "trends": "Tendencias",
      "feed": "Feed de intenciones",
      "zkAttest": "Certificados ZK",
      "escrow": "Depósito en garantía DvP"
    },
    "stories": {
      "title": "Historias",
      "create": "Crear historia",
      "viewAll": "Ver todas"
    },
    "createModal": {
      "title": "Crear intención en Pulse",
      "quickMode": "Ajuste rápido (30s)",
      "legoMode": "Constructor Lego",
      "titleLabel": "Título de la intención",
      "titlePlaceholder": "Breve resumen de tu propuesta o solicitud...",
      "descLabel": "Descripción detallada",
      "descPlaceholder": "Describe condiciones, detalles y requisitos...",
      "domainLabel": "Categoría de interacción",
      "domains": {
        "p2p": "Intercambio P2P / Trato",
        "gig": "Freelance / Trabajo (DvP)",
        "consensus": "Votación / Encuesta",
        "aid": "Ayuda mutua / Colecta",
        "events": "Evento / Encuentro",
        "trade": "Comercio y Exportación",
        "civic": "Elección cívica",
        "whistleblow": "Testimonios y Denuncias"
      },
      "accordions": {
        "trust": "Confianza y Reputación ZK",
        "escrow": "Smart Escrow (Protección DvP)",
        "privacy": "Privacidad y Anonimato",
        "settlement": "Moneda y Liquidación",
        "spatial": "Geolocalización H3 Res 8",
        "quorum": "Quórum y Arbitraje"
      },
      "publishButton": "Publicar en Pulse",
      "publishing": "Publicando intención...",
      "anonymousToggle": "Publicación anónima (ZK-Nullifier)"
    },
    "card": {
      "anonymousAuthor": "Miembro anónimo",
      "reputationScore": "Reputación ZK: {{score}}",
      "expiresIn": "Expira en: {{time}}",
      "respondButton": "Responder",
      "startDeal": "Abrir trato seguro",
      "tipTon": "Propina TON",
      "like": "Me gusta",
      "comments": "Comentarios ({{count}})",
      "share": "Compartir"
    },
    "hub": {
      "title": "Gossip Pulse y Capa Económica Soberana (SEL)",
      "subtitle": "De tratos P2P a liquidaciones globales",
      "tabsFeed": "Feed de intenciones",
      "tabsZkAttest": "Certificados ZK",
      "tabsEscrow": "Smart Escrow DvP"
    },
    "feed": {
      "searchPlaceholder": "Buscar intenciones, ofertas, peticiones y proyectos...",
      "geoRadarBtn": "Radar: {{radius}} km",
      "geoRadarOff": "Geo-radar desactivado",
      "filterAll": "Todos los dominios",
      "filterP2p": "Moneda P2P",
      "filterTrade": "Comercio exterior",
      "filterCivic": "Elección cívica",
      "filterAid": "Ayuda mutua",
      "filterGig": "Tareas y Empleo",
      "filterWhistleblow": "Denuncias"
    },
    "feedback": {
      "modalTitle": "⭐ Calificación de contraparte (ZK Dual-Blind)",
      "counterparty": "Contraparte del trato",
      "ratingLabel": "Tu calificación de la interacción:",
      "tagsLabel": "Selecciona etiquetas (hasta 4):",
      "dualBlindInfo": "Dual-Blind Commit: tu calificación está sellada por hash y se revela simultáneamente con la otra parte. El chantaje o la represalia son imposibles.",
      "submit": "Confirmar y enviar opinión"
    }
  },
  "zh": {
    "title": "Gossip Pulse 与意图雷达",
    "tabs": {
      "forYou": "推荐",
      "nearby": "附近 (H3)",
      "subscriptions": "关注",
      "trends": "热门趋势",
      "feed": "意图动态流",
      "zkAttest": "ZK 证明与凭证",
      "escrow": "DvP 智能担保"
    },
    "stories": {
      "title": "快拍动态",
      "create": "发布快拍",
      "viewAll": "查看全部"
    },
    "createModal": {
      "title": "在 Pulse 中创建意图",
      "quickMode": "快速预设 (30秒)",
      "legoMode": "乐高积木式搭建",
      "titleLabel": "意图标题",
      "titlePlaceholder": "简要概括您的意向需求或提案...",
      "descLabel": "详细描述",
      "descPlaceholder": "详细描述合作条款、要求及细节...",
      "domainLabel": "交互类别",
      "domains": {
        "p2p": "P2P 兑换 / 交易",
        "gig": "自由职业 / 悬赏任务 (DvP)",
        "consensus": "共识投票 / 问卷",
        "aid": "互助协作 / 众筹",
        "events": "线下聚会 / 活动",
        "trade": "跨境商贸",
        "civic": "公民倡议",
        "whistleblow": "公开见证"
      },
      "accordions": {
        "trust": "信任机制与 ZK 声誉",
        "escrow": "智能托管担保 (DvP 交付防欺诈)",
        "privacy": "隐私保护与匿名度",
        "settlement": "结算币种与支付方式",
        "spatial": "H3 Res 8 空间地理定位",
        "quorum": "法定仲裁与仲裁员机制"
      },
      "publishButton": "发布到 Pulse",
      "publishing": "正在发布意图...",
      "anonymousToggle": "匿名发布 (ZK-Nullifier 零知识防关联)"
    },
    "card": {
      "anonymousAuthor": "匿名参与者",
      "reputationScore": "ZK 声誉: {{score}}",
      "expiresIn": "剩余时间: {{time}}",
      "respondButton": "即刻响应",
      "startDeal": "开启担保交易",
      "tipTon": "打赏 TON",
      "like": "赞",
      "comments": "评论 ({{count}})",
      "share": "分享"
    },
    "hub": {
      "title": "Gossip Pulse 与主权经济层 (SEL)",
      "subtitle": "从微型 P2P 协作到跨国去中心化结算",
      "tabsFeed": "意图流",
      "tabsZkAttest": "ZK 凭证",
      "tabsEscrow": "DvP 智能托管"
    },
    "feed": {
      "searchPlaceholder": "搜索意图、悬赏、提案及协作项目...",
      "geoRadarBtn": "空间雷达: {{radius}} 公里",
      "geoRadarOff": "雷达已关闭",
      "filterAll": "全部领域",
      "filterP2p": "P2P 兑换",
      "filterTrade": "商贸进出口",
      "filterCivic": "公民倡议",
      "filterAid": "互助众筹",
      "filterGig": "任务雇佣",
      "filterWhistleblow": "公开见证"
    },
    "feedback": {
      "modalTitle": "⭐ 评价交易方 (ZK Dual-Blind 双盲承诺)",
      "counterparty": "交易对手方",
      "ratingLabel": "您对本次协作的评分：",
      "tagsLabel": "选择评价标签（最多4个）：",
      "dualBlindInfo": "双盲承诺机制：您的评价内容由哈希加密锁定，仅在双方均提交评价后同步解密公布，彻底杜绝恶意报复与敲诈勒索。",
      "submit": "确认并提交评价"
    }
  },
  "ar": {
    "title": "Gossip Pulse ورادار النوايا",
    "tabs": {
      "forYou": "لك",
      "nearby": "بالقرب منك (H3)",
      "subscriptions": "الاشتراكات",
      "trends": "الرائج",
      "feed": "موجز النوايا",
      "zkAttest": "شهادات ZK",
      "escrow": "الضمان الذكي DvP"
    },
    "stories": {
      "title": "القصص",
      "create": "إنشاء قصة",
      "viewAll": "عرض الكل"
    },
    "createModal": {
      "title": "إنشاء نية في Pulse",
      "quickMode": "إعداد سريع (30 ثانية)",
      "legoMode": "منشئ Lego",
      "titleLabel": "عنوان النية",
      "titlePlaceholder": "ملخص موجز لعرضك أو طلبك...",
      "descLabel": "الوصف التفصيلي",
      "descPlaceholder": "صف الشروط والتفاصيل والمتطلبات...",
      "domainLabel": "فئة التفاعل",
      "domains": {
        "p2p": "تبادل P2P / صفقة",
        "gig": "عمل حر / مهمة (DvP)",
        "consensus": "تصويت / استطلاع",
        "aid": "مساعدة متبادلة / تمويل",
        "events": "فعالية / لقاء",
        "trade": "التجارة والتصدير",
        "civic": "الخيار المدني",
        "whistleblow": "الشهادات والشفافية"
      },
      "accordions": {
        "trust": "الثقة وسمعة ZK",
        "escrow": "الضمان الذكي (حماية DvP)",
        "privacy": "الخصوصية وإخفاء الهوية",
        "settlement": "التسوية والعملة",
        "spatial": "الموقع الجغرافي H3 Res 8",
        "quorum": "النصاب والتحكيم"
      },
      "publishButton": "نشر في Pulse",
      "publishing": "جارٍ نشر النية...",
      "anonymousToggle": "نشر مجهول الهوية (ZK-Nullifier)"
    },
    "card": {
      "anonymousAuthor": "عضو مجهول",
      "reputationScore": "سمعة ZK: {{score}}",
      "expiresIn": "ينتهي خلال: {{time}}",
      "respondButton": "استجابة",
      "startDeal": "بدء صفقة آمنة",
      "tipTon": "إكرامية TON",
      "like": "إعجاب",
      "comments": "التعليقات ({{count}})",
      "share": "مشاركة"
    },
    "hub": {
      "title": "Gossip Pulse والطبقة الاقتصادية السيادية",
      "subtitle": "من صفقات P2P إلى التسويات الدولية",
      "tabsFeed": "موجز النوايا",
      "tabsZkAttest": "شهادات ZK",
      "tabsEscrow": "الضمان الذكي DvP"
    },
    "feed": {
      "searchPlaceholder": "البحث عن النوايا والعروض والعرائض والمشاريع...",
      "geoRadarBtn": "الرادار: {{radius}} كم",
      "geoRadarOff": "إيقاف الرادار",
      "filterAll": "جميع المجالات",
      "filterP2p": "عملات P2P",
      "filterTrade": "التجارة والتصدير",
      "filterCivic": "الخيار المدني",
      "filterAid": "المساعدة المتبادلة",
      "filterGig": "المهام والعمل",
      "filterWhistleblow": "الشفافية"
    },
    "feedback": {
      "modalTitle": "⭐ تقييم الطرف المقابل (ZK Dual-Blind)",
      "counterparty": "الطرف المقابل في الصفقة",
      "ratingLabel": "تقييمك للتعامل:",
      "tagsLabel": "اختر وسوماً (حتى 4):",
      "dualBlindInfo": "التزام أعمى مزدوج: تقييمك مشفر ولن يُكشف إلا بعد تقديم كلا الطرفين لتقييمهما، مما يمنع الانتقام أو الابتزاز.",
      "submit": "تأكيد وإرسال التقييم"
    }
  },
  "fa": {
    "title": "Gossip Pulse و رادار اهداف",
    "tabs": {
      "forYou": "برای شما",
      "nearby": "نزدیک من (H3)",
      "subscriptions": "دنبال‌شده‌ها",
      "trends": "روندها",
      "feed": "جریان اهداف",
      "zkAttest": "گواهی‌های ZK",
      "escrow": "اسکروی هوشمند DvP"
    },
    "stories": {
      "title": "داستان‌ها",
      "create": "ایجاد داستان",
      "viewAll": "مشاهده همه"
    },
    "createModal": {
      "title": "ایجاد هدف در Pulse",
      "quickMode": "پیش‌تنظیم سریع (۳۰ ثانیه)",
      "legoMode": "سازنده لگو",
      "titleLabel": "عنوان هدف",
      "titlePlaceholder": "خلاصه کوتاهی از پیشنهاد یا درخواست خود...",
      "descLabel": "توضیحات کامل",
      "descPlaceholder": "شرایط، جزئیات و الزامات را شرح دهید...",
      "domainLabel": "دسته‌بندی تعامل",
      "domains": {
        "p2p": "تبادل P2P / معامله",
        "gig": "فریلنسری / کار (DvP)",
        "consensus": "رأی‌گیری / نظرسنجی",
        "aid": "همیاری / تأمین مالی",
        "events": "رویداد / گردهمایی",
        "trade": "تجارت و صادرات",
        "civic": "انتخاب مدنی",
        "whistleblow": "افشاگری و شفافیت"
      },
      "accordions": {
        "trust": "اعتماد و شهرت ZK",
        "escrow": "اسکروی هوشمند (حفاظت DvP)",
        "privacy": "حریم خصوصی و ناشناسی",
        "settlement": "تسویه و ارز",
        "spatial": "موقعیت مکانی H3 Res 8",
        "quorum": "حد نصاب و داوری"
      },
      "publishButton": "انتشار در Pulse",
      "publishing": "در حال انتشار هدف...",
      "anonymousToggle": "انتشار ناشناس (ZK-Nullifier)"
    },
    "card": {
      "anonymousAuthor": "عضو ناشناس",
      "reputationScore": "شهرت ZK: {{score}}",
      "expiresIn": "زمان باقی‌مانده: {{time}}",
      "respondButton": "پاسخ دادن",
      "startDeal": "آغاز معامله امن",
      "tipTon": "انعام TON",
      "like": "پسندیدن",
      "comments": "نظرات ({{count}})",
      "share": "اشتراک‌گذاری"
    },
    "hub": {
      "title": "Gossip Pulse و لایه اقتصادی مستقل",
      "subtitle": "از معاملات P2P تا تسویه‌های بین‌المللی",
      "tabsFeed": "جریان اهداف",
      "tabsZkAttest": "گواهی‌های ZK",
      "tabsEscrow": "اسکروی هوشمند DvP"
    },
    "feed": {
      "searchPlaceholder": "جستجوی اهداف، پیشنهادها، کارزارها و پروژه‌ها...",
      "geoRadarBtn": "رادار: {{radius}} کیلومتر",
      "geoRadarOff": "رادار خاموش",
      "filterAll": "همه حوزه‌ها",
      "filterP2p": "ارز P2P",
      "filterTrade": "تجارت و صادرات",
      "filterCivic": "انتخاب مدنی",
      "filterAid": "همیاری",
      "filterGig": "وظایف و کار",
      "filterWhistleblow": "شفافیت"
    },
    "feedback": {
      "modalTitle": "⭐ امتیازدهی به طرف معامله (ZK Dual-Blind)",
      "counterparty": "طرف معامله",
      "ratingLabel": "امتیاز شما از تعامل:",
      "tagsLabel": "برچسب‌ها را انتخاب کنید (حداکثر ۴):",
      "dualBlindInfo": "تعهد دوطرفه کور: امتیاز شما تا زمان ثبت نظر طرف مقابل پنهان می‌ماند و انتقام‌جویی غیرممکن است.",
      "submit": "تأیید و ارسال نظر"
    }
  },
  "fr": {
    "title": "Gossip Pulse et Radar d'Intentions",
    "tabs": {
      "forYou": "Pour vous",
      "nearby": "À proximité (H3)",
      "subscriptions": "Abonnements",
      "trends": "Tendances",
      "feed": "Flux d'intentions",
      "zkAttest": "Attestations ZK",
      "escrow": "Séquestre intelligent DvP"
    },
    "stories": {
      "title": "Stories",
      "create": "Créer une story",
      "viewAll": "Tout voir"
    },
    "createModal": {
      "title": "Créer une intention Pulse",
      "quickMode": "Préréglage rapide (30s)",
      "legoMode": "Constructeur Lego",
      "titleLabel": "Titre de l'intention",
      "titlePlaceholder": "Bref résumé de votre offre ou demande...",
      "descLabel": "Description détaillée",
      "descPlaceholder": "Décrivez les conditions, détails et exigences...",
      "domainLabel": "Catégorie d'interaction",
      "domains": {
        "p2p": "Échange P2P / Transaction",
        "gig": "Freelance / Mission (DvP)",
        "consensus": "Vote / Sondage",
        "aid": "Entraide / Collecte",
        "events": "Événement / Rencontre",
        "trade": "Commerce & Export",
        "civic": "Action civique",
        "whistleblow": "Témoignages & Alertes"
      },
      "accordions": {
        "trust": "Confiance et Réputation ZK",
        "escrow": "Séquestre intelligent (Protection DvP)",
        "privacy": "Confidentialité et Anonymat",
        "settlement": "Devise et Règlement",
        "spatial": "Géolocalisation H3 Res 8",
        "quorum": "Quorum et Résolution des litiges"
      },
      "publishButton": "Publier dans Pulse",
      "publishing": "Publication de l'intention...",
      "anonymousToggle": "Publication anonyme (ZK-Nullifier)"
    },
    "card": {
      "anonymousAuthor": "Membre anonyme",
      "reputationScore": "Réputation ZK : {{score}}",
      "expiresIn": "Expire dans : {{time}}",
      "respondButton": "Répondre",
      "startDeal": "Ouvrir un accord sécurisé",
      "tipTon": "Pourboire TON",
      "like": "J'aime",
      "comments": "Commentaires ({{count}})",
      "share": "Partager"
    },
    "hub": {
      "title": "Gossip Pulse et Couche Économique Souveraine (SEL)",
      "subtitle": "Des échanges P2P aux règlements internationaux",
      "tabsFeed": "Flux d'intentions",
      "tabsZkAttest": "Attestations ZK",
      "tabsEscrow": "Séquestre intelligent DvP"
    },
    "feed": {
      "searchPlaceholder": "Rechercher intentions, offres, pétitions et projets...",
      "geoRadarBtn": "Radar : {{radius}} km",
      "geoRadarOff": "Géo-radar désactivé",
      "filterAll": "Tous les domaines",
      "filterP2p": "Devises P2P",
      "filterTrade": "Commerce international",
      "filterCivic": "Action civique",
      "filterAid": "Entraide",
      "filterGig": "Tâches & Emploi",
      "filterWhistleblow": "Alertes"
    },
    "feedback": {
      "modalTitle": "⭐ Évaluation de la contrepartie (ZK Dual-Blind)",
      "counterparty": "Contrepartie de l'accord",
      "ratingLabel": "Votre note d'interaction :",
      "tagsLabel": "Sélectionnez des tags (jusqu'à 4) :",
      "dualBlindInfo": "Engagement en double aveugle : votre évaluation est scellée et révélée uniquement lorsque les deux parties ont soumis la leur.",
      "submit": "Confirmer et envoyer l'avis"
    }
  },
  "de": {
    "title": "Gossip Pulse & Absichtsradar",
    "tabs": {
      "forYou": "Für dich",
      "nearby": "In der Nähe (H3)",
      "subscriptions": "Abonnements",
      "trends": "Trends",
      "feed": "Absichts-Feed",
      "zkAttest": "ZK-Zertifikate",
      "escrow": "DvP-Smart-Treuhand"
    },
    "stories": {
      "title": "Stories",
      "create": "Story erstellen",
      "viewAll": "Alle ansehen"
    },
    "createModal": {
      "title": "Pulse-Absicht erstellen",
      "quickMode": "Schnellvoreinstellung (30s)",
      "legoMode": "Lego-Baukasten",
      "titleLabel": "Titel der Absicht",
      "titlePlaceholder": "Kurze Zusammenfassung Ihres Angebots oder Ihrer Anfrage...",
      "descLabel": "Detaillierte Beschreibung",
      "descPlaceholder": "Beschreiben Sie Bedingungen, Details und Anforderungen...",
      "domainLabel": "Interaktionskategorie",
      "domains": {
        "p2p": "P2P-Tausch / Deal",
        "gig": "Freelance / Auftrag (DvP)",
        "consensus": "Abstimmung / Umfrage",
        "aid": "Gegenseitige Hilfe / Spendenaktion",
        "events": "Veranstaltung / Treffen",
        "trade": "Außenhandel & Export",
        "civic": "Bürgerschaftliche Wahl",
        "whistleblow": "Hinweise & Zeugnisse"
      },
      "accordions": {
        "trust": "Vertrauen & ZK-Reputation",
        "escrow": "Smart Escrow (DvP-Schutz)",
        "privacy": "Datenschutz & Anonymität",
        "settlement": "Währung & Abwicklung",
        "spatial": "Räumliche H3-Res-8-Ortung",
        "quorum": "Quorum & Streitschlichtung"
      },
      "publishButton": "In Pulse veröffentlichen",
      "publishing": "Absicht wird veröffentlicht...",
      "anonymousToggle": "Anonyme Veröffentlichung (ZK-Nullifier)"
    },
    "card": {
      "anonymousAuthor": "Anonymes Mitglied",
      "reputationScore": "ZK-Reputation: {{score}}",
      "expiresIn": "Verbleibende Zeit: {{time}}",
      "respondButton": "Antworten",
      "startDeal": "Sicheren Deal starten",
      "tipTon": "TON-Trinkgeld",
      "like": "Gefällt mir",
      "comments": "Kommentare ({{count}})",
      "share": "Teilen"
    },
    "hub": {
      "title": "Gossip Pulse & Souveräne Wirtschaftsebene (SEL)",
      "subtitle": "Von P2P-Geschäften bis zu internationalen Abrechnungen",
      "tabsFeed": "Absichts-Feed",
      "tabsZkAttest": "ZK-Zertifikate",
      "tabsEscrow": "DvP-Smart-Treuhand"
    },
    "feed": {
      "searchPlaceholder": "Absichten, Angebote, Petitionen und Projekte suchen...",
      "geoRadarBtn": "Radar: {{radius}} km",
      "geoRadarOff": "Geo-Radar aus",
      "filterAll": "Alle Bereiche",
      "filterP2p": "P2P-Währung",
      "filterTrade": "Handel & Export",
      "filterCivic": "Bürgerinitiative",
      "filterAid": "Gemeinschaftshilfe",
      "filterGig": "Aufgaben & Gigs",
      "filterWhistleblow": "Hinweise"
    },
    "feedback": {
      "modalTitle": "⭐ Bewertung des Transaktionspartners (ZK Dual-Blind)",
      "counterparty": "Transaktionspartner",
      "ratingLabel": "Ihre Bewertung der Interaktion:",
      "tagsLabel": "Tags auswählen (bis zu 4):",
      "dualBlindInfo": "Doppelblind-Festlegung: Ihre Bewertung ist per Hash versiegelt und wird erst enthüllt, wenn beide Parteien bewertet haben.",
      "submit": "Bewertung bestätigen und absenden"
    }
  }
}

def generate(base_dir):
    for lang, content in data.items():
        lang_dir = os.path.join(base_dir, lang)
        os.makedirs(lang_dir, exist_ok=True)
        with open(os.path.join(lang_dir, "pulse.json"), "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
    print("✓ pulse.json generated for all 8 languages")

if __name__ == "__main__":
    generate("e:/Boltalka/frontend/src/i18n/locales")
