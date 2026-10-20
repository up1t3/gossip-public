import React, { useEffect, useState } from "react";
import { MapPin, Navigation, Square, Compass } from "lucide-react";

export interface LocationMessageProps {
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
  liveUntil?: number;
  heading?: number | null;
  isOwn?: boolean;
  theme?: string;
  onStopLive?: () => void;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "истекла";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} мин`;
  return `${Math.floor(min / 60)} ч ${min % 60} мин`;
}

/**
 * R4 (M4.1): карточка геолокации. Fail-Closed приватность (решение Q5):
 * БЕЗ внешних тайлов — векторная SVG-подложка, ноль HTTP-запросов к
 * картографическим сервисам (нет утечки IP/факта просмотра координат).
 * Открытие внешних карт — осознанным кликом пользователя.
 */
export const LocationMessage: React.FC<LocationMessageProps> = ({
  latitude, longitude, title, address, liveUntil, heading, isOwn, onStopLive,
}) => {
  const [tick, setTick] = useState(0);
  const isLive = Boolean(liveUntil && liveUntil > Date.now());

  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, [isLive]);

  const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 w-full max-w-[280px]">
      {/* Векторная подложка «карты» — сетка + «маршрут», ноль сетевых запросов */}
      <div className="relative h-28 bg-gradient-to-br from-slate-800/80 to-slate-900/90">
        <svg viewBox="0 0 280 112" className="absolute inset-0 w-full h-full opacity-40" aria-hidden="true">
          <defs>
            <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="0.7" />
            </pattern>
          </defs>
          <rect width="280" height="112" fill="url(#grid)" />
          <path d="M0 84 C 60 70, 90 96, 150 64 S 240 30, 280 44" fill="none" stroke="rgba(167,139,250,0.5)" strokeWidth="2" strokeDasharray="5 4" />
          <circle cx="150" cy="64" r="18" fill="none" stroke="rgba(167,139,250,0.35)" strokeWidth="1">
            <animate attributeName="r" values="12;24;12" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </svg>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="relative">
            <MapPin className="w-7 h-7 text-purple-400 fill-purple-500/30 drop-shadow-lg" />
            {isLive && heading != null && (
              <Compass
                className="absolute -right-3 -top-2 w-4 h-4 text-purple-300 transition-transform"
                style={{ transform: `rotate(${heading}deg)` }}
              />
            )}
          </div>
        </div>
        {isLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-300">
              Live · {formatRemaining((liveUntil || 0) - Date.now() - tick * 0)}
            </span>
          </div>
        )}
      </div>

      <div className="px-3 py-2.5">
        {title && <div className="text-xs font-semibold text-slate-100 truncate">{title}</div>}
        {address && <div className="text-[11px] text-slate-400 truncate mt-0.5">{address}</div>}
        <div className="text-[10px] text-slate-500 font-mono mt-1">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white text-[11px] font-semibold transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" />
            Открыть в картах
          </a>
          {isLive && isOwn && onStopLive && (
            <button
              type="button"
              onClick={onStopLive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[11px] font-semibold transition-colors"
            >
              <Square className="w-3 h-3" />
              Остановить
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
