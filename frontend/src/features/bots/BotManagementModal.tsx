// frontend/src/features/bots/BotManagementModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot as BotIcon,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Trash2,
  Activity,
  AlertTriangle,
  Radio,
  Sliders,
  Key,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Zap,
  MessageSquare,
  Sparkles,
  Inbox,
  Link as LinkIcon,
} from 'lucide-react';
import { GlassModal } from '../../ui/GlassModal';
import { GlassCard } from '../../ui/GlassCard';
import { GlassButton } from '../../ui/GlassButton';
import { GlassInput } from '../../ui/GlassInput';
import { Bot, BotCustomCommand, BotCustomCommandButton, PingWebhookResponse } from './types';
import { getBackendUrl } from '../../utils/url';

export interface BotManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light' | 'coffee';
  showToast?: (message: string, type?: 'error' | 'success' | 'info') => void;
  onOpenBotChat?: (bot: Bot) => void;
}

type ModalView = 'list' | 'create' | 'token_display' | 'details';
type DetailsTab = 'commands' | 'general' | 'token' | 'webhook' | 'ping';

export const BotManagementModal: React.FC<BotManagementModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  showToast,
  onOpenBotChat,
}) => {
  const [view, setView] = useState<ModalView>('list');
  const [detailsTab, setDetailsTab] = useState<DetailsTab>('commands');
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [newlyCreatedBot, setNewlyCreatedBot] = useState<Bot | null>(null);

  // Форма создания
  const [createName, setCreateName] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createAvatarUrl, setCreateAvatarUrl] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Отображение сгенерированного токена
  const [newlyGeneratedToken, setNewlyGeneratedToken] = useState<string | null>(null);
  const [isTokenCopied, setIsTokenCopied] = useState(false);

  // Форма редактирования бота и No-Code конструктора
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editCanJoinGroups, setEditCanJoinGroups] = useState(true);
  const [editWelcomeText, setEditWelcomeText] = useState('');
  const [editFeedbackMode, setEditFeedbackMode] = useState(false);
  const [editCustomCommands, setEditCustomCommands] = useState<BotCustomCommand[]>([]);
  const [newCmdTrigger, setNewCmdTrigger] = useState('');
  const [newCmdDesc, setNewCmdDesc] = useState('');
  const [newCmdResponse, setNewCmdResponse] = useState('');
  const [newCmdButtons, setNewCmdButtons] = useState<BotCustomCommandButton[]>([]);
  const [newBtnText, setNewBtnText] = useState('');
  const [newBtnTarget, setNewBtnTarget] = useState('');
  const [newBtnType, setNewBtnType] = useState<'callback' | 'url'>('callback');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Настройка вебхука
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [isDeletingWebhook, setIsDeletingWebhook] = useState(false);

  // Тест вебхука (Ping)
  const [isPingingWebhook, setIsPingingWebhook] = useState(false);
  const [pingResult, setPingResult] = useState<PingWebhookResponse | null>(null);

  // Ротация токена
  const [isRotatingToken, setIsRotatingToken] = useState(false);

  const notify = (msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    if (showToast) {
      showToast(msg, type === 'warning' ? 'error' : type);
    } else {
      console.log(`[BotModal ${type}] ${msg}`);
    }
  };

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('session_token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  // Загрузка списка ботов
  const fetchMyBots = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(getBackendUrl('/api/v1/bots/my'), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.bots)) {
          setBots(data.bots);
        }
      } else {
        console.warn('[BotManagementModal] Не удалось загрузить ботов:', res.status);
      }
    } catch (err) {
      console.error('[BotManagementModal] Ошибка загрузки ботов:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMyBots();
      setView('list');
      setSelectedBot(null);
      setNewlyGeneratedToken(null);
      setPingResult(null);
    }
  }, [isOpen, fetchMyBots]);

  // Валидация юзернейма бота
  const isUsernameValid = (uname: string): boolean => {
    const clean = uname.trim().toLowerCase();
    return clean.length >= 3 && (clean.endsWith('bot') || clean.endsWith('_bot'));
  };

  // Обработчик создания бота
  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      notify('Укажите название бота', 'warning');
      return;
    }
    const cleanUsername = createUsername.trim().toLowerCase().replace(/^@/, '');
    if (!isUsernameValid(cleanUsername)) {
      notify('Юзернейм бота обязан оканчиваться на bot или _bot (например, helper_bot)', 'warning');
      return;
    }

    try {
      setIsSubmittingCreate(true);
      const res = await fetch(getBackendUrl('/api/v1/bots/create'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: createName.trim(),
          username: cleanUsername,
          description: createDescription.trim(),
          avatar_url: createAvatarUrl.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        notify(`Бот @${cleanUsername} успешно создан и готов к работе!`, 'success');
        setNewlyGeneratedToken(data.token);
        setNewlyCreatedBot(data.bot || null);
        if (data.bot?.user_uuid && typeof localStorage !== 'undefined') {
          try { localStorage.setItem('bot_chat_' + data.bot.user_uuid, '1'); } catch {}
        }
        setIsTokenCopied(false);
        setView('token_display');
        // Очистка формы
        setCreateName('');
        setCreateUsername('');
        setCreateDescription('');
        setCreateAvatarUrl('');
        // Обновляем список
        fetchMyBots();
      } else {
        notify(data.detail || data.description || 'Ошибка при создании бота', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'Сбой сети при создании бота', 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Открытие экрана деталей бота
  const handleOpenDetails = (bot: Bot, initialTab: DetailsTab = 'commands') => {
    setSelectedBot(bot);
    setEditName(bot.name);
    setEditDescription(bot.description || '');
    setEditAvatarUrl(bot.avatar_url || '');
    setEditIsActive(bot.is_active);
    setEditCanJoinGroups(bot.can_join_groups ?? true);
    setEditWelcomeText(bot.welcome_text || '');
    setEditFeedbackMode(Boolean(bot.feedback_mode_enabled));
    setEditCustomCommands(Array.isArray(bot.custom_commands) ? bot.custom_commands : []);
    setNewCmdTrigger('');
    setNewCmdDesc('');
    setNewCmdResponse('');
    setNewCmdButtons([]);
    setNewBtnText('');
    setNewBtnTarget('');

    setWebhookUrl(bot.webhook?.url || '');
    setWebhookSecret('');
    setPingResult(null);

    setDetailsTab(initialTab);
    setView('details');
  };

  // Добавление кнопки к создаваемой команде
  const handleAddButtonToDraftCmd = () => {
    if (!newBtnText.trim() || !newBtnTarget.trim()) {
      notify('Укажите текст кнопки и команду или ссылку', 'warning');
      return;
    }
    const cleanTarget = newBtnTarget.trim();
    const btn: BotCustomCommandButton =
      newBtnType === 'url'
        ? { text: newBtnText.trim(), url: cleanTarget.startsWith('http') ? cleanTarget : `https://${cleanTarget}` }
        : { text: newBtnText.trim(), callback_data: cleanTarget.startsWith('cmd:') ? cleanTarget : `cmd:${cleanTarget}` };
    setNewCmdButtons((prev) => [...prev, btn]);
    setNewBtnText('');
    setNewBtnTarget('');
  };

  // Добавление пользовательской команды в список
  const handleAddCustomCommand = () => {
    const rawTrigger = newCmdTrigger.trim().replace(/^\/+/, '').toLowerCase();
    if (!rawTrigger) {
      notify('Укажите команду (например: faq, price, rules)', 'warning');
      return;
    }
    if (!newCmdResponse.trim()) {
      notify('Укажите текст автоответа бота на эту команду', 'warning');
      return;
    }
    const nextCmd: BotCustomCommand = {
      command: rawTrigger,
      description: newCmdDesc.trim() || 'Команда бота',
      response_text: newCmdResponse.trim(),
      buttons: newCmdButtons,
    };
    setEditCustomCommands((prev) => {
      const filtered = prev.filter((c) => c.command.replace(/^\/+/, '').toLowerCase() !== rawTrigger);
      return [...filtered, nextCmd];
    });
    setNewCmdTrigger('');
    setNewCmdDesc('');
    setNewCmdResponse('');
    setNewCmdButtons([]);
    notify(`Команда /${rawTrigger} добавлена! Не забудьте нажать «Сохранить»`, 'info');
  };

  const handleRemoveCustomCommand = (cmdName: string) => {
    setEditCustomCommands((prev) => prev.filter((c) => c.command !== cmdName));
  };

  // Сохранение настроек бота и No-Code команд
  const handleSaveDetails = async () => {
    if (!selectedBot) return;
    try {
      setIsSavingDetails(true);
      const res = await fetch(getBackendUrl(`/api/v1/bots/${selectedBot.id}`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          avatar_url: editAvatarUrl.trim(),
          is_active: editIsActive,
          can_join_groups: editCanJoinGroups,
          welcome_text: editWelcomeText,
          feedback_mode_enabled: editFeedbackMode,
          custom_commands: editCustomCommands,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        notify('Настройки и команды бота успешно сохранены!', 'success');
        // Обновляем локальный стейт
        setSelectedBot((prev) =>
          prev
            ? {
                ...prev,
                name: editName.trim(),
                description: editDescription.trim(),
                avatar_url: editAvatarUrl.trim(),
                is_active: editIsActive,
                can_join_groups: editCanJoinGroups,
                welcome_text: editWelcomeText,
                feedback_mode_enabled: editFeedbackMode,
                custom_commands: editCustomCommands,
              }
            : null
        );
        fetchMyBots();
      } else {
        notify(data.detail || 'Не удалось сохранить настройки', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'Ошибка сети при сохранении', 'error');
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Перевыпуск токена (ротация)
  const handleRotateToken = async () => {
    if (!selectedBot) return;
    const confirmRotate = window.confirm(
      `Вы уверены, что хотите перевыпустить токен для бота @${selectedBot.username}? Старый токен мгновенно перестанет действовать!`
    );
    if (!confirmRotate) return;

    try {
      setIsRotatingToken(true);
      const res = await fetch(getBackendUrl(`/api/v1/bots/${selectedBot.id}/regenerate-token`), {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        notify('Токен бота успешно обновлен!', 'success');
        setNewlyGeneratedToken(data.token);
        setIsTokenCopied(false);
        setView('token_display');
        fetchMyBots();
      } else {
        notify(data.detail || 'Не удалось перевыпустить токен', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'Ошибка сети при ротации токена', 'error');
    } finally {
      setIsRotatingToken(false);
    }
  };

  // Сохранение вебхука
  const handleSaveWebhook = async () => {
    if (!selectedBot) return;
    const cleanUrl = webhookUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      notify('URL вебхука обязан начинаться с https:// или http://', 'warning');
      return;
    }

    try {
      setIsSavingWebhook(true);
      const res = await fetch(getBackendUrl(`/api/v1/bots/${selectedBot.id}/webhook`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          url: cleanUrl,
          secret_token: webhookSecret.trim() || undefined,
          allowed_updates: ['message', 'callback_query', 'invoice_update'],
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        notify('Вебхук успешно настроен и активирован', 'success');
        fetchMyBots();
      } else {
        notify(data.detail || 'Не удалось настроить вебхук', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'Ошибка сети при сохранении вебхука', 'error');
    } finally {
      setIsSavingWebhook(false);
    }
  };

  // Удаление вебхука
  const handleDeleteWebhook = async () => {
    if (!selectedBot) return;
    try {
      setIsDeletingWebhook(true);
      const res = await fetch(getBackendUrl(`/api/v1/bots/${selectedBot.id}/webhook`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        notify('Вебхук удален. Бот переведен в режим Long-polling', 'info');
        setWebhookUrl('');
        setWebhookSecret('');
        fetchMyBots();
      } else {
        notify(data.detail || 'Не удалось удалить вебхук', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'Ошибка сети при удалении вебхука', 'error');
    } finally {
      setIsDeletingWebhook(false);
    }
  };

  // Пинг вебхука
  const handlePingWebhook = async () => {
    if (!selectedBot) return;
    try {
      setIsPingingWebhook(true);
      setPingResult(null);
      const res = await fetch(getBackendUrl(`/api/v1/bots/${selectedBot.id}/ping-webhook`), {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (res.ok) {
        setPingResult(data);
        if (data.ok) {
          notify(`Вебхук отвечает! Задержка: ${data.response_time_ms ? Math.round(data.response_time_ms) : 0} мс`, 'success');
        } else {
          notify(`Тест не пройден: ${data.error || 'HTTP ' + data.status_code}`, 'warning');
        }
      } else {
        notify(data.detail || 'Не удалось выполнить пинг вебхука', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'Ошибка соединения при пинге вебхука', 'error');
    } finally {
      setIsPingingWebhook(false);
    }
  };

  // Удаление бота
  const handleDeleteBot = async (bot: Bot) => {
    const confirmDelete = window.confirm(
      `Вы действительно хотите удалить бота @${bot.username}? Все токены и история интеграции будут безвозвратно удалены!`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(getBackendUrl(`/api/v1/bots/${bot.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        notify(`Бот @${bot.username} успешно удален`, 'info');
        if (selectedBot?.id === bot.id) {
          setView('list');
          setSelectedBot(null);
        }
        fetchMyBots();
      } else {
        notify(data.detail || 'Не удалось удалить бота', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'Ошибка сети при удалении бота', 'error');
    }
  };

  // Копирование в буфер
  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setIsTokenCopied(true);
      notify('Скопировано в буфер обмена!', 'success');
      setTimeout(() => setIsTokenCopied(false), 3000);
    } catch (e) {
      notify('Не удалось скопировать', 'error');
    }
  };

  // Генерация случайного секрета
  const generateRandomSecret = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setWebhookSecret(result);
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        view === 'create'
          ? 'Создание нового бота'
          : view === 'token_display'
          ? 'Секретный API-токен'
          : view === 'details' && selectedBot
          ? `Управление @${selectedBot.username}`
          : 'Боты и Интеграции (Developer Hub)'
      }
      size="lg"
    >
      <div className="space-y-4 select-none">
        {/* ===================== ЭКРАН 1: СПИСОК БОТОВ ===================== */}
        {view === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  Всего ботов: <strong className="text-purple-300">{bots.length}</strong>
                </span>
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
              </div>
              <GlassButton
                variant="accent"
                size="sm"
                onClick={() => setView('create')}
                className="flex items-center gap-1.5 font-semibold text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Создать бота</span>
              </GlassButton>
            </div>

            {bots.length === 0 && !isLoading ? (
              <div className="py-12 px-4 text-center border border-white/5 rounded-2xl bg-white/2 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto shadow-glass-sm">
                  <BotIcon className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-200">У вас пока нет созданных ботов</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Создавайте Telegram-like ботов, подключайте внешние CRM, настраивайте Outgoing Webhooks и отправляйте интерактивные инлайн-клавиатуры.
                </p>
                <GlassButton
                  variant="primary"
                  size="sm"
                  onClick={() => setView('create')}
                  className="mx-auto mt-2 flex items-center gap-2 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Создать первого бота</span>
                </GlassButton>
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {bots.map((bot) => {
                  const hasWebhook = Boolean(bot.webhook?.url);
                  const isWebhookError = Boolean(bot.webhook && bot.webhook.failure_count && bot.webhook.failure_count > 0);

                  return (
                    <GlassCard
                      key={bot.id}
                      className="p-4 flex flex-col gap-3 border border-white/10 hover:border-purple-500/30 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold shrink-0">
                            {bot.avatar_url ? (
                              <img src={bot.avatar_url} alt={bot.name} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                              <BotIcon className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-100 truncate">{bot.name}</h4>
                              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                @{bot.username}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                              {bot.description || 'Сервисный бот Boltalka'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                            bot.is_active
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-500/15 border-slate-500/30 text-slate-400'
                          }`}
                        >
                          {bot.is_active ? '🟢 Активен' : '⚪ Отключен'}
                        </span>
                      </div>

                      {/* Метаданные токена, встроенных команд и вебхука */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] border-t border-white/5">
                        <div className="flex items-center gap-1 bg-purple-500/15 px-2 py-1 rounded-lg border border-purple-500/30 text-purple-200 text-[10px] font-medium">
                          <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                          <span>
                            6 встроенных команд
                            {Array.isArray(bot.custom_commands) && bot.custom_commands.length > 0
                              ? ` + ${bot.custom_commands.length} своих`
                              : ''}
                          </span>
                        </div>

                        {bot.feedback_mode_enabled && (
                          <div className="flex items-center gap-1 bg-emerald-500/15 px-2 py-1 rounded-lg border border-emerald-500/30 text-emerald-300 text-[10px] font-medium">
                            <Inbox className="w-3 h-3 shrink-0" />
                            <span>Предложка включена</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg border border-white/5 text-slate-300 font-mono">
                          <Key className="w-3 h-3 text-purple-400 shrink-0" />
                          <span>{bot.token_prefix ? `${bot.token_prefix}...` : `bot${bot.id}:••••`}</span>
                        </div>

                        {hasWebhook ? (
                          <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium ${
                              isWebhookError
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[180px]">{bot.webhook?.url}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5 text-slate-400 text-[10px]">
                            <Radio className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Работает автономно (No-Code)</span>
                          </div>
                        )}
                      </div>

                      {/* Кнопки действий */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {onOpenBotChat && (
                            <button
                              type="button"
                              onClick={() => onOpenBotChat(bot)}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 active:scale-95 text-xs font-semibold text-white border border-purple-400/30 shadow-sm transition-all flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Открыть чат</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenDetails(bot, 'commands')}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 active:scale-95 text-xs font-medium text-purple-200 border border-purple-500/30 transition-all flex items-center gap-1"
                          >
                            <Zap className="w-3.5 h-3.5 text-purple-400" />
                            <span>Команды и автоответы</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDetails(bot, 'general')}
                            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-xs text-slate-200 border border-white/10 transition-all flex items-center gap-1"
                          >
                            <Sliders className="w-3.5 h-3.5 text-purple-400" />
                            <span>Профиль</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDetails(bot, 'webhook')}
                            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-xs text-slate-200 border border-white/10 transition-all flex items-center gap-1"
                          >
                            <Globe className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Webhook</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteBot(bot)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/5 transition-all"
                          title="Удалить бота"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== ЭКРАН 2: СОЗДАНИЕ БОТА ===================== */}
        {view === 'create' && (
          <form onSubmit={handleCreateBot} className="space-y-4">
            <button
              type="button"
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Назад к списку ботов</span>
            </button>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Название бота *</label>
                <GlassInput
                  placeholder="Например: Помощник заказов"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={64}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Юзернейм бота * <span className="text-[10px] text-slate-400">(обязательно оканчивается на bot)</span>
                </label>
                <GlassInput
                  placeholder="Например: my_shop_helper_bot"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  maxLength={32}
                  required
                />
                {createUsername.trim().length > 0 && (
                  <p
                    className={`text-[11px] mt-1 flex items-center gap-1 ${
                      isUsernameValid(createUsername) ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {isUsernameValid(createUsername) ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Корректный юзернейм: @{createUsername.trim().toLowerCase().replace(/^@/, '')}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Юзернейм обязан оканчиваться на bot или _bot</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Описание назначения</label>
                <textarea
                  placeholder="Опишите, какие функции выполняет бот..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">URL аватара (опционально)</label>
                <GlassInput
                  placeholder="https://example.com/avatar.png"
                  value={createAvatarUrl}
                  onChange={(e) => setCreateAvatarUrl(e.target.value)}
                />
              </div>

              <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-2">
                <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Разрешения сервисного токена (Scopes)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked readOnly className="rounded text-purple-600 focus:ring-0" />
                    <span>messages:send (Отправка сообщений)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked readOnly className="rounded text-purple-600 focus:ring-0" />
                    <span>chats:read (Чтение входящих)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked readOnly className="rounded text-purple-600 focus:ring-0" />
                    <span>webhooks:manage (Вебхуки)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked readOnly className="rounded text-purple-600 focus:ring-0" />
                    <span>invoices:create (Счета и оплата)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <GlassButton variant="secondary" size="sm" type="button" onClick={() => setView('list')}>
                Отмена
              </GlassButton>
              <GlassButton
                variant="accent"
                size="sm"
                type="submit"
                disabled={isSubmittingCreate || !createName.trim() || !isUsernameValid(createUsername)}
                className="flex items-center gap-1.5 font-semibold"
              >
                {isSubmittingCreate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Создать бота</span>
              </GlassButton>
            </div>
          </form>
        )}

        {/* ===================== ЭКРАН 3: ОТОБРАЖЕНИЕ ТОКЕНА ===================== */}
        {view === 'token_display' && newlyGeneratedToken && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-1.5 text-left">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <Sparkles className="w-5 h-5 shrink-0" />
                <span>Бот уже работает «из коробки» внутри мессенджера!</span>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
                Команды <code>/start</code>, <code>/help</code>, <code>/id</code>, <code>/ping</code>, <code>/roll</code> и <code>/coin</code> уже активны без внешних серверов. Вы также можете настроить свои автоответы и режим обратной связи во вкладке <strong>«Команды и автоответы»</strong>.
              </p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-left">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>API-токен для внешних интеграций (опционально)</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                Если вы планируете подключать внешний сервер по API, сохраните этот токен — он отображается <strong>ровно один раз</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Секретный API-токен бота:</label>
              <div className="relative flex items-center bg-black/40 border border-purple-500/40 rounded-xl p-3 font-mono text-xs text-purple-200 break-all select-all shadow-inner">
                <span>{newlyGeneratedToken}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <GlassButton
                variant="primary"
                size="md"
                fullWidth
                onClick={() => copyToClipboard(newlyGeneratedToken)}
                className="flex items-center justify-center gap-2 font-semibold text-xs py-3"
              >
                {isTokenCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{isTokenCopied ? 'Токен скопирован!' : 'Скопировать токен'}</span>
              </GlassButton>

              {newlyCreatedBot && onOpenBotChat && (
                <GlassButton
                  variant="accent"
                  size="md"
                  fullWidth
                  onClick={() => {
                    const targetBot = newlyCreatedBot;
                    setNewlyGeneratedToken(null);
                    setNewlyCreatedBot(null);
                    onOpenBotChat(targetBot);
                  }}
                  className="flex items-center justify-center gap-2 font-semibold text-xs py-3"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Открыть чат с ботом</span>
                </GlassButton>
              )}

              <GlassButton
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => {
                  if (newlyCreatedBot) {
                    const targetBot = newlyCreatedBot;
                    setNewlyGeneratedToken(null);
                    setNewlyCreatedBot(null);
                    handleOpenDetails(targetBot, 'commands');
                  } else {
                    setNewlyGeneratedToken(null);
                    setView('list');
                  }
                }}
                className="font-semibold text-xs py-3"
              >
                Настроить команды
              </GlassButton>
            </div>
          </div>
        )}

        {/* ===================== ЭКРАН 4: ДЕТАЛИ БОТА, NO-CODE КОНСТРУКТОР, WEBHOOK, PING ===================== */}
        {view === 'details' && selectedBot && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setView('list')}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад к списку ботов</span>
              </button>

              {onOpenBotChat && (
                <button
                  type="button"
                  onClick={() => onOpenBotChat(selectedBot)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-xs font-semibold text-white border border-purple-400/30 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Открыть чат с @{selectedBot.username}</span>
                </button>
              )}
            </div>

            {/* Вкладки настроек бота */}
            <div className="flex items-center gap-1 border-b border-white/10 pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDetailsTab('commands')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  detailsTab === 'commands'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>Команды и автоответы</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('general')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  detailsTab === 'general'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Профиль и статус
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('webhook')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  detailsTab === 'webhook'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Outgoing Webhook
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('ping')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  detailsTab === 'ping'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Тестирование (Ping)
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('token')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  detailsTab === 'token'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Токен API
              </button>
            </div>

            {/* Вкладка 0: Визуальный No-Code конструктор команд и автоответов */}
            {detailsTab === 'commands' && (
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {/* Блок 1: Встроенные команды из коробки */}
                <div className="p-3.5 bg-purple-500/10 border border-purple-500/25 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Стандартные команды «из коробки» (активны автоматически)</span>
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                      Без серверов и кода
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                    {[
                      { cmd: '/start', desc: 'Приветствие и кнопки меню' },
                      { cmd: '/help', desc: 'Список всех команд бота' },
                      { cmd: '/id', desc: 'Ваш ID и ID текущего чата' },
                      { cmd: '/ping', desc: 'Проверка статуса бота' },
                      { cmd: '/roll', desc: 'Бросить игровой кубик 🎲' },
                      { cmd: '/coin', desc: 'Подбросить монетку 🪙' },
                    ].map((item) => (
                      <div
                        key={item.cmd}
                        className="p-2 rounded-xl bg-black/25 border border-white/5 flex flex-col gap-0.5"
                      >
                        <span className="text-xs font-mono font-bold text-purple-300">{item.cmd}</span>
                        <span className="text-[10px] text-slate-400 leading-tight">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Блок 2: Тумблер Бот обратной связи (Предложка) */}
                <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-xs gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-emerald-200 flex items-center gap-1.5">
                      <Inbox className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Режим «Бот обратной связи (Предложка / Саппорт)»</span>
                    </span>
                    <span className="text-[11px] text-emerald-200/80 block leading-relaxed">
                      Всё, что другие пользователи пишут вашему боту, автоматически пересылается вам. Чтобы ответить пользователю от имени бота — просто сделайте <strong>Ответить (Reply)</strong> на пересланное сообщение!
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={editFeedbackMode}
                      onChange={(e) => setEditFeedbackMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 peer-checked:after:bg-emerald-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500/35 border border-white/10"></div>
                  </label>
                </div>

                {/* Блок 3: Настройка приветствия /start */}
                <div className="p-3.5 bg-white/3 border border-white/10 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200">
                      Текст приветствия по команде <code className="text-purple-300">/start</code>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Переменные: <code>{'{name}'}</code>, <code>{'{id}'}</code>, <code>{'{bot_name}'}</code>
                    </span>
                  </div>
                  <textarea
                    placeholder={`Привет, {name}! 👋\nЯ бот ${selectedBot.name}. Выберите нужный раздел на кнопках ниже:`}
                    value={editWelcomeText}
                    onChange={(e) => setEditWelcomeText(e.target.value)}
                    rows={3}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                  />
                </div>

                {/* Блок 4: Список пользовательских команд и добавление новой */}
                <div className="p-3.5 bg-white/3 border border-white/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span>Свои команды и автоответы ({editCustomCommands.length})</span>
                    </h5>
                    <span className="text-[10px] text-slate-400">Появляются в меню /start и /help</span>
                  </div>

                  {editCustomCommands.length > 0 && (
                    <div className="space-y-2">
                      {editCustomCommands.map((cmd) => (
                        <div
                          key={cmd.command}
                          className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
                                /{cmd.command.replace(/^\/+/, '')}
                              </span>
                              {cmd.description && (
                                <span className="text-[11px] text-slate-400">{cmd.description}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-200 whitespace-pre-wrap break-words">
                              {cmd.response_text}
                            </p>
                            {Array.isArray(cmd.buttons) && cmd.buttons.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {cmd.buttons.map((b, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-200 flex items-center gap-1"
                                  >
                                    {b.url ? <LinkIcon className="w-2.5 h-2.5" /> : null}
                                    <span>{b.text}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomCommand(cmd.command)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-all shrink-0"
                            title="Удалить команду"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Форма добавления новой команды */}
                  <div className="p-3 rounded-xl bg-black/20 border border-dashed border-white/15 space-y-2.5">
                    <div className="text-[11px] font-semibold text-purple-300">
                      + Добавить команду (например: /faq, /price, /rules, /contacts)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <GlassInput
                        placeholder="Команда (например: faq или /price)"
                        value={newCmdTrigger}
                        onChange={(e) => setNewCmdTrigger(e.target.value)}
                      />
                      <GlassInput
                        placeholder="Краткое описание для меню (напр. Прайс-лист)"
                        value={newCmdDesc}
                        onChange={(e) => setNewCmdDesc(e.target.value)}
                      />
                    </div>
                    <textarea
                      placeholder="Текст ответа бота при вызове команды... (поддерживает {name}, {id}, {bot_name})"
                      value={newCmdResponse}
                      onChange={(e) => setNewCmdResponse(e.target.value)}
                      rows={3}
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                    />

                    {/* Инлайн-кнопки под ответом */}
                    <div className="space-y-2 pt-1">
                      <div className="text-[10px] font-semibold text-slate-400">
                        Инлайн-кнопки под сообщением (опционально):
                      </div>
                      {newCmdButtons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {newCmdButtons.map((b, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-200 flex items-center gap-1.5"
                            >
                              <span>{b.text}</span>
                              <button
                                type="button"
                                onClick={() => setNewCmdButtons((prev) => prev.filter((_, idx) => idx !== i))}
                                className="text-slate-400 hover:text-rose-300"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-1.5">
                        <input
                          type="text"
                          placeholder="Текст кнопки"
                          value={newBtnText}
                          onChange={(e) => setNewBtnText(e.target.value)}
                          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                        />
                        <select
                          value={newBtnType}
                          onChange={(e) => setNewBtnType(e.target.value as 'callback' | 'url')}
                          className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
                        >
                          <option value="callback">Вызвать команду</option>
                          <option value="url">Открыть ссылку</option>
                        </select>
                        <input
                          type="text"
                          placeholder={newBtnType === 'url' ? 'https://...' : '/price или /help'}
                          value={newBtnTarget}
                          onChange={(e) => setNewBtnTarget(e.target.value)}
                          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddButtonToDraftCmd}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 border border-white/10 shrink-0"
                        >
                          + Кнопка
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddCustomCommand}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-xs font-semibold text-purple-200 flex items-center gap-1.5 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Добавить команду в список</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <GlassButton
                    variant="accent"
                    size="sm"
                    onClick={handleSaveDetails}
                    disabled={isSavingDetails}
                    className="flex items-center gap-1.5 font-semibold text-xs py-2.5 px-5"
                  >
                    {isSavingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Сохранить команды и автоответы</span>
                  </GlassButton>
                </div>
              </div>
            )}

            {/* Вкладка 1: Профиль */}
            {detailsTab === 'general' && (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Отображаемое имя</label>
                  <GlassInput value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={64} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Описание бота</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">URL аватара</label>
                  <GlassInput value={editAvatarUrl} onChange={(e) => setEditAvatarUrl(e.target.value)} />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/2 border border-white/5 rounded-xl text-xs">
                  <div>
                    <span className="font-semibold text-slate-200 block">Статус активности бота</span>
                    <span className="text-[10px] text-slate-400">
                      {editIsActive ? 'Бот принимает сообщения и обрабатывает события' : 'Бот временно отключен'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-purple-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500/25 border border-white/5"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/2 border border-white/5 rounded-xl text-xs">
                  <div>
                    <span className="font-semibold text-slate-200 block">Разрешить добавление в группы</span>
                    <span className="text-[10px] text-slate-400">
                      Пользователи смогут добавлять этого бота в групповые чаты
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editCanJoinGroups}
                      onChange={(e) => setEditCanJoinGroups(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-purple-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500/25 border border-white/5"></div>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <GlassButton
                    variant="accent"
                    size="sm"
                    onClick={handleSaveDetails}
                    disabled={isSavingDetails || !editName.trim()}
                    className="flex items-center gap-1.5 font-semibold text-xs"
                  >
                    {isSavingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Сохранить профиль</span>
                  </GlassButton>
                </div>
              </div>
            )}

            {/* Вкладка 2: Webhook */}
            {detailsTab === 'webhook' && (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-indigo-300">
                    <Globe className="w-4 h-4" />
                    <span>Outgoing Webhook (Доставка входящих событий)</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-indigo-200/90">
                    Сервер Boltalka будет отправлять HTTP POST запросы на указанный URL при каждом новом сообщении, нажатии инлайн-кнопки или оплате счета.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Webhook URL *</label>
                  <GlassInput
                    placeholder="https://your-domain.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">Secret Token (HMAC ключ подписи)</label>
                    <button
                      type="button"
                      onClick={generateRandomSecret}
                      className="text-[10px] text-purple-400 hover:text-purple-300"
                    >
                      Сгенерировать случайный
                    </button>
                  </div>
                  <GlassInput
                    placeholder="Секретный ключ для проверки подписи X-Gossip-Signature"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  {selectedBot.webhook?.url ? (
                    <GlassButton
                      variant="danger"
                      size="sm"
                      onClick={handleDeleteWebhook}
                      disabled={isDeletingWebhook}
                      className="text-xs flex items-center gap-1"
                    >
                      {isDeletingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>Удалить Webhook</span>
                    </GlassButton>
                  ) : <div />}

                  <GlassButton
                    variant="accent"
                    size="sm"
                    onClick={handleSaveWebhook}
                    disabled={isSavingWebhook || !webhookUrl.trim()}
                    className="flex items-center gap-1.5 font-semibold text-xs"
                  >
                    {isSavingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    <span>Сохранить Webhook</span>
                  </GlassButton>
                </div>
              </div>
            )}

            {/* Вкладка 3: Тестирование Webhook (Ping) */}
            {detailsTab === 'ping' && (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-300">
                    <Activity className="w-4 h-4" />
                    <span>Диагностика и замер задержки вебхука (Ping & Test)</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-emerald-200/90">
                    Отправляет тестовое диагностическое событие на зарегистрированный URL вебхука бота и замеряет точное время ответа внешнего сервера.
                  </p>
                </div>

                <div className="p-3 bg-white/2 border border-white/5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Текущий зарегистрированный URL:</span>
                    <span className="font-mono text-purple-300 font-semibold truncate max-w-[220px]">
                      {selectedBot.webhook?.url || 'Не настроен'}
                    </span>
                  </div>
                </div>

                <GlassButton
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={handlePingWebhook}
                  disabled={isPingingWebhook || !selectedBot.webhook?.url}
                  className="flex items-center justify-center gap-2 font-semibold text-xs py-3"
                >
                  {isPingingWebhook ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      <span>Отправка тестового запроса...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>Проверить вебхук (Ping & Test)</span>
                    </>
                  )}
                </GlassButton>

                {pingResult && (
                  <div
                    className={`p-4 rounded-xl border space-y-2 animate-fade-in ${
                      pingResult.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-sm">
                        {pingResult.ok ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Успешный ответ (HTTP {pingResult.status_code || 200})</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span>Сбой проверки (HTTP {pingResult.status_code || 'Error'})</span>
                          </>
                        )}
                      </span>
                      {pingResult.response_time_ms !== undefined && (
                        <span className="text-xs font-mono font-bold bg-black/30 px-2 py-0.5 rounded">
                          {Math.round(pingResult.response_time_ms)} мс
                        </span>
                      )}
                    </div>
                    {pingResult.error && (
                      <p className="text-xs font-mono bg-black/20 p-2 rounded text-rose-300">
                        {pingResult.error}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Вкладка 4: Управление токеном */}
            {detailsTab === 'token' && (
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                <div className="p-3 bg-white/2 border border-white/5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Префикс активного токена:</span>
                    <span className="font-mono text-purple-300 font-bold bg-black/30 px-2 py-0.5 rounded">
                      {selectedBot.token_prefix ? `${selectedBot.token_prefix}...` : `bot${selectedBot.id}:••••`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Полный токен не хранится на сервере в открытом виде (используется SHA-256 хэширование).
                  </p>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-300">
                    <RefreshCw className="w-4 h-4" />
                    <span>Ротация API-токена</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-200/90">
                    Если токен был скомпрометирован, нажмите кнопку ниже для мгновенного отзыва старого токена и выпуска нового.
                  </p>
                </div>

                <GlassButton
                  variant="danger"
                  size="md"
                  fullWidth
                  onClick={handleRotateToken}
                  disabled={isRotatingToken}
                  className="flex items-center justify-center gap-2 font-semibold text-xs py-3"
                >
                  {isRotatingToken ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>Перевыпустить токен (Ротация)</span>
                </GlassButton>
              </div>
            )}
          </div>
        )}
      </div>
    </GlassModal>
  );
};
