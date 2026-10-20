// frontend/src/core/media/globalMediaManager.ts

export type MediaType = 'video_note' | 'voice' | 'video' | 'audio';

export interface ActiveMediaSession {
  id: string;
  type: MediaType;
  pause: () => void;
  mute?: () => void;
}

/**
 * GlobalMediaManager — синглтон координации активного воспроизведения медиа (Single Audio Focus).
 * Гарантирует, что в любой момент времени только ОДИН медиа-источник (видео-кружок, голосовое
 * или полноформатное видео) воспроизводит звук.
 */
class GlobalMediaManager {
  private currentSession: ActiveMediaSession | null = null;
  private listeners: Set<(activeId: string | null) => void> = new Set();

  /**
   * Запрашивает монопольный аудиофокус для воспроизведения.
   * Если другой медиа-элемент уже играл со звуком, он немедленно останавливается/приглушается.
   */
  requestPlay(id: string, type: MediaType, controls: { pause: () => void; mute?: () => void }) {
    if (this.currentSession && this.currentSession.id !== id) {
      try {
        if (this.currentSession.mute) {
          this.currentSession.mute();
        }
        this.currentSession.pause();
      } catch (err) {
        console.warn('[GlobalMediaManager] Ошибка остановки предыдущей сессии:', err);
      }
    }

    this.currentSession = {
      id,
      type,
      pause: controls.pause,
      mute: controls.mute,
    };

    this.notifyListeners(id);
  }

  /**
   * Освобождает аудиофокус для указанного id (например, при окончании ролика или паузе).
   */
  releasePlay(id: string) {
    if (this.currentSession && this.currentSession.id === id) {
      this.currentSession = null;
      this.notifyListeners(null);
    }
  }

  /**
   * Проверяет, активен ли данный элемент.
   */
  isPlaying(id: string): boolean {
    return this.currentSession?.id === id;
  }

  /**
   * Возвращает текущий активный id.
   */
  getActiveId(): string | null {
    return this.currentSession?.id || null;
  }

  /**
   * Принудительно глушит и останавливает все медиа (при смене чата, звонке и т.д.).
   */
  stopAll() {
    if (this.currentSession) {
      try {
        if (this.currentSession.mute) {
          this.currentSession.mute();
        }
        this.currentSession.pause();
      } catch (err) {
        console.warn('[GlobalMediaManager] Ошибка stopAll:', err);
      }
      this.currentSession = null;
      this.notifyListeners(null);
    }
  }

  /**
   * Подписка на изменение активного источника звука.
   */
  subscribe(listener: (activeId: string | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(activeId: string | null) {
    this.listeners.forEach(listener => {
      try {
        listener(activeId);
      } catch (err) {
        console.error('[GlobalMediaManager] Ошибка в листере:', err);
      }
    });
  }
}

export const globalMediaManager = new GlobalMediaManager();
