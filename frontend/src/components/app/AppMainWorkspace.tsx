import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Settings, Search, Send, Info, Plus, Bell, BellOff, Lock, Clock, CalendarClock, Timer, ChevronLeft, Shield, ShieldCheck, RefreshCw, Download, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Mic, Video, Smile, Trash2, Paperclip, X, Edit2, Reply, Users, FileText, Radio, Sparkles, Crown, MoreVertical, Coins, Wallet } from 'lucide-react';
import { GlassButton, GlassInput } from '../../ui';
import { VirtualMessageList } from '../../components/chat/VirtualMessageList';
import { TopicList } from '../../components/chat/TopicList';
import { GroupCallBar } from '../../components/call/GroupCallBar';
import { ChatSearchBar } from '../../components/chat/ChatSearchBar';
import { syncManager } from '../../core/sync-manager';
import { storageManager } from '../../core/storage/storage-manager';
import { deleteSession } from '../../core/crypto/double-ratchet';
import { getPeerIdentityKey } from '../../core/crypto/e2ee';
import { TgsSticker } from '../../components/stickers/TgsSticker';
import { getBackendUrl } from '../../utils/url';
import { generateCallId } from '../../core/voip/voipClient';
import 'katex/dist/katex.min.css';
import { RichText, isSafeUrl } from '../../components/chat/RichText';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { Avatar } from '../../components/ui/Avatar';
import { formatDateDivider, isSameDay } from '../../utils/dateUtils';
import { TransportBadge } from '../../components/network/TransportBadge';
import { MediaAttachmentDrawer } from '../../components/chat/MediaAttachmentDrawer';
import { LocationMessage } from '../../components/chat/LocationMessage';
import { ContactMessage } from '../../components/chat/ContactMessage';
import { DocumentMessage } from '../../components/chat/DocumentMessage';
import { liveGeoManager } from '../../core/geo/live-geo-manager';
import { PollMessage, PollData } from '../../components/chat/PollMessage';
import { MediaGalleryItem } from '../../components/chat/MediaGalleryViewerModal';
import { PinnedMessageBanner } from '../../components/chat/PinnedMessageBanner';
import { InlineKeyboardMarkupView } from '../../components/chat/InlineKeyboardMarkupView';
import { TonWalletHubModal, TonInvoiceCard, TonTransferReceiptCard } from '../../features/ton';
import { SovereignEconomicHub } from '../../features/sel';
import { DecryptedAudioWaveform, DecryptedImage, DecryptedVideo, DecryptedVideoNote, SwipeableMessageRow, EmojiPickerPanel, TTL_PRESETS, formatTtlLabel, renderMessageStatus, getSenderColorClass, type Chat } from './appHelpers';
import { AppSettingsTab } from './AppSettingsTab';
import { AppInPaneModals } from './AppInPaneModals';

export interface AppSubComponentProps { ctx: Record<string, any>; }

export function AppMainWorkspace({ ctx }: AppSubComponentProps) {
  const {
    TYPING_DEBOUNCE_MS,
    activeChat,
    activeGroupCallSession,
    activeTab,
    activeTopic,
    activeTopicId,
    androidUpdateData,
    apkDownloadProgress,
    apkDownloading,
    apkDownloadingRef,
    apkReadyToInstall,
    apkReadyToInstallRef,
    audioLockMode,
    audioPlayState,
    audioRecordDuration,
    chatItemVariants,
    chatListVariants,
    chatMenuRef,
    chatSearch,
    chatTtlMenuOpen,
    chatVerified,
    chatsRef,
    currentUserId,
    editingMessage,
    filteredChats,
    folders,
    formatUserDisplayName,
    getNetworkStatusUI,
    globalSearchResults,
    globalSearchUser,
    handleActionUnpin,
    handleApplyReaction,
    handleCallbackQuery,
    handleDiscardRecordedAudio,
    handleEmojiClick,
    handleHashtagClick,
    handleLoadMoreHistory,
    handleMentionClick,
    handleMessageReactionMenu,
    handleOpenGroupInfo,
    handleProcessFile,
    handleRecordStart,
    handleSendLocation,
    handleSendMediaMessage,
    handleSendMessage,
    handleSendPhotoBatch,
    handleSendRecordedAudio,
    handleSendUploadedFile,
    handleToggleChannelMute,
    handleTogglePlayRecordedAudio,
    handleVotePoll,
    highlightMessageId,
    inputMode,
    isAudioRecording,
    isChatIn152FzContour,
    isChatMenuOpen,
    isChatSearchOpen,
    isEmojiPickerOpen,
    isForceUpdateRequired,
    isGroupCallActive,
    isGroupCallOpen,
    isMediaDrawerOpen,
    isPremium,
    isSearching,
    isStickerPickerOpen,
    lastTypingSentRef,
    mobileView,
    newMessageText,
    pinnedIndexMap,
    pinnedMessageMap,
    recordedAudioUrl,
    renderChatItem,
    replyingToMessage,
    requestVoiceTranscription,
    resolveSenderName,
    scheduleMenuOpen,
    searchQuery,
    searchResults,
    selectedFolderId,
    selectedMessageIds,
    sendTtlSeconds,
    setActiveCallChatId,
    setActiveCallId,
    setActiveCallName,
    setActiveTab,
    setActiveTopicId,
    setAvatarViewerState,
    setChatTtlMenuOpen,
    setChats,
    setDrafts,
    setEditingMessage,
    setEditingTopic,
    setHighlightMessageId,
    setIsCallOpen,
    setIsChannelInfoOpen,
    setIsChatMenuOpen,
    setIsChatPrivacyModalOpen,
    setIsChatSearchOpen,
    setIsDeleteChatModalOpen,
    setIsEmojiPickerOpen,
    setIsForceUpdateRequired,
    setIsForwardModalOpen,
    setIsGroupAvatarActionSheetOpen,
    setIsGroupCallActive,
    setIsGroupCallOpen,
    setIsInChatTransferOpen,
    setIsInfoModalOpen,
    setIsMediaDrawerOpen,
    setIsNetworkModalOpen,
    setIsNewChatModalOpen,
    setIsOutgoingCall,
    setIsPollModalOpen,
    setIsPremiumModalOpen,
    setIsSafetyModalOpen,
    setIsScheduledModalOpen,
    setIsSharedMediaDrawerOpen,
    setIsStickerPickerOpen,
    setIsTopicConstructorOpen,
    setMediaGalleryState,
    setMobileView,
    setNewMessageText,
    setPinnedIndexMap,
    setReplyingToMessage,
    setSafetyPeerIdentityKey,
    setScheduleMenuOpen,
    setSearchQuery,
    setSelectedChatId,
    setSelectedFolderId,
    setSelectedMessageIds,
    setSendTtlSeconds,
    setUploadingFile,
    showPulseTab,
    showToast,
    showTranscriptions,
    showWalletTab,
    sortedActiveChatMessages,
    startBackgroundApkDownload,
    stopAudioRecording,
    t,
    textareaRef,
    theme,
    topics,
    typingTextRef,
    typingUsersForHeader,
    uploadingFile,
    virtualMessageListRef,
    voiceTranscribing,
    voiceTranscriptions
  } = ctx;
  return (
          <motion.div
            key="app-pane"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-full flex-grow flex h-full overflow-hidden"
          >
            {/* 1. ЛЕВАЯ ПАНЕЛЬ: БОКОВОЕ МЕНЮ (УЗКАЯ) - СКРЫВАЕТСЯ НА МОБИЛЬНЫХ */}
      <div className="hidden md:flex w-20 border-r border-white/5 bg-white/1 backdrop-blur-xl flex-col items-center justify-between py-6 z-10 pt-safe pb-safe">
        <div className="flex flex-col items-center gap-8 w-full">
          {/* Логотип */}
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-glass-sm">
            <MessageSquare className="w-5 h-5" />
          </div>

          {/* Кнопки переключения вкладок */}
          <div className="flex flex-col gap-3 w-full items-center">
            {/* 1. Чаты */}
            <button
              onClick={() => setActiveTab('chats')}
              data-testid="tab-chats"
              title={t('chat:list.title', 'Чаты')}
              className={`p-3 rounded-xl transition-all duration-300 relative ${
                activeTab === 'chats'
                  ? 'text-purple-400 bg-white/5 shadow-glass-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/2'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              {activeTab === 'chats' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute left-0 top-1/4 w-1 h-1/2 bg-purple-500 rounded-r-md"
                />
              )}
            </button>

            {/* 2. Pulse / Sovereign Economic Layer */}
            {showPulseTab && (
              <button
                onClick={() => setActiveTab('pulse')}
                data-testid="tab-pulse"
                title={t('pulse:title', 'Pulse')}
                className={`p-3 rounded-xl transition-all duration-300 relative ${
                  activeTab === 'pulse'
                    ? 'text-emerald-400 bg-emerald-500/10 shadow-glass-sm'
                    : 'text-slate-400 hover:text-emerald-300 hover:bg-white/2'
                }`}
              >
                <Coins className="w-5 h-5" />
                {activeTab === 'pulse' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute left-0 top-1/4 w-1 h-1/2 bg-emerald-500 rounded-r-md"
                  />
                )}
              </button>
            )}

            {/* 3. Кошелек */}
            {showWalletTab && (
              <button
                onClick={() => setActiveTab('wallet')}
                data-testid="tab-wallet"
                title={t('wallet:title', 'Кошелек')}
                className={`p-3 rounded-xl transition-all duration-300 relative ${
                  activeTab === 'wallet'
                    ? 'text-sky-400 bg-sky-500/10 shadow-glass-sm'
                    : 'text-slate-400 hover:text-sky-300 hover:bg-white/2'
                }`}
              >
                <Wallet className="w-5 h-5" />
                {activeTab === 'wallet' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute left-0 top-1/4 w-1 h-1/2 bg-sky-500 rounded-r-md"
                  />
                )}
              </button>
            )}

            {/* 4. Настройки */}
            <button
              onClick={() => setActiveTab('settings')}
              data-testid="tab-settings"
              title={t('settings:title', 'Настройки')}
              className={`p-3 rounded-xl transition-all duration-300 relative ${
                activeTab === 'settings'
                  ? 'text-purple-400 bg-white/5 shadow-glass-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/2'
              }`}
            >
              <Settings className="w-5 h-5" />
              {activeTab === 'settings' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute left-0 top-1/4 w-1 h-1/2 bg-purple-500 rounded-r-md"
                />
              )}
            </button>
          </div>
        </div>

        {/* Кнопка Сетевого Щита и Шлюзов */}
        <button
          onClick={() => setIsNetworkModalOpen(true)}
          title={t('settings:system.networkShield', 'Сетевой щит и Шлюзы')}
          className="p-3 rounded-xl text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-300 relative group"
        >
          <Radio className="w-5 h-5" />
          <span
            className={`absolute bottom-2 right-2 w-2 h-2 rounded-full border border-black/80 ${getNetworkStatusUI().colorClass}`}
          />
        </button>

        {/* Кнопка Gossip Premium */}
        <button
          onClick={() => setIsPremiumModalOpen(true)}
          title="Gossip Premium"
          className={`p-3 rounded-xl transition-all duration-300 relative ${
            isPremium
              ? 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20'
              : 'text-slate-400 hover:text-amber-300 hover:bg-white/5'
          }`}
        >
          <Crown className="w-5 h-5" />
          {isPremium && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        {/* Кнопка информации (О приложении) */}
        <button
          onClick={() => setIsInfoModalOpen(true)}
          title={t('common:actions.open', 'О приложении')}
          className="p-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/2 transition-all duration-300"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* ДВУХ-/ТРЕХПАНЕЛЬНЫЙ МАКЕТ КОНТЕНТА */}
      <div className="w-full max-w-full flex-grow flex h-full overflow-hidden z-10 relative">
        {activeTab === 'chats' ? (
          <div
            key="chats-tab"
            className="w-full max-w-full flex-grow flex h-full overflow-hidden animate-fade-in"
          >
              {/* 2. СРЕДНЯЯ ПАНЕЛЬ: СПИСОК ЧАТОВ */}
              <div className={`w-full md:w-80 lg:w-96 border-r border-white/5 bg-white/1 backdrop-blur-xl flex-col h-full ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
                {/* Шапка списка чатов с учетом безопасной зоны сверху на мобильных */}
                <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] border-b border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-xl font-bold tracking-wide bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                        {t('chat:list.title', 'Чаты')}
                      </h1>
                      <TransportBadge onClick={() => setIsNetworkModalOpen(true)} />
                      {androidUpdateData && !isForceUpdateRequired && (
                        <button
                          onClick={() => {
                            setIsForceUpdateRequired(true);
                            if (!apkDownloadingRef.current && !apkReadyToInstallRef.current) {
                              startBackgroundApkDownload(androidUpdateData);
                            }
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-600/25 hover:bg-purple-600/40 border border-purple-400/50 text-[10px] text-purple-200 transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.3)] animate-pulse"
                          title="Нажмите, чтобы открыть окно обновления приложения"
                        >
                          {apkReadyToInstall ? (
                            <>
                              <Download className="w-3 h-3 text-emerald-400" />
                              <span className="font-semibold text-emerald-300">Обновить v{androidUpdateData.version}</span>
                            </>
                          ) : apkDownloading ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-purple-300" />
                              <span className="font-mono">{apkDownloadProgress}%</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-purple-300" />
                              <span>v{androidUpdateData.version}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <GlassButton
                      size="sm"
                      variant="primary"
                      className="p-2 rounded-lg"
                      onClick={() => setIsNewChatModalOpen(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </GlassButton>
                  </div>

                  {/* Поле поиска */}
                  <GlassInput
                    placeholder={t('chat:list.searchPlaceholder', 'Поиск...')}
                    label={t('chat:list.searchPlaceholder', 'Поиск контактов и сообщений')}
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                    icon={<Search className="w-4 h-4" />}
                  />

                  {/* Горизонтальный скролл вкладок папок */}
                  {folders.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none scroll-smooth select-none">
                      <button
                        onClick={() => setSelectedFolderId(null)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                          selectedFolderId === null
                            ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        {t('chat:list.allChatsTab', 'Все')}
                      </button>
                      {folders.map((folder: any) => {
                        const is152 = folder.is_152fz_contour === 1 || folder.is152FzContour;
                        return (
                          <button
                            key={folder.id}
                            onClick={() => setSelectedFolderId(folder.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border flex items-center gap-1.5 ${
                              selectedFolderId === folder.id
                                ? is152
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-glass-sm'
                                  : 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                                : is152
                                ? 'bg-amber-500/5 border-amber-500/20 text-amber-300/80 hover:bg-amber-500/10'
                                : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                            }`}
                          >
                            <span>{folder.icon || '📁'}</span>
                            <span>{folder.name}</span>
                            {is152 && (
                              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded border border-amber-500/30 flex items-center gap-0.5">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                {t('chat:list.dlpSafeBadge', 'Сейф')}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Список диалогов с анимацией */}
                <motion.div
                  data-testid="chats-list"
                  variants={chatListVariants}
                  initial="initial"
                  animate="animate"
                  className="flex-grow overflow-y-auto p-2 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-2 space-y-1 overscroll-contain"
                >
                  {searchQuery.trim() ? (
                    <div className="space-y-4">
                      {/* Секция: Ваши чаты и группы */}
                      {filteredChats.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider px-2">{t('chat:list.title', 'Ваши чаты и группы')}</span>
                          {filteredChats.map((chat: any) => renderChatItem(chat))}
                        </div>
                      )}

                      {/* Секция глобального поиска пользователей */}
                      {globalSearchResults.length > 0 && (
                        <div className="p-2 border-b border-white/5 pb-3 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider px-2">{t('chat:list.globalSearchTitle', 'Глобальный поиск')}</span>
                          {globalSearchResults.map((user: any) => {
                            const existingChat = chatsRef.current.find((c: any) => c.id === user.userId);
                            const isSelf = user.userId === currentUserId;
                            const displayName = user.displayName || user.display_name || user.username;

                            return (
                              <motion.div
                                key={user.userId}
                                variants={chatItemVariants}
                                onClick={async () => {
                                  if (isSelf) {
                                    showToast(t('chat:list.selfAccount', "Вы не можете создать чат с самим собой"), "error");
                                    return;
                                  }

                                  if (existingChat) {
                                    setSelectedChatId(existingChat.id);
                                    setSearchQuery('');
                                    setMobileView('chat');
                                    return;
                                  }

                                  // Начинаем чат с глобально найденным пользователем
                                  const newChat: Chat = {
                                    id: user.userId,
                                    name: displayName,
                                    avatar: user.avatar || '👤',
                                    lastMessage: t('chat:serviceMessages.chatCreated', 'Чат создан'),
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    unread: 0,
                                    isGroup: false,
                                    online: true,
                                    messages: [],
                                    short_id: user.short_id,
                                    collision: user.collision
                                  };

                                  // Сохраняем в SQLite БД
                                  try {
                                    await storageManager.execute(
                                      `INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)
                                       ON CONFLICT(id) DO UPDATE SET name = excluded.name;`,
                                      [newChat.id, newChat.name, newChat.avatar, newChat.lastMessage, newChat.time, newChat.unread, 0]
                                    );
                                  } catch (err) {
                                    console.error("[App] Ошибка сохранения чата при глобальном поиске:", err);
                                  }

                                  // Регистрируем чат на сервере
                                  try {
                                    const token = localStorage.getItem("session_token") || "";
                                    await fetch(getBackendUrl("/api/v1/chats"), {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${token}`
                                      },
                                      body: JSON.stringify({ chat_id: user.userId })
                                    });
                                  } catch (serverErr) {
                                    console.error("[App] Ошибка регистрации чата на сервере:", serverErr);
                                  }

                                  setChats((prev: any) => {
                                    if (prev.some((c: any) => c.id === newChat.id)) return prev;
                                    return [newChat, ...prev];
                                  });
                                  setSelectedChatId(newChat.id);
                                  setSearchQuery('');
                                  setMobileView('chat');
                                  showToast(`${displayName}`, "success");
                                }}
                                className="mt-1.5 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-purple-600/10 border border-purple-500/20 bg-purple-950/5 flex items-center gap-3"
                              >
                                <Avatar
                                  name={displayName}
                                  size="md"
                                  className="flex-shrink-0"
                                />
                                <div className="flex-grow min-w-0">
                                  <h4 className="font-semibold text-xs text-slate-200 truncate">
                                    {displayName}
                                  </h4>
                                  <p className="text-[10px] text-purple-300">
                                    {existingChat ? t('chat:list.startChatPrompt', 'Диалог уже открыт (нажмите для перехода)') : (isSelf ? t('chat:list.selfAccount', 'Это ваш аккаунт') : t('chat:list.startChatPrompt', 'Нажмите, чтобы начать общение'))}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}

                      {/* Результаты поиска сообщений */}
                      {searchResults.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-2">{t('chat:list.messagesSection', 'Сообщения')}</span>
                          {searchResults.map((msg: any) => (
                            <motion.div
                              key={msg.id}
                              variants={chatItemVariants}
                              onClick={() => {
                                setSelectedChatId(msg.chatId);
                                setMobileView('chat');
                              }}
                              className="p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/3 border border-transparent flex items-center gap-3"
                            >
                              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shadow-glass-sm flex-shrink-0">
                                {msg.chatAvatar || '💬'}
                              </div>
                              <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                  <h4 className="font-semibold text-xs text-purple-400 truncate">
                                    {msg.chatName}
                                  </h4>
                                  <span className="text-[10px] text-slate-500">{msg.time}</span>
                                </div>
                                <p className="text-xs text-slate-300 font-medium truncate">
                                  {msg.senderName}:
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                  {msg.text}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {filteredChats.length === 0 && globalSearchResults.length === 0 && !globalSearchUser && searchResults.length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          {isSearching ? t('common:status.loading', 'Поиск...') : t('chat:list.noSearchResults', 'Ничего не найдено')}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Отображение списка чатов
                    filteredChats.length > 0 ? (
                      filteredChats.map((chat: any) => renderChatItem(chat))
                    ) : (
                      <div className={`mx-2 my-4 p-5 rounded-2xl border text-center flex flex-col items-center gap-3 ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-200 text-slate-700'
                          : (theme === 'coffee'
                              ? 'bg-[#1e150f]/60 border-[#D5CEA3]/15 text-[#E5E5CB]'
                              : 'bg-white/[0.02] border-white/10 text-slate-300')
                      }`}>
                        <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold">
                            {t('chat:list.emptyChatsTitle', 'У вас пока нет активных чатов')}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {t('chat:list.emptyChatsHint', 'Начните защищённый диалог, найдите людей поблизости или откройте P2P-площадку Пульс.')}
                          </div>
                        </div>
                        <div className="w-full flex flex-col gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsNewChatModalOpen(true)}
                            className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>{t('chat:newChat.button', 'Новый чат или группа')}</span>
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setIsNetworkModalOpen(true)}
                              className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                            >
                              <Radio className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{t('settings:network.radarShort', 'Радар рядом')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('pulse')}
                              className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                            >
                              <Coins className="w-3.5 h-3.5 text-amber-400" />
                              <span>{t('pulse:title', 'Пульс P2P')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </motion.div>
              </div>

              {/* 3. ПРАВАЯ ПАНЕЛЬ: ОКНО ЧАТА */}
              <div className={`w-full max-w-full flex-grow flex-col h-full bg-white/[0.005] ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
                {activeChat ? (
                  <>
                    {/* Шапка чата с динамической высотой под Safe Area и симметричными отступами */}
                    <div className="w-full flex-shrink-0 px-3.5 sm:px-5 md:px-6 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3.5 border-b border-white/10 flex items-center justify-between gap-2 sm:gap-3 bg-white/2 backdrop-blur-2xl z-20">
                      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
                        {/* Кнопка "Назад" для мобильных устройств или выхода из топика в форум */}
                        {activeChat.is_forum && activeTopicId !== null ? (
                          <button
                            onClick={() => setActiveTopicId(null)}
                            aria-label="Назад к топикам"
                            title="Назад к топикам"
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-slate-200 transition-all flex-shrink-0 active:scale-95 cursor-pointer shadow-glass-sm"
                          >
                            <ChevronLeft className="w-5 h-5 text-slate-200 rtl:rotate-180" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setMobileView('list')}
                            aria-label="Назад к чатам"
                            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-slate-200 transition-all flex-shrink-0 active:scale-95 cursor-pointer shadow-glass-sm"
                          >
                            <ChevronLeft className="w-5 h-5 text-slate-200 rtl:rotate-180" />
                          </button>
                        )}

                        {/* Аватар и имя собеседника / группы / канала */}
                        <div 
                          className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 cursor-pointer hover:opacity-85 transition-opacity"
                          onClick={() => {
                            if (activeChat.type === 'channel') {
                              setIsChannelInfoOpen(true);
                            } else if (activeChat.isGroup) {
                              handleOpenGroupInfo();
                            } else {
                              setIsSharedMediaDrawerOpen(true);
                            }
                          }}
                        >
                          <div
                            onClick={(e: any) => {
                              e.stopPropagation();
                              setAvatarViewerState({
                                isOpen: true,
                                avatarUrl: activeChat.avatar,
                                name: activeChat.isGroup ? activeChat.name : formatUserDisplayName(activeChat.id, activeChat.name, null),
                                subtitle: activeChat.type === 'channel'
                                  ? t('chat:header.publicChannel', 'Публичный канал')
                                  : activeChat.isGroup 
                                    ? t('chat:header.groupChat', 'Групповой чат') 
                                    : (activeChat.online ? t('chat:header.online', 'в сети') : t('chat:header.offline', 'был(а) недавно')),
                                isGroup: activeChat.isGroup,
                                isEditable: activeChat.isGroup,
                                onEdit: activeChat.isGroup ? () => setIsGroupAvatarActionSheetOpen(true) : undefined,
                              });
                            }}
                            className="flex-shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                            title="Открыть фото на весь экран"
                          >
                            <Avatar
                              avatarUrl={activeChat.avatar}
                              name={activeChat.isGroup ? activeChat.name : formatUserDisplayName(activeChat.id, activeChat.name, null)}
                              isGroup={activeChat.isGroup}
                              online={activeChat.online}
                              size="md"
                            />
                          </div>
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              {activeChat.is_forum && activeTopicId !== null ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => setActiveTopicId(null)}
                                    className="text-sm sm:text-base font-semibold text-slate-400 hover:text-purple-300 transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                                    title="К списку топиков"
                                  >
                                    {activeChat.name}
                                  </button>
                                  <span className="text-slate-500 text-xs">/</span>
                                  <span className="text-sm sm:text-base font-semibold text-slate-100 flex items-center gap-1 truncate">
                                    <span>{activeTopic?.icon_emoji || '💬'}</span>
                                    <span className="truncate">{activeTopic?.title || `Топик #${activeTopicId}`}</span>
                                    {activeTopic?.is_closed && (
                                      <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <h2 className="text-sm sm:text-base font-semibold text-slate-100 truncate leading-tight tracking-tight hover:text-purple-300 transition-colors">
                                  {activeChat.isGroup ? activeChat.name : formatUserDisplayName(activeChat.id, activeChat.name, null)}
                                </h2>
                              )}
                              {activeChat.type === 'channel' && (
                                <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                                  <Radio className="w-3 h-3 text-purple-400" />
                                  {t('chat:header.publicChannel', 'Публичный канал')}
                                </span>
                              )}
                              {isChatIn152FzContour(activeChat.id) && (
                                <button
                                  type="button"
                                  onClick={(e: any) => {
                                    e.stopPropagation();
                                    setIsChatPrivacyModalOpen(true);
                                  }}
                                  className="text-[9px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0 shadow-glass-sm cursor-pointer transition-all active:scale-95"
                                  title={t('chat:header.menuDlp', 'Управление режимом «Сейф-Контур»')}
                                >
                                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                                  {t('chat:list.dlpSafeBadge', 'Сейф-Контур')}
                                </button>
                              )}
                              {isPremium && (
                                <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300 flex-shrink-0" />
                              )}
                            </div>
                            <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5 leading-normal mt-0.5 truncate">
                              {activeChat.type === 'channel' ? (
                                <span className="text-slate-400">
                                  {t('chat:header.groupMembers_other', '{{count}} подписчиков', { count: activeChat.subscribers_count || activeChat.members_count || 1 })}
                                </span>
                              ) : activeChat.online ? (
                                <>
                                  <span className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0 animate-pulse" />
                                  <span className="text-emerald-400 font-medium">{t('chat:header.online', 'в сети')}</span>
                                </>
                              ) : (
                                <span className="text-slate-400">{t('chat:header.offline', 'был(а) недавно')}</span>
                              )}
                            </div>
                            <TypingIndicator typingUsers={typingUsersForHeader} />
                          </div>
                        </div>
                      </div>

                      {/* Кнопки действий: Звонок, TON Перевод, Инфо канала и Меню "Три точки" */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 relative" ref={chatMenuRef}>
                        {String(activeChat?.id || '').startsWith('burner_') && (
                          <button
                            type="button"
                            onClick={() => ctx.handleBurnActiveRoom?.(activeChat.id)}
                            data-testid="burn-room-header-btn"
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg"
                            title="Мгновенно сжечь одноразовую комнату и удалить историю"
                          >
                            <span>🔥 Сжечь</span>
                          </button>
                        )}
                        {/* Кнопка "Информация о канале" */}
                        {activeChat.type === 'channel' && (
                          <button
                            type="button"
                            onClick={() => setIsChannelInfoOpen(true)}
                            aria-label="Информация о канале"
                            title="Информация о канале"
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer flex-shrink-0"
                          >
                            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}
                        {/* Групповой звонок (группа/форум) — 1:1 обрабатывается кнопкой ниже */}
                        {(activeChat.isGroup || activeChat.is_forum) && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsGroupCallOpen(true);
                              setIsGroupCallActive(true);
                            }}
                            aria-label="Групповой звонок"
                            title="Групповой звонок"
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer flex-shrink-0"
                          >
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                          </button>
                        )}

                        {/* VoIP WebRTC аудиовызов (скрыт в каналах) */}
                        {activeChat.type !== 'channel' && (
                          <button
                            type="button"
                            onClick={() => {
                              const newCallId = generateCallId();
                              setActiveCallId(newCallId);
                              setActiveCallName(activeChat.name);
                              setActiveCallChatId(activeChat.id);
                              setIsOutgoingCall(true);
                              setIsCallOpen(true);
                            }}
                            aria-label="Аудиовызов"
                            title="Аудиовызов"
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer flex-shrink-0"
                          >
                            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}

                        {/* Быстрый перевод криптовалюты TON в чате (на компактных экранах доступен через 📎 и меню ⋮) */}
                        {activeChat.type !== 'channel' && (
                          <button
                            type="button"
                            onClick={() => setIsInChatTransferOpen(true)}
                            aria-label="Криптоперевод TON"
                            title="Перевод криптовалюты TON / USDT"
                            className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-all active:scale-95 cursor-pointer flex-shrink-0 border border-blue-500/20"
                          >
                            <Coins className="w-5 h-5 text-amber-400" />
                          </button>
                        )}

                        {/* Кнопка "Три точки" (Меню чата) */}
                        <button
                          type="button"
                          onClick={() => setIsChatMenuOpen((prev: any) => !prev)}
                          aria-label="Опции чата"
                          title="Опции чата"
                          className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all active:scale-95 cursor-pointer flex-shrink-0 ${
                            isChatMenuOpen
                              ? 'bg-white/15 text-white'
                              : 'bg-white/5 hover:bg-white/10 active:bg-white/15 text-slate-300 hover:text-white'
                          }`}
                        >
                          <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* Плавающее выпадающее меню Telegram-style */}
                        <AnimatePresence>
                          {isChatMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.92, y: -8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.92, y: -8 }}
                              transition={{ duration: 0.15 }}
                              className={`absolute right-0 top-full mt-2 w-60 rounded-2xl border shadow-2xl z-50 py-1.5 backdrop-blur-2xl ${
                                theme === 'light'
                                  ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/50'
                                  : (theme === 'coffee'
                                      ? 'bg-[#1e150f]/95 border-[#D5CEA3]/20 text-[#E5E5CB] shadow-black/80'
                                      : 'bg-neutral-900/95 border-white/10 text-slate-200 shadow-black/90')
                              }`}
                            >
                              {/* Группа 1: Поиск, Перевод и Информация */}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsChatMenuOpen(false);
                                  setIsChatSearchOpen(true);
                                }}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-medium hover:bg-white/5 transition-colors text-left"
                              >
                                <Search className="w-4 h-4 text-purple-400" />
                                <span>{t('chat:header.menuSearch', 'Поиск в чате')}</span>
                              </button>

                              {activeChat.type !== 'channel' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsChatMenuOpen(false);
                                    setIsInChatTransferOpen(true);
                                  }}
                                  className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-medium hover:bg-white/5 transition-colors text-left"
                                >
                                  <Coins className="w-4 h-4 text-amber-400" />
                                  <span>{t('chat:header.menuTransfer', 'Перевести TON / USDT')}</span>
                                </button>
                              )}

                              {activeChat.isGroup && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsChatMenuOpen(false);
                                    handleOpenGroupInfo();
                                  }}
                                  className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-medium hover:bg-white/5 transition-colors text-left"
                                >
                                  <Users className="w-4 h-4 text-sky-400" />
                                  <span>{t('chat:header.menuGroupInfo', 'Участники и настройки группы')}</span>
                                </button>
                              )}

                              <div className={`my-1 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`} />

                              {/* Группа 2: Приватность, E2EE и Таймеры */}
                              {!activeChat.isGroup && activeChat.type !== 'channel' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsChatMenuOpen(false);
                                    if (activeChat?.id) {
                                      getPeerIdentityKey(activeChat.id).then((key: any) => {
                                        setSafetyPeerIdentityKey(key);
                                      }).catch(() => {});
                                    }
                                    setIsSafetyModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-medium hover:bg-white/5 transition-colors text-left"
                                >
                                  <ShieldCheck className={`w-4 h-4 ${chatVerified ? 'text-emerald-400' : 'text-slate-400'}`} />
                                  <span>{t('chat:header.verifyEncryption', 'Код безопасности E2EE')}{chatVerified ? ' ✓' : ''}</span>
                                </button>
                              )}

                              {/* Таймер самоуничтожения (TTL) */}
                              <button
                                type="button"
                                onClick={() => setChatTtlMenuOpen((prev: any) => !prev)}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-medium hover:bg-white/5 transition-colors text-left"
                              >
                                <Timer className="w-4 h-4 text-amber-400" />
                                <span>{t('chat:header.ttlTimer', 'Автоудаление сообщений')}{sendTtlSeconds > 0 ? `: ${formatTtlLabel(sendTtlSeconds)}` : ''}</span>
                              </button>
                              {chatTtlMenuOpen && (
                                <div className="py-1 border-t border-white/5">
                                  {TTL_PRESETS.map((preset: any) => (
                                    <button
                                      key={preset.seconds}
                                      type="button"
                                      onClick={() => {
                                        setSendTtlSeconds(preset.seconds);
                                        setChatTtlMenuOpen(false);
                                        setIsChatMenuOpen(false);
                                        if (activeChat) {
                                          storageManager.setChatDefaultTTL(activeChat.id, preset.seconds).catch(() => undefined);
                                        }
                                      }}
                                      className={`w-full px-4 py-2 flex items-center gap-3 text-[11px] hover:bg-white/5 transition-colors text-left ${
                                        sendTtlSeconds === preset.seconds ? 'text-amber-300 font-semibold' : 'text-slate-400'
                                      }`}
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Сейф-Контур */}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsChatMenuOpen(false);
                                  setIsChatPrivacyModalOpen(true);
                                }}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium hover:bg-white/5 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <Shield className={`w-4 h-4 ${isChatIn152FzContour(activeChat.id) ? 'text-amber-400' : 'text-slate-400'}`} />
                                  <span>{t('chat:header.menuDlp', 'Запрет копирования (Сейф)')}</span>
                                </div>
                                {isChatIn152FzContour(activeChat.id) && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">ON</span>
                                )}
                              </button>

                              {/* Отложенные сообщения */}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsChatMenuOpen(false);
                                  setIsScheduledModalOpen(true);
                                }}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-medium hover:bg-white/5 transition-colors text-left"
                              >
                                <CalendarClock className="w-4 h-4 text-purple-400" />
                                <span>{t('chat:header.scheduledMessages', 'Отложенные сообщения')}</span>
                              </button>

                              {newMessageText.trim() && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setScheduleMenuOpen((prev: any) => !prev)}
                                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-medium hover:bg-white/5 transition-colors text-left"
                                  >
                                    <Clock className="w-4 h-4 text-purple-400" />
                                    <span>{t('chat:header.scheduleCurrent', 'Отправить позже…')}</span>
                                  </button>
                                  {scheduleMenuOpen && (
                                    <div className="py-1 border-t border-white/5">
                                      {[
                                        { label: 'Через 15 минут', ms: 15 * 60000 },
                                        { label: 'Через 1 час', ms: 3600000 },
                                        { label: 'Через 3 часа', ms: 3 * 3600000 },
                                        { label: 'Завтра в 9:00', ms: -1 },
                                      ].map((preset: any) => (
                                        <button
                                          key={preset.label}
                                          type="button"
                                          onClick={async () => {
                                            setScheduleMenuOpen(false);
                                            setIsChatMenuOpen(false);
                                            if (!activeChat || !newMessageText.trim()) return;
                                            let deliverAt = Date.now() + preset.ms;
                                            if (preset.ms === -1) {
                                              const d = new Date();
                                              d.setDate(d.getDate() + 1);
                                              d.setHours(9, 0, 0, 0);
                                              deliverAt = d.getTime();
                                            }
                                            try {
                                              await syncManager.scheduleMessage(
                                                activeChat.id,
                                                newMessageText,
                                                deliverAt,
                                                {
                                                  isGroup: Boolean(activeChat.isGroup),
                                                  isChannel: activeChat.type === 'channel',
                                                  topicId: activeTopicId,
                                                  ttlSeconds: sendTtlSeconds > 0 ? sendTtlSeconds : undefined,
                                                }
                                              );
                                              setNewMessageText('');
                                              if (activeChat) {
                                                setDrafts((prev: any) => {
                                                  const next = { ...prev };
                                                  delete next[activeChat.id];
                                                  return next;
                                                });
                                              }
                                            } catch (e) {
                                              console.error('[R3] Ошибка планирования сообщения:', e);
                                            }
                                          }}
                                          className="w-full px-4 py-2 flex items-center gap-3 text-[11px] text-slate-400 hover:bg-white/5 transition-colors text-left"
                                        >
                                          {preset.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}

                              <div className={`my-1 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`} />

                              {/* Удалить чат */}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsChatMenuOpen(false);
                                  setIsDeleteChatModalOpen(true);
                                }}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                                <span>{t('chat:header.menuDeleteChat', 'Удалить чат')}</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Индикатор активного группового звонка */}
                    {(activeChat.isGroup || activeChat.is_forum) && (
                      <GroupCallBar
                        chatId={activeChat.id}
                        isActive={isGroupCallActive}
                        participantCount={activeGroupCallSession?.participants?.length || 1}
                        isInCall={isGroupCallOpen}
                        onJoinCall={() => setIsGroupCallOpen(true)}
                        onReturnToCall={() => setIsGroupCallOpen(true)}
                      />
                    )}

                    {/* R4 (M4.5): панель режима выбора для массовой пересылки */}
                    {selectedMessageIds.size > 0 && (
                      <div className="mx-4 my-2 px-4 py-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-purple-200">
                          Выбрано: {selectedMessageIds.size} / 100
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsForwardModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold transition-colors"
                          >
                            Переслать
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedMessageIds(new Set())}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] transition-colors"
                          >
                            Отменить
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Закрепленные сообщения под шапкой чата */}
                    {(() => {
                      const chatPinnedIds = pinnedMessageMap[activeChat.id] || [];
                      if (chatPinnedIds.length === 0) return null;
                      const currentIndex = pinnedIndexMap[activeChat.id] || 0;
                      const currentPinnedId = chatPinnedIds[currentIndex % chatPinnedIds.length];
                      const pinnedMsg = activeChat.messages.find((m: any) => m.id === currentPinnedId);
                      if (!pinnedMsg) return null;

                      return (
                        <PinnedMessageBanner                          pinnedMessage={{
                            id: pinnedMsg.id,
                                  senderName: pinnedMsg.sender === 'me' ? 'Вы' : formatUserDisplayName(pinnedMsg.sender, pinnedMsg.senderName, activeChat.name),
                            text: pinnedMsg.text,
                            type: pinnedMsg.type,
                          }}
                          totalPinnedCount={chatPinnedIds.length}
                          currentIndex={currentIndex % chatPinnedIds.length}
                          onJumpToMessage={(id: any) => {
                            setHighlightMessageId(id);
                            virtualMessageListRef.current?.scrollToMessage(id);
                          }}
                          onUnpinMessage={(id: any) => handleActionUnpin(id)}
                          onNextPinned={() => {
                            setPinnedIndexMap((prev: any) => ({
                              ...prev,
                              [activeChat.id]: (currentIndex + 1) % chatPinnedIds.length
                            }));
                          }}
                          isPremium={isPremium}
                          theme={theme}
                        />
                      );
                    })()}

                    {/* Область сообщений или список топиков форума */}
                    {activeChat.is_forum && activeTopicId === null ? (
                      <TopicList
                        chat={activeChat}
                        topics={topics}
                        selectedTopicId={activeTopicId}
                        onSelectTopic={(topicId: any) => setActiveTopicId(topicId)}
                        onCreateTopicClick={() => {
                          setEditingTopic(null);
                          setIsTopicConstructorOpen(true);
                        }}
                        onEditTopicClick={(topic: any) => {
                          setEditingTopic(topic);
                          setIsTopicConstructorOpen(true);
                        }}
                        onBackToChatList={() => setMobileView('list')}
                      />
                    ) : (
                      <>
                        {/* M1.3: панель поиска внутри чата (над списком сообщений) */}
                        <ChatSearchBar
                      isOpen={isChatSearchOpen}
                      query={chatSearch.query}
                      onQueryChange={chatSearch.setQuery}
                      results={chatSearch.results}
                      currentIndex={chatSearch.currentIndex}
                      totalCount={chatSearch.totalCount}
                      isSearching={chatSearch.isSearching}
                      isNavigating={chatSearch.isNavigating}
                      onPrev={() => chatSearch.goPrev()}
                      onNext={() => chatSearch.goNext()}
                      onClose={() => {
                        setIsChatSearchOpen(false);
                        setHighlightMessageId(null);
                        chatSearch.reset();
                      }}
                    />
                    <VirtualMessageList
                      ref={virtualMessageListRef}
                      messages={sortedActiveChatMessages}
                      chatId={activeChat.id}
                      onLoadMoreHistory={handleLoadMoreHistory}
                      highlightMessageId={highlightMessageId}
                      renderMessage={(msg: any, idx: any, isHighlighted: any) => {
                        if (!msg || msg.text === "[service_session_reset]") return null;
                        const prevMsg = idx > 0 ? sortedActiveChatMessages[idx - 1] : undefined;
                        const isFirstMsgOfDay = idx === 0 || !isSameDay(msg.timestamp, prevMsg?.timestamp);

                        const isServiceMsg = msg.isService ||
                                             (msg.text && (msg.text.startsWith("System message:") || msg.text.startsWith("Системное сообщение:")));

                        if (isServiceMsg) {
                          const displayMsg = msg.text;
                          return (
                            <div className="flex flex-col items-center w-full">
                              {isFirstMsgOfDay && (
                                <div className="flex justify-center my-3 w-full">
                                  <div className="bg-slate-900/60 dark:bg-black/50 backdrop-blur-md text-slate-300 dark:text-slate-200 text-xs font-semibold px-3.5 py-1 rounded-full border border-white/10 shadow-sm select-none">
                                    {formatDateDivider(msg.timestamp)}
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-center my-2 w-full px-4">
                                <div className="bg-black/30 text-slate-300 text-xs px-3.5 py-1.5 rounded-2xl border border-white/5 backdrop-blur-sm max-w-[85%] text-center shadow-sm">
                                  {displayMsg}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const isMyMsg = msg.sender === 'me';
                        return (
                          <div className="flex flex-col w-full">
                            {/* Центрированный разделитель даты (Telegram-style Date Divider) */}
                            {isFirstMsgOfDay && (
                              <div className="flex justify-center my-3 w-full">
                                <div className="bg-slate-900/60 dark:bg-black/50 backdrop-blur-md text-slate-300 dark:text-slate-200 text-xs font-semibold px-3.5 py-1 rounded-full border border-white/10 shadow-sm select-none">
                                  {formatDateDivider(msg.timestamp)}
                                </div>
                              </div>
                            )}

                            <SwipeableMessageRow
                              msg={msg}
                              idx={idx}
                              isMyMsg={isMyMsg}
                              isHighlighted={isHighlighted}
                              onReply={(m: any) => setReplyingToMessage(m)}
                              onContextMenu={(e: any) => handleMessageReactionMenu(msg.id, e)}
                              onClick={(e: any) => handleMessageReactionMenu(msg.id, e)}
                              onDoubleClick={(e: any) => { console.log('DOUBLE CLICK TRIGGERED'); handleApplyReaction(msg.id, '🔥', e); }}
                            >
                            {/* Имя отправителя для групповых чатов в стиле Telegram с уникальным цветом */}
                            {activeChat.isGroup && msg.sender !== 'me' && (() => {
                              resolveSenderName(msg.sender);
                              const rawSender = String(msg.sender || '');
                              const displayName = formatUserDisplayName(rawSender, msg.senderName, null);
                              const authorColor = getSenderColorClass(displayName);

                              return (
                                <div className="flex items-center gap-1.5 ml-2 mb-1 max-w-full">
                                  <span className={`text-[12.5px] font-semibold tracking-wide truncate ${authorColor}`}>
                                    {displayName}
                                  </span>
                                </div>
                              );
                            })()}
                            
                            {/* Рендеринг медиа-сообщений или текста */}
                            {msg.type === 'sticker' ? (
                              <div className="flex flex-col items-end">
                                <TgsSticker tgsUrl={getBackendUrl(msg.mediaUrl || '/stickers/star.tgs')} width={150} height={150} />
                                <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-500 bg-black/40 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                  <span>{msg.time}</span>
                                  {msg.sender === 'me' && renderMessageStatus(msg.status, true, msg.isE2EESendFailed)}
                                </div>
                              </div>
                            ) : msg.type === 'voice' ? (
                              <div className="flex flex-col max-w-full">
                                <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                                  <div className="flex-grow min-w-0">
                                    <DecryptedAudioWaveform mediaUrl={msg.mediaUrl || ''} mediaKey={msg.mediaKey} mediaIv={msg.mediaIv} peaks={msg.peaks} theme={theme} />
                                  </div>
                                  {msg.type === 'voice' && (
                                    <button
                                      type="button"
                                      disabled={!!voiceTranscribing[msg.id]}
                                      onClick={(e: any) => {
                                        e.stopPropagation();
                                        // On-demand транскрипция (вариант 1): первый клик — расшифровка
                                        // локально + запрос ASR; повторные — toggle показа
                                        requestVoiceTranscription(msg);
                                      }}
                                      className={`p-2 rounded-xl border transition-all active:scale-95 flex-shrink-0 cursor-pointer ${voiceTranscribing[msg.id] ? 'animate-pulse' : ''} ${
                                        showTranscriptions[msg.id]
                                          ? (theme === 'coffee' ? 'bg-[#D5CEA3]/25 border-[#D5CEA3]/40 text-[#D5CEA3]' : 'bg-purple-500/20 border-purple-500/30 text-purple-300')
                                          : (theme === 'light' ? 'bg-black/5 border-black/10 hover:bg-black/10 text-slate-600' : theme === 'coffee' ? 'bg-[#D5CEA3]/10 border-[#D5CEA3]/20 hover:bg-[#D5CEA3]/15 text-[#D5CEA3]' : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300')
                                      }`}
                                      title={voiceTranscribing[msg.id] ? "Распознавание..." : showTranscriptions[msg.id] ? "Скрыть текст" : "Показать текст"}
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                {(voiceTranscriptions[msg.id] || (msg.text && msg.text !== '🎤 Голосовое сообщение')) && showTranscriptions[msg.id] && (
                                  <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`text-xs px-3 py-2 mt-2 rounded-xl border max-w-sm font-sans ${
                                      theme === 'light'
                                        ? 'bg-black/[0.03] border-black/10 text-slate-800'
                                        : theme === 'coffee'
                                          ? 'bg-[#D5CEA3]/10 border-[#D5CEA3]/20 text-[#E5E5CB]'
                                          : 'bg-white/2 border-white/5 text-slate-300'
                                    } backdrop-blur-md`}
                                    data-testid="voice-transcription"
                                  >
                                    🎤 {voiceTranscriptions[msg.id] || msg.text}
                                  </motion.p>
                                )}
                                <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400 mr-2">
                                  <span>{msg.time}</span>
                                  {msg.sender === 'me' && renderMessageStatus(msg.status, false, msg.isE2EESendFailed)}
                                </div>
                              </div>
                            ) : msg.type === 'photo' ? (
                              <div className="flex flex-col">
                                <div 
                                  className="relative rounded-2xl overflow-hidden border border-white/10 shadow-glass-sm max-w-sm cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                  <DecryptedImage 
                                    mediaUrl={msg.mediaUrl || ''} 
                                    mediaKey={msg.mediaKey} 
                                    mediaIv={msg.mediaIv} 
                                    alt="Фотография" 
                                    className="max-h-60 w-full object-cover" 
                                    onClick={(decryptedUrl: any) => {
                                      const galleryItems: MediaGalleryItem[] = activeChat.messages
                                        .filter((m: any) => m.type === 'photo' || m.type === 'video' || m.type === 'video_note')
                                        .map((m: any) => ({
                                          id: m.id,
                                          type: m.type as any,
                                          url: m.id === msg.id ? decryptedUrl : (m.mediaUrl || ''),
                                          senderName: m.sender === 'me' ? 'Вы' : formatUserDisplayName(m.sender, m.senderName, activeChat.name),
                                          time: m.time,
                                          text: m.text,
                                          mediaKey: m.mediaKey,
                                          mediaIv: m.mediaIv,
                                        }));
                                      const initialIdx = Math.max(0, galleryItems.findIndex((item: any) => item.id === msg.id));
                                      setMediaGalleryState({
                                        isOpen: true,
                                        items: galleryItems,
                                        initialIndex: initialIdx,
                                      });
                                    }}
                                  />
                                </div>
                                {msg.text && msg.text !== '📷 Фотография' && (
                                  <p className="text-sm text-slate-200 mt-1.5 px-1 leading-snug break-words">{msg.text}</p>
                                )}
                                <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400 mr-2">
                                  <span>{msg.time}</span>
                                  {msg.sender === 'me' && renderMessageStatus(msg.status, false, msg.isE2EESendFailed)}
                                </div>
                              </div>
                            ) : msg.type === 'video' ? (
                              <div className="flex flex-col">
                                <div 
                                  onClick={(e: any) => e.stopPropagation()} 
                                  className="relative rounded-2xl overflow-hidden border border-white/10 shadow-glass-sm max-w-sm"
                                >
                                  <DecryptedVideo mediaUrl={msg.mediaUrl || ''} mediaKey={msg.mediaKey} mediaIv={msg.mediaIv} className="max-h-60 w-full object-cover" />
                                </div>
                                {msg.text && msg.text !== '🎥 Видео' && (
                                  <p className="text-sm text-slate-200 mt-1.5 px-1 leading-snug break-words">{msg.text}</p>
                                )}
                                <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400 mr-2">
                                  <span>{msg.time}</span>
                                  {msg.sender === 'me' && renderMessageStatus(msg.status, false, msg.isE2EESendFailed)}
                                </div>
                              </div>
                            ) : msg.type === 'video_note' ? (
                              <div className="flex flex-col">
                                <DecryptedVideoNote mediaUrl={msg.mediaUrl || ''} mediaKey={msg.mediaKey} mediaIv={msg.mediaIv} />
                                <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400 mr-2">
                                  <span>{msg.time}</span>
                                  {msg.sender === 'me' && renderMessageStatus(msg.status, false, msg.isE2EESendFailed)}
                                </div>
                              </div>
                            ) : msg.type === 'location' ? (
                              <div className={msg.sender === 'me' ? 'self-end' : ''}>
                                <LocationMessage
                                  latitude={msg.lat || 0}
                                  longitude={msg.lng || 0}
                                  title={msg.text}
                                  liveUntil={msg.liveUntil}
                                  heading={msg.heading ?? null}
                                  isOwn={msg.sender === 'me'}
                                  onStopLive={() => {
                                    liveGeoManager.stop();
                                    if (activeChat) {
                                      fetch(`${window.location?.origin?.startsWith('http') ? window.location.origin : 'https://skuf-net.ru'}/api/v1/chats/${activeChat.id}/live-location`, { method: 'DELETE' }).catch(() => undefined);
                                    }
                                  }}
                                />
                              </div>
                            ) : msg.type === 'contact' && msg.contact ? (
                              <ContactMessage contact={msg.contact} />
                            ) : msg.type === 'document' ? (
                              <div className="flex flex-col">
                                <DocumentMessage
                                  messageId={msg.id}
                                  filename={msg.filename || 'file'}
                                  size={msg.fileSize || 0}
                                  mimeType={msg.mimeType}
                                  mediaUrl={msg.mediaUrl || ''}
                                  mediaKey={msg.mediaKey}
                                  mediaIv={msg.mediaIv}
                                  isE2EE={activeChat?.type !== 'channel'}
                                />
                                <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400 mr-2">
                                  <span>{msg.time}</span>
                                  {msg.sender === 'me' && renderMessageStatus(msg.status, false, msg.isE2EESendFailed)}
                                </div>
                              </div>
                            ) : (msg.type === 'call' || (msg.text && msg.text.startsWith('📞'))) ? (
                              <div className="flex flex-col min-w-[210px] px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-glass-sm">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    (msg.text && (msg.text.includes('Пропущенный') || msg.text.includes('Отклоненный') || msg.text.includes('Отмененный')))
                                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}>
                                    {msg.text && (msg.text.includes('Пропущенный') || msg.text.includes('Отклоненный') || msg.text.includes('Отмененный')) ? (
                                      <PhoneMissed className="w-4 h-4" />
                                    ) : msg.sender === 'me' ? (
                                      <PhoneOutgoing className="w-4 h-4" />
                                    ) : (
                                      <PhoneIncoming className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="flex flex-col flex-grow min-w-0">
                                    <span className={`text-xs font-semibold truncate ${
                                      (msg.text && (msg.text.includes('Пропущенный') || msg.text.includes('Отклоненный') || msg.text.includes('Отмененный')))
                                        ? 'text-rose-300'
                                        : 'text-emerald-300'
                                    }`}>
                                      {msg.text ? msg.text.replace(/^📞\s*/, '') : 'Звонок'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {msg.sender === 'me' ? 'Исходящий' : 'Входящий'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e: any) => {
                                      e.stopPropagation();
                                      const newCallId = generateCallId();
                                      setActiveCallId(newCallId);
                                      setActiveCallName(activeChat.name);
                                      setActiveCallChatId(activeChat.id);
                                      setIsOutgoingCall(true);
                                      setIsCallOpen(true);
                                    }}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 text-emerald-400 border border-emerald-500/20 transition-all flex-shrink-0 cursor-pointer"
                                    title="Перезвонить"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400">
                                  <span>{msg.time}</span>
                                  {msg.sender === 'me' && renderMessageStatus(msg.status, false, msg.isE2EESendFailed)}
                                </div>
                              </div>
                            ) : msg.isE2EEDecryptFailed || (typeof msg.text === 'string' && (msg.text.startsWith('🔒 Сообщение зашифровано новым ключом') || msg.text.startsWith('🔒 Собственное сообщение не удалось расшифровать') || msg.text.startsWith('🔒 Сообщение отклонено'))) ? (
                              <div className="flex flex-col gap-2 p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 backdrop-blur-md max-w-sm">
                                <div className="flex items-start gap-2.5">
                                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
                                    <Shield className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-semibold text-amber-200 block">
                                      {msg.isUnencryptedIncoming || (typeof msg.text === 'string' && msg.text.includes('не зашифровано')) ? 'Открытое сообщение отклонено' : 'Защищенный ключ обновлен'}
                                    </span>
                                    <span className="text-[11px] text-slate-300 leading-snug block mt-0.5">
                                      {msg.isUnencryptedIncoming || (typeof msg.text === 'string' && msg.text.includes('не зашифровано'))
                                        ? 'Входящее открытое (незашифрованное) сообщение отклонено политикой безопасности сквозного шифрования (Fail-Closed).'
                                        : 'Сообщение было зашифровано ключом новой сессии. Нажмите кнопку ниже, чтобы переподключить защищенный канал связи.'}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={async (e: any) => {
                                    e.stopPropagation();
                                    const peerId = activeChat.id;
                                    // Дебаунс 2 минуты: повторные сбросы в обе стороны зацикливали
                                    // пересоздание сессий и рвали доставку (пинг-понг ключей)
                                    const resetKey = `gossip_e2ee_reset_sent_${peerId}`;
                                    const lastResetAt = parseInt(localStorage.getItem(resetKey) || '0', 10);
                                    if (Date.now() - lastResetAt < 120000) {
                                      showToast('Ключ уже обновляется — повторная переустановка возможна через 2 минуты', 'info');
                                      return;
                                    }
                                    showToast('Сброс и обновление E2EE-ключа связи...', 'info');
                                    await deleteSession(peerId).catch(() => {});
                                    await syncManager.sendServiceResetMessage(peerId).catch(() => {});
                                    localStorage.setItem(resetKey, String(Date.now()));
                                    showToast('Запрос на переустановку ключа отправлен собеседнику', 'success');
                                  }}
                                  className="mt-1 w-full py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-98 border border-amber-500/40 text-amber-200 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Обновить ключ связи</span>
                                </button>
                                <div className="flex justify-end items-center gap-1 text-[9px] text-slate-400 mt-0.5">
                                  <span>{msg.time}</span>
                                </div>
                              </div>
                            ) : ((msg as any).type === 'poll' || (msg as any).poll || (msg as any).poll_data || (typeof (msg as any).text === 'string' && (msg as any).text.startsWith('{"poll":'))) ? (() => {
                              let pollObj: PollData | null = (msg as any).poll || null;
                              if (!pollObj && (msg as any).poll_data) {
                                try {
                                  pollObj = typeof (msg as any).poll_data === 'string' ? JSON.parse((msg as any).poll_data) : (msg as any).poll_data;
                                } catch (e) {}
                              }
                              if (!pollObj && typeof (msg as any).text === 'string') {
                                try {
                                  const parsed = JSON.parse((msg as any).text);
                                  if (parsed.poll) pollObj = parsed.poll;
                                  else if (parsed.question && parsed.options) pollObj = parsed;
                                } catch (e) {}
                              }
                              const fallbackPoll: PollData = pollObj || {
                                pollId: msg.id,
                                question: (msg as any).text || 'Опрос',
                                options: [],
                                tally: {},
                                totalVoters: 0,
                                myVotes: []
                              };
                              return (
                                <div className="flex flex-col min-w-[260px] max-w-sm sm:max-w-md">
                                  <PollMessage
                                    poll={fallbackPoll}
                                    message={msg}
                                    messageId={msg.id}
                                    isChannel={activeChat.type === 'channel'}
                                    isOut={msg.sender === 'me'}
                                    currentUserId={localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id') || 'me'}
                                    theme={theme}
                                    onVote={handleVotePoll}
                                  />
                                  <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400 mr-2">
                                    <span>{msg.time}</span>
                                    {msg.sender === 'me' && renderMessageStatus(msg.status, false, msg.isE2EESendFailed)}
                                  </div>
                                </div>
                              );
                            })() : (
                                <div
                                  className={`
                                    px-4 py-2.5 rounded-2xl text-sm backdrop-blur-md shadow-glass-sm border
                                    ${msg.sender === 'me'
                                      ? 'bg-purple-600/15 border-purple-500/20 text-purple-100 rounded-tr-none'
                                      : 'bg-white/3 border-white/5 text-slate-200 rounded-tl-none'
                                    }
                                  `}
                                >
                                  {msg.forwardFromUser && (
                                    <span className="text-[10px] text-purple-400 italic block mb-1">
                                      ↪ Переслано от {msg.forwardFromUser}
                                    </span>
                                  )}
                                  {msg.replyToMessageId && (() => {
                                    const repliedMsg = activeChat.messages.find((m: any) => m.id === msg.replyToMessageId);
                                    return (
                                      <div 
                                        onClick={async (e: any) => {
                                          e.stopPropagation();
                                          if (!msg.replyToMessageId) return;
                                          setHighlightMessageId(msg.replyToMessageId);
                                          setTimeout(() => {
                                            setHighlightMessageId((cur: any) => (cur === msg.replyToMessageId ? null : cur));
                                          }, 2000);
                                        }}
                                        className="mb-2 p-2 rounded-lg bg-black/20 border-l-2 border-purple-500 text-xs text-slate-300 cursor-pointer hover:bg-black/30 transition-colors"
                                      >
                                        <span className="font-semibold block mb-0.5">
                                          {repliedMsg ? (() => {
                                            if (repliedMsg.sender === 'me') return <span className="text-purple-400">Я</span>;
                                            resolveSenderName(repliedMsg.sender);
                                            const rSender = String(repliedMsg.sender || '');
                                            const rName = formatUserDisplayName(rSender, repliedMsg.senderName, null);
                                            const rColor = getSenderColorClass(rName);
                                            return <span className={rColor}>{rName}</span>;
                                          })() : <span className="text-purple-400">Сообщение</span>}
                                        </span>
                                        <span className="line-clamp-1">{repliedMsg ? repliedMsg.text : 'Цитируемое сообщение'}</span>
                                      </div>
                                    );
                                  })()}
                                  <RichText
                                    text={msg.text}
                                    onMentionClick={handleMentionClick}
                                    onHashtagClick={handleHashtagClick}
                                    highlightTerm={isChatSearchOpen ? chatSearch.query : undefined}
                                    isHighlighted={isHighlighted}
                                  />
                                  <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400">
                                    <span>{msg.time}</span>
                                    {msg.sender === 'me' && renderMessageStatus(msg.status, false, msg.isE2EESendFailed)}
                                  </div>
                                </div>
                            )}

                            {/* Интерактивная карточка инвойса на оплату TON */}
                            {(msg.invoice || msg.invoiceId || (msg as any).invoice_id || (msg as any).type === 'ton_invoice' || (msg as any).type === 'payment_invoice') && (
                              <TonInvoiceCard
                                invoice={msg.invoice || {
                                  invoiceId: msg.invoiceId || (msg as any).invoice_id,
                                  title: msg.text || 'Счет на оплату TON',
                                  amountTon: (msg as any).amount || '1.0',
                                  currency: (msg as any).currency || 'TON',
                                  recipientAddress: (msg as any).recipient_wallet || (msg as any).recipientAddress || '',
                                  memo: (msg as any).memo || ''
                                }}
                                theme={theme}
                              />
                            )}

                            {/* Карточка квитанции P2P криптоперевода */}
                            {(msg.transferReceipt || (msg as any).transfer_receipt || (msg as any).type === 'ton_transfer' || (msg as any).type === 'payment_transfer') && (
                              <TonTransferReceiptCard
                                receipt={msg.transferReceipt || (msg as any).transfer_receipt || {
                                  amountTon: msg.text,
                                  currency: 'TON',
                                  memo: ''
                                }}
                                isMyMessage={isMyMsg}
                                theme={theme}
                              />
                            )}

                            {/* Интерактивная инлайн-клавиатура бота */}
                            {((msg.replyMarkup?.inline_keyboard?.length ?? 0) > 0 || ((msg as any).reply_markup?.inline_keyboard?.length ?? 0) > 0) && (
                              <InlineKeyboardMarkupView
                                chatId={activeChat.id}
                                messageId={msg.id}
                                replyMarkup={msg.replyMarkup || (msg as any).reply_markup}
                                onCallbackQuery={handleCallbackQuery}
                                onOpenUrl={(url: any) => { if (isSafeUrl(url)) window.open(url, '_blank', 'noopener,noreferrer'); }}
                                onPayInvoice={(invoiceId: any) => {
                                  showToast(`Инициализация оплаты инвойса: ${invoiceId || 'TON'}`, 'info');
                                }}
                                theme={theme}
                              />
                            )}

                            {/* Отображение примененной реакции */}
                            {msg.reaction && (
                              <div className={`mt-1 flex items-center bg-white/10 backdrop-blur-md rounded-full px-2.5 py-0.5 text-xs border border-white/10 w-fit ${msg.sender === 'me' ? 'ml-auto' : 'mr-auto'}`}>
                                <span>{msg.reaction}</span>
                              </div>
                            )}
                            </SwipeableMessageRow>
                    </div>
                  )}}
                    />
                    </>
                    )}
                    
{/* Sticker Picker Panel */}
                    {isStickerPickerOpen && (
                      <div className="p-4 border-t border-white/5 bg-neutral-950/85 backdrop-blur-2xl flex gap-6 items-center justify-center overflow-x-auto relative">
                        <div className="absolute top-2 right-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider">Анимированные стикеры</div>
                        <div className="flex gap-6 items-center py-2">
                          <div 
                            onClick={() => {
                              handleSendMediaMessage('sticker', '/stickers/star.tgs', '🎨 Золотая звезда');
                              setIsStickerPickerOpen(false);
                            }}
                            className="cursor-pointer hover:scale-110 active:scale-95 transition-all p-1.5 bg-white/2 hover:bg-white/5 rounded-2xl border border-white/5"
                          >
                            <TgsSticker tgsUrl="/stickers/star.tgs" width={80} height={80} />
                          </div>
                          <div 
                            onClick={() => {
                              handleSendMediaMessage('sticker', '/stickers/heart.tgs', '🎨 Красное сердце');
                              setIsStickerPickerOpen(false);
                            }}
                            className="cursor-pointer hover:scale-110 active:scale-95 transition-all p-1.5 bg-white/2 hover:bg-white/5 rounded-2xl border border-white/5"
                          >
                            <TgsSticker tgsUrl="/stickers/heart.tgs" width={80} height={80} />
                          </div>
                          <div 
                            onClick={() => {
                              handleSendMediaMessage('sticker', '/stickers/crystal.tgs', '🎨 Синий кристалл');
                              setIsStickerPickerOpen(false);
                            }}
                            className="cursor-pointer hover:scale-110 active:scale-95 transition-all p-1.5 bg-white/2 hover:bg-white/5 rounded-2xl border border-white/5"
                          >
                            <TgsSticker tgsUrl="/stickers/crystal.tgs" width={80} height={80} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Панель превью загрузки файла */}
                    {uploadingFile && (
                      <div className="p-3 border-t border-white/5 bg-white/2 backdrop-blur-xl flex flex-col gap-2 px-6">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black/20">
                              {uploadingFile.type === 'photo' ? (
                                <img src={uploadingFile.previewUrl} alt={t('chat:file.preview', 'Превью')} className="w-full h-full object-cover" />
                              ) : (
                                <video src={uploadingFile.previewUrl} className="w-full h-full object-cover" />
                              )}
                              {uploadingFile.progress < 100 && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] text-white font-bold">
                                  {uploadingFile.progress}%
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs text-slate-300 block truncate max-w-[150px] font-medium">
                                {uploadingFile.file.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {uploadingFile.progress < 100 ? t('chat:file.uploading', "Загрузка на сервер...") : t('chat:file.ready', "Файл готов к отправке")}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <GlassButton 
                              type="button" 
                              variant="secondary"
                              onClick={() => setUploadingFile(null)}
                              className="p-2 rounded-xl text-red-400 hover:bg-red-500/10"
                            >
                              <X className="w-4 h-4" />
                            </GlassButton>
                            <GlassButton 
                              type="button" 
                              variant="accent"
                              disabled={uploadingFile.progress < 100}
                              onClick={handleSendUploadedFile}
                              className="p-2 rounded-xl text-green-400 hover:bg-green-500/10"
                            >
                              <Send className="w-4 h-4" />
                            </GlassButton>
                          </div>
                        </div>
                        {/* Поле ввода подписи к фото/видео */}
                        <input
                          type="text"
                          placeholder={uploadingFile.type === 'photo' ? t('chat:file.captionPhoto', 'Добавить подпись к фото...') : t('chat:file.captionVideo', 'Добавить подпись к видео...')}
                          value={uploadingFile.caption || ''}
                          onChange={(e: any) => setUploadingFile((prev: any) => prev ? { ...prev, caption: e.target.value } : null)}
                          onKeyDown={(e: any) => {
                            if (e.key === 'Enter' && !e.shiftKey && uploadingFile.progress >= 100) {
                              e.preventDefault();
                              handleSendUploadedFile();
                            }
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/40 transition-colors"
                          autoFocus
                        />
                      </div>
                    )}

                    {/* Emoji Picker Panel */}
                    {isEmojiPickerOpen && (
                      <EmojiPickerPanel onEmojiSelect={handleEmojiClick} theme={theme} />
                    )}

                    {/* Панель ввода сообщения с учетом Safe Area снизу на мобильных */}
                    {(() => {
                      const isChannel = activeChat?.type === 'channel';
                      const currentUserId = localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id') || '';
                      const isChannelOwner = isChannel && (activeChat?.role === 'owner' || (activeChat?.owner_user_id && activeChat.owner_user_id === currentUserId));
                      const isChannelAdmin = isChannel && (activeChat?.role === 'admin' || isChannelOwner);
                      const isChannelPoster = isChannel && (activeChat?.role === 'poster' || isChannelAdmin);
                      const canPostInCurrentChat = !isChannel || isChannelPoster;

                      if (!canPostInCurrentChat) {
                        return (
                          <div className="p-4 pb-kb border-t border-white/5 bg-white/1 backdrop-blur-xl flex items-center justify-between gap-4 w-full">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Radio className="w-4 h-4 text-purple-400 flex-shrink-0" />
                              <span className="text-xs text-slate-400 truncate">Только администраторы могут публиковать сообщения</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleChannelMute()}
                              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer shadow-glass-sm ${
                                activeChat?.muted
                                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
                              }`}
                            >
                              {activeChat?.muted ? (
                                <>
                                  <Bell className="w-3.5 h-3.5" />
                                  <span>🔔 Включить звук</span>
                                </>
                              ) : (
                                <>
                                  <BellOff className="w-3.5 h-3.5" />
                                  <span>🔕 Без звука</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      }

                      if (activeChat.is_forum && activeTopicId === null) {
                        return null;
                      }

                      if (activeChat.is_forum && activeTopicId !== null && activeTopic?.is_closed) {
                        return (
                          <div className="p-4 pb-kb border-t border-white/5 bg-white/1 backdrop-blur-xl flex items-center justify-center text-xs text-slate-400 font-medium select-none">
                            <Lock className="w-4 h-4 mr-2 text-amber-400" />
                            Топик закрыт для сообщений
                          </div>
                        );
                      }

                      const isBotActiveChat = Boolean(
                        !activeChat?.isGroup &&
                        (activeChat?.isBot ||
                          (activeChat as any)?.is_bot ||
                          activeChat?.type === 'bot' ||
                          /bot$/i.test(String(activeChat?.username || activeChat?.name || '').trim()) ||
                          (typeof localStorage !== 'undefined' && activeChat?.id && localStorage.getItem('bot_chat_' + activeChat.id) === '1'))
                      );

                      return (
                        <form 
                          data-testid="input-panel"
                          onSubmit={handleSendMessage} 
                          className="px-2.5 py-2 sm:p-4 pb-kb border-t border-white/5 bg-white/1 backdrop-blur-xl flex flex-col gap-2 sm:gap-3 w-full max-w-full overflow-hidden relative shrink-0"
                        >
                      {isBotActiveChat && (
                        <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
                          <span className="text-[10px] font-semibold text-purple-300/80 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 shrink-0">
                            🤖 Команды бота:
                          </span>
                          {[
                            { label: '🚀 Старт', cmd: '/start' },
                            { label: '📋 Помощь', cmd: '/help' },
                            { label: '🆔 Мой ID', cmd: '/id' },
                            { label: '🎲 Кубик', cmd: '/roll' },
                            { label: '🪙 Монетка', cmd: '/coin' },
                            { label: '🏓 Ping', cmd: '/ping' },
                          ].map((item) => (
                            <button
                              key={item.cmd}
                              type="button"
                              onClick={() => handleSendMessage(undefined, item.cmd)}
                              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-purple-500/20 active:scale-95 text-[11px] font-medium text-slate-200 hover:text-purple-200 border border-white/10 hover:border-purple-500/30 transition-all shrink-0 cursor-pointer"
                            >
                              {item.label} <span className="text-[10px] font-mono text-purple-300/90">{item.cmd}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {replyingToMessage && (
                        <div className="w-full flex items-center justify-between bg-purple-950/20 border border-purple-500/20 rounded-xl px-4 py-2 mb-1">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Reply className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <div className="flex flex-col overflow-hidden text-xs">
                              <span className="font-semibold text-purple-400">
                                {t('chat:reply.to', 'Ответ на сообщение {{user}}', { user: replyingToMessage.sender === 'me' ? t('chat:message.me', 'Я') : (() => {
                                  resolveSenderName(replyingToMessage.sender);
                                  const repSender = replyingToMessage.sender;
                                  return formatUserDisplayName(repSender, replyingToMessage.senderName, null);
                                })() })}
                              </span>
                              <span className="text-slate-300 line-clamp-1 truncate">{replyingToMessage.text}</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setReplyingToMessage(null)}
                            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {editingMessage && (
                        <div className="w-full flex items-center justify-between bg-purple-950/20 border border-purple-500/20 rounded-xl px-4 py-2 mb-1">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Edit2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <div className="flex flex-col overflow-hidden text-xs">
                              <span className="font-semibold text-purple-400">{t('chat:edit.title', 'Редактирование сообщения')}</span>
                              <span className="text-slate-300 line-clamp-1 truncate">{editingMessage.text}</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingMessage(null);
                              setNewMessageText('');
                            }}
                            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Обычный ввод (когда не идет запись звука) */}
                      {!isAudioRecording && !recordedAudioUrl && (
                        <div className="flex items-end gap-1.5 sm:gap-2 w-full max-w-full min-w-0">
                          {/* Большая красивая капсула ввода в стиле Telegram: [ 😊 | Сообщение | 📎 ] */}
                          <div 
                            className={`flex-grow flex-1 min-w-0 flex items-center rounded-3xl border transition-all duration-200 px-1.5 py-1 min-h-[42px] sm:min-h-[46px] max-h-36 ${
                              theme === 'light'
                                ? 'bg-slate-100/90 border-slate-300/80 focus-within:border-blue-500/60 focus-within:bg-white shadow-sm'
                                : (theme === 'coffee'
                                    ? 'bg-[#241a13]/90 border-[#D5CEA3]/20 focus-within:border-[#D5CEA3]/50 focus-within:bg-[#2b2018]'
                                    : 'bg-neutral-900/85 border-white/10 focus-within:border-purple-500/40 focus-within:bg-neutral-900 backdrop-blur-xl')
                            }`}
                          >
                            {/* Кнопка открытия Emoji Picker (вписана внутрь слева) */}
                            <button
                              type="button"
                              onClick={() => {
                                setIsEmojiPickerOpen(!isEmojiPickerOpen);
                                setIsStickerPickerOpen(false);
                              }}
                              className={`p-1.5 sm:p-2 rounded-full transition-all active:scale-90 flex-shrink-0 cursor-pointer ${
                                isEmojiPickerOpen
                                  ? 'text-purple-400'
                                  : (theme === 'light' ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200')
                              }`}
                              title={t('chat:input.emoji', 'Смайлики и стикеры')}
                              data-testid="emoji-picker-toggle"
                            >
                              <Smile className="w-5 h-5" />
                            </button>

                            {/* Текстовое поле ввода без рамок (по центру) */}
                            <textarea
                              ref={textareaRef}
                              rows={1}
                              cols={1}
                              id="message-input"
                              data-testid="message-input"
                              aria-label={t('chat:input.placeholder', 'Сообщение')}
                              placeholder={t('chat:input.placeholder', 'Сообщение')}
                              value={newMessageText}
                              onChange={(e: any) => {
                                const val = e.target.value;
                                setNewMessageText(val);
                                if (val !== typingTextRef.current && activeChat?.id) {
                                  typingTextRef.current = val;
                                  const now = Date.now();
                                  if (now - lastTypingSentRef.current > TYPING_DEBOUNCE_MS) {
                                    lastTypingSentRef.current = now;
                                    syncManager.sendTyping(activeChat.id);
                                  }
                                }
                              }}
                              onKeyDown={(e: any) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage(e as any);
                                }
                              }}
                              className={`flex-grow flex-1 w-full min-w-0 bg-transparent border-0 focus:outline-none focus:ring-0 px-1.5 sm:px-2 py-1.5 sm:py-2 text-sm resize-none overflow-y-auto max-h-28 leading-relaxed font-outfit ${
                                theme === 'light' ? 'text-slate-900 placeholder-slate-400' : 'text-slate-100 placeholder-slate-500'
                              }`}
                            />

                            {/* Кнопка скрепки — открытие Telegram-style шторки вложений (вписана внутрь справа) */}
                            <button
                              type="button"
                              onClick={() => setIsMediaDrawerOpen(true)}
                              className={`p-1.5 sm:p-2 rounded-full transition-all active:scale-90 flex-shrink-0 cursor-pointer ${
                                theme === 'light' ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title="Прикрепить файл, фото или видео"
                              data-testid="paperclip-button"
                            >
                              <Paperclip className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Круглая кнопка действия справа от капсулы: Микрофон/Видео-кружок ИЛИ Отправка */}
                          {newMessageText.trim() ? (
                            <button
                              type="submit"
                              className={`w-[42px] h-[42px] sm:w-[46px] sm:h-[46px] rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md flex-shrink-0 cursor-pointer ${
                                theme === 'light'
                                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25'
                                  : (theme === 'coffee'
                                      ? 'bg-[#D5CEA3] hover:bg-[#E5E0C2] text-[#1A120B]'
                                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30')
                              }`}
                              id="send-button"
                              data-testid="send-button"
                              title="Отправить"
                            >
                              <Send className="w-5 h-5 translate-x-[1px]" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                              {inputMode === 'mic' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isPremium) {
                                      setIsPremiumModalOpen(true);
                                      return;
                                    }
                                    const order: Array<'original' | 'deep' | 'cyber' | 'radio' | 'helium'> = [
                                      'original',
                                      'deep',
                                      'cyber',
                                      'radio',
                                      'helium',
                                    ];
                                    const labels: Record<string, string> = {
                                      original: '🎙️ Обычный голос',
                                      deep: '🕵️ Аноним (Низкий тембр)',
                                      cyber: '🤖 Киберпанк (Синтезатор)',
                                      radio: '📻 Радиостудия (Broadcast)',
                                      helium: '⚡ Высокий (Гелий)',
                                    };
                                    const curr = ctx.voiceChangerPreset || 'original';
                                    const next = order[(order.indexOf(curr) + 1) % order.length];
                                    ctx.handleSelectVoicePreset?.(next);
                                    showToast(`Модулятор голоса: ${labels[next]}`, 'info');
                                  }}
                                  data-testid="voice-changer-toggle"
                                  title="DSP-модулятор голоса (нажмите для смены тембра)"
                                  className={`w-[38px] sm:w-auto h-[42px] sm:h-[46px] px-2 sm:px-2.5 rounded-full flex items-center justify-center gap-1 text-xs font-bold transition-all active:scale-95 cursor-pointer select-none border flex-shrink-0 ${
                                    ctx.voiceChangerPreset && ctx.voiceChangerPreset !== 'original' && isPremium
                                      ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200 shadow-lg shadow-emerald-900/30'
                                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <span>
                                    {(!isPremium || !ctx.voiceChangerPreset || ctx.voiceChangerPreset === 'original') && '🎭'}
                                    {isPremium && ctx.voiceChangerPreset === 'deep' && '🕵️'}
                                    {isPremium && ctx.voiceChangerPreset === 'cyber' && '🤖'}
                                    {isPremium && ctx.voiceChangerPreset === 'radio' && '📻'}
                                    {isPremium && ctx.voiceChangerPreset === 'helium' && '⚡'}
                                  </span>
                                </button>
                              )}
                              <button
                                type="button"
                                onMouseDown={handleRecordStart}
                                onTouchStart={handleRecordStart}
                                className={`w-[42px] h-[42px] sm:w-[46px] sm:h-[46px] rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md flex-shrink-0 cursor-pointer select-none ${
                                  theme === 'light'
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                                    : (theme === 'coffee'
                                        ? 'bg-[#D5CEA3]/20 border border-[#D5CEA3]/30 text-[#D5CEA3] hover:bg-[#D5CEA3]/30'
                                        : 'bg-purple-600/25 border border-purple-500/40 text-purple-300 hover:bg-purple-600/40 shadow-purple-900/30')
                                }`}
                                title={inputMode === 'mic' ? 'Зажмите для записи голоса, нажмите для переключения на видео' : 'Зажмите для записи видео-кружка, нажмите для переключения на голос'}
                                data-testid="record-button"
                              >
                                {inputMode === 'mic' ? <Mic className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Панель текущей аудиозаписи (активна во время удержания/записи микрофона) */}
                      {isAudioRecording && (
                        <div className="flex items-center justify-between gap-2 w-full bg-purple-950/20 rounded-xl p-2 border border-purple-500/20">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping flex-shrink-0" />
                            <span className="text-xs font-semibold text-purple-200 truncate">
                              {t('chat:audio.recording', 'Запись аудио: {{duration}} сек.', { duration: audioRecordDuration })}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline truncate">
                            {audioLockMode ? "Зафиксировано 🔒" : "← Свайп влево для отмены"}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <GlassButton 
                              type="button" 
                              variant="secondary" 
                              size="sm" 
                              onClick={() => stopAudioRecording(false)} 
                              className="p-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </GlassButton>
                            <GlassButton 
                              type="button" 
                              variant="accent" 
                              size="sm" 
                              onClick={() => stopAudioRecording(true)} 
                              className="p-2 rounded-xl border border-green-500/20 text-green-400 hover:bg-green-500/10"
                            >
                              <Send className="w-4 h-4" />
                            </GlassButton>
                          </div>
                        </div>
                      )}

                      {/* Панель прослушивания и подтверждения ( Lock Mode завершен ) */}
                      {recordedAudioUrl && (
                        <div className="flex items-center gap-3 w-full bg-neutral-900/90 rounded-xl p-3 border border-white/5 shadow-glass-md">
                          <GlassButton 
                            type="button" 
                            variant="secondary" 
                            onClick={handleTogglePlayRecordedAudio}
                            className="h-9 w-9 flex-shrink-0 rounded-full p-0 flex items-center justify-center"
                          >
                            {audioPlayState === 'playing' ? (
                              <span className="w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                            ) : (
                              <svg className="w-3.5 h-3.5 fill-purple-400 translate-x-[1px]" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            )}
                          </GlassButton>

                          <div className="flex-grow flex items-center h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 w-full animate-pulse" />
                          </div>

                          <div className="text-[11px] text-slate-400 font-semibold">
                            {audioRecordDuration} сек.
                          </div>

                          <div className="flex gap-2">
                            <GlassButton 
                              type="button" 
                              variant="secondary" 
                              onClick={handleDiscardRecordedAudio}
                              className="h-9 w-9 flex-shrink-0 rounded-full p-0 flex items-center justify-center text-red-400 hover:text-red-300"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </GlassButton>

                            <GlassButton 
                              type="button" 
                              variant="accent" 
                              onClick={handleSendRecordedAudio}
                              className="h-9 w-9 flex-shrink-0 rounded-full p-0 flex items-center justify-center"
                              title="Отправить"
                            >
                              <Send className="w-4 h-4" />
                            </GlassButton>
                          </div>
                        </div>
                      )}
                    </form>
                  );
                })()}

                    {/* Telegram-style Media Attachment Drawer */}
                    <MediaAttachmentDrawer
                      isOpen={isMediaDrawerOpen}
                      onClose={() => setIsMediaDrawerOpen(false)}
                      theme={theme}
                      onSelectFile={(file: any) => {
                        handleProcessFile(file);
                        setIsMediaDrawerOpen(false);
                      }}
                      onSelectMultipleFiles={(files: any) => {
                        if (files.length > 0) {
                          handleSendPhotoBatch(files);
                        }
                        setIsMediaDrawerOpen(false);
                      }}
                      onSendLocation={handleSendLocation}
                      onOpenTonTransfer={() => setIsInChatTransferOpen(true)}
                      onOpenPollModal={() => setIsPollModalOpen(true)}
                    />
                  </>
                ) : (
                  <div className="flex-grow flex flex-col justify-center items-center p-6 text-slate-500">
                    <div className={`max-w-md w-full p-6 rounded-3xl border text-center flex flex-col items-center gap-4 ${
                      theme === 'light'
                        ? 'bg-white/80 border-slate-200 text-slate-800 shadow-sm'
                        : (theme === 'coffee'
                            ? 'bg-[#1e150f]/60 border-[#D5CEA3]/15 text-[#E5E5CB]'
                            : 'bg-white/[0.02] border-white/10 text-slate-200')
                    }`}>
                      <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-glass-sm">
                        <ShieldCheck className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold">
                          {t('chat:list.selectChatPrompt', 'Выберите чат или начните новый диалог')}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {t('chat:list.selectChatSub', 'Все сообщения защищены сквозным шифрованием Double Ratchet (X3DH). Ключи хранятся только на вашем устройстве.')}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
                        <button
                          type="button"
                          onClick={() => setIsNewChatModalOpen(true)}
                          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{t('chat:newChat.button', 'Создать чат')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsNetworkModalOpen(true)}
                          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                        >
                          <Radio className="w-4 h-4 text-emerald-400" />
                          <span>{t('settings:network.radarShort', 'Люди рядом')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'pulse' ? (
            <div key="pulse-tab" className="flex-grow w-full h-full overflow-hidden animate-fade-in pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
              <SovereignEconomicHub
                theme={theme}
                onToast={showToast}
                onStartChatWithUser={(alias: any) => {
                  const cleanAlias = String(alias || '').replace(/^@/, '').trim();
                  setActiveTab('chats');
                  if (!cleanAlias) return;
                  const existingChat = (chatsRef?.current || []).find(
                    (c: any) =>
                      c.id === cleanAlias ||
                      String(c.name || '').toLowerCase() === cleanAlias.toLowerCase()
                  );
                  if (existingChat) {
                    setSelectedChatId(existingChat.id);
                    setMobileView('chat');
                    showToast(`Открыт защищенный диалог с ${cleanAlias}`, 'info');
                    return;
                  }
                  setSearchQuery(cleanAlias);
                  setMobileView('list');
                  if (typeof handleMentionClick === 'function') {
                    handleMentionClick(cleanAlias);
                  } else {
                    showToast(`Поиск контрагента ${cleanAlias}...`, 'info');
                  }
                }}
              />
            </div>
          ) : activeTab === 'wallet' ? (
            <div key="wallet-tab" className="flex-grow w-full h-full overflow-y-auto animate-fade-in pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
              <TonWalletHubModal
                isOpen={true}
                inline={true}
                onClose={() => setActiveTab('chats')}
                theme={theme}
              />
            </div>
          ) : (
            <AppSettingsTab ctx={ctx} />
          )}
      </div>

      <AppInPaneModals ctx={ctx} />
          </motion.div>
  );
}
