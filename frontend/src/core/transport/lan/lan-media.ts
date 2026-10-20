// frontend/src/core/transport/lan/lan-media.ts
/**
 * Модуль прямой передачи медиафайлов по LAN (Опция T1b).
 * Обеспечивает локальную раздачу зашифрованных медиа-блобов по HTTP GET /media/<envelopeId>.
 * Принцип безопасности:
 * - Медиа отдается строго в зашифрованном виде (AES-256-GCM).
 * - Передача разрешена только при активном флаге settings.transport_lan_media.
 * - При выключенном флаге или сбое сети — автоматический fallback на отложенную загрузку из облака.
 */

import { DiscoveredPeer, getTransportSettings } from '../transport';

export interface LanMediaRegistration {
  envelopeId: string;
  blob: Uint8Array;
  mimeType?: string;
  createdAt: number;
}

export class LanMediaManager {
  private readonly mediaStore = new Map<string, LanMediaRegistration>();
  private readonly maxCachedBlobs: number;

  constructor(maxCachedBlobs = 100) {
    this.maxCachedBlobs = maxCachedBlobs;
  }

  /**
   * Регистрация локального зашифрованного медиафайла для раздачи в LAN
   */
  public registerMediaBlob(envelopeId: string, data: Uint8Array, mimeType?: string): void {
    if (!envelopeId || !data) return;

    if (this.mediaStore.size >= this.maxCachedBlobs) {
      const oldestKey = this.mediaStore.keys().next().value;
      if (oldestKey) {
        this.mediaStore.delete(oldestKey);
      }
    }

    this.mediaStore.set(envelopeId, {
      envelopeId,
      blob: data,
      mimeType: mimeType || 'application/octet-stream',
      createdAt: Date.now(),
    });
  }

  /**
   * Получение медиа-блоба по envelopeId для локальной отдачи
   */
  public getMediaBlob(envelopeId: string): LanMediaRegistration | null {
    return this.mediaStore.get(envelopeId) || null;
  }

  /**
   * Удаление медиа-блоба из кэша
   */
  public removeMediaBlob(envelopeId: string): void {
    this.mediaStore.delete(envelopeId);
  }

  /**
   * Обработчик входящего HTTP-запроса GET /media/<envelopeId>
   */
  public handleMediaRequest(envelopeId: string): { status: number; data?: Uint8Array; contentType?: string; error?: string } {
    const settings = getTransportSettings();
    if (!settings.transport_lan_media) {
      return { status: 403, error: 'Передача медиа по LAN отключена в настройках' };
    }

    const item = this.mediaStore.get(envelopeId);
    if (!item) {
      return { status: 404, error: 'Медиафайл не найден на локальном узле' };
    }

    return {
      status: 200,
      data: item.blob,
      contentType: item.mimeType,
    };
  }

  /**
   * Загрузка медиафайла напрямую от пира по LAN
   */
  public async fetchMediaFromPeer(
    peer: DiscoveredPeer,
    envelopeId: string,
    timeoutMs = 15000
  ): Promise<Uint8Array | null> {
    const settings = getTransportSettings();
    if (!settings.transport_lan_media) {
      return null;
    }

    const host = peer.host || '127.0.0.1';
    const port = peer.port || 46000;
    const url = `http://${host}:${port}/media/${envelopeId}`;

    try {
      if (typeof fetch !== 'undefined') {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

        const response = await fetch(url, {
          method: 'GET',
          signal: controller?.signal,
        });

        if (timer) clearTimeout(timer);

        if (!response.ok) {
          return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }
    } catch {
      // Сбой запроса — fallback в облако
    }

    return null;
  }
}