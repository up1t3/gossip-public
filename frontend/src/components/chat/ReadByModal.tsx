import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCheck, RefreshCw, AlertCircle, Users } from "lucide-react";
import { getBackendUrl } from "../../utils/url";
import { GlassCard } from "../../ui/GlassCard";

export interface ReadByMember {
  user_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  last_read_pts?: number;
  read_at?: number | string;
}

export interface ReadByModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  messageId?: string;
  pts?: number;
  theme?: string;
}

export const ReadByModal: React.FC<ReadByModalProps> = ({
  isOpen,
  onClose,
  chatId,
  messageId,
  pts = 0,
}) => {
  const [members, setMembers] = useState<ReadByMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReadStatus = useCallback(async () => {
    if (!chatId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token =
        localStorage.getItem("session_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        "";

      const url = getBackendUrl(
        `/api/v1/chats/${encodeURIComponent(chatId)}/read-status?upto_pts=${encodeURIComponent(
          pts
        )}`
      );

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Ошибка сервера: HTTP ${res.status}`);
      }

      const data = await res.json();
      const memberList: ReadByMember[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.members)
        ? data.members
        : [];

      setMembers(memberList);
    } catch (err: any) {
      console.error("[ReadByModal] Ошибка загрузки списка прочитавших:", err);
      setError(err?.message || "Не удалось загрузить список прочитавших");
    } finally {
      setIsLoading(false);
    }
  }, [chatId, pts]);

  useEffect(() => {
    if (isOpen) {
      fetchReadStatus();
    } else {
      setMembers([]);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, fetchReadStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const formatReadTime = (readAt?: number | string) => {
    if (!readAt) return "";
    try {
      const date = typeof readAt === "number" ? new Date(readAt > 1e11 ? readAt : readAt * 1000) : new Date(readAt);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="read-by-modal-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-safe pb-safe"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", duration: 0.35 }}
            className="relative w-full max-w-md z-10"
          >
            <GlassCard glow className="w-full overflow-hidden border border-white/10 shadow-2xl bg-slate-900/90">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                    <CheckCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      id="read-by-modal-title"
                      className="text-base font-semibold text-slate-100"
                    >
                      Прочитано участниками
                    </h3>
                    <p className="text-xs text-slate-400">
                      {members.length > 0
                        ? `${members.length} ${
                            members.length === 1
                              ? "участник"
                              : members.length < 5
                              ? "участника"
                              : "участников"
                          }`
                        : "Список прочтений"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Закрыть"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content Body */}
              <div className="px-5 py-4 max-h-[60vh] min-h-[160px] overflow-y-auto space-y-2.5">
                {isLoading && (
                  <div className="space-y-3 py-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 animate-pulse"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-white/10 rounded w-28" />
                          <div className="h-2.5 bg-white/5 rounded w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isLoading && error && (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <div className="p-3 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-200">
                        Не удалось загрузить данные
                      </p>
                      <p className="text-xs text-slate-400 max-w-xs">{error}</p>
                    </div>
                    <button
                      onClick={fetchReadStatus}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Повторить попытку
                    </button>
                  </div>
                )}

                {!isLoading && !error && members.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center space-y-2.5">
                    <div className="p-3 rounded-full bg-white/5 text-slate-400 border border-white/5">
                      <Users className="w-6 h-6 opacity-60" />
                    </div>
                    <p className="text-sm text-slate-300 font-medium">
                      Пока никто не прочитал
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Когда участники группы откроют это сообщение, они появятся в этом списке
                    </p>
                  </div>
                )}

                {!isLoading &&
                  !error &&
                  members.length > 0 &&
                  members.map((member) => {
                    const displayName =
                      member.display_name ||
                      member.username ||
                      `Пользователь #${member.user_id.slice(-4)}`;
                    const readTime = formatReadTime(member.read_at);

                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={displayName}
                              className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600/60 to-indigo-600/60 border border-white/10 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-100 truncate">
                              {displayName}
                            </p>
                            {member.username && (
                              <p className="text-xs text-slate-400 truncate">
                                @{member.username}
                              </p>
                            )}
                          </div>
                        </div>
                        {readTime && (
                          <span className="text-[11px] text-purple-300/80 font-medium ml-2 shrink-0">
                            {readTime}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/10 bg-white/5 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
