import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Settings, Send, Lock, CheckSquare, ShieldCheck, CheckCircle2, RefreshCw, Download, ExternalLink, ArrowLeft, Share2, Phone, PhoneOff, Video, Trash2, X, Edit2, Copy, Reply, Square, Sparkles, Pin, AlertTriangle, AlertCircle, Coins, Wallet } from 'lucide-react';
import { GlassButton, GlassInput, GlassCard, GlassModal } from '../../ui';
import { AdminDashboardModal } from '../../components/admin/AdminDashboardModal';
import { EnterpriseDemoModal } from '../../components/ui/EnterpriseDemoModal';
import { IosInstallPromptModal } from '../../components/ui/IosInstallPromptModal';
import { TopicConstructorModal } from '../../components/chat/TopicConstructorModal';
import { GroupCallModal } from '../../components/call/GroupCallModal';
import { type TopicItem } from '../../types';
import { SwipeablePhotoViewer } from '../../components/chat/SwipeablePhotoViewer';
import { tdlib } from '../../core/tdlib/tdlib-adapter';
import { storageManager } from '../../core/storage/storage-manager';
import { VideoNote } from '../../components/video/VideoNote';
import { VoIPCallOverlay } from '../../components/voip/VoIPCallOverlay';
import { LiveCaptions } from '../../components/voip/LiveCaptions';
import { formatChatPreview } from '../../utils/message-preview';
import { Capacitor } from '@capacitor/core';
import { voipAudio } from '../../core/voip/voipAudio';
import { VoIPNotificationPlugin } from '../../core/voip/voipNotificationPlugin';
import 'katex/dist/katex.min.css';
import { Avatar } from '../../components/ui/Avatar';
import { InAppNotificationBanner } from '../../components/ui/InAppNotificationBanner';
import { AvatarCropModal } from '../../components/ui/AvatarCropModal';
import { AvatarViewerModal } from '../../components/ui/AvatarViewerModal';
import { AvatarActionSheetModal } from '../../components/ui/AvatarActionSheetModal';
import { ChannelInfo } from '../../components/chat/ChannelInfo';
import { SafetyNumberModal } from '../../components/chat/SafetyNumberModal';
import { ScheduledMessagesModal } from '../../components/chat/ScheduledMessagesModal';
import { ForwardModal } from '../../components/chat/ForwardModal';
import { PollConstructorModal } from '../../components/chat/PollConstructorModal';
import { MediaGalleryViewerModal, MediaGalleryItem } from '../../components/chat/MediaGalleryViewerModal';
import { SharedMediaDrawerModal } from '../../components/chat/SharedMediaDrawerModal';
import { PremiumModal } from '../../components/ui/PremiumModal';
import { PremiumSecurityModal } from '../../components/ui/PremiumSecurityModal';
import { NotificationSyncService } from '../../core/network/notificationSync';
import { BotManagementModal } from '../../features/bots/BotManagementModal';
import { TonWalletHubModal, InChatTransferModal } from '../../features/ton';
import { type Message } from './appHelpers';

export interface AppSubComponentProps { ctx: Record<string, any>; }

