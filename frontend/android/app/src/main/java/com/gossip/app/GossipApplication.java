package com.gossip.app;

import android.app.Application;
import android.util.Log;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

/**
 * Кастомный класс Application для глобальной инициализации компонентов приложения Boltalka.
 * Обеспечивает безопасную инициализацию Firebase при отсутствии google-services.json.
 */
public class GossipApplication extends Application {
    private static final String TAG = "GossipApplication";

    @Override
    public void onCreate() {
        super.onCreate();
        
        // Безопасная инициализация FirebaseApp для предотвращения крашей на старте
        try {
            FirebaseApp.getInstance();
            Log.i(TAG, "FirebaseApp успешно инициализирован автоматически.");
        } catch (IllegalStateException e) {
            Log.w(TAG, "FirebaseApp не инициализирован автоматически (возможно, отсутствует google-services.json). Инициализация заглушки...");
            try {
                FirebaseOptions options = new FirebaseOptions.Builder()
                        .setApplicationId("1:1234567890:android:1234567890")
                        .setApiKey("fake_API_key_for_preventing_crash_12345")
                        .setProjectId("fake-project-id")
                        .build();
                FirebaseApp.initializeApp(this, options);
                Log.i(TAG, "FirebaseApp-заглушка успешно инициализирована вручную.");
            } catch (Exception ex) {
                Log.e(TAG, "Критическая ошибка при ручной инициализации FirebaseApp-заглушки", ex);
            }
        }
    }
}
