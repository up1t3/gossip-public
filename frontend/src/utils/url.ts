import { Capacitor } from '@capacitor/core';
import { connectionManager } from '../core/network/connection-manager';

/**
 * Возвращает абсолютный URL для запросов к бэкенду в среде Capacitor (на мобильных)
 * или Electron (десктоп), или относительный путь для среды браузера (PWA, Dev-сервер).
 */
export function getBackendUrl(path: string): string {
  if (!path || typeof path !== "string") return "";
  
  // Если передан уже полный URL (http, https) или data/blob схема — возвращаем как есть
  const trimmed = path.trim();
  if (
    trimmed.startsWith("http://") || 
    trimmed.startsWith("https://") || 
    trimmed.startsWith("blob:") || 
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  if (typeof window !== "undefined") {
    // Получаем активный базовый URL из ConnectionManager
    const customUrl = localStorage.getItem("gossip_custom_backend_url");
    if (customUrl) {
      const baseUrl = customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
      return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    }

    const isCapacitorNative = Capacitor.isNativePlatform();
    const isElectron = (window as any).electronAPI !== undefined;
    
    // Если мы в нативном мобильном или десктопном приложении (Capacitor / Electron),
    // используем динамический шлюз из ConnectionManager.
    if (isCapacitorNative || isElectron) {
      if (isCapacitorNative && import.meta.env.DEV) {
        const platform = Capacitor.getPlatform();
        const host = platform === 'android' ? '10.0.2.2:8082' : 'localhost:8082';
        return `http://${host}${path.startsWith('/') ? path : '/' + path}`;
      }
      
      const activeBase = connectionManager.getActiveBackendUrl();
      return `${activeBase}${path.startsWith('/') ? path : '/' + path}`;
    }

    // Для браузера/PWA если выбран кастомный шлюз или Fake-TLS
    const activeSnapshot = connectionManager.getSnapshot();
    if (activeSnapshot.activeGatewayId !== 'official') {
      const activeBase = activeSnapshot.activeGatewayUrl;
      return `${activeBase}${path.startsWith('/') ? path : '/' + path}`;
    }
  }
  return path;
}


