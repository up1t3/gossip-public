package com.gossip.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import java.util.List;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "GossipBackground")
public class GossipBackgroundPlugin extends Plugin {
    private static final String TAG = "GossipBgPlugin";
    private static String pendingOpenChatId = null;
    private static String pendingSenderId = null;
    private static String pendingSenderName = null;
    private static String pendingMessageText = null;

    public static void setPendingNotificationData(String chatId, String senderId, String senderName, String messageText) {
        pendingOpenChatId = chatId;
        pendingSenderId = senderId;
        pendingSenderName = senderName;
        pendingMessageText = messageText;
    }

    public static void setPendingOpenChatId(String chatId) {
        pendingOpenChatId = chatId;
    }

    public static String getPendingOpenChatId() {
        return pendingOpenChatId;
    }

    @PluginMethod
    public void configure(PluginCall call) {
        try {
            String userId = call.getString("userId", "");
            String sessionToken = call.getString("sessionToken", "");
            String backendUrl = call.getString("backendUrl", "");

            Context context = getContext();
            if (context != null) {
                SharedPreferences prefs = context.getSharedPreferences("gossip_prefs", Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                if (userId != null && !userId.isEmpty()) editor.putString("user_id", userId);
                if (sessionToken != null && !sessionToken.isEmpty()) editor.putString("session_token", sessionToken);
                if (backendUrl != null && !backendUrl.isEmpty()) editor.putString("backend_url", backendUrl);
                editor.apply();
                Log.d(TAG, "Учетные данные для фоновой службы успешно сохранены в SharedPreferences: userId=" + userId);
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Ошибка в методе configure: ", e);
            call.reject("Ошибка настройки фонового сервиса: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getInitialChatId(PluginCall call) {
        JSObject result = new JSObject();
        result.put("chatId", pendingOpenChatId);
        result.put("senderId", pendingSenderId);
        result.put("senderName", pendingSenderName);
        result.put("messageText", pendingMessageText);
        pendingOpenChatId = null;
        pendingSenderId = null;
        pendingSenderName = null;
        pendingMessageText = null;
        call.resolve(result);
    }

    @PluginMethod
    public void startService(PluginCall call) {
        try {
            Log.d(TAG, "Starting GossipBackgroundService from plugin");
            Context context = getContext();
            if (context != null) {
                Intent intent = new Intent(context, GossipBackgroundService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent);
                } else {
                    context.startService(intent);
                }
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start GossipBackgroundService", e);
            call.reject("Failed to start service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        try {
            Log.d(TAG, "Stopping GossipBackgroundService from plugin");
            Context context = getContext();
            if (context != null) {
                Intent intent = new Intent(context, GossipBackgroundService.class);
                intent.setAction(GossipBackgroundService.ACTION_STOP);
                context.startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop GossipBackgroundService", e);
            call.reject("Failed to stop service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        try {
            Context context = getContext();
            boolean canInstall = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && context != null) {
                canInstall = context.getPackageManager().canRequestPackageInstalls();
            }
            JSObject ret = new JSObject();
            ret.put("canInstall", canInstall);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error checking canRequestPackageInstalls", e);
            call.reject("Failed to check install permission: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        try {
            Context context = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && context != null) {
                Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                settingsIntent.setData(Uri.parse("package:" + context.getPackageName()));
                settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(settingsIntent);
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error opening install settings", e);
            call.reject("Failed to open install settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        try {
            String filePath = call.getString("filePath");
            if (filePath == null || filePath.trim().isEmpty()) {
                call.reject("File path is empty");
                return;
            }

            Context context = getContext();
            if (context == null) {
                call.reject("Context is null");
                return;
            }

            // 1. Проверяем разрешение на установку неизвестных приложений (Android 8.0+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.getPackageManager().canRequestPackageInstalls()) {
                    Log.w(TAG, "Install permission not granted, opening Settings");
                    Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    settingsIntent.setData(Uri.parse("package:" + context.getPackageName()));
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(settingsIntent);
                    
                    JSObject ret = new JSObject();
                    ret.put("status", "permission_requested");
                    ret.put("message", "Разрешите установку из неизвестных источников для Gossip в открывшихся настройках и нажмите «Установить» повторно.");
                    call.resolve(ret);
                    return;
                }
            }

            // 2. Определяем путь к файлу
            File file;
            if (filePath.startsWith("file://")) {
                file = new File(Uri.parse(filePath).getPath());
            } else {
                file = new File(filePath);
            }

            if (!file.exists() || file.length() == 0) {
                Log.e(TAG, "APK file not found or empty: " + file.getAbsolutePath());
                call.reject("APK file not found: " + file.getAbsolutePath());
                return;
            }

            // 3. Получаем content:// URI через FileProvider
            Uri apkUri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                file
            );

            Log.d(TAG, "Starting system package installer for APK URI: " + apkUri + " (size: " + file.length() + " bytes)");

            // 4. Запускаем системный PackageInstaller
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // Раздаем явные права на чтение URI всем подходящим активностям установщика
            List<ResolveInfo> resolveInfoList = context.getPackageManager().queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
            for (ResolveInfo resolveInfo : resolveInfoList) {
                String packageName = resolveInfo.activityInfo.packageName;
                context.grantUriPermission(packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }

            context.startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("status", "installer_opened");
            ret.put("fileSize", file.length());
            ret.put("filePath", file.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to install APK", e);
            call.reject("Ошибка запуска установщика APK: " + e.getMessage());
        }
    }
}
