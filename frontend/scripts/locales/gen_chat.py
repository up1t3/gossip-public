# -*- coding: utf-8 -*-
import json
import os

data = {
  "ru": {
    "list": {
      "title": "Чаты",
      "searchPlaceholder": "Поиск диалогов и сообщений...",
      "allChatsTab": "Все",
      "dlpSafeBadge": "Сейф",
      "emptyChats": "Чаты не найдены",
      "noSearchResults": "Ничего не найдено",
      "globalSearchTitle": "Глобальный поиск",
      "startChatPrompt": "Нажмите, чтобы начать общение",
      "messagesSection": "Сообщения",
      "createChatTooltip": "Новый чат / группа"
    },
    "folders": {
      "modalTitle": "Папки чатов",
      "modalTitleCreate": "Создать папку",
      "modalTitleEdit": "Редактировать папку",
      "createFolder": "Создать папку",
      "emptyTitle": "У вас пока нет папок",
      "emptyDesc": "Нажмите «Создать», чтобы добавить первую папку",
      "folderName": "Название папки",
      "folderNamePlaceholder": "Например: Работа, Семья, Сейф...",
      "folderIcon": "Иконка",
      "includedChats": "Включенные чаты",
      "dlpContourToggle": "Сейф-Контур (152-ФЗ / DLP)",
      "dlpContourDesc": "Запрет копирования, пересылки и экспорта сообщений из этой папки",
      "chatsCount": "Выбрано чатов: {{count}}",
      "saveFolder": "Сохранить папку",
      "deleteFolder": "Удалить папку"
    },
    "header": {
      "online": "в сети",
      "offline": "был(а) недавно",
      "typing": "печатает...",
      "recordingAudio": "записывает аудио...",
      "recordingVideo": "записывает видео-сообщение...",
      "groupMembers_one": "{{count}} участник",
      "groupMembers_few": "{{count}} участника",
      "groupMembers_many": "{{count}} участников",
      "groupMembers_other": "{{count}} участников",
      "menuSearch": "Поиск в чате",
      "menuTransfer": "Криптоперевод TON",
      "menuWallet": "Криптокошелек TON",
      "menuDlp": "Сейф-Контур (DLP)",
      "menuGroupInfo": "Информация о группе",
      "menuDeleteChat": "Удалить чат",
      "menuClearHistory": "Очистить историю"
    },
    "pinned": {
      "pinnedMessage": "Закрепленное сообщение",
      "unpin": "Открепить",
      "multiplePinned": "{{current}} из {{total}} закреплений"
    },
    "input": {
      "placeholder": "Сообщение",
      "replyTitle": "Ответ на сообщение",
      "editTitle": "Редактирование сообщения",
      "sendTooltip": "Отправить",
      "recordVoiceTooltip": "Зажмите для записи голоса, нажмите для видео-кружка",
      "recordVideoTooltip": "Зажмите для записи видео-кружка, нажмите для голоса",
      "recordingVoice": "Запись аудио: {{duration}} сек",
      "attachFile": "Прикрепить файл, фото или видео",
      "emojiPicker": "Смайлики и стикеры",
      "uploadingProgress": "Загрузка на сервер: {{progress}}%",
      "uploadReady": "Файл готов к отправке",
      "captionPlaceholder": "Добавить подпись..."
    },
    "mediaDrawer": {
      "title": "Прикрепить к сообщению",
      "liveCamera": "Камера",
      "gallery": "Галерея",
      "gallerySub": "Медиа",
      "file": "Файл",
      "fileSub": "Документ",
      "location": "Геолокация",
      "tonTransfer": "TON",
      "tonSub": "Перевод",
      "fullscreen": "Полный экран",
      "cameraSwitch": "Сменить камеру",
      "flashToggle": "Вспышка"
    },
    "sharedMedia": {
      "title": "Материалы чата",
      "tabMedia": "Медиа",
      "tabFiles": "Файлы",
      "tabVoice": "Голосовые",
      "tabLinks": "Ссылки",
      "emptyMedia": "Нет общих медиафайлов",
      "emptyFiles": "Нет прикрепленных файлов",
      "emptyVoice": "Нет голосовых сообщений",
      "emptyLinks": "Нет сохраненных ссылок"
    },
    "messageMenu": {
      "reply": "Ответить",
      "copy": "Копировать текст",
      "edit": "Изменить",
      "pin": "Закрепить",
      "unpin": "Открепить",
      "forward": "Переслать",
      "deleteForMe": "Удалить у меня",
      "deleteForEveryone": "Удалить у всех",
      "saveMedia": "Сохранить файл",
      "report": "Пожаловаться"
    },
    "serviceMessages": {
      "sessionReset": "Системное сообщение: криптографическая сессия обновлена",
      "chatCreated": "Чат создан с защитой MLS E2EE",
      "groupCreated": "Группа создана пользователем {{user}}",
      "userJoined": "{{user}} присоединился(-лась) к группе",
      "userLeft": "{{user}} покинул(а) группу"
    },
    "group": {
      "manageTitle": "Группа: {{name}}",
      "epochLabel": "Текущая эпоха MLS:",
      "addMember": "Добавить участника",
      "membersCount": "Участники ({{count}})",
      "removeMember": "Удалить"
    },
    "bots": {
      "title": "Боты и Интеграции",
      "createNew": "Создать нового бота",
      "tokenLabel": "HTTP API Токен бота"
    }
  },
  "en": {
    "list": {
      "title": "Chats",
      "searchPlaceholder": "Search chats and messages...",
      "allChatsTab": "All",
      "dlpSafeBadge": "Vault",
      "emptyChats": "No chats found",
      "noSearchResults": "Nothing found",
      "globalSearchTitle": "Global Search",
      "startChatPrompt": "Click to start chatting",
      "messagesSection": "Messages",
      "createChatTooltip": "New chat / group"
    },
    "folders": {
      "modalTitle": "Chat Folders",
      "modalTitleCreate": "Create Folder",
      "modalTitleEdit": "Edit Folder",
      "createFolder": "Create Folder",
      "emptyTitle": "You have no folders yet",
      "emptyDesc": "Click \"Create\" to add your first folder",
      "folderName": "Folder Name",
      "folderNamePlaceholder": "E.g.: Work, Family, Vault...",
      "folderIcon": "Icon",
      "includedChats": "Included Chats",
      "dlpContourToggle": "Safe Contour (DLP / Compliance)",
      "dlpContourDesc": "Prevents copying, forwarding, and exporting messages from this folder",
      "chatsCount": "Selected chats: {{count}}",
      "saveFolder": "Save Folder",
      "deleteFolder": "Delete Folder"
    },
    "header": {
      "online": "online",
      "offline": "last seen recently",
      "typing": "typing...",
      "recordingAudio": "recording audio...",
      "recordingVideo": "recording video note...",
      "groupMembers_one": "{{count}} member",
      "groupMembers_few": "{{count}} members",
      "groupMembers_many": "{{count}} members",
      "groupMembers_other": "{{count}} members",
      "menuSearch": "Search in Chat",
      "menuTransfer": "TON Crypto Transfer",
      "menuWallet": "TON Crypto Wallet",
      "menuDlp": "Safe Contour (DLP)",
      "menuGroupInfo": "Group Info",
      "menuDeleteChat": "Delete Chat",
      "menuClearHistory": "Clear History"
    },
    "pinned": {
      "pinnedMessage": "Pinned Message",
      "unpin": "Unpin",
      "multiplePinned": "{{current}} of {{total}} pinned"
    },
    "input": {
      "placeholder": "Message",
      "replyTitle": "Replying to message",
      "editTitle": "Editing message",
      "sendTooltip": "Send",
      "recordVoiceTooltip": "Hold to record voice, tap for video note",
      "recordVideoTooltip": "Hold to record video note, tap for voice",
      "recordingVoice": "Recording audio: {{duration}}s",
      "attachFile": "Attach file, photo or video",
      "emojiPicker": "Emoji & Stickers",
      "uploadingProgress": "Uploading to server: {{progress}}%",
      "uploadReady": "File ready to send",
      "captionPlaceholder": "Add a caption..."
    },
    "mediaDrawer": {
      "title": "Attach to message",
      "liveCamera": "Camera",
      "gallery": "Gallery",
      "gallerySub": "Media",
      "file": "File",
      "fileSub": "Document",
      "location": "Location",
      "tonTransfer": "TON",
      "tonSub": "Transfer",
      "fullscreen": "Fullscreen",
      "cameraSwitch": "Switch Camera",
      "flashToggle": "Flash"
    },
    "sharedMedia": {
      "title": "Shared Media",
      "tabMedia": "Media",
      "tabFiles": "Files",
      "tabVoice": "Voice",
      "tabLinks": "Links",
      "emptyMedia": "No shared media files",
      "emptyFiles": "No attached files",
      "emptyVoice": "No voice messages",
      "emptyLinks": "No saved links"
    },
    "messageMenu": {
      "reply": "Reply",
      "copy": "Copy Text",
      "edit": "Edit",
      "pin": "Pin",
      "unpin": "Unpin",
      "forward": "Forward",
      "deleteForMe": "Delete for Me",
      "deleteForEveryone": "Delete for Everyone",
      "saveMedia": "Save File",
      "report": "Report"
    },
    "serviceMessages": {
      "sessionReset": "System message: cryptographic session renewed",
      "chatCreated": "Chat created with MLS E2EE protection",
      "groupCreated": "Group created by {{user}}",
      "userJoined": "{{user}} joined the group",
      "userLeft": "{{user}} left the group"
    },
    "group": {
      "manageTitle": "Group: {{name}}",
      "epochLabel": "Current MLS Epoch:",
      "addMember": "Add Member",
      "membersCount": "Members ({{count}})",
      "removeMember": "Remove"
    },
    "bots": {
      "title": "Bots & Integrations",
      "createNew": "Create New Bot",
      "tokenLabel": "Bot HTTP API Token"
    }
  },
  "es": {
    "list": {
      "title": "Chats",
      "searchPlaceholder": "Buscar chats y mensajes...",
      "allChatsTab": "Todos",
      "dlpSafeBadge": "Bóveda",
      "emptyChats": "No se encontraron chats",
      "noSearchResults": "No se encontró nada",
      "globalSearchTitle": "Búsqueda global",
      "startChatPrompt": "Toca para iniciar una conversación",
      "messagesSection": "Mensajes",
      "createChatTooltip": "Nuevo chat / grupo"
    },
    "folders": {
      "modalTitle": "Carpetas de chat",
      "modalTitleCreate": "Crear carpeta",
      "modalTitleEdit": "Editar carpeta",
      "createFolder": "Crear carpeta",
      "emptyTitle": "Aún no tienes carpetas",
      "emptyDesc": "Toca «Crear» para añadir tu primera carpeta",
      "folderName": "Nombre de la carpeta",
      "folderNamePlaceholder": "Ej.: Trabajo, Familia, Bóveda...",
      "folderIcon": "Icono",
      "includedChats": "Chats incluidos",
      "dlpContourToggle": "Contorno Seguro (DLP)",
      "dlpContourDesc": "Prohíbe copiar, reenviar y exportar mensajes de esta carpeta",
      "chatsCount": "Chats seleccionados: {{count}}",
      "saveFolder": "Guardar carpeta",
      "deleteFolder": "Eliminar carpeta"
    },
    "header": {
      "online": "en línea",
      "offline": "visto recientemente",
      "typing": "escribiendo...",
      "recordingAudio": "grabando audio...",
      "recordingVideo": "grabando videomensaje...",
      "groupMembers_one": "{{count}} miembro",
      "groupMembers_few": "{{count}} miembros",
      "groupMembers_many": "{{count}} miembros",
      "groupMembers_other": "{{count}} miembros",
      "menuSearch": "Buscar en el chat",
      "menuTransfer": "Transferencia TON",
      "menuWallet": "Billetera TON",
      "menuDlp": "Contorno Seguro (DLP)",
      "menuGroupInfo": "Información del grupo",
      "menuDeleteChat": "Eliminar chat",
      "menuClearHistory": "Vaciar historial"
    },
    "pinned": {
      "pinnedMessage": "Mensaje fijado",
      "unpin": "Desfijar",
      "multiplePinned": "{{current}} de {{total}} fijados"
    },
    "input": {
      "placeholder": "Mensaje",
      "replyTitle": "Respondiendo a mensaje",
      "editTitle": "Editando mensaje",
      "sendTooltip": "Enviar",
      "recordVoiceTooltip": "Mantén presionado para voz, toca para videonota",
      "recordVideoTooltip": "Mantén presionado para videonota, toca para voz",
      "recordingVoice": "Grabando audio: {{duration}} s",
      "attachFile": "Adjuntar archivo, foto o video",
      "emojiPicker": "Emojis y stickers",
      "uploadingProgress": "Subiendo al servidor: {{progress}}%",
      "uploadReady": "Archivo listo para enviar",
      "captionPlaceholder": "Añadir un comentario..."
    },
    "mediaDrawer": {
      "title": "Adjuntar al mensaje",
      "liveCamera": "Cámara",
      "gallery": "Galería",
      "gallerySub": "Multimedia",
      "file": "Archivo",
      "fileSub": "Documento",
      "location": "Ubicación",
      "tonTransfer": "TON",
      "tonSub": "Transferir",
      "fullscreen": "Pantalla completa",
      "cameraSwitch": "Cambiar cámara",
      "flashToggle": "Flash"
    },
    "sharedMedia": {
      "title": "Archivos del chat",
      "tabMedia": "Multimedia",
      "tabFiles": "Archivos",
      "tabVoice": "Voz",
      "tabLinks": "Enlaces",
      "emptyMedia": "No hay archivos multimedia",
      "emptyFiles": "No hay archivos adjuntos",
      "emptyVoice": "No hay mensajes de voz",
      "emptyLinks": "No hay enlaces guardados"
    },
    "messageMenu": {
      "reply": "Responder",
      "copy": "Copiar texto",
      "edit": "Editar",
      "pin": "Fijar",
      "unpin": "Desfijar",
      "forward": "Reenviar",
      "deleteForMe": "Eliminar para mí",
      "deleteForEveryone": "Eliminar para todos",
      "saveMedia": "Guardar archivo",
      "report": "Reportar"
    },
    "serviceMessages": {
      "sessionReset": "Mensaje del sistema: sesión criptográfica renovada",
      "chatCreated": "Chat creado con protección MLS E2EE",
      "groupCreated": "Grupo creado por {{user}}",
      "userJoined": "{{user}} se unió al grupo",
      "userLeft": "{{user}} salió del grupo"
    },
    "group": {
      "manageTitle": "Grupo: {{name}}",
      "epochLabel": "Época MLS actual:",
      "addMember": "Añadir miembro",
      "membersCount": "Miembros ({{count}})",
      "removeMember": "Eliminar"
    },
    "bots": {
      "title": "Bots e Integraciones",
      "createNew": "Crear nuevo bot",
      "tokenLabel": "Token HTTP API del bot"
    }
  },
  "zh": {
    "list": {
      "title": "会话",
      "searchPlaceholder": "搜索对话与消息记录...",
      "allChatsTab": "全部",
      "dlpSafeBadge": "保险箱",
      "emptyChats": "未找到会话",
      "noSearchResults": "无搜索结果",
      "globalSearchTitle": "全局搜索",
      "startChatPrompt": "点击开始新的对话",
      "messagesSection": "消息",
      "createChatTooltip": "新建会话 / 群组"
    },
    "folders": {
      "modalTitle": "会话分组",
      "modalTitleCreate": "新建分组",
      "modalTitleEdit": "编辑分组",
      "createFolder": "新建分组",
      "emptyTitle": "暂无会话分组",
      "emptyDesc": "点击「新建」添加您的第一个分组",
      "folderName": "分组名称",
      "folderNamePlaceholder": "例如：工作、家人、机密...",
      "folderIcon": "图标",
      "includedChats": "包含的会话",
      "dlpContourToggle": "安全隔离区 (DLP 防泄露)",
      "dlpContourDesc": "禁止从此分组中的会话复制、转发和导出消息",
      "chatsCount": "已选择 {{count}} 个会话",
      "saveFolder": "保存分组",
      "deleteFolder": "删除分组"
    },
    "header": {
      "online": "在线",
      "offline": "最近在线",
      "typing": "正在输入...",
      "recordingAudio": "正在录制语音...",
      "recordingVideo": "正在录制视频留言...",
      "groupMembers_one": "{{count}} 位成员",
      "groupMembers_few": "{{count}} 位成员",
      "groupMembers_many": "{{count}} 位成员",
      "groupMembers_other": "{{count}} 位成员",
      "menuSearch": "在会话中搜索",
      "menuTransfer": "TON 加密转账",
      "menuWallet": "TON 加密钱包",
      "menuDlp": "安全隔离区 (DLP)",
      "menuGroupInfo": "群组信息",
      "menuDeleteChat": "删除会话",
      "menuClearHistory": "清空聊天记录"
    },
    "pinned": {
      "pinnedMessage": "置顶消息",
      "unpin": "取消置顶",
      "multiplePinned": "{{current}} / {{total}} 条置顶"
    },
    "input": {
      "placeholder": "输入消息",
      "replyTitle": "回复消息",
      "editTitle": "编辑消息",
      "sendTooltip": "发送",
      "recordVoiceTooltip": "长按录制语音，轻触切换视频留言",
      "recordVideoTooltip": "长按录制视频留言，轻触切换语音",
      "recordingVoice": "正在录音：{{duration}} 秒",
      "attachFile": "附加文件、照片或视频",
      "emojiPicker": "表情与贴纸",
      "uploadingProgress": "正在上传：{{progress}}%",
      "uploadReady": "文件已准备好发送",
      "captionPlaceholder": "添加说明..."
    },
    "mediaDrawer": {
      "title": "添加到消息",
      "liveCamera": "拍摄",
      "gallery": "相册",
      "gallerySub": "媒体",
      "file": "文件",
      "fileSub": "文档",
      "location": "位置",
      "tonTransfer": "TON",
      "tonSub": "转账",
      "fullscreen": "全屏",
      "cameraSwitch": "切换镜头",
      "flashToggle": "闪光灯"
    },
    "sharedMedia": {
      "title": "会话媒体库",
      "tabMedia": "媒体",
      "tabFiles": "文件",
      "tabVoice": "语音",
      "tabLinks": "链接",
      "emptyMedia": "暂无媒体文件",
      "emptyFiles": "暂无附加文件",
      "emptyVoice": "暂无语音消息",
      "emptyLinks": "暂无保存的链接"
    },
    "messageMenu": {
      "reply": "回复",
      "copy": "复制文本",
      "edit": "编辑",
      "pin": "置顶",
      "unpin": "取消置顶",
      "forward": "转发",
      "deleteForMe": "仅对自己删除",
      "deleteForEveryone": "对所有人删除",
      "saveMedia": "保存文件",
      "report": "举报"
    },
    "serviceMessages": {
      "sessionReset": "系统提示：加密会话已重置更新",
      "chatCreated": "已创建启用 MLS E2EE 加密保护的会话",
      "groupCreated": "群组由 {{user}} 创建",
      "userJoined": "{{user}} 加入了群组",
      "userLeft": "{{user}} 离开了群组"
    },
    "group": {
      "manageTitle": "群组：{{name}}",
      "epochLabel": "当前 MLS 纪元：",
      "addMember": "添加成员",
      "membersCount": "群组成员 ({{count}})",
      "removeMember": "移除"
    },
    "bots": {
      "title": "机器人与集成",
      "createNew": "创建新机器人",
      "tokenLabel": "机器人 HTTP API 令牌"
    }
  },
  "ar": {
    "list": {
      "title": "المحادثات",
      "searchPlaceholder": "البحث في المحادثات والرسائل...",
      "allChatsTab": "الكل",
      "dlpSafeBadge": "خزنة",
      "emptyChats": "لا توجد محادثات",
      "noSearchResults": "لم يتم العثور على نتائج",
      "globalSearchTitle": "البحث العام",
      "startChatPrompt": "انقر لبدء محادثة جديدة",
      "messagesSection": "الرسائل",
      "createChatTooltip": "محادثة / مجموعة جديدة"
    },
    "folders": {
      "modalTitle": "مجلدات المحادثات",
      "modalTitleCreate": "إنشاء مجلد",
      "modalTitleEdit": "تعديل المجلد",
      "createFolder": "إنشاء مجلد",
      "emptyTitle": "ليس لديك مجلدات بعد",
      "emptyDesc": "اضغط على «إنشاء» لإضافة أول مجلد لك",
      "folderName": "اسم المجلد",
      "folderNamePlaceholder": "مثال: العمل، العائلة، الخزنة...",
      "folderIcon": "الأيقونة",
      "includedChats": "المحادثات المضمنة",
      "dlpContourToggle": "النطاق الآمن (حماية DLP)",
      "dlpContourDesc": "منع نسخ أو إعادة توجيه أو تصدير الرسائل من هذا المجلد",
      "chatsCount": "المحادثات المحددة: {{count}}",
      "saveFolder": "حفظ المجلد",
      "deleteFolder": "حذف المجلد"
    },
    "header": {
      "online": "متصل",
      "offline": "شوهد مؤخراً",
      "typing": "يكتب الآن...",
      "recordingAudio": "يسجل مقطعاً صوتياً...",
      "recordingVideo": "يسجل رسالة مرئية...",
      "groupMembers_zero": "٠ عضو",
      "groupMembers_one": "عضو واحد",
      "groupMembers_two": "عضوان",
      "groupMembers_few": "{{count}} أعضاء",
      "groupMembers_many": "{{count}} عضواً",
      "groupMembers_other": "{{count}} عضو",
      "menuSearch": "بحث في المحادثة",
      "menuTransfer": "تحويل TON مشفر",
      "menuWallet": "محفظة TON",
      "menuDlp": "النطاق الآمن (DLP)",
      "menuGroupInfo": "معلومات المجموعة",
      "menuDeleteChat": "حذف المحادثة",
      "menuClearHistory": "مسح السجل"
    },
    "pinned": {
      "pinnedMessage": "رسالة مثبتة",
      "unpin": "إلغاء التثبيت",
      "multiplePinned": "{{current}} من {{total}} مثبتات"
    },
    "input": {
      "placeholder": "اكتب رسالة...",
      "replyTitle": "الرد على الرسالة",
      "editTitle": "تعديل الرسالة",
      "sendTooltip": "إرسال",
      "recordVoiceTooltip": "اضغط باستمرار لتسجيل الصوت، اضغط للمرئي",
      "recordVideoTooltip": "اضغط باستمرار لتسجيل المرئي، اضغط للصوت",
      "recordingVoice": "تسجيل صوتي: {{duration}} ثانية",
      "attachFile": "إرفاق ملف أو صورة أو فيديو",
      "emojiPicker": "الرموز والملصقات",
      "uploadingProgress": "جارٍ الرفع: {{progress}}%",
      "uploadReady": "الملف جاهز للإرسال",
      "captionPlaceholder": "إضافة وصف..."
    },
    "mediaDrawer": {
      "title": "إرفاق بالمحادثة",
      "liveCamera": "الكاميرا",
      "gallery": "المعرض",
      "gallerySub": "وسائط",
      "file": "ملف",
      "fileSub": "مستند",
      "location": "الموقع",
      "tonTransfer": "TON",
      "tonSub": "تحويل",
      "fullscreen": "ملء الشاشة",
      "cameraSwitch": "تبديل الكاميرا",
      "flashToggle": "الفلاش"
    },
    "sharedMedia": {
      "title": "وسائط المحادثة",
      "tabMedia": "الوسائط",
      "tabFiles": "الملفات",
      "tabVoice": "الصوتيات",
      "tabLinks": "الروابط",
      "emptyMedia": "لا توجد وسائط مشتركة",
      "emptyFiles": "لا توجد ملفات مرفقة",
      "emptyVoice": "لا توجد رسائل صوتية",
      "emptyLinks": "لا توجد روابط محفوظة"
    },
    "messageMenu": {
      "reply": "رد",
      "copy": "نسخ النص",
      "edit": "تعديل",
      "pin": "تثبيت",
      "unpin": "إلغاء التثبيت",
      "forward": "إعادة توجيه",
      "deleteForMe": "حذف لدي",
      "deleteForEveryone": "حذف لدى الجميع",
      "saveMedia": "حفظ الملف",
      "report": "إبلاغ"
    },
    "serviceMessages": {
      "sessionReset": "رسالة نظام: تم تجديد الجلسة التشفيرية بنجاح",
      "chatCreated": "تم إنشاء المحادثة بحماية MLS E2EE",
      "groupCreated": "تم إنشاء المجموعة بواسطة {{user}}",
      "userJoined": "انضم {{user}} إلى المجموعة",
      "userLeft": "غادر {{user}} المجموعة"
    },
    "group": {
      "manageTitle": "المجموعة: {{name}}",
      "epochLabel": "حقبة MLS الحالية:",
      "addMember": "إضافة عضو",
      "membersCount": "الأعضاء ({{count}})",
      "removeMember": "إزالة"
    },
    "bots": {
      "title": "البوتات والتكاملات",
      "createNew": "إنشاء بوت جديد",
      "tokenLabel": "رمز HTTP API للبوت"
    }
  },
  "fa": {
    "list": {
      "title": "گفتگوها",
      "searchPlaceholder": "جستجوی گفتگوها و پیام‌ها...",
      "allChatsTab": "همه",
      "dlpSafeBadge": "گاوصندوق",
      "emptyChats": "گفتگویی یافت نشد",
      "noSearchResults": "موردی پیدا نشد",
      "globalSearchTitle": "جستجوی سراسری",
      "startChatPrompt": "برای شروع گفتگو ضربه بزنید",
      "messagesSection": "پیام‌ها",
      "createChatTooltip": "گفتگو / گروه جدید"
    },
    "folders": {
      "modalTitle": "پوشه‌های گفتگو",
      "modalTitleCreate": "ایجاد پوشه",
      "modalTitleEdit": "ویرایش پوشه",
      "createFolder": "ایجاد پوشه",
      "emptyTitle": "هنوز پوشه‌ای ندارید",
      "emptyDesc": "برای افزودن اولین پوشه روی «ایجاد» ضربه بزنید",
      "folderName": "نام پوشه",
      "folderNamePlaceholder": "مثال: کاری، خانواده، گاوصندوق...",
      "folderIcon": "آیکون",
      "includedChats": "گفتگوهای شامل‌شده",
      "dlpContourToggle": "محدوده امن (DLP)",
      "dlpContourDesc": "جلوگیری از کپی، هدایت و خروجی پیام‌های این پوشه",
      "chatsCount": "گفتگوهای انتخاب‌شده: {{count}}",
      "saveFolder": "ذخیره پوشه",
      "deleteFolder": "حذف پوشه"
    },
    "header": {
      "online": "آنلاین",
      "offline": "اخیراً آنلاین بوده",
      "typing": "در حال نوشتن...",
      "recordingAudio": "در حال ضبط صدا...",
      "recordingVideo": "در حال ضبط پیام ویدیویی...",
      "groupMembers_one": "{{count}} عضو",
      "groupMembers_few": "{{count}} عضو",
      "groupMembers_many": "{{count}} عضو",
      "groupMembers_other": "{{count}} عضو",
      "menuSearch": "جستجو در گفتگو",
      "menuTransfer": "انتقال رمزارز TON",
      "menuWallet": "کیف پول TON",
      "menuDlp": "محدوده امن (DLP)",
      "menuGroupInfo": "اطلاعات گروه",
      "menuDeleteChat": "حذف گفتگو",
      "menuClearHistory": "پاک کردن تاریخچه"
    },
    "pinned": {
      "pinnedMessage": "پیام سنجاق‌شده",
      "unpin": "برداشتن سنجاق",
      "multiplePinned": "{{current}} از {{total}} پیام سنجاق‌شده"
    },
    "input": {
      "placeholder": "پیام...",
      "replyTitle": "پاسخ به پیام",
      "editTitle": "ویرایش پیام",
      "sendTooltip": "ارسال",
      "recordVoiceTooltip": "برای ضبط صدا نگه دارید، برای ویدیوی دایره‌ای ضربه بزنید",
      "recordVideoTooltip": "برای ویدیوی دایره‌ای نگه دارید، برای صدا ضربه بزنید",
      "recordingVoice": "ضبط صدا: {{duration}} ثانیه",
      "attachFile": "پیوست فایل، عکس یا ویدیو",
      "emojiPicker": "شکلک‌ها و استیکرها",
      "uploadingProgress": "در حال بارگذاری: {{progress}}%",
      "uploadReady": "فایل آماده ارسال است",
      "captionPlaceholder": "افزودن توضیحات..."
    },
    "mediaDrawer": {
      "title": "پیوست به پیام",
      "liveCamera": "دوربین",
      "gallery": "گالری",
      "gallerySub": "رسانه",
      "file": "فایل",
      "fileSub": "سند",
      "location": "موقعیت مکانی",
      "tonTransfer": "TON",
      "tonSub": "انتقال",
      "fullscreen": "تمام‌صفحه",
      "cameraSwitch": "تغییر دوربین",
      "flashToggle": "فلاش"
    },
    "sharedMedia": {
      "title": "رسانه‌های گفتگو",
      "tabMedia": "رسانه‌ها",
      "tabFiles": "فایل‌ها",
      "tabVoice": "صداها",
      "tabLinks": "لینک‌ها",
      "emptyMedia": "رسانه مشترکی وجود ندارد",
      "emptyFiles": "فایل پیوستی وجود ندارد",
      "emptyVoice": "پیام صوتی وجود ندارد",
      "emptyLinks": "لینک ذخیره‌شده‌ای وجود ندارد"
    },
    "messageMenu": {
      "reply": "پاسخ",
      "copy": "کپی متن",
      "edit": "ویرایش",
      "pin": "سنجاق کردن",
      "unpin": "برداشتن سنجاق",
      "forward": "هدایت",
      "deleteForMe": "حذف برای من",
      "deleteForEveryone": "حذف برای همه",
      "saveMedia": "ذخیره فایل",
      "report": "گزارش"
    },
    "serviceMessages": {
      "sessionReset": "پیام سیستم: نشست رمزنگاری به‌روزرسانی شد",
      "chatCreated": "گفتگو با محافظت MLS E2EE ایجاد شد",
      "groupCreated": "گروه توسط {{user}} ایجاد شد",
      "userJoined": "{{user}} به گروه پیوست",
      "userLeft": "{{user}} گروه را ترک کرد"
    },
    "group": {
      "manageTitle": "گروه: {{name}}",
      "epochLabel": "دوره کنونی MLS:",
      "addMember": "افزودن عضو",
      "membersCount": "اعضا ({{count}})",
      "removeMember": "حذف"
    },
    "bots": {
      "title": "ربات‌ها و اتصالات",
      "createNew": "ایجاد ربات جدید",
      "tokenLabel": "توکن HTTP API ربات"
    }
  },
  "fr": {
    "list": {
      "title": "Discussions",
      "searchPlaceholder": "Rechercher discussions et messages...",
      "allChatsTab": "Tous",
      "dlpSafeBadge": "Coffre",
      "emptyChats": "Aucune discussion trouvée",
      "noSearchResults": "Aucun résultat",
      "globalSearchTitle": "Recherche globale",
      "startChatPrompt": "Touchez pour démarrer une conversation",
      "messagesSection": "Messages",
      "createChatTooltip": "Nouvelle discussion / groupe"
    },
    "folders": {
      "modalTitle": "Dossiers de discussion",
      "modalTitleCreate": "Créer un dossier",
      "modalTitleEdit": "Modifier le dossier",
      "createFolder": "Créer un dossier",
      "emptyTitle": "Vous n'avez pas encore de dossier",
      "emptyDesc": "Appuyez sur « Créer » pour ajouter votre premier dossier",
      "folderName": "Nom du dossier",
      "folderNamePlaceholder": "Ex. : Travail, Famille, Coffre...",
      "folderIcon": "Icône",
      "includedChats": "Discussions incluses",
      "dlpContourToggle": "Périmètre sécurisé (DLP)",
      "dlpContourDesc": "Interdit la copie, le transfert et l'exportation des messages de ce dossier",
      "chatsCount": "Discussions sélectionnées : {{count}}",
      "saveFolder": "Enregistrer le dossier",
      "deleteFolder": "Supprimer le dossier"
    },
    "header": {
      "online": "en ligne",
      "offline": "en ligne récemment",
      "typing": "écrit...",
      "recordingAudio": "enregistre un audio...",
      "recordingVideo": "enregistre un message vidéo...",
      "groupMembers_one": "{{count}} membre",
      "groupMembers_few": "{{count}} membres",
      "groupMembers_many": "{{count}} membres",
      "groupMembers_other": "{{count}} membres",
      "menuSearch": "Rechercher dans la discussion",
      "menuTransfer": "Transfert crypto TON",
      "menuWallet": "Portefeuille TON",
      "menuDlp": "Périmètre sécurisé (DLP)",
      "menuGroupInfo": "Infos du groupe",
      "menuDeleteChat": "Supprimer la discussion",
      "menuClearHistory": "Effacer l'historique"
    },
    "pinned": {
      "pinnedMessage": "Message épinglé",
      "unpin": "Détacher",
      "multiplePinned": "{{current}} sur {{total}} épinglés"
    },
    "input": {
      "placeholder": "Message",
      "replyTitle": "Réponse au message",
      "editTitle": "Modifier le message",
      "sendTooltip": "Envoyer",
      "recordVoiceTooltip": "Maintenir pour la voix, appuyer pour note vidéo",
      "recordVideoTooltip": "Maintenir pour note vidéo, appuyer pour voix",
      "recordingVoice": "Enregistrement audio : {{duration}} s",
      "attachFile": "Joindre un fichier, photo ou vidéo",
      "emojiPicker": "Émojis et autocollants",
      "uploadingProgress": "Téléversement : {{progress}}%",
      "uploadReady": "Fichier prêt à être envoyé",
      "captionPlaceholder": "Ajouter une légende..."
    },
    "mediaDrawer": {
      "title": "Joindre au message",
      "liveCamera": "Appareil photo",
      "gallery": "Galerie",
      "gallerySub": "Médias",
      "file": "Fichier",
      "fileSub": "Document",
      "location": "Localisation",
      "tonTransfer": "TON",
      "tonSub": "Transfert",
      "fullscreen": "Plein écran",
      "cameraSwitch": "Changer de caméra",
      "flashToggle": "Flash"
    },
    "sharedMedia": {
      "title": "Médias de la discussion",
      "tabMedia": "Médias",
      "tabFiles": "Fichiers",
      "tabVoice": "Vocaux",
      "tabLinks": "Liens",
      "emptyMedia": "Aucun média partagé",
      "emptyFiles": "Aucun fichier joint",
      "emptyVoice": "Aucun message vocal",
      "emptyLinks": "Aucun lien enregistré"
    },
    "messageMenu": {
      "reply": "Répondre",
      "copy": "Copier le texte",
      "edit": "Modifier",
      "pin": "Épingler",
      "unpin": "Détacher",
      "forward": "Transférer",
      "deleteForMe": "Supprimer pour moi",
      "deleteForEveryone": "Supprimer pour tous",
      "saveMedia": "Enregistrer le fichier",
      "report": "Signaler"
    },
    "serviceMessages": {
      "sessionReset": "Message système : session cryptographique renouvelée",
      "chatCreated": "Discussion créée avec protection MLS E2EE",
      "groupCreated": "Groupe créé par {{user}}",
      "userJoined": "{{user}} a rejoint le groupe",
      "userLeft": "{{user}} a quitté le groupe"
    },
    "group": {
      "manageTitle": "Groupe : {{name}}",
      "epochLabel": "Époque MLS actuelle :",
      "addMember": "Ajouter un membre",
      "membersCount": "Membres ({{count}})",
      "removeMember": "Supprimer"
    },
    "bots": {
      "title": "Bots et Intégrations",
      "createNew": "Créer un nouveau bot",
      "tokenLabel": "Jeton HTTP API du bot"
    }
  },
  "de": {
    "list": {
      "title": "Chats",
      "searchPlaceholder": "Chats und Nachrichten durchsuchen...",
      "allChatsTab": "Alle",
      "dlpSafeBadge": "Tresor",
      "emptyChats": "Keine Chats gefunden",
      "noSearchResults": "Nichts gefunden",
      "globalSearchTitle": "Globale Suche",
      "startChatPrompt": "Tippen Sie, um einen Chat zu starten",
      "messagesSection": "Nachrichten",
      "createChatTooltip": "Neuer Chat / Gruppe"
    },
    "folders": {
      "modalTitle": "Chat-Ordner",
      "modalTitleCreate": "Ordner erstellen",
      "modalTitleEdit": "Ordner bearbeiten",
      "createFolder": "Ordner erstellen",
      "emptyTitle": "Sie haben noch keine Ordner",
      "emptyDesc": "Tippen Sie auf «Erstellen», um Ihren ersten Ordner anzulegen",
      "folderName": "Ordnername",
      "folderNamePlaceholder": "Z. B.: Arbeit, Familie, Tresor...",
      "folderIcon": "Symbol",
      "includedChats": "Enthaltene Chats",
      "dlpContourToggle": "Sicherheitsbereich (DLP)",
      "dlpContourDesc": "Verhindert das Kopieren, Weiterleiten und Exportieren von Nachrichten aus diesem Ordner",
      "chatsCount": "Ausgewählte Chats: {{count}}",
      "saveFolder": "Ordner speichern",
      "deleteFolder": "Ordner löschen"
    },
    "header": {
      "online": "online",
      "offline": "zuletzt online",
      "typing": "tippt...",
      "recordingAudio": "nimmt Sprachnachricht auf...",
      "recordingVideo": "nimmt Videonachricht auf...",
      "groupMembers_one": "{{count}} Mitglied",
      "groupMembers_few": "{{count}} Mitglieder",
      "groupMembers_many": "{{count}} Mitglieder",
      "groupMembers_other": "{{count}} Mitglieder",
      "menuSearch": "Im Chat suchen",
      "menuTransfer": "TON-Kryptoüberweisung",
      "menuWallet": "TON-Wallet",
      "menuDlp": "Sicherheitsbereich (DLP)",
      "menuGroupInfo": "Gruppeninfo",
      "menuDeleteChat": "Chat löschen",
      "menuClearHistory": "Verlauf leeren"
    },
    "pinned": {
      "pinnedMessage": "Angeheftete Nachricht",
      "unpin": "Lösen",
      "multiplePinned": "{{current}} von {{total}} angeheftet"
    },
    "input": {
      "placeholder": "Nachricht",
      "replyTitle": "Antwort auf Nachricht",
      "editTitle": "Nachricht bearbeiten",
      "sendTooltip": "Senden",
      "recordVoiceTooltip": "Gedrückt halten für Sprache, tippen für Videonotiz",
      "recordVideoTooltip": "Gedrückt halten für Videonotiz, tippen für Sprache",
      "recordingVoice": "Sprachaufnahme: {{duration}} s",
      "attachFile": "Datei, Foto oder Video anhängen",
      "emojiPicker": "Emojis und Sticker",
      "uploadingProgress": "Wird hochgeladen: {{progress}}%",
      "uploadReady": "Datei bereit zum Senden",
      "captionPlaceholder": "Beschriftung hinzufügen..."
    },
    "mediaDrawer": {
      "title": "An Nachricht anhängen",
      "liveCamera": "Kamera",
      "gallery": "Galerie",
      "gallerySub": "Medien",
      "file": "Datei",
      "fileSub": "Dokument",
      "location": "Standort",
      "tonTransfer": "TON",
      "tonSub": "Überweisung",
      "fullscreen": "Vollbild",
      "cameraSwitch": "Kamera wechseln",
      "flashToggle": "Blitz"
    },
    "sharedMedia": {
      "title": "Geteilte Medien",
      "tabMedia": "Medien",
      "tabFiles": "Dateien",
      "tabVoice": "Sprache",
      "tabLinks": "Links",
      "emptyMedia": "Keine geteilten Medien",
      "emptyFiles": "Keine angehängten Dateien",
      "emptyVoice": "Keine Sprachnachrichten",
      "emptyLinks": "Keine gespeicherten Links"
    },
    "messageMenu": {
      "reply": "Antworten",
      "copy": "Text kopieren",
      "edit": "Bearbeiten",
      "pin": "Anheften",
      "unpin": "Lösen",
      "forward": "Weiterleiten",
      "deleteForMe": "Für mich löschen",
      "deleteForEveryone": "Für alle löschen",
      "saveMedia": "Datei speichern",
      "report": "Melden"
    },
    "serviceMessages": {
      "sessionReset": "Systemnachricht: Kryptografische Sitzung erneuert",
      "chatCreated": "Chat mit MLS-E2EE-Schutz erstellt",
      "groupCreated": "Gruppe von {{user}} erstellt",
      "userJoined": "{{user}} ist der Gruppe beigetreten",
      "userLeft": "{{user}} hat die Gruppe verlassen"
    },
    "group": {
      "manageTitle": "Gruppe: {{name}}",
      "epochLabel": "Aktuelle MLS-Epoche:",
      "addMember": "Mitglied hinzufügen",
      "membersCount": "Mitglieder ({{count}})",
      "removeMember": "Entfernen"
    },
    "bots": {
      "title": "Bots & Integrationen",
      "createNew": "Neuen Bot erstellen",
      "tokenLabel": "Bot-HTTP-API-Token"
    }
  }
}

def generate(base_dir):
    for lang, content in data.items():
        lang_dir = os.path.join(base_dir, lang)
        os.makedirs(lang_dir, exist_ok=True)
        with open(os.path.join(lang_dir, "chat.json"), "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
    print("✓ chat.json generated for all 8 languages")

if __name__ == "__main__":
    generate("e:/Boltalka/frontend/src/i18n/locales")
