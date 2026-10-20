package com.gossip.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.SslErrorHandler;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static boolean isAppForeground = false;

    public static boolean isAppInForeground() {
        return isAppForeground;
    }

    @Override
    public void onResume() {
        super.onResume();
        isAppForeground = true;
    }

    @Override
    public void onPause() {
        super.onPause();
        isAppForeground = false;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Проверка обновления версии для очистки зависшего кэша PWA / Service Worker-ов
        checkAndClearWebviewCache();

        // Регистрируем локальные Capacitor-плагины с использованием registerPlugin (Capacitor v3-v6 API)
        registerPlugin(AudioSessionPlugin.class);
        registerPlugin(VoIPNotificationPlugin.class);
        registerPlugin(BoltalkaVoIP.class);
        registerPlugin(GossipBackgroundPlugin.class);
        registerPlugin(GossipBlePlugin.class);
        
        super.onCreate(savedInstanceState);

        // Защита от обрезания нижней и верхней строк на Android 12-15 (HyperOS / Poco X6 / H10 Edge-to-Edge)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        final View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout()
                );
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return windowInsets;
            });
        }

        // Обработка перехода по клику на уведомление при холодном старте
        handleNotificationIntent(getIntent());

        // Настройка WebView для доступа к локальным файлам и разрешения Mixed Content
        WebView webView = this.getBridge().getWebView();
        if (webView != null) {
            WebView.setWebContentsDebuggingEnabled(true);
            webView.clearCache(true); // Принудительно очищаем кэш при каждом запуске для обхода кэширования WebView
            WebSettings settings = webView.getSettings();
            // Фиксируем системный масштаб шрифта WebView на 100%, чтобы системный крупный шрифт Android (Poco X6 / H10)
            // не выталкивал кнопку микрофона за пределы экрана (внутри приложения есть собственный режим Крупный шрифт)
            settings.setTextZoom(100);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setGeolocationEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            }
            
            // Разрешаем самоподписанные SSL-сертификаты для работы в тестовом окружении
            webView.setWebViewClient(new BridgeWebViewClient(this.getBridge()) {
                @Override
                public void onReceivedSslError(WebView view, final SslErrorHandler handler, SslError error) {
                    handler.proceed();
                }
            });

            // Автоматическое предоставление разрешений на камеру, микрофон и геолокацию внутри WebView
            webView.setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(this.getBridge()) {
                @Override
                public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                    android.util.Log.d("GossipLocation", "Granting geolocation permissions to origin: " + origin);
                    callback.invoke(origin, true, false);
                }

                @Override
                public void onPermissionRequest(final android.webkit.PermissionRequest request) {
                    android.util.Log.d("GossipMedia", "Granting webview media permissions: " + java.util.Arrays.toString(request.getResources()));
                    request.grant(request.getResources());
                }
            });
        }

        // Запрос рантайм-разрешений (камера, микрофон, локация, фото, уведомления, bluetooth)
        List<String> permissionsNeeded = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.CAMERA);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.RECORD_AUDIO);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.BLUETOOTH_SCAN);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_ADVERTISE) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.BLUETOOTH_ADVERTISE);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.BLUETOOTH_CONNECT);
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsNeeded.toArray(new String[0]), 1001);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNotificationIntent(intent);
    }

    private void handleNotificationIntent(Intent intent) {
        if (intent != null) {
            String callId = intent.getStringExtra("callId");
            if (callId != null && !callId.trim().isEmpty()) {
                String chatId = intent.getStringExtra("chatId");
                String callerName = intent.getStringExtra("callerName");
                String callerAvatar = intent.getStringExtra("callerAvatar");
                String mediaType = intent.getStringExtra("mediaType");
                boolean wasAnswered = intent.getBooleanExtra("wasAnswered", false);
                android.util.Log.d("MainActivity", "Получен переход к звонку из интента: callId=" + callId + ", wasAnswered=" + wasAnswered);
                VoIPNotificationPlugin.setPendingCall(callId, chatId, callerName, mediaType != null ? mediaType : "video", callerAvatar);
                if (wasAnswered) {
                    VoIPNotificationPlugin.setWasAnswered(true);
                    VoIPNotificationPlugin plugin = VoIPNotificationPlugin.getInstance();
                    if (plugin != null) {
                        plugin.sendAnswerCall(callId, chatId, callerName, mediaType != null ? mediaType : "video");
                    }
                }
            }

            String chatId = intent.getStringExtra("chatId");
            String senderId = intent.getStringExtra("senderId");
            String senderName = intent.getStringExtra("senderName");
            String messageText = intent.getStringExtra("messageText");
            if ((chatId != null && !chatId.trim().isEmpty()) || (senderId != null && !senderId.trim().isEmpty())) {
                android.util.Log.d("MainActivity", "Получен переход в чат из системного уведомления: chatId=" + chatId + ", senderId=" + senderId);
                GossipBackgroundPlugin.setPendingNotificationData(chatId, senderId, senderName, messageText);
            }
        }
    }

    private void checkAndClearWebviewCache() {
        try {
            int currentVersionCode = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
            SharedPreferences prefs = getSharedPreferences("gossip_prefs", Context.MODE_PRIVATE);
            int lastVersionCode = prefs.getInt("last_version_code", -1);
            
            if (lastVersionCode != currentVersionCode) {
                android.util.Log.d("GossipUpdate", "Обнаружено обновление приложения (с " + lastVersionCode + " на " + currentVersionCode + "). Начинаем очистку PWA кэша...");
                File dataDir = new File(getApplicationInfo().dataDir);
                File appWebview = new File(dataDir, "app_webview");
                if (appWebview.exists()) {
                    // Список папок для удаления для сброса кэша сервис-воркеров и Cache API
                    String[] dirsToDelete = {
                        "Default/Service Worker",
                        "Default/Cache",
                        "Service Worker",
                        "Cache",
                        "GPUCache"
                    };
                    for (String dirPath : dirsToDelete) {
                        File dir = new File(appWebview, dirPath);
                        if (dir.exists()) {
                            deleteRecursive(dir);
                            android.util.Log.d("GossipUpdate", "Успешно удален кэш WebView: " + dir.getAbsolutePath());
                        }
                    }
                }
                
                // Сохраняем новую версию
                prefs.edit().putInt("last_version_code", currentVersionCode).apply();
            }
        } catch (Exception e) {
            android.util.Log.e("GossipUpdate", "Ошибка при очистке кэша WebView: ", e);
        }
    }

    private void deleteRecursive(File fileOrDirectory) {
        if (fileOrDirectory.isDirectory()) {
            File[] children = fileOrDirectory.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        fileOrDirectory.delete();
    }
}
