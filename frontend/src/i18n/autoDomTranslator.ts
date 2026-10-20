/**
 * Universal UI & DOM Localization Engine for Gossip / Boltalka.
 * Ensures 100% localization coverage across all 8 languages (ru, en, es, zh, ar, fa, fr, de)
 * for every modal, drawer, overlay, tooltip, placeholder, aria-label, and toast notification,
 * while remaining completely safe for React 18 Fiber reconciliation (only mutates Text.nodeValue
 * and element attributes, never altering DOM child hierarchy).
 */
import i18n, { type SupportedLanguage } from './config';

type TargetLang = Exclude<SupportedLanguage, 'ru'>;
const TARGET_LANGS: TargetLang[] = ['en', 'es', 'zh', 'ar', 'fa', 'fr', 'de'];

const EXACT_DICTIONARY: Record<string, [string, string, string, string, string, string, string]> = {
  "Закрыть": [
      "Close",
      "Cerrar",
      "关闭",
      "إغلاق",
      "بستن",
      "Fermer",
      "Schließen"
  ],
  "Закрыть окно": [
      "Close Window",
      "Cerrar ventana",
      "关闭窗口",
      "إغلاق النافذة",
      "بستن پنجره",
      "Fermer la fenêtre",
      "Fenster schließen"
  ],
  "Закрыть (Esc)": [
      "Close (Esc)",
      "Cerrar (Esc)",
      "关闭 (Esc)",
      "إغلاق (Esc)",
      "بستن (Esc)",
      "Fermer (Esc)",
      "Schließen (Esc)"
  ],
  "Отмена": [
      "Cancel",
      "Cancelar",
      "取消",
      "إلغاء",
      "لغو",
      "Annuler",
      "Abbrechen"
  ],
  "Отменить": [
      "Cancel",
      "Cancelar",
      "取消",
      "إلغاء",
      "لغو",
      "Annuler",
      "Abbrechen"
  ],
  "Сохранить": [
      "Save",
      "Guardar",
      "保存",
      "حفظ",
      "ذخیره",
      "Enregistrer",
      "Speichern"
  ],
  "Сохранение...": [
      "Saving...",
      "Guardando...",
      "保存中...",
      "جارٍ الحفظ...",
      "در حال ذخیره...",
      "Enregistrement...",
      "Wird gespeichert..."
  ],
  "Применить": [
      "Apply",
      "Aplicar",
      "应用",
      "تطبيق",
      "اعمال",
      "Appliquer",
      "Anwenden"
  ],
  "Удалить": [
      "Delete",
      "Eliminar",
      "删除",
      "حذف",
      "حذف",
      "Supprimer",
      "Löschen"
  ],
  "Изменить": [
      "Edit",
      "Editar",
      "编辑",
      "تعديل",
      "ویرایش",
      "Modifier",
      "Bearbeiten"
  ],
  "Редактировать": [
      "Edit",
      "Editar",
      "编辑",
      "تعديل",
      "ویرایش",
      "Modifier",
      "Bearbeiten"
  ],
  "Копировать": [
      "Copy",
      "Copiar",
      "复制",
      "نسخ",
      "کپی",
      "Copier",
      "Kopieren"
  ],
  "Скопировано": [
      "Copied",
      "Copiado",
      "已复制",
      "تم النسخ",
      "کپی شد",
      "Copié",
      "Kopiert"
  ],
  "Скопировано!": [
      "Copied!",
      "¡Copiado!",
      "已复制！",
      "تم النسخ!",
      "کپی شد!",
      "Copié !",
      "Kopiert!"
  ],
  "Скопировано в буфер обмена!": [
      "Copied to clipboard!",
      "¡Copiado al portapapeles!",
      "已复制到剪贴板！",
      "تم النسخ إلى الحافظة!",
      "در حافظه کپی شد!",
      "Copié dans le presse-papiers !",
      "In die Zwischenablage kopiert!"
  ],
  "Не удалось скопировать": [
      "Failed to copy",
      "Error al copiar",
      "复制失败",
      "فشل النسخ",
      "کپی ناموفق بود",
      "Échec de la copie",
      "Kopieren fehlgeschlagen"
  ],
  "Буфер обмена недоступен": [
      "Clipboard unavailable",
      "Portapapeles no disponible",
      "剪贴板不可用",
      "الحافظة غير متاحة",
      "کلیپ‌بورد در دسترس نیست",
      "Presse-papiers indisponible",
      "Zwischenablage nicht verfügbar"
  ],
  "Отправить": [
      "Send",
      "Enviar",
      "发送",
      "إرسال",
      "ارسال",
      "Envoyer",
      "Senden"
  ],
  "Отправить сейчас": [
      "Send Now",
      "Enviar ahora",
      "立即发送",
      "إرسال الآن",
      "ارسال در همین لحظه",
      "Envoyer maintenant",
      "Jetzt senden"
  ],
  "Отправить повторно": [
      "Resend",
      "Reenviar",
      "重新发送",
      "إعادة الإرسال",
      "ارسال مجدد",
      "Renvoyer",
      "Erneut senden"
  ],
  "Ответить": [
      "Reply",
      "Responder",
      "回复",
      "رد",
      "پاسخ",
      "Répondre",
      "Antworten"
  ],
  "Переслать": [
      "Forward",
      "Reenviar",
      "转发",
      "إعادة توجيه",
      "هدایت پیام",
      "Transférer",
      "Weiterleiten"
  ],
  "Переслать в": [
      "Forward to",
      "Reenviar a",
      "转发至",
      "إعادة توجيه إلى",
      "هدایت به",
      "Transférer vers",
      "Weiterleiten an"
  ],
  "Переслать сообщение": [
      "Forward message",
      "Reenviar mensaje",
      "转发消息",
      "إعادة توجيه الرسالة",
      "هدایت پیام",
      "Transférer le message",
      "Nachricht weiterleiten"
  ],
  "Выбрать для пересылки": [
      "Select to forward",
      "Seleccionar para reenviar",
      "选择转发",
      "تحديد لإعادة التوجيه",
      "انتخاب برای هدایت",
      "Sélectionner pour transférer",
      "Zum Weiterleiten auswählen"
  ],
  "Закрепить": [
      "Pin",
      "Fijar",
      "置顶",
      "تثبيت",
      "سنجاق کردن",
      "Épingler",
      "Anheften"
  ],
  "Открепить": [
      "Unpin",
      "Desfijar",
      "取消置顶",
      "إلغاء التثبيت",
      "برداشتن سنجاق",
      "Désépingler",
      "Lösen"
  ],
  "Открепить сообщение": [
      "Unpin message",
      "Desfijar mensaje",
      "取消置顶消息",
      "إلغاء تثبيت الرسالة",
      "برداشتن سنجاق پیام",
      "Désépingler le message",
      "Nachricht loslösen"
  ],
  "Следующее закрепленное сообщение": [
      "Next pinned message",
      "Siguiente mensaje fijado",
      "下一条置顶消息",
      "الرسالة المثبتة التالية",
      "پیام سنجاق‌شده بعدی",
      "Message épinglé suivant",
      "Nächste angeheftete Nachricht"
  ],
  "Закрепленное сообщение": [
      "Pinned Message",
      "Mensaje fijado",
      "置顶消息",
      "رسالة مثبتة",
      "پیام سنجاق‌شده",
      "Message épinglé",
      "Angeheftete Nachricht"
  ],
  "Обновить": [
      "Update",
      "Actualizar",
      "更新",
      "تحديث",
      "به‌روزرسانی",
      "Mettre à jour",
      "Aktualisieren"
  ],
  "Повторить": [
      "Retry",
      "Reintentar",
      "重试",
      "إعادة المحاولة",
      "تلاش مجدد",
      "Réessayer",
      "Wiederholen"
  ],
  "Повторить попытку": [
      "Try Again",
      "Intentar de nuevo",
      "重试",
      "إعادة المحاولة",
      "تلاش مجدد",
      "Réessayer",
      "Erneut versuchen"
  ],
  "Сброс": [
      "Reset",
      "Restablecer",
      "重置",
      "إعادة ضبط",
      "بازنشانی",
      "Réinitialiser",
      "Zurücksetzen"
  ],
  "Понятно": [
      "Got it",
      "Entendido",
      "明白了",
      "مفهوم",
      "متوجه شدم",
      "Compris",
      "Verstanden"
  ],
  "Ознакомлен": [
      "Acknowledged",
      "Entendido",
      "已知悉",
      "اطلعت",
      "متوجه شدم",
      "Bien reçu",
      "Kenntnis genommen"
  ],
  "Позже": [
      "Later",
      "Más tarde",
      "稍后",
      "لاحقاً",
      "بعداً",
      "Plus tard",
      "Später"
  ],
  "Принять": [
      "Accept",
      "Aceptar",
      "接受",
      "قبول",
      "پذیرش",
      "Accepter",
      "Annehmen"
  ],
  "Отклонить": [
      "Decline",
      "Rechazar",
      "拒绝",
      "رفض",
      "رد کردن",
      "Refuser",
      "Ablehnen"
  ],
  "Разрешить": [
      "Allow",
      "Permitir",
      "允许",
      "سماح",
      "اجازه دادن",
      "Autoriser",
      "Erlauben"
  ],
  "Включить": [
      "Enable",
      "Activar",
      "启用",
      "تفعيل",
      "فعال‌سازی",
      "Activer",
      "Aktivieren"
  ],
  "Подключить": [
      "Connect",
      "Conectar",
      "连接",
      "اتصال",
      "اتصال",
      "Connecter",
      "Verbinden"
  ],
  "Подключен": [
      "Connected",
      "Conectado",
      "已连接",
      "متصل",
      "متصل",
      "Connecté",
      "Verbunden"
  ],
  "Подключение...": [
      "Connecting...",
      "Conectando...",
      "连接中...",
      "جارٍ الاتصال...",
      "در حال اتصال...",
      "Connexion...",
      "Verbinden..."
  ],
  "Инициализация...": [
      "Initializing...",
      "Inicializando...",
      "初始化中...",
      "جارٍ التهيئة...",
      "در حال مقداردهی اولیه...",
      "Initialisation...",
      "Initialisierung..."
  ],
  "Загрузка...": [
      "Loading...",
      "Cargando...",
      "加载中...",
      "جارٍ التحميل...",
      "در حال بارگذاری...",
      "Chargement...",
      "Wird geladen..."
  ],
  "Загрузка…": [
      "Loading…",
      "Cargando…",
      "加载中…",
      "جارٍ التحميل…",
      "در حال بارگذاری…",
      "Chargement…",
      "Wird geladen…"
  ],
  "Проверка...": [
      "Verifying...",
      "Verificando...",
      "验证中...",
      "جارٍ التحقق...",
      "در حال بررسی...",
      "Vérification...",
      "Überprüfung..."
  ],
  "Проверить": [
      "Verify",
      "Verificar",
      "验证",
      "تحقق",
      "بررسی",
      "Vérifier",
      "Prüfen"
  ],
  "Поиск...": [
      "Search...",
      "Buscar...",
      "搜索...",
      "بحث...",
      "جستجو...",
      "Rechercher...",
      "Suchen..."
  ],
  "Поиск в чате…": [
      "Search in chat…",
      "Buscar en el chat…",
      "在聊天中搜索…",
      "البحث داخل الدردشة…",
      "جستجو در چت…",
      "Rechercher dans la discussion…",
      "Im Chat suchen…"
  ],
  "Поиск чата…": [
      "Search chat…",
      "Buscar chat…",
      "搜索聊天…",
      "البحث في الدردشة…",
      "جستجوی چت…",
      "Rechercher une discussion…",
      "Chat suchen…"
  ],
  "Поиск эмодзи...": [
      "Search emoji...",
      "Buscar emoji...",
      "搜索表情符号...",
      "البحث عن إيموجي...",
      "جستجوی ایموجی...",
      "Rechercher un emoji...",
      "Emoji suchen..."
  ],
  "Ничего не найдено": [
      "Nothing found",
      "No se encontró nada",
      "未找到结果",
      "لم يتم العثور على شيء",
      "موردی یافت نشد",
      "Rien trouvé",
      "Nichts gefunden"
  ],
  "Предыдущее совпадение": [
      "Previous match",
      "Coincidencia anterior",
      "上一个匹配项",
      "المطابقة السابقة",
      "مورد قبلی",
      "Occurrence précédente",
      "Vorheriger Treffer"
  ],
  "Следующее совпадение": [
      "Next match",
      "Siguiente coincidencia",
      "下一个匹配项",
      "المطابقة التالية",
      "مورد بعدی",
      "Occurrence suivante",
      "Nächster Treffer"
  ],
  "Закрыть поиск": [
      "Close search",
      "Cerrar búsqueda",
      "关闭搜索",
      "إغلاق البحث",
      "بستن جستجو",
      "Fermer la recherche",
      "Suche schließen"
  ],
  "Подробнее": [
      "Learn more",
      "Más información",
      "了解更多",
      "المزيد",
      "بیشتر بدانید",
      "En savoir plus",
      "Mehr erfahren"
  ],
  "Описание": [
      "Description",
      "Descripción",
      "简介",
      "الوصف",
      "توضیحات",
      "Description",
      "Beschreibung"
  ],
  "Ошибка": [
      "Error",
      "Error",
      "错误",
      "خطأ",
      "خطا",
      "Erreur",
      "Fehler"
  ],
  "Система": [
      "System",
      "Sistema",
      "系统",
      "النظام",
      "سیستم",
      "Système",
      "System"
  ],
  "Диалоговое окно": [
      "Dialog window",
      "Ventana de diálogo",
      "对话框",
      "نافذة حوار",
      "پنجره گفتگو",
      "Fenêtre de dialogue",
      "Dialogfenster"
  ],
  "сейчас": [
      "just now",
      "ahora",
      "刚刚",
      "الآن",
      "هم‌اکنون",
      "à l'instant",
      "gerade eben"
  ],
  "меньше минуты": [
      "less than a minute",
      "menos de un minuto",
      "不到一分钟",
      "أقل من دقيقة",
      "کمتر از یک دقیقه",
      "moins d'une minute",
      "weniger als eine Minute"
  ],
  "истекла": [
      "expired",
      "expirado",
      "已过期",
      "انتهت",
      "منقضی شد",
      "expiré",
      "abgelaufen"
  ],
  "Сегодня": [
      "Today",
      "Hoy",
      "今天",
      "اليوم",
      "امروز",
      "Aujourd'hui",
      "Heute"
  ],
  "Вчера": [
      "Yesterday",
      "Ayer",
      "昨天",
      "أمس",
      "دیروز",
      "Hier",
      "Gestern"
  ],
  "в сети": [
      "online",
      "en línea",
      "在线",
      "متصل",
      "آنلاین",
      "en ligne",
      "online"
  ],
  "В сети": [
      "Connected",
      "En línea",
      "在线",
      "متصل",
      "آنلاین",
      "En ligne",
      "Verbunden"
  ],
  "был(а) недавно": [
      "last seen recently",
      "últ. vez recientemente",
      "近期在线",
      "كان متصلاً مؤخراً",
      "به تازگی آنلاین بوده",
      "vu récemment",
      "kürzlich online"
  ],
  "Активен": [
      "Active",
      "Activo",
      "正常",
      "نشط",
      "فعال",
      "Actif",
      "Aktiv"
  ],
  "🟢 Активен": [
      "🟢 Active",
      "🟢 Activo",
      "🟢 活跃",
      "🟢 نشط",
      "🟢 فعال",
      "🟢 Actif",
      "🟢 Aktiv"
  ],
  "⚪ Отключен": [
      "⚪ Disabled",
      "⚪ Desactivado",
      "⚪ 已禁用",
      "⚪ معطل",
      "⚪ غیرفعال",
      "⚪ Désactivé",
      "⚪ Deaktiviert"
  ],
  "Отключен": [
      "Disabled",
      "Desactivado",
      "已禁用",
      "معطل",
      "غیرفعال",
      "Désactivé",
      "Deaktiviert"
  ],
  "Выключен": [
      "Off",
      "Desactivado",
      "已关闭",
      "موقف",
      "خاموش",
      "Désactivé",
      "Aus"
  ],
  "Выкл": [
      "Off",
      "Apagado",
      "关",
      "إيقاف",
      "خاموش",
      "Off",
      "Aus"
  ],
  "Вы": [
      "You",
      "Tú",
      "你",
      "أنت",
      "شما",
      "Vous",
      "Sie"
  ],
  "(Вы)": [
      "(You)",
      "(Tú)",
      "(你)",
      "(أنت)",
      "(شما)",
      "(Vous)",
      "(Sie)"
  ],
  "вы": [
      "you",
      "tú",
      "你",
      "أنت",
      "شما",
      "vous",
      "Sie"
  ],
  "(вы)": [
      "(you)",
      "(tú)",
      "(你)",
      "(أنت)",
      "(شما)",
      "(vous)",
      "(Sie)"
  ],
  "Я": [
      "Me",
      "Yo",
      "我",
      "أنا",
      "من",
      "Moi",
      "Ich"
  ],
  "Пользователь": [
      "User",
      "Usuario",
      "用户",
      "مستخدم",
      "کاربر",
      "Utilisateur",
      "Benutzer"
  ],
  "Собеседник": [
      "Contact",
      "Contacto",
      "联系人",
      "جهة الاتصال",
      "مخاطب",
      "Interlocuteur",
      "Gesprächspartner"
  ],
  "Собеседник (Mesh)": [
      "Peer (Mesh)",
      "Par (Mesh)",
      "节点 (Mesh)",
      "قرين (Mesh)",
      "همتا (Mesh)",
      "Pair (Mesh)",
      "Peer (Mesh)"
  ],
  "Участник": [
      "Participant",
      "Participante",
      "参与者",
      "مشارك",
      "شرکت‌کننده",
      "Participant",
      "Teilnehmer"
  ],
  "участник": [
      "member",
      "miembro",
      "成员",
      "عضو",
      "عضو",
      "membre",
      "Mitglied"
  ],
  "участника": [
      "members",
      "miembros",
      "成员",
      "أعضاء",
      "عضو",
      "membres",
      "Mitglieder"
  ],
  "участников": [
      "members",
      "miembros",
      "成员",
      "أعضاء",
      "عضو",
      "membres",
      "Mitglieder"
  ],
  "Создатель": [
      "Creator",
      "Creador",
      "创建者",
      "المنشئ",
      "سازنده",
      "Créateur",
      "Ersteller"
  ],
  "Администратор": [
      "Admin",
      "Administrador",
      "管理员",
      "مشرف",
      "مدیر",
      "Administrateur",
      "Administrator"
  ],
  "Редактор": [
      "Editor",
      "Editor",
      "编辑",
      "محرر",
      "ویرایشگر",
      "Éditeur",
      "Redakteur"
  ],
  "Подписчик": [
      "Subscriber",
      "Suscriptor",
      "订阅者",
      "مشترك",
      "مشترک",
      "Abonné",
      "Abonnent"
  ],
  "Гость (Burner)": [
      "Guest (Burner)",
      "Invitado (Burner)",
      "访客 (阅后即焚)",
      "ضيف (غرفة مؤقتة)",
      "مهمان (اتاق موقت)",
      "Invité (Burner)",
      "Gast (Burner)"
  ],
  "января": [
      "January",
      "enero",
      "1月",
      "يناير",
      "ژانویه",
      "janvier",
      "Januar"
  ],
  "февраля": [
      "February",
      "febrero",
      "2月",
      "فبراير",
      "فوریه",
      "février",
      "Februar"
  ],
  "марта": [
      "March",
      "marzo",
      "3月",
      "مارس",
      "مارس",
      "mars",
      "März"
  ],
  "апреля": [
      "April",
      "abril",
      "4月",
      "أبريل",
      "آوریل",
      "avril",
      "April"
  ],
  "мая": [
      "May",
      "mayo",
      "5月",
      "مايو",
      "مه",
      "mai",
      "Mai"
  ],
  "июня": [
      "June",
      "junio",
      "6月",
      "يونيو",
      "ژوئن",
      "juin",
      "Juni"
  ],
  "июля": [
      "July",
      "julio",
      "7月",
      "يوليو",
      "ژوئیه",
      "juillet",
      "Juli"
  ],
  "августа": [
      "August",
      "agosto",
      "8月",
      "أغسطس",
      "اوت",
      "août",
      "August"
  ],
  "сентября": [
      "September",
      "septiembre",
      "9月",
      "سبتمبر",
      "سپتامبر",
      "septembre",
      "September"
  ],
  "октября": [
      "October",
      "octubre",
      "10月",
      "أكتوبر",
      "اکتبر",
      "octobre",
      "Oktober"
  ],
  "ноября": [
      "November",
      "noviembre",
      "11月",
      "نوفمبر",
      "نوامبر",
      "novembre",
      "November"
  ],
  "декабря": [
      "December",
      "diciembre",
      "12月",
      "ديسمبر",
      "دسامبر",
      "décembre",
      "Dezember"
  ],
  "Вс": [
      "Sun",
      "Dom",
      "周日",
      "الأحد",
      "یکشنبه",
      "Dim",
      "So"
  ],
  "Пн": [
      "Mon",
      "Lun",
      "周一",
      "الإثنين",
      "دوشنبه",
      "Lun",
      "Mo"
  ],
  "Вт": [
      "Tue",
      "Mar",
      "周二",
      "الثلاثاء",
      "سه‌شنبه",
      "Mar",
      "Di"
  ],
  "Ср": [
      "Wed",
      "Mié",
      "周三",
      "الأربعاء",
      "چهارشنبه",
      "Mer",
      "Mi"
  ],
  "Чт": [
      "Thu",
      "Jue",
      "周四",
      "الخميس",
      "پنجشنبه",
      "Jeu",
      "Do"
  ],
  "Пт": [
      "Fri",
      "Vie",
      "周五",
      "الجمعة",
      "جمعه",
      "Ven",
      "Fr"
  ],
  "Сб": [
      "Sat",
      "Sáb",
      "周六",
      "السبت",
      "شنبه",
      "Sam",
      "Sa"
  ],
  "янв": [
      "Jan",
      "ene",
      "1月",
      "يناير",
      "ژان",
      "janv.",
      "Jan"
  ],
  "фев": [
      "Feb",
      "feb",
      "2月",
      "فبراير",
      "فور",
      "févr.",
      "Feb"
  ],
  "мар": [
      "Mar",
      "mar",
      "3月",
      "مارس",
      "مارس",
      "mars",
      "Mär"
  ],
  "апр": [
      "Apr",
      "abr",
      "4月",
      "أبريل",
      "آور",
      "avr.",
      "Apr"
  ],
  "июн": [
      "Jun",
      "jun",
      "6月",
      "يونيو",
      "ژوئن",
      "juin",
      "Jun"
  ],
  "июл": [
      "Jul",
      "jul",
      "7月",
      "يوليو",
      "ژوئیه",
      "juil.",
      "Jul"
  ],
  "авг": [
      "Aug",
      "ago",
      "8月",
      "أغسطس",
      "اوت",
      "août",
      "Aug"
  ],
  "сен": [
      "Sep",
      "sep",
      "9月",
      "سبتمبر",
      "سپت",
      "sept.",
      "Sep"
  ],
  "окт": [
      "Oct",
      "oct",
      "10月",
      "أكتوبر",
      "اکت",
      "oct.",
      "Okt"
  ],
  "ноя": [
      "Nov",
      "nov",
      "11月",
      "نوفمبر",
      "نوا",
      "nov.",
      "Nov"
  ],
  "дек": [
      "Dec",
      "dic",
      "12月",
      "ديسمبر",
      "دسا",
      "déc.",
      "Dez"
  ],
  "30 секунд": [
      "30 seconds",
      "30 segundos",
      "30 秒",
      "30 ثانية",
      "۳۰ ثانیه",
      "30 secondes",
      "30 Sekunden"
  ],
  "5 минут": [
      "5 minutes",
      "5 minutos",
      "5 分钟",
      "5 دقائق",
      "۵ دقیقه",
      "5 minutes",
      "5 Minuten"
  ],
  "15 минут": [
      "15 minutes",
      "15 minutos",
      "15 分钟",
      "15 دقيقة",
      "15 دقیقه",
      "15 minutes",
      "15 Minuten"
  ],
  "1 час": [
      "1 hour",
      "1 hora",
      "1 小时",
      "ساعة واحدة",
      "1 ساعت",
      "1 heure",
      "1 Stunde"
  ],
  "6 часов": [
      "6 hours",
      "6 horas",
      "6 小时",
      "6 ساعات",
      "6 ساعت",
      "6 heures",
      "6 Stunden"
  ],
  "24 часа": [
      "24 hours",
      "24 horas",
      "24 小时",
      "24 ساعة",
      "24 ساعت",
      "24 heures",
      "24 Stunden"
  ],
  "1 день": [
      "1 day",
      "1 día",
      "1 天",
      "يوم واحد",
      "۱ روز",
      "1 jour",
      "1 Tag"
  ],
  "1 день (24 ч)": [
      "1 day (24h)",
      "1 día (24 h)",
      "1 天（24 小时）",
      "يوم واحد (24 ساعة)",
      "۱ روز (۲۴ ساعت)",
      "1 jour (24 h)",
      "1 Tag (24 Std.)"
  ],
  "3 дня (72 ч)": [
      "3 days (72h)",
      "3 días (72 h)",
      "3 天（72 小时）",
      "3 أيام (72 ساعة)",
      "۳ روز (۷۲ ساعت)",
      "3 jours (72 h)",
      "3 Tage (72 Std.)"
  ],
  "7 дней": [
      "7 days",
      "7 días",
      "7 天",
      "7 أيام",
      "7 روز",
      "7 jours",
      "7 Tage"
  ],
  "14 дней": [
      "14 days",
      "14 días",
      "14 天",
      "14 يوماً",
      "14 روز",
      "14 jours",
      "14 Tage"
  ],
  "30 дней": [
      "30 days",
      "30 días",
      "30 天",
      "30 يوماً",
      "30 روز",
      "30 jours",
      "30 Tage"
  ],
  "90 дней": [
      "90 days",
      "90 días",
      "90 天",
      "90 يوماً",
      "90 روز",
      "90 jours",
      "90 Tage"
  ],
  "180 дней": [
      "180 days",
      "180 días",
      "180 天",
      "180 يوماً",
      "180 روز",
      "180 jours",
      "180 Tage"
  ],
  "1 месяц": [
      "1 month",
      "1 mes",
      "1 个月",
      "شهر واحد",
      "1 ماه",
      "1 mois",
      "1 Monat"
  ],
  "3 месяца": [
      "3 months",
      "3 meses",
      "3 个月",
      "3 أشهر",
      "3 ماه",
      "3 mois",
      "3 Monate"
  ],
  "1 год": [
      "1 year",
      "1 año",
      "1 年",
      "سنة واحدة",
      "1 سال",
      "1 an",
      "1 Jahr"
  ],
  "/ мес": [
      "/ mo",
      "/ mes",
      "/ 月",
      "/ شهر",
      "/ ماه",
      "/ mois",
      "/ Mon."
  ],
  "Бессрочно": [
      "No expiration",
      "Sin límite de tiempo",
      "永久有效",
      "بدون تاريخ انتهاء",
      "بدون محدودیت زمانی",
      "Sans limite",
      "Unbegrenzt"
  ],
  "Через 15 минут": [
      "In 15 minutes",
      "En 15 minutos",
      "15 分钟后",
      "بعد 15 دقيقة",
      "15 دقیقه دیگر",
      "Dans 15 minutes",
      "In 15 Minuten"
  ],
  "Через 1 час": [
      "In 1 hour",
      "En 1 hora",
      "1 小时后",
      "بعد ساعة",
      "1 ساعت دیگر",
      "Dans 1 heure",
      "In 1 Stunde"
  ],
  "Через 3 часа": [
      "In 3 hours",
      "En 3 horas",
      "3 小时后",
      "بعد 3 ساعات",
      "3 ساعت دیگر",
      "Dans 3 heures",
      "In 3 Stunden"
  ],
  "Завтра в 9:00": [
      "Tomorrow at 9:00",
      "Mañana a las 9:00",
      "明天 9:00",
      "غداً الساعة 9:00",
      "فردا ساعت 9:00",
      "Demain à 9h00",
      "Morgen um 9:00"
  ],
  "дн.": [
      "d",
      "días",
      "天",
      "يوم",
      "روز",
      "j.",
      "T."
  ],
  "дней": [
      "days",
      "días",
      "天",
      "أيام",
      "روز",
      "jours",
      "Tage"
  ],
  "сек": [
      "s",
      "s",
      "秒",
      "ث",
      "ثانیه",
      "s",
      "Sek."
  ],
  "сек.": [
      "sec",
      "seg.",
      "秒",
      "ثانية",
      "ثانیه",
      "sec.",
      "Sek."
  ],
  "мс": [
      "ms",
      "ms",
      "毫秒",
      "مللي ثانية",
      "میلی‌ثانیه",
      "ms",
      "ms"
  ],
  "МБ": [
      "MB",
      "MB",
      "MB",
      "ميجابايت",
      "مگابایت",
      "Mo",
      "MB"
  ],
  "уч.": [
      "mem.",
      "miem.",
      "人",
      "عضو",
      "عضو",
      "mem.",
      "Mitgl."
  ],
  "из": [
      "of",
      "de",
      "/",
      "من",
      "از",
      "sur",
      "von"
  ],
  "и": [
      "and",
      "y",
      "和",
      "و",
      "و",
      "et",
      "und"
  ],
  "Чат": [
      "Chat",
      "Chat",
      "聊天",
      "محادثة",
      "گفتگو",
      "Chat",
      "Chat"
  ],
  "Диалог": [
      "Direct Chat",
      "Chat directo",
      "私聊",
      "محادثة خاصة",
      "گفتگوی خصوصی",
      "Dialogue",
      "Direktchat"
  ],
  "Группа": [
      "Group",
      "Grupo",
      "群组",
      "مجموعة",
      "گروه",
      "Groupe",
      "Gruppe"
  ],
  "Канал": [
      "Channel",
      "Canal",
      "频道",
      "قناة",
      "کانال",
      "Canal",
      "Kanal"
  ],
  "Публичный канал": [
      "Public Channel",
      "Canal público",
      "公开频道",
      "قناة عامة",
      "کانال عمومی",
      "Canal public",
      "Öffentlicher Kanal"
  ],
  "Групповой чат": [
      "Group Chat",
      "Chat grupal",
      "群聊",
      "محادثة جماعية",
      "گفتگوی گروهی",
      "Chat de groupe",
      "Gruppenchat"
  ],
  "Групповой чат (MLS E2EE)": [
      "Group Chat (MLS E2EE)",
      "Chat grupal (MLS E2EE)",
      "群聊 (MLS E2EE)",
      "دردشة جماعية (MLS E2EE)",
      "گروه (MLS E2EE)",
      "Groupe (MLS E2EE)",
      "Gruppenchat (MLS E2EE)"
  ],
  "Mesh Группа": [
      "Mesh Group",
      "Grupo Mesh",
      "Mesh 群组",
      "مجموعة Mesh",
      "گروه Mesh",
      "Groupe Mesh",
      "Mesh-Gruppe"
  ],
  "Оффлайн-диалог BLE Mesh": [
      "BLE Mesh Offline Chat",
      "Chat offline BLE Mesh",
      "BLE Mesh 离线对话",
      "محادثة BLE Mesh أوفلاين",
      "گفتگوی آفلاین BLE Mesh",
      "Dialogue hors ligne BLE Mesh",
      "BLE-Mesh-Offline-Chat"
  ],
  "Общий": [
      "General",
      "General",
      "综合",
      "عام",
      "عمومی",
      "Général",
      "Allgemein"
  ],
  "Главный топик группы": [
      "Main group topic",
      "Tema principal del grupo",
      "群组主话题",
      "الموضوع الرئيسي للمجموعة",
      "تاپیک اصلی گروه",
      "Sujet principal du groupe",
      "Hauptthema der Gruppe"
  ],
  "чат": [
      "chat",
      "chat",
      "个聊天",
      "محادثة",
      "گفتگو",
      "chat",
      "Chat"
  ],
  "чатов": [
      "chats",
      "chats",
      "个聊天",
      "محادثات",
      "گفتگو",
      "chats",
      "Chats"
  ],
  "Чатов:": [
      "Chats:",
      "Chats:",
      "聊天数:",
      "المحادثات:",
      "گفتگوها:",
      "Chats :",
      "Chats:"
  ],
  "Новое сообщение": [
      "New message",
      "Nuevo mensaje",
      "新消息",
      "رسالة جديدة",
      "پیام جدید",
      "Nouveau message",
      "Neue Nachricht"
  ],
  "Новое сообщение (Mesh)": [
      "New message (Mesh)",
      "Nuevo mensaje (Mesh)",
      "新消息 (Mesh)",
      "رسالة جديدة (Mesh)",
      "پیام جدید (Mesh)",
      "Nouveau message (Mesh)",
      "Neue Nachricht (Mesh)"
  ],
  "Новые сообщения": [
      "New messages",
      "Nuevos mensajes",
      "新消息",
      "رسائل جديدة",
      "پیام‌های جدید",
      "Nouveaux messages",
      "Neue Nachrichten"
  ],
  "Вам пришло новое сообщение": [
      "You have a new message",
      "Tienes un nuevo mensaje",
      "您收到一条新消息",
      "لديك رسالة جديدة",
      "شما یک پیام جدید دارید",
      "Vous avez reçu un nouveau message",
      "Sie haben eine neue Nachricht"
  ],
  "Сообщения Gossip": [
      "Gossip Messages",
      "Mensajes de Gossip",
      "Gossip 消息",
      "رسائل Gossip",
      "پیام‌های Gossip",
      "Messages Gossip",
      "Gossip-Nachrichten"
  ],
  "Уведомления о входящих личных и групповых сообщениях": [
      "Notifications for incoming direct and group messages",
      "Notificaciones de mensajes directos y grupales",
      "私聊和群聊新消息通知",
      "إشعارات الرسائل الفردية والجماعية الواردة",
      "اعلان‌های پیام‌های شخصی و گروهی دریافتی",
      "Notifications de messages privés et de groupe",
      "Benachrichtigungen für private und Gruppennachrichten"
  ],
  "Сообщение": [
      "Message",
      "Mensaje",
      "消息",
      "رسالة",
      "پیام",
      "Message",
      "Nachricht"
  ],
  "Нет сообщений": [
      "No messages",
      "No hay mensajes",
      "暂无消息",
      "لا توجد رسائل",
      "پیامی وجود ندارد",
      "Aucun message",
      "Keine Nachrichten"
  ],
  "Начните общение, отправив первое сообщение": [
      "Start the conversation by sending the first message",
      "Inicie la conversación enviando el primer mensaje",
      "发送第一条消息开始聊天吧",
      "ابدأ المحادثة بإرسال الرسالة الأولى",
      "با ارسال اولین پیام گفتگو را آغاز کنید",
      "Commencez la discussion en envoyant le premier message",
      "Starten Sie die Unterhaltung mit der ersten Nachricht"
  ],
  "Загрузить историю": [
      "Load History",
      "Cargar historial",
      "加载历史消息",
      "تحميل السجل",
      "بارگذاری تاریخچه",
      "Charger l'historique",
      "Verlauf laden"
  ],
  "Прокрутить в самый низ": [
      "Scroll to bottom",
      "Desplazarse al final",
      "滚动到底部",
      "التمرير إلى الأسفل",
      "اسکرول به پایین",
      "Faire défiler tout en bas",
      "Nach ganz unten scrollen"
  ],
  "Чат создан": [
      "Chat created",
      "Chat creado",
      "聊天已创建",
      "تم إنشاء المحادثة",
      "گفتگو ایجاد شد",
      "Chat créé",
      "Chat erstellt"
  ],
  "Диалог начат": [
      "Conversation started",
      "Conversación iniciada",
      "对话已开始",
      "بدأت المحادثة",
      "گفتگو آغاز شد",
      "Discussion démarrée",
      "Unterhaltung begonnen"
  ],
  "Канал создан": [
      "Channel created",
      "Canal creado",
      "频道已创建",
      "تم إنشاء القناة",
      "کانال ایجاد شد",
      "Canal créé",
      "Kanal erstellt"
  ],
  "Черновик:": [
      "Draft:",
      "Borrador:",
      "草稿:",
      "مسودة:",
      "پیش‌نویس:",
      "Brouillon :",
      "Entwurf:"
  ],
  "Цитируемое сообщение": [
      "Quoted message",
      "Mensaje citado",
      "引用消息",
      "رسالة مقتبسة",
      "پیام نقل‌قول‌شده",
      "Message cité",
      "Zitierte Nachricht"
  ],
  "↪ Переслано от": [
      "↪ Forwarded from",
      "↪ Reenviado de",
      "↪ 转发自",
      "↪ محولة من",
      "↪ هدایت‌شده از",
      "↪ Transféré de",
      "↪ Weitergeleitet von"
  ],
  "Спойлер — нажмите, чтобы раскрыть": [
      "Spoiler — tap to reveal",
      "Spoiler — toque para revelar",
      "剧透内容 — 点击展开",
      "محتوى مخفي — اضغط للكشف",
      "اسپویلر — برای نمایش ضربه بزنید",
      "Spoiler — appuyez pour révéler",
      "Spoiler — zum Anzeigen tippen"
  ],
  "Удалить сообщение?": [
      "Delete message?",
      "¿Eliminar mensaje?",
      "删除消息？",
      "حذف الرسالة؟",
      "حذف پیام؟",
      "Supprimer le message ?",
      "Nachricht löschen?"
  ],
  "Только у себя": [
      "Delete for me",
      "Solo para mí",
      "仅為我删除",
      "لدي فقط",
      "فقط برای من",
      "Pour moi uniquement",
      "Nur für mich"
  ],
  "У всех участников": [
      "Delete for everyone",
      "Para todos",
      "为所有人删除",
      "لدى الجميع",
      "برای همه اعضا",
      "Pour tout le monde",
      "Für alle Teilnehmer"
  ],
  "Удаление чата": [
      "Delete Chat",
      "Eliminar chat",
      "删除聊天",
      "حذف المحادثة",
      "حذف گفتگو",
      "Suppression du chat",
      "Chat löschen"
  ],
  "Вы действительно хотите удалить чат с пользователем": [
      "Are you sure you want to delete the chat with",
      "¿Seguro que deseas eliminar el chat con",
      "您确定要删除与该用户的聊天吗：",
      "هل تريد بالتأكيد حذف المحادثة مع",
      "آیا واقعاً می‌خواهید گفتگو با کاربر",
      "Voulez-vous vraiment supprimer le chat avec",
      "Möchten Sie den Chat mit"
  ],
  "и всю историю переписки?": [
      "and all message history?",
      "y todo el historial de mensajes?",
      "以及所有聊天记录？",
      "وكل سجل المراسلات؟",
      "و تمام تاریخچه پیام‌ها را حذف کنید؟",
      "et tout l'historique des messages ?",
      "und den gesamten Nachrichtenverlauf wirklich löschen?"
  ],
  "⚠️ Это действие безвозвратно удалит все сообщения с вашего устройства.": [
      "⚠️ This action will permanently delete all messages from your device.",
      "⚠️ Esta acción eliminará permanentemente todos los mensajes de tu dispositivo.",
      "⚠️ 此操作将从您的设备永久删除所有消息。",
      "⚠️ سيؤدي هذا الإجراء إلى حذف جميع الرسائل نهائياً من جهازك.",
      "⚠️ این عمل تمام پیام‌ها را برای همیشه از دستگاه شما پاک می‌کند.",
      "⚠️ Cette action supprimera définitivement tous les messages de votre appareil.",
      "⚠️ Diese Aktion löscht unwiderruflich alle Nachrichten von Ihrem Gerät."
  ],
  "Чат и история сообщений успешно удалены": [
      "Chat and message history deleted",
      "Chat e historial eliminados",
      "聊天及历史记录已成功删除",
      "تم حذف المحادثة والسجل بنجاح",
      "گفتگو و تاریخچه پیام‌ها با موفقیت حذف شد",
      "Chat et historique supprimés",
      "Chat und Nachrichtenverlauf gelöscht"
  ],
  "Ошибка при локальном удалении чата": [
      "Error deleting local chat",
      "Error al eliminar el chat localmente",
      "本地删除聊天时出错",
      "خطأ أثناء الحذف المحلي للمحادثة",
      "خطا در حذف محلی گفتگو",
      "Erreur lors de la suppression locale du chat",
      "Fehler beim lokalen Löschen des Chats"
  ],
  "Сообщение закреплено": [
      "Message pinned",
      "Mensaje fijado",
      "消息已置顶",
      "تم تثبيت الرسالة",
      "پیام سنجاق شد",
      "Message épinglé",
      "Nachricht angeheftet"
  ],
  "Сообщение закреплено (PRO)": [
      "Message pinned (PRO)",
      "Mensaje fijado (PRO)",
      "消息已置顶 (PRO)",
      "تم تثبيت الرسالة (PRO)",
      "پیام سنجاق شد (PRO)",
      "Message épinglé (PRO)",
      "Nachricht angeheftet (PRO)"
  ],
  "Сообщение откреплено": [
      "Message unpinned",
      "Mensaje desfijado",
      "已取消置顶消息",
      "تم إلغاء تثبيت الرسالة",
      "سنجاق پیام برداشته شد",
      "Message désépinglé",
      "Nachricht gelöst"
  ],
  "Повторная отправка запущена": [
      "Resending message...",
      "Reenvío iniciado",
      "已开始重新发送",
      "بدأت إعادة الإرسال",
      "ارسال مجدد آغاز شد",
      "Renvoi lancé",
      "Erneutes Senden gestartet"
  ],
  "Сообщение поставлено в очередь на отправку": [
      "Message queued for delivery",
      "Mensaje en cola de envío",
      "消息已加入发送队列",
      "تم وضع الرسالة في طابور الإرسال",
      "پیام در صف ارسال قرار گرفت",
      "Message mis en file d'attente",
      "Nachricht in die Warteschlange gestellt"
  ],
  "Не удалось повторить отправку": [
      "Failed to resend message",
      "No se pudo reenviar",
      "重新发送失败",
      "فشلت إعادة الإرسال",
      "ارسال مجدد ناموفق بود",
      "Échec du renvoi",
      "Erneutes Senden fehlgeschlagen"
  ],
  "Не удалось отправить — повторим при подключении": [
      "Could not send — will retry when online",
      "No se pudo enviar — se reintentará al conectar",
      "发送失败 — 将在连接恢复后重试",
      "تعذر الإرسال — ستتم المحاولة عند الاتصال",
      "ارسال نشد — پس از اتصال مجدد تلاش می‌شود",
      "Envoi différé — nouvel essai dès la reconnexion",
      "Senden fehlgeschlagen — wird bei Verbindung wiederholt"
  ],
  "Не отправлено": [
      "Not sent",
      "No enviado",
      "未发送",
      "لم يتم الإرسال",
      "ارسال نشد",
      "Non envoyé",
      "Nicht gesendet"
  ],
  "Повторим автоматически": [
      "Will retry automatically",
      "Se reintentará automáticamente",
      "将自动重试",
      "ستتم إعادة المحاولة تلقائياً",
      "به‌طور خودکار تلاش مجدد می‌شود",
      "Nouvelle tentative automatique",
      "Automatischer Wiederholungsversuch"
  ],
  "Текст скопирован в буфер обмена": [
      "Text copied to clipboard",
      "Texto copiado al portapapeles",
      "文本已复制到剪贴板",
      "تم نسخ النص إلى الحافظة",
      "متن در حافظه کپی شد",
      "Texte copié dans le presse-papiers",
      "Text in die Zwischenablage kopiert"
  ],
  "Звук уведомлений включен": [
      "Notification sound enabled",
      "Sonido de notificaciones activado",
      "通知声音已开启",
      "تم تفعيل صوت الإشعارات",
      "صدای اعلان‌ها فعال شد",
      "Son des notifications activé",
      "Benachrichtigungston aktiviert"
  ],
  "Чат переведен в беззвучный режим": [
      "Chat muted",
      "Chat silenciado",
      "聊天已静音",
      "تم كتم المحادثة",
      "گفتگو بی‌صدا شد",
      "Chat mis en sourdine",
      "Chat stummgeschaltet"
  ],
  "🔔 Включить звук": [
      "🔔 Unmute",
      "🔔 Activar sonido",
      "🔔 开启声音",
      "🔔 تفعيل الصوت",
      "🔔 وصل صدا",
      "🔔 Réactiver le son",
      "🔔 Ton einschalten"
  ],
  "🔕 Без звука": [
      "🔕 Mute",
      "🔕 Silenciar",
      "🔕 静音",
      "🔕 كتم الصوت",
      "🔕 بی‌صدا",
      "🔕 Muet",
      "🔕 Stumm"
  ],
  "Включить звук": [
      "Unmute",
      "Activar sonido",
      "开启声音",
      "تشغيل الصوت",
      "وصل صدا",
      "Activer le son",
      "Ton einschalten"
  ],
  "Выключить звук": [
      "Mute",
      "Silenciar",
      "静音",
      "كتم الصوت",
      "قطع صدا",
      "Couper le son",
      "Ton ausschalten"
  ],
  "Без звука": [
      "Muted",
      "Silenciado",
      "静音",
      "مكتوم",
      "بی‌صدا",
      "Muet",
      "Stumm"
  ],
  "Вкл. звук": [
      "Unmute",
      "Activar sonido",
      "开启声音",
      "تشغيل الصوت",
      "وصل صدا",
      "Activer le son",
      "Ton ein"
  ],
  "Опции чата": [
      "Chat options",
      "Opciones del chat",
      "聊天选项",
      "خيارات المحادثة",
      "گزینه‌های گفتگو",
      "Options du chat",
      "Chat-Optionen"
  ],
  "Таймер сообщений": [
      "Disappearing messages timer",
      "Temporizador de mensajes",
      "消息自毁计时器",
      "مؤقت الرسائل",
      "تایمر حذف خودکار پیام‌ها",
      "Minuteur des messages",
      "Nachrichten-Timer"
  ],
  "Выбрано:": [
      "Selected:",
      "Seleccionados:",
      "已选:",
      "المحدد:",
      "انتخاب‌شده:",
      "Sélectionné :",
      "Ausgewählt:"
  ],
  "выбрано)": [
      "selected)",
      "seleccionados)",
      "已选)",
      "محدد)",
      "انتخاب‌شده)",
      "sélectionnés)",
      "ausgewählt)"
  ],
  "Выберите чаты (": [
      "Select chats (",
      "Seleccionar chats (",
      "选择聊天 (",
      "اختر المحادثات (",
      "انتخاب گفتگوها (",
      "Sélectionner les chats (",
      "Chats auswählen ("
  ],
  "Нет доступных чатов": [
      "No chats available",
      "No hay chats disponibles",
      "暂无可用聊天",
      "لا توجد محادثات متاحة",
      "گفتگویی موجود نیست",
      "Aucun chat disponible",
      "Keine Chats verfügbar"
  ],
  "До 100 сообщений и 20 чатов. Медиа переиспользуются без повторной загрузки; пересылка снимает TTL.": [
      "Up to 100 messages and 20 chats. Media is reused without re-uploading; forwarding clears TTL.",
      "Hasta 100 mensajes y 20 chats. Los medios se reutilizan sin volver a subir; reenviar elimina el TTL.",
      "最多支持 100 条消息和 20 个聊天。媒体免重新上传复用；转发将移除自毁计时。",
      "حتى 100 رسالة و20 محادثة. تُعاد استخدام الوسائط دون إعادة رفع؛ إعادة التوجيه تلغي المؤقت.",
      "تا ۱۰۰ پیام و ۲۰ گفتگو. رسانه‌ها بدون آپلود مجدد استفاده می‌شوند؛ هدایت پیام تایمر را برمی‌دارد.",
      "Jusqu'à 100 messages et 20 chats. Les médias sont réutilisés sans ré-envoi ; le transfert supprime le TTL.",
      "Bis zu 100 Nachrichten und 20 Chats. Medien werden ohne erneuten Upload wiederverwendet; Weiterleiten entfernt TTL."
  ],
  "🎤 Голосовое сообщение": [
      "🎤 Voice message",
      "🎤 Mensaje de voz",
      "🎤 语音消息",
      "🎤 رسالة صوتية",
      "🎤 پیام صوتی",
      "🎤 Message vocal",
      "🎤 Sprachnachricht"
  ],
  "Голосовое сообщение": [
      "Voice Message",
      "Mensaje de voz",
      "语音消息",
      "رسالة صوتية",
      "پیام صوتی",
      "Message vocal",
      "Sprachnachricht"
  ],
  "📹 Видеосообщение": [
      "📹 Video Message",
      "📹 Mensaje de video",
      "📹 视频消息",
      "📹 رسالة فيديو",
      "📹 پیام ویدیویی",
      "📹 Message vidéo",
      "📹 Videonachricht"
  ],
  "⭕ Видео-сообщение": [
      "⭕ Video Message",
      "⭕ Mensaje de video",
      "⭕ 视频消息",
      "⭕ رسالة فيديو",
      "⭕ پیام ویدیویی",
      "⭕ Message vidéo",
      "⭕ Videonachricht"
  ],
  "🎬 Видео-кружок": [
      "🎬 Video note",
      "🎬 Nota de video",
      "🎬 圆视频",
      "🎬 ملاحظة فيديو",
      "🎬 ویدیو پیام",
      "🎬 Note vidéo",
      "🎬 Videonotiz"
  ],
  "📷 Фотография": [
      "📷 Photo",
      "📷 Foto",
      "📷 照片",
      "📷 صورة",
      "📷 عکس",
      "📷 Photo",
      "📷 Foto"
  ],
  "Фотография": [
      "Photo",
      "Foto",
      "照片",
      "صورة",
      "عکس",
      "Photo",
      "Foto"
  ],
  "🎥 Видеозапись": [
      "🎥 Video Recording",
      "🎥 Grabación de video",
      "🎥 视频录像",
      "🎥 تسجيل فيديو",
      "🎥 ویدیو",
      "🎥 Enregistrement vidéo",
      "🎥 Videoaufnahme"
  ],
  "🎥 Видео": [
      "🎥 Video",
      "🎥 Video",
      "🎥 视频",
      "🎥 فيديو",
      "🎥 ویدیو",
      "🎥 Vidéo",
      "🎥 Video"
  ],
  "🎨 Стикер": [
      "🎨 Sticker",
      "🎨 Sticker",
      "🎨 贴纸",
      "🎨 ملصق",
      "🎨 استیکر",
      "🎨 Autocollant",
      "🎨 Sticker"
  ],
  "Анимированные стикеры": [
      "Animated stickers",
      "Stickers animados",
      "动态贴纸",
      "ملصقات متحركة",
      "استیکرهای متحرک",
      "Autocollants animés",
      "Animierte Sticker"
  ],
  "Загрузка стикера...": [
      "Loading sticker...",
      "Cargando sticker...",
      "正在加载贴纸...",
      "جارٍ تحميل الملصق...",
      "در حال بارگذاری استیکر...",
      "Chargement de l'autocollant...",
      "Sticker wird geladen..."
  ],
  "🎨 Золотая звезда": [
      "🎨 Gold Star",
      "🎨 Estrella dorada",
      "🎨 金星",
      "🎨 نجمة ذهبية",
      "🎨 ستاره طلایی",
      "🎨 Étoile d'or",
      "🎨 Goldener Stern"
  ],
  "🎨 Красное сердце": [
      "🎨 Red Heart",
      "🎨 Corazón rojo",
      "🎨 红心",
      "🎨 قلب أحمر",
      "🎨 قلب قرمز",
      "🎨 Cœur rouge",
      "🎨 Rotes Herz"
  ],
  "🎨 Синий кристалл": [
      "🎨 Blue Crystal",
      "🎨 Cristal azul",
      "🎨 蓝水晶",
      "🎨 كريستال أزرق",
      "🎨 کریستال آبی",
      "🎨 Cristal bleu",
      "🎨 Blauer Kristall"
  ],
  "📎 Документ": [
      "📎 Document",
      "📎 Documento",
      "📎 文档",
      "📎 مستند",
      "📎 سند",
      "📎 Document",
      "📎 Dokument"
  ],
  "Документ": [
      "Document",
      "Documento",
      "文档",
      "مستند",
      "سند",
      "Document",
      "Dokument"
  ],
  "Файл": [
      "File",
      "Archivo",
      "文件",
      "ملف",
      "فایل",
      "Fichier",
      "Datei"
  ],
  "Медиа": [
      "Media",
      "Multimedia",
      "媒体",
      "وسائط",
      "رسانه",
      "Médias",
      "Medien"
  ],
  "Галерея": [
      "Gallery",
      "Galería",
      "相册",
      "المعرض",
      "گالری",
      "Galerie",
      "Galerie"
  ],
  "Камера": [
      "Camera",
      "Cámara",
      "相机",
      "الكاميرا",
      "دوربین",
      "Caméra",
      "Kamera"
  ],
  "Полный экран": [
      "Fullscreen",
      "Pantalla completa",
      "全屏",
      "ملء الشاشة",
      "تمام‌صفحه",
      "Plein écran",
      "Vollbild"
  ],
  "Открыть на весь экран": [
      "Open Fullscreen",
      "Abrir en pantalla completa",
      "全屏打开",
      "فتح بملء الشاشة",
      "باز کردن در حالت تمام‌صفحه",
      "Ouvrir en plein écran",
      "Im Vollbildmodus öffnen"
  ],
  "Открыть фото на весь экран": [
      "Open photo in fullscreen",
      "Abrir foto en pantalla completa",
      "全屏查看照片",
      "فتح الصورة بملء الشاشة",
      "باز کردن عکس در تمام‌صفحه",
      "Ouvrir la photo en plein écran",
      "Foto im Vollbild öffnen"
  ],
  "Просмотр фото": [
      "View Photo",
      "Ver foto",
      "查看照片",
      "عرض الصورة",
      "مشاهده عکس",
      "Voir la photo",
      "Foto ansehen"
  ],
  "Просмотр фотографии": [
      "Photo Viewer",
      "Visor de fotos",
      "查看照片",
      "عارض الصور",
      "مشاهده عکس",
      "Visionneuse de photos",
      "Fotobetrachter"
  ],
  "Просмотреть фото": [
      "View Photo",
      "Ver foto",
      "查看照片",
      "عرض الصورة",
      "مشاهده عکس",
      "Voir la photo",
      "Foto ansehen"
  ],
  "Скачать файл": [
      "Download File",
      "Descargar archivo",
      "下载文件",
      "تنزيل الملف",
      "دانلود فایل",
      "Télécharger le fichier",
      "Datei herunterladen"
  ],
  "Скачать и открыть": [
      "Download & Open",
      "Descargar y abrir",
      "下载并打开",
      "تنزيل وفتح",
      "دانلود و باز کردن",
      "Télécharger et ouvrir",
      "Herunterladen & öffnen"
  ],
  "Масштаб": [
      "Zoom",
      "Escala",
      "缩放",
      "التكبير",
      "بزرگ‌نمایی",
      "Zoom",
      "Maßstab"
  ],
  "Повернуть": [
      "Rotate",
      "Girar",
      "旋转",
      "تدوير",
      "چرخش",
      "Pivoter",
      "Drehen"
  ],
  "Уменьшить": [
      "Zoom Out",
      "Alejar",
      "缩小",
      "تصغير",
      "کوچک‌نمایی",
      "Dézoomer",
      "Verkleinern"
  ],
  "Увеличить": [
      "Zoom In",
      "Acercar",
      "放大",
      "تكبير",
      "بزرگ‌نمایی",
      "Zoomer",
      "Vergrößern"
  ],
  "Повернуть против часовой стрелки": [
      "Rotate Counterclockwise",
      "Girar en sentido antihorario",
      "逆时针旋转",
      "تدوير عكس عقارب الساعة",
      "چرخش پادساعتگرد",
      "Tourner dans le sens antihoraire",
      "Gegen den Uhrzeigersinn drehen"
  ],
  "Повернуть по часовой стрелке": [
      "Rotate Clockwise",
      "Girar en sentido horario",
      "顺时针旋转",
      "تدوير مع عقارب الساعة",
      "چرخش ساعتگرد",
      "Tourner dans le sens horaire",
      "Im Uhrzeigersinn drehen"
  ],
  "👈 Свайп влево — закрыть • 🔍 Зум пальцами • ⚡ Двойной тап — 2x": [
      "👈 Swipe left to close • 🔍 Pinch to zoom • ⚡ Double tap for 2x",
      "👈 Deslice a la izquierda para cerrar • 🔍 Pellizque para zoom • ⚡ Doble toque 2x",
      "👈 左滑关闭 • 🔍 双指缩放 • ⚡ 双击 2x 放大",
      "👈 اسحب لليسار للإغلاق • 🔍قرص للتكبير • ⚡ نقر مزدوج 2x",
      "👈 سوایپ به چپ: بستن • 🔍 زوم با دو انگشت • ⚡ دو بار ضربه: ۲ برابر",
      "👈 Glisser à gauche pour fermer • 🔍 Pincer pour zoomer • ⚡ Double appui 2x",
      "👈 Nach links wischen zum Schließen • 🔍 Pinch-Zoom • ⚡ Doppeltippen 2x"
  ],
  "Свайп вниз для закрытия • Двойной тап для приближения": [
      "Swipe down to close • Double tap to zoom",
      "Deslice hacia abajo para cerrar • Doble toque para acercar",
      "下滑关闭 • 双击缩放",
      "اسحب للأسفل للإغلاق • نقر مزدوج للتكبير",
      "سوایپ به پایین برای بستن • دو بار ضربه برای بزرگ‌نمایی",
      "Glisser vers le bas pour fermer • Double appui pour zoomer",
      "Nach unten wischen zum Schließen • Doppeltippen zum Zoomen"
  ],
  "Прикрепить файл, фото или видео": [
      "Attach file, photo, or video",
      "Adjuntar archivo, foto o video",
      "附加文件、照片或视频",
      "إرفاق ملف أو صورة أو فيديو",
      "پیوست فایل، عکس یا ویدیو",
      "Joindre un fichier, une photo ou une vidéo",
      "Datei, Foto oder Video anhängen"
  ],
  "Прикрепить к сообщению": [
      "Attach to message",
      "Adjuntar al mensaje",
      "添加到消息",
      "إرفاق بالرسالة",
      "پیوست به پیام",
      "Joindre au message",
      "An Nachricht anhängen"
  ],
  "Назад в меню вложений": [
      "Back to attachment menu",
      "Volver al menú de adjuntos",
      "返回附件菜单",
      "العودة إلى قائمة المرفقات",
      "بازگشت به منوی پیوست‌ها",
      "Retour au menu des pièces jointes",
      "Zurück zum Anhangsmenü"
  ],
  "Фонарик / Вспышка": [
      "Flashlight / Flash",
      "Linterna / Flash",
      "手电筒 / 闪光灯",
      "المصباح / الفلاش",
      "چراغ‌قوه / فلش",
      "Lampe / Flash",
      "Taschenlampe / Blitz"
  ],
  "Переключить камеру": [
      "Switch Camera",
      "Cambiar cámara",
      "切换摄像头",
      "تبديل الكاميرا",
      "تغییر دوربین",
      "Changer de caméra",
      "Kamera wechseln"
  ],
  "Сменить камеру": [
      "Switch camera",
      "Cambiar cámara",
      "切换摄像头",
      "تبديل الكاميرا",
      "تغییر دوربین",
      "Changer de caméra",
      "Kamera wechseln"
  ],
  "Выбрать из галереи": [
      "Choose from Gallery",
      "Elegir de la galería",
      "从相册选择",
      "اختر من المعرض",
      "انتخاب از گالری",
      "Choisir dans la galerie",
      "Aus Galerie wählen"
  ],
  "Сделать фото": [
      "Take Photo",
      "Tomar foto",
      "拍照",
      "التقاط صورة",
      "گرفتن عکس",
      "Prendre une photo",
      "Foto aufnehmen"
  ],
  "Сделать фото сразу": [
      "Take photo immediately",
      "Tomar foto ahora",
      "立即拍照",
      "التقاط صورة فوراً",
      "فوراً عکس بگیرید",
      "Prendre une photo immédiatement",
      "Sofort Foto aufnehmen"
  ],
  "Нажмите, чтобы открыть камеру на весь экран": [
      "Tap to open fullscreen camera",
      "Toque para abrir la cámara en pantalla completa",
      "点击全屏打开摄像头",
      "اضغط لفتح الكاميرا بملء الشاشة",
      "برای باز کردن دوربین در حالت تمام‌صفحه ضربه بزنید",
      "Appuyez pour ouvrir la caméra en plein écran",
      "Tippen, um Kamera im Vollbildmodus zu öffnen"
  ],
  "Отправить геопозицию": [
      "Send Location",
      "Enviar ubicación",
      "发送位置",
      "إرسال الموقع الجغرافي",
      "ارسال موقعیت مکانی",
      "Envoyer la position",
      "Standort senden"
  ],
  "Мое местоположение": [
      "My Location",
      "Mi ubicación",
      "我的位置",
      "موقعي",
      "موقعیت مکانی من",
      "Ma position",
      "Mein Standort"
  ],
  "Открыть в картах": [
      "Open in Maps",
      "Abrir en Mapas",
      "在地图中打开",
      "فتح في الخرائط",
      "باز کردن در نقشه",
      "Ouvrir dans Cartes",
      "In Karten öffnen"
  ],
  "Остановить": [
      "Stop",
      "Detener",
      "停止",
      "إيقاف",
      "توقف",
      "Arrêter",
      "Stoppen"
  ],
  "Пауза": [
      "Pause",
      "Pausa",
      "暂停",
      "إيقاف مؤقت",
      "مکث",
      "Pause",
      "Pause"
  ],
  "Воспроизвести": [
      "Play",
      "Reproducir",
      "播放",
      "تشغيل",
      "پخش",
      "Lire",
      "Abspielen"
  ],
  "Скорость воспроизведения": [
      "Playback Speed",
      "Velocidad de reproducción",
      "播放速度",
      "سرعة التشغيل",
      "سرعت پخش",
      "Vitesse de lecture",
      "Wiedergabegeschwindigkeit"
  ],
  "Распознавание...": [
      "Transcribing...",
      "Transcribiendo...",
      "正在识别语音...",
      "جاري التعرف على الكلام...",
      "در حال تبدیل گفتار به متن...",
      "Transcription...",
      "Transkribieren..."
  ],
  "Скрыть текст": [
      "Hide transcript",
      "Ocultar texto",
      "隐藏文本",
      "إخفاء النص",
      "پنهان کردن متن",
      "Masquer le texte",
      "Text ausblenden"
  ],
  "Показать текст": [
      "Show transcript",
      "Mostrar texto",
      "显示文本",
      "إظهار النص",
      "نمایش متن",
      "Afficher le texte",
      "Text anzeigen"
  ],
  "Речь не распознана (тишина или шум)": [
      "No speech detected (silence or noise)",
      "No se detectó voz (silencio o ruido)",
      "未识别到语音（静音或噪音）",
      "لم يتم التعرف على كلام (صمت أو ضوضاء)",
      "گفتاری تشخیص داده نشد (سکوت یا نویز)",
      "Aucune parole détectée (silence ou bruit)",
      "Keine Sprache erkannt (Stille oder Rauschen)"
  ],
  "Запись:": [
      "Recording:",
      "Grabando:",
      "录音中:",
      "جاري التسجيل:",
      "در حال ضبط:",
      "Enregistrement :",
      "Aufnahme:"
  ],
  "Запись отменена": [
      "Recording cancelled",
      "Grabación cancelada",
      "录音已取消",
      "تم إلغاء التسجيل",
      "ضبط لغو شد",
      "Enregistrement annulé",
      "Aufnahme abgebrochen"
  ],
  "Запись видео-кружка отменена": [
      "Video note cancelled",
      "Nota de video cancelada",
      "视频消息已取消",
      "تم إلغاء ملاحظة الفيديو",
      "ضبط ویدیو پیام لغو شد",
      "Note vidéo annulée",
      "Videonotiz abgebrochen"
  ],
  "Запись зафиксирована": [
      "Recording locked",
      "Grabación bloqueada",
      "录音已锁定",
      "تم تثبيت التسجيل",
      "ضبط قفل شد",
      "Enregistrement verrouillé",
      "Aufnahme festgestellt"
  ],
  "Запись видео зафиксирована": [
      "Video recording locked",
      "Grabación de video bloqueada",
      "视频录制已锁定",
      "تم تثبيت تسجيل الفيديو",
      "ضبط ویدیو قفل شد",
      "Enregistrement vidéo verrouillé",
      "Videoaufnahme festgestellt"
  ],
  "Зафиксировано 🔒": [
      "Locked 🔒",
      "Bloqueado 🔒",
      "已锁定 🔒",
      "مُثبت 🔒",
      "قفل شد 🔒",
      "Verrouillé 🔒",
      "Festgestellt 🔒"
  ],
  "← Свайп влево для отмены": [
      "← Swipe left to cancel",
      "← Desliza a la izquierda para cancelar",
      "← 左滑取消",
      "← اسحب لليسار للإلغاء",
      "← برای لغو به چپ بکشید",
      "← Glisser à gauche pour annuler",
      "← Nach links wischen zum Abbrechen"
  ],
  "🎤 Режим: Голосовые сообщения (удерживайте для записи)": [
      "🎤 Mode: Voice messages (hold to record)",
      "🎤 Modo: Mensajes de voz (mantén presionado para grabar)",
      "🎤 模式：语音消息（长按录音）",
      "🎤 الوضع: رسائل صوتية (اضغط مطولاً للتسجيل)",
      "🎤 حالت: پیام صوتی (برای ضبط نگه دارید)",
      "🎤 Mode : Messages vocaux (maintenir pour enregistrer)",
      "🎤 Modus: Sprachnachrichten (zum Aufnehmen halten)"
  ],
  "📹 Режим: Видео-кружки (удерживайте для записи)": [
      "📹 Mode: Video notes (hold to record)",
      "📹 Modo: Notas de video (mantén presionado para grabar)",
      "📹 模式：圆视频消息（长按录制）",
      "📹 الوضع: ملاحظات فيديو (اضغط مطولاً للتسجيل)",
      "📹 حالت: ویدیو پیام (برای ضبط نگه دارید)",
      "📹 Mode : Notes vidéo (maintenir pour enregistrer)",
      "📹 Modus: Videonotizen (zum Aufnehmen halten)"
  ],
  "Зажмите для записи голоса, нажмите для переключения на видео": [
      "Hold to record voice, tap to switch to video",
      "Mantén para grabar voz, toca para cambiar a video",
      "长按录制语音，点击切换为视频",
      "اضغط مطولاً لتسجيل صوت، انقر للتبديل للفيديو",
      "برای ضبط صدا نگه دارید، برای تغییر به ویدیو ضربه بزنید",
      "Maintenir pour la voix, appuyer pour passer à la vidéo",
      "Halten für Sprachaufnahme, tippen für Video"
  ],
  "Зажмите для записи видео-кружка, нажмите для переключения на голос": [
      "Hold to record video note, tap to switch to voice",
      "Mantén para grabar nota de video, toca para cambiar a voz",
      "长按录制视频，点击切换为语音",
      "اضغط مطولاً لتسجيل فيديو، انقر للتبديل للصوت",
      "برای ضبط ویدیو نگه دارید، برای تغییر به صدا ضربه بزنید",
      "Maintenir pour la vidéo, appuyer pour passer à la voix",
      "Halten für Videonotiz, tippen für Sprache"
  ],
  "Идет запись кружка...": [
      "Recording video note...",
      "Grabando nota de video...",
      "正在录制视频消息...",
      "جاري تسجيل ملاحظة الفيديو...",
      "در حال ضبط ویدیو پیام...",
      "Enregistrement de la note vidéo...",
      "Videonotiz wird aufgenommen..."
  ],
  "Запись видео-кружка": [
      "Record Video Note",
      "Grabar nota de video",
      "录制圆视频",
      "تسجيل ملاحظة فيديو",
      "ضبط ویدیو پیام",
      "Enregistrer une note vidéo",
      "Videonotiz aufnehmen"
  ],
  "Предпросмотр кружка": [
      "Video Note Preview",
      "Vista previa de nota de video",
      "圆视频预览",
      "معاينة رسالة الفيديو الدائرية",
      "پیش‌نمایش ویدیو مسیج",
      "Aperçu de la note vidéo",
      "Videonachricht-Vorschau"
  ],
  "Проверьте запись перед отправкой": [
      "Review your recording before sending",
      "Revise la grabación antes de enviar",
      "发送前请检查录像",
      "راجع التسجيل قبل الإرسال",
      "پیش از ارسال، ضبط را بررسی کنید",
      "Vérifiez l'enregistrement avant l'envoi",
      "Überprüfen Sie die Aufnahme vor dem Senden"
  ],
  "Нажмите на квадрат для завершения": [
      "Tap the square to stop",
      "Toca el cuadrado para finalizar",
      "点击方块结束录制",
      "اضغط على المربع للإنهاء",
      "برای پایان روی مربع بزنید",
      "Appuyez sur le carré pour terminer",
      "Auf das Quadrat tippen zum Beenden"
  ],
  "Нажмите на камеру для начала записи": [
      "Tap camera to start recording",
      "Toca la cámara para empezar a grabar",
      "点击相机开始录制",
      "اضغط على الكاميرا لبدء التسجيل",
      "برای شروع ضبط روی دوربین بزنید",
      "Appuyez sur la caméra pour enregistrer",
      "Auf Kamera tippen zum Starten"
  ],
  "Начать запись": [
      "Start recording",
      "Iniciar grabación",
      "开始录制",
      "بدء التسجيل",
      "شروع ضبط",
      "Démarrer l'enregistrement",
      "Aufnahme starten"
  ],
  "Остановить запись": [
      "Stop recording",
      "Detener grabación",
      "停止录制",
      "إيقاف التسجيل",
      "توقف ضبط",
      "Arrêter l'enregistrement",
      "Aufnahme stoppen"
  ],
  "Запись удалена": [
      "Recording discarded",
      "Grabación eliminada",
      "录制已删除",
      "تم حذف التسجيل",
      "ضبط حذف شد",
      "Enregistrement supprimé",
      "Aufnahme gelöscht"
  ],
  "Видео-кружок отправлен": [
      "Video note sent",
      "Nota de video enviada",
      "视频消息已发送",
      "تم إرسال ملاحظة الفيديو",
      "ویدیو پیام ارسال شد",
      "Note vidéo envoyée",
      "Videonotiz gesendet"
  ],
  "Отправить видео-кружок": [
      "Send video note",
      "Enviar nota de video",
      "发送视频消息",
      "إرسال ملاحظة الفيديو",
      "ارسال ویدیو پیام",
      "Envoyer la note vidéo",
      "Videonotiz senden"
  ],
  "Загрузка кружка...": [
      "Loading video note...",
      "Cargando nota de video...",
      "正在加载圆视频...",
      "جارٍ تحميل رسالة الفيديو...",
      "در حال بارگذاری ویدیو مسیج...",
      "Chargement de la note vidéo...",
      "Videonachricht wird geladen..."
  ],
  "Расшифровка кружка...": [
      "Decrypting video note...",
      "Descifrando nota de video...",
      "正在解密圆视频...",
      "جارٍ فك تشفير رسالة الفيديو...",
      "در حال رمزگشایی ویدیو مسیج...",
      "Déchiffrement de la note vidéo...",
      "Videonachricht wird entschlüsselt..."
  ],
  "Расшифровка аудио...": [
      "Decrypting audio...",
      "Descifrando audio...",
      "正在解密音频...",
      "جارٍ فك تشفير الصوت...",
      "در حال رمزگشایی صدا...",
      "Déchiffrement de l'audio...",
      "Audio wird entschlüsselt..."
  ],
  "Расшифровка фото...": [
      "Decrypting photo...",
      "Descifrando foto...",
      "正在解密照片...",
      "جارٍ فك تشفير الصورة...",
      "در حال رمزگشایی عکس...",
      "Déchiffrement de la photo...",
      "Foto wird entschlüsselt..."
  ],
  "Расшифровка видео...": [
      "Decrypting video...",
      "Descifrando video...",
      "正在解密视频...",
      "جارٍ فك تشفير الفيديو...",
      "در حال رمزگشایی ویدیو...",
      "Déchiffrement de la vidéo...",
      "Video wird entschlüsselt..."
  ],
  "Расшифровка медиафайла...": [
      "Decrypting media file...",
      "Descifrando archivo multimedia...",
      "正在解密媒体文件...",
      "جارٍ فك تشفير ملف الوسائط...",
      "در حال رمزگشایی فایل رسانه...",
      "Déchiffrement du fichier multimédia...",
      "Mediendatei wird entschlüsselt..."
  ],
  "Не удалось загрузить кружок": [
      "Failed to load video note",
      "No se pudo cargar la nota de video",
      "加载圆视频失败",
      "تعذر تحميل رسالة الفيديو",
      "بارگذاری ویدیو مسیج ناموفق بود",
      "Impossible de charger la note vidéo",
      "Videonachricht konnte nicht geladen werden"
  ],
  "Не удалось расшифровать аудиосообщение": [
      "Failed to decrypt audio message",
      "No se pudo descifrar el mensaje de voz",
      "无法解密语音消息",
      "تعذر فك تشفير الرسالة الصوتية",
      "رمزگشایی پیام صوتی ناموفق بود",
      "Impossible de déchiffrer le message audio",
      "Audionachricht konnte nicht entschlüsselt werden"
  ],
  "Не удалось расшифровать аудио": [
      "Failed to decrypt audio",
      "No se pudo descifrar el audio",
      "解密音频失败",
      "فشل فك تشفير الصوت",
      "رمزگشایی صدا ناموفق بود",
      "Échec du déchiffrement audio",
      "Audio konnte nicht entschlüsselt werden"
  ],
  "Не удалось расшифровать фото": [
      "Failed to decrypt photo",
      "No se pudo descifrar la foto",
      "无法解密照片",
      "تعذر فك تشفير الصورة",
      "رمزگشایی عکس ناموفق بود",
      "Impossible de déchiffrer la photo",
      "Foto konnte nicht entschlüsselt werden"
  ],
  "Не удалось расшифровать видео": [
      "Failed to decrypt video",
      "No se pudo descifrar el video",
      "无法解密视频",
      "تعذر فك تشفير الفيديو",
      "رمزگشایی ویدیو ناموفق بود",
      "Impossible de déchiffrer la vidéo",
      "Video konnte nicht entschlüsselt werden"
  ],
  "Конвертация HEIC в JPEG...": [
      "Converting HEIC to JPEG...",
      "Convirtiendo HEIC a JPEG...",
      "正在将 HEIC 转换为 JPEG...",
      "جاري تحويل HEIC إلى JPEG...",
      "در حال تبدیل HEIC به JPEG...",
      "Conversion HEIC vers JPEG...",
      "HEIC wird in JPEG konvertiert..."
  ],
  "Изображение HEIC успешно сконвертировано в JPEG!": [
      "HEIC image converted to JPEG!",
      "¡Imagen HEIC convertida a JPEG!",
      "HEIC 图像已成功转换为 JPEG！",
      "تم تحويل صورة HEIC إلى JPEG بنجاح!",
      "تصویر HEIC با موفقیت به JPEG تبدیل شد!",
      "Image HEIC convertie en JPEG !",
      "HEIC-Bild erfolgreich in JPEG konvertiert!"
  ],
  "Файл успешно подготовлен!": [
      "File prepared!",
      "¡Archivo listo!",
      "文件已准备就绪！",
      "تم تجهيز الملف بنجاح!",
      "فایل آماده شد!",
      "Fichier prêt !",
      "Datei erfolgreich vorbereitet!"
  ],
  "Сохранить .vcf": [
      "Save .vcf",
      "Guardar .vcf",
      "保存 .vcf",
      "حفظ .vcf",
      "ذخیره .vcf",
      "Enregistrer .vcf",
      "Als .vcf speichern"
  ],
  "Позвонить": [
      "Call",
      "Llamar",
      "呼叫",
      "اتصال",
      "تماس",
      "Appeler",
      "Anrufen"
  ],
  "Написать": [
      "Message",
      "Mensaje",
      "发消息",
      "مراسلة",
      "پیام",
      "Message",
      "Nachricht"
  ],
  "🔒 Зашифрованное сообщение": [
      "🔒 Encrypted message",
      "🔒 Mensaje cifrado",
      "🔒 加密消息",
      "🔒 رسالة مشفرة",
      "🔒 پیام رمزنگاری شده",
      "🔒 Message chiffré",
      "🔒 Verschlüsselte Nachricht"
  ],
  "Зашифрованное сообщение": [
      "Encrypted message",
      "Mensaje cifrado",
      "加密消息",
      "رسالة مشفرة",
      "پیام رمزنگاری شده",
      "Message chiffré",
      "Verschlüsselte Nachricht"
  ],
  "🔒 Защищенное сообщение": [
      "🔒 Protected message",
      "🔒 Mensaje protegido",
      "🔒 受保护消息",
      "🔒 رسالة محمية",
      "🔒 پیام محافظت شده",
      "🔒 Message protégé",
      "🔒 Geschützte Nachricht"
  ],
  "🔒 Защищенное соединение установлено": [
      "🔒 Secure connection established",
      "🔒 Conexión segura establecida",
      "🔒 已建立安全连接",
      "🔒 تم إنشاء اتصال آمن",
      "🔒 اتصال امن برقرار شد",
      "🔒 Connexion sécurisée établie",
      "🔒 Sichere Verbindung hergestellt"
  ],
  "🔒 Сообщение зашифровано новым ключом": [
      "🔒 Message encrypted with a new key",
      "🔒 Mensaje cifrado con una nueva clave",
      "🔒 消息已使用新密钥加密",
      "🔒 الرسالة مشفرة بمفتاح جديد",
      "🔒 پیام با کلید جدیدی رمزنگاری شده است",
      "🔒 Message chiffré avec une nouvelle clé",
      "🔒 Nachricht mit neuem Schlüssel verschlüsselt"
  ],
  "🔒 Собственное сообщение не удалось расшифровать": [
      "🔒 Own message could not be decrypted",
      "🔒 No se pudo descifrar el mensaje propio",
      "🔒 无法解密自己的消息",
      "🔒 تعذر فك تشفير رسالتك",
      "🔒 پیام خودتان قابل رمزگشایی نیست",
      "🔒 Votre propre message n'a pas pu être déchiffré",
      "🔒 Eigene Nachricht konnte nicht entschlüsselt werden"
  ],
  "🔒 Сообщение отклонено": [
      "🔒 Message rejected",
      "🔒 Mensaje rechazado",
      "🔒 消息被拒绝",
      "🔒 تم رفض الرسالة",
      "🔒 پیام رد شد",
      "🔒 Message rejeté",
      "🔒 Nachricht abgelehnt"
  ],
  "Открытое сообщение отклонено": [
      "Unencrypted message rejected",
      "Mensaje sin cifrar rechazado",
      "未加密消息已被拒绝",
      "تم رفض الرسالة غير المشفرة",
      "پیام رمزنگاری‌نشده رد شد",
      "Message non chiffré rejeté",
      "Unverschlüsselte Nachricht abgelehnt"
  ],
  "Защищенный ключ обновлен": [
      "Security key updated",
      "Clave de seguridad actualizada",
      "安全密钥已更新",
      "تم تحديث مفتاح الأمان",
      "کلید امنیتی به‌روزرسانی شد",
      "Clé de sécurité mise à jour",
      "Sicherheitsschlüssel aktualisiert"
  ],
  "Обновить ключ связи": [
      "Reset session key",
      "Actualizar clave de sesión",
      "更新会话密钥",
      "تحديث مفتاح الاتصال",
      "به‌روزرسانی کلید ارتباطی",
      "Actualiser la clé de session",
      "Verbindungsschlüssel erneuern"
  ],
  "Входящее открытое (незашифрованное) сообщение отклонено политикой безопасности сквозного шифрования (Fail-Closed).": [
      "Incoming plaintext message was rejected by the end-to-end encryption Fail-Closed security policy.",
      "El mensaje entrante sin cifrar fue rechazado por la política de seguridad E2EE (Fail-Closed).",
      "端到端加密安全策略 (Fail-Closed) 拒绝了未加密的明文消息。",
      "تم رفض الرسالة الواردة غير المشفرة بموجب سياسة التشفير الصارمة (Fail-Closed).",
      "پیام متنی رمزنگاری‌نشده توسط سیاست امنیتی رمزنگاری سرتاسری (Fail-Closed) رد شد.",
      "Le message entrant non chiffré a été rejeté par la politique de sécurité E2EE (Fail-Closed).",
      "Eingehende unverschlüsselte Nachricht wurde durch die E2EE-Sicherheitsrichtlinie (Fail-Closed) abgelehnt."
  ],
  "Сообщение было зашифровано ключом новой сессии. Нажмите кнопку ниже, чтобы переподключить защищенный канал связи.": [
      "This message was encrypted with a new session key. Tap the button below to re-establish the secure channel.",
      "El mensaje fue cifrado con una nueva clave de sesión. Pulsa el botón de abajo para reconectar el canal seguro.",
      "该消息由新会话密钥加密。请点击下方按钮重新建立安全通道。",
      "تم تشفير الرسالة بمفتاح جلسة جديد. اضغط أدناه لإعادة ربط القناة الآمنة.",
      "این پیام با کلید نشست جدیدی رمزنگاری شده است. برای برقراری مجدد کانال امن دکمه زیر را بزنید.",
      "Ce message a été chiffré avec une nouvelle clé de session. Appuyez ci-dessous pour rétablir le canal sécurisé.",
      "Diese Nachricht wurde mit einem neuen Sitzungsschlüssel verschlüsselt. Tippen Sie unten, um den sicheren Kanal neu zu verbinden."
  ],
  "Ключ уже обновляется — повторная переустановка возможна через 2 минуты": [
      "Key reset already in progress — retry available in 2 minutes",
      "La clave ya se está actualizando — reintenta en 2 minutos",
      "密钥正在更新 — 2 分钟后可再次重置",
      "جاري تحديث المفتاح بالفعل — يمكن إعادة المحاولة بعد دقيقتين",
      "کلید در حال به‌روزرسانی است — تلاش مجدد تا ۲ دقیقه دیگر",
      "Clé déjà en cours d'actualisation — réessayez dans 2 minutes",
      "Schlüssel wird bereits aktualisiert — erneut möglich in 2 Minuten"
  ],
  "Сброс и обновление E2EE-ключа связи...": [
      "Resetting and rotating E2EE session key...",
      "Restableciendo clave de sesión E2EE...",
      "正在重置并更新 E2EE 会话密钥...",
      "جاري إعادة تعيين وتحديث مفتاح التشفير E2EE...",
      "در حال بازنشانی و به‌روزرسانی کلید نشست E2EE...",
      "Réinitialisation de la clé de session E2EE...",
      "E2EE-Sitzungsschlüssel wird zurückgesetzt..."
  ],
  "Запрос на переустановку ключа отправлен собеседнику": [
      "Session key reset request sent to peer",
      "Solicitud de restablecimiento de clave enviada",
      "已向对方发送密钥重置请求",
      "تم إرسال طلب إعادة تعيين المفتاح للطرف الآخر",
      "درخواست بازنشانی کلید برای مخاطب ارسال شد",
      "Demande de réinitialisation de clé envoyée",
      "Anfrage zur Schlüsselerneuerung gesendet"
  ],
  "Сейф-Контур": [
      "Safe Contour",
      "Contorno Seguro",
      "安全围栏 (DLP)",
      "المحيط الآمن",
      "مدار امن (DLP)",
      "Contour Sécurisé",
      "Sicherheitskontur"
  ],
  "Сейф-Контур (DLP Защита)": [
      "Safe Contour (DLP Protection)",
      "Contorno Seguro (Protección DLP)",
      "安全围栏 (DLP 防泄漏保护)",
      "المحيط الآمن (حماية DLP)",
      "مدار امن (حفاظت DLP)",
      "Contour Sécurisé (Protection DLP)",
      "Sicherheitskontur (DLP-Schutz)"
  ],
  "Режим «Сейф-Контур»": [
      "Safe Contour Mode",
      "Modo Contorno Seguro",
      "“安全围栏”模式",
      "وضع «المحيط الآمن»",
      "حالت «مدار امن»",
      "Mode « Contour Sécurisé »",
      "Modus „Sicherheitskontur“"
  ],
  "Режим «Сейф-Контур» (DLP)": [
      "Safe Contour Mode (DLP)",
      "Modo Contorno Seguro (DLP)",
      "“安全围栏”模式 (DLP)",
      "وضع «المحيط الآمن» (DLP)",
      "حالت «مدار امن» (DLP)",
      "Mode « Contour Sécurisé » (DLP)",
      "Modus „Sicherheitskontur“ (DLP)"
  ],
  "🛡️ Режим «Сейф-Контур» включен": [
      "🛡️ Safe Contour DLP mode enabled",
      "🛡️ Modo Contorno Seguro activado",
      "🛡️ 已启用“安全围栏”模式",
      "🛡️ تم تفعيل وضع «المحيط الآمن»",
      "🛡️ حالت «مدار امن» فعال شد",
      "🛡️ Mode « Contour Sécurisé » activé",
      "🛡️ Modus „Sicherheitskontur“ aktiviert"
  ],
  "Режим «Сейф-Контур» отключен": [
      "Safe Contour mode disabled",
      "Modo Contorno Seguro desactivado",
      "已禁用“安全围栏”模式",
      "تم تعطيل وضع «المحيط الآمن»",
      "حالت «مدار امن» غیرفعال شد",
      "Mode « Contour Sécurisé » désactivé",
      "Modus „Sicherheitskontur“ deaktiviert"
  ],
  "🛡️ Пересылка запрещена: чат защищен режимом «Сейф-Контур» (DLP)": [
      "🛡️ Forwarding blocked: chat is protected by Safe Contour (DLP)",
      "🛡️ Reenvío bloqueado: chat protegido por Contorno Seguro (DLP)",
      "🛡️ 禁止转发：该聊天受“安全围栏” (DLP) 保护",
      "🛡️ إعادة التوجيه محظورة: المحادثة محمية بوضع «المحيط الآمن» (DLP)",
      "🛡️ هدایت پیام مسدود است: گفتگو تحت حفاظت «مدار امن» (DLP) است",
      "🛡️ Transfert interdit : chat protégé par le Contour Sécurisé (DLP)",
      "🛡️ Weiterleitung blockiert: Chat durch „Sicherheitskontur“ (DLP) geschützt"
  ],
  "Активен (DLP защита включена)": [
      "Active (DLP protection ON)",
      "Activo (protección DLP activa)",
      "已激活（DLP 防护已开启）",
      "نشط (حماية DLP مفعلة)",
      "فعال (حفاظت DLP روشن)",
      "Actif (protection DLP activée)",
      "Aktiv (DLP-Schutz eingeschaltet)"
  ],
  "Политики безопасности и DLP:": [
      "Security & DLP Policies:",
      "Políticas de seguridad y DLP:",
      "安全与防泄漏 (DLP) 策略：",
      "سياسات الأمان ومنع التسرب DLP:",
      "سیاست‌های امنیتی و DLP:",
      "Politiques de sécurité et DLP :",
      "Sicherheits- und DLP-Richtlinien:"
  ],
  "Запрет пересылки (No-Forward DLP)": [
      "No-Forward DLP Lock",
      "Bloqueo de reenvío (No-Forward DLP)",
      "禁止转发 (No-Forward DLP)",
      "منع إعادة التوجيه (No-Forward DLP)",
      "قفل عدم هدایت (No-Forward DLP)",
      "Interdiction de transfert (No-Forward DLP)",
      "Weiterleitungssperre (No-Forward DLP)"
  ],
  "Сообщения, резюме, сканы паспортов и офферы невозможно переслать во внешние чаты.": [
      "Messages, documents, ID scans, and offers cannot be forwarded to external chats.",
      "Los mensajes, currículums, documentos y ofertas no se pueden reenviar a chats externos.",
      "消息、简历、证件扫描件和报价单无法转发到外部聊天。",
      "لا يمكن إعادة توجيه الرسائل والوثائق والعروض إلى محادثات خارجية.",
      "پیام‌ها، اسناد و فایل‌های حساس قابل هدایت به گفتگوهای بیرونی نیستند.",
      "Les messages, CV, scans et offres ne peuvent pas être transférés vers des chats externes.",
      "Nachrichten, Dokumente, Ausweisscans und Angebote können nicht nach außen weitergeleitet werden."
  ],
  "Постквантовое шифрование": [
      "Post-Quantum Encryption",
      "Cifrado Post-Cuántico",
      "后量子加密",
      "تشفير ما بعد الكم",
      "رمزنگاری پساکوانتومی",
      "Chiffrement post-quantique",
      "Post-Quanten-Verschlüsselung"
  ],
  "Сквозное шифрование ML-KEM Kyber-1024 + Signal Ratchet. Сервер видит только шифртекст.": [
      "ML-KEM Kyber-1024 + Signal Double Ratchet E2EE. The server only ever sees ciphertext.",
      "Cifrado E2EE ML-KEM Kyber-1024 + Signal Ratchet. El servidor solo ve texto cifrado.",
      "ML-KEM Kyber-1024 + Signal 双棘轮端到端加密。服务器仅能看到密文。",
      "تشفير طرف لطرف ML-KEM Kyber-1024 + Signal Ratchet. الخادم يرى النص المشفر فقط.",
      "رمزنگاری سرتاسری ML-KEM Kyber-1024 + Signal Ratchet. سرور فقط متن رمزنگاری‌شده را می‌بیند.",
      "Chiffrement E2EE ML-KEM Kyber-1024 + Signal Ratchet. Le serveur ne voit que le texte chiffré.",
      "ML-KEM Kyber-1024 + Signal Ratchet E2EE. Der Server sieht ausschließlich Geheimtext."
  ],
  "Локальный зашифрованный контейнер": [
      "Local Encrypted Vault",
      "Contenedor local cifrado",
      "本地加密容器",
      "حاوية مشفرة محلياً",
      "محفظه رمزنگاری‌شده محلی",
      "Conteneur local chiffré",
      "Lokaler verschlüsselter Container"
  ],
  "База сообщений на устройстве защищена криптографическим ключом SQLCipher и PIN-кодом.": [
      "On-device message database is protected by a SQLCipher cryptographic key and PIN.",
      "La base de datos de mensajes en el dispositivo está protegida con SQLCipher y código PIN.",
      "设备上的消息数据库受 SQLCipher 加密密钥与 PIN 码保护。",
      "قاعدة بيانات الرسائل على الجهاز محمية بمفتاح SQLCipher ورمز PIN.",
      "پایگاه داده پیام‌ها روی دستگاه با کلید رمزنگاری SQLCipher و پین‌کد محافظت می‌شود.",
      "La base de messages locale est protégée par une clé SQLCipher et un code PIN.",
      "Die lokale Nachrichtendatenbank ist durch SQLCipher und PIN-Code geschützt."
  ],
  "Блокирует пересылку сообщений, файлов и документов из этой группы наружу. Гарантирует изоляцию конфиденциальных данных.": [
      "Blocks forwarding of messages, files, and documents outside this group. Guarantees confidential data isolation.",
      "Bloquea el reenvío de mensajes, archivos y documentos fuera de este grupo. Garantiza el aislamiento de datos confidenciales.",
      "禁止将本群组内的消息、文件和文档转发至外部，确保机密数据隔离。",
      "يحظر إعادة توجيه الرسائل والملفات والمستندات خارج هذه المجموعة لضمان عزل البيانات السرية.",
      "هدایت پیام‌ها، فایل‌ها و اسناد این گروه به بیرون را مسدود کرده و ایزوله‌سازی داده‌های محرمانه را تضمین می‌کند.",
      "Bloque le transfert des messages, fichiers et documents hors de ce groupe. Garantit l'isolation des données confidentielles.",
      "Blockiert das Weiterleiten von Nachrichten, Dateien und Dokumenten aus dieser Gruppe nach außen."
  ],
  "Все чаты в этой папке защищаются в режиме «Сейф-Контур» (DLP): из них": [
      "All chats in this folder are protected by Safe Contour (DLP):",
      "Todos los chats en esta carpeta están protegidos por Contorno Seguro (DLP):",
      "此文件夹中的所有聊天均受“安全围栏” (DLP) 保护：",
      "جميع المحادثات في هذا المجلد محمية بوضع «المحيط الآمن» (DLP):",
      "تمام گفتگوهای این پوشه در حالت «مدار امن» (DLP) محافظت می‌شوند:",
      "Tous les chats de ce dossier sont protégés par le Contour Sécurisé (DLP) :",
      "Alle Chats in diesem Ordner sind durch die Sicherheitskontur (DLP) geschützt:"
  ],
  "запрещено пересылать сообщения наружу": [
      "forwarding messages outside is prohibited",
      "está prohibido reenviar mensajes al exterior",
      "禁止向外转发消息",
      "يُحظر إعادة توجيه الرسائل للخارج",
      "هدایت پیام به بیرون ممنوع است",
      "il est interdit de transférer des messages vers l'extérieur",
      "das Weiterleiten von Nachrichten nach außen ist untersagt"
  ],
  ", исключая случайные утечки данных.": [
      ", preventing accidental data leaks.",
      ", evitando fugas accidentales de datos.",
      "，杜绝意外数据泄露。",
      "، مما يمنع تسرب البيانات العرضي.",
      "، تا از نشت تصادفی اطلاعات جلوگیری شود.",
      ", évitant toute fuite accidentelle de données.",
      ", um versehentliche Datenlecks auszuschließen."
  ],
  "Состоит в папках:": [
      "In folders:",
      "En carpetas:",
      "所属文件夹：",
      "في المجلدات:",
      "در پوشه‌های:",
      "Dans les dossiers :",
      "In Ordnern:"
  ],
  "Название папки": [
      "Folder name",
      "Nombre de la carpeta",
      "文件夹名称",
      "اسم المجلد",
      "نام پوشه",
      "Nom du dossier",
      "Ordnername"
  ],
  "Иконка (Эмодзи)": [
      "Icon (Emoji)",
      "Icono (Emoji)",
      "图标 (表情)",
      "أيقونة (إيموجي)",
      "آیکون (ایموجی)",
      "Icône (Emoji)",
      "Symbol (Emoji)"
  ],
  "Например: Работа, Семья, Доверители...": [
      "E.g. Work, Family, Clients...",
      "Ej.: Trabajo, Familia, Clientes...",
      "例如：工作、家人、客户...",
      "مثال: العمل، العائلة، العملاء...",
      "مثلاً: کار، خانواده، موکلین...",
      "Ex. : Travail, Famille, Clients...",
      "Z. B. Arbeit, Familie, Mandanten..."
  ],
  "Придумайте PIN-код для защиты и шифрования вашей локальной базы данных SQLCipher.": [
      "Create a PIN code to protect and encrypt your local SQLCipher database.",
      "Crea un código PIN para proteger y cifrar tu base de datos local SQLCipher.",
      "请设置 PIN 码以保护并加密您的本地 SQLCipher 数据库。",
      "أنشئ رمز PIN لحماية وتشفير قاعدة بيانات SQLCipher المحلية.",
      "برای حفاظت و رمزنگاری پایگاه داده محلی SQLCipher یک پین‌کد انتخاب کنید.",
      "Créez un code PIN pour protéger et chiffrer votre base de données locale SQLCipher.",
      "Erstellen Sie einen PIN-Code zum Schutz und zur Verschlüsselung Ihrer lokalen SQLCipher-Datenbank."
  ],
  "Введите ваш PIN-код для расшифровки локальной базы данных.": [
      "Enter your PIN code to unlock and decrypt the local database.",
      "Ingresa tu código PIN para descifrar la base de datos local.",
      "请输入您的 PIN 码以解密本地数据库。",
      "أدخل رمز PIN لفك تشفير قاعدة البيانات المحلية.",
      "پین‌کد خود را برای رمزگشایی پایگاه داده محلی وارد کنید.",
      "Entrez votre code PIN pour déchiffrer la base de données locale.",
      "Geben Sie Ihren PIN-Code ein, um die lokale Datenbank zu entschlüsseln."
  ],
  "Введите PIN-код...": [
      "Enter PIN code...",
      "Ingresa el código PIN...",
      "输入 PIN 码...",
      "أدخل رمز PIN...",
      "پین‌کد را وارد کنید...",
      "Entrez le code PIN...",
      "PIN-Code eingeben..."
  ],
  "PIN-код": [
      "PIN code",
      "Código PIN",
      "PIN 码",
      "رمز PIN",
      "پین‌کد",
      "Code PIN",
      "PIN-Code"
  ],
  "Создать и сохранить": [
      "Create & Save",
      "Crear y guardar",
      "创建并保存",
      "إنشاء وحفظ",
      "ایجاد و ذخیره",
      "Créer et enregistrer",
      "Erstellen & speichern"
  ],
  "Разблокировать": [
      "Unlock",
      "Desbloquear",
      "解锁",
      "فتح القفل",
      "باز کردن قفل",
      "Déverrouiller",
      "Entsperren"
  ],
  "Сбросить локальные данные и войти заново": [
      "Reset local data and sign in again",
      "Restablecer datos locales e iniciar sesión",
      "重置本地数据并重新登录",
      "إعادة تعيين البيانات المحلية وتسجيل الدخول مجدداً",
      "بازنشانی داده‌های محلی و ورود مجدد",
      "Réinitialiser les données locales et se reconnecter",
      "Lokale Daten zurücksetzen und neu anmelden"
  ],
  "Забыли PIN-код? Сбросить локальный кэш": [
      "Forgot PIN? Reset local cache",
      "¿Olvidaste el PIN? Restablecer caché local",
      "忘记 PIN 码？重置本地缓存",
      "نسيت رمز PIN؟ إعادة تعيين التخزين المحلي",
      "پین‌کد را فراموش کردید؟ بازنشانی حافظه محلی",
      "PIN oublié ? Réinitialiser le cache local",
      "PIN vergessen? Lokalen Cache zurücksetzen"
  ],
  "Подтверждение сброса локальных данных": [
      "Confirm Local Data Reset",
      "Confirmar restablecimiento de datos locales",
      "确认重置本地数据",
      "تأكيد إعادة تعيين البيانات المحلية",
      "تأیید بازنشانی داده‌های محلی",
      "Confirmer la réinitialisation des données locales",
      "Zurücksetzen lokaler Daten bestätigen"
  ],
  "Сброс базы данных удалит локальную историю сообщений и криптографические ключи на этом устройстве. Данные на сервере сохранятся, но непрочитанные E2EE-сообщения могут стать недоступны.": [
      "Resetting the database will erase local message history and cryptographic keys on this device. Account data remains on the server, but unread E2EE messages may become inaccessible.",
      "Restablecer la base de datos borrará el historial local y las claves criptográficas en este dispositivo. Los mensajes E2EE no leídos podrían volverse inaccesibles.",
      "重置数据库将清除此设备上的本地聊天记录和加密密钥。未读的端到端加密消息可能无法访问。",
      "ستؤدي إعادة تعيين قاعدة البيانات إلى مسح السجل المحلي ومفاتيح التشفير على هذا الجهاز.",
      "بازنشانی پایگاه داده تاریخچه محلی پیام‌ها و کلیدهای رمزنگاری را در این دستگاه پاک می‌کند.",
      "La réinitialisation effacera l'historique local et les clés cryptographiques sur cet appareil.",
      "Das Zurücksetzen der Datenbank löscht den lokalen Verlauf und die kryptografischen Schlüssel auf diesem Gerät."
  ],
  "Да, сбросить данные": [
      "Yes, reset data",
      "Sí, restablecer datos",
      "是的，重置数据",
      "نعم، إعادة تعيين البيانات",
      "بله، بازنشانی داده‌ها",
      "Oui, réinitialiser",
      "Ja, Daten zurücksetzen"
  ],
  "Обновление приложения": [
      "Application Update",
      "Actualización de la aplicación",
      "应用更新",
      "تحديث التطبيق",
      "به‌روزرسانی برنامه",
      "Mise à jour de l'application",
      "App-Update"
  ],
  "Доступна новая версия веб-приложения": [
      "A new version of the web app is available",
      "Hay una nueva versión disponible",
      "新版本应用已发布",
      "يتوفر إصدار جديد من التطبيق",
      "نسخه جدید برنامه در دسترس است",
      "Une nouvelle version est disponible",
      "Eine neue Version der App ist verfügbar"
  ],
  "Установлена:": [
      "Installed:",
      "Instalada:",
      "当前安装:",
      "المثبت:",
      "نصب‌شده:",
      "Installée :",
      "Installiert:"
  ],
  "Размер:": [
      "Size:",
      "Tamaño:",
      "大小:",
      "الحجم:",
      "حجم:",
      "Taille :",
      "Größe:"
  ],
  "Что нового:": [
      "What's new:",
      "Novedades:",
      "更新内容：",
      "ما الجديد:",
      "تغییرات جدید:",
      "Nouveautés :",
      "Was ist neu:"
  ],
  "Требуется системное разрешение": [
      "System permission required",
      "Se requiere permiso del sistema",
      "需要系统权限",
      "مطلوب إذن النظام",
      "نیاز به مجوز سیستم",
      "Autorisation système requise",
      "Systemberechtigung erforderlich"
  ],
  "В открывшихся настройках Android включите переключатель": [
      "In the Android settings screen, enable",
      "En los ajustes de Android que se abrieron, activa",
      "在打开的 Android 设置中开启开关",
      "في إعدادات أندرويد المفتوحة، فعّل خيار",
      "در تنظیمات بازشده اندروید، گزینه",
      "Dans les paramètres Android ouverts, activez",
      "Aktivieren Sie in den Android-Einstellungen"
  ],
  "«Разрешить для этого источника»": [
      "\"Allow from this source\"",
      "«Permitir desde esta fuente»",
      "“允许来自此来源的应用”",
      "«السماح من هذا المصدر»",
      "«مجاز بودن از این منبع»",
      "« Autoriser depuis cette source »",
      "„Aus dieser Quelle zulassen“"
  ],
  ", затем вернитесь сюда и нажмите": [
      ", then return here and tap",
      ", luego vuelve aquí y pulsa",
      "，然后返回此处并点击",
      "، ثم عد إلى هنا واضغط على",
      " را روشن کرده و سپس بازگردید و روی",
      ", puis revenez ici et appuyez sur",
      ", kehren Sie dann zurück und tippen Sie auf"
  ],
  "«Установить обновление»": [
      "\"Install Update\"",
      "«Instalar actualización»",
      "“安装更新”",
      "«تثبيت التحديث»",
      "«نصب به‌روزرسانی» بزنید",
      "« Installer la mise à jour »",
      "„Update installieren“"
  ],
  "Открытие установщика...": [
      "Opening installer...",
      "Abriendo instalador...",
      "正在打开安装程序...",
      "جاري فتح المثبت...",
      "در حال باز کردن نصب‌کننده...",
      "Ouverture de l'installateur...",
      "Installer wird geöffnet..."
  ],
  "Установить обновление": [
      "Install Update",
      "Instalar actualización",
      "安装更新",
      "تثبيت التحديث",
      "نصب به‌روزرسانی",
      "Installer la mise à jour",
      "Update installieren"
  ],
  "Повторить загрузку": [
      "Retry Download",
      "Reintentar descarga",
      "重试下载",
      "إعادة التنزيل",
      "تلاش مجدد دانلود",
      "Réessayer le téléchargement",
      "Download wiederholen"
  ],
  "Идет автоматическое скачивание пакета...": [
      "Downloading update package automatically...",
      "Descargando paquete automáticamente...",
      "正在自动下载更新包...",
      "جاري تنزيل حزمة التحديث تلقائياً...",
      "در حال دانلود خودکار بسته به‌روزرسانی...",
      "Téléchargement automatique du paquet...",
      "Update-Paket wird automatisch heruntergeladen..."
  ],
  "Скачать в браузере": [
      "Download in Browser",
      "Descargar en el navegador",
      "在浏览器中下载",
      "التنزيل في المتصفح",
      "دانلود در مرورگر",
      "Télécharger dans le navigateur",
      "Im Browser herunterladen"
  ],
  "Запуск системного установщика...": [
      "Launching system installer...",
      "Iniciando instalador del sistema...",
      "正在启动系统安装程序...",
      "جاري تشغيل مثبت النظام...",
      "در حال اجرای نصب‌کننده سیستم...",
      "Lancement de l'installateur système...",
      "System-Installer wird gestartet..."
  ],
  "Файл полностью скачан и проверен": [
      "File downloaded and verified",
      "Archivo descargado y verificado",
      "文件已完整下载并校验",
      "تم تنزيل الملف والتحقق منه بالكامل",
      "فایل به طور کامل دانلود و بررسی شد",
      "Fichier téléchargé et vérifié",
      "Datei vollständig heruntergeladen und geprüft"
  ],
  "Сбой загрузки пакета": [
      "Package download failed",
      "Error al descargar el paquete",
      "更新包下载失败",
      "فشل تنزيل الحزمة",
      "خطا در دانلود بسته",
      "Échec du téléchargement du paquet",
      "Paket-Download fehlgeschlagen"
  ],
  "Подготовка к установке...": [
      "Preparing installation...",
      "Preparando instalación...",
      "正在准备安装...",
      "جاري التحضير للتثبيت...",
      "در حال آماده‌سازی نصب...",
      "Préparation de l'installation...",
      "Installation wird vorbereitet..."
  ],
  "Пожалуйста, не закрывайте приложение до завершения загрузки": [
      "Please do not close the app until the download finishes",
      "Por favor, no cierres la aplicación hasta que termine la descarga",
      "下载完成前请勿关闭应用",
      "يرجى عدم إغلاق التطبيق حتى يكتمل التنزيل",
      "لطفاً تا پایان دانلود برنامه را نبندید",
      "Veuillez ne pas fermer l'application avant la fin du téléchargement",
      "Bitte schließen Sie die App nicht, bis der Download abgeschlossen ist"
  ],
  "Нажмите кнопку ниже для запуска стандартного установщика Android": [
      "Tap the button below to launch the Android package installer",
      "Pulsa el botón de abajo para abrir el instalador de Android",
      "点击下方按钮启动 Android 标准安装程序",
      "اضغط على الزر أدناه لتشغيل مثبت أندرويد",
      "برای اجرای نصب‌کننده استاندارد اندروید دکمه زیر را بزنید",
      "Appuyez ci-dessous pour lancer l'installateur Android",
      "Tippen Sie unten, um den Android-Paketinstaller zu starten"
  ],
  "Вернуться на главную (лендинг)": [
      "Back to Landing Page",
      "Volver a la página principal",
      "返回首页（介绍页）",
      "العودة إلى الصفحة الرئيسية",
      "بازگشت به صفحه اصلی (لندینگ)",
      "Retour à l'accueil",
      "Zurück zur Startseite"
  ],
  "Официальное системное оповещение службы управления Gossip": [
      "Official System Broadcast from Gossip Administration",
      "Aviso oficial del sistema de administración de Gossip",
      "Gossip 官方系统通知",
      "إشعار نظام رسمي من إدارة Gossip",
      "اطلاعیه رسمی سیستم مدیریت Gossip",
      "Notification système officielle de Gossip",
      "Offizielle Systemmitteilung der Gossip-Verwaltung"
  ],
  "Боты и Интеграции (Developer Hub)": [
      "Bots & Integrations (Developer Hub)",
      "Bots e Integraciones (Developer Hub)",
      "机器人与集成 (开发者中心)",
      "البوتات والتكاملات (مركز المطورين)",
      "ربات‌ها و یکپارچه‌سازی (مرکز توسعه‌دهندگان)",
      "Bots et Intégrations (Developer Hub)",
      "Bots & Integrationen (Developer Hub)"
  ],
  "Сервисный бот Boltalka": [
      "Gossip Service Bot",
      "Bot de servicio Gossip",
      "Gossip 服务机器人",
      "بوت خدمة Gossip",
      "ربات سرویس Gossip",
      "Bot de service Gossip",
      "Gossip-Service-Bot"
  ],
  "Всего ботов:": [
      "Total bots:",
      "Total de bots:",
      "机器人总数：",
      "إجمالي البوتات:",
      "کل ربات‌ها:",
      "Total des bots :",
      "Bots insgesamt:"
  ],
  "Создать бота": [
      "Create Bot",
      "Crear bot",
      "创建机器人",
      "إنشاء بوت",
      "ساخت ربات",
      "Créer un bot",
      "Bot erstellen"
  ],
  "Создание нового бота": [
      "Create New Bot",
      "Crear nuevo bot",
      "创建新机器人",
      "إنشاء بوت جديد",
      "ساخت ربات جدید",
      "Créer un nouveau bot",
      "Neuen Bot erstellen"
  ],
  "У вас пока нет созданных ботов": [
      "You haven't created any bots yet",
      "Aún no has creado ningún bot",
      "您还没有创建任何机器人",
      "لم تقم بإنشاء أي بوتات بعد",
      "هنوز هیچ رباتی نساخته‌اید",
      "Vous n'avez pas encore créé de bot",
      "Sie haben noch keine Bots erstellt"
  ],
  "Создавайте Telegram-like ботов, подключайте внешние CRM, настраивайте Outgoing Webhooks и отправляйте интерактивные инлайн-клавиатуры.": [
      "Create Telegram-style bots, connect external CRMs, configure Outgoing Webhooks, and send interactive inline keyboards.",
      "Crea bots estilo Telegram, conecta CRM externos, configura Webhooks salientes y envía teclados interactivos.",
      "创建类 Telegram 机器人，连接外部 CRM，配置 Webhook 并发送交互式内联按钮。",
      "أنشئ بوتات شبيهة بتليجرام، اربط أنظمة CRM، اضبط Webhooks وأرسل لوحات أزرار تفاعلية.",
      "ربات‌های مشابه تلگرام بسازید، CRMهای خارجی را متصل کنید، وب‌هوک تنظیم کنید و دکمه‌های شیشه‌ای تعاملی بفرستید.",
      "Créez des bots type Telegram, connectez vos CRM, configurez des Webhooks et envoyez des claviers interactifs.",
      "Erstellen Sie Telegram-ähnliche Bots, verbinden Sie externe CRMs, konfigurieren Sie Webhooks und senden Sie Inline-Tastaturen."
  ],
  "Создать первого бота": [
      "Create Your First Bot",
      "Crear mi primer bot",
      "创建第一个机器人",
      "إنشاء أول بوت",
      "ساخت اولین ربات",
      "Créer mon premier bot",
      "Ersten Bot erstellen"
  ],
  "6 встроенных команд": [
      "6 built-in commands",
      "6 comandos integrados",
      "6 个内置命令",
      "6 أوامر مدمجة",
      "۶ دستور داخلی",
      "6 commandes intégrées",
      "6 integrierte Befehle"
  ],
  "Предложка включена": [
      "Support inbox ON",
      "Buzón de soporte activo",
      "反馈收件箱已开启",
      "صندوق الدعم مفعل",
      "صندوق پیام فعال",
      "Boîte de support activée",
      "Support-Postfach AN"
  ],
  "Работает автономно (No-Code)": [
      "Runs autonomously (No-Code)",
      "Funciona sin código (No-Code)",
      "免代码自主运行 (No-Code)",
      "يعمل تلقائياً بدون برمجة (No-Code)",
      "عملکرد خودکار بدون کدنویسی (No-Code)",
      "Fonctionne sans code (No-Code)",
      "Läuft autonom (No-Code)"
  ],
  "Открыть чат": [
      "Open Chat",
      "Abrir chat",
      "打开聊天",
      "فتح المحادثة",
      "باز کردن گفتگو",
      "Ouvrir le chat",
      "Chat öffnen"
  ],
  "Открыть чат с ботом": [
      "Open Chat with Bot",
      "Abrir chat con el bot",
      "打开与机器人的聊天",
      "فتح محادثة مع البوت",
      "باز کردن گفتگو با ربات",
      "Ouvrir le chat avec le bot",
      "Chat mit Bot öffnen"
  ],
  "Команды и автоответы": [
      "Commands & Auto-Replies",
      "Comandos y autorrespuestas",
      "命令与自动回复",
      "الأوامر والردود التلقائية",
      "دستورات و پاسخ‌های خودکار",
      "Commandes et réponses auto",
      "Befehle & Auto-Antworten"
  ],
  "«Команды и автоответы»": [
      "\"Commands & Auto-Replies\"",
      "«Comandos y autorrespuestas»",
      "“命令与自动回复”",
      "«الأوامر والردود التلقائية»",
      "«دستورات و پاسخ‌های خودکار»",
      "« Commandes et réponses auto »",
      "„Befehle & Auto-Antworten“"
  ],
  "Настроить команды": [
      "Configure Commands",
      "Configurar comandos",
      "配置命令",
      "إعداد الأوامر",
      "تنظیم دستورات",
      "Configurer les commandes",
      "Befehle konfigurieren"
  ],
  "Профиль": [
      "Profile",
      "Perfil",
      "资料",
      "الملف الشخصي",
      "پروفایل",
      "Profil",
      "Profil"
  ],
  "Профиль и статус": [
      "Profile & Status",
      "Perfil y estado",
      "资料与状态",
      "الملف والحالة",
      "پروفایل و وضعیت",
      "Profil et statut",
      "Profil & Status"
  ],
  "Тестирование (Ping)": [
      "Testing (Ping)",
      "Pruebas (Ping)",
      "测试 (Ping)",
      "الاختبار (Ping)",
      "تست (Ping)",
      "Test (Ping)",
      "Testen (Ping)"
  ],
  "Токен API": [
      "API Token",
      "Token API",
      "API 令牌",
      "رمز API",
      "توکن API",
      "Jeton API",
      "API-Token"
  ],
  "Секретный API-токен": [
      "Secret API Token",
      "Token API secreto",
      "机密 API 令牌",
      "رمز API السري",
      "توکن محرمانه API",
      "Jeton API secret",
      "Geheimer API-Token"
  ],
  "Секретный API-токен бота:": [
      "Bot Secret API Token:",
      "Token API secreto del bot:",
      "机器人机密 API 令牌：",
      "رمز API السري للبوت:",
      "توکن محرمانه API ربات:",
      "Jeton API secret du bot :",
      "Geheimer Bot-API-Token:"
  ],
  "Токен скопирован!": [
      "Token copied!",
      "¡Token copiado!",
      "令牌已复制！",
      "تم نسخ الرمز!",
      "توکن کپی شد!",
      "Jeton copié !",
      "Token kopiert!"
  ],
  "Скопировать токен": [
      "Copy Token",
      "Copiar token",
      "复制令牌",
      "نسخ الرمز",
      "کپی توکن",
      "Copier le jeton",
      "Token kopieren"
  ],
  "Назад к списку ботов": [
      "Back to bots list",
      "Volver a la lista de bots",
      "返回机器人列表",
      "العودة لقائمة البوتات",
      "بازگشت به لیست ربات‌ها",
      "Retour à la liste des bots",
      "Zurück zur Bot-Liste"
  ],
  "Удалить бота": [
      "Delete Bot",
      "Eliminar bot",
      "删除机器人",
      "حذف البوت",
      "حذف ربات",
      "Supprimer le bot",
      "Bot löschen"
  ],
  "Название бота *": [
      "Bot Name *",
      "Nombre del bot *",
      "机器人名称 *",
      "اسم البوت *",
      "نام ربات *",
      "Nom du bot *",
      "Bot-Name *"
  ],
  "Юзернейм бота *": [
      "Bot Username *",
      "Usuario del bot *",
      "机器人用户名 *",
      "معرف البوت *",
      "نام کاربری ربات *",
      "Nom d'utilisateur du bot *",
      "Bot-Benutzername *"
  ],
  "(обязательно оканчивается на bot)": [
      "(must end with 'bot')",
      "(debe terminar en 'bot')",
      "（必须以 bot 结尾）",
      "(يجب أن ينتهي بـ bot)",
      "(باید به bot ختم شود)",
      "(doit se terminer par 'bot')",
      "(muss auf 'bot' enden)"
  ],
  "Юзернейм обязан оканчиваться на bot или _bot": [
      "Username must end with 'bot' or '_bot'",
      "El usuario debe terminar en 'bot' o '_bot'",
      "用户名必须以 bot 或 _bot 结尾",
      "يجب أن ينتهي المعرف بـ bot أو _bot",
      "نام کاربری باید به bot یا _bot ختم شود",
      "Le nom d'utilisateur doit finir par 'bot' ou '_bot'",
      "Benutzername muss auf 'bot' oder '_bot' enden"
  ],
  "Например: Помощник заказов": [
      "E.g. Order Assistant",
      "Ej.: Asistente de pedidos",
      "例如：订单助手",
      "مثال: مساعد الطلبات",
      "مثلاً: دستیار سفارشات",
      "Ex. : Assistant commandes",
      "Z. B. Bestell-Assistent"
  ],
  "Например: my_shop_helper_bot": [
      "E.g. my_shop_helper_bot",
      "Ej.: mi_tienda_bot",
      "例如：my_shop_helper_bot",
      "مثال: my_shop_helper_bot",
      "مثلاً: my_shop_helper_bot",
      "Ex. : ma_boutique_bot",
      "Z. B. mein_shop_bot"
  ],
  "Опишите, какие функции выполняет бот...": [
      "Describe what this bot does...",
      "Describe qué funciones realiza el bot...",
      "描述该机器人的功能...",
      "صف وظائف هذا البوت...",
      "توضیح دهید ربات چه کاری انجام می‌دهد...",
      "Décrivez les fonctions du bot...",
      "Beschreiben Sie die Funktionen des Bots..."
  ],
  "Описание назначения": [
      "Bot Description",
      "Descripción del propósito",
      "用途描述",
      "وصف الغرض",
      "توضیحات کاربرد",
      "Description",
      "Funktionsbeschreibung"
  ],
  "URL аватара (опционально)": [
      "Avatar URL (optional)",
      "URL del avatar (opcional)",
      "头像 URL（可选）",
      "رابط الصورة الرمزية (اختياري)",
      "آدرس آواتار (اختیاری)",
      "URL de l'avatar (optionnel)",
      "Avatar-URL (optional)"
  ],
  "Разрешения сервисного токена (Scopes)": [
      "Service Token Scopes",
      "Permisos del token (Scopes)",
      "服务令牌权限 (Scopes)",
      "صلاحيات رمز الخدمة (Scopes)",
      "مجوزهای توکن سرویس (Scopes)",
      "Permissions du jeton (Scopes)",
      "Service-Token-Berechtigungen (Scopes)"
  ],
  "messages:send (Отправка сообщений)": [
      "messages:send (Send messages)",
      "messages:send (Enviar mensajes)",
      "messages:send (发送消息)",
      "messages:send (إرسال الرسائل)",
      "messages:send (ارسال پیام‌ها)",
      "messages:send (Envoi de messages)",
      "messages:send (Nachrichten senden)"
  ],
  "chats:read (Чтение входящих)": [
      "chats:read (Read incoming)",
      "chats:read (Leer entrantes)",
      "chats:read (读取收件箱)",
      "chats:read (قراءة الوارد)",
      "chats:read (خواندن پیام‌های دریافتی)",
      "chats:read (Lecture des messages)",
      "chats:read (Eingehende lesen)"
  ],
  "webhooks:manage (Вебхуки)": [
      "webhooks:manage (Webhooks)",
      "webhooks:manage (Webhooks)",
      "webhooks:manage (管理 Webhook)",
      "webhooks:manage (إدارة Webhooks)",
      "webhooks:manage (مدیریت وب‌هوک‌ها)",
      "webhooks:manage (Webhooks)",
      "webhooks:manage (Webhooks)"
  ],
  "invoices:create (Счета и оплата)": [
      "invoices:create (Invoices & payments)",
      "invoices:create (Facturas y pagos)",
      "invoices:create (账单与收款)",
      "invoices:create (الفواتير والدفع)",
      "invoices:create (فاکتورها و پرداخت)",
      "invoices:create (Factures et paiements)",
      "invoices:create (Rechnungen & Zahlung)"
  ],
  "Бот уже работает «из коробки» внутри мессенджера!": [
      "Your bot works out of the box inside the messenger!",
      "¡El bot ya funciona listo para usar dentro del mensajero!",
      "机器人已在应用内开箱即用！",
      "البوت يعمل فوراً داخل التطبيق دون إعداد خارجي!",
      "ربات همین حالا به صورت آماده در پیام‌رسان فعال است!",
      "Le bot fonctionne immédiatement dans la messagerie !",
      "Der Bot funktioniert sofort einsatzbereit im Messenger!"
  ],
  "Команды": [
      "Commands",
      "Los comandos",
      "命令",
      "الأوامر",
      "دستورات",
      "Les commandes",
      "Die Befehle"
  ],
  "уже активны без внешних серверов. Вы также можете настроить свои автоответы и режим обратной связи во вкладке": [
      "are already active without external servers. You can also configure custom auto-replies and support relay in the",
      "ya están activos sin servidores externos. También puedes configurar autorrespuestas y soporte en la pestaña",
      "无需外部服务器即可使用。您还可以在此标签页配置自定义自动回复与客服转发：",
      "نشطة بالفعل دون خوادم خارجية. يمكنك أيضاً ضبط الردود التلقائية في تبويب",
      "بدون نیاز به سرور خارجی فعال هستند. همچنین می‌توانید پاسخ‌های خودکار را در تب",
      "sont déjà actives sans serveur externe. Vous pouvez aussi configurer vos réponses auto dans l'onglet",
      "sind bereits ohne externe Server aktiv. Eigene Auto-Antworten konfigurieren Sie im Tab"
  ],
  "API-токен для внешних интеграций (опционально)": [
      "API Token for External Integrations (optional)",
      "Token API para integraciones externas (opcional)",
      "外部集成 API 令牌（可选）",
      "رمز API للتكاملات الخارجية (اختياري)",
      "توکن API برای اتصال خارجی (اختیاری)",
      "Jeton API pour intégrations externes (optionnel)",
      "API-Token für externe Integrationen (optional)"
  ],
  "Если вы планируете подключать внешний сервер по API, сохраните этот токен — он отображается": [
      "If you plan to connect an external server via API, save this token now — it is shown",
      "Si planeas conectar un servidor externo por API, guarda este token — se muestra",
      "如果您计划通过 API 连接外部服务器，请保存此令牌 — 它仅显示",
      "إذا كنت تخطط لربط خادم خارجي عبر API، فاحفظ هذا الرمز — يظهر",
      "اگر قصد اتصال سرور خارجی با API را دارید، این توکن را ذخیره کنید — فقط",
      "Si vous connectez un serveur externe via API, copiez ce jeton — il est affiché",
      "Wenn Sie einen externen Server per API anbinden, speichern Sie diesen Token — er wird"
  ],
  "ровно один раз": [
      "only once",
      "solo una vez",
      "仅此一次",
      "مرة واحدة فقط",
      "یک بار نمایش داده می‌شود",
      "une seule fois",
      "nur ein einziges Mal angezeigt"
  ],
  "Стандартные команды «из коробки» (активны автоматически)": [
      "Built-in standard commands (active automatically)",
      "Comandos estándar integrados (activos automáticamente)",
      "内置标准命令（自动激活）",
      "الأوامر القياسية المدمجة (نشطة تلقائياً)",
      "دستورات استاندارد پیش‌فرض (فعال به صورت خودکار)",
      "Commandes standard intégrées (actives automatiquement)",
      "Integrierte Standardbefehle (automatisch aktiv)"
  ],
  "Без серверов и кода": [
      "No servers or code required",
      "Sin servidores ni código",
      "无需服务器与代码",
      "بدون خوادم أو برمجة",
      "بدون نیاز به سرور و کد",
      "Sans serveur ni code",
      "Ohne Server und Code"
  ],
  "Приветствие и кнопки меню": [
      "Greeting & menu buttons",
      "Saludo y botones de menú",
      "欢迎语与菜单按钮",
      "الترحيب وأزرار القائمة",
      "پیام خوش‌آمدگویی و دکمه‌های منو",
      "Message d'accueil et menu",
      "Begrüßung & Menü-Buttons"
  ],
  "Список всех команд бота": [
      "List all bot commands",
      "Lista de comandos del bot",
      "所有机器人命令列表",
      "قائمة جميع أوامر البوت",
      "لیست تمام دستورات ربات",
      "Liste des commandes du bot",
      "Liste aller Bot-Befehle"
  ],
  "Ваш ID и ID текущего чата": [
      "Your ID and current chat ID",
      "Tu ID y el ID del chat actual",
      "您的 ID 与当前聊天 ID",
      "معرفك ومعرف المحادثة الحالية",
      "شناسه شما و شناسه گفتگوی فعلی",
      "Votre ID et l'ID du chat",
      "Ihre ID und aktuelle Chat-ID"
  ],
  "Проверка статуса бота": [
      "Check bot status",
      "Verificar estado del bot",
      "检查机器人状态",
      "فحص حالة البوت",
      "بررسی وضعیت ربات",
      "Vérifier le statut du bot",
      "Bot-Status prüfen"
  ],
  "Бросить игровой кубик 🎲": [
      "Roll a dice 🎲",
      "Lanzar un dado 🎲",
      "掷骰子 🎲",
      "رمي النرد 🎲",
      "انداختن تاس 🎲",
      "Lancer un dé 🎲",
      "Würfeln 🎲"
  ],
  "Подбросить монетку 🪙": [
      "Flip a coin 🪙",
      "Lanzar una moneda 🪙",
      "抛硬币 🪙",
      "رمي عملة 🪙",
      "شیر یا خط 🪙",
      "Lancer une pièce 🪙",
      "Münze werfen 🪙"
  ],
  "🚀 Старт": [
      "🚀 Start",
      "🚀 Inicio",
      "🚀 开始",
      "🚀 ابدأ",
      "🚀 شروع",
      "🚀 Démarrer",
      "🚀 Start"
  ],
  "📋 Помощь": [
      "📋 Help",
      "📋 Ayuda",
      "📋 帮助",
      "📋 مساعدة",
      "📋 راهنما",
      "📋 Aide",
      "📋 Hilfe"
  ],
  "🆔 Мой ID": [
      "🆔 My ID",
      "🆔 Mi ID",
      "🆔 我的 ID",
      "🆔 معرفي",
      "🆔 شناسه من",
      "🆔 Mon ID",
      "🆔 Meine ID"
  ],
  "🎲 Кубик": [
      "🎲 Dice",
      "🎲 Dado",
      "🎲 骰子",
      "🎲 نرد",
      "🎲 تاس",
      "🎲 Dé",
      "🎲 Würfel"
  ],
  "🪙 Монетка": [
      "🪙 Coin",
      "🪙 Moneda",
      "🪙 硬币",
      "🪙 عملة",
      "🪙 سکه",
      "🪙 Pièce",
      "🪙 Münze"
  ],
  "Режим «Бот обратной связи (Предложка / Саппорт)»": [
      "Support & Feedback Relay Mode",
      "Modo Bot de Soporte y Buzón",
      "“客服与反馈转发”模式",
      "وضع «بوت الدعم والاقتراحات»",
      "حالت «ربات پشتیبانی و ارتباط با ما»",
      "Mode « Bot de Support / Feedback »",
      "Modus „Support- & Feedback-Bot“"
  ],
  "Всё, что другие пользователи пишут вашему боту, автоматически пересылается вам. Чтобы ответить пользователю от имени бота — просто сделайте": [
      "Everything users send to your bot is automatically forwarded to you. To reply as the bot, simply use",
      "Todo lo que los usuarios escriban a tu bot se te reenviará automáticamente. Para responder en nombre del bot, simplemente usa",
      "其他用户发送给机器人的所有消息都会自动转发给您。若要以机器人身份回复，只需对转发消息点击",
      "كل ما يكتبه المستخدمون للبوت يُحول إليك تلقائياً. للرد باسم البوت، استخدم فقط",
      "هر پیامی که کاربران به ربات بفرستند به طور خودکار برای شما هدایت می‌شود. برای پاسخ از طرف ربات کافیست روی پیام",
      "Tout ce que les utilisateurs écrivent au bot vous est transféré. Pour répondre au nom du bot, faites simplement",
      "Alles, was Nutzer Ihrem Bot schreiben, wird automatisch an Sie weitergeleitet. Um als Bot zu antworten, nutzen Sie einfach"
  ],
  "Ответить (Reply)": [
      "Reply",
      "Responder (Reply)",
      "回复 (Reply)",
      "رد (Reply)",
      "پاسخ (Reply)",
      "Répondre (Reply)",
      "Antworten (Reply)"
  ],
  "на пересланное сообщение!": [
      "on the forwarded message!",
      "en el mensaje reenviado!",
      "即可！",
      "على الرسالة المحولة!",
      "بزنید!",
      "sur le message transféré !",
      "auf die weitergeleitete Nachricht!"
  ],
  "Текст приветствия по команде": [
      "Greeting message for command",
      "Texto de bienvenida para el comando",
      "命令欢迎语文本",
      "نص الترحيب للأمر",
      "متن خوش‌آمدگویی دستور",
      "Texte d'accueil pour la commande",
      "Begrüßungstext für Befehl"
  ],
  "Переменные:": [
      "Variables:",
      "Variables:",
      "可用变量：",
      "المتغيرات:",
      "متغیرها:",
      "Variables :",
      "Variablen:"
  ],
  "Свои команды и автоответы (": [
      "Custom commands & auto-replies (",
      "Comandos personalizados y autorrespuestas (",
      "自定义命令与自动回复 (",
      "الأوامر المخصصة والردود التلقائية (",
      "دستورات و پاسخ‌های سفارشی (",
      "Commandes personnalisées et réponses auto (",
      "Eigene Befehle & Auto-Antworten ("
  ],
  "Появляются в меню /start и /help": [
      "Displayed in /start and /help menus",
      "Aparecen en los menús /start y /help",
      "显示在 /start 和 /help 菜单中",
      "تظهر في قائمتي /start و /help",
      "در منوی /start و /help نمایش داده می‌شوند",
      "Affichées dans les menus /start et /help",
      "Erscheinen im /start- und /help-Menü"
  ],
  "+ Добавить команду (например: /faq, /price, /rules, /contacts)": [
      "+ Add command (e.g. /faq, /price, /rules, /contacts)",
      "+ Añadir comando (ej.: /faq, /price, /rules, /contacts)",
      "+ 添加命令（例如：/faq, /price, /rules, /contacts）",
      "+ إضافة أمر (مثال: /faq, /price, /rules, /contacts)",
      "+ افزودن دستور (مثلاً: /faq، /price، /rules)",
      "+ Ajouter une commande (ex. : /faq, /price, /rules)",
      "+ Befehl hinzufügen (z. B. /faq, /price, /rules)"
  ],
  "Команда (например: faq или /price)": [
      "Command (e.g. faq or /price)",
      "Comando (ej.: faq o /price)",
      "命令（例如：faq 或 /price）",
      "الأمر (مثال: faq أو /price)",
      "دستور (مثلاً: faq یا /price)",
      "Commande (ex. : faq ou /price)",
      "Befehl (z. B. faq oder /price)"
  ],
  "Краткое описание для меню (напр. Прайс-лист)": [
      "Short menu description (e.g. Price list)",
      "Breve descripción para el menú (ej. Lista de precios)",
      "菜单简短描述（例如：价目表）",
      "وصف مختصر للقائمة (مثال: قائمة الأسعار)",
      "توضیح کوتاه برای منو (مثلاً: لیست قیمت)",
      "Brève description (ex. : Tarifs)",
      "Kurzbeschreibung fürs Menü (z. B. Preisliste)"
  ],
  "Текст ответа бота при вызове команды... (поддерживает {name}, {id}, {bot_name})": [
      "Bot auto-reply text when command is triggered... (supports {name}, {id}, {bot_name})",
      "Texto de respuesta del bot al ejecutar el comando... (soporta {name}, {id}, {bot_name})",
      "触发命令时机器人的回复内容...（支持 {name}, {id}, {bot_name}）",
      "نص رد البوت عند استدعاء الأمر... (يدعم {name}, {id}, {bot_name})",
      "متن پاسخ ربات هنگام اجرای دستور... (پشتیبانی از {name}، {id}، {bot_name})",
      "Texte de réponse du bot... (supporte {name}, {id}, {bot_name})",
      "Antworttext des Bots beim Aufruf... (unterstützt {name}, {id}, {bot_name})"
  ],
  "Инлайн-кнопки под сообщением (опционально):": [
      "Inline buttons under message (optional):",
      "Botones integrados bajo el mensaje (opcional):",
      "消息下方内联按钮（可选）：",
      "أزرار تفاعلية أسفل الرسالة (اختياري):",
      "دکمه‌های شیشه‌ای زیر پیام (اختیاری):",
      "Boutons inline sous le message (optionnel) :",
      "Inline-Buttons unter der Nachricht (optional):"
  ],
  "Текст кнопки": [
      "Button label",
      "Texto del botón",
      "按钮文字",
      "نص الزر",
      "متن دکمه",
      "Texte du bouton",
      "Button-Text"
  ],
  "Вызвать команду": [
      "Trigger command",
      "Ejecutar comando",
      "触发命令",
      "تنفيذ أمر",
      "اجرای دستور",
      "Appeler une commande",
      "Befehl ausführen"
  ],
  "Открыть ссылку": [
      "Open URL",
      "Abrir enlace",
      "打开链接",
      "فتح رابط",
      "باز کردن لینک",
      "Ouvrir un lien",
      "Link öffnen"
  ],
  "+ Кнопка": [
      "+ Button",
      "+ Botón",
      "+ 按钮",
      "+ زر",
      "+ دکمه",
      "+ Bouton",
      "+ Button"
  ],
  "Добавить команду в список": [
      "Add command to list",
      "Añadir comando a la lista",
      "将命令添加到列表",
      "إضافة الأمر إلى القائمة",
      "افزودن دستور به لیست",
      "Ajouter la commande à la liste",
      "Befehl zur Liste hinzufügen"
  ],
  "Удалить команду": [
      "Delete command",
      "Eliminar comando",
      "删除命令",
      "حذف الأمر",
      "حذف دستور",
      "Supprimer la commande",
      "Befehl löschen"
  ],
  "Сохранить команды и автоответы": [
      "Save Commands & Auto-Replies",
      "Guardar comandos y autorrespuestas",
      "保存命令与自动回复",
      "حفظ الأوامر والردود التلقائية",
      "ذخیره دستورات و پاسخ‌های خودکار",
      "Enregistrer les commandes et réponses",
      "Befehle & Auto-Antworten speichern"
  ],
  "Отображаемое имя": [
      "Display Name",
      "Nombre visible",
      "显示名称",
      "الاسم المعروض",
      "نام نمایشی",
      "Nom d'affichage",
      "Anzeigename"
  ],
  "Описание бота": [
      "Bot Description",
      "Descripción del bot",
      "机器人描述",
      "وصف البوت",
      "توضیحات ربات",
      "Description du bot",
      "Bot-Beschreibung"
  ],
  "URL аватара": [
      "Avatar URL",
      "URL del avatar",
      "头像 URL",
      "رابط الصورة الرمزية",
      "آدرس آواتار",
      "URL de l'avatar",
      "Avatar-URL"
  ],
  "Статус активности бота": [
      "Bot Active Status",
      "Estado de actividad del bot",
      "机器人运行状态",
      "حالة نشاط البوت",
      "وضعیت فعالیت ربات",
      "Statut d'activité du bot",
      "Aktivitätsstatus des Bots"
  ],
  "Бот принимает сообщения и обрабатывает события": [
      "Bot is receiving messages and processing events",
      "El bot recibe mensajes y procesa eventos",
      "机器人正在接收消息并处理事件",
      "البوت يستقبل الرسائل ويعالج الأحداث",
      "ربات پیام‌ها را دریافت و رویدادها را پردازش می‌کند",
      "Le bot reçoit les messages et traite les événements",
      "Bot empfängt Nachrichten und verarbeitet Ereignisse"
  ],
  "Бот временно отключен": [
      "Bot is temporarily paused",
      "El bot está temporalmente desactivado",
      "机器人已暂时停用",
      "البوت متوقف مؤقتاً",
      "ربات موقتاً غیرفعال است",
      "Le bot est temporairement désactivé",
      "Bot ist vorübergehend deaktiviert"
  ],
  "Разрешить добавление в группы": [
      "Allow adding to groups",
      "Permitir añadir a grupos",
      "允许添加到群组",
      "السماح بالإضافة إلى المجموعات",
      "اجازه افزودن به گروه‌ها",
      "Autoriser l'ajout aux groupes",
      "Hinzufügen zu Gruppen erlauben"
  ],
  "Пользователи смогут добавлять этого бота в групповые чаты": [
      "Users will be able to invite this bot to group chats",
      "Los usuarios podrán añadir este bot a chats grupales",
      "用户可以把此机器人添加到群聊中",
      "سيتمكن المستخدمون من إضافة هذا البوت إلى المحادثات الجماعية",
      "کاربران می‌توانند این ربات را به گفتگوهای گروهی اضافه کنند",
      "Les utilisateurs pourront ajouter ce bot aux groupes",
      "Nutzer können diesen Bot zu Gruppenchats hinzufügen"
  ],
  "Сохранить профиль": [
      "Save Profile",
      "Guardar perfil",
      "保存资料",
      "حفظ الملف",
      "ذخیره پروفایل",
      "Enregistrer le profil",
      "Profil speichern"
  ],
  "Outgoing Webhook (Доставка входящих событий)": [
      "Outgoing Webhook (Event Delivery)",
      "Outgoing Webhook (Entrega de eventos)",
      "Outgoing Webhook（事件推送）",
      "Outgoing Webhook (تسليم الأحداث الواردة)",
      "وب‌هوک خروجی (ارسال رویدادهای دریافتی)",
      "Webhook sortant (Livraison d'événements)",
      "Ausgehender Webhook (Ereigniszustellung)"
  ],
  "Сервер Boltalka будет отправлять HTTP POST запросы на указанный URL при каждом новом сообщении, нажатии инлайн-кнопки или оплате счета.": [
      "Gossip server will send signed HTTP POST requests to this URL on every new message, inline button click, or invoice payment.",
      "El servidor enviará peticiones HTTP POST firmadas a esta URL con cada mensaje, clic de botón o pago.",
      "每当收到新消息、点击内联按钮或完成账单支付时，服务器都会向此 URL 发送 HTTP POST 请求。",
      "سيرسل الخادم طلبات HTTP POST موقعة إلى هذا الرابط عند كل رسالة أو ضغطة زر أو دفع فاتورة.",
      "سرور در هر پیام جدید، کلیک روی دکمه شیشه‌ای یا پرداخت فاکتور، درخواست HTTP POST به این آدرس می‌فرستد.",
      "Le serveur enverra des requêtes HTTP POST signées à cette URL à chaque message, clic ou paiement.",
      "Der Server sendet bei jeder neuen Nachricht, jedem Button-Klick oder jeder Zahlung HTTP-POST-Anfragen an diese URL."
  ],
  "Secret Token (HMAC ключ подписи)": [
      "Secret Token (HMAC Signing Key)",
      "Secret Token (Clave de firma HMAC)",
      "Secret Token (HMAC 签名密钥)",
      "الرمز السري (مفتاح توقيع HMAC)",
      "توکن محرمانه (کلید امضای HMAC)",
      "Secret Token (Clé de signature HMAC)",
      "Secret Token (HMAC-Signaturschlüssel)"
  ],
  "Секретный ключ для проверки подписи X-Gossip-Signature": [
      "Secret key used to verify the X-Gossip-Signature header",
      "Clave secreta para verificar la firma X-Gossip-Signature",
      "用于验证 X-Gossip-Signature 签名的密钥",
      "المفتاح السري للتحقق من توقيع X-Gossip-Signature",
      "کلید محرمانه برای بررسی امضای X-Gossip-Signature",
      "Clé secrète pour vérifier l'en-tête X-Gossip-Signature",
      "Geheimer Schlüssel zur Prüfung von X-Gossip-Signature"
  ],
  "Сгенерировать случайный": [
      "Generate random",
      "Generar aleatorio",
      "随机生成",
      "توليد عشوائي",
      "تولید تصادفی",
      "Générer aléatoirement",
      "Zufällig generieren"
  ],
  "Удалить Webhook": [
      "Delete Webhook",
      "Eliminar Webhook",
      "删除 Webhook",
      "حذف Webhook",
      "حذف وب‌هوک",
      "Supprimer le Webhook",
      "Webhook löschen"
  ],
  "Сохранить Webhook": [
      "Save Webhook",
      "Guardar Webhook",
      "保存 Webhook",
      "حفظ Webhook",
      "ذخیره وب‌هوک",
      "Enregistrer le Webhook",
      "Webhook speichern"
  ],
  "Диагностика и замер задержки вебхука (Ping & Test)": [
      "Webhook Latency Diagnostics (Ping & Test)",
      "Diagnóstico y latencia del Webhook (Ping & Test)",
      "Webhook 延迟诊断与测试 (Ping & Test)",
      "تشخيص وقياس استجابة الويب هوك (Ping & Test)",
      "بررسی و تست تاخیر وب‌هوک (Ping & Test)",
      "Diagnostic et latence du Webhook (Ping & Test)",
      "Webhook-Diagnose & Latenzmessung (Ping & Test)"
  ],
  "Отправляет тестовое диагностическое событие на зарегистрированный URL вебхука бота и замеряет точное время ответа внешнего сервера.": [
      "Sends a signed diagnostic test event to the registered webhook URL and measures the exact response latency of your external server.",
      "Envía un evento de prueba al URL del webhook registrado y mide el tiempo exacto de respuesta del servidor.",
      "向已注册的 Webhook URL 发送诊断测试事件，并测量外部服务器的准确响应时间。",
      "يرسل حدث اختبار تشخيصي إلى رابط الويب هوك المسجل ويقيس زمن استجابة الخادم الخارجي بدقة.",
      "یک رویداد آزمایشی به آدرس وب‌هوک ثبت‌شده ارسال کرده و زمان دقیق پاسخ سرور خارجی را می‌سنجد.",
      "Envoie un événement de test à l'URL du webhook et mesure le temps de réponse exact du serveur externe.",
      "Sendet ein Diagnose-Testereignis an die registrierte Webhook-URL und misst die genaue Antwortzeit."
  ],
  "Текущий зарегистрированный URL:": [
      "Currently registered URL:",
      "URL registrada actualmente:",
      "当前已注册 URL：",
      "الرابط المسجل حالياً:",
      "آدرس ثبت‌شده فعلی:",
      "URL actuellement enregistrée :",
      "Aktuell registrierte URL:"
  ],
  "Не настроен": [
      "Not configured",
      "No configurado",
      "未配置",
      "غير مهيأ",
      "تنظیم نشده",
      "Non configuré",
      "Nicht konfiguriert"
  ],
  "Отправка тестового запроса...": [
      "Sending test ping...",
      "Enviando petición de prueba...",
      "正在发送测试请求...",
      "جاري إرسال طلب الاختبار...",
      "در حال ارسال درخواست آزمایشی...",
      "Envoi de la requête de test...",
      "Testanfrage wird gesendet..."
  ],
  "Проверить вебхук (Ping & Test)": [
      "Test Webhook (Ping & Test)",
      "Probar Webhook (Ping & Test)",
      "测试 Webhook (Ping & Test)",
      "اختبار الويب هوك (Ping & Test)",
      "تست وب‌هوک (Ping & Test)",
      "Tester le Webhook (Ping & Test)",
      "Webhook testen (Ping & Test)"
  ],
  "Префикс активного токена:": [
      "Active token prefix:",
      "Prefijo del token activo:",
      "当前活跃令牌前缀：",
      "بادئة الرمز النشط:",
      "پیشوند توکن فعال:",
      "Préfixe du jeton actif :",
      "Präfix des aktiven Tokens:"
  ],
  "Полный токен не хранится на сервере в открытом виде (используется SHA-256 хэширование).": [
      "The full token is never stored in plaintext on the server (only its SHA-256 hash is kept).",
      "El token completo nunca se guarda en texto plano en el servidor (solo su hash SHA-256).",
      "服务器不以明文形式存储完整令牌（仅保存 SHA-256 哈希）。",
      "لا يتم تخزين الرمز الكامل كنص واضح على الخادم (يُستخدم تشفير SHA-256).",
      "توکن کامل هرگز به صورت متنی در سرور ذخیره نمی‌شود (از هش SHA-256 استفاده می‌شود).",
      "Le jeton complet n'est jamais stocké en clair sur le serveur (hachage SHA-256).",
      "Der vollständige Token wird niemals im Klartext auf dem Server gespeichert (SHA-256-Hash)."
  ],
  "Ротация API-токена": [
      "API Token Rotation",
      "Rotación del Token API",
      "API 令牌轮换",
      "تدوير رمز API",
      "چرخش توکن API",
      "Rotation du jeton API",
      "API-Token-Rotation"
  ],
  "Если токен был скомпрометирован, нажмите кнопку ниже для мгновенного отзыва старого токена и выпуска нового.": [
      "If your token was compromised, click below to immediately revoke the old token and issue a new one.",
      "Si tu token fue comprometido, pulsa abajo para revocar el anterior de inmediato y emitir uno nuevo.",
      "如果令牌泄露，请点击下方按钮立即撤销旧令牌并签发新令牌。",
      "إذا تم اختراق الرمز، اضغط أدناه لإلغاء الرمز القديم فوراً وإصدار رمز جديد.",
      "اگر توکن شما لو رفته است، برای ابطال فوری توکن قدیمی و صدور توکن جدید دکمه زیر را بزنید.",
      "Si le jeton est compromis, cliquez ci-dessous pour révoquer l'ancien et en émettre un nouveau.",
      "Falls der Token kompromittiert wurde, klicken Sie unten, um ihn sofort zu widerrufen und einen neuen auszustellen."
  ],
  "Перевыпустить токен (Ротация)": [
      "Rotate & Reissue Token",
      "Reemitir token (Rotación)",
      "重新签发令牌（轮换）",
      "إعادة إصدار الرمز (تدوير)",
      "صدور مجدد توکن (چرخش)",
      "Régénérer le jeton (Rotation)",
      "Token neu ausstellen (Rotation)"
  ],
  "🤖 Нажмите /start для запуска бота": [
      "🤖 Tap /start to launch the bot",
      "🤖 Toca /start para iniciar el bot",
      "🤖 点击 /start 启动机器人",
      "🤖 اضغط /start لبدء البوت",
      "🤖 برای شروع ربات روی /start بزنید",
      "🤖 Appuyez sur /start pour lancer le bot",
      "🤖 Tippen Sie auf /start, um den Bot zu starten"
  ],
  "🤖 Команды бота:": [
      "🤖 Bot commands:",
      "🤖 Comandos del bot:",
      "🤖 机器人命令：",
      "🤖 أوامر البوت:",
      "🤖 دستورات ربات:",
      "🤖 Commandes du bot :",
      "🤖 Bot-Befehle:"
  ],
  "Максимальные возможности мессенджера": [
      "Unlock the Full Power of Gossip",
      "Máximas capacidades del mensajero",
      "解锁即时通讯全部潜能",
      "أقصى إمكانيات تطبيق المراسلة",
      "حداکثر امکانات پیام‌رسان",
      "Toutes les capacités de la messagerie",
      "Maximale Möglichkeiten des Messengers"
  ],
  "Удвойте свою продуктивность": [
      "Double your security and productivity",
      "Duplica tu productividad y seguridad",
      "效率与隐私保护翻倍",
      "ضاعف إنتاجيتك وأمانك",
      "بهره‌وری و امنیت خود را دو برابر کنید",
      "Doublez votre productivité",
      "Verdoppeln Sie Ihre Produktivität"
  ],
  "Ложный PIN («Двойное дно»)": [
      "Duress PIN (\"Double Bottom\")",
      "PIN de coacción («Doble fondo»)",
      "胁迫 PIN 码（“双重空间”）",
      "رمز PIN المزدوج («القاع المزدوج»)",
      "پین فریب («کف دوجداره»)",
      "Code PIN leurre (« Double fond »)",
      "Täuschungs-PIN („Doppelter Boden“)"
  ],
  "При принудительной разблокировке открывает безобидные чаты-приманки или мгновенно стирает локальные ключи.": [
      "Under coerced unlock, opens harmless decoy chats or immediately wipes local cryptographic keys.",
      "En caso de desbloqueo forzado, abre chats señuelo inofensivos o borra al instante las claves locales.",
      "在遭受胁迫解锁时，打开无害的诱饵聊天或立即擦除本地加密密钥。",
      "عند الإجبار على فتح القفل، يفتح محادثات تمويهية أو يمسح المفاتيح المحلية فوراً.",
      "در صورت باز کردن اجباری، گفتگوهای پوششی بی‌خطر را باز کرده یا کلیدهای محلی را فوراً پاک می‌کند.",
      "En cas de déverrouillage sous contrainte, ouvre des discussions leurres ou efface les clés locales.",
      "Öffnet bei erzwungenem Entsperren harmlose Tarn-Chats oder löscht sofort lokale Schlüssel."
  ],
  "DSP-модулятор голоса (Web Audio API)": [
      "Real-Time DSP Voice Changer (Web Audio API)",
      "Modulador de voz DSP (Web Audio API)",
      "实时 DSP 变声器 (Web Audio API)",
      "مغير الصوت الرقمي DSP (Web Audio API)",
      "تغییردهنده صدای DSP (Web Audio API)",
      "Modulateur de voix DSP (Web Audio API)",
      "DSP-Stimmenverzerrer (Web Audio API)"
  ],
  "🎙️ Аппаратный DSP-модулятор голоса (Web Audio API)": [
      "🎙️ Hardware DSP Voice Changer (Web Audio API)",
      "🎙️ Modulador de voz DSP por hardware (Web Audio API)",
      "🎙️ 硬件级 DSP 实时变声器 (Web Audio API)",
      "🎙️ مغير الصوت الرقمي DSP (Web Audio API)",
      "🎙️ ماژول تغییر صدای DSP (Web Audio API)",
      "🎙️ Modulateur vocal DSP matériel (Web Audio API)",
      "🎙️ Hardware-DSP-Stimmenverzerrer (Web Audio API)"
  ],
  "Изменение тембра голоса в реальном времени до шифрования: Аноним, Киберпанк, Радиостудия, Гелий.": [
      "Real-time voice timbre modulation prior to encryption: Anonymous, Cyberpunk, Studio Broadcast, Helium.",
      "Modulación del timbre de voz en tiempo real antes del cifrado: Anónimo, Cyberpunk, Estudio, Helio.",
      "加密前实时改变声音音色：匿名深沉、赛博朋克、广播电台、氦气高音。",
      "تغيير نبرة الصوت بالوقت الفعلي قبل التشفير: مجهول، سايبربانك، استوديو، هيليوم.",
      "تغییر طنین صدا در لحظه پیش از رمزنگاری: ناشناس، سایبرپانک، استودیو رادیویی، هلیوم.",
      "Modification du timbre vocal en temps réel avant chiffrement : Anonyme, Cyberpunk, Studio, Hélium.",
      "Echtzeit-Stimmmodulation vor der Verschlüsselung: Anonym, Cyberpunk, Radiostudio, Helium."
  ],
  "Автосброс при неактивности («Периметр»)": [
      "Dead Man's Switch (\"Perimeter\")",
      "Autoborrado por inactividad («Perímetro»)",
      "失联自动销毁（“死手系统”）",
      "المسح التلقائي عند عدم النشاط («المحيط»)",
      "حذف خودکار در عدم فعالیت («پریمتر»)",
      "Auto-destruction d'inactivité (« Périmètre »)",
      "Inaktivitäts-Reset („Perimeter“)"
  ],
  "Автоматическое уничтожение облачного сейфа ключей и переписки, если вы не выходите на связь 7–180 дней.": [
      "Automatically destroys your cloud key vault and chat links if you don't sign in for 7–180 days.",
      "Destrucción automática de la bóveda de claves y chats si no te conectas entre 7 y 180 días.",
      "若您在 7–180 天内未上线，将自动销毁云端密钥保险库与聊天记录。",
      "تدمير تلقائي لخزنة المفاتيح السحابية والمحادثات في حال غيابك لمدة 7–180 يوماً.",
      "نابودی خودکار گاوصندوق کلیدها و گفتگوها در صورت عدم اتصال بین ۷ تا ۱۸۰ روز.",
      "Destruction automatique du coffre de clés cloud et des discussions après 7 à 180 jours d'inactivité.",
      "Automatische Vernichtung des Cloud-Schlüsseltresors und der Chats nach 7–180 Tagen Inaktivität."
  ],
  "Одноразовые Burner-ссылки (Web-to-App)": [
      "One-Time Burner Links (Web-to-App)",
      "Enlaces Burner de un solo uso (Web-to-App)",
      "一次性阅后即焚链接 (Web-to-App)",
      "روابط الغرف المؤقتة أحادية الاستخدام (Web-to-App)",
      "لینک‌های یک‌بارمصرف Burner (Web-to-App)",
      "Liens éphémères Burner (Web-to-App)",
      "Einmal-Burner-Links (Web-to-App)"
  ],
  "Самоуничтожающиеся E2EE-комнаты по ссылке для гостей без регистрации с кнопкой мгновенного сжигания.": [
      "Self-destructing E2EE rooms accessible via link for guests without registration, with an instant Burn button.",
      "Salas E2EE autodestructibles por enlace para invitados sin registro, con botón de destrucción instantánea.",
      "无需注册即可通过链接加入的自毁型端到端加密房间，配备一键焚毁按钮。",
      "غرف مشفرة ذاتية التدمير عبر رابط للضيوف بدون تسجيل مع زر إحراق فوري.",
      "اتاق‌های رمزنگاری‌شده خودتخریب‌گر با لینک برای مهمانان بدون ثبت‌نام همراه با دکمه سوزاندن فوری.",
      "Salons E2EE auto-destructibles par lien pour invités sans inscription avec bouton de destruction immédiate.",
      "Selbstzerstörende E2EE-Räume per Link für Gäste ohne Registrierung mit Sofort-Verbrennen-Button."
  ],
  "Неограниченные закрепления": [
      "Unlimited Pinned Messages",
      "Mensajes fijados ilimitados",
      "无限制置顶消息",
      "رسائل مثبتة غير محدودة",
      "سنجاق کردن نامحدود پیام‌ها",
      "Messages épinglés illimités",
      "Unbegrenzte angeheftete Nachrichten"
  ],
  "Закрепляйте сколько угодно важных сообщений и циклически переключайтесь между ними.": [
      "Pin as many important messages as you need and cycle through them effortlessly.",
      "Fija tantos mensajes importantes como quieras y navega entre ellos.",
      "置顶任意数量的重要消息并在它们之间快速切换。",
      "ثبّت أي عدد من الرسائل المهمة وتنقل بينها بسهولة.",
      "هر تعداد پیام مهم را سنجاق کنید و به سرعت بین آن‌ها جابجا شوید.",
      "Épinglez autant de messages importants que souhaité et naviguez entre eux.",
      "Heften Sie beliebig viele wichtige Nachrichten an und wechseln Sie zwischen ihnen."
  ],
  "Безлимитная расшифровка AI Whisper": [
      "Unlimited AI Whisper Voice-to-Text",
      "Transcripción ilimitada con IA Whisper",
      "无限次 AI Whisper 语音转文字",
      "تحويل غير محدود للصوت إلى نص بالذكاء الاصطناعي Whisper",
      "تبدیل نامحدود صدا به متن با هوش مصنوعی Whisper",
      "Transcription IA Whisper illimitée",
      "Unbegrenzte KI-Whisper-Transkription"
  ],
  "Мгновенное распознавание любых голосовых и видео-сообщений без ограничений длины.": [
      "Instant speech-to-text transcription for any voice or video note without duration limits.",
      "Reconocimiento instantáneo de cualquier mensaje de voz o video sin límite de duración.",
      "不限时长，瞬间将任何语音和视频消息转换为文字。",
      "تحويل فوري لأي رسائل صوتية أو مرئية إلى نص دون قيود على المدة.",
      "تشخیص فوری گفتار تمام پیام‌های صوتی و ویدیویی بدون محدودیت زمان.",
      "Reconnaissance instantanée de tous les messages vocaux et vidéo sans limite de durée.",
      "Sofortige Spracherkennung für alle Sprach- und Videonachrichten ohne Längenbegrenzung."
  ],
  "Расширенные папки чатов": [
      "Advanced Chat Folders",
      "Carpetas de chat avanzadas",
      "高级聊天文件夹",
      "مجلدات محادثات متقدمة",
      "پوشه‌های پیشرفته گفتگو",
      "Dossiers de discussions avancés",
      "Erweiterte Chat-Ordner"
  ],
  "Создавайте до 20 кастомных папок с умной фильтрацией и закреплением до 100 чатов.": [
      "Create up to 20 custom folders with smart filtering, DLP policies, and up to 100 pinned chats.",
      "Crea hasta 20 carpetas personalizadas con filtrado inteligente y hasta 100 chats fijados.",
      "创建最多 20 个自定义文件夹，支持智能过滤与 100 个置顶聊天。",
      "أنشئ حتى 20 مجلداً مخصصاً مع تصفية ذكية وتثبيت حتى 100 محادثة.",
      "ساخت تا ۲۰ پوشه سفارشی با فیلتر هوشمند و سنجاق کردن تا ۱۰۰ گفتگو.",
      "Créez jusqu'à 20 dossiers personnalisés avec filtrage intelligent et 100 chats épinglés.",
      "Erstellen Sie bis zu 20 eigene Ordner mit intelligenter Filterung und bis zu 100 Chats."
  ],
  "Турбо-загрузка файлов до 4 ГБ": [
      "Turbo File Uploads up to 4 GB",
      "Carga turbo de archivos hasta 4 GB",
      "支持高达 4 GB 的极速文件传输",
      "رفع فائق السرعة للملفات حتى 4 جيجابايت",
      "آپلود توربو فایل‌ها تا ۴ گیگابایت",
      "Envoi turbo de fichiers jusqu'à 4 Go",
      "Turbo-Dateiupload bis 4 GB"
  ],
  "Максимальная скорость отдачи и скачивания зашифрованных медиа и документов.": [
      "Maximum upload and download priority for encrypted media and large documents.",
      "Velocidad máxima de subida y descarga para medios y documentos cifrados.",
      "加密媒体与大型文档享受最高上传和下载速度。",
      "أقصى سرعة لرفع وتنزيل الوسائط والمستندات المشفرة.",
      "حداکثر سرعت آپلود و دانلود رسانه‌ها و اسناد رمزنگاری‌شده.",
      "Vitesse maximale d'envoi et de téléchargement pour vos médias et documents chiffrés.",
      "Maximale Upload- und Download-Geschwindigkeit für verschlüsselte Medien und Dokumente."
  ],
  "Золотая звезда Premium ⭐": [
      "Golden Premium Star ⭐",
      "Estrella dorada Premium ⭐",
      "尊贵金星徽章 ⭐",
      "نجمة بريميوم الذهبية ⭐",
      "ستاره طلایی پریمیوم ⭐",
      "Étoile d'or Premium ⭐",
      "Goldener Premium-Stern ⭐"
  ],
  "Статусный значок рядом с вашим именем в списке чатов, профиле и сообщениях.": [
      "Distinguished status badge next to your name in chat lists, profiles, and messages.",
      "Insignia de estado junto a tu nombre en la lista de chats, perfil y mensajes.",
      "在聊天列表、个人资料和消息中显示专属星标。",
      "شارة مميزة بجانب اسمك في قائمة المحادثات والملف الشخصي والرسائل.",
      "نشان ویژه در کنار نام شما در لیست گفتگوها، پروفایل و پیام‌ها.",
      "Badge de statut à côté de votre nom dans les discussions, le profil et les messages.",
      "Status-Abzeichen neben Ihrem Namen in Chatlisten, Profil und Nachrichten."
  ],
  "Выгодно -35%": [
      "Save 35%",
      "Ahorra -35%",
      "立省 35%",
      "وفر 35%",
      "۳۵٪ تخفیف",
      "Économisez 35 %",
      "35 % sparen"
  ],
  "430 ₽ / мес": [
      "430 ₽ / mo",
      "430 ₽ / mes",
      "430 ₽ / 月",
      "430 ₽ / شهر",
      "430 ₽ / ماه",
      "430 ₽ / mois",
      "430 ₽ / Mon."
  ],
  "332 ₽ / мес": [
      "332 ₽ / mo",
      "332 ₽ / mes",
      "332 ₽ / 月",
      "332 ₽ / شهر",
      "332 ₽ / ماه",
      "332 ₽ / mois",
      "332 ₽ / Mon."
  ],
  "⭐ Активен (Gossip PRO)": [
      "⭐ Active (Gossip PRO)",
      "⭐ Activo (Gossip PRO)",
      "⭐ 已激活 (Gossip PRO)",
      "⭐ نشط (Gossip PRO)",
      "⭐ فعال (Gossip PRO)",
      "⭐ Actif (Gossip PRO)",
      "⭐ Aktiv (Gossip PRO)"
  ],
  "Базовый тариф": [
      "Free Tier",
      "Plan básico",
      "基础版",
      "الباقة الأساسية",
      "طرح پایه",
      "Offre de base",
      "Basistarif"
  ],
  "Текущий статус:": [
      "Current status:",
      "Estado actual:",
      "当前状态：",
      "الحالة الحالية:",
      "وضعیت فعلی:",
      "Statut actuel :",
      "Aktueller Status:"
  ],
  "Подписка активна": [
      "Subscription active",
      "Suscripción activa",
      "订阅已激活",
      "الاشتراك نشط",
      "اشتراک فعال است",
      "Abonnement actif",
      "Abonnement aktiv"
  ],
  "Выберите период подписки:": [
      "Select subscription period:",
      "Selecciona el periodo de suscripción:",
      "选择订阅周期：",
      "اختر مدة الاشتراك:",
      "دوره اشتراک را انتخاب کنید:",
      "Choisissez la durée d'abonnement :",
      "Abonnementzeitraum wählen:"
  ],
  "Способ оплаты:": [
      "Payment method:",
      "Método de pago:",
      "支付方式：",
      "طريقة الدفع:",
      "روش پرداخت:",
      "Mode de paiement :",
      "Zahlungsmethode:"
  ],
  "СБП, Карты РФ (ЮKassa) и Блокчейн TON": [
      "Fast Payment System, Bank Cards & TON Blockchain",
      "Tarjetas bancarias y Blockchain TON",
      "银行卡 (YooKassa) 与 TON 区块链",
      "البطاقات المصرفية وبلوكتشين TON",
      "کارت‌های بانکی و بلاکچین TON",
      "Cartes bancaires et Blockchain TON",
      "Bankkarten & TON-Blockchain"
  ],
  "СБП / Карты РФ": [
      "Bank Cards / SBP",
      "Tarjetas / SBP",
      "银行卡 / 快速支付",
      "البطاقات المصرفية / SBP",
      "کارت بانکی / SBP",
      "Cartes / SBP",
      "Bankkarten / SBP"
  ],
  "ЮKassa (МИР, SberPay)": [
      "YooKassa (Cards, SberPay)",
      "YooKassa (Tarjetas, SberPay)",
      "YooKassa (银行卡, SberPay)",
      "YooKassa (البطاقات، SberPay)",
      "YooKassa (کارت، SberPay)",
      "YooKassa (Cartes, SberPay)",
      "YooKassa (Karten, SberPay)"
  ],
  "Блокчейн TON": [
      "TON Blockchain",
      "Blockchain TON",
      "TON 区块链",
      "بلوكتشين TON",
      "بلاکچین TON",
      "Blockchain TON",
      "TON-Blockchain"
  ],
  "Оплата через TON / USDT": [
      "Pay with TON / USDT",
      "Pago con TON / USDT",
      "使用 TON / USDT 支付",
      "الدفع عبر TON / USDT",
      "پرداخت با TON / USDT",
      "Paiement via TON / USDT",
      "Zahlung per TON / USDT"
  ],
  "Оплатить": [
      "Pay",
      "Pagar",
      "支付",
      "ادفع",
      "پرداخت",
      "Payer",
      "Bezahlen"
  ],
  "(СБП / Карты РФ / SberPay)": [
      "(Cards / SBP / SberPay)",
      "(Tarjetas / SBP / SberPay)",
      "(银行卡 / SBP / SberPay)",
      "(البطاقات / SBP / SberPay)",
      "(کارت / SBP / SberPay)",
      "(Cartes / SBP / SberPay)",
      "(Karten / SBP / SberPay)"
  ],
  "через TON (Tonkeeper / @wallet)": [
      "via TON (Tonkeeper / @wallet)",
      "con TON (Tonkeeper / @wallet)",
      "通过 TON (Tonkeeper / @wallet)",
      "عبر TON (Tonkeeper / @wallet)",
      "از طریق TON (Tonkeeper / @wallet)",
      "via TON (Tonkeeper / @wallet)",
      "per TON (Tonkeeper / @wallet)"
  ],
  "Оплатить мгновенно через TON (Tonkeeper / @wallet)": [
      "Pay Instantly with TON (Tonkeeper / @wallet)",
      "Pagar al instante con TON (Tonkeeper / @wallet)",
      "使用 TON 立即支付 (Tonkeeper / @wallet)",
      "ادفع فوراً عبر TON (Tonkeeper / @wallet)",
      "پرداخت فوری با TON (Tonkeeper / @wallet)",
      "Payer instantanément via TON (Tonkeeper / @wallet)",
      "Sofort bezahlen per TON (Tonkeeper / @wallet)"
  ],
  "Отправьте точную сумму на адрес ниже с обязательным указанием комментария (Memo).": [
      "Send the exact amount to the address below and make sure to include the required Memo comment.",
      "Envía el importe exacto a la dirección indicada incluyendo obligatoriamente el comentario (Memo).",
      "请向下方地址发送准确金额，并务必填写备注 (Memo)。",
      "أرسل المبلغ المحدد إلى العنوان أدناه مع ضرورة كتابة التعليق (Memo).",
      "مبلغ دقیق را به آدرس زیر همراه با کامنت الزامی (Memo) ارسال کنید.",
      "Envoyez le montant exact à l'adresse ci-dessous en incluant impérativement le commentaire (Memo).",
      "Senden Sie den genauen Betrag an die untenstehende Adresse und geben Sie unbedingt den Memo-Kommentar an."
  ],
  "Отсканируйте в Tonkeeper или @wallet": [
      "Scan in Tonkeeper or @wallet",
      "Escanea en Tonkeeper o @wallet",
      "使用 Tonkeeper 或 @wallet 扫码",
      "امسح الرمز في Tonkeeper أو @wallet",
      "در Tonkeeper یا @wallet اسکن کنید",
      "Scannez dans Tonkeeper ou @wallet",
      "In Tonkeeper oder @wallet scannen"
  ],
  "Адрес получателя (TON):": [
      "Recipient address (TON):",
      "Dirección de destino (TON):",
      "收款地址 (TON)：",
      "عنوان المستلم (TON):",
      "آدرس گیرنده (TON):",
      "Adresse du destinataire (TON) :",
      "Empfängeradresse (TON):"
  ],
  "⚠️ Комментарий (Memo) — Обязательно:": [
      "⚠️ Memo / Comment — Required:",
      "⚠️ Comentario (Memo) — Obligatorio:",
      "⚠️ 备注 (Memo) — 必填：",
      "⚠️ التعليق (Memo) — إلزامي:",
      "⚠️ کامنت (Memo) — الزامی:",
      "⚠️ Commentaire (Memo) — Obligatoire :",
      "⚠️ Kommentar (Memo) — Erforderlich:"
  ],
  "🚀 Открыть в Tonkeeper (Веб / App)": [
      "🚀 Open in Tonkeeper (Web / App)",
      "🚀 Abrir en Tonkeeper (Web / App)",
      "🚀 在 Tonkeeper 中打开 (Web / App)",
      "🚀 فتح في Tonkeeper (ويب / تطبيق)",
      "🚀 باز کردن در Tonkeeper (وب / اپ)",
      "🚀 Ouvrir dans Tonkeeper (Web / App)",
      "🚀 In Tonkeeper öffnen (Web / App)"
  ],
  "Копировать ссылку": [
      "Copy Link",
      "Copiar enlace",
      "复制链接",
      "نسخ الرابط",
      "کپی لینک",
      "Copier le lien",
      "Link kopieren"
  ],
  "← Выбрать другой способ оплаты": [
      "← Choose another payment method",
      "← Elegir otro método de pago",
      "← 选择其他支付方式",
      "← اختيار طريقة دفع أخرى",
      "← انتخاب روش پرداخت دیگر",
      "← Choisir un autre mode de paiement",
      "← Andere Zahlungsmethode wählen"
  ],
  "Ожидание поступления транзакции в сети TON...": [
      "Waiting for transaction confirmation on TON blockchain...",
      "Esperando confirmación de la transacción en la red TON...",
      "正在等待 TON 链上交易确认...",
      "في انتظار تأكيد المعاملة على شبكة TON...",
      "در انتظار تأیید تراکنش در شبکه TON...",
      "En attente de la transaction sur le réseau TON...",
      "Warte auf Transaktionseingang im TON-Netzwerk..."
  ],
  "Открыть Спец-арсенал (Ложный PIN, Голос DSP, Burner-ссылки, Периметр)": [
      "Open Special Arsenal (Duress PIN, Voice DSP, Burner Links, Perimeter)",
      "Abrir Arsenal Especial (PIN falso, Voz DSP, Enlaces Burner, Perímetro)",
      "打开特种安全武器库（胁迫 PIN、变声 DSP、阅后即焚链接、死手系统）",
      "فتح الترسانة الخاصة (PIN المزدوج، مغير الصوت، روابط Burner، المحيط)",
      "باز کردن زرادخانه ویژه (پین فریب، تغییر صدا، لینک‌های Burner، پریمتر)",
      "Ouvrir l'Arsenal Spécial (PIN leurre, Voix DSP, Liens Burner, Périmètre)",
      "Spezial-Arsenal öffnen (Täuschungs-PIN, Sprach-DSP, Burner-Links, Perimeter)"
  ],
  "Формирование счета в ЮKassa...": [
      "Creating YooKassa invoice...",
      "Generando factura en YooKassa...",
      "正在生成支付账单...",
      "جاري إنشاء فاتورة الدفع...",
      "در حال ایجاد فاکتور پرداخت...",
      "Création de la facture...",
      "Rechnung wird erstellt..."
  ],
  "Генерация ордера в блокчейне TON...": [
      "Generating TON blockchain order...",
      "Generando orden en la blockchain TON...",
      "正在生成 TON 链上订单...",
      "جاري إنشاء طلب على بلوكتشين TON...",
      "در حال تولید سفارش در بلاکچین TON...",
      "Génération de l'ordre sur la blockchain TON...",
      "TON-Blockchain-Auftrag wird erstellt..."
  ],
  "Безопасная оплата без комиссий • Мгновенная активация": [
      "Zero-fee secure checkout • Instant activation",
      "Pago seguro sin comisiones • Activación instantánea",
      "零手续费安全支付 • 即时激活",
      "دفع آمن بدون عمولة • تفعيل فوري",
      "پرداخت امن بدون کارمزد • فعال‌سازی فوری",
      "Paiement sécurisé sans frais • Activation immédiate",
      "Sichere Zahlung ohne Gebühren • Sofortige Aktivierung"
  ],
  "Спец-арсенал Gossip": [
      "Gossip Special Security Arsenal",
      "Arsenal Especial de Gossip",
      "Gossip 特种安全武器库",
      "الترسانة الأمنية الخاصة Gossip",
      "زرادخانه امنیتی ویژه Gossip",
      "Arsenal de Sécurité Spécial Gossip",
      "Gossip Spezial-Sicherheitsarsenal"
  ],
  "Анти-форензика, двойное дно, модуляция голоса и одноразовые E2EE-комнаты": [
      "Anti-forensics, duress decoy vault, voice DSP modulation & self-destructing E2EE rooms",
      "Antiforense, doble fondo, modulación de voz y salas E2EE autodestructibles",
      "反取证、双重隐私空间、实时变声与一次性自毁加密房间",
      "مكافحة التحليل الجنائي، القاع المزدوج، تعديل الصوت وغرف التشفير المؤقتة",
      "ضد فارنزیک، کف دوجداره، تغییر صدا و اتاق‌های یک‌بارمصرف رمزنگاری‌شده",
      "Anti-forensique, double fond, modulation vocale et salons E2EE éphémères",
      "Anti-Forensik, doppelter Boden, Stimmmodulation und selbstzerstörende E2EE-Räume"
  ],
  "Эксклюзивно в Gossip Premium:": [
      "Exclusive to Gossip Premium:",
      "Exclusivo en Gossip Premium:",
      "Gossip Premium 专属特权：",
      "حصرياً في Gossip Premium:",
      "انحصاری در Gossip Premium:",
      "Exclusif à Gossip Premium :",
      "Exklusiv in Gossip Premium:"
  ],
  "активируйте подписку, чтобы разблокировать все спец-инструменты.": [
      "activate your subscription to unlock all special security tools.",
      "activa tu suscripción para desbloquear todas las herramientas especiales.",
      "激活订阅即可解锁所有特种安全工具。",
      "فعّل اشتراكك لفتح جميع الأدوات الأمنية الخاصة.",
      "برای باز کردن تمام ابزارهای امنیتی ویژه، اشتراک خود را فعال کنید.",
      "activez votre abonnement pour débloquer tous les outils spéciaux.",
      "aktivieren Sie Ihr Abo, um alle Spezialwerkzeuge freizuschalten."
  ],
  "Ложный PIN": [
      "Duress PIN",
      "PIN falso",
      "胁迫 PIN",
      "PIN مزدوج",
      "پین فریب",
      "PIN leurre",
      "Täuschungs-PIN"
  ],
  "Голос (DSP)": [
      "Voice (DSP)",
      "Voz (DSP)",
      "变声 (DSP)",
      "الصوت (DSP)",
      "صدا (DSP)",
      "Voix (DSP)",
      "Stimme (DSP)"
  ],
  "Автосброс": [
      "Auto-Wipe",
      "Autoborrado",
      "自动销毁",
      "مسح تلقائي",
      "حذف خودکار",
      "Auto-reset",
      "Auto-Reset"
  ],
  "Burner-ссылки": [
      "Burner Links",
      "Enlaces Burner",
      "焚毁链接",
      "روابط Burner",
      "لینک‌های Burner",
      "Liens Burner",
      "Burner-Links"
  ],
  "🕵️ Ложный PIN-код («Двойное дно»)": [
      "🕵️ Duress PIN Code (\"Double Bottom\")",
      "🕵️ Código PIN de coacción («Doble fondo»)",
      "🕵️ 胁迫 PIN 码（“双重空间”）",
      "🕵️ رمز PIN للتمويه («القاع المزدوج»)",
      "🕵️ پین‌کد فریب («کف دوجداره»)",
      "🕵️ Code PIN leurre (« Double fond »)",
      "🕵️ Täuschungs-PIN-Code („Doppelter Boden“)"
  ],
  "Если вас принуждают разблокировать мессенджер, введите ложный PIN-код на экране входа. Вместо реальных чатов откроется безобидная витрина заметок (или выполнится экстренная зачистка локальных ключей).": [
      "If you are coerced into unlocking the messenger, enter your Duress PIN on the lock screen. Instead of real chats, a harmless notes workspace will open (or local keys will be emergency-wiped).",
      "Si te obligan a desbloquear el mensajero, introduce el PIN falso. En lugar de tus chats reales, se abrirán notas cotidianas inofensivas (o se borrarán las claves locales).",
      "当被迫解锁应用时，在锁屏输入胁迫 PIN 码。系统将展示无害的日常便签界面（或立即擦除本地加密密钥），隐藏真实聊天。",
      "إذا أُجبرت على فتح التطبيق، أدخل رمز PIN المزدوج. ستظهر ملاحظات يومية بريئة بدلاً من محادثاتك الحقيقية (أو يتم مسح المفاتيح فوراً).",
      "اگر مجبور به باز کردن پیام‌رسان شدید، پین فریب را وارد کنید. به جای گفتگوهای واقعی، یادداشت‌های روزمره بی‌خطر باز می‌شود (یا کلیدهای محلی فوراً پاک می‌شوند).",
      "Si l'on vous force à déverrouiller l'application, entrez le code PIN leurre. Des notes anodines s'afficheront à la place de vos vrais chats (ou les clés locales seront effacées).",
      "Wenn Sie zum Entsperren gezwungen werden, geben Sie den Täuschungs-PIN ein. Statt echter Chats werden harmlose Notizen geöffnet (oder lokale Schlüssel sofort gelöscht)."
  ],
  "Режим срабатывания при вводе ложного PIN:": [
      "Trigger action when Duress PIN is entered:",
      "Modo de acción al ingresar el PIN falso:",
      "输入胁迫 PIN 码时的触发动作：",
      "إجراء التفعيل عند إدخال رمز PIN المزدوج:",
      "حالت عملکرد هنگام ورود پین فریب:",
      "Action déclenchée par le PIN leurre :",
      "Aktion bei Eingabe des Täuschungs-PINs:"
  ],
  "🎭 Чаты-приманки (Скрытие)": [
      "🎭 Decoy Chats (Stealth Mask)",
      "🎭 Chats señuelo (Ocultación)",
      "🎭 诱饵聊天（伪装隐藏）",
      "🎭 محادثات تمويهية (إخفاء)",
      "🎭 گفتگوهای پوششی (پنهان‌سازی)",
      "🎭 Discussions leurres (Masquage)",
      "🎭 Tarn-Chats (Verbergen)"
  ],
  "Реальная база остается зашифрованной. Показываются бытовые заметки и покупки.": [
      "Real database stays encrypted. Everyday notes and shopping lists are shown.",
      "La base real permanece cifrada. Se muestran notas cotidianas y compras.",
      "真实数据库保持加密状态，仅显示日常购物清单与便签。",
      "تبقى قاعدة البيانات الحقيقية مشفرة وتظهر ملاحظات يومية عادية.",
      "پایگاه داده واقعی رمزنگاری‌شده باقی می‌ماند و یادداشت‌های روزمره نمایش داده می‌شود.",
      "La vraie base reste chiffrée. Des notes quotidiennes et listes de courses s'affichent.",
      "Die echte Datenbank bleibt verschlüsselt. Es werden Alltagsnotizen und Einkaufslisten gezeigt."
  ],
  "💥 Выжженная земля (Wipe)": [
      "💥 Scorched Earth (Emergency Wipe)",
      "💥 Tierra quemada (Borrado total)",
      "💥 焦土模式（紧急擦除）",
      "💥 الأرض المحروقة (مسح شامل)",
      "💥 زمین سوخته (پاکسازی کامل)",
      "💥 Terre brûlée (Effacement)",
      "💥 Verbrannte Erde (Wipe)"
  ],
  "Мгновенно уничтожить файл локальной БД OPFS/IndexedDB и открыть чистый профиль.": [
      "Immediately destroy local OPFS/IndexedDB database files and open a blank profile.",
      "Destruye al instante la base de datos local OPFS/IndexedDB y abre un perfil limpio.",
      "立即销毁本地 OPFS/IndexedDB 数据库文件并打开空白资料。",
      "تدمير فوري لقاعدة البيانات المحلية OPFS/IndexedDB وفتح ملف فارغ.",
      "نابودی فوری فایل پایگاه داده محلی OPFS/IndexedDB و باز کردن پروفایل خام.",
      "Détruire immédiatement la base locale OPFS/IndexedDB et ouvrir un profil vierge.",
      "Lokale OPFS/IndexedDB-Datenbank sofort vernichten und leeres Profil öffnen."
  ],
  "Задать новый ложный PIN-код:": [
      "Set new Duress PIN:",
      "Establecer nuevo PIN falso:",
      "设置新的胁迫 PIN 码：",
      "تعيين رمز PIN مزدوج جديد:",
      "تعیین پین‌کد فریب جدید:",
      "Définir un nouveau PIN leurre :",
      "Neuen Täuschungs-PIN festlegen:"
  ],
  "Придумайте ложный PIN-код (4–8 цифр):": [
      "Create a Duress PIN code (4–8 digits):",
      "Crea un código PIN falso (4–8 dígitos):",
      "设置胁迫 PIN 码（4–8 位数字）：",
      "أنشئ رمز PIN مزدوج (4–8 أرقام):",
      "یک پین‌کد فریب بسازید (۴ تا ۸ رقم):",
      "Créez un code PIN leurre (4–8 chiffres) :",
      "Täuschungs-PIN erstellen (4–8 Ziffern):"
  ],
  "Например: 9999": [
      "E.g. 9999",
      "Ej.: 9999",
      "例如：9999",
      "مثال: 9999",
      "مثلاً: 9999",
      "Ex. : 9999",
      "Z. B. 9999"
  ],
  "Отключить ложный PIN": [
      "Disable Duress PIN",
      "Desactivar PIN falso",
      "禁用胁迫 PIN 码",
      "تعطيل رمز PIN المزدوج",
      "غیرفعال کردن پین فریب",
      "Désactiver le PIN leurre",
      "Täuschungs-PIN deaktivieren"
  ],
  "Обработка голоса происходит локально на вашем устройстве до шифрования AES-GCM-256. На сервере и у получателя не остается исходной дорожки.": [
      "Voice DSP processing happens locally on your device prior to AES-GCM-256 encryption. Neither the server nor the recipient ever receives the original voice track.",
      "El procesamiento de voz ocurre localmente en tu dispositivo antes del cifrado AES-GCM-256. Ni el servidor ni el destinatario reciben la pista original.",
      "语音变声在本地设备完成，随后再进行 AES-GCM-256 加密。服务器与接收方均无法获取原始声纹。",
      "تتم معالجة الصوت محلياً على جهازك قبل تشفير AES-GCM-256. لا يصل التسجيل الأصلي للخادم أو المستلم.",
      "پردازش صدا به صورت محلی روی دستگاه شما پیش از رمزنگاری AES-GCM-256 انجام می‌شود و صدای اصلی هرگز ارسال نمی‌گردد.",
      "Le traitement vocal s'effectue localement avant le chiffrement AES-GCM-256. Ni le serveur ni le destinataire n'ont la piste originale.",
      "Die Sprachverarbeitung erfolgt lokal auf Ihrem Gerät vor der AES-GCM-256-Verschlüsselung. Weder Server noch Empfänger erhalten die Originalspur."
  ],
  "Оригинал (Без эффектов)": [
      "Original (No effects)",
      "Original (Sin efectos)",
      "原声（无特效）",
      "الأصلي (بدون مؤثرات)",
      "اصلی (بدون افکت)",
      "Original (Sans effet)",
      "Original (Ohne Effekte)"
  ],
  "Обычный": [
      "Normal",
      "Normal",
      "原声",
      "عادي",
      "معمولی",
      "Normal",
      "Normal"
  ],
  "🎙️ Обычный голос": [
      "🎙️ Normal voice",
      "🎙️ Voz normal",
      "🎙️ 正常原声",
      "🎙️ صوت عادي",
      "🎙️ صدای معمولی",
      "🎙️ Voix normale",
      "🎙️ Normale Stimme"
  ],
  "Естественный голос с микрофона без тембральной модуляции.": [
      "Natural microphone voice without pitch or formant modulation.",
      "Voz natural del micrófono sin modulación de timbre.",
      "麦克风原始自然声音，无音色调制。",
      "صوت الميكروفون الطبيعي بدون تعديل النبرة.",
      "صدای طبیعی میکروفون بدون تغییر طنین.",
      "Voix naturelle du microphone sans modulation.",
      "Natürliche Mikrofonstimme ohne Modulation."
  ],
  "Аноним (Низкий тембр)": [
      "Anonymous (Deep Pitch)",
      "Anónimo (Tono grave)",
      "匿名者（深沉低音）",
      "مجهول (نبرة عميقة)",
      "ناشناس (صدای بم)",
      "Anonyme (Voix grave)",
      "Anonym (Tiefe Stimme)"
  ],
  "🕵️ Аноним (Низкий тембр)": [
      "🕵️ Anonymous (Deep Pitch)",
      "🕵️ Anónimo (Tono grave)",
      "🕵️ 匿名者（深沉低音）",
      "🕵️ مجهول (نبرة عميقة)",
      "🕵️ ناشناس (صدای بم)",
      "🕵️ Anonyme (Voix grave)",
      "🕵️ Anonym (Tiefe Stimme)"
  ],
  "Аноним": [
      "Anon",
      "Anónimo",
      "匿名",
      "مجهول",
      "ناشناس",
      "Anonyme",
      "Anonym"
  ],
  "Сдвиг высоты тона вниз (-4.5 полутона) с маскировкой формант голоса.": [
      "Pitch shifted down (-4.5 semitones) with vocal formant masking.",
      "Desplazamiento de tono hacia abajo (-4.5 semitonos) con enmascaramiento de formantes.",
      "音调下移（-4.5 半音）并掩蔽声道共振峰。",
      "خفض طبقة الصوت (-4.5 نصف نغمة) مع إخفاء البصمة الصوتية.",
      "کاهش زیر و بمی صدا (-4.5 نیم‌پرده) همراه با پوشش فرمنت‌های صوتی.",
      "Abaissement de la hauteur (-4,5 demi-tons) avec masquage des formants.",
      "Tonhöhenverschiebung nach unten (-4,5 Halbtöne) mit Formantenmaskierung."
  ],
  "Киберпанк (Синтезатор)": [
      "Cyberpunk (Synthesizer)",
      "Cyberpunk (Sintetizador)",
      "赛博朋克（合成器）",
      "سايبربانك (مركب صوتي)",
      "سایبرپانک (سینت‌سایزر)",
      "Cyberpunk (Synthétiseur)",
      "Cyberpunk (Synthesizer)"
  ],
  "🤖 Киберпанк (Синтезатор)": [
      "🤖 Cyberpunk (Synthesizer)",
      "🤖 Cyberpunk (Sintetizador)",
      "🤖 赛博朋克（合成器）",
      "🤖 سايبربانك (مركب صوتي)",
      "🤖 سایبرپانک (سینت‌سایزر)",
      "🤖 Cyberpunk (Synthétiseur)",
      "🤖 Cyberpunk (Synthesizer)"
  ],
  "Кибер": [
      "Cyber",
      "Cyber",
      "赛博",
      "سايبر",
      "سایبر",
      "Cyber",
      "Cyber"
  ],
  "Кольцевая модуляция (Ring Modulator 55 Гц) с металлическим резонансом.": [
      "55 Hz Ring Modulator with robotic metallic resonance.",
      "Modulación en anillo (55 Hz) con resonancia metálica.",
      "55 Hz 环形调制器配合金属共鸣音效。",
      "تعديل حلقي (55 هرتز) مع رنين معدني آلي.",
      "مدولاسیون حلقه‌ای (۵۵ هرتز) با رزونانس فلزی رباتیک.",
      "Modulation en anneau (55 Hz) avec résonance métallique.",
      "Ringmodulation (55 Hz) mit metallischer Resonanz."
  ],
  "Радиостудия (Broadcast)": [
      "Radio Studio (Broadcast)",
      "Estudio de Radio (Broadcast)",
      "广播演播室 (Broadcast)",
      "استوديو راديو (Broadcast)",
      "استودیو رادیویی (Broadcast)",
      "Studio Radio (Broadcast)",
      "Radiostudio (Broadcast)"
  ],
  "📻 Радиостудия (Broadcast)": [
      "📻 Radio Studio (Broadcast)",
      "📻 Estudio de Radio (Broadcast)",
      "📻 广播演播室 (Broadcast)",
      "📻 استوديو راديو (Broadcast)",
      "📻 استودیو رادیویی (Broadcast)",
      "📻 Studio Radio (Broadcast)",
      "📻 Radiostudio (Broadcast)"
  ],
  "Студия": [
      "Studio",
      "Estudio",
      "演播室",
      "استوديو",
      "استودیو",
      "Studio",
      "Studio"
  ],
  "Ламповая компрессия, плотный бас и срезание комнатного гула.": [
      "Warm tube compression, rich bass boost, and room rumble cut.",
      "Compresión de válvulas, graves densos y filtro de ruido ambiental.",
      "电子管温暖压缩、浑厚低音并消除环境底噪。",
      "ضغط صوتي دافئ، جهير عميق وإزالة ضوضاء الغرفة.",
      "کمپرسور لامپی گرم، بیس قوی و حذف نویز محیط.",
      "Compression à lampes, basses profondes et réduction du bruit ambiant.",
      "Röhrenkompression, satter Bass und Unterdrückung von Raumhall."
  ],
  "Высокий (Гелий)": [
      "High Pitch (Helium)",
      "Agudo (Helio)",
      "高音（氦气）",
      "طبقة عالية (هيليوم)",
      "صدای زیر (هلیوم)",
      "Aigu (Hélium)",
      "Hoch (Helium)"
  ],
  "⚡ Высокий (Гелий)": [
      "⚡ High Pitch (Helium)",
      "⚡ Agudo (Helio)",
      "⚡ 高音（氦气）",
      "⚡ طبقة عالية (هيليوم)",
      "⚡ صدای زیر (هلیوم)",
      "⚡ Aigu (Hélium)",
      "⚡ Hoch (Helium)"
  ],
  "Гелий": [
      "Helium",
      "Helio",
      "氦气",
      "هيليوم",
      "هلیوم",
      "Hélium",
      "Helium"
  ],
  "Сдвиг высоты тона вверх (+5 полутонов) с осветлением спектра.": [
      "Pitch shifted up (+5 semitones) with spectral brightening.",
      "Desplazamiento de tono hacia arriba (+5 semitonos) con brillo espectral.",
      "音调上移（+5 半音）并提亮高频频谱。",
      "رفع طبقة الصوت (+5 نصف نغمة) مع تفتيح الطيف الصوتي.",
      "افزایش زیر و بمی صدا (+5 نیم‌پرده) با شفاف‌سازی طیف.",
      "Élévation de la hauteur (+5 demi-tons) avec éclaircissement spectral.",
      "Tonhöhenverschiebung nach oben (+5 Halbtöne) mit Spektralaufhellung."
  ],
  "DSP-модулятор голоса (нажмите для смены тембра)": [
      "DSP Voice Changer (tap to switch voice preset)",
      "Modulador de voz DSP (toca para cambiar timbre)",
      "DSP 变声器（点击切换音色）",
      "مغير الصوت DSP (انقر لتغيير النبرة)",
      "تغییردهنده صدای DSP (برای تغییر طنین ضربه بزنید)",
      "Modulateur vocal DSP (appuyez pour changer de timbre)",
      "DSP-Stimmenverzerrer (tippen zum Wechseln)"
  ],
  "⏱️ Система «Периметр» (Автосброс при неактивности)": [
      "⏱️ \"Perimeter\" Dead Man's Switch (Inactivity Auto-Wipe)",
      "⏱️ Sistema «Perímetro» (Autoborrado por inactividad)",
      "⏱️ “死手系统”（失联自动销毁）",
      "⏱️ نظام «المحيط» (المسح التلقائي عند عدم النشاط)",
      "⏱️ سیستم «پریمتر» (حذف خودکار در صورت عدم فعالیت)",
      "⏱️ Système « Périmètre » (Auto-destruction d'inactivité)",
      "⏱️ System „Perimeter“ (Automatischer Inaktivitäts-Reset)"
  ],
  "Если вы не открываете Gossip дольше выбранного срока, сервер автоматически уничтожит ваш облачный сейф ключей, пре-ключи X3DH/Kyber и связки чатов.": [
      "If you do not open Gossip for longer than the selected period, the server will automatically destroy your cloud key vault, X3DH/Kyber prekeys, and chat memberships.",
      "Si no abres Gossip durante el plazo elegido, el servidor destruirá automáticamente tu bóveda de claves, preclaves X3DH/Kyber y vínculos de chat.",
      "若您超过设定时间未打开 Gossip，服务器将自动销毁您的云端密钥库、X3DH/Kyber 预密钥及聊天关联。",
      "إذا لم تفتح التطبيق للمدة المحددة، سيدمر الخادم تلقائياً خزنة مفاتيحك السحابية ومفاتيح X3DH/Kyber وروابط المحادثات.",
      "اگر بیش از مدت انتخابی وارد Gossip نشوید، سرور به طور خودکار گاوصندوق ابری کلیدها، پیش‌کلیدهای X3DH/Kyber و ارتباطات گفتگو را نابود می‌کند.",
      "Si vous n'ouvrez pas Gossip pendant la durée choisie, le serveur détruira automatiquement votre coffre de clés, vos pré-clés X3DH/Kyber et vos liaisons de chats.",
      "Wenn Sie Gossip länger als den gewählten Zeitraum nicht öffnen, vernichtet der Server automatisch Ihren Cloud-Schlüsseltresor, X3DH/Kyber-Prekeys und Chat-Verknüpfungen."
  ],
  "Таймер неактивности:": [
      "Inactivity timer:",
      "Temporizador de inactividad:",
      "失联计时器：",
      "مؤقت عدم النشاط:",
      "تایمر عدم فعالیت:",
      "Minuteur d'inactivité :",
      "Inaktivitäts-Timer:"
  ],
  "Протокол уничтожения:": [
      "Destruction protocol:",
      "Protocolo de destrucción:",
      "销毁协议：",
      "بروتوكول التدمير:",
      "پروتکل امحا:",
      "Protocole de destruction :",
      "Vernichtungsprotokoll:"
  ],
  "Полная зачистка профиля": [
      "Full Account Purge",
      "Purga completa del perfil",
      "彻底清除账户资料",
      "تطهير شامل للحساب",
      "پاکسازی کامل پروفایل",
      "Purge complète du profil",
      "Vollständige Profilbereinigung"
  ],
  "Удаление облачного сейфа ключей, X3DH прекеев, всех чатов и обнуление аватара.": [
      "Deletes cloud key vault, X3DH prekeys, all chat memberships, and resets avatar.",
      "Elimina la bóveda de claves, preclaves X3DH, todos los chats y restablece el avatar.",
      "删除云端密钥库、X3DH 预密钥、所有聊天记录并重置头像。",
      "حذف خزنة المفاتيح السحابية ومفاتيح X3DH وجميع المحادثات والصورة الرمزية.",
      "حذف گاوصندوق ابری کلیدها، پیش‌کلیدهای X3DH، تمام گفتگوها و آواتار.",
      "Suppression du coffre cloud, des pré-clés X3DH, de tous les chats et de l'avatar.",
      "Löscht Cloud-Schlüsseltresor, X3DH-Prekeys, alle Chats und setzt den Avatar zurück."
  ],
  "Сброс переписки и ключей": [
      "Wipe Chats & Keys Only",
      "Borrar chats y claves",
      "仅清除聊天与密钥",
      "مسح المحادثات والمفاتيح فقط",
      "پاکسازی گفتگوها و کلیدها",
      "Effacer discussions et clés",
      "Chats & Schlüssel zurücksetzen"
  ],
  "Уничтожение связей чатов и крипто-сейфа при сохранении учетной записи.": [
      "Destroys chat links and crypto vault while preserving your username.",
      "Destruye los vínculos de chat y la bóveda criptográfica manteniendo la cuenta.",
      "销毁所有聊天关联与加密保险库，但保留账户用户名。",
      "تدمير روابط المحادثات والخزنة المشفرة مع الاحتفاظ بالحساب.",
      "نابودی ارتباطات گفتگو و گاوصندوق رمزنگاری با حفظ حساب کاربری.",
      "Destruction des liaisons de chats et du coffre crypto tout en conservant le compte.",
      "Vernichtet Chat-Verknüpfungen und Krypto-Tresor unter Beibehaltung des Kontos."
  ],
  "Расчетная дата срабатывания без входа в сеть:": [
      "Estimated trigger date if offline:",
      "Fecha estimada de activación sin conexión:",
      "若未上线预计触发日期：",
      "تاريخ التفعيل المتوقع في حال عدم الاتصال:",
      "تاریخ تخمینی اجرا در صورت عدم ورود:",
      "Date de déclenchement estimée sans connexion :",
      "Voraussichtliches Auslösedatum ohne Login:"
  ],
  "Сохранить настройки «Периметра»": [
      "Save Perimeter Settings",
      "Guardar ajustes de «Perímetro»",
      "保存“死手系统”设置",
      "حفظ إعدادات «المحيط»",
      "ذخیره تنظیمات «پریمتر»",
      "Enregistrer les paramètres « Périmètre »",
      "„Perimeter“-Einstellungen speichern"
  ],
  "🔥 Одноразовые Burner-ссылки (Самоуничтожающиеся комнаты)": [
      "🔥 One-Time Burner Links (Self-Destructing Rooms)",
      "🔥 Enlaces Burner de un solo uso (Salas autodestructibles)",
      "🔥 一次性阅后即焚链接（自毁加密房间）",
      "🔥 روابط الغرف المؤقتة Burner (ذاتية التدمير)",
      "🔥 لینک‌های یک‌بارمصرف Burner (اتاق‌های خودتخریب‌گر)",
      "🔥 Liens éphémères Burner (Salons auto-destructibles)",
      "🔥 Einmal-Burner-Links (Selbstzerstörende Räume)"
  ],
  "Создайте ссылку для приватного разговора. Собеседник сможет войти даже из обычного браузера без регистрации. После завершения беседы нажмите «Сжечь», и комната исчезнет навсегда.": [
      "Create a link for an off-the-record conversation. Your peer can join directly from any browser without registration. Click \"Burn\" when done to permanently vaporize the room.",
      "Crea un enlace para una conversación privada. Tu interlocutor podrá entrar desde cualquier navegador sin registrarse. Al terminar, pulsa «Quemar» y la sala desaparecerá para siempre.",
      "创建私密对话链接。对方无需注册即可通过普通浏览器直接加入。通话结束后点击“焚毁”，房间将永久消失。",
      "أنشئ رابطاً لمحادثة خاصة. يمكن للطرف الآخر الدخول من أي متصفح دون تسجيل. بعد الانتهاء اضغط «إحراق» وستختفي الغرفة للأبد.",
      "یک لینک برای گفتگوی خصوصی بسازید. طرف مقابل حتی با مرورگر عادی و بدون ثبت‌نام می‌تواند وارد شود. پس از پایان روی «سوزاندن» بزنید تا اتاق برای همیشه محو شود.",
      "Créez un lien pour une discussion privée. Votre interlocuteur peut rejoindre depuis un simple navigateur sans inscription. Cliquez sur « Brûler » pour tout effacer.",
      "Erstellen Sie einen Link für ein vertrauliches Gespräch. Ihr Partner kann direkt im Browser ohne Registrierung beitreten. Klicken Sie danach auf „Verbrennen“."
  ],
  "Кодовое название комнаты:": [
      "Room codename:",
      "Nombre clave de la sala:",
      "房间代号：",
      "الاسم الرمزي للغرفة:",
      "نام رمزی اتاق:",
      "Nom de code du salon :",
      "Codename des Raums:"
  ],
  "Например: Переговоры #1": [
      "E.g. Briefing #1",
      "Ej.: Negociación #1",
      "例如：机密会谈 #1",
      "مثال: مفاوضات #1",
      "مثلاً: مذاکره ۱",
      "Ex. : Réunion #1",
      "Z. B. Besprechung #1"
  ],
  "Время жизни (авто-уничтожение):": [
      "Time to live (auto-destroy):",
      "Tiempo de vida (autodestrucción):",
      "存活时间（自动销毁）：",
      "مدة الصلاحية (تدمير تلقائي):",
      "مدت اعتبار (خودتخریب‌گر):",
      "Durée de vie (auto-destruction) :",
      "Lebensdauer (Auto-Zerstörung):"
  ],
  "Строго одноразовый вход (ссылка блокируется сразу после подключения гостя)": [
      "Strictly single-entry (link locks immediately after guest joins)",
      "Entrada estrictamente única (el enlace se bloquea tras entrar el invitado)",
      "严格单次进入（访客加入后链接立即锁定失效）",
      "دخول لمرة واحدة فقط (يُقفل الرابط فور انضمام الضيف)",
      "ورود کاملاً یک‌بارمصرف (لینک بلافاصله پس از ورود مهمان قفل می‌شود)",
      "Entrée strictement unique (le lien se verrouille dès la connexion de l'invité)",
      "Streng einmaliger Beitritt (Link wird sofort nach Gastbeitritt gesperrt)"
  ],
  "Создать одноразовую Burner-ссылку": [
      "Create One-Time Burner Link",
      "Crear enlace Burner de un solo uso",
      "创建一次性阅后即焚链接",
      "إنشاء رابط غرفة مؤقتة Burner",
      "ساخت لینک یک‌بارمصرف Burner",
      "Créer un lien éphémère Burner",
      "Einmal-Burner-Link erstellen"
  ],
  "Активные Burner-комнаты (": [
      "Active Burner rooms (",
      "Salas Burner activas (",
      "活跃阅后即焚房间 (",
      "غرف Burner النشطة (",
      "اتاق‌های فعال Burner (",
      "Salons Burner actifs (",
      "Aktive Burner-Räume ("
  ],
  "Нет активных одноразовых комнат": [
      "No active burner rooms",
      "No hay salas de un solo uso activas",
      "暂无活跃的阅后即焚房间",
      "لا توجد غرف مؤقتة نشطة",
      "هیچ اتاق یک‌بارمصرف فعالی وجود ندارد",
      "Aucun salon éphémère actif",
      "Keine aktiven Burner-Räume"
  ],
  "Войти": [
      "Join",
      "Entrar",
      "进入",
      "دخول",
      "ورود",
      "Rejoindre",
      "Beitreten"
  ],
  "Сжечь": [
      "Burn",
      "Quemar",
      "焚毁",
      "إحراق",
      "سوزاندن",
      "Brûler",
      "Verbrennen"
  ],
  "🔥 Сжечь": [
      "🔥 Burn",
      "🔥 Quemar",
      "🔥 焚毁",
      "🔥 إحراق",
      "🔥 سوزاندن",
      "🔥 Brûler",
      "🔥 Verbrennen"
  ],
  "Мгновенно сжечь одноразовую комнату и удалить историю": [
      "Immediately burn this room and wipe all history",
      "Quemar al instante la sala y borrar el historial",
      "立即焚毁此一次性房间并清除所有记录",
      "إحراق الغرفة المؤقتة فوراً وحذف السجل",
      "سوزاندن فوری اتاق یک‌بارمصرف و پاک کردن تاریخچه",
      "Brûler immédiatement le salon et effacer l'historique",
      "Einmal-Raum sofort verbrennen und Verlauf löschen"
  ],
  "Ссылка": [
      "Link",
      "Enlace",
      "链接",
      "الرابط",
      "لینک",
      "Lien",
      "Link"
  ],
  "Ссылка скопирована": [
      "Link copied",
      "Enlace copiado",
      "链接已复制",
      "تم نسخ الرابط",
      "لینک کپی شد",
      "Lien copié",
      "Link kopiert"
  ],
  "Ссылка скопирована в буфер обмена": [
      "Link copied to clipboard",
      "Enlace copiado al portapapeles",
      "链接已复制到剪贴板",
      "تم نسخ الرابط إلى الحافظة",
      "لینک در حافظه کپی شد",
      "Lien copié dans le presse-papiers",
      "Link in die Zwischenablage kopiert"
  ],
  "Заполните все обязательные поля для создания намерения": [
      "Fill in all required fields to create an intent",
      "Complete todos los campos obligatorios para crear una intención",
      "请填写所有必填字段以创建意图",
      "يرجى ملء جميع الحقول المطلوبة لإنشاء النية",
      "لطفاً تمام فیلدهای الزامی را برای ایجاد نیت پر کنید",
      "Remplissez tous les champs obligatoires pour créer une intention",
      "Füllen Sie alle Pflichtfelder aus, um eine Absicht zu erstellen"
  ],
  "Ошибка создания намерения": [
      "Failed to create intent",
      "Error al crear la intención",
      "创建意图失败",
      "فشل إنشاء النية",
      "خطا در ایجاد نیت",
      "Échec de la création de l'intention",
      "Fehler beim Erstellen der Absicht"
  ],
  "⚡ Создать универсальное намерение (Gossip Pulse)": [
      "⚡ Create Universal Intent (Gossip Pulse)",
      "⚡ Crear intención universal (Gossip Pulse)",
      "⚡ 创建通用意图 (Gossip Pulse)",
      "⚡ إنشاء نية شاملة (Gossip Pulse)",
      "⚡ ایجاد نیت جامع (Gossip Pulse)",
      "⚡ Créer une intention universelle (Gossip Pulse)",
      "⚡ Universelle Absicht erstellen (Gossip Pulse)"
  ],
  "Текущая H3 гео-ячейка определена": [
      "Current H3 geo-cell detected",
      "Celda geográfica H3 actual detectada",
      "已检测到当前 H3 地理单元格",
      "تم تحديد الخلية الجغرافية H3 الحالية",
      "سلول جغرافیایی H3 فعلی شناسایی شد",
      "Cellule géo H3 actuelle détectée",
      "Aktuelle H3-Geozelle erkannt"
  ],
  "Определить по GPS": [
      "Detect via GPS",
      "Detectar por GPS",
      "通过 GPS 定位",
      "تحديد عبر GPS",
      "تشخیص از طریق GPS",
      "Détecter par GPS",
      "Per GPS ermitteln"
  ],
  "Заголовок намерения / инициативы": [
      "Intent / Initiative Title",
      "Título de la intención / iniciativa",
      "意图 / 倡议标题",
      "عنوان النية / المبادرة",
      "عنوان نیت / ابتکار",
      "Titre de l'intention / initiative",
      "Titel der Absicht / Initiative"
  ],
  "Например: Поставка 500т пшеницы / Петиция о ремонте дороги / P2P обмен": [
      "E.g., 500t wheat supply / Road repair petition / P2P swap",
      "Ej.: Suministro de 500t de trigo / Petición vial / Intercambio P2P",
      "例如：供应 500 吨小麦 / 修路请愿 / P2P 兑换",
      "مثال: توريد 500 طن قمح / عريضة إصلاح طريق / تبادل P2P",
      "مثال: تامین ۵۰۰ تن گندم / طومار تعمیر جاده / تبادل P2P",
      "Ex. : Livraison de 500t de blé / Pétition voirie / Échange P2P",
      "Z. B.: 500t Weizenlieferung / Straßenbaupetition / P2P-Tausch"
  ],
  "Подробное описание и условия": [
      "Detailed description & terms",
      "Descripción detallada y condiciones",
      "详细说明与条款",
      "الوصف التفصيلي والشروط",
      "توضیحات دقیق و شرایط",
      "Description détaillée et conditions",
      "Detaillierte Beschreibung & Bedingungen"
  ],
  "Опишите детали, требования к участникам, сроки и условия исполнения...": [
      "Describe details, participant requirements, deadlines, and execution terms...",
      "Describa detalles, requisitos, plazos y condiciones de ejecución...",
      "描述详情、参与者要求、期限与执行条件...",
      "صف التفاصيل ومتطلبات المشاركين والمواعيد وشروط التنفيذ...",
      "جزئیات، الزامات شرکت‌کنندگان، مهلت‌ها و شرایط اجرا را شرح دهید...",
      "Décrivez les détails, prérequis, délais et conditions d'exécution...",
      "Details, Teilnehmeranforderungen, Fristen und Ausführungsbedingungen beschreiben..."
  ],
  "Категория намерения": [
      "Intent Category",
      "Categoría de la intención",
      "意图类别",
      "فئة النية",
      "دسته‌بندی نیت",
      "Catégorie d'intention",
      "Absichtskategorie"
  ],
  "Целевое количество голосов (Кворум)": [
      "Target Vote Count (Quorum)",
      "Cantidad objetivo de votos (Quórum)",
      "目标票数（法定人数）",
      "عدد الأصوات المستهدف (النصاب)",
      "تعداد آرای هدف (نصاب)",
      "Nombre de votes cible (Quorum)",
      "Zielstimmenanzahl (Quorum)"
  ],
  "Орган-адресат / Ведомство": [
      "Target Authority / Agency",
      "Autoridad / Organismo destinatario",
      "目标机构 / 部门",
      "الجهة / الهيئة المستهدفة",
      "نهاد / سازمان مقصد",
      "Autorité / Organisme destinataire",
      "Zielbehörde / Institution"
  ],
  "Администрация района / УК / Минтранс": [
      "District Administration / HOA / Ministry of Transport",
      "Administración distrital / Ministerio de Transporte",
      "区政府 / 物业 / 交通部",
      "إدارة المنطقة / وزارة النقل",
      "شهرداری / وزارت راه",
      "Administration / Ministère des Transports",
      "Bezirksverwaltung / Verkehrsministerium"
  ],
  "Целевая сумма сбора (TON)": [
      "Target Fundraising Amount (TON)",
      "Monto objetivo de recaudación (TON)",
      "目标筹款金额 (TON)",
      "مبلغ الجمع المستهدف (TON)",
      "مبلغ هدف جمع‌آوری (TON)",
      "Montant cible de la collecte (TON)",
      "Zielbetrag der Sammlung (TON)"
  ],
  "Отдаю актив": [
      "Asset Offered",
      "Activo ofrecido",
      "提供资产",
      "الأصل المعروض",
      "دارایی ارائه‌شده",
      "Actif proposé",
      "Angebotener Vermögenswert"
  ],
  "Получаю актив": [
      "Asset Requested",
      "Activo solicitado",
      "请求资产",
      "الأصل المطلوب",
      "دارایی درخواستی",
      "Actif demandé",
      "Gewünschter Vermögenswert"
  ],
  "Объем сделки": [
      "Deal Volume",
      "Volumen de la operación",
      "交易量",
      "حجم الصفقة",
      "حجم معامله",
      "Volume de la transaction",
      "Transaktionsvolumen"
  ],
  "Курс / Условие": [
      "Rate / Condition",
      "Tasa / Condición",
      "汇率 / 条件",
      "السعر / الشرط",
      "نرخ / شرط",
      "Taux / Condition",
      "Kurs / Bedingung"
  ],
  "Рыночный +0.5% / Фикс": [
      "Market +0.5% / Fixed",
      "Mercado +0.5% / Fijo",
      "市价 +0.5% / 固定",
      "السوق +0.5% / ثابت",
      "بازار +0.5% / ثابت",
      "Marché +0.5% / Fixe",
      "Markt +0,5% / Fest"
  ],
  "Товар / Спецификация": [
      "Commodity / Specification",
      "Mercancía / Especificación",
      "商品 / 规格",
      "السلعة / المواصفات",
      "کالا / مشخصات",
      "Marchandise / Spécification",
      "Ware / Spezifikation"
  ],
  "Пшеница 4кл, 3000т, FOB": [
      "Wheat Class 4, 3000t, FOB",
      "Trigo clase 4, 3000t, FOB",
      "4级小麦，3000吨，FOB",
      "قمح درجة 4، 3000 طن، FOB",
      "گندم درجه ۴، ۳۰۰۰ تن، FOB",
      "Blé classe 4, 3000t, FOB",
      "Weizen Klasse 4, 3000t, FOB"
  ],
  "Сумма контракта (TON)": [
      "Contract Amount (TON)",
      "Monto del contrato (TON)",
      "合约金额 (TON)",
      "مبلغ العقد (TON)",
      "مبلغ قرارداد (TON)",
      "Montant du contrat (TON)",
      "Vertragsbetrag (TON)"
  ],
  "Оракул верификации": [
      "Verification Oracle",
      "Oráculo de verificación",
      "验证预言机",
      "أوراكل التحقق",
      "اوراکل تایید",
      "Oracle de vérification",
      "Verifizierungs-Orakel"
  ],
  "SGS Инспекция (Сертификат качества)": [
      "SGS Inspection (Quality Certificate)",
      "Inspección SGS (Certificado de calidad)",
      "SGS 检验（质量证书）",
      "تفتيش SGS (شهادة الجودة)",
      "بازرسی SGS (گواهی کیفیت)",
      "Inspection SGS (Certificat de qualité)",
      "SGS-Inspektion (Qualitätszertifikat)"
  ],
  "AIS Спутниковый трекинг судна": [
      "AIS Satellite Vessel Tracking",
      "Seguimiento satelital de buques AIS",
      "AIS 船舶卫星追踪",
      "تتبع السفن عبر الأقمار الصناعية AIS",
      "ردیابی ماهواره‌ای کشتی AIS",
      "Suivi satellite des navires AIS",
      "AIS-Satelliten-Schiffsverfolgung"
  ],
  "TLSNotary 2PC-TLS Доказательство": [
      "TLSNotary 2PC-TLS Proof",
      "Prueba TLSNotary 2PC-TLS",
      "TLSNotary 2PC-TLS 证明",
      "إثبات TLSNotary 2PC-TLS",
      "اثبات TLSNotary 2PC-TLS",
      "Preuve TLSNotary 2PC-TLS",
      "TLSNotary 2PC-TLS-Nachweis"
  ],
  "Мультиподпись арбитров (2-of-3)": [
      "Arbiter Multisig (2-of-3)",
      "Multifirma de árbitros (2 de 3)",
      "仲裁员多签 (2-of-3)",
      "توقيع متعدد للمحكمين (2 من 3)",
      "چندامضایی داوران (۲ از ۳)",
      "Multisignature d'arbitres (2 sur 3)",
      "Schiedsrichter-Multisig (2-von-3)"
  ],
  "Срок (дней)": [
      "Duration (days)",
      "Plazo (días)",
      "期限（天）",
      "المدة (أيام)",
      "مدت (روز)",
      "Durée (jours)",
      "Dauer (Tage)"
  ],
  "Вознаграждение (TON)": [
      "Reward (TON)",
      "Recompensa (TON)",
      "奖励 (TON)",
      "المكافأة (TON)",
      "پاداش (TON)",
      "Récompense (TON)",
      "Belohnung (TON)"
  ],
  "Критерий приемки": [
      "Acceptance Criteria",
      "Criterio de aceptación",
      "验收标准",
      "معيار القبول",
      "معیار پذیرش",
      "Critère d'acceptation",
      "Abnahmekriterium"
  ],
  "Фотоотчет / PR в GitHub / Подпись заказчика": [
      "Photo report / GitHub PR / Client signature",
      "Informe fotográfico / PR en GitHub / Firma del cliente",
      "照片报告 / GitHub PR / 客户签名",
      "تقرير مصور / طلب سحب GitHub / توقيع العميل",
      "گزارش تصویری / PR گیت‌هاب / امضای کارفرما",
      "Rapport photo / PR GitHub / Signature client",
      "Fotobericht / GitHub-PR / Kundenunterschrift"
  ],
  "Необходимое число свидетелей (t-of-n)": [
      "Required Witnesses (t-of-n)",
      "Testigos requeridos (t de n)",
      "所需见证人数 (t-of-n)",
      "عدد الشهود المطلوب (t من n)",
      "تعداد شاهدان لازم (t از n)",
      "Témoins requis (t sur n)",
      "Erforderliche Zeugen (t-von-n)"
  ],
  "Хэш доказательства (SHA-256 / IPFS CID)": [
      "Evidence Hash (SHA-256 / IPFS CID)",
      "Hash de evidencia (SHA-256 / IPFS CID)",
      "证据哈希 (SHA-256 / IPFS CID)",
      "تجزئة الدليل (SHA-256 / IPFS CID)",
      "هش مدرک (SHA-256 / IPFS CID)",
      "Hachage de preuve (SHA-256 / IPFS CID)",
      "Beweis-Hash (SHA-256 / IPFS CID)"
  ],
  "Мин. баланс (TON)": [
      "Min. Balance (TON)",
      "Saldo mín. (TON)",
      "最低余额 (TON)",
      "الحد الأدنى للرصيد (TON)",
      "حداقل موجودی (TON)",
      "Solde min. (TON)",
      "Mindestguthaben (TON)"
  ],
  "Мин. рейтинг (0-100)": [
      "Min. Rating (0-100)",
      "Calificación mín. (0-100)",
      "最低评分 (0-100)",
      "الحد الأدنى للتقييم (0-100)",
      "حداقل امتیاز (0-100)",
      "Note min. (0-100)",
      "Mindestbewertung (0-100)"
  ],
  "Радиус охвата (км)": [
      "Coverage Radius (km)",
      "Radio de cobertura (km)",
      "覆盖半径（公里）",
      "نطاق التغطية (كم)",
      "شعاع پوشش (کیلومتر)",
      "Rayon de couverture (km)",
      "Abdeckungsradius (km)"
  ],
  "Публикация в Pulse...": [
      "Publishing to Pulse...",
      "Publicando en Pulse...",
      "正在发布到 Pulse...",
      "جارٍ النشر في Pulse...",
      "در حال انتشار در Pulse...",
      "Publication sur Pulse...",
      "Veröffentlichung in Pulse..."
  ],
  "Опубликовать намерение": [
      "Publish Intent",
      "Publicar intención",
      "发布意图",
      "نشر النية",
      "انتشار نیت",
      "Publier l'intention",
      "Absicht veröffentlichen"
  ],
  "Параметры категории:": [
      "Category Parameters:",
      "Parámetros de categoría:",
      "类别参数：",
      "معلمات الفئة:",
      "پارامترهای دسته‌بندی:",
      "Paramètres de catégorie :",
      "Kategorieparameter:"
  ],
  "Защитить выплату вознаграждения смарт-эскроу контрактом в сети TON": [
      "Protect reward payout with a smart escrow contract on TON",
      "Proteger el pago de recompensa con un contrato inteligente de depósito en garantía en TON",
      "通过 TON 智能托管合约保护奖励发放",
      "حماية دفع المكافأة بعقد ضمان ذكي على شبكة TON",
      "محافظت از پرداخت پاداش با قرارداد هوشمند اسکرو در شبکه TON",
      "Protéger le paiement de la récompense par un contrat d'entiercement intelligent sur TON",
      "Belohnungsauszahlung durch Smart-Escrow-Vertrag im TON-Netzwerk schützen"
  ],
  "Опубликовать анонимно (Zero-Knowledge псевдоним, сокрытие адреса кошелька)": [
      "Publish anonymously (Zero-Knowledge alias, wallet address hidden)",
      "Publicar de forma anónima (alias Zero-Knowledge, dirección de billetera oculta)",
      "匿名发布（零知识别名，隐藏钱包地址）",
      "نشر بهوية مجهولة (اسم مستعار بصفر معرفة، إخفاء عنوان المحفظة)",
      "انتشار ناشناس (نام مستعار دانش صفر، مخفی‌سازی آدرس کیف پول)",
      "Publier anonymement (pseudonyme Zero-Knowledge, adresse de portefeuille masquée)",
      "Anonym veröffentlichen (Zero-Knowledge-Alias, Wallet-Adresse verborgen)"
  ],
  "1. Модуль Trust & ZK-Solvency": [
      "1. Trust & ZK-Solvency Module",
      "1. Módulo de Confianza y Solvencia ZK",
      "1. 信任与 ZK 偿付能力模块",
      "1. وحدة الثقة والملاءة المالية بصفر معرفة (ZK-Solvency)",
      "۱. ماژول اعتماد و تمکن مالی ZK",
      "1. Module Confiance & Solvabilité ZK",
      "1. Modul Trust & ZK-Solvenz"
  ],
  "Требовать от контрагентов Halo2 ZK Proof of Solvency": [
      "Require Halo2 ZK Proof of Solvency from counterparties",
      "Exigir prueba de solvencia Halo2 ZK a las contrapartes",
      "要求交易对手提供 Halo2 ZK 偿付能力证明",
      "طلب إثبات الملاءة المالية Halo2 ZK من الأطراف المقابلة",
      "الزام ارائه گواهی تمکن مالی Halo2 ZK از طرف‌های مقابل",
      "Exiger une preuve de solvabilité Halo2 ZK des contreparties",
      "Halo2-ZK-Solvenznachweis von Gegenparteien verlangen"
  ],
  "2. Модуль H3 Гео-радара и Локации": [
      "2. H3 Geo-Radar & Location Module",
      "2. Módulo de Geo-Radar H3 y Ubicación",
      "2. H3 地理雷达与位置模块",
      "2. وحدة الرادار الجغرافي H3 والموقع",
      "۲. ماژول ژئو-رادار H3 و موقعیت مکانی",
      "2. Module Géo-Radar H3 & Localisation",
      "2. Modul H3-Georadar & Standort"
  ],
  "Требовать строгого совпадения гео-ячейки H3": [
      "Require strict H3 geo-cell match",
      "Exigir coincidencia estricta de celda geográfica H3",
      "要求严格匹配 H3 地理单元格",
      "طلب تطابق صارم للخلية الجغرافية H3",
      "الزام تطابق دقیق سلول جغرافیایی H3",
      "Exiger une correspondance stricte de la cellule géo H3",
      "Strikte Übereinstimmung der H3-Geozelle verlangen"
  ],
  "Заполните все обязательные поля контракта": [
      "Fill in all required contract fields",
      "Complete todos los campos obligatorios del contrato",
      "请填写所有必填合约字段",
      "املأ جميع حقول العقد المطلوبة",
      "تمام فیلدهای الزامی قرارداد را پر کنید",
      "Remplissez tous les champs obligatoires du contrat",
      "Füllen Sie alle Pflichtfelder des Vertrags aus"
  ],
  "Ошибка создания эскроу контракта": [
      "Failed to create escrow contract",
      "Error al crear el contrato de depósito en garantía",
      "创建托管合约失败",
      "فشل إنشاء عقد الضمان",
      "خطا در ایجاد قرارداد اسکرو",
      "Échec de la création du contrat d'entiercement",
      "Fehler beim Erstellen des Escrow-Vertrags"
  ],
  "Ошибка обновления фазы контракта": [
      "Failed to update contract phase",
      "Error al actualizar la fase del contrato",
      "更新合约阶段失败",
      "فشل تحديث مرحلة العقد",
      "خطا در به‌روزرسانی مرحله قرارداد",
      "Échec de la mise à jour de la phase du contrat",
      "Fehler beim Aktualisieren der Vertragsphase"
  ],
  "Ошибка генерации Halo2 ZK-Proof": [
      "Failed to generate Halo2 ZK-Proof",
      "Error al generar Halo2 ZK-Proof",
      "生成 Halo2 ZK-Proof 失败",
      "فشل توليد إثبات Halo2 ZK",
      "خطا در تولید گواهی Halo2 ZK",
      "Échec de la génération de la preuve Halo2 ZK",
      "Fehler beim Generieren des Halo2-ZK-Nachweises"
  ],
  "Минимально доказываемый баланс (TON)": [
      "Minimum Provable Balance (TON)",
      "Saldo mínimo demostrable (TON)",
      "最低可证明余额 (TON)",
      "الحد الأدنى للرصيد القابل للإثبات (TON)",
      "حداقل موجودی قابل اثبات (TON)",
      "Solde minimum prouvable (TON)",
      "Minimal nachweisbares Guthaben (TON)"
  ],
  "Возраст депозита в сети (дней)": [
      "Network Deposit Age (days)",
      "Antigüedad del depósito en la red (días)",
      "网络存款账龄（天）",
      "عمر الإيداع في الشبكة (أيام)",
      "عمر سپرده در شبکه (روز)",
      "Ancienneté du dépôt sur le réseau (jours)",
      "Einlagenalter im Netzwerk (Tage)"
  ],
  "Вычисление Halo2 zk-SNARK...": [
      "Computing Halo2 zk-SNARK...",
      "Calculando Halo2 zk-SNARK...",
      "正在计算 Halo2 zk-SNARK...",
      "جارٍ حساب Halo2 zk-SNARK...",
      "در حال محاسبه Halo2 zk-SNARK...",
      "Calcul de Halo2 zk-SNARK...",
      "Halo2 zk-SNARK wird berechnet..."
  ],
  "Сгенерировать ZK-Аттестат": [
      "Generate ZK-Certificate",
      "Generar certificado ZK",
      "生成 ZK 证书",
      "توليد شهادة ZK",
      "تولید گواهی ZK",
      "Générer le certificat ZK",
      "ZK-Zertifikat generieren"
  ],
  "🌾 Развертывание DvP Смарт-Эскроу контракта": [
      "🌾 Deploy DvP Smart-Escrow Contract",
      "🌾 Desplegar contrato inteligente DvP de depósito en garantía",
      "🌾 部署 DvP 智能托管合约",
      "🌾 نشر عقد الضمان الذكي DvP",
      "🌾 استقرار قرارداد هوشمند اسکرو DvP",
      "🌾 Déployer un contrat d'entiercement intelligent DvP",
      "🌾 DvP-Smart-Escrow-Vertrag bereitstellen"
  ],
  "Название сделки": [
      "Deal Title",
      "Título de la operación",
      "交易名称",
      "عنوان الصفقة",
      "عنوان معامله",
      "Titre de la transaction",
      "Transaktionstitel"
  ],
  "Поставка зерна (FOB Новороссийск -> Бандар-Аббас)": [
      "Grain Delivery (FOB Novorossiysk -> Bandar Abbas)",
      "Entrega de grano (FOB Novorossiysk -> Bandar Abbas)",
      "谷物交付（FOB 新罗西斯克 -> 阿巴斯港）",
      "توريد الحبوب (FOB نوفوروسيسك -> بندر عباس)",
      "تحویل غلات (FOB نووراسییسک -> بندرعباس)",
      "Livraison de céréales (FOB Novorossiïsk -> Bandar Abbas)",
      "Getreidelieferung (FOB Noworossijsk -> Bandar Abbas)"
  ],
  "Псевдоним покупателя": [
      "Buyer Alias",
      "Alias del comprador",
      "买家别名",
      "الاسم المستعار للمشتري",
      "نام مستعار خریدار",
      "Pseudonyme de l'acheteur",
      "Käufer-Alias"
  ],
  "Псевдоним продавца": [
      "Seller Alias",
      "Alias del vendedor",
      "卖家别名",
      "الاسم المستعار للبائع",
      "نام مستعار فروشنده",
      "Pseudonyme du vendeur",
      "Verkäufer-Alias"
  ],
  "Товар и спецификация": [
      "Commodity & Specification",
      "Mercancía y especificación",
      "商品与规格",
      "السلعة والمواصفات",
      "کالا و مشخصات",
      "Marchandise et spécification",
      "Ware & Spezifikation"
  ],
  "Пшеница 4 класс, 3000 тонн": [
      "Wheat Class 4, 3000 tons",
      "Trigo clase 4, 3000 toneladas",
      "4级小麦，3000吨",
      "قمح درجة 4، 3000 طن",
      "گندم درجه ۴، ۳۰۰۰ تن",
      "Blé classe 4, 3000 tonnes",
      "Weizen Klasse 4, 3000 Tonnen"
  ],
  "Сумма в USDT": [
      "Amount in USDT",
      "Monto en USDT",
      "USDT 金额",
      "المبلغ بـ USDT",
      "مبلغ به USDT",
      "Montant en USDT",
      "Betrag in USDT"
  ],
  "Сумма в TON": [
      "Amount in TON",
      "Monto en TON",
      "TON 金额",
      "المبلغ بـ TON",
      "مبلغ به TON",
      "Montant en TON",
      "Betrag in TON"
  ],
  "Параметры ZK-Доказательства": [
      "ZK-Proof Parameters",
      "Parámetros de prueba ZK",
      "ZK 证明参数",
      "معلمات إثبات ZK",
      "پارامترهای اثبات ZK",
      "Paramètres de preuve ZK",
      "ZK-Nachweisparameter"
  ],
  "Статус ZK-Верификации": [
      "ZK-Verification Status",
      "Estado de verificación ZK",
      "ZK 验证状态",
      "حالة التحقق ZK",
      "وضعیت تایید ZK",
      "Statut de vérification ZK",
      "ZK-Verifizierungsstatus"
  ],
  "ZK-Аттестат состоятельности подтвержден!": [
      "ZK-Solvency Certificate Verified!",
      "¡Certificado de solvencia ZK verificado!",
      "ZK 偿付能力证书已验证！",
      "تم تأكيد شهادة الملاءة المالية ZK!",
      "گواهی تمکن مالی ZK تایید شد!",
      "Certificat de solvabilité ZK vérifié !",
      "ZK-Solvenzzertifikat bestätigt!"
  ],
  "Математическое доказательство сгенерировано и валидно 24 часа.": [
      "Mathematical proof generated and valid for 24 hours.",
      "Prueba matemática generada y válida por 24 horas.",
      "数学证明已生成，有效期为 24 小时。",
      "تم توليد الإثبات الرياضي وهو صالح لمدة 24 ساعة.",
      "اثبات ریاضی تولید شد و به مدت ۲۴ ساعت معتبر است.",
      "Preuve mathématique générée et valide pendant 24 heures.",
      "Mathematischer Nachweis generiert und 24 Stunden gültig."
  ],
  "Мин. Баланс": [
      "Min. Balance",
      "Saldo mín.",
      "最低余额",
      "الحد الأدنى للرصيد",
      "حداقل موجودی",
      "Solde min.",
      "Mindestguthaben"
  ],
  "Возраст депозита": [
      "Deposit Age",
      "Antigüedad del depósito",
      "存款账龄",
      "عمر الإيداع",
      "عمر سپرده",
      "Ancienneté du dépôt",
      "Einlagenalter"
  ],
  "ID Аттестата": [
      "Certificate ID",
      "ID del certificado",
      "证书 ID",
      "معرف الشهادة",
      "شناسه گواهی",
      "ID du certificat",
      "Zertifikats-ID"
  ],
  "Криптографический контур Zero-Knowledge": [
      "Zero-Knowledge Cryptographic Circuit",
      "Circuito criptográfico Zero-Knowledge",
      "零知识加密回路",
      "الدائرة التشفيرية بصفر معرفة (Zero-Knowledge)",
      "مدار رمزنگاری دانش صفر (Zero-Knowledge)",
      "Circuit cryptographique Zero-Knowledge",
      "Zero-Knowledge-Kryptografiekreis"
  ],
  "Создать контракт": [
      "Create Contract",
      "Crear contrato",
      "创建合约",
      "إنشاء عقد",
      "ایجاد قرارداد",
      "Créer un contrat",
      "Vertrag erstellen"
  ],
  "Активных DvP смарт-контрактов пока нет.": [
      "No active DvP smart contracts yet.",
      "Aún no hay contratos inteligentes DvP activos.",
      "暂无活跃的 DvP 智能合约。",
      "لا توجد عقود ذكية DvP نشطة حتى الآن.",
      "هنوز قرارداد هوشمند DvP فعالی وجود ندارد.",
      "Aucun contrat intelligent DvP actif pour le moment.",
      "Noch keine aktiven DvP-Smart-Contracts vorhanden."
  ],
  "Товар:": [
      "Commodity:",
      "Mercancía:",
      "商品：",
      "السلعة:",
      "کالا:",
      "Marchandise :",
      "Ware:"
  ],
  "Покупатель:": [
      "Buyer:",
      "Comprador:",
      "买家：",
      "المشتري:",
      "خریدار:",
      "Acheteur :",
      "Käufer:"
  ],
  "Продавец:": [
      "Seller:",
      "Vendedor:",
      "卖家：",
      "البائع:",
      "فروشنده:",
      "Vendeur :",
      "Verkäufer:"
  ],
  "Оценить сделку": [
      "Rate Deal",
      "Calificar operación",
      "评价交易",
      "تقييم الصفقة",
      "امتیازدهی به معامله",
      "Évaluer la transaction",
      "Transaktion bewerten"
  ],
  "Тип оракула подтверждения:": [
      "Confirmation Oracle Type:",
      "Tipo de oráculo de confirmación:",
      "确认预言机类型：",
      "نوع أوراكل التأكيد:",
      "نوع اوراکل تایید:",
      "Type d'oracle de confirmation :",
      "Typ des Bestätigungs-Orakels:"
  ],
  "SGS / Bureau Veritas Инспекционный Сертификат": [
      "SGS / Bureau Veritas Inspection Certificate",
      "Certificado de inspección SGS / Bureau Veritas",
      "SGS / 必维国际检验集团 (Bureau Veritas) 检验证书",
      "شهادة تفتيش SGS / Bureau Veritas",
      "گواهی بازرسی SGS / Bureau Veritas",
      "Certificat d'inspection SGS / Bureau Veritas",
      "SGS / Bureau Veritas Inspektionszertifikat"
  ],
  "AIS Спутниковый Трекер Морских Судов (SOLAS)": [
      "AIS Maritime Vessel Satellite Tracker (SOLAS)",
      "Rastreador satelital de buques marítimos AIS (SOLAS)",
      "AIS 船舶卫星追踪器 (SOLAS)",
      "متتبع السفن البحرية عبر الأقمار الصناعية AIS (SOLAS)",
      "ردیاب ماهواره‌ای کشتی‌های دریایی AIS (SOLAS)",
      "Traceur satellite de navires maritimes AIS (SOLAS)",
      "AIS-Satellitentracker für Seeschiffe (SOLAS)"
  ],
  "TLSNotary 2PC-TLS Web-Proof (Гос. Реестры)": [
      "TLSNotary 2PC-TLS Web-Proof (Gov Registries)",
      "Prueba web TLSNotary 2PC-TLS (Registros gubernamentales)",
      "TLSNotary 2PC-TLS 网页证明（政府注册库）",
      "إثبات ويب TLSNotary 2PC-TLS (السجلات الحكومية)",
      "گواهی وب TLSNotary 2PC-TLS (سامانه‌های دولتی)",
      "Preuve Web TLSNotary 2PC-TLS (Registres publics)",
      "TLSNotary 2PC-TLS Web-Proof (Staatsregister)"
  ],
  "Развертывание в TON...": [
      "Deploying to TON...",
      "Desplegando en TON...",
      "正在部署到 TON...",
      "جارٍ النشر على TON...",
      "در حال استقرار در TON...",
      "Déploiement sur TON...",
      "Bereitstellung auf TON..."
  ],
  "Развернуть DvP Смарт-Контракт": [
      "Deploy DvP Smart Contract",
      "Desplegar contrato inteligente DvP",
      "部署 DvP 智能合约",
      "نشر العقد الذكي DvP",
      "استقرار قرارداد هوشمند DvP",
      "Déployer le contrat intelligent DvP",
      "DvP-Smart-Contract bereitstellen"
  ],
  "Сформируйте математический аттестат платежеспособности без раскрытия реального адреса кошелька и баланса.": [
      "Generate a mathematical solvency certificate without revealing your actual wallet address or balance.",
      "Genere un certificado matemático de solvencia sin revelar la dirección real de su billetera ni su saldo.",
      "在不透露真实钱包地址和余额的情况下生成数学偿付能力证书。",
      "أنشئ شهادة ملاءة مالية رياضية دون الكشف عن عنوان محفظتك الفعلي أو رصيدك.",
      "گواهی ریاضی تمکن مالی را بدون افشای آدرس واقعی کیف پول و موجودی خود تولید کنید.",
      "Générez un certificat mathématique de solvabilité sans révéler l'adresse réelle de votre portefeuille ni votre solde.",
      "Erstellen Sie ein mathematisches Solvenzzertifikat, ohne Ihre echte Wallet-Adresse oder Ihr Guthaben preiszugeben."
  ],
  "Как защищена анонимность?": [
      "How is anonymity protected?",
      "¿Cómo se protege el anonimato?",
      "匿名性是如何受到保护的？",
      "كيف تتم حماية الهوية المجهولة؟",
      "ناشناس بودن چگونه محافظت می‌شود؟",
      "Comment l'anonymat est-il protégé ?",
      "Wie wird die Anonymität geschützt?"
  ],
  "Доказательство строится на схеме обязательств Pedersen Commitment. Сервер и контрагент видят только публичный ZK-пропуск, подтверждающий истинность утверждения «Баланс $\\ge X$ TON» за $O(1)$.": [
      "The proof is built on a Pedersen Commitment scheme. Both the server and counterparty only see a public ZK-pass confirming the statement 'Balance >= X TON' in O(1).",
      "La prueba se basa en un esquema Pedersen Commitment. El servidor y la contraparte solo ven un pase ZK público que confirma 'Saldo >= X TON' en O(1).",
      "该证明基于 Pedersen 承诺方案构建。服务器和交易对手仅能看到确认“余额 >= X TON”的公开 ZK 通行证，验证复杂度为 O(1)。",
      "يُبنى الإثبات على مخطط التزام بيدرسن (Pedersen Commitment). يرى الخادم والطرف المقابل فقط تصريح ZK عاماً يؤكد صحة عبارة «الرصيد >= X TON» في وقت O(1).",
      "این اثبات بر پایه طرح تعهد پدرسون (Pedersen Commitment) ساخته شده است. سرور و طرف مقابل تنها یک مجوز عمومی ZK می‌بینند که صحت گزاره «موجودی >= X TON» را در زمان O(1) تایید می‌کند.",
      "La preuve repose sur un schéma d'engagement de Pedersen. Le serveur et la contrepartie ne voient qu'un laissez-passer ZK public confirmant « Solde >= X TON » en O(1).",
      "Der Nachweis basiert auf einem Pedersen-Commitment-Schema. Server und Gegenpartei sehen nur einen öffentlichen ZK-Pass, der die Aussage „Guthaben >= X TON“ in O(1) bestätigt."
  ],
  "Укажите критерии слева и нажмите «Сгенерировать ZK-Аттестат» для формирования криптографического пропуска.": [
      "Specify the criteria on the left and click 'Generate ZK-Certificate' to build your cryptographic pass.",
      "Especifique los criterios a la izquierda y haga clic en «Generar certificado ZK» para crear su pase criptográfico.",
      "在左侧指定条件并点击“生成 ZK 证书”以生成加密通行证。",
      "حدد المعايير على اليسار واضغط على «توليد شهادة ZK» لإنشاء التصريح التشفيري.",
      "معیارها را در سمت راست مشخص کرده و روی «تولید گواهی ZK» کلیک کنید تا مجوز رمزنگاری ایجاد شود.",
      "Indiquez les critères à gauche et cliquez sur « Générer le certificat ZK » pour créer votre laissez-passer cryptographique.",
      "Geben Sie links die Kriterien an und klicken Sie auf „ZK-Zertifikat generieren“, um Ihren kryptografischen Pass zu erstellen."
  ],
  "Активные DvP Смарт-Эскроу контракты (": [
      "Active DvP Smart-Escrow Contracts (",
      "Contratos inteligentes DvP activos (",
      "活跃的 DvP 智能托管合约 (",
      "عقود الضمان الذكية DvP النشطة (",
      "قراردادهای هوشمند اسکرو DvP فعال (",
      "Contrats d'entiercement intelligents DvP actifs (",
      "Aktive DvP-Smart-Escrow-Verträge ("
  ],
  "Развернуть первый DvP контракт": [
      "Deploy First DvP Contract",
      "Desplegar el primer contrato DvP",
      "部署首个 DvP 合约",
      "نشر أول عقد DvP",
      "استقرار اولین قرارداد DvP",
      "Déployer le premier contrat DvP",
      "Ersten DvP-Vertrag bereitstellen"
  ],
  "Фаза": [
      "Phase",
      "Fase",
      "阶段",
      "المرحلة",
      "فاز",
      "Phase",
      "Phase"
  ],
  "% средств": [
      "% of funds",
      "% de los fondos",
      "% 资金",
      "% من الأموال",
      "٪ از وجوه",
      "% des fonds",
      "% der Mittel"
  ],
  "Подтвердить ➔": [
      "Confirm ➔",
      "Confirmar ➔",
      "确认 ➔",
      "تأكيد ➔",
      "تایید ➔",
      "Confirmer ➔",
      "Bestätigen ➔"
  ],
  "Продвинуть ➔": [
      "Advance ➔",
      "Avanzar ➔",
      "推进 ➔",
      "ترقية المرحلة ➔",
      "پیشبرد ➔",
      "Avancer ➔",
      "Weiterführen ➔"
  ],
  "Оценить репутацию участника": [
      "Rate Participant Reputation",
      "Calificar reputación del participante",
      "评价参与者声誉",
      "تقييم سمعة المشارك",
      "ارزیابی اعتبار شرکت‌کننده",
      "Évaluer la réputation du participant",
      "Teilnehmerreputation bewerten"
  ],
  "Против": [
      "Against",
      "En contra",
      "反对",
      "ضد",
      "مخالف",
      "Contre",
      "Dagegen"
  ],
  "Собрано:": [
      "Raised:",
      "Recaudado:",
      "已筹集：",
      "تم جمع:",
      "جمع‌آوری شده:",
      "Collecté :",
      "Gesammelt:"
  ],
  "Бюджет задачи": [
      "Task Budget",
      "Presupuesto de la tarea",
      "任务预算",
      "ميزانية المهمة",
      "بودجه تسک",
      "Budget de la tâche",
      "Aufgabenbudget"
  ],
  "Отдают": [
      "Offering",
      "Ofrecen",
      "提供",
      "يعرضون",
      "ارائه می‌دهند",
      "Offrent",
      "Bieten"
  ],
  "Хотят получить": [
      "Requesting",
      "Buscan recibir",
      "寻求",
      "يطلبون",
      "درخواست دارند",
      "Demandent",
      "Suchen"
  ],
  "Курс:": [
      "Rate:",
      "Tasa:",
      "汇率：",
      "السعر:",
      "نرخ:",
      "Taux :",
      "Kurs:"
  ],
  "Метод:": [
      "Method:",
      "Método:",
      "方式：",
      "الطريقة:",
      "روش:",
      "Méthode :",
      "Methode:"
  ],
  "Кворум подписей:": [
      "Signature Quorum:",
      "Quórum de firmas:",
      "签名法定人数：",
      "نصاب التوقيعات:",
      "نصاب امضاها:",
      "Quorum de signatures :",
      "Unterschriftenquorum:"
  ],
  "Доноров:": [
      "Donors:",
      "Donantes:",
      "捐赠者：",
      "المتبرعون:",
      "مشارکت‌کنندگان:",
      "Donateurs :",
      "Spender:"
  ],
  "Стадия": [
      "Stage",
      "Etapa",
      "阶段",
      "المرحلة",
      "مرحله",
      "Étape",
      "Stufe"
  ],
  "Оракул:": [
      "Oracle:",
      "Oráculo:",
      "预言机：",
      "الأوراكل:",
      "اوراکل:",
      "Oracle :",
      "Orakel:"
  ],
  "Порог раскрытия (t-of-n):": [
      "Disclosure Threshold (t-of-n):",
      "Umbral de revelación (t de n):",
      "披露阈值 (t-of-n)：",
      "عتبة الكشف (t من n):",
      "آستانه افشا (t از n):",
      "Seuil de divulgation (t sur n) :",
      "Offenlegungsschwelle (t-von-n):"
  ],
  "подписей": [
      "signatures",
      "firmas",
      "个签名",
      "توقيعات",
      "امضا",
      "signatures",
      "Unterschriften"
  ],
  "Требуется Halo2 Proof of Solvency (≥": [
      "Halo2 Proof of Solvency required (≥",
      "Se requiere prueba de solvencia Halo2 (≥",
      "需要 Halo2 偿付能力证明 (≥",
      "مطلوب إثبات الملاءة المالية Halo2 (≥",
      "نیازمند گواهی تمکن مالی Halo2 (≥",
      "Preuve de solvabilité Halo2 requise (≥",
      "Halo2-Solvenznachweis erforderlich (≥"
  ],
  "Ваша оценка анонимизирована через ZK-Nullifier и учтена в рейтинге контрагента.": [
      "Your rating has been anonymized via ZK-Nullifier and included in the counterparty's reputation.",
      "Su calificación ha sido anonimizada mediante ZK-Nullifier e incluida en la reputación de la contraparte.",
      "您的评价已通过 ZK-Nullifier 匿名化并计入交易对手声誉。",
      "تم إخفاء هوية تقييمك عبر ZK-Nullifier واحتسابه في تصنيف الطرف المقابل.",
      "امتیاز شما از طریق ZK-Nullifier ناشناس‌سازی شده و در رتبه طرف مقابل منظور گردید.",
      "Votre évaluation a été anonymisée via ZK-Nullifier et prise en compte dans la note de la contrepartie.",
      "Ihre Bewertung wurde über ZK-Nullifier anonymisiert und im Rating der Gegenpartei berücksichtigt."
  ],
  ": ваша оценка запечатана хэшем и раскроется одновременно со второй стороной. Месть или зеркальный шантаж исключены.": [
      ": your rating is hash-sealed and will be revealed simultaneously with the other party. Retaliation or mirror blackmail is impossible.",
      ": su calificación está sellada con hash y se revelará simultáneamente con la otra parte. Se excluyen represalias o chantajes.",
      "：您的评价已通过哈希封印，将与对方同时公开，杜绝报复性差评或要挟。",
      ": تقييمك مختوم بالتجزئة وسيتم الكشف عنه في نفس الوقت مع الطرف الآخر. الانتقام أو الابتزاز المتبادل مستحيل.",
      ": امتیاز شما با هش مهروموم شده و همزمان با طرف مقابل آشکار می‌شود. انتقام‌جویی یا باج‌گیری متقابل غیرممکن است.",
      " : votre évaluation est scellée par hachage et sera révélée simultanément avec l'autre partie. Les représailles sont impossibles.",
      ": Ihre Bewertung ist per Hash versiegelt und wird gleichzeitig mit der Gegenpartei offengelegt. Vergeltung ist ausgeschlossen."
  ],
  "Последние подтвержденные отзывы (": [
      "Latest Verified Reviews (",
      "Últimas reseñas verificadas (",
      "最新已验证评价 (",
      "أحدث التقييمات المؤكدة (",
      "آخرین نظرات تایید شده (",
      "Derniers avis vérifiés (",
      "Neueste bestätigte Bewertungen ("
  ],
  "Загрузка ончейн-истории отзывов...": [
      "Loading on-chain review history...",
      "Cargando historial de reseñas en cadena...",
      "正在加载链上评价历史...",
      "جارٍ تحميل سجل التقييمات على السلسلة...",
      "در حال بارگذاری تاریخچه نظرات آن‌چین...",
      "Chargement de l'historique des avis on-chain...",
      "On-Chain-Bewertungsverlauf wird geladen..."
  ],
  "Подтвержденных отзывов пока нет": [
      "No verified reviews yet",
      "Aún no hay reseñas verificadas",
      "暂无已验证评价",
      "لا توجد تقييمات مؤكدة حتى الآن",
      "هنوز نظر تایید شده‌ای وجود ندارد",
      "Aucun avis vérifié pour le moment",
      "Noch keine bestätigten Bewertungen"
  ],
  "Обновить ленту": [
      "Refresh Feed",
      "Actualizar feed",
      "刷新动态",
      "تحديث الموجز",
      "به‌روزرسانی فید",
      "Actualiser le fil",
      "Feed aktualisieren"
  ],
  "В выбранном радиусе H3 гео-радара намерений не обнаружено. Попробуйте увеличить радиус или отключить радар.": [
      "No intents found within the selected H3 geo-radar radius. Try increasing the radius or disabling the radar.",
      "No se encontraron intenciones en el radio del geo-radar H3 seleccionado. Intente aumentar el radio o desactivar el radar.",
      "在所选 H3 地理雷达半径内未发现意图。请尝试扩大半径或关闭雷达。",
      "لم يتم العثور على نوايا ضمن نطاق الرادار الجغرافي H3 المحدد. جرب زيادة النطاق أو إيقاف الرادار.",
      "در شعاع ژئو-رادار H3 انتخاب شده نیتی یافت نشد. شعاع را افزایش دهید یا رادار را خاموش کنید.",
      "Aucune intention trouvée dans le rayon géo-radar H3 sélectionné. Essayez d'augmenter le rayon ou de désactiver le radar.",
      "Keine Absichten im gewählten H3-Georadar-Radius gefunden. Erhöhen Sie den Radius oder deaktivieren Sie das Radar."
  ],
  "Намерений в этой категории пока нет. Станьте первым, кто создаст инициативу или предложение!": [
      "No intents in this category yet. Be the first to create an initiative or offer!",
      "Aún no hay intenciones en esta categoría. ¡Sea el primero en crear una iniciativa u oferta!",
      "该类别暂无意图。成为第一个发起倡议或提议的人吧！",
      "لا توجد نوايا في هذه الفئة بعد. كن أول من ينشئ مبادرة أو عرضاً!",
      "هنوز نیتی در این دسته‌بندی وجود ندارد. اولین نفری باشید که یک ابتکار یا پیشنهاد ایجاد می‌کند!",
      "Aucune intention dans cette catégorie pour le moment. Soyez le premier à créer une initiative ou une offre !",
      "Noch keine Absichten in dieser Kategorie. Seien Sie der Erste, der eine Initiative oder ein Angebot erstellt!"
  ],
  "Новые": [
      "Newest",
      "Más recientes",
      "最新",
      "الأحدث",
      "جدیدترین",
      "Plus récents",
      "Neueste"
  ],
  "По голосам / кворуму": [
      "By Votes / Quorum",
      "Por votos / quórum",
      "按票数 / 法定人数",
      "حسب الأصوات / النصاب",
      "بر اساس آرا / نصاب",
      "Par votes / quorum",
      "Nach Stimmen / Quorum"
  ],
  "По объему / бюджету": [
      "By Volume / Budget",
      "Por volumen / presupuesto",
      "按交易量 / 预算",
      "حسب الحجم / الميزانية",
      "بر اساس حجم / بودجه",
      "Par volume / budget",
      "Nach Volumen / Budget"
  ],
  "Создать первое намерение": [
      "Create First Intent",
      "Crear primera intención",
      "创建首个意图",
      "إنشاء أول نية",
      "ایجاد اولین نیت",
      "Créer la première intention",
      "Erste Absicht erstellen"
  ],
  "Ошибка голосования / подписания": [
      "Voting / Signing Error",
      "Error al votar / firmar",
      "投票 / 签名错误",
      "خطأ في التصويت / التوقيع",
      "خطا در رای‌گیری / امضا",
      "Erreur de vote / signature",
      "Abstimmungs- / Signaturfehler"
  ],
  "Ошибка продвижения стадии эскроу": [
      "Failed to advance escrow stage",
      "Error al avanzar etapa de depósito en garantía",
      "推进托管阶段失败",
      "فشل ترقية مرحلة الضمان",
      "خطا در پیشبرد مرحله اسکرو",
      "Échec de l'avancement de l'étape d'entiercement",
      "Fehler beim Weiterführen der Escrow-Stufe"
  ],
  "Отменено создателем": [
      "Cancelled by creator",
      "Cancelado por el creador",
      "已由创建者取消",
      "تم الإلغاء بواسطة المنشئ",
      "لغو شده توسط سازنده",
      "Annulé par le créateur",
      "Vom Ersteller abgebrochen"
  ],
  "Ошибка отмены намерения": [
      "Failed to cancel intent",
      "Error al cancelar la intención",
      "取消意图失败",
      "فشل إلغاء النية",
      "خطا در لغو نیت",
      "Échec de l'annulation de l'intention",
      "Fehler beim Abbrechen der Absicht"
  ],
  "Ошибка верификации ZK-пруфа": [
      "ZK-Proof Verification Error",
      "Error de verificación de prueba ZK",
      "ZK 证明验证错误",
      "خطأ في التحقق من إثبات ZK",
      "خطا در تایید گواهی ZK",
      "Erreur de vérification de la preuve ZK",
      "ZK-Nachweis-Verifizierungsfehler"
  ],
  "Намерение без заголовка": [
      "Untitled Intent",
      "Intención sin título",
      "无标题意图",
      "نية بدون عنوان",
      "نیت بدون عنوان",
      "Intention sans titre",
      "Unbenannte Absicht"
  ],
  "Ошибка создания эскроу": [
      "Failed to create escrow",
      "Error al crear depósito en garantía",
      "创建托管失败",
      "فشل إنشاء الضمان",
      "خطا در ایجاد اسکرو",
      "Échec de la création de l'entiercement",
      "Fehler beim Erstellen des Escrows"
  ],
  "Ошибка обновления фазы эскроу": [
      "Failed to update escrow phase",
      "Error al actualizar la fase del depósito",
      "更新托管阶段失败",
      "فشل تحديث مرحلة الضمان",
      "خطا در به‌روزرسانی مرحله اسکرو",
      "Échec de la mise à jour de la phase d'entiercement",
      "Fehler beim Aktualisieren der Escrow-Phase"
  ],
  "Ошибка подписания инициативы": [
      "Failed to sign initiative",
      "Error al firmar la iniciativa",
      "签署倡议失败",
      "فشل توقيع المبادرة",
      "خطا در امضای ابتکار",
      "Échec de la signature de l'initiative",
      "Fehler beim Unterzeichnen der Initiative"
  ],
  "Ошибка отправки запечатанного отзыва": [
      "Failed to submit sealed review",
      "Error al enviar reseña sellada",
      "提交封印评价失败",
      "فشل إرسال التقييم المختوم",
      "خطا در ارسال نظر مهروموم شده",
      "Échec de l'envoi de l'avis scellé",
      "Fehler beim Senden der versiegelten Bewertung"
  ],
  "Ошибка раскрытия отзыва": [
      "Failed to reveal review",
      "Error al revelar reseña",
      "公开评价失败",
      "فشل الكشف عن التقييم",
      "خطا در آشکارسازی نظر",
      "Échec de la révélation de l'avis",
      "Fehler beim Offenlegen der Bewertung"
  ],
  "Ошибка генерации ZK-бейджа репутации": [
      "Failed to generate ZK reputation badge",
      "Error al generar insignia de reputación ZK",
      "生成 ZK 声誉徽章失败",
      "فشل توليد شارة السمعة ZK",
      "خطا در تولید نشان اعتبار ZK",
      "Échec de la génération du badge de réputation ZK",
      "Fehler beim Generieren des ZK-Reputationsabzeichens"
  ],
  "Быстрый перевод": [
      "Fast transfer",
      "Transferencia rápida",
      "转账迅速",
      "تحويل سريع",
      "انتقال سریع",
      "Transfert rapide",
      "Schnelle Überweisung"
  ],
  "Честный курс": [
      "Fair rate",
      "Tasa justa",
      "汇率公道",
      "سعر عادل",
      "نرخ منصفانه",
      "Taux équitable",
      "Fairer Kurs"
  ],
  "Пунктуальность": [
      "Punctual",
      "Puntualidad",
      "守时守信",
      "التزام بالمواعيد",
      "وقت‌شناسی",
      "Ponctualité",
      "Pünktlichkeit"
  ],
  "Отличная связь": [
      "Great communication",
      "Excelente comunicación",
      "沟通顺畅",
      "تواصل ممتاز",
      "ارتباط عالی",
      "Excellente communication",
      "Super Kommunikation"
  ],
  "Качество SGS": [
      "SGS Verified Quality",
      "Calidad SGS verificada",
      "SGS 认证品质",
      "جودة موثقة من SGS",
      "کیفیت تاییدشده SGS",
      "Qualité certifiée SGS",
      "SGS-geprüfte Qualität"
  ],
  "Надежный продавец": [
      "Reliable seller",
      "Vendedor confiable",
      "可靠卖家",
      "بائع موثوق",
      "فروشنده معتبر",
      "Vendeur fiable",
      "Zuverlässiger Verkäufer"
  ],
  "Безопасная сделка": [
      "Safe deal",
      "Trato seguro",
      "交易安全",
      "صفقة آمنة",
      "معامله امن",
      "Transaction sûre",
      "Sicheres Geschäft"
  ],
  "Вежливость": [
      "Polite & respectful",
      "Amabilidad",
      "礼貌友好",
      "تعامل راقٍ",
      "محترمانه",
      "Courtoisie",
      "Höflichkeit"
  ],
  "Отзыв успешно запечатан и отправлен в ZK-Reputation протокол!": [
      "Review sealed and submitted to the ZK-Reputation protocol!",
      "¡Reseña sellada y enviada al protocolo ZK-Reputation!",
      "评价已成功封印并提交至 ZK-Reputation 协议！",
      "تم ختم التقييم وإرساله إلى بروتوكول ZK-Reputation بنجاح!",
      "نظر با موفقیت مهروموم و به پروتکل ZK-Reputation ارسال شد!",
      "Avis scellé et envoyé au protocole ZK-Reputation !",
      "Bewertung erfolgreich versiegelt und an das ZK-Reputation-Protokoll gesendet!"
  ],
  "Ошибка отправки отзыва": [
      "Failed to submit review",
      "Error al enviar la reseña",
      "提交评价失败",
      "فشل إرسال التقييم",
      "خطا در ارسال نظر",
      "Échec de l'envoi de l'avis",
      "Fehler beim Senden der Bewertung"
  ],
  "⭐ Оценка контрагента (ZK Dual-Blind)": [
      "⭐ Rate Counterparty (ZK Dual-Blind)",
      "⭐ Calificar contraparte (ZK Doble Ciego)",
      "⭐ 评价交易对手（ZK 双盲）",
      "⭐ تقييم الطرف المقابل (ZK مزدوج التعمية)",
      "⭐ ارزیابی طرف مقابل (ZK دوگانه کور)",
      "⭐ Évaluer la contrepartie (ZK Double-Aveugle)",
      "⭐ Gegenpartei bewerten (ZK Dual-Blind)"
  ],
  "Отлично (5 из 5)": [
      "Excellent (5 of 5)",
      "Excelente (5 de 5)",
      "极好 (5/5)",
      "ممتاز (5 من 5)",
      "عالی (۵ از ۵)",
      "Excellent (5 sur 5)",
      "Ausgezeichnet (5 von 5)"
  ],
  "Хорошо (4 из 5)": [
      "Good (4 of 5)",
      "Bueno (4 de 5)",
      "良好 (4/5)",
      "جيد (4 من 5)",
      "خوب (۴ از ۵)",
      "Bien (4 sur 5)",
      "Gut (4 von 5)"
  ],
  "Удовлетворительно (3 из 5)": [
      "Fair (3 of 5)",
      "Aceptable (3 de 5)",
      "一般 (3/5)",
      "مقبول (3 من 5)",
      "متوسط (۳ از ۵)",
      "Correct (3 sur 5)",
      "Befriedigend (3 von 5)"
  ],
  "Плохо (2 из 5)": [
      "Poor (2 of 5)",
      "Malo (2 de 5)",
      "较差 (2/5)",
      "سيئ (2 من 5)",
      "ضعیف (۲ از ۵)",
      "Mauvais (2 sur 5)",
      "Schlecht (2 von 5)"
  ],
  "Ужасно (1 из 5)": [
      "Terrible (1 of 5)",
      "Terrible (1 de 5)",
      "极差 (1/5)",
      "سيئ جداً (1 من 5)",
      "بسیار بد (۱ از ۵)",
      "Terrible (1 sur 5)",
      "Schrecklich (1 von 5)"
  ],
  "Генерация ZK-Nullifier...": [
      "Generating ZK-Nullifier...",
      "Generando ZK-Nullifier...",
      "正在生成 ZK-Nullifier...",
      "جارٍ توليد ZK-Nullifier...",
      "در حال تولید ZK-Nullifier...",
      "Génération du ZK-Nullifier...",
      "ZK-Nullifier wird generiert..."
  ],
  "Подтвердить и отправить отзыв": [
      "Confirm & Submit Review",
      "Confirmar y enviar reseña",
      "确认并提交评价",
      "تأكيد وإرسال التقييم",
      "تایید و ارسال نظر",
      "Confirmer et envoyer l'avis",
      "Bestätigen & Bewertung senden"
  ],
  "Отзыв успешно принят!": [
      "Review accepted!",
      "¡Reseña aceptada con éxito!",
      "评价已成功提交！",
      "تم قبول التقييم بنجاح!",
      "نظر با موفقیت ثبت شد!",
      "Avis accepté avec succès !",
      "Bewertung erfolgreich angenommen!"
  ],
  "Контрагент сделки": [
      "Deal Counterparty",
      "Contraparte de la operación",
      "交易对手",
      "الطرف المقابل في الصفقة",
      "طرف مقابل معامله",
      "Contrepartie de la transaction",
      "Transaktionsgegenpartei"
  ],
  "Ваша оценка взаимодействия:": [
      "Your interaction rating:",
      "Su calificación de la interacción:",
      "您的互动评分：",
      "تقييمك للتعامل:",
      "امتیاز شما به تعامل:",
      "Votre note d'interaction :",
      "Ihre Interaktionsbewertung:"
  ],
  "Выберите теги (до 4):": [
      "Select tags (up to 4):",
      "Seleccione etiquetas (hasta 4):",
      "选择标签（最多 4 个）：",
      "اختر الوسوم (حتى 4):",
      "انتخاب برچسب‌ها (حداکثر ۴ مورد):",
      "Sélectionnez des tags (jusqu'à 4) :",
      "Tags auswählen (bis zu 4):"
  ],
  "🛡️ Паспорт доверия ZK-Reputation": [
      "🛡️ ZK-Reputation Trust Passport",
      "🛡️ Pasaporte de confianza ZK-Reputation",
      "🛡️ ZK-Reputation 信任护照",
      "🛡️ جواز الثقة ZK-Reputation",
      "🛡️ پاسپورت اعتماد ZK-Reputation",
      "🛡️ Passeport de confiance ZK-Reputation",
      "🛡️ ZK-Reputation Vertrauenspass"
  ],
  "Профиль надежности": [
      "Reliability Profile",
      "Perfil de fiabilidad",
      "可靠性档案",
      "ملف الموثوقية",
      "پروفایل اعتبار",
      "Profil de fiabilité",
      "Zuverlässigkeitsprofil"
  ],
  "Сделок DvP / P2P": [
      "DvP / P2P Deals",
      "Operaciones DvP / P2P",
      "DvP / P2P 交易数",
      "صفقات DvP / P2P",
      "معاملات DvP / P2P",
      "Transactions DvP / P2P",
      "DvP- / P2P-Geschäfte"
  ],
  "Объем в TON": [
      "Volume in TON",
      "Volumen en TON",
      "TON 交易量",
      "الحجم بـ TON",
      "حجم به TON",
      "Volume en TON",
      "Volumen in TON"
  ],
  "Статус защиты": [
      "Protection Status",
      "Estado de protección",
      "保护状态",
      "حالة الحماية",
      "وضعیت حفاظت",
      "Statut de protection",
      "Schutzstatus"
  ],
  "Отмеченные качества:": [
      "Endorsed Qualities:",
      "Cualidades destacadas:",
      "认可的品质：",
      "الصفات المميزة:",
      "ویژگی‌های تایید شده:",
      "Qualités reconnues :",
      "Bestätigte Qualitäten:"
  ],
  "Ошибка подключения кошелька": [
      "Wallet connection error",
      "Error al conectar la billetera",
      "连接钱包失败",
      "خطأ في الاتصال بالمحفظة",
      "خطا در اتصال کیف پول",
      "Erreur de connexion au portefeuille",
      "Fehler beim Verbinden des Wallets"
  ],
  "Укажите адрес кошелька получателя": [
      "Enter recipient wallet address",
      "Ingrese la dirección de billetera del destinatario",
      "请输入收款人钱包地址",
      "أدخل عنوان محفظة المستلم",
      "آدرس کیف پول گیرنده را وارد کنید",
      "Indiquez l'adresse du portefeuille destinataire",
      "Empfänger-Wallet-Adresse eingeben"
  ],
  "Некорректный адрес кошелька получателя": [
      "Invalid recipient wallet address",
      "Dirección de billetera del destinatario inválida",
      "收款人钱包地址无效",
      "عنوان محفظة المستلم غير صالح",
      "آدرس کیف پول گیرنده نامعتبر است",
      "Adresse du portefeuille destinataire invalide",
      "Ungültige Empfänger-Wallet-Adresse"
  ],
  "Ошибка открытия Deep Link": [
      "Failed to open Deep Link",
      "Error al abrir Deep Link",
      "打开深层链接失败",
      "فشل فتح الرابط المباشر",
      "خطا در باز کردن لینک مستقیم",
      "Échec de l'ouverture du lien profond",
      "Fehler beim Öffnen des Deep-Links"
  ],
  "Сначала подключите кошелек TON Connect": [
      "Connect a TON Connect wallet first",
      "Primero conecte una billetera TON Connect",
      "请先连接 TON Connect 钱包",
      "قم بتوصيل محفظة TON Connect أولاً",
      "ابتدا کیف پول TON Connect را متصل کنید",
      "Connectez d'abord un portefeuille TON Connect",
      "Verbinden Sie zuerst ein TON-Connect-Wallet"
  ],
  "Введите корректную сумму перевода (больше 0)": [
      "Enter a valid transfer amount (greater than 0)",
      "Ingrese un monto de transferencia válido (mayor que 0)",
      "请输入有效的转账金额（大于 0）",
      "أدخل مبلغ تحويل صالحاً (أكبر من 0)",
      "مبلغ انتقال معتبر وارد کنید (بیشتر از ۰)",
      "Entrez un montant de transfert valide (supérieur à 0)",
      "Geben Sie einen gültigen Überweisungsbetrag ein (größer als 0)"
  ],
  "Ошибка выполнения транзакции": [
      "Transaction execution error",
      "Error al ejecutar la transacción",
      "交易执行失败",
      "خطأ في تنفيذ المعاملة",
      "خطا در انجام تراکنش",
      "Erreur d'exécution de la transaction",
      "Fehler bei der Transaktionsausführung"
  ],
  "💎 Перевод криптовалюты": [
      "💎 Crypto Transfer",
      "💎 Transferencia de criptomonedas",
      "💎 加密货币转账",
      "💎 تحويل العملات المشفرة",
      "💎 انتقال ارز دیجیتال",
      "💎 Transfert de cryptomonnaie",
      "💎 Krypto-Überweisung"
  ],
  "Адрес не указан": [
      "Address not specified",
      "Dirección no especificada",
      "未指定地址",
      "العنوان غير محدد",
      "آدرس مشخص نشده است",
      "Adresse non spécifiée",
      "Adresse nicht angegeben"
  ],
  "UQ... или EQ...": [
      "UQ... or EQ...",
      "UQ... o EQ...",
      "UQ... 或 EQ...",
      "UQ... أو EQ...",
      "UQ... یا EQ...",
      "UQ... ou EQ...",
      "UQ... oder EQ..."
  ],
  "Комментарий": [
      "Comment",
      "Comentario",
      "备注",
      "تعليق",
      "توضیحات",
      "Commentaire",
      "Kommentar"
  ],
  "Раздел на техобслуживании": [
      "Section under maintenance",
      "Sección en mantenimiento",
      "该板块正在维护中",
      "القسم قيد الصيانة",
      "این بخش در حال تعمیر و نگهداری است",
      "Section en maintenance",
      "Bereich in Wartung"
  ],
  "Подключите кошелек TON Connect": [
      "Connect TON Connect Wallet",
      "Conecte la billetera TON Connect",
      "连接 TON Connect 钱包",
      "توصيل محفظة TON Connect",
      "اتصال کیف پول TON Connect",
      "Connecter le portefeuille TON Connect",
      "TON-Connect-Wallet verbinden"
  ],
  "Подключить Tonkeeper / Wallet": [
      "Connect Tonkeeper / Wallet",
      "Conectar Tonkeeper / Wallet",
      "连接 Tonkeeper / Wallet",
      "توصيل Tonkeeper / Wallet",
      "اتصال Tonkeeper / Wallet",
      "Connecter Tonkeeper / Wallet",
      "Tonkeeper / Wallet verbinden"
  ],
  "С кошелька:": [
      "From wallet:",
      "Desde la billetera:",
      "来自钱包：",
      "من المحفظة:",
      "از کیف پول:",
      "Depuis le portefeuille :",
      "Von Wallet:"
  ],
  "Сумма к отправке:": [
      "Amount to send:",
      "Monto a enviar:",
      "发送金额：",
      "المبلغ المراد إرساله:",
      "مبلغ ارسالی:",
      "Montant à envoyer :",
      "Zu sendender Betrag:"
  ],
  "Комментарий (Memo транзакции):": [
      "Comment (Transaction Memo):",
      "Comentario (Memo de la transacción):",
      "备注（交易 Memo）：",
      "تعليق (مذكرة المعاملة):",
      "توضیحات (Memo تراکنش):",
      "Commentaire (Mémo de transaction) :",
      "Kommentar (Transaktions-Memo):"
  ],
  "Автосгенерирован": [
      "Auto-generated",
      "Autogenerado",
      "自动生成",
      "مُولّد تلقائياً",
      "تولید خودکار",
      "Généré automatiquement",
      "Automatisch generiert"
  ],
  "Открыть в приложении кошелька (Deep Link)": [
      "Open in Wallet App (Deep Link)",
      "Abrir en la app de billetera (Deep Link)",
      "在钱包应用中打开 (Deep Link)",
      "فتح في تطبيق المحفظة (رابط مباشر)",
      "باز کردن در برنامه کیف پول (Deep Link)",
      "Ouvrir dans l'application portefeuille (Deep Link)",
      "In Wallet-App öffnen (Deep-Link)"
  ],
  "Некорректный адрес кошелька TON": [
      "Invalid TON wallet address",
      "Dirección de billetera TON inválida",
      "TON 钱包地址无效",
      "عنوان محفظة TON غير صالح",
      "آدرس کیف پول TON نامعتبر است",
      "Adresse de portefeuille TON invalide",
      "Ungültige TON-Wallet-Adresse"
  ],
  "Укажите корректную сумму для отправки": [
      "Enter a valid amount to send",
      "Ingrese un monto válido para enviar",
      "请输入有效的发送金额",
      "أدخل مبلغاً صالحاً للإرسال",
      "مبلغ معتبری برای ارسال وارد کنید",
      "Indiquez un montant valide à envoyer",
      "Geben Sie einen gültigen Betrag zum Senden ein"
  ],
  "Ошибка выполнения перевода": [
      "Transfer execution failed",
      "Error al realizar la transferencia",
      "转账执行失败",
      "فشل تنفيذ التحويل",
      "خطا در انجام انتقال",
      "Échec du transfert",
      "Fehler bei der Überweisung"
  ],
  "Нажмите, чтобы скопировать адрес": [
      "Click to copy address",
      "Haga clic para copiar la dirección",
      "点击复制地址",
      "اضغط لنسخ العنوان",
      "برای کپی آدرس کلیک کنید",
      "Cliquez pour copier l'adresse",
      "Klicken, um Adresse zu kopieren"
  ],
  "🦊 Установка расширения OpenMask": [
      "🦊 Install OpenMask Extension",
      "🦊 Instalar extensión OpenMask",
      "🦊 安装 OpenMask 扩展",
      "🦊 تثبيت إضافة OpenMask",
      "🦊 نصب افزونه OpenMask",
      "🦊 Installer l'extension OpenMask",
      "🦊 OpenMask-Erweiterung installieren"
  ],
  "Расширение OpenMask пока не обнаружено. Перезагрузите страницу браузера после установки.": [
      "OpenMask extension not detected yet. Reload the browser page after installation.",
      "Aún no se detecta la extensión OpenMask. Recargue la página después de instalarla.",
      "尚未检测到 OpenMask 扩展。安装后请刷新浏览器页面。",
      "لم يتم اكتشاف إضافة OpenMask بعد. أعد تحميل الصفحة بعد التثبيت.",
      "افزونه OpenMask هنوز شناسایی نشده است. پس از نصب، صفحه مرورگر را بازخوانی کنید.",
      "L'extension OpenMask n'est pas encore détectée. Rechargez la page après l'installation.",
      "OpenMask-Erweiterung noch nicht erkannt. Laden Sie die Seite nach der Installation neu."
  ],
  "Сеть TON Mainnet": [
      "TON Mainnet Network",
      "Red TON Mainnet",
      "TON 主网",
      "شبكة TON الرئيسية",
      "شبکه اصلی TON",
      "Réseau TON Mainnet",
      "TON-Mainnet-Netzwerk"
  ],
  "Шардинг активен, задержка транзакций ~4.2 сек": [
      "Sharding active, transaction finality ~4.2 sec",
      "Sharding activo, latencia de transacción ~4.2 s",
      "分片已激活，交易确认延迟约 4.2 秒",
      "التجزئة نشطة، زمن المعاملة ~4.2 ثانية",
      "شاردینگ فعال، تاخیر تراکنش ~۴.۲ ثانیه",
      "Sharding actif, latence de transaction ~4,2 s",
      "Sharding aktiv, Transaktionslatenz ~4,2 Sek."
  ],
  "Расширение OpenMask не обнаружено": [
      "OpenMask extension not detected",
      "Extensión OpenMask no detectada",
      "未检测到 OpenMask 扩展",
      "لم يتم اكتشاف إضافة OpenMask",
      "افزونه OpenMask شناسایی نشد",
      "Extension OpenMask non détectée",
      "OpenMask-Erweiterung nicht erkannt"
  ],
  "Перейдите в официальный интернет-магазин Chrome Web Store по кнопке ниже.": [
      "Visit the official Chrome Web Store using the button below.",
      "Vaya a la tienda oficial Chrome Web Store con el botón de abajo.",
      "点击下方按钮前往官方 Chrome 网上应用店。",
      "انتقل إلى متجر Chrome الإلكتروني الرسمي عبر الزر أدناه.",
      "از طریق دکمه زیر به فروشگاه رسمی Chrome Web Store بروید.",
      "Rendez-vous sur le Chrome Web Store officiel via le bouton ci-dessous.",
      "Besuchen Sie den offiziellen Chrome Web Store über die Schaltfläche unten."
  ],
  "Нажмите": [
      "Click",
      "Haga clic en",
      "点击",
      "اضغط على",
      "روی",
      "Cliquez sur",
      "Klicken Sie auf"
  ],
  "«Установить»": [
      "'Install'",
      "«Instalar»",
      "“安装”",
      "«تثبيت»",
      "«نصب»",
      "« Installer »",
      "„Installieren“"
  ],
  "и создайте или импортируйте ваш TON-кошелек.": [
      "and create or import your TON wallet.",
      "y cree o importe su billetera TON.",
      "并创建或导入您的 TON 钱包。",
      "وأنشئ أو استورد محفظة TON الخاصة بك.",
      "کلیک کرده و کیف پول TON خود را بسازید یا وارد کنید.",
      "et créez ou importez votre portefeuille TON.",
      "und erstellen oder importieren Sie Ihr TON-Wallet."
  ],
  "Вернитесь в мессенджер Gossip и нажмите": [
      "Return to Gossip Messenger and click",
      "Regrese a Gossip Messenger y haga clic en",
      "返回 Gossip 聊天软件并点击",
      "عد إلى تطبيق Gossip واضغط على",
      "به پیام‌رسان Gossip بازگردید و روی",
      "Revenez dans Gossip Messenger et cliquez sur",
      "Kehren Sie zu Gossip zurück und klicken Sie auf"
  ],
  "«Я установил (Проверить)»": [
      "'I have installed it (Verify)'",
      "«Ya lo instalé (Verificar)»",
      "“我已安装（验证）”",
      "«لقد قمت بالتثبيت (تحقق)»",
      "«نصب کردم (بررسی)»",
      "« Je l'ai installé (Vérifier) »",
      "„Ich habe es installiert (Prüfen)“"
  ],
  "Установить из Chrome Web Store": [
      "Install from Chrome Web Store",
      "Instalar desde Chrome Web Store",
      "从 Chrome 网上应用店安装",
      "التثبيت من متجر Chrome",
      "نصب از Chrome Web Store",
      "Installer depuis le Chrome Web Store",
      "Aus dem Chrome Web Store installieren"
  ],
  "Я установил (Проверить)": [
      "I have installed it (Verify)",
      "Ya lo instalé (Verificar)",
      "我已安装（验证）",
      "لقد قمت بالتثبيت (تحقق)",
      "نصب کردم (بررسی)",
      "Je l'ai installé (Vérifier)",
      "Ich habe es installiert (Prüfen)"
  ],
  "Самый популярный мобильный и десктопный кошелек экосистемы TON": [
      "The most popular mobile and desktop wallet in the TON ecosystem",
      "La billetera móvil y de escritorio más popular del ecosistema TON",
      "TON 生态系统中最受欢迎的移动端和桌面端钱包",
      "المحفظة الأكثر شعبية للهواتف وسطح المكتب في منظومة TON",
      "محبوب‌ترین کیف پول موبایل و دسکتاپ در اکوسیستم TON",
      "Le portefeuille mobile et bureau le plus populaire de l'écosystème TON",
      "Das beliebteste Mobile- und Desktop-Wallet im TON-Ökosystem"
  ],
  "Мультивалютный кошелек с поддержкой стейкинга и расширений": [
      "Multi-currency wallet with staking and extension support",
      "Billetera multidivisa con soporte para staking y extensiones",
      "支持质押与扩展插件的多币种钱包",
      "محفظة متعددة العملات مع دعم التحصيص والإضافات",
      "کیف پول چندارزی با پشتیبانی از استیکینگ و افزونه‌ها",
      "Portefeuille multi-devises avec prise en charge du staking et des extensions",
      "Multi-Währungs-Wallet mit Staking- und Erweiterungsunterstützung"
  ],
  "Удобное браузерное расширение и мобильный кошелек для Web3": [
      "Convenient browser extension and mobile wallet for Web3",
      "Cómoda extensión de navegador y billetera móvil para Web3",
      "便捷的 Web3 浏览器扩展与移动钱包",
      "إضافة متصفح مريحة ومحفظة جوال لـ Web3",
      "افزونه مرورگر و کیف پول موبایل کاربردی برای Web3",
      "Extension de navigateur pratique et portefeuille mobile pour le Web3",
      "Praktische Browser-Erweiterung und mobiles Wallet für Web3"
  ],
  "Встроенный некастодиальный кошелек внутри мессенджера Telegram": [
      "Built-in non-custodial wallet inside Telegram messenger",
      "Billetera no custodial integrada dentro de Telegram",
      "Telegram 内置的非托管钱包",
      "محفظة غير وصائية مدمجة داخل تطبيق تيليجرام",
      "کیف پول غیرحضانتی داخلی در پیام‌رسان تلگرام",
      "Portefeuille non dépositaire intégré à Telegram",
      "Integriertes Non-Custodial-Wallet in Telegram"
  ],
  "Ввод адреса (Watch-Only)": [
      "Enter Address (Watch-Only)",
      "Ingresar dirección (Solo lectura)",
      "输入地址（仅观察）",
      "إدخال العنوان (للمشاهدة فقط)",
      "وارد کردن آدرس (فقط مشاهده)",
      "Saisie d'adresse (Lecture seule)",
      "Adresseingabe (Watch-Only)"
  ],
  "Подключение любого TON-адреса для просмотра баланса и создания переводов": [
      "Connect any TON address to view balance and create transfers",
      "Conecte cualquier dirección TON para ver el saldo y crear transferencias",
      "连接任意 TON 地址以查看余额并创建转账",
      "ربط أي عنوان TON لعرض الرصيد وإنشاء التحويلات",
      "اتصال هر آدرس TON برای مشاهده موجودی و ایجاد انتقال",
      "Connectez n'importe quelle adresse TON pour voir le solde et créer des transferts",
      "Verbinden Sie eine beliebige TON-Adresse zur Saldenanzeige und Überweisungserstellung"
  ],
  "Адрес получателя не указан": [
      "Recipient address not specified",
      "Dirección del destinatario no especificada",
      "未指定收款人地址",
      "عنوان المستلم غير محدد",
      "آدرس گیرنده مشخص نشده است",
      "Adresse du destinataire non spécifiée",
      "Empfängeradresse nicht angegeben"
  ],
  "Некорректный адрес получателя TON": [
      "Invalid TON recipient address",
      "Dirección de destinatario TON inválida",
      "TON 收款人地址无效",
      "عنوان مستلم TON غير صالح",
      "آدرس گیرنده TON نامعتبر است",
      "Adresse du destinataire TON invalide",
      "Ungültige TON-Empfängeradresse"
  ],
  "Сумма перевода обязана быть больше 0 TON": [
      "Transfer amount must be greater than 0 TON",
      "El monto de transferencia debe ser mayor que 0 TON",
      "转账金额必须大于 0 TON",
      "يجب أن يكون مبلغ التحويل أكبر من 0 TON",
      "مبلغ انتقال باید بیشتر از ۰ TON باشد",
      "Le montant du transfert doit être supérieur à 0 TON",
      "Der Überweisungsbetrag muss größer als 0 TON sein"
  ],
  "Сумма перевода обязана быть больше 0 USDT": [
      "Transfer amount must be greater than 0 USDT",
      "El monto de transferencia debe ser mayor que 0 USDT",
      "转账金额必须大于 0 USDT",
      "يجب أن يكون مبلغ التحويل أكبر من 0 USDT",
      "مبلغ انتقال باید بیشتر از ۰ USDT باشد",
      "Le montant du transfert doit être supérieur à 0 USDT",
      "Der Überweisungsbetrag muss größer als 0 USDT sein"
  ],
  "Транзакция подтверждена в блокчейне TON ✓": [
      "Transaction confirmed on TON blockchain ✓",
      "Transacción confirmada en la blockchain TON ✓",
      "交易已在 TON 区块链上确认 ✓",
      "تم تأكيد المعاملة على بلوكتشين TON ✓",
      "تراکنش در بلاکچین TON تایید شد ✓",
      "Transaction confirmée sur la blockchain TON ✓",
      "Transaktion in der TON-Blockchain bestätigt ✓"
  ],
  "Ожидает подтверждения в блокчейне (проверьте подписание в кошельке)": [
      "Awaiting blockchain confirmation (check wallet signature)",
      "Esperando confirmación en la blockchain (verifique la firma en su billetera)",
      "等待区块链确认（请检查钱包中的签名）",
      "في انتظار تأكيد البلوكتشين (تحقق من التوقيع في المحفظة)",
      "در انتظار تایید در بلاکچین (امضا را در کیف پول بررسی کنید)",
      "En attente de confirmation sur la blockchain (vérifiez la signature dans le portefeuille)",
      "Wartet auf Blockchain-Bestätigung (Signatur im Wallet prüfen)"
  ],
  "Не удалось связаться с узлом TON": [
      "Failed to contact TON node",
      "No se pudo contactar con el nodo TON",
      "无法连接到 TON 节点",
      "تعذر الاتصال بعقدة TON",
      "برقراری ارتباط با نود TON ناموفق بود",
      "Impossible de contacter le nœud TON",
      "Verbindung zum TON-Knoten fehlgeschlagen"
  ],
  "Исходящий криптоперевод": [
      "Outgoing Crypto Transfer",
      "Transferencia cripto saliente",
      "发出加密货币转账",
      "تحويل عملات مشفرة صادر",
      "انتقال ارز دیجیتال خروجی",
      "Transfert crypto sortant",
      "Ausgehende Krypto-Überweisung"
  ],
  "Входящий криптоперевод": [
      "Incoming Crypto Transfer",
      "Transferencia cripto entrante",
      "收到加密货币转账",
      "تحويل عملات مشفرة وارد",
      "انتقال ارز دیجیتال ورودی",
      "Transfert crypto entrant",
      "Eingehende Krypto-Überweisung"
  ],
  "Проверить транзакцию в блокчейне TON": [
      "Verify transaction on TON blockchain",
      "Verificar transacción en la blockchain TON",
      "在 TON 区块链上验证交易",
      "التحقق من المعاملة على بلوكتشين TON",
      "بررسی تراکنش در بلاکچین TON",
      "Vérifier la transaction sur la blockchain TON",
      "Transaktion in der TON-Blockchain prüfen"
  ],
  "Подтверждено": [
      "Confirmed",
      "Confirmado",
      "已确认",
      "مؤكد",
      "تایید شده",
      "Confirmé",
      "Bestätigt"
  ],
  "Переведено": [
      "Transferred",
      "Transferido",
      "已转账",
      "تم التحويل",
      "منتقل شده",
      "Transféré",
      "Überwiesen"
  ],
  "Сумма:": [
      "Amount:",
      "Monto:",
      "金额：",
      "المبلغ:",
      "مبلغ:",
      "Montant :",
      "Betrag:"
  ],
  "💎 Резервный фонд": [
      "💎 Reserve Fund",
      "💎 Fondo de reserva",
      "💎 储备基金",
      "💎 صندوق الاحتياطي",
      "💎 صندوق ذخیره",
      "💎 Fonds de réserve",
      "💎 Reservefonds"
  ],
  "Главный публичный резервный фонд The Open Network с миллионами TON": [
      "Main public reserve fund of The Open Network holding millions of TON",
      "Fondo de reserva público principal de The Open Network con millones de TON",
      "持有数百万 TON 的 The Open Network 主公共储备基金",
      "صندوق الاحتياطي العام الرئيسي لشبكة The Open Network بملايين عملات TON",
      "صندوق ذخیره عمومی اصلی شبکه TON با میلیون‌ها واحد TON",
      "Fonds de réserve public principal de The Open Network contenant des millions de TON",
      "Haupt-Reservefonds von The Open Network mit Millionen TON"
  ],
  "Основной смарт-контракт маршрутизации децентрализованной биржи STON.fi": [
      "Core routing smart contract of the STON.fi decentralized exchange",
      "Contrato inteligente de enrutamiento principal del exchange descentralizado STON.fi",
      "去中心化交易所 STON.fi 的核心路由智能合约",
      "العقد الذكي الأساسي للتوجيه في بورصة STON.fi اللامركزية",
      "قرارداد هوشمند اصلی مسیریابی صرافی غیرمتمرکز STON.fi",
      "Contrat intelligent de routage principal de l'échange décentralisé STON.fi",
      "Haupt-Routing-Smart-Contract der dezentralen Börse STON.fi"
  ],
  "⚡ Валидаторы": [
      "⚡ Validators",
      "⚡ Validadores",
      "⚡ 验证者",
      "⚡ المدققون",
      "⚡ اعتبارسنج‌ها",
      "⚡ Validateurs",
      "⚡ Validatoren"
  ],
  "Системный смарт-контракт электората валидаторов Masterchain (Workchain -1)": [
      "System electorate smart contract for Masterchain validators (Workchain -1)",
      "Contrato inteligente del electorado de validadores de Masterchain (Workchain -1)",
      "主链（Workchain -1）验证者选举系统智能合约",
      "العقد الذكي النظامي لانتخاب مدققي السلسلة الرئيسية (Workchain -1)",
      "قرارداد هوشمند سیستمی انتخاب اعتبارسنج‌های مسترچین (Workchain -1)",
      "Contrat intelligent système de l'électorat des validateurs Masterchain (Workchain -1)",
      "System-Smart-Contract des Validator-Elektorats der Masterchain (Workchain -1)"
  ],
  "Основной пул ликвидности пары TON/USDT с высоким объемом ончейн-транзакций": [
      "Primary TON/USDT liquidity pool with high on-chain transaction volume",
      "Pool de liquidez principal del par TON/USDT con alto volumen de transacciones en cadena",
      "具有高链上交易量的 TON/USDT 主要流动性池",
      "مجمع السيولة الرئيسي لزوج TON/USDT بحجم معاملات مرتفع على السلسلة",
      "استخر نقدینگی اصلی جفت TON/USDT با حجم بالای تراکنش‌های آن‌چین",
      "Pool de liquidité principal de la paire TON/USDT à fort volume de transactions on-chain",
      "Haupt-Liquiditätspool des Paares TON/USDT mit hohem On-Chain-Transaktionsvolumen"
  ],
  "Счет на оплату": [
      "Payment Invoice",
      "Factura de pago",
      "付款账单",
      "فاتورة دفع",
      "فاکتور پرداخت",
      "Facture de paiement",
      "Zahlungsrechnung"
  ],
  "Срок действия истек": [
      "Expired",
      "Expirado",
      "已过期",
      "انتهت الصلاحية",
      "منقضی شده",
      "Expiré",
      "Abgelaufen"
  ],
  "Адрес кошелька получателя не указан в инвойсе": [
      "Recipient wallet address is missing in the invoice",
      "La dirección de billetera del destinatario no figura en la factura",
      "账单中未指定收款人钱包地址",
      "عنوان محفظة المستلم غير محدد في الفاتورة",
      "آدرس کیف پول گیرنده در فاکتور مشخص نشده است",
      "L'adresse du portefeuille destinataire n'est pas indiquée dans la facture",
      "Empfänger-Wallet-Adresse fehlt in der Rechnung"
  ],
  "Ошибка оплаты инвойса": [
      "Invoice payment failed",
      "Error al pagar la factura",
      "支付账单失败",
      "فشل دفع الفاتورة",
      "خطا در پرداخت فاکتور",
      "Échec du paiement de la facture",
      "Fehler beim Bezahlen der Rechnung"
  ],
  "Ожидает оплаты": [
      "Awaiting Payment",
      "Esperando pago",
      "等待付款",
      "في انتظار الدفع",
      "در انتظار پرداخت",
      "En attente de paiement",
      "Wartet auf Zahlung"
  ],
  "Оплачен": [
      "Paid",
      "Pagado",
      "已支付",
      "مدفوع",
      "پرداخت شده",
      "Payé",
      "Bezahlt"
  ],
  "Истек": [
      "Expired",
      "Expirado",
      "已过期",
      "منتهي الصلاحية",
      "منقضی شده",
      "Expiré",
      "Abgelaufen"
  ],
  "Отменен": [
      "Cancelled",
      "Cancelado",
      "已取消",
      "ملغى",
      "لغو شده",
      "Annulé",
      "Storniert"
  ],
  "К оплате:": [
      "Total Due:",
      "A pagar:",
      "应付金额：",
      "المستحق للدفع:",
      "قابل پرداخت:",
      "À payer :",
      "Zu zahlen:"
  ],
  "Подтверждено в сети TON:": [
      "Confirmed on TON network:",
      "Confirmado en la red TON:",
      "已在 TON 网络确认：",
      "مؤكد على شبكة TON:",
      "تایید شده در شبکه TON:",
      "Confirmé sur le réseau TON :",
      "Im TON-Netzwerk bestätigt:"
  ],
  "Подтверждение в кошельке...": [
      "Confirming in wallet...",
      "Confirmando en la billetera...",
      "正在钱包中确认...",
      "جارٍ التأكيد في المحفظة...",
      "در حال تایید در کیف پول...",
      "Confirmation dans le portefeuille...",
      "Bestätigung im Wallet..."
  ],
  "Крипто-переводы временно отключены для технических работ. Следите за обновлениями.": [
      "Crypto transfers are temporarily disabled for maintenance. Stay tuned for updates.",
      "Las transferencias cripto están temporalmente deshabilitadas por mantenimiento.",
      "加密货币转账因技术维护暂时关闭，敬请关注后续更新。",
      "تم تعطيل التحويلات المشفرة مؤقتاً لأعمال الصيانة. تابع التحديثات.",
      "انتقال‌های ارز دیجیتال موقتاً جهت تعمیرات فنی غیرفعال شده‌اند.",
      "Les transferts crypto sont temporairement désactivés pour maintenance.",
      "Krypto-Überweisungen sind wegen Wartungsarbeiten vorübergehend deaktiviert."
  ],
  "Кошелёк TON и крипто-переводы временно отключены для технических работ. Следите за обновлениями.": [
      "TON Wallet and crypto transfers are temporarily disabled for maintenance. Stay tuned for updates.",
      "La billetera TON y las transferencias cripto están temporalmente deshabilitadas por mantenimiento.",
      "TON 钱包和加密货币转账因技术维护暂时关闭，敬请关注更新。",
      "محفظة TON والتحويلات المشفرة معطلة مؤقتاً للصيانة.",
      "کیف پول TON و انتقال‌های رمزارزی موقتاً جهت تعمیرات فنی غیرفعال هستند.",
      "Le portefeuille TON et les transferts crypto sont temporairement désactivés pour maintenance.",
      "TON-Wallet und Krypto-Überweisungen sind wegen Wartungsarbeiten vorübergehend deaktiviert."
  ],
  "Для отправки прямого перевода собеседнику необходимо авторизовать некастодиальный кошелек.": [
      "To send a direct transfer to your contact, authorize a non-custodial wallet.",
      "Para enviar una transferencia directa a su contacto, autorice una billetera no custodial.",
      "要向联系人发送直接转账，请先授权非托管钱包。",
      "لإرسال تحويل مباشر إلى جهة الاتصال، يلزم تفويض محفظة غير وصائية.",
      "برای ارسال انتقال مستقیم به مخاطب، باید یک کیف پول غیرحضانتی را متصل کنید.",
      "Pour envoyer un transfert direct à votre contact, autorisez un portefeuille non dépositaire.",
      "Um eine direkte Überweisung an Ihren Kontakt zu senden, autorisieren Sie ein Non-Custodial-Wallet."
  ],
  "Оплатить напрямую через Deep Link (ton:": [
      "Pay directly via Deep Link (ton:",
      "Pagar directamente mediante Deep Link (ton:",
      "通过 Deep Link 直接支付 (ton:",
      "الدفع مباشرة عبر الرابط المباشر (ton:",
      "پرداخت مستقیم از طریق Deep Link (ton:",
      "Payer directement via Deep Link (ton:",
      "Direkt per Deep-Link bezahlen (ton:"
  ],
  "Получатель:": [
      "Recipient:",
      "Destinatario:",
      "收款人：",
      "المستلم:",
      "گیرنده:",
      "Destinataire :",
      "Empfänger:"
  ],
  "Адрес кошелька получателя (UQ... / EQ... / 0:...):": [
      "Recipient wallet address (UQ... / EQ... / 0:...):",
      "Dirección de billetera del destinatario (UQ... / EQ... / 0:...):",
      "收款人钱包地址 (UQ... / EQ... / 0:...)：",
      "عنوان محفظة المستلم (UQ... / EQ... / 0:...):",
      "آدرس کیف پول گیرنده (UQ... / EQ... / 0:...):",
      "Adresse du portefeuille destinataire (UQ... / EQ... / 0:...) :",
      "Empfänger-Wallet-Adresse (UQ... / EQ... / 0:...):"
  ],
  "✓ Валидный адрес TON (": [
      "✓ Valid TON address (",
      "✓ Dirección TON válida (",
      "✓ 有效的 TON 地址 (",
      "✓ عنوان TON صالح (",
      "✓ آدرس معتبر TON (",
      "✓ Adresse TON valide (",
      "✓ Gültige TON-Adresse ("
  ],
  "доступно)": [
      "available)",
      "disponible)",
      "可用)",
      "متاح)",
      "در دسترس)",
      "disponible)",
      "verfügbar)"
  ],
  "Подписание транзакции в": [
      "Signing transaction in",
      "Firmando transacción en",
      "正在签名交易于",
      "توقيع المعاملة في",
      "در حال امضای تراکنش در",
      "Signature de la transaction dans",
      "Transaktion wird signiert in"
  ],
  "через TON Connect": [
      "via TON Connect",
      "mediante TON Connect",
      "通过 TON Connect",
      "عبر TON Connect",
      "از طریق TON Connect",
      "via TON Connect",
      "über TON Connect"
  ],
  "Оплатить через TON Connect (": [
      "Pay via TON Connect (",
      "Pagar con TON Connect (",
      "通过 TON Connect 支付 (",
      "الدفع عبر TON Connect (",
      "پرداخت از طریق TON Connect (",
      "Payer via TON Connect (",
      "Bezahlen über TON Connect ("
  ],
  "Блокчейн The Open Network": [
      "The Open Network Blockchain",
      "Blockchain The Open Network",
      "The Open Network 区块链",
      "بلوكتشين The Open Network",
      "بلاکچین The Open Network",
      "Blockchain The Open Network",
      "The Open Network Blockchain"
  ],
  "Для прямого подключения Web3 и подписания транзакций в браузере требуется установленное расширение OpenMask.": [
      "To connect Web3 directly and sign transactions in the browser, the OpenMask extension is required.",
      "Para conectar Web3 directamente y firmar transacciones en el navegador, se requiere la extensión OpenMask.",
      "要在浏览器中直接连接 Web3 并签署交易，需要安装 OpenMask 扩展。",
      "للاتصال المباشر بـ Web3 وتوقيع المعاملات في المتصفح، يلزم تثبيت إضافة OpenMask.",
      "برای اتصال مستقیم Web3 و امضای تراکنش‌ها در مرورگر، نصب افزونه OpenMask الزامی است.",
      "Pour connecter Web3 directement et signer des transactions dans le navigateur, l'extension OpenMask est requise.",
      "Für die direkte Web3-Verbindung und Transaktionssignierung im Browser ist die OpenMask-Erweiterung erforderlich."
  ],
  "Кошелек": [
      "Wallet",
      "Billetera",
      "钱包",
      "المحفظة",
      "کیف پول",
      "Portefeuille",
      "Wallet"
  ],
  "Адрес кошелька не указан или пуст": [
      "Wallet address is missing or empty",
      "La dirección de la billetera no está especificada o está vacía",
      "钱包地址未指定或为空",
      "عنوان المحفظة غير محدد أو فارغ",
      "آدرس کیف پول مشخص نشده یا خالی است",
      "L'adresse du portefeuille est manquante ou vide",
      "Wallet-Adresse fehlt oder ist leer"
  ],
  "Адрес кошелька не может состоять только из пробелов": [
      "Wallet address cannot consist only of whitespace",
      "La dirección de la billetera no puede contener solo espacios",
      "钱包地址不能仅包含空格",
      "لا يمكن أن يتكون عنوان المحفظة من مسافات فقط",
      "آدرس کیف پول نمی‌تواند فقط شامل فاصله باشد",
      "L'adresse du portefeuille ne peut pas contenir uniquement des espaces",
      "Wallet-Adresse darf nicht nur aus Leerzeichen bestehen"
  ],
  "Строка содержит недопустимые символы для Base64/Base64URL адреса": [
      "String contains invalid characters for a Base64/Base64URL address",
      "La cadena contiene caracteres inválidos para una dirección Base64/Base64URL",
      "字符串包含 Base64/Base64URL 地址的无效字符",
      "تحتوي السلسلة على أحرف غير صالحة لعنوان Base64/Base64URL",
      "رشته حاوی کاراکترهای نامعتبر برای آدرس Base64/Base64URL است",
      "La chaîne contient des caractères non valides pour une adresse Base64/Base64URL",
      "Zeichenfolge enthält ungültige Zeichen für eine Base64/Base64URL-Adresse"
  ],
  "Неверный формат Raw адреса. Ожидается <workchain>:<64 hex символа>": [
      "Invalid Raw address format. Expected <workchain>:<64 hex chars>",
      "Formato de dirección Raw inválido. Se esperaba <workchain>:<64 caracteres hex>",
      "Raw 地址格式无效。应为 <workchain>:<64位十六进制字符>",
      "تنسيق عنوان Raw غير صالح. المتوقع <workchain>:<64 حرفاً سداسياً عشرياً>",
      "فرمت آدرس Raw نامعتبر است. فرمت مورد انتظار <workchain>:<64 کاراکتر هگز>",
      "Format d'adresse Raw invalide. Attendu : <workchain>:<64 caractères hex>",
      "Ungültiges Raw-Adressformat. Erwartet wird <workchain>:<64 Hex-Zeichen>"
  ],
  "Камера не поддерживается в данной среде": [
      "Camera is not supported in this environment",
      "La cámara no es compatible en este entorno",
      "当前环境不支持摄像头",
      "الكاميرا غير مدعومة في هذه البيئة",
      "دوربین در این محیط پشتیبانی نمی‌شود",
      "La caméra n'est pas prise en charge dans cet environnement",
      "Kamera wird in dieser Umgebung nicht unterstützt"
  ],
  "Не удалось получить видеопоток с камеры": [
      "Failed to get camera video stream",
      "No se pudo obtener el flujo de video de la cámara",
      "无法获取摄像头视频流",
      "تعذر الحصول على بث الفيديو من الكاميرا",
      "دریافت جریان ویدیو از دوربین ناموفق بود",
      "Impossible d'obtenir le flux vidéo de la caméra",
      "Videostream der Kamera konnte nicht abgerufen werden"
  ],
  "Ошибка доступа к камере": [
      "Camera access error",
      "Error de acceso a la cámara",
      "摄像头访问错误",
      "خطأ في الوصول إلى الكاميرا",
      "خطا در دسترسی به دوربین",
      "Erreur d'accès à la caméra",
      "Kamerazugriffsfehler"
  ],
  "Геолокация не поддерживается вашим браузером или устройством": [
      "Geolocation is not supported by your browser or device",
      "La geolocalización no es compatible con su navegador o dispositivo",
      "您的浏览器或设备不支持地理定位",
      "تحديد الموقع الجغرافي غير مدعوم في متصفحك أو جهازك",
      "موقعیت‌یابی جغرافیایی توسط مرورگر یا دستگاه شما پشتیبانی نمی‌شود",
      "La géolocalisation n'est pas prise en charge par votre navigateur ou appareil",
      "Geolokalisierung wird von Ihrem Browser oder Gerät nicht unterstützt"
  ],
  "Геолокация недоступна в данном браузере": [
      "Geolocation is unavailable in this browser",
      "La geolocalización no está disponible en este navegador",
      "当前浏览器不可用地理定位",
      "تحديد الموقع الجغرافي غير متاح في هذا المتصفح",
      "موقعیت‌یابی در این مرورگر در دسترس نیست",
      "La géolocalisation est indisponible dans ce navigateur",
      "Geolokalisierung ist in diesem Browser nicht verfügbar"
  ],
  "Не удалось получить координаты:": [
      "Failed to get coordinates:",
      "No se pudieron obtener las coordenadas:",
      "无法获取坐标：",
      "تعذر الحصول على الإحداثيات:",
      "دریافت مختصات ناموفق بود:",
      "Impossible d'obtenir les coordonnées :",
      "Koordinaten konnten nicht abgerufen werden:"
  ],
  "Доступ к геолокации отклонен. Разрешите доступ к местоположению в настройках телефона/приложения.": [
      "Location access denied. Please enable location permissions in your phone/app settings.",
      "Acceso a la ubicación denegado. Permita el acceso en los ajustes de su teléfono/aplicación.",
      "位置访问被拒绝。请在手机/应用设置中允许位置权限。",
      "تم رفض الوصول إلى الموقع. يرجى السماح بالوصول إلى الموقع في إعدادات الهاتف/التطبيق.",
      "دسترسی به موقعیت مکانی رد شد. لطفاً در تنظیمات گوشی/برنامه مجوز مکان را فعال کنید.",
      "Accès à la position refusé. Autorisez l'accès dans les paramètres de votre téléphone/application.",
      "Standortzugriff verweigert. Bitte erlauben Sie den Standortzugriff in den Telefon-/App-Einstellungen."
  ],
  "Координаты недоступны. Убедитесь, что GPS включен в шторке телефона.": [
      "Coordinates unavailable. Make sure GPS is enabled on your device.",
      "Coordenadas no disponibles. Asegúrese de que el GPS esté activado.",
      "坐标不可用，请确保手机已开启 GPS。",
      "الإحداثيات غير متاحة. تأكد من تفعيل GPS في هاتفك.",
      "مختصات در دسترس نیست. مطمئن شوید GPS گوشی روشن است.",
      "Coordonnées indisponibles. Assurez-vous que le GPS est activé.",
      "Koordinaten nicht verfügbar. Stellen Sie sicher, dass GPS aktiviert ist."
  ],
  "Превышено время ожидания ответа GPS. Попробуйте еще раз.": [
      "GPS response timed out. Please try again.",
      "Tiempo de espera de GPS agotado. Inténtelo de nuevo.",
      "GPS 响应超时，请重试。",
      "انتهت مهلة استجابة GPS. حاول مرة أخرى.",
      "زمان انتظار پاسخ GPS به پایان رسید. دوباره تلاش کنید.",
      "Délai d'attente GPS dépassé. Veuillez réessayer.",
      "GPS-Antwortzeit überschritten. Bitte erneut versuchen."
  ],
  "Отправить криптовалюту TON собеседнику": [
      "Send TON cryptocurrency to contact",
      "Enviar criptomoneda TON al contacto",
      "向联系人发送 TON 加密货币",
      "إرسال عملة TON المشفرة إلى جهة الاتصال",
      "ارسال رمزارز TON به مخاطب",
      "Envoyer de la cryptomonnaie TON au contact",
      "TON-Kryptowährung an Kontakt senden"
  ],
  "Создать опрос в чате или канале": [
      "Create a poll in chat or channel",
      "Crear una encuesta en el chat o canal",
      "在聊天或频道中创建投票",
      "إنشاء استطلاع رأي في الدردشة أو القناة",
      "ایجاد نظرسنجی در چت یا کانال",
      "Créer un sondage dans le chat ou le canal",
      "Umfrage im Chat oder Kanal erstellen"
  ],
  "Введите вопрос опроса": [
      "Enter poll question",
      "Ingrese la pregunta de la encuesta",
      "请输入投票问题",
      "أدخل سؤال الاستطلاع",
      "سوال نظرسنجی را وارد کنید",
      "Entrez la question du sondage",
      "Umfragefrage eingeben"
  ],
  "Укажите как минимум 2 непустых варианта ответа": [
      "Provide at least 2 non-empty answer options",
      "Indique al menos 2 opciones de respuesta no vacías",
      "请至少提供 2 个非空选项",
      "حدد خيارين غير فارغين على الأقل للإجابة",
      "حداقل ۲ گزینه پاسخ غیرخالی وارد کنید",
      "Indiquez au moins 2 options de réponse non vides",
      "Geben Sie mindestens 2 nicht-leere Antwortoptionen an"
  ],
  "Выберите правильный вариант ответа для викторины": [
      "Select the correct answer option for the quiz",
      "Seleccione la respuesta correcta para el cuestionario",
      "请为测验选择正确答案选项",
      "اختر الإجابة الصحيحة للاختبار",
      "گزینه پاسخ صحیح را برای مسابقه انتخاب کنید",
      "Sélectionnez la bonne réponse pour le quiz",
      "Wählen Sie die richtige Antwortoption für das Quiz"
  ],
  "Не удалось создать опрос": [
      "Failed to create poll",
      "No se pudo crear la encuesta",
      "创建投票失败",
      "تعذر إنشاء الاستطلاع",
      "ایجاد نظرسنجی ناموفق بود",
      "Impossible de créer le sondage",
      "Umfrage konnte nicht erstellt werden"
  ],
  "Создание викторины": [
      "Create Quiz",
      "Crear cuestionario",
      "创建测验",
      "إنشاء اختبار",
      "ایجاد مسابقه",
      "Créer un quiz",
      "Quiz erstellen"
  ],
  "Создание опроса": [
      "Create Poll",
      "Crear encuesta",
      "创建投票",
      "إنشاء استطلاع رأي",
      "ایجاد نظرسنجی",
      "Créer un sondage",
      "Umfrage erstellen"
  ],
  "Задайте вопрос...": [
      "Ask a question...",
      "Haga una pregunta...",
      "提出问题...",
      "اطرح سؤالاً...",
      "سوالی بپرسید...",
      "Posez une question...",
      "Stellen Sie eine Frage..."
  ],
  "Недоступно в режиме викторины": [
      "Unavailable in quiz mode",
      "No disponible en modo cuestionario",
      "测验模式下不可用",
      "غير متاح في وضع الاختبار",
      "در حالت مسابقه در دسترس نیست",
      "Indisponible en mode quiz",
      "Im Quizmodus nicht verfügbar"
  ],
  "Участники смогут выбрать более одного варианта": [
      "Participants can select multiple options",
      "Los participantes podrán elegir más de una opción",
      "参与者可以选择多个选项",
      "يمكن للمشاركين اختيار أكثر من إجابة",
      "شرکت‌کنندگان می‌توانند بیش از یک گزینه را انتخاب کنند",
      "Les participants pourront choisir plusieurs options",
      "Teilnehmer können mehrere Optionen auswählen"
  ],
  "Пояснение к правильному ответу...": [
      "Explanation for the correct answer...",
      "Explicación de la respuesta correcta...",
      "正确答案解析...",
      "توضيح الإجابة الصحيحة...",
      "توضیح پاسخ صحیح...",
      "Explication de la bonne réponse...",
      "Erklärung zur richtigen Antwort..."
  ],
  "Создание...": [
      "Creating...",
      "Creando...",
      "创建中...",
      "جارٍ الإنشاء...",
      "در حال ایجاد...",
      "Création...",
      "Wird erstellt..."
  ],
  "Создать опрос": [
      "Create Poll",
      "Crear encuesta",
      "创建投票",
      "إنشاء استطلاع",
      "ایجاد نظرسنجی",
      "Créer le sondage",
      "Umfrage erstellen"
  ],
  "Задайте вопрос и укажите варианты ответов": [
      "Ask a question and provide answer options",
      "Haga una pregunta e indique las opciones de respuesta",
      "提出问题并提供答案选项",
      "اطرح سؤالاً وحدد خيارات الإجابة",
      "سوالی بپرسید و گزینه‌های پاسخ را مشخص کنید",
      "Posez une question et indiquez les options de réponse",
      "Stellen Sie eine Frage und geben Sie Antwortoptionen an"
  ],
  "Вопрос": [
      "Question",
      "Pregunta",
      "问题",
      "السؤال",
      "سوال",
      "Question",
      "Frage"
  ],
  "Варианты ответа (": [
      "Answer Options (",
      "Opciones de respuesta (",
      "答案选项 (",
      "خيارات الإجابة (",
      "گزینه‌های پاسخ (",
      "Options de réponse (",
      "Antwortoptionen ("
  ],
  "Отметьте верный ответ": [
      "Mark the correct answer",
      "Marque la respuesta correcta",
      "标记正确答案",
      "حدد الإجابة الصحيحة",
      "پاسخ صحیح را علامت بزنید",
      "Cochez la bonne réponse",
      "Richtige Antwort markieren"
  ],
  "Добавить вариант": [
      "Add Option",
      "Añadir opción",
      "添加选项",
      "إضافة خيار",
      "افزودن گزینه",
      "Ajouter une option",
      "Option hinzufügen"
  ],
  "Настройки опроса": [
      "Poll Settings",
      "Ajustes de la encuesta",
      "投票设置",
      "إعدادات الاستطلاع",
      "تنظیمات نظرسنجی",
      "Paramètres du sondage",
      "Umfrageeinstellungen"
  ],
  "Анонимное голосование": [
      "Anonymous Voting",
      "Votación anónima",
      "匿名投票",
      "تصويت مجهول الهوية",
      "رای‌گیری ناشناس",
      "Vote anonyme",
      "Anonyme Abstimmung"
  ],
  "Имена проголосовавших останутся скрытыми": [
      "Voters' names will remain hidden",
      "Los nombres de los votantes permanecerán ocultos",
      "投票者姓名将保持隐藏",
      "ستبقى أسماء المصوتين مخفية",
      "نام رای‌دهندگان مخفی خواهد ماند",
      "Les noms des votants resteront masqués",
      "Namen der Abstimmenden bleiben verborgen"
  ],
  "Выбор нескольких ответов": [
      "Multiple Answers",
      "Múltiples respuestas",
      "多选投票",
      "اختيار إجابات متعددة",
      "انتخاب چند گزینه",
      "Choix multiples",
      "Mehrfachauswahl"
  ],
  "Режим викторины (Quiz)": [
      "Quiz Mode",
      "Modo cuestionario (Quiz)",
      "测验模式 (Quiz)",
      "وضع الاختبار (Quiz)",
      "حالت مسابقه (Quiz)",
      "Mode Quiz",
      "Quiz-Modus"
  ],
  "Один правильный ответ с подсветкой результатов": [
      "One correct answer with result highlighting",
      "Una respuesta correcta con resaltado de resultados",
      "单一正确答案并高亮显示结果",
      "إجابة صحيحة واحدة مع إبراز النتائج",
      "یک پاسخ صحیح همراه با نمایش نتیجه",
      "Une seule bonne réponse avec mise en évidence du résultat",
      "Eine richtige Antwort mit Ergebnishervorhebung"
  ],
  "Объяснение (необязательно)": [
      "Explanation (optional)",
      "Explicación (opcional)",
      "答案解析（可选）",
      "التوضيح (اختياري)",
      "توضیحات (اختیاری)",
      "Explication (facultatif)",
      "Erklärung (optional)"
  ],
  "Время действия": [
      "Duration",
      "Duración",
      "有效期限",
      "مدة الصلاحية",
      "مدت اعتبار",
      "Durée de validité",
      "Gültigkeitsdauer"
  ],
  "Автоматическое закрытие": [
      "Auto-close",
      "Cierre automático",
      "自动截止",
      "إغلاق تلقائي",
      "بستن خودکار",
      "Fermeture automatique",
      "Automatische Schließung"
  ],
  "Анонимный опрос": [
      "Anonymous Poll",
      "Encuesta anónima",
      "匿名投票",
      "استطلاع رأي مجهول",
      "نظرسنجی ناشناس",
      "Sondage anonyme",
      "Anonyme Umfrage"
  ],
  "Публичный опрос": [
      "Public Poll",
      "Encuesta pública",
      "公开投票",
      "استطلاع رأي عام",
      "نظرسنجی عمومی",
      "Sondage public",
      "Öffentliche Umfrage"
  ],
  "Викторина": [
      "Quiz",
      "Cuestionario",
      "测验",
      "اختبار",
      "مسابقه",
      "Quiz",
      "Quiz"
  ],
  "Несколько ответов": [
      "Multiple Choices",
      "Múltiples opciones",
      "多选",
      "خيارات متعددة",
      "چندگزینه‌ای",
      "Choix multiples",
      "Mehrfachauswahl"
  ],
  "Завершён": [
      "Closed",
      "Finalizado",
      "已结束",
      "منتهٍ",
      "پایان یافته",
      "Terminé",
      "Beendet"
  ],
  "Опрос завершён": [
      "Poll closed",
      "Encuesta finalizada",
      "投票已结束",
      "انتهى الاستطلاع",
      "نظرسنجی پایان یافت",
      "Sondage terminé",
      "Umfrage beendet"
  ],
  "Голосовать (": [
      "Vote (",
      "Votar (",
      "投票 (",
      "تصويت (",
      "رای دادن (",
      "Voter (",
      "Abstimmen ("
  ],
  "Голосование...": [
      "Voting...",
      "Votando...",
      "投票中...",
      "جارٍ التصويت...",
      "در حال ثبت رای...",
      "Vote en cours...",
      "Abstimmung..."
  ],
  "Ошибка при голосовании": [
      "Error while voting",
      "Error al votar",
      "投票出错",
      "خطأ أثناء التصويت",
      "خطا در هنگام رای‌گیری",
      "Erreur lors du vote",
      "Fehler beim Abstimmen"
  ],
  "Объяснение:": [
      "Explanation:",
      "Explicación:",
      "解析：",
      "التوضيح:",
      "توضیح:",
      "Explication :",
      "Erklärung:"
  ],
  "Синий": [
      "Blue",
      "Azul",
      "蓝色",
      "أزرق",
      "آبی",
      "Bleu",
      "Blau"
  ],
  "Изумруд": [
      "Emerald",
      "Esmeralda",
      "祖母绿",
      "زمردي",
      "زمردی",
      "Émeraude",
      "Smaragd"
  ],
  "Фиолетовый": [
      "Purple",
      "Púrpura",
      "紫色",
      "أرجواني",
      "بنفش",
      "Violet",
      "Violett"
  ],
  "Розовый": [
      "Pink",
      "Rosa",
      "粉色",
      "وردي",
      "صورتی",
      "Rose",
      "Rosa"
  ],
  "Янтарный": [
      "Amber",
      "Ámbar",
      "琥珀色",
      "كهرماني",
      "کهربایی",
      "Ambre",
      "Bernstein"
  ],
  "Бирюзовый": [
      "Teal",
      "Turquesa",
      "青色",
      "فيروزي",
      "فیروزه‌ای",
      "Turquoise",
      "Türkis"
  ],
  "Малиновый": [
      "Crimson",
      "Carmesí",
      "深红色",
      "قرمزي",
      "زرشکی",
      "Cramoisi",
      "Karmesinrot"
  ],
  "Сланцевый": [
      "Slate",
      "Pizarra",
      "板岩灰",
      "أردوازي",
      "سربی",
      "Ardoise",
      "Schiefer"
  ],
  "Введите название топика (от 1 до 128 символов)": [
      "Enter topic title (1 to 128 characters)",
      "Ingrese el nombre del tema (de 1 a 128 caracteres)",
      "请输入话题名称（1 至 128 个字符）",
      "أدخل عنوان الموضوع (من 1 إلى 128 حرفاً)",
      "عنوان تاپیک را وارد کنید (۱ تا ۱۲۸ کاراکتر)",
      "Entrez le nom du sujet (de 1 à 128 caractères)",
      "Themenname eingeben (1 bis 128 Zeichen)"
  ],
  "Название топика не может превышать 128 символов": [
      "Topic title cannot exceed 128 characters",
      "El nombre del tema no puede superar los 128 caracteres",
      "话题名称不能超过 128 个字符",
      "لا يمكن أن يتجاوز عنوان الموضوع 128 حرفاً",
      "عنوان تاپیک نمی‌تواند بیشتر از ۱۲۸ کاراکتر باشد",
      "Le nom du sujet ne peut pas dépasser 128 caractères",
      "Der Themenname darf 128 Zeichen nicht überschreiten"
  ],
  "Не удалось сохранить топик. Попробуйте еще раз.": [
      "Failed to save topic. Please try again.",
      "No se pudo guardar el tema. Inténtelo de nuevo.",
      "保存话题失败，请重试。",
      "تعذر حفظ الموضوع. حاول مرة أخرى.",
      "ذخیره تاپیک ناموفق بود. دوباره تلاش کنید.",
      "Impossible d'enregistrer le sujet. Veuillez réessayer.",
      "Thema konnte nicht gespeichert werden. Bitte erneut versuchen."
  ],
  "Редактировать топик": [
      "Edit Topic",
      "Editar tema",
      "编辑话题",
      "تعديل الموضوع",
      "ویرایش تاپیک",
      "Modifier le sujet",
      "Thema bearbeiten"
  ],
  "Новый топик": [
      "New Topic",
      "Nuevo tema",
      "新建话题",
      "موضوع جديد",
      "تاپیک جدید",
      "Nouveau sujet",
      "Neues Thema"
  ],
  "Например: Обсуждение релизов, Игры, Вопросы...": [
      "E.g., Release discussion, Gaming, Q&A...",
      "Ej.: Discusión de versiones, Juegos, Preguntas...",
      "例如：版本讨论、游戏、问答...",
      "مثال: مناقشة الإصدارات، ألعاب، أسئلة...",
      "مثال: بحث درباره نسخه‌ها، بازی‌ها، سوالات...",
      "Ex. : Discussion des versions, Jeux, Questions...",
      "Z. B.: Release-Diskussion, Spiele, Fragen..."
  ],
  "Создать топик": [
      "Create Topic",
      "Crear tema",
      "创建话题",
      "إنشاء موضوع",
      "ایجاد تاپیک",
      "Créer le sujet",
      "Thema erstellen"
  ],
  "Только для чтения": [
      "Read-Only",
      "Solo lectura",
      "只读",
      "للقراءة فقط",
      "فقط خواندنی",
      "Lecture seule",
      "Schreibgeschützt"
  ],
  "Название топика": [
      "Topic Title",
      "Nombre del tema",
      "话题名称",
      "عنوان الموضوع",
      "عنوان تاپیک",
      "Nom du sujet",
      "Themenname"
  ],
  "Иконка": [
      "Icon",
      "Icono",
      "图标",
      "الأيقونة",
      "آیکون",
      "Icône",
      "Symbol"
  ],
  "Цветовой акцент": [
      "Accent Color",
      "Color de acento",
      "强调色",
      "لون التمييز",
      "رنگ شاخص",
      "Couleur d'accentuation",
      "Akzentfarbe"
  ],
  "Обычные участники не смогут отправлять сообщения": [
      "Regular members will not be able to send messages",
      "Los miembros normales no podrán enviar mensajes",
      "普通成员将无法发送消息",
      "لن يتمكن الأعضاء العاديون من إرسال رسائل",
      "اعضای عادی قادر به ارسال پیام نخواهند بود",
      "Les membres ordinaires ne pourront pas envoyer de messages",
      "Normale Mitglieder können keine Nachrichten senden"
  ],
  "Форумная группа ·": [
      "Forum Group ·",
      "Grupo de foro ·",
      "论坛群组 ·",
      "مجموعة منتدى ·",
      "گروه انجمن ·",
      "Groupe forum ·",
      "Forum-Gruppe ·"
  ],
  "Назад к списку чатов": [
      "Back to chat list",
      "Volver a la lista de chats",
      "返回聊天列表",
      "العودة إلى قائمة الدردشات",
      "بازگشت به لیست چت‌ها",
      "Retour à la liste des discussions",
      "Zurück zur Chatliste"
  ],
  "Поиск топиков": [
      "Search topics",
      "Buscar temas",
      "搜索话题",
      "البحث في المواضيع",
      "جستجوی تاپیک‌ها",
      "Rechercher des sujets",
      "Themen suchen"
  ],
  "Создать новый топик": [
      "Create new topic",
      "Crear nuevo tema",
      "创建新话题",
      "إنشاء موضوع جديد",
      "ایجاد تاپیک جدید",
      "Créer un nouveau sujet",
      "Neues Thema erstellen"
  ],
  "Поиск топика по названию или тексту...": [
      "Search topic by title or text...",
      "Buscar tema por nombre o texto...",
      "按标题或内容搜索话题...",
      "البحث عن موضوع بالعنوان أو النص...",
      "جستجوی تاپیک بر اساس عنوان یا متن...",
      "Rechercher un sujet par titre ou texte...",
      "Thema nach Titel oder Text suchen..."
  ],
  "Топик закрыт для сообщений": [
      "Topic is closed for messages",
      "El tema está cerrado para mensajes",
      "该话题已关闭发言",
      "الموضوع مغلق للرسائل",
      "تاپیک برای ارسال پیام بسته است",
      "Le sujet est fermé aux messages",
      "Thema ist für Nachrichten geschlossen"
  ],
  "Топики не найдены": [
      "No topics found",
      "No se encontraron temas",
      "未找到话题",
      "لم يتم العثور على مواضيع",
      "تاپیکی یافت نشد",
      "Aucun sujet trouvé",
      "Keine Themen gefunden"
  ],
  "Не удалось загрузить список участников": [
      "Failed to load member list",
      "No se pudo cargar la lista de miembros",
      "加载成员列表失败",
      "تعذر تحميل قائمة الأعضاء",
      "بارگذاری لیست اعضا ناموفق بود",
      "Impossible de charger la liste des membres",
      "Mitgliederliste konnte nicht geladen werden"
  ],
  "Не удалось покинуть канал": [
      "Failed to leave channel",
      "No se pudo salir del canal",
      "退出频道失败",
      "تعذر مغادرة القناة",
      "خروج از کانال ناموفق بود",
      "Impossible de quitter le canal",
      "Kanal konnte nicht verlassen werden"
  ],
  "Нет подписчиков": [
      "No subscribers",
      "Sin suscriptores",
      "暂无订阅者",
      "لا يوجد مشتركون",
      "بدون مشترک",
      "Aucun abonné",
      "Keine Abonnenten"
  ],
  "Выход...": [
      "Leaving...",
      "Saliendo...",
      "正在退出...",
      "جارٍ المغادرة...",
      "در حال خروج...",
      "Sortie...",
      "Verlassen..."
  ],
  "Покинуть канал": [
      "Leave Channel",
      "Salir del canal",
      "退出频道",
      "مغادرة القناة",
      "خروج از کانال",
      "Quitter le canal",
      "Kanal verlassen"
  ],
  "Публичная ссылка": [
      "Public Link",
      "Enlace público",
      "公开链接",
      "رابط عام",
      "لینک عمومی",
      "Lien public",
      "Öffentlicher Link"
  ],
  "Управление": [
      "Management",
      "Gestión",
      "管理",
      "الإدارة",
      "مدیریت",
      "Gestion",
      "Verwaltung"
  ],
  "Администрация и участники (": [
      "Admins & Members (",
      "Administración y miembros (",
      "管理员与成员 (",
      "الإدارة والأعضاء (",
      "مدیران و اعضا (",
      "Administration et membres (",
      "Administratoren & Mitglieder ("
  ],
  "Список участников пуст или скрыт настройками приватности": [
      "Member list is empty or hidden by privacy settings",
      "La lista de miembros está vacía u oculta por privacidad",
      "成员列表为空或已被隐私设置隐藏",
      "قائمة الأعضاء فارغة أو مخفية بإعدادات الخصوصية",
      "لیست اعضا خالی است یا توسط تنظیمات حریم خصوصی مخفی شده است",
      "La liste des membres est vide ou masquée par les paramètres de confidentialité",
      "Mitgliederliste ist leer oder durch Datenschutzeinstellungen verborgen"
  ],
  "— нажмите повторно": [
      "— tap again to confirm",
      "— toque de nuevo",
      "— 请再次点击确认",
      "— اضغط مرة أخرى",
      "— دوباره ضربه بزنید",
      "— appuyez à nouveau",
      "— erneut tippen"
  ],
  "Не удалось вычислить число безопасности": [
      "Failed to compute safety number",
      "No se pudo calcular el número de seguridad",
      "无法计算安全码",
      "تعذر حساب رقم الأمان",
      "محاسبه کد امنیتی ناموفق بود",
      "Impossible de calculer le numéro de sécurité",
      "Sicherheitsnummer konnte nicht berechnet werden"
  ],
  "Ключи совпадают — контакт подтверждён": [
      "Keys match — contact verified",
      "Las claves coinciden — contacto verificado",
      "密钥匹配 — 联系人已验证",
      "المفاتيح متطابقة — تم تأكيد جهة الاتصال",
      "کلیدها مطابقت دارند — مخاطب تایید شد",
      "Les clés correspondent — contact vérifié",
      "Schlüssel stimmen überein — Kontakt verifiziert"
  ],
  "Ключи НЕ совпадают — вероятен перехват (MITM)": [
      "Keys DO NOT match — possible interception (MITM)",
      "Las claves NO coinciden — posible interceptación (MITM)",
      "密钥不匹配 — 可能存在中间人攻击 (MITM)",
      "المفاتيح غير متطابقة — احتمال اعتراض الاتصال (MITM)",
      "کلیدها مطابقت ندارند — احتمال شنود (MITM)",
      "Les clés NE correspondent PAS — interception probable (MITM)",
      "Schlüssel stimmen NICHT überein — möglicher Lauscher (MITM)"
  ],
  "Некорректный QR-payload": [
      "Invalid QR payload",
      "Carga útil QR inválida",
      "无效的二维码数据",
      "بيانات رمز QR غير صالحة",
      "داده‌های QR نامعتبر است",
      "Charge utile QR invalide",
      "Ungültige QR-Nutzdaten"
  ],
  "Числа совпадают — контакт подтверждён": [
      "Numbers match — contact verified",
      "Los números coinciden — contacto verificado",
      "安全码匹配 — 联系人已验证",
      "الأرقام متطابقة — تم تأكيد جهة الاتصال",
      "اعداد مطابقت دارند — مخاطب تایید شد",
      "Les numéros correspondent — contact vérifié",
      "Nummern stimmen überein — Kontakt verifiziert"
  ],
  "Числа НЕ совпадают — сверьте внимательно или используйте QR": [
      "Numbers DO NOT match — check carefully or scan QR",
      "Los números NO coinciden — verifique con cuidado o use el QR",
      "安全码不匹配 — 请仔细核对或使用二维码",
      "الأرقام غير متطابقة — تحقق بعناية أو استخدم رمز QR",
      "اعداد مطابقت ندارند — با دقت بررسی کنید یا از QR استفاده نمایید",
      "Les numéros NE correspondent PAS — vérifiez attentivement ou utilisez le QR",
      "Nummern stimmen NICHT überein — sorgfältig prüfen oder QR nutzen"
  ],
  "Копировать число": [
      "Copy Number",
      "Copiar número",
      "复制安全码",
      "نسخ الرقم",
      "کپی کد",
      "Copier le numéro",
      "Nummer kopieren"
  ],
  "Мой QR": [
      "My QR",
      "Mi QR",
      "我的二维码",
      "رمز QR الخاص بي",
      "QR من",
      "Mon QR",
      "Mein QR"
  ],
  "Сверить QR": [
      "Verify QR",
      "Verificar QR",
      "核对二维码",
      "مقارنة رمز QR",
      "بررسی QR",
      "Vérifier le QR",
      "QR prüfen"
  ],
  "Вручную": [
      "Manual",
      "Manual",
      "手动核对",
      "يدوياً",
      "دستی",
      "Manuellement",
      "Manuell"
  ],
  "QR код верификации": [
      "Verification QR Code",
      "Código QR de verificación",
      "验证二维码",
      "رمز QR للتحقق",
      "کد QR تایید امنیت",
      "QR code de vérification",
      "Verifizierungs-QR-Code"
  ],
  "Вставьте JSON из QR-кода собеседника (веб-режим без камеры)": [
      "Paste JSON from contact's QR code (camera-less web mode)",
      "Pegue el JSON del código QR del contacto (modo web sin cámara)",
      "粘贴联系人二维码中的 JSON（无摄像头网页模式）",
      "الصق JSON من رمز QR الخاص بجهة الاتصال (وضع الويب بدون كاميرا)",
      "کد JSON حاصل از QR مخاطب را جای‌گذاری کنید (حالت وب بدون دوربین)",
      "Collez le JSON du QR code du contact (mode web sans caméra)",
      "JSON aus dem QR-Code des Kontakts einfügen (Web-Modus ohne Kamera)"
  ],
  "Введите 60 цифр собеседника для сверки": [
      "Enter contact's 60 digits to compare",
      "Ingrese los 60 dígitos del contacto para comparar",
      "输入联系人的 60 位数字进行比对",
      "أدخل أرقام جهة الاتصال الـ 60 للمقارنة",
      "۶۰ رقم مخاطب را برای مطابقت وارد کنید",
      "Entrez les 60 chiffres du contact pour comparer",
      "60 Ziffern des Kontakts zum Abgleich eingeben"
  ],
  "Проверка безопасности": [
      "Security Verification",
      "Verificación de seguridad",
      "安全验证",
      "التحقق الأمني",
      "تایید امنیت",
      "Vérification de sécurité",
      "Sicherheitsüberprüfung"
  ],
  "Контакт верифицирован": [
      "Contact Verified",
      "Contacto verificado",
      "联系人已验证",
      "جهة الاتصال موثقة",
      "مخاطب تایید شده است",
      "Contact vérifié",
      "Kontakt verifiziert"
  ],
  "Контакт не верифицирован": [
      "Contact Not Verified",
      "Contacto no verificado",
      "联系人未验证",
      "جهة الاتصال غير موثقة",
      "مخاطب تایید نشده است",
      "Contact non vérifié",
      "Kontakt nicht verifiziert"
  ],
  "Снять верификацию": [
      "Remove Verification",
      "Quitar verificación",
      "取消验证标记",
      "إلغاء التوثيق",
      "حذف تاییدیه",
      "Retirer la vérification",
      "Verifizierung aufheben"
  ],
  "Покажите этот QR собеседнику — пусть отсканирует и сравнит": [
      "Show this QR code to your contact to scan and compare",
      "Muestre este QR a su contacto para que lo escanee y compare",
      "向对方展示此二维码以扫描比对",
      "أظهر رمز QR هذا لجهة الاتصال لمسحه ومقارنته",
      "این کد QR را به مخاطب خود نشان دهید تا اسکن و مقایسه کند",
      "Montrez ce QR code à votre contact pour qu'il le scanne et le compare",
      "Zeigen Sie diesen QR-Code Ihrem Kontakt zum Scannen und Vergleichen"
  ],
  "Сверить и подтвердить": [
      "Compare & Verify",
      "Comparar y confirmar",
      "核对并确认",
      "مقارنة وتأكيد",
      "مقایسه و تایید",
      "Comparer et confirmer",
      "Abgleichen & bestätigen"
  ],
  "Число детерминировано вычисляется из открытых ключей обеих сторон (5200 раундов SHA-512). Совпадение чисел на обоих устройствах гарантирует отсутствие перехватчика. Верификация локальна и не синхронизируется между устройствами.": [
      "The safety number is deterministically derived from both parties' public keys (5,200 rounds of SHA-512). Matching numbers on both devices guarantee no man-in-the-middle interception. Verification is stored locally and not synced across devices.",
      "El número se calcula de forma determinista a partir de las claves públicas de ambas partes (5200 rondas de SHA-512). La coincidencia en ambos dispositivos garantiza que no hay interceptación. La verificación es local.",
      "安全码由双方公钥通过确定性算法生成（5200 轮 SHA-512）。两台设备上的安全码一致即可保证不存在中间人窃听。验证结果仅保存在本地，不在设备间同步。",
      "يتم حساب الرقم بشكل حتمي من المفاتيح العامة للطرفين (5200 جولة SHA-512). تطابق الأرقام على الجهازين يضمن عدم وجود تنصت. التوثيق محلي ولا يُزامن بين الأجهزة.",
      "این عدد به صورت قطعی از کلیدهای عمومی دو طرف (۵۲۰۰ دور SHA-512) محاسبه می‌شود. تطابق اعداد در هر دو دستگاه عدم وجود شنود را تضمین می‌کند. تاییدیه محلی است.",
      "Ce numéro est calculé de manière déterministe à partir des clés publiques des deux parties (5200 tours de SHA-512). La correspondance sur les deux appareils garantit l'absence d'interception.",
      "Die Nummer wird deterministisch aus den öffentlichen Schlüsseln beider Seiten berechnet (5.200 Runden SHA-512). Übereinstimmende Nummern auf beiden Geräten garantieren Abhörsicherheit."
  ],
  "Прочитано участниками": [
      "Read by Members",
      "Leído por los miembros",
      "已读成员",
      "تمت القراءة بواسطة الأعضاء",
      "خوانده شده توسط اعضا",
      "Lu par les membres",
      "Gelesen von Mitgliedern"
  ],
  "Не удалось загрузить данные": [
      "Failed to load data",
      "No se pudieron cargar los datos",
      "加载数据失败",
      "تعذر تحميل البيانات",
      "بارگذاری اطلاعات ناموفق بود",
      "Impossible de charger les données",
      "Daten konnten nicht geladen werden"
  ],
  "Пока никто не прочитал": [
      "No one has read this yet",
      "Nadie lo ha leído aún",
      "暂无人阅读",
      "لم يقرأه أحد بعد",
      "هنوز کسی نخوانده است",
      "Personne n'a encore lu",
      "Noch von niemandem gelesen"
  ],
  "Когда участники группы откроют это сообщение, они появятся в этом списке": [
      "Group members will appear here once they open this message",
      "Cuando los miembros del grupo abran este mensaje, aparecerán en esta lista",
      "当群组成员打开此消息后，他们将显示在此列表中",
      "عندما يفتح أعضاء المجموعة هذه الرسالة، سيظهرون في هذه القائمة",
      "وقتی اعضای گروه این پیام را باز کنند، در این لیست ظاهر می‌شوند",
      "Lorsque les membres du groupe ouvriront ce message, ils apparaîtront dans cette liste",
      "Sobald Gruppenmitglieder diese Nachricht öffnen, erscheinen sie in dieser Liste"
  ],
  "Не удалось загрузить список прочитавших": [
      "Failed to load read receipts",
      "No se pudo cargar la lista de lecturas",
      "无法加载已读列表",
      "تعذر تحميل قائمة القراء",
      "بارگذاری لیست خوانندگان ناموفق بود",
      "Impossible de charger la liste de lecture",
      "Leseliste konnte nicht geladen werden"
  ],
  "Список прочтений": [
      "Read Receipts",
      "Lista de lecturas",
      "已读列表",
      "قائمة القراءات",
      "لیست بازدیدها",
      "Liste de lecture",
      "Lesebestätigungen"
  ],
  "Нет отложенных сообщений": [
      "No scheduled messages",
      "No hay mensajes programados",
      "暂无定时消息",
      "لا توجد رسائل مجدولة",
      "پیام زمان‌بندی شده‌ای وجود ندارد",
      "Aucun message programmé",
      "Keine geplanten Nachrichten"
  ],
  "Сообщения шифруются один раз в момент планирования и доставляются сервером по расписанию без перешифрования (сквозное шифрование сохраняется). Горизонт: 7 дней для приватных чатов, 365 дней для каналов.": [
      "Messages are encrypted once when scheduled and delivered by the server on time without re-encryption (preserving end-to-end encryption). Horizon: 7 days for private chats, 365 days for channels.",
      "Los mensajes se cifran una sola vez al programarse y el servidor los entrega según lo previsto sin recifrar (conservando E2EE). Horizonte: 7 días en chats privados, 365 días en canales.",
      "消息在定时创建时仅加密一次，服务器按计划投递且无需重新加密（保持端到端加密）。最长期限：私聊 7 天，频道 365 天。",
      "تُشفر الرسائل مرة واحدة عند الجدولة ويسلمها الخادم في الموعد دون إعادة تشفير (مع الحفاظ على التشفير التام). المدى: 7 أيام للدردشات الخاصة، و365 يوماً للقنوات.",
      "پیام‌ها یک بار در زمان برنامه‌ریزی رمزنگاری شده و بدون رمزنگاری مجدد طبق برنامه توسط سرور تحویل داده می‌شوند (حفظ E2EE). بازه: ۷ روز برای چت خصوصی، ۳۶۵ روز برای کانال.",
      "Les messages sont chiffrés une seule fois lors de la planification et livrés par le serveur sans rechiffrement (E2EE préservé). Horizon : 7 jours en privé, 365 jours pour les chaînes.",
      "Nachrichten werden beim Planen einmalig verschlüsselt und vom Server termingerecht ohne Neuverschlüsselung zugestellt (E2EE bleibt erhalten). Horizont: 7 Tage für Privatchats, 365 Tage für Kanäle."
  ],
  "Не удалось отменить": [
      "Failed to cancel",
      "No se pudo cancelar",
      "取消失败",
      "تعذر الإلغاء",
      "لغو ناموفق بود",
      "Impossible d'annuler",
      "Abbrechen fehlgeschlagen"
  ],
  "Информация о чате": [
      "Chat Info",
      "Información del chat",
      "聊天信息",
      "معلومات الدردشة",
      "اطلاعات چت",
      "Infos de la discussion",
      "Chat-Info"
  ],
  "Нет общих фото и видео": [
      "No shared photos or videos",
      "No hay fotos ni videos compartidos",
      "暂无共享照片和视频",
      "لا توجد صور أو فيديوهات مشتركة",
      "عکس و ویدیوی مشترکی وجود ندارد",
      "Aucune photo ou vidéo partagée",
      "Keine geteilten Fotos oder Videos"
  ],
  "Нет прикрепленных файлов": [
      "No attached files",
      "No hay archivos adjuntos",
      "暂无附件文件",
      "لا توجد ملفات مرفقة",
      "فایل پیوستی وجود ندارد",
      "Aucun fichier joint",
      "Keine angehängten Dateien"
  ],
  "Нет голосовых сообщений": [
      "No voice messages",
      "No hay mensajes de voz",
      "暂无语音消息",
      "لا توجد رسائل صوتية",
      "پیام صوتی وجود ندارد",
      "Aucun message vocal",
      "Keine Sprachnachrichten"
  ],
  "Нет ссылок в сообщениях": [
      "No shared links",
      "No hay enlaces en los mensajes",
      "消息中暂无链接",
      "لا توجد روابط في الرسائل",
      "لینکی در پیام‌ها وجود ندارد",
      "Aucun lien dans les messages",
      "Keine Links in Nachrichten"
  ],
  "Медиа (": [
      "Media (",
      "Multimedia (",
      "媒体 (",
      "الوسائط (",
      "رسانه (",
      "Médias (",
      "Medien ("
  ],
  "Файлы (": [
      "Files (",
      "Archivos (",
      "文件 (",
      "الملفات (",
      "فایل‌ها (",
      "Fichiers (",
      "Dateien ("
  ],
  "Голос (": [
      "Voice (",
      "Voz (",
      "语音 (",
      "الصوت (",
      "صدا (",
      "Voix (",
      "Sprache ("
  ],
  "Ссылки (": [
      "Links (",
      "Enlaces (",
      "链接 (",
      "الروابط (",
      "لینک‌ها (",
      "Liens (",
      "Links ("
  ],
  "Редактирование аватара": [
      "Edit Avatar",
      "Editar avatar",
      "编辑头像",
      "تعديل الصورة الرمزية",
      "ویرایش آواتار",
      "Modifier l'avatar",
      "Avatar bearbeiten"
  ],
  "Редактировать аватар": [
      "Edit Avatar",
      "Editar avatar",
      "编辑头像",
      "تعديل الصورة الرمزية",
      "ویرایش آواتار",
      "Modifier l'avatar",
      "Avatar bearbeiten"
  ],
  "Выбрать другое фото из галереи": [
      "Choose another photo from gallery",
      "Elegir otra foto de la galería",
      "从相册选择其他照片",
      "اختر صورة أخرى من المعرض",
      "انتخاب عکس دیگر از گالری",
      "Choisir une autre photo dans la galerie",
      "Anderes Foto aus Galerie wählen"
  ],
  "Сбросить все параметры": [
      "Reset all adjustments",
      "Restablecer todos los parámetros",
      "重置所有调整",
      "إعادة ضبط جميع الإعدادات",
      "بازنشانی تمام تنظیمات",
      "Réinitialiser tous les paramètres",
      "Alle Parameter zurücksetzen"
  ],
  "Загрузка фото...": [
      "Loading photo...",
      "Cargando foto...",
      "正在加载照片...",
      "جارٍ تحميل الصورة...",
      "در حال بارگذاری عکس...",
      "Chargement de la photo...",
      "Foto wird geladen..."
  ],
  "Не удалось загрузить фото": [
      "Failed to load photo",
      "No se pudo cargar la foto",
      "加载照片失败",
      "تعذر تحميل الصورة",
      "بارگذاری عکس ناموفق بود",
      "Impossible de charger la photo",
      "Foto konnte nicht geladen werden"
  ],
  "Выбрать другое": [
      "Choose Another",
      "Elegir otra",
      "选择其他",
      "اختر أخرى",
      "انتخاب عکس دیگر",
      "Choisir une autre",
      "Anderes wählen"
  ],
  "Перетаскивайте фото и настраивайте масштаб": [
      "Drag the photo and adjust zoom",
      "Arrastre la foto y ajuste el zoom",
      "拖动照片并调整缩放比例",
      "اسحب الصورة واضبط مستوى التكبير",
      "عکس را بکشید و بزرگ‌نمایی را تنظیم کنید",
      "Faites glisser la photo et ajustez le zoom",
      "Foto ziehen und Zoom anpassen"
  ],
  "Редактировать текущее": [
      "Edit Current",
      "Editar actual",
      "编辑当前图片",
      "تعديل الحالية",
      "ویرایش تصویر فعلی",
      "Modifier l'actuelle",
      "Aktuelles bearbeiten"
  ],
  "Кадрирование, масштаб и поворот": [
      "Crop, zoom, and rotate",
      "Recortar, escalar y girar",
      "裁剪、缩放与旋转",
      "القص والتكبير والتدوير",
      "برش، بزرگ‌نمایی و چرخش",
      "Recadrage, zoom et rotation",
      "Zuschneiden, Zoomen und Drehen"
  ],
  "Загрузить новое изображение": [
      "Upload New Image",
      "Subir nueva imagen",
      "上传新图片",
      "رفع صورة جديدة",
      "آپلود تصویر جدید",
      "Téléverser une nouvelle image",
      "Neues Bild hochladen"
  ],
  "Удалить фото": [
      "Delete Photo",
      "Eliminar foto",
      "删除照片",
      "حذف الصورة",
      "حذف عکس",
      "Supprimer la photo",
      "Foto löschen"
  ],
  "Вернуть стандартный аватар": [
      "Restore default avatar",
      "Restaurar avatar predeterminado",
      "恢复默认头像",
      "استعادة الصورة الرمزية الافتراضية",
      "بازگردانی آواتار پیش‌فرض",
      "Restaurer l'avatar par défaut",
      "Standard-Avatar wiederherstellen"
  ],
  "Вы (Организатор)": [
      "You (Host)",
      "Tú (Anfitrión)",
      "您（主持人）",
      "أنت (المضيف)",
      "شما (میزبان)",
      "Vous (Organisateur)",
      "Sie (Gastgeber)"
  ],
  "Режим докладчика": [
      "Speaker View",
      "Vista del hablante",
      "演讲者视图",
      "وضع المتحدث",
      "نمای سخنران",
      "Mode intervenant",
      "Sprecheransicht"
  ],
  "Режим сетки": [
      "Grid View",
      "Vista de cuadrícula",
      "网格视图",
      "وضع الشبكة",
      "نمای شبکه‌ای",
      "Mode grille",
      "Rasteransicht"
  ],
  "Включить микрофон": [
      "Unmute Microphone",
      "Activar micrófono",
      "开启麦克风",
      "تشغيل الميكروفون",
      "روشن کردن میکروفون",
      "Activer le micro",
      "Mikrofon aktivieren"
  ],
  "Выключить микрофон": [
      "Mute Microphone",
      "Silenciar micrófono",
      "关闭麦克风",
      "كتم الميكروفون",
      "خاموش کردن میکروفون",
      "Couper le micro",
      "Mikrofon stummschalten"
  ],
  "Включить камеру": [
      "Turn On Camera",
      "Activar cámara",
      "开启摄像头",
      "تشغيل الكاميرا",
      "روشن کردن دوربین",
      "Activer la caméra",
      "Kamera einschalten"
  ],
  "Выключить камеру": [
      "Turn Off Camera",
      "Desactivar cámara",
      "关闭摄像头",
      "إيقاف الكاميرا",
      "خاموش کردن دوربین",
      "Désactiver la caméra",
      "Kamera ausschalten"
  ],
  "Остановить показ экрана": [
      "Stop Screen Share",
      "Detener pantalla compartida",
      "停止共享屏幕",
      "إيقاف مشاركة الشاشة",
      "توقف اشتراک‌گذاری صفحه",
      "Arrêter le partage d'écran",
      "Bildschirmfreigabe beenden"
  ],
  "Поделиться экраном": [
      "Share Screen",
      "Compartir pantalla",
      "共享屏幕",
      "مشاركة الشاشة",
      "اشتراک‌گذاری صفحه",
      "Partager l'écran",
      "Bildschirm teilen"
  ],
  "Завершить вызов": [
      "End Call",
      "Finalizar llamada",
      "结束通话",
      "إنهاء المكالمة",
      "پایان تماس",
      "Terminer l'appel",
      "Anruf beenden"
  ],
  "🛡️ Групповой звонок SFU (сквозное шифрование не применяется)": [
      "🛡️ SFU Group Call (E2EE not applied)",
      "🛡️ Llamada grupal SFU (no se aplica cifrado de extremo a extremo)",
      "🛡️ SFU 群组通话（未启用端到端加密）",
      "🛡️ مكالمة جماعية SFU (التشفير التام غير مطبق)",
      "🛡️ تماس گروهی SFU (رمزنگاری سرتاسری اعمال نمی‌شود)",
      "🛡️ Appel de groupe SFU (chiffrement de bout en bout non appliqué)",
      "🛡️ SFU-Gruppenanruf (Ende-zu-Ende-Verschlüsselung nicht aktiv)"
  ],
  "Докладчик": [
      "Speaker",
      "Hablante",
      "演讲者",
      "المتحدث",
      "سخنران",
      "Intervenant",
      "Sprecher"
  ],
  "Сетка": [
      "Grid",
      "Cuadrícula",
      "网格",
      "شبكة",
      "شبکه",
      "Grille",
      "Raster"
  ],
  "Вы участвуете": [
      "Joined",
      "Participando",
      "已加入",
      "أنت مشارك",
      "شما در تماس هستید",
      "Vous participez",
      "Sie nehmen teil"
  ],
  "Участников:": [
      "Participants:",
      "Participantes:",
      "参与者：",
      "المشاركون:",
      "شرکت‌کنندگان:",
      "Participants :",
      "Teilnehmer:"
  ],
  "Экран": [
      "Screen",
      "Pantalla",
      "屏幕",
      "الشاشة",
      "صفحه‌نمایش",
      "Écran",
      "Bildschirm"
  ],
  "Демонстрация экрана:": [
      "Screen sharing:",
      "Compartiendo pantalla:",
      "屏幕共享：",
      "مشاركة الشاشة:",
      "اشتراک‌گذاری صفحه:",
      "Partage d'écran :",
      "Bildschirmfreigabe:"
  ],
  "Говорит:": [
      "Speaking:",
      "Hablando:",
      "正在发言：",
      "يتحدث:",
      "در حال صحبت:",
      "Parle :",
      "Spricht:"
  ],
  "Ожидание участников...": [
      "Waiting for participants...",
      "Esperando participantes...",
      "等待参与者加入...",
      "في انتظار المشاركين...",
      "در انتظار شرکت‌کنندگان...",
      "En attente de participants...",
      "Warten auf Teilnehmer..."
  ],
  "Вернуться в звонок": [
      "Return to Call",
      "Volver a la llamada",
      "返回通话",
      "العودة إلى المكالمة",
      "بازگشت به تماس",
      "Revenir à l'appel",
      "Zurück zum Anruf"
  ],
  "Присоединиться": [
      "Join",
      "Unirse",
      "加入",
      "انضمام",
      "پیوستن",
      "Rejoindre",
      "Beitreten"
  ],
  "Подключение к звонку...": [
      "Connecting to call...",
      "Conectando a la llamada...",
      "正在连接通话...",
      "جارٍ الاتصال بالمكالمة...",
      "در حال اتصال به تماس...",
      "Connexion à l'appel...",
      "Verbindung zum Anruf..."
  ],
  "Соединение потеряно, переподключение...": [
      "Connection lost, reconnecting...",
      "Conexión perdida, reconectando...",
      "连接中断，正在重新连接...",
      "فُقد الاتصال، جارٍ إعادة الاتصال...",
      "ارتباط قطع شد، در حال اتصال مجدد...",
      "Connexion perdue, reconnexion...",
      "Verbindung verloren, verbinde neu..."
  ],
  "Ошибка вызова": [
      "Call Error",
      "Error de llamada",
      "通话错误",
      "خطأ في المكالمة",
      "خطای تماس",
      "Erreur d'appel",
      "Anruffehler"
  ],
  "SFU-звонок": [
      "SFU Call",
      "Llamada SFU",
      "SFU 通话",
      "مكالمة SFU",
      "تماس SFU",
      "Appel SFU",
      "SFU-Anruf"
  ],
  "Звонит...": [
      "Ringing...",
      "Llamando...",
      "正在呼叫...",
      "يرن...",
      "در حال زنگ خوردن...",
      "Sonnerie...",
      "Klingelt..."
  ],
  "Установите Gossip на iPhone": [
      "Install Gossip on iPhone",
      "Instalar Gossip en iPhone",
      "在 iPhone 上安装 Gossip",
      "تثبيت Gossip على iPhone",
      "نصب Gossip روی آیفون",
      "Installer Gossip sur iPhone",
      "Gossip auf dem iPhone installieren"
  ],
  "Полноценное приложение с Push-уведомлениями": [
      "Full-featured app with Push notifications",
      "Aplicación completa con notificaciones Push",
      "支持推送通知的完整体验应用",
      "تطبيق متكامل مع إشعارات فورية",
      "اپلیکیشن کامل با اعلان‌های آنی (Push)",
      "Application complète avec notifications Push",
      "Vollwertige App mit Push-Benachrichtigungen"
  ],
  "Поделиться": [
      "Share",
      "Compartir",
      "分享",
      "مشاركة",
      "اشتراک‌گذاری",
      "Partager",
      "Teilen"
  ],
  "На экран «Домой»": [
      "Add to Home Screen",
      "Añadir a pantalla de inicio",
      "添加到主屏幕",
      "إضافة إلى الشاشة الرئيسية",
      "افزودن به صفحه اصلی",
      "Sur l'écran d'accueil",
      "Zum Home-Bildschirm"
  ],
  "Понятно, добавлю": [
      "Got it, I'll add it",
      "Entendido, lo añadiré",
      "明白了，这就添加",
      "حسناً، سأضيفه",
      "متوجه شدم، اضافه می‌کنم",
      "Compris, je l'ajoute",
      "Verstanden, füge ich hinzu"
  ],
  "Мгновенные звонки": [
      "Instant Calls",
      "Llamadas instantáneas",
      "即时通话",
      "مكالمات فورية",
      "تماس‌های فوری",
      "Appels instantanés",
      "Sofortanrufe"
  ],
  "Вечное хранение": [
      "Persistent Storage",
      "Almacenamiento permanente",
      "持久存储",
      "تخزين دائم",
      "ذخیره‌سازی دائمی",
      "Stockage permanent",
      "Dauerhafte Speicherung"
  ],
  "Быстродействие": [
      "High Performance",
      "Alto rendimiento",
      "高性能",
      "أداء فائق",
      "سرعت بالا",
      "Haute performance",
      "Hohe Leistung"
  ],
  "Без рамок Safari": [
      "Fullscreen (No Safari Bars)",
      "Sin barras de Safari",
      "无 Safari 边框全屏体验",
      "بدون أشرطة Safari",
      "تمام‌صفحه بدون نوارهای سافاری",
      "Sans barres Safari",
      "Ohne Safari-Leisten"
  ],
  "Нажмите кнопку": [
      "Tap the",
      "Toque el botón",
      "点击",
      "اضغط على زر",
      "دکمه",
      "Appuyez sur le bouton",
      "Tippen Sie auf"
  ],
  "в меню Safari": [
      "button in Safari menu",
      "en el menú de Safari",
      "按钮（在 Safari 菜单中）",
      "في قائمة Safari",
      "را در منوی Safari بزنید",
      "dans le menu Safari",
      "im Safari-Menü"
  ],
  "Выберите пункт": [
      "Select",
      "Seleccione",
      "选择",
      "اختر",
      "گزینه",
      "Sélectionnez",
      "Wählen Sie"
  ],
  "[СТАТУС]": [
      "[STATUS]",
      "[ESTADO]",
      "[状态]",
      "[الحالة]",
      "[وضعیت]",
      "[STATUT]",
      "[STATUS]"
  ],
  "[АКСИОМА]": [
      "[AXIOM]",
      "[AXIOMA]",
      "[公理]",
      "[مسلّمة]",
      "[اصل]",
      "[AXIOME]",
      "[AXIOM]"
  ],
  "[ИТОГ]": [
      "[RESULT]",
      "[RESULTADO]",
      "[结果]",
      "[النتيجة]",
      "[نتیجه]",
      "[RÉSULTAT]",
      "[ERGEBNIS]"
  ],
  "Ошибка загрузки": [
      "Download error",
      "Error de descarga",
      "加载错误",
      "خطأ في التحميل",
      "خطا در بارگذاری",
      "Erreur de chargement",
      "Ladefehler"
  ],
  "Ошибка при отображении настроек": [
      "Error displaying settings",
      "Error al mostrar los ajustes",
      "显示设置时出错",
      "خطأ في عرض الإعدادات",
      "خطا در نمایش تنظیمات",
      "Erreur d'affichage des paramètres",
      "Fehler beim Anzeigen der Einstellungen"
  ],
  "Произошел технический сбой в интерфейсе настроек. Вы можете выйти из профиля и войти заново для сброса состояния:": [
      "A technical error occurred in the settings UI. You can log out and sign back in to reset the state:",
      "Ocurrió un fallo técnico en la interfaz de ajustes. Puede cerrar sesión y volver a entrar para restablecer el estado:",
      "设置界面发生技术故障。您可以退出登录并重新登录以重置状态：",
      "حدث عطل تقني في واجهة الإعدادات. يمكنك تسجيل الخروج والدخول مجدداً لإعادة ضبط الحالة:",
      "یک خطای فنی در رابط تنظیمات رخ داد. برای بازنشانی وضعیت می‌توانید خارج شده و دوباره وارد شوید:",
      "Une erreur technique est survenue dans les paramètres. Vous pouvez vous déconnecter et vous reconnecter :",
      "Ein technischer Fehler ist in den Einstellungen aufgetreten. Sie können sich ab- und wieder anmelden:"
  ],
  "Сбросить данные и выйти": [
      "Reset Data & Log Out",
      "Restablecer datos y salir",
      "重置数据并退出",
      "إعادة ضبط البيانات وتسجيل الخروج",
      "بازنشانی داده‌ها و خروج",
      "Réinitialiser les données et se déconnecter",
      "Daten zurücksetzen & abmelden"
  ],
  "Очень классный стикер!": [
      "Awesome sticker!",
      "¡Qué buen sticker!",
      "超赞的贴纸！",
      "ملصق رائع جداً!",
      "استیکر خیلی باحالیه!",
      "Super autocollant !",
      "Super cooler Sticker!"
  ],
  "Послушал твое сообщение, круто!": [
      "Listened to your voice message, awesome!",
      "¡Escuché tu mensaje, genial!",
      "听了你的语音，太棒了！",
      "استمعت إلى رسالتك، رائع!",
      "پیامت رو گوش دادم، عالی بود!",
      "J'ai écouté ton message, super !",
      "Hab deine Nachricht gehört, klasse!"
  ],
  "Отличный кружок!": [
      "Great video note!",
      "¡Excelente nota de video!",
      "很棒的圆视频！",
      "رسالة فيديو رائعة!",
      "ویدیو مسیج عالی!",
      "Super note vidéo !",
      "Tolle Videonachricht!"
  ],
  "Логи пусты.": [
      "Logs are empty.",
      "Los registros están vacíos.",
      "日志为空。",
      "السجلات فارغة.",
      "لاگ‌ها خالی هستند.",
      "Les journaux sont vides.",
      "Protokolle sind leer."
  ],
  "Логи скопированы в буфер обмена!": [
      "Logs copied to clipboard!",
      "¡Registros copiados al portapapeles!",
      "日志已复制到剪贴板！",
      "تم نسخ السجلات إلى الحافظة!",
      "لاگ‌ها در کلیپ‌بورد کپی شدند!",
      "Journaux copiés dans le presse-papiers !",
      "Protokolle in die Zwischenablage kopiert!"
  ],
  "Не удалось скопировать логи.": [
      "Failed to copy logs.",
      "No se pudieron copiar los registros.",
      "复制日志失败。",
      "تعذر نسخ السجلات.",
      "کپی لاگ‌ها ناموفق بود.",
      "Impossible de copier les journaux.",
      "Protokolle konnten nicht kopiert werden."
  ],
  "Запрос разрешения": [
      "Permission Request",
      "Solicitud de permiso",
      "权限请求",
      "طلب إذن",
      "درخواست مجوز",
      "Demande d'autorisation",
      "Berechtigungsanfrage"
  ],
  "Приложение запрашивает доступ к функции": [
      "The application requests access to",
      "La aplicación solicita acceso a la función",
      "应用程序请求访问功能",
      "يطلب التطبيق الوصول إلى ميزة",
      "برنامه درخواست دسترسی به قابلیت",
      "L'application demande l'accès à la fonction",
      "Die Anwendung fordert Zugriff auf die Funktion"
  ],
  ". Разрешить это действие?": [
      ". Allow this action?",
      ". ¿Permitir esta acción?",
      "。是否允许此操作？",
      ". هل تسمح بهذا الإجراء؟",
      " را دارد. آیا اجازه می‌دهید؟",
      ". Autoriser cette action ?",
      ". Diese Aktion erlauben?"
  ],
  "Спикер 1": [
      "Speaker 1",
      "Hablante 1",
      "发言人 1",
      "المتحدث 1",
      "گوینده ۱",
      "Intervenant 1",
      "Sprecher 1"
  ],
  "Не удалось загрузить информацию о группе. Проверьте подключение к сети.": [
      "Failed to load group info. Check your network connection.",
      "No se pudo cargar la información del grupo. Verifique su conexión.",
      "无法加载群组信息，请检查网络连接。",
      "تعذر تحميل معلومات المجموعة. تحقق من اتصالك بالشبكة.",
      "بارگذاری اطلاعات گروه ناموفق بود. اتصال شبکه را بررسی کنید.",
      "Impossible de charger les infos du groupe. Vérifiez votre connexion.",
      "Gruppeninformationen konnten nicht geladen werden. Prüfen Sie Ihre Netzwerkverbindung."
  ],
  "Действие выполнено": [
      "Action completed",
      "Acción completada",
      "操作已完成",
      "تم تنفيذ الإجراء",
      "عملیات انجام شد",
      "Action effectuée",
      "Aktion ausgeführt"
  ],
  "Ошибка обработки кнопки ботом": [
      "Bot button processing error",
      "Error al procesar el botón por el bot",
      "机器人处理按钮失败",
      "خطأ في معالجة الزر بواسطة البوت",
      "خطا در پردازش دکمه توسط ربات",
      "Erreur de traitement du bouton par le bot",
      "Fehler bei der Verarbeitung der Bot-Schaltfläche"
  ],
  "Сбой соединения с сервером": [
      "Server connection failed",
      "Fallo de conexión con el servidor",
      "与服务器连接失败",
      "فشل الاتصال بالخادم",
      "خطا در اتصال به سرور",
      "Échec de connexion au serveur",
      "Verbindung zum Server fehlgeschlagen"
  ],
  "Сообщение недоступно, попробуйте загрузить историю": [
      "Message unavailable, try loading chat history",
      "Mensaje no disponible, intente cargar el historial",
      "消息不可用，请尝试加载历史记录",
      "الرسالة غير متاحة، حاول تحميل السجل",
      "پیام در دسترس نیست، تاریخچه را بارگذاری کنید",
      "Message indisponible, essayez de charger l'historique",
      "Nachricht nicht verfügbar, versuchen Sie den Verlauf zu laden"
  ],
  "Не удалось загрузить сообщения": [
      "Failed to load messages",
      "No se pudieron cargar los mensajes",
      "无法加载消息",
      "تعذر تحميل الرسائل",
      "بارگذاری پیام‌ها ناموفق بود",
      "Impossible de charger les messages",
      "Nachrichten konnten nicht geladen werden"
  ],
  "Сообщение зашифровано и передано в BLE Mesh эфир": [
      "Message encrypted and broadcast over BLE Mesh",
      "Mensaje cifrado y transmitido por BLE Mesh",
      "消息已加密并通过 BLE Mesh 广播",
      "تم تشفير الرسالة وبثها عبر BLE Mesh",
      "پیام رمزنگاری و در شبکه BLE Mesh مخابره شد",
      "Message chiffré et diffusé via BLE Mesh",
      "Nachricht verschlüsselt und über BLE-Mesh gesendet"
  ],
  "Ошибка шифрования для BLE Mesh: открытый текст заблокирован от отправки в эфир": [
      "BLE Mesh encryption error: plaintext blocked from air broadcast",
      "Error de cifrado BLE Mesh: texto plano bloqueado",
      "BLE Mesh 加密错误：已阻止明文广播",
      "خطأ تشفير BLE Mesh: تم حظر إرسال النص المكشوف",
      "خطای رمزنگاری BLE Mesh: ارسال متن خام مسدود شد",
      "Erreur de chiffrement BLE Mesh : texte en clair bloqué",
      "BLE-Mesh-Verschlüsselungsfehler: Klartext vom Senden blockiert"
  ],
  "Ошибка шифрования: сообщение не отправлено, сохранено в очередь (Fail-Closed)": [
      "Encryption error: message not sent, saved to outbox (Fail-Closed)",
      "Error de cifrado: mensaje guardado en cola (Fail-Closed)",
      "加密错误：消息未发送，已存入待发队列 (Fail-Closed)",
      "خطأ تشفير: لم تُرسل الرسالة، حُفظت في قائمة الانتظار (Fail-Closed)",
      "خطای رمزنگاری: پیام ارسال نشد و در صف ذخیره گردید (Fail-Closed)",
      "Erreur de chiffrement : message mis en file d'attente (Fail-Closed)",
      "Verschlüsselungsfehler: Nachricht in Warteschlange gespeichert (Fail-Closed)"
  ],
  "Ошибка MLS-шифрования: сообщение не отправлено, сохранено в очередь (Fail-Closed)": [
      "MLS encryption error: message not sent, saved to outbox (Fail-Closed)",
      "Error de cifrado MLS: mensaje guardado en cola (Fail-Closed)",
      "MLS 加密错误：消息未发送，已存入待发队列 (Fail-Closed)",
      "خطأ تشفير MLS: لم تُرسل الرسالة، حُفظت في قائمة الانتظار (Fail-Closed)",
      "خطای رمزنگاری MLS: پیام ارسال نشد و در صف ذخیره گردید (Fail-Closed)",
      "Erreur de chiffrement MLS : message mis en file d'attente (Fail-Closed)",
      "MLS-Verschlüsselungsfehler: Nachricht in Warteschlange gespeichert (Fail-Closed)"
  ],
  "Голосовое сообщение зашифровано и передано в BLE Mesh эфир": [
      "Voice message encrypted and broadcast over BLE Mesh",
      "Mensaje de voz cifrado y transmitido por BLE Mesh",
      "语音消息已加密并通过 BLE Mesh 广播",
      "تم تشفير الرسالة الصوتية وبثها عبر BLE Mesh",
      "پیام صوتی رمزنگاری و در BLE Mesh مخابره شد",
      "Message vocal chiffré et diffusé via BLE Mesh",
      "Sprachnachricht verschlüsselt und über BLE-Mesh gesendet"
  ],
  "Ошибка шифрования медиа: загрузка заблокирована (Fail-Closed)": [
      "Media encryption error: upload blocked (Fail-Closed)",
      "Error de cifrado multimedia: subida bloqueada (Fail-Closed)",
      "媒体加密错误：上传已阻止 (Fail-Closed)",
      "خطأ تشفير الوسائط: تم حظر الرفع (Fail-Closed)",
      "خطای رمزنگاری رسانه: آپلود مسدود شد (Fail-Closed)",
      "Erreur de chiffrement média : téléversement bloqué (Fail-Closed)",
      "Medienverschlüsselungsfehler: Upload blockiert (Fail-Closed)"
  ],
  "Не удалось загрузить медиафайл": [
      "Failed to upload media file",
      "No se pudo subir el archivo multimedia",
      "无法上传媒体文件",
      "تعذر رفع ملف الوسائط",
      "بارگذاری فایل رسانه ناموفق بود",
      "Impossible de téléverser le fichier média",
      "Mediendatei konnte nicht geladen werden"
  ],
  "Ошибка шифрования медиа: сообщение не отправлено, сохранено в очередь (Fail-Closed)": [
      "Media encryption error: message saved to outbox (Fail-Closed)",
      "Error de cifrado multimedia: mensaje guardado en cola (Fail-Closed)",
      "媒体加密错误：消息已存入待发队列 (Fail-Closed)",
      "خطأ تشفير الوسائط: حُفظت الرسالة في قائمة الانتظار (Fail-Closed)",
      "خطای رمزنگاری رسانه: پیام در صف ذخیره شد (Fail-Closed)",
      "Erreur de chiffrement média : message mis en file d'attente (Fail-Closed)",
      "Medienverschlüsselungsfehler: Nachricht in Warteschlange gespeichert (Fail-Closed)"
  ],
  "Ошибка MLS-шифрования медиа: сообщение не отправлено, сохранено в очередь (Fail-Closed)": [
      "MLS media encryption error: message saved to outbox (Fail-Closed)",
      "Error de cifrado multimedia MLS: mensaje guardado en cola (Fail-Closed)",
      "MLS 媒体加密错误：消息已存入待发队列 (Fail-Closed)",
      "خطأ تشفير وسائط MLS: حُفظت الرسالة في قائمة الانتظار (Fail-Closed)",
      "خطای رمزنگاری رسانه MLS: پیام در صف ذخیره شد (Fail-Closed)",
      "Erreur de chiffrement média MLS : message mis en file d'attente (Fail-Closed)",
      "MLS-Medienverschlüsselungsfehler: Nachricht in Warteschlange gespeichert (Fail-Closed)"
  ],
  "Вы автоматически входите в группу как создатель": [
      "You are automatically added to the group as its creator",
      "Entras automáticamente al grupo como creador",
      "作为创建者，您将自动加入群组",
      "تُضاف تلقائياً إلى المجموعة كمنشئ لها",
      "شما به‌طور خودکار به عنوان سازنده وارد گروه می‌شوید",
      "Vous rejoignez automatiquement le groupe en tant que créateur",
      "Sie treten der Gruppe automatisch als Ersteller bei"
  ],
  "Пользователь уже добавлен": [
      "User is already added",
      "El usuario ya fue añadido",
      "该用户已添加",
      "تمت إضافة المستخدم بالفعل",
      "کاربر قبلاً اضافه شده است",
      "L'utilisateur est déjà ajouté",
      "Benutzer wurde bereits hinzugefügt"
  ],
  "Пользователь не найден в системе": [
      "User not found in the system",
      "Usuario no encontrado en el sistema",
      "系统中未找到该用户",
      "المستخدم غير موجود في النظام",
      "کاربر در سیستم یافت نشد",
      "Utilisateur introuvable dans le système",
      "Benutzer im System nicht gefunden"
  ],
  "Ошибка поиска участника": [
      "Member search error",
      "Error al buscar miembro",
      "搜索成员出错",
      "خطأ في البحث عن العضو",
      "خطا در جستجوی عضو",
      "Erreur lors de la recherche du membre",
      "Fehler bei der Mitgliedersuche"
  ],
  "MLS сессия для этой группы не найдена. Откройте управление группой заново.": [
      "MLS session for this group not found. Reopen group management.",
      "Sesión MLS no encontrada. Reabra la gestión del grupo.",
      "未找到该群组的 MLS 会话，请重新打开群组管理。",
      "لم يتم العثور على جلسة MLS لهذه المجموعة. أعد فتح إدارة المجموعة.",
      "نشست MLS برای این گروه یافت نشد. مدیریت گروه را دوباره باز کنید.",
      "Session MLS introuvable pour ce groupe. Rouvrez la gestion du groupe.",
      "MLS-Sitzung für diese Gruppe nicht gefunden. Gruppenverwaltung neu öffnen."
  ],
  "Вы не можете удалить самого себя из группы.": [
      "You cannot remove yourself from the group.",
      "No puedes eliminarte a ti mismo del grupo.",
      "您不能将自己移出群组。",
      "لا يمكنك إزالة نفسك من المجموعة.",
      "شما نمی‌توانید خودتان را از گروه حذف کنید.",
      "Vous ne pouvez pas vous retirer vous-même du groupe.",
      "Sie können sich nicht selbst aus der Gruppe entfernen."
  ],
  "Локальные MLS ключи не найдены": [
      "Local MLS keys not found",
      "Claves MLS locales no encontradas",
      "未找到本地 MLS 密钥",
      "لم يتم العثور على مفاتيح MLS المحلية",
      "کلیدهای محلی MLS یافت نشدند",
      "Clés MLS locales introuvables",
      "Lokale MLS-Schlüssel nicht gefunden"
  ],
  "Ошибка сервера при выселении участника": [
      "Server error while removing member",
      "Error del servidor al expulsar al miembro",
      "移除成员时服务器出错",
      "خطأ في الخادم أثناء إزالة العضو",
      "خطای سرور هنگام حذف عضو",
      "Erreur du serveur lors de l'exclusion du membre",
      "Serverfehler beim Entfernen des Mitglieds"
  ],
  "Вы уже находитесь в этой группе": [
      "You are already in this group",
      "Ya estás en este grupo",
      "您已在此群组中",
      "أنت موجود بالفعل في هذه المجموعة",
      "شما در حال حاضر عضو این گروه هستید",
      "Vous êtes déjà dans ce groupe",
      "Sie sind bereits in dieser Gruppe"
  ],
  "Пользователь уже является участником группы": [
      "User is already a group member",
      "El usuario ya es miembro del grupo",
      "该用户已是群组成员",
      "المستخدم عضو بالفعل في المجموعة",
      "کاربر قبلاً عضو گروه است",
      "L'utilisateur est déjà membre du groupe",
      "Benutzer ist bereits Gruppenmitglied"
  ],
  "Сервер вернул ошибку при добавлении участника в группу": [
      "Server returned an error while adding member to group",
      "El servidor devolvió un error al añadir al miembro",
      "添加群组成员时服务器返回错误",
      "أرجع الخادم خطأ أثناء إضافة العضو إلى المجموعة",
      "سرور هنگام افزودن عضو به گروه خطا برگرداند",
      "Le serveur a renvoyé une erreur lors de l'ajout du membre",
      "Serverfehler beim Hinzufügen des Mitglieds zur Gruppe"
  ],
  "Выберите хотя бы одного участника группы": [
      "Select at least one group member",
      "Seleccione al menos un miembro del grupo",
      "请至少选择一名群组成员",
      "اختر عضواً واحداً على الأقل للمجموعة",
      "حداقل یک عضو برای گروه انتخاب کنید",
      "Sélectionnez au moins un membre du groupe",
      "Wählen Sie mindestens ein Gruppenmitglied aus"
  ],
  "Сервер вернул ошибку при создании группы": [
      "Server returned an error while creating group",
      "El servidor devolvió un error al crear el grupo",
      "创建群组时服务器返回错误",
      "أرجع الخادم خطأ أثناء إنشاء المجموعة",
      "سرور هنگام ایجاد گروه خطا برگرداند",
      "Le serveur a renvoyé une erreur lors de la création du groupe",
      "Serverfehler beim Erstellen der Gruppe"
  ],
  "Вы не можете создать чат с самим собой": [
      "You cannot create a chat with yourself",
      "No puedes crear un chat contigo mismo",
      "您不能与自己创建聊天",
      "لا يمكنك إنشاء دردشة مع نفسك",
      "نمی‌توانید با خودتان چت ایجاد کنید",
      "Vous ne pouvez pas créer un chat avec vous-même",
      "Sie können keinen Chat mit sich selbst erstellen"
  ],
  "Введите название папки": [
      "Enter folder name",
      "Ingrese el nombre de la carpeta",
      "请输入文件夹名称",
      "أدخل اسم المجلد",
      "نام پوشه را وارد کنید",
      "Entrez le nom du dossier",
      "Ordnernamen eingeben"
  ],
  "Папка успешно обновлена": [
      "Folder updated",
      "Carpeta actualizada con éxito",
      "文件夹已更新",
      "تم تحديث المجلد بنجاح",
      "پوشه با موفقیت به‌روزرسانی شد",
      "Dossier mis à jour",
      "Ordner erfolgreich aktualisiert"
  ],
  "Папка успешно создана": [
      "Folder created",
      "Carpeta creada con éxito",
      "文件夹已创建",
      "تم إنشاء المجلد بنجاح",
      "پوشه با موفقیت ایجاد شد",
      "Dossier créé",
      "Ordner erfolgreich erstellt"
  ],
  "Не удалось сохранить папку": [
      "Failed to save folder",
      "No se pudo guardar la carpeta",
      "无法保存文件夹",
      "تعذر حفظ المجلد",
      "ذخیره پوشه ناموفق بود",
      "Impossible d'enregistrer le dossier",
      "Ordner konnte nicht gespeichert werden"
  ],
  "Папка удалена": [
      "Folder deleted",
      "Carpeta eliminada",
      "文件夹已删除",
      "تم حذف المجلد",
      "پوشه حذف شد",
      "Dossier supprimé",
      "Ordner gelöscht"
  ],
  "Не удалось удалить папку": [
      "Failed to delete folder",
      "No se pudo eliminar la carpeta",
      "无法删除文件夹",
      "تعذر حذف المجلد",
      "حذف پوشه ناموفق بود",
      "Impossible de supprimer le dossier",
      "Ordner konnte nicht gelöscht werden"
  ],
  "Загрузка для кадрирования...": [
      "Loading for cropping...",
      "Cargando para recortar...",
      "正在加载裁剪...",
      "جارٍ التحميل للقص...",
      "در حال بارگذاری جهت برش...",
      "Chargement pour recadrage...",
      "Wird zum Zuschneiden geladen..."
  ],
  "Не удалось открыть фото": [
      "Failed to open photo",
      "No se pudo abrir la foto",
      "无法打开照片",
      "تعذر فتح الصورة",
      "باز کردن عکس ناموفق بود",
      "Impossible d'ouvrir la photo",
      "Foto konnte nicht geöffnet werden"
  ],
  "Загрузка для редактирования...": [
      "Loading for editing...",
      "Cargando para editar...",
      "正在加载编辑...",
      "جارٍ التحميل للتعديل...",
      "در حال بارگذاری جهت ویرایش...",
      "Chargement pour modification...",
      "Wird zum Bearbeiten geladen..."
  ],
  "Аватар удален": [
      "Avatar removed",
      "Avatar eliminado",
      "头像已删除",
      "تمت إزالة الصورة الرمزية",
      "آواتار حذف شد",
      "Avatar supprimé",
      "Avatar entfernt"
  ],
  "Аватар группы сброшен": [
      "Group avatar reset",
      "Avatar del grupo restablecido",
      "群组头像已重置",
      "تمت إعادة ضبط صورة المجموعة",
      "آواتار گروه بازنشانی شد",
      "Avatar du groupe réinitialisé",
      "Gruppen-Avatar zurückgesetzt"
  ],
  "Аватар успешно обновлен!": [
      "Avatar updated!",
      "¡Avatar actualizado con éxito!",
      "头像已更新！",
      "تم تحديث الصورة الرمزية بنجاح!",
      "آواتار با موفقیت به‌روزرسانی شد!",
      "Avatar mis à jour !",
      "Avatar erfolgreich aktualisiert!"
  ],
  "Не удалось сохранить аватар в профиле.": [
      "Failed to save profile avatar.",
      "No se pudo guardar el avatar en el perfil.",
      "无法保存个人资料头像。",
      "تعذر حفظ الصورة الرمزية في الملف الشخصي.",
      "ذخیره آواتار در پروفایل ناموفق بود.",
      "Impossible d'enregistrer l'avatar dans le profil.",
      "Profil-Avatar konnte nicht gespeichert werden."
  ],
  "Не удалось загрузить аватар. Попробуйте еще раз.": [
      "Failed to upload avatar. Please try again.",
      "No se pudo subir el avatar. Inténtelo de nuevo.",
      "头像上传失败，请重试。",
      "تعذر رفع الصورة الرمزية. حاول مرة أخرى.",
      "آپلود آواتار ناموفق بود. دوباره تلاش کنید.",
      "Impossible de téléverser l'avatar. Réessayez.",
      "Avatar konnte nicht hochgeladen werden. Bitte erneut versuchen."
  ],
  "Аватар группы успешно обновлен!": [
      "Group avatar updated!",
      "¡Avatar del grupo actualizado!",
      "群组头像已更新！",
      "تم تحديث صورة المجموعة بنجاح!",
      "آواتار گروه با موفقیت به‌روزرسانی شد!",
      "Avatar du groupe mis à jour !",
      "Gruppen-Avatar erfolgreich aktualisiert!"
  ],
  "Не удалось сохранить аватар группы.": [
      "Failed to save group avatar.",
      "No se pudo guardar el avatar del grupo.",
      "无法保存群组头像。",
      "تعذر حفظ صورة المجموعة.",
      "ذخیره آواتار گروه ناموفق بود.",
      "Impossible d'enregistrer l'avatar du groupe.",
      "Gruppen-Avatar konnte nicht gespeichert werden."
  ],
  "Не удалось загрузить аватар группы. Попробуйте еще раз.": [
      "Failed to upload group avatar. Please try again.",
      "No se pudo subir el avatar del grupo. Inténtelo de nuevo.",
      "上传群组头像失败，请重试。",
      "تعذر رفع صورة المجموعة. حاول مرة أخرى.",
      "آپلود آواتار گروه ناموفق بود. دوباره تلاش کنید.",
      "Impossible de téléverser l'avatar du groupe. Réessayez.",
      "Gruppen-Avatar konnte nicht hochgeladen werden. Bitte erneut versuchen."
  ],
  "Название группы не может быть пустым.": [
      "Group name cannot be empty.",
      "El nombre del grupo no puede estar vacío.",
      "群组名称不能为空。",
      "لا يمكن أن يكون اسم المجموعة فارغاً.",
      "نام گروه نمی‌تواند خالی باشد.",
      "Le nom du groupe ne peut pas être vide.",
      "Gruppenname darf nicht leer sein."
  ],
  "Название группы успешно обновлено!": [
      "Group name updated!",
      "¡Nombre del grupo actualizado!",
      "群组名称已更新！",
      "تم تحديث اسم المجموعة بنجاح!",
      "نام گروه با موفقیت به‌روزرسانی شد!",
      "Nom du groupe mis à jour !",
      "Gruppenname erfolgreich aktualisiert!"
  ],
  "Не удалось сохранить название группы.": [
      "Failed to save group name.",
      "No se pudo guardar el nombre del grupo.",
      "无法保存群组名称。",
      "تعذر حفظ اسم المجموعة.",
      "ذخیره نام گروه ناموفق بود.",
      "Impossible d'enregistrer le nom du groupe.",
      "Gruppenname konnte nicht gespeichert werden."
  ],
  "Не удалось обновить название группы. Попробуйте еще раз.": [
      "Failed to update group name. Please try again.",
      "No se pudo actualizar el nombre del grupo. Inténtelo de nuevo.",
      "更新群组名称失败，请重试。",
      "تعذر تحديث اسم المجموعة. حاول مرة أخرى.",
      "به‌روزرسانی نام گروه ناموفق بود. دوباره تلاش کنید.",
      "Impossible de mettre à jour le nom du groupe. Réessayez.",
      "Gruppenname konnte nicht aktualisiert werden. Bitte erneut versuchen."
  ],
  "Неверный ответ от сервера": [
      "Invalid server response",
      "Respuesta inválida del servidor",
      "服务器响应无效",
      "استجابة غير صالحة من الخادم",
      "پاسخ نامعتبر از سرور",
      "Réponse invalide du serveur",
      "Ungültige Serverantwort"
  ],
  "Не удалось загрузить файл на сервер.": [
      "Failed to upload file to server.",
      "No se pudo subir el archivo al servidor.",
      "无法将文件上传到服务器。",
      "تعذر رفع الملف إلى الخادم.",
      "آپلود فایل به سرور ناموفق بود.",
      "Impossible de téléverser le fichier sur le serveur.",
      "Datei konnte nicht auf den Server hochgeladen werden."
  ],
  "Не удалось отправить фото": [
      "Failed to send photo",
      "No se pudo enviar la foto",
      "无法发送照片",
      "تعذر إرسال الصورة",
      "ارسال عکس ناموفق بود",
      "Impossible d'envoyer la photo",
      "Foto konnte nicht gesendet werden"
  ],
  "Просмотреть аватар": [
      "View Avatar",
      "Ver avatar",
      "查看头像",
      "عرض الصورة الرمزية",
      "مشاهده آواتار",
      "Voir l'avatar",
      "Avatar ansehen"
  ],
  "Укажите название бота": [
      "Enter bot name",
      "Ingrese el nombre del bot",
      "请输入机器人名称",
      "أدخل اسم البوت",
      "نام ربات را وارد کنید",
      "Entrez le nom du bot",
      "Bot-Namen eingeben"
  ],
  "Юзернейм бота обязан оканчиваться на bot или _bot (например, helper_bot)": [
      "Bot username must end with 'bot' or '_bot' (e.g., helper_bot)",
      "El usuario del bot debe terminar en 'bot' o '_bot' (ej. helper_bot)",
      "机器人用户名必须以 bot 或 _bot 结尾（例如 helper_bot）",
      "يجب أن ينتهي اسم مستخدم البوت بـ bot أو _bot (مثل helper_bot)",
      "نام کاربری ربات باید به bot یا _bot ختم شود (مثلاً helper_bot)",
      "Le nom d'utilisateur du bot doit se terminer par bot ou _bot (ex. helper_bot)",
      "Bot-Benutzername muss auf bot oder _bot enden (z. B. helper_bot)"
  ],
  "Ошибка при создании бота": [
      "Failed to create bot",
      "Error al crear el bot",
      "创建机器人失败",
      "خطأ أثناء إنشاء البوت",
      "خطا در ساخت ربات",
      "Erreur lors de la création du bot",
      "Fehler beim Erstellen des Bots"
  ],
  "Сбой сети при создании бота": [
      "Network error while creating bot",
      "Error de red al crear el bot",
      "创建机器人时网络出错",
      "خطأ في الشبكة أثناء إنشاء البوت",
      "خطای شبکه هنگام ساخت ربات",
      "Erreur réseau lors de la création du bot",
      "Netzwerkfehler beim Erstellen des Bots"
  ],
  "Укажите текст кнопки и команду или ссылку": [
      "Specify button label and command or URL",
      "Indique el texto del botón y el comando o enlace",
      "请填写按钮文字以及命令或链接",
      "حدد نص الزر والأمر أو الرابط",
      "متن دکمه و دستور یا لینک را مشخص کنید",
      "Indiquez le texte du bouton et la commande ou le lien",
      "Schaltflächentext und Befehl oder Link angeben"
  ],
  "Укажите команду (например: faq, price, rules)": [
      "Specify command trigger (e.g., faq, price, rules)",
      "Indique el comando (ej.: faq, price, rules)",
      "请指定命令（例如：faq, price, rules）",
      "حدد الأمر (مثال: faq, price, rules)",
      "دستور را مشخص کنید (مثلاً: faq, price, rules)",
      "Indiquez la commande (ex. : faq, price, rules)",
      "Befehl angeben (z. B.: faq, price, rules)"
  ],
  "Укажите текст автоответа бота на эту команду": [
      "Enter the bot's auto-reply text for this command",
      "Indique el texto de autorrespuesta del bot",
      "请输入机器人对该命令的自动回复内容",
      "أدخل نص الرد التلقائي للبوت على هذا الأمر",
      "متن پاسخ خودکار ربات به این دستور را وارد کنید",
      "Entrez le texte de réponse automatique pour cette commande",
      "Auto-Antworttext des Bots für diesen Befehl eingeben"
  ],
  "Команда бота": [
      "Bot Command",
      "Comando del bot",
      "机器人命令",
      "أمر البوت",
      "دستور ربات",
      "Commande du bot",
      "Bot-Befehl"
  ],
  "Настройки и команды бота успешно сохранены!": [
      "Bot settings and commands saved!",
      "¡Ajustes y comandos del bot guardados!",
      "机器人设置与命令已保存！",
      "تم حفظ إعدادات وأوامر البوت بنجاح!",
      "تنظیمات و دستورات ربات با موفقیت ذخیره شد!",
      "Paramètres et commandes du bot enregistrés !",
      "Bot-Einstellungen und Befehle gespeichert!"
  ],
  "Не удалось сохранить настройки": [
      "Failed to save settings",
      "No se pudieron guardar los ajustes",
      "无法保存设置",
      "تعذر حفظ الإعدادات",
      "ذخیره تنظیمات ناموفق بود",
      "Impossible d'enregistrer les paramètres",
      "Einstellungen konnten nicht gespeichert werden"
  ],
  "Ошибка сети при сохранении": [
      "Network error while saving",
      "Error de red al guardar",
      "保存时网络出错",
      "خطأ في الشبكة أثناء الحفظ",
      "خطای شبکه هنگام ذخیره",
      "Erreur réseau lors de l'enregistrement",
      "Netzwerkfehler beim Speichern"
  ],
  "Токен бота успешно обновлен!": [
      "Bot token rotated!",
      "¡Token del bot actualizado!",
      "机器人令牌已更新！",
      "تم تحديث رمز البوت بنجاح!",
      "توکن ربات با موفقیت بازتولید شد!",
      "Jeton du bot renouvelé !",
      "Bot-Token erfolgreich erneuert!"
  ],
  "Не удалось перевыпустить токен": [
      "Failed to rotate token",
      "No se pudo regenerar el token",
      "无法重新生成令牌",
      "تعذر إعادة إصدار الرمز",
      "بازتولید توکن ناموفق بود",
      "Impossible de renouveler le jeton",
      "Token konnte nicht erneuert werden"
  ],
  "Ошибка сети при ротации токена": [
      "Network error while rotating token",
      "Error de red al rotar el token",
      "轮换令牌时网络出错",
      "خطأ في الشبكة أثناء تدوير الرمز",
      "خطای شبکه هنگام چرخش توکن",
      "Erreur réseau lors du renouvellement du jeton",
      "Netzwerkfehler bei der Token-Rotation"
  ],
  "Вебхук успешно настроен и активирован": [
      "Webhook configured and activated",
      "Webhook configurado y activado",
      "Webhook 已成功配置并启用",
      "تم إعداد وتفعيل Webhook بنجاح",
      "وب‌هوک با موفقیت تنظیم و فعال شد",
      "Webhook configuré et activé",
      "Webhook erfolgreich eingerichtet und aktiviert"
  ],
  "Не удалось настроить вебхук": [
      "Failed to configure webhook",
      "No se pudo configurar el webhook",
      "无法配置 Webhook",
      "تعذر إعداد Webhook",
      "تنظیم وب‌هوک ناموفق بود",
      "Impossible de configurer le webhook",
      "Webhook konnte nicht eingerichtet werden"
  ],
  "Ошибка сети при сохранении вебхука": [
      "Network error while saving webhook",
      "Error de red al guardar el webhook",
      "保存 Webhook 时网络出错",
      "خطأ في الشبكة أثناء حفظ Webhook",
      "خطای شبکه هنگام ذخیره وب‌هوک",
      "Erreur réseau lors de l'enregistrement du webhook",
      "Netzwerkfehler beim Speichern des Webhooks"
  ],
  "Вебхук удален. Бот переведен в режим Long-polling": [
      "Webhook removed. Bot switched to Long-polling mode",
      "Webhook eliminado. Bot en modo Long-polling",
      "Webhook 已移除，机器人已切换至长轮询模式",
      "تم حذف Webhook. تم تحويل البوت إلى وضع Long-polling",
      "وب‌هوک حذف شد. ربات به حالت Long-polling منتقل گردید",
      "Webhook supprimé. Bot passé en mode Long-polling",
      "Webhook entfernt. Bot auf Long-Polling umgestellt"
  ],
  "Не удалось удалить вебхук": [
      "Failed to delete webhook",
      "No se pudo eliminar el webhook",
      "无法删除 Webhook",
      "تعذر حذف Webhook",
      "حذف وب‌هوک ناموفق بود",
      "Impossible de supprimer le webhook",
      "Webhook konnte nicht entfernt werden"
  ],
  "Ошибка сети при удалении вебхука": [
      "Network error while deleting webhook",
      "Error de red al eliminar el webhook",
      "删除 Webhook 时网络出错",
      "خطأ في الشبكة أثناء حذف Webhook",
      "خطای شبکه هنگام حذف وب‌هوک",
      "Erreur réseau lors de la suppression du webhook",
      "Netzwerkfehler beim Löschen des Webhooks"
  ],
  "Не удалось выполнить пинг вебхука": [
      "Webhook ping failed",
      "No se pudo hacer ping al webhook",
      "Webhook Ping 失败",
      "تعذر تنفيذ Ping لـ Webhook",
      "پینگ وب‌هوک ناموفق بود",
      "Échec du ping webhook",
      "Webhook-Ping fehlgeschlagen"
  ],
  "Ошибка соединения при пинге вебхука": [
      "Connection error during webhook ping",
      "Error de conexión al hacer ping al webhook",
      "Ping Webhook 时连接出错",
      "خطأ اتصال أثناء Ping لـ Webhook",
      "خطای اتصال هنگام پینگ وب‌هوک",
      "Erreur de connexion lors du ping webhook",
      "Verbindungsfehler beim Webhook-Ping"
  ],
  "Не удалось удалить бота": [
      "Failed to delete bot",
      "No se pudo eliminar el bot",
      "无法删除机器人",
      "تعذر حذف البوت",
      "حذف ربات ناموفق بود",
      "Impossible de supprimer le bot",
      "Bot konnte nicht gelöscht werden"
  ],
  "Ошибка сети при удалении бота": [
      "Network error while deleting bot",
      "Error de red al eliminar el bot",
      "删除机器人时网络出错",
      "خطأ في الشبكة أثناء حذف البوت",
      "خطای شبکه هنگام حذف ربات",
      "Erreur réseau lors de la suppression du bot",
      "Netzwerkfehler beim Löschen des Bots"
  ],
  "Не удалось получить путь к скачанному файлу обновления": [
      "Failed to get path to downloaded update file",
      "No se pudo obtener la ruta del archivo de actualización",
      "无法获取已下载更新文件的路径",
      "تعذر الحصول على مسار ملف التحديث المُنزّل",
      "مسیر فایل به‌روزرسانی دانلود شده دریافت نشد",
      "Impossible d'obtenir le chemin du fichier de mise à jour",
      "Pfad zur heruntergeladenen Update-Datei konnte nicht ermittelt werden"
  ],
  ": ''}). Нажмите «Повторить».": [
      ": ''}). Tap 'Retry'.",
      ": ''}). Toque «Reintentar».",
      ": ''})。请点击“重试”。",
      ": ''}). اضغط على «إعادة المحاولة».",
      ": ''}). روی «تلاش مجدد» بزنید.",
      ": ''}). Appuyez sur « Réessayer ».",
      ": ''}). Tippen Sie auf „Wiederholen“."
  ],
  "Сбой сетевого подключения при скачивании обновления. Нажмите кнопку «Повторить загрузку».": [
      "Network connection failed while downloading update. Tap 'Retry Download'.",
      "Fallo de red al descargar la actualización. Toque «Reintentar descarga».",
      "下载更新时网络连接失败。请点击“重新下载”按钮。",
      "انقطع الاتصال أثناء تنزيل التحديث. اضغط على «إعادة تنزيل».",
      "خطای شبکه هنگام دانلود به‌روزرسانی. دکمه «تلاش مجدد» را بزنید.",
      "Échec réseau lors du téléchargement de la mise à jour. Appuyez sur « Réessayer ».",
      "Netzwerkfehler beim Herunterladen des Updates. Tippen Sie auf „Download wiederholen“."
  ],
  "⭐ Gossip Premium активирован!": [
      "⭐ Gossip Premium activated!",
      "¡⭐ Gossip Premium activado!",
      "⭐ Gossip Premium 已激活！",
      "⭐ تم تفعيل Gossip Premium!",
      "⭐ اشتراک Gossip Premium فعال شد!",
      "⭐ Gossip Premium activé !",
      "⭐ Gossip Premium aktiviert!"
  ],
  "⭐ Gossip Premium активен!": [
      "⭐ Gossip Premium is active!",
      "¡⭐ Gossip Premium está activo!",
      "⭐ Gossip Premium 生效中！",
      "⭐ اشتراك Gossip Premium نشط!",
      "⭐ اشتراک Gossip Premium فعال است!",
      "⭐ Gossip Premium est actif !",
      "⭐ Gossip Premium ist aktiv!"
  ],
  "Подписка Gossip Premium завершена": [
      "Gossip Premium subscription ended",
      "Suscripción a Gossip Premium finalizada",
      "Gossip Premium 订阅已到期",
      "انتهى اشتراك Gossip Premium",
      "اشتراک Gossip Premium به پایان رسید",
      "Abonnement Gossip Premium terminé",
      "Gossip Premium-Abonnement beendet"
  ],
  "Ключи расшифровки недоступны": [
      "Decryption keys unavailable",
      "Claves de descifrado no disponibles",
      "解密密钥不可用",
      "مفاتيح فك التشفير غير متاحة",
      "کلیدهای رمزگشایی در دسترس نیستند",
      "Clés de déchiffrement indisponibles",
      "Entschlüsselungsschlüssel nicht verfügbar"
  ],
  "Вход без PIN-кода включен": [
      "PIN-less login enabled",
      "Inicio de sesión sin PIN activado",
      "免 PIN 码登录已开启",
      "تم تفعيل الدخول بدون رمز PIN",
      "ورود بدون رمز PIN فعال شد",
      "Connexion sans code PIN activée",
      "Anmeldung ohne PIN aktiviert"
  ],
  "PIN-код будет запрашиваться при входе": [
      "PIN code will be required at login",
      "Se solicitará el código PIN al iniciar sesión",
      "登录时将要求输入 PIN 码",
      "سيُطلب رمز PIN عند تسجيل الدخول",
      "هنگام ورود رمز PIN درخواست خواهد شد",
      "Le code PIN sera demandé à la connexion",
      "PIN-Code wird bei der Anmeldung abgefragt"
  ],
  "Фоновая служба активна в бесшумном режиме": [
      "Background service active in silent mode",
      "Servicio en segundo plano activo en modo silencioso",
      "后台服务已在静默模式下运行",
      "الخدمة الخلفية نشطة في الوضع الصامت",
      "سرویس پس‌زمینه در حالت بی‌صدا فعال است",
      "Service en arrière-plan actif en mode silencieux",
      "Hintergrunddienst im lautlosen Modus aktiv"
  ],
  "Фоновая служба остановлена, системная плашка убрана": [
      "Background service stopped, system notification dismissed",
      "Servicio en segundo plano detenido, notificación oculta",
      "后台服务已停止，系统通知栏已移除",
      "توقفت الخدمة الخلفية وأُزيل الإشعار",
      "سرویس پس‌زمینه متوقف و اعلان سیستم حذف شد",
      "Service en arrière-plan arrêté, notification masquée",
      "Hintergrunddienst gestoppt, Systembenachrichtigung ausgeblendet"
  ],
  "PIN-код должен состоять минимум из 4 символов": [
      "PIN code must be at least 4 characters",
      "El código PIN debe tener al menos 4 caracteres",
      "PIN 码至少需要 4 个字符",
      "يجب أن يتكون رمز PIN من 4 أحرف على الأقل",
      "رمز PIN باید حداقل ۴ کاراکتر باشد",
      "Le code PIN doit comporter au moins 4 caractères",
      "Der PIN-Code muss mindestens 4 Zeichen lang sein"
  ],
  "Доступ разрешён только создателю": [
      "Access restricted to creator only",
      "Acceso permitido solo al creador",
      "仅限创建者访问",
      "الوصول مسموح للمنشئ فقط",
      "دسترسی فقط برای سازنده مجاز است",
      "Accès réservé au créateur",
      "Zugriff nur für den Ersteller erlaubt"
  ],
  "Пользователь #%": [
      "User #%",
      "Usuario #%",
      "用户 #%",
      "مستخدم #%",
      "کاربر #%",
      "Utilisateur #%",
      "Benutzer #%"
  ],
  "Пользователь #": [
      "User #",
      "Usuario #",
      "用户 #",
      "مستخدم #",
      "کاربر #",
      "Utilisateur #",
      "Benutzer #"
  ],
  "Ошибка при сохранении настроек Сейф-Контура": [
      "Failed to save Safe-Contour settings",
      "Error al guardar los ajustes de Contorno Seguro",
      "保存安全围栏设置失败",
      "خطأ أثناء حفظ إعدادات المحيط الآمن",
      "خطا در ذخیره تنظیمات کانتور امن",
      "Erreur lors de l'enregistrement du Contour Sécurisé",
      "Fehler beim Speichern der Safe-Contour-Einstellungen"
  ],
  "Инициализация защищенной сессии MTProto...": [
      "Initializing secure MTProto session...",
      "Inicializando sesión segura MTProto...",
      "正在初始化安全 MTProto 会话...",
      "جارٍ تهيئة جلسة MTProto الآمنة...",
      "در حال راه‌اندازی نشست امن MTProto...",
      "Initialisation de la session sécurisée MTProto...",
      "Sichere MTProto-Sitzung wird initialisiert..."
  ],
  "Получение PoW задачи от сервера...": [
      "Fetching PoW challenge from server...",
      "Obteniendo desafío PoW del servidor...",
      "正在从服务器获取 PoW 挑战...",
      "جارٍ جلب تحدي PoW من الخادم...",
      "در حال دریافت چالش PoW از سرور...",
      "Récupération du défi PoW...",
      "PoW-Challenge wird vom Server abgerufen..."
  ],
  "Проверка Proof-of-Work токена...": [
      "Verifying Proof-of-Work token...",
      "Verificando token Proof-of-Work...",
      "正在验证工作量证明 (PoW) 令牌...",
      "جارٍ التحقق من رمز إثبات العمل (PoW)...",
      "در حال تایید توکن گواهی اثبات کار (PoW)...",
      "Vérification du jeton Proof-of-Work...",
      "Proof-of-Work-Token wird überprüft..."
  ],
  "Проверка подлинности среды (Device Attestation)...": [
      "Verifying Device Attestation...",
      "Verificando integridad del dispositivo...",
      "正在验证设备环境完整性...",
      "جارٍ التحقق من موثوقية الجهاز...",
      "در حال بررسی اصالت دستگاه (Device Attestation)...",
      "Vérification de l'attestation de l'appareil...",
      "Geräte-Attestierung wird überprüft..."
  ],
  "Запрос параметров SRP 6a (соль, B)...": [
      "Requesting SRP 6a parameters (salt, B)...",
      "Solicitando parámetros SRP 6a (sal, B)...",
      "正在请求 SRP 6a 参数 (salt, B)...",
      "جارٍ طلب معلمات SRP 6a...",
      "در حال درخواست پارامترهای SRP 6a...",
      "Requête des paramètres SRP 6a (sel, B)...",
      "SRP-6a-Parameter (Salt, B) werden angefordert..."
  ],
  "Сервер авторизации недоступен. Проверьте подключение к сети и адрес бэкенда.": [
      "Auth server unreachable. Check your network connection and backend URL.",
      "Servidor de autenticación no disponible. Verifique su red.",
      "认证服务器不可用，请检查网络连接。",
      "خادم المصادقة غير متاح. تحقق من اتصالك بالشبكة.",
      "سرور احراز هویت در دسترس نیست. اتصال شبکه را بررسی کنید.",
      "Serveur d'authentification indisponible. Vérifiez votre connexion.",
      "Authentifizierungsserver nicht erreichbar. Prüfen Sie Ihre Netzwerkverbindung."
  ],
  "Вычисление эфемерного ключа клиента...": [
      "Computing client ephemeral key...",
      "Calculando clave efímera del cliente...",
      "正在计算客户端临时密钥...",
      "جارٍ حساب المفتاح المؤقت للعميل...",
      "در حال محاسبه کلید موقت کلاینت...",
      "Calcul de la clé éphémère client...",
      "Ephemerer Client-Schlüssel wird berechnet..."
  ],
  "Расчет общего сессионного секрета S...": [
      "Deriving shared session secret S...",
      "Calculando secreto compartido de sesión S...",
      "正在推导共享会话密钥 S...",
      "جارٍ اشتقاق سر الجلسة المشترك S...",
      "در حال محاسبه راز نشست مشترک S...",
      "Calcul du secret de session partagé S...",
      "Gemeinsames Sitzungsgeheimnis S wird berechnet..."
  ],
  "Генерация подтверждения M1...": [
      "Generating M1 proof...",
      "Generando prueba de confirmación M1...",
      "正在生成 M1 确认证明...",
      "جارٍ توليد إثبات التأكيد M1...",
      "در حال تولید تاییدیه M1...",
      "Génération de la preuve M1...",
      "M1-Bestätigung wird generiert..."
  ],
  "Аутентификация SRP 6a на сервере...": [
      "Authenticating via SRP 6a...",
      "Autenticando mediante SRP 6a...",
      "正在通过 SRP 6a 进行服务器认证...",
      "جارٍ المصادقة عبر SRP 6a...",
      "در حال احراز هویت SRP 6a روی سرور...",
      "Authentification SRP 6a sur le serveur...",
      "SRP-6a-Authentifizierung auf dem Server..."
  ],
  "Расшифровка базы данных SQLCipher...": [
      "Decrypting SQLCipher database...",
      "Descifrando base de datos SQLCipher...",
      "正在解密 SQLCipher 数据库...",
      "جارٍ فك تشفير قاعدة بيانات SQLCipher...",
      "در حال رمزگشایی پایگاه داده SQLCipher...",
      "Déchiffrement de la base SQLCipher...",
      "SQLCipher-Datenbank wird entschlüsselt..."
  ],
  "В ответе профиля отсутствует userId": [
      "Profile response is missing userId",
      "Falta userId en la respuesta del perfil",
      "个人资料响应中缺少 userId",
      "معرف المستخدم userId مفقود في استجابة الملف الشخصي",
      "شناسه کاربری در پاسخ پروفایل وجود ندارد",
      "userId manquant dans la réponse du profil",
      "userId fehlt in der Profilantwort"
  ],
  "Авторизация успешна!": [
      "Authenticated successfully!",
      "¡Autenticación exitosa!",
      "登录成功！",
      "تمت المصادقة بنجاح!",
      "احراز هویت موفقیت‌آمیز بود!",
      "Authentification réussie !",
      "Authentifizierung erfolgreich!"
  ],
  "Ошибка авторизации": [
      "Authentication failed",
      "Error de autenticación",
      "认证失败",
      "فشلت المصادقة",
      "خطا در احراز هویت",
      "Échec d'authentification",
      "Authentifizierungsfehler"
  ],
  "Инициализация криптографической мастер-энтропии (BIP-39)...": [
      "Initializing master cryptographic entropy (BIP-39)...",
      "Inicializando entropía criptográfica maestra (BIP-39)...",
      "正在初始化主加密熵 (BIP-39)...",
      "جارٍ تهيئة الإنتروبيا التشفيرية الرئيسية (BIP-39)...",
      "در حال مقداردهی آنتروپی رمزنگاری (BIP-39)...",
      "Initialisation de l'entropie maîtresse (BIP-39)...",
      "Kryptografische Master-Entropie (BIP-39) wird initialisiert..."
  ],
  "Генерация криптографической Seed-фразы (12 слов)...": [
      "Generating 12-word cryptographic Seed phrase...",
      "Generando frase semilla criptográfica (12 palabras)...",
      "正在生成 12 词加密助记词...",
      "جارٍ توليد عبارة البذرة التشفيرية (12 كلمة)...",
      "در حال تولید عبارت بازیابی ۱۲ کلمه‌ای...",
      "Génération de la phrase secrète (12 mots)...",
      "Kryptografische Seed-Phrase (12 Wörter) wird generiert..."
  ],
  "Ошибка регистрации": [
      "Registration failed",
      "Error de registro",
      "注册失败",
      "فشل التسجيل",
      "خطا در ثبت‌نام",
      "Échec de l'inscription",
      "Registrierungsfehler"
  ],
  "Регистрация пользователя с защитой BIP-39...": [
      "Registering user with BIP-39 protection...",
      "Registrando usuario con protección BIP-39...",
      "正在使用 BIP-39 保护注册用户...",
      "جارٍ تسجيل المستخدم بحماية BIP-39...",
      "در حال ثبت‌نام کاربر با حفاظت BIP-39...",
      "Inscription de l'utilisateur avec protection BIP-39...",
      "Benutzerregistrierung mit BIP-39-Schutz..."
  ],
  "Аккаунт успешно создан! Выполняем защищенный вход...": [
      "Account created! Signing in securely...",
      "¡Cuenta creada! Iniciando sesión de forma segura...",
      "账户创建成功！正在安全登录...",
      "تم إنشاء الحساب بنجاح! جارٍ تسجيل الدخول الآمن...",
      "حساب با موفقیت ساخته شد! در حال ورود امن...",
      "Compte créé avec succès ! Connexion sécurisée...",
      "Konto erfolgreich erstellt! Sichere Anmeldung läuft..."
  ],
  "Введите имя пользователя": [
      "Enter username",
      "Ingrese nombre de usuario",
      "请输入用户名",
      "أدخل اسم المستخدم",
      "نام کاربری را وارد کنید",
      "Entrez le nom d'utilisateur",
      "Benutzernamen eingeben"
  ],
  "Введите ровно 12 корректных слов мнемонической фразы через пробел (стандарт BIP-39)": [
      "Enter exactly 12 valid mnemonic words separated by spaces (BIP-39 standard)",
      "Ingrese exactamente 12 palabras mnemotécnicas válidas separadas por espacios (BIP-39)",
      "请输入以空格分隔的 12 个有效助记词（BIP-39 标准）",
      "أدخل 12 كلمة استرداد صحيحة مفصولة بمسافات (معيار BIP-39)",
      "دقیقاً ۱۲ کلمه عبارت بازیابی معتبر را با فاصله وارد کنید (استاندارد BIP-39)",
      "Entrez exactement 12 mots mnémoniques valides séparés par des espaces (BIP-39)",
      "Geben Sie genau 12 gültige Mnemonic-Wörter durch Leerzeichen getrennt ein (BIP-39)"
  ],
  "Новый пароль должен содержать минимум 6 символов": [
      "New password must be at least 6 characters",
      "La nueva contraseña debe tener al menos 6 caracteres",
      "新密码至少需要 6 个字符",
      "يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل",
      "رمز عبور جدید باید حداقل ۶ کاراکتر باشد",
      "Le nouveau mot de passe doit contenir au moins 6 caractères",
      "Das neue Passwort muss mindestens 6 Zeichen lang sein"
  ],
  "Пароли не совпадают": [
      "Passwords do not match",
      "Las contraseñas no coinciden",
      "两次输入的密码不一致",
      "كلمتا المرور غير متطابقتين",
      "رمزهای عبور مطابقت ندارند",
      "Les mots de passe ne correspondent pas",
      "Passwörter stimmen nicht überein"
  ],
  "Пользователь не найден": [
      "User not found",
      "Usuario no encontrado",
      "未找到用户",
      "المستخدم غير موجود",
      "کاربر یافت نشد",
      "Utilisateur introuvable",
      "Benutzer nicht gefunden"
  ],
  "Неверная мнемоническая фраза": [
      "Invalid mnemonic recovery phrase",
      "Frase mnemotécnica inválida",
      "助记词无效",
      "عبارة الاسترداد غير صالحة",
      "عبارت بازیابی نامعتبر است",
      "Phrase mnémonique invalide",
      "Ungültige Mnemonic-Phrase"
  ],
  "Пароль успешно восстановлен! Выполняем вход...": [
      "Password reset! Signing in...",
      "¡Contraseña restablecida! Iniciando sesión...",
      "密码重置成功！正在登录...",
      "تمت استعادة كلمة المرور! جارٍ تسجيل الدخول...",
      "رمز عبور با موفقیت بازیابی شد! در حال ورود...",
      "Mot de passe réinitialisé ! Connexion...",
      "Passwort erfolgreich wiederhergestellt! Anmeldung läuft..."
  ],
  "Ошибка восстановления доступа": [
      "Account recovery failed",
      "Error al recuperar el acceso",
      "恢复访问失败",
      "فشل استرداد الحساب",
      "خطا در بازیابی دسترسی",
      "Échec de la récupération d'accès",
      "Fehler bei der Kontowiederherstellung"
  ],
  "Одноразовая Burner-комната активна": [
      "Burner room is active",
      "Sala temporal Burner activa",
      "阅后即焚房间已激活",
      "الغرفة المؤقتة نشطة",
      "اتاق یک‌بارمصرف Burner فعال است",
      "Salon éphémère Burner actif",
      "Burner-Raum ist aktiv"
  ],
  "🔥 Одноразовая Burner-комната и все сообщения уничтожены": [
      "🔥 Burner room and all messages have been destroyed",
      "🔥 Sala Burner y todos los mensajes destruidos",
      "🔥 阅后即焚房间及所有消息已彻底销毁",
      "🔥 تم تدمير الغرفة المؤقتة وجميع الرسائل",
      "🔥 اتاق Burner و تمام پیام‌ها نابود شدند",
      "🔥 Salon éphémère et messages détruits",
      "🔥 Burner-Raum und alle Nachrichten vernichtet"
  ],
  "Одноразовая Burner-ссылка недействительна или уже уничтожена": [
      "Burner link is invalid or already destroyed",
      "El enlace Burner no es válido o ya fue destruido",
      "阅后即焚链接无效或已销毁",
      "الرابط المؤقت غير صالح أو تم تدميره بالفعل",
      "لینک یک‌بارمصرف نامعتبر است یا قبلاً نابود شده",
      "Lien Burner invalide ou déjà détruit",
      "Burner-Link ungültig oder bereits vernichtet"
  ],
  "Сессия истекла, войдите снова": [
      "Session expired, please sign in again",
      "La sesión expiró, inicie sesión de nuevo",
      "会话已过期，请重新登录",
      "انتهت الجلسة، يرجى تسجيل الدخول مجدداً",
      "نشست منقضی شد، دوباره وارد شوید",
      "Session expirée, veuillez vous reconnecter",
      "Sitzung abgelaufen, bitte erneut anmelden"
  ],
  "[Ошибка": [
      "[Error",
      "[Error",
      "[错误",
      "[خطأ",
      "[خطا",
      "[Erreur",
      "[Fehler"
  ],
  "[Ошибка%": [
      "[Error%",
      "[Error%",
      "[错误%",
      "[خطأ%",
      "[خطا%",
      "[Erreur%",
      "[Fehler%"
  ],
  "[Ключ": [
      "[Key",
      "[Clave",
      "[密钥",
      "[مفتاح",
      "[کلید",
      "[Clé",
      "[Schlüssel"
  ],
  "[Ключ%": [
      "[Key%",
      "[Clave%",
      "[密钥%",
      "[مفتاح%",
      "[کلید%",
      "[Clé%",
      "[Schlüssel%"
  ],
  "не зашифровано": [
      "unencrypted",
      "sin cifrar",
      "未加密",
      "غير مشفر",
      "رمزنگاری نشده",
      "non chiffré",
      "unverschlüsselt"
  ],
  "Системное сообщение:": [
      "System message:",
      "Mensaje del sistema:",
      "系统消息：",
      "رسالة النظام:",
      "پیام سیستم:",
      "Message système :",
      "Systemnachricht:"
  ],
  "Звонок завершен": [
      "Call ended",
      "Llamada finalizada",
      "通话已结束",
      "انتهت المكالمة",
      "تماس پایان یافت",
      "Appel terminé",
      "Anruf beendet"
  ],
  "Собеседник принял вызов": [
      "Contact answered the call",
      "El contacto aceptó la llamada",
      "对方已接听",
      "قبل الطرف الآخر المكالمة",
      "مخاطب تماس را پذیرفت",
      "Le contact a accepté l'appel",
      "Kontakt hat den Anruf angenommen"
  ],
  "Нажмите, чтобы открыть окно обновления приложения": [
      "Tap to open the app update window",
      "Toque para abrir la ventana de actualización",
      "点击打开应用更新窗口",
      "اضغط لفتح نافذة تحديث التطبيق",
      "برای باز کردن پنجره به‌روزرسانی ضربه بزنید",
      "Appuyez pour ouvrir la fenêtre de mise à jour",
      "Tippen, um das App-Update-Fenster zu öffnen"
  ],
  "Назад к топикам": [
      "Back to topics",
      "Volver a los temas",
      "返回话题列表",
      "العودة إلى المواضيع",
      "بازگشت به تاپیک‌ها",
      "Retour aux sujets",
      "Zurück zu Themen"
  ],
  "Назад к чатам": [
      "Back to chats",
      "Volver a los chats",
      "返回聊天列表",
      "العودة إلى الدردشات",
      "بازگشت به چت‌ها",
      "Retour aux discussions",
      "Zurück zu Chats"
  ],
  "К списку топиков": [
      "To topics list",
      "A la lista de temas",
      "前往话题列表",
      "إلى قائمة المواضيع",
      "به لیست تاپیک‌ها",
      "Vers la liste des sujets",
      "Zur Themenliste"
  ],
  "Информация о канале": [
      "Channel Info",
      "Información del canal",
      "频道信息",
      "معلومات القناة",
      "اطلاعات کانال",
      "Infos du canal",
      "Kanal-Info"
  ],
  "Групповой звонок": [
      "Group Call",
      "Llamada grupal",
      "群组通话",
      "مكالمة جماعية",
      "تماس گروهی",
      "Appel de groupe",
      "Gruppenanruf"
  ],
  "Аудиовызов": [
      "Voice Call",
      "Llamada de voz",
      "语音通话",
      "مكالمة صوتية",
      "تماس صوتی",
      "Appel audio",
      "Sprachanruf"
  ],
  "Криптоперевод TON": [
      "TON Crypto Transfer",
      "Transferencia cripto TON",
      "TON 加密货币转账",
      "تحويل TON المشفر",
      "انتقال رمزارز TON",
      "Transfert crypto TON",
      "TON-Krypto-Überweisung"
  ],
  "Перевод криптовалюты TON / USDT": [
      "TON / USDT Crypto Transfer",
      "Transferencia cripto TON / USDT",
      "TON / USDT 加密货币转账",
      "تحويل عملات TON / USDT",
      "انتقال رمزارز TON / USDT",
      "Transfert crypto TON / USDT",
      "TON / USDT Krypto-Überweisung"
  ],
  "Пропущенный": [
      "Missed",
      "Perdida",
      "未接",
      "فائتة",
      "بی‌پاسخ",
      "Manqué",
      "Verpasst"
  ],
  "Отклоненный": [
      "Declined",
      "Rechazada",
      "已拒绝",
      "مرفوضة",
      "رد شده",
      "Refusé",
      "Abgelehnt"
  ],
  "Отмененный": [
      "Cancelled",
      "Cancelada",
      "已取消",
      "ملغاة",
      "لغو شده",
      "Annulé",
      "Abgebrochen"
  ],
  "Звонок": [
      "Call",
      "Llamada",
      "通话",
      "مكالمة",
      "تماس",
      "Appel",
      "Anruf"
  ],
  "Исходящий": [
      "Outgoing",
      "Saliente",
      "呼出",
      "صادرة",
      "خروجی",
      "Sortant",
      "Ausgehend"
  ],
  "Входящий": [
      "Incoming",
      "Entrante",
      "呼入",
      "واردة",
      "ورودی",
      "Entrant",
      "Eingehend"
  ],
  "Перезвонить": [
      "Call Back",
      "Devolver llamada",
      "回拨",
      "إعادة الاتصال",
      "تماس مجدد",
      "Rappeler",
      "Zurückrufen"
  ],
  "Опрос": [
      "Poll",
      "Encuesta",
      "投票",
      "استطلاع رأي",
      "نظرسنجی",
      "Sondage",
      "Umfrage"
  ],
  "Счет на оплату TON": [
      "TON Payment Invoice",
      "Factura de pago TON",
      "TON 付款账单",
      "فاتورة دفع TON",
      "فاکتور پرداخت TON",
      "Facture de paiement TON",
      "TON-Zahlungsrechnung"
  ],
  "Отложенные сообщения": [
      "Scheduled Messages",
      "Mensajes programados",
      "定时消息",
      "الرسائل المجدولة",
      "پیام‌های زمان‌بندی شده",
      "Messages programmés",
      "Geplante Nachrichten"
  ],
  "Отложить это сообщение…": [
      "Schedule this message…",
      "Programar este mensaje…",
      "定时发送此消息…",
      "جدولة هذه الرسالة…",
      "زمان‌بندی این پیام…",
      "Programmer ce message…",
      "Diese Nachricht planen…"
  ],
  "Только администраторы могут публиковать сообщения": [
      "Only admins can post messages",
      "Solo los administradores pueden publicar mensajes",
      "仅管理员可发布消息",
      "يمكن للمشرفين فقط نشر الرسائل",
      "فقط مدیران می‌توانند پیام منتشر کنند",
      "Seuls les administrateurs peuvent publier",
      "Nur Administratoren können Nachrichten senden"
  ],
  "📹 Входящий видеозвонок": [
      "📹 Incoming Video Call",
      "📹 Videollamada entrante",
      "📹 视频通话来电",
      "📹 مكالمة فيديو واردة",
      "📹 تماس تصویری ورودی",
      "📹 Appel vidéo entrant",
      "📹 Eingehender Videoanruf"
  ],
  "📞 Входящий аудиозвонок": [
      "📞 Incoming Voice Call",
      "📞 Llamada de voz entrante",
      "📞 语音通话来电",
      "📞 مكالمة صوتية واردة",
      "📞 تماس صوتی ورودی",
      "📞 Appel audio entrant",
      "📞 Eingehender Sprachanruf"
  ],
  "Редактирование фото профиля": [
      "Edit Profile Photo",
      "Editar foto de perfil",
      "编辑个人资料照片",
      "تعديل صورة الملف الشخصي",
      "ویرایش عکس پروفایل",
      "Modifier la photo de profil",
      "Profilbild bearbeiten"
  ],
  "Редактирование фото группы": [
      "Edit Group Photo",
      "Editar foto del grupo",
      "编辑群组照片",
      "تعديل صورة المجموعة",
      "ویرایش عکس گروه",
      "Modifier la photo du groupe",
      "Gruppenbild bearbeiten"
  ],
  "Фотография профиля": [
      "Profile Photo",
      "Foto de perfil",
      "个人资料照片",
      "صورة الملف الشخصي",
      "عکس پروفایل",
      "Photo de profil",
      "Profilbild"
  ],
  "Ваш профиль": [
      "Your Profile",
      "Tu perfil",
      "您的个人资料",
      "ملفك الشخصي",
      "پروفایل شما",
      "Votre profil",
      "Ihr Profil"
  ],
  "Фотография группы": [
      "Group Photo",
      "Foto del grupo",
      "群组照片",
      "صورة المجموعة",
      "عکس گروه",
      "Photo du groupe",
      "Gruppenbild"
  ],
  "Защищенный SFU-звонок": [
      "Secure SFU Call",
      "Llamada SFU segura",
      "安全 SFU 通话",
      "مكالمة SFU آمنة",
      "تماس امن SFU",
      "Appel SFU sécurisé",
      "Sicherer SFU-Anruf"
  ],
  "Опрос / Гражданская инициатива": [
      "Poll / Civic Initiative",
      "Encuesta / Iniciativa ciudadana",
      "投票 / 公民倡议",
      "استطلاع / مبادرة مدنية",
      "نظرسنجی / ابتکار مدنی",
      "Sondage / Initiative citoyenne",
      "Umfrage / Bürgerinitiative"
  ],
  "Локальное или глобальное пороговое голосование с ZK-подтверждением голосов.": [
      "Local or global threshold voting with ZK-verified ballots.",
      "Votación por umbral local o global con verificación ZK.",
      "支持零知识选票验证的本地或全局阈值投票。",
      "تصويت محلي أو عالمي بالعتبة مع التحقق بصفر معرفة (ZK).",
      "رای‌گیری آستانه‌ای محلی یا جهانی با تایید دانش صفر (ZK).",
      "Vote à seuil local ou global avec vérification ZK.",
      "Lokale oder globale Schwellenwert-Abstimmung mit ZK-Stimmenbestätigung."
  ],
  "Консенсус & Опросы": [
      "Consensus & Polls",
      "Consenso y Encuestas",
      "共识与投票",
      "التوافق والاستطلاعات",
      "اجماع و نظرسنجی‌ها",
      "Consensus & Sondages",
      "Konsens & Umfragen"
  ],
  "опрос": [
      "poll",
      "encuesta",
      "投票",
      "استطلاع",
      "نظرسنجی",
      "sondage",
      "Umfrage"
  ],
  "голосование": [
      "voting",
      "votación",
      "表决",
      "تصويت",
      "رای‌گیری",
      "vote",
      "Abstimmung"
  ],
  "кворум": [
      "quorum",
      "quórum",
      "法定人数",
      "نصاب",
      "نصاب",
      "quorum",
      "Quorum"
  ],
  "Инициатива благоустройства района / Опрос сообщества": [
      "District Improvement Initiative / Community Poll",
      "Iniciativa de mejora barrial / Encuesta comunitaria",
      "社区环境改善倡议 / 社区投票",
      "مبادرة تطوير الحي / استطلاع المجتمع",
      "ابتکار بهسازی محله / نظرسنجی محلی",
      "Initiative d'aménagement local / Sondage communautaire",
      "Nachbarschaftsinitiative / Community-Umfrage"
  ],
  "Собираем мнения жителей и формируем коллективное решение с пороговым консенсусом.": [
      "Gathering resident opinions to form a collective threshold-consensus decision.",
      "Recopilando opiniones vecinales para formar una decisión colectiva por consenso.",
      "收集居民意见并通过阈值共识形成集体决议。",
      "جمع آراء السكان وتشكيل قرار جماعي بتوافق العتبة.",
      "جمع‌آوری نظرات ساکنین و شکل‌دهی تصمیم جمعی با اجماع آستانه‌ای.",
      "Recueil des avis des résidents pour une décision collective à seuil.",
      "Meinungen sammeln und kollektive Entscheidungen mit Schwellenwert-Konsens treffen."
  ],
  "Поддержать инициативу (ЗА)": [
      "Support Initiative (FOR)",
      "Apoyar iniciativa (A FAVOR)",
      "支持倡议（赞成）",
      "دعم المبادرة (مع)",
      "حمایت از ابتکار (موافق)",
      "Soutenir l'initiative (POUR)",
      "Initiative unterstützen (DAFÜR)"
  ],
  "Отклонить инициативу (ПРОТИВ)": [
      "Reject Initiative (AGAINST)",
      "Rechazar iniciativa (EN CONTRA)",
      "反对倡议（反对）",
      "رفض المبادرة (ضد)",
      "رد ابتکار (مخالف)",
      "Rejeter l'initiative (CONTRE)",
      "Initiative ablehnen (DAGEGEN)"
  ],
  "Сбор средств / Взаимопомощь": [
      "Fundraising / Mutual Aid",
      "Recaudación / Ayuda mutua",
      "筹款 / 互助",
      "جمع التبرعات / التكافل",
      "جمع‌آوری کمک / همیاری",
      "Collecte de fonds / Entraide",
      "Spendenaktion / Nachbarschaftshilfe"
  ],
  "Прозрачный краудфандинг и адресная помощь на базе блокчейна TON с прозрачной отчетностью.": [
      "Transparent crowdfunding and targeted aid powered by TON blockchain.",
      "Crowdfunding transparente y ayuda directa en la blockchain TON.",
      "基于 TON 区块链的透明众筹与定向互助。",
      "تمويل جماعي شفاف ومساعدات موجهة عبر بلوكتشين TON.",
      "تامین مالی جمعی شفاف و کمک هدفمند بر بستر بلاکچین TON.",
      "Financement participatif transparent et aide ciblée sur la blockchain TON.",
      "Transparentes Crowdfunding und gezielte Hilfe auf Basis der TON-Blockchain."
  ],
  "Взаимопомощь & Сборы": [
      "Mutual Aid & Crowdfunding",
      "Ayuda Mutua y Recaudación",
      "互助与众筹",
      "التكافل وجمع التبرعات",
      "همیاری و کمک‌های مردمی",
      "Entraide & Collectes",
      "Hilfe & Spenden"
  ],
  "помощь": [
      "aid",
      "ayuda",
      "互助",
      "مساعدة",
      "کمک",
      "aide",
      "Hilfe"
  ],
  "краудфандинг": [
      "crowdfunding",
      "crowdfunding",
      "众筹",
      "تمويل جماعي",
      "کراودفاندینگ",
      "financement participatif",
      "Crowdfunding"
  ],
  "донаты": [
      "donations",
      "donaciones",
      "捐赠",
      "تبرعات",
      "دونیت",
      "dons",
      "Spenden"
  ],
  "Сбор средств на гуманитарную помощь / общественный проект": [
      "Humanitarian Aid / Community Project Fundraiser",
      "Recaudación para ayuda humanitaria / proyecto comunitario",
      "人道主义援助 / 公共项目筹款",
      "جمع تبرعات للمساعدات الإنسانية / مشروع مجتمعي",
      "جمع‌آوری کمک‌های بشردوستانه / پروژه عمومی",
      "Collecte pour l'aide humanitaire / projet communautaire",
      "Spendensammlung für humanitäre Hilfe / Gemeinschaftsprojekt"
  ],
  "Адресный сбор средств с автоматическим учетом всех донатов и ончейн-прозрачностью.": [
      "Targeted fundraising with automated donation tracking and on-chain transparency.",
      "Recaudación directa con registro automático de donaciones y transparencia en cadena.",
      "自动统计所有捐赠并具备链上透明度的定向筹款。",
      "جمع تبرعات موجه مع تتبع تلقائي وشفافية كاملة على السلسلة.",
      "جمع‌آوری هدفمند کمک‌ها با ثبت خودکار و شفافیت آن‌چین.",
      "Collecte ciblée avec suivi automatique des dons et transparence on-chain.",
      "Gezielte Spendensammlung mit automatischer Erfassung und On-Chain-Transparenz."
  ],
  "Поиск исполнителя / Гиг-задача": [
      "Find Freelancer / Gig Task",
      "Buscar profesional / Tarea Gig",
      "寻找自由职业者 / 悬赏任务",
      "البحث عن منفذ / مهمة عمل حر",
      "جستجوی مجری / تسک پروژه‌ای",
      "Recherche de prestataire / Mission",
      "Auftragnehmer suchen / Gig-Aufgabe"
  ],
  "Заказ на разработку, аудит или услуги с фиксацией вознаграждения в смарт-контракте.": [
      "Development, audit, or service order with smart-contract escrow reward.",
      "Pedido de desarrollo, auditoría o servicios con recompensa asegurada en contrato inteligente.",
      "在智能合约中锁定报酬的开发、审计或服务委托。",
      "طلب تطوير أو تدقيق أو خدمات مع تأمين المكافأة في عقد ذكي.",
      "سفارش توسعه، ممیزی یا خدمات با قفل شدن پاداش در قرارداد هوشمند.",
      "Commande de développement, d'audit ou de service garantie par contrat intelligent.",
      "Entwicklungs-, Audit- oder Dienstleistungsauftrag mit Smart-Contract-Vergütung."
  ],
  "Карьера & Задачи": [
      "Careers & Tasks",
      "Carrera y Tareas",
      "职业与任务",
      "المهام والوظائف",
      "کار و پروژه‌ها",
      "Carrière & Missions",
      "Karriere & Aufgaben"
  ],
  "работа": [
      "work",
      "trabajo",
      "工作",
      "عمل",
      "کار",
      "travail",
      "Arbeit"
  ],
  "гиг": [
      "gig",
      "gig",
      "悬赏",
      "مهمة",
      "گیگ",
      "mission",
      "Gig"
  ],
  "разработка": [
      "development",
      "desarrollo",
      "开发",
      "تطوير",
      "توسعه",
      "développement",
      "Entwicklung"
  ],
  "Разработка смарт-контракта / Frontend-компонента": [
      "Smart Contract / Frontend Component Development",
      "Desarrollo de contrato inteligente / componente Frontend",
      "开发智能合约 / 前端组件",
      "تطوير عقد ذكي / مكون واجهة أمامية",
      "توسعه قرارداد هوشمند / کامپوننت فرانت‌اند",
      "Développement de contrat intelligent / composant Frontend",
      "Smart-Contract- / Frontend-Komponenten-Entwicklung"
  ],
  "Требуется опытный специалист. Оплата защищена смарт-эскроу после успешной приемки.": [
      "Experienced specialist needed. Payout is protected by smart escrow upon acceptance.",
      "Se busca especialista con experiencia. Pago protegido por depósito en garantía inteligente.",
      "诚聘经验丰富的专家，验收通过后由智能托管合约保障放款。",
      "مطلوب متخصص ذو خبرة. الدفع محمي عبر عقد الضمان الذكي بعد الاستلام.",
      "نیازمند متخصص باتجربه. پرداخت پس از تایید نهایی توسط قرارداد هوشمند اسکرو تضمین می‌شود.",
      "Spécialiste expérimenté recherché. Paiement protégé par entiercement intelligent.",
      "Erfahrener Spezialist gesucht. Zahlung nach Abnahme durch Smart-Escrow geschützt."
  ],
  "P2P Обмен / Наличные & Ликвидность": [
      "P2P Swap / Cash & Liquidity",
      "Intercambio P2P / Efectivo y Liquidez",
      "P2P 兑换 / 现金与流动性",
      "تبادل P2P / النقد والسيولة",
      "تبادل P2P / نقدینگی و ارز",
      "Échange P2P / Espèces & Liquidité",
      "P2P-Tausch / Bargeld & Liquidität"
  ],
  "Безопасный слепой обмен валют, наличных или криптоактивов без посредников.": [
      "Secure blind peer-to-peer currency, cash, or crypto exchange without intermediaries.",
      "Intercambio directo y seguro de divisas, efectivo o criptoactivos sin intermediarios.",
      "无需中介的安全盲态货币、现金或加密资产点对点兑换。",
      "تبادل آمن ومباشر للعملات أو النقد أو الأصول المشفرة بدون وسطاء.",
      "تبادل امن و مستقیم ارز، پول نقد یا دارایی‌های رمزارزی بدون واسطه.",
      "Échange pair-à-pair sécurisé de devises, d'espèces ou de crypto sans intermédiaire.",
      "Sicherer direkter Tausch von Währungen, Bargeld oder Krypto-Assets ohne Zwischenhändler."
  ],
  "P2P Ликвидность": [
      "P2P Liquidity",
      "Liquidez P2P",
      "P2P 流动性",
      "سيولة P2P",
      "نقدینگی P2P",
      "Liquidité P2P",
      "P2P-Liquidität"
  ],
  "обмен": [
      "swap",
      "intercambio",
      "兑换",
      "تبادل",
      "تبادل",
      "échange",
      "Tausch"
  ],
  "наличные": [
      "cash",
      "efectivo",
      "现金",
      "نقد",
      "نقدی",
      "espèces",
      "Bargeld"
  ],
  "ликвидность": [
      "liquidity",
      "liquidez",
      "流动性",
      "سيولة",
      "نقدینگی",
      "liquidité",
      "Liquidität"
  ],
  "Обмен USDT на наличные RUB (Личная встреча / Курьер)": [
      "Swap USDT for Cash (In-person / Courier)",
      "Cambio de USDT por efectivo (En persona / Mensajero)",
      "USDT 兑换现金（当面交易 / 专人配送）",
      "تبادل USDT مقابل نقد (لقاء شخصي / مندوب)",
      "تبادل USDT با پول نقد (ملاقات حضوری / پیک)",
      "Échange USDT contre espèces (En personne / Coursier)",
      "USDT gegen Bargeld tauschen (Persönliches Treffen / Kurier)"
  ],
  "Быстрый расчет в безопасном месте. Подтверждение платежеспособности через ZK-Proof.": [
      "Fast settlement in a secure location. Solvency verified via ZK-Proof.",
      "Liquidación rápida en lugar seguro. Solvencia verificada mediante ZK-Proof.",
      "安全地点快速交割，通过零知识证明 (ZK-Proof) 验证偿付能力。",
      "تسوية سريعة في مكان آمن. تأكيد الملاءة المالية عبر إثبات ZK.",
      "تسویه سریع در مکان امن. تایید تمکن مالی از طریق گواهی ZK.",
      "Règlement rapide dans un lieu sûr. Solvabilité vérifiée par preuve ZK.",
      "Schnelle Abwicklung an einem sicheren Ort. Solvenznachweis über ZK-Proof."
  ],
  "Наличные в офисе / Банк": [
      "Cash at Office / Bank Transfer",
      "Efectivo en oficina / Banco",
      "办公室现金 / 银行转账",
      "نقداً في المكتب / تحويل بنكي",
      "نقدی در دفتر / بانک",
      "Espèces au bureau / Banque",
      "Bargeld im Büro / Bank"
  ],
  "Анонимное расследование (Whistleblow)": [
      "Anonymous Investigation (Whistleblow)",
      "Investigación anónima (Whistleblow)",
      "匿名调查与吹哨 (Whistleblow)",
      "تحقيق مجهول الهوية (كشف الفساد)",
      "تحقیقات ناشناس (افشاگری)",
      "Enquête anonyme (Lanceur d'alerte)",
      "Anonyme Untersuchung (Whistleblowing)"
  ],
  "Публикация зашифрованных доказательств с пороговым авто-раскрытием (t-of-n подписей).": [
      "Publish encrypted evidence with threshold auto-disclosure (t-of-n signatures).",
      "Publicación de pruebas cifradas con revelación automática por umbral (t de n firmas).",
      "发布加密证据并在达到阈值签名数 (t-of-n) 时自动解密公开。",
      "نشر أدلة مشفرة مع كشف تلقائي عند اكتمال النصاب (t من n توقيعات).",
      "انتشار مدارک رمزنگاری شده با افشای خودکار آستانه‌ای (امضای t از n).",
      "Publication de preuves chiffrées avec divulgation automatique à seuil (t sur n signatures).",
      "Veröffentlichung verschlüsselter Beweise mit automatischer Schwellenwert-Offenlegung (t-von-n)."
  ],
  "Анонимные Расследования": [
      "Anonymous Investigations",
      "Investigaciones Anónimas",
      "匿名调查",
      "التحقيقات المجهولة",
      "تحقیقات ناشناس",
      "Enquêtes anonymes",
      "Anonyme Untersuchungen"
  ],
  "расследование": [
      "investigation",
      "investigación",
      "调查",
      "تحقيق",
      "تحقیق",
      "enquête",
      "Untersuchung"
  ],
  "анонимность": [
      "anonymity",
      "anonimato",
      "匿名",
      "إخفاء الهوية",
      "ناشناس",
      "anonymat",
      "Anonymität"
  ],
  "Анонимные материалы расследования (Зашифровано t-of-n)": [
      "Anonymous Investigation Dossier (t-of-n Encrypted)",
      "Materiales de investigación anónima (Cifrado t de n)",
      "匿名调查材料（t-of-n 阈值加密）",
      "مواد تحقيق مجهولة الهوية (مشفرة t من n)",
      "مستندات تحقیقات ناشناس (رمزنگاری شده t از n)",
      "Dossier d'enquête anonyme (Chiffré t sur n)",
      "Anonyme Untersuchungsunterlagen (t-von-n verschlüsselt)"
  ],
  "Доказательства коррупции / нарушений. Будут автоматически расшифрованы после сбора порогового числа независимых подписей.": [
      "Evidence of misconduct. Automatically decrypted once the required threshold of independent witness signatures is reached.",
      "Pruebas de irregularidades. Se descifrarán automáticamente al alcanzar el umbral de firmas independientes.",
      "违规或腐败证据。收集到法定数量的独立见证人签名后将自动解密。",
      "أدلة على مخالفات. سيتم فك تشفيرها تلقائياً بعد جمع النصاب المطلوب من التوقيعات المستقلة.",
      "مدارک تخلفات. پس از جمع‌آوری حد نصاب امضاهای مستقل به‌طور خودکار رمزگشایی می‌شود.",
      "Preuves d'infractions. Déchiffrées automatiquement dès que le seuil de signatures indépendantes est atteint.",
      "Beweise für Verstöße. Werden nach Erreichen der erforderlichen unabhängigen Unterschriften automatisch entschlüsselt."
  ],
  "4-фазный DvP Смарт-Эскроу (ВЭД & Поставки)": [
      "4-Phase DvP Smart-Escrow (Trade & Logistics)",
      "Depósito inteligente DvP de 4 fases (Comercio exterior)",
      "4 阶段 DvP 智能托管（跨境贸易与供应链）",
      "عقد ضمان ذكي DvP من 4 مراحل (التجارة الدولية والتوريد)",
      "اسکرو هوشمند ۴ مرحله‌ای DvP (تجارت بین‌الملل و تامین)",
      "Entiercement intelligent DvP en 4 phases (Commerce & Logistique)",
      "4-Phasen-DvP-Smart-Escrow (Außenhandel & Lieferkette)"
  ],
  "Поэтапное финансирование сделок и международных поставок с подтверждением через оракулов SGS/AIS.": [
      "Stage-gated trade financing and international deliveries verified by SGS/AIS oracles.",
      "Financiación por etapas y entregas internacionales verificadas mediante oráculos SGS/AIS.",
      "通过 SGS/AIS 预言机验证的分阶段贸易融资与国际交付。",
      "تمويل الصفقات والتوريدات الدولية على مراحل مع التحقق عبر أوراكل SGS/AIS.",
      "تامین مالی مرحله‌ای معاملات و محموله‌های بین‌المللی با تایید اوراکل‌های SGS/AIS.",
      "Financement par étapes et livraisons internationales vérifiés par oracles SGS/AIS.",
      "Phasenweise Handelsfinanzierung und internationale Lieferungen mit SGS/AIS-Orakel-Bestätigung."
  ],
  "ВЭД & Смарт-Эскроу": [
      "Trade & Smart-Escrow",
      "Comercio y Depósito Inteligente",
      "跨境贸易与智能托管",
      "التجارة الدولية والضمان الذكي",
      "تجارت و اسکرو هوشمند",
      "Commerce & Entiercement",
      "Handel & Smart-Escrow"
  ],
  "вэд": [
      "trade",
      "comercio exterior",
      "跨境贸易",
      "تجارة دولية",
      "تجارت خارجی",
      "commerce",
      "Außenhandel"
  ],
  "смарт-контракт": [
      "smart contract",
      "contrato inteligente",
      "智能合约",
      "عقد ذكي",
      "قرارداد هوشمند",
      "contrat intelligent",
      "Smart-Contract"
  ],
  "Поставка партии товара (FOB Порт Новороссийск -> Порт назначения)": [
      "Commodity Shipment (FOB Port -> Destination Port)",
      "Envío de mercancía (Puerto FOB -> Puerto de destino)",
      "大宗商品交付（FOB 装运港 -> 目的港）",
      "توريد شحنة بضائع (ميناء الشحن FOB -> ميناء الوصول)",
      "ارسال محموله تجاری (بندر مبدا FOB -> بندر مقصد)",
      "Livraison de marchandises (Port FOB -> Port de destination)",
      "Warenlieferung (FOB-Abgangshafen -> Zielhafen)"
  ],
  "Четырехфазный контракт Delivery vs Payment с оракульной верификацией судовых накладных.": [
      "Four-phase Delivery vs Payment contract with oracle-verified bills of lading.",
      "Contrato Delivery vs Payment de cuatro fases con verificación por oráculo de conocimientos de embarque.",
      "具有海运提单预言机验证的四阶段银货对付 (DvP) 合约。",
      "عقد التسليم مقابل الدفع (DvP) من أربع مراحل مع التحقق من بوالص الشحن عبر الأوراكل.",
      "قرارداد چهار مرحله‌ای تحویل در برابر پرداخت (DvP) با تایید بارنامه‌های دریایی توسط اوراکل.",
      "Contrat Livraison contre Paiement (DvP) en quatre phases avec vérification des connaissements par oracle.",
      "Vierphasiger Delivery-vs-Payment-Vertrag mit Orakel-Verifizierung der Frachtbriefe."
  ],
  "Фаза 1: Депонирование залогов и средств": [
      "Phase 1: Collateral & Escrow Deposit",
      "Fase 1: Depósito de garantías y fondos",
      "阶段 1：质押保证金与托管资金",
      "المرحلة 1: إيداع الضمانات والأموال",
      "فاز ۱: تودیع وثیقه و وجوه",
      "Phase 1 : Dépôt des garanties et des fonds",
      "Phase 1: Hinterlegung von Sicherheiten und Mitteln"
  ],
  "Покупатель депонирует 100% суммы, продавец 10% залога": [
      "Buyer deposits 100% of amount, seller deposits 10% performance bond",
      "El comprador deposita el 100% del monto, el vendedor el 10% de garantía",
      "买方存入 100% 货款，卖方存入 10% 履约保证金",
      "يودع المشتري 100% من المبلغ، ويودع البائع 10% كضمان",
      "خریدار ۱۰۰٪ مبلغ و فروشنده ۱۰٪ وثیقه حسن انجام کار را واریز می‌کند",
      "L'acheteur dépose 100 % du montant, le vendeur 10 % de caution",
      "Käufer hinterlegt 100 % des Betrags, Verkäufer 10 % Kaution"
  ],
  "Фаза 2: Таможенная декларация & Инспекция SGS": [
      "Phase 2: Customs Declaration & SGS Inspection",
      "Fase 2: Declaración aduanera e inspección SGS",
      "阶段 2：报关单与 SGS 质量检验",
      "المرحلة 2: البيان الجمركي وتفتيش SGS",
      "فاز ۲: اظهارنامه گمرکی و بازرسی SGS",
      "Phase 2 : Déclaration en douane & Inspection SGS",
      "Phase 2: Zollanmeldung & SGS-Inspektion"
  ],
  "Оракул SGS подтверждает сертификат качества": [
      "SGS oracle verifies the quality inspection certificate",
      "El oráculo SGS confirma el certificado de calidad",
      "SGS 预言机确认质量检验证书",
      "يؤكد أوراكل SGS شهادة الجودة",
      "اوراکل SGS گواهی کیفیت را تایید می‌کند",
      "L'oracle SGS confirme le certificat de qualité",
      "SGS-Orakel bestätigt das Qualitätszertifikat"
  ],
  "Фаза 3: Погрузка на судно (AIS SOLAS трекинг)": [
      "Phase 3: Vessel Loading (AIS SOLAS Tracking)",
      "Fase 3: Carga en buque (Seguimiento AIS SOLAS)",
      "阶段 3：装船起运（AIS SOLAS 卫星追踪）",
      "المرحلة 3: الشحن على السفينة (تتبع AIS SOLAS)",
      "فاز ۳: بارگیری روی کشتی (ردیابی ماهواره‌ای AIS SOLAS)",
      "Phase 3 : Chargement à bord (Suivi AIS SOLAS)",
      "Phase 3: Schiffsverladung (AIS-SOLAS-Tracking)"
  ],
  "Спутниковый трекер фиксирует выход в рейс": [
      "Satellite tracker confirms departure from port",
      "El rastreador satelital confirma la salida del puerto",
      "卫星追踪器确认船舶离港启航",
      "يسجل المتتبع الفضائي انطلاق السفينة",
      "ردیاب ماهواره‌ای خروج کشتی از بندر را ثبت می‌کند",
      "Le traceur satellite confirme le départ du navire",
      "Satellitentracker bestätigt das Auslaufen des Schiffes"
  ],
  "Фаза 4: Приемка груза в порту назначения & Финальный расчет": [
      "Phase 4: Cargo Acceptance at Destination & Final Settlement",
      "Fase 4: Recepción en puerto de destino y liquidación final",
      "阶段 4：目的港验货与最终结算",
      "المرحلة 4: استلام الشحنة في ميناء الوصول والتسوية النهائية",
      "فاز ۴: تحویل بار در بندر مقصد و تسویه نهایی",
      "Phase 4 : Réception au port de destination & Règlement final",
      "Phase 4: Frachtabnahme im Zielhafen & Endabrechnung"
  ],
  "Разблокировка средств и возвращение залогов": [
      "Release of escrow funds and return of collateral",
      "Liberación de fondos y devolución de garantías",
      "释放托管资金并退还履约保证金",
      "تحرير الأموال وإعادة الضمانات",
      "آزادسازی وجوه و بازگشت وثایق",
      "Déblocage des fonds et restitution des cautions",
      "Freigabe der Mittel und Rückgabe der Sicherheiten"
  ],
  "Суверенный участник": [
      "Sovereign Participant",
      "Participante soberano",
      "主权参与者",
      "مشارك سيادي",
      "مشارکت‌کننده مستقل",
      "Participant souverain",
      "Souveräner Teilnehmer"
  ],
  "Москва, РФ": [
      "Moscow, RU",
      "Moscú, RU",
      "莫斯科",
      "موسكو",
      "مسکو",
      "Moscou",
      "Moskau"
  ],
  "Партия зерна 3000 т": [
      "3,000t Grain Lot",
      "Lote de grano de 3000 t",
      "3000 吨谷物批次",
      "شحنة حبوب 3000 طن",
      "محموله ۳۰۰۰ تنی غلات",
      "Lot de céréales 3000 t",
      "3000-t-Getreidecharge"
  ],
  "Москва": [
      "Moscow",
      "Moscú",
      "莫斯科",
      "موسكو",
      "مسکو",
      "Moscou",
      "Moskau"
  ],
  "Наличные в офисе": [
      "Cash at Office",
      "Efectivo en oficina",
      "办公室现金",
      "نقداً في المكتب",
      "نقدی در دفتر",
      "Espèces au bureau",
      "Bargeld im Büro"
  ],
  "Поставка зерна 3000 т": [
      "3,000t Grain Delivery",
      "Entrega de 3000 t de grano",
      "3000 吨谷物交付",
      "توريد 3000 طن حبوب",
      "تحویل ۳۰۰۰ تن غلات",
      "Livraison de 3000 t de céréales",
      "Getreidelieferung 3000 t"
  ],
  "Геолокация не поддерживается вашим браузером": [
      "Geolocation is not supported by your browser",
      "La geolocalización no es compatible con su navegador",
      "您的浏览器不支持地理定位",
      "تحديد الموقع غير مدعوم في متصفحك",
      "مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند",
      "La géolocalisation n'est pas prise en charge par votre navigateur",
      "Geolokalisierung wird von Ihrem Browser nicht unterstützt"
  ],
  "Определение точных координат GPS...": [
      "Acquiring precise GPS coordinates...",
      "Obteniendo coordenadas GPS precisas...",
      "正在获取精确 GPS 坐标...",
      "جارٍ تحديد إحداثيات GPS الدقيقة...",
      "در حال دریافت مختصات دقیق GPS...",
      "Acquisition des coordonnées GPS précises...",
      "Genaue GPS-Koordinaten werden ermittelt..."
  ],
  "Укажите заголовок намерения": [
      "Enter intent title",
      "Indique el título de la intención",
      "请输入意图标题",
      "أدخل عنوان النية",
      "عنوان نیت را وارد کنید",
      "Indiquez le titre de l'intention",
      "Titel der Absicht eingeben"
  ],
  "Укажите описание намерения": [
      "Enter intent description",
      "Indique la descripción de la intención",
      "请输入意图描述",
      "أدخل وصف النية",
      "توضیحات نیت را وارد کنید",
      "Indiquez la description de l'intention",
      "Beschreibung der Absicht eingeben"
  ],
  "Поддержать (ЗА)": [
      "Support (FOR)",
      "Apoyar (A FAVOR)",
      "支持（赞成）",
      "دعم (مع)",
      "حمایت (موافق)",
      "Soutenir (POUR)",
      "Unterstützen (DAFÜR)"
  ],
  "Отклонить (ПРОТИВ)": [
      "Reject (AGAINST)",
      "Rechazar (EN CONTRA)",
      "反对（反对）",
      "رفض (ضد)",
      "رد (مخالف)",
      "Rejeter (CONTRE)",
      "Ablehnen (DAGEGEN)"
  ],
  "Таможня & Инспекция SGS": [
      "Customs & SGS Inspection",
      "Aduana e Inspección SGS",
      "海关与 SGS 检验",
      "الجمارك وتفتيش SGS",
      "گمرک و بازرسی SGS",
      "Douane & Inspection SGS",
      "Zoll & SGS-Inspektion"
  ],
  "Погрузка & Морской AIS трекинг": [
      "Loading & Maritime AIS Tracking",
      "Carga y Seguimiento Marítimo AIS",
      "装船与海事 AIS 追踪",
      "الشحن والتتبع البحري AIS",
      "بارگیری و ردیابی دریایی AIS",
      "Chargement & Suivi maritime AIS",
      "Verladung & Maritimes AIS-Tracking"
  ],
  "Приемка в порту & Выплата": [
      "Port Acceptance & Payout",
      "Recepción en puerto y Pago",
      "港口验收与放款",
      "الاستلام في الميناء والدفع",
      "تحویل در بندر و پرداخت",
      "Réception au port & Paiement",
      "Hafenabnahme & Auszahlung"
  ],
  "Анонимный участник": [
      "Anonymous Participant",
      "Participante anónimo",
      "匿名参与者",
      "مشارك مجهول الهوية",
      "مشارکت‌کننده ناشناس",
      "Participant anonyme",
      "Anonymer Teilnehmer"
  ],
  "Ошибка публикации намерения": [
      "Failed to publish intent",
      "Error al publicar la intención",
      "发布意图失败",
      "فشل نشر النية",
      "خطا در انتشار نیت",
      "Échec de la publication de l'intention",
      "Fehler beim Veröffentlichen der Absicht"
  ],
  "Целевой кворум подписей (человек)": [
      "Target Signature Quorum (people)",
      "Quórum objetivo de firmas (personas)",
      "目标签名法定人数（人）",
      "نصاب التوقيعات المستهدف (أشخاص)",
      "حد نصاب امضای هدف (نفر)",
      "Quorum de signatures cible (personnes)",
      "Ziel-Unterschriftenquorum (Personen)"
  ],
  "Цель сбора": [
      "Fundraising Goal",
      "Meta de recaudación",
      "筹款目标",
      "هدف الجمع",
      "هدف جمع‌آوری",
      "Objectif de la collecte",
      "Spendenziel"
  ],
  "Валюта": [
      "Currency",
      "Moneda",
      "币种",
      "العملة",
      "ارز",
      "Devise",
      "Währung"
  ],
  "Адрес получателя (TON)": [
      "Recipient Address (TON)",
      "Dirección del destinatario (TON)",
      "收款人地址 (TON)",
      "عنوان المستلم (TON)",
      "آدرس گیرنده (TON)",
      "Adresse du destinataire (TON)",
      "Empfängeradresse (TON)"
  ],
  "Бюджет": [
      "Budget",
      "Presupuesto",
      "预算",
      "الميزانية",
      "بودجه",
      "Budget",
      "Budget"
  ],
  "Навыки (через запятую)": [
      "Skills (comma-separated)",
      "Habilidades (separadas por coma)",
      "技能要求（逗号分隔）",
      "المهارات (مفصولة بفواصل)",
      "مهارت‌ها (با ویرگول جدا کنید)",
      "Compétences (séparées par des virgules)",
      "Fähigkeiten (kommagetrennt)"
  ],
  "Отдаю": [
      "Offering",
      "Entrego",
      "提供",
      "أعطي",
      "می‌دهم",
      "J'offre",
      "Ich gebe"
  ],
  "Получаю": [
      "Receiving",
      "Recibo",
      "换取",
      "أحصل على",
      "می‌گیرم",
      "Je reçois",
      "Ich erhalte"
  ],
  "Курс": [
      "Exchange Rate",
      "Tasa de cambio",
      "汇率",
      "سعر الصرف",
      "نرخ تبدیل",
      "Taux de change",
      "Wechselkurs"
  ],
  "Общая сумма (USDT)": [
      "Total Amount (USDT)",
      "Monto total (USDT)",
      "总金额 (USDT)",
      "المبلغ الإجمالي (USDT)",
      "مبلغ کل (USDT)",
      "Montant total (USDT)",
      "Gesamtbetrag (USDT)"
  ],
  "Залог (%)": [
      "Collateral (%)",
      "Garantía (%)",
      "保证金比例 (%)",
      "الضمان (%)",
      "وثیقه (٪)",
      "Caution (%)",
      "Kaution (%)"
  ],
  "Порог подписей для дешифрования (t-of-n)": [
      "Decryption Signature Threshold (t-of-n)",
      "Umbral de firmas para descifrar (t de n)",
      "解密签名阈值 (t-of-n)",
      "عتبة التوقيعات لفك التشفير (t من n)",
      "حد نصاب امضا برای رمزگشایی (t از n)",
      "Seuil de signatures pour le déchiffrement (t sur n)",
      "Unterschriftenschwelle zur Entschlüsselung (t-von-n)"
  ],
  "Отображаемый псевдоним / Имя автора": [
      "Display Alias / Author Name",
      "Alias visible / Nombre del autor",
      "显示别名 / 作者名称",
      "الاسم المستعار المعروض / اسم الكاتب",
      "نام مستعار نمایشی / نام نویسنده",
      "Pseudonyme affiché / Nom de l'auteur",
      "Anzeigename / Autorenname"
  ],
  "Скрыть расширенные Lego-модули": [
      "Hide Advanced Lego Modules",
      "Ocultar módulos Lego avanzados",
      "隐藏高级 Lego 模块",
      "إخفاء وحدات Lego المتقدمة",
      "مخفی کردن ماژول‌های پیشرفته Lego",
      "Masquer les modules Lego avancés",
      "Erweiterte Lego-Module ausblenden"
  ],
  "Открыть расширенный Lego-конструктор (Trust, ZK, Oracles, H3)": [
      "Open Advanced Lego Builder (Trust, ZK, Oracles, H3)",
      "Abrir constructor Lego avanzado (Trust, ZK, Oracles, H3)",
      "打开高级 Lego 构建器 (Trust, ZK, Oracles, H3)",
      "فتح منشئ Lego المتقدم (Trust, ZK, Oracles, H3)",
      "باز کردن سازنده پیشرفته Lego (Trust, ZK, Oracles, H3)",
      "Ouvrir le constructeur Lego avancé (Trust, ZK, Oracles, H3)",
      "Erweiterten Lego-Baukasten öffnen (Trust, ZK, Oracles, H3)"
  ],
  "Минимальный баланс для проверки (TON)": [
      "Minimum Balance to Verify (TON)",
      "Saldo mínimo a verificar (TON)",
      "验证最低余额 (TON)",
      "الحد الأدنى للرصيد للتحقق (TON)",
      "حداقل موجودی جهت بررسی (TON)",
      "Solde minimum à vérifier (TON)",
      "Mindestguthaben zur Prüfung (TON)"
  ],
  "Минимальный репутационный скор (0..100)": [
      "Minimum Reputation Score (0..100)",
      "Puntuación mínima de reputación (0..100)",
      "最低声誉评分 (0..100)",
      "الحد الأدنى لدرجة السمعة (0..100)",
      "حداقل امتیاز اعتبار (۰ تا ۱۰۰)",
      "Score de réputation minimum (0..100)",
      "Mindest-Reputationswert (0..100)"
  ],
  "Город / Локация": [
      "City / Location",
      "Ciudad / Ubicación",
      "城市 / 位置",
      "المدينة / الموقع",
      "شهر / موقعیت",
      "Ville / Lieu",
      "Stadt / Standort"
  ],
  "Определение GPS...": [
      "Locating via GPS...",
      "Obteniendo GPS...",
      "正在定位 GPS...",
      "جارٍ تحديد GPS...",
      "در حال مکان‌یابی GPS...",
      "Localisation GPS...",
      "GPS wird ermittelt..."
  ],
  "Определить мои координаты (H3 Res 8)": [
      "Detect My Coordinates (H3 Res 8)",
      "Detectar mis coordenadas (H3 Res 8)",
      "定位我的坐标 (H3 Res 8)",
      "تحديد إحداثياتي (H3 Res 8)",
      "تشخیص مختصات من (H3 Res 8)",
      "Détecter mes coordonnées (H3 Res 8)",
      "Meine Koordinaten ermitteln (H3 Res 8)"
  ],
  "Семантические теги (через запятую для SimHash O(1))": [
      "Semantic Tags (comma-separated for SimHash O(1))",
      "Etiquetas semánticas (separadas por coma para SimHash O(1))",
      "语义标签（逗号分隔，用于 SimHash O(1)）",
      "الوسوم الدلالية (مفصولة بفواصل لـ SimHash O(1))",
      "برچسب‌های معنایی (جدا شده با ویرگول برای SimHash O(1))",
      "Tags sémantiques (séparés par des virgules pour SimHash O(1))",
      "Semantische Tags (kommagetrennt für SimHash O(1))"
  ],
  "обмен, usdt, наличные, ton, срочно": [
      "swap, usdt, cash, ton, urgent",
      "cambio, usdt, efectivo, ton, urgente",
      "兑换, usdt, 现金, ton, 紧急",
      "تبادل، usdt، نقد، ton، عاجل",
      "تبادل، usdt، نقدی، ton، فوری",
      "échange, usdt, espèces, ton, urgent",
      "Tausch, USDT, Bargeld, TON, dringend"
  ],
  "Срочность:": [
      "Urgency:",
      "Urgencia:",
      "紧急程度：",
      "الأولوية:",
      "فوریت:",
      "Urgence :",
      "Dringlichkeit:"
  ],
  "Обычная": [
      "Normal",
      "Normal",
      "普通",
      "عادية",
      "عادی",
      "Normale",
      "Normal"
  ],
  "Средняя": [
      "Medium",
      "Media",
      "中等",
      "متوسطة",
      "متوسط",
      "Moyenne",
      "Mittel"
  ],
  "Высокая": [
      "High",
      "Alta",
      "高",
      "عالية",
      "بالا",
      "Élevée",
      "Hoch"
  ],
  "Критическая": [
      "Critical",
      "Crítica",
      "紧急",
      "حرجة",
      "بحرانی",
      "Critique",
      "Kritisch"
  ],
  "Оракул инспекции:": [
      "Inspection Oracle:",
      "Oráculo de inspección:",
      "检验预言机：",
      "أوراكل التفتيش:",
      "اوراکل بازرسی:",
      "Oracle d'inspection :",
      "Inspektions-Orakel:"
  ],
  "AIS Спутниковый трекер": [
      "AIS Satellite Tracker",
      "Rastreador satelital AIS",
      "AIS 卫星追踪器",
      "متتبع الأقمار الصناعية AIS",
      "ردیاب ماهواره‌ای AIS",
      "Traceur satellite AIS",
      "AIS-Satellitentracker"
  ],
  "Намерение успешно опубликовано в Universal Pulse Engine!": [
      "Intent published to Universal Pulse Engine!",
      "¡Intención publicada con éxito en Universal Pulse Engine!",
      "意图已成功发布至 Universal Pulse Engine！",
      "تم نشر النية بنجاح في محرك Universal Pulse!",
      "نیت با موفقیت در Universal Pulse Engine منتشر شد!",
      "Intention publiée avec succès sur Universal Pulse Engine !",
      "Absicht erfolgreich in der Universal Pulse Engine veröffentlicht!"
  ],
  "Не удалось сформировать счет на оплату": [
      "Failed to generate payment invoice",
      "No se pudo generar la factura de pago",
      "无法生成付款账单",
      "تعذر إنشاء فاتورة الدفع",
      "ایجاد فاکتور پرداخت ناموفق بود",
      "Impossible de générer la facture",
      "Zahlungsrechnung konnte nicht erstellt werden"
  ],
  "Отсутствует ссылка на подтверждение платежа": [
      "Payment confirmation link is missing",
      "Falta el enlace de confirmación de pago",
      "缺少支付确认链接",
      "رابط تأكيد الدفع مفقود",
      "لینک تایید پرداخت وجود ندارد",
      "Lien de confirmation de paiement manquant",
      "Bestätigungslink für die Zahlung fehlt"
  ],
  "Ошибка подключения к платежному шлюзу": [
      "Failed to connect to payment gateway",
      "Error de conexión con la pasarela de pago",
      "连接支付网关失败",
      "خطأ في الاتصال ببوابة الدفع",
      "خطا در اتصال به درگاه پرداخت",
      "Erreur de connexion à la passerelle de paiement",
      "Fehler bei der Verbindung zum Zahlungsgateway"
  ],
  "Не удалось сгенерировать крипто-заказ": [
      "Failed to generate crypto order",
      "No se pudo generar la orden cripto",
      "无法生成加密支付订单",
      "تعذر إنشاء طلب الدفع المشفر",
      "ایجاد سفارش رمزارزی ناموفق بود",
      "Impossible de générer la commande crypto",
      "Krypto-Bestellung konnte nicht erstellt werden"
  ],
  "Ошибка создания TON заказа": [
      "Failed to create TON order",
      "Error al crear la orden TON",
      "创建 TON 订单失败",
      "خطأ في إنشاء طلب TON",
      "خطا در ایجاد سفارش TON",
      "Erreur lors de la création de la commande TON",
      "Fehler beim Erstellen der TON-Bestellung"
  ],
  "Секретный контакт": [
      "Secret Contact",
      "Contacto secreto",
      "机密联系人",
      "جهة اتصال سرية",
      "مخاطب محرمانه",
      "Contact secret",
      "Geheimer Kontakt"
  ],
  "Ложный PIN должен содержать от 4 до 8 цифр": [
      "Duress PIN must be 4 to 8 digits",
      "El PIN señuelo debe tener entre 4 y 8 dígitos",
      "伪装 PIN 码必须包含 4 至 8 位数字",
      "يجب أن يتكون رمز PIN التمويهي من 4 إلى 8 أرقام",
      "پین اضطراری باید بین ۴ تا ۸ رقم باشد",
      "Le code PIN de contrainte doit contenir 4 à 8 chiffres",
      "Tarn-PIN muss 4 bis 8 Ziffern enthalten"
  ],
  "Ложный PIN не должен совпадать с вашим основным PIN-кодом!": [
      "Duress PIN must not match your primary PIN code!",
      "¡El PIN señuelo no debe coincidir con su PIN principal!",
      "伪装 PIN 码不能与您的主 PIN 码相同！",
      "يجب ألا يتطابق رمز PIN التمويهي مع رمز PIN الأساسي!",
      "پین اضطراری نباید با پین اصلی شما یکسان باشد!",
      "Le PIN de contrainte ne doit pas être identique à votre PIN principal !",
      "Die Tarn-PIN darf nicht mit Ihrer Haupt-PIN übereinstimmen!"
  ],
  "🕵️ Ложный PIN (Двойное дно) активирован!": [
      "🕵️ Duress PIN (Plausible Deniability) activated!",
      "🕵️ ¡PIN señuelo (Doble fondo) activado!",
      "🕵️ 伪装 PIN 码（双重空间）已激活！",
      "🕵️ تم تفعيل رمز PIN التمويهي!",
      "🕵️ پین اضطراری (فضای مخفی) فعال شد!",
      "🕵️ Code PIN de contrainte activé !",
      "🕵️ Tarn-PIN (Doppelter Boden) aktiviert!"
  ],
  "Ошибка сохранения ложного PIN": [
      "Failed to save Duress PIN",
      "Error al guardar el PIN señuelo",
      "保存伪装 PIN 码失败",
      "فشل حفظ رمز PIN التمويهي",
      "خطا در ذخیره پین اضطراری",
      "Échec de l'enregistrement du PIN de contrainte",
      "Fehler beim Speichern der Tarn-PIN"
  ],
  "Ложный PIN отключен": [
      "Duress PIN disabled",
      "PIN señuelo desactivado",
      "伪装 PIN 码已关闭",
      "تم إيقاف رمز PIN التمويهي",
      "پین اضطراری غیرفعال شد",
      "PIN de contrainte désactivé",
      "Tarn-PIN deaktiviert"
  ],
  "Автосброс при неактивности отключен": [
      "Inactivity auto-wipe disabled",
      "Autoborrado por inactividad desactivado",
      "闲置自动销毁已关闭",
      "تم إيقاف المسح التلقائي عند عدم النشاط",
      "پاکسازی خودکار در صورت عدم فعالیت غیرفعال شد",
      "Effacement auto en cas d'inactivité désactivé",
      "Automatische Löschung bei Inaktivität deaktiviert"
  ],
  "Не удалось сохранить настройки автосброса": [
      "Failed to save auto-wipe settings",
      "No se pudieron guardar los ajustes de autoborrado",
      "无法保存自动销毁设置",
      "تعذر حفظ إعدادات المسح التلقائي",
      "ذخیره تنظیمات پاکسازی خودکار ناموفق بود",
      "Impossible d'enregistrer l'effacement automatique",
      "Einstellungen für Auto-Löschung konnten nicht gespeichert werden"
  ],
  "🔥 Одноразовая Burner-ссылка создана и скопирована!": [
      "🔥 Burner link created and copied!",
      "🔥 ¡Enlace temporal Burner creado y copiado!",
      "🔥 阅后即焚链接已创建并复制！",
      "🔥 تم إنشاء الرابط المؤقت ونسخه!",
      "🔥 لینک یک‌بارمصرف Burner ساخته و کپی شد!",
      "🔥 Lien éphémère Burner créé et copié !",
      "🔥 Einmal-Burner-Link erstellt und kopiert!"
  ],
  "Не удалось создать Burner-ссылку": [
      "Failed to create Burner link",
      "No se pudo crear el enlace Burner",
      "无法创建阅后即焚链接",
      "تعذر إنشاء الرابط المؤقت",
      "ایجاد لینک Burner ناموفق بود",
      "Impossible de créer le lien Burner",
      "Burner-Link konnte nicht erstellt werden"
  ],
  "🔥 Комната и ключи безвозвратно уничтожены": [
      "🔥 Room and cryptographic keys permanently destroyed",
      "🔥 Sala y claves destruidas irreversiblemente",
      "🔥 房间与密钥已永久销毁",
      "🔥 تم تدمير الغرفة والمفاتيح نهائياً",
      "🔥 اتاق و کلیدها برای همیشه نابود شدند",
      "🔥 Salon et clés définitivement détruits",
      "🔥 Raum und Schlüssel unwiderruflich vernichtet"
  ],
  "Ошибка уничтожения комнаты": [
      "Failed to destroy room",
      "Error al destruir la sala",
      "销毁房间失败",
      "خطأ في تدمير الغرفة",
      "خطا در نابودسازی اتاق",
      "Erreur lors de la destruction du salon",
      "Fehler beim Vernichten des Raums"
  ],
  "Скопировать ссылку": [
      "Copy Link",
      "Copiar enlace",
      "复制链接",
      "نسخ الرابط",
      "کپی لینک",
      "Copier le lien",
      "Link kopieren"
  ],
  "Мгновенно уничтожить комнату": [
      "Destroy Room Immediately",
      "Destruir sala inmediatamente",
      "立即销毁房间",
      "تدمير الغرفة فوراً",
      "نابودسازی فوری اتاق",
      "Détruire le salon immédiatement",
      "Raum sofort vernichten"
  ],
  "Узел-Источник (Вы в походе)": [
      "Source Node (You on Trail)",
      "Nodo Origen (Tú en ruta)",
      "源节点（徒步中的您）",
      "عقدة المصدر (أنت في الرحلة)",
      "نود مبدا (شما در طبیعت)",
      "Nœud Source (Vous en randonnée)",
      "Quellknoten (Sie unterwegs)"
  ],
  "Голосовая заметка + GPS-точка. Шифрование E2EE (TTL=7).": [
      "Voice note + GPS pin. E2EE encrypted (TTL=7).",
      "Nota de voz + punto GPS. Cifrado E2EE (TTL=7).",
      "语音备忘 + GPS 坐标。端到端加密 (TTL=7)。",
      "مذكرة صوتية + نقطة GPS. تشفير تام (TTL=7).",
      "یادداشت صوتی + نقطه GPS. رمزنگاری E2EE (TTL=7).",
      "Note vocale + point GPS. Chiffrement E2EE (TTL=7).",
      "Sprachnotiz + GPS-Punkt. E2EE-verschlüsselt (TTL=7)."
  ],
  "Старт пакета": [
      "Packet Origin",
      "Inicio del paquete",
      "数据包发出",
      "انطلاق الحزمة",
      "شروع بسته",
      "Départ du paquet",
      "Paketstart"
  ],
  "Ретранслятор 1 (Турист на тропе)": [
      "Relay 1 (Hiker on Trail)",
      "Repetidor 1 (Excursionista)",
      "中继节点 1（沿途徒步者）",
      "المرحل 1 (متنزه على المسار)",
      "رله ۱ (کوهنورد در مسیر)",
      "Relais 1 (Randonneur)",
      "Relay 1 (Wanderer auf dem Pfad)"
  ],
  "BLE 2.4 GHz GATT 0xFA21. Авто-ретрансляция соседу.": [
      "BLE 2.4 GHz GATT 0xFA21. Auto-relay to neighbor.",
      "BLE 2.4 GHz GATT 0xFA21. Autorrepetición al vecino.",
      "BLE 2.4 GHz GATT 0xFA21。自动中继给邻近节点。",
      "BLE 2.4 GHz GATT 0xFA21. إعادة توجيه تلقائية للجار.",
      "BLE 2.4 GHz GATT 0xFA21. بازپخش خودکار به همسایه.",
      "BLE 2.4 GHz GATT 0xFA21. Relais auto au voisin.",
      "BLE 2.4 GHz GATT 0xFA21. Auto-Relay zum Nachbarn."
  ],
  "Пересылка +1 (TTL=6)": [
      "Hop +1 (TTL=6)",
      "Salto +1 (TTL=6)",
      "转发 +1 (TTL=6)",
      "قفزة +1 (TTL=6)",
      "پرش +۱ (TTL=6)",
      "Saut +1 (TTL=6)",
      "Hop +1 (TTL=6)"
  ],
  "Ретранслятор 2 (Базовый лагерь)": [
      "Relay 2 (Base Camp)",
      "Repetidor 2 (Campamento base)",
      "中继节点 2（大本营）",
      "المرحل 2 (المخيم الأساسي)",
      "رله ۲ (کمپ اصلی)",
      "Relais 2 (Camp de base)",
      "Relay 2 (Basislager)"
  ],
  "Хранение в SQLite-буфере и передача (Store & Forward).": [
      "SQLite buffer caching and Store & Forward relay.",
      "Almacenamiento en búfer SQLite y reenvío (Store & Forward).",
      "SQLite 缓冲存储与延迟转发 (Store & Forward)。",
      "التخزين المؤقت في SQLite وإعادة التوجيه (Store & Forward).",
      "ذخیره در بافر SQLite و ارسال (Store & Forward).",
      "Tampon SQLite et transfert différé (Store & Forward).",
      "SQLite-Pufferung und Weiterleitung (Store & Forward)."
  ],
  "Транзит пакета": [
      "Packet Transit",
      "Tránsito del paquete",
      "数据包中转",
      "عبور الحزمة",
      "ترانزیت بسته",
      "Transit du paquet",
      "Pakettransit"
  ],
  "Узел-Получатель (Группа)": [
      "Recipient Node (Group)",
      "Nodo Destino (Grupo)",
      "接收节点（群组）",
      "عقدة المستلم (المجموعة)",
      "نود گیرنده (گروه)",
      "Nœud Destinataire (Groupe)",
      "Empfängerknoten (Gruppe)"
  ],
  "Пакет доставлен, расшифрован, отправлен Radio-ACK ✓✓.": [
      "Packet delivered, decrypted, Radio-ACK sent ✓✓.",
      "Paquete entregado, descifrado, Radio-ACK enviado ✓✓.",
      "数据包已送达、解密并回传 Radio-ACK ✓✓。",
      "تم تسليم الحزمة وفك تشفيرها وإرسال إقرار Radio-ACK ✓✓.",
      "بسته تحویل و رمزگشایی شد، تاییدیه Radio-ACK ارسال گردید ✓✓.",
      "Paquet livré, déchiffré, Radio-ACK envoyé ✓✓.",
      "Paket zugestellt, entschlüsselt, Radio-ACK gesendet ✓✓."
  ],
  "Доставлено ✓✓": [
      "Delivered ✓✓",
      "Entregado ✓✓",
      "已送达 ✓✓",
      "تم التسليم ✓✓",
      "تحویل شد ✓✓",
      "Livré ✓✓",
      "Zugestellt ✓✓"
  ],
  "Квартира (0% сотовой сети)": [
      "Apartment (0% Cellular Signal)",
      "Apartamento (0% red móvil)",
      "公寓内（0% 蜂窝信号）",
      "شقة سكنية (0% تغطية خلوية)",
      "آپارتمان (۰٪ آنتن موبایل)",
      "Appartement (0 % réseau mobile)",
      "Wohnung (0 % Mobilfunknetz)"
  ],
  "Выключено электричество и базовые станции. Отправка в чат.": [
      "Power grid and cell towers down. Sending message to chat.",
      "Sin electricidad ni antenas móviles. Enviando al chat.",
      "断电且基站瘫痪，直接向聊天发送消息。",
      "انقطاع الكهرباء وأبراج التغطية. إرسال إلى الدردشة.",
      "برق و دکل‌های مخابراتی قطع هستند. ارسال پیام در چت.",
      "Panne de courant et d'antennes. Envoi dans le chat.",
      "Strom- und Mobilfunkausfall. Senden im Chat."
  ],
  "В эфире 2.4 GHz": [
      "On Air 2.4 GHz",
      "En el aire 2.4 GHz",
      "2.4 GHz 无线广播中",
      "على الهواء 2.4 GHz",
      "در رادیو 2.4 GHz",
      "Sur les ondes 2.4 GHz",
      "Auf Sendung 2.4 GHz"
  ],
  "Сосед за стеной (BLE Relay)": [
      "Neighbor Next Door (BLE Relay)",
      "Vecino tras la pared (BLE Relay)",
      "隔壁邻居节点 (BLE Relay)",
      "الجار خلف الجدار (BLE Relay)",
      "همسایه پشت دیوار (BLE Relay)",
      "Voisin derrière le mur (Relais BLE)",
      "Nachbar nebenan (BLE-Relay)"
  ],
  "Прием сквозь перекрытия (L2 фрагментация 180B + CRC16).": [
      "Through-wall reception (180B L2 fragmentation + CRC16).",
      "Recepción a través de muros (fragmentación L2 180B + CRC16).",
      "穿墙接收（180B L2 分片 + CRC16 校验）。",
      "استقبال عبر الجدران (تجزئة L2 بحجم 180 بايت + CRC16).",
      "دریافت از ورای دیوار (قطعه بندی L2 180B + CRC16).",
      "Réception à travers les murs (fragmentation L2 180o + CRC16).",
      "Empfang durch Wände (180B L2-Fragmentierung + CRC16)."
  ],
  "Хоп через стену": [
      "Wall Hop",
      "Salto a través del muro",
      "穿墙跳接",
      "قفزة عبر الجدار",
      "پرش از دیوار",
      "Saut à travers le mur",
      "Wand-Hop"
  ],
  "Узел во дворе / подъезде": [
      "Courtyard / Hallway Node",
      "Nodo en el patio / portal",
      "院落 / 楼道节点",
      "عقدة في الفناء / المدخل",
      "نود در حیاط / راهرو",
      "Nœud dans la cour / hall",
      "Knoten im Hof / Treppenhaus"
  ],
  "Эстафета пакета по цепочке смартфонов дома.": [
      "Packet relayed across a chain of smartphones in the building.",
      "Relevo del paquete por la cadena de teléfonos del edificio.",
      "数据包通过楼内智能手机链式接力。",
      "تتابع الحزمة عبر سلسلة الهواتف الذكية في المبنى.",
      "انتقال زنجیره‌ای بسته بین گوشی‌های هوشمند ساختمان.",
      "Relais du paquet via la chaîne de smartphones de l'immeuble.",
      "Paket-Staffellauf über Smartphones im Gebäude."
  ],
  "Ретрансляция двора": [
      "Courtyard Relay",
      "Retransmisión del patio",
      "院落中继",
      "إعادة توجيه الفناء",
      "بازپخش حیاط",
      "Relais de la cour",
      "Hof-Weiterleitung"
  ],
  "Близкие в соседнем доме": [
      "Family in Next Building",
      "Familiares en el edificio vecino",
      "邻近楼宇的亲友",
      "الأقارب في المبنى المجاور",
      "نزدیکان در ساختمان مجاور",
      "Proches dans l'immeuble voisin",
      "Angehörige im Nachbarhaus"
  ],
  "Мгновенная расшифровка и обратная квитанция Radio-ACK.": [
      "Instant decryption and return Radio-ACK receipt.",
      "Descifrado instantáneo y acuse de recibo Radio-ACK.",
      "即时解密并回传 Radio-ACK 确认回执。",
      "فك تشفير فوري وإشعار استلام عكسي Radio-ACK.",
      "رمزگشایی آنی و ارسال رسید بازگشتی Radio-ACK.",
      "Déchiffrement instantané et accusé Radio-ACK retour.",
      "Sofortige Entschlüsselung und Radio-ACK-Empfangsbestätigung."
  ],
  "Связь установлена ✓✓": [
      "Link Established ✓✓",
      "Conexión establecida ✓✓",
      "连接已建立 ✓✓",
      "تم الاتصال ✓✓",
      "ارتباط برقرار شد ✓✓",
      "Liaison établie ✓✓",
      "Verbindung hergestellt ✓✓"
  ],
  "Экстренный маяк (Вы)": [
      "Emergency Beacon (You)",
      "Baliza de emergencia (Tú)",
      "紧急信标（您）",
      "منارة الطوارئ (أنت)",
      "بیکن اضطراری (شما)",
      "Balise d'urgence (Vous)",
      "Notfallbake (Sie)"
  ],
  "Координаты GPS + голосовая сводка (до 24 КБ сжатого аудио).": [
      "GPS coordinates + voice briefing (up to 24 KB compressed audio).",
      "Coordenadas GPS + reporte de voz (hasta 24 KB de audio comprimido).",
      "GPS 坐标 + 语音简报（最高 24 KB 压缩音频）。",
      "إحداثيات GPS + موجز صوتي (حتى 24 كيلوبايت صوت مضغوط).",
      "مختصات GPS + گزارش صوتی (حداکثر ۲۴ کیلوبایت صدای فشرده).",
      "Coordonnées GPS + point vocal (jusqu'à 24 Ko d'audio compressé).",
      "GPS-Koordinaten + Sprachbericht (bis zu 24 KB komprimiertes Audio)."
  ],
  "SOS импульс": [
      "SOS Pulse",
      "Pulso SOS",
      "SOS 脉冲",
      "نبضة استغاثة SOS",
      "پالس SOS",
      "Impulsion SOS",
      "SOS-Impuls"
  ],
  "Узел волонтера поблизости": [
      "Nearby Volunteer Node",
      "Nodo voluntario cercano",
      "附近的志愿者节点",
      "عقدة متطوع قريبة",
      "نود داوطلب در نزدیکی",
      "Nœud bénévole à proximité",
      "Freiwilligen-Knoten in der Nähe"
  ],
  "Прием пакета на радар RSSI и ретрансляция с защитой от коллизий.": [
      "RSSI radar packet capture and collision-safe retransmission.",
      "Recepción en radar RSSI y retransmisión sin colisiones.",
      "RSSI 雷达捕获数据包并进行防冲突重传。",
      "استقبال الحزمة على رادار RSSI وإعادة البث مع الحماية من التصادم.",
      "دریافت بسته روی رادار RSSI و بازپخش با محافظت از تداخل.",
      "Réception sur radar RSSI et retransmission anti-collision.",
      "Paketempfang am RSSI-Radar und kollisionssichere Weiterleitung."
  ],
  "Принят волонтером": [
      "Received by Volunteer",
      "Recibido por voluntario",
      "志愿者已接收",
      "استلمه المتطوع",
      "دریافت توسط داوطلب",
      "Reçu par un bénévole",
      "Vom Helfer empfangen"
  ],
  "Полевой штаб поиска": [
      "Field Search HQ",
      "Puesto de mando de búsqueda",
      "现场搜救指挥部",
      "مقر البحث الميداني",
      "ستاد میدانی جستجو",
      "PC de recherche sur le terrain",
      "Feld-Suchleitung"
  ],
  "Агрегация пакетов без участия сотовых операторов.": [
      "Packet aggregation with zero cellular carrier dependency.",
      "Agregación de paquetes sin operadores móviles.",
      "无需蜂窝运营商参与的数据包聚合。",
      "تجميع الحزم دون الاعتماد على شركات الاتصالات.",
      "تجمیع بسته‌ها بدون نیاز به اپراتورهای تلفن همراه.",
      "Agrégation des paquets sans opérateur mobile.",
      "Paketaggregation ohne Mobilfunkanbieter."
  ],
  "Координаты в штабе": [
      "Coordinates at HQ",
      "Coordenadas en el puesto",
      "坐标已达指挥部",
      "الإحداثيات في المقر",
      "مختصات در ستاد",
      "Coordonnées au PC",
      "Koordinaten in der Zentrale"
  ],
  "Спасательная группа": [
      "Rescue Team",
      "Equipo de rescate",
      "救援队",
      "فريق الإنقاذ",
      "تیم امداد و نجات",
      "Équipe de secours",
      "Rettungsteam"
  ],
  "Точная геометка открыта на офлайн-карте, отправлен ACK.": [
      "Exact geotag opened on offline map, ACK sent.",
      "Geolocalización exacta abierta en mapa offline, ACK enviado.",
      "离线地图已打开精确地理标记并回传 ACK。",
      "تم فتح الموقع الدقيق على الخريطة غير المتصلة وإرسال ACK.",
      "لوکیشن دقیق روی نقشه آفلاین باز شد و ACK ارسال گردید.",
      "Géolocalisation exacte ouverte sur carte hors ligne, ACK envoyé.",
      "Genauer Geotag auf Offline-Karte geöffnet, ACK gesendet."
  ],
  "Помощь в пути ✓✓": [
      "Help on the Way ✓✓",
      "Ayuda en camino ✓✓",
      "救援已在途中 ✓✓",
      "المساعدة في الطريق ✓✓",
      "امداد در راه است ✓✓",
      "Secours en route ✓✓",
      "Hilfe unterwegs ✓✓"
  ],
  "Ваш смартфон (Шатдаун)": [
      "Your Smartphone (Internet Blackout)",
      "Tu smartphone (Apagón de red)",
      "您的智能手机（断网封锁）",
      "هاتفك الذكي (انقطاع الإنترنت)",
      "گوشی هوشمند شما (قطعی اینترنت)",
      "Votre smartphone (Coupure réseau)",
      "Ihr Smartphone (Netzabschaltung)"
  ],
  "Мобильный интернет отключен. Однократное E2EE-шифрование.": [
      "Mobile internet shut down. Single-pass E2EE encryption.",
      "Internet móvil cortado. Cifrado E2EE de un solo paso.",
      "移动互联网已断开，执行单次端到端加密。",
      "الإنترنت المحمول مقطوع. تشفير تام لمرة واحدة.",
      "اینترنت موبایل قطع است. رمزنگاری یک‌باره E2EE.",
      "Internet mobile coupé. Chiffrement E2EE unique.",
      "Mobiles Internet abgeschaltet. Einmalige E2EE-Verschlüsselung."
  ],
  "Обход шатдауна": [
      "Blackout Bypass",
      "Evasión de apagón",
      "绕过断网封锁",
      "تجاوز انقطاع الشبكة",
      "دور زدن قطعی اینترنت",
      "Contournement de coupure",
      "Blackout-Umgehung"
  ],
  "Сосед по BLE 2.4 GHz": [
      "BLE 2.4 GHz Neighbor",
      "Vecino por BLE 2.4 GHz",
      "BLE 2.4 GHz 邻近节点",
      "جار عبر BLE 2.4 GHz",
      "همسایه در BLE 2.4 GHz",
      "Voisin via BLE 2.4 GHz",
      "Nachbar über BLE 2.4 GHz"
  ],
  "Не может прочитать шифротекст, передает конверт дальше.": [
      "Cannot read ciphertext, forwards sealed envelope onward.",
      "No puede leer el texto cifrado, reenvía el sobre.",
      "无法读取密文，仅将密封信封继续转发。",
      "لا يمكنه قراءة النص المشفر، يمرر الظرف فقط.",
      "قادر به خواندن متن رمزنگاری شده نیست، پاکت را به بعدی منتقل می‌کند.",
      "Ne peut pas lire le texte chiffré, transmet l'enveloppe.",
      "Kann den Geheimtext nicht lesen, leitet den Umschlag weiter."
  ],
  "Слепой транзит": [
      "Blind Transit",
      "Tránsito ciego",
      "盲态中转",
      "عبور أعمى",
      "ترانزیت کور",
      "Transit aveugle",
      "Blinder Transit"
  ],
  "Gateway Bridge (Узел с сетью)": [
      "Gateway Bridge (Online Node)",
      "Gateway Bridge (Nodo con red)",
      "网关桥接节点（联网设备）",
      "جسر البوابة (عقدة متصلة بالشبكة)",
      "پل دروازه (نود متصل به اینترنت)",
      "Pont Passerelle (Nœud connecté)",
      "Gateway-Bridge (Online-Knoten)"
  ],
  "Смартфон у окна с 3G/Wi-Fi сбрасывает пакет в /api/v1/mesh/relay.": [
      "A phone with 3G/Wi-Fi bridges the packet to /api/v1/mesh/relay.",
      "Un teléfono con 3G/Wi-Fi descarga el paquete a /api/v1/mesh/relay.",
      "有 3G/Wi-Fi 信号的手机将数据包桥接至 /api/v1/mesh/relay。",
      "هاتف متصل بـ 3G/Wi-Fi يمرر الحزمة إلى /api/v1/mesh/relay.",
      "گوشی دارای اینترنت 3G/Wi-Fi بسته را به /api/v1/mesh/relay منتقل می‌کند.",
      "Un téléphone avec 3G/Wi-Fi relaie le paquet vers /api/v1/mesh/relay.",
      "Ein Smartphone mit 3G/Wi-Fi leitet das Paket an /api/v1/mesh/relay weiter."
  ],
  "Прорыв в облако": [
      "Cloud Breakout",
      "Salto a la nube",
      "突围上云",
      "اختراق إلى السحابة",
      "ورود به ابر",
      "Percée vers le cloud",
      "Cloud-Durchbruch"
  ],
  "Адресат в другом городе": [
      "Recipient in Another City",
      "Destinatario en otra ciudad",
      "另一城市的收件人",
      "المستلم في مدينة أخرى",
      "گیرنده در شهری دیگر",
      "Destinataire dans une autre ville",
      "Empfänger in einer anderen Stadt"
  ],
  "Получает сообщение и видит ваш статус через цепочку соседей.": [
      "Receives your message and status through the neighbor mesh chain.",
      "Recibe el mensaje y ve tu estado a través de la cadena de vecinos.",
      "通过邻居网格链路接收您的消息与状态。",
      "يتلقى الرسالة ويرى حالتك عبر سلسلة الجيران.",
      "پیام و وضعیت شما را از طریق زنجیره همسایگان دریافت می‌کند.",
      "Reçoit le message et voit votre statut via la chaîne de voisins.",
      "Empfängt die Nachricht und sieht Ihren Status über die Nachbarkette."
  ],
  "Доставлено в облако ✓✓": [
      "Delivered to Cloud ✓✓",
      "Entregado en la nube ✓✓",
      "已送达云端 ✓✓",
      "تم التسليم للسحابة ✓✓",
      "تحویل به ابر ✓✓",
      "Livré au cloud ✓✓",
      "In die Cloud zugestellt ✓✓"
  ],
  "Название канала...": [
      "Channel name...",
      "Nombre del canal...",
      "频道名称...",
      "اسم القناة...",
      "نام کانال...",
      "Nom du canal...",
      "Kanalname..."
  ],
  "Название группы...": [
      "Group name...",
      "Nombre del grupo...",
      "群组名称...",
      "اسم المجموعة...",
      "نام گروه...",
      "Nom du groupe...",
      "Gruppenname..."
  ],
  "Название канала": [
      "Channel Name",
      "Nombre del canal",
      "频道名称",
      "اسم القناة",
      "نام کانال",
      "Nom du canal",
      "Kanalname"
  ],
  "Название группы": [
      "Group Name",
      "Nombre del grupo",
      "群组名称",
      "اسم المجموعة",
      "نام گروه",
      "Nom du groupe",
      "Gruppenname"
  ],
  "Публичный юзернейм (@ссылка)": [
      "Public Username (@handle)",
      "Usuario público (@enlace)",
      "公开用户名 (@链接)",
      "اسم المستخدم العام (@رابط)",
      "نام کاربری عمومی (@لینک)",
      "Nom d'utilisateur public (@lien)",
      "Öffentlicher Benutzername (@Link)"
  ],
  "О чем этот канал...": [
      "What is this channel about...",
      "De qué trata este canal...",
      "频道简介...",
      "حول ماذا تدور هذه القناة...",
      "درباره این کانال...",
      "À propos de ce canal...",
      "Worum geht es in diesem Kanal..."
  ],
  "Имя участника...": [
      "Member username...",
      "Nombre del miembro...",
      "成员用户名...",
      "اسم العضو...",
      "نام کاربری عضو...",
      "Nom du membre...",
      "Mitgliedsname..."
  ],
  "Имя пользователя...": [
      "Username...",
      "Nombre de usuario...",
      "用户名...",
      "اسم المستخدم...",
      "نام کاربری...",
      "Nom d'utilisateur...",
      "Benutzername..."
  ],
  "(152-ФЗ)": [
      "(Data Protection Policy)",
      "(Protección de datos)",
      "(数据隐私保护)",
      "(حماية البيانات)",
      "(حفاظت از داده‌ها)",
      "(Protection des données)",
      "(Datenschutz)"
  ],
  "Описание канала": [
      "Channel Description",
      "Descripción del canal",
      "频道简介",
      "وصف القناة",
      "توضیحات کانال",
      "Description du canal",
      "Kanalbeschreibung"
  ],
  "Участники группы": [
      "Group Members",
      "Miembros del grupo",
      "群组成员",
      "أعضاء المجموعة",
      "اعضای گروه",
      "Membres du groupe",
      "Gruppenmitglieder"
  ],
  "Пользователи не найдены": [
      "No users found",
      "No se encontraron usuarios",
      "未找到用户",
      "لم يتم العثور على مستخدمين",
      "کاربری یافت نشد",
      "Aucun utilisateur trouvé",
      "Keine Benutzer gefunden"
  ],
  "добавлен": [
      "added",
      "añadido",
      "已添加",
      "مضاف",
      "اضافه شد",
      "ajouté",
      "hinzugefügt"
  ],
  "Список участников пуст": [
      "Member list is empty",
      "La lista de miembros está vacía",
      "成员列表为空",
      "قائمة الأعضاء فارغة",
      "لیست اعضا خالی است",
      "La liste des membres est vide",
      "Mitgliederliste ist leer"
  ],
  "Добавить участника": [
      "Add Member",
      "Añadir miembro",
      "添加成员",
      "إضافة عضو",
      "افزودن عضو",
      "Ajouter un membre",
      "Mitglied hinzufügen"
  ],
  "📊 Опрос": [
      "📊 Poll",
      "📊 Encuesta",
      "📊 投票",
      "📊 استطلاع رأي",
      "📊 نظرسنجی",
      "📊 Sondage",
      "📊 Umfrage"
  ],
  "Системное сообщение: голос в опросе учтен": [
      "System message: poll vote recorded",
      "Mensaje del sistema: voto registrado",
      "系统消息：投票已计入",
      "رسالة النظام: تم احتساب الصوت في الاستطلاع",
      "پیام سیستم: رای در نظرسنجی ثبت شد",
      "Message système : vote pris en compte",
      "Systemnachricht: Stimme in der Umfrage gezählt"
  ],
  "🔒 Сообщение отклонено: не зашифровано (Fail-Closed)": [
      "🔒 Message rejected: unencrypted (Fail-Closed)",
      "🔒 Mensaje rechazado: sin cifrar (Fail-Closed)",
      "🔒 消息已拒绝：未加密 (Fail-Closed)",
      "🔒 تم رفض الرسالة: غير مشفرة (Fail-Closed)",
      "🔒 پیام رد شد: رمزنگاری نشده (Fail-Closed)",
      "🔒 Message rejeté : non chiffré (Fail-Closed)",
      "🔒 Nachricht abgelehnt: unverschlüsselt (Fail-Closed)"
  ],
  "🔒 Синхронизация%": [
      "🔒 Synchronizing%",
      "🔒 Sincronizando%",
      "🔒 正在同步%",
      "🔒 مزامنة%",
      "🔒 همگام‌سازی%",
      "🔒 Synchronisation%",
      "🔒 Synchronisierung%"
  ],
  "🔒 Не удалось расшифровать сообщение": [
      "🔒 Failed to decrypt message",
      "🔒 No se pudo descifrar el mensaje",
      "🔒 无法解密消息",
      "🔒 تعذر فك تشفير الرسالة",
      "🔒 رمزگشایی پیام ناموفق بود",
      "🔒 Impossible de déchiffrer le message",
      "🔒 Nachricht konnte nicht entschlüsselt werden"
  ],
  "Системное сообщение: группа обновлена (сессия сброшена)": [
      "System message: group updated (session reset)",
      "Mensaje del sistema: grupo actualizado (sesión reiniciada)",
      "系统消息：群组已更新（会话已重置）",
      "رسالة النظام: تم تحديث المجموعة (أُعيد ضبط الجلسة)",
      "پیام سیستم: گروه به‌روزرسانی شد (نشست بازنشانی شد)",
      "Message système : groupe mis à jour (session réinitialisée)",
      "Systemnachricht: Gruppe aktualisiert (Sitzung zurückgesetzt)"
  ],
  "🔒 Синхронизация защищенного сообщения...": [
      "🔒 Synchronizing encrypted message...",
      "🔒 Sincronizando mensaje seguro...",
      "🔒 正在同步加密消息...",
      "🔒 جارٍ مزامنة الرسالة المشفرة...",
      "🔒 در حال همگام‌سازی پیام امن...",
      "🔒 Synchronisation du message sécurisé...",
      "🔒 Sichere Nachricht wird synchronisiert..."
  ],
  "уже использован": [
      "already used",
      "ya utilizado",
      "已使用",
      "مستخدم بالفعل",
      "قبلاً استفاده شده",
      "déjà utilisé",
      "bereits verwendet"
  ],
  "отсутствует или уже использован": [
      "missing or already used",
      "ausente o ya utilizado",
      "缺失或已使用",
      "مفقود أو مستخدم بالفعل",
      "مفقود یا قبلاً استفاده شده",
      "manquant ou déjà utilisé",
      "fehlt oder bereits verwendet"
  ],
  "Превышен лимит пропуска ключей": [
      "Key skip limit exceeded",
      "Límite de salto de claves excedido",
      "超出密钥跳过上限",
      "تم تجاوز حد تخطي المفاتيح",
      "محدودیت پرش کلید رد شد",
      "Limite de saut de clés dépassée",
      "Schlüssel-Skip-Limit überschritten"
  ],
  "🔒 Сообщение прочитано на другом устройстве": [
      "🔒 Message read on another device",
      "🔒 Mensaje leído en otro dispositivo",
      "🔒 消息已在其他设备上阅读",
      "🔒 تمت قراءة الرسالة على جهاز آخر",
      "🔒 پیام در دستگاه دیگری خوانده شد",
      "🔒 Message lu sur un autre appareil",
      "🔒 Nachricht auf einem anderen Gerät gelesen"
  ],
  "🔒 Синхронизация защищенного канала...": [
      "🔒 Synchronizing secure channel...",
      "🔒 Sincronizando canal seguro...",
      "🔒 正在同步安全通道...",
      "🔒 جارٍ مزامنة القناة الآمنة...",
      "🔒 در حال همگام‌سازی کانال امن...",
      "🔒 Synchronisation du canal sécurisé...",
      "🔒 Sicherer Kanal wird synchronisiert..."
  ],
  "🔒 Собственное сообщение не удалось расшифровать (сессия сброшена)": [
      "🔒 Own message could not be decrypted (session reset)",
      "🔒 No se pudo descifrar el mensaje propio (sesión reiniciada)",
      "🔒 无法解密自己的消息（会话已重置）",
      "🔒 تعذر فك تشفير رسالتك (أُعيد ضبط الجلسة)",
      "🔒 پیام خودتان رمزگشایی نشد (نشست بازنشانی شد)",
      "🔒 Votre propre message n'a pas pu être déchiffré (session réinitialisée)",
      "🔒 Eigene Nachricht konnte nicht entschlüsselt werden (Sitzung zurückgesetzt)"
  ],
  "🔒 Сообщение зашифровано новым ключом. Отправьте ответ собеседнику для восстановления защищенного канала.": [
      "🔒 Message encrypted with a new key. Reply to your contact to restore the secure channel.",
      "🔒 Mensaje cifrado con una nueva clave. Envíe una respuesta para restaurar el canal seguro.",
      "🔒 消息由新密钥加密。请回复对方以恢复安全通道。",
      "🔒 الرسالة مشفرة بمفتاح جديد. أرسل رداً لاستعادة القناة الآمنة.",
      "🔒 پیام با کلید جدیدی رمزنگاری شده است. برای بازیابی کانال امن یک پاسخ بفرستید.",
      "🔒 Message chiffré avec une nouvelle clé. Répondez au contact pour rétablir le canal sécurisé.",
      "🔒 Nachricht mit neuem Schlüssel verschlüsselt. Antworten Sie dem Kontakt, um den sicheren Kanal wiederherzustellen."
  ],
  "Не удалось получить URL загруженного медиафайла": [
      "Failed to get uploaded media URL",
      "No se pudo obtener la URL del archivo subido",
      "无法获取已上传媒体文件的 URL",
      "تعذر الحصول على رابط ملف الوسائط المرفوع",
      "دریافت آدرس فایل آپلود شده ناموفق بود",
      "Impossible d'obtenir l'URL du média téléversé",
      "URL der hochgeladenen Mediendatei konnte nicht abgerufen werden"
  ],
  "Не удалось получить message_id от сервера": [
      "Failed to get message_id from server",
      "No se pudo obtener message_id del servidor",
      "无法从服务器获取 message_id",
      "تعذر الحصول على message_id من الخادم",
      "دریافت message_id از سرور ناموفق بود",
      "Impossible d'obtenir le message_id du serveur",
      "message_id konnte nicht vom Server abgerufen werden"
  ],
  "MLS-сессия недоступна: невозможно зашифровать отложенное сообщение (Fail-Closed)": [
      "MLS session unavailable: cannot encrypt scheduled message (Fail-Closed)",
      "Sesión MLS no disponible: imposible cifrar mensaje programado (Fail-Closed)",
      "MLS 会话不可用：无法加密定时消息 (Fail-Closed)",
      "جلسة MLS غير متاحة: لا يمكن تشفير الرسالة المجدولة (Fail-Closed)",
      "نشست MLS در دسترس نیست: امکان رمزنگاری پیام زمان‌بندی شده وجود ندارد (Fail-Closed)",
      "Session MLS indisponible : impossible de chiffrer le message programmé (Fail-Closed)",
      "MLS-Sitzung nicht verfügbar: geplante Nachricht kann nicht verschlüsselt werden (Fail-Closed)"
  ],
  "передн": [
      "front",
      "frontal",
      "前置",
      "أمامية",
      "جلو",
      "avant",
      "vorne"
  ],
  "селфи": [
      "selfie",
      "selfie",
      "自拍",
      "سيلفي",
      "سلفی",
      "selfie",
      "Selfie"
  ],
  "задн": [
      "back",
      "trasera",
      "后置",
      "خلفية",
      "عقب",
      "arrière",
      "hinten"
  ],
  "основн": [
      "main",
      "principal",
      "主摄",
      "رئيسية",
      "اصلی",
      "principale",
      "Haupt"
  ],
  "Ложный PIN-код должен содержать минимум 4 цифры": [
      "Duress PIN must be at least 4 digits",
      "El PIN señuelo debe tener al menos 4 dígitos",
      "伪装 PIN 码至少需要 4 位数字",
      "يجب أن يتكون رمز PIN التمويهي من 4 أرقام على الأقل",
      "پین اضطراری باید حداقل ۴ رقم باشد",
      "Le PIN de contrainte doit comporter au moins 4 chiffres",
      "Die Tarn-PIN muss mindestens 4 Ziffern enthalten"
  ],
  "Список покупок и быт": [
      "Shopping List & Errands",
      "Lista de compras y hogar",
      "购物清单与日常",
      "قائمة التسوق والمنزل",
      "لیست خرید و کارهای روزمره",
      "Liste de courses et maison",
      "Einkaufsliste & Haushalt"
  ],
  "Молоко, кофе в зернах, батарейки АА, забрать посылку из ПВЗ": [
      "Milk, coffee beans, AA batteries, pick up parcel",
      "Leche, café en grano, pilas AA, recoger paquete",
      "牛奶、咖啡豆、AA 电池、去驿站取快递",
      "حليب، حبوب قهوة، بطاريات AA، استلام الطرد",
      "شیر، دانه قهوه، باتری قلمی، تحویل بسته پستی",
      "Lait, café en grains, piles AA, récupérer le colis",
      "Milch, Kaffeebohnen, AA-Batterien, Paket abholen"
  ],
  "Купить на неделю: овсянка, молоко, сыр, помидоры, фильтр для воды": [
      "Weekly groceries: oatmeal, milk, cheese, tomatoes, water filter",
      "Compras de la semana: avena, leche, queso, tomates, filtro de agua",
      "本周采购：燕麦片、牛奶、奶酪、番茄、滤水芯",
      "مشتريات الأسبوع: شوفان، حليب، جبن، طماطم، فلتر مياه",
      "خرید هفتگی: جو دوسر، شیر، پنیر، گوجه‌فرنگی، فیلتر آب",
      "Courses de la semaine : flocons d'avoine, lait, fromage, tomates, filtre à eau",
      "Wocheneinkauf: Haferflocken, Milch, Käse, Tomaten, Wasserfilter"
  ],
  "Справочник Gossip": [
      "Gossip Notes",
      "Guía de Gossip",
      "Gossip 备忘录",
      "دليل Gossip",
      "دفترچه یادداشت Gossip",
      "Carnet Gossip",
      "Gossip-Notizbuch"
  ],
  "Добро пожаловать! Здесь вы можете хранить личные заметки.": [
      "Welcome! You can keep your personal notes here.",
      "¡Bienvenido! Aquí puedes guardar tus notas personales.",
      "欢迎！您可以在这里保存个人笔记。",
      "مرحباً بك! يمكنك حفظ ملاحظاتك الشخصية هنا.",
      "خوش آمدید! در اینجا می‌توانید یادداشت‌های شخصی خود را نگه دارید.",
      "Bienvenue ! Vous pouvez conserver vos notes personnelles ici.",
      "Willkommen! Hier können Sie Ihre persönlichen Notizen speichern."
  ],
  "Добро пожаловать! Здесь вы можете хранить личные заметки и напоминания.": [
      "Welcome! You can keep your personal notes and reminders here.",
      "¡Bienvenido! Aquí puedes guardar tus notas personales y recordatorios.",
      "欢迎！您可以在这里保存个人笔记和提醒事项。",
      "مرحباً بك! يمكنك حفظ ملاحظاتك الشخصية وتذكيراتك هنا.",
      "خوش آمدید! در اینجا می‌توانید یادداشت‌ها و یادآوری‌های شخصی خود را ذخیره کنید.",
      "Bienvenue ! Vous pouvez conserver vos notes et rappels ici.",
      "Willkommen! Hier können Sie persönliche Notizen und Erinnerungen speichern."
  ],
  "Тренировки и бег": [
      "Workouts & Running",
      "Entrenamientos y running",
      "健身与跑步",
      "التمارين والجري",
      "تمرینات ورزشی و دویدن",
      "Entraînements et course",
      "Training & Laufen"
  ],
  "Четверг: пробежка 5 км в парке, пульс 142": [
      "Thursday: 5 km park run, HR 142",
      "Jueves: carrera de 5 km en el parque, pulso 142",
      "周四：公园慢跑 5 公里，心率 142",
      "الخميس: جري 5 كم في الحديقة، النبض 142",
      "پنجشنبه: دویدن ۵ کیلومتر در پارک، ضربان قلب ۱۴۲",
      "Jeudi : course de 5 km au parc, pouls 142",
      "Donnerstag: 5-km-Lauf im Park, Puls 142"
  ],
  "Вторник: жим лежа 3х10, подтягивания 4х12": [
      "Tuesday: bench press 3x10, pull-ups 4x12",
      "Martes: press de banca 3x10, dominadas 4x12",
      "周二：卧推 3x10，引体向上 4x12",
      "الثلاثاء: ضغط صدر 3×10، عقلة 4×12",
      "سه‌شنبه: پرس سینه ۳×۱۰، بارفیکس ۴×۱۲",
      "Mardi : développé couché 3x10, tractions 4x12",
      "Dienstag: Bankdrücken 3x10, Klimmzüge 4x12"
  ],
  "Не удалось загрузить статус спец-защиты": [
      "Failed to load Special Arsenal status",
      "No se pudo cargar el estado de protección especial",
      "无法加载特工武器库状态",
      "تعذر تحميل حالة الحماية الخاصة",
      "بارگذاری وضعیت حفاظت ویژه ناموفق بود",
      "Impossible de charger le statut de protection spéciale",
      "Status des Spezial-Arsenals konnte nicht geladen werden"
  ],
  "Ошибка сохранения настроек автосброса": [
      "Error saving auto-wipe settings",
      "Error al guardar los ajustes de autoborrado",
      "保存自动销毁设置出错",
      "خطأ في حفظ إعدادات المسح التلقائي",
      "خطا در ذخیره تنظیمات پاکسازی خودکار",
      "Erreur lors de l'enregistrement de l'effacement auto",
      "Fehler beim Speichern der Auto-Löschung"
  ],
  "Не удалось создать одноразовую Burner-ссылку": [
      "Failed to create one-time Burner link",
      "No se pudo crear el enlace temporal Burner",
      "无法创建一次性阅后即焚链接",
      "تعذر إنشاء الرابط المؤقت",
      "ایجاد لینک یک‌بارمصرف Burner ناموفق بود",
      "Impossible de créer le lien éphémère Burner",
      "Einmal-Burner-Link konnte nicht erstellt werden"
  ],
  "Ссылка недействительна или уже уничтожена": [
      "Link is invalid or already destroyed",
      "El enlace no es válido o ya fue destruido",
      "链接无效或已被销毁",
      "الرابط غير صالح أو تم تدميره بالفعل",
      "لینک نامعتبر است یا قبلاً نابود شده",
      "Le lien est invalide ou déjà détruit",
      "Link ist ungültig oder bereits vernichtet"
  ],
  "Не удалось уничтожить комнату": [
      "Failed to destroy room",
      "No se pudo destruir la sala",
      "无法销毁房间",
      "تعذر تدمير الغرفة",
      "نابودسازی اتاق ناموفق بود",
      "Impossible de détruire le salon",
      "Raum konnte nicht vernichtet werden"
  ],
  "Не удалось инициализировать 2D контекст Canvas": [
      "Failed to initialize 2D Canvas context",
      "No se pudo inicializar el contexto 2D de Canvas",
      "无法初始化 Canvas 2D 上下文",
      "تعذر تهيئة سياق Canvas ثنائي الأبعاد",
      "راه‌اندازی محیط دوبعدی Canvas ناموفق بود",
      "Impossible d'initialiser le contexte Canvas 2D",
      "2D-Canvas-Kontext konnte nicht initialisiert werden"
  ],
  "Ошибка генерации Blob из Canvas": [
      "Failed to generate Blob from Canvas",
      "Error al generar Blob desde Canvas",
      "从 Canvas 生成 Blob 失败",
      "فشل توليد Blob من Canvas",
      "خطا در تولید داده تصویر از Canvas",
      "Échec de la génération du Blob depuis le Canvas",
      "Fehler beim Erzeugen des Blobs aus dem Canvas"
  ],
  "Переход в автономный режим": [
      "Switching to offline mode",
      "Pasando a modo sin conexión",
      "正在切换至离线模式",
      "الانتقال إلى وضع عدم الاتصال",
      "انتقال به حالت آفلاین",
      "Passage en mode hors ligne",
      "Wechsel in den Offline-Modus"
  ],
  "Оффлайн-режим: send_message отклонен (fail-closed), доставкой займется outbox": [
      "Offline mode: send_message deferred (fail-closed), outbox will handle delivery",
      "Modo offline: send_message aplazado (fail-closed), la bandeja de salida lo enviará",
      "离线模式：send_message 已转交待发队列 (fail-closed)",
      "وضع عدم الاتصال: تم تأجيل الإرسال (fail-closed)، سيتولى صندوق الصادر التسليم",
      "حالت آفلاین: ارسال پیام به صف خروجی منتقل شد (fail-closed)",
      "Mode hors ligne : envoi différé (fail-closed), pris en charge par la boîte d'envoi",
      "Offline-Modus: send_message zurückgestellt (fail-closed), Zustellung über Outbox"
  ],
  "Шифрование не инициализировано": [
      "Encryption is not initialized",
      "El cifrado no está inicializado",
      "加密模块未初始化",
      "التشفير غير مهيأ",
      "رمزنگاری مقداردهی اولیه نشده است",
      "Le chiffrement n'est pas initialisé",
      "Verschlüsselung ist nicht initialisiert"
  ],
  "Адаптер уничтожен": [
      "Transport adapter disposed",
      "Adaptador destruido",
      "传输适配器已销毁",
      "تم إيقاف المحول",
      "آداپتور متوقف شد",
      "Adaptateur détruit",
      "Adapter beendet"
  ],
  "Конверт отсутствует или имеет некорректный тип": [
      "Envelope is missing or has an invalid type",
      "El sobre falta o tiene un tipo inválido",
      "信封缺失或类型无效",
      "الظرف مفقود أو ذو نوع غير صالح",
      "پاکت پیام موجود نیست یا نوع نامعتبری دارد",
      "L'enveloppe est manquante ou de type invalide",
      "Umschlag fehlt oder hat einen ungültigen Typ"
  ],
  "Отсутствует или пустой идентификатор конверта (id)": [
      "Missing or empty envelope identifier (id)",
      "Identificador del sobre (id) faltante o vacío",
      "缺少信封标识符 (id) 或为空",
      "معرف الظرف (id) مفقود أو فارغ",
      "شناسه پاکت (id) موجود نیست یا خالی است",
      "Identifiant d'enveloppe (id) manquant ou vide",
      "Umschlag-ID fehlt oder ist leer"
  ],
  "Отсутствует полезная зашифрованная нагрузка (encryptedPayload)": [
      "Missing encrypted payload (encryptedPayload)",
      "Falta la carga útil cifrada (encryptedPayload)",
      "缺少加密负载 (encryptedPayload)",
      "الحمولة المشفرة (encryptedPayload) مفقودة",
      "بار داده رمزنگاری شده (encryptedPayload) موجود نیست",
      "Charge utile chiffrée (encryptedPayload) manquante",
      "Verschlüsselte Nutzlast (encryptedPayload) fehlt"
  ],
  "Ни один из переданных конвертов не прошел валидацию": [
      "None of the provided envelopes passed validation",
      "Ninguno de los sobres pasó la validación",
      "所提供的信封均未通过验证",
      "لم يجتز أي من الأظرف المرسلة التحقق",
      "هیچ‌یک از پاکت‌های ارسالی اعتبارسنجی نشدند",
      "Aucune des enveloppes fournies n'a été validée",
      "Keiner der übergebenen Umschläge hat die Validierung bestanden"
  ],
  "Fetch API недоступен в текущем рантайме": [
      "Fetch API is unavailable in the current runtime",
      "Fetch API no está disponible en este entorno",
      "当前运行环境不支持 Fetch API",
      "واجهة Fetch API غير متاحة في بيئة التشغيل الحالية",
      "رابط Fetch API در این محیط در دسترس نیست",
      "Fetch API indisponible dans cet environnement",
      "Fetch API ist in der aktuellen Laufzeitumgebung nicht verfügbar"
  ],
  "Неизвестная ошибка HTTP": [
      "Unknown HTTP error",
      "Error HTTP desconocido",
      "未知 HTTP 错误",
      "خطأ HTTP غير معروف",
      "خطای ناشناخته HTTP",
      "Erreur HTTP inconnue",
      "Unbekannter HTTP-Fehler"
  ],
  "Сетевая ошибка при обращении к релею": [
      "Network error while contacting relay",
      "Error de red al contactar con el relé",
      "连接中继服务器时发生网络错误",
      "خطأ في الشبكة أثناء الاتصال بالمرحل",
      "خطای شبکه هنگام ارتباط با رله",
      "Erreur réseau lors de la connexion au relais",
      "Netzwerkfehler beim Kontaktieren des Relays"
  ],
  "Клиент остановлен": [
      "Client stopped",
      "Cliente detenido",
      "客户端已停止",
      "توقف العميل",
      "کلاینت متوقف شد",
      "Client arrêté",
      "Client gestoppt"
  ],
  "Соединение закрыто": [
      "Connection closed",
      "Conexión cerrada",
      "连接已关闭",
      "تم إغلاق الاتصال",
      "اتصال بسته شد",
      "Connexion fermée",
      "Verbindung geschlossen"
  ],
  "LAN клиент остановлен": [
      "LAN client stopped",
      "Cliente LAN detenido",
      "局域网客户端已停止",
      "توقف عميل الشبكة المحلية LAN",
      "کلاینت شبکه محلی متوقف شد",
      "Client LAN arrêté",
      "LAN-Client gestoppt"
  ],
  "Таймаут ожидания ACK от пира": [
      "Peer ACK timed out",
      "Tiempo de espera de ACK del par agotado",
      "等待节点 ACK 超时",
      "انتهت مهلة انتظار ACK من القرين",
      "زمان انتظار تاییدیه ACK از همتا به پایان رسید",
      "Délai d'attente ACK du pair dépassé",
      "Zeitüberschreitung beim Warten auf Peer-ACK"
  ],
  "Ошибка отправки в сокет": [
      "Socket send error",
      "Error al enviar al socket",
      "套接字发送错误",
      "خطأ في الإرسال عبر المقبس",
      "خطا در ارسال به سوکت",
      "Erreur d'envoi sur le socket",
      "Fehler beim Senden über den Socket"
  ],
  "Не удалось подключиться к пиру": [
      "Failed to connect to peer",
      "No se pudo conectar con el par",
      "无法连接到对等节点",
      "تعذر الاتصال بالقرين",
      "اتصال به همتا ناموفق بود",
      "Impossible de se connecter au pair",
      "Verbindung zum Peer fehlgeschlagen"
  ],
  "Нет доступных LAN пиров": [
      "No LAN peers available",
      "No hay pares LAN disponibles",
      "暂无可用的局域网节点",
      "لا يوجد أقران متاحون على الشبكة المحلية",
      "هیچ همتای شبکه محلی در دسترس نیست",
      "Aucun pair LAN disponible",
      "Keine LAN-Peers verfügbar"
  ],
  "Не удалось доставить ни одному пиру": [
      "Failed to deliver to any peer",
      "No se pudo entregar a ningún par",
      "无法投递给任何节点",
      "تعذر التسليم لأي قرين",
      "تحویل به هیچ همتایی موفق نبود",
      "Impossible de livrer à aucun pair",
      "Zustellung an keinen Peer möglich"
  ],
  "Виртуальный сервер отклонил подключение (превышен лимит сокетов)": [
      "Virtual server rejected connection (socket limit exceeded)",
      "El servidor virtual rechazó la conexión (límite de sockets excedido)",
      "虚拟服务器拒绝连接（超出套接字上限）",
      "رفض الخادم الافتراضي الاتصال (تم تجاوز حد المقابس)",
      "سرور مجازی اتصال را رد کرد (محدودیت تعداد سوکت)",
      "Le serveur virtuel a refusé la connexion (limite de sockets dépassée)",
      "Virtueller Server hat die Verbindung abgelehnt (Socket-Limit überschritten)"
  ],
  "Соединение с пиром разорвано": [
      "Peer connection lost",
      "Conexión con el par interrumpida",
      "与对等节点的连接已断开",
      "انقطع الاتصال بالقرين",
      "ارتباط با همتا قطع شد",
      "Connexion avec le pair interrompue",
      "Verbindung zum Peer getrennt"
  ],
  "Не удалось получить новый видеотрек при переключении камеры": [
      "Failed to acquire new video track when switching camera",
      "No se pudo obtener la nueva pista de video al cambiar de cámara",
      "切换摄像头时无法获取新视频轨道",
      "تعذر الحصول على مسار فيديو جديد عند تبديل الكاميرا",
      "دریافت تصویر جدید هنگام تغییر دوربین ناموفق بود",
      "Impossible d'obtenir la nouvelle piste vidéo lors du changement de caméra",
      "Neuer Videotrack konnte beim Kamerawechsel nicht abgerufen werden"
  ],
  "Web Crypto API (crypto.subtle) не поддерживается в данном окружении": [
      "Web Crypto API (crypto.subtle) is not supported in this environment",
      "Web Crypto API (crypto.subtle) no es compatible en este entorno",
      "当前环境不支持 Web Crypto API (crypto.subtle)",
      "واجهة Web Crypto API غير مدعومة في هذه البيئة",
      "رابط Web Crypto API در این محیط پشتیبانی نمی‌شود",
      "Web Crypto API (crypto.subtle) n'est pas pris en charge dans cet environnement",
      "Web Crypto API (crypto.subtle) wird in dieser Umgebung nicht unterstützt"
  ],
  "Web Crypto API не поддерживается в данном окружении": [
      "Web Crypto API is not supported in this environment",
      "Web Crypto API no es compatible en este entorno",
      "当前环境不支持 Web Crypto API",
      "واجهة Web Crypto API غير مدعومة في هذه البيئة",
      "رابط Web Crypto API در این محیط پشتیبانی نمی‌شود",
      "Web Crypto API n'est pas pris en charge dans cet environnement",
      "Web Crypto API wird in dieser Umgebung nicht unterstützt"
  ],
  "Публичный ключ Ed25519 обязан иметь длину 32 байта (64 hex-символа)": [
      "Ed25519 public key must be 32 bytes (64 hex characters)",
      "La clave pública Ed25519 debe tener 32 bytes (64 caracteres hex)",
      "Ed25519 公钥长度必须为 32 字节（64 个十六进制字符）",
      "يجب أن يكون طول المفتاح العام Ed25519‏ 32 بايت (64 حرفاً سداسياً عشرياً)",
      "کلید عمومی Ed25519 باید ۳۲ بایت (۶۴ کاراکتر هگز) باشد",
      "La clé publique Ed25519 doit faire 32 octets (64 caractères hex)",
      "Öffentlicher Ed25519-Schlüssel muss 32 Byte (64 Hex-Zeichen) lang sein"
  ],
  "[SafetyNumber] Криптографическое окружение недоступно (нет WebCrypto / Node Crypto)": [
      "[SafetyNumber] Cryptographic runtime unavailable (no WebCrypto / Node Crypto)",
      "[SafetyNumber] Entorno criptográfico no disponible",
      "[SafetyNumber] 加密环境不可用",
      "[SafetyNumber] بيئة التشفير غير متاحة",
      "[SafetyNumber] محیط رمزنگاری در دسترس نیست",
      "[SafetyNumber] Environnement cryptographique indisponible",
      "[SafetyNumber] Kryptografische Umgebung nicht verfügbar"
  ],
  "[SafetyNumber] Оба участника (userA, userB) обязаны быть переданы": [
      "[SafetyNumber] Both participants (userA, userB) must be provided",
      "[SafetyNumber] Ambos participantes (userA, userB) son obligatorios",
      "[SafetyNumber] 必须提供双方参与者 (userA, userB)",
      "[SafetyNumber] يجب تمرير كلا المشاركين (userA, userB)",
      "[SafetyNumber] اطلاعات هر دو طرف باید ارسال شود",
      "[SafetyNumber] Les deux participants (userA, userB) sont requis",
      "[SafetyNumber] Beide Teilnehmer (userA, userB) müssen angegeben werden"
  ],
  "[SafetyNumber] Не удалось извлечь публичные ключи участников": [
      "[SafetyNumber] Failed to extract participants' public keys",
      "[SafetyNumber] No se pudieron extraer las claves públicas",
      "[SafetyNumber] 无法提取参与者公钥",
      "[SafetyNumber] تعذر استخراج المفاتيح العامة للمشاركين",
      "[SafetyNumber] استخراج کلیدهای عمومی اعضا ناموفق بود",
      "[SafetyNumber] Impossible d'extraire les clés publiques",
      "[SafetyNumber] Öffentliche Schlüssel konnten nicht extrahiert werden"
  ],
  "Пустой QR payload": [
      "Empty QR payload",
      "Carga QR vacía",
      "二维码数据为空",
      "بيانات رمز QR فارغة",
      "داده کد QR خالی است",
      "Charge utile QR vide",
      "Leere QR-Nutzdaten"
  ],
  "Неверный формат или неподдерживаемое приложение": [
      "Invalid format or unsupported application",
      "Formato inválido o aplicación no compatible",
      "格式无效或应用不受支持",
      "تنسيق غير صالح أو تطبيق غير مدعوم",
      "فرمت نامعتبر یا برنامه پشتیبانی‌نشده",
      "Format invalide ou application non prise en charge",
      "Ungültiges Format oder nicht unterstützte Anwendung"
  ],
  "Неполные данные в QR payload": [
      "Incomplete data in QR payload",
      "Datos incompletos en el código QR",
      "二维码数据不完整",
      "بيانات غير مكتملة في رمز QR",
      "اطلاعات کد QR ناقص است",
      "Données incomplètes dans le QR code",
      "Unvollständige Daten im QR-Code"
  ],
  "Safety Number не совпадает": [
      "Safety Number does not match",
      "El número de seguridad no coincide",
      "安全码不匹配",
      "رقم الأمان غير متطابق",
      "کد امنیتی مطابقت ندارد",
      "Le numéro de sécurité ne correspond pas",
      "Sicherheitsnummer stimmt nicht überein"
  ],
  "Не удалось получить SDP Offer от Janus для подписчика": [
      "Failed to get SDP Offer from Janus for subscriber",
      "No se pudo obtener SDP Offer de Janus",
      "无法从 Janus 获取订阅者 SDP Offer",
      "تعذر الحصول على SDP Offer من Janus",
      "دریافت SDP Offer از سرور تماس ناموفق بود",
      "Impossible d'obtenir l'offre SDP de Janus",
      "SDP-Offer von Janus konnte nicht abgerufen werden"
  ],
  "Не удалось получить SDP Answer от Janus": [
      "Failed to get SDP Answer from Janus",
      "No se pudo obtener SDP Answer de Janus",
      "无法从 Janus 获取 SDP Answer",
      "تعذر الحصول على SDP Answer من Janus",
      "دریافت SDP Answer از سرور تماس ناموفق بود",
      "Impossible d'obtenir la réponse SDP de Janus",
      "SDP-Answer von Janus konnte nicht abgerufen werden"
  ],
  "Не удалось получить доступ к микрофону или камере.": [
      "Failed to access microphone or camera.",
      "No se pudo acceder al micrófono o la cámara.",
      "无法访问麦克风或摄像头。",
      "تعذر الوصول إلى الميكروفون أو الكاميرا.",
      "دسترسی به میکروفون یا دوربین امکان‌پذیر نشد.",
      "Impossible d'accéder au microphone ou à la caméra.",
      "Zugriff auf Mikrofon oder Kamera fehlgeschlagen."
  ],
  "Не удалось получить доступ к микрофону.": [
      "Failed to access microphone.",
      "No se pudo acceder al micrófono.",
      "无法访问麦克风。",
      "تعذر الوصول إلى الميكروفون.",
      "دسترسی به میکروفون امکان‌پذیر نشد.",
      "Impossible d'accéder au microphone.",
      "Zugriff auf Mikrofon fehlgeschlagen."
  ],
  "Janus: пустой session_id при создании сессии": [
      "Janus: empty session_id when creating session",
      "Janus: session_id vacío al crear sesión",
      "Janus：创建会话时 session_id 为空",
      "Janus: معرف الجلسة فارغ عند الإنشاء",
      "Janus: شناسه نشست هنگام ایجاد خالی است",
      "Janus : session_id vide à la création",
      "Janus: leere session_id beim Erstellen der Sitzung"
  ],
  "Сессия или хэндл Janus не инициализированы перед отправкой SDP": [
      "Janus session or handle not initialized before sending SDP",
      "Sesión o handle de Janus no inicializado antes de enviar SDP",
      "发送 SDP 前未初始化 Janus 会话或句柄",
      "لم تتم تهيئة جلسة Janus قبل إرسال SDP",
      "نشست Janus پیش از ارسال SDP راه‌اندازی نشده است",
      "Session Janus non initialisée avant l'envoi SDP",
      "Janus-Sitzung vor dem Senden von SDP nicht initialisiert"
  ],
  "Нет предложений для перехода на новую эпоху": [
      "No proposals for epoch transition",
      "No hay propuestas para avanzar de época",
      "暂无进入新纪元的提案",
      "لا توجد مقترحات للانتقال إلى حقبة جديدة",
      "پیشنهادی برای ارتقای دوره (Epoch) وجود ندارد",
      "Aucune proposition pour changer d'époque",
      "Keine Vorschläge für Epochenübergang"
  ],
  "Локальный медиафайл не найден в хранилище": [
      "Local media file not found in storage",
      "Archivo multimedia local no encontrado en el almacenamiento",
      "存储中未找到本地媒体文件",
      "ملف الوسائط المحلي غير موجود في التخزين",
      "فایل رسانه محلی در حافظه یافت نشد",
      "Fichier média local introuvable dans le stockage",
      "Lokale Mediendatei nicht im Speicher gefunden"
  ],
  "Ошибка чтения локального медиафайла": [
      "Error reading local media file",
      "Error al leer el archivo multimedia local",
      "读取本地媒体文件出错",
      "خطأ في قراءة ملف الوسائط المحلي",
      "خطا در خواندن فایل رسانه محلی",
      "Erreur de lecture du fichier média local",
      "Fehler beim Lesen der lokalen Mediendatei"
  ],
  "Отсутствуют ключи расшифровки медиафайла": [
      "Media decryption keys are missing",
      "Faltan las claves de descifrado del archivo multimedia",
      "缺少媒体文件解密密钥",
      "مفاتيح فك تشفير ملف الوسائط مفقودة",
      "کلیدهای رمزگشایی فایل رسانه موجود نیستند",
      "Clés de déchiffrement du fichier média manquantes",
      "Entschlüsselungsschlüssel für Mediendatei fehlen"
  ],
  "Ошибка расшифрования": [
      "Decryption error",
      "Error de descifrado",
      "解密错误",
      "خطأ في فك التشفير",
      "خطا در رمزگشایی",
      "Erreur de déchiffrement",
      "Entschlüsselungsfehler"
  ],
  "Сервер не вернул confirmation_url": [
      "Server did not return confirmation_url",
      "El servidor no devolvió confirmation_url",
      "服务器未返回 confirmation_url",
      "لم يُرجع الخادم رابط التأكيد confirmation_url",
      "سرور لینک تایید پرداخت را برنگرداند",
      "Le serveur n'a pas renvoyé confirmation_url",
      "Server hat keine confirmation_url zurückgegeben"
  ],
  "Сбой связи с сервером платежей": [
      "Payment server communication failed",
      "Fallo de comunicación con el servidor de pagos",
      "与支付服务器通信失败",
      "فشل الاتصال بخادم المدفوعات",
      "خطا در ارتباط با سرور پرداخت",
      "Échec de communication avec le serveur de paiement",
      "Kommunikation mit dem Zahlungsserver fehlgeschlagen"
  ],
  "Нет доступных транспортов для отправки": [
      "No transports available for sending",
      "No hay transportes disponibles para enviar",
      "没有可用于发送的传输通道",
      "لا توجد وسائط نقل متاحة للإرسال",
      "هیچ مسیر ارتباطی برای ارسال در دسترس نیست",
      "Aucun transport disponible pour l'envoi",
      "Keine Transporte zum Senden verfügbar"
  ],
  "Ни один транспорт не доступен для заданного типа полезной нагрузки": [
      "No transport available for the specified payload type",
      "Ningún transporte disponible para este tipo de carga",
      "指定的数据负载类型没有可用传输通道",
      "لا يوجد وسيط نقل متاح لنوع البيانات المحدد",
      "هیچ ترنسپورتی برای این نوع داده در دسترس نیست",
      "Aucun transport disponible pour ce type de charge utile",
      "Kein Transport für den angegebenen Nutzlasttyp verfügbar"
  ],
  "Ошибка отправки через": [
      "Send error via",
      "Error de envío por",
      "发送失败，通道：",
      "خطأ في الإرسال عبر",
      "خطا در ارسال از طریق",
      "Erreur d'envoi via",
      "Sendefehler über"
  ],
  "Не удалось доставить пакет ни через один из доступных транспортов": [
      "Failed to deliver packet through any available transport",
      "No se pudo entregar el paquete por ningún transporte disponible",
      "无法通过任何可用传输通道投递数据包",
      "تعذر تسليم الحزمة عبر أي وسيط نقل متاح",
      "تحویل بسته از طریق هیچ‌یک از مسیرهای موجود موفق نبود",
      "Impossible de livrer le paquet via les transports disponibles",
      "Paket konnte über keinen verfügbaren Transport zugestellt werden"
  ],
  "LAN транспорт выключен": [
      "LAN transport is disabled",
      "El transporte LAN está desactivado",
      "局域网传输已关闭",
      "نقل الشبكة المحلية LAN متوقف",
      "ترنسپورت شبکه محلی (LAN) غیرفعال است",
      "Le transport LAN est désactivé",
      "LAN-Transport ist deaktiviert"
  ],
  "Попытка отправки собственного эхо-пакета": [
      "Attempted to send own echo packet",
      "Intento de envío de paquete eco propio",
      "尝试发送自身的回显数据包",
      "محاولة إرسال حزمة صدى ذاتية",
      "تلاش برای ارسال بسته اکو به خود",
      "Tentative d'envoi de son propre paquet écho",
      "Versuch, eigenes Echo-Paket zu senden"
  ],
  "Пир не найден в локальной сети": [
      "Peer not found on local network",
      "Par no encontrado en la red local",
      "在局域网中未找到该节点",
      "لم يتم العثور على القرين في الشبكة المحلية",
      "همتا در شبکه محلی یافت نشد",
      "Pair introuvable sur le réseau local",
      "Peer im lokalen Netzwerk nicht gefunden"
  ],
  "Нет активных LAN соседей": [
      "No active LAN neighbors",
      "No hay vecinos LAN activos",
      "没有活跃的局域网邻居节点",
      "لا يوجد جيران نشطون على الشبكة المحلية",
      "هیچ همسایه فعالی در شبکه محلی نیست",
      "Aucun voisin LAN actif",
      "Keine aktiven LAN-Nachbarn"
  ],
  "Превышен таймаут сжатия видео FFmpeg WASM (60 секунд)": [
      "FFmpeg WASM video compression timed out (60s)",
      "Tiempo de compresión de video FFmpeg WASM agotado (60s)",
      "FFmpeg WASM 视频压缩超时（60 秒）",
      "انتهت مهلة ضغط الفيديو عبر FFmpeg WASM (60 ثانية)",
      "زمان فشرده‌سازی ویدیو با FFmpeg WASM به پایان رسید (۶۰ ثانیه)",
      "Délai de compression vidéo FFmpeg WASM dépassé (60 s)",
      "Zeitüberschreitung bei der FFmpeg-WASM-Videokomprimierung (60 Sek.)"
  ],
  "FFmpeg вернул пустой видеофайл": [
      "FFmpeg returned an empty video file",
      "FFmpeg devolvió un archivo de video vacío",
      "FFmpeg 返回了空视频文件",
      "أرجع FFmpeg ملف فيديو فارغاً",
      "خروجی ویدیوی FFmpeg خالی بود",
      "FFmpeg a renvoyé un fichier vidéo vide",
      "FFmpeg hat eine leere Videodatei zurückgegeben"
  ],
  "Превышен таймаут сжатия видео-кружка FFmpeg WASM (45 секунд)": [
      "FFmpeg WASM video note compression timed out (45s)",
      "Tiempo de compresión de nota de video FFmpeg WASM agotado (45s)",
      "FFmpeg WASM 圆视频压缩超时（45 秒）",
      "انتهت مهلة ضغط رسالة الفيديو عبر FFmpeg WASM (45 ثانية)",
      "زمان فشرده‌سازی ویدیو مسیج به پایان رسید (۴۵ ثانیه)",
      "Délai de compression de la note vidéo dépassé (45 s)",
      "Zeitüberschreitung bei der Videonachricht-Komprimierung (45 Sek.)"
  ],
  "FFmpeg вернул пустой файл кружка": [
      "FFmpeg returned an empty video note file",
      "FFmpeg devolvió un archivo de nota de video vacío",
      "FFmpeg 返回了空圆视频文件",
      "أرجع FFmpeg ملف رسالة فيديو فارغاً",
      "خروجی ویدیو مسیج FFmpeg خالی بود",
      "FFmpeg a renvoyé un fichier de note vidéo vide",
      "FFmpeg hat eine leere Videonachricht-Datei zurückgegeben"
  ],
  "Не удалось прочитать поток данных": [
      "Failed to read data stream",
      "No se pudo leer el flujo de datos",
      "无法读取数据流",
      "تعذر قراءة تدفق البيانات",
      "خواندن جریان داده ناموفق بود",
      "Impossible de lire le flux de données",
      "Datenstrom konnte nicht gelesen werden"
  ],
  "Загрузка Tus завершилась без возврата URL": [
      "Tus upload finished without returning a URL",
      "La subida Tus finalizó sin devolver una URL",
      "Tus 上传完成但未返回 URL",
      "انتهى رفع Tus دون إرجاع رابط",
      "آپلود Tus بدون بازگشت لینک پایان یافت",
      "Téléversement Tus terminé sans URL",
      "Tus-Upload ohne URL-Rückgabe abgeschlossen"
  ],
  "bluetooth выключен": [
      "Bluetooth is off",
      "Bluetooth apagado",
      "蓝牙已关闭",
      "البلوتوث متوقف",
      "بلوتوث خاموش است",
      "Bluetooth désactivé",
      "Bluetooth ist ausgeschaltet"
  ],
  "BLE транспорт выключен": [
      "BLE transport is disabled",
      "El transporte BLE está desactivado",
      "BLE 传输已关闭",
      "نقل BLE متوقف",
      "ترنسپورت BLE غیرفعال است",
      "Le transport BLE est désactivé",
      "BLE-Transport ist deaktiviert"
  ],
  "Пир находится на cooldown паузе": [
      "Peer is on cooldown pause",
      "El par está en pausa de enfriamiento",
      "节点正处于冷却暂停状态",
      "القرين في فترة انتظار مؤقتة",
      "همتا در وقفه خنک‌سازی (Cooldown) است",
      "Le pair est en pause de refroidissement",
      "Peer befindet sich in einer Cooldown-Pause"
  ],
  "Сбой аттестации устройства Android (Play Integrity)": [
      "Android Device Attestation failed (Play Integrity)",
      "Fallo de atestación del dispositivo Android (Play Integrity)",
      "Android 设备完整性验证失败 (Play Integrity)",
      "فشل التحقق من موثوقية جهاز Android (Play Integrity)",
      "تایید اصالت دستگاه اندروید ناموفق بود (Play Integrity)",
      "Échec de l'attestation Android (Play Integrity)",
      "Android-Geräteattestierung fehlgeschlagen (Play Integrity)"
  ],
  "Сбой аттестации устройства iOS (App Attest)": [
      "iOS Device Attestation failed (App Attest)",
      "Fallo de atestación del dispositivo iOS (App Attest)",
      "iOS 设备完整性验证失败 (App Attest)",
      "فشل التحقق من موثوقية جهاز iOS (App Attest)",
      "تایید اصالت دستگاه iOS ناموفق بود (App Attest)",
      "Échec de l'attestation iOS (App Attest)",
      "iOS-Geräteattestierung fehlgeschlagen (App Attest)"
  ],
  "Драйвер не инициализирован": [
      "Driver is not initialized",
      "El controlador no está inicializado",
      "驱动程序未初始化",
      "برنامج التشغيل غير مهيأ",
      "درایور راه‌اندازی نشده است",
      "Pilote non initialisé",
      "Treiber ist nicht initialisiert"
  ],
  "Хранилище не открыто": [
      "Storage is not open",
      "El almacenamiento no está abierto",
      "存储未打开",
      "التخزين غير مفتوح",
      "حافظه باز نشده است",
      "Stockage non ouvert",
      "Speicher ist nicht geöffnet"
  ],
  "Передача медиа по LAN отключена в настройках": [
      "LAN media transfer is disabled in settings",
      "La transferencia multimedia por LAN está desactivada en ajustes",
      "设置中已禁用局域网媒体传输",
      "تم تعطيل نقل الوسائط عبر LAN في الإعدادات",
      "انتقال رسانه از طریق شبکه محلی در تنظیمات غیرفعال است",
      "Le transfert média LAN est désactivé dans les paramètres",
      "LAN-Medienübertragung ist in den Einstellungen deaktiviert"
  ],
  "Медиафайл не найден на локальном узле": [
      "Media file not found on local node",
      "Archivo multimedia no encontrado en el nodo local",
      "本地节点上未找到该媒体文件",
      "ملف الوسائط غير موجود على العقدة المحلية",
      "فایل رسانه روی نود محلی یافت نشد",
      "Fichier média introuvable sur le nœud local",
      "Mediendatei auf lokalem Knoten nicht gefunden"
  ],
  "Web Serial API не поддерживается в данной среде": [
      "Web Serial API is not supported in this environment",
      "Web Serial API no es compatible en este entorno",
      "当前环境不支持 Web Serial API",
      "واجهة Web Serial API غير مدعومة في هذه البيئة",
      "رابط Web Serial API در این محیط پشتیبانی نمی‌شود",
      "Web Serial API non pris en charge dans cet environnement",
      "Web Serial API wird in dieser Umgebung nicht unterstützt"
  ],
  "Web Bluetooth API не поддерживается в данной среде": [
      "Web Bluetooth API is not supported in this environment",
      "Web Bluetooth API no es compatible en este entorno",
      "当前环境不支持 Web Bluetooth API",
      "واجهة Web Bluetooth API غير مدعومة في هذه البيئة",
      "رابط Web Bluetooth API در این محیط پشتیبانی نمی‌شود",
      "Web Bluetooth API non pris en charge dans cet environnement",
      "Web Bluetooth API wird in dieser Umgebung nicht unterstützt"
  ],
  "Нет изображения для редактирования": [
      "No image to edit",
      "No hay imagen para editar",
      "没有可编辑的图片",
      "لا توجد صورة للتعديل",
      "تصویری برای ویرایش وجود ندارد",
      "Aucune image à modifier",
      "Kein Bild zum Bearbeiten vorhanden"
  ],
  "Не удалось прочитать файл": [
      "Failed to read file",
      "No se pudo leer el archivo",
      "无法读取文件",
      "تعذر قراءة الملف",
      "خواندن فایل ناموفق بود",
      "Impossible de lire le fichier",
      "Datei konnte nicht gelesen werden"
  ],
  "Неизвестная ошибка PoW воркера": [
      "Unknown PoW worker error",
      "Error desconocido del worker PoW",
      "PoW 工作线程发生未知错误",
      "خطأ غير معروف في معالج PoW",
      "خطای ناشناخته در پردازشگر PoW",
      "Erreur inconnue du worker PoW",
      "Unbekannter PoW-Worker-Fehler"
  ],
  "electronAPI.invoke не доступен. Убедитесь, что приложение запущено в Electron.": [
      "electronAPI.invoke is unavailable. Make sure the app is running inside Electron.",
      "electronAPI.invoke no está disponible. Asegúrese de ejecutar la app en Electron.",
      "electronAPI.invoke 不可用，请确保应用在 Electron 中运行。",
      "واجهة electronAPI.invoke غير متاحة. تأكد من تشغيل التطبيق داخل Electron.",
      "رابط electronAPI.invoke در دسترس نیست. مطمئن شوید برنامه در Electron اجرا شده است.",
      "electronAPI.invoke indisponible. Vérifiez que l'application tourne sous Electron.",
      "electronAPI.invoke nicht verfügbar. Stellen Sie sicher, dass die App in Electron läuft."
  ],
  "Worker не инициализирован": [
      "Worker is not initialized",
      "El worker no está inicializado",
      "Worker 未初始化",
      "المعالج الفرعي غير مهيأ",
      "پردازشگر راه‌اندازی نشده است",
      "Worker non initialisé",
      "Worker ist nicht initialisiert"
  ],
  "Добро пожаловать в дизайн-систему": [
      "Welcome to the design system",
      "Bienvenido al sistema de diseño",
      "欢迎使用设计系统",
      "مرحباً بك في نظام التصميم",
      "به سیستم طراحی خوش آمدید",
      "Bienvenue dans le système de design",
      "Willkommen im Designsystem"
  ],
  "для клиентских приложений Gossip!": [
      "for Gossip client applications!",
      "para las aplicaciones cliente de Gossip!",
      "适用于 Gossip 客户端应用！",
      "لتطبيقات عميل Gossip!",
      "برای اپلیکیشن‌های کلاینت Gossip!",
      "pour les applications clientes Gossip !",
      "für Gossip-Client-Anwendungen!"
  ],
  "Этот интерфейс разработан на основе концепции": [
      "This interface is built on the concept of",
      "Esta interfaz está diseñada sobre el concepto de",
      "该界面基于以下设计理念构建：",
      "تم تطوير هذه الواجهة بناءً على مفهوم",
      "این رابط کاربری بر پایه مفهوم",
      "Cette interface est conçue sur le concept de",
      "Diese Oberfläche basiert auf dem Konzept von"
  ],
  "и использует современные эффекты матового стекла с субпиксельным размытием бэкдропа (`backdrop-blur-xl`) и границами повышенной контрастности для темных тем (`border-white/10`).": [
      "and uses modern frosted glass effects with subpixel backdrop blur (`backdrop-blur-xl`) and high-contrast dark theme borders (`border-white/10`).",
      "y utiliza efectos modernos de cristal esmerilado con desenfoque (`backdrop-blur-xl`) y bordes de alto contraste (`border-white/10`).",
      "并采用现代磨砂玻璃效果、亚像素背景模糊 (`backdrop-blur-xl`) 以及暗色高对比度边框 (`border-white/10`)。",
      "وتستخدم تأثيرات الزجاج المصنفر الحديثة مع تمويه الخلفية (`backdrop-blur-xl`) وحدود عالية التباين للوضع الداكن (`border-white/10`).",
      "و از افکت‌های مدرن شیشه مات (`backdrop-blur-xl`) و حاشیه‌های با کنتراست بالا برای تم تیره (`border-white/10`) استفاده می‌کند.",
      "et utilise des effets de verre dépoli modernes (`backdrop-blur-xl`) et des bordures à contraste élevé (`border-white/10`).",
      "und nutzt moderne Milchglaseffekte mit Subpixel-Unschärfe (`backdrop-blur-xl`) und kontrastreichen Rändern (`border-white/10`)."
  ],
  "Версия:": [
      "Version:",
      "Versión:",
      "版本：",
      "الإصدار:",
      "نسخه:",
      "Version :",
      "Version:"
  ],
  "Добавить": [
      "Add",
      "Añadir",
      "添加",
      "إضافة",
      "افزودن",
      "Ajouter",
      "Hinzufügen"
  ],
  "Участники (": [
      "Members (",
      "Miembros (",
      "成员 (",
      "الأعضاء (",
      "اعضا (",
      "Membres (",
      "Mitglieder ("
  ],
  "Обновить v": [
      "Update v",
      "Actualizar v",
      "更新 v",
      "تحديث v",
      "به‌روزرسانی v",
      "Mettre à jour v",
      "Update v"
  ],
  "Проверить безопасность": [
      "Verify Security",
      "Verificar seguridad",
      "安全验证",
      "التحقق من الأمان",
      "بررسی امنیت",
      "Vérifier la sécurité",
      "Sicherheit prüfen"
  ],
  "Перевод": [
      "Transfer",
      "Transferencia",
      "转账",
      "تحويل",
      "انتقال",
      "Transfert",
      "Überweisung"
  ],
  "Голосование": [
      "Poll",
      "Votación",
      "投票",
      "تصويت",
      "رای‌گیری",
      "Vote",
      "Abstimmung"
  ],
  "Корректный юзернейм: @": [
      "Valid username: @",
      "Usuario válido: @",
      "有效用户名：@",
      "اسم مستخدم صالح: @",
      "نام کاربری معتبر: @",
      "Nom d'utilisateur valide : @",
      "Gültiger Benutzername: @"
  ],
  "Открыть чат с @": [
      "Open chat with @",
      "Abrir chat con @",
      "打开聊天：@",
      "فتح دردشة مع @",
      "باز کردن چت با @",
      "Ouvrir le chat avec @",
      "Chat öffnen mit @"
  ],
  "Успешный ответ (HTTP": [
      "Successful response (HTTP",
      "Respuesta exitosa (HTTP",
      "响应成功 (HTTP",
      "استجابة ناجحة (HTTP",
      "پاسخ موفق (HTTP",
      "Réponse réussie (HTTP",
      "Erfolgreiche Antwort (HTTP"
  ],
  "Сбой проверки (HTTP": [
      "Check failed (HTTP",
      "Fallo de verificación (HTTP",
      "检查失败 (HTTP",
      "فشل الفحص (HTTP",
      "بررسی ناموفق (HTTP",
      "Échec du test (HTTP",
      "Prüfung fehlgeschlagen (HTTP"
  ],
  "! 👋\\nЯ бот $": [
      "! 👋\\nI am bot $",
      "! 👋\\nSoy el bot $",
      "！👋\\n我是机器人 $",
      "! 👋\\nأنا البوت $",
      "! 👋\\nمن ربات $",
      " ! 👋\\nJe suis le bot $",
      "! 👋\\nIch bin Bot $"
  ],
  "уже присутствует в кэше ($": [
      "already present in cache ($",
      "ya está en caché ($",
      "已在缓存中 ($",
      "موجود بالفعل في ذاكرة التخزين المؤقت ($",
      "در کش موجود است ($",
      "déjà présent en cache ($",
      "bereits im Cache ($"
  ],
  "байт$": [
      "bytes$",
      "bytes$",
      "字节$",
      "بايت$",
      "بایت$",
      "octets$",
      "Bytes$"
  ],
  "0 ? ` из $": [
      "0 ? ` of $",
      "0 ? ` de $",
      "0 ? ` / $",
      "0 ? ` من $",
      "0 ? ` از $",
      "0 ? ` sur $",
      "0 ? ` von $"
  ],
  "(установлена v$": [
      "(installed v$",
      "(instalada v$",
      "（已安装 v$",
      "(مثبت v$",
      "(نصب شده v$",
      "(installée v$",
      "(installiert v$"
  ],
  "уже в состоянии $": [
      "already in state $",
      "ya en estado $",
      "已处于状态 $",
      "بالفعل في حالة $",
      "در وضعیت $",
      "déjà à l'état $",
      "bereits im Zustand $"
  ],
  ".db не найдена в IndexedDB, но в localStorage есть ключи шифрования. Сбрасываем ключи для пересоздания.`); localStorage.removeItem(`db_master_key_enc_$": [
      ".db not found in IndexedDB, resetting encryption keys.`); localStorage.removeItem(`db_master_key_enc_$",
      ".db no encontrada en IndexedDB, restableciendo claves.`); localStorage.removeItem(`db_master_key_enc_$",
      ".db 未在 IndexedDB 中找到，正在重置密钥。`); localStorage.removeItem(`db_master_key_enc_$",
      ".db غير موجود، إعادة ضبط المفاتيح.`); localStorage.removeItem(`db_master_key_enc_$",
      ".db در IndexedDB یافت نشد، بازنشانی کلیدها.`); localStorage.removeItem(`db_master_key_enc_$",
      ".db introuvable dans IndexedDB, réinitialisation des clés.`); localStorage.removeItem(`db_master_key_enc_$",
      ".db nicht in IndexedDB gefunden, Schlüssel werden zurückgesetzt.`); localStorage.removeItem(`db_master_key_enc_$"
  ],
  "чатов из БД.`); try": [
      "chats from DB.`); try",
      "chats de la BD.`); try",
      "个聊天。`); try",
      "محادثات من قاعدة البيانات.`); try",
      "چت از پایگاه داده.`); try",
      "chats depuis la BDD.`); try",
      "Chats aus der DB.`); try"
  ],
  "уже обработан ($": [
      "already processed ($",
      "ya procesado ($",
      "已处理 ($",
      "تمت معالجته بالفعل ($",
      "قبلاً پردازش شده ($",
      "déjà traité ($",
      "bereits verarbeitet ($"
  ],
  "транзитный (адресован $": [
      "transit (addressed to $",
      "en tránsito (dirigido a $",
      "中转（收件人 $",
      "عابر (موجه إلى $",
      "ترانزیت (به مقصد $",
      "en transit (adressé à $",
      "Transit (adressiert an $"
  ],
  "). Локальный узел ($": [
      "). Local node ($",
      "). Nodo local ($",
      ")。本地节点 ($",
      "). العقدة المحلية ($",
      "). نود محلی ($",
      "). Nœud local ($",
      "). Lokaler Knoten ($"
  ],
  "(Mesh Группа)` : `$": [
      "(Mesh Group)` : `$",
      "(Grupo Mesh)` : `$",
      "(Mesh 群组)` : `$",
      "(مجموعة Mesh)` : `$",
      "(گروه Mesh)` : `$",
      "(Groupe Mesh)` : `$",
      "(Mesh-Gruppe)` : `$"
  ],
  "0 ? `Загрузка: $": [
      "0 ? `Downloading: $",
      "0 ? `Descargando: $",
      "0 ? `下载中：$",
      "0 ? `جارٍ التنزيل: $",
      "0 ? `در حال دانلود: $",
      "0 ? `Téléchargement : $",
      "0 ? `Herunterladen: $"
  ],
  "МБ` : `Загрузка: $": [
      "MB` : `Downloading: $",
      "MB` : `Descargando: $",
      "MB` : `下载中：$",
      "ميجابايت` : `جارٍ التنزيل: $",
      "مگابایت` : `در حال دانلود: $",
      "Mo` : `Téléchargement : $",
      "MB` : `Herunterladen: $"
  ],
  "` : `Разблокировка для $": [
      "` : `Unlock for $",
      "` : `Desbloquear para $",
      "` : `解锁 $",
      "` : `فتح القفل لـ $",
      "` : `باز کردن قفل برای $",
      "` : `Déverrouiller pour $",
      "` : `Entsperren für $"
  ],
  "title=\"Фотография профиля\" onClose=": [
      "title=\"Profile Photo\" onClose=",
      "title=\"Foto de perfil\" onClose=",
      "title=\"个人资料照片\" onClose=",
      "title=\"صورة الملف الشخصي\" onClose=",
      "title=\"عکس پروفایل\" onClose=",
      "title=\"Photo de profil\" onClose=",
      "title=\"Profilbild\" onClose="
  ],
  "title=\"Фотография группы\" onClose=": [
      "title=\"Group Photo\" onClose=",
      "title=\"Foto del grupo\" onClose=",
      "title=\"群组照片\" onClose=",
      "title=\"صورة المجموعة\" onClose=",
      "title=\"عکس گروه\" onClose=",
      "title=\"Photo du groupe\" onClose=",
      "title=\"Gruppenbild\" onClose="
  ],
  "\"? Чаты при этом не удалятся.`))": [
      "\"? Chats inside will not be deleted.`))",
      "\"? Los chats no se eliminarán.`))",
      "\"？其中的聊天不会被删除。`))",
      "\"؟ لن يتم حذف المحادثات.`))",
      "\"؟ چت‌ها حذف نخواهند شد.`))",
      "\" ? Les discussions ne seront pas supprimées.`))",
      "\"? Die Chats darin werden nicht gelöscht.`))"
  ],
  "} подписчиков',": [
      "} subscribers',",
      "} suscriptores',",
      "} 位订阅者',",
      "} مشتركين',",
      "} مشترک',",
      "} abonnés',",
      "} Abonnenten',"
  ],
  "} сек.',": [
      "} sec',",
      "} seg.',",
      "} 秒',",
      "} ثانية',",
      "} ثانیه',",
      "} sec.',",
      "} Sek.',"
  ],
  "байт (было $": [
      "bytes (was $",
      "bytes (antes $",
      "字节（原为 $",
      "بايت (كان $",
      "بایت (قبلاً $",
      "octets (était $",
      "Bytes (vorher $"
  ],
  "удален`, time: new Date().toLocaleTimeString([],": [
      "removed`, time: new Date().toLocaleTimeString([],",
      "eliminado`, time: new Date().toLocaleTimeString([],",
      "已移除`, time: new Date().toLocaleTimeString([],",
      "تمت إزالته`, time: new Date().toLocaleTimeString([],",
      "حذف شد`, time: new Date().toLocaleTimeString([],",
      "supprimé`, time: new Date().toLocaleTimeString([],",
      "entfernt`, time: new Date().toLocaleTimeString([],"
  ],
  ", не отправлено $": [
      ", failed $",
      ", no enviados $",
      "，发送失败 $",
      "، لم يُرسل $",
      "، ارسال نشد $",
      ", non envoyé $",
      ", fehlgeschlagen $"
  ],
  "— сохраняем пересылку в оффлайн-очередь (Fail-Closed §12.5)`); try": [
      "— saving forward to offline outbox (Fail-Closed §12.5)`); try",
      "— guardando reenvío en cola offline (Fail-Closed §12.5)`); try",
      "— 正在将转发存入离线队列 (Fail-Closed §12.5)`); try",
      "— حفظ إعادة التوجيه في قائمة الانتظار (Fail-Closed §12.5)`); try",
      "— ذخیره هدایت پیام در صف آفلاین (Fail-Closed §12.5)`); try",
      "— enregistrement du transfert en file hors ligne (Fail-Closed §12.5)`); try",
      "— Weiterleitung in Offline-Warteschlange gespeichert (Fail-Closed §12.5)`); try"
  ],
  "ч $": [
      "h $",
      "h $",
      "小时 $",
      "س $",
      "ساعت $",
      "h $",
      "Std. $"
  ],
  "д $": [
      "d $",
      "d $",
      "天 $",
      "ي $",
      "روز $",
      "j $",
      "T. $"
  ],
  "[...prev, t('landing:pricing.zkLog13', 'Передача оригинального токена T и подписи S для активации подписки...')]); try": [
      "[...prev, t('landing:pricing.zkLog13', 'Transmitting original token T and signature S to activate subscription...')]); try",
      "[...prev, t('landing:pricing.zkLog13', 'Transmitiendo token T y firma S para activar la suscripción...')]); try",
      "[...prev, t('landing:pricing.zkLog13', '正在传输原始令牌 T 与签名 S 以激活订阅...')]); try",
      "[...prev, t('landing:pricing.zkLog13', 'إرسال الرمز T والتوقيع S لتفعيل الاشتراك...')]); try",
      "[...prev, t('landing:pricing.zkLog13', 'ارسال توکن T و امضای S برای فعال‌سازی اشتراک...')]); try",
      "[...prev, t('landing:pricing.zkLog13', 'Transmission du jeton T et de la signature S pour activer l\\'abonnement...')]); try",
      "[...prev, t('landing:pricing.zkLog13', 'Übertragung von Token T und Signatur S zur Abo-Aktivierung...')]); try"
  ],
  "} офлайн-конвертов',": [
      "} offline envelopes',",
      "} sobres offline',",
      "} 个离线信封',",
      "} أظرف غير متصلة',",
      "} پاکت آفلاین',",
      "} enveloppes hors ligne',",
      "} Offline-Umschläge',"
  ],
  ") ); onShowToast(t('shield.toast_ping_sent', 'Тестовый пакет отправлен узлу": [
      ") ); onShowToast(t('shield.toast_ping_sent', 'Test packet sent to node",
      ") ); onShowToast(t('shield.toast_ping_sent', 'Paquete de prueba enviado al nodo",
      ") ); onShowToast(t('shield.toast_ping_sent', '测试数据包已发送至节点",
      ") ); onShowToast(t('shield.toast_ping_sent', 'تم إرسال حزمة اختبار إلى العقدة",
      ") ); onShowToast(t('shield.toast_ping_sent', 'بسته تست به نود ارسال شد",
      ") ); onShowToast(t('shield.toast_ping_sent', 'Paquet de test envoyé au nœud",
      ") ); onShowToast(t('shield.toast_ping_sent', 'Testpaket an Knoten gesendet"
  ],
  "} м,": [
      "} m,",
      "} m,",
      "} 米,",
      "} م،",
      "} متر،",
      "} m,",
      "} m,"
  ],
  "0 ? t('shield.air_peers_count', 'В эфире:": [
      "0 ? t('shield.air_peers_count', 'On air:",
      "0 ? t('shield.air_peers_count', 'En el aire:",
      "0 ? t('shield.air_peers_count', '无线电在线:",
      "0 ? t('shield.air_peers_count', 'على الهواء:",
      "0 ? t('shield.air_peers_count', 'در رادیو:",
      "0 ? t('shield.air_peers_count', 'Sur les ondes :",
      "0 ? t('shield.air_peers_count', 'Auf Sendung:"
  ],
  "} узлов',": [
      "} nodes',",
      "} nodos',",
      "} 个节点',",
      "} عقد',",
      "} نود',",
      "} nœuds',",
      "} Knoten',"
  ],
  "} м •": [
      "} m •",
      "} m •",
      "} 米 •",
      "} م •",
      "} متر •",
      "} m •",
      "} m •"
  ],
  "} пак. • Ретранслировано:": [
      "} pkts • Relayed:",
      "} paq. • Retransmitido:",
      "} 包 • 已中继:",
      "} حزم • أُعيد بثها:",
      "} بسته • بازپخش شده:",
      "} paq. • Relayés :",
      "} Pak. • Weitergeleitet:"
  ],
  "} пиров',": [
      "} peers',",
      "} pares',",
      "} 个节点',",
      "} أقران',",
      "} همتا',",
      "} pairs',",
      "} Peers',"
  ],
  "} узлов (Ext)',": [
      "} nodes (Ext)',",
      "} nodos (Ext)',",
      "} 个节点 (Ext)',",
      "} عقد (Ext)',",
      "} نود (Ext)',",
      "} nœuds (Ext)',",
      "} Knoten (Ext)',"
  ],
  "0 ? `⏱️ Автосброс при неактивности установлен на $": [
      "0 ? `⏱️ Inactivity auto-wipe set to $",
      "0 ? `⏱️ Autoborrado por inactividad fijado en $",
      "0 ? `⏱️ 闲置自动销毁已设为 $",
      "0 ? `⏱️ تم ضبط المسح التلقائي عند عدم النشاط على $",
      "0 ? `⏱️ پاکسازی خودکار در صورت عدم فعالیت تنظیم شد روی $",
      "0 ? `⏱️ Effacement auto en cas d'inactivité défini sur $",
      "0 ? `⏱️ Auto-Löschung bei Inaktivität gesetzt auf $"
  ],
  "onSelectVoicePreset(preset.id); onToast?.(`Выбран тембр голоса: $": [
      "onSelectVoicePreset(preset.id); onToast?.(`Selected voice preset: $",
      "onSelectVoicePreset(preset.id); onToast?.(`Timbre de voz seleccionado: $",
      "onSelectVoicePreset(preset.id); onToast?.(`已选择变声音色：$",
      "onSelectVoicePreset(preset.id); onToast?.(`تم اختيار نبرة الصوت: $",
      "onSelectVoicePreset(preset.id); onToast?.(`پریست صدای انتخاب شده: $",
      "onSelectVoicePreset(preset.id); onToast?.(`Timbre vocal sélectionné : $",
      "onSelectVoicePreset(preset.id); onToast?.(`Stimmprofil ausgewählt: $"
  ],
  "} км)',": [
      "} km)',",
      "} km)',",
      "} 公里)',",
      "} كم)',",
      "} کیلومتر)',",
      "} km)',",
      "} km)',"
  ],
  "); setSendSuccess(`Успешно отправлено $": [
      "); setSendSuccess(`Successfully sent $",
      "); setSendSuccess(`Enviado con éxito $",
      "); setSendSuccess(`已成功发送 $",
      "); setSendSuccess(`تم الإرسال بنجاح $",
      "); setSendSuccess(`با موفقیت ارسال شد $",
      "); setSendSuccess(`Envoyé avec succès $",
      "); setSendSuccess(`Erfolgreich gesendet $"
  ],
  "сбой шифрования": [
      "encryption error",
      "fallo de cifrado",
      "加密故障",
      "فشل التشفير",
      "خطای رمزنگاری",
      "échec de chiffrement",
      "Verschlüsselungsfehler"
  ],
  "сбой стека": [
      "stack error",
      "fallo de pila",
      "协议栈故障",
      "عطل المكدس",
      "خطای پشته",
      "erreur de pile",
      "Stack-Fehler"
  ],
  "не Uint8Array": [
      "not Uint8Array",
      "no es Uint8Array",
      "非 Uint8Array",
      "ليس Uint8Array",
      "غیر Uint8Array",
      "non Uint8Array",
      "kein Uint8Array"
  ],
  "Сбросить данные": [
      "Reset Data",
      "Restablecer datos",
      "重置数据",
      "إعادة ضبط البيانات",
      "بازنشانی داده‌ها",
      "Réinitialiser les données",
      "Daten zurücksetzen"
  ],
  "Gossip v2.2.32: Полная локализация всех разделов приложения, настроек, сетевого центра, кошелька, Pulse и лендинга на 8 языков (RU, EN, ES, ZH, AR, FA, FR, DE).": [
      "Gossip v2.2.32: Complete localization of all application sections, Settings, Network Center, Wallet, Pulse, and Landing across all 8 languages (RU, EN, ES, ZH, AR, FA, FR, DE).",
      "Gossip v2.2.32: Localización completa de todas las secciones de la app, Ajustes, Centro de Red, Billetera, Pulse y Landing en los 8 idiomas (RU, EN, ES, ZH, AR, FA, FR, DE).",
      "Gossip v2.2.32：应用所有板块、设置、网络中心、钱包、Pulse 及着陆页已完成全部 8 种语言（俄、英、西、中、阿、波、法、德）的深度本地化。",
      "Gossip v2.2.32: تعريب وترجمة شاملة لجميع أقسام التطبيق، الإعدادات، مركز الشبكة، المحفظة، Pulse والصفحة الرئيسية بجميع اللغات الـ 8.",
      "Gossip v2.2.32: بومی‌سازی کامل تمامی بخش‌های برنامه، تنظیمات، مرکز شبکه، کیف پول، پالس و صفحه فرود به هر ۸ زبان.",
      "Gossip v2.2.32 : Localisation complète de toutes les sections de l’application, Paramètres, Centre Réseau, Portefeuille, Pulse et page d’accueil dans les 8 langues.",
      "Gossip v2.2.32: Vollständige Lokalisierung aller Anwendungsbereiche, Einstellungen, Netzwerkzentrum, Wallet, Pulse und Landingpage in allen 8 Sprachen."
  ],
  "Gossip v2.2.31: Презентабельный дизайн лендинга без визуального шума, полная локализация всех разделов на 8 языков, актуальный статус релиза и прямая связь с создателем @up1t3r.": [
      "Gossip v2.2.31: Refined landing design without visual clutter, full localization across 8 languages, live release status, and direct contact with creator @up1t3r.",
      "Gossip v2.2.31: Diseño de portada refinado sin ruido visual, localización completa en 8 idiomas, estado de versión en vivo y contacto directo con el creador @up1t3r.",
      "Gossip v2.2.31：无视觉干扰的精致着陆页设计、全 8 种语言完整本地化、实时版本状态以及与创建者 @up1t3r 的直接联系。",
      "Gossip v2.2.31: تصميم واجهة احترافي بدون ضوضاء بصرية، ترجمة كاملة إلى 8 لغات، حالة الإصدار المباشرة وتواصل مباشر مع المؤسس @up1t3r.",
      "Gossip v2.2.31: طراحی حرفه‌ای صفحه فرود بدون شلوغی بصری، بومی‌سازی کامل به ۸ زبان، وضعیت زنده نسخه و ارتباط مستقیم با سازنده @up1t3r.",
      "Gossip v2.2.31 : Design épuré sans bruit visuel, localisation complète en 8 langues, statut de version en direct et contact direct avec le créateur @up1t3r.",
      "Gossip v2.2.31: Präsentables Landingpage-Design ohne visuelles Rauschen, vollständige Lokalisierung in 8 Sprachen, Live-Release-Status und direkter Kontakt zum Entwickler @up1t3r."
  ],
  "Скрыть сервер": [
      "Hide Server",
      "Ocultar servidor",
      "隐藏服务器",
      "إخفاء الخادم",
      "پنهان کردن سرور",
      "Masquer le serveur",
      "Server ausblenden"
  ],
  "Скрыть настройки сервера": [
      "Hide Server Settings",
      "Ocultar ajustes del servidor",
      "隐藏服务器设置",
      "إخفاء إعدادات الخادم",
      "پنهان کردن تنظیمات سرور",
      "Masquer les paramètres du serveur",
      "Servereinstellungen ausblenden"
  ],
  "Загрузка на сервер...": [
      "Uploading to server...",
      "Subiendo al servidor...",
      "正在上传至服务器...",
      "جارٍ الرفع إلى الخادم...",
      "در حال بارگذاری روی سرور...",
      "Téléversement vers le serveur...",
      "Wird auf den Server hochgeladen..."
  ],
  "Кастомный шлюз": [
      "Custom Gateway",
      "Pasarela personalizada",
      "自定义网关",
      "بوابة مخصصة",
      "درگاه سفارشی",
      "Passerelle personnalisée",
      "Benutzerdefiniertes Gateway"
  ],
  "Мой кастомный шлюз": [
      "My Custom Gateway",
      "Mi pasarela personalizada",
      "我的自定义网关",
      "بوابتي المخصصة",
      "درگاه سفارشی من",
      "Ma passerelle personnalisée",
      "Mein eigenes Gateway"
  ],
  "Пользовательский узел": [
      "Custom Node",
      "Nodo personalizado",
      "自定义节点",
      "عقدة مخصصة",
      "گره سفارشی",
      "Nœud personnalisé",
      "Benutzerdefinierter Knoten"
  ],
  "Скрыть ▲": [
      "Hide ▲",
      "Ocultar ▲",
      "收起 ▲",
      "إخفاء ▲",
      "پنهان ▲",
      "Masquer ▲",
      "Ausblenden ▲"
  ],
  "Открыть ▼": [
      "Open ▼",
      "Abrir ▼",
      "展开 ▼",
      "فتح ▼",
      "باز کردن ▼",
      "Ouvrir ▼",
      "Öffnen ▼"
  ],
  "Официальный узел (skuf-net.ru)": [
      "Official Node (skuf-net.ru)",
      "Nodo oficial (skuf-net.ru)",
      "官方节点 (skuf-net.ru)",
      "العقدة الرسمية (skuf-net.ru)",
      "گره رسمی (skuf-net.ru)",
      "Nœud officiel (skuf-net.ru)",
      "Offizieller Knoten (skuf-net.ru)"
  ],
  "Основной высокоскоростной сервер с TLS 1.3 и E2EE": [
      "Primary high-speed server with TLS 1.3 and E2EE",
      "Servidor principal de alta velocidad con TLS 1.3 y E2EE",
      "支持 TLS 1.3 与端到端加密的主高速服务器",
      "الخادم الرئيسي عالي السرعة مع TLS 1.3 وتشفير E2EE",
      "سرور اصلی پرسرعت با TLS 1.3 و رمزنگاری سرتاسری",
      "Serveur principal haute vitesse avec TLS 1.3 et E2EE",
      "Primärer Hochgeschwindigkeitsserver mit TLS 1.3 und E2EE"
  ],
  "Fake-TLS Щит (Анти-ТСПУ)": [
      "Fake-TLS Shield (Anti-DPI)",
      "Escudo Fake-TLS (Anti-DPI)",
      "Fake-TLS 护盾（反 DPI）",
      "درع Fake-TLS (مضاد فحص الحزم)",
      "سپر Fake-TLS (ضد فیلترینگ DPI)",
      "Bouclier Fake-TLS (Anti-DPI)",
      "Fake-TLS-Schild (Anti-DPI)"
  ],
  "Маскировка трафика под шум 0xee для обхода блокировок DPI": [
      "Traffic obfuscation (0xee noise padding) to bypass DPI censorship",
      "Ofuscación de tráfico (ruido 0xee) para eludir bloqueos DPI",
      "将流量伪装为 0xee 随机噪声以绕过 DPI 封锁",
      "تمويه حركة المرور كضوضاء 0xee لتجاوز حظر DPI",
      "ماسک کردن ترافیک با نویز 0xee برای عبور از فیلترینگ DPI",
      "Masquage du trafic sous bruit 0xee pour contourner le DPI",
      "Traffic-Verschleierung (0xee-Rauschen) zur Umgehung von DPI-Sperren"
  ],
  "Резервный шлюз №1 (Envoy Direct TLS)": [
      "Backup Gateway #1 (Envoy Direct TLS)",
      "Pasarela de respaldo #1 (Envoy Direct TLS)",
      "备用网关 #1 (Envoy Direct TLS)",
      "بوابة الاحتياط 1 (Envoy Direct TLS)",
      "درگاه پشتیبان ۱ (Envoy Direct TLS)",
      "Passerelle de secours n°1 (Envoy Direct TLS)",
      "Backup-Gateway Nr. 1 (Envoy Direct TLS)"
  ],
  "Прямой защищенный TLS-шлюз в обход основного балансировщика": [
      "Direct secure TLS gateway bypassing the main load balancer",
      "Pasarela TLS directa que evita el balanceador principal",
      "绕过主负载均衡器的直连安全 TLS 网关",
      "بوابة TLS آمنة ومباشرة تتجاوز موزع الحمل الرئيسي",
      "درگاه امن و مستقیم TLS بدون عبور از لودبالانسر اصلی",
      "Passerelle TLS directe sécurisée contournant l'équilibreur principal",
      "Direktes sicheres TLS-Gateway unter Umgehung des Haupt-Loadbalancers"
  ],
  "Пользовательский шлюз или локальный сервер": [
      "Custom gateway or local server",
      "Pasarela personalizada o servidor local",
      "自定义网关或本地服务器",
      "بوابة مخصصة أو خادم محلي",
      "درگاه سفارشی یا سرور محلی",
      "Passerelle personnalisée ou serveur local",
      "Benutzerdefiniertes Gateway oder lokaler Server"
  ],
  "Импортированный шлюз": [
      "Imported Gateway",
      "Pasarela importada",
      "已导入的网关",
      "بوابة مستوردة",
      "درگاه واردشده",
      "Passerelle importée",
      "Importiertes Gateway"
  ],
  "ОК": [
      "OK",
      "OK",
      "正常",
      "موافق",
      "تایید",
      "OK",
      "OK"
  ],
  "узел": [
      "node",
      "nodo",
      "个节点",
      "عقدة",
      "گره",
      "nœud",
      "Knoten"
  ],
  "узла": [
      "nodes",
      "nodos",
      "个节点",
      "عقد",
      "گره",
      "nœuds",
      "Knoten"
  ],
  "узлов": [
      "nodes",
      "nodos",
      "个节点",
      "عقد",
      "گره",
      "nœuds",
      "Knoten"
  ],
  "Поиск пиров...": [
      "Scanning for peers...",
      "Buscando pares...",
      "正在搜索节点...",
      "جارٍ البحث عن أقران...",
      "در حال جستجوی همتاها...",
      "Recherche de pairs...",
      "Suche nach Peers..."
  ],
  "Поиск пиров Mesh...": [
      "Scanning for Mesh peers...",
      "Buscando pares Mesh...",
      "正在搜索 Mesh 节点...",
      "جارٍ البحث عن أقران Mesh...",
      "در حال جستجوی همتاهای Mesh...",
      "Recherche de pairs Mesh...",
      "Suche nach Mesh-Peers..."
  ],
  "Офлайн": [
      "Offline",
      "Sin conexión",
      "离线",
      "غير متصل",
      "آفلاین",
      "Hors ligne",
      "Offline"
  ],
  "Офлайн (нет сети)": [
      "Offline (no network)",
      "Sin conexión (sin red)",
      "离线（无网络）",
      "غير متصل (لا توجد شبكة)",
      "آفلاین (بدون شبکه)",
      "Hors ligne (aucun réseau)",
      "Offline (kein Netz)"
  ],
  "📖 ПРИМЕР": [
      "📖 EXAMPLE",
      "📖 EJEMPLO",
      "📖 示例",
      "📖 مثال",
      "📖 نمونه",
      "📖 EXEMPLE",
      "📖 BEISPIEL"
  ],
  "✨ Создать по образцу": [
      "✨ Use as Template",
      "✨ Usar como plantilla",
      "✨ 按此模板创建",
      "✨ إنشاء من هذا النموذج",
      "✨ ایجاد از روی این الگو",
      "✨ Utiliser ce modèle",
      "✨ Als Vorlage nutzen"
  ],
  "Витрина примеров (Образцы сценариев Pulse & P2P)": [
      "Example Showcase (Pulse & P2P Sample Scenarios)",
      "Escaparate de ejemplos (Plantillas Pulse y P2P)",
      "示例展厅（Pulse 与 P2P 场景模板）",
      "معرض الأمثلة (نماذج سيناريوهات Pulse و P2P)",
      "ویترین نمونه‌ها (الگوهای سناریو پالس و P2P)",
      "Vitrine d'exemples (Modèles Pulse & P2P)",
      "Beispiel-Showcase (Pulse- & P2P-Musterszenarien)"
  ],
  "Ниже показаны демонстрационные шаблоны, чтобы вы могли оценить формат карточек. Они не являются реальными сделками. Нажмите «Создать по образцу», чтобы заполнить свою заявку.": [
      "Below are sample templates illustrating the card format. They are not live listings. Tap 'Use as Template' to prefill your own intent.",
      "A continuación se muestran plantillas de demostración para evaluar el formato. No son ofertas reales. Toque «Usar como plantilla» para crear su solicitud.",
      "以下为演示模板，供您了解卡片格式，并非真实交易。点击“按此模板创建”即可快速填写您的意向。",
      "فيما يلي قوالب توضيحية لمعاينة تنسيق البطاقات وليست صفقات حقيقية. اضغط على «إنشاء من هذا النموذج» لتعبئة طلبك.",
      "در ادامه الگوهای نمایشی برای آشنایی با فرمت کارت‌ها آورده شده است. این‌ها معاملات واقعی نیستند. برای ثبت درخواست خود روی «ایجاد از روی این الگو» بزنید.",
      "Voici des modèles de démonstration illustrant le format des cartes. Ce ne sont pas des offres réelles. Appuyez sur « Utiliser ce modèle » pour préremplir votre demande.",
      "Unten sehen Sie Beispielvorlagen zur Veranschaulichung des Kartenformats. Es handelt sich nicht um echte Angebote. Tippen Sie auf „Als Vorlage nutzen“, um Ihr eigenes Gesuch auszufüllen."
  ],
  "Вернуться к реальным заявкам": [
      "Back to Live Listings",
      "Volver a ofertas reales",
      "返回真实列表",
      "العودة إلى العروض الحقيقية",
      "بازگشت به درخواست‌های واقعی",
      "Retour aux offres réelles",
      "Zurück zu echten Angeboten"
  ],
  "Создать намерение": [
      "Create Intent",
      "Crear intención",
      "创建意向",
      "إنشاء نية",
      "ایجاد قصد معامله",
      "Créer une intention",
      "Vorhaben erstellen"
  ],
  "Посмотреть примеры сделок": [
      "View Example Deals",
      "Ver ejemplos de ofertas",
      "查看交易示例",
      "عرض أمثلة الصفقات",
      "مشاهده نمونه‌های معامله",
      "Voir des exemples d'offres",
      "Beispielangebote ansehen"
  ],
  "Образец шаблона": [
      "Template Sample",
      "Muestra de plantilla",
      "模板示例",
      "نموذج القالب",
      "نمونه الگو",
      "Exemple de modèle",
      "Vorlagenmuster"
  ],
  "Пример локации (H3)": [
      "Sample Location (H3)",
      "Ubicación de ejemplo (H3)",
      "示例位置 (H3)",
      "موقع نموذجي (H3)",
      "مکان نمونه (H3)",
      "Lieu d'exemple (H3)",
      "Beispielstandort (H3)"
  ],
  "Посмотреть примеры оформления сделок и намерений": [
      "View sample deal & intent templates",
      "Ver ejemplos de formato de ofertas e intenciones",
      "查看交易与意向模板示例",
      "عرض نماذج تنسيق الصفقات والنوايا",
      "مشاهده نمونه‌های قالب‌بندی معاملات و درخواست‌ها",
      "Voir des exemples de présentation d'offres et d'intentions",
      "Beispiele für Angebote und Vorhaben ansehen"
  ],
  "Скрыть примеры": [
      "Hide Examples",
      "Ocultar ejemplos",
      "隐藏示例",
      "إخفاء الأمثلة",
      "پنهان کردن نمونه‌ها",
      "Masquer les exemples",
      "Beispiele ausblenden"
  ],
  "Примеры": [
      "Examples",
      "Ejemplos",
      "示例",
      "أمثلة",
      "نمونه‌ها",
      "Exemples",
      "Beispiele"
  ],
  "В выбранном радиусе H3 гео-радара активных заявок не обнаружено": [
      "No active listings found within the selected H3 geo-radar radius",
      "No se encontraron ofertas activas en el radio H3 seleccionado",
      "所选 H3 地理雷达半径内未发现活跃意向",
      "لم يتم العثور على عروض نشطة ضمن نطاق رادار H3 المحدد",
      "هیچ درخواست فعالی در شعاع رادار مکانی H3 انتخاب‌شده یافت نشد",
      "Aucune offre active trouvée dans le rayon H3 sélectionné",
      "Keine aktiven Angebote im gewählten H3-Geo-Radar-Radius gefunden"
  ],
  "Активных заявок от пользователей в этой категории пока нет": [
      "No active user listings in this category yet",
      "Aún no hay ofertas activas de usuarios en esta categoría",
      "此类别下暂无用户发布的活跃意向",
      "لا توجد عروض نشطة من المستخدمين في هذه الفئة حتى الآن",
      "هنوز درخواست فعالی از سوی کاربران در این دسته‌بندی ثبت نشده است",
      "Aucune offre active d'utilisateur dans cette catégorie pour le moment",
      "Noch keine aktiven Nutzerangebote in dieser Kategorie"
  ],
  "Попробуйте увеличить радиус радара или отключить гео-фильтр.": [
      "Try increasing the radar radius or disabling the geo-filter.",
      "Intente ampliar el radio del radar o desactivar el filtro geográfico.",
      "请尝试扩大雷达半径或关闭地理过滤。",
      "جرّب زيادة نصف قطر الرادار أو إيقاف فلتر الموقع.",
      "شعاع رادار را افزایش دهید یا فیلتر مکانی را غیرفعال کنید.",
      "Essayez d'augmenter le rayon du radar ou de désactiver le filtre géographique.",
      "Versuchen Sie, den Radar-Radius zu vergrößern oder den Geo-Filter zu deaktivieren."
  ],
  "В основной ленте отображаются только реальные верифицированные сделки без фейковых заглушек.": [
      "The main feed displays only real verified listings with zero fake placeholders.",
      "El feed principal muestra solo ofertas reales verificadas sin rellenos falsos.",
      "主信息流仅显示经过验证的真实交易，绝无虚假占位数据。",
      "يعرض الموجز الرئيسي الصفقات الحقيقية الموثقة فقط بدون أي بيانات وهمية.",
      "در فید اصلی فقط معاملات واقعی و تاییدشده بدون هیچ داده نمایشی نشان داده می‌شود.",
      "Le flux principal n'affiche que des offres réelles vérifiées, sans données fictives.",
      "Im Haupt-Feed werden ausschließlich echte, verifizierte Angebote ohne Platzhalter angezeigt."
  ],
  "Подтверждение баланса (ZKP)": [
      "Proof of Balance (ZKP)",
      "Prueba de saldo (ZKP)",
      "余额零知识证明 (ZKP)",
      "إثبات الرصيد (ZKP)",
      "اثبات موجودی (ZKP)",
      "Preuve de solde (ZKP)",
      "Saldennachweis (ZKP)"
  ],
  "Смарт-Эскроу TON": [
      "TON Smart Escrow",
      "Smart Escrow TON",
      "TON 智能托管",
      "الضمان الذكي TON",
      "اسکرو هوشمند TON",
      "Smart Escrow TON",
      "TON Smart-Escrow"
  ],
  "Гео-поиск рядом": [
      "Nearby Geo-Radar",
      "Búsqueda geográfica cercana",
      "附近地理雷达",
      "البحث الجغرافي القريب",
      "جستجوی مکانی اطراف",
      "Géo-radar à proximité",
      "Geo-Suche in der Nähe"
  ],
  "Аттестат": [
      "Certificate",
      "Certificado",
      "资质证书",
      "شهادة الاعتماد",
      "گواهی اعتبار",
      "Certificat",
      "Zertifikat"
  ],
  "📖 ПРИМЕР / ОБРАЗЕЦ": [
      "📖 SAMPLE TEMPLATE",
      "📖 EJEMPLO / PLANTILLA",
      "📖 示例 / 模板",
      "📖 مثال / نموذج",
      "📖 نمونه / الگو",
      "📖 EXEMPLE / MODÈLE",
      "📖 BEISPIEL / MUSTER"
  ],
  "✨ Заполнить по этому образцу": [
      "✨ Prefill from Sample",
      "✨ Rellenar con este ejemplo",
      "✨ 按此示例填充",
      "✨ تعبئة من هذا النموذج",
      "✨ پر کردن از روی این نمونه",
      "✨ Préremplir avec cet exemple",
      "✨ Mit diesem Muster ausfüllen"
  ],
  "Посмотреть пример контракта": [
      "View Sample Contract",
      "Ver contrato de ejemplo",
      "查看示例合约",
      "عرض نموذج العقد",
      "مشاهده نمونه قرارداد",
      "Voir un exemple de contrat",
      "Beispielvertrag ansehen"
  ],
  "Поставка зерна: Новороссийск -> Бандар-Аббас (Образец)": [
      "Grain Shipment: Novorossiysk -> Bandar Abbas (Sample)",
      "Envío de grano: Novorossiysk -> Bandar Abbas (Ejemplo)",
      "粮食海运：新罗西斯克 -> 阿巴斯港（示例）",
      "شحنة حبوب: نوفوروسيسك -> بندر عباس (نموذج)",
      "ارسال غلات: نووراسییسک -> بندرعباس (نمونه)",
      "Livraison de céréales : Novorossiïsk -> Bandar Abbas (Exemple)",
      "Getreidelieferung: Noworossijsk -> Bandar Abbas (Beispiel)"
  ],
  "Ячмень фуражный (2000 тонн)": [
      "Feed Barley (2,000 tons)",
      "Cebada forrajera (2000 toneladas)",
      "饲料大麦（2000 吨）",
      "شعير علفي (2000 طن)",
      "جو دامی (۲۰۰۰ تن)",
      "Orge fourragère (2 000 tonnes)",
      "Futtergerste (2.000 Tonnen)"
  ],
  "Ячмень фуражный, 2000 тонн": [
      "Feed Barley, 2,000 tons",
      "Cebada forrajera, 2000 toneladas",
      "饲料大麦，2000 吨",
      "شعير علفي، 2000 طن",
      "جو دامی، ۲۰۰۰ تن",
      "Orge fourragère, 2 000 tonnes",
      "Futtergerste, 2.000 Tonnen"
  ],
  "1. Депозит заблокирован в TON DvP": [
      "1. Deposit Locked in TON DvP",
      "1. Depósito bloqueado en TON DvP",
      "1. 资金已锁定于 TON DvP 合约",
      "1. تم قفل الإيداع في عقد TON DvP",
      "۱. سپرده در قرارداد TON DvP قفل شد",
      "1. Dépôt verrouillé dans TON DvP",
      "1. Einlage in TON DvP gesperrt"
  ],
  "Средства покупателя и залоги сторон депонированы в смарт-контракте.": [
      "Buyer funds and party collaterals are escrowed in the smart contract.",
      "Los fondos del comprador y las garantías están depositados en el contrato inteligente.",
      "买方资金与双方保证金已托管在智能合约中。",
      "تم إيداع أموال المشتري وضمانات الطرفين في العقد الذكي.",
      "وجوه خریدار و وثایق طرفین در قرارداد هوشمند سپرده‌گذاری شده است.",
      "Les fonds de l'acheteur et les cautions sont déposés dans le contrat intelligent.",
      "Käufergelder und Sicherheiten beider Parteien sind im Smart Contract hinterlegt."
  ],
  "2. Инспекция SGS и погрузка на судно": [
      "2. SGS Inspection & Vessel Loading",
      "2. Inspección SGS y carga en buque",
      "2. SGS 检验与装船",
      "2. فحص SGS والتحميل على السفينة",
      "۲. بازرسی SGS و بارگیری روی کشتی",
      "2. Inspection SGS et chargement à bord",
      "2. SGS-Inspektion & Schiffsverladung"
  ],
  "Оракул проверяет сертификат качества SGS #RU-9821-SGS.": [
      "Oracle verifies SGS quality certificate #RU-9821-SGS.",
      "El oráculo verifica el certificado de calidad SGS #RU-9821-SGS.",
      "预言机验证 SGS 质量证书 #RU-9821-SGS。",
      "يتحقق الأوراكل من شهادة الجودة SGS #RU-9821-SGS.",
      "اوراکل گواهی کیفیت SGS شماره #RU-9821-SGS را بررسی می‌کند.",
      "L'oracle vérifie le certificat de qualité SGS #RU-9821-SGS.",
      "Das Orakel prüft das SGS-Qualitätszertifikat #RU-9821-SGS."
  ],
  "3. Транзит через море (AIS SOLAS)": [
      "3. Maritime Transit (AIS SOLAS)",
      "3. Tránsito marítimo (AIS SOLAS)",
      "3. 海运在途追踪 (AIS SOLAS)",
      "3. العبور البحري (AIS SOLAS)",
      "۳. ترانزیت دریایی (AIS SOLAS)",
      "3. Transit maritime (AIS SOLAS)",
      "3. Seetransit (AIS SOLAS)"
  ],
  "Спутниковый трекинг судна до порта назначения.": [
      "Satellite vessel tracking to the destination port.",
      "Seguimiento satelital del buque hasta el puerto de destino.",
      "卫星实时追踪船只直至目的港。",
      "تتبع السفينة عبر الأقمار الصناعية حتى ميناء الوصول.",
      "ردیابی ماهواره‌ای کشتی تا بندر مقصد.",
      "Suivi satellite du navire jusqu'au port de destination.",
      "Satelliten-Tracking des Schiffes bis zum Zielhafen."
  ],
  "4. Финальный релиз средств продавцу": [
      "4. Final Funds Release to Seller",
      "4. Liberación final de fondos al vendedor",
      "4. 向卖方最终释放资金",
      "4. التحرير النهائي للأموال للبائع",
      "۴. آزادسازی نهایی وجوه برای فروشنده",
      "4. Déblocage final des fonds au vendeur",
      "4. Endgültige Freigabe der Mittel an den Verkäufer"
  ],
  "Приемка груза и автоматическая выплата.": [
      "Cargo acceptance and automated smart-contract payout.",
      "Aceptación de carga y pago automático.",
      "货物验收并自动执行结算付款。",
      "استلام الشحنة والدفع التلقائي.",
      "تحویل بار و پرداخت خودکار.",
      "Réception de la cargaison et paiement automatique.",
      "Frachtabnahme und automatische Auszahlung."
  ],
  "Скрыть пример": [
      "Hide Sample",
      "Ocultar ejemplo",
      "隐藏示例",
      "إخفاء النموذج",
      "پنهان کردن نمونه",
      "Masquer l'exemple",
      "Beispiel ausblenden"
  ],
  "Пример контракта": [
      "Sample Contract",
      "Contrato de ejemplo",
      "示例合约",
      "نموذج عقد",
      "نمونه قرارداد",
      "Exemple de contrat",
      "Beispielvertrag"
  ],
  "Укажите причину блокировки (необязательно):": [
      "Specify ban reason (optional):",
      "Especifique el motivo del bloqueo (opcional):",
      "输入封禁原因（可选）：",
      "حدد سبب الحظر (اختياري):",
      "دلیل مسدودسازی را وارد کنید (اختیاری):",
      "Indiquez la raison du blocage (optionnel) :",
      "Sperrgrund angeben (optional):"
  ],
  "Нарушение правил": [
      "Terms of Service violation",
      "Incumplimiento de las normas",
      "违反服务条款",
      "مخالفة القواعد",
      "نقض قوانین",
      "Violation des règles",
      "Regelverstoß"
  ],
  "Принудительно завершить все активные сессии пользователя?": [
      "Force terminate all active sessions for this user?",
      "¿Cerrar forzosamente todas las сессии activas del usuario?",
      "是否强制终止该用户的所有活跃会话？",
      "هل تريد إنهاء جميع الجلسات النشطة للمستخدم قسرياً؟",
      "آیا تمام نشست‌های فعال کاربر به صورت اجباری بسته شوند؟",
      "Fermer de force toutes les sessions actives de l'utilisateur ?",
      "Alle aktiven Sitzungen dieses Benutzers zwangsweise beenden?"
  ],
  "Все сессии пользователя сброшены": [
      "All user sessions have been terminated",
      "Todas las sesiones del usuario fueron cerradas",
      "已重置该用户的所有会话",
      "تم إنهاء جميع جلسات المستخدم",
      "تمام نشست‌های کاربر بازنشانی شد",
      "Toutes les sessions de l'utilisateur ont été réinitialisées",
      "Alle Benutzersitzungen wurden zurückgesetzt"
  ],
  "Отправить системное уведомление всем пользователям?": [
      "Send a system broadcast notification to all users?",
      "¿Enviar notificación del sistema a todos los usuarios?",
      "是否向所有用户发送系统广播通知？",
      "هل تريد إرسال إشعار نظام لجميع المستخدمين؟",
      "ارسال اعلان سیستمی به تمام کاربران؟",
      "Envoyer une notification système à tous les utilisateurs ?",
      "Systembenachrichtigung an alle Benutzer senden?"
  ],
  "Очистить старые конверты из очереди ретрансляции?": [
      "Purge expired envelopes from the relay queue?",
      "¿Limpiar sobres antiguos de la cola de retransmisión?",
      "是否清理中继队列中的过期信封？",
      "هل تريد مسح المظاريف القديمة من طابور المرحل؟",
      "پاکسازی پاکت‌های قدیمی از صف رله؟",
      "Purger les anciennes enveloppes de la file de relais ?",
      "Alte Umschläge aus der Relay-Warteschlange löschen?"
  ],
  "Включить режим технического обслуживания": [
      "Enable Maintenance Mode",
      "Activar modo de mantenimiento",
      "开启维护模式",
      "تفعيل وضع الصيانة",
      "فعال‌سازی حالت تعمیرات",
      "Activer le mode maintenance",
      "Wartungsmodus aktivieren"
  ],
  "Выключить режим технического обслуживания": [
      "Disable Maintenance Mode",
      "Desactivar modo de mantenimiento",
      "关闭维护模式",
      "إيقاف وضع الصيانة",
      "غیرفعال‌سازی حالت تعمیرات",
      "Désactiver le mode maintenance",
      "Wartungsmodus deaktivieren"
  ],
  "Не удалось переключить режим тех. обслуживания": [
      "Failed to toggle maintenance mode",
      "No se pudo cambiar el modo de mantenimiento",
      "切换维护模式失败",
      "تعذر تبديل وضع الصيانة",
      "تغییر وضعیت تعمیرات ناموفق بود",
      "Impossible de basculer le mode maintenance",
      "Wartungsmodus konnte nicht umgeschaltet werden"
  ],
  "Закрыть консоль": [
      "Close Console",
      "Cerrar consola",
      "关闭控制台",
      "إغلاق وحدة التحكم",
      "بستن کنسول",
      "Fermer la console",
      "Konsole schließen"
  ],
  "Экспорт JSON": [
      "Export JSON",
      "Exportar JSON",
      "导出 JSON",
      "تصدير JSON",
      "خروجی JSON",
      "Exporter JSON",
      "JSON exportieren"
  ],
  "Быстрый фильтр по разделам (Ctrl+F)": [
      "Quick section filter (Ctrl+F)",
      "Filtro rápido de secciones (Ctrl+F)",
      "快速筛选板块 (Ctrl+F)",
      "تصفية سريعة للأقسام (Ctrl+F)",
      "فیلتر سریع بخش‌ها (Ctrl+F)",
      "Filtre rapide des sections (Ctrl+F)",
      "Schnellfilter für Bereiche (Strg+F)"
  ],
  "Всего пользователей": [
      "Total Users",
      "Total de usuarios",
      "总用户数",
      "إجمالي المستخدمين",
      "کل کاربران",
      "Total des utilisateurs",
      "Benutzer insgesamt"
  ],
  "Активные за 24ч": [
      "Active (24h)",
      "Activos (24h)",
      "24小时活跃",
      "النشطون خلال 24 ساعة",
      "فعال در ۲۴ ساعت",
      "Actifs (24h)",
      "Aktiv (24h)"
  ],
  "Конвертов в очереди": [
      "Queued Envelopes",
      "Sobres en cola",
      "队列中信封数",
      "المظاريف في الطابور",
      "پاکت‌های در صف",
      "Enveloppes en file",
      "Umschläge in Warteschlange"
  ],
  "Использование диска": [
      "Disk Usage",
      "Uso de disco",
      "磁盘使用率",
      "استخدام القرص",
      "مصرف دیسک",
      "Utilisation disque",
      "Festplattennutzung"
  ],
  "Задержка БД / Заблокировано": [
      "DB Latency / Banned",
      "Latencia BD / Bloqueados",
      "数据库延迟 / 已封禁",
      "تأخير قاعدة البيانات / المحظورون",
      "تاخیر دیتابیس / مسدودشده",
      "Latence BDD / Bannis",
      "DB-Latenz / Gesperrt"
  ],
  "Матрица состояния микросервисов": [
      "Microservice Health Matrix",
      "Matriz de estado de microservicios",
      "微服务健康矩阵",
      "مصفوفة حالة الخدمات المصغرة",
      "ماتریس سلامت میکروسرویس‌ها",
      "Matrice d'état des microservices",
      "Mikroservice-Statusmatrix"
  ],
  "Криптографические инварианты и постквантовый щит": [
      "Cryptographic Invariants & Post-Quantum Shield",
      "Invariantes criptográficos y escudo post-cuántico",
      "密码学不变量与后量子护盾",
      "الثوابت التشفيرية والدرع ما بعد الكمي",
      "تضمین‌های رمزنگاری و سپر پساکوانتومی",
      "Invariants cryptographiques & bouclier post-quantique",
      "Kryptografische Invarianten & Post-Quanten-Schild"
  ],
  "Системное оповещение (Broadcast)": [
      "System Broadcast Alert",
      "Aviso global del sistema (Broadcast)",
      "系统全网广播通知",
      "تنبيه النظام العام (Broadcast)",
      "اعلان سراسری سیستم (Broadcast)",
      "Diffusion système (Broadcast)",
      "Systemweite Rundsendung (Broadcast)"
  ],
  "Текст системного уведомления для всех онлайн-узлов...": [
      "System broadcast message for all online nodes...",
      "Texto del aviso del sistema para todos los nodos en línea...",
      "发送给所有在线节点的系统广播内容...",
      "نص إشعار النظام لجميع العقد المتصلة...",
      "متن اعلان سیستمی برای تمام گره‌های آنلاین...",
      "Texte de notification système pour tous les nœuds en ligne...",
      "Systemnachricht für alle Online-Knoten..."
  ],
  "Отправить всем": [
      "Broadcast to All",
      "Enviar a todos",
      "发送给所有人",
      "إرسال للجميع",
      "ارسال به همه",
      "Envoyer à tous",
      "An alle senden"
  ],
  "Оперативное управление очередями и режимом узла": [
      "Queue & Node Operations",
      "Gestión operativa de colas y modo del nodo",
      "队列与节点运行模式管理",
      "الإدارة التشغيلية للطوابير ووضع العقدة",
      "مدیریت عملیاتی صف‌ها و حالت گره",
      "Gestion opérationnelle des files et du nœud",
      "Warteschlangen- & Knotenbetrieb"
  ],
  "Принудительная очистка старых доставленных конвертов": [
      "Force purge of expired/delivered relay envelopes",
      "Limpieza forzosa de sobres antiguos entregados",
      "强制清理已投递或过期的旧信封",
      "تنظيف قسري للمظاريف القديمة المسلمة",
      "پاکسازی اجباری پاکت‌های تحویل‌شده قدیمی",
      "Purge forcée des anciennes enveloppes distribuées",
      "Erzwungene Bereinigung alter zugestellter Umschläge"
  ],
  "Очистить > 7 дней": [
      "Purge > 7 days",
      "Limpiar > 7 días",
      "清理 > 7 天",
      "مسح > 7 أيام",
      "پاکسازی > ۷ روز",
      "Purger > 7 jours",
      "Bereinigen > 7 Tage"
  ],
  "Временно ограничить новые подключения (кроме админов)": [
      "Temporarily restrict new connections (admins exempt)",
      "Restringir temporalmente nuevas conexiones (excepto admins)",
      "暂时限制新连接（管理员除外）",
      "تقييد الاتصالات الجديدة مؤقتاً (باستثناء المشرفين)",
      "محدودیت موقت اتصالات جدید (به جز مدیران)",
      "Restreindre temporairement les nouvelles connexions (sauf admins)",
      "Neue Verbindungen vorübergehend einschränken (außer Admins)"
  ],
  "Распределение транспорта (WebSocket / Fake-TLS / BLE Mesh)": [
      "Transport Distribution (WebSocket / Fake-TLS / BLE Mesh)",
      "Distribución de transporte (WebSocket / Fake-TLS / BLE Mesh)",
      "传输层分布 (WebSocket / Fake-TLS / BLE Mesh)",
      "توزيع النقل (WebSocket / Fake-TLS / BLE Mesh)",
      "توزیع لایه انتقال (WebSocket / Fake-TLS / BLE Mesh)",
      "Répartition du transport (WebSocket / Fake-TLS / BLE Mesh)",
      "Transportverteilung (WebSocket / Fake-TLS / BLE Mesh)"
  ],
  "Анти-DPI и сетевая телеметрия": [
      "Anti-DPI & Network Telemetry",
      "Telemetría de red y Anti-DPI",
      "反 DPI 与网络遥测",
      "القياس الشبكي ومكافحة DPI",
      "تله‌متری شبکه و ضد DPI",
      "Télémétrie réseau & Anti-DPI",
      "Anti-DPI & Netzwerk-Telemetrie"
  ],
  "Инспектор очереди ретрансляции (Blind Relay Envelopes)": [
      "Blind Relay Queue Inspector",
      "Inspector de cola de retransmisión ciega",
      "盲中继队列检查器 (Blind Relay Envelopes)",
      "مفتش طابور الترحيل الأعمى",
      "بازرس صف رله کور (Blind Relay)",
      "Inspecteur de file de relais aveugle",
      "Blind-Relay-Warteschlangen-Inspektor"
  ],
  "Сервер не видит открытый текст — только зашифрованные конверты, размер и TTL.": [
      "The server never sees plaintext — only encrypted envelopes, byte size, and TTL.",
      "El servidor nunca ve texto plano — solo sobres cifrados, tamaño y TTL.",
      "服务器无法看到任何明文——仅处理加密信封、字节大小与 TTL。",
      "لا يرى الخادم النص الصريح أبداً — فقط المظاريف المشفرة والحجم ومدة البقاء.",
      "سرور هرگز متن واضح را نمی‌بیند — فقط پاکت‌های رمزنگاری‌شده، حجم و TTL.",
      "Le serveur ne voit jamais le texte en clair — uniquement les enveloppes chiffrées, la taille et le TTL.",
      "Der Server sieht niemals Klartext — nur verschlüsselte Umschläge, Größe und TTL."
  ],
  "Очередь ретрансляции пуста — все конверты доставлены": [
      "Relay queue is empty — all envelopes delivered",
      "La cola de retransmisión está vacía — todos los sobres entregados",
      "中继队列为空——所有信封均已投递",
      "طابور الترحيل فارغ — تم تسليم جميع المظاريف",
      "صف رله خالی است — تمام پاکت‌ها تحویل داده شدند",
      "La file de relais est vide — toutes les enveloppes ont été remises",
      "Relay-Warteschlange ist leer — alle Umschläge zugestellt"
  ],
  "Поиск по @username или ID...": [
      "Search by @username or ID...",
      "Buscar por @usuario o ID...",
      "按 @用户名 或 ID 搜索...",
      "البحث بواسطة @اسم_المستخدم أو المعرف...",
      "جستجو با @نام‌کاربری یا شناسه...",
      "Rechercher par @utilisateur ou ID...",
      "Suche nach @Benutzername oder ID..."
  ],
  "Всего": [
      "Total",
      "Total",
      "全部",
      "الكل",
      "همه",
      "Total",
      "Gesamt"
  ],
  "Активные": [
      "Active",
      "Activos",
      "活跃",
      "نشط",
      "فعال",
      "Actifs",
      "Aktiv"
  ],
  "Заблокированные": [
      "Banned",
      "Bloqueados",
      "已封禁",
      "محظور",
      "مسدودشده",
      "Bannis",
      "Gesperrt"
  ],
  "Показано": [
      "Showing",
      "Mostrando",
      "显示",
      "عرض",
      "نمایش",
      "Affichage",
      "Angezeigt"
  ],
  "Заблокирован": [
      "Banned",
      "Bloqueado",
      "已封禁",
      "محظور",
      "مسدود",
      "Banni",
      "Gesperrt"
  ],
  "Сбросить сессии": [
      "Reset Sessions",
      "Cerrar sesiones",
      "重置会话",
      "إنهاء الجلسات",
      "بازنشانی نشست‌ها",
      "Réinitialiser les sessions",
      "Sitzungen zurücksetzen"
  ],
  "Снять бан": [
      "Unban",
      "Desbloquear",
      "解封",
      "إلغاء الحظر",
      "رفع مسدودیت",
      "Débannir",
      "Entsperren"
  ],
  "Забанить": [
      "Ban",
      "Bloquear",
      "封禁",
      "حظر",
      "مسدود کردن",
      "Bannir",
      "Sperren"
  ],
  "Неизменяемый журнал действий администраторов с привязкой к IP и времени.": [
      "Immutable administrator audit trail with IP and timestamp binding.",
      "Registro de auditoría inmutable de administradores con IP y marca de tiempo.",
      "绑定 IP 与时间戳的管理员不可篡改审计日志。",
      "سجل تدقيق غير قابل للتغيير لإجراءات المشرفين مرتبط بالعنوان والوقت.",
      "گزارش تغییرناپذیر عملیات مدیران همراه با IP و زمان.",
      "Journal d'audit immuable des administrateurs avec IP et horodatage.",
      "Unveränderliches Admin-Audit-Log mit IP- und Zeitstempel-Bindung."
  ],
  "Записей в журнале аудита пока нет": [
      "No audit log entries yet",
      "Aún no hay entradas en el registro de auditoría",
      "暂无审计日志记录",
      "لا توجد سجلات تدقيق حتى الآن",
      "هنوز رکوردی در گزارش ممیزی ثبت نشده است",
      "Aucune entrée dans le journal d'audit pour le moment",
      "Noch keine Einträge im Audit-Protokoll"
  ],
  "Панель телеметрии и B2B управления кластером": [
      "Cluster Telemetry & B2B Control Center",
      "Panel de telemetría y gestión B2B del clúster",
      "集群遥测与 B2B 管理控制台",
      "لوحة القياس وإدارة الأعمال للمجموعة",
      "پنل تله‌متری و مدیریت B2B کلاستر",
      "Panneau de télémétrie et gestion B2B du cluster",
      "Cluster-Telemetrie & B2B-Steuerzentrale"
  ],
  "Вход в консоль администратора": [
      "Admin Console Sign In",
      "Acceso a la consola de administración",
      "登录管理员控制台",
      "تسجيل الدخول إلى وحدة تحكم المشرف",
      "ورود به کنسول مدیریت",
      "Connexion à la console d'administration",
      "Anmeldung an der Admin-Konsole"
  ],
  "Введите мастер-пароль владельца системы для доступа к метрикам и управлению": [
      "Enter the system owner master key to access telemetry and cluster management",
      "Ingrese la clave maestra del propietario para acceder a métricas y gestión",
      "输入系统所有者主密钥以访问指标与管理控制",
      "أدخل المفتاح الرئيسي لمالك النظام للوصول إلى المقاييس والإدارة",
      "رمز مادر مالک سیستم را برای دسترسی به متریک‌ها و مدیریت وارد کنید",
      "Saisissez la clé maître du propriétaire pour accéder aux métriques et à la gestion",
      "Geben Sie den Master-Schlüssel des Systemeigentümers ein"
  ],
  "Мастер-ключ администратора": [
      "Admin Master Key",
      "Clave maestra de administrador",
      "管理员主密钥",
      "المفتاح الرئيسي للمشرف",
      "کلید مادر مدیر",
      "Clé maître administrateur",
      "Admin-Master-Schlüssel"
  ],
  "Zero-Knowledge: доступ к чужим перепискам исключен": [
      "Zero-Knowledge: access to private messages is mathematically impossible",
      "Zero-Knowledge: el acceso a chats privados es matemáticamente imposible",
      "零知识架构：从数学上杜绝访问任何私人通信",
      "معرفة صفرية: الوصول إلى المحادثات الخاصة مستحيل رياضياً",
      "معماری Zero-Knowledge: دسترسی به پیام‌های خصوصی غیرممکن است",
      "Zero-Knowledge : l'accès aux messages privés est mathématiquement impossible",
      "Zero-Knowledge: Zugriff auf private Chats ist mathematisch ausgeschlossen"
  ],
  "Метрики и Кластер": [
      "Metrics & Cluster",
      "Métricas y Clúster",
      "指标与集群",
      "المقاييس والمجموعة",
      "متریک‌ها و کلاستر",
      "Métriques & Cluster",
      "Metriken & Cluster"
  ],
  "Платежи (ЮKassa & TON)": [
      "Payments (YooKassa & TON)",
      "Pagos (YooKassa y TON)",
      "支付 (YooKassa & TON)",
      "المدفوعات (YooKassa & TON)",
      "پرداخت‌ها (YooKassa و TON)",
      "Paiements (YooKassa & TON)",
      "Zahlungen (YooKassa & TON)"
  ],
  "B2B Заявки (Leads)": [
      "B2B Leads",
      "Solicitudes B2B (Leads)",
      "B2B 线索 (Leads)",
      "طلبات الشركات (Leads)",
      "درخواست‌های سازمانی (B2B)",
      "Prospects B2B (Leads)",
      "B2B-Anfragen (Leads)"
  ],
  "Пользователи (IAM)": [
      "Users (IAM)",
      "Usuarios (IAM)",
      "用户管理 (IAM)",
      "المستخدمون (IAM)",
      "کاربران (IAM)",
      "Utilisateurs (IAM)",
      "Benutzer (IAM)"
  ],
  "Оповещения (Broadcast)": [
      "Broadcast Alerts",
      "Avisos (Broadcast)",
      "系统广播 (Broadcast)",
      "التنبيهات العامة (Broadcast)",
      "اعلان سراسری (Broadcast)",
      "Diffusions (Broadcast)",
      "Rundsendungen (Broadcast)"
  ],
  "Лицензия & Защита Ядра": [
      "License & Core Guard",
      "Licencia y Protección del Núcleo",
      "许可证与核心防护",
      "الترخيص وحماية النواة",
      "لایسنس و حفاظت هسته",
      "Licence & Protection du Noyau",
      "Lizenz & Kernschutz"
  ],
  "Безопасность & Ключ": [
      "Security & Master Key",
      "Seguridad y Clave",
      "安全与主密钥",
      "الأمان والمفتاح",
      "امنیت و کلید مادر",
      "Sécurité & Clé",
      "Sicherheit & Schlüssel"
  ],
  "Пользователей": [
      "Users",
      "Usuarios",
      "用户总数",
      "المستخدمون",
      "کاربران",
      "Utilisateurs",
      "Benutzer"
  ],
  "Онлайн (Live)": [
      "Online (Live)",
      "En línea (Live)",
      "当前在线 (Live)",
      "متصل الآن (Live)",
      "آنلاین (زنده)",
      "En ligne (Live)",
      "Online (Live)"
  ],
  "MLS & Ключи": [
      "MLS & Keys",
      "MLS y Claves",
      "MLS 与密钥",
      "مفاتيح MLS",
      "کلیدها و MLS",
      "MLS & Clés",
      "MLS & Schlüssel"
  ],
  "Хранилище": [
      "Storage",
      "Almacenamiento",
      "存储空间",
      "التخزين",
      "حافظه ذخیره",
      "Stockage",
      "Speicher"
  ],
  "Лицензии": [
      "Licenses",
      "Licencias",
      "许可证",
      "التراخيص",
      "لایسنس‌ها",
      "Licences",
      "Lizenzen"
  ],
  "B2B Заявки": [
      "B2B Leads",
      "Solicitudes B2B",
      "B2B 申请",
      "طلبات B2B",
      "درخواست‌های B2B",
      "Demandes B2B",
      "B2B-Anfragen"
  ],
  "Состояние микросервисов кластера": [
      "Cluster Microservices Status",
      "Estado de los microservicios del clúster",
      "集群微服务运行状态",
      "حالة الخدمات المصغرة للمجموعة",
      "وضعیت میکروسرویس‌های کلاستر",
      "État des microservices du cluster",
      "Status der Cluster-Mikroservices"
  ],
  "Дисковый массив сервера (NVMe)": [
      "Server Disk Array (NVMe)",
      "Matriz de discos del servidor (NVMe)",
      "服务器磁盘阵列 (NVMe)",
      "مصفوفة أقراص الخادم (NVMe)",
      "آرایه دیسک سرور (NVMe)",
      "Baie de disques serveur (NVMe)",
      "Server-Festplatten-Array (NVMe)"
  ],
  "Оперативная память (RAM)": [
      "System Memory (RAM)",
      "Memoria RAM del sistema",
      "系统运行内存 (RAM)",
      "ذاكرة الوصول العشوائي (RAM)",
      "حافظه رم (RAM)",
      "Mémoire vive (RAM)",
      "Arbeitsspeicher (RAM)"
  ],
  "Распределение клиентов": [
      "Client Platform Distribution",
      "Distribución de clientes",
      "客户端平台分布",
      "توزيع منصات العملاء",
      "توزیع پلتفرم کاربران",
      "Répartition des clients",
      "Client-Verteilung"
  ],
  "Android (Нативный APK)": [
      "Android (Native APK)",
      "Android (APK nativo)",
      "Android（原生 APK）",
      "أندرويد (APK أصلي)",
      "اندروید (APK بومی)",
      "Android (APK natif)",
      "Android (Natives APK)"
  ],
  "Zero-Knowledge Архитектура Подтверждена": [
      "Zero-Knowledge Architecture Verified",
      "Arquitectura Zero-Knowledge Verificada",
      "零知识架构已验证",
      "تم التحقق من بنية المعرفة الصفرية",
      "معماری Zero-Knowledge تایید شد",
      "Architecture Zero-Knowledge Vérifiée",
      "Zero-Knowledge-Architektur verifiziert"
  ],
  "Консоль отображает исключительно агрегированные телеметрические данные кластера. Закрытые ключи пользователей генерируются на устройствах и никогда не передаются на сервер. Доступ к текстам переписок и файлам пользователей математически невозможен.": [
      "This console displays only aggregated cluster telemetry. User private keys are generated on-device and never leave the client. Accessing message contents or files is mathematically impossible.",
      "La consola muestra únicamente datos telemétricos agregados. Las claves privadas se generan en el dispositivo y nunca se envían al servidor. El acceso a los mensajes es matemáticamente imposible.",
      "控制台仅显示汇总的集群遥测数据。用户私钥在设备本地生成且绝不上传服务器，从数学上无法访问任何聊天内容或文件。",
      "تعرض وحدة التحكم بيانات القياس المجمعة فقط. يتم توليد المفاتيح الخاصة على الأجهزة ولا تغادرها أبداً.",
      "این کنسول صرفاً داده‌های تجمیعی تله‌متری کلاستر را نمایش می‌دهد. کلیدهای خصوصی روی دستگاه تولید شده و هرگز به سرور ارسال نمی‌شوند.",
      "La console affiche uniquement des données télémétriques agrégées. Les clés privées restent sur les appareils ; l'accès aux messages est mathématiquement impossible.",
      "Die Konsole zeigt ausschließlich aggregierte Telemetriedaten. Private Schlüssel verbleiben auf den Geräten; ein Zugriff auf Inhalte ist mathematisch unmöglich."
  ],
  "Крипто-протокол: MLS IETF draft + X25519 Double Ratchet + SQLCipher AES-256": [
      "Crypto stack: MLS IETF (RFC 9420) + X25519 Double Ratchet + SQLCipher AES-256",
      "Protocolo cripto: MLS IETF + X25519 Double Ratchet + SQLCipher AES-256",
      "密码协议栈：MLS IETF + X25519 双棘轮 + SQLCipher AES-256",
      "بروتوكول التشفير: MLS IETF + X25519 Double Ratchet + SQLCipher AES-256",
      "پروتکل رمزنگاری: MLS IETF + X25519 Double Ratchet + SQLCipher AES-256",
      "Protocole crypto : MLS IETF + X25519 Double Ratchet + SQLCipher AES-256",
      "Krypto-Protokoll: MLS IETF + X25519 Double Ratchet + SQLCipher AES-256"
  ],
  "Всего заказов": [
      "Total Orders",
      "Total de pedidos",
      "总订单数",
      "إجمالي الطلبات",
      "کل سفارش‌ها",
      "Total des commandes",
      "Bestellungen gesamt"
  ],
  "ЮKassa + TON": [
      "YooKassa + TON",
      "YooKassa + TON",
      "YooKassa + TON",
      "YooKassa + TON",
      "YooKassa + TON",
      "YooKassa + TON",
      "YooKassa + TON"
  ],
  "Оплачено": [
      "Paid",
      "Pagado",
      "已支付",
      "مدفوع",
      "پرداخت‌شده",
      "Payé",
      "Bezahlt"
  ],
  "Активные подписки": [
      "Active Subscriptions",
      "Suscripciones activas",
      "有效订阅",
      "الاشتراكات النشطة",
      "اشتراک‌های فعال",
      "Abonnements actifs",
      "Aktive Abonnements"
  ],
  "Выручка (ЮKassa)": [
      "Revenue (YooKassa)",
      "Ingresos (YooKassa)",
      "收入 (YooKassa)",
      "الإيرادات (YooKassa)",
      "درآمد (YooKassa)",
      "Revenus (YooKassa)",
      "Umsatz (YooKassa)"
  ],
  "СБП / МИР / Карты": [
      "SBP / MIR / Cards",
      "SBP / MIR / Tarjetas",
      "快速支付 / 银行卡",
      "البطاقات والتحويل الفوري",
      "کارت‌های بانکی / پرداخت سریع",
      "Cartes bancaires / SBP",
      "Karten / Sofortzahlung"
  ],
  "Выручка (TON)": [
      "Revenue (TON)",
      "Ingresos (TON)",
      "收入 (TON)",
      "الإيرادات (TON)",
      "درآمد (TON)",
      "Revenus (TON)",
      "Umsatz (TON)"
  ],
  "Состояние платежных шлюзов (ЮKassa & TON)": [
      "Payment Gateways Status (YooKassa & TON)",
      "Estado de pasarelas de pago (YooKassa y TON)",
      "支付网关状态 (YooKassa & TON)",
      "حالة بوابات الدفع (YooKassa & TON)",
      "وضعیت درگاه‌های پرداخت (YooKassa و TON)",
      "État des passerelles de paiement (YooKassa & TON)",
      "Status der Zahlungs-Gateways (YooKassa & TON)"
  ],
  "API ЮKassa сообщает": [
      "YooKassa API reports",
      "La API de YooKassa informa",
      "YooKassa API 报告",
      "يفيد واجهة YooKassa",
      "گزارش API یوکاسا",
      "L'API YooKassa indique",
      "YooKassa-API meldet"
  ],
  "(прием платежей еще не активирован в личном кабинете ЮKassa). Все заявки сохраняются в журнале ниже — вы можете подтверждать их в 1 клик или указать резервную платежную ссылку в настройках.": [
      "(payment acceptance is pending activation in YooKassa dashboard). All orders are logged below — you can approve them in 1 click or configure a fallback payment link.",
      "(la recepción de pagos aún no está activa en YooKassa). Todos los pedidos se guardan abajo para confirmar en 1 clic.",
      "（YooKassa 商户后台尚未激活收款）。所有订单均记录在下方日志中，可一键确认或配置备用支付链接。",
      "(لم يتم تفعيل استلام المدفوعات بعد). يتم حفظ جميع الطلبات في السجل أدناه لتأكيدها بنقرة واحدة.",
      "(دریافت پرداخت هنوز در پنل فعال نشده است). تمام سفارش‌ها در جدول زیر ذخیره می‌شوند و با ۱ کلیک قابل تایید هستند.",
      "(réception des paiements en attente d'activation). Toutes les commandes sont enregistrées ci-dessous.",
      "(Zahlungsannahme noch nicht aktiviert). Alle Bestellungen werden unten protokolliert und können mit 1 Klick bestätigt werden."
  ],
  "Активен (Mainnet)": [
      "Active (Mainnet)",
      "Activo (Mainnet)",
      "已激活 (Mainnet)",
      "نشط (Mainnet)",
      "فعال (Mainnet)",
      "Actif (Mainnet)",
      "Aktiv (Mainnet)"
  ],
  "ЮKassa Shop ID": [
      "YooKassa Shop ID",
      "ID de tienda YooKassa",
      "YooKassa 商户 ID",
      "معرف متجر YooKassa",
      "شناسه فروشگاه YooKassa",
      "ID boutique YooKassa",
      "YooKassa Shop-ID"
  ],
  "Резервная ссылка оплаты ЮKassa / СБП (если API-магазин на модерации)": [
      "Fallback YooKassa / SBP Payment URL (while API store is under review)",
      "Enlace de pago alternativo YooKassa / SBP",
      "YooKassa / 快速支付备用收款链接（API 审核期间使用）",
      "رابط الدفع الاحتياطي لـ YooKassa",
      "لینک پرداخت پشتیبان YooKassa",
      "Lien de paiement de secours YooKassa",
      "Fallback-Zahlungslink YooKassa / SBP"
  ],
  "TON Кошелек получателя (Mainnet)": [
      "Recipient TON Wallet (Mainnet)",
      "Billetera TON receptora (Mainnet)",
      "收款方 TON 钱包地址 (Mainnet)",
      "محفظة TON المستلمة (Mainnet)",
      "کیف پول TON گیرنده (Mainnet)",
      "Portefeuille TON bénéficiaire (Mainnet)",
      "Empfänger-TON-Wallet (Mainnet)"
  ],
  "Передавать онлайн-чек 54-ФЗ (receipt) в запросах ЮKassa": [
      "Send fiscal receipt payload in YooKassa API requests",
      "Enviar recibo fiscal en las solicitudes de YooKassa",
      "在 YooKassa 请求中发送电子收据数据",
      "إرسال إيصال ضريبي إلكتروني في طلبات YooKassa",
      "ارسال رسید الکترونیکی در درخواست‌های YooKassa",
      "Envoyer le reçu fiscal dans les requêtes YooKassa",
      "Online-Kassenbon (Receipt) in YooKassa-Anfragen senden"
  ],
  "Журнал платежей и счетов": [
      "Payments & Invoices Ledger",
      "Registro de pagos y facturas",
      "支付与账单日志",
      "سجل المدفوعات والفواتير",
      "دفتر کل پرداخت‌ها و فاکتورها",
      "Journal des paiements et factures",
      "Zahlungs- und Rechnungsjournal"
  ],
  "Все статусы": [
      "All Statuses",
      "Todos los estados",
      "全部状态",
      "جميع الحالات",
      "همه وضعیت‌ها",
      "Tous les statuts",
      "Alle Status"
  ],
  "Успешно оплаченные": [
      "Paid Successfully",
      "Pagados con éxito",
      "已成功支付",
      "المدفوعة بنجاح",
      "پرداخت‌شده موفق",
      "Payés avec succès",
      "Erfolgreich bezahlt"
  ],
  "Ожидающие оплаты": [
      "Pending Payment",
      "Pendientes de pago",
      "等待支付",
      "بانتظار الدفع",
      "در انتظار پرداخت",
      "En attente de paiement",
      "Zahlung ausstehend"
  ],
  "Отмененные": [
      "Canceled",
      "Cancelados",
      "已取消",
      "الملغاة",
      "لغوشده",
      "Annulés",
      "Storniert"
  ],
  "Заказов пока нет": [
      "No orders yet",
      "Aún no hay pedidos",
      "暂无订单",
      "لا توجد طلبات حتى الآن",
      "هنوز سفارشی ثبت نشده است",
      "Aucune commande pour le moment",
      "Noch keine Bestellungen"
  ],
  "Заказы, созданные через форму ЮKassa или блокчейн TON, появятся здесь.": [
      "Orders created via YooKassa or TON blockchain will appear here.",
      "Los pedidos creados mediante YooKassa o la blockchain TON aparecerán aquí.",
      "通过 YooKassa 或 TON 区块链创建的订单将显示在此处。",
      "ستظهر هنا الطلبات المنشأة عبر YooKassa أو بلوكتشين TON.",
      "سفارش‌های ایجادشده از طریق YooKassa یا بلاکچین TON در اینجا نمایش داده می‌شوند.",
      "Les commandes créées via YooKassa ou la blockchain TON apparaîtront ici.",
      "Über YooKassa oder die TON-Blockchain erstellte Bestellungen erscheinen hier."
  ],
  "ID Заказа": [
      "Order ID",
      "ID Pedido",
      "订单 ID",
      "معرف الطلب",
      "شناسه سفارش",
      "ID Commande",
      "Bestell-ID"
  ],
  "Метод": [
      "Method",
      "Método",
      "方式",
      "الطريقة",
      "روش",
      "Méthode",
      "Methode"
  ],
  "Тариф": [
      "Plan",
      "Plan",
      "套餐",
      "الباقة",
      "تعرفه",
      "Forfait",
      "Tarif"
  ],
  "Сумма": [
      "Amount",
      "Importe",
      "金额",
      "المبلغ",
      "مبلغ",
      "Montant",
      "Betrag"
  ],
  "Статус": [
      "Status",
      "Estado",
      "状态",
      "الحالة",
      "وضعیت",
      "Statut",
      "Status"
  ],
  "Дата": [
      "Date",
      "Fecha",
      "日期",
      "التاريخ",
      "تاریخ",
      "Date",
      "Datum"
  ],
  "Действия": [
      "Actions",
      "Acciones",
      "操作",
      "الإجراءات",
      "عملیات",
      "Actions",
      "Aktionen"
  ],
  "Только новые": [
      "New Only",
      "Solo nuevos",
      "仅新线索",
      "الجديدة فقط",
      "فقط جدیدها",
      "Nouveaux uniquement",
      "Nur neue"
  ],
  "В работе (Связались)": [
      "In Progress (Contacted)",
      "En curso (Contactados)",
      "跟进中（已联系）",
      "قيد المتابعة (تم التواصل)",
      "در حال پیگیری (تماس گرفته شد)",
      "En cours (Contactés)",
      "In Bearbeitung (Kontaktiert)"
  ],
  "Тестовый стенд (Пилот)": [
      "Pilot Deployment",
      "Entorno piloto",
      "试点部署 (Pilot)",
      "بيئة تجريبية (Pilot)",
      "نسخه آزمایشی (پایلوت)",
      "Pilote d'essai",
      "Pilotbetrieb"
  ],
  "Закрытые": [
      "Closed",
      "Cerrados",
      "已关闭",
      "المغلقة",
      "بسته‌شده",
      "Clôturés",
      "Abgeschlossen"
  ],
  "Новая корпоративная заявка (ручной ввод CRM)": [
      "New Enterprise Lead (Manual CRM Entry)",
      "Nueva solicitud corporativa (entrada manual CRM)",
      "新建企业线索（CRM 手动录入）",
      "طلب مؤسسي جديد (إدخال يدوي CRM)",
      "درخواست سازمانی جدید (ثبت دستی CRM)",
      "Nouveau prospect B2B (saisie manuelle CRM)",
      "Neue Enterprise-Anfrage (Manueller CRM-Eintrag)"
  ],
  "10–25 сотрудников": [
      "10–25 employees",
      "10–25 empleados",
      "10–25 名员工",
      "10–25 موظفاً",
      "۱۰ تا ۲۵ کارمند",
      "10–25 collaborateurs",
      "10–25 Mitarbeiter"
  ],
  "25–100 сотрудников": [
      "25–100 employees",
      "25–100 empleados",
      "25–100 名员工",
      "25–100 موظف",
      "۲۵ تا ۱۰۰ کارمند",
      "25–100 collaborateurs",
      "25–100 Mitarbeiter"
  ],
  "100–500 сотрудников": [
      "100–500 employees",
      "100–500 empleados",
      "100–500 名员工",
      "100–500 موظف",
      "۱۰۰ تا ۵۰۰ کارمند",
      "100–500 collaborateurs",
      "100–500 Mitarbeiter"
  ],
  "On-Premise (Свой сервер)": [
      "On-Premise (Self-Hosted)",
      "On-Premise (Servidor propio)",
      "On-Premise（自有服务器）",
      "خادم داخلي خاص (On-Premise)",
      "سرور اختصاصی سازمان (On-Premise)",
      "On-Premise (Serveur dédié)",
      "On-Premise (Eigener Server)"
  ],
  "Air-Gapped (Закрытый контур)": [
      "Air-Gapped (Isolated Network)",
      "Air-Gapped (Red aislada)",
      "Air-Gapped（物理隔离内网）",
      "شبكة معزولة بالكامل (Air-Gapped)",
      "شبکه ایزوله بدون اینترنت (Air-Gapped)",
      "Air-Gapped (Réseau isolé)",
      "Air-Gapped (Isoliertes Netz)"
  ],
  "Заявок пока нет": [
      "No leads yet",
      "Aún no hay solicitudes",
      "暂无申请线索",
      "لا توجد طلبات حتى الآن",
      "هنوز درخواستی ثبت نشده است",
      "Aucune demande pour le moment",
      "Noch keine Anfragen"
  ],
  "Заявки, отправленные через B2B-форму на лендинге или добавленные вручную, появятся здесь.": [
      "Enterprise leads submitted via the landing B2B form or added manually will appear here.",
      "Las solicitudes enviadas desde el formulario B2B o añadidas manualmente aparecerán aquí.",
      "通过着陆页 B2B 表单提交或手动录入的企业线索将显示在此处。",
      "ستظهر هنا طلبات الشركات المرسلة عبر نموذج الصفحة الرئيسية أو المضافة يدوياً.",
      "درخواست‌های ارسال‌شده از فرم B2B صفحه فرود یا اضافه‌شده به صورت دستی در اینجا نمایش داده می‌شوند.",
      "Les demandes soumises via le formulaire B2B ou ajoutées manuellement apparaîtront ici.",
      "Über das B2B-Formular eingereichte oder manuell hinzugefügte Anfragen erscheinen hier."
  ],
  "Контакт:": [
      "Contact:",
      "Contacto:",
      "联系人：",
      "جهة الاتصال:",
      "مخاطب:",
      "Contact :",
      "Kontakt:"
  ],
  "Новый": [
      "New",
      "Nuevo",
      "新线索",
      "جديد",
      "جدید",
      "Nouveau",
      "Neu"
  ],
  "Связались": [
      "Contacted",
      "Contactado",
      "已联系",
      "تم التواصل",
      "تماس گرفته شد",
      "Contacté",
      "Kontaktiert"
  ],
  "Пилот": [
      "Pilot",
      "Piloto",
      "试点",
      "تجريبي",
      "پایلوت",
      "Pilote",
      "Pilot"
  ],
  "Закрыта": [
      "Closed",
      "Cerrada",
      "已关闭",
      "مغلق",
      "بسته‌شده",
      "Clôturé",
      "Geschlossen"
  ],
  "Компания": [
      "Company",
      "Empresa",
      "公司名称",
      "الشركة",
      "شرکت",
      "Entreprise",
      "Unternehmen"
  ],
  "Контакт": [
      "Contact",
      "Contacto",
      "联系人",
      "جهة الاتصال",
      "مخاطب",
      "Contact",
      "Kontakt"
  ],
  "Связь": [
      "Channel",
      "Canal",
      "联系方式",
      "وسيلة التواصل",
      "راه ارتباطی",
      "Canal",
      "Kanal"
  ],
  "Заметка CRM": [
      "CRM Note",
      "Nota CRM",
      "CRM 备注",
      "ملاحظة CRM",
      "یادداشت CRM",
      "Note CRM",
      "CRM-Notiz"
  ],
  "Команда / Формат": [
      "Team / Mode",
      "Equipo / Formato",
      "团队规模 / 部署方式",
      "الفريق / النمط",
      "تیم / مدل استقرار",
      "Équipe / Format",
      "Team / Format"
  ],
  "+ заметка": [
      "+ note",
      "+ nota",
      "+ 备注",
      "+ ملاحظة",
      "+ یادداشت",
      "+ note",
      "+ Notiz"
  ],
  "Управление пользователями (Zero-Knowledge IAM)": [
      "User Management (Zero-Knowledge IAM)",
      "Gestión de usuarios (Zero-Knowledge IAM)",
      "用户与访问管理 (Zero-Knowledge IAM)",
      "إدارة المستخدمين (Zero-Knowledge IAM)",
      "مدیریت کاربران (Zero-Knowledge IAM)",
      "Gestion des utilisateurs (Zero-Knowledge IAM)",
      "Benutzerverwaltung (Zero-Knowledge IAM)"
  ],
  "Найти": [
      "Search",
      "Buscar",
      "搜索",
      "بحث",
      "جستجو",
      "Rechercher",
      "Suchen"
  ],
  "Бот": [
      "Bot",
      "Bot",
      "机器人",
      "بوت",
      "ربات",
      "Bot",
      "Bot"
  ],
  "Сеть / Сессии": [
      "Network / Sessions",
      "Red / Sesiones",
      "网络 / 会话",
      "الشبكة / الجلسات",
      "شبکه / نشست‌ها",
      "Réseau / Sessions",
      "Netzwerk / Sitzungen"
  ],
  "Лицензия": [
      "License",
      "Licencia",
      "许可证",
      "الترخيص",
      "لایسنس",
      "Licence",
      "Lizenz"
  ],
  "Создан": [
      "Created",
      "Creado",
      "创建时间",
      "تاريخ الإنشاء",
      "تاریخ ایجاد",
      "Créé",
      "Erstellt"
  ],
  "Показаны все": [
      "Showing all",
      "Mostrando todos los",
      "已显示全部",
      "عرض كل",
      "نمایش همه",
      "Affichage des",
      "Alle angezeigt:"
  ],
  "пользователей • Конец списка": [
      "users • End of list",
      "usuarios • Fin de la lista",
      "名用户 • 已到底部",
      "مستخدمين • نهاية القائمة",
      "کاربر • پایان فهرست",
      "utilisateurs • Fin de liste",
      "Benutzer • Ende der Liste"
  ],
  "Система оповещений и таргетированный Broadcast": [
      "System Broadcast & Targeted Alerts",
      "Sistema de avisos y difusión segmentada",
      "系统广播与定向通知中心",
      "نظام التنبيهات والبث الموجه",
      "سیستم اعلان و پیام‌رسانی هدفمند",
      "Système d'alertes et diffusion ciblée",
      "Systembenachrichtigungen & Zielgerichteter Broadcast"
  ],
  "Мгновенная доставка Push-уведомлений и модальных алертов онлайн и оффлайн пользователям": [
      "Instant delivery of push notifications and modal alerts to online and offline users",
      "Entrega instantánea de notificaciones push y alertas modales a usuarios online y offline",
      "向在线与离线用户即时推送通知与弹窗警报",
      "تسليم فوري لإشعارات الدفع والتنبيهات للمستخدمين المتصلين وغير المتصلين",
      "ارسال آنی نوتیفیکیشن و هشدارهای مودال به کاربران آنلاین و آفلاین",
      "Diffusion instantanée de notifications push et d'alertes modales aux utilisateurs",
      "Sofortige Zustellung von Push-Mitteilungen und Modal-Warnungen an Online- und Offline-Nutzer"
  ],
  "Охват:": [
      "Reach:",
      "Alcance:",
      "覆盖范围：",
      "الوصول:",
      "پوشش:",
      "Portée :",
      "Reichweite:"
  ],
  "(также сохранено для оффлайн-клиентов)": [
      "(also queued for offline clients)",
      "(también guardado para clientes offline)",
      "（已同时为离线客户端缓存）",
      "(تم حفظه أيضاً للعملاء غير المتصلين)",
      "(همچنین برای کاربران آفلاین ذخیره شد)",
      "(également mis en file pour les clients hors ligne)",
      "(auch für Offline-Clients gespeichert)"
  ],
  "⚡ Шаблоны:": [
      "⚡ Templates:",
      "⚡ Plantillas:",
      "⚡ 快捷模板：",
      "⚡ القوالب:",
      "⚡ قالب‌های آماده:",
      "⚡ Modèles :",
      "⚡ Vorlagen:"
  ],
  "🎯 Сегмент получателей (Критерий выборки) *": [
      "🎯 Target Audience Segment *",
      "🎯 Segmento de destinatarios *",
      "🎯 目标受众群体 *",
      "🎯 شريحة المستلمين *",
      "🎯 بخش دریافت‌کنندگان *",
      "🎯 Segment de destinataires *",
      "🎯 Empfängersegment *"
  ],
  "Выберите целевую платформу:": [
      "Select target platform:",
      "Seleccione la plataforma de destino:",
      "选择目标平台：",
      "اختر المنصة المستهدفة:",
      "پلتفرم هدف را انتخاب کنید:",
      "Sélectionnez la plateforme cible :",
      "Zielplattform auswählen:"
  ],
  "Выберите контур безопасности:": [
      "Select security contour:",
      "Seleccione el contorno de seguridad:",
      "选择安全围栏级别：",
      "اختر محيط الأمان:",
      "کانتور امنیتی را انتخاب کنید:",
      "Sélectionnez le contour de sécurité :",
      "Sicherheitskontur auswählen:"
  ],
  "Никнеймы пользователей (через запятую):": [
      "Usernames (comma-separated):",
      "Nombres de usuario (separados por comas):",
      "用户名列表（用逗号分隔）：",
      "أسماء المستخدمين (مفصولة بفواصل):",
      "نام‌های کاربری (با ویرگول جدا کنید):",
      "Noms d'utilisateur (séparés par des virgules) :",
      "Benutzernamen (kommagetrennt):"
  ],
  "Поиск выполняется без учета регистра. Оповещение будет доставлено только указанным аккаунтам.": [
      "Case-insensitive match. The alert will be delivered strictly to the specified accounts.",
      "Búsqueda sin distinción de mayúsculas. El aviso se enviará solo a las cuentas indicadas.",
      "搜索不区分大小写，通知将仅发送给指定的账户。",
      "البحث غير حساس لحالة الأحرف. سيتم تسليم التنبيه للحسابات المحددة فقط.",
      "جستجو بدون حساسیت به حروف بزرگ و کوچک است. اعلان فقط به حساب‌های مشخص‌شده ارسال می‌شود.",
      "Recherche insensible à la casse. L'alerte sera remise uniquement aux comptes indiqués.",
      "Groß-/Kleinschreibung wird ignoriert. Die Nachricht geht nur an die angegebenen Konten."
  ],
  "⚡ Уровень важности (Severity)": [
      "⚡ Severity Level",
      "⚡ Nivel de importancia (Severity)",
      "⚡ 重要程度 (Severity)",
      "⚡ مستوى الأهمية (Severity)",
      "⚡ سطح اهمیت (Severity)",
      "⚡ Niveau de gravité (Severity)",
      "⚡ Wichtigkeitsstufe (Severity)"
  ],
  "Заголовок оповещения *": [
      "Alert Title *",
      "Título del aviso *",
      "通知标题 *",
      "عنوان التنبيه *",
      "عنوان اعلان *",
      "Titre de l'alerte *",
      "Titel der Benachrichtigung *"
  ],
  "Текст сообщения *": [
      "Message Body *",
      "Texto del mensaje *",
      "通知正文 *",
      "نص الرسالة *",
      "متن پیام *",
      "Corps du message *",
      "Nachrichtentext *"
  ],
  "👁️ Предпросмотр у пользователя:": [
      "👁️ User-Side Preview:",
      "👁️ Vista previa del usuario:",
      "👁️ 用户端预览：",
      "👁️ معاينة لدى المستخدم:",
      "👁️ پیش‌نمایش سمت کاربر:",
      "👁️ Aperçu côté utilisateur :",
      "👁️ Vorschau beim Nutzer:"
  ],
  "Кэш 24ч": [
      "24h Cache",
      "Caché 24h",
      "24小时缓存",
      "تخزين 24 ساعة",
      "کش ۲۴ ساعته",
      "Cache 24h",
      "24h-Cache"
  ],
  "В журнале пока нет отправленных системных оповещений.": [
      "No system broadcast alerts have been sent yet.",
      "Aún no hay avisos del sistema en el registro.",
      "日志中暂无已发送的系统广播通知。",
      "لا توجد تنبيهات نظام مرسلة في السجل حتى الآن.",
      "هنوز هیچ اعلان سیستمی در گزارش ثبت نشده است.",
      "Aucune alerte système envoyée dans le journal pour le moment.",
      "Noch keine gesendeten Systembenachrichtigungen im Protokoll."
  ],
  "Отозвать": [
      "Revoke",
      "Revocar",
      "撤回",
      "إلغاء",
      "لغو ارسال",
      "Révoquer",
      "Widerrufen"
  ],
  "On-Premise Лицензирование & Защита Интеллектуальной Собственности": [
      "On-Premise Licensing & IP Protection",
      "Licencias On-Premise y Protección de Propiedad Intelectual",
      "On-Premise 许可与知识产权保护",
      "تراخيص On-Premise وحماية الملكية الفكرية",
      "لایسنس On-Premise و حفاظت از مالکیت معنوی",
      "Licences On-Premise & Protection de la Propriété Intellectuelle",
      "On-Premise-Lizenzierung & IP-Schutz"
  ],
  "Автономная криптографическая проверка лицензий (Ed25519) и аппаратная аттестация клиентов": [
      "Offline cryptographic license verification (Ed25519) and client hardware attestation",
      "Verificación criptográfica autónoma de licencias (Ed25519) y atestación de clientes",
      "离线密码学许可证校验 (Ed25519) 与客户端硬件认证",
      "التحقق التشفيري المستقل من التراخيص (Ed25519) وتصديق الأجهزة",
      "بررسی رمزنگاری آفلاین لایسنس (Ed25519) و تایید سخت‌افزاری کلاینت‌ها",
      "Vérification cryptographique autonome des licences (Ed25519) et attestation matérielle",
      "Offline-Lizenzprüfung (Ed25519) und Hardware-Attestierung der Clients"
  ],
  "Текущая лицензия кластера": [
      "Current Cluster License",
      "Licencia actual del clúster",
      "当前集群许可证",
      "ترخيص المجموعة الحالي",
      "لایسنس فعلی کلاستر",
      "Licence actuelle du cluster",
      "Aktuelle Cluster-Lizenz"
  ],
  "Занято мест в кластере:": [
      "Allocated Cluster Seats:",
      "Plazas ocupadas en el clúster:",
      "集群已用席位：",
      "المقاعد المشغولة في المجموعة:",
      "ظرفیت پرشده در کلاستر:",
      "Sièges occupés dans le cluster :",
      "Belegte Plätze im Cluster:"
  ],
  "Доступные модули": [
      "Enabled Modules",
      "Módulos disponibles",
      "已启用模块",
      "الوحدات المتاحة",
      "ماژول‌های فعال",
      "Modules disponibles",
      "Verfügbare Module"
  ],
  "Голос & Видео (Vosk STT)": [
      "Voice & Video (Vosk STT)",
      "Voz y Video (Vosk STT)",
      "语音与视频 (Vosk STT)",
      "الصوت والفيديو (Vosk STT)",
      "صوت و تصویر (Vosk STT)",
      "Voix & Vidéo (Vosk STT)",
      "Sprache & Video (Vosk STT)"
  ],
  "Janus SFU (100+ мест)": [
      "Janus SFU (100+ seats)",
      "Janus SFU (100+ plazas)",
      "Janus SFU（100+ 席位）",
      "Janus SFU (+100 مقعد)",
      "Janus SFU (+۱۰۰ کاربر)",
      "Janus SFU (100+ places)",
      "Janus SFU (100+ Plätze)"
  ],
  "White-Label Брендирование": [
      "White-Label Branding",
      "Marca Blanca (White-Label)",
      "White-Label 品牌定制",
      "علامة تجارية مخصصة (White-Label)",
      "برندسازی اختصاصی (White-Label)",
      "Marque blanche (White-Label)",
      "White-Label-Branding"
  ],
  "Device Attestation Guard (Защита от клонов)": [
      "Device Attestation Guard (Anti-Clone Shield)",
      "Device Attestation Guard (Protección anti-clones)",
      "设备认证护盾（防克隆保护）",
      "حارس تصديق الأجهزة (الحماية من النسخ المزيفة)",
      "سپر اصالت‌سنجی دستگاه (ضد کلون)",
      "Device Attestation Guard (Protection anti-clones)",
      "Device Attestation Guard (Klon-Schutz)"
  ],
  "АКТИВЕН": [
      "ACTIVE",
      "ACTIVO",
      "已启用",
      "نشط",
      "فعال",
      "ACTIF",
      "AKTIV"
  ],
  "Сервер проверяет аппаратные цифровые подписи подключающихся клиентов и блокирует несанкционированные сторонние сборки мессенджера.": [
      "The server verifies hardware digital signatures of connecting clients and blocks unauthorized third-party builds.",
      "El servidor verifica las firmas digitales de los clientes y bloquea compilaciones no autorizadas.",
      "服务器自动校验连接客户端的硬件数字签名，并拦截未授权的第三方篡改版本。",
      "يتحقق الخادم من التوقيعات الرقمية للعملاء المتصلين ويحظر النسخ غير المصرح بها.",
      "سرور امضای دیجیتال کلاینت‌های متصل را بررسی کرده و نسخه‌های غیرمجاز را مسدود می‌کند.",
      "Le serveur vérifie les signatures numériques des clients et bloque les versions tierces non autorisées.",
      "Der Server prüft die digitalen Signaturen der Clients und blockiert nicht autorisierte Drittanbieter-Builds."
  ],
  "Эталонный SHA-256 отпечаток Android Keystore": [
      "Reference Android Keystore SHA-256 Fingerprint",
      "Huella SHA-256 de referencia de Android Keystore",
      "Android Keystore 基准 SHA-256 指纹",
      "بصمة SHA-256 المرجعية لمفتاح أندرويد",
      "اثرانگشت مرجع SHA-256 کلید اندروید",
      "Empreinte SHA-256 de référence Android Keystore",
      "Referenz-SHA-256-Fingerabdruck (Android Keystore)"
  ],
  "Клонов отсечено": [
      "Clones Blocked",
      "Clones bloqueados",
      "已拦截克隆端",
      "النسخ المزيفة المحظورة",
      "کلون‌های مسدودشده",
      "Clones bloqués",
      "Klone blockiert"
  ],
  "Активация On-Premise Ключа": [
      "Activate On-Premise License Key",
      "Activación de clave On-Premise",
      "激活 On-Premise 许可证密钥",
      "تفعيل مفتاح ترخيص On-Premise",
      "فعال‌سازی کلید لایسنس On-Premise",
      "Activation de clé de licence On-Premise",
      "On-Premise-Lizenzschlüssel aktivieren"
  ],
  "Вставьте криптографический лицензионный ключ, предоставленный разработчиком Gossip:": [
      "Paste the cryptographic license key issued by the Gossip team:",
      "Pegue la clave de licencia criptográfica proporcionada por Gossip:",
      "粘贴由 Gossip 团队签发的密码学许可证密钥：",
      "الصق مفتاح الترخيص التشفيري المقدم من مطور Gossip:",
      "کلید لایسنس رمزنگاری‌شده ارائه‌شده توسط تیم Gossip را وارد کنید:",
      "Collez la clé de licence cryptographique fournie par l'équipe Gossip :",
      "Fügen Sie den kryptografischen Lizenzschlüssel von Gossip ein:"
  ],
  "Цифровой ключ лицензии (GSP-LIC-...) *": [
      "Digital License Key (GSP-LIC-...) *",
      "Clave digital de licencia (GSP-LIC-...) *",
      "数字许可证密钥 (GSP-LIC-...) *",
      "مفتاح الترخيص الرقمي (GSP-LIC-...) *",
      "کلید دیجیتال لایسنس (GSP-LIC-...) *",
      "Clé de licence numérique (GSP-LIC-...) *",
      "Digitaler Lizenzschlüssel (GSP-LIC-...) *"
  ],
  "Air-Gapped Соответствие": [
      "Air-Gapped Compliance",
      "Compatibilidad Air-Gapped",
      "Air-Gapped 离线合规",
      "توافق الشبكات المعزولة (Air-Gapped)",
      "سازگاری کامل با شبکه ایزوله (Air-Gapped)",
      "Conformité Air-Gapped",
      "Air-Gapped-Konformität"
  ],
  "Проверка подписи осуществляется математически внутри изолированного контура. Серверу не требуется доступ в глобальный интернет для работы.": [
      "Signature verification is performed mathematically inside the isolated network. The server requires zero external internet access.",
      "La verificación de firma se realiza matemáticamente dentro del entorno aislado sin requerir acceso a internet.",
      "签名验证在隔离内网中通过纯数学运算完成，服务器无需连接外部互联网即可运行。",
      "يتم التحقق من التوقيع رياضياً داخل الشبكة المعزولة دون حاجة للاتصال بالإنترنت.",
      "بررسی امضا به صورت ریاضی در داخل شبکه ایزوله انجام می‌شود و سرور نیازی به اینترنت ندارد.",
      "La vérification de signature s'effectue mathématiquement en circuit fermé sans accès Internet requis.",
      "Die Signaturprüfung erfolgt mathematisch im isolierten Netz. Der Server benötigt keinen Internetzugang."
  ],
  "Безопасность и Управление Мастер-ключом": [
      "Security & Master Key Management",
      "Seguridad y gestión de clave maestra",
      "安全与主密钥管理",
      "الأمان وإدارة المفتاح الرئيسي",
      "امنیت و مدیریت کلید مادر",
      "Sécurité et gestion de la clé maître",
      "Sicherheit & Master-Schlüssel-Verwaltung"
  ],
  "Управление доступом создателя системы, актуализация мастер-пароля и аудит админ-сессий": [
      "System owner access control, master key rotation, and admin session audit",
      "Control de acceso del propietario, rotación de clave maestra y auditoría de sesiones",
      "系统所有者访问控制、主密码轮换与管理员会话审计",
      "إدارة وصول مالك النظام، تحديث كلمة المرور الرئيسية وتدقيق الجلسات",
      "مدیریت دسترسی مالک سیستم، بروزرسانی رمز مادر و ممیزی نشست‌های ادمین",
      "Contrôle d'accès propriétaire, rotation du mot de passe maître et audit des sessions",
      "Zugriffssteuerung des Eigentümers, Master-Passwort-Rotation und Sitzungs-Audit"
  ],
  "Смена Мастер-ключа Администратора": [
      "Rotate Admin Master Key",
      "Cambiar clave maestra de administrador",
      "更换管理员主密钥",
      "تغيير المفتاح الرئيسي للمشرف",
      "تغییر کلید مادر مدیر",
      "Modifier la clé maître administrateur",
      "Admin-Master-Schlüssel ändern"
  ],
  "Текущий мастер-ключ *": [
      "Current Master Key *",
      "Clave maestra actual *",
      "当前主密钥 *",
      "المفتاح الرئيسي الحالي *",
      "کلید مادر فعلی *",
      "Clé maître actuelle *",
      "Aktueller Master-Schlüssel *"
  ],
  "Новый мастер-ключ (мин. 8 символов) *": [
      "New Master Key (min. 8 chars) *",
      "Nueva clave maestra (mín. 8 caracteres) *",
      "新主密钥（至少 8 位）*",
      "المفتاح الرئيسي الجديد (8 أحرف على الأقل) *",
      "کلید مادر جدید (حداقل ۸ کاراکتر) *",
      "Nouvelle clé maître (min. 8 caractères) *",
      "Neuer Master-Schlüssel (mind. 8 Zeichen) *"
  ],
  "Подтвердите новый мастер-ключ *": [
      "Confirm New Master Key *",
      "Confirmar nueva clave maestra *",
      "确认新主密钥 *",
      "تأكيد المفتاح الرئيسي الجديد *",
      "تایید کلید مادر جدید *",
      "Confirmer la nouvelle clé maître *",
      "Neuen Master-Schlüssel bestätigen *"
  ],
  "Защищено": [
      "Protected",
      "Protegido",
      "受保护",
      "محمي",
      "محافظت‌شده",
      "Protégé",
      "Geschützt"
  ],
  "Текущая": [
      "Current",
      "Actual",
      "当前会话",
      "الحالية",
      "نشست فعلی",
      "Actuelle",
      "Aktuell"
  ],
  "Механизм хранения ключа": [
      "Key Storage Mechanism",
      "Mecanismo de almacenamiento de clave",
      "密钥存储机制",
      "آلية تخزين المفتاح",
      "مکانیزم نگهداری کلید",
      "Mécanisme de stockage de clé",
      "Schlüsselspeicher-Mechanismus"
  ],
  "Защита от перебора (Brute-Force Guard)": [
      "Brute-Force Guard",
      "Protección contra fuerza bruta (Brute-Force Guard)",
      "防暴力破解护盾 (Brute-Force Guard)",
      "الحماية من التخمين (Brute-Force Guard)",
      "محافظت در برابر حملات Brute-Force",
      "Protection anti-force brute (Brute-Force Guard)",
      "Brute-Force-Schutz"
  ],
  "Заблокировано IP адресов:": [
      "Blocked IP addresses:",
      "Direcciones IP bloqueadas:",
      "已封禁 IP 地址数：",
      "عناوين IP المحظورة:",
      "آدرس‌های IP مسدودشده:",
      "Adresses IP bloquées :",
      "Blockierte IP-Adressen:"
  ],
  "(лимит 5 попыток / 15 мин).": [
      "(limit: 5 attempts / 15 min).",
      "(límite: 5 intentos / 15 min).",
      "（限制：15 分钟内最多 5 次尝试）。",
      "(الحد: 5 محاولات / 15 دقيقة).",
      "(محدودیت: ۵ تلاش در ۱۵ دقیقه).",
      "(limite : 5 tentatives / 15 min).",
      "(Limit: 5 Versuche / 15 Min.)."
  ],
  "Авторизованный аккаунт создателя": [
      "Authorized Creator Account",
      "Cuenta autorizada del creador",
      "已授权的系统创建者账户",
      "حساب المؤسس المصرح له",
      "حساب مجاز سازنده سیستم",
      "Compte créateur autorisé",
      "Autorisiertes Entwicklerkonto"
  ],
  "Заполните все поля формы": [
      "Please fill in all required fields",
      "Complete todos los campos del formulario",
      "请填写所有必填字段",
      "يرجى ملء جميع الحقول",
      "لطفاً تمام فیلدهای فرم را پر کنید",
      "Veuillez remplir tous les champs",
      "Bitte füllen Sie alle Felder aus"
  ],
  "Новый мастер-ключ должен содержать минимум 8 символов": [
      "New master key must be at least 8 characters long",
      "La nueva clave maestra debe tener al menos 8 caracteres",
      "新主密钥长度至少为 8 个字符",
      "يجب أن يتكون المفتاح الجديد من 8 أحرف على الأقل",
      "کلید مادر جدید باید حداقل ۸ کاراکتر باشد",
      "La nouvelle clé maître doit comporter au moins 8 caractères",
      "Der neue Master-Schlüssel muss mindestens 8 Zeichen lang sein"
  ],
  "Новый пароль и подтверждение не совпадают": [
      "New password and confirmation do not match",
      "La nueva contraseña y la confirmación no coinciden",
      "新密码与确认密码不一致",
      "كلمة المرور الجديدة وتأكيدها غير متطابقين",
      "رمز جدید و تکرار آن مطابقت ندارند",
      "Le nouveau mot de passe et la confirmation ne correspondent pas",
      "Neues Passwort und Bestätigung stimmen nicht überein"
  ],
  "Мастер-ключ администратора успешно обновлён!": [
      "Admin master key updated successfully!",
      "¡Clave maestra de administrador actualizada con éxito!",
      "管理员主密钥已成功更新！",
      "تم تحديث المفتاح الرئيسي للمشرف بنجاح!",
      "کلید مادر مدیر با موفقیت بروزرسانی شد!",
      "Clé maître administrateur mise à jour avec succès !",
      "Admin-Master-Schlüssel erfolgreich aktualisiert!"
  ],
  "Мастер-пароль администратора успешно изменен!": [
      "Admin master password changed successfully!",
      "¡Contraseña maestra cambiada con éxito!",
      "管理员主密码修改成功！",
      "تم تغيير كلمة المرور الرئيسية بنجاح!",
      "رمز مادر مدیر با موفقیت تغییر یافت!",
      "Mot de passe maître modifié avec succès !",
      "Admin-Master-Passwort erfolgreich geändert!"
  ],
  "Не удалось сменить мастер-пароль": [
      "Failed to change master password",
      "No se pudo cambiar la contraseña maestra",
      "修改主密码失败",
      "تعذر تغيير كلمة المرور الرئيسية",
      "تغییر رمز مادر ناموفق بود",
      "Échec du changement de mot de passe maître",
      "Master-Passwort konnte nicht geändert werden"
  ],
  "Ошибка подключения к серверу управления": [
      "Failed to connect to the management server",
      "Error de conexión con el servidor de administración",
      "连接管理服务器失败",
      "خطأ في الاتصال بخادم الإدارة",
      "خطا در اتصال به سرور مدیریت",
      "Erreur de connexion au serveur de gestion",
      "Verbindungsfehler zum Verwaltungsserver"
  ],
  "Настройки шлюзов обновлены": [
      "Gateway settings updated",
      "Configuración de pasarelas actualizada",
      "网关设置已更新",
      "تم تحديث إعدادات البوابات",
      "تنظیمات درگاه‌ها بروزرسانی شد",
      "Paramètres des passerelles mis à jour",
      "Gateway-Einstellungen aktualisiert"
  ],
  "Ошибка сохранения настроек шлюзов": [
      "Failed to save gateway settings",
      "Error al guardar la configuración de pasarelas",
      "保存网关设置失败",
      "خطأ في حفظ إعدادات البوابات",
      "خطا در ذخیره تنظیمات درگاه‌ها",
      "Erreur d'enregistrement des passerelles",
      "Fehler beim Speichern der Gateway-Einstellungen"
  ],
  "Ошибка связи с сервером": [
      "Server communication error",
      "Error de comunicación con el servidor",
      "与服务器通信失败",
      "خطأ في الاتصال بالخادم",
      "خطا در ارتباط با سرور",
      "Erreur de communication avec le serveur",
      "Verbindungsfehler zum Server"
  ],
  "Ошибка рассылки сигнала обновления": [
      "Failed to broadcast update signal",
      "Error al difundir la señal de actualización",
      "广播更新信号失败",
      "خطأ في بث إشارة التحديث",
      "خطا در ارسال سیگنال بروزرسانی",
      "Erreur de diffusion du signal de mise à jour",
      "Fehler beim Senden des Update-Signals"
  ],
  "Для подтверждения гостевого счета укажите логин получателя": [
      "Specify recipient username to approve a guest invoice",
      "Indique el usuario destinatario para confirmar una factura de invitado",
      "确认访客账单前请指定接收方用户名",
      "حدد اسم مستخدم المستلم لتأكيد فاتورة الضيف",
      "برای تایید فاکتور مهمان، نام کاربری گیرنده را مشخص کنید",
      "Indiquez le nom d'utilisateur bénéficiaire pour valider la facture invité",
      "Geben Sie den Empfänger-Benutzernamen an, um die Gastrechnung zu bestätigen"
  ],
  "Ошибка подтверждения заказа": [
      "Failed to approve order",
      "Error al confirmar el pedido",
      "确认订单失败",
      "خطأ في تأكيد الطلب",
      "خطا در تایید سفارش",
      "Erreur de confirmation de la commande",
      "Fehler bei der Bestellbestätigung"
  ],
  "Заполните компанию, контактное лицо и способ связи": [
      "Please enter company name, contact person, and contact channel",
      "Complete empresa, persona de contacto y canal de comunicación",
      "请填写公司名称、联系人及联系方式",
      "يرجى إدخال اسم الشركة، جهة الاتصال ووسيلة التواصل",
      "لطفاً نام شرکت، شخص رابط و راه ارتباطی را وارد کنید",
      "Veuillez renseigner l'entreprise, le contact et le canal",
      "Bitte Unternehmen, Ansprechpartner und Kontaktweg angeben"
  ],
  "Корпоративная B2B заявка добавлена": [
      "Enterprise B2B lead added",
      "Solicitud corporativa B2B añadida",
      "已添加企业 B2B 线索",
      "تمت إضافة طلب B2B المؤسسي",
      "درخواست سازمانی B2B اضافه شد",
      "Prospect B2B ajouté",
      "B2B-Unternehmensanfrage hinzugefügt"
  ],
  "Ошибка создания заявки": [
      "Failed to create lead",
      "Error al crear la solicitud",
      "创建线索失败",
      "خطأ في إنشاء الطلب",
      "خطا در ایجاد درخواست",
      "Erreur de création de la demande",
      "Fehler beim Erstellen der Anfrage"
  ],
  "Ошибка сохранения заметки": [
      "Failed to save note",
      "Error al guardar la nota",
      "保存备注失败",
      "خطأ في حفظ الملاحظة",
      "خطا در ذخیره یادداشت",
      "Erreur d'enregistrement de la note",
      "Fehler beim Speichern der Notiz"
  ],
  "Оповещение отозвано из активной раздачи": [
      "Broadcast alert revoked from active distribution",
      "Aviso revocado de la distribución activa",
      "已从活跃分发列表中撤回该广播通知",
      "تم سحب التنبيه من التوزيع النشط",
      "اعلان از توزیع فعال لغو شد",
      "Alerte retirée de la diffusion active",
      "Benachrichtigung aus aktiver Verteilung widerrufen"
  ],
  "Не удалось удалить оповещение": [
      "Failed to delete broadcast alert",
      "No se pudo eliminar el aviso",
      "删除广播通知失败",
      "تعذر حذف التنبيه",
      "حذف اعلان ناموفق بود",
      "Impossible de supprimer l'alerte",
      "Benachrichtigung konnte nicht gelöscht werden"
  ],
  "Другие сессии завершены": [
      "Other sessions terminated",
      "Otras sesiones cerradas",
      "其他会话已终止",
      "تم إنهاء الجلسات الأخرى",
      "سایر نشست‌ها بسته شدند",
      "Autres sessions terminées",
      "Andere Sitzungen beendet"
  ],
  "Ошибка отзыва сессий": [
      "Failed to revoke sessions",
      "Error al revocar sesiones",
      "撤销会话失败",
      "خطأ في إلغاء الجلسات",
      "خطا در لغو نشست‌ها",
      "Erreur de révocation des sessions",
      "Fehler beim Widerrufen der Sitzungen"
  ],
  "Ошибка обновления статуса": [
      "Failed to update status",
      "Error al actualizar el estado",
      "更新状态失败",
      "خطأ في تحديث الحالة",
      "خطا در بروزرسانی وضعیت",
      "Erreur de mise à jour du statut",
      "Status konnte nicht aktualisiert werden"
  ],
  "Сессии успешно отозваны": [
      "Sessions revoked successfully",
      "Sesiones revocadas con éxito",
      "会话已成功撤销",
      "تم إلغاء الجلسات بنجاح",
      "نشست‌ها با موفقیت لغو شدند",
      "Sessions révoquées avec succès",
      "Sitzungen erfolgreich widerrufen"
  ],
  "Ошибка сброса сессий": [
      "Failed to reset sessions",
      "Error al restablecer sesiones",
      "重置会话失败",
      "خطأ في إعادة ضبط الجلسات",
      "خطا در بازنشانی نشست‌ها",
      "Erreur de réinitialisation des sessions",
      "Fehler beim Zurücksetzen der Sitzungen"
  ],
  "Gossip Premium активирован (30 дней)": [
      "Gossip Premium activated (30 days)",
      "Gossip Premium activado (30 días)",
      "已激活 Gossip Premium（30 天）",
      "تم تفعيل Gossip Premium (30 يوماً)",
      "اشتراک Gossip Premium فعال شد (۳۰ روز)",
      "Gossip Premium activé (30 jours)",
      "Gossip Premium aktiviert (30 Tage)"
  ],
  "Статус Gossip Premium снят": [
      "Gossip Premium status removed",
      "Estado Gossip Premium retirado",
      "已移除 Gossip Premium 状态",
      "تمت إزالة حالة Gossip Premium",
      "وضعیت Gossip Premium برداشته شد",
      "Statut Gossip Premium retiré",
      "Gossip Premium-Status entfernt"
  ],
  "Ошибка удаления пользователя": [
      "Failed to delete user",
      "Error al eliminar el usuario",
      "删除用户失败",
      "خطأ في حذف المستخدم",
      "خطا در حذف کاربر",
      "Erreur de suppression de l'utilisateur",
      "Fehler beim Löschen des Benutzers"
  ],
  "Ошибка связи с сервером при удалении": [
      "Server communication error during deletion",
      "Error de conexión al eliminar",
      "删除时与服务器通信失败",
      "خطأ اتصال بالخادم أثناء الحذف",
      "خطای ارتباط با سرور هنگام حذف",
      "Erreur serveur lors de la suppression",
      "Serverfehler beim Löschen"
  ],
  "Тестовые боты не обнаружены": [
      "No test bots found",
      "No se detectaron bots de prueba",
      "未发现测试机器人",
      "لم يتم العثور على بوتات اختبار",
      "ربات آزمایشی یافت نشد",
      "Aucun bot de test détecté",
      "Keine Test-Bots gefunden"
  ],
  "Ошибка очистки ботов": [
      "Failed to purge test bots",
      "Error al limpiar bots",
      "清理测试机器人失败",
      "خطأ في تنظيف البوتات",
      "خطا در پاکسازی ربات‌ها",
      "Erreur de nettoyage des bots",
      "Fehler beim Bereinigen der Bots"
  ],
  "Ошибка связи с сервером при очистке": [
      "Server error during cleanup",
      "Error de conexión durante la limpieza",
      "清理时服务器通信失败",
      "خطأ اتصال أثناء التنظيف",
      "خطای ارتباط با سرور هنگام پاکسازی",
      "Erreur serveur lors du nettoyage",
      "Serverfehler bei der Bereinigung"
  ],
  "Ошибка удаления заказа": [
      "Failed to delete order",
      "Error al eliminar el pedido",
      "删除订单失败",
      "خطأ في حذف الطلب",
      "خطا در حذف سفارش",
      "Erreur de suppression de la commande",
      "Fehler beim Löschen der Bestellung"
  ],
  "Нет неоплаченных или отмененных заявок": [
      "No unpaid or canceled orders found",
      "No hay pedidos impagados o cancelados",
      "没有未支付或已取消的订单",
      "لا توجد طلبات غير مدفوعة أو ملغاة",
      "سفارش پرداخت‌نشده یا لغوشده‌ای وجود ندارد",
      "Aucune commande impayée ou annulée",
      "Keine unbezahlten oder stornierten Bestellungen"
  ],
  "Ошибка очистки заявок": [
      "Failed to purge orders",
      "Error al limpiar solicitudes",
      "清理订单失败",
      "خطأ في تنظيف الطلبات",
      "خطا در پاکسازی سفارش‌ها",
      "Erreur de nettoyage des demandes",
      "Fehler beim Bereinigen der Anfragen"
  ],
  "Ошибка удаления заявки": [
      "Failed to delete lead",
      "Error al eliminar la solicitud",
      "删除线索失败",
      "خطأ في حذف الطلب",
      "خطا در حذف درخواست",
      "Erreur de suppression de la demande",
      "Fehler beim Löschen der Anfrage"
  ],
  "Очистить все тестовые QA заявки формы (QA стресс-тесты)?": [
      "Purge all QA stress-test leads?",
      "¿Limpiar todas las solicitudes de prueba QA?",
      "是否清理所有 QA 压力测试线索？",
      "هل تريد مسح جميع طلبات اختبار QA؟",
      "آیا تمام درخواست‌های آزمایشی QA پاکسازی شوند؟",
      "Supprimer toutes les demandes de test QA ?",
      "Alle QA-Testanfragen bereinigen?"
  ],
  "Ошибка очистки тестовых заявок": [
      "Failed to purge QA leads",
      "Error al limpiar solicitudes de prueba",
      "清理测试线索失败",
      "خطأ في تنظيف طلبات الاختبار",
      "خطا در پاکسازی درخواست‌های آزمایشی",
      "Erreur de suppression des demandes de test",
      "Fehler beim Bereinigen der Testanfragen"
  ],
  "Заполните заголовок и текст системного оповещения": [
      "Please enter both title and message for the broadcast alert",
      "Complete el título y el texto del aviso del sistema",
      "请填写系统广播的标题与正文",
      "يرجى إدخال عنوان ونص تنبيه النظام",
      "لطفاً عنوان و متن اعلان سیستمی را وارد کنید",
      "Veuillez remplir le titre et le texte de l'alerte",
      "Bitte Titel und Text der Systembenachrichtigung eingeben"
  ],
  "Укажите никнеймы пользователей через запятую": [
      "Please enter comma-separated usernames",
      "Indique los nombres de usuario separados por comas",
      "请输入以逗号分隔的用户名",
      "أدخل أسماء المستخدمين مفصولة بفواصل",
      "نام‌های کاربری را با ویرگول وارد کنید",
      "Indiquez les noms d'utilisateur séparés par des virgules",
      "Bitte Benutzernamen kommagetrennt eingeben"
  ],
  "Оповещение успешно отправлено": [
      "Broadcast alert sent successfully",
      "Aviso enviado con éxito",
      "系统广播已成功发送",
      "تم إرسال التنبيه بنجاح",
      "اعلان با موفقیت ارسال شد",
      "Alerte envoyée avec succès",
      "Benachrichtigung erfolgreich gesendet"
  ],
  "Системное оповещение доставлено и сохранено в журнале": [
      "System broadcast delivered and logged",
      "Aviso del sistema entregado y guardado en el registro",
      "系统通知已送达并记录至日志",
      "تم تسليم تنبيه النظام وحفظه في السجل",
      "اعلان سیستمی تحویل داده شد و در گزارش ثبت گردید",
      "Alerte système diffusée et enregistrée dans le journal",
      "Systembenachrichtigung zugestellt und protokolliert"
  ],
  "Ошибка отправки оповещения": [
      "Failed to send broadcast alert",
      "Error al enviar el aviso",
      "发送广播通知失败",
      "خطأ في إرسال التنبيه",
      "خطا در ارسال اعلان",
      "Erreur d'envoi de l'alerte",
      "Fehler beim Senden der Benachrichtigung"
  ],
  "Лицензия успешно активирована": [
      "License activated successfully",
      "Licencia activada con éxito",
      "许可证已成功激活",
      "تم تفعيل الترخيص بنجاح",
      "لایسنس با موفقیت فعال شد",
      "Licence activée avec succès",
      "Lizenz erfolgreich aktiviert"
  ],
  "Ошибка активации лицензии": [
      "License activation failed",
      "Error al activar la licencia",
      "许可证激活失败",
      "خطأ في تفعيل الترخيص",
      "خطا در فعال‌سازی لایسنس",
      "Échec de l'activation de la licence",
      "Fehler bei der Lizenzaktivierung"
  ],
  "Ошибка связи с сервером при активации": [
      "Server communication error during license activation",
      "Error de conexión al activar la licencia",
      "激活时与服务器通信失败",
      "خطأ اتصال بالخادم أثناء التفعيل",
      "خطای ارتباط با سرور هنگام فعال‌سازی",
      "Erreur serveur lors de l'activation",
      "Serverfehler bei der Aktivierung"
  ],
  "Выйти из консоли": [
      "Sign Out of Console",
      "Salir de la consola",
      "退出控制台",
      "الخروج من وحدة التحكم",
      "خروج از کنسول",
      "Quitter la console",
      "Konsole verlassen"
  ],
  "Проверка ключа...": [
      "Verifying key...",
      "Verificando clave...",
      "正在校验密钥...",
      "جارٍ التحقق من المفتاح...",
      "در حال بررسی کلید...",
      "Vérification de la clé...",
      "Schlüssel wird geprüft..."
  ],
  "Войти в панель управления": [
      "Sign In to Control Panel",
      "Entrar al panel de control",
      "进入控制面板",
      "الدخول إلى لوحة التحكم",
      "ورود به پنل مدیریت",
      "Accéder au panneau de contrôle",
      "Zum Kontrollpanel anmelden"
  ],
  "Обновить данные": [
      "Refresh Data",
      "Actualizar datos",
      "刷新数据",
      "تحديث البيانات",
      "بروزرسانی داده‌ها",
      "Actualiser les données",
      "Daten aktualisieren"
  ],
  "Рассылка...": [
      "Broadcasting...",
      "Difundiendo...",
      "正在广播...",
      "جارٍ البث...",
      "در حال ارسال...",
      "Diffusion...",
      "Wird gesendet..."
  ],
  "Разослать сигнал обновления APK": [
      "Broadcast APK Update Signal",
      "Difundir señal de actualización APK",
      "广播 APK 更新信号",
      "بث إشارة تحديث APK",
      "ارسال سیگنال بروزرسانی APK",
      "Diffuser le signal de mise à jour APK",
      "APK-Update-Signal senden"
  ],
  "Скрыть настройки шлюзов": [
      "Hide Gateway Settings",
      "Ocultar ajustes de pasarelas",
      "隐藏网关设置",
      "إخفاء إعدادات البوابات",
      "پنهان کردن تنظیمات درگاه‌ها",
      "Masquer les paramètres des passerelles",
      "Gateway-Einstellungen ausblenden"
  ],
  "⚙️ Настроить ключи ЮKassa и TON": [
      "⚙️ Configure YooKassa & TON Keys",
      "⚙️ Configurar claves de YooKassa y TON",
      "⚙️ 配置 YooKassa 与 TON 密钥",
      "⚙️ إعداد مفاتيح YooKassa و TON",
      "⚙️ تنظیم کلیدهای YooKassa و TON",
      "⚙️ Configurer les clés YooKassa et TON",
      "⚙️ YooKassa- & TON-Schlüssel konfigurieren"
  ],
  "Резервная ссылка активна": [
      "Fallback Link Active",
      "Enlace alternativo activo",
      "备用链接已启用",
      "الرابط الاحتياطي نشط",
      "لینک پشتیبان فعال است",
      "Lien de secours actif",
      "Fallback-Link aktiv"
  ],
  "Ожидает включения в ЮKassa": [
      "Pending YooKassa Activation",
      "Pendiente de activación en YooKassa",
      "等待 YooKassa 激活",
      "بانتظار التفعيل في YooKassa",
      "در انتظار فعال‌سازی در YooKassa",
      "En attente d'activation YooKassa",
      "Wartet auf YooKassa-Aktivierung"
  ],
  "не задан": [
      "not set",
      "no definido",
      "未设置",
      "غير محدد",
      "تنظیم نشده",
      "non défini",
      "nicht festgelegt"
  ],
  "Оставьте пустым, чтобы не менять...": [
      "Leave blank to keep current...",
      "Dejar en blanco para no cambiar...",
      "留空则保持不变...",
      "اتركه فارغاً لعدم التغيير...",
      "برای عدم تغییر خالی بگذارید...",
      "Laisser vide pour ne pas modifier...",
      "Leer lassen, um nichts zu ändern..."
  ],
  "Сохранение и проверка...": [
      "Saving & verifying...",
      "Guardando y verificando...",
      "正在保存并校验...",
      "جارٍ الحفظ والتحقق...",
      "در حال ذخیره و بررسی...",
      "Enregistrement et vérification...",
      "Speichern und prüfen..."
  ],
  "Сохранить настройки шлюзов": [
      "Save Gateway Settings",
      "Guardar ajustes de pasarelas",
      "保存网关设置",
      "حفظ إعدادات البوابات",
      "ذخیره تنظیمات درگاه‌ها",
      "Enregistrer les paramètres des passerelles",
      "Gateway-Einstellungen speichern"
  ],
  "Очистка...": [
      "Purging...",
      "Limpiando...",
      "正在清理...",
      "جارٍ التنظيف...",
      "در حال پاکسازی...",
      "Nettoyage...",
      "Wird bereinigt..."
  ],
  "Ожидание": [
      "Pending",
      "Pendiente",
      "等待中",
      "قيد الانتظار",
      "در انتظار",
      "En attente",
      "Ausstehend"
  ],
  "ЮKassa (СБП)": [
      "YooKassa (SBP)",
      "YooKassa (SBP)",
      "YooKassa (快速支付)",
      "YooKassa (تحويل فوري)",
      "YooKassa (پرداخت آنی)",
      "YooKassa (SBP)",
      "YooKassa (SBP)"
  ],
  "Привязать и выдать": [
      "Bind & Grant",
      "Vincular y otorgar",
      "绑定并授予",
      "ربط ومنح",
      "اتصال و اعطا",
      "Associer et accorder",
      "Verknüpfen & vergeben"
  ],
  "Подтвердить": [
      "Confirm",
      "Confirmar",
      "确认",
      "تأكيد",
      "تایید",
      "Confirmer",
      "Bestätigen"
  ],
  "Подтвердить заказ и активировать Premium": [
      "Approve order & activate Premium",
      "Confirmar pedido y activar Premium",
      "确认订单并激活 Premium",
      "تأكيد الطلب وتفعيل Premium",
      "تایید سفارش و فعال‌سازی Premium",
      "Confirmer la commande et activer Premium",
      "Bestellung bestätigen & Premium aktivieren"
  ],
  "Привязать @user": [
      "Bind @user",
      "Vincular @usuario",
      "绑定 @用户",
      "ربط @مستخدم",
      "اتصال @کاربر",
      "Associer @user",
      "@user verknüpfen"
  ],
  "Удалить запись заказа": [
      "Delete order record",
      "Eliminar registro de pedido",
      "删除订单记录",
      "حذف سجل الطلب",
      "حذف رکورد سفارش",
      "Supprimer l'entrée de commande",
      "Bestelleintrag löschen"
  ],
  "✕ Закрыть форму": [
      "✕ Close Form",
      "✕ Cerrar formulario",
      "✕ 关闭表单",
      "✕ إغلاق النموذج",
      "✕ بستن فرم",
      "✕ Fermer le formulaire",
      "✕ Formular schließen"
  ],
  "+ Добавить B2B заявку": [
      "+ Add B2B Lead",
      "+ Añadir solicitud B2B",
      "+ 添加 B2B 线索",
      "+ إضافة طلب B2B",
      "+ افزودن درخواست B2B",
      "+ Ajouter un prospect B2B",
      "+ B2B-Anfrage hinzufügen"
  ],
  "Очистить тестовые": [
      "Purge Test Leads",
      "Limpiar pruebas",
      "清理测试数据",
      "مسح البيانات التجريبية",
      "پاکسازی تست‌ها",
      "Purger les tests",
      "Testdaten löschen"
  ],
  "Компания (напр. АО ТехноПром) *": [
      "Company (e.g. Acme Corp) *",
      "Empresa (ej. TechnoProm S.A.) *",
      "公司名称（如：某科技有限公司）*",
      "الشركة (مثال: شركة التقنية) *",
      "نام شرکت (مثلاً شرکت تکنوپرام) *",
      "Entreprise (ex. TechnoProm SA) *",
      "Unternehmen (z. B. TechnoProm AG) *"
  ],
  "Контактное лицо *": [
      "Contact Person *",
      "Persona de contacto *",
      "联系人姓名 *",
      "الشخص المسؤول *",
      "شخص رابط *",
      "Personne de contact *",
      "Ansprechpartner *"
  ],
  "Telegram / Телефон / Email *": [
      "Telegram / Phone / Email *",
      "Telegram / Teléfono / Email *",
      "Telegram / 电话 / 邮箱 *",
      "تيليجرام / هاتف / بريد إلكتروني *",
      "تلگرام / تلفن / ایمیل *",
      "Telegram / Téléphone / Email *",
      "Telegram / Telefon / E-Mail *"
  ],
  "Комментарий / Заметка...": [
      "Comment / CRM Note...",
      "Comentario / Nota...",
      "备注说明...",
      "تعليق / ملاحظة...",
      "توضیحات / یادداشت...",
      "Commentaire / Note...",
      "Kommentar / Notiz..."
  ],
  "Сохранить заявку": [
      "Save Lead",
      "Guardar solicitud",
      "保存线索",
      "حفظ الطلب",
      "ذخیره درخواست",
      "Enregistrer la demande",
      "Anfrage speichern"
  ],
  "Заметка...": [
      "Note...",
      "Nota...",
      "备注...",
      "ملاحظة...",
      "یادداشت...",
      "Note...",
      "Notiz..."
  ],
  "Нажмите, чтобы добавить заметку": [
      "Click to add note",
      "Haga clic para añadir una nota",
      "点击添加备注",
      "اضغط لإضافة ملاحظة",
      "برای افزودن یادداشت کلیک کنید",
      "Cliquez pour ajouter une note",
      "Klicken, um Notiz hinzuzufügen"
  ],
  "Удалить заявку": [
      "Delete Lead",
      "Eliminar solicitud",
      "删除线索",
      "حذف الطلب",
      "حذف درخواست",
      "Supprimer la demande",
      "Anfrage löschen"
  ],
  "Поиск по логину...": [
      "Search by username...",
      "Buscar por usuario...",
      "按用户名搜索...",
      "البحث باسم المستخدم...",
      "جستجو با نام کاربری...",
      "Rechercher par pseudo...",
      "Suche nach Benutzername..."
  ],
  "Снять Premium": [
      "Revoke Premium",
      "Quitar Premium",
      "取消 Premium",
      "إلغاء Premium",
      "لغو Premium",
      "Retirer Premium",
      "Premium entziehen"
  ],
  "Выдать Premium": [
      "Grant Premium",
      "Otorgar Premium",
      "授予 Premium",
      "منح Premium",
      "اعطای Premium",
      "Accorder Premium",
      "Premium vergeben"
  ],
  "Нет ключей": [
      "No keys",
      "Sin claves",
      "无密钥",
      "بدون مفاتيح",
      "بدون کلید",
      "Aucune clé",
      "Keine Schlüssel"
  ],
  "Снять Premium статус": [
      "Remove Premium status",
      "Retirar estado Premium",
      "移除 Premium 身份",
      "إزالة حالة Premium",
      "حذف وضعیت Premium",
      "Retirer le statut Premium",
      "Premium-Status entfernen"
  ],
  "Активировать Premium на 30 дней": [
      "Activate Premium for 30 days",
      "Activar Premium por 30 días",
      "激活 30 天 Premium",
      "تفعيل Premium لمدة 30 يوماً",
      "فعال‌سازی Premium به مدت ۳۰ روز",
      "Activer Premium pour 30 jours",
      "Premium für 30 Tage aktivieren"
  ],
  "Снять PRO": [
      "Remove PRO",
      "Quitar PRO",
      "取消 PRO",
      "إلغاء PRO",
      "حذف PRO",
      "Retirer PRO",
      "PRO entziehen"
  ],
  "Сбросить все сессии пользователя": [
      "Terminate all user sessions",
      "Cerrar todas las sesiones del usuario",
      "终止该用户的所有会话",
      "إنهاء جميع جلسات المستخدم",
      "بستن تمام نشست‌های کاربر",
      "Réinitialiser toutes les sessions",
      "Alle Sitzungen des Benutzers beenden"
  ],
  "Отправка...": [
      "Sending...",
      "Enviando...",
      "发送中...",
      "جارٍ الإرسال...",
      "در حال ارسال...",
      "Envoi...",
      "Wird gesendet..."
  ],
  "Отправить оповещение": [
      "Send Alert",
      "Enviar aviso",
      "发送通知",
      "إرسال التنبيه",
      "ارسال اعلان",
      "Envoyer l'alerte",
      "Benachrichtigung senden"
  ],
  "🚀 Обновление APK": [
      "🚀 APK Update",
      "🚀 Actualización APK",
      "🚀 APK 更新",
      "🚀 تحديث APK",
      "🚀 بروزرسانی APK",
      "🚀 Mise à jour APK",
      "🚀 APK-Update"
  ],
  "Выпущена новая версия приложения с улучшенной стабильностью аудио/видео и ускоренной синхронизацией E2EE ключей. Рекомендуем обновить приложение.": [
      "A new version of Gossip is live with enhanced audio/video stability and faster E2EE key sync. We recommend updating now.",
      "Nueva versión disponible con mayor estabilidad de audio/video y sincronización E2EE más rápida. Recomendamos actualizar.",
      "新版本已发布，显著提升了音视频稳定性并加速了端到端密钥同步，建议立即更新应用。",
      "تم إصدار نسخة جديدة مع تحسين استقرار الصوت والفيديو وتسريع مزامنة مفاتيح التشفير. نوصي بالتحديث.",
      "نسخه جدید برنامه با پایداری بیشتر صوت و تصویر و همگام‌سازی سریع‌تر کلیدهای E2EE منتشر شد.",
      "Une nouvelle version est disponible avec une stabilité audio/vidéo améliorée et une synchronisation E2EE accélérée.",
      "Eine neue Version mit verbesserter Audio-/Video-Stabilität und schnellerer E2EE-Synchronisierung ist verfügbar."
  ],
  "🛠️ Техработы": [
      "🛠️ Maintenance",
      "🛠️ Mantenimiento",
      "🛠️ 维护通知",
      "🛠️ صيانة",
      "🛠️ تعمیرات فنی",
      "🛠️ Maintenance",
      "🛠️ Wartung"
  ],
  "Плановое обслуживание узлов кластера": [
      "Scheduled Cluster Node Maintenance",
      "Mantenimiento programado de nodos del clúster",
      "集群节点例行维护通知",
      "صيانة مجدولة لعقد المجموعة",
      "سرویس دوره‌ای گره‌های کلاستر",
      "Maintenance planifiée des nœuds du cluster",
      "Geplante Wartung der Cluster-Knoten"
  ],
  "В ближайшие 15 минут возможны кратковременные переподключения WebSocket-шлюзов в связи с обновлением серверного ядра.": [
      "Brief WebSocket gateway reconnections may occur over the next 15 minutes due to a core server upgrade.",
      "Durante los próximos 15 minutos pueden producirse breves reconexiones WebSocket por actualización del núcleo.",
      "未来 15 分钟内由于服务器核心升级，WebSocket 网关可能会出现短暂重连。",
      "قد تحدث إعادة اتصال قصيرة لبوابات WebSocket خلال الـ 15 دقيقة القادمة بسبب تحديث النواة.",
      "در ۱۵ دقیقه آینده به دلیل ارتقای هسته سرور، احتمال اتصال مجدد کوتاه‌مدت درگاه‌های WebSocket وجود دارد.",
      "De brèves reconnexions WebSocket peuvent survenir dans les 15 prochaines minutes en raison d'une mise à jour du noyau.",
      "In den nächsten 15 Minuten kann es wegen eines Kern-Updates zu kurzen WebSocket-Neuverbindungen kommen."
  ],
  "🚨 Экстренный алерт": [
      "🚨 Urgent Alert",
      "🚨 Alerta urgente",
      "🚨 紧急警报",
      "🚨 تنبيه طارئ",
      "🚨 هشدار فوری",
      "🚨 Alerte urgente",
      "🚨 Notfall-Warnung"
  ],
  "Важное системное уведомление безопасности": [
      "Important System Security Advisory",
      "Aviso importante de seguridad del sistema",
      "重要系统安全通知",
      "إشعار أمني هام للنظام",
      "اطلاعیه امنیتی مهم سیستم",
      "Avis de sécurité système important",
      "Wichtige Systemsicherheitsmeldung"
  ],
  "Пожалуйста, проверьте актуальность версии приложения и убедитесь, что вы используете официальную сборку Gossip.": [
      "Please verify your app version is up to date and ensure you are running an official signed Gossip build.",
      "Verifique que su versión esté actualizada y asegúrese de utilizar la compilación oficial de Gossip.",
      "请检查您的应用是否为最新版本，并确保使用的是 Gossip 官方签名安装包。",
      "يرجى التحقق من تحديث التطبيق والتأكد من استخدام النسخة الرسمية الموقعة من Gossip.",
      "لطفاً از بروز بودن نسخه برنامه و استفاده از نسخه رسمی امضاشده Gossip اطمینان حاصل کنید.",
      "Veuillez vérifier que votre application est à jour et que vous utilisez une version officielle signée Gossip.",
      "Bitte prüfen Sie Ihre App-Version und stellen Sie sicher, dass Sie einen offiziell signierten Gossip-Build nutzen."
  ],
  "🎉 Новые функции": [
      "🎉 New Features",
      "🎉 Nuevas funciones",
      "🎉 新功能发布",
      "🎉 ميزات جديدة",
      "🎉 قابلیت‌های جدید",
      "🎉 Nouveautés",
      "🎉 Neue Funktionen"
  ],
  "Новые возможности Gossip": [
      "What's New in Gossip",
      "Nuevas capacidades de Gossip",
      "Gossip 全新功能",
      "إمكانيات Gossip الجديدة",
      "امکانات جدید Gossip",
      "Nouvelles fonctionnalités Gossip",
      "Neue Möglichkeiten in Gossip"
  ],
  "Добавлена кроссплатформенная поддержка медиакодеков iOS/Android и мгновенное переключение камер при записи видеокружков!": [
      "Added cross-platform iOS/Android media codec support and instant camera switching while recording video notes!",
      "¡Soporte multiplataforma de códecs iOS/Android y cambio instantáneo de cámara al grabar videonotas!",
      "新增 iOS/Android 跨平台媒体编解码支持，并在录制圆形视频消息时支持即时切换前后摄像头！",
      "تمت إضافة دعم ترميز الوسائط عبر iOS/Android والتبديل الفوري للكاميرا أثناء تسجيل رسائل الفيديو الدائرية!",
      "پشتیبانی چندپلتفرمی کدک‌های صوتی/تصویری iOS/Android و تغییر آنی دوربین هنگام ضبط ویدیو مسیج اضافه شد!",
      "Ajout du support codec multiplateforme iOS/Android et changement instantané de caméra pendant les notes vidéo !",
      "Plattformübergreifende iOS/Android-Codec-Unterstützung und sofortiger Kamerawechsel bei Videonachrichten hinzugefügt!"
  ],
  "Все пользователи": [
      "All Users",
      "Todos los usuarios",
      "所有用户",
      "جميع المستخدمين",
      "همه کاربران",
      "Tous les utilisateurs",
      "Alle Benutzer"
  ],
  "Весь кластер": [
      "Entire Cluster",
      "Todo el clúster",
      "全集群广播",
      "كامل المجموعة",
      "کل کلاستر",
      "Tout le cluster",
      "Gesamter Cluster"
  ],
  "Только Онлайн": [
      "Online Only",
      "Solo en línea",
      "仅在线用户",
      "المتصلون فقط",
      "فقط آنلاین‌ها",
      "En ligne uniquement",
      "Nur Online"
  ],
  "Активные сокеты": [
      "Active Sockets",
      "Sockets activos",
      "活跃连接",
      "الاتصالات النشطة",
      "سوکت‌های فعال",
      "Sockets actifs",
      "Aktive Sockets"
  ],
  "Платные подписки": [
      "Paid Subscriptions",
      "Suscripciones de pago",
      "付费订阅用户",
      "الاشتراكات المدفوعة",
      "اشتراک‌های ویژه",
      "Abonnements payants",
      "Bezahlte Abos"
  ],
  "Free аккаунты": [
      "Free Accounts",
      "Cuentas gratuitas",
      "免费账户",
      "الحسابات المجانية",
      "حساب‌های رایگان",
      "Comptes gratuits",
      "Kostenlose Konten"
  ],
  "Без подписки": [
      "No Subscription",
      "Sin suscripción",
      "无订阅",
      "بدون اشتراك",
      "بدون اشتراک",
      "Sans abonnement",
      "Ohne Abo"
  ],
  "По платформе": [
      "By Platform",
      "Por plataforma",
      "按平台筛选",
      "حسب المنصة",
      "بر اساس پلتفرم",
      "Par plateforme",
      "Nach Plattform"
  ],
  "DLP защита": [
      "DLP Protection",
      "Protección DLP",
      "DLP 防护",
      "حماية DLP",
      "محافظت DLP",
      "Protection DLP",
      "DLP-Schutz"
  ],
  "Выбранные user": [
      "Selected Users",
      "Usuarios seleccionados",
      "指定用户",
      "مستخدمون محددون",
      "کاربران انتخابی",
      "Utilisateurs choisis",
      "Ausgewählte Nutzer"
  ],
  "По никнеймам": [
      "By Usernames",
      "Por nombres de usuario",
      "按用户名指定",
      "حسب أسماء المستخدمين",
      "بر اساس نام کاربری",
      "Par pseudos",
      "Nach Benutzernamen"
  ],
  "Сейф-Контур (DLP)": [
      "Safe-Contour (DLP)",
      "Contorno Seguro (DLP)",
      "安全围栏 (DLP)",
      "المحيط الآمن (DLP)",
      "کانتور امن (DLP)",
      "Contour Sécurisé (DLP)",
      "Safe-Contour (DLP)"
  ],
  "Стандартный контур": [
      "Standard Contour",
      "Contorno estándar",
      "标准模式",
      "المحيط القياسي",
      "کانتور استاندارد",
      "Contour standard",
      "Standard-Kontur"
  ],
  "Информация": [
      "Information",
      "Información",
      "常规通知",
      "معلومات",
      "اطلاع‌رسانی",
      "Information",
      "Information"
  ],
  "Бонусы / Успех": [
      "Perks / Success",
      "Bonos / Éxito",
      "福利 / 成功",
      "مكافآت / نجاح",
      "پاداش / موفقیت",
      "Bonus / Succès",
      "Bonus / Erfolg"
  ],
  "Техработы": [
      "Maintenance",
      "Mantenimiento",
      "系统维护",
      "صيانة",
      "تعمیرات",
      "Maintenance",
      "Wartung"
  ],
  "Модальный алерт": [
      "Modal Alert",
      "Alerta modal",
      "强提醒弹窗",
      "تنبيه منبثق",
      "هشدار مودال",
      "Alerte modale",
      "Modal-Warnung"
  ],
  "Плановые технические работы / Важное системное объявление...": [
      "Scheduled maintenance / Important system announcement...",
      "Mantenimiento programado / Aviso importante del sistema...",
      "例行系统维护 / 重要系统公告...",
      "صيانة مجدولة / إعلان هام للنظام...",
      "تعمیرات برنامه‌ریزی‌شده / اطلاعیه مهم سیستم...",
      "Maintenance planifiée / Annonce système importante...",
      "Geplante Wartungsarbeiten / Wichtige Systemankündigung..."
  ],
  "Текст, который появится у пользователей в сервисной плашке или модальном окне...": [
      "Message text displayed to users in the service banner or modal alert...",
      "Texto que verán los usuarios en el banner de servicio o ventana modal...",
      "将显示在用户端服务横幅或弹窗中的通知内容...",
      "النص الذي سيظهر للمستخدمين في شريط الخدمة أو النافذة المنبثقة...",
      "متنی که در نوار سرویس یا پنجره مودال به کاربران نمایش داده می‌شود...",
      "Texte qui s'affichera aux utilisateurs dans la bannière ou la fenêtre modale...",
      "Text, der den Nutzern im Service-Banner oder Modal-Fenster angezeigt wird..."
  ],
  "Рассылка в шину событий...": [
      "Dispatching to event bus...",
      "Enviando al bus de eventos...",
      "正在推送至事件总线...",
      "جارٍ الإرسال إلى ناقل الأحداث...",
      "در حال ارسال به گذرگاه رویداد...",
      "Diffusion sur le bus d'événements...",
      "Wird an Event-Bus gesendet..."
  ],
  "Отправить системное оповещение": [
      "Send System Broadcast Alert",
      "Enviar aviso del sistema",
      "发送系统广播通知",
      "إرسال تنبيه النظام العام",
      "ارسال اعلان سراسری سیستم",
      "Envoyer l'alerte système",
      "Systembenachrichtigung senden"
  ],
  "Заголовок оповещения": [
      "Alert Title",
      "Título del aviso",
      "通知标题",
      "عنوان التنبيه",
      "عنوان اعلان",
      "Titre de l'alerte",
      "Titel der Benachrichtigung"
  ],
  "Введите заголовок и текст слева, чтобы увидеть, как уведомление будет выглядеть у получателей...": [
      "Enter a title and message on the left to preview how recipients will see the alert...",
      "Ingrese el título y el texto a la izquierda para previsualizar el aviso...",
      "在左侧输入标题和正文，即可预览接收端显示效果...",
      "أدخل العنوان والنص على اليسار لمعاينة شكل الإشعار لدى المستلمين...",
      "عنوان و متن را وارد کنید تا پیش‌نمایش اعلان برای کاربران را ببینید...",
      "Saisissez le titre et le texte à gauche pour prévisualiser l'alerte...",
      "Geben Sie links Titel und Text ein, um die Vorschau für Empfänger zu sehen..."
  ],
  "Отозвать и удалить из раздачи": [
      "Revoke & Remove from Distribution",
      "Revocar y eliminar de la distribución",
      "撤回并从分发队列中移除",
      "إلغاء وإزالة من التوزيع",
      "لغو و حذف از صف ارسال",
      "Révoquer et retirer de la diffusion",
      "Widerrufen & aus Verteilung entfernen"
  ],
  "COMMUNITY EDITION (25 МЕСТ)": [
      "COMMUNITY EDITION (25 SEATS)",
      "COMMUNITY EDITION (25 PLAZAS)",
      "社区版 COMMUNITY EDITION（25 席位）",
      "نسخة المجتمع COMMUNITY EDITION (25 مقعداً)",
      "نسخه کامیونیتی (۲۵ کاربر)",
      "COMMUNITY EDITION (25 PLACES)",
      "COMMUNITY EDITION (25 PLÄTZE)"
  ],
  "Open Source Community (Бесплатный контур)": [
      "Open Source Community (Free Tier)",
      "Open Source Community ( Nivel gratuito)",
      "开源社区版（免费额度）",
      "مجتمع المصادر المفتوحة (المستوى المجاني)",
      "نسخه متن‌باز کامیونیتی (رایگان)",
      "Communauté Open Source (Niveau gratuit)",
      "Open Source Community (Kostenloses Kontingent)"
  ],
  "Проверка Ed25519 подписи...": [
      "Verifying Ed25519 signature...",
      "Verificando firma Ed25519...",
      "正在校验 Ed25519 签名...",
      "جارٍ التحقق من توقيع Ed25519...",
      "در حال بررسی امضای Ed25519...",
      "Vérification de la signature Ed25519...",
      "Ed25519-Signatur wird geprüft..."
  ],
  "Активировать лицензию": [
      "Activate License",
      "Activar licencia",
      "激活许可证",
      "تفعيل الترخيص",
      "فعال‌سازی لایسنس",
      "Activer la licence",
      "Lizenz aktivieren"
  ],
  "Сохранение в БД и Redis...": [
      "Saving to PostgreSQL & Redis...",
      "Guardando en BD y Redis...",
      "正在保存至数据库与 Redis...",
      "جارٍ الحفظ في قاعدة البيانات و Redis...",
      "در حال ذخیره در دیتابیس و Redis...",
      "Enregistrement dans la BDD et Redis...",
      "Speichern in DB und Redis..."
  ],
  "Сохранить и актуализировать ключ": [
      "Save & Rotate Master Key",
      "Guardar y actualizar clave",
      "保存并更新主密钥",
      "حفظ وتحديث المفتاح",
      "ذخیره و بروزرسانی کلید",
      "Enregistrer et actualiser la clé",
      "Schlüssel speichern & aktualisieren"
  ],
  "Кастомный мастер-ключ активен (PostgreSQL system_settings + Redis кэш).": [
      "Custom master key is active (PostgreSQL system_settings + Redis cache).",
      "Clave maestra personalizada activa (PostgreSQL system_settings + caché Redis).",
      "自定义主密钥已生效（PostgreSQL system_settings + Redis 缓存）。",
      "المفتاح الرئيسي المخصص نشط (PostgreSQL system_settings + ذاكرة Redis).",
      "کلید مادر سفارشی فعال است (PostgreSQL system_settings + کش Redis).",
      "Clé maître personnalisée active (PostgreSQL system_settings + cache Redis).",
      "Benutzerdefinierter Master-Schlüssel aktiv (PostgreSQL system_settings + Redis-Cache)."
  ],
  "Двухуровневая персистентность: PostgreSQL (system_settings) + Redis.": [
      "Dual-layer persistence: PostgreSQL (system_settings) + Redis.",
      "Persistencia de doble capa: PostgreSQL (system_settings) + Redis.",
      "双层持久化存储：PostgreSQL (system_settings) + Redis。",
      "استمرارية مزدوجة الطبقات: PostgreSQL (system_settings) + Redis.",
      "ماندگاری دولایه: PostgreSQL (system_settings) + Redis.",
      "Persistance à double niveau : PostgreSQL (system_settings) + Redis.",
      "Zweistufige Persistenz: PostgreSQL (system_settings) + Redis."
  ],
  "топиков": [
      "topics",
      "temas",
      "个话题",
      "مواضيع",
      "تاپیک",
      "sujets",
      "Themen"
  ]
};

const REGEX_PATTERNS: Array<[RegExp, [string, string, string, string, string, string, string]]> = [
  [/^Ошибка сервера: HTTP (.+)$/, ["Server error: HTTP $1","Error del servidor: HTTP $1","服务器错误：HTTP $1","خطأ في الخادم: HTTP $1","خطای سرور: HTTP $1","Erreur serveur : HTTP $1","Serverfehler: HTTP $1"]],
  [/^Ошибка сервера при PATCH: (.+)$/, ["Server PATCH error: $1","Error PATCH del servidor: $1","服务器 PATCH 错误：$1","خطأ PATCH في الخادم: $1","خطای PATCH سرور: $1","Erreur PATCH serveur : $1","Server-PATCH-Fehler: $1"]],
  [/^Ошибка сервера: (.+)$/, ["Server error: $1","Error del servidor: $1","服务器错误：$1","خطأ في الخادم: $1","خطای سرور: $1","Erreur serveur : $1","Serverfehler: $1"]],
  [/^Ошибка HTTP: (.+)$/, ["HTTP error: $1","Error HTTP: $1","HTTP 错误：$1","خطأ HTTP: $1","خطای HTTP: $1","Erreur HTTP : $1","HTTP-Fehler: $1"]],
  [/^Ошибка загрузки медиа при отправке из Outbox: (.+)$/, ["Outbox media upload error: $1","Error al subir multimedia desde bandeja de salida: $1","待发队列媒体上传错误：$1","خطأ رفع الوسائط من صندوق الصادر: $1","خطای آپلود رسانه از صف خروجی: $1","Erreur d'envoi média depuis la boîte d'envoi : $1","Fehler beim Medien-Upload aus der Outbox: $1"]],
  [/^Ошибка загрузки медиа: (.+)$/, ["Media upload error: $1","Error al subir multimedia: $1","媒体上传错误：$1","خطأ رفع الوسائط: $1","خطای بارگذاری رسانه: $1","Erreur de téléversement média : $1","Medien-Upload-Fehler: $1"]],
  [/^Ошибка загрузки файла: (.+)$/, ["File upload error: $1","Error al subir el archivo: $1","文件上传错误：$1","خطأ رفع الملف: $1","خطای بارگذاری فایل: $1","Erreur de téléversement du fichier : $1","Datei-Upload-Fehler: $1"]],
  [/^Ошибка загрузки: (.+)$/, ["Upload/Download error: $1","Error de carga: $1","加载错误：$1","خطأ التحميل: $1","خطای بارگذاری: $1","Erreur de chargement : $1","Ladefehler: $1"]],
  [/^Не удалось загрузить зашифрованный файл: (.+)$/, ["Failed to download encrypted file: $1","No se pudo descargar el archivo cifrado: $1","无法下载加密文件：$1","تعذر تنزيل الملف المشفر: $1","دانلود فایل رمزنگاری شده ناموفق بود: $1","Impossible de télécharger le fichier chiffré : $1","Verschlüsselte Datei konnte nicht geladen werden: $1"]],
  [/^Не удалось инициализировать Tus-загрузку: (.+)$/, ["Failed to initialize Tus upload: $1","No se pudo inicializar la subida Tus: $1","无法初始化 Tus 上传：$1","تعذر تهيئة رفع Tus: $1","راه‌اندازی آپلود Tus ناموفق بود: $1","Impossible d'initialiser l'envoi Tus : $1","Tus-Upload konnte nicht initialisiert werden: $1"]],
  [/^Ошибка создания платежа: (.+)$/, ["Payment creation error: $1","Error al crear el pago: $1","创建支付失败：$1","خطأ في إنشاء الدفعة: $1","خطا در ایجاد پرداخت: $1","Erreur de création du paiement : $1","Fehler beim Erstellen der Zahlung: $1"]],
  [/^Публикация в группу не удалась: (.+)$/, ["Failed to post to group: $1","Error al publicar en el grupo: $1","群组发布失败：$1","فشل النشر في المجموعة: $1","انتشار در گروه ناموفق بود: $1","Échec de la publication dans le groupe : $1","Veröffentlichung in der Gruppe fehlgeschlagen: $1"]],
  [/^📊 Опрос: ([\s\S]+)$/, ["📊 Poll: $1","📊 Encuesta: $1","📊 投票：$1","📊 استطلاع: $1","📊 نظرسنجی: $1","📊 Sondage : $1","📊 Umfrage: $1"]],
  [/^Топик #(.+)$/, ["Topic #$1","Tema #$1","话题 #$1","الموضوع #$1","تاپیک #$1","Sujet #$1","Thema #$1"]],
  [/^Нет MLS сессии для группы (.+) — отправка заблокирована \(Fail-Closed §12\.5\)$/, ["No MLS session for group $1 — sending blocked (Fail-Closed §12.5)","Sin sesión MLS para el grupo $1 — envío bloqueado (Fail-Closed §12.5)","群组 $1 无 MLS 会话 — 发送已阻止 (Fail-Closed §12.5)","لا توجد جلسة MLS للمجموعة $1 — تم حظر الإرسال (Fail-Closed §12.5)","نشست MLS برای گروه $1 وجود ندارد — ارسال مسدود شد (Fail-Closed §12.5)","Aucune session MLS pour le groupe $1 — envoi bloqué (Fail-Closed §12.5)","Keine MLS-Sitzung für Gruppe $1 — Senden blockiert (Fail-Closed §12.5)"]],
  [/^Нет MLS сессии для группы (.+) \(Fail-Closed §12\.5\)$/, ["No MLS session for group $1 (Fail-Closed §12.5)","Sin sesión MLS para el grupo $1 (Fail-Closed §12.5)","群组 $1 无 MLS 会话 (Fail-Closed §12.5)","لا توجد جلسة MLS للمجموعة $1 (Fail-Closed §12.5)","نشست MLS برای گروه $1 وجود ندارد (Fail-Closed §12.5)","Aucune session MLS pour le groupe $1 (Fail-Closed §12.5)","Keine MLS-Sitzung für Gruppe $1 (Fail-Closed §12.5)"]],
  [/^Пользователь (.+) добавлен в список$/, ["User $1 added to the list","Usuario $1 añadido a la lista","用户 $1 已添加到列表","تمت إضافة المستخدم $1 إلى القائمة","کاربر $1 به لیست اضافه شد","Utilisateur $1 ajouté à la liste","Benutzer $1 zur Liste hinzugefügt"]],
  [/^Не удалось найти участника (.+)$/, ["Could not find member $1","No se pudo encontrar al miembro $1","找不到成员 $1","تعذر العثور على العضو $1","عضو $1 یافت نشد","Impossible de trouver le membre $1","Mitglied $1 konnte nicht gefunden werden"]],
  [/^Не удалось получить ключи для участника (.+)$/, ["Failed to fetch encryption keys for member $1","No se pudieron obtener las claves del miembro $1","无法获取成员 $1 的密钥","تعذر جلب مفاتيح العضو $1","دریافت کلیدهای عضو $1 ناموفق بود","Impossible d'obtenir les clés du membre $1","Schlüssel für Mitglied $1 konnten nicht abgerufen werden"]],
  [/^Участник (.+) успешно удален из группы\.$/, ["Member $1 has been removed from the group.","El miembro $1 fue eliminado del grupo.","成员 $1 已成功移出群组。","تمت إزالة العضو $1 من المجموعة بنجاح.","عضو $1 با موفقیت از گروه حذف شد.","Le membre $1 a été retiré du groupe.","Mitglied $1 wurde erfolgreich aus der Gruppe entfernt."]],
  [/^Участник (.+) удален$/, ["Member $1 removed","Miembro $1 eliminado","已移除成员 $1","تمت إزالة العضو $1","عضو $1 حذف شد","Membre $1 retiré","Mitglied $1 entfernt"]],
  [/^Не удалось удалить участника: (.+)$/, ["Failed to remove member: $1","No se pudo eliminar al miembro: $1","移除成员失败：$1","تعذر إزالة العضو: $1","حذف عضو ناموفق بود: $1","Impossible de retirer le membre : $1","Mitglied konnte nicht entfernt werden: $1"]],
  [/^Добавлен участник (.+)$/, ["Added member $1","Miembro $1 añadido","已添加成员 $1","تمت إضافة العضو $1","عضو $1 اضافه شد","Membre $1 ajouté","Mitglied $1 hinzugefügt"]],
  [/^Участник (.+) успешно добавлен в группу\.$/, ["Member $1 has been added to the group.","El miembro $1 fue añadido al grupo.","成员 $1 已成功加入群组。","تمت إضافة العضو $1 إلى المجموعة بنجاح.","عضو $1 با موفقیت به گروه اضافه شد.","Le membre $1 a été ajouté au groupe.","Mitglied $1 wurde erfolgreich zur Gruppe hinzugefügt."]],
  [/^Пользователь (.+) не может быть добавлен, так как у него не настроены ключи сквозного шифрования E2EE на текущем устройстве \(он должен войти в приложение\)\.$/, ["User $1 cannot be added because they haven't initialized E2EE keys on their device yet (they must sign in first).","No se puede añadir a $1 porque aún no tiene claves E2EE activas (debe iniciar sesión en la app).","无法添加用户 $1，因为其设备尚未初始化端到端加密密钥（需先登录应用）。","لا يمكن إضافة المستخدم $1 لعدم تهيئة مفاتيح التشفير التام E2EE لديه (يجب عليه تسجيل الدخول أولاً).","امکان افزودن کاربر $1 وجود ندارد زیرا کلیدهای رمزنگاری E2EE او هنوز فعال نشده است (باید وارد برنامه شود).","L'utilisateur $1 ne peut pas être ajouté car ses clés E2EE ne sont pas initialisées (il doit se connecter).","Benutzer $1 kann nicht hinzugefügt werden, da noch keine E2EE-Schlüssel eingerichtet sind (Anmeldung erforderlich)."]],
  [/^Не удалось добавить участника: (.+)$/, ["Failed to add member: $1","No se pudo añadir al miembro: $1","添加成员失败：$1","تعذر إضافة العضو: $1","افزودن عضو ناموفق بود: $1","Impossible d'ajouter le membre : $1","Mitglied konnte nicht hinzugefügt werden: $1"]],
  [/^Канал (.+) успешно создан!$/, ["Channel $1 created!","¡Canal $1 creado con éxito!","频道 $1 创建成功！","تم إنشاء القناة $1 بنجاح!","کانال $1 با موفقیت ساخته شد!","Canal $1 créé avec succès !","Kanal $1 erfolgreich erstellt!"]],
  [/^Ошибка создания канала: (.+)$/, ["Failed to create channel: $1","Error al crear el canal: $1","创建频道失败：$1","خطأ في إنشاء القناة: $1","خطا در ساخت کانال: $1","Erreur de création du canal : $1","Fehler beim Erstellen des Kanals: $1"]],
  [/^Ошибка создания группового чата: (.+)$/, ["Failed to create group chat: $1","Error al crear el chat grupal: $1","创建群聊失败：$1","خطأ في إنشاء الدردشة الجماعية: $1","خطا در ساخت گروه: $1","Erreur de création du groupe : $1","Fehler beim Erstellen des Gruppenchats: $1"]],
  [/^Группа (.+) успешно создана!$/, ["Group $1 created!","¡Grupo $1 creado con éxito!","群组 $1 创建成功！","تم إنشاء المجموعة $1 بنجاح!","گروه $1 با موفقیت ساخته شد!","Groupe $1 créé avec succès !","Gruppe $1 erfolgreich erstellt!"]],
  [/^Пользователь (.+) добавлен!$/, ["User $1 added!","¡Usuario $1 añadido!","已添加用户 $1！","تمت إضافة المستخدم $1!","کاربر $1 اضافه شد!","Utilisateur $1 ajouté !","Benutzer $1 hinzugefügt!"]],
  [/^Собеседник (.+) не найден в сети\. Создан локальный чат\.$/, ["Contact $1 not found online. Created a local chat.","Contacto $1 no encontrado en línea. Se creó un chat local.","未在网络中找到联系人 $1，已创建本地聊天。","لم يتم العثور على $1 عبر الشبكة. تم إنشاء دردشة محلية.","مخاطب $1 در شبکه یافت نشد. چت محلی ایجاد گردید.","Contact $1 introuvable sur le réseau. Chat local créé.","Kontakt $1 nicht im Netzwerk gefunden. Lokaler Chat erstellt."]],
  [/^Отправка фото: (\d+) шт\.\.\.$/, ["Sending photos: $1...","Enviando fotos: $1...","正在发送 $1 张照片...","جارٍ إرسال الصور: $1...","در حال ارسال $1 عکس...","Envoi de $1 photos...","$1 Fotos werden gesendet..."]],
  [/^Отправлено (\d+) фото$/, ["Sent $1 photos","$1 fotos enviadas","已发送 $1 张照片","تم إرسال $1 صورة","$1 عکس ارسال شد","$1 photos envoyées","$1 Fotos gesendet"]],
  [/^Отправлено (\d+), не отправлено (\d+)$/, ["Sent $1, failed $2","Enviados $1, fallidos $2","已发送 $1，失败 $2","تم إرسال $1، فشل $2","$1 ارسال شد، $2 ناموفق","Envoyés : $1, échecs : $2","$1 gesendet, $2 fehlgeschlagen"]],
  [/^Пересылка в группу (.+) сохранена в очередь \(нет MLS-сессии\)$/, ["Forward to group $1 queued (no MLS session)","Reenvío al grupo $1 en cola (sin sesión MLS)","转发至群组 $1 已存入队列（无 MLS 会话）","تم وضع إعادة التوجيه للمجموعة $1 في قائمة الانتظار (لا توجد جلسة MLS)","هدایت پیام به گروه $1 در صف قرار گرفت (بدون نشست MLS)","Transfert vers le groupe $1 mis en file (sans session MLS)","Weiterleitung an Gruppe $1 eingereiht (keine MLS-Sitzung)"]],
  [/^Переслано в (\d+) (чат|чата|чатов)$/, ["Forwarded to $1 chat(s)","Reenviado a $1 chat(s)","已转发至 $1 个聊天","تمت إعادة التوجيه إلى $1 محادثة","هدایت شده به $1 چت","Transféré vers $1 discussion(s)","Weitergeleitet an $1 Chat(s)"]],
  [/^Бот @(.+) успешно создан и готов к работе!$/, ["Bot @$1 created and ready!","¡El bot @$1 fue creado y está listo!","机器人 @$1 已成功创建并就绪！","تم إنشاء البوت @$1 بنجاح وهو جاهز للعمل!","ربات @$1 با موفقیت ساخته شد و آماده کار است!","Le bot @$1 a été créé et est prêt !","Bot @$1 erfolgreich erstellt und einsatzbereit!"]],
  [/^Команда \/(.+) добавлена! Не забудьте нажать «Сохранить»$/, ["Command /$1 added! Don't forget to click 'Save'","¡Comando /$1 añadido! No olvide pulsar «Guardar»","命令 /$1 已添加！别忘了点击“保存”","تمت إضافة الأمر /$1! لا تنسَ الضغط على «حفظ»","دستور /$1 اضافه شد! فراموش نکنید روی «ذخیره» بزنید","Commande /$1 ajoutée ! N'oubliez pas d'enregistrer","Befehl /$1 hinzugefügt! Vergessen Sie nicht, auf „Speichern“ zu klicken"]],
  [/^Вы уверены, что хотите перевыпустить токен для бота @(.+)\? Старый токен мгновенно перестанет действовать!$/, ["Are you sure you want to rotate the token for @$1? The old token will immediately stop working!","¿Seguro que desea regenerar el token para @$1? ¡El token anterior dejará de funcionar de inmediato!","确定要为机器人 @$1 重新生成令牌吗？旧令牌将立即失效！","هل أنت متأكد من إعادة إصدار الرمز للبوت @$1؟ سيتوقف الرمز القديم فوراً!","آیا از بازتولید توکن برای ربات @$1 مطمئن هستید؟ توکن قبلی فوراً باطل می‌شود!","Voulez-vous vraiment renouveler le jeton de @$1 ? L'ancien jeton sera immédiatement invalidé !","Möchten Sie das Token für @$1 wirklich erneuern? Das alte Token wird sofort ungültig!"]],
  [/^Вебхук отвечает! Задержка: (\d+) мс$/, ["Webhook is live! Latency: $1 ms","¡El webhook responde! Latencia: $1 ms","Webhook 响应正常！延迟：$1 毫秒","الـ Webhook يستجيب! زمن الاستجابة: $1 مللي ثانية","وب‌هوک پاسخ می‌دهد! تاخیر: $1 میلی‌ثانیه","Le webhook répond ! Latence : $1 ms","Webhook antwortet! Latenz: $1 ms"]],
  [/^Тест не пройден: (.+)$/, ["Test failed: $1","Prueba fallida: $1","测试未通过：$1","فشل الاختبار: $1","تست ناموفق بود: $1","Échec du test : $1","Test fehlgeschlagen: $1"]],
  [/^Вы действительно хотите удалить бота @(.+)\? Все токены и история интеграции будут безвозвратно удалены!$/, ["Are you sure you want to delete @$1? All tokens and integration data will be permanently deleted!","¿Seguro que desea eliminar el bot @$1? ¡Todos los tokens e integraciones se borrarán permanentemente!","确定要删除机器人 @$1 吗？所有令牌和集成历史将被永久删除！","هل تريد حقاً حذف البوت @$1؟ سيتم حذف جميع الرموز نهائياً!","آیا واقعاً می‌خواهید ربات @$1 را حذف کنید؟ تمام توکن‌ها برای همیشه پاک می‌شوند!","Voulez-vous vraiment supprimer le bot @$1 ? Tous les jetons seront définitivement supprimés !","Möchten Sie den Bot @$1 wirklich löschen? Alle Tokens werden unwiderruflich gelöscht!"]],
  [/^Бот @(.+) успешно удален$/, ["Bot @$1 deleted","Bot @$1 eliminado","机器人 @$1 已删除","تم حذف البوت @$1 بنجاح","ربات @$1 با موفقیت حذف شد","Bot @$1 supprimé","Bot @$1 erfolgreich gelöscht"]],
  [/^Управление @(.+)$/, ["Manage @$1","Gestionar @$1","管理 @$1","إدارة @$1","مدیریت @$1","Gérer @$1","Verwalten: @$1"]],
  [/^\+ (\d+) своих$/, ["+ $1 custom","+ $1 propios","+ $1 个自定义","+ $1 مخصصة","+ $1 سفارشی","+ $1 personnalisées","+ $1 eigene"]],
  [/^Привет, \{name\}! 👋(?:\\n|\n)Я бот (.+)\. Выберите нужный раздел на кнопках ниже:$/, ["Hello, {name}! 👋\nI am $1. Choose a section using the buttons below:","¡Hola, {name}! 👋\nSoy el bot $1. Elija una sección abajo:","你好，{name}！👋\n我是机器人 $1。请点击下方按钮选择功能：","مرحباً {name}! 👋\nأنا البوت $1. اختر القسم المطلوب من الأزرار أدناه:","سلام {name}! 👋\nمن ربات $1 هستم. بخش مورد نظر را از دکمه‌های زیر انتخاب کنید:","Bonjour {name} ! 👋\nJe suis le bot $1. Choisissez une rubrique ci-dessous :","Hallo {name}! 👋\nIch bin Bot $1. Wählen Sie unten einen Bereich aus:"]],
  [/^Файл обновления скачан не полностью \((.+?) байт(?: из (.+?))?\)(?:\. Нажмите «Повторить»\.)?$/, ["Update file downloaded incompletely ($1 bytes $2). Tap 'Retry'.","Archivo de actualización incompleto ($1 bytes $2). Toque «Reintentar».","更新文件下载不完整 ($1 字节 $2)。请点击“重试”。","لم يكتمل تنزيل ملف التحديث ($1 بايت $2). اضغط على «إعادة المحاولة».","فایل به‌روزرسانی ناقص دانلود شد ($1 بایت $2). روی «تلاش مجدد» بزنید.","Fichier de mise à jour incomplet ($1 octets $2). Appuyez sur « Réessayer ».","Update-Datei unvollständig heruntergeladen ($1 Bytes $2). Tippen Sie auf „Wiederholen“."]],
  [/^Файл обновления скачан не полностью \((.+)\)$/, ["Update file downloaded incompletely ($1)","Archivo de actualización incompleto ($1)","更新文件下载不完整 ($1)","لم يكتمل تنزيل ملف التحديث ($1)","فایل به‌روزرسانی ناقص دانلود شد ($1)","Fichier de mise à jour incomplet ($1)","Update-Datei unvollständig heruntergeladen ($1)"]],
  [/^(\d+) байт(.*)$/, ["$1 bytes$2","$1 bytes$2","$1 字节$2","$1 بايت$2","$1 بایت$2","$1 octets$2","$1 Bytes$2"]],
  [/^Не удалось открыть установщик: (.+)$/, ["Failed to open installer: $1","No se pudo abrir el instalador: $1","无法打开安装程序：$1","تعذر فتح المثبت: $1","باز کردن نصب‌کننده ناموفق بود: $1","Impossible d'ouvrir l'installateur : $1","Installer konnte nicht geöffnet werden: $1"]],
  [/^Не удалось скачать аудио \((.+)\)$/, ["Failed to download audio ($1)","No se pudo descargar el audio ($1)","无法下载音频 ($1)","تعذر تنزيل الصوت ($1)","دانلود فایل صوتی ناموفق بود ($1)","Impossible de télécharger l'audio ($1)","Audio konnte nicht heruntergeladen werden ($1)"]],
  [/^Сервис распознавания: (.+)$/, ["Speech recognition service: $1","Servicio de transcripción: $1","语音识别服务：$1","خدمة التعرف على الصوت: $1","سرویس تشخیص گفتار: $1","Service de transcription : $1","Spracherkennungsdienst: $1"]],
  [/^Ошибка инициализации хранилища \((.+)\)\. Нажмите "Сбросить данные" ниже\.$/, ["Storage initialization error ($1). Tap \"Reset Data\" below.","Error al inicializar el almacenamiento ($1). Toque \"Restablecer datos\" abajo.","存储初始化失败 ($1)。请点击下方的“重置数据”。","خطأ تهيئة التخزين ($1). اضغط على \"إعادة ضبط البيانات\" أدناه.","خطای راه‌اندازی حافظه ($1). روی «بازنشانی داده‌ها» در پایین بزنید.","Erreur d'initialisation du stockage ($1). Appuyez sur « Réinitialiser les données ».","Speicher-Initialisierungsfehler ($1). Tippen Sie unten auf „Daten zurücksetzen“."]],
  [/^Неверный PIN-код \((.+)-я неудачная попытка\)\. Если вы забыли PIN, подтвердите явный сброс кэша ниже\.$/, ["Incorrect PIN ($1 failed attempt). If you forgot your PIN, confirm a data reset below.","PIN incorrecto (intento fallido #$1). Si olvidó su PIN, confirme el restablecimiento abajo.","PIN 码错误（第 $1 次尝试失败）。如果忘记 PIN 码，请在下方确认重置数据。","رمز PIN غير صحيح (المحاولة الفاشلة رقم $1). إذا نسيت الرمز، أكد إعادة الضبط أدناه.","رمز PIN اشتباه است (تلاش ناموفق $1). در صورت فراموشی، بازنشانی را در پایین تایید کنید.","Code PIN incorrect (tentative échouée n°$1). Si vous l'avez oublié, réinitialisez ci-dessous.","Falscher PIN-Code ($1. Fehlversuch). Falls vergessen, bestätigen Sie unten das Zurücksetzen."]],
  [/^Неверный PIN-код \(попытка (\d+) из (\d+)\)$/, ["Incorrect PIN (attempt $1 of $2)","PIN incorrecto (intento $1 de $2)","PIN 码错误（第 $1/$2 次尝试）","رمز PIN غير صحيح (المحاولة $1 من $2)","رمز PIN اشتباه است (تلاش $1 از $2)","Code PIN incorrect (tentative $1 sur $2)","Falscher PIN-Code (Versuch $1 von $2)"]],
  [/^Пользователь #(.+)$/, ["User #$1","Usuario #$1","用户 #$1","مستخدم #$1","کاربر #$1","Utilisateur #$1","Benutzer #$1"]],
  [/^Участник #(.+)$/, ["Member #$1","Miembro #$1","成员 #$1","عضو #$1","عضو #$1","Membre #$1","Mitglied #$1"]],
  [/^Вычисление Proof-of-Work \(сложность: (.+) бит\)\.\.\.$/, ["Computing Proof-of-Work (difficulty: $1 bits)...","Calculando Proof-of-Work (dificultad: $1 bits)...","正在计算工作量证明（难度：$1 位）...","جارٍ حساب إثبات العمل (الصعوبة: $1 بت)...","در حال محاسبه گواهی اثبات کار (سختی: $1 بیت)...","Calcul de la preuve de travail (difficulté : $1 bits)...","Proof-of-Work wird berechnet (Schwierigkeit: $1 Bit)..."]],
  [/^Сервер вернул статус (.+) при получении профиля$/, ["Server returned status $1 while fetching profile","El servidor devolvió el estado $1 al obtener el perfil","获取个人资料时服务器返回状态 $1","أرجع الخادم الحالة $1 عند جلب الملف الشخصي","سرور هنگام دریافت پروفایل وضعیت $1 را برگرداند","Le serveur a renvoyé le statut $1 lors de la récupération du profil","Server gab beim Abrufen des Profils Status $1 zurück"]],
  [/^Не удалось загрузить профиль пользователя: (.+)$/, ["Failed to load user profile: $1","No se pudo cargar el perfil del usuario: $1","无法加载用户个人资料：$1","تعذر تحميل ملف المستخدم: $1","بارگذاری پروفایل کاربر ناموفق بود: $1","Impossible de charger le profil utilisateur : $1","Benutzerprofil konnte nicht geladen werden: $1"]],
  [/^Пользователь @(.+) не найден$/, ["User @$1 not found","Usuario @$1 no encontrado","未找到用户 @$1","المستخدم @$1 غير موجود","کاربر @$1 یافت نشد","Utilisateur @$1 introuvable","Benutzer @$1 nicht gefunden"]],
  [/^Открыт чат с @(.+)$/, ["Opened chat with @$1","Chat abierto con @$1","已打开与 @$1 的聊天","تم فتح الدردشة مع @$1","چت با @$1 باز شد","Chat ouvert avec @$1","Chat mit @$1 geöffnet"]],
  [/^Не удалось открыть чат с @(.+)$/, ["Failed to open chat with @$1","No se pudo abrir el chat con @$1","无法打开与 @$1 的聊天","تعذر فتح الدردشة مع @$1","باز کردن چت با @$1 ناموفق بود","Impossible d'ouvrir le chat avec @$1","Chat mit @$1 konnte nicht geöffnet werden"]],
  [/^Не удалось открыть профиль @(.+)$/, ["Failed to open profile @$1","No se pudo abrir el perfil @$1","无法打开 @$1 的资料","تعذر فتح الملف الشخصي @$1","باز کردن پروفایل @$1 ناموفق بود","Impossible d'ouvrir le profil @$1","Profil @$1 konnte nicht geöffnet werden"]],
  [/^Поиск по тегу «#(.+)» появится в следующем обновлении$/, ["Search by tag '#$1' is coming in the next update","La búsqueda por etiqueta «#$1» llegará en la próxima actualización","标签“#$1”搜索功能将在下次更新中推出","البحث بالوسم «#$1» سيتوفر في التحديث القادم","جستجو با تگ «#$1» در نسخه بعدی اضافه می‌شود","La recherche par tag « #$1 » arrive dans la prochaine mise à jour","Suche nach Tag „#$1“ folgt im nächsten Update"]],
  [/^🔥 Вы вошли в одноразовую комнату: (.+)$/, ["🔥 Joined Burner room: $1","🔥 Entraste a la sala temporal: $1","🔥 您已进入阅后即焚房间：$1","🔥 دخلت الغرفة المؤقتة: $1","🔥 وارد اتاق یک‌بارمصرف شدید: $1","🔥 Vous avez rejoint le salon éphémère : $1","🔥 Sie haben den Burner-Raum betreten: $1"]],
  [/^(.+) \(Mesh Группа\)$/, ["$1 (Mesh Group)","$1 (Grupo Mesh)","$1 (Mesh 群组)","$1 (مجموعة Mesh)","$1 (گروه Mesh)","$1 (Groupe Mesh)","$1 (Mesh-Gruppe)"]],
  [/^(.+) \(Локальный\)$/, ["$1 (Local)","$1 (Local)","$1 (本地)","$1 (محلي)","$1 (محلی)","$1 (Local)","$1 (Lokal)"]],
  [/^Инициализация оплаты инвойса: (.+)$/, ["Initializing invoice payment: $1","Inicializando pago de factura: $1","正在初始化账单支付：$1","جارٍ تهيئة دفع الفاتورة: $1","در حال راه‌اندازی پرداخت فاکتور: $1","Initialisation du paiement de la facture : $1","Rechnungszahlung wird initialisiert: $1"]],
  [/^Модулятор голоса: (.+)$/, ["Voice Changer: $1","Modulador de voz: $1","变声器：$1","مغير الصوت: $1","تغییردهنده صدا: $1","Modulateur de voix : $1","Stimmenverzerrer: $1"]],
  [/^Выбран тембр голоса: (.+)$/, ["Selected voice preset: $1","Timbre de voz seleccionado: $1","已选择变声音色：$1","تم اختيار نبرة الصوت: $1","پریست صدای انتخاب شده: $1","Timbre vocal sélectionné : $1","Stimmprofil ausgewählt: $1"]],
  [/^Открыт защищенный диалог с (.+)$/, ["Opened encrypted chat with $1","Diálogo seguro abierto con $1","已打开与 $1 的加密对话","تم فتح محادثة مشفرة مع $1","گفتگوی امن با $1 باز شد","Dialogue sécurisé ouvert avec $1","Sicherer Chat mit $1 geöffnet"]],
  [/^Поиск контрагента (.+)\.\.\.$/, ["Searching for counterparty $1...","Buscando contraparte $1...","正在搜索交易对手 $1...","جارٍ البحث عن الطرف المقابل $1...","در حال جستجوی طرف مقابل $1...","Recherche de la contrepartie $1...","Gegenpartei $1 wird gesucht..."]],
  [/^Загрузка: (.+) МБ$/, ["Downloading: $1 MB","Descargando: $1 MB","正在下载：$1 MB","جارٍ التنزيل: $1 ميجابايت","در حال دانلود: $1 مگابایت","Téléchargement : $1 Mo","Herunterladen: $1 MB"]],
  [/^Создание PIN-кода для (.+)$/, ["Create PIN for $1","Crear código PIN para $1","为 $1 创建 PIN 码","إنشاء رمز PIN لـ $1","ایجاد رمز PIN برای $1","Créer un code PIN pour $1","PIN-Code erstellen für $1"]],
  [/^Разблокировка для (.+)$/, ["Unlock for $1","Desbloquear para $1","解锁 $1","فتح القفل لـ $1","باز کردن قفل برای $1","Déverrouiller pour $1","Entsperren für $1"]],
  [/^💎 Перевод криптовалюты: (.+)$/, ["💎 Crypto Transfer: $1","💎 Transferencia cripto: $1","💎 加密货币转账：$1","💎 تحويل عملات مشفرة: $1","💎 انتقال رمزارز: $1","💎 Transfert crypto : $1","💎 Krypto-Überweisung: $1"]],
  [/^💎 Перевод (.+)$/, ["💎 Transfer $1","💎 Transferencia $1","💎 转账 $1","💎 تحويل $1","💎 انتقال $1","💎 Transfert $1","💎 Überweisung $1"]],
  [/^Координаты \[(.+)\]$/, ["Coordinates [$1]","Coordenadas [$1]","坐标 [$1]","الإحداثيات [$1]","مختصات [$1]","Coordonnées [$1]","Koordinaten [$1]"]],
  [/^H3 ячейка определена: (.+)$/, ["H3 cell detected: $1","Celda H3 detectada: $1","已确定 H3 单元格：$1","تم تحديد خلية H3: $1","سلول H3 شناسایی شد: $1","Cellule H3 détectée : $1","H3-Zelle erkannt: $1"]],
  [/^Ошибка геолокации: (.+)$/, ["Geolocation error: $1","Error de geolocalización: $1","地理定位错误：$1","خطأ تحديد الموقع: $1","خطای موقعیت‌یابی: $1","Erreur de géolocalisation : $1","Geolokalisierungsfehler: $1"]],
  [/^Геолокация отклонена: (.+)$/, ["Geolocation denied: $1","Geolocalización denegada: $1","地理定位被拒绝：$1","تم رفض تحديد الموقع: $1","دسترسی به مکان رد شد: $1","Géolocalisation refusée : $1","Geolokalisierung abgelehnt: $1"]],
  [/^Депонирование залогов \((.+)\)$/, ["Collateral Deposit ($1)","Depósito de garantías ($1)","质押保证金 ($1)","إيداع الضمانات ($1)","تودیع وثیقه ($1)","Dépôt de garantie ($1)","Sicherheitenhinterlegung ($1)"]],
  [/^Текущий: (.+)$/, ["Current: $1","Actual: $1","当前：$1","الحالي: $1","فعلی: $1","Actuel : $1","Aktuell: $1"]],
  [/^Кошелек: (.+)$/, ["Wallet: $1","Billetera: $1","钱包：$1","المحفظة: $1","کیف پول: $1","Portefeuille : $1","Wallet: $1"]],
  [/^⏱️ Автосброс при неактивности установлен на (\d+) дн\.$/, ["⏱️ Inactivity auto-wipe set to $1 days","⏱️ Autoborrado por inactividad fijado en $1 días","⏱️ 闲置自动销毁已设为 $1 天","⏱️ تم ضبط المسح التلقائي عند عدم النشاط على $1 يوماً","⏱️ پاکسازی خودکار عدم فعالیت روی $1 روز تنظیم شد","⏱️ Effacement auto en cas d'inactivité défini sur $1 jours","⏱️ Auto-Löschung bei Inaktivität auf $1 Tage gesetzt"]],
  [/^Удалить папку "(.+)"\? Чаты при этом не удалятся\.$/, ["Delete folder \"$1\"? Chats inside will not be deleted.","¿Eliminar la carpeta \"$1\"? Los chats no se eliminarán.","删除文件夹“$1”？其中的聊天不会被删除。","حذف المجلد \"$1\"؟ لن يتم حذف المحادثات بداخله.","پوشه «$1» حذف شود؟ چت‌های داخل آن حذف نمی‌شوند.","Supprimer le dossier « $1 » ? Les discussions seront conservées.","Ordner „$1“ löschen? Die enthaltenen Chats werden nicht gelöscht."]],
  [/^Группа: (.+)$/, ["Group: $1","Grupo: $1","群组：$1","المجموعة: $1","گروه: $1","Groupe : $1","Gruppe: $1"]],
  [/^Сейф-Контур: (.+)$/, ["Safe-Contour: $1","Contorno Seguro: $1","安全围栏：$1","المحيط الآمن: $1","کانتور امن: $1","Contour Sécurisé : $1","Safe-Contour: $1"]],
  [/^Системное сообщение: эпоха обновлена до (.+)$/, ["System message: epoch updated to $1","Mensaje del sistema: época actualizada a $1","系统消息：纪元已更新至 $1","رسالة النظام: تم تحديث الحقبة إلى $1","پیام سیستم: دوره (Epoch) به $1 ارتقا یافت","Message système : époque mise à jour vers $1","Systemnachricht: Epoche auf $1 aktualisiert"]],
  [/^Пустой ответ от сервера при запросе обновлений для чата (.+)$/, ["Empty server response when polling updates for chat $1","Respuesta vacía del servidor al consultar el chat $1","查询聊天 $1 更新时服务器返回空响应","استجابة فارغة من الخادم عند تحديث الدردشة $1","پاسخ خالی از سرور هنگام دریافت تغییرات چت $1","Réponse vide du serveur pour la discussion $1","Leere Serverantwort beim Abrufen von Updates für Chat $1"]],
  [/^Выбрать вариант (\d+) как правильный$/, ["Mark option $1 as correct","Marcar opción $1 como correcta","将选项 $1 设为正确答案","تحديد الخيار $1 كإجابة صحيحة","انتخاب گزینه $1 به عنوان پاسخ صحیح","Marquer l'option $1 comme correcte","Option $1 als richtig markieren"]],
  [/^Вариант (\d+)$/, ["Option $1","Opción $1","选项 $1","الخيار $1","گزینه $1","Option $1","Option $1"]],
  [/^Удалить вариант (\d+)$/, ["Remove option $1","Eliminar opción $1","删除选项 $1","حذف الخيار $1","حذف گزینه $1","Supprimer l'option $1","Option $1 entfernen"]],
  [/^Успешно отправлено (.+)! Tx: (.+)$/, ["Successfully sent $1! Tx: $2","¡Enviado con éxito $1! Tx: $2","已成功发送 $1！交易哈希：$2","تم إرسال $1 بنجاح! المعاملة: $2","مبلغ $1 با موفقیت ارسال شد! تراکنش: $2","$1 envoyé avec succès ! Tx : $2","$1 erfolgreich gesendet! Tx: $2"]],
  [/^Не удалось отписаться: HTTP (.+)$/, ["Failed to leave: HTTP $1","No se pudo cancelar la suscripción: HTTP $1","取消订阅失败：HTTP $1","تعذر إلغاء الاشتراك: HTTP $1","لغو عضویت ناموفق بود: HTTP $1","Impossible de se désabonner : HTTP $1","Abmeldung fehlgeschlagen: HTTP $1"]],
  [/^(\d+) (подписчик|подписчика|подписчиков)$/, ["$1 subscribers","$1 suscriptores","$1 位订阅者","$1 مشترك","$1 مشترک","$1 abonnés","$1 Abonnenten"]],
  [/^(\d+) (участник|участника|участников)$/, ["$1 members","$1 miembros","$1 位成员","$1 عضو","$1 عضو","$1 membres","$1 Mitglieder"]],
  [/^(\d+) (голос|голоса|голосов)$/, ["$1 votes","$1 votos","$1 票","$1 صوت","$1 رای","$1 votes","$1 Stimmen"]],
  [/^Таймаут ожидания ответа на (.+) \(30с\)$/, ["Response timeout for $1 (30s)","Tiempo de espera agotado para $1 (30s)","等待 $1 响应超时（30秒）","انتهت مهلة الاستجابة لـ $1 (30 ث)","پایان زمان انتظار پاسخ برای $1 (۳۰ ثانیه)","Délai d'attente dépassé pour $1 (30 s)","Antwort-Zeitüberschreitung für $1 (30s)"]],
  [/^Эхо-ответ на: "(.+)"$/, ["Echo reply to: \"$1\"","Respuesta eco a: \"$1\"","回显回复：“$1”","رد صدى على: \"$1\"","پاسخ اکو به: «$1»","Réponse écho à : « $1 »","Echo-Antwort auf: „$1“"]],
  [/^Метод (.+) не поддерживается в автономном режиме$/, ["Method $1 is not supported in offline mode","El método $1 no es compatible en modo offline","离线模式下不支持方法 $1","الطريقة $1 غير مدعومة في وضع عدم الاتصال","متد $1 در حالت آفلاین پشتیبانی نمی‌شود","La méthode $1 n'est pas prise en charge hors ligne","Methode $1 wird im Offline-Modus nicht unterstützt"]],
  [/^Превышен максимальный размер полезной нагрузки: (.+) байт$/, ["Maximum payload size exceeded: $1 bytes","Tamaño máximo de carga excedido: $1 bytes","超出最大负载大小：$1 字节","تم تجاوز الحد الأقصى لحجم البيانات: $1 بايت","حجم داده از حد مجاز فراتر رفت: $1 بايت","Taille maximale de charge dépassée : $1 octets","Maximale Nutzlastgröße überschritten: $1 Bytes"]],
  [/^Недопустимое значение TTL: (.+) \(должно быть > 0\)$/, ["Invalid TTL value: $1 (must be > 0)","Valor TTL inválido: $1 (debe ser > 0)","无效的 TTL 值：$1（必须 > 0）","قيمة TTL غير صالحة: $1 (يجب أن تكون > 0)","مقدار TTL نامعتبر است: $1 (باید بزرگتر از ۰ باشد)","Valeur TTL invalide : $1 (doit être > 0)","Ungültiger TTL-Wert: $1 (muss > 0 sein)"]],
  [/^Истек срок жизни конверта: возраст (.+)с превышает 7 суток$/, ["Envelope expired: age $1s exceeds 7 days","Sobre expirado: la antigüedad de $1s supera los 7 días","信封已过期：时长 $1 秒超过 7 天","انتهت صلاحية الظرف: العمر $1 ثانية يتجاوز 7 أيام","پاکت منقضی شده است: عمر $1 ثانیه بیش از ۷ روز است","Enveloppe expirée : l'âge de $1s dépasse 7 jours","Umschlag abgelaufen: Alter $1s überschreitet 7 Tage"]],
  [/^Превышен лимит запросов к серверу \(HTTP 429\)\. Повтор через (.+)мс$/, ["Rate limit exceeded (HTTP 429). Retrying in $1ms","Límite de peticiones excedido (HTTP 429). Reintentando en $1ms","请求过于频繁 (HTTP 429)，将在 $1 毫秒后重试","تم تجاوز حد الطلبات (HTTP 429). إعادة المحاولة خلال $1 مللي ثانية","محدودیت تعداد درخواست (HTTP 429). تلاش مجدد تا $1 میلی‌ثانیه دیگر","Limite de requêtes dépassée (HTTP 429). Nouvel essai dans $1 ms","Anfragelimit überschritten (HTTP 429). Wiederholung in $1 ms"]],
  [/^Таймаут запроса к релею \((.+)мс\)$/, ["Relay request timed out ($1ms)","Tiempo de espera del relé agotado ($1ms)","中继请求超时 ($1 毫秒)","انتهت مهلة طلب المرحل ($1 مللي ثانية)","زمان درخواست به رله به پایان رسید ($1 میلی‌ثانیه)","Délai de requête au relais dépassé ($1 ms)","Relay-Anfrage abgelaufen ($1 ms)"]],
  [/^Таймаут подключения к (.+)$/, ["Connection timeout to $1","Tiempo de conexión agotado hacia $1","连接至 $1 超时","انتهت مهلة الاتصال بـ $1","پایان زمان انتظار اتصال به $1","Délai de connexion à $1 dépassé","Verbindungs-Timeout zu $1"]],
  [/^Не удалось создать WebSocket соединение к (.+): нет доступного WebSocket провайдера$/, ["Failed to create WebSocket connection to $1: no WebSocket provider available","No se pudo crear conexión WebSocket a $1: sin proveedor disponible","无法创建到 $1 的 WebSocket 连接：无可用提供程序","تعذر إنشاء اتصال WebSocket بـ $1: لا يوجد مزود متاح","ایجاد اتصال WebSocket به $1 ناموفق بود","Impossible de créer la connexion WebSocket vers $1","WebSocket-Verbindung zu $1 fehlgeschlagen"]],
  [/^Недопустимый workchain ID: (.+)\. Сеть TON поддерживает только workchain 0 \(Basechain\) и -1 \(Masterchain\)$/, ["Invalid workchain ID: $1. TON only supports workchain 0 (Basechain) and -1 (Masterchain)","ID de workchain inválido: $1. TON solo admite 0 y -1","无效的 workchain ID：$1。TON 仅支持 0 和 -1","معرف workchain غير صالح: $1. تدعم شبكة TON فقط 0 و -1","شناسه workchain نامعتبر: $1. شبکه TON فقط از 0 و -1 پشتیبانی می‌کند","ID workchain invalide : $1. TON ne supporte que 0 et -1","Ungültige Workchain-ID: $1. TON unterstützt nur 0 und -1"]],
  [/^Неверный бинарный размер адреса: декодировано (.+) байт \(требуется ровно 36 байт\)$/, ["Invalid binary address size: decoded $1 bytes (exactly 36 bytes required)","Tamaño binario de dirección inválido: $1 bytes (se requieren 36 bytes)","地址二进制长度无效：已解码 $1 字节（需要 36 字节）","حجم العنوان الثنائي غير صالح: $1 بايت (المطلوب 36 بايت)","اندازه باینری آدرس نامعتبر است: $1 بایت (۳۶ بایت الزامی است)","Taille binaire d'adresse invalide : $1 octets (36 requis)","Ungültige binäre Adressgröße: $1 Bytes (36 Bytes erforderlich)"]],
  [/^Ошибка контрольной суммы CRC16: получено (.+), ожидалось (.+)\. Проверьте правильность адреса\.$/, ["CRC16 checksum mismatch: got $1, expected $2. Please check the address.","Error de suma CRC16: recibido $1, esperado $2. Verifique la dirección.","CRC16 校验和错误：实际 $1，预期 $2。请检查地址。","خطأ تدقيق CRC16: المستلم $1، المتوقع $2. تحقق من العنوان.","خطای چک‌سام CRC16: دریافتی $1، مورد انتظار $2. آدرس را بررسی کنید.","Erreur CRC16 : reçu $1, attendu $2. Vérifiez l'adresse.","CRC16-Prüfsummenfehler: $1 erhalten, $2 erwartet. Adresse prüfen."]],
  [/^Недопустимый workchain ID: (.+) \(байт (.+)\)\. Поддерживаются только 0 и -1$/, ["Invalid workchain ID: $1 (byte $2). Only 0 and -1 are supported","ID de workchain inválido: $1 (byte $2). Solo se admiten 0 y -1","无效的 workchain ID：$1（字节 $2），仅支持 0 和 -1","معرف workchain غير صالح: $1 (بايت $2). يدعم 0 و -1 فقط","شناسه workchain نامعتبر: $1 (بایت $2). فقط 0 و -1 مجاز است","ID workchain invalide : $1 (octet $2). Seuls 0 et -1 sont supportés","Ungültige Workchain-ID: $1 (Byte $2). Nur 0 und -1 unterstützt"]],
  [/^Неверная длина адреса: (.+) символов \(требуется 48 символов для User-Friendly или 66-67 для Raw\)$/, ["Invalid address length: $1 chars (48 required for User-Friendly or 66-67 for Raw)","Longitud de dirección inválida: $1 caracteres (se requieren 48 o 66-67)","地址长度无效：$1 个字符（需要 48 或 66-67 个字符）","طول العنوان غير صالح: $1 حرفاً (المطلوب 48 أو 66-67)","طول آدرس نامعتبر است: $1 کاراکتر (۴۸ یا ۶۶-۶۷ کاراکتر لازم است)","Longueur d'adresse invalide : $1 caractères (48 ou 66-67 requis)","Ungültige Adresslänge: $1 Zeichen (48 oder 66-67 erforderlich)"]],
  [/^Недопустимый формат Raw адреса: "(.+)"\. Ожидается <workchain>:<64 hex символа>$/, ["Invalid Raw address format: \"$1\". Expected <workchain>:<64 hex chars>","Formato Raw inválido: \"$1\". Se esperaba <workchain>:<64 hex>","无效的 Raw 地址格式：“$1”。应为 <workchain>:<64位十六进制>","تنسيق عنوان Raw غير صالح: \"$1\"","فرمت آدرس Raw نامعتبر است: «$1»","Format d'adresse Raw invalide : « $1 »","Ungültiges Raw-Adressformat: „$1“"]],
  [/^Недопустимый hexHash: "(.+)"$/, ["Invalid hexHash: \"$1\"","hexHash inválido: \"$1\"","无效的 hexHash：“$1”","قيمة hexHash غير صالحة: \"$1\"","مقدار hexHash نامعتبر: «$1»","hexHash invalide : « $1 »","Ungültiger hexHash: „$1“"]],
  [/^Недопустимый адрес TON: "(.+)"$/, ["Invalid TON address: \"$1\"","Dirección TON inválida: \"$1\"","无效的 TON 地址：“$1”","عنوان TON غير صالح: \"$1\"","آدرس TON نامعتبر: «$1»","Adresse TON invalide : « $1 »","Ungültige TON-Adresse: „$1“"]],
  [/^Кошелек (.+) не вернул адрес авторизации\. Подтвердите подключение в приложении или введите адрес вручную\.$/, ["Wallet $1 did not return an authorization address. Confirm in the wallet app or enter your address manually.","La billetera $1 no devolvió una dirección. Confirme en la app o ingrésela manualmente.","钱包 $1 未返回授权地址。请在钱包应用中确认或手动输入地址。","لم تُرجع المحفظة $1 عنوان التفويض. أكد الاتصال في التطبيق أو أدخل العنوان يدوياً.","کیف پول $1 آدرس را برنگرداند. اتصال را در برنامه تایید کنید یا آدرس را دستی وارد نمایید.","Le portefeuille $1 n'a pas renvoyé d'adresse. Confirmez dans l'application ou saisissez-la manuellement.","Wallet $1 hat keine Autorisierungsadresse zurückgegeben. Bitte in der App bestätigen oder manuell eingeben."]],
  [/^Ошибка генерации адреса: (.+)$/, ["Address generation error: $1","Error de generación de dirección: $1","地址生成错误：$1","خطأ في توليد العنوان: $1","خطا در تولید آدرس: $1","Erreur de génération d'adresse : $1","Fehler bei der Adressgenerierung: $1"]],
  [/^Ошибка разбора QR payload: (.+)$/, ["QR payload parse error: $1","Error al analizar el código QR: $1","二维码解析错误：$1","خطأ في قراءة بيانات رمز QR: $1","خطا در پردازش کد QR: $1","Erreur d'analyse du QR code : $1","Fehler beim Lesen des QR-Codes: $1"]],
  [/^Истекает: (.+)$/, ["Expires: $1","Expira: $1","到期时间：$1","تنتهي الصلاحية: $1","انقضا: $1","Expire : $1","Läuft ab: $1"]],
  [/^До закрытия: (.+) дн\.$/, ["Closes in: $1 d","Cierra en: $1 d","距截止：$1 天","يُغلق خلال: $1 يوم","تا پایان: $1 روز","Fermeture dans : $1 j","Schließt in: $1 T."]],
  [/^До закрытия: (.+) ч\.$/, ["Closes in: $1 h","Cierra en: $1 h","距截止：$1 小时","يُغلق خلال: $1 س","تا پایان: $1 ساعت","Fermeture dans : $1 h","Schließt in: $1 Std."]],
  [/^До закрытия: (.+) мин\.$/, ["Closes in: $1 min","Cierra en: $1 min","距截止：$1 分钟","يُغلق خلال: $1 د","تا پایان: $1 دقیقه","Fermeture dans : $1 min","Schließt in: $1 Min."]],
  [/^через (.+) д (.+) ч$/, ["in $1d $2h","en $1d $2h","$1天$2小时后","خلال $1 يوم و $2 ساعة","تا $1 روز و $2 ساعت دیگر","dans $1j $2h","in $1 T. $2 Std."]],
  [/^через (.+) ч (.+) мин$/, ["in $1h $2m","en $1h $2min","$1小时$2分钟后","خلال $1 ساعة و $2 دقيقة","تا $1 ساعت و $2 دقیقه دیگر","dans $1h $2min","in $1 Std. $2 Min."]],
  [/^через (.+) мин$/, ["in $1 min","en $1 min","$1 分钟后","خلال $1 دقيقة","تا $1 دقیقه دیگر","dans $1 min","in $1 Min."]],
  [/^(\d+) ч (\d+) мин$/, ["$1h $2m","$1h $2min","$1 小时 $2 分钟","$1 س $2 د","$1 ساعت و $2 دقیقه","$1 h $2 min","$1 Std. $2 Min."]],
  [/^(\d+) мин$/, ["$1 min","$1 min","$1 分钟","$1 د","$1 دقیقه","$1 min","$1 Min."]],
  [/^([0-9.]+) Б$/, ["$1 B","$1 B","$1 B","$1 بايت","$1 بایت","$1 o","$1 B"]],
  [/^([0-9.]+) КБ$/, ["$1 KB","$1 KB","$1 KB","$1 كيلوبايت","$1 کیلوبایت","$1 Ko","$1 KB"]],
  [/^([0-9.]+) МБ$/, ["$1 MB","$1 MB","$1 MB","$1 ميجابايت","$1 مگابایت","$1 Mo","$1 MB"]],
  [/^([0-9.]+) ГБ$/, ["$1 GB","$1 GB","$1 GB","$1 جيجابايت","$1 گیگابایت","$1 Go","$1 GB"]],
  [/^ZK-Рейтинг: (.+) \((.+) сделок\)$/, ["ZK-Rating: $1 ($2 deals)","Calificación ZK: $1 ($2 operaciones)","ZK 评分：$1（$2 笔交易）","تصنيف ZK: $1 ($2 صفقات)","رتبه ZK: $1 ($2 معامله)","Note ZK : $1 ($2 transactions)","ZK-Rating: $1 ($2 Geschäfte)"]],
  [/^Изображение (\d+)$/, ["Image $1","Imagen $1","图片 $1","صورة $1","تصویر $1","Image $1","Bild $1"]],
  [/^(.+) и другие печатают…$/, ["$1 and others are typing…","$1 y otros están escribiendo…","$1 等人正在输入…","$1 وآخرون يكتبون…","$1 و دیگران در حال نوشتن…","$1 et d'autres écrivent…","$1 und andere schreiben…"]],
  [/^(.+) печатают…$/, ["$1 are typing…","$1 están escribiendo…","$1 正在输入…","$1 يكتبون…","$1 در حال نوشتن…","$1 écrivent…","$1 schreiben…"]],
  [/^(.+) печатает…$/, ["$1 is typing…","$1 está escribiendo…","$1 正在输入…","$1 يكتب…","$1 در حال نوشتن…","$1 écrit…","$1 schreibt…"]],
  [/^BLE-скан недоступен \((.+)\), авто-восстановление через (.+) с$/, ["BLE scan unavailable ($1), auto-recovery in $2s","Escaneo BLE no disponible ($1), recuperación en $2s","BLE 扫描不可用 ($1)，$2 秒后自动恢复","مسح BLE غير متاح ($1)، استعادة تلقائية خلال $2 ث","اسکن BLE در دسترس نیست ($1)، بازیابی خودکار تا $2 ثانیه","Scan BLE indisponible ($1), reprise auto dans $2 s","BLE-Scan nicht verfügbar ($1), Auto-Recovery in $2s"]],
  [/^(\d+) ([а-яА-ЯёЁ]+) (\d+) г\.$/, ["$1 $2 $3","$1 $2 $3","$3年 $2 $1日","$1 $2 $3","$1 $2 $3","$1 $2 $3","$1. $2 $3"]],
  [/^\[E2EE initializeSessionB\] OPK с id (.+) отсутствует или уже использован локально \(OPK consumed\)\. 3-DH fallback запрещен\.$/, ["[E2EE initializeSessionB] OPK $1 is missing or already consumed locally. 3-DH fallback is forbidden.","[E2EE initializeSessionB] OPK $1 ausente o ya consumido. Fallback 3-DH prohibido.","[E2EE initializeSessionB] OPK $1 缺失或已在本地消耗，禁止 3-DH 降级。","[E2EE initializeSessionB] المفتاح OPK $1 مفقود أو مستهلك. يمنع التراجع إلى 3-DH.","[E2EE initializeSessionB] کلید OPK $1 موجود نیست یا قبلاً مصرف شده است.","[E2EE initializeSessionB] OPK $1 manquant ou déjà consommé. Repli 3-DH interdit.","[E2EE initializeSessionB] OPK $1 fehlt oder bereits verbraucht. 3-DH-Fallback verboten."]],
  [/^\[E2EE Fail-Closed\] OPK с id (.+) для пира (.+) уже был использован ранее \(CR-2\)\. Повторная инициализация с сожженным OPK запрещена до успешного fresh-fetch\.$/, ["[E2EE Fail-Closed] OPK $1 for peer $2 was already consumed (CR-2). Re-initialization with burned OPK is forbidden.","[E2EE Fail-Closed] OPK $1 para $2 ya fue utilizado (CR-2).","[E2EE Fail-Closed] 节点 $2 的 OPK $1 已被使用 (CR-2)，禁止重复初始化。","[E2EE Fail-Closed] المفتاح OPK $1 للقرين $2 مستخدم مسبقاً (CR-2).","[E2EE Fail-Closed] کلید OPK $1 برای $2 قبلاً استفاده شده است (CR-2).","[E2EE Fail-Closed] OPK $1 pour $2 déjà consommé (CR-2).","[E2EE Fail-Closed] OPK $1 für Peer $2 wurde bereits verwendet (CR-2)."]],
  [/^\[E2EE Fail-Closed\] Не удалось получить Prekey Bundle для (.+): отсутствует сетевой доступ и нет валидного оффлайн-бандла\.$/, ["[E2EE Fail-Closed] Failed to fetch Prekey Bundle for $1: offline and no cached bundle available.","[E2EE Fail-Closed] No se pudo obtener el Prekey Bundle para $1: sin red ni paquete offline.","[E2EE Fail-Closed] 无法获取 $1 的预密钥包：无网络连接且无有效离线包。","[E2EE Fail-Closed] تعذر جلب حزمة المفاتيح المسبقة لـ $1: لا يوجد اتصال أو حزمة مخزنة.","[E2EE Fail-Closed] دریافت بسته کلید برای $1 ناموفق بود: عدم دسترسی به شبکه.","[E2EE Fail-Closed] Impossible d'obtenir le Prekey Bundle pour $1 : hors ligne.","[E2EE Fail-Closed] Prekey-Bundle für $1 konnte nicht abgerufen werden: offline."]],
  [/^\[E2EE DoubleRatchet\] Превышен лимит пропуска ключей (pn|ns) \((.+)\)$/, ["[E2EE DoubleRatchet] Key skip limit exceeded for $1 ($2)","[E2EE DoubleRatchet] Límite de salto de claves $1 excedido ($2)","[E2EE DoubleRatchet] 超出密钥跳过上限 $1 ($2)","[E2EE DoubleRatchet] تم تجاوز حد تخطي المفاتيح $1 ($2)","[E2EE DoubleRatchet] محدودیت پرش کلید $1 رد شد ($2)","[E2EE DoubleRatchet] Limite de saut de clés $1 dépassée ($2)","[E2EE DoubleRatchet] Schlüssel-Skip-Limit $1 überschritten ($2)"]],
  [/^\[E2EE DoubleRatchet\] Ключ сообщения ns=(.+) уже использован локально \(текущий nr=(.+), HistoricalOlder\)$/, ["[E2EE DoubleRatchet] Message key ns=$1 already consumed locally (current nr=$2, HistoricalOlder)","[E2EE DoubleRatchet] Clave de mensaje ns=$1 ya utilizada localmente (nr actual=$2, HistoricalOlder)","[E2EE DoubleRatchet] 消息密钥 ns=$1 已在本地使用 (当前 nr=$2, HistoricalOlder)","[E2EE DoubleRatchet] مفتاح الرسالة ns=$1 مستخدم محلياً بالفعل (nr الحالي=$2, HistoricalOlder)","[E2EE DoubleRatchet] کلید پیام ns=$1 قبلاً در حافظه مصرف شده است (nr فعلی=$2, HistoricalOlder)","[E2EE DoubleRatchet] Clé de message ns=$1 déjà utilisée localement (nr actuel=$2, HistoricalOlder)","[E2EE DoubleRatchet] Nachrichtenschlüssel ns=$1 bereits lokal verbraucht (aktueller nr=$2, HistoricalOlder)"]],
  [/^\[X25519\] Некорректный приватный ключ: (.+) байт \(ожидается 32\)\. Ключи в хранилище повреждены — требуется регенерация\.$/, ["[X25519] Invalid private key: $1 bytes (expected 32). Stored keys corrupted — regeneration required.","[X25519] Clave privada inválida: $1 bytes (esperado 32). Se requiere regeneración.","[X25519] 私钥无效：$1 字节（应为 32）。存储密钥已损坏，需重新生成。","[X25519] مفتاح خاص غير صالح: $1 بايت (المتوقع 32).","[X25519] کلید خصوصی نامعتبر: $1 بایت (۳۲ بایت مورد انتظار است).","[X25519] Clé privée invalide : $1 octets (32 attendus).","[X25519] Ungültiger privater Schlüssel: $1 Bytes (32 erwartet)."]],
  [/^\[X25519\] Некорректный публичный ключ: (.+) байт \(ожидается 32\)\.$/, ["[X25519] Invalid public key: $1 bytes (expected 32).","[X25519] Clave pública inválida: $1 bytes (esperado 32).","[X25519] 公钥无效：$1 字节（应为 32）。","[X25519] مفتاح عام غير صالح: $1 بايت (المتوقع 32).","[X25519] کلید عمومی نامعتبر: $1 بایت (۳۲ بایت مورد انتظار است).","[X25519] Clé publique invalide : $1 octets (32 attendus).","[X25519] Ungültiger öffentlicher Schlüssel: $1 Bytes (32 erwartet)."]],
  [/^Нарушение синхронизации эпох\. Текущая эпоха: (.+), получена: (.+)$/, ["Epoch sync violation. Current epoch: $1, received: $2","Violación de sincronización de época. Actual: $1, recibida: $2","纪元同步冲突。当前纪元：$1，收到：$2","تعارض مزامنة الحقبة. الحالية: $1، المستلمة: $2","عدم تطابق دوره (Epoch). دوره فعلی: $1، دریافتی: $2","Violation de synchronisation d'époque. Actuelle : $1, reçue : $2","Epochen-Synchronisationsfehler. Aktuell: $1, empfangen: $2"]],
  [/^Несовпадение эпохи сообщения\. Эпоха сообщения: (.+), текущая эпоха: (.+)$/, ["Message epoch mismatch. Message epoch: $1, current epoch: $2","Desajuste de época del mensaje. Mensaje: $1, actual: $2","消息纪元不匹配。消息纪元：$1，当前纪元：$2","عدم تطابق حقبة الرسالة. حقبة الرسالة: $1، الحالية: $2","عدم تطابق دوره پیام. دوره پیام: $1، دوره فعلی: $2","Incohérence d'époque du message. Message : $1, actuelle : $2","Nachrichten-Epoche stimmt nicht überein. Nachricht: $1, aktuell: $2"]]
,
  [/^(\d+) топиков$/, ["$1 topics","$1 temas","$1 个话题","$1 مواضيع","$1 تاپیک","$1 sujets","$1 Themen"]],
  [/^BLE Mesh Активен \((.+)\)$/, ["BLE Mesh Active ($1)","BLE Mesh Activo ($1)","BLE Mesh 已激活 ($1)","شبكة BLE Mesh نشطة ($1)","شبکه BLE Mesh فعال ($1)","BLE Mesh Actif ($1)","BLE Mesh Aktiv ($1)"]],
  [/^Удалено конвертов: (\d+)$/, ["Purged envelopes: $1","Sobres eliminados: $1","已清理信封：$1","تم مسح المظاريف: $1","پاکت‌های حذف‌شده: $1","Enveloppes purgées : $1","Gelöschte Umschläge: $1"]],
  [/^Выполнено: (.+) для #(.+)$/, ["Completed: $1 for #$2","Completado: $1 para #$2","已执行：#$2 的 $1","تم التنفيذ: $1 لـ #$2","انجام شد: $1 برای #$2","Exécuté : $1 pour #$2","Ausgeführt: $1 für #$2"]],
  [/^Не удалось загрузить данные: (.+)$/, ["Failed to load data: $1","No se pudieron cargar los datos: $1","无法加载数据：$1","تعذر تحميل البيانات: $1","بارگذاری داده‌ها ناموفق بود: $1","Impossible de charger les données : $1","Daten konnten nicht geladen werden: $1"]],
  [/^Аккаунт создан (.+)$/, ["Account created $1","Cuenta creada el $1","账户创建于 $1","تم إنشاء الحساب $1","حساب در تاریخ $1 ایجاد شد","Compte créé le $1","Konto erstellt am $1"]],
];

const CYRILLIC_RE = /[А-Яа-яЁё]/;

function normalizeLang(lang?: string): SupportedLanguage {
  const raw = (lang || i18n.language || 'ru').toLowerCase().split('-')[0];
  if (raw === 'en' || raw === 'es' || raw === 'zh' || raw === 'ar' || raw === 'fa' || raw === 'fr' || raw === 'de') {
    return raw;
  }
  return 'ru';
}

/**
 * Translates a Russian UI string or dynamic template output into the active language.
 * Returns the original string unchanged when lang === 'ru' or when no Cyrillic is present.
 */
export function translateUiText(raw: string, lang?: string): string {
  if (!raw || typeof raw !== 'string') return raw;
  const targetLang = normalizeLang(lang);
  if (targetLang === 'ru') return raw;
  if (!CYRILLIC_RE.test(raw)) return raw;

  const idx = TARGET_LANGS.indexOf(targetLang);
  if (idx === -1) return raw;

  const leadMatch = raw.match(/^\s*/);
  const trailMatch = raw.match(/\s*$/);
  const lead = leadMatch ? leadMatch[0] : '';
  const trail = trailMatch ? trailMatch[0] : '';
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  const collapsed = trimmed.replace(/\s+/g, ' ');
  const exact = EXACT_DICTIONARY[trimmed] || EXACT_DICTIONARY[collapsed];
  if (exact) {
    return lead + exact[idx] + trail;
  }

  // Handle outer punctuation/brackets wrapping a known phrase
  const outerMatch = trimmed.match(/^([•·—\-–(\[\s«"']*)([\s\S]*?)([)\].,:;!?»"'\s]*)$/);
  if (outerMatch) {
    const [, pfx, core, sfx] = outerMatch;
    if ((pfx || sfx) && EXACT_DICTIONARY[core]) {
      return lead + pfx + EXACT_DICTIONARY[core][idx] + sfx + trail;
    }
  }

  for (let p = 0; p < REGEX_PATTERNS.length; p++) {
    const [re, targets] = REGEX_PATTERNS[p];
    const m = trimmed.match(re);
    if (m) {
      let out = targets[idx];
      for (let i = 1; i < m.length; i++) {
        const sub = m[i] !== undefined ? translateUiText(m[i], targetLang) : '';
        out = out.split('$' + i).join(sub);
      }
      return lead + out + trail;
    }
  }

  return raw;
}

interface TextNodeRecord {
  raw: string;
  translated: string;
}

const textNodeMemory = new WeakMap<Text, TextNodeRecord>();
const attrMemory = new WeakMap<Element, Record<string, { raw: string; translated: string }>>();
const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'] as const;

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA']);

function processTextNode(node: Text, lang: SupportedLanguage): void {
  const parent = node.parentElement;
  if (parent) {
    if (SKIP_TAGS.has(parent.tagName)) return;
    if (parent.isContentEditable || parent.closest('[contenteditable="true"], [data-no-auto-i18n="true"]')) return;
  }

  const currentVal = node.nodeValue || '';
  const mem = textNodeMemory.get(node);

  // Determine the original Russian source string
  let sourceRaw = currentVal;
  if (mem) {
    if (currentVal === mem.translated) {
      sourceRaw = mem.raw;
    } else if (CYRILLIC_RE.test(currentVal)) {
      sourceRaw = currentVal;
    } else {
      return;
    }
  } else {
    if (!CYRILLIC_RE.test(currentVal)) return;
  }

  if (lang === 'ru') {
    if (currentVal !== sourceRaw) {
      node.nodeValue = sourceRaw;
    }
    textNodeMemory.set(node, { raw: sourceRaw, translated: sourceRaw });
    return;
  }

  const nextVal = translateUiText(sourceRaw, lang);
  if (nextVal !== currentVal) {
    node.nodeValue = nextVal;
  }
  if (nextVal !== sourceRaw || mem) {
    textNodeMemory.set(node, { raw: sourceRaw, translated: nextVal });
  }
}

function processElementAttrs(el: Element, lang: SupportedLanguage): void {
  if (SKIP_TAGS.has(el.tagName)) return;
  let rec = attrMemory.get(el);

  for (let i = 0; i < TRANSLATABLE_ATTRS.length; i++) {
    const attr = TRANSLATABLE_ATTRS[i];
    const currentVal = el.getAttribute(attr);
    if (currentVal === null) continue;

    const saved = rec?.[attr];
    let sourceRaw = currentVal;
    if (saved) {
      if (currentVal === saved.translated) {
        sourceRaw = saved.raw;
      } else if (CYRILLIC_RE.test(currentVal)) {
        sourceRaw = currentVal;
      } else {
        continue;
      }
    } else {
      if (!CYRILLIC_RE.test(currentVal)) continue;
    }

    if (lang === 'ru') {
      if (currentVal !== sourceRaw) {
        el.setAttribute(attr, sourceRaw);
      }
      if (!rec) {
        rec = {};
        attrMemory.set(el, rec);
      }
      rec[attr] = { raw: sourceRaw, translated: sourceRaw };
      continue;
    }

    const nextVal = translateUiText(sourceRaw, lang);
    if (nextVal !== currentVal) {
      el.setAttribute(attr, nextVal);
    }
    if (nextVal !== sourceRaw || saved) {
      if (!rec) {
        rec = {};
        attrMemory.set(el, rec);
      }
      rec[attr] = { raw: sourceRaw, translated: nextVal };
    }
  }
}

export function applyDomTranslations(root: Node = typeof document !== 'undefined' ? document.body : (null as unknown as Node), lang?: string): void {
  if (!root || typeof document === 'undefined') return;
  const activeLang = normalizeLang(lang);

  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(root as Text, activeLang);
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    processElementAttrs(root as Element, activeLang);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current: Node | null = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      processTextNode(current as Text, activeLang);
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      processElementAttrs(current as Element, activeLang);
    }
    current = walker.nextNode();
  }
}

let observerInitialized = false;

export function initAutoDomTranslator(): void {
  if (observerInitialized || typeof window === 'undefined' || typeof document === 'undefined') return;
  observerInitialized = true;

  if (typeof window.confirm === 'function' && !(window.confirm as unknown as { __i18nWrapped?: boolean }).__i18nWrapped) {
    const origConfirm = window.confirm.bind(window);
    const wrappedConfirm = (message?: string): boolean => origConfirm(message ? translateUiText(message, i18n.language) : message);
    (wrappedConfirm as unknown as { __i18nWrapped?: boolean }).__i18nWrapped = true;
    window.confirm = wrappedConfirm;
  }

  const runInitial = () => {
    if (document.body) {
      applyDomTranslations(document.body, i18n.language);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInitial, { once: true });
  } else {
    runInitial();
  }

  const observer = new MutationObserver((mutations) => {
    const activeLang = normalizeLang(i18n.language);
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
        processTextNode(m.target as Text, activeLang);
      } else if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE) {
        processElementAttrs(m.target as Element, activeLang);
      } else if (m.type === 'childList') {
        for (let j = 0; j < m.addedNodes.length; j++) {
          applyDomTranslations(m.addedNodes[j], activeLang);
        }
      }
    }
  });

  const startObserving = () => {
    if (!document.body) return;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });
  };

  if (document.body) {
    startObserving();
  } else {
    document.addEventListener('DOMContentLoaded', startObserving, { once: true });
  }

  i18n.on('languageChanged', (newLang: string) => {
    if (document.body) {
      applyDomTranslations(document.body, newLang);
    }
  });
}
