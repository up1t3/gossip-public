import { Globe, Smartphone, Laptop, Plus, ShieldCheck, Trash2, Edit2, Folder, Check } from 'lucide-react';
import { GlassButton, GlassInput, GlassModal } from '../../ui';
import { LanguageSelectorModal } from '../../components/ui/LanguageSelectorModal';
import 'katex/dist/katex.min.css';
import { Avatar } from '../../components/ui/Avatar';
import { NetworkShieldModal } from '../../components/network/NetworkShieldModal';
import { storageManager } from '../../core/storage/storage-manager';
import { type Chat } from './appHelpers';

export interface AppSubComponentProps { ctx: Record<string, any>; }

export function AppInPaneModals({ ctx }: AppSubComponentProps) {
  const {
    activeChat,
    addMemberInput,
    addMemberSearchResults,
    chats,
    currentAppVersion,
    folderEditMode,
    folderMembers,
    folders,
    groupAvatarInputRef,
    groupInfoEpoch,
    groupInfoMembers,
    groupMemberInput,
    groupMemberSearchResults,
    handleAddGroupMember,
    handleAddMemberInputChange,
    handleAddMemberToGroup,
    handleCreateChat,
    handleDeleteFolder,
    handleEvictMember,
    handleGroupAvatarChange,
    handleGroupMemberInputChange,
    handleOpenCreateFolder,
    handleOpenEditFolder,
    handleSaveFolder,
    handleSaveGroupName,
    handleToggleChat152Fz,
    isChatIn152FzContour,
    isChatPrivacyModalOpen,
    isEditingGroupName,
    isFoldersModalOpen,
    isGroupAvatarUploading,
    isGroupManageModalOpen,
    isInfoModalOpen,
    isLanguageModalOpen,
    isNetworkModalOpen,
    isNewChatModalOpen,
    isSearchingAddMember,
    isSearchingMembers,
    newChannelDescription,
    newChannelUsername,
    newChatName,
    newChatType,
    newFolderChats,
    newFolderIcon,
    newFolderIs152Fz,
    newFolderName,
    newGroupName,
    selectedGroupMembers,
    setAddMemberInput,
    setAddMemberSearchResults,
    setChats,
    setFolderEditMode,
    setGroupMemberInput,
    setGroupMemberSearchResults,
    setIsChatPrivacyModalOpen,
    setIsEditingGroupName,
    setIsFoldersModalOpen,
    setIsGroupAvatarActionSheetOpen,
    setIsGroupManageModalOpen,
    setIsInfoModalOpen,
    setIsLanguageModalOpen,
    setIsNetworkModalOpen,
    setIsNewChatModalOpen,
    setNewChannelDescription,
    setNewChannelUsername,
    setNewChatIsGroup,
    setNewChatName,
    setNewChatType,
    setNewFolderChats,
    setNewFolderIcon,
    setNewFolderIs152Fz,
    setNewFolderName,
    setNewGroupName,
    setSelectedChatId,
    setSelectedGroupMembers,
    showToast,
    t,
    theme
  } = ctx;
  return (
    <>
      {/* МОДАЛЬНОЕ ОКНО "ПАПКИ ЧАТОВ" */}
      <GlassModal
        isOpen={isFoldersModalOpen}
        onClose={() => setIsFoldersModalOpen(false)}
        title={
          folderEditMode === 'list'
            ? t('chat:folders.modalTitle', 'Папки чатов')
            : folderEditMode === 'create'
            ? t('chat:folders.modalTitleCreate', 'Создать папку')
            : t('chat:folders.modalTitleEdit', 'Редактировать папку')
        }
        footer={
          folderEditMode === 'list' ? (
            <div className="flex gap-2 w-full justify-between">
              <GlassButton variant="secondary" onClick={() => setIsFoldersModalOpen(false)}>
                {t('common:actions.close', 'Закрыть')}
              </GlassButton>
              <GlassButton variant="primary" onClick={handleOpenCreateFolder} className="flex items-center gap-1">
                <Plus className="w-4 h-4" /> {t('chat:folders.createFolder', 'Создать')}
              </GlassButton>
            </div>
          ) : (
            <div className="flex gap-2 w-full justify-end">
              <GlassButton variant="secondary" onClick={() => setFolderEditMode('list')}>
                {t('common:actions.back', 'Назад')}
              </GlassButton>
              <GlassButton variant="primary" onClick={handleSaveFolder}>
                {t('common:actions.save', 'Сохранить')}
              </GlassButton>
            </div>
          )
        }
      >
        {folderEditMode === 'list' ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-xs text-slate-400">
              {t('chat:folders.emptyDesc', 'Группируйте чаты по разным темам для быстрого доступа. Созданные папки отобразятся вверху списка чатов.')}
            </p>
            {folders.length === 0 ? (
              <div className="text-center py-8 border border-white/5 rounded-2xl bg-white/2">
                <Folder className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-55" />
                <p className="text-sm text-slate-400 font-medium">{t('chat:folders.emptyTitle', 'У вас пока нет папок')}</p>
                <p className="text-xs text-slate-500 mt-1">{t('chat:folders.emptyDesc', 'Нажмите «Создать», чтобы добавить первую папку')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {folders.map((folder: any) => {
                  const is152 = folder.is_152fz_contour === 1 || folder.is152FzContour;
                  return (
                    <div key={folder.id} className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5 hover:border-white/10 transition">
                      <div className="flex items-center gap-3">
                        <span className="text-xl p-2 bg-white/5 rounded-xl">{folder.icon || '📁'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-200 block">{folder.name}</span>
                            {is152 && (
                              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-amber-400" /> Сейф-Контур
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            Чатов: {folderMembers[folder.id]?.length || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditFolder(folder)}
                          className="p-2 text-slate-400 hover:text-purple-400 hover:bg-white/5 rounded-lg transition"
                          title="Редактировать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Удалить папку "${folder.name}"? Чаты при этом не удалятся.`)) {
                              handleDeleteFolder(folder.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Название папки</label>
              <GlassInput
                placeholder="Например: Работа, Семья, Доверители..."
                value={newFolderName}
                onChange={(e: any) => setNewFolderName(e.target.value)}
                maxLength={25}
              />
            </div>

            {/* Переключатель Сейф-Контур */}
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Режим «Сейф-Контур» (DLP)
                </label>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={newFolderIs152Fz}
                    onChange={(e: any) => setNewFolderIs152Fz(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800/90 ring-1 ring-inset ring-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-md after:transition-all peer-checked:bg-amber-500 peer-checked:ring-amber-400/50"></div>
                </label>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Все чаты в этой папке защищаются в режиме «Сейф-Контур» (DLP): из них <strong className="text-amber-200">запрещено пересылать сообщения наружу</strong>, исключая случайные утечки данных.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Иконка (Эмодзи)</label>
              <div className="flex flex-wrap gap-2 p-3 bg-white/2 border border-white/5 rounded-xl">
                {['📁', '💼', '💬', '👥', '🎓', '🏠', '🎮', '🔔', '❤️', '🔥', '📌', '🚀', '⚖️', '🔐', '🛡️'].map((emoji: any) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewFolderIcon(emoji)}
                    className={`w-10 h-10 flex items-center justify-center text-xl rounded-xl transition ${
                      newFolderIcon === emoji
                        ? 'bg-purple-500/20 border border-purple-500/40 scale-105'
                        : 'bg-white/5 border border-transparent hover:bg-white/10 hover:scale-105'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Выберите чаты ({newFolderChats.length} выбрано)
              </label>
              {chats.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Нет доступных чатов</p>
              ) : (
                <div className="space-y-1.5 border border-white/5 rounded-xl p-2 bg-white/1 max-h-[200px] overflow-y-auto">
                  {chats.map((chat: any) => {
                    const isChecked = newFolderChats.includes(chat.id);
                    return (
                      <label
                        key={chat.id}
                        className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-lg cursor-pointer transition select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          {chat.avatar ? (
                            <img src={chat.avatar} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/10" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/10 flex items-center justify-center text-[10px] font-bold text-purple-300">
                              {chat.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">
                            {chat.name}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setNewFolderChats((prev: any) => prev.filter((id: any) => id !== chat.id));
                            } else {
                              setNewFolderChats((prev: any) => [...prev, chat.id]);
                            }
                          }}
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                            isChecked
                              ? 'bg-purple-500 text-white shadow-sm ring-1 ring-purple-400/60'
                              : 'bg-slate-800/80 ring-1 ring-inset ring-white/20 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </GlassModal>

      {/* МОДАЛЬНОЕ ОКНО "ПАСПОРТ БЕЗОПАСНОСТИ И О ПРИЛОЖЕНИИ" */}
      <GlassModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title={t('settings:aboutAppTitle', 'О приложении Gossip')}
        footer={
          <GlassButton variant="primary" onClick={() => setIsInfoModalOpen(false)}>
            {t('common:actions.understood', 'Понятно')}
          </GlassButton>
        }
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-100 text-xs sm:text-sm">
                {t('settings:aboutPassportBadge', 'Сквозное шифрование активно (Zero-Knowledge)')}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {t('settings:aboutPassportDesc', 'Все личные чаты, звонки и голосовые сообщения шифруются на вашем устройстве по протоколам X3DH и Double Ratchet (Curve25519 + AES-256-GCM). Сервер не имеет доступа к вашим ключам и переписке.')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/10 text-center flex flex-col items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold">Anti-DPI & Mesh</span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {t('settings:aboutCardAntiDpi', 'Работает при блокировках')}
              </span>
            </div>
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/10 text-center flex flex-col items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span className="text-[11px] font-bold">SQLCipher DB</span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {t('settings:aboutCardSqlCipher', 'Локальное шифрование')}
              </span>
            </div>
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/10 text-center flex flex-col items-center gap-1.5">
              <Laptop className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-bold">Open-Client</span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {t('settings:aboutCardOpenClient', 'Публичный аудит кода')}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t('settings:aboutApkShaTitle', 'Отпечаток подписи APK (SHA-256)')}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('EC:3E:02:AF:DE:F5:C9:56:A4:2C:7B:9F:6F:25:FE:91:AA:78:91:7D:DD:75:B7:7E:F8:D8:50:7D:11:E8:FE:A0');
                  showToast(t('settings:aboutApkShaCopied', 'SHA-256 отпечаток сертификата скопирован'), 'success');
                }}
                className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 cursor-pointer"
              >
                {t('common:actions.copy', 'Копировать')}
              </button>
            </div>
            <div className="font-mono text-[10px] text-emerald-300 break-all bg-white/[0.03] p-2 rounded-lg border border-white/5 select-all">
              EC:3E:02:AF:DE:F5:C9:56:A4:2C:7B:9F:6F:25:FE:91:AA:78:91:7D:DD:75:B7:7E:F8:D8:50:7D:11:E8:FE:A0
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-400">
            <span>{t('settings:system.appVersion', { version: currentAppVersion, defaultValue: `Gossip v${currentAppVersion}` })}</span>
            <a
              href="https://github.com/up1t3/gossip-public"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-4"
            >
              {t('settings:aboutGithubLink', 'Исходный код клиента (GitHub) →')}
            </a>
          </div>
        </div>
      </GlassModal>

      {/* МОДАЛЬНОЕ ОКНО "СЕТЕВОЙ ЦЕНТР И ЗАЩИТА СВЯЗИ" */}
      <NetworkShieldModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        onShowToast={showToast}
        onOpenChatWithPeer={(peer) => {
          setIsNetworkModalOpen(false);
          const myId = (localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id') || '').trim();
          const peerNodeId = String((peer as any).nodeId || '').trim();
          const hasDistinctNodeId = Boolean(peerNodeId && (!myId || peerNodeId.toLowerCase() !== myId.toLowerCase()));
          const cleanPeerAddr = peer.address ? `peer-${peer.address.replace(/:/g, '').toLowerCase()}` : '';
          const existingChat = chats.find((c: any) =>
            c.id === peer.id ||
            (hasDistinctNodeId && c.id === peerNodeId) ||
            (cleanPeerAddr && c.id === cleanPeerAddr)
          );
          if (existingChat) {
            setSelectedChatId(existingChat.id);
          } else {
            const targetId = hasDistinctNodeId ? peerNodeId : peer.id;
            const targetName = peer.name || 'Собеседник (Mesh)';
            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const newChat: Chat = {
              id: targetId,
              name: targetName,
              avatar: '👤',
              lastMessage: 'Оффлайн-диалог BLE Mesh',
              time: nowTime,
              unread: 0,
              online: true,
              isGroup: false,
              messages: []
            };
            storageManager.execute(
              `INSERT OR IGNORE INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) VALUES (?, ?, '👤', ?, ?, 0, 0, 1, 0);`,
              [targetId, targetName, 'Оффлайн-диалог BLE Mesh', nowTime]
            ).catch(() => {});
            setChats((prev: any) => [newChat, ...prev]);
            setSelectedChatId(newChat.id);
          }
        }}
        theme={theme}
      />

      {/* МОДАЛЬНОЕ ОКНО ВЫБОРА ЯЗЫКА ИНТЕРФЕЙСА */}
      <LanguageSelectorModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        theme={theme}
      />

      {/* МОДАЛЬНОЕ ОКНО "СОЗДАТЬ ЧАТ" */}
      <GlassModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        title={t('chat:list.createChatTooltip', 'Новый чат, группа или канал')}
        footer={
          <div className="flex gap-2 w-full justify-end">
            <GlassButton variant="secondary" onClick={() => setIsNewChatModalOpen(false)}>
              {t('common:actions.cancel', 'Отмена')}
            </GlassButton>
            <GlassButton variant="accent" onClick={handleCreateChat}>
              {t('chat:folders.createFolder', 'Создать')}
            </GlassButton>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Переключатель типа чата */}
          <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                setNewChatType('dialog');
                setNewChatIsGroup(false);
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                newChatType === 'dialog'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Диалог
            </button>
            <button
              type="button"
              onClick={() => {
                setNewChatType('group');
                setNewChatIsGroup(true);
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                newChatType === 'group'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Группа
            </button>
            <button
              type="button"
              onClick={() => {
                setNewChatType('channel');
                setNewChatIsGroup(false);
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                newChatType === 'channel'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Канал
            </button>
          </div>

          <GlassInput
            placeholder={
              newChatType === 'channel'
                ? 'Название канала...'
                : newChatType === 'group'
                  ? 'Название группы...'
                  : t('chat:list.searchPlaceholder', 'Введите имя собеседника...')
            }
            label={newChatType === 'channel' ? 'Название канала' : (newChatType === 'group' ? 'Название группы' : t('chat:folders.folderName', 'Имя чата'))}
            value={newChatName}
            onChange={(e: any) => setNewChatName(e.target.value)}
          />

          {newChatType === 'channel' && (
            <>
              <GlassInput
                placeholder="news_channel"
                label="Публичный юзернейм (@ссылка)"
                value={newChannelUsername}
                onChange={(e: any) => setNewChannelUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              />
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Описание канала</label>
                <textarea
                  placeholder="О чем этот канал..."
                  value={newChannelDescription}
                  onChange={(e: any) => setNewChannelDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/40 transition-colors"
                />
              </div>
            </>
          )}

          {newChatType === 'group' && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-xs text-slate-400">Участники группы</label>
              <div className="flex gap-2 group-member-search-container relative">
                <div className="relative flex-grow">
                  <GlassInput
                    placeholder="Имя участника..."
                    value={groupMemberInput}
                    onChange={(e: any) => handleGroupMemberInputChange(e.target.value)}
                    className="w-full"
                  />
                  {groupMemberInput.trim() !== '' && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md p-1.5 z-50 shadow-2xl flex flex-col gap-1">
                      {isSearchingMembers && groupMemberSearchResults.length === 0 && (
                        <div className="text-xs text-slate-400 px-3 py-2 italic">Поиск...</div>
                      )}
                      {!isSearchingMembers && groupMemberSearchResults.length === 0 && (
                        <div className="text-xs text-slate-400 px-3 py-2 italic">Пользователи не найдены</div>
                      )}
                      {groupMemberSearchResults.map((u: any) => {
                        const myUsername = localStorage.getItem("username") || "";
                        const isMe = u.username.toLowerCase() === myUsername.toLowerCase();
                        const isAlreadyAdded = selectedGroupMembers.some((m: any) => m.userId === u.userId);
                        
                        return (
                          <button
                            key={u.userId}
                            type="button"
                            disabled={isMe || isAlreadyAdded}
                            onClick={() => {
                              setSelectedGroupMembers((prev: any) => [...prev, { username: u.username, userId: u.userId }]);
                              setGroupMemberInput('');
                              setGroupMemberSearchResults([]);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs ${
                              isMe || isAlreadyAdded
                                ? "opacity-50 cursor-not-allowed hover:bg-transparent"
                                : "hover:bg-white/5 text-slate-200 active:scale-[0.98]"
                            }`}
                          >
                            <Avatar
                              avatarUrl={u.avatar}
                              name={u.username}
                              size="xs"
                              className="flex-shrink-0"
                            />
                            <span className="font-medium flex-grow truncate">{u.username}</span>
                            {isMe && <span className="text-[10px] text-slate-500 italic">вы</span>}
                            {isAlreadyAdded && <span className="text-[10px] text-purple-400 italic">добавлен</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <GlassButton variant="primary" onClick={handleAddGroupMember} className="self-end px-4 py-2 text-xs">
                  Добавить
                </GlassButton>
              </div>
              
              <div className="flex flex-wrap gap-1.5 pt-2">
                {selectedGroupMembers.map((m: any) => (
                  <span key={m.userId} className="px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-1.5 animate-fade-in">
                    {m.username}
                    <button 
                      type="button" 
                      onClick={() => setSelectedGroupMembers((prev: any) => prev.filter((x: any) => x.userId !== m.userId))}
                      className="text-purple-400 hover:text-purple-200 font-bold"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                {selectedGroupMembers.length === 0 && (
                  <span className="text-xs text-slate-500 italic">Список участников пуст</span>
                )}
              </div>
            </div>
          )}
        </div>
      </GlassModal>

      {/* МОДАЛЬНОЕ ОКНО "УПРАВЛЕНИЕ ГРУППОЙ" */}
      <GlassModal
        isOpen={isGroupManageModalOpen}
        onClose={() => setIsGroupManageModalOpen(false)}
        title={`Группа: ${activeChat?.name || ''}`}
        footer={
          <div className="flex gap-2 w-full justify-end">
            <GlassButton variant="secondary" onClick={() => setIsGroupManageModalOpen(false)}>
              Закрыть
            </GlassButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 pb-2 border-b border-white/5">
            <div 
              onClick={() => {
                if (activeChat?.avatar && activeChat.avatar !== '👥') {
                  setIsGroupAvatarActionSheetOpen(true);
                } else {
                  groupAvatarInputRef.current?.click();
                }
              }}
              className="group relative w-20 h-20 rounded-full overflow-hidden cursor-pointer shadow-glass-md border border-white/10"
            >
              <Avatar
                avatarUrl={activeChat?.avatar}
                name={activeChat?.name || 'Группа'}
                isGroup={activeChat?.isGroup ?? true}
                size="xl"
                isLoading={isGroupAvatarUploading}
                className="w-full h-full"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Изменить</span>
              </div>
            </div>
            <input
              type="file"
              ref={groupAvatarInputRef}
              onChange={handleGroupAvatarChange}
              accept="image/*,image/heic,image/heif"
              className="hidden"
            />
            {isEditingGroupName ? (
              <div className="flex items-center gap-2 mt-1 w-full max-w-xs justify-center animate-fade-in">
                <GlassInput
                  value={newGroupName}
                  onChange={(e: any) => setNewGroupName(e.target.value)}
                  className="text-center w-full text-slate-200"
                  placeholder="Имя группы..."
                />
                <button 
                  onClick={handleSaveGroupName}
                  className="p-1.5 px-3 text-xs bg-purple-600/80 hover:bg-purple-600 rounded-lg text-white font-medium border border-purple-500/20 active:scale-95 transition-all shadow-glass-sm"
                >
                  Сохранить
                </button>
                <button 
                  onClick={() => setIsEditingGroupName(false)}
                  className="p-1.5 px-3 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 font-medium border border-white/5 active:scale-95 transition-all"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group mt-1">
                <h3 className="font-semibold text-lg text-slate-200">{activeChat?.name}</h3>
                <button 
                  onClick={() => {
                    setNewGroupName(activeChat?.name || "");
                    setIsEditingGroupName(true);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-200 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Редактировать название группы"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Текущая эпоха MLS:</span>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 font-mono font-bold">
              {groupInfoEpoch}
            </span>
          </div>

          {/* Настройка Сейф-Контура для группы */}
          {activeChat && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Сейф-Контур (DLP Защита)
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChatIn152FzContour(activeChat.id)}
                    onChange={(e: any) => handleToggleChat152Fz(activeChat.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-amber-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500/25 border border-white/5"></div>
                </label>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Блокирует пересылку сообщений, файлов и документов из этой группы наружу. Гарантирует изоляцию конфиденциальных данных.
              </p>
            </div>
          )}

          {/* Добавление нового участника */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium">Добавить участника</label>
            <div className="flex gap-2">
              <div className="relative flex-grow add-member-search-container">
                <GlassInput
                  placeholder="Имя пользователя..."
                  value={addMemberInput}
                  onChange={(e: any) => handleAddMemberInputChange(e.target.value)}
                  className="w-full"
                />
                {addMemberInput.trim() !== '' && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md p-1.5 z-50 shadow-2xl flex flex-col gap-1">
                    {isSearchingAddMember && addMemberSearchResults.length === 0 && (
                      <div className="text-xs text-slate-400 px-3 py-2 italic">Поиск...</div>
                    )}
                    {!isSearchingAddMember && addMemberSearchResults.length === 0 && (
                      <div className="text-xs text-slate-400 px-3 py-2 italic">Пользователи не найдены</div>
                    )}
                    {addMemberSearchResults.map((u: any) => {
                      const myUsername = localStorage.getItem("username") || "";
                      const myUserId = localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id") || "";
                      const isMe = u.username.toLowerCase() === myUsername.toLowerCase() || (myUserId && u.userId === myUserId);
                      const isAlreadyAdded = groupInfoMembers.includes(u.username) || groupInfoMembers.includes(u.userId);
                      
                      return (
                        <button
                          key={u.userId}
                          type="button"
                          disabled={isMe || isAlreadyAdded}
                          onClick={() => {
                            setAddMemberInput(u.username);
                            setAddMemberSearchResults([]);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs ${
                            isMe || isAlreadyAdded
                              ? "opacity-50 cursor-not-allowed hover:bg-transparent"
                              : "hover:bg-white/5 text-slate-200 active:scale-[0.98]"
                          }`}
                        >
                          <Avatar
                            avatarUrl={u.avatar}
                            name={u.username}
                            size="xs"
                            className="flex-shrink-0"
                          />
                          <span className="font-medium flex-grow truncate">{u.username}</span>
                          {isMe && <span className="text-[10px] text-slate-500 italic">вы</span>}
                          {isAlreadyAdded && <span className="text-[10px] text-purple-400 italic">участник</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <GlassButton variant="primary" onClick={handleAddMemberToGroup} className="px-4 py-2 text-xs self-start">
                Добавить
              </GlassButton>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium">Участники ({groupInfoMembers.length})</label>
            <div className="max-h-60 overflow-y-auto border border-white/5 rounded-xl divide-y divide-white/5 bg-white/[0.01]">
              {groupInfoMembers.map((member: any) => {
                const myUsername = localStorage.getItem("username") || "";
                const myUserId = localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id") || "";
                const isMe = member === myUsername || (myUserId && member === myUserId);
                return (
                  <div key={member} className="p-3 flex justify-between items-center hover:bg-white/[0.01] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-200 font-medium">
                        {member} {isMe && <span className="text-[10px] text-purple-400 font-semibold ml-1 bg-purple-500/10 px-1.5 py-0.5 rounded-md">(вы)</span>}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {isMe ? "в сети" : "был(а) недавно"}
                      </span>
                    </div>
                    {!isMe && (
                      <GlassButton
                        variant="secondary"
                        size="sm"
                        className="py-1 px-2.5 rounded-lg border border-red-500/20 hover:bg-red-600/10 text-red-400 transition-all text-xs"
                        onClick={() => handleEvictMember(member)}
                      >
                        Удалить
                      </GlassButton>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </GlassModal>

      {/* МОДАЛЬНОЕ ОКНО "ПРИВАТНОСТЬ И СЕЙФ-КОНТУР" */}
      <GlassModal
        isOpen={isChatPrivacyModalOpen}
        onClose={() => setIsChatPrivacyModalOpen(false)}
        title={`Сейф-Контур: ${activeChat?.name || ''}`}
        footer={
          <div className="flex gap-2 w-full justify-end">
            <GlassButton variant="primary" onClick={() => setIsChatPrivacyModalOpen(false)}>
              Понятно
            </GlassButton>
          </div>
        }
      >
        {activeChat && (
          <div className="space-y-4">
            {/* Карточка переключателя */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isChatIn152FzContour(activeChat.id)
                ? 'bg-amber-500/10 border-amber-500/30 shadow-glass-sm'
                : 'bg-white/3 border-white/10'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isChatIn152FzContour(activeChat.id)
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-white/5 text-slate-400'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Режим «Сейф-Контур»
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isChatIn152FzContour(activeChat.id) ? 'Активен (DLP защита включена)' : 'Отключен'}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChatIn152FzContour(activeChat.id)}
                    onChange={(e: any) => handleToggleChat152Fz(activeChat.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-amber-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500/25 border border-white/5"></div>
                </label>
              </div>
            </div>

            {/* Описание защитных мер */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Политики безопасности и DLP:
              </h4>

              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-white/2 border border-white/5 flex items-start gap-2.5 text-xs">
                  <span className="text-base">🚫</span>
                  <div>
                    <strong className="text-slate-200 block">Запрет пересылки (No-Forward DLP)</strong>
                    <span className="text-slate-400 text-[11px]">
                      Сообщения, резюме, сканы паспортов и офферы невозможно переслать во внешние чаты.
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/2 border border-white/5 flex items-start gap-2.5 text-xs">
                  <span className="text-base">🔐</span>
                  <div>
                    <strong className="text-slate-200 block">Постквантовое шифрование</strong>
                    <span className="text-slate-400 text-[11px]">
                      Сквозное шифрование ML-KEM Kyber-1024 + Signal Ratchet. Сервер видит только шифртекст.
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/2 border border-white/5 flex items-start gap-2.5 text-xs">
                  <span className="text-base">🗄️</span>
                  <div>
                    <strong className="text-slate-200 block">Локальный зашифрованный контейнер</strong>
                    <span className="text-slate-400 text-[11px]">
                      База сообщений на устройстве защищена криптографическим ключом SQLCipher и PIN-кодом.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Принадлежность к папкам */}
            {folders.filter((f: any) => (folderMembers[f.id] || []).includes(activeChat.id)).length > 0 && (
              <div className="p-3 bg-white/2 border border-white/5 rounded-xl text-xs space-y-1">
                <span className="text-slate-400 font-medium">Состоит в папках:</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {folders
                    .filter((f: any) => (folderMembers[f.id] || []).includes(activeChat.id))
                    .map((f: any) => (
                      <span
                        key={f.id}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border flex items-center gap-1 ${
                          f.is_152fz_contour === 1 || f.is152FzContour
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-white/5 border-white/10 text-slate-300'
                        }`}
                      >
                        {f.icon || '📁'} {f.name}
                        {(f.is_152fz_contour === 1 || f.is152FzContour) && ' (152-ФЗ)'}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </GlassModal>
    </>
  );
}