export function AppGlobalOverlays({ ctx }: AppSubComponentProps) {
  const {
    activeCallChatId,
    activeCallId,
    activeCallName,
    activeChat,
    activeReactionMessageId,
    activeTab,
    androidUpdateData,
    apkDownloadError,
    apkDownloadProgress,
    apkDownloadedBytes,
    apkDownloading,
    apkPermissionRequested,
    apkReadyToInstall,
    apkTotalBytes,
    avatarInputRef,
    avatarViewerState,
    callActionStateRef,
    chatToDelete,
    chats,
    clearIncomingCallTimeout,
    cropImageSrc,
    cropModalOpen,
    cropTarget,
    editingTopic,
    fetchMyBotsCount,
    formatUserDisplayName,
    groupAvatarInputRef,
    handleAcceptCall,
    handleActionCopy,
    handleActionDelete,
    handleActionEdit,
    handleActionForward,
    handleActionPin,
    handleActionReply,
    handleActionRetry,
    handleActionUnpin,
    handleApplyReaction,
    handleCancelPinAndExitToLanding,
    handleClearLocalStorageAndExit,
    handleCreatePoll,
    handleCropCompleted,
    handleDeclineCall,
    handleDeleteChat,
    handleDeleteGroupAvatar,
    handleDeleteProfileAvatar,
    handleEditCurrentGroupAvatar,
    handleEditCurrentProfileAvatar,
    handleForwardMessage,
    handleForwardSelected,
    handlePinSubmit,
    handleRefreshPremium,
    handleSendMediaMessage,
    handleToggleChannelMute,
    handleToggleMuteChat,
    inAppNotification,
    incomingCallAvatar,
    incomingCallChatId,
    incomingCallId,
    incomingCallMediaType,
    incomingCallName,
    installApk,
    isAdminModalOpen,
    isAuthLoading,
    isAuthenticated,
    isBotManagementOpen,
    isCallOpen,
    isChannelInfoOpen,
    isChatIn152FzContour,
    isDeleteChatModalOpen,
    isEnterpriseDemoModalOpen,
    isForceUpdateRequired,
    isForwardModalOpen,
    isGroupAvatarActionSheetOpen,
    isGroupCallOpen,
    isInChatTransferOpen,
    isIncomingCallOpen,
    isInstallingApk,
    isKeyboardOpen,
    isMyAvatarActionSheetOpen,
    isOutgoingCall,
    isPollModalOpen,
    isPremium,
    isPremiumModalOpen,
    isRecordingVideoNote,
    isSafetyModalOpen,
    isScheduledModalOpen,
    isSharedMediaDrawerOpen,
    isTonWalletModalOpen,
    isTopicConstructorOpen,
    mediaGalleryState,
    mobileView,
    mutedChatIds,
    pinError,
    pinInput,
    pinOverlayMode,
    pinOverlayUsername,
    pinnedMessageMap,
    profileAvatarUrl,
    reactionMenuCoords,
    realInstalledVersion,
    recordedVideoUrl,
    safetyPeerIdentityKey,
    selectedMessageIds,
    selectedPhotoUrl,
    setActiveCallChatId,
    setActiveCallId,
    setActiveCallName,
    setActiveReactionMessageId,
    setActiveTab,
    setAvatarViewerState,
    setChatToDelete,
    setChatVerified,
    setChats,
    setCropImageSrc,
    setCropModalOpen,
    setForwardingMessageId,
    setHighlightMessageId,
    setInAppNotification,
    setIsAdminModalOpen,
    setIsBotManagementOpen,
    setIsCallOpen,
    setIsChannelInfoOpen,
    setIsDeleteChatModalOpen,
    setIsEnterpriseDemoModalOpen,
    setIsForceUpdateRequired,
    setIsForwardModalOpen,
    setIsGroupAvatarActionSheetOpen,
    setIsGroupCallActive,
    setIsGroupCallOpen,
    setIsInChatTransferOpen,
    setIsMyAvatarActionSheetOpen,
    setIsOutgoingCall,
    setIsPollModalOpen,
    setIsPremiumModalOpen,
    setIsRecordingVideoNote,
    setIsSafetyModalOpen,
    setIsScheduledModalOpen,
    setIsSharedMediaDrawerOpen,
    setIsTonWalletModalOpen,
    setIsTopicConstructorOpen,
    setMediaGalleryState,
    setMobileView,
    setPinInput,
    setReactionMenuCoords,
    setRecordedVideoUrl,
    setSafetyPeerIdentityKey,
    setSelectedChatId,
    setSelectedMessageIds,
    setSelectedPhotoUrl,
    setShowDeleteConfirm,
    setShowPinResetConfirm,
    setSystemAlertModal,
    setTopics,
    setUpdateBannerData,
    setVideoLockMode,
    setVideoNoteTriggerStart,
    setVideoNoteTriggerStop,
    setVideoNoteTriggerSwitch,
    setVideoPlayState,
    setVideoRecordingActive,
    showDeleteConfirm,
    showPinOverlay,
    showPinResetConfirm,
    showPulseTab,
    showToast,
    showWalletTab,
    startBackgroundApkDownload,
    systemAlertModal,
    t,
    theme,
    toast,
    topics,
    updateBannerData,
    videoNoteTriggerStart,
    videoNoteTriggerStop,
    videoNoteTriggerSwitch,
    videoPlayState,
    videoPreviewMuted,
    videoPreviewRef,
    videoRecordingActive,
    virtualMessageListRef
  } = ctx;
  return (
    <>
      {/* Студия записи / предпросмотра видео-кружка (Telegram-Style Studio Overlay) */}
      <AnimatePresence>
        {(isRecordingVideoNote || recordedVideoUrl) && (
          <motion.div
            key="video-note-recording-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-xl pointer-events-auto select-none"
            data-testid="video-lock-overlay"
          >
            {/* Кнопка закрытия / отмены в правом верхнем углу */}
            <button
              type="button"
              onClick={() => {
                if (recordedVideoUrl) {
                  URL.revokeObjectURL(recordedVideoUrl);
                }
                setIsRecordingVideoNote(false);
                setRecordedVideoUrl(null);
                setVideoNoteTriggerStop(0);
                setVideoLockMode(false);
                setVideoRecordingActive(false);
                setVideoNoteTriggerStart(0);
                setVideoNoteTriggerSwitch(0);
              }}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer z-50 shadow-lg"
              title="Закрыть"
            >
              <X className="w-6 h-6" />
            </button>

            {isRecordingVideoNote ? (
              <div className="flex flex-col items-center max-w-sm w-full">
                {/* Заголовок студии */}
                <div className="text-center mb-5">
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    {videoRecordingActive ? "Идет запись кружка..." : "Запись видео-кружка"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {videoRecordingActive ? "Нажмите на квадрат для завершения" : "Нажмите на камеру для начала записи"}
                  </p>
                </div>

                {/* Круглая видео-студия с живой камерой */}
                <div className="relative mb-6">
                  <VideoNote 
                    isRecordingMode={false}
                    triggerStop={videoNoteTriggerStop}
                    triggerStart={videoNoteTriggerStart}
                    triggerSwitchCamera={videoNoteTriggerSwitch}
                    onStartHandled={() => setVideoNoteTriggerStart(0)}
                    hideControls={true}
                    onRecordingStateChange={(isActive: any) => setVideoRecordingActive(isActive)}
                    onSave={async (blob: any) => {
                      console.log("App [Callback]: VideoNote.onSave called, blob size =", blob.size);
                      const videoUrl = URL.createObjectURL(blob);
                      setRecordedVideoUrl(videoUrl);
                      setIsRecordingVideoNote(false);
                      setVideoNoteTriggerStop(0);
                      setVideoRecordingActive(false);
                      setVideoNoteTriggerStart(0);
                      setVideoNoteTriggerSwitch(0);
                    }}
                    onCancel={() => {
                      console.log("App [Callback]: VideoNote.onCancel called");
                      setIsRecordingVideoNote(false);
                      setVideoNoteTriggerStop(0);
                      setVideoLockMode(false);
                      setVideoRecordingActive(false);
                      setVideoNoteTriggerStart(0);
                      setVideoNoteTriggerSwitch(0);
                    }}
                  />
                </div>
                
                {/* Панель управления записью: внешние кнопки */}
                <div className="flex items-center justify-center gap-6 mt-4 w-full">
                  {!videoRecordingActive ? (
                    <>
                      {/* Отмена / Закрыть */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecordingVideoNote(false);
                          setVideoNoteTriggerStop(0);
                          setVideoLockMode(false);
                          setVideoRecordingActive(false);
                          setVideoNoteTriggerStart(0);
                          setVideoNoteTriggerSwitch(0);
                          showToast("Запись отменена", "info");
                        }}
                        className="w-13 h-13 rounded-full flex items-center justify-center bg-white/10 hover:bg-red-500/20 text-red-400 border border-white/10 transition-all active:scale-95 shadow-lg cursor-pointer"
                        title="Отменить"
                        data-testid="video-lock-cancel"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      {/* Переключить камеру */}
                      <button
                        type="button"
                        onClick={() => {
                          setVideoNoteTriggerSwitch((prev: any) => prev + 1);
                        }}
                        className="w-13 h-13 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all active:scale-95 shadow-lg cursor-pointer"
                        title="Сменить камеру"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>

                      {/* Начать запись */}
                      <button
                        type="button"
                        onClick={() => {
                          setVideoNoteTriggerStart((prev: any) => prev + 1);
                        }}
                        className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all active:scale-95 shadow-xl shadow-emerald-500/30 cursor-pointer"
                        title="Начать запись"
                        data-testid="video-lock-start"
                      >
                        <Video className="w-7 h-7 fill-current" />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Переключить камеру во время записи */}
                      <button
                        type="button"
                        onClick={() => {
                          setVideoNoteTriggerSwitch((prev: any) => prev + 1);
                        }}
                        className="w-13 h-13 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all active:scale-95 shadow-lg cursor-pointer"
                        title="Сменить камеру"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>

                      {/* Остановить запись */}
                      <button
                        type="button"
                        onClick={() => {
                          setVideoNoteTriggerStop((prev: any) => prev + 1);
                        }}
                        className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 text-white transition-all active:scale-95 shadow-xl shadow-red-600/30 cursor-pointer"
                        title="Остановить запись"
                        data-testid="video-lock-stop"
                      >
                        <Square className="w-6 h-6 fill-current" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              // Состояние предпросмотра записанного кружка в Lock Mode
              <div className="flex flex-col items-center max-w-sm w-full">
                <div className="text-center mb-5">
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    Предпросмотр кружка
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Проверьте запись перед отправкой
                  </p>
                </div>

                <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden border-3 border-purple-500/80 bg-neutral-950 shadow-2xl aspect-square mb-6">
                  <video
                    ref={videoPreviewRef}
                    src={recordedVideoUrl || undefined}
                    loop
                    muted={videoPreviewMuted}
                    playsInline
                    autoPlay
                    className="w-full h-full object-cover"
                    data-testid="video-preview-player"
                  />
                </div>
                
                {/* Панель кнопок: Удалить, Воспроизвести/Пауза, Отправить */}
                <div className="flex items-center gap-4 justify-center w-full">
                  <button 
                    type="button" 
                    onClick={() => {
                      if (recordedVideoUrl) {
                        URL.revokeObjectURL(recordedVideoUrl);
                      }
                      setRecordedVideoUrl(null);
                      setIsRecordingVideoNote(false);
                      setVideoLockMode(false);
                      setVideoRecordingActive(false);
                      setVideoNoteTriggerStop(0);
                      setVideoNoteTriggerStart(0);
                      setVideoNoteTriggerSwitch(0);
                      showToast("Запись удалена", "info");
                    }}
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-red-500/20 text-red-400 border border-white/10 transition-all active:scale-95 shadow-lg cursor-pointer"
                    title="Удалить"
                    data-testid="video-lock-discard"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => {
                      const vid = videoPreviewRef.current;
                      if (!vid) return;
                      if (vid.paused) {
                        vid.play().catch((e: any) => console.error(e));
                        setVideoPlayState('playing');
                      } else {
                        vid.pause();
                        setVideoPlayState('paused');
                      }
                    }}
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-purple-400 border border-white/10 transition-all active:scale-95 shadow-lg cursor-pointer"
                    title={videoPlayState === 'playing' ? "Пауза" : "Воспроизвести"}
                    data-testid="video-lock-play-toggle"
                  >
                    {videoPlayState === 'playing' ? (
                      <Square className="w-5 h-5 fill-current" />
                    ) : (
                      <svg className="w-5 h-5 fill-purple-400 translate-x-[1px]" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => {
                      if (recordedVideoUrl) {
                        const urlToSend = recordedVideoUrl;
                        // Мгновенно закрываем панель студии и возвращаем пользователя в чат
                        setRecordedVideoUrl(null);
                        setIsRecordingVideoNote(false);
                        setVideoLockMode(false);
                        setVideoRecordingActive(false);
                        setVideoNoteTriggerStop(0);
                        setVideoNoteTriggerStart(0);
                        setVideoNoteTriggerSwitch(0);
                        showToast("Видео-кружок отправлен", "success");
                        // Асинхронно запускаем процесс сжатия, шифрования и отправки в фоне
                        handleSendMediaMessage('video_note', urlToSend, '🎬 Видео-кружок').catch((err: any) => {
                          console.error("Ошибка фоновой отправки видео-кружка:", err);
                        });
                      }
                    }}
                    className="h-12 px-6 rounded-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-xl shadow-purple-600/30 transition-all active:scale-95 cursor-pointer"
                    title="Отправить видео-кружок"
                    data-testid="video-lock-send"
                  >
                    <span>Отправить</span>
                    <Send className="w-4 h-4 translate-x-[1px]" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Оверлей VoIP WebRTC звонка */}
      {isCallOpen && (
        <VoIPCallOverlay
          isOpen={isCallOpen}
          callId={activeCallId}
          callerName={activeCallName}
          callerAvatar={incomingCallAvatar || chats.find((c: any) => c.id === activeCallChatId || c.name === activeCallName)?.avatar}
          isOutgoing={isOutgoingCall}
          chatId={activeCallChatId}
          mediaType={incomingCallMediaType}
          onClose={() => {
            clearIncomingCallTimeout();
            try {
              voipAudio.stopRingback();
              voipAudio.stopRingtone();
            } catch (e) {}
            const closingCallId = activeCallId;
            setIsCallOpen(false);
            setActiveCallId('');
            setActiveCallName('');
            setActiveCallChatId('');
            setIsOutgoingCall(false);
            if (closingCallId) {
              callActionStateRef.current.delete(closingCallId);
            }
            if (Capacitor.isNativePlatform()) {
              VoIPNotificationPlugin.cancelIncomingCall().catch(() => {});
            }
          }}
        />
      )}

      {/* Модальное окно группового звонка Janus SFU */}
      {isGroupCallOpen && (
        <GroupCallModal
          isOpen={isGroupCallOpen}
          chatId={activeChat?.id || ''}
          callTitle={activeChat?.name || 'Групповой звонок'}
          onClose={() => setIsGroupCallOpen(false)}
          onEndCall={() => {
            setIsGroupCallOpen(false);
            setIsGroupCallActive(false);
          }}
        />
      )}

      {/* Модальное окно создания/редактирования топика форума */}
      {isTopicConstructorOpen && (
        <TopicConstructorModal
          isOpen={isTopicConstructorOpen}
          chatId={activeChat?.id || ''}
          initialTopic={editingTopic}
          onClose={() => setIsTopicConstructorOpen(false)}
          onSave={async (topicData: any) => {
            if (!activeChat) return;
            const newTopicId = editingTopic ? editingTopic.topic_id : (topics.length > 0 ? Math.max(...topics.map((t: any) => t.topic_id)) + 1 : 1);
            const newTopic: TopicItem = {
              topic_id: newTopicId,
              chat_id: activeChat.id,
              title: topicData.title,
              icon_emoji: topicData.icon_emoji,
              icon_color: topicData.icon_color,
              is_closed: topicData.is_closed,
              unread_count: 0
            };
            try {
              await storageManager.saveTopic({
                topic_id: newTopic.topic_id,
                chat_id: newTopic.chat_id,
                title: newTopic.title,
                icon_emoji: newTopic.icon_emoji,
                icon_color: newTopic.icon_color,
                is_closed: newTopic.is_closed ? 1 : 0,
                unread_count: 0
              });
            } catch (e) {}
            setTopics((prev: any) => {
              const filtered = prev.filter((t: any) => t.topic_id !== newTopicId);
              return [...filtered, newTopic];
            });
            setIsTopicConstructorOpen(false);
          }}
        />
      )}

      {/* Всплывающий интерактивный баннер входящих сообщений (In-App Notification) */}
      <InAppNotificationBanner
        notification={inAppNotification}
        onClose={() => setInAppNotification(null)}
        onOpenChat={(chatId: any) => {
          setSelectedChatId(chatId);
          setActiveTab('chats');
          setMobileView('chat');
          setInAppNotification(null);
          NotificationSyncService.clearChatNotifications(chatId);
        }}
      />

      {/* Полноэкранное окно входящего VoIP вызова (Full-Screen Incoming Call Screen) */}
      <AnimatePresence>
        {isIncomingCallOpen && !isCallOpen && (
          <motion.div
            key="incoming-call-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 sm:p-10 bg-black/95 backdrop-blur-3xl text-white select-none overflow-hidden"
          >
            {/* Анимированный фоновый градиент Obsidian Glass */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-950/40 via-black to-black opacity-95 -z-10" />

            {/* Верхний статус-блок */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col items-center gap-1.5 mt-8 sm:mt-12"
            >
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs uppercase tracking-widest text-slate-300 font-medium font-mono">
                  {incomingCallMediaType === 'video' ? '📹 Входящий видеозвонок' : '📞 Входящий аудиозвонок'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Защищенный SFU-звонок</span>
            </motion.div>

            {/* Центральная часть: Большой аватар и имя */}
            <div className="flex flex-col items-center gap-6 my-auto">
              <div className="relative flex items-center justify-center">
                {/* Пульсирующие кольца звонка */}
                <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-purple-500/20 animate-ping pointer-events-none" />
                <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border-2 border-purple-500/30 animate-pulse pointer-events-none" />
                
                <Avatar
                  avatarUrl={incomingCallAvatar || chats.find((c: any) => c.id === incomingCallChatId || c.name === incomingCallName)?.avatar}
                  name={incomingCallName}
                  size="xl"
                  className="w-28 h-28 sm:w-36 sm:h-36 border-4 border-purple-500/40 shadow-[0_0_50px_rgba(168,85,247,0.3)]"
                />
              </div>

              <div className="text-center space-y-1.5">
                <h2 className="font-bold text-2xl sm:text-4xl text-white font-outfit tracking-wide">
                  {incomingCallName || "Собеседник"}
                </h2>
                <p className="text-sm sm:text-base text-purple-300/80 font-medium animate-pulse">
                  Звонит...
                </p>
              </div>
            </div>

            {/* Нижняя панель действий: Кнопки Отклонить и Принять */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center justify-around w-full max-w-sm mb-8 sm:mb-12 gap-8"
            >
              {/* Кнопка Отклонить */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  data-testid="call-decline-btn"
                  onClick={() => {
                    if (incomingCallId) {
                      handleDeclineCall(incomingCallId, 'declined');
                    }
                  }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 hover:bg-red-500 active:scale-90 transition-all flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] cursor-pointer"
                >
                  <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </button>
                <span className="text-xs sm:text-sm text-slate-400 font-medium">Отклонить</span>
              </div>

              {/* Кнопка Принять */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  data-testid="call-accept-btn"
                  onClick={() => {
                    if (incomingCallId) {
                      handleAcceptCall(incomingCallId, incomingCallName, incomingCallChatId, incomingCallMediaType);
                    }
                  }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-90 transition-all flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.5)] cursor-pointer"
                >
                  {incomingCallMediaType === 'video' ? (
                    <Video className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  ) : (
                    <Phone className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  )}
                </button>
                <span className="text-xs sm:text-sm text-emerald-400 font-medium">Принять</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Оверлей субтитров LiveCaptions */}
      <LiveCaptions callId={activeCallId} isActive={isCallOpen} />

      {/* НИЖНИЙ НАВИГАЦИОННЫЙ ТАБ-БАР ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ */}
      {isAuthenticated && !(activeTab === 'chats' && mobileView === 'chat') && (
        <div 
          data-testid="bottom-nav-bar"
          className={`fixed bottom-0 left-0 right-0 z-30 min-h-[60px] pb-[max(env(safe-area-inset-bottom,0px),12px)] pt-2.5 ${
            theme === 'light'
              ? 'bg-[#F8F9FA]/96 border-t border-black/10 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]'
              : theme === 'coffee'
                ? 'bg-[#1A120B]/96 border-t border-[#D5CEA3]/20 shadow-[0_-4px_24px_rgba(0,0,0,0.6)]'
                : 'bg-[#0A0A0C]/96 border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.6)]'
          } backdrop-blur-2xl md:hidden items-center justify-around px-8 ${isKeyboardOpen ? 'hidden' : 'flex'}`}
        >
          {/* 1. Чаты */}
          <button
            onClick={() => {
              setActiveTab('chats');
              setMobileView('list');
            }}
            data-testid="tab-chats"
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
              activeTab === 'chats' 
                ? (theme === 'coffee' ? 'text-[#D5CEA3] font-semibold' : 'text-purple-400 font-semibold')
                : (theme === 'light' ? 'text-slate-500 hover:text-slate-900' : theme === 'coffee' ? 'text-[#9C927A] hover:text-[#E5E5CB]' : 'text-slate-400 hover:text-slate-200')
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px]">{t('chat:list.title', 'Чаты')}</span>
          </button>

          {/* 2. Pulse / Sovereign Economic Layer */}
          {showPulseTab && (
            <button
              onClick={() => {
                setActiveTab('pulse');
              }}
              data-testid="tab-pulse"
              className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
                activeTab === 'pulse' 
                  ? 'text-emerald-400 font-semibold'
                  : (theme === 'light' ? 'text-slate-500 hover:text-slate-900' : theme === 'coffee' ? 'text-[#9C927A] hover:text-[#E5E5CB]' : 'text-slate-400 hover:text-slate-200')
              }`}
            >
              <Coins className="w-5 h-5" />
              <span className="text-[10px]">{t('pulse:title', 'Pulse')}</span>
            </button>
          )}

          {/* 3. Кошелек */}
          {showWalletTab && (
            <button
              onClick={() => {
                setActiveTab('wallet');
              }}
              data-testid="tab-wallet"
              className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
                activeTab === 'wallet' 
                  ? 'text-sky-400 font-semibold'
                  : (theme === 'light' ? 'text-slate-500 hover:text-slate-900' : theme === 'coffee' ? 'text-[#9C927A] hover:text-[#E5E5CB]' : 'text-slate-400 hover:text-slate-200')
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span className="text-[10px]">{t('wallet:title', 'Кошелек')}</span>
            </button>
          )}

          {/* 4. Настройки */}
          <button
            onClick={() => {
              setActiveTab('settings');
            }}
            data-testid="tab-settings"
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
              activeTab === 'settings' 
                ? (theme === 'coffee' ? 'text-[#D5CEA3] font-semibold' : 'text-purple-400 font-semibold')
                : (theme === 'light' ? 'text-slate-500 hover:text-slate-900' : theme === 'coffee' ? 'text-[#9C927A] hover:text-[#E5E5CB]' : 'text-slate-400 hover:text-slate-200')
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">{t('settings:title', 'Настройки')}</span>
          </button>
        </div>
      )}


      {selectedPhotoUrl && (
        <SwipeablePhotoViewer src={selectedPhotoUrl} onClose={() => setSelectedPhotoUrl(null)} />
      )}
      {/* Полноэкранный обязательный оверлей обновления (Mandatory Force Update) */}
      {isForceUpdateRequired && androidUpdateData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 overflow-y-auto animate-fade-in select-none">
          <GlassCard glow glowColor="rgba(168, 85, 247, 0.2)" className="w-full max-w-md p-6 sm:p-8 flex flex-col gap-5 border border-purple-500/40 backdrop-blur-2xl bg-[#0e0c15]/95 shadow-2xl relative overflow-hidden text-center rounded-3xl">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400" />
            
            {/* Иконка статуса */}
            <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center shadow-glass-md">
              {isInstallingApk ? (
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              ) : apkDownloading ? (
                <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
              ) : apkReadyToInstall ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
              ) : apkDownloadError ? (
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              ) : (
                <Download className="w-8 h-8 text-purple-400" />
              )}
            </div>

            {/* Заголовки */}
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase tracking-wider">
                Обновление приложения
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 mt-2 font-outfit">
                Gossip v{androidUpdateData.version}
              </h2>
              <p className="text-xs text-slate-400">
                Установлена: <span className="font-mono text-slate-300">v{realInstalledVersion}</span>
                {apkTotalBytes > 0 && (
                  <>
                    {' • '}Размер: <span className="font-mono text-emerald-400 font-bold">{((apkTotalBytes) / (1024 * 1024)).toFixed(1)} МБ</span>
                  </>
                )}
              </p>
            </div>

            {/* Описание релиза */}
            {androidUpdateData.releaseNotes && (
              <div className="bg-black/40 p-3.5 rounded-2xl text-left border border-white/10 space-y-1 max-h-32 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Что нового:</p>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{androidUpdateData.releaseNotes}</p>
              </div>
            )}

            {/* Блок настройки разрешений на установку */}
            {apkPermissionRequested && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-left text-xs text-amber-200 space-y-1 animate-fade-in">
                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Требуется системное разрешение</span>
                </p>
                <p className="text-[11px] leading-relaxed text-amber-200/90">
                  В открывшихся настройках Android включите переключатель <strong>«Разрешить для этого источника»</strong>, затем вернитесь сюда и нажмите <strong>«Установить обновление»</strong>.
                </p>
              </div>
            )}

            {/* Прогресс-бар / Статус */}
            <div className="space-y-2 text-left bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              <div className="flex justify-between text-xs font-semibold text-slate-200">
                <span className="truncate">
                  {isInstallingApk && 'Запуск системного установщика...'}
                  {!isInstallingApk && apkDownloading && (apkTotalBytes > 0
                    ? `Загрузка: ${((apkDownloadedBytes || 0) / (1024 * 1024)).toFixed(1)} / ${((apkTotalBytes) / (1024 * 1024)).toFixed(1)} МБ`
                    : `Загрузка: ${((apkDownloadedBytes || 0) / (1024 * 1024)).toFixed(1)} МБ`)}
                  {!isInstallingApk && apkReadyToInstall && 'Файл полностью скачан и проверен'}
                  {!isInstallingApk && apkDownloadError && 'Сбой загрузки пакета'}
                  {!isInstallingApk && !apkDownloading && !apkReadyToInstall && !apkDownloadError && 'Подготовка к установке...'}
                </span>
                <span className="font-mono text-purple-400 shrink-0">{apkDownloadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
                <div 
                  className={`h-full transition-all duration-300 ${
                    apkDownloadError 
                      ? 'bg-red-500' 
                      : apkReadyToInstall 
                        ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' 
                        : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400'
                  }`}
                  style={{ width: `${apkDownloadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center pt-0.5">
                {apkDownloading 
                  ? 'Пожалуйста, не закрывайте приложение до завершения загрузки' 
                  : apkReadyToInstall 
                    ? 'Нажмите кнопку ниже для запуска стандартного установщика Android' 
                    : ''}
              </p>
            </div>

            {/* Ошибка, если возникла */}
            {apkDownloadError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-left text-xs text-red-300">
                {apkDownloadError}
              </div>
            )}

            {/* Кнопки действий */}
            <div className="pt-1 flex flex-col gap-2.5">
              {apkReadyToInstall ? (
                <GlassButton
                  variant="accent"
                  size="lg"
                  fullWidth
                  disabled={isInstallingApk}
                  onClick={installApk}
                  className="py-4 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  {isInstallingApk ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Открытие установщика...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Установить обновление</span>
                    </>
                  )}
                </GlassButton>
              ) : apkDownloadError ? (
                <GlassButton
                  variant="accent"
                  size="lg"
                  fullWidth
                  onClick={() => startBackgroundApkDownload(androidUpdateData)}
                  className="py-3.5 text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Повторить загрузку</span>
                </GlassButton>
              ) : (
                <div className="text-xs text-slate-300 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center gap-2 py-3">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Идет автоматическое скачивание пакета...</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.open('https://skuf-net.ru/static/media/gossip.apk', '_system');
                    } catch (e) {
                      window.location.href = 'https://skuf-net.ru/static/media/gossip.apk';
                    }
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Скачать в браузере</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (androidUpdateData?.version) {
                      localStorage.setItem(`gossip_dismiss_update_${androidUpdateData.version}`, String(Date.now()));
                    }
                    setIsForceUpdateRequired(false);
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  Позже
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}


      {/* Оверлей ввода PIN-кода (R1) */}
      {showPinOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto max-h-[100dvh] py-8 animate-fade-in">
          <GlassCard glow className="w-full max-w-md p-8 flex flex-col gap-6 backdrop-blur-2xl bg-white/[0.02] border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
            
            <div className="text-center">
              <h2 className="text-xl font-bold tracking-wide bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                {pinOverlayMode === 'create' ? `Создание PIN-кода для ${pinOverlayUsername}` : `Разблокировка для ${pinOverlayUsername}`}
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {pinOverlayMode === 'create' 
                  ? 'Придумайте PIN-код для защиты и шифрования вашей локальной базы данных SQLCipher.' 
                  : 'Введите ваш PIN-код для расшифровки локальной базы данных.'}
              </p>
            </div>

            {pinError && (
              <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-xs text-center">
                {pinError}
              </div>
            )}

            {showPinResetConfirm && (
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex flex-col gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-rose-200">Подтверждение сброса локальных данных</h3>
                    <p className="text-[11px] text-rose-300/90 leading-relaxed mt-1">
                      Сброс базы данных удалит локальную историю сообщений и криптографические ключи на этом устройстве. Данные на сервере сохранятся, но непрочитанные E2EE-сообщения могут стать недоступны.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClearLocalStorageAndExit}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Да, сбросить данные
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPinResetConfirm(false)}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <GlassInput
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={8}
                placeholder="Введите PIN-код..."
                label="PIN-код"
                value={pinInput}
                onChange={(e: any) => setPinInput(e.target.value.replace(/\D/g, ''))}
                icon={<Lock className="w-4 h-4 text-purple-400" />}
                autoFocus
              />
              
              <div className="pt-2">
                <GlassButton
                  type="submit"
                  variant="accent"
                  disabled={isAuthLoading || pinInput.length < 4}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 shadow-glass-md border border-purple-500/30 hover:shadow-purple-500/10 transition-all font-semibold disabled:opacity-50"
                >
                  {isAuthLoading ? (
                    <RefreshCw className="w-4 h-4 text-purple-200 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-purple-200" />
                  )}
                  {pinOverlayMode === 'create' ? 'Создать и сохранить' : 'Разблокировать'}
                </GlassButton>

                <div className="flex flex-col gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleCancelPinAndExitToLanding}
                    className="w-full py-2.5 rounded-xl text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors font-medium text-center border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                    <span>Вернуться на главную (лендинг)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (pinOverlayMode === 'create') {
                        handleClearLocalStorageAndExit();
                      } else {
                        setShowPinResetConfirm(true);
                      }
                    }}
                    className="w-full py-1.5 text-[11px] text-rose-400/80 hover:text-rose-300 transition-colors font-medium text-center underline bg-transparent border-none cursor-pointer"
                  >
                    {pinOverlayMode === 'create' ? 'Сбросить локальные данные и войти заново' : 'Забыли PIN-код? Сбросить локальный кэш'}
                  </button>
                </div>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Красивый Glassmorphism Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[110] max-w-sm animate-fade-in">
          <GlassCard glow className={`p-4 flex items-center justify-center border shadow-glass-lg backdrop-blur-2xl ${
            toast.type === 'error' ? 'border-red-500/30' :
            toast.type === 'success' ? 'border-emerald-500/30' :
            'border-blue-500/30'
          }`}>
            <div className="text-center w-full">
              <p className="text-xs font-semibold text-slate-100 font-outfit">{toast.message}</p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Лаконичный плавающий баннер обновления для Web / PWA в браузере */}
      {updateBannerData && !updateBannerData.isDismissed && !(typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.getPlatform() === 'android') && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[calc(100%-2rem)] animate-slide-down">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-purple-500/40 shadow-2xl flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100 truncate font-outfit">
                    Gossip v{updateBannerData.version}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    NEW
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {updateBannerData.releaseNotes ? updateBannerData.releaseNotes.slice(0, 50) + '...' : 'Доступна новая версия веб-приложения'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then((regs: any) => {
                      regs.forEach((r: any) => {
                        if (r.waiting) {
                          r.waiting.postMessage({ type: 'SKIP_WAITING' });
                        }
                      });
                    }).catch(() => {});
                  }
                  window.location.reload();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 transition-all cursor-pointer flex items-center gap-1 font-outfit"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Обновить</span>
              </button>

              <button
                type="button"
                onClick={() => setUpdateBannerData((prev: any) => prev ? { ...prev, isDismissed: true } : null)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Контекстное меню сообщения */}
      {activeReactionMessageId && reactionMenuCoords && (
        <div 
          className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" 
          onClick={() => {
            setActiveReactionMessageId(null);
            setReactionMenuCoords(null);
            setShowDeleteConfirm(false);
          }}
        >
          {(() => {
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
            const menuHeight = showDeleteConfirm ? 420 : 340;
            const safeBottom = 85; // Безопасный отступ над системной навигацией Android (3 кнопки) и жестовой полосой
            const calculatedTop = isMobile
              ? Math.max(16, Math.min(reactionMenuCoords.y - 100, window.innerHeight - menuHeight - safeBottom))
              : Math.max(16, Math.min(reactionMenuCoords.y, window.innerHeight - menuHeight - 20));
            const calculatedLeft = isMobile
              ? Math.max(16, Math.min(reactionMenuCoords.x - 20, window.innerWidth - 250))
              : Math.max(16, Math.min(reactionMenuCoords.x, window.innerWidth - 240));

            const accentIconColor = 
              theme === 'coffee'
                ? 'text-[#D5CEA3]'
                : theme === 'light'
                ? 'text-blue-600'
                : 'text-purple-400';

            const itemHoverClass = 
              theme === 'coffee'
                ? 'hover:bg-[#D5CEA3]/15 text-[#E5E0C2]'
                : theme === 'light'
                ? 'hover:bg-slate-100 text-slate-800'
                : 'hover:bg-white/10 text-slate-200';

            return (
              <div 
                className={`absolute backdrop-blur-2xl rounded-2xl p-2.5 flex flex-col gap-1.5 shadow-2xl min-w-[220px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-110px)] overflow-y-auto ${
                  theme === 'coffee'
                    ? 'bg-[#1F140E]/95 border border-[#D5CEA3]/30 text-[#E5E0C2]'
                    : theme === 'light'
                    ? 'bg-white/95 border border-slate-200 text-slate-800 shadow-xl'
                    : 'bg-neutral-950/90 border border-white/10 text-slate-200'
                }`}
                style={{ 
                  left: `${calculatedLeft}px`, 
                  top: `${calculatedTop}px`,
                  paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom, 0px))'
                }}
                onClick={(e: any) => e.stopPropagation()}
              >
                {/* Ряд реакций */}
                <div className={`flex justify-between border-b pb-2 px-1 mb-1 gap-1 overflow-x-auto ${
                  theme === 'coffee'
                    ? 'border-[#D5CEA3]/20'
                    : theme === 'light'
                    ? 'border-slate-200'
                    : 'border-white/10'
                }`}>
                  {(isPremium ? ['👍', '❤️', '🔥', '😂', '😮', '👏', '💎', '🚀', '⚡', '👑'] : ['👍', '❤️', '🔥', '😂', '😮', '👏']).map((react: any) => (
                    <button
                      key={react}
                      type="button"
                      onClick={(e: any) => handleApplyReaction(activeReactionMessageId, react, e)}
                      className="text-xl hover:scale-130 transition-transform duration-100 p-0.5 flex-shrink-0 cursor-pointer"
                      data-testid={`reaction-${react}`}
                    >
                      {react}
                    </button>
                  ))}
                </div>

                {/* Вертикальный список действий */}
                <div className="flex flex-col text-xs gap-0.5">
                  <button 
                    onClick={() => handleActionReply(activeReactionMessageId)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left w-full cursor-pointer ${itemHoverClass}`}
                  >
                    <Reply className={`w-4 h-4 ${accentIconColor}`} />
                    <span>Ответить</span>
                  </button>

                  {/* Закрепить / Открепить */}
                  {(() => {
                    const isPinned = pinnedMessageMap[activeChat?.id || '']?.includes(activeReactionMessageId);
                    return (
                      <button 
                        onClick={() => isPinned ? handleActionUnpin(activeReactionMessageId) : handleActionPin(activeReactionMessageId)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left w-full cursor-pointer ${itemHoverClass}`}
                      >
                        <Pin className={`w-4 h-4 ${accentIconColor}`} />
                        <span>{isPinned ? 'Открепить' : 'Закрепить'}</span>
                      </button>
                    );
                  })()}

                  {(() => {
                    const msg = activeChat?.messages.find((m: any) => m.id === activeReactionMessageId);
                    if (msg && msg.sender === 'me' && msg.type === 'text') {
                      const isRecent = (Date.now() - (msg.timestamp || Date.now())) < 172800000;
                      if (isRecent) {
                        return (
                          <button 
                            onClick={() => handleActionEdit(msg)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left w-full cursor-pointer ${itemHoverClass}`}
                          >
                            <Edit2 className={`w-4 h-4 ${accentIconColor}`} />
                            <span>Редактировать</span>
                          </button>
                        );
                      }
                    }
                    return null;
                  })()}

                  {(() => {
                    const msg = activeChat?.messages.find((m: any) => m.id === activeReactionMessageId);
                    if (msg && msg.type === 'text') {
                      return (
                        <button 
                          onClick={() => handleActionCopy(msg.text)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left w-full cursor-pointer ${itemHoverClass}`}
                        >
                          <Copy className={`w-4 h-4 ${accentIconColor}`} />
                          <span>Копировать</span>
                        </button>
                      );
                    }
                    return null;
                  })()}

                  <button
                    onClick={() => {
                      // R4 (M4.5): режим множественного выбора для массовой пересылки
                      if (activeReactionMessageId && !activeChat?.messages.find((m: any) => m.id === activeReactionMessageId)?.isService) {
                        setSelectedMessageIds(new Set([activeReactionMessageId]));
                      }
                      setActiveReactionMessageId(null);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left w-full cursor-pointer ${itemHoverClass}`}
                  >
                    <CheckSquare className={`w-4 h-4 ${accentIconColor}`} />
                    <span>Выбрать для пересылки</span>
                  </button>

                  <button
                    onClick={() => handleActionForward(activeReactionMessageId)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left w-full cursor-pointer ${itemHoverClass}`}
                  >
                    <Share2 className={`w-4 h-4 ${accentIconColor}`} />
                    <span>Переслать</span>
                  </button>

                  {/* UX-1: Повторная отправка для неотправленных сообщений */}
                  {(() => {
                    const msg = activeChat?.messages.find((m: any) => m.id === activeReactionMessageId);
                    if (msg && msg.sender === 'me' && (msg.status === 'pending' || msg.status === 'failed')) {
                      return (
                        <button
                          onClick={() => handleActionRetry(msg)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left w-full cursor-pointer ${itemHoverClass}`}
                          data-testid="retry-message-action"
                        >
                          <RefreshCw className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400 font-medium">Отправить повторно</span>
                        </button>
                      );
                    }
                    return null;
                  })()}

                  <div className={`border-t my-1 ${
                    theme === 'coffee' ? 'border-[#D5CEA3]/20' : theme === 'light' ? 'border-slate-200' : 'border-white/5'
                  }`} />

                  {!showDeleteConfirm ? (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-red-500/10 text-red-400 rounded-xl transition-colors text-left w-full cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Удалить</span>
                    </button>
                  ) : (
                    <div className={`flex flex-col gap-1 px-1.5 py-1.5 rounded-xl border ${
                      theme === 'coffee'
                        ? 'bg-red-950/30 border-red-800/40'
                        : theme === 'light'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-red-950/20 border-red-500/10'
                    }`}>
                      <span className={`text-[10px] px-2 py-0.5 block font-semibold ${
                        theme === 'light' ? 'text-red-700' : 'text-red-300'
                      }`}>
                        Удалить сообщение?
                      </span>
                      <button 
                        onClick={() => handleActionDelete(activeReactionMessageId, false)}
                        className="flex items-center gap-3 px-2.5 py-2 hover:bg-red-500/20 text-red-400 rounded-lg text-[11px] font-medium transition-colors text-left w-full cursor-pointer"
                      >
                        <span>Только у себя</span>
                      </button>
                      {(() => {
                        const msg = activeChat?.messages.find((m: any) => m.id === activeReactionMessageId);
                        if (msg && msg.sender === 'me') {
                          const isRecent = (Date.now() - (msg.timestamp || Date.now())) < 172800000;
                          if (isRecent) {
                            return (
                              <button 
                                onClick={() => handleActionDelete(activeReactionMessageId, true)}
                                className="flex items-center gap-3 px-2.5 py-2 hover:bg-red-500/20 text-red-400 rounded-lg text-[11px] font-medium transition-colors text-left w-full cursor-pointer"
                              >
                                <span>У всех участников</span>
                              </button>
                            );
                          }
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Модальное окно пересылки */}
      {isForwardModalOpen && (
        <GlassModal
          isOpen={isForwardModalOpen}
          onClose={() => {
            setIsForwardModalOpen(false);
            setForwardingMessageId(null);
          }}
          title="Переслать сообщение"
        >
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {chats.map((chat: any) => (
              <button
                key={chat.id}
                onClick={() => handleForwardMessage(chat.id)}
                className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-colors text-left w-full text-slate-100 border border-white/5 min-w-0 active:scale-[0.99]"
              >
                <Avatar
                  avatarUrl={chat.avatar}
                  name={chat.name}
                  isGroup={chat.isGroup}
                  size="sm"
                  className="flex-shrink-0"
                />
                <div className="flex flex-col min-w-0 flex-grow">
                  <span className="font-semibold text-xs truncate">{chat.name}</span>
                  <span className="text-[10px] text-slate-400 truncate">{formatChatPreview(chat.lastMessage, chat.messages)}</span>
                </div>
              </button>
            ))}
          </div>
        </GlassModal>
      )}

      {/* Модальное окно подтверждения удаления чата */}
      {isDeleteChatModalOpen && (chatToDelete || activeChat) && (
        <GlassModal
          isOpen={isDeleteChatModalOpen}
          onClose={() => {
            setIsDeleteChatModalOpen(false);
            setChatToDelete(null);
          }}
          title="Удаление чата"
        >
          <div className="space-y-4 text-sm leading-relaxed p-1">
            <p className="text-slate-300">
              Вы действительно хотите удалить чат с пользователем{' '}
              <strong className="text-purple-400">{(chatToDelete || activeChat).name}</strong> и всю историю переписки?
            </p>
            <p className="text-xs text-red-400 font-semibold">
              ⚠️ Это действие безвозвратно удалит все сообщения с вашего устройства.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsDeleteChatModalOpen(false);
                  setChatToDelete(null);
                }}
                className="px-4"
              >
                Отмена
              </GlassButton>
              <GlassButton
                variant="primary"
                size="sm"
                onClick={handleDeleteChat}
                className="px-4 bg-red-600/30 border border-red-500/30 hover:bg-red-600/50 text-red-200"
              >
                Удалить
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      )}

      {/* МОДАЛЬНОЕ ОКНО КАДРИРОВАНИЯ И РЕДАКТИРОВАНИЯ АВАТАРА (TELEGRAM-STYLE) */}
      <AvatarCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => {
          setCropModalOpen(false);
          setCropImageSrc(null);
        }}
        onCropComplete={handleCropCompleted}
        onImageChange={(newSrc: any) => setCropImageSrc(newSrc)}
        title={cropTarget === 'profile' ? 'Редактирование фото профиля' : 'Редактирование фото группы'}
        theme={theme}
      />

      {/* МЕНЮ ДЕЙСТВИЙ С АВАТАРОМ ПРОФИЛЯ */}
      <AvatarActionSheetModal
        isOpen={isMyAvatarActionSheetOpen}
        avatarUrl={profileAvatarUrl}
        title="Фотография профиля"
        onClose={() => setIsMyAvatarActionSheetOpen(false)}
        onView={() => {
          setAvatarViewerState({
            isOpen: true,
            avatarUrl: profileAvatarUrl,
            name: localStorage.getItem("username") || "Пользователь",
            subtitle: "Ваш профиль",
            isEditable: true,
            onEdit: handleEditCurrentProfileAvatar,
          });
        }}
        onEditCurrent={handleEditCurrentProfileAvatar}
        onChooseNew={() => avatarInputRef.current?.click()}
        onDelete={handleDeleteProfileAvatar}
        theme={theme}
      />

      {/* МЕНЮ ДЕЙСТВИЙ С АВАТАРОМ ГРУППЫ */}
      <AvatarActionSheetModal
        isOpen={isGroupAvatarActionSheetOpen}
        avatarUrl={activeChat?.avatar}
        title="Фотография группы"
        onClose={() => setIsGroupAvatarActionSheetOpen(false)}
        onView={() => {
          if (!activeChat) return;
          setAvatarViewerState({
            isOpen: true,
            avatarUrl: activeChat.avatar,
            name: activeChat.name,
            subtitle: "Групповой чат",
            isGroup: true,
            isEditable: true,
            onEdit: handleEditCurrentGroupAvatar,
          });
        }}
        onEditCurrent={handleEditCurrentGroupAvatar}
        onChooseNew={() => groupAvatarInputRef.current?.click()}
        onDelete={handleDeleteGroupAvatar}
        theme={theme}
      />

      {/* ПОЛНОЭКРАННЫЙ TELEGRAM-STYLE ПРОСМОТР АВАТАРА */}
      <AvatarViewerModal
        isOpen={avatarViewerState.isOpen}
        avatarUrl={avatarViewerState.avatarUrl}
        name={avatarViewerState.name}
        subtitle={avatarViewerState.subtitle}
        isGroup={avatarViewerState.isGroup}
        isEditable={avatarViewerState.isEditable}
        onClose={() => setAvatarViewerState((prev: any) => ({ ...prev, isOpen: false }))}
        onEdit={avatarViewerState.onEdit}
      />

      {/* ПОЛНОЭКРАННАЯ ГАЛЕРЕЯ МЕДИАФАЙЛОВ ЧАТА */}
      <MediaGalleryViewerModal
        isOpen={mediaGalleryState.isOpen}
        items={mediaGalleryState.items}
        initialIndex={mediaGalleryState.initialIndex}
        onClose={() => setMediaGalleryState((prev: any) => ({ ...prev, isOpen: false }))}
        theme={theme}
      />

      {/* ШТОРКА ПРОФИЛЯ И ОБЩИХ МАТЕРИАЛОВ ЧАТА */}
      {activeChat && (
        <SharedMediaDrawerModal
          isOpen={isSharedMediaDrawerOpen}
          onClose={() => setIsSharedMediaDrawerOpen(false)}
          chatName={activeChat.name}
          chatAvatar={activeChat.avatar}
          isGroup={activeChat.isGroup}
          online={activeChat.online}
          messages={activeChat.messages}
          onOpenMedia={(item: any) => {
            const galleryItems: MediaGalleryItem[] = activeChat.messages
              .filter((m: any) => m.type === 'photo' || m.type === 'video' || m.type === 'video_note')
              .map((m: any) => ({
                id: m.id,
                type: m.type as any,
                url: m.mediaUrl || '',
                senderName: m.sender === 'me' ? 'Вы' : formatUserDisplayName(m.sender, m.senderName, activeChat.name),
                time: m.time,
                text: m.text,
                mediaKey: m.mediaKey,
                mediaIv: m.mediaIv,
              }));
            const idx = Math.max(0, galleryItems.findIndex((g: any) => g.id === item.id));
            setMediaGalleryState({
              isOpen: true,
              items: galleryItems,
              initialIndex: idx,
            });
          }}
          onJumpToMessage={(id: any) => {
            setIsSharedMediaDrawerOpen(false);
            setHighlightMessageId(id);
            virtualMessageListRef.current?.scrollToMessage(id);
          }}
          isMuted={mutedChatIds.includes(activeChat.id)}
          onToggleMute={() => handleToggleMuteChat(activeChat.id)}
          theme={theme}
        />
      )}

      {/* МОДАЛЬНОЕ ОКНО GOSSIP PREMIUM */}
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        isPremium={isPremium}
        onPaymentSuccess={handleRefreshPremium}
        onOpenSecurityArsenal={() => ctx.setIsPremiumSecurityModalOpen(true)}
        theme={theme}
      />

      {/* МОДАЛЬНОЕ ОКНО СПЕЦ-АРСЕНАЛА GOSSIP PRO (Ложный PIN, Голос DSP, Периметр, Burner) */}
      <PremiumSecurityModal
        isOpen={Boolean(ctx.isPremiumSecurityModalOpen)}
        onClose={() => ctx.setIsPremiumSecurityModalOpen(false)}
        isPremium={isPremium}
        username={ctx.username}
        voicePreset={ctx.voiceChangerPreset || 'original'}
        onSelectVoicePreset={ctx.handleSelectVoicePreset}
        onOpenPremiumPaywall={() => {
          ctx.setIsPremiumSecurityModalOpen(false);
          setIsPremiumModalOpen(true);
        }}
        onOpenBurnerChat={ctx.handleOpenBurnerChat}
        onToast={ctx.showToast}
      />

      {/* МОДАЛЬНОЕ ОКНО "КОНСОЛЬ АДМИНИСТРАТОРА (ZERO-KNOWLEDGE IAM)" */}
      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        theme={theme}
        username={ctx.username}
      />

      {/* МОДАЛЬНОЕ ОКНО "ЗАЯВКА НА ENTERPRISE ON-PREMISE ДЕМО" */}
      <EnterpriseDemoModal
        isOpen={isEnterpriseDemoModalOpen}
        onClose={() => setIsEnterpriseDemoModalOpen(false)}
        theme={theme}
      />

      {/* МОДАЛЬНОЕ ОКНО КРИТИЧЕСКОГО СИСТЕМНОГО ОПОВЕЩЕНИЯ АДМИНИСТРАТОРА */}
      {systemAlertModal && (
        <GlassModal
          isOpen={Boolean(systemAlertModal)}
          onClose={() => setSystemAlertModal(null)}
          title={systemAlertModal.title}
          zIndexClass="z-[110]"
        >
          <div className="space-y-4 p-2">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
              <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold">{systemAlertModal.title}</h4>
                <p className="text-[10px] text-rose-300/80">Официальное системное оповещение службы управления Gossip</p>
              </div>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-xs text-slate-200 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
              {systemAlertModal.message}
            </div>
            <div className="flex justify-end pt-2">
              <GlassButton
                variant="primary"
                size="md"
                onClick={() => setSystemAlertModal(null)}
                className="px-6 bg-purple-600 hover:bg-purple-500 text-white font-bold"
              >
                Ознакомлен
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      )}

      {/* МОДАЛЬНОЕ ОКНО "ПОРТАЛ УПРАВЛЕНИЯ БОТАМИ И ИНТЕГРАЦИЯМИ (DEVELOPER HUB)" */}
      <BotManagementModal
        isOpen={isBotManagementOpen}
        onClose={() => {
          setIsBotManagementOpen(false);
          fetchMyBotsCount();
        }}
        theme={theme}
        showToast={showToast}
        onOpenBotChat={async (bot) => {
          const botChatId =
            bot.user_uuid ||
            (bot.user_id
              ? `00000000-0000-0000-0000-${Number(bot.user_id).toString(16).padStart(12, '0')}`
              : '');
          if (!botChatId) return;
          try {
            localStorage.setItem('bot_chat_' + botChatId, '1');
            if (bot.name) localStorage.setItem(`${botChatId}_name`, bot.name);
          } catch {}

          const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          try {
            await storageManager.execute(
              `INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts, type)
               VALUES (?, ?, ?, ?, ?, 0, 0, 1, 0, 'bot')
               ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, type = 'bot', online = 1;`,
              [
                botChatId,
                bot.name || `@${bot.username}`,
                bot.avatar_url || '🤖',
                bot.description || '🤖 Нажмите /start для запуска бота',
                nowTime,
              ]
            );
          } catch {}

          const existingChat = Array.isArray(chats) ? chats.find((c: any) => c.id === botChatId) : null;
          const hadMessages = Boolean(existingChat && Array.isArray(existingChat.messages) && existingChat.messages.length > 0);

          setChats((prevChats: any[]) => {
            const idx = prevChats.findIndex((c: any) => c.id === botChatId);
            if (idx !== -1) {
              const updated = [...prevChats];
              updated[idx] = {
                ...updated[idx],
                name: bot.name || updated[idx].name,
                username: bot.username || updated[idx].username,
                avatar: bot.avatar_url || updated[idx].avatar || '🤖',
                isBot: true,
                type: 'bot',
                online: true,
              };
              return updated;
            }
            return [
              {
                id: botChatId,
                name: bot.name || `@${bot.username}`,
                username: bot.username,
                avatar: bot.avatar_url || '🤖',
                lastMessage: bot.description || '🤖 Нажмите /start для запуска бота',
                time: nowTime,
                unread: 0,
                isGroup: false,
                isBot: true,
                type: 'bot',
                online: true,
                messages: [],
              },
              ...prevChats,
            ];
          });

          setSelectedChatId(botChatId);
          setActiveTab('chats');
          setMobileView('chat');
          setIsBotManagementOpen(false);
          fetchMyBotsCount();

          if (!hadMessages) {
            try {
              await tdlib.send('send_message', {
                chatId: botChatId,
                text: '/start',
                isBot: true,
              });
            } catch {}
          }
        }}
      />

      {/* МОДАЛЬНЫЕ ОКНА TON ECOSYSTEM: ХАБ КОШЕЛЬКА И IN-CHAT ПЕРЕВОДЫ */}
      <TonWalletHubModal
        isOpen={isTonWalletModalOpen}
        onClose={() => setIsTonWalletModalOpen(false)}
        theme={theme}
      />

      <InChatTransferModal
        isOpen={isInChatTransferOpen}
        onClose={() => setIsInChatTransferOpen(false)}
        chatId={activeChat?.id || ''}
        recipientId={activeChat?.id || ''}
        recipientName={formatUserDisplayName(activeChat?.id, activeChat?.name, null)}
        senderId="me"
        theme={theme}
        onSuccessTransfer={async (receipt: any) => {
          const tempId = `temp-${Date.now()}`;
          const text = `💎 Перевод ${receipt.amountTon} ${receipt.currency}`;
          const tempMsg: Message = {
            id: tempId,
            sender: 'me',
            senderName: 'Я',
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            status: 'sent',
            type: 'ton_transfer' as any,
            transferReceipt: receipt,
          };
          if (activeChat) {
            setChats((prevChats: any) => prevChats.map((chat: any) => {
              if (chat.id === activeChat.id) {
                return {
                  ...chat,
                  lastMessage: text,
                  time: tempMsg.time,
                  messages: [...chat.messages, tempMsg]
                };
              }
              return chat;
            }));
          }
          try {
            await tdlib.send("send_message", {
              chatId: activeChat?.id,
              text,
              transferReceipt: receipt
            });
          } catch (e) {}
        }}
      />

      {/* МОДАЛЬНОЕ ОКНО ИНФОРМАЦИИ О КАНАЛЕ (R2) */}
      {activeChat && activeChat.type === 'channel' && (
        <ChannelInfo
          isOpen={isChannelInfoOpen}
          onClose={() => setIsChannelInfoOpen(false)}
          chatId={activeChat.id}
          title={activeChat.name}
          username={activeChat.username}
          description={activeChat.description}
          avatarUrl={activeChat.avatar}
          subscribersCount={activeChat.subscribers_count || activeChat.members_count || 1}
          currentUserRole={(activeChat.role as any) || 'subscriber'}
          isMuted={Boolean(activeChat.muted)}
          onToggleMute={handleToggleChannelMute}
          theme={theme}
        />
      )}

      {/* МОДАЛЬНОЕ ОКНО QR-ВЕРИФИКАЦИИ И SAFETY NUMBERS (R3, M3.2) */}
      {activeChat && !activeChat.isGroup && activeChat.type !== 'channel' && isSafetyModalOpen && (
        <SafetyNumberModal
          chatId={activeChat.id}
          peerId={activeChat.id}
          peerIdentityKeyHex={safetyPeerIdentityKey}
          peerName={activeChat.name}
          onClose={() => {
            setIsSafetyModalOpen(false);
            setSafetyPeerIdentityKey(null);
          }}
          onVerifiedChange={(v: any) => setChatVerified(v)}
        />
      )}

      {/* МОДАЛЬНОЕ ОКНО ОТЛОЖЕННЫХ СООБЩЕНИЙ (R3, M2.5) */}
      {isScheduledModalOpen && (
        <ScheduledMessagesModal onClose={() => setIsScheduledModalOpen(false)} />
      )}

      {/* МОДАЛЬНОЕ ОКНО МАССОВОЙ ПЕРЕСЫЛКИ (R4, M4.5) — только в режиме выбора;
          одиночная пересылка использует легаси-модалку выше */}
      {isForwardModalOpen && selectedMessageIds.size > 0 && activeChat && (
        <ForwardModal
          chats={chats.filter((c: any) => c.id !== activeChat.id)}
          selectedCount={selectedMessageIds.size}
          isSource152Fz={isChatIn152FzContour(activeChat.id)}
          onClose={() => setIsForwardModalOpen(false)}
          onForward={handleForwardSelected}
        />
      )}


      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ОПРОСА (R2) */}
      <PollConstructorModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onCreatePoll={handleCreatePoll}
        isGroupChat={Boolean(activeChat?.isGroup)}
        isChannel={activeChat?.type === 'channel'}
        theme={theme}
      />

      {/* ОНБОРДИНГ И ПОДСКАЗКА ПО УСТАНОВКЕ PWA НА IPHONE (A2HS) */}
      <IosInstallPromptModal theme={theme} />
    </>
  );
}
