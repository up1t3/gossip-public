import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  Users,
  Shield,
  Crown,
  Bot,
  Bell,
  BellOff,
  LogOut,
  Settings,
  Edit3,
  AlertCircle,
  RefreshCw,
  Radio
} from "lucide-react";
import { getBackendUrl } from "../../utils/url";
import { GlassCard } from "../../ui/GlassCard";

export interface ChannelMember {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "poster" | "subscriber";
  isBot?: boolean;
  joinedAt?: number;
}

export interface ChannelInfoProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  title: string;
  description?: string;
  username?: string;
  avatarUrl?: string;
  subscribersCount?: number;
  currentUserRole?: "owner" | "admin" | "poster" | "subscriber";
  isMuted?: boolean;
  onToggleMute?: (muted: boolean) => void;
  onLeaveChannel?: (chatId: string) => Promise<void> | void;
  onManageChannel?: (chatId: string) => void;
  onEditChannel?: (chatId: string) => void;
  initialMembers?: ChannelMember[];
  theme?: string;
}

export const ChannelInfo: React.FC<ChannelInfoProps> = ({
  isOpen,
  onClose,
  chatId,
  title,
  description,
  username,
  avatarUrl,
  subscribersCount = 0,
  currentUserRole = "subscriber",
  isMuted = false,
  onToggleMute,
  onLeaveChannel,
  onManageChannel,
  onEditChannel,
  initialMembers,
}) => {
  const [members, setMembers] = useState<ChannelMember[]>(initialMembers || []);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);

  const inviteLink = username
    ? `https://skuf-net.ru/c/${username}`
    : chatId
    ? `https://skuf-net.ru/c/join_${chatId}`
    : "";

  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin" || isOwner;

  const fetchMembers = useCallback(async () => {
    if (!chatId) return;
    if (initialMembers && initialMembers.length > 0) {
      setMembers(initialMembers);
      return;
    }

    setIsLoadingMembers(true);
    setError(null);

    try {
      const token =
        localStorage.getItem("session_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        "";

      const url = getBackendUrl(
        `/api/v1/chats/${encodeURIComponent(chatId)}/members?cap=200`
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
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.members)
        ? data.members
        : [];

      const parsedMembers: ChannelMember[] = rawList.map((m: any) => ({
        userId: String(m.userId || m.user_id || m.id || ""),
        username: m.username,
        displayName: m.displayName || m.display_name || m.name,
        avatarUrl: m.avatarUrl || m.avatar_url || m.avatar,
        role: (m.role as "owner" | "admin" | "poster" | "subscriber") || "subscriber",
        isBot: Boolean(m.isBot || m.is_bot),
        joinedAt: m.joinedAt || m.joined_at,
      }));

      setMembers(parsedMembers);
    } catch (err: any) {
      console.error("[ChannelInfo] Ошибка загрузки участников канала:", err);
      // Zero-Toast: ошибку сохраняем локально для вывода в карточке
      setError(err?.message || "Не удалось загрузить список участников");
    } finally {
      setIsLoadingMembers(false);
    }
  }, [chatId, initialMembers]);

  useEffect(() => {
    if (isOpen) {
      if (initialMembers && initialMembers.length > 0) {
        setMembers(initialMembers);
      } else {
        fetchMembers();
      }
    } else {
      setError(null);
      setCopiedLink(false);
      setIsLeaving(false);
    }
  }, [isOpen, fetchMembers, initialMembers]);

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

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = inviteLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error("[ChannelInfo] Ошибка копирования ссылки:", err);
    }
  };

  const handleLeave = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    setError(null);
    try {
      if (onLeaveChannel) {
        await onLeaveChannel(chatId);
      } else {
        const token =
          localStorage.getItem("session_token") ||
          localStorage.getItem("token") ||
          localStorage.getItem("auth_token") ||
          "";
        const url = getBackendUrl(`/api/v1/chats/${encodeURIComponent(chatId)}/subscribe`);
        const res = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          throw new Error(`Не удалось отписаться: HTTP ${res.status}`);
        }
      }
      onClose();
    } catch (err: any) {
      console.error("[ChannelInfo] Ошибка при выходе из канала:", err);
      // Zero-Toast: выводим ошибку внутри модала
      setError(err?.message || "Не удалось покинуть канал");
    } finally {
      setIsLeaving(false);
    }
  };

  const formatSubscribers = (count: number) => {
    if (count <= 0) return "Нет подписчиков";
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return `${count} подписчик`;
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return `${count} подписчика`;
    }
    return `${count} подписчиков`;
  };

  const renderRoleBadge = (role: ChannelMember["role"], isBot?: boolean) => {
    if (isBot) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          <Bot className="w-3 h-3" />
          BOT
        </span>
      );
    }
    switch (role) {
      case "owner":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Crown className="w-3 h-3" />
            Создатель
          </span>
        );
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Shield className="w-3 h-3" />
            Администратор
          </span>
        );
      case "poster":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Edit3 className="w-3 h-3" />
            Редактор
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-400 border border-white/5">
            Подписчик
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="channel-info-modal-title"
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
            className="relative w-full max-w-lg z-10 max-h-[90vh] flex flex-col"
          >
            <GlassCard glow className="w-full flex flex-col overflow-hidden border border-white/10 shadow-2xl bg-slate-900/95 max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      id="channel-info-modal-title"
                      className="text-base font-semibold text-slate-100"
                    >
                      Информация о канале
                    </h3>
                    <p className="text-xs text-purple-300/80 font-medium">
                      Публичный канал
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Закрыть окно"
                  data-testid="channel-info-close-btn"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* Channel Header Profile */}
                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={title}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/30 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 border-2 border-purple-400/30 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-purple-500/20">
                      {title ? title.charAt(0).toUpperCase() : "📢"}
                    </div>
                  )}

                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-100">{title}</h2>
                    {username && (
                      <p className="text-xs font-medium text-purple-400">
                        @{username}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      {formatSubscribers(subscribersCount || members.length)}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {description && (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <p className="text-xs font-medium text-slate-400">Описание</p>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {description}
                    </p>
                  </div>
                )}

                {/* Public Link Card */}
                {inviteLink && (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">
                        Публичная ссылка
                      </span>
                      {copiedLink && (
                        <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Ссылка скопирована
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-300 font-mono truncate select-all">
                        {inviteLink}
                      </div>
                      <button
                        onClick={handleCopyLink}
                        title="Скопировать ссылку"
                        aria-label="Скопировать ссылку"
                        className="p-2 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white transition-colors flex items-center gap-1 text-xs shrink-0"
                      >
                        {copiedLink ? (
                          <Check className="w-4 h-4 text-emerald-300" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Копировать</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Notifications Mute/Unmute */}
                  <button
                    onClick={() => onToggleMute && onToggleMute(!isMuted)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                      isMuted
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20"
                        : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {isMuted ? (
                      <>
                        <BellOff className="w-4 h-4 text-amber-400" />
                        Включить звук
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 text-slate-400" />
                        Без звука
                      </>
                    )}
                  </button>

                  {/* Manage / Edit for Admins */}
                  {isAdmin ? (
                    <button
                      onClick={() => {
                        if (onManageChannel) onManageChannel(chatId);
                        else if (onEditChannel) onEditChannel(chatId);
                      }}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 text-xs font-medium transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Управление
                    </button>
                  ) : (
                    <button
                      onClick={handleLeave}
                      disabled={isLeaving}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" />
                      {isLeaving ? "Выход..." : "Покинуть канал"}
                    </button>
                  )}
                </div>

                {/* Inline Error Block (Zero-Toast) */}
                {error && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <div className="flex-1">
                      <p className="font-semibold">Ошибка</p>
                      <p className="text-rose-200/90">{error}</p>
                    </div>
                    <button
                      onClick={fetchMembers}
                      className="p-1 rounded hover:bg-rose-500/20 text-rose-300 transition-colors"
                      title="Повторить"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Administrators and Members Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-300">
                        Администрация и участники ({members.length})
                      </span>
                    </div>
                    {isLoadingMembers && (
                      <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {members.length === 0 && !isLoadingMembers && !error && (
                      <p className="text-xs text-slate-500 py-3 text-center">
                        Список участников пуст или скрыт настройками приватности
                      </p>
                    )}

                    {members.map((member) => {
                      const memberName =
                        member.displayName ||
                        member.username ||
                        `Участник #${member.userId.slice(-4)}`;

                      return (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={memberName}
                                className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600/70 to-indigo-600/70 border border-white/10 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                                {memberName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-100 truncate">
                                {memberName}
                              </p>
                              {member.username && (
                                <p className="text-[11px] text-slate-400 truncate">
                                  @{member.username}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="ml-2 shrink-0">
                            {renderRoleBadge(member.role, member.isBot)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between">
                {isAdmin && (
                  <button
                    onClick={handleLeave}
                    disabled={isLeaving}
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {isLeaving ? "Выход..." : "Покинуть канал"}
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={onClose}
                  data-testid="channel-info-footer-close-btn"
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