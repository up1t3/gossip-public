import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, Forward, Check, Users, Hash, Search } from "lucide-react";
import { GlassCard } from "../../ui/GlassCard";

export interface ForwardTargetChat {
  id: string;
  name: string;
  avatar: string;
  isGroup: boolean;
  type?: string;
  username?: string;
  is152FzContour?: boolean;
}

export interface ForwardModalProps {
  chats: ForwardTargetChat[];
  selectedCount: number;
  isSource152Fz?: boolean;
  onClose: () => void;
  onForward: (targetChatIds: string[]) => void;
}

const MAX_TARGETS = 20;

/**
 * R4 (M4.5): выбор целевых чатов для массовой пересылки (до 20).
 * Изоляция 152-ФЗ: чаты защищённого контура недоступны как цели, если
 * источник вне контура (и наоборот) — guard на уровне списка.
 */
export const ForwardModal: React.FC<ForwardModalProps> = ({
  chats, selectedCount, isSource152Fz, onClose, onForward,
}) => {
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats.filter((c) => {
      if (isSource152Fz !== undefined && Boolean(c.is152FzContour) !== isSource152Fz) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.username || "").toLowerCase().includes(q);
    });
  }, [chats, query, isSource152Fz]);

  const toggle = (id: string) => {
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_TARGETS) {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm"
      >
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Forward className="w-4 h-4 text-purple-400" />
              <h3 className="text-base font-bold text-slate-100">
                Переслать {selectedCount} → {targets.size || "…"}
              </h3>
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

          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2 rounded-xl bg-black/30 border border-white/10 px-3 py-2">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск чата…"
                className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="max-h-[45dvh] overflow-y-auto px-2 py-2">
            {filtered.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">Нет доступных чатов</div>
            )}
            {filtered.map((chat) => {
              const selected = targets.has(chat.id);
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => toggle(chat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                    selected ? "bg-purple-500/15" : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                    {chat.avatar && !chat.isGroup ? (
                      <img src={chat.avatar} alt="" className="w-full h-full object-cover" />
                    ) : chat.isGroup ? (
                      <Users className="w-4 h-4 text-purple-300" />
                    ) : chat.type === "channel" ? (
                      <Hash className="w-4 h-4 text-purple-300" />
                    ) : (
                      <span className="text-[10px] font-bold text-purple-200">{chat.name[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-200 truncate">{chat.name}</div>
                    {chat.is152FzContour && (
                      <div className="text-[10px] text-amber-400/80">Сейф-Контур</div>
                    )}
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected ? "bg-purple-500 border-purple-400" : "border-white/20"
                  }`}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-5 py-3 border-t border-white/10">
            <button
              type="button"
              disabled={targets.size === 0}
              onClick={() => onForward(Array.from(targets))}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
            >
              <Forward className="w-4 h-4" />
              Переслать в {targets.size} {targets.size === 1 ? "чат" : "чатов"}
            </button>
            <p className="mt-2 text-[10px] text-slate-500 text-center">
              До 100 сообщений и 20 чатов. Медиа переиспользуются без повторной загрузки;
              пересылка снимает TTL.
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
