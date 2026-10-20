import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  CalendarClock,
  Send,
  Trash2,
  RefreshCw,
  Clock,
} from "lucide-react";
import { GlassCard } from "../../ui/GlassCard";
import { syncManager } from "../../core/sync-manager";
import { storageManager } from "../../core/storage/storage-manager";

export interface ScheduledMessagesModalProps {
  onClose: () => void;
  onSendNow?: (messageId: string) => void;
}

interface ScheduledItem {
  id: string;
  chat_id: string;
  text: string | null;
  deliver_at: number;
  status: string;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "сейчас";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "меньше минуты";
  if (min < 60) return `через ${min} мин`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `через ${hours} ч ${min % 60} мин`;
  const days = Math.floor(hours / 24);
  return `через ${days} д ${hours % 24} ч`;
}

/**
 * R3 (M2.5): список отложенных сообщений с таймерами, отменой и досрочной
 * отправкой. Zero-Toast: статусы инлайн. Мультидевайс: правда — на сервере,
 * локальное SQLite — зеркало для офлайн-просмотра.
 */
export const ScheduledMessagesModal: React.FC<ScheduledMessagesModalProps> = ({
  onClose,
  onSendNow,
}) => {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      // Сервер — источник истины; при недоступности — локальное зеркало
      try {
        const origin = (typeof window !== "undefined" && window.location?.origin && !window.location.origin.startsWith("file:") && !window.location.origin.startsWith("capacitor"))
          ? window.location.origin
          : "https://skuf-net.ru";
        const resp = await fetch(`${origin}/api/v1/messages/scheduled`);
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setItems(
              (data.scheduled || []).map((s: { message_id: string; chat_id: string; deliver_at: string }) => ({
                id: s.message_id,
                chat_id: s.chat_id,
                text: null,
                deliver_at: new Date(s.deliver_at).getTime(),
                status: "pending",
              }))
            );
            // Синхронизируем локальное зеркало
            for (const s of data.scheduled || []) {
              await storageManager.saveScheduledMessage({
                id: s.message_id, chat_id: s.chat_id, text: null,
                type: "text", deliver_at: new Date(s.deliver_at).getTime(),
              });
            }
          }
        } else {
          throw new Error(`HTTP ${resp.status}`);
        }
      } catch {
        const local = await storageManager.getScheduledMessages();
        if (!cancelled) setItems(local);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCancel = async (id: string) => {
    setBusyId(id);
    try {
      await syncManager.cancelScheduledMessage(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отменить");
    } finally {
      setBusyId(null);
    }
  };

  const now = Date.now();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-purple-400" />
              <h3 className="text-base font-bold text-slate-100">Отложенные сообщения</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 max-h-[60dvh] overflow-y-auto">
            {error && (
              <div className="mb-3 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Загрузка…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-500 text-xs">
                <Clock className="w-8 h-8 opacity-30" />
                Нет отложенных сообщений
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-200 truncate">
                        {item.text || "Зашифрованное сообщение"}
                      </div>
                      <div className="text-[11px] text-purple-300 mt-1">
                        {formatRemaining(item.deliver_at - now - tick * 0)}
                        <span className="text-slate-500">
                          {" · "}
                          {new Date(item.deliver_at).toLocaleString([], {
                            day: "2-digit", month: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {onSendNow && (
                        <button
                          type="button"
                          onClick={() => onSendNow(item.id)}
                          disabled={busyId === item.id}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 transition-colors disabled:opacity-40"
                          title="Отправить сейчас"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCancel(item.id)}
                        disabled={busyId === item.id}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 transition-colors disabled:opacity-40"
                        title="Отменить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
              Сообщения шифруются один раз в момент планирования и доставляются
              сервером по расписанию без перешифрования (сквозное шифрование
              сохраняется). Горизонт: 7 дней для приватных чатов, 365 дней для каналов.
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
