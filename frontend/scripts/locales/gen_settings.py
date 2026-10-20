# -*- coding: utf-8 -*-
import json
import os

data = {
  "ru": {
    "title": "Настройки",
    "profile": {
      "title": "Профиль",
      "changeAvatar": "Изменить фото",
      "username": "Имя пользователя",
      "mlsPublicKey": "MLS Публичный ключ (X25519):",
      "notGenerated": "не сгенерирован",
      "editAvatar": "Изменить",
      "ownerTitle": "Владелец Gossip"
    },
    "system": {
      "title": "Система и безопасность",
      "notifications": "Уведомления",
      "notificationsEnabled": "Включены",
      "privacy": "Конфиденциальность",
      "privacyMax": "Максимальная",
      "networkShield": "Сетевой щит и Шлюзы",
      "pinAutoUnlock": "Вход без ввода PIN",
      "backgroundConnection": "Постоянное фоновое соединение (24/7)",
      "backgroundConnectionDesc": "Уведомления о сообщениях и звонках работают всегда. Включайте только для прямого удержания сокета в фоне.",
      "chatFolders": "Папки чатов",
      "foldersCount": "Настроить ({{count}})",
      "dlpSafeContour": "Сейф-Контур",
      "dlpDesc": "DLP защита от пересылки для папок и дел",
      "botsAndIntegrations": "Боты и Интеграции",
      "botsDesc": "Telegram-like Bot API, Webhook и токены",
      "tonWallet": "Криптокошелек TON",
      "tonDesc": "TON Connect 2.0, балансы и P2P-переводы",
      "theme": "Тема оформления",
      "themes": {
        "dark": "Темная (Obsidian)",
        "light": "Светлая (Frosted)",
        "coffee": "Кофейная (Macchiato)"
      },
      "language": "Язык интерфейса",
      "languageDesc": "Выбор языка приложения и форматирования",
      "adminConsole": "Консоль управления",
      "logout": "Выйти из сессии",
      "appVersion": "Gossip v{{version}}"
    },
    "languageModal": {
      "title": "Выбор языка",
      "searchPlaceholder": "Поиск языка...",
      "rtlBadge": "RTL",
      "currentLanguage": "Текущий язык"
    },
    "avatarMenu": {
      "viewPhoto": "Просмотреть фото",
      "viewPhotoDesc": "Открыть на весь экран",
      "editCurrent": "Редактировать текущее",
      "editCurrentDesc": "Кадрирование, масштаб и поворот",
      "chooseNew": "Выбрать из галереи",
      "chooseNewDesc": "Загрузить новое изображение",
      "deletePhoto": "Удалить фото",
      "deletePhotoDesc": "Вернуть стандартный аватар"
    },
    "premium": {
      "modalTitle": "Gossip Premium",
      "plan1Month": "1 месяц",
      "plan3Months": "3 месяца",
      "plan1Year": "1 год"
    }
  },
  "en": {
    "title": "Settings",
    "profile": {
      "title": "Profile",
      "changeAvatar": "Change Photo",
      "username": "Username",
      "mlsPublicKey": "MLS Public Key (X25519):",
      "notGenerated": "not generated",
      "editAvatar": "Edit",
      "ownerTitle": "Gossip Owner"
    },
    "system": {
      "title": "System & Security",
      "notifications": "Notifications",
      "notificationsEnabled": "Enabled",
      "privacy": "Privacy",
      "privacyMax": "Maximum",
      "networkShield": "Network Shield & Gateways",
      "pinAutoUnlock": "Unlock without PIN entry",
      "backgroundConnection": "Persistent 24/7 Background Connection",
      "backgroundConnectionDesc": "Call and message notifications always work. Enable only for persistent socket keeping in background.",
      "chatFolders": "Chat Folders",
      "foldersCount": "Configure ({{count}})",
      "dlpSafeContour": "Safe Contour",
      "dlpDesc": "DLP anti-leak forwarding protection for folders and cases",
      "botsAndIntegrations": "Bots & Integrations",
      "botsDesc": "Telegram-like Bot API, Webhooks and tokens",
      "tonWallet": "TON Crypto Wallet",
      "tonDesc": "TON Connect 2.0, balances and P2P transfers",
      "theme": "Appearance Theme",
      "themes": {
        "dark": "Dark (Obsidian)",
        "light": "Light (Frosted)",
        "coffee": "Coffee (Macchiato)"
      },
      "language": "Interface Language",
      "languageDesc": "Choose application language and formatting",
      "adminConsole": "Admin Console",
      "logout": "Sign Out of Session",
      "appVersion": "Gossip v{{version}}"
    },
    "languageModal": {
      "title": "Select Language",
      "searchPlaceholder": "Search language...",
      "rtlBadge": "RTL",
      "currentLanguage": "Current Language"
    },
    "avatarMenu": {
      "viewPhoto": "View Photo",
      "viewPhotoDesc": "Open in fullscreen",
      "editCurrent": "Edit Current",
      "editCurrentDesc": "Crop, zoom and rotate",
      "chooseNew": "Choose from Gallery",
      "chooseNewDesc": "Upload a new picture",
      "deletePhoto": "Delete Photo",
      "deletePhotoDesc": "Revert to default avatar"
    },
    "premium": {
      "modalTitle": "Gossip Premium",
      "plan1Month": "1 month",
      "plan3Months": "3 months",
      "plan1Year": "1 year"
    }
  },
  "es": {
    "title": "Ajustes",
    "profile": {
      "title": "Perfil",
      "changeAvatar": "Cambiar foto",
      "username": "Nombre de usuario",
      "mlsPublicKey": "Clave pública MLS (X25519):",
      "notGenerated": "no generada",
      "editAvatar": "Editar",
      "ownerTitle": "Propietario de Gossip"
    },
    "system": {
      "title": "Sistema y seguridad",
      "notifications": "Notificaciones",
      "notificationsEnabled": "Activadas",
      "privacy": "Privacidad",
      "privacyMax": "Máxima",
      "networkShield": "Escudo de red y Pasarelas",
      "pinAutoUnlock": "Desbloqueo sin PIN",
      "backgroundConnection": "Conexión persistente 24/7 en segundo plano",
      "backgroundConnectionDesc": "Las notificaciones de llamadas y mensajes siempre funcionan. Activar solo para mantener el socket activo en segundo plano.",
      "chatFolders": "Carpetas de chat",
      "foldersCount": "Configurar ({{count}})",
      "dlpSafeContour": "Contorno Seguro",
      "dlpDesc": "Protección DLP antifuga para carpetas y expedientes",
      "botsAndIntegrations": "Bots e Integraciones",
      "botsDesc": "API de bots tipo Telegram, Webhooks y tokens",
      "tonWallet": "Billetera cripto TON",
      "tonDesc": "TON Connect 2.0, saldos y transferencias P2P",
      "theme": "Tema de apariencia",
      "themes": {
        "dark": "Oscuro (Obsidian)",
        "light": "Claro (Frosted)",
        "coffee": "Café (Macchiato)"
      },
      "language": "Idioma de la interfaz",
      "languageDesc": "Selección de idioma y formato de la aplicación",
      "adminConsole": "Consola de administración",
      "logout": "Cerrar sesión",
      "appVersion": "Gossip v{{version}}"
    },
    "languageModal": {
      "title": "Seleccionar idioma",
      "searchPlaceholder": "Buscar idioma...",
      "rtlBadge": "RTL",
      "currentLanguage": "Idioma actual"
    },
    "avatarMenu": {
      "viewPhoto": "Ver foto",
      "viewPhotoDesc": "Abrir en pantalla completa",
      "editCurrent": "Editar actual",
      "editCurrentDesc": "Recortar, ampliar y rotar",
      "chooseNew": "Elegir de la galería",
      "chooseNewDesc": "Subir una nueva imagen",
      "deletePhoto": "Eliminar foto",
      "deletePhotoDesc": "Restablecer avatar por defecto"
    },
    "premium": {
      "modalTitle": "Gossip Premium",
      "plan1Month": "1 mes",
      "plan3Months": "3 meses",
      "plan1Year": "1 año"
    }
  },
  "zh": {
    "title": "设置",
    "profile": {
      "title": "个人资料",
      "changeAvatar": "更换头像",
      "username": "用户名",
      "mlsPublicKey": "MLS 公钥 (X25519):",
      "notGenerated": "未生成",
      "editAvatar": "编辑",
      "ownerTitle": "Gossip 账户所有者"
    },
    "system": {
      "title": "系统与安全",
      "notifications": "通知提醒",
      "notificationsEnabled": "已启用",
      "privacy": "隐私保护",
      "privacyMax": "最高等级",
      "networkShield": "网络防护盾与网关",
      "pinAutoUnlock": "无需输入 PIN 自动解锁",
      "backgroundConnection": "全天候 24/7 后台持久连接",
      "backgroundConnectionDesc": "消息与通话通知始终保持畅通。仅在需要保持底层 Socket 长连接时开启。",
      "chatFolders": "会话分组",
      "foldersCount": "配置 ({{count}})",
      "dlpSafeContour": "安全隔离区 (DLP)",
      "dlpDesc": "针对分组和文件的防泄密转发限制",
      "botsAndIntegrations": "机器人与集成",
      "botsDesc": "类 Telegram Bot API、Webhook 及令牌管理",
      "tonWallet": "TON 加密钱包",
      "tonDesc": "TON Connect 2.0、资产余额与 P2P 链上转账",
      "theme": "外观主题",
      "themes": {
        "dark": "暗黑黑曜石 (Obsidian)",
        "light": "清爽冰霜白 (Frosted)",
        "coffee": "奢华玛奇朵 (Macchiato)"
      },
      "language": "界面语言",
      "languageDesc": "选择应用程序显示语言与格式",
      "adminConsole": "管理控制台",
      "logout": "退出当前会话",
      "appVersion": "Gossip v{{version}}"
    },
    "languageModal": {
      "title": "选择语言",
      "searchPlaceholder": "搜索语言...",
      "rtlBadge": "RTL",
      "currentLanguage": "当前语言"
    },
    "avatarMenu": {
      "viewPhoto": "查看头像大图",
      "viewPhotoDesc": "全屏预览照片",
      "editCurrent": "编辑当前头像",
      "editCurrentDesc": "裁剪、缩放与旋转调整",
      "chooseNew": "从相册选择新图片",
      "chooseNewDesc": "上传新的头像照片",
      "deletePhoto": "删除头像",
      "deletePhotoDesc": "恢复为默认系统头像"
    },
    "premium": {
      "modalTitle": "Gossip Premium 高级会员",
      "plan1Month": "1 个月",
      "plan3Months": "3 个月",
      "plan1Year": "1 年"
    }
  },
  "ar": {
    "title": "الإعدادات",
    "profile": {
      "title": "الملف الشخصي",
      "changeAvatar": "تغيير الصورة",
      "username": "اسم المستخدم",
      "mlsPublicKey": "مفتاح MLS العام (X25519):",
      "notGenerated": "لم يتم التوليد",
      "editAvatar": "تعديل",
      "ownerTitle": "مالك Gossip"
    },
    "system": {
      "title": "النظام والأمان",
      "notifications": "الإشعارات",
      "notificationsEnabled": "مفعلة",
      "privacy": "الخصوصية",
      "privacyMax": "القصوى",
      "networkShield": "درع الشبكة والبوابات",
      "pinAutoUnlock": "إلغاء القفل بدون إدخال PIN",
      "backgroundConnection": "اتصال دائم في الخلفية (24/7)",
      "backgroundConnectionDesc": "إشعارات المكالمات والرسائل تعمل دائماً. فعّله فقط للإبقاء على اتصال مباشر في الخلفية.",
      "chatFolders": "مجلدات المحادثات",
      "foldersCount": "تخصيص ({{count}})",
      "dlpSafeContour": "النطاق الآمن (DLP)",
      "dlpDesc": "حماية DLP لمنع تسريب الرسائل في المجلدات والقضايا",
      "botsAndIntegrations": "البوتات والتكاملات",
      "botsDesc": "واجهة برمجة تطبيقات البوتات، خطافات الويب والرموز",
      "tonWallet": "محفظة TON المشفرة",
      "tonDesc": "بروتوكول TON Connect 2.0، الأرصدة والتحويلات المباشرة",
      "theme": "مظهر الواجهة",
      "themes": {
        "dark": "داكن (Obsidian)",
        "light": "فاتح (Frosted)",
        "coffee": "قهوة (Macchiato)"
      },
      "language": "لغة الواجهة",
      "languageDesc": "اختيار لغة التطبيق وتنسيق البيانات",
      "adminConsole": "لوحة التحكم الإدارية",
      "logout": "تسجيل الخروج من الجلسة",
      "appVersion": "Gossip v{{version}}"
    },
    "languageModal": {
      "title": "اختيار اللغة",
      "searchPlaceholder": "البحث عن لغة...",
      "rtlBadge": "RTL",
      "currentLanguage": "اللغة الحالية"
    },
    "avatarMenu": {
      "viewPhoto": "عرض الصورة",
      "viewPhotoDesc": "فتح في وضع ملء الشاشة",
      "editCurrent": "تعديل الصورة الحالية",
      "editCurrentDesc": "قص وتكبير وتدوير",
      "chooseNew": "اختيار من المعرض",
      "chooseNewDesc": "رفع صورة جديدة",
      "deletePhoto": "حذف الصورة",
      "deletePhotoDesc": "العودة إلى الصورة الرمزية الافتراضية"
    },
    "premium": {
      "modalTitle": "Gossip Premium",
      "plan1Month": "شهر واحد",
      "plan3Months": "٣ أشهر",
      "plan1Year": "سنة واحدة"
    }
  },
  "fa": {
    "title": "تنظیمات",
    "profile": {
      "title": "نمایه",
      "changeAvatar": "تغییر عکس",
      "username": "نام کاربری",
      "mlsPublicKey": "کلید عمومی MLS (X25519):",
      "notGenerated": "تولید نشده",
      "editAvatar": "ویرایش",
      "ownerTitle": "مالک Gossip"
    },
    "system": {
      "title": "سیستم و امنیت",
      "notifications": "اعلان‌ها",
      "notificationsEnabled": "فعال",
      "privacy": "حریم خصوصی",
      "privacyMax": "حداکثر",
      "networkShield": "سپر شبکه و درگاه‌ها",
      "pinAutoUnlock": "ورود بدون وارد کردن پین",
      "backgroundConnection": "اتصال پایدار در پس‌زمینه (۲۴/۷)",
      "backgroundConnectionDesc": "اعلان‌های تماس و پیام همیشه کار می‌کنند. تنها برای نگهداری مستقیم اتصال در پس‌زمینه فعال کنید.",
      "chatFolders": "پوشه‌های گفتگو",
      "foldersCount": "تنظیم ({{count}})",
      "dlpSafeContour": "محدوده امن (DLP)",
      "dlpDesc": "حفاظت DLP در برابر افشای داده‌ها برای پوشه‌ها",
      "botsAndIntegrations": "ربات‌ها و اتصالات",
      "botsDesc": "API ربات مشابه تلگرام، وبهوک‌ها و توکن‌ها",
      "tonWallet": "کیف پول رمزارز TON",
      "tonDesc": "پروتکل TON Connect 2.0، موجودی و انتقال‌های P2P",
      "theme": "پوسته ظاهری",
      "themes": {
        "dark": "تاریک (Obsidian)",
        "light": "روشن (Frosted)",
        "coffee": "قهوه‌ای (Macchiato)"
      },
      "language": "زبان رابط کاربری",
      "languageDesc": "انتخاب زبان برنامه و فرمت‌بندی",
      "adminConsole": "کنسول مدیریت",
      "logout": "خروج از نشست",
      "appVersion": "Gossip v{{version}}"
    },
    "languageModal": {
      "title": "انتخاب زبان",
      "searchPlaceholder": "جستجوی زبان...",
      "rtlBadge": "RTL",
      "currentLanguage": "زبان فعلی"
    },
    "avatarMenu": {
      "viewPhoto": "مشاهده عکس",
      "viewPhotoDesc": "باز کردن در حالت تمام‌صفحه",
      "editCurrent": "ویرایش عکس فعلی",
      "editCurrentDesc": "برش، بزرگ‌نمایی و چرخش",
      "chooseNew": "انتخاب از گالری",
      "chooseNewDesc": "بارگذاری تصویر جدید",
      "deletePhoto": "حذف عکس",
      "deletePhotoDesc": "بازگشت به آواتار پیش‌فرض"
    },
    "premium": {
      "modalTitle": "Gossip Premium",
      "plan1Month": "۱ ماه",
      "plan3Months": "۳ ماه",
      "plan1Year": "۱ سال"
    }
  },
  "fr": {
    "title": "Paramètres",
    "profile": {
      "title": "Profil",
      "changeAvatar": "Changer la photo",
      "username": "Nom d'utilisateur",
      "mlsPublicKey": "Clé publique MLS (X25519) :",
      "notGenerated": "non générée",
      "editAvatar": "Modifier",
      "ownerTitle": "Propriétaire Gossip"
    },
    "system": {
      "title": "Système & Sécurité",
      "notifications": "Notifications",
      "notificationsEnabled": "Activées",
      "privacy": "Confidentialité",
      "privacyMax": "Maximale",
      "networkShield": "Bouclier réseau & Passerelles",
      "pinAutoUnlock": "Déverrouillage sans PIN",
      "backgroundConnection": "Connexion d'arrière-plan permanente 24/7",
      "backgroundConnectionDesc": "Les notifications de messages et d'appels fonctionnent toujours. Activer uniquement pour maintenir le socket en arrière-plan.",
      "chatFolders": "Dossiers de discussion",
      "foldersCount": "Configurer ({{count}})",
      "dlpSafeContour": "Périmètre sécurisé",
      "dlpDesc": "Protection anti-fuite DLP pour les dossiers et dossiers sensibles",
      "botsAndIntegrations": "Bots & Intégrations",
      "botsDesc": "API de bot style Telegram, Webhooks et jetons",
      "tonWallet": "Portefeuille Crypto TON",
      "tonDesc": "TON Connect 2.0, soldes et transferts P2P",
      "theme": "Thème d'apparence",
      "themes": {
        "dark": "Sombre (Obsidian)",
        "light": "Clair (Frosted)",
        "coffee": "Café (Macchiato)"
      },
      "language": "Langue de l'interface",
      "languageDesc": "Choisir la langue de l'application et le formatage",
      "adminConsole": "Console d'administration",
      "logout": "Fermer la session",
      "appVersion": "Gossip v{{version}}"
    },
    "languageModal": {
      "title": "Sélectionner la langue",
      "searchPlaceholder": "Rechercher une langue...",
      "rtlBadge": "RTL",
      "currentLanguage": "Langue actuelle"
    },
    "avatarMenu": {
      "viewPhoto": "Voir la photo",
      "viewPhotoDesc": "Ouvrir en plein écran",
      "editCurrent": "Modifier la photo actuelle",
      "editCurrentDesc": "Recadrer, zoomer et pivoter",
      "chooseNew": "Choisir dans la galerie",
      "chooseNewDesc": "Téléverser une nouvelle image",
      "deletePhoto": "Supprimer la photo",
      "deletePhotoDesc": "Rétablir l'avatar par défaut"
    },
    "premium": {
      "modalTitle": "Gossip Premium",
      "plan1Month": "1 mois",
      "plan3Months": "3 mois",
      "plan1Year": "1 an"
    }
  },
  "de": {
    "title": "Einstellungen",
    "profile": {
      "title": "Profil",
      "changeAvatar": "Foto ändern",
      "username": "Benutzername",
      "mlsPublicKey": "Öffentlicher MLS-Schlüssel (X25519):",
      "notGenerated": "nicht generiert",
      "editAvatar": "Bearbeiten",
      "ownerTitle": "Gossip-Eigentümer"
    },
    "system": {
      "title": "System & Sicherheit",
      "notifications": "Benachrichtigungen",
      "notificationsEnabled": "Aktiviert",
      "privacy": "Privatsphäre",
      "privacyMax": "Maximal",
      "networkShield": "Netzwerkschild & Gateways",
      "pinAutoUnlock": "Ohne PIN entsperren",
      "backgroundConnection": "Dauerhafte 24/7-Hintergrundverbindung",
      "backgroundConnectionDesc": "Anruf- und Nachrichtenbenachrichtigungen funktionieren immer. Nur aktivieren, um den Socket im Hintergrund zu halten.",
      "chatFolders": "Chat-Ordner",
      "foldersCount": "Konfigurieren ({{count}})",
      "dlpSafeContour": "Sicherheitsbereich",
      "dlpDesc": "DLP-Weiterleitungsschutz für Ordner und Vorgänge",
      "botsAndIntegrations": "Bots & Integrationen",
      "botsDesc": "Telegram-ähnliche Bot-API, Webhooks und Token",
      "tonWallet": "TON-Krypto-Wallet",
      "tonDesc": "TON Connect 2.0, Guthaben und P2P-Überweisungen",
      "theme": "Erscheinungsbild",
      "themes": {
        "dark": "Dunkel (Obsidian)",
        "light": "Hell (Frosted)",
        "coffee": "Kaffee (Macchiato)"
      },
      "language": "Oberflächensprache",
      "languageDesc": "Anwendungssprache und Formatierung wählen",
      "adminConsole": "Verwaltungskonsole",
      "logout": "Sitzung abmelden",
      "appVersion": "Gossip v{{version}}"
    },
    "languageModal": {
      "title": "Sprache auswählen",
      "searchPlaceholder": "Sprache suchen...",
      "rtlBadge": "RTL",
      "currentLanguage": "Aktuelle Sprache"
    },
    "avatarMenu": {
      "viewPhoto": "Foto anzeigen",
      "viewPhotoDesc": "Im Vollbildmodus öffnen",
      "editCurrent": "Aktuelles bearbeiten",
      "editCurrentDesc": "Zuschneiden, zoomen und drehen",
      "chooseNew": "Aus Galerie wählen",
      "chooseNewDesc": "Neues Bild hochladen",
      "deletePhoto": "Foto löschen",
      "deletePhotoDesc": "Standard-Avatar wiederherstellen"
    },
    "premium": {
      "modalTitle": "Gossip Premium",
      "plan1Month": "1 Monat",
      "plan3Months": "3 Monate",
      "plan1Year": "1 Jahr"
    }
  }
}

def generate(base_dir):
    for lang, content in data.items():
        lang_dir = os.path.join(base_dir, lang)
        os.makedirs(lang_dir, exist_ok=True)
        with open(os.path.join(lang_dir, "settings.json"), "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
    print("✓ settings.json generated for all 8 languages")

if __name__ == "__main__":
    generate("e:/Boltalka/frontend/src/i18n/locales")
