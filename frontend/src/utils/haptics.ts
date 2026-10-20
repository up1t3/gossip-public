// frontend/src/utils/haptics.ts

/**
 * Универсальный модуль тактильного отклика (Haptics)
 * - Поддерживает нативный Capacitor Haptics при наличии
 * - Fallback на navigator.vibrate для Android браузеров
 * - Web Audio API Taptic Engine Simulation для iOS Safari (короткий импульс низкой частоты)
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

class HapticsService {
  private isIOS: boolean;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.isIOS = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if ((window as any).__gossipGlobalAudioCtx) {
      return (window as any).__gossipGlobalAudioCtx;
    }
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass && !this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
        (window as any).__gossipGlobalAudioCtx = this.audioCtx;
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Эмуляция Taptic Engine клика через низкочастотный импульс Web Audio API на iOS
   */
  private playTapticImpulse(freq: number = 80, durationMs: number = 15, gainVal: number = 0.08) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx || ctx.state === 'closed') return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Игнорируем ошибки воспроизведения
    }
  }

  /**
   * Воспроизводит тактильный отклик в соответствии с выбранным стилем
   */
  public trigger(style: HapticStyle = 'light') {
    // 1. Пробуем Capacitor Haptics
    const capacitor = typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
    if (capacitor && capacitor.isPluginAvailable && capacitor.isPluginAvailable('Haptics')) {
      try {
        const { Haptics, ImpactStyle } = (window as any).Capacitor.Plugins;
        if (Haptics) {
          if (style === 'selection') {
            Haptics.selectionStart();
            return;
          }
          const mapStyle = style === 'heavy' ? ImpactStyle.Heavy : style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
          Haptics.impact({ style: mapStyle });
          return;
        }
      } catch {}
    }

    // 2. Для iOS Safari Web PWA используем Web Audio Taptic Impulse
    if (this.isIOS) {
      switch (style) {
        case 'light':
        case 'selection':
          this.playTapticImpulse(120, 10, 0.06);
          break;
        case 'medium':
          this.playTapticImpulse(90, 18, 0.1);
          break;
        case 'heavy':
        case 'error':
          this.playTapticImpulse(60, 25, 0.15);
          break;
        case 'success':
          this.playTapticImpulse(140, 12, 0.08);
          setTimeout(() => this.playTapticImpulse(160, 12, 0.08), 60);
          break;
        case 'warning':
          this.playTapticImpulse(100, 15, 0.1);
          setTimeout(() => this.playTapticImpulse(80, 15, 0.1), 80);
          break;
      }
      return;
    }

    // 3. Fallback на navigator.vibrate для Android Web
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        switch (style) {
          case 'selection':
          case 'light':
            navigator.vibrate(10);
            break;
          case 'medium':
            navigator.vibrate(25);
            break;
          case 'heavy':
            navigator.vibrate(40);
            break;
          case 'success':
            navigator.vibrate([15, 50, 15]);
            break;
          case 'warning':
            navigator.vibrate([30, 40, 30]);
            break;
          case 'error':
            navigator.vibrate([40, 50, 40, 50, 40]);
            break;
        }
      } catch {}
    }
  }
}

export const haptics = new HapticsService();
export default haptics;
