# -*- coding: utf-8 -*-
import json
import os

data = {
  "ru": {
    "login": {
      "title": "Вход в Gossip",
      "subtitle": "Суверенный мессенджер со сквозным шифрованием",
      "usernamePlaceholder": "Имя пользователя",
      "passwordPlaceholder": "Мастер-пароль",
      "submitButton": "Войти в аккаунт",
      "noAccount": "Еще нет аккаунта?",
      "registerLink": "Создать профиль",
      "forgotPassword": "Забыли пароль?",
      "loadingStatus": "Вычисление SRP-6a верификатора...",
      "decryptingVault": "Расшифровка базы данных SQLCipher..."
    },
    "register": {
      "title": "Создание профиля",
      "subtitle": "Генерация криптографических ключей и локального сейфа",
      "usernamePlaceholder": "Придумайте никнейм",
      "passwordPlaceholder": "Надежный пароль",
      "passwordConfirmPlaceholder": "Повторите пароль",
      "submitButton": "Сгенерировать ключи",
      "hasAccount": "Уже есть аккаунт?",
      "loginLink": "Войти",
      "powStatus": "Вычисление Proof-of-Work задачи ({{difficulty}} бит)...",
      "attestationStatus": "Проверка подлинности среды (Device Attestation)..."
    },
    "mnemonic": {
      "modalTitle": "Секретная Seed-фраза (12 слов)",
      "warningTitle": "Сохраните эти слова в надежном месте!",
      "warningDesc": "Это единственный способ восстановить доступ к вашим зашифрованным чатам и кошельку при утере устройства.",
      "copyButton": "Скопировать 12 слов",
      "copiedToast": "Seed-фраза скопирована в буфер",
      "confirmCheckbox": "Я записал(а) эти 12 слов и понимаю, что разработчики не могут восстановить утерянный доступ",
      "continueButton": "Продолжить регистрацию",
      "downloadTxt": "Скачать .txt файл"
    },
    "pin": {
      "createTitle": "Установите PIN-код",
      "createDesc": "PIN-код используется для быстрой разблокировки локального сейфа на этом устройстве",
      "unlockTitle": "Введите PIN-код",
      "unlockDesc": "Разблокируйте доступ к зашифрованным сообщениям",
      "confirmTitle": "Подтвердите PIN-код",
      "placeholder": "Введите PIN-код...",
      "invalidPin": "Неверный PIN-код. Осталось попыток: {{attempts}}",
      "mismatch": "Введенные PIN-коды не совпадают",
      "useBiometrics": "Войти по биометрии",
      "forgotPin": "Сбросить PIN через мнемонику",
      "createButton": "Создать и сохранить",
      "unlockButton": "Разблокировать",
      "exitToLanding": "Вернуться на главную (лендинг)"
    },
    "recovery": {
      "title": "Восстановление доступа",
      "desc": "Введите ваш никнейм и 12 слов секретной Seed-фразы",
      "phrasePlaceholder": "12 мнемонических слов через пробел",
      "newPasswordPlaceholder": "Новый мастер-пароль",
      "newPasswordConfirm": "Повторите новый пароль",
      "submitButton": "Восстановить аккаунт",
      "successMessage": "Пароль успешно сброшен! Выполняем вход...",
      "invalidPhrase": "Неверная мнемоническая фраза или имя пользователя"
    },
    "logout": {
      "confirmTitle": "Выйти из сессии?",
      "confirmDesc": "Локальные ключи будут заблокированы до следующего ввода PIN/пароля.",
      "button": "Выйти",
      "clearAllData": "Удалить все данные и ключи с устройства"
    },
    "server": {
      "showSettings": "Настройки сервера (Advanced)",
      "hideSettings": "Скрыть настройки сервера",
      "urlLabel": "Адрес сервера (MessageApi / Gateway)",
      "copyLogs": "Скопировать логи отладки ({{count}} строк)",
      "resetUrl": "Сбросить адрес на стандартный"
    },
    "steps": {
      "mtproto": "Транспортное шифрование (MTProto)",
      "pow": "Защита от спама (Proof-of-Work)",
      "srp": "Аутентификация SRP-6a & BIP-39",
      "sqlcipher": "Расшифровка SQLCipher БД",
      "sync": "Синхронизация обновлений"
    }
  },
  "en": {
    "login": {
      "title": "Sign in to Gossip",
      "subtitle": "Sovereign end-to-end encrypted messenger",
      "usernamePlaceholder": "Username",
      "passwordPlaceholder": "Master password",
      "submitButton": "Sign In",
      "noAccount": "Don't have an account?",
      "registerLink": "Create Profile",
      "forgotPassword": "Forgot password?",
      "loadingStatus": "Computing SRP-6a verifier...",
      "decryptingVault": "Decrypting SQLCipher vault..."
    },
    "register": {
      "title": "Create Profile",
      "subtitle": "Generating cryptographic keypairs and local vault",
      "usernamePlaceholder": "Choose a username",
      "passwordPlaceholder": "Strong password",
      "passwordConfirmPlaceholder": "Confirm password",
      "submitButton": "Generate Keys",
      "hasAccount": "Already have an account?",
      "loginLink": "Sign In",
      "powStatus": "Solving Proof-of-Work challenge ({{difficulty}} bits)...",
      "attestationStatus": "Verifying device integrity (Device Attestation)..."
    },
    "mnemonic": {
      "modalTitle": "Secret Seed Phrase (12 words)",
      "warningTitle": "Store these words in a secure place!",
      "warningDesc": "This is the ONLY way to recover your encrypted chats and wallet if you lose your device.",
      "copyButton": "Copy 12 words",
      "copiedToast": "Seed phrase copied to clipboard",
      "confirmCheckbox": "I have written down these 12 words and understand developers cannot recover lost access",
      "continueButton": "Continue Registration",
      "downloadTxt": "Download .txt file"
    },
    "pin": {
      "createTitle": "Set up PIN Code",
      "createDesc": "PIN code is used to quickly unlock your local encrypted vault on this device",
      "unlockTitle": "Enter PIN Code",
      "unlockDesc": "Unlock access to encrypted messages",
      "confirmTitle": "Confirm PIN Code",
      "placeholder": "Enter PIN code...",
      "invalidPin": "Invalid PIN code. Remaining attempts: {{attempts}}",
      "mismatch": "Entered PIN codes do not match",
      "useBiometrics": "Unlock with Biometrics",
      "forgotPin": "Reset PIN using Seed Phrase",
      "createButton": "Create & Save",
      "unlockButton": "Unlock",
      "exitToLanding": "Back to Home (Landing)"
    },
    "recovery": {
      "title": "Account Recovery",
      "desc": "Enter your username and 12-word recovery seed phrase",
      "phrasePlaceholder": "12 mnemonic words separated by spaces",
      "newPasswordPlaceholder": "New master password",
      "newPasswordConfirm": "Confirm new password",
      "submitButton": "Recover Account",
      "successMessage": "Password successfully reset! Signing in...",
      "invalidPhrase": "Invalid mnemonic phrase or username"
    },
    "logout": {
      "confirmTitle": "Sign out of session?",
      "confirmDesc": "Local keys will be locked until you re-enter your PIN or password.",
      "button": "Sign Out",
      "clearAllData": "Wipe all local data and keys from this device"
    },
    "server": {
      "showSettings": "Server Settings (Advanced)",
      "hideSettings": "Hide Server Settings",
      "urlLabel": "Server Address (MessageApi / Gateway)",
      "copyLogs": "Copy Debug Logs ({{count}} lines)",
      "resetUrl": "Reset server address to default"
    },
    "steps": {
      "mtproto": "Transport Encryption (MTProto)",
      "pow": "Spam Protection (Proof-of-Work)",
      "srp": "SRP-6a & BIP-39 Authentication",
      "sqlcipher": "Decrypting SQLCipher Database",
      "sync": "Syncing Updates"
    }
  },
  "es": {
    "login": {
      "title": "Iniciar sesión en Gossip",
      "subtitle": "Mensajero soberano con cifrado de extremo a extremo",
      "usernamePlaceholder": "Nombre de usuario",
      "passwordPlaceholder": "Contraseña maestra",
      "submitButton": "Iniciar sesión",
      "noAccount": "¿No tienes cuenta?",
      "registerLink": "Crear perfil",
      "forgotPassword": "¿Olvidaste tu contraseña?",
      "loadingStatus": "Calculando verificador SRP-6a...",
      "decryptingVault": "Descifrando almacén SQLCipher..."
    },
    "register": {
      "title": "Crear perfil",
      "subtitle": "Generando pares de claves criptográficas y almacén local",
      "usernamePlaceholder": "Elige un nombre de usuario",
      "passwordPlaceholder": "Contraseña segura",
      "passwordConfirmPlaceholder": "Confirmar contraseña",
      "submitButton": "Generar claves",
      "hasAccount": "¿Ya tienes una cuenta?",
      "loginLink": "Iniciar sesión",
      "powStatus": "Resolviendo desafío Proof-of-Work ({{difficulty}} bits)...",
      "attestationStatus": "Verificando integridad del dispositivo (Device Attestation)..."
    },
    "mnemonic": {
      "modalTitle": "Frase semilla secreta (12 palabras)",
      "warningTitle": "¡Guarda estas palabras en un lugar seguro!",
      "warningDesc": "Esta es la ÚNICA forma de recuperar tus chats cifrados y billetera si pierdes tu dispositivo.",
      "copyButton": "Copiar 12 palabras",
      "copiedToast": "Frase semilla copiada al portapapeles",
      "confirmCheckbox": "He anotado estas 12 palabras y entiendo que los desarrolladores no pueden recuperar el acceso perdido",
      "continueButton": "Continuar registro",
      "downloadTxt": "Descargar archivo .txt"
    },
    "pin": {
      "createTitle": "Configurar código PIN",
      "createDesc": "El código PIN se utiliza para desbloquear rápidamente tu almacén local cifrado",
      "unlockTitle": "Ingresar código PIN",
      "unlockDesc": "Desbloquea el acceso a mensajes cifrados",
      "confirmTitle": "Confirmar código PIN",
      "placeholder": "Ingresa el código PIN...",
      "invalidPin": "Código PIN no válido. Intentos restantes: {{attempts}}",
      "mismatch": "Los códigos PIN ingresados no coinciden",
      "useBiometrics": "Desbloquear con biometría",
      "forgotPin": "Restablecer PIN mediante frase semilla",
      "createButton": "Crear y guardar",
      "unlockButton": "Desbloquear",
      "exitToLanding": "Volver a la página principal"
    },
    "recovery": {
      "title": "Recuperación de cuenta",
      "desc": "Ingresa tu nombre de usuario y la frase semilla de 12 palabras",
      "phrasePlaceholder": "12 palabras mnemónicas separadas por espacios",
      "newPasswordPlaceholder": "Nueva contraseña maestra",
      "newPasswordConfirm": "Confirmar nueva contraseña",
      "submitButton": "Recuperar cuenta",
      "successMessage": "¡Contraseña restablecida con éxito! Iniciando sesión...",
      "invalidPhrase": "Frase mnemónica o nombre de usuario no válido"
    },
    "logout": {
      "confirmTitle": "¿Cerrar sesión?",
      "confirmDesc": "Las claves locales se bloquearán hasta que vuelvas a ingresar tu PIN o contraseña.",
      "button": "Cerrar sesión",
      "clearAllData": "Borrar todos los datos y claves locales de este dispositivo"
    },
    "server": {
      "showSettings": "Configuración del servidor (Avanzado)",
      "hideSettings": "Ocultar configuración del servidor",
      "urlLabel": "Dirección del servidor (MessageApi / Gateway)",
      "copyLogs": "Copiar registros de depuración ({{count}} líneas)",
      "resetUrl": "Restablecer dirección del servidor a la predeterminada"
    },
    "steps": {
      "mtproto": "Cifrado de transporte (MTProto)",
      "pow": "Protección contra spam (Proof-of-Work)",
      "srp": "Autenticación SRP-6a y BIP-39",
      "sqlcipher": "Descifrando base de datos SQLCipher",
      "sync": "Sincronizando actualizaciones"
    }
  },
  "zh": {
    "login": {
      "title": "登录 Gossip",
      "subtitle": "主权端到端加密即时通讯工具",
      "usernamePlaceholder": "用户名",
      "passwordPlaceholder": "主密码",
      "submitButton": "登录账户",
      "noAccount": "还没有账户？",
      "registerLink": "创建新档案",
      "forgotPassword": "忘记密码？",
      "loadingStatus": "正在计算 SRP-6a 验证器...",
      "decryptingVault": "正在解密 SQLCipher 本地保险库..."
    },
    "register": {
      "title": "创建档案",
      "subtitle": "生成密码学密钥对与本地安全存储",
      "usernamePlaceholder": "设置用户名",
      "passwordPlaceholder": "强密码",
      "passwordConfirmPlaceholder": "确认密码",
      "submitButton": "生成密钥",
      "hasAccount": "已有账户？",
      "loginLink": "登录",
      "powStatus": "正在计算工作量证明 (Proof-of-Work, {{difficulty}} 位)...",
      "attestationStatus": "正在验证设备环境完整性 (Device Attestation)..."
    },
    "mnemonic": {
      "modalTitle": "助记词密匙（12个单词）",
      "warningTitle": "请将这些单词妥善存放在安全的地方！",
      "warningDesc": "如果您丢失了设备，这是恢复加密会话和钱包的唯一方法。",
      "copyButton": "复制 12 个助记词",
      "copiedToast": "助记词已复制到剪贴板",
      "confirmCheckbox": "我已记录下这 12 个单词，并理解开发者无法恢复丢失的访问权限",
      "continueButton": "继续注册",
      "downloadTxt": "下载 .txt 文件"
    },
    "pin": {
      "createTitle": "设置 PIN 码",
      "createDesc": "PIN 码用于在此设备上快速解锁本地加密保险库",
      "unlockTitle": "输入 PIN 码",
      "unlockDesc": "解锁以访问加密消息",
      "confirmTitle": "确认 PIN 码",
      "placeholder": "请输入 PIN 码...",
      "invalidPin": "PIN 码无效。剩余尝试次数：{{attempts}}",
      "mismatch": "两次输入的 PIN 码不一致",
      "useBiometrics": "使用生物识别解锁",
      "forgotPin": "通过助记词重置 PIN 码",
      "createButton": "创建并保存",
      "unlockButton": "解锁",
      "exitToLanding": "返回主页"
    },
    "recovery": {
      "title": "恢复账户访问权限",
      "desc": "输入您的用户名和 12 位助记词",
      "phrasePlaceholder": "用空格分隔的 12 个助记词",
      "newPasswordPlaceholder": "新主密码",
      "newPasswordConfirm": "确认新密码",
      "submitButton": "恢复账户",
      "successMessage": "密码重置成功！正在登录...",
      "invalidPhrase": "助记词或用户名无效"
    },
    "logout": {
      "confirmTitle": "退出当前会话？",
      "confirmDesc": "本地密钥将被锁定，直到您重新输入 PIN 码或密码。",
      "button": "退出登录",
      "clearAllData": "清除本设备上的所有本地数据与密钥"
    },
    "server": {
      "showSettings": "服务器设置（高级）",
      "hideSettings": "隐藏服务器设置",
      "urlLabel": "服务器地址 (MessageApi / Gateway)",
      "copyLogs": "复制调试日志 ({{count}} 行)",
      "resetUrl": "恢复默认服务器地址"
    },
    "steps": {
      "mtproto": "传输层加密 (MTProto)",
      "pow": "防垃圾防护 (Proof-of-Work)",
      "srp": "SRP-6a 与 BIP-39 身份验证",
      "sqlcipher": "解密 SQLCipher 数据库",
      "sync": "同步最新更新"
    }
  },
  "ar": {
    "login": {
      "title": "تسجيل الدخول إلى Gossip",
      "subtitle": "تطبيق مراسلة سيادي مشفر من البداية إلى النهاية",
      "usernamePlaceholder": "اسم المستخدم",
      "passwordPlaceholder": "كلمة المرور الرئيسية",
      "submitButton": "تسجيل الدخول",
      "noAccount": "ليس لديك حساب؟",
      "registerLink": "إنشاء ملف شخصي",
      "forgotPassword": "هل نسيت كلمة المرور؟",
      "loadingStatus": "جارٍ حساب مدقق SRP-6a...",
      "decryptingVault": "جارٍ فك تشفير خزانة SQLCipher..."
    },
    "register": {
      "title": "إنشاء ملف شخصي",
      "subtitle": "توليد أزواج المفاتيح التشفيرية والخزانة المحلية",
      "usernamePlaceholder": "اختر اسم مستخدم",
      "passwordPlaceholder": "كلمة مرور قوية",
      "passwordConfirmPlaceholder": "تأكيد كلمة المرور",
      "submitButton": "توليد المفاتيح",
      "hasAccount": "هل لديك حساب بالفعل؟",
      "loginLink": "تسجيل الدخول",
      "powStatus": "جارٍ حل تحدي إثبات العمل ({{difficulty}} بت)...",
      "attestationStatus": "التحقق من سلامة بيئة الجهاز (Device Attestation)..."
    },
    "mnemonic": {
      "modalTitle": "عبارة الاسترداد السرية (12 كلمة)",
      "warningTitle": "احفظ هذه الكلمات في مكان آمن للغاية!",
      "warningDesc": "هذه هي الطريقة الوحيدة لاستعادة محادثاتك المشفرة ومحفظتك في حال فقدان جهازك.",
      "copyButton": "نسخ الـ 12 كلمة",
      "copiedToast": "تم نسخ العبارة السرية إلى الحافظة",
      "confirmCheckbox": "لقد قمت بتدوين هذه الـ 12 كلمة وأفهم أن المطورين لا يمكنهم استعادة الوصول المفقود",
      "continueButton": "متابعة التسجيل",
      "downloadTxt": "تنزيل ملف .txt"
    },
    "pin": {
      "createTitle": "تعيين رمز PIN",
      "createDesc": "يُستخدم رمز PIN لفتح قفل الخزانة المحلية المشفرة بسرعة على هذا الجهاز",
      "unlockTitle": "أدخل رمز PIN",
      "unlockDesc": "فتح القفل للوصول إلى الرسائل المشفرة",
      "confirmTitle": "تأكيد رمز PIN",
      "placeholder": "أدخل رمز PIN...",
      "invalidPin": "رمز PIN غير صحيح. المحاولات المتبقية: {{attempts}}",
      "mismatch": "رمزا PIN غير متطابقين",
      "useBiometrics": "إلغاء القفل بالبصمة الحيوية",
      "forgotPin": "إعادة تعيين PIN عبر عبارة الاسترداد",
      "createButton": "إنشاء وحفظ",
      "unlockButton": "فتح القفل",
      "exitToLanding": "العودة إلى الصفحة الرئيسية"
    },
    "recovery": {
      "title": "استعادة الحساب",
      "desc": "أدخل اسم المستخدم وعبارة الاسترداد المكونة من 12 كلمة",
      "phrasePlaceholder": "12 كلمة استرداد مفصولة بمسافات",
      "newPasswordPlaceholder": "كلمة مرور رئيسية جديدة",
      "newPasswordConfirm": "تأكيد كلمة المرور الجديدة",
      "submitButton": "استعادة الحساب",
      "successMessage": "تمت إعادة تعيين كلمة المرور بنجاح! جارٍ تسجيل الدخول...",
      "invalidPhrase": "عبارة استرداد أو اسم مستخدم غير صالح"
    },
    "logout": {
      "confirmTitle": "تسجيل الخروج من الجلسة؟",
      "confirmDesc": "سيتم قفل المفاتيح المحلية حتى تقوم بإدخال رمز PIN أو كلمة المرور مجدداً.",
      "button": "تسجيل الخروج",
      "clearAllData": "مسح جميع البيانات والمفاتيح المحلية من هذا الجهاز"
    },
    "server": {
      "showSettings": "إعدادات الخادم (متقدم)",
      "hideSettings": "إخفاء إعدادات الخادم",
      "urlLabel": "عنوان الخادم (MessageApi / Gateway)",
      "copyLogs": "نسخ سجلات تصحيح الأخطاء ({{count}} سطر)",
      "resetUrl": "إعادة تعيين عنوان الخادم إلى الافتراضي"
    },
    "steps": {
      "mtproto": "تشفير النقل (MTProto)",
      "pow": "الحماية من الهجمات (Proof-of-Work)",
      "srp": "المصادقة بواسطة SRP-6a و BIP-39",
      "sqlcipher": "فك تشفير قاعدة بيانات SQLCipher",
      "sync": "مزامنة التحديثات"
    }
  },
  "fa": {
    "login": {
      "title": "ورود به Gossip",
      "subtitle": "پیام‌رسان مستقل با رمزگذاری سرتاسری",
      "usernamePlaceholder": "نام کاربری",
      "passwordPlaceholder": "رمز عبور اصلی",
      "submitButton": "ورود به حساب",
      "noAccount": "هنوز حساب ندارید؟",
      "registerLink": "ایجاد نمایه",
      "forgotPassword": "رمز عبور را فراموش کرده‌اید؟",
      "loadingStatus": "در حال محاسبه تأییدکننده SRP-6a...",
      "decryptingVault": "در حال رمزگشایی گاوصندوق SQLCipher..."
    },
    "register": {
      "title": "ایجاد نمایه",
      "subtitle": "تولید جفت‌کلیدهای رمزنگاری و گاوصندوق محلی",
      "usernamePlaceholder": "یک نام کاربری انتخاب کنید",
      "passwordPlaceholder": "رمز عبور قوی",
      "passwordConfirmPlaceholder": "تأیید رمز عبور",
      "submitButton": "تولید کلیدها",
      "hasAccount": "از قبل حساب دارید؟",
      "loginLink": "ورود",
      "powStatus": "در حال حل چالش اثبات کار ({{difficulty}} بیت)...",
      "attestationStatus": "بررسی اصالت محیط دستگاه (Device Attestation)..."
    },
    "mnemonic": {
      "modalTitle": "عبارت بازیابی محرمانه (۱۲ کلمه)",
      "warningTitle": "این کلمات را در جایی کاملاً امن ذخیره کنید!",
      "warningDesc": "در صورت گم شدن دستگاه، این تنها راه بازیابی چت‌های رمزگذاری‌شده و کیف پول شماست.",
      "copyButton": "کپی ۱۲ کلمه",
      "copiedToast": "عبارت بازیابی در کلیپ‌بورد کپی شد",
      "confirmCheckbox": "من این ۱۲ کلمه را یادداشت کرده‌ام و می‌دانم توسعه‌دهندگان نمی‌توانند دسترسی از دست رفته را بازیابی کنند",
      "continueButton": "ادامه ثبت‌نام",
      "downloadTxt": "دانلود فایل .txt"
    },
    "pin": {
      "createTitle": "تنظیم پین‌کد",
      "createDesc": "پین‌کد برای باز کردن سریع قفل گاوصندوق رمزگذاری‌شده محلی در این دستگاه استفاده می‌شود",
      "unlockTitle": "پین‌کد را وارد کنید",
      "unlockDesc": "باز کردن قفل برای دسترسی به پیام‌های رمزگذاری‌شده",
      "confirmTitle": "تأیید پین‌کد",
      "placeholder": "پین‌کد را وارد کنید...",
      "invalidPin": "پین‌کد نامعتبر است. تلاش‌های باقی‌مانده: {{attempts}}",
      "mismatch": "پین‌کدهای وارد شده مطابقت ندارند",
      "useBiometrics": "ورود با بیومتریک",
      "forgotPin": "بازنشانی پین از طریق عبارت بازیابی",
      "createButton": "ایجاد و ذخیره",
      "unlockButton": "باز کردن قفل",
      "exitToLanding": "بازگشت به صفحه اصلی"
    },
    "recovery": {
      "title": "بازیابی دسترسی به حساب",
      "desc": "نام کاربری و عبارت ۱۲ کلمه‌ای بازیابی را وارد کنید",
      "phrasePlaceholder": "۱۲ کلمه بازیابی با فاصله",
      "newPasswordPlaceholder": "رمز عبور اصلی جدید",
      "newPasswordConfirm": "تأیید رمز عبور جدید",
      "submitButton": "بازیابی حساب",
      "successMessage": "رمز عبور با موفقیت بازنشانی شد! در حال ورود...",
      "invalidPhrase": "عبارت بازیابی یا نام کاربری نامعتبر است"
    },
    "logout": {
      "confirmTitle": "خروج از نشست؟",
      "confirmDesc": "کلیدهای محلی تا زمان وارد کردن مجدد پین‌کد یا رمز عبور قفل خواهند شد.",
      "button": "خروج",
      "clearAllData": "حذف تمامی داده‌ها و کلیدهای محلی از این دستگاه"
    },
    "server": {
      "showSettings": "تنظیمات سرور (پیشرفته)",
      "hideSettings": "پنهان کردن تنظیمات سرور",
      "urlLabel": "آدرس سرور (MessageApi / Gateway)",
      "copyLogs": "کپی گزارش‌های عیب‌یابی ({{count}} خط)",
      "resetUrl": "بازنشانی آدرس سرور به حالت پیش‌فرض"
    },
    "steps": {
      "mtproto": "رمزگذاری انتقال (MTProto)",
      "pow": "محافظت در برابر اسپم (Proof-of-Work)",
      "srp": "احراز هویت SRP-6a و BIP-39",
      "sqlcipher": "رمزگشایی پایگاه داده SQLCipher",
      "sync": "همگام‌سازی به‌روزرسانی‌ها"
    }
  },
  "fr": {
    "login": {
      "title": "Connexion à Gossip",
      "subtitle": "Messagerie souveraine chiffrée de bout en bout",
      "usernamePlaceholder": "Nom d'utilisateur",
      "passwordPlaceholder": "Mot de passe maître",
      "submitButton": "Se connecter",
      "noAccount": "Pas encore de compte ?",
      "registerLink": "Créer un profil",
      "forgotPassword": "Mot de passe oublié ?",
      "loadingStatus": "Calcul du vérificateur SRP-6a...",
      "decryptingVault": "Déchiffrement du coffre SQLCipher..."
    },
    "register": {
      "title": "Créer un profil",
      "subtitle": "Génération des paires de clés cryptographiques et du coffre local",
      "usernamePlaceholder": "Choisissez un identifiant",
      "passwordPlaceholder": "Mot de passe sécurisé",
      "passwordConfirmPlaceholder": "Confirmer le mot de passe",
      "submitButton": "Générer les clés",
      "hasAccount": "Vous avez déjà un compte ?",
      "loginLink": "Se connecter",
      "powStatus": "Résolution du défi Proof-of-Work ({{difficulty}} bits)...",
      "attestationStatus": "Vérification de l'intégrité de l'appareil (Device Attestation)..."
    },
    "mnemonic": {
      "modalTitle": "Phrase de récupération secrète (12 mots)",
      "warningTitle": "Conservez ces mots dans un endroit sécurisé !",
      "warningDesc": "C'est le SEUL moyen de récupérer vos conversations chiffrées et votre portefeuille en cas de perte de votre appareil.",
      "copyButton": "Copier les 12 mots",
      "copiedToast": "Phrase secrète copiée dans le presse-papiers",
      "confirmCheckbox": "J'ai bien noté ces 12 mots et je comprends que les développeurs ne peuvent pas restaurer un accès perdu",
      "continueButton": "Continuer l'inscription",
      "downloadTxt": "Télécharger le fichier .txt"
    },
    "pin": {
      "createTitle": "Configurer le code PIN",
      "createDesc": "Le code PIN est utilisé pour déverrouiller rapidement votre coffre chiffré local sur cet appareil",
      "unlockTitle": "Entrez le code PIN",
      "unlockDesc": "Déverrouillez l'accès aux messages chiffrés",
      "confirmTitle": "Confirmer le code PIN",
      "placeholder": "Entrez le code PIN...",
      "invalidPin": "Code PIN invalide. Tentatives restantes : {{attempts}}",
      "mismatch": "Les codes PIN saisis ne correspondent pas",
      "useBiometrics": "Déverrouiller avec la biométrie",
      "forgotPin": "Réinitialiser le PIN via la phrase de récupération",
      "createButton": "Créer et enregistrer",
      "unlockButton": "Déverrouiller",
      "exitToLanding": "Retour à l'accueil"
    },
    "recovery": {
      "title": "Récupération du compte",
      "desc": "Entrez votre nom d'utilisateur et votre phrase de récupération de 12 mots",
      "phrasePlaceholder": "12 mots mnémoniques séparés par des espaces",
      "newPasswordPlaceholder": "Nouveau mot de passe maître",
      "newPasswordConfirm": "Confirmer le nouveau mot de passe",
      "submitButton": "Récupérer le compte",
      "successMessage": "Mot de passe réinitialisé avec succès ! Connexion en cours...",
      "invalidPhrase": "Phrase mnémonique ou nom d'utilisateur invalide"
    },
    "logout": {
      "confirmTitle": "Quitter la session ?",
      "confirmDesc": "Les clés locales seront verrouillées jusqu'à la prochaine saisie de votre code PIN ou mot de passe.",
      "button": "Se déconnecter",
      "clearAllData": "Effacer toutes les données et clés locales de cet appareil"
    },
    "server": {
      "showSettings": "Paramètres du serveur (Avancé)",
      "hideSettings": "Masquer les paramètres du serveur",
      "urlLabel": "Adresse du serveur (MessageApi / Gateway)",
      "copyLogs": "Copier les journaux de débogage ({{count}} lignes)",
      "resetUrl": "Rétablir l'adresse par défaut"
    },
    "steps": {
      "mtproto": "Chiffrement de transport (MTProto)",
      "pow": "Protection anti-spam (Proof-of-Work)",
      "srp": "Authentification SRP-6a & BIP-39",
      "sqlcipher": "Déchiffrement de la base SQLCipher",
      "sync": "Synchronisation des mises à jour"
    }
  },
  "de": {
    "login": {
      "title": "Bei Gossip anmelden",
      "subtitle": "Souveräner Ende-zu-Ende-verschlüsselter Messenger",
      "usernamePlaceholder": "Benutzername",
      "passwordPlaceholder": "Hauptpasswort",
      "submitButton": "Anmelden",
      "noAccount": "Noch kein Konto?",
      "registerLink": "Profil erstellen",
      "forgotPassword": "Passwort vergessen?",
      "loadingStatus": "SRP-6a-Prüfsumme wird berechnet...",
      "decryptingVault": "SQLCipher-Tresor wird entschlüsselt..."
    },
    "register": {
      "title": "Profil erstellen",
      "subtitle": "Kryptografische Schlüsselpaare und lokaler Tresor werden generiert",
      "usernamePlaceholder": "Benutzernamen wählen",
      "passwordPlaceholder": "Sicheres Passwort",
      "passwordConfirmPlaceholder": "Passwort bestätigen",
      "submitButton": "Schlüssel generieren",
      "hasAccount": "Bereits ein Konto?",
      "loginLink": "Anmelden",
      "powStatus": "Proof-of-Work-Aufgabe wird gelöst ({{difficulty}} Bit)...",
      "attestationStatus": "Geräteintegrität wird überprüft (Device Attestation)..."
    },
    "mnemonic": {
      "modalTitle": "Geheime Seed-Phrase (12 Wörter)",
      "warningTitle": "Bewahren Sie diese Wörter an einem sicheren Ort auf!",
      "warningDesc": "Dies ist die EINZIGE Möglichkeit, Ihre verschlüsselten Chats und Ihre Wallet wiederherzustellen, wenn Sie Ihr Gerät verlieren.",
      "copyButton": "12 Wörter kopieren",
      "copiedToast": "Seed-Phrase in Zwischenablage kopiert",
      "confirmCheckbox": "Ich habe diese 12 Wörter aufgeschrieben und verstehe, dass Entwickler verlorenen Zugriff nicht wiederherstellen können",
      "continueButton": "Registrierung fortsetzen",
      "downloadTxt": ".txt-Datei herunterladen"
    },
    "pin": {
      "createTitle": "PIN-Code einrichten",
      "createDesc": "Der PIN-Code dient zum schnellen Entsperren Ihres lokalen verschlüsselten Tresors auf diesem Gerät",
      "unlockTitle": "PIN-Code eingeben",
      "unlockDesc": "Zugriff auf verschlüsselte Nachrichten entsperren",
      "confirmTitle": "PIN-Code bestätigen",
      "placeholder": "PIN-Code eingeben...",
      "invalidPin": "Ungültiger PIN-Code. Verbleibende Versuche: {{attempts}}",
      "mismatch": "Eingegebene PIN-Codes stimmen nicht überein",
      "useBiometrics": "Mit Biometrie entsperren",
      "forgotPin": "PIN per Seed-Phrase zurücksetzen",
      "createButton": "Erstellen & Speichern",
      "unlockButton": "Entsperren",
      "exitToLanding": "Zurück zur Startseite"
    },
    "recovery": {
      "title": "Kontowiederherstellung",
      "desc": "Geben Sie Ihren Benutzernamen und die 12-Wörter-Seed-Phrase ein",
      "phrasePlaceholder": "12 durch Leerzeichen getrennte mnemonische Wörter",
      "newPasswordPlaceholder": "Neues Hauptpasswort",
      "newPasswordConfirm": "Neues Passwort bestätigen",
      "submitButton": "Konto wiederherstellen",
      "successMessage": "Passwort erfolgreich zurückgesetzt! Anmeldung läuft...",
      "invalidPhrase": "Ungültige Seed-Phrase oder Benutzername"
    },
    "logout": {
      "confirmTitle": "Sitzung beenden?",
      "confirmDesc": "Lokale Schlüssel werden gesperrt, bis Sie Ihre PIN oder Ihr Passwort erneut eingeben.",
      "button": "Abmelden",
      "clearAllData": "Alle lokalen Daten und Schlüssel von diesem Gerät löschen"
    },
    "server": {
      "showSettings": "Servereinstellungen (Erweitert)",
      "hideSettings": "Servereinstellungen ausblenden",
      "urlLabel": "Serveradresse (MessageApi / Gateway)",
      "copyLogs": "Debug-Protokolle kopieren ({{count}} Zeilen)",
      "resetUrl": "Serveradresse auf Standard zurücksetzen"
    },
    "steps": {
      "mtproto": "Transportverschlüsselung (MTProto)",
      "pow": "Spamschutz (Proof-of-Work)",
      "srp": "SRP-6a- & BIP-39-Authentifizierung",
      "sqlcipher": "SQLCipher-Datenbank wird entschlüsselt",
      "sync": "Aktualisierungen werden synchronisiert"
    }
  }
}

def generate(base_dir):
    for lang, content in data.items():
        lang_dir = os.path.join(base_dir, lang)
        os.makedirs(lang_dir, exist_ok=True)
        with open(os.path.join(lang_dir, "auth.json"), "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
    print("✓ auth.json generated for all 8 languages")

if __name__ == "__main__":
    generate("e:/Boltalka/frontend/src/i18n/locales")
