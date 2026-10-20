# -*- coding: utf-8 -*-
import json
import os

data = {
  "ru": {
    "incoming": {
      "title": "Входящий вызов",
      "subtitleAudio": "Аудиозвонок Gossip E2EE...",
      "subtitleVideo": "Видеозвонок Gossip E2EE...",
      "acceptAudio": "Ответить",
      "acceptVideo": "Видеоответ",
      "decline": "Отклонить"
    },
    "outgoing": {
      "calling": "Вызов...",
      "ringing": "Гудки...",
      "waitingForAnswer": "Ожидание ответа...",
      "cancel": "Отменить"
    },
    "active": {
      "audioCall": "Аудиозвонок",
      "videoCall": "Видеозвонок",
      "duration": "{{duration}}",
      "e2eeStatus": "MLS WebRTC E2EE Защита",
      "e2eeVerified": "Сквозное шифрование проверено",
      "muteAudio": "Выключить микрофон",
      "unmuteAudio": "Включить микрофон",
      "muteVideo": "Выключить камеру",
      "unmuteVideo": "Включить камеру",
      "switchCamera": "Сменить камеру",
      "screenShare": "Демонстрация экрана",
      "endCall": "Завершить звонок",
      "reconnecting": "Переподключение к вызову...",
      "connecting": "Установление защищенного соединения..."
    },
    "groupCall": {
      "title": "Групповой видеозвонок",
      "participantsCount": "Участники ({{count}})",
      "join": "Присоединиться",
      "leave": "Покинуть звонок",
      "raiseHand": "Поднять руку",
      "handRaised": "Рука поднята"
    }
  },
  "en": {
    "incoming": {
      "title": "Incoming Call",
      "subtitleAudio": "Gossip E2EE Audio Call...",
      "subtitleVideo": "Gossip E2EE Video Call...",
      "acceptAudio": "Answer",
      "acceptVideo": "Answer with Video",
      "decline": "Decline"
    },
    "outgoing": {
      "calling": "Calling...",
      "ringing": "Ringing...",
      "waitingForAnswer": "Waiting for answer...",
      "cancel": "Cancel"
    },
    "active": {
      "audioCall": "Audio Call",
      "videoCall": "Video Call",
      "duration": "{{duration}}",
      "e2eeStatus": "MLS WebRTC E2EE Protected",
      "e2eeVerified": "End-to-End Encryption Verified",
      "muteAudio": "Mute Microphone",
      "unmuteAudio": "Unmute Microphone",
      "muteVideo": "Turn Off Camera",
      "unmuteVideo": "Turn On Camera",
      "switchCamera": "Switch Camera",
      "screenShare": "Screen Share",
      "endCall": "End Call",
      "reconnecting": "Reconnecting...",
      "connecting": "Establishing secure connection..."
    },
    "groupCall": {
      "title": "Group Video Call",
      "participantsCount": "Participants ({{count}})",
      "join": "Join",
      "leave": "Leave Call",
      "raiseHand": "Raise Hand",
      "handRaised": "Hand Raised"
    }
  },
  "es": {
    "incoming": {
      "title": "Llamada entrante",
      "subtitleAudio": "Llamada de audio Gossip E2EE...",
      "subtitleVideo": "Videollamada Gossip E2EE...",
      "acceptAudio": "Responder",
      "acceptVideo": "Responder con video",
      "decline": "Rechazar"
    },
    "outgoing": {
      "calling": "Llamando...",
      "ringing": "Timbrando...",
      "waitingForAnswer": "Esperando respuesta...",
      "cancel": "Cancelar"
    },
    "active": {
      "audioCall": "Llamada de audio",
      "videoCall": "Videollamada",
      "duration": "{{duration}}",
      "e2eeStatus": "Protegido con MLS WebRTC E2EE",
      "e2eeVerified": "Cifrado de extremo a extremo verificado",
      "muteAudio": "Silenciar micrófono",
      "unmuteAudio": "Activar micrófono",
      "muteVideo": "Apagar cámara",
      "unmuteVideo": "Encender cámara",
      "switchCamera": "Cambiar cámara",
      "screenShare": "Compartir pantalla",
      "endCall": "Finalizar llamada",
      "reconnecting": "Reconectando...",
      "connecting": "Estableciendo conexión segura..."
    },
    "groupCall": {
      "title": "Videollamada grupal",
      "participantsCount": "Participantes ({{count}})",
      "join": "Unirse",
      "leave": "Salir de la llamada",
      "raiseHand": "Levantar la mano",
      "handRaised": "Mano levantada"
    }
  },
  "zh": {
    "incoming": {
      "title": "来电提醒",
      "subtitleAudio": "Gossip E2EE 加密语音通话...",
      "subtitleVideo": "Gossip E2EE 加密视频通话...",
      "acceptAudio": "接听",
      "acceptVideo": "视频接听",
      "decline": "拒绝"
    },
    "outgoing": {
      "calling": "正在呼叫...",
      "ringing": "正在响铃...",
      "waitingForAnswer": "等待对方接听...",
      "cancel": "取消呼叫"
    },
    "active": {
      "audioCall": "语音通话",
      "videoCall": "视频通话",
      "duration": "{{duration}}",
      "e2eeStatus": "MLS WebRTC E2EE 加密保护",
      "e2eeVerified": "端到端加密验证通过",
      "muteAudio": "静音麦克风",
      "unmuteAudio": "开启麦克风",
      "muteVideo": "关闭摄像头",
      "unmuteVideo": "开启摄像头",
      "switchCamera": "翻转镜头",
      "screenShare": "共享屏幕",
      "endCall": "挂断通话",
      "reconnecting": "正在重新连接通话...",
      "connecting": "正在建立安全端对端连接..."
    },
    "groupCall": {
      "title": "群组多人视频通话",
      "participantsCount": "通话成员 ({{count}})",
      "join": "加入通话",
      "leave": "离开通话",
      "raiseHand": "举手发言",
      "handRaised": "已举手"
    }
  },
  "ar": {
    "incoming": {
      "title": "مكالمة واردة",
      "subtitleAudio": "مكالمة صوتية مشفرة Gossip E2EE...",
      "subtitleVideo": "مكالمة فيديو مشفرة Gossip E2EE...",
      "acceptAudio": "رد",
      "acceptVideo": "رد بالفيديو",
      "decline": "رفض"
    },
    "outgoing": {
      "calling": "جارٍ الاتصال...",
      "ringing": "جارٍ الرنين...",
      "waitingForAnswer": "في انتظار الرد...",
      "cancel": "إلغاء"
    },
    "active": {
      "audioCall": "مكالمة صوتية",
      "videoCall": "مكالمة فيديو",
      "duration": "{{duration}}",
      "e2eeStatus": "محمي بتشفير MLS WebRTC E2EE",
      "e2eeVerified": "تم التحقق من التشفير الشامل",
      "muteAudio": "كتم الميكروفون",
      "unmuteAudio": "تشغيل الميكروفون",
      "muteVideo": "إيقاف الكاميرا",
      "unmuteVideo": "تشغيل الكاميرا",
      "switchCamera": "تبديل الكاميرا",
      "screenShare": "مشاركة الشاشة",
      "endCall": "إنهاء المكالمة",
      "reconnecting": "جارٍ إعادة الاتصال...",
      "connecting": "جارٍ إنشاء اتصال آمن..."
    },
    "groupCall": {
      "title": "مكالمة فيديو جماعية",
      "participantsCount": "المشاركون ({{count}})",
      "join": "انضمام",
      "leave": "مغادرة المكالمة",
      "raiseHand": "رفع اليد",
      "handRaised": "تم رفع اليد"
    }
  },
  "fa": {
    "incoming": {
      "title": "تماس ورودی",
      "subtitleAudio": "تماس صوتی رمزنگاری‌شده Gossip E2EE...",
      "subtitleVideo": "تماس ویدیویی رمزنگاری‌شده Gossip E2EE...",
      "acceptAudio": "پاسخ",
      "acceptVideo": "پاسخ ویدیویی",
      "decline": "رد تماس"
    },
    "outgoing": {
      "calling": "در حال برقراری تماس...",
      "ringing": "در حال زنگ خوردن...",
      "waitingForAnswer": "در انتظار پاسخ...",
      "cancel": "لغو"
    },
    "active": {
      "audioCall": "تماس صوتی",
      "videoCall": "تماس ویدیویی",
      "duration": "{{duration}}",
      "e2eeStatus": "محافظت‌شده با MLS WebRTC E2EE",
      "e2eeVerified": "رمزنگاری سرتاسری تأیید شد",
      "muteAudio": "قطع میکروفون",
      "unmuteAudio": "وصل میکروفون",
      "muteVideo": "خاموش کردن دوربین",
      "unmuteVideo": "روشن کردن دوربین",
      "switchCamera": "تغییر دوربین",
      "screenShare": "اشتراک‌گذاری صفحه",
      "endCall": "پایان تماس",
      "reconnecting": "در حال اتصال مجدد...",
      "connecting": "در حال برقراری اتصال امن..."
    },
    "groupCall": {
      "title": "تماس ویدیویی گروهی",
      "participantsCount": "شرکت‌کنندگان ({{count}})",
      "join": "پیوستن",
      "leave": "ترک تماس",
      "raiseHand": "بالا بردن دست",
      "handRaised": "دست بالا برده شد"
    }
  },
  "fr": {
    "incoming": {
      "title": "Appel entrant",
      "subtitleAudio": "Appel audio Gossip E2EE...",
      "subtitleVideo": "Appel vidéo Gossip E2EE...",
      "acceptAudio": "Répondre",
      "acceptVideo": "Répondre en vidéo",
      "decline": "Refuser"
    },
    "outgoing": {
      "calling": "Appel en cours...",
      "ringing": "Sonnerie...",
      "waitingForAnswer": "En attente de réponse...",
      "cancel": "Annuler"
    },
    "active": {
      "audioCall": "Appel audio",
      "videoCall": "Appel vidéo",
      "duration": "{{duration}}",
      "e2eeStatus": "Protégé par MLS WebRTC E2EE",
      "e2eeVerified": "Chiffrement de bout en bout vérifié",
      "muteAudio": "Couper le micro",
      "unmuteAudio": "Activer le micro",
      "muteVideo": "Désactiver la caméra",
      "unmuteVideo": "Activer la caméra",
      "switchCamera": "Changer de caméra",
      "screenShare": "Partage d'écran",
      "endCall": "Terminer l'appel",
      "reconnecting": "Reconnexion...",
      "connecting": "Établissement d'une connexion sécurisée..."
    },
    "groupCall": {
      "title": "Appel vidéo de groupe",
      "participantsCount": "Participants ({{count}})",
      "join": "Rejoindre",
      "leave": "Quitter l'appel",
      "raiseHand": "Lever la main",
      "handRaised": "Main levée"
    }
  },
  "de": {
    "incoming": {
      "title": "Eingehender Anruf",
      "subtitleAudio": "Gossip E2EE-Audioanruf...",
      "subtitleVideo": "Gossip E2EE-Videoanruf...",
      "acceptAudio": "Annehmen",
      "acceptVideo": "Mit Video annehmen",
      "decline": "Ablehnen"
    },
    "outgoing": {
      "calling": "Wird angerufen...",
      "ringing": "Es läutet...",
      "waitingForAnswer": "Warten auf Antwort...",
      "cancel": "Abbrechen"
    },
    "active": {
      "audioCall": "Audioanruf",
      "videoCall": "Videoanruf",
      "duration": "{{duration}}",
      "e2eeStatus": "Geschützt durch MLS WebRTC E2EE",
      "e2eeVerified": "Ende-zu-Ende-Verschlüsselung verifiziert",
      "muteAudio": "Mikrofon stummschalten",
      "unmuteAudio": "Mikrofon einschalten",
      "muteVideo": "Kamera ausschalten",
      "unmuteVideo": "Kamera einschalten",
      "switchCamera": "Kamera wechseln",
      "screenShare": "Bildschirmfreigabe",
      "endCall": "Anruf beenden",
      "reconnecting": "Wiederverbindung...",
      "connecting": "Sichere Verbindung wird hergestellt..."
    },
    "groupCall": {
      "title": "Gruppen-Videoanruf",
      "participantsCount": "Teilnehmer ({{count}})",
      "join": "Beitreten",
      "leave": "Anruf verlassen",
      "raiseHand": "Hand heben",
      "handRaised": "Hand gehoben"
    }
  }
}

def generate(base_dir):
    for lang, content in data.items():
        lang_dir = os.path.join(base_dir, lang)
        os.makedirs(lang_dir, exist_ok=True)
        with open(os.path.join(lang_dir, "calls.json"), "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
    print("✓ calls.json generated for all 8 languages")

if __name__ == "__main__":
    generate("e:/Boltalka/frontend/src/i18n/locales")
