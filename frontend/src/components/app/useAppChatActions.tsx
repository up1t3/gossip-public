import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Pin } from 'lucide-react';
import { useChatSearch } from '../../hooks/useChatSearch';
import { tdlib } from '../../core/tdlib/tdlib-adapter';
import { syncManager } from '../../core/sync-manager';
import { storageManager } from '../../core/storage/storage-manager';
import { generateMlsKeyPair, getLocalMlsKeyPair, MlsSession, Kyber1024, calculateX25519SharedSecret, hkdfDeriveKey } from '../../core/crypto/mls';
import { bytesToHex, hexToBytes } from '../../core/tdlib/crypto';
import { encryptMessage } from '../../core/crypto/double-ratchet';
import { encryptMediaBlob, isE2EEMessage, markLocallyDecrypted } from '../../core/crypto/e2ee';
import { launchConfetti } from '../../utils/confetti';
import { getBackendUrl } from '../../utils/url';
import { formatChatPreview } from '../../utils/message-preview';
import { compressVideo, compressVideoNote, ensureUniversalAudioBlob, normalizeImageToJpeg } from '../../features/ffmpeg/videoCompressor';
import { uploadMediaTus } from '../../core/media/tus-client';
import 'katex/dist/katex.min.css';
import { TypingUser } from '../../components/chat/TypingIndicator';
import { Avatar } from '../../components/ui/Avatar';
import { loadImageForCropping, loadUrlForCropping } from '../../utils/imageOptimizer';
import { formatChatTimestamp } from '../../utils/dateUtils';
import { PollData } from '../../components/chat/PollMessage';
import { CreatedPollData } from '../../components/chat/PollConstructorModal';
import { offlineMeshManager } from '../../core/mesh/offline-mesh-manager';
import { InlineKeyboardButton } from '../../features/bots/types';
import { safeParsePeaks, saveSessionToIndexedDB, type Message, type Chat } from './appHelpers';
import { buildVoiceChangerGraph, type VoiceChangerPreset } from '../../utils/voiceChanger';

export function useAppChatActions(ctx: Record<string, any>) {
  const {
    activeChat,
    activeTopicId,
    addMemberInput,
    addMemberSearchTimeoutRef,
    audioLockMode,
    audioLockModeRef,
    audioPeaks,
    audioPlayState,
    audioPreviewRef,
    audioRecorder,
    audioRecorderRef,
    audioTimerRef,
    avatarInputRef,
    chatToDelete,
    chats,
    cropTarget,
    currentUserId,
    drafts,
    editingFolder,
    editingMessage,
    folderMembers,
    formatUserDisplayName,
    forwardingMessageId,
    groupAvatarInputRef,
    groupInfoMembers,
    groupMemberInput,
    holdTimeoutRef,
    inputMode,
    inputModeRef,
    isAudioRecordingRef,
    isChatIn152FzContour,
    isChatSearchOpen,
    isDbLoaded,
    isHoldingRecordRef,
    isLongPressActive,
    isPremium,
    lastModeToggleTimeRef,
    lastTouchTimeRef,
    longPressTimeoutRef,
    memberSearchTimeoutRef,
    newChannelDescription,
    newChannelUsername,
    newChatIsGroup,
    newChatName,
    newChatType,
    newFolderChats,
    newFolderIcon,
    newFolderIs152Fz,
    newFolderName,
    newGroupName,
    newMessageText,
    pinnedMessageMap,
    profileAvatarUrl,
    recordedAudioUrl,
    recordedVideoUrl,
    replyingToMessage,
    searchQuery,
    selectedChatId,
    selectedFolderId,
    selectedGroupMembers,
    selectedMessageIds,
    sendTtlSeconds,
    setActiveReactionMessageId,
    setAddMemberInput,
    setAddMemberSearchResults,
    setAudioLockMode,
    setAudioPeaks,
    setAudioPlayState,
    setAudioRecordDuration,
    setAudioRecorder,
    setAvatarViewerState,
    setChatToDelete,
    setChats,
    setCropImageSrc,
    setCropModalOpen,
    setCropTarget,
    setDrafts,
    setEditingFolder,
    setEditingMessage,
    setFolderEditMode,
    setFolderMembers,
    setFolders,
    setForwardingMessageId,
    setGroupInfoEpoch,
    setGroupInfoMembers,
    setGroupMemberInput,
    setGroupMemberSearchResults,
    setHighlightMessageId,
    setInputMode,
    setIsAudioRecording,
    setIsAvatarUploading,
    setIsChatSearchOpen,
    setIsDeleteChatModalOpen,
    setIsEditingGroupName,
    setIsForwardModalOpen,
    setIsGroupAvatarUploading,
    setIsGroupManageModalOpen,
    setIsNewChatModalOpen,
    setIsRecordingVideoNote,
    setIsSearchingAddMember,
    setIsSearchingMembers,
    setMobileView,
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
    setNewMessageText,
    setPinnedMessageMap,
    setProfileAvatarUrl,
    setReactionMenuCoords,
    setRecordedAudioUrl,
    setRecordedVideoUrl,
    setReplyingToMessage,
    setSelectedChatId,
    setSelectedFolderId,
    setSelectedGroupMembers,
    setSelectedMessageIds,
    setShowDeleteConfirm,
    setToast,
    setTypingUserIds,
    setUploadingFile,
    setVideoLockMode,
    setVideoNoteTriggerStart,
    setVideoNoteTriggerStop,
    setVideoNoteTriggerSwitch,
    setVideoPlayState,
    setVideoRecordingActive,
    showToast,
    textareaRef,
    topics,
    touchStartRef,
    typingUserIds,
    uploadingFile,
    videoLockModeRef,
    videoPreviewRef,
    virtualMessageListRef
  } = ctx;

  const handleOpenGroupInfo = useCallback(async () => {
    if (!activeChat || !activeChat.isGroup) return;
    try {
      let session = syncManager.getMlsSession(activeChat.id);
      if (!session) {
        session = await syncManager.initMlsSessionFromWelcomePackage(activeChat.id);
      }
      if (session) {
        setGroupInfoMembers(session.currentEpoch.members);
        setGroupInfoEpoch(session.currentEpoch.epochNumber);
        setNewGroupName(activeChat.name);
        setIsEditingGroupName(false);
        setIsGroupManageModalOpen(true);
      } else {
        const groupInfo = await syncManager.getGroupInfo(activeChat.id);
        if (groupInfo && groupInfo.members.length > 0) {
          setGroupInfoMembers(groupInfo.members);
          setGroupInfoEpoch(groupInfo.epoch);
          setNewGroupName(groupInfo.name || activeChat.name);
          setIsEditingGroupName(false);
          setIsGroupManageModalOpen(true);
        } else {
          showToast("Не удалось загрузить информацию о группе. Проверьте подключение к сети.", "error");
        }
      }
    } catch (err) {
      console.warn("[GroupInfo] Ошибка открытия информации о группе:", err);
    }
  }, [activeChat, showToast]);

  const handleToggleChannelMute = useCallback(async (targetMuted?: boolean) => {
    if (!activeChat) return;
    const isCurrentlyMuted = Boolean(activeChat.muted);
    const newMuted = typeof targetMuted === 'boolean' ? targetMuted : !isCurrentlyMuted;
    try {
      const token = localStorage.getItem('session_token') || localStorage.getItem('token') || '';
      await fetch(getBackendUrl(`/api/v1/chats/${encodeURIComponent(activeChat.id)}/settings`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ muted: newMuted })
      }).catch(() => {});
      
      setChats((prevChats: any) => prevChats.map((c: any) => c.id === activeChat.id ? { ...c, muted: newMuted ? 1 : 0 } : c));
    } catch (err) {
      console.error('[App] Ошибка переключения mute канала:', err);
    }
  }, [activeChat]);

  const handleVotePoll = useCallback(async (pollId: string, selectedOptionIds: number[]) => {
    if (!activeChat) return;
    try {
      if (activeChat.type === 'channel') {
        const token = localStorage.getItem('session_token') || localStorage.getItem('token') || '';
        const res = await fetch(getBackendUrl(`/api/v1/polls/${encodeURIComponent(pollId)}/vote`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            option_ids: selectedOptionIds
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.detail || `Ошибка сервера: HTTP ${res.status}`);
        }
        const voteResult = await res.json().catch(() => ({}));
        setChats((prevChats: any) => prevChats.map((chat: any) => {
          if (chat.id === activeChat.id) {
            return {
              ...chat,
              messages: chat.messages.map((m: any) => {
                if (m.poll && (m.poll.pollId === pollId || m.id === pollId)) {
                  const updatedTally = voteResult.tally || {
                    ...(m.poll.tally || {}),
                    [selectedOptionIds[0]]: ((m.poll.tally || {})[selectedOptionIds[0]] || 0) + 1
                  };
                  const totalVoters = voteResult.total_voters ?? (m.poll.totalVoters || 0) + 1;
                  return {
                    ...m,
                    poll: {
                      ...m.poll,
                      myVotes: selectedOptionIds,
                      tally: updatedTally,
                      totalVoters
                    }
                  };
                }
                return m;
              })
            };
          }
          return chat;
        }));
      } else {
        const myUserId = localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id') || 'me';
        syncManager.registerPollVote(activeChat.id, pollId, pollId, myUserId, selectedOptionIds);
        
        // Отправка MLS/Service сообщения poll_vote
        if (activeChat.isGroup) {
          const session = syncManager.getMlsSession(activeChat.id);
          if (session) {
            const servicePayload = JSON.stringify({
              type: 'service',
              action: 'poll_vote',
              pollId,
              targetMessageId: pollId,
              optionIds: selectedOptionIds,
              userId: myUserId
            });
            const encResult = await session.encryptMessage(servicePayload);
            const textToSend = JSON.stringify({
              ciphertextHex: encResult.ciphertextHex,
              mlsCiphertextHex: encResult.ciphertextHex,
              ivHex: encResult.ivHex,
              epochNumber: encResult.epochNumber
            });
            await tdlib.send('send_message', {
              chatId: activeChat.id,
              text: textToSend,
              type: 'service',
              serviceAction: 'poll_vote'
            }).catch(() => {});
          }
        }

        setChats((prevChats: any) => prevChats.map((chat: any) => {
          if (chat.id === activeChat.id) {
            return {
              ...chat,
              messages: chat.messages.map((m: any) => {
                if (m.poll && (m.poll.pollId === pollId || m.id === pollId)) {
                  const currentTally = { ...(m.poll.tally || {}) };
                  selectedOptionIds.forEach((id: any) => {
                    currentTally[id] = (currentTally[id] || 0) + 1;
                  });
                  return {
                    ...m,
                    poll: {
                      ...m.poll,
                      myVotes: selectedOptionIds,
                      tally: currentTally,
                      totalVoters: (m.poll.totalVoters || 0) + 1
                    }
                  };
                }
                return m;
              })
            };
          }
          return chat;
        }));
      }
    } catch (err: any) {
      console.error('[App] Ошибка голосования в опросе:', err);
      throw err;
    }
  }, [activeChat]);

  const handleCreatePoll = useCallback(async (pollData: CreatedPollData) => {
    if (!activeChat) return;
    const pollId = `poll-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fullPoll: PollData = {
      pollId,
      question: pollData.question,
      options: pollData.options.map((opt: any, idx: any) => ({
        id: idx,
        text: opt,
        votesCount: 0,
        percentage: 0
      })),
      anonymous: pollData.anonymous,
      allowMultiple: pollData.allowMultiple,
      quiz: pollData.quiz,
      correctOptionId: pollData.correctOptionId,
      explanation: pollData.explanation,
      closeAt: pollData.closeAt,
      totalVoters: 0,
      myVotes: [],
      tally: {}
    };

    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const pollMessage: Message = {
      id: tempId,
      sender: 'me',
      senderName: localStorage.getItem('username') || 'Я',
      text: pollData.question,
      time: timeStr,
      status: 'pending',
      type: 'poll',
      poll: fullPoll
    };

    setChats((prev: any) => prev.map((chat: any) => {
      if (chat.id === activeChat.id) {
        return {
          ...chat,
          messages: [...chat.messages, pollMessage],
          lastMessage: `📊 Опрос: ${pollData.question}`,
          time: timeStr
        };
      }
      return chat;
    }));

    try {
      if (activeChat.type === 'channel') {
        const token = localStorage.getItem('session_token') || localStorage.getItem('token') || '';
        const res = await fetch(getBackendUrl(`/api/v1/chats/${encodeURIComponent(activeChat.id)}/messages`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'poll',
            text: pollData.question,
            poll: fullPoll
          })
        });
        const data = await res.json();
        if (data && (data.id || data.message_id)) {
          const realId = data.id || data.message_id;
          setChats((prev: any) => prev.map((chat: any) => {
            if (chat.id === activeChat.id) {
              return {
                ...chat,
                messages: chat.messages.map((m: any) => m.id === tempId ? { ...m, id: realId, status: 'sent' } : m)
              };
            }
            return chat;
          }));
        }
      } else {
        const res = await tdlib.send('send_message', {
          chatId: activeChat.id,
          text: pollData.question,
          type: 'poll',
          poll: fullPoll
        });
        if (res && (res.messageId || res.message_id)) {
          const realId = res.messageId || res.message_id;
          setChats((prev: any) => prev.map((chat: any) => {
            if (chat.id === activeChat.id) {
              return {
                ...chat,
                messages: chat.messages.map((m: any) => m.id === tempId ? { ...m, id: realId, status: 'sent' } : m)
              };
            }
            return chat;
          }));
        }
      }
    } catch (err) {
      console.error('[App] Ошибка отправки опроса, переносим в оффлайн-очередь:', err);
      setChats((prev: any) => prev.map((chat: any) => {
        if (chat.id === activeChat.id) {
          return {
            ...chat,
            messages: chat.messages.map((m: any) => m.id === tempId ? { ...m, status: 'pending' as const, isE2EESendFailed: true } : m)
          };
        }
        return chat;
      }));
      showToast('Не удалось отправить — повторим при подключении', 'info');
      try {
        await syncManager.enqueueOfflineMessage(activeChat.id, pollData.question, 'poll', null, null, undefined, tempId);
      } catch (offlineErr) {
        console.error('[App] Ошибка добавления опроса в оффлайн-очередь:', offlineErr);
      }
    }
  }, [activeChat]);

  const handleCallbackQuery = useCallback(async (button: InlineKeyboardButton, messageId: string) => {
    if (!activeChat || button.callback_data === undefined) return;
    try {
      const token = localStorage.getItem('session_token') || '';
      const res = await fetch(getBackendUrl('/api/v1/messages/callback-query'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          chat_id: activeChat.id,
          message_id: messageId,
          callback_data: button.callback_data,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast('Действие выполнено', 'success');
      } else {
        showToast(data.detail || data.description || 'Ошибка обработки кнопки ботом', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Сбой соединения с сервером', 'error');
    }
  }, [activeChat]);

  // Вычисление текущего открытого топика
  const activeTopic = useMemo(() => {
    if (!activeChat?.is_forum || activeTopicId === null) return null;
    if (activeTopicId === 0) {
      return {
        topic_id: 0,
        chat_id: activeChat.id,
        title: 'Общий',
        icon_emoji: '💬',
        icon_color: '#3b82f6',
        is_closed: false,
        unread_count: 0
      };
    }
    return topics.find((t: any) => t.topic_id === activeTopicId) || {
      topic_id: activeTopicId,
      chat_id: activeChat.id,
      title: `Топик #${activeTopicId}`,
      icon_emoji: '💬',
      icon_color: '#3b82f6',
      is_closed: false,
      unread_count: 0
    };
  }, [activeChat, activeTopicId, topics]);

  // Строго хронологически отсортированный список сообщений активного чата
  const sortedActiveChatMessages = useMemo(() => {
    if (!activeChat || !activeChat.messages) return [];
    let list = activeChat.messages.filter((m: any) => {
      if (!m || m.text === '[service_session_reset]') return false;
      const hasContent =
        (typeof m.text === 'string' && m.text.trim().length > 0) ||
        Boolean(m.mediaUrl) ||
        Boolean(m.poll) ||
        Boolean(m.invoiceId || m.invoice_id) ||
        Boolean(m.transferReceipt || m.transfer_receipt) ||
        m.type === 'voice' ||
        m.type === 'video_note' ||
        m.type === 'sticker' ||
        m.type === 'location' ||
        m.type === 'contact' ||
        m.type === 'document';
      return hasContent;
    });
    if (activeChat.is_forum && activeTopicId !== null) {
      list = list.filter((m: Message) => (m.topic_id ?? 0) === activeTopicId);
    }
    return [...list].sort((a: any, b: any) => {
      const getMs = (m: Message) => {
        if (typeof m.timestamp === 'number') {
          return m.timestamp < 10000000000 ? m.timestamp * 1000 : m.timestamp;
        }
        if (m.timestamp) {
          const t = new Date(m.timestamp).getTime();
          if (!isNaN(t)) return t;
        }
        return m.pts ? m.pts * 1000 : 0;
      };
      return getMs(a) - getMs(b);
    });
  }, [activeChat?.messages, activeChat?.is_forum, activeTopicId]);

  // M1.3: in-chat search — FTS5 по chatId, debounce, состояние/навигация.
  const chatSearch = useChatSearch(activeChat?.id, isDbLoaded);

  // Сброс typing-состояния при смене активного чата + подгрузка актуального.
  useEffect(() => {
    setTypingUserIds(selectedChatId ? syncManager.getTypingUsers(selectedChatId) : []);
    // M1.3: сброс сессии поиска при смене чата
    setIsChatSearchOpen(false);
    setHighlightMessageId(null);
    chatSearch.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId]);

  // M1.3: прыжок к совпадению поиска (Подход A).
  // Реагирует на currentIndex. В памяти → scrollToMessage; вне памяти →
  // loadHistoryAround → merge в activeChat.messages → scrollToMessage.
  // Таймер снимает подсветку через 2.5с.
  useEffect(() => {
    if (!isChatSearchOpen) return;
    const target = chatSearch.results[chatSearch.currentIndex];
    if (!target || !activeChat) return;

    let cancelled = false;
    chatSearch.setIsNavigating(true);

    (async () => {
      try {
        const inMemory = activeChat.messages.some((m: any) => m.id === target.id);
        if (!inMemory) {
          // Подгрузить окно истории вокруг target.pts
          const windowMsgs = await syncManager.loadHistoryAround(
            activeChat.id,
            target.pts,
            20
          );
          if (cancelled) return;

          // Merge в activeChat.messages (дедуп по id, как handleLoadMoreHistory)
          const mapped: Message[] = windowMsgs.map((m: any) => ({
            id: m.id,
            sender: (m.sender === 'me' || m.sender === currentUserId ? 'me' : m.sender),
            senderName: m.senderName || 'Собеседник',
            text: m.text,
            time: m.time || new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            pts: m.pts,
            timestamp: m.timestamp || Date.now(),
            type: m.type || 'text',
            mediaUrl: m.mediaUrl,
            peaks: safeParsePeaks(m.peaks),
            mediaKey: m.mediaKey,
            mediaIv: m.mediaIv,
            reaction: m.reaction,
            replyToMessageId: m.replyToMessageId,
            forwardFromUser: m.forwardFromUser,
            status: m.status || 'read',
            isService: m.isService,
          }));

          setChats((prevChats: any) =>
            prevChats.map((chat: any) => {
              if (chat.id !== activeChat.id) return chat;
              const existingIds = new Set(chat.messages.map((m: any) => m.id));
              const unique = mapped.filter((m: any) => !existingIds.has(m.id));
              const merged = [...chat.messages, ...unique].sort(
                (a: any, b: any) => (a.pts || 0) - (b.pts || 0)
              );
              return { ...chat, messages: merged };
            })
          );

          // Дать React смонтировать новые узлы, затем скролл
          await new Promise((r: any) => requestAnimationFrame(() => r(null)));
        }

        if (cancelled) return;
        const ok = virtualMessageListRef.current?.scrollToMessage(target.id) ?? false;
        if (ok) {
          setHighlightMessageId(target.id);
          // Снять подсветку через 2.5с
          setTimeout(() => {
            setHighlightMessageId((cur: any) => (cur === target.id ? null : cur));
          }, 2500);
        } else {
          // target не найден после подгрузки (FTS рассинхрон)
          showToast('Сообщение недоступно, попробуйте загрузить историю', 'info');
        }
      } catch (err) {
        console.error('[ChatSearch] jump failed:', err);
        showToast('Не удалось загрузить сообщения', 'error');
      } finally {
        if (!cancelled) chatSearch.setIsNavigating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSearch.currentIndex, isChatSearchOpen]);

  // Resolve userId → display name для индикатора typing.
  // DM: peer == typing user → activeChat.name. Группа: поиск в кэше chats,
  // fallback на короткий id (полные имена подтянутся позже через MLS-сессию).
  const typingUsersForHeader: TypingUser[] = React.useMemo(() => {
    if (!activeChat) return [];
    return typingUserIds.map((uid: any) => {
      if (!activeChat.isGroup && uid === activeChat.id) {
        return { id: uid, name: activeChat.name };
      }
      const known = chats.find((c: any) => c.id === uid);
      return { id: uid, name: known?.name || uid.slice(0, 8) };
    });
  }, [typingUserIds, activeChat, chats]);

  // Обработчик отправки сообщения через TDLib
  const handleSendMessage = async (e?: React.FormEvent, customText?: string, typedPayload?: any) => {
    e?.preventDefault();
    const rawText = customText !== undefined ? customText : newMessageText;
    if (!rawText.trim() && !typedPayload) return;

    const text = rawText;
    if (customText === undefined) {
      setNewMessageText('');
      if (activeChat) {
        setDrafts((prev: any) => {
          const next = { ...prev };
          delete next[activeChat.id];
          return next;
        });
      }
    }

    if (editingMessage) {
      // Режим редактирования
      const editedMsgId = editingMessage.id;
      setEditingMessage(null);

      // Оптимистичное обновление UI
      setChats((prevChats: any) => prevChats.map((chat: any) => {
        if (chat.id === activeChat.id) {
          return {
            ...chat,
            messages: chat.messages.map((m: any) => m.id === editedMsgId ? { ...m, text } : m)
          };
        }
        return chat;
      }));

      try {
        await tdlib.send("edit_message", {
          messageId: editedMsgId,
          text: text
        });

        // Сохраняем изменение в локальную БД
        await storageManager.execute("UPDATE messages SET text = ? WHERE id = ?;", [text, editedMsgId]);
      } catch (err) {
        console.error("[UI App] Ошибка редактирования сообщения:", err);
      }
      return;
    }

    // Обычная отправка (возможно, с ответом)
    const replyToId = replyingToMessage ? replyingToMessage.id : undefined;
    setReplyingToMessage(null);

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      sender: 'me',
      senderName: 'Я',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      replyToMessageId: replyToId,
      status: 'pending',
      topic_id: activeTopicId,
      ...(typedPayload || {}),
    };

    // Оптимистичное обновление UI
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

    if (tdlib.isOffline()) {
      console.log("[UI App] Обнаружен оффлайн-режим. Отправка сообщения через оффлайн-очередь Outbox и BLE Mesh.");
      try {
        setChats((prevChats: any) => prevChats.map((chat: any) => {
          if (chat.id === activeChat.id) {
            return {
              ...chat,
              messages: chat.messages.map((m: any) => m.id === tempId ? { ...m, status: 'pending' as const } : m)
            };
          }
          return chat;
        }));

        // Подготовка E2EE зашифрованного текста ОДНОКРАТНО (Single-Encryption Invariant §13.1)
        // для одновременной постановки в Outbox и прямой передачи в радиоэфир BLE Mesh
        let meshEncryptedText: string | null = null;
        const isGroupForMesh = Boolean(activeChat.isGroup || activeChat.type === 'group');
        const isBotForMesh = !isGroupForMesh && (
          activeChat.isBot ||
          (activeChat as any).is_bot ||
          activeChat.type === 'bot' ||
          /bot$/i.test(String(activeChat.username || activeChat.name || '').trim()) ||
          (typeof localStorage !== 'undefined' && localStorage.getItem('bot_chat_' + activeChat.id) === '1')
        );
        let isChannelForMesh = !isGroupForMesh && activeChat.type === 'channel';
        if (isChannelForMesh) {
          try {
            const { getSession } = await import('../../core/crypto/e2ee');
            const existingSession = await getSession(activeChat.id);
            if (existingSession) {
              isChannelForMesh = false;
            }
          } catch {}
        }
        if (!isGroupForMesh && !isChannelForMesh && !isBotForMesh && text !== "[service_session_reset]") {
          try {
            const peerObj = offlineMeshManager.getPeer(activeChat.id);
            const offlineBundle = peerObj?.prekeyBundle || null;
            let payloadToEncrypt = text;
            if (typedPayload || sendTtlSeconds > 0) {
              payloadToEncrypt = JSON.stringify({
                text,
                ...(typedPayload || {}),
                ...(sendTtlSeconds > 0 ? { ttlSeconds: sendTtlSeconds } : {}),
              });
            }
            meshEncryptedText = await encryptMessage(activeChat.id, payloadToEncrypt, {
              offlineBundle,
              preferOffline: true,
            });
          } catch (encryptErr) {
            console.error("[UI App] Ошибка E2EE шифрования для BLE Mesh (1-to-1):", encryptErr);
          }
        } else if (isGroupForMesh) {
          try {
            let session = syncManager.getMlsSession(activeChat.id);
            if (!session) {
              session = await syncManager.initMlsSessionFromWelcomePackage(activeChat.id);
            }
            if (session) {
              const payloadToEncrypt = (activeChat.is_forum && activeTopicId !== null) || sendTtlSeconds > 0 || typedPayload
                ? JSON.stringify({
                    text,
                    ...(activeChat.is_forum && activeTopicId !== null ? { topic_id: activeTopicId } : {}),
                    ...(typedPayload || {}),
                    ...(sendTtlSeconds > 0 ? { ttlSeconds: sendTtlSeconds } : {}),
                  })
                : text;
              const encResult = await session.encryptMessage(payloadToEncrypt);
              meshEncryptedText = JSON.stringify({
                ciphertextHex: encResult.ciphertextHex,
                mlsCiphertextHex: encResult.ciphertextHex,
                ivHex: encResult.ivHex,
                epochNumber: encResult.epochNumber
              });
            }
          } catch (mlsErr) {
            console.error("[UI App] Ошибка MLS шифрования для BLE Mesh (Группа):", mlsErr);
          }
        }

        const textForOutbox = (meshEncryptedText && isE2EEMessage(meshEncryptedText)) ? meshEncryptedText : text;
        await syncManager.enqueueOfflineMessage(
          activeChat.id,
          textForOutbox,
          'text',
          null,
          null,
          replyToId,
          tempId,
          null,
          text,
          typedPayload || undefined
        );

        // Мгновенная прямая передача пакета в радиоэфир BLE Mesh соседям без участия сервера
        const meshSnapshot = offlineMeshManager.getSnapshot();
        if (meshSnapshot.isMeshEnabled) {
          if (meshEncryptedText && isE2EEMessage(meshEncryptedText)) {
            const senderId = localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id') || meshSnapshot.localNodeId || 'local-user';
            const senderName = localStorage.getItem('username') || 'Собеседник';
            const meshEnvelopePayload = JSON.stringify({
              id: tempId,
              chatId: activeChat.id,
              recipientId: activeChat.id,
              isGroup: Boolean(activeChat.isGroup),
              sender: senderId,
              senderNodeId: meshSnapshot.localNodeId || senderId,
              senderDeviceId: meshSnapshot.localDeviceId || '',
              senderName: senderName,
              text: meshEncryptedText,
              time: tempMsg.time,
              timestamp: tempMsg.timestamp,
              replyToMessageId: replyToId,
              type: typedPayload?.type || 'text',
              topic_id: activeTopicId
            });
            offlineMeshManager.enqueueEnvelope(activeChat.id, meshEnvelopePayload);
            showToast("Сообщение зашифровано и передано в BLE Mesh эфир", "info");
          } else {
            console.warn("[UI App] Отмена передачи в BLE Mesh: сообщение не зашифровано (Fail-Closed).");
            showToast("Ошибка шифрования для BLE Mesh: открытый текст заблокирован от отправки в эфир", "error");
          }
        }
      } catch (offlineErr) {
        console.error("[UI App] Ошибка добавления сообщения в оффлайн-очередь:", offlineErr);
      }
      return;
    }

    // Подготовка E2EE / MLS зашифрованного текста ДО отправки в эфир и на сервер
    // R3 (M3.1): ttlSeconds — ВНУТРИ шифротекста (сервер не знает длительность);
    // expires_at уходит транспортными метаданными для серверного гигиенического TTL (Q3)
    const ttlExpiresAt = sendTtlSeconds > 0 ? new Date(Date.now() + sendTtlSeconds * 1000).toISOString() : undefined;
    let textToSend = text;

    // TX-1: Безопасный дефолт — шифруем всегда, кроме подтверждённых серверных каналов без 1:1 сессии и ботов
    const isGroup = Boolean(activeChat.isGroup || activeChat.type === 'group');
    const isBotChat = !isGroup && (
      activeChat.isBot ||
      (activeChat as any).is_bot ||
      activeChat.type === 'bot' ||
      /bot$/i.test(String(activeChat.username || activeChat.name || '').trim()) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('bot_chat_' + activeChat.id) === '1')
    );
    const isBotSlashCommand = /^\/[a-zA-Z0-9_а-яА-ЯёЁ-]+(\s|$|@)/.test(text.trim());
    let isChannel = !isGroup && activeChat.type === 'channel';
    if (isChannel) {
      try {
        const { getSession } = await import('../../core/crypto/e2ee');
        const existingSession = await getSession(activeChat.id);
        if (existingSession) {
          isChannel = false;
        }
      } catch {}
    }

    if (!isGroup && !isChannel && !isBotChat && text !== "[service_session_reset]") {
      try {
        // R3/R4: ttlSeconds и типизированные поля (location/contact/document) —
        // внутрь шифротекста как JSON-пейлоад (спека §2.1)
        let payloadToEncrypt = text;
        if (typedPayload || sendTtlSeconds > 0) {
          payloadToEncrypt = JSON.stringify({
            text,
            ...(typedPayload || {}),
            ...(sendTtlSeconds > 0 ? { ttlSeconds: sendTtlSeconds } : {}),
          });
        }
        textToSend = await encryptMessage(activeChat.id, payloadToEncrypt);
      } catch (encryptErr) {
        // Fail-Closed (§12.5): при сбое E2EE открытый текст не уходит в облачный канал.
        console.error("[UI App] E2EE encryption failed — переносим в оффлайн-очередь (Fail-Closed):", encryptErr);
        try {
          await syncManager.enqueueOfflineMessage(activeChat.id, text, 'text', null, null, replyToId, tempId);
        } catch (offlineErr) {
          console.error("[UI App] Ошибка добавления сообщения в оффлайн-очередь при сбое E2EE:", offlineErr);
        }
        showToast("Ошибка шифрования: сообщение не отправлено, сохранено в очередь (Fail-Closed)", "error");
        return;
      }
    } else if (isGroup && !isBotSlashCommand) {
      try {
        let session = syncManager.getMlsSession(activeChat.id);
        if (!session) {
          session = await syncManager.initMlsSessionFromWelcomePackage(activeChat.id);
        }
        if (session) {
          const payloadToEncrypt = (activeChat.is_forum && activeTopicId !== null) || sendTtlSeconds > 0 || typedPayload
            ? JSON.stringify({
                text,
                ...(activeChat.is_forum && activeTopicId !== null ? { topic_id: activeTopicId } : {}),
                ...(typedPayload || {}),
                ...(sendTtlSeconds > 0 ? { ttlSeconds: sendTtlSeconds } : {}),
              })
            : text;
          const encResult = await session.encryptMessage(payloadToEncrypt);
          textToSend = JSON.stringify({
            ciphertextHex: encResult.ciphertextHex,
            mlsCiphertextHex: encResult.ciphertextHex,
            ivHex: encResult.ivHex,
            epochNumber: encResult.epochNumber
          });
        } else {
          // CRP-001/SYN-004 (§12.5 Fail-Closed): при отсутствии MLS-сессии открытый текст не отправляется
          throw new Error(`Нет MLS сессии для группы ${activeChat.id} — отправка заблокирована (Fail-Closed §12.5)`);
        }
      } catch (mlsErr) {
        // Fail-Closed (§12.5): при сбое MLS-шифрования открытый текст не уходит в облачный канал.
        console.error("[UI App] MLS encryption failed — переносим в оффлайн-очередь (Fail-Closed):", mlsErr);
        try {
          await syncManager.enqueueOfflineMessage(activeChat.id, text, 'text', null, null, replyToId, tempId);
        } catch (offlineErr) {
          console.error("[UI App] Ошибка добавления сообщения в оффлайн-очередь при сбое MLS:", offlineErr);
        }
        showToast("Ошибка MLS-шифрования: сообщение не отправлено, сохранено в очередь (Fail-Closed)", "error");
        return;
      }
    }

    // Если включен BLE Mesh, передаем зашифрованный пакет в локальный радиоэфир соседним устройствам напрямую
    const meshSnapshot = offlineMeshManager.getSnapshot();
    if (meshSnapshot.isMeshEnabled) {
      if (textToSend && isE2EEMessage(textToSend)) {
        const senderId = localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id') || meshSnapshot.localNodeId || 'local-user';
        const senderName = localStorage.getItem('username') || 'Собеседник';
        const meshEnvelopePayload = JSON.stringify({
          id: tempId,
          chatId: activeChat.id,
          recipientId: activeChat.id,
          isGroup: Boolean(activeChat.isGroup),
          sender: senderId,
          senderNodeId: meshSnapshot.localNodeId || senderId,
          senderDeviceId: meshSnapshot.localDeviceId || '',
          senderName: senderName,
          text: textToSend,
          time: tempMsg.time,
          timestamp: tempMsg.timestamp,
          replyToMessageId: replyToId,
          type: 'text',
          topic_id: activeTopicId
        });
        offlineMeshManager.enqueueEnvelope(activeChat.id, meshEnvelopePayload);
      } else {
        console.warn("[UI App] Передача копии в BLE Mesh радиоэфир отменена: сообщение не зашифровано (Fail-Closed).");
      }
    }

    try {
      const res = await tdlib.send("send_message", {
        chatId: activeChat.id,
        text: textToSend,
        replyToMessageId: replyToId,
        senderName: localStorage.getItem('username') || 'Я',
        topic_id: activeTopicId ?? undefined,
        expiresAt: ttlExpiresAt,
        idempotencyKey: tempId
      });
      
      const messageId = res?.messageId || res?.message_id;
      const pts = res?.pts || (res?.message_seq_id !== undefined ? res.message_seq_id + 1 : undefined);
      
      if (res && messageId) {
        // Устанавливаем реальный id и обновляем pts в SyncManager (с защитой от дубликата при гонке с WebSocket new_message)
        setChats((prevChats: any) => prevChats.map((chat: any) => {
          if (chat.id === activeChat.id) {
            const hasServerMsg = chat.messages.some((m: any) => String(m.id) === String(messageId) && m.id !== tempId);
            const nextMessages = hasServerMsg
              ? chat.messages
                  .filter((m: any) => m.id !== tempId)
                  .map((m: any) =>
                    String(m.id) === String(messageId)
                      ? { ...m, text, pts: pts ?? m.pts, status: m.status === 'read' ? 'read' : 'sent', ...(typedPayload || {}) }
                      : m
                  )
              : chat.messages.map((m: any) =>
                  m.id === tempId ? { ...m, id: messageId, pts, status: 'sent' } : m
                );
            return {
              ...chat,
              messages: nextMessages
            };
          }
          return chat;
        }));
        if (pts) {
          syncManager.setPts(activeChat.id, pts);
        }
        
        // Сохраняем зашифрованную копию сообщения в БД
        const realMsg = {
          id: messageId,
          sender: 'me',
          senderName: 'Я',
          text: text,
          time: tempMsg.time,
          pts,
          timestamp: Date.now(),
          replyToMessageId: replyToId,
          topic_id: activeTopicId,
          ttl_seconds: sendTtlSeconds > 0 ? sendTtlSeconds : undefined,
          expires_at: sendTtlSeconds > 0 ? Date.now() + sendTtlSeconds * 1000 : undefined,
          ...(typedPayload || {}),
        };
        await syncManager.saveMessageToDb(activeChat.id, markLocallyDecrypted(realMsg));

        // Взаимное исключение каналов (HTMA §13.2): Server ACK с pts — доставка через
        // облако состоялась, mesh-копия больше не нужна и удаляется из радио-очереди,
        // иначе pump продолжит перекачку уже доставленного конверта
        try {
          await offlineMeshManager.removeEnvelope(tempId);
          if (messageId && messageId !== tempId) {
            await offlineMeshManager.removeEnvelope(messageId);
          }
        } catch (meshCleanupErr) {
          console.warn('[UI App] Ошибка удаления mesh-конверта после Server ACK:', meshCleanupErr);
        }
      }
    } catch (err) {
      console.error("[UI App] Ошибка отправки сообщения, переносим в оффлайн-очередь:", err);
      setChats((prevChats: any) => prevChats.map((chat: any) => {
        if (chat.id === activeChat.id) {
          return {
            ...chat,
            messages: chat.messages.map((m: any) => m.id === tempId ? { ...m, status: 'pending' as const, isE2EESendFailed: true } : m)
          };
        }
        return chat;
      }));
      showToast('Не удалось отправить — повторим при подключении', 'info');
      try {
        // SYN-001 (§13.1 Single-Encryption): если textToSend уже был успешно зашифрован перед tdlib.send,
        // сохраняем в outbox готовый шифротекст, предотвращая повторный сдвиг Double Ratchet/MLS
        const textForOutbox = (textToSend && isE2EEMessage(textToSend)) ? textToSend : text;
        await syncManager.enqueueOfflineMessage(
          activeChat.id,
          textForOutbox,
          'text',
          null,
          null,
          replyToId,
          tempId,
          null,
          text,
          typedPayload || undefined
        );
      } catch (offlineErr) {
        console.error("[UI App] Ошибка добавления сообщения в оффлайн-очередь:", offlineErr);
      }
    }
  };

  // Загрузка медиа-блобов (записанного аудио/видео) на сервер через API
  const uploadMediaBlob = async (blob: Blob, fileName: string): Promise<string | null> => {
    const fileToUpload = new File([blob], fileName, { type: blob.type || 'audio/ogg' });
    const formData = new FormData();
    formData.append("file", fileToUpload, fileName);

    try {
      const res = await fetch(getBackendUrl("/api/v1/media/upload"), {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Ошибка загрузки медиа: ${res.statusText}`);
      }

      const data = await res.json();
      return data.url || null;
    } catch (err) {
      console.error("Ошибка при загрузке медиа-blob на сервер:", err);
      return null;
    }
  };

  // Обработчик отправки медиа-сообщений через TDLib
  const handleSendMediaMessage = async (
    type: 'sticker' | 'voice' | 'video_note' | 'photo' | 'video',
    mediaUrl: string,
    text: string,
    peaks?: number[],
    keyHex?: string,
    ivHex?: string
  ) => {
    if (!activeChat) return;

    const replyToId = replyingToMessage ? replyingToMessage.id : undefined;
    setReplyingToMessage(null);

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      sender: 'me',
      senderName: 'Я',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      type,
      mediaUrl,
      peaks,
      mediaKey: keyHex,
      mediaIv: ivHex,
      replyToMessageId: replyToId,
      status: 'pending'
    };

    // Оптимистичное обновление UI
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

    if (tdlib.isOffline()) {
      console.log("[UI App] Обнаружен оффлайн-режим. Добавление медиа-сообщения в оффлайн-очередь Outbox.");
      try {
        setChats((prevChats: any) => prevChats.map((chat: any) => {
          if (chat.id === activeChat.id) {
            return {
              ...chat,
              messages: chat.messages.map((m: any) => m.id === tempId ? { ...m, status: 'pending' as const } : m)
            };
          }
          return chat;
        }));
        let mappedType: 'text' | 'voice' | 'video_note' | 'file' = 'file';
        if (type === 'voice') mappedType = 'voice';
        else if (type === 'video_note') mappedType = 'video_note';

        // Короткие голосовые сообщения (до 16 КБ ~ 8-10 сек Opus) упаковываем в data: URL
        // внутри E2EE-конверта для прямой доставки по BLE Mesh без участия сервера
        let voiceMeshCiphertext: string | null = null;
        let voiceInlineDataUrl: string | null = null;
        if (type === 'voice' && mediaUrl && mediaUrl.startsWith('blob:') && offlineMeshManager.getSnapshot().isMeshEnabled) {
          try {
            const resp = await fetch(mediaUrl);
            const blob = await resp.blob();
            if (blob && blob.size > 0 && blob.size <= 16384) {
              const arrayBuf = await blob.arrayBuffer();
              const bytes = new Uint8Array(arrayBuf);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64Audio = btoa(binary);
              const mimeType = blob.type || 'audio/ogg';
              voiceInlineDataUrl = `data:${mimeType};base64,${base64Audio}`;
              const voicePayload = JSON.stringify({
                text,
                type: 'voice',
                mediaUrl: voiceInlineDataUrl,
                peaks,
                replyToMessageId: replyToId
              });
              const isGroupForMesh = Boolean(activeChat.isGroup || activeChat.type === 'group');
              if (!isGroupForMesh && activeChat.type !== 'channel') {
                const peerObj = offlineMeshManager.getPeer(activeChat.id);
                const offlineBundle = peerObj?.prekeyBundle || null;
                voiceMeshCiphertext = await encryptMessage(activeChat.id, voicePayload, {
                  offlineBundle,
                  preferOffline: true,
                });
              } else if (isGroupForMesh) {
                let session = syncManager.getMlsSession(activeChat.id);
                if (!session) {
                  session = await syncManager.initMlsSessionFromWelcomePackage(activeChat.id);
                }
                if (session) {
                  const encResult = await session.encryptMessage(voicePayload);
                  voiceMeshCiphertext = JSON.stringify({
                    ciphertextHex: encResult.ciphertextHex,
                    mlsCiphertextHex: encResult.ciphertextHex,
                    ivHex: encResult.ivHex,
                    epochNumber: encResult.epochNumber
                  });
                }
              }
            }
          } catch (voiceMeshErr) {
            console.warn("[UI App] Не удалось подготовить короткое голосовое для BLE Mesh:", voiceMeshErr);
          }
        }

        if (voiceMeshCiphertext && isE2EEMessage(voiceMeshCiphertext)) {
          await syncManager.enqueueOfflineMessage(
            activeChat.id,
            voiceMeshCiphertext,
            mappedType,
            voiceInlineDataUrl || mediaUrl,
            peaks as any,
            replyToId,
            tempId,
            null,
            text
          );
          const meshSnapshot = offlineMeshManager.getSnapshot();
          const senderId = localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id') || meshSnapshot.localNodeId || 'local-user';
          const senderName = localStorage.getItem('username') || 'Собеседник';
          const meshEnvelopePayload = JSON.stringify({
            id: tempId,
            chatId: activeChat.id,
            recipientId: activeChat.id,
            isGroup: Boolean(activeChat.isGroup),
            sender: senderId,
            senderNodeId: meshSnapshot.localNodeId || senderId,
            senderDeviceId: meshSnapshot.localDeviceId || '',
            senderName,
            text: voiceMeshCiphertext,
            time: tempMsg.time,
            timestamp: tempMsg.timestamp,
            replyToMessageId: replyToId,
            type: 'voice'
          });
          if (meshEnvelopePayload.length <= 58 * 1024) {
            offlineMeshManager.enqueueEnvelope(activeChat.id, meshEnvelopePayload);
            showToast("Голосовое сообщение зашифровано и передано в BLE Mesh эфир", "info");
          }
        } else {
          await syncManager.enqueueOfflineMessage(activeChat.id, text, mappedType, mediaUrl, peaks as any, replyToId, tempId);
        }
      } catch (offlineErr) {
        console.error("[UI App] Ошибка добавления медиа-сообщения в оффлайн-очередь:", offlineErr);
      }
      return;
    }

    let finalMediaUrl = mediaUrl;
    let finalKeyHex = keyHex;
    let finalIvHex = ivHex;

    try {
      // Если это локальный blob URL, загружаем его на server перед отправкой
      if (mediaUrl.startsWith('blob:')) {
        try {
          const response = await fetch(mediaUrl);
          const blob = await response.blob();
          const isMp4Audio = blob.type.includes('mp4') || blob.type.includes('aac');
          const filename = type === 'voice' ? (isMp4Audio ? 'voice.m4a' : 'voice.ogg') : type === 'video_note' ? 'video_note.mp4' : 'file';
          
          let blobToSend: Blob = blob;
          let finalFilename = filename;
          
          if (type === 'voice') {
            try {
              blobToSend = await ensureUniversalAudioBlob(blob);
              finalFilename = blobToSend.type.includes('wav') ? 'voice.wav' : 'voice.m4a';
            } catch (voiceNormErr) {
              console.warn("[App] Ошибка нормализации голосового сообщения (фоллбек на оригинал):", voiceNormErr);
              blobToSend = blob;
            }
          } else if (type === 'video_note') {
            console.log("[App] Сжатие видео-кружка перед отправкой...");
            try {
              const isMp4 = blob.type.includes('mp4');
              const extension = isMp4 ? 'mp4' : 'webm';
              const fileType = isMp4 ? 'video/mp4' : 'video/webm';
              const fileFromBlob = new File([blob], `video_note.${extension}`, { type: fileType });
              const compressedBlob = await compressVideoNote(fileFromBlob);
              blobToSend = compressedBlob;
              finalFilename = 'video_note_compressed.mp4';
              console.log(`[App] Видео-кружок сжат. Размер: ${blobToSend.size} байт (было ${blob.size})`);
            } catch (compressErr) {
              console.error("[App] Ошибка сжатия видео-кружка (фоллбек на оригинал):", compressErr);
              blobToSend = blob;
              finalFilename = filename;
            }
          }

          if (activeChat.type !== 'channel' && !finalKeyHex) {
            console.log("[App] E2EE: Шифрование blob-медиа перед отправкой...");
            try {
              const encryptResult = await encryptMediaBlob(blobToSend);
              blobToSend = encryptResult.encryptedBlob;
              finalKeyHex = encryptResult.keyHex;
              finalIvHex = encryptResult.ivHex;
              const baseName = finalFilename.replace(/\.[^/.]+$/, "");
              finalFilename = `${baseName}.enc`;
              console.log("[App] E2EE: Blob успешно зашифрован. Имя файла:", finalFilename);
            } catch (encErr) {
              // Fail-Closed (§12.5): незашифрованный blob не загружается на сервер;
              // исключение уходит в общий catch → blob персистится в offline-очередь.
              console.error("[App] E2EE: Ошибка шифрования blob-медиа — блокирую загрузку (Fail-Closed):", encErr);
              showToast("Ошибка шифрования медиа: загрузка заблокирована (Fail-Closed)", "error");
              throw encErr;
            }
          }
          
          let uploadedUrl: string | null = null;
          if (blobToSend.size > 50 * 1024 * 1024) {
            console.log("[App] Размер видео-кружка > 50 МБ, используем Tus-загрузку...");
            uploadedUrl = await uploadMediaTus(blobToSend, finalFilename);
          } else {
            uploadedUrl = await uploadMediaBlob(blobToSend, finalFilename);
          }
          
          if (uploadedUrl) {
            finalMediaUrl = uploadedUrl;
          } else {
            throw new Error("Не удалось загрузить медиафайл");
          }
        } catch (uploadErr) {
          console.error("[UI App] Ошибка автозагрузки blob на сервер:", uploadErr);
          throw uploadErr;
        }
      }

      let textToSend = text;
      let typeToSend: "video" | "sticker" | "voice" | "video_note" | "photo" | "text" = type;
      let mediaUrlToSend: string | undefined = finalMediaUrl;
      let peaksToSend = peaks;

      if (!activeChat.isGroup && activeChat.type !== 'channel') {
        try {
          const mediaPayload = JSON.stringify({
            text,
            type,
            mediaUrl: finalMediaUrl,
            peaks,
            key: finalKeyHex,
            iv: finalIvHex,
            replyToMessageId: replyToId
          });
          textToSend = await encryptMessage(activeChat.id, mediaPayload);
          typeToSend = 'text';
          mediaUrlToSend = undefined;
          peaksToSend = undefined;
        } catch (encryptErr) {
          // Fail-Closed (§12.5): payload с ключами и текстом не уходит в облако открытым текстом.
          console.error("[UI App] E2EE encryption failed for media — блокирую отправку (Fail-Closed):", encryptErr);
          showToast("Ошибка шифрования медиа: сообщение не отправлено, сохранено в очередь (Fail-Closed)", "error");
          throw encryptErr;
        }
      } else if (activeChat.isGroup && activeChat.type !== 'channel') {
        try {
          let session = syncManager.getMlsSession(activeChat.id);
          if (!session) {
            session = await syncManager.initMlsSessionFromWelcomePackage(activeChat.id);
          }
          if (!session) {
            throw new Error(`Нет MLS сессии для группы ${activeChat.id} — отправка заблокирована (Fail-Closed §12.5)`);
          }
          const mediaPayload = JSON.stringify({
            text,
            type,
            mediaUrl: finalMediaUrl,
            peaks,
            key: finalKeyHex,
            iv: finalIvHex,
            replyToMessageId: replyToId
          });
          const encResult = await session.encryptMessage(mediaPayload);
          textToSend = JSON.stringify({
            ciphertextHex: encResult.ciphertextHex,
            mlsCiphertextHex: encResult.ciphertextHex,
            ivHex: encResult.ivHex,
            epochNumber: encResult.epochNumber
          });
          typeToSend = 'text';
          mediaUrlToSend = undefined;
          peaksToSend = undefined;
        } catch (mlsErr) {
          // Fail-Closed (§12.5): payload с ключами и текстом не уходит в облако открытым текстом.
          console.error("[UI App] MLS encryption failed for media — блокирую отправку (Fail-Closed):", mlsErr);
          showToast("Ошибка MLS-шифрования медиа: сообщение не отправлено, сохранено в очередь (Fail-Closed)", "error");
          throw mlsErr;
        }
      }

      const res = await tdlib.send("send_message", {
        chatId: activeChat.id,
        text: textToSend,
        type: typeToSend,
        mediaUrl: mediaUrlToSend,
        peaks: peaksToSend,
        replyToMessageId: replyToId,
        senderName: localStorage.getItem('username') || 'Я',
        idempotencyKey: tempId
      });
      
      const messageId = res?.messageId || res?.message_id;
      const pts = res?.pts || (res?.message_seq_id !== undefined ? res.message_seq_id + 1 : undefined);
      
      if (res && messageId) {
        setChats((prevChats: any) => prevChats.map((chat: any) => {
          if (chat.id === activeChat.id) {
            const hasServerMsg = chat.messages.some((m: any) => String(m.id) === String(messageId) && m.id !== tempId);
            const nextMessages = hasServerMsg
              ? chat.messages
                  .filter((m: any) => m.id !== tempId)
                  .map((m: any) =>
                    String(m.id) === String(messageId)
                      ? {
                          ...m,
                          text,
                          type,
                          pts: pts ?? m.pts,
                          mediaUrl: finalMediaUrl,
                          mediaKey: finalKeyHex,
                          mediaIv: finalIvHex,
                          peaks: peaks || m.peaks,
                          replyToMessageId: replyToId,
                          status: m.status === 'read' ? 'read' : 'sent'
                        }
                      : m
                  )
              : chat.messages.map((m: any) =>
                  m.id === tempId
                    ? { ...m, id: messageId, pts, mediaUrl: finalMediaUrl, mediaKey: finalKeyHex, mediaIv: finalIvHex, replyToMessageId: replyToId, status: 'sent' }
                    : m
                );
            return {
              ...chat,
              messages: nextMessages
            };
          }
          return chat;
        }));
        if (pts) {
          syncManager.setPts(activeChat.id, pts);
        }
        
        // Сохраняем зашифрованную копию сообщения в БД
        const realMsg = {
          id: messageId,
          sender: 'me',
          senderName: 'Я',
          text: text,
          time: tempMsg.time,
          pts,
          timestamp: Date.now(),
          type,
          mediaUrl: finalMediaUrl,
          peaks,
          mediaKey: finalKeyHex,
          mediaIv: finalIvHex,
          replyToMessageId: replyToId
        };
        await syncManager.saveMessageToDb(activeChat.id, markLocallyDecrypted(realMsg));
      }
    } catch (err) {
      console.error("[UI App] Ошибка отправки медиа-сообщения, переносим в оффлайн-очередь:", err);
      setChats((prevChats: any) => prevChats.map((chat: any) => {
        if (chat.id === activeChat.id) {
          return {
            ...chat,
            messages: chat.messages.map((m: any) => m.id === tempId ? { ...m, status: 'pending' as const, isE2EESendFailed: true } : m)
          };
        }
        return chat;
      }));
      showToast('Не удалось отправить — повторим при подключении', 'info');
      try {
        let mappedType: 'text' | 'voice' | 'video_note' | 'file' = 'file';
        if (type === 'voice') mappedType = 'voice';
        else if (type === 'video_note') mappedType = 'video_note';
        // F-7: блоб уже зашифрован и загружен на сервер — ключи обязаны пережить
        // offline-очередь, иначе ретрай отправит mediaPayload без ключей
        const mediaKeys = (finalKeyHex && finalIvHex) ? { key: finalKeyHex, iv: finalIvHex } : null;
        await syncManager.enqueueOfflineMessage(activeChat.id, text, mappedType, finalMediaUrl, peaks as any, replyToId, tempId, mediaKeys);
      } catch (offlineErr) {
        console.error("[UI App] Ошибка добавления медиа-сообщения в оффлайн-очередь:", offlineErr);
      }
    }
  };

  // Эффект для автовысоты текстового поля ввода
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
    }
  }, [newMessageText]);

  // Эффект для управления воспроизведением видео в превью Lock Mode
  useEffect(() => {
    if (recordedVideoUrl) {
      setVideoPlayState('playing');
      if (videoPreviewRef.current) {
        videoPreviewRef.current.play().catch((e: any) => console.error(e));
      }
    } else {
      setVideoPlayState('paused');
    }
  }, [recordedVideoUrl]);

  // Определение лучшего поддерживаемого MIME-типа для аудиозаписи (Universal MP4/AAC для iOS Safari & Android)
  const getBestAudioMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return '';
    }
    // MP4 / AAC поддерживается аппаратно на iOS Safari/WebKit, Android Chrome, Desktop Chrome, Edge и Electron
    // Это гарантирует воспроизведение звука на всех платформах без тишины на iPhone.
    const preferredOrder = [
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4;codecs=aac',
      'audio/aac',
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];

    for (const type of preferredOrder) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  // Запуск записи голосового сообщения
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (isHoldingRecordRef.current === false && audioLockMode === false) {
        stream.getTracks().forEach((track: any) => track.stop());
        return;
      }

      const rawPreset = (ctx.voiceChangerPreset || localStorage.getItem('gossip_voice_preset') || 'original') as VoiceChangerPreset;
      const activePreset: VoiceChangerPreset = isPremium ? rawPreset : 'original';
      const voiceGraph = buildVoiceChangerGraph(stream, activePreset);

      const audioMimeType = getBestAudioMimeType();
      const options = audioMimeType ? { mimeType: audioMimeType } : undefined;
      const targetStream = voiceGraph.recordingStream || stream;
      const recorder = options ? new MediaRecorder(targetStream, options) : new MediaRecorder(targetStream);
      const resolvedMime = recorder.mimeType || audioMimeType || 'audio/mp4';
      (recorder as any).recordingMimeType = resolvedMime;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const isIOSDevice = typeof navigator !== 'undefined' && (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      );
      // Для MP4 / AAC контейнеров на всех платформах запускаем БЕЗ timeslice,
      // чтобы сформировать цельный валидный moov-заголовок для iOS и Android
      if (isIOSDevice || resolvedMime.includes('mp4') || resolvedMime.includes('aac')) {
        recorder.start();
      } else {
        recorder.start(100);
      }
      setAudioRecorder(recorder);
      audioRecorderRef.current = recorder;
      setIsAudioRecording(true);
      isAudioRecordingRef.current = true;
      setAudioRecordDuration(0);
      setRecordedAudioUrl(null);

      // Web Audio API для считывания реальной огибающей звука с микрофона (или выхода DSP-модулятора)
      const audioCtx: AudioContext | null = voiceGraph.audioCtx;
      const analyser: AnalyserNode | null = voiceGraph.analyser;
      let samplerInterval: any = null;
      const rawLivePeaks: number[] = [];

      try {
        if (analyser) {
          const sampleBuffer = new Uint8Array(analyser.frequencyBinCount);
          samplerInterval = setInterval(() => {
            if (!analyser) return;
            analyser.getByteFrequencyData(sampleBuffer);
            let sum = 0;
            for (let i = 0; i < sampleBuffer.length; i++) {
              sum += sampleBuffer[i];
            }
            const avg = sum / sampleBuffer.length; // 0..255
            const normalized = Math.min(1.0, Math.max(0.08, avg / 100.0));
            rawLivePeaks.push(parseFloat(normalized.toFixed(2)));
            setAudioPeaks([...rawLivePeaks]);
          }, 80);
        }
      } catch (audioCtxErr) {
        console.warn('[AudioRecording] Web Audio Context initialization warning:', audioCtxErr);
      }

      // Запуск таймера секунд
      audioTimerRef.current = setInterval(() => {
        setAudioRecordDuration((prev: any) => prev + 1);
      }, 1000);

      // Сохраняем стрим, чанки и анализатор
      (recorder as any).audioStream = stream;
      (recorder as any).chunks = chunks;
      (recorder as any).audioCtx = audioCtx;
      (recorder as any).voiceGraphCleanup = voiceGraph.cleanup;
      (recorder as any).samplerInterval = samplerInterval;
      (recorder as any).rawLivePeaks = rawLivePeaks;
    } catch (err) {
      console.error('Ошибка доступа к микрофону:', err);
    }
  };

  // Остановка записи голосового сообщения
  const stopAudioRecording = async (send: boolean = true, listen: boolean = false) => {
    console.log(`[App] stopAudioRecording: send=${send}, listen=${listen}`);
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }

    if (audioRecorder) {
      console.log("[AudioRecorder] Stopping recorder state:", audioRecorder);
    }

    const recorder = audioRecorderRef.current;
    const isRecording = isAudioRecordingRef.current;

    if (recorder && isRecording) {
      // Мгновенно сбрасываем синхронные ref-флаги ДО вызова recorder.stop(),
      // чтобы повторные вызовы (touchend + синтетический mouseup / клик) не отправили аудио дважды
      isAudioRecordingRef.current = false;
      audioRecorderRef.current = null;
      setIsAudioRecording(false);
      setAudioRecorder(null);

      const stream = (recorder as any).audioStream;
      const chunks = (recorder as any).chunks;

      // Останавливаем сэмплирование звука и освобождаем AudioContext / DSP граф
      const samplerInterval = (recorder as any).samplerInterval;
      if (samplerInterval) {
        clearInterval(samplerInterval);
      }
      if (typeof (recorder as any).voiceGraphCleanup === 'function') {
        try {
          (recorder as any).voiceGraphCleanup();
        } catch {}
      } else {
        const audioCtx = (recorder as any).audioCtx;
        if (audioCtx) {
          audioCtx.close().catch(() => {});
        }
      }

      // Формируем чистый нормализованный массив реальных пиков
      const rawLivePeaks: number[] = (recorder as any).rawLivePeaks || [];
      let finalPeaks: number[] = [];
      if (rawLivePeaks.length > 0) {
        const targetLen = Math.min(42, Math.max(16, rawLivePeaks.length));
        if (rawLivePeaks.length <= targetLen) {
          finalPeaks = rawLivePeaks;
        } else {
          const blockSize = rawLivePeaks.length / targetLen;
          for (let i = 0; i < targetLen; i++) {
            const start = Math.floor(i * blockSize);
            const end = Math.floor((i + 1) * blockSize);
            const slice = rawLivePeaks.slice(start, end);
            const maxVal = slice.length > 0 ? Math.max(...slice) : 0.1;
            finalPeaks.push(parseFloat(maxVal.toFixed(2)));
          }
        }
      } else {
        // Fallback если запись была мгновенной
        for (let i = 0; i < 30; i++) {
          finalPeaks.push(0.15);
        }
      }
      (recorder as any).peaks = finalPeaks;
      setAudioPeaks(finalPeaks);

      let onStopHandled = false;
      recorder.onstop = async () => {
        if (onStopHandled) return;
        onStopHandled = true;
        console.log(`[App] audioRecorder.onstop сработал, chunks: ${chunks ? chunks.length : 0}`);
        const resolvedMimeType = (recorder as any).recordingMimeType || recorder.mimeType || 'audio/mp4';
        if (send) {
          const audioBlob = new Blob(chunks, { type: resolvedMimeType });
          const audioUrl = URL.createObjectURL(audioBlob);
          const peaks = (recorder as any).peaks;
          await handleSendMediaMessage('voice', audioUrl, '🎤 Голосовое сообщение', peaks);
          stream.getTracks().forEach((track: any) => track.stop());
        } else if (listen) {
          const audioBlob = new Blob(chunks, { type: resolvedMimeType });
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(audioUrl);
          stream.getTracks().forEach((track: any) => track.stop());
        } else {
          // Отмена
          stream.getTracks().forEach((track: any) => track.stop());
        }
      };

      try {
        console.log(`[App] Вызов recorder.stop(), состояние: ${recorder.state}`);
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch (err) {
        console.error('[App] Ошибка при вызове recorder.stop():', err);
      }
    } else {
      console.log(`[App] stopAudioRecording пропущена: recorder=${!!recorder}, isRecording=${isRecording}`);
    }
  };

  const handleSendRecordedAudio = async () => {
    if (recordedAudioUrl) {
      const urlToSend = recordedAudioUrl;
      const peaksToSend = audioPeaks;
      // Сбрасываем состояние синхронно ДО асинхронной отправки, исключая повторную отправку при двойном клике
      setRecordedAudioUrl(null);
      setAudioRecordDuration(0);
      setAudioLockMode(false);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
      await handleSendMediaMessage('voice', urlToSend, '🎤 Голосовое сообщение', peaksToSend);
    }
  };

  const handleDiscardRecordedAudio = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioUrl(null);
    setAudioRecordDuration(0);
    setAudioLockMode(false);
  };

  const handleTogglePlayRecordedAudio = () => {
    if (!recordedAudioUrl) return;
    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(recordedAudioUrl);
      audioPreviewRef.current.onended = () => {
        setAudioPlayState('paused');
      };
    }
    
    if (audioPlayState === 'playing') {
      audioPreviewRef.current.pause();
      setAudioPlayState('paused');
    } else {
      audioPreviewRef.current.play();
      setAudioPlayState('playing');
    }
  };

  // Жесты для записи (удержание, свайпы)
  const handleRecordStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    console.log("App [Gesture]: handleRecordStart, inputMode =", inputMode);
    
    const isTouch = 'touches' in e || e.type.startsWith('touch');
    const now = Date.now();
    
    if (isTouch) {
      lastTouchTimeRef.current = now;
    } else {
      // Защита от ghost click на мобильных: игнорируем клики мыши, если недавно был тач
      if (now - lastTouchTimeRef.current < 1000) {
        return;
      }
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    touchStartRef.current = { x: clientX, y: clientY, time: now };
    isHoldingRecordRef.current = true;

    setAudioLockMode(false);
    setRecordedAudioUrl(null);
    setAudioPlayState('paused');
    setVideoNoteTriggerStop(0);
    setVideoLockMode(false);
    setRecordedVideoUrl(null);
    setVideoPlayState('paused');
    setVideoRecordingActive(false);
    setVideoNoteTriggerStart(0);
    setVideoNoteTriggerSwitch(0);

    // Таймаут удержания (300 мс)
    holdTimeoutRef.current = setTimeout(() => {
      if (isHoldingRecordRef.current) {
        if (inputModeRef.current === 'mic') {
          startAudioRecording();
        } else {
          setIsRecordingVideoNote(true);
          setVideoLockMode(true);
        }
      }
    }, 300);

    if (isTouch) {
      window.addEventListener('touchmove', handleRecordMove, { passive: false });
      window.addEventListener('touchend', handleRecordEnd);
    } else {
      window.addEventListener('mousemove', handleRecordMove);
      window.addEventListener('mouseup', handleRecordEnd);
    }
  };

  const handleRecordMove = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e || e.type?.startsWith('touch')) {
      lastTouchTimeRef.current = Date.now();
    }
    if (!touchStartRef.current || !isHoldingRecordRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const diffX = clientX - touchStartRef.current.x;
    const diffY = clientY - touchStartRef.current.y;
    console.log("App [Gesture]: handleRecordMove, diffX =", diffX, "diffY =", diffY, "isHoldingRecord =", isHoldingRecordRef.current);

    // Свайп влево для отмены (движение влево на 80px и более)
    if (diffX < -80) {
      cleanupRecordListeners();
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      isHoldingRecordRef.current = false;
      
      if (inputModeRef.current === 'mic') {
        stopAudioRecording(false);
        showToast("Запись отменена", "info");
      } else {
        setIsRecordingVideoNote(false);
        setVideoNoteTriggerStop(0);
        setVideoLockMode(false);
        showToast("Запись видео-кружка отменена", "info");
      }
    }
    // Свайп вверх для Lock Mode (движение вверх на 80px и более)
    else if (diffY < -80) {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      cleanupRecordListeners();
      isHoldingRecordRef.current = false;
      if (inputModeRef.current === 'mic') {
        setAudioLockMode(true);
        showToast("Запись зафиксирована", "success");
      } else {
        setVideoLockMode(true);
        showToast("Запись видео зафиксирована", "success");
      }
    }
  };

  const handleRecordEnd = (e?: MouseEvent | TouchEvent) => {
    if (!e || 'touches' in e || 'changedTouches' in e || e.type?.startsWith('touch')) {
      lastTouchTimeRef.current = Date.now();
    }
    cleanupRecordListeners();
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);

    console.log("App [Gesture]: handleRecordEnd, isHoldingRecord =", isHoldingRecordRef.current);
    if (!isHoldingRecordRef.current) return;
    isHoldingRecordRef.current = false;

    const duration = Date.now() - (touchStartRef.current?.time || 0);
    if (duration < 300) {
      // Одиночный клик - циклическое переключение режима (микрофон <-> видеокамера)
      const now = Date.now();
      if (now - lastModeToggleTimeRef.current > 250) {
        lastModeToggleTimeRef.current = now;
        setInputMode((prev: any) => {
          const next = prev === 'mic' ? 'video' : 'mic';
          showToast(
            next === 'mic' 
              ? "🎤 Режим: Голосовые сообщения (удерживайте для записи)" 
              : "📹 Режим: Видео-кружки (удерживайте для записи)", 
            "info"
          );
          return next;
        });
      }
    } else {
      // Удержание (Завершение записи)
      if (inputModeRef.current === 'mic') {
        if (!audioLockModeRef.current) {
          stopAudioRecording(true);
        }
      } else {
        if (!videoLockModeRef.current) {
          // Сигнал остановить и сохранить кружок
          setVideoNoteTriggerStop((prev: any) => prev + 1);
        }
      }
    }
  };

  const cleanupRecordListeners = () => {
    window.removeEventListener('mousemove', handleRecordMove);
    window.removeEventListener('mouseup', handleRecordEnd);
    window.removeEventListener('touchmove', handleRecordMove);
    window.removeEventListener('touchend', handleRecordEnd);
  };

  const handleMessageReactionMenu = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // R4 (M4.5): в режиме выбора клик по сообщению toggles выбор, меню не открываем
    if (selectedMessageIds.size > 0) {
      setSelectedMessageIds((prev: any) => {
        const next = new Set(prev);
        if (next.has(messageId)) next.delete(messageId);
        else if (next.size < 100) next.add(messageId);
        return next;
      });
      return;
    }
    setActiveReactionMessageId(messageId);
    setReactionMenuCoords({
      x: Math.min(e.clientX, window.innerWidth - 240),
      y: Math.min(e.clientY, window.innerHeight - 80)
    });
  };

  const handleApplyReaction = async (messageId: string, reaction: string, e: React.MouseEvent) => {
    e.stopPropagation();
    launchConfetti(e.clientX, e.clientY);

    setChats((prevChats: any) => prevChats.map((chat: any) => {
      if (chat.id === activeChat.id) {
        return {
          ...chat,
          messages: chat.messages.map((m: any) => m.id === messageId ? { ...m, reaction } : m)
        };
      }
      return chat;
    }));

    setActiveReactionMessageId(null);
    setReactionMenuCoords(null);

    try {
      await fetch(getBackendUrl(`/api/v1/messages/${messageId}/reaction`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
        },
        body: JSON.stringify({ reaction })
      });
    } catch (err) {
      console.error("Ошибка при отправке реакции:", err);
    }
  };

  const handleActionReply = (messageId: string) => {
    const msg = activeChat?.messages.find((m: any) => m.id === messageId);
    if (msg) {
      setReplyingToMessage(msg);
      setEditingMessage(null);
    }
    setActiveReactionMessageId(null);
    setReactionMenuCoords(null);
  };

  const handleActionEdit = (msg: Message) => {
    setEditingMessage(msg);
    setReplyingToMessage(null);
    setNewMessageText(msg.text);
    setActiveReactionMessageId(null);
    setReactionMenuCoords(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleActionCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setToast({ message: "Текст скопирован в буфер обмена", type: "success" });
    }).catch((err: any) => {
      console.error("Не удалось скопировать текст:", err);
    });
    setActiveReactionMessageId(null);
    setReactionMenuCoords(null);
  };

  const handleActionForward = (messageId: string) => {
    if (activeChat && isChatIn152FzContour(activeChat.id)) {
      showToast("🛡️ Пересылка запрещена: чат защищен режимом «Сейф-Контур» (DLP)", "error");
      setActiveReactionMessageId(null);
      setReactionMenuCoords(null);
      return;
    }
    setForwardingMessageId(messageId);
    setIsForwardModalOpen(true);
    setActiveReactionMessageId(null);
    setReactionMenuCoords(null);
  };

  const handleActionPin = (messageId: string) => {
    if (!activeChat) return;
    setPinnedMessageMap((prev: any) => {
      const currentList = prev[activeChat.id] || [];
      if (currentList.includes(messageId)) return prev;
      const updatedList = isPremium ? [...currentList, messageId] : [messageId];
      return { ...prev, [activeChat.id]: updatedList };
    });
    setActiveReactionMessageId(null);
    setReactionMenuCoords(null);
    showToast(isPremium ? "Сообщение закреплено (PRO)" : "Сообщение закреплено", "success");
  };

  const handleActionUnpin = (messageId: string) => {
    if (!activeChat) return;
    setPinnedMessageMap((prev: any) => {
      const currentList = prev[activeChat.id] || [];
      const updatedList = currentList.filter((id: any) => id !== messageId);
      return { ...prev, [activeChat.id]: updatedList };
    });
    setActiveReactionMessageId(null);
    setReactionMenuCoords(null);
    showToast("Сообщение откреплено", "info");
  };

  const handleActionDelete = async (messageId: string, forAll: boolean) => {
    setActiveReactionMessageId(null);
    setReactionMenuCoords(null);
    setShowDeleteConfirm(false);

    setChats((prevChats: any) => prevChats.map((chat: any) => {
      if (chat.id === activeChat.id) {
        return {
          ...chat,
          messages: chat.messages.filter((m: any) => m.id !== messageId)
        };
      }
      return chat;
    }));

    try {
      await storageManager.execute("DELETE FROM messages WHERE id = ?;", [messageId]);
    } catch (err) {
      console.error("Ошибка локального удаления сообщения:", err);
    }

    try {
      await tdlib.send("delete_message", { messageId, forAll });
    } catch (err) {
      console.error("Ошибка отправки запроса на удаление:", err);
    }
  };

  const handleActionRetry = async (msg: Message) => {
    setActiveReactionMessageId(null);
    setReactionMenuCoords(null);
    if (!activeChat) return;

    // UX-1: Переводим статус в pending, сбрасываем счетчик ретраев
    if (msg.id) {
      storageManager.execute(
        "UPDATE messages SET status = 'pending' WHERE id = ?;",
        [msg.id]
      ).catch((e: any) => console.warn("[UI App] Ошибка сброса статуса pending в messages:", e));
    }

    setChats((prevChats: any) => prevChats.map((chat: any) => {
      if (chat.id === activeChat.id) {
        return {
          ...chat,
          messages: chat.messages.map((m: any) => m.id === msg.id ? { ...m, status: 'pending' as const, isE2EESendFailed: false } : m)
        };
      }
      return chat;
    }));

    try {
      const ok = await syncManager.retryOutboxMessage(msg.id);
      if (ok) {
        showToast('Повторная отправка запущена', 'info');
      } else {
        // Если сообщения нет в outbox_queue, переставим заново
        await syncManager.enqueueOfflineMessage(
          activeChat.id,
          msg.text,
          msg.type || 'text',
          msg.mediaUrl || null,
          (msg.peaks as any) || null,
          msg.replyToMessageId,
          msg.id,
          (msg.mediaKey && msg.mediaIv) ? { key: msg.mediaKey, iv: msg.mediaIv } : null
        );
        showToast('Сообщение поставлено в очередь на отправку', 'info');
      }
    } catch (err) {
      console.error('[UI App] Ошибка повторной отправки сообщения:', err);
      showToast('Не удалось повторить отправку', 'error');
    }
  };

  const handleForwardMessage = async (targetChatId: string) => {
    if (!forwardingMessageId) return;

    let sourceMsg: Message | undefined;
    for (const chat of chats) {
      sourceMsg = chat.messages.find((m: any) => m.id === forwardingMessageId);
      if (sourceMsg) break;
    }

    if (!sourceMsg) return;

    const text = sourceMsg.text;
    const senderName = sourceMsg.sender === 'me' ? 'Я' : formatUserDisplayName(sourceMsg.sender, sourceMsg.senderName, null);

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      sender: 'me',
      senderName: 'Я',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      type: sourceMsg.type,
      mediaUrl: sourceMsg.mediaUrl,
      peaks: sourceMsg.peaks,
      mediaKey: sourceMsg.mediaKey,
      mediaIv: sourceMsg.mediaIv,
      forwardFromUser: senderName,
      status: 'pending'
    };

    setChats((prevChats: any) => prevChats.map((chat: any) => {
      if (chat.id === targetChatId) {
        return {
          ...chat,
          lastMessage: text,
          time: tempMsg.time,
          messages: [...chat.messages, tempMsg]
        };
      }
      return chat;
    }));

    try {
      const res = await tdlib.send("send_message", {
        chatId: targetChatId,
        text: text,
        forwardFromUser: senderName
      });

      const messageId = res?.messageId || res?.message_id;
      const pts = res?.pts || (res?.message_seq_id !== undefined ? res.message_seq_id + 1 : undefined);

      if (res && messageId) {
        setChats((prevChats: any) => prevChats.map((chat: any) => {
          if (chat.id === targetChatId) {
            return {
              ...chat,
              messages: chat.messages.map((m: any) => m.id === tempId ? { ...m, id: messageId, pts, status: 'sent' } : m)
            };
          }
          return chat;
        }));

        if (pts) {
          syncManager.setPts(targetChatId, pts);
        }

        const realMsg = {
          id: messageId,
          sender: 'me',
          senderName: 'Я',
          text: text,
          time: tempMsg.time,
          pts,
          timestamp: Date.now(),
          forwardFromUser: senderName
        };
        await syncManager.saveMessageToDb(targetChatId, markLocallyDecrypted(realMsg));
      }
    } catch (err) {
      console.error("Ошибка пересылки сообщения:", err);
    }

    setForwardingMessageId(null);
    setIsForwardModalOpen(false);
  };

  const handleEmojiClick = useCallback((emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      setNewMessageText((prevText: any) => {
        const before = prevText.substring(0, start);
        const after = prevText.substring(end, prevText.length);
        return before + emoji + after;
      });
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(start + emoji.length, start + emoji.length);
        }
      }, 0);
    } else {
      setNewMessageText((prev: any) => prev + emoji);
    }
  }, []);

  // Обработчик ленивой загрузки старых сообщений
  const handleLoadMoreHistory = async () => {
    if (activeChat.messages.length === 0) return;
    const oldestMsg = activeChat.messages[0];
    const offsetPts = oldestMsg.pts || syncManager.getPts(activeChat.id);
    
    try {
      const res = await syncManager.loadHistoryLazy(activeChat.id, offsetPts, 20);
      if (res && res.messages && res.messages.length > 0) {
        const newMsgs: Message[] = res.messages.map((m: any) => ({
          id: m.id,
          sender: (m.sender === 'me' || m.sender === currentUserId) ? 'me' : m.sender,
          senderName: m.senderName || 'Собеседник',
          text: m.text,
          time: m.time || new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          pts: m.pts,
          timestamp: m.timestamp || Date.now(),
          type: m.type || 'text',
          mediaUrl: m.mediaUrl,
          peaks: safeParsePeaks(m.peaks),
          mediaKey: m.mediaKey,
          mediaIv: m.mediaIv,
          reaction: m.reaction,
          replyToMessageId: m.replyToMessageId,
          forwardFromUser: m.forwardFromUser,
          status: m.status || 'read',
          isService: m.isService,
        })).reverse();
        
        setChats((prevChats: any) => prevChats.map((chat: any) => {
          if (chat.id === activeChat.id) {
            const existingIds = new Set(chat.messages.map((m: any) => m.id));
            const uniqueNewMsgs = newMsgs.filter((m: any) => !existingIds.has(m.id));
            return {
              ...chat,
              messages: [...uniqueNewMsgs, ...chat.messages]
            };
          }
          return chat;
        }));
      }
    } catch (err) {
      console.error("[UI App] Ошибка ленивой загрузки истории:", err);
    }
  };


  const handleGroupMemberInputChange = (value: string) => {
    setGroupMemberInput(value);
    
    if (memberSearchTimeoutRef.current) {
      clearTimeout(memberSearchTimeoutRef.current);
    }
    
    const clean = value.trim().startsWith('@') ? value.trim().substring(1) : value.trim();
    if (!clean) {
      setGroupMemberSearchResults([]);
      setIsSearchingMembers(false);
      return;
    }
    
    setIsSearchingMembers(true);
    memberSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(getBackendUrl(`/api/v1/users/search?username=${encodeURIComponent(clean)}&exact=false`), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setGroupMemberSearchResults(Array.isArray(data) ? data : []);
        } else {
          setGroupMemberSearchResults([]);
        }
      } catch (err) {
        console.error("Ошибка при неточном поиске участников:", err);
        setGroupMemberSearchResults([]);
      } finally {
        setIsSearchingMembers(false);
      }
    }, 250);
  };

  const handleAddMemberInputChange = (value: string) => {
    setAddMemberInput(value);
    
    if (addMemberSearchTimeoutRef.current) {
      clearTimeout(addMemberSearchTimeoutRef.current);
    }
    
    const clean = value.trim().startsWith('@') ? value.trim().substring(1) : value.trim();
    if (!clean) {
      setAddMemberSearchResults([]);
      setIsSearchingAddMember(false);
      return;
    }
    
    setIsSearchingAddMember(true);
    addMemberSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(getBackendUrl(`/api/v1/users/search?username=${encodeURIComponent(clean)}&exact=false`), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAddMemberSearchResults(Array.isArray(data) ? data : []);
        } else {
          setAddMemberSearchResults([]);
        }
      } catch (err) {
        console.error("Ошибка при поиске участников для добавления:", err);
        setAddMemberSearchResults([]);
      } finally {
        setIsSearchingAddMember(false);
      }
    }, 250);
  };

  const handleAddGroupMember = async () => {
    if (!groupMemberInput.trim()) return;
    const cleanName = groupMemberInput.trim().startsWith('@') ? groupMemberInput.trim().substring(1) : groupMemberInput.trim();
    
    const myUsername = localStorage.getItem("username") || "";
    if (cleanName.toLowerCase() === myUsername.toLowerCase()) {
      showToast("Вы автоматически входите в группу как создатель", "info");
      return;
    }

    if (selectedGroupMembers.some((m: any) => m.username.toLowerCase() === cleanName.toLowerCase())) {
      showToast("Пользователь уже добавлен", "info");
      return;
    }

    try {
      // Частичный поиск (exact=false): Enter по неполному/иному регистру имени больше
      // не требует побуквенного совпадения; точное совпадение приоритетнее
      const res = await fetch(getBackendUrl(`/api/v1/users/search?username=${encodeURIComponent(cleanName)}&exact=false`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const candidates: Array<{ username: string; userId: string }> = Array.isArray(data) ? data : (data ? [data] : []);
        const exactMatch = candidates.find((u: any) => u.username.toLowerCase() === cleanName.toLowerCase());
        const picked = exactMatch || candidates[0];
        if (!picked) {
          showToast("Пользователь не найден в системе", "error");
          return;
        }
        const foundUsername = picked.username;
        const foundUserId = picked.userId;

        if (selectedGroupMembers.some((m: any) => m.userId === foundUserId)) {
          showToast("Пользователь уже добавлен", "info");
          return;
        }

        setSelectedGroupMembers((prev: any) => [...prev, { username: foundUsername, userId: foundUserId }]);
        setGroupMemberInput('');
        setGroupMemberSearchResults([]);
        showToast(`Пользователь ${foundUsername} добавлен в список`, "success");
      } else {
        showToast("Пользователь не найден в системе", "error");
      }
    } catch (err) {
      console.error("Ошибка при поиске участника:", err);
      showToast("Ошибка поиска участника", "error");
    }
  };

  const handleEvictMember = async (memberToEvict: string) => {
    if (!selectedChatId) return;
    try {
      // Recovery-aware (M1.x): если локальная MLS-сессия потеряна, используем
      // состав группы из бэкенда (groupInfoMembers) для удаления участника.
      let session = syncManager.getMlsSession(selectedChatId);
      const baseMembers = session
        ? session.currentEpoch.members
        : groupInfoMembers;
      if (!session && baseMembers.length === 0) {
        showToast("MLS сессия для этой группы не найдена. Откройте управление группой заново.", "error");
        return;
      }

      const myUsername = localStorage.getItem("username") || "";
      const myUserId = localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id") || "";
      if (memberToEvict === myUsername || (myUserId && memberToEvict === myUserId)) {
        showToast("Вы не можете удалить самого себя из группы.", "error");
        return;
      }

      const remainingMembers = baseMembers.filter((m: any) => m !== memberToEvict);
      const newWelcomePackages: Record<string, any> = {};
      const creatorKeyPair = getLocalMlsKeyPair();
      if (!creatorKeyPair) {
        throw new Error("Локальные MLS ключи не найдены");
      }

      // Recovery (M1.x): если локальной сессии не было, создаём её из состава
      // группы (baseMembers) с новым initialSecret. Дальнейший код
      // (addProposal/commitEpoch) работает с этой новой сессией.
      if (!session) {
        const recoverySecret = new Uint8Array(32);
        window.crypto.getRandomValues(recoverySecret);
        session = new MlsSession(
          selectedChatId,
          myUserId || myUsername,
          creatorKeyPair,
          baseMembers,
          bytesToHex(recoverySecret)
        );
      }

      const newEpochSecret = new Uint8Array(32);
      window.crypto.getRandomValues(newEpochSecret);

      for (const member of remainingMembers) {
        if (member === myUsername || (myUserId && member === myUserId)) continue;
        
        let userId = member;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member);
        if (!isUuid) {
          const searchRes = await fetch(getBackendUrl(`/api/v1/users/search?username=${encodeURIComponent(member)}`), {
            headers: { "Authorization": `Bearer ${localStorage.getItem("session_token") || ''}` }
          });
          if (!searchRes.ok) {
            throw new Error(`Не удалось найти участника ${member}`);
          }
          const searchData = await searchRes.json();
          userId = searchData.userId || member;
        }

        const bundleRes = await fetch(getBackendUrl(`/api/v1/crypto/prekey/bundle/${userId}`), {
          headers: { "Authorization": `Bearer ${localStorage.getItem("session_token") || ''}` }
        });
        if (!bundleRes.ok) {
          throw new Error(`Не удалось получить ключи для участника ${member}`);
        }
        const bundle = await bundleRes.json();
        const identityKeyHex = bundle.identityKey;
        const x25519Pub = hexToBytes(identityKeyHex.substring(0, 64));

        // Kyber-1024 гибридный KEM с реальным Kyber-ключом
        const kyberPub = bundle.deviceKeyKyber 
          ? hexToBytes(bundle.deviceKeyKyber) 
          : (() => {
              const fallback = new Uint8Array(1568);
              fallback.set(x25519Pub);
              window.crypto.getRandomValues(fallback.subarray(32));
              return fallback;
            })();
        const kyberKem = Kyber1024.encapsulate(kyberPub);

        const xShared = calculateX25519SharedSecret(creatorKeyPair.x25519.privateKey, x25519Pub);
        const hybridSecret = await hkdfDeriveKey(
          new Uint8Array([...xShared, ...kyberKem.sharedSecret]),
          "MLS_HYBRID_KEM_INFO"
        );

        const iv = new Uint8Array(12);
        window.crypto.getRandomValues(iv);
        const aesKey = await crypto.subtle.importKey(
          "raw",
          hybridSecret as any,
          { name: "AES-GCM" },
          false,
          ["encrypt"]
        );
        const encResult = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv: iv as any },
          aesKey,
          newEpochSecret as any
        );
        const encBytes = new Uint8Array(encResult);
        const ciphertext = encBytes.slice(0, encBytes.length - 16);
        const tag = encBytes.slice(encBytes.length - 16);

        const pkgData = {
          creatorPubX: bytesToHex(creatorKeyPair.x25519.publicKey),
          kyberCt: Array.from(kyberKem.ciphertext),
          iv: bytesToHex(iv),
          tag: bytesToHex(tag),
          ciphertext: bytesToHex(ciphertext)
        };
        newWelcomePackages[userId] = pkgData;
        if (member !== userId) {
          newWelcomePackages[member] = pkgData;
        }
      }

      const evictRes = await fetch(getBackendUrl("/api/v1/mls/evict-member"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("session_token") || ''}`
        },
        body: JSON.stringify({
          groupId: selectedChatId,
          memberToEvict: memberToEvict,
          newWelcomePackages: newWelcomePackages
        })
      });

      if (!evictRes.ok) {
        throw new Error("Ошибка сервера при выселении участника");
      }

      session.addProposal({
        type: "REMOVE",
        userId: memberToEvict
      });

      for (const member of remainingMembers) {
        if (member === myUsername || (myUserId && member === myUserId)) continue;
        
        let userId = member;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member);
        if (!isUuid) {
          const searchRes = await fetch(getBackendUrl(`/api/v1/users/search?username=${encodeURIComponent(member)}`), {
            headers: { "Authorization": `Bearer ${localStorage.getItem("session_token") || ''}` }
          });
          if (!searchRes.ok) continue;
          const searchData = await searchRes.json();
          userId = searchData.userId || member;
        }

        const bundleRes = await fetch(getBackendUrl(`/api/v1/crypto/prekey/bundle/${userId}`), {
          headers: { "Authorization": `Bearer ${localStorage.getItem("session_token") || ''}` }
        });
        if (!bundleRes.ok) continue;
        const bundle = await bundleRes.json();
        const x25519Hex = bundle.identityKey.substring(0, 64);
        const kyberHex = bundle.deviceKeyKyber || (x25519Hex + "0".repeat(2368 - x25519Hex.length));

        session.addProposal({
          type: "UPDATE",
          userId: userId,
          deviceKeyX25519: x25519Hex,
          deviceKeyKyber: kyberHex
        });
      }

      const { epoch, commitMsg } = await session.commitEpoch(bytesToHex(newEpochSecret));
      syncManager.setMlsSession(selectedChatId, session);

      await syncManager.enqueueOfflineMessage(selectedChatId, `mls_commit:${commitMsg}`);

      setGroupInfoMembers(epoch.members);
      setGroupInfoEpoch(epoch.epochNumber);

      setChats((prev: any) => prev.map((c: any) => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            lastMessage: `Участник ${memberToEvict} удален`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return c;
      }));

      showToast(`Участник ${memberToEvict} успешно удален из группы.`, "success");
    } catch (err: any) {
      console.error("Ошибка при выселении участника:", err);
      showToast(`Не удалось удалить участника: ${err.message}`, "error");
    }
  };

  const handleAddMemberToGroup = async () => {
    if (!addMemberInput.trim()) return;
    if (!selectedChatId) return;

    const cleanName = addMemberInput.trim().startsWith('@') ? addMemberInput.trim().substring(1) : addMemberInput.trim();
    const myUsername = localStorage.getItem("username") || "";
    const myUserId = localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id") || "";

    if (cleanName.toLowerCase() === myUsername.toLowerCase() || (myUserId && cleanName === myUserId)) {
      showToast("Вы уже находитесь в этой группе", "info");
      return;
    }

    if (groupInfoMembers.includes(cleanName)) {
      showToast("Пользователь уже является участником группы", "info");
      return;
    }

    try {
      const searchRes = await fetch(getBackendUrl(`/api/v1/users/search?username=${encodeURIComponent(cleanName)}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
        }
      });
      if (!searchRes.ok) {
        showToast("Пользователь не найден в системе", "error");
        return;
      }
      const addedUserData = await searchRes.json();
      const addedUserId = addedUserData.userId || cleanName;

      // Recovery-aware (M1.x): если локальная MLS-сессия потеряна (например,
      // после переустановки APK), используем состав группы из бэкенда
      // (groupInfoMembers, загруженный через getGroupInfo) и создаём новую
      // сессию для этого чата. Это позволяет добавлять участников даже без
      // восстановления старой криптографии.
      let session = syncManager.getMlsSession(selectedChatId);
      const baseMembers = session
        ? session.currentEpoch.members
        : groupInfoMembers;
      if (!session && baseMembers.length === 0) {
        showToast("MLS сессия для этой группы не найдена. Откройте управление группой заново.", "error");
        return;
      }

      const creatorKeyPair = getLocalMlsKeyPair();
      if (!creatorKeyPair) {
        throw new Error("Локальные MLS ключи не найдены");
      }

      const newMembers = [...baseMembers, addedUserId];

      const newInitialSecret = new Uint8Array(32);
      window.crypto.getRandomValues(newInitialSecret);

      const welcomePackages: Record<string, any> = {};

      for (const member of newMembers) {
        if (member === myUsername || (myUserId && member === myUserId)) continue;

        let mUserId = member;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member);
        if (!isUuid) {
          const mSearchRes = await fetch(getBackendUrl(`/api/v1/users/search?username=${encodeURIComponent(member)}`), {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}` }
          });
          if (!mSearchRes.ok) {
            throw new Error(`Не удалось найти участника ${member}`);
          }
          const mSearchData = await mSearchRes.json();
          mUserId = mSearchData.userId;
        }

        const bundleRes = await fetch(getBackendUrl(`/api/v1/crypto/prekey/bundle/${mUserId}`), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}` }
        });
        if (!bundleRes.ok) {
          if (bundleRes.status === 404) {
            throw new Error(`keys_missing:${member}`);
          }
          throw new Error(`Не удалось получить ключи для участника ${member}`);
        }
        const bundle = await bundleRes.json();
        const identityKeyHex = bundle.identityKey;
        const x25519Pub = hexToBytes(identityKeyHex.substring(0, 64));

        // Kyber-1024 гибридный KEM с реальным Kyber-ключом
        const kyberPub = bundle.deviceKeyKyber 
          ? hexToBytes(bundle.deviceKeyKyber) 
          : (() => {
              const fallback = new Uint8Array(1568);
              fallback.set(x25519Pub);
              window.crypto.getRandomValues(fallback.subarray(32));
              return fallback;
            })();
        
        const kyberKem = Kyber1024.encapsulate(kyberPub);

        const xShared = calculateX25519SharedSecret(creatorKeyPair.x25519.privateKey, x25519Pub);
        const hybridSecret = await hkdfDeriveKey(
          new Uint8Array([...xShared, ...kyberKem.sharedSecret]),
          "MLS_HYBRID_KEM_INFO"
        );

        const iv = new Uint8Array(12);
        window.crypto.getRandomValues(iv);
        
        const aesKey = await crypto.subtle.importKey(
          "raw",
          hybridSecret as any,
          { name: "AES-GCM" },
          false,
          ["encrypt"]
        );

        const encResult = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv: iv as any },
          aesKey,
          newInitialSecret as any
        );

        const encBytes = new Uint8Array(encResult);
        const ciphertext = encBytes.slice(0, encBytes.length - 16);
        const tag = encBytes.slice(encBytes.length - 16);

        const pkgData = {
          creatorPubX: bytesToHex(creatorKeyPair.x25519.publicKey),
          kyberCt: Array.from(kyberKem.ciphertext),
          iv: bytesToHex(iv),
          tag: bytesToHex(tag),
          ciphertext: bytesToHex(ciphertext)
        };
        welcomePackages[mUserId] = pkgData;
        if (member !== mUserId) {
          welcomePackages[member] = pkgData;
        }
      }

      const createRes = await fetch(getBackendUrl("/api/v1/mls/create-group"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('session_token') || ''}`
        },
        body: JSON.stringify({
          groupId: selectedChatId,
          name: activeChat?.name || "",
          avatar: activeChat?.avatar || "",
          members: newMembers,
          welcomePackages: welcomePackages
        })
      });

      if (!createRes.ok) {
        throw new Error("Сервер вернул ошибку при добавлении участника в группу");
      }

      const newSession = new MlsSession(
        selectedChatId,
        myUserId || myUsername,
        creatorKeyPair,
        newMembers,
        bytesToHex(newInitialSecret)
      );
      syncManager.setMlsSession(selectedChatId, newSession);

      const commitInfo = JSON.stringify({ epoch: 0, reset: true });
      await syncManager.enqueueOfflineMessage(selectedChatId, `mls_commit:${commitInfo}`);

      setGroupInfoMembers(newMembers);
      setGroupInfoEpoch(0);
      setAddMemberInput('');

      setChats((prev: any) => prev.map((c: any) => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            lastMessage: `Добавлен участник ${cleanName}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return c;
      }));

      showToast(`Участник ${cleanName} успешно добавлен в группу.`, "success");
    } catch (err: any) {
      console.error("Ошибка при добавлении участника:", err);
      if (err.message && err.message.startsWith("keys_missing:")) {
        const memberName = err.message.split(":")[1];
        showToast(`Пользователь ${memberName} не может быть добавлен, так как у него не настроены ключи сквозного шифрования E2EE на текущем устройстве (он должен войти в приложение).`, "error");
      } else {
        showToast(`Не удалось добавить участника: ${err.message}`, "error");
      }
    }
  };

  // Обработчик создания нового чата
  const handleCreateChat = async () => {
    if (!newChatName.trim()) return;

    if (newChatType === 'channel') {
      try {
        const token = localStorage.getItem('session_token') || localStorage.getItem('token') || '';
        const res = await fetch(getBackendUrl('/api/v1/chats/channel'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: newChatName.trim(),
            description: newChannelDescription.trim(),
            username: newChannelUsername.trim() || undefined
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.detail || `Ошибка сервера: HTTP ${res.status}`);
        }
        const chanData = await res.json();
        const chanId = chanData.id || chanData.chat_id || chanData.chatId || `channel-${Date.now()}`;
        const newChat: Chat = {
          id: chanId,
          name: newChatName.trim(),
          avatar: '📢',
          lastMessage: 'Канал создан',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          isGroup: false,
          type: 'channel',
          role: 'owner',
          username: newChannelUsername.trim() || undefined,
          description: newChannelDescription.trim() || undefined,
          subscribers_count: 1,
          members_count: 1,
          online: false,
          messages: []
        };

        storageManager.execute(
          `INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts, type, role, username, description, members_count) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [newChat.id, newChat.name, newChat.avatar, newChat.lastMessage, newChat.time, newChat.unread, 0, 0, 0, 'channel', 'owner', newChat.username || null, newChat.description || null, 1]
        ).catch((err: any) => {
          console.error("[App] Ошибка сохранения созданного канала в БД:", err);
        });

        setChats((prev: any) => [newChat, ...prev]);
        setSelectedChatId(newChat.id);
        setMobileView('chat');
        setNewChatName('');
        setNewChannelUsername('');
        setNewChannelDescription('');
        setNewChatType('dialog');
        setNewChatIsGroup(false);
        setIsNewChatModalOpen(false);
        showToast(`Канал ${newChatName} успешно создан!`, "success");
        return;
      } catch (err: any) {
        console.error("[App] Ошибка создания канала:", err);
        showToast(`Ошибка создания канала: ${err.message}`, "error");
        return;
      }
    }

    let targetId = "";
    let isRegisteredUser = false;
    const myUsername = localStorage.getItem("username") || "";

    if (newChatIsGroup) {
      if (selectedGroupMembers.length === 0) {
        showToast("Выберите хотя бы одного участника группы", "error");
        return;
      }

      // Генерируем UUID для группы
      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c: any) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      targetId = generateUUID();

      try {
        let myKeyPair = getLocalMlsKeyPair();
        if (!myKeyPair) {
          myKeyPair = generateMlsKeyPair();
        }

        const initialSecret = new Uint8Array(32);
        window.crypto.getRandomValues(initialSecret);

        const welcomePackages: Record<string, any> = {};

        for (const m of selectedGroupMembers) {
          const memberUsername = m.username;
          const userId = m.userId;

          // Запрашиваем prekey бандл
          const bundleRes = await fetch(getBackendUrl(`/api/v1/crypto/prekey/bundle/${userId}`), {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}` }
          });
          if (!bundleRes.ok) {
            throw new Error(`Не удалось получить ключи для участника ${memberUsername}`);
          }
          const bundle = await bundleRes.json();
          const identityKeyHex = bundle.identityKey;
          const x25519Pub = hexToBytes(identityKeyHex.substring(0, 64));

          // Kyber-1024 гибридный KEM с реальным Kyber-ключом
          const kyberPub = bundle.deviceKeyKyber 
            ? hexToBytes(bundle.deviceKeyKyber) 
            : (() => {
                const fallback = new Uint8Array(1568);
                fallback.set(x25519Pub);
                window.crypto.getRandomValues(fallback.subarray(32));
                return fallback;
              })();
          const kyberKem = Kyber1024.encapsulate(kyberPub);

          const xShared = calculateX25519SharedSecret(myKeyPair.x25519.privateKey, x25519Pub);
          const hybridSecret = await hkdfDeriveKey(
            new Uint8Array([...xShared, ...kyberKem.sharedSecret]),
            "MLS_HYBRID_KEM_INFO"
          );

          // Шифруем initialSecret
          const iv = new Uint8Array(12);
          window.crypto.getRandomValues(iv);

          const aesKey = await crypto.subtle.importKey(
            "raw",
            hybridSecret as any,
            { name: "AES-GCM" },
            false,
            ["encrypt"]
          );

          const encResult = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv as any },
            aesKey,
            initialSecret as any
          );

          const encBytes = new Uint8Array(encResult);
          const ciphertext = encBytes.slice(0, encBytes.length - 16);
          const tag = encBytes.slice(encBytes.length - 16);

          const pkgData = {
            creatorPubX: bytesToHex(myKeyPair.x25519.publicKey),
            kyberCt: Array.from(kyberKem.ciphertext),
            iv: bytesToHex(iv),
            tag: bytesToHex(tag),
            ciphertext: bytesToHex(ciphertext)
          };
          welcomePackages[userId] = pkgData;
          if (memberUsername && memberUsername !== userId) {
            welcomePackages[memberUsername] = pkgData;
          }
        }

        const myUserId = localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id") || myUsername;
        const memberUserIds = selectedGroupMembers.map((m: any) => m.userId || m.username);
        const allMemberIds = [myUserId, ...memberUserIds];

        // Отправляем /create-group на бэкенд
        const createRes = await fetch(getBackendUrl("/api/v1/mls/create-group"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('session_token') || ''}`
          },
          body: JSON.stringify({
            groupId: targetId,
            name: newChatName,
            members: allMemberIds,
            welcomePackages: welcomePackages
          })
        });

        if (!createRes.ok) {
          throw new Error("Сервер вернул ошибку при создании группы");
        }

        // Локально инициализируем сессию для себя
        const creatorSession = new MlsSession(
          targetId,
          myUserId,
          myKeyPair,
          allMemberIds,
          bytesToHex(initialSecret)
        );
        syncManager.setMlsSession(targetId, creatorSession);

      } catch (err: any) {
        console.error("Ошибка при создании группового чата:", err);
        showToast(`Ошибка создания группового чата: ${err.message}`, "error");
        return;
      }
    } else {
      const cleanName = newChatName.trim().startsWith('@') ? newChatName.trim().substring(1) : newChatName.trim();
      if (cleanName.toLowerCase() === myUsername.toLowerCase()) {
        showToast("Вы не можете создать чат с самим собой", "error");
        return;
      }
      try {
        const res = await fetch(getBackendUrl(`/api/v1/users/search?username=${encodeURIComponent(cleanName)}`), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          targetId = data.userId;
          isRegisteredUser = true;
        }
      } catch (err) {
        console.error("Ошибка при поиске пользователя:", err);
      }
    }

    if (!targetId) {
      // Если пользователь не найден, генерируем случайный UUID
      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c: any) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      targetId = generateUUID();
    }

    const newChat: Chat = {
      id: targetId,
      name: newChatName,
      avatar: newChatIsGroup ? '👥' : '👤',
      lastMessage: 'Чат создан',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unread: 0,
      isGroup: newChatIsGroup,
      online: true,
      messages: []
    };

    // Сохраняем в SQLite БД, чтобы чат не пропадал при перезагрузке
    storageManager.execute(
      `INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [newChat.id, newChat.name, newChat.avatar, newChat.lastMessage, newChat.time, newChat.unread, newChat.isGroup ? 1 : 0, newChat.online ? 1 : 0, 0]
    ).catch((err: any) => {
      console.error("[App] Ошибка сохранения созданного чата в БД:", err);
    });

    setChats((prev: any) => [newChat, ...prev]);
    setSelectedChatId(newChat.id);
    setMobileView('chat');
    setNewChatName('');
    setNewChatIsGroup(false);
    setSelectedGroupMembers([]);
    setIsNewChatModalOpen(false);

    if (newChatIsGroup) {
      showToast(`Группа ${newChatName} успешно создана!`, "success");
    } else if (isRegisteredUser) {
      showToast(`Пользователь ${newChatName} добавлен!`, "success");
    } else {
      showToast(`Собеседник ${newChatName} не найден в сети. Создан локальный чат.`, "info");
    }
  };

  const startLongPress = (chat: any) => {
    isLongPressActive.current = false;
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      try {
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } catch (err) {}
      setChatToDelete(chat);
      setIsDeleteChatModalOpen(true);
    }, 700);
  };

  const cancelLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleDeleteChat = async () => {
    const chatObj = chatToDelete || activeChat;
    if (!chatObj) return;

    const chatIdToDelete = chatObj.id;
    
    // Сбрасываем выбранный чат
    if (selectedChatId === chatIdToDelete) {
      setSelectedChatId('');
      setMobileView('list');
    }
    setIsDeleteChatModalOpen(false);
    setChatToDelete(null);

    // Удаляем из реактовского стейта
    setChats((prev: any) => prev.filter((c: any) => c.id !== chatIdToDelete));

    // Отправляем запрос на удаление чата на бэкенд
    try {
      await tdlib.send("delete_chat", { chatId: chatIdToDelete });
    } catch (err) {
      console.error("[App] Ошибка при отправке запроса удаления чата на бэкенд:", err);
    }

    // Удаляем чат и его сообщения из локальной SQLite БД
    try {
      await storageManager.execute("DELETE FROM chats WHERE id = ?;", [chatIdToDelete]);
      await storageManager.execute("DELETE FROM messages WHERE chatId = ?;", [chatIdToDelete]);
      showToast("Чат и история сообщений успешно удалены", "success");
    } catch (err) {
      console.error("[App] Ошибка при удалении чата из БД:", err);
      showToast("Ошибка при локальном удалении чата", "error");
    }
  };

  // Функции управления папками чатов
  const handleOpenCreateFolder = () => {
    setEditingFolder(null);
    setNewFolderName('');
    setNewFolderIcon('📁');
    setNewFolderChats([]);
    setNewFolderIs152Fz(false);
    setFolderEditMode('create');
  };

  const handleOpenEditFolder = (folder: any) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderIcon(folder.icon || '📁');
    setNewFolderChats(folderMembers[folder.id] || []);
    setNewFolderIs152Fz(!!(folder.is_152fz_contour === 1 || folder.is152FzContour));
    setFolderEditMode('edit');
  };

  const handleSaveFolder = async () => {
    if (!newFolderName.trim()) {
      showToast("Введите название папки", "error");
      return;
    }

    const folderId = editingFolder ? editingFolder.id : (window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2));
    const folderName = newFolderName.trim();
    const folderIcon = newFolderIcon.trim();
    const is152FzVal = newFolderIs152Fz ? 1 : 0;

    try {
      // 1. Сохраняем в таблицу chat_folders
      await storageManager.execute(`
        INSERT OR REPLACE INTO chat_folders (id, name, icon, is_152fz_contour) VALUES (?, ?, ?, ?);
      `, [folderId, folderName, folderIcon, is152FzVal]);

      // 2. Удаляем старых участников
      await storageManager.execute(`
        DELETE FROM chat_folder_members WHERE folderId = ?;
      `, [folderId]);

      // 3. Записываем новых участников
      for (const chatId of newFolderChats) {
         await storageManager.execute(`
           INSERT INTO chat_folder_members (folderId, chatId) VALUES (?, ?);
         `, [folderId, chatId]);
      }

      // 4. Обновляем стейты folders и folderMembers
      const updatedFolders = await storageManager.query<any>("SELECT id, name, icon, is_152fz_contour FROM chat_folders;");
      const updatedMembers = await storageManager.query<any>("SELECT folderId, chatId FROM chat_folder_members;");
       
      const membersMap: Record<string, string[]> = {};
      updatedMembers.forEach((m: any) => {
        if (!membersMap[m.folderId]) {
          membersMap[m.folderId] = [];
        }
        membersMap[m.folderId].push(m.chatId);
      });

      setFolders(updatedFolders);
      setFolderMembers(membersMap);
      setFolderEditMode('list');
      showToast(editingFolder ? "Папка успешно обновлена" : "Папка успешно создана", "success");
    } catch (err) {
      console.error("[App] Ошибка при сохранении папки:", err);
      showToast("Не удалось сохранить папку", "error");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await storageManager.execute("DELETE FROM chat_folders WHERE id = ?;", [folderId]);
       
      // Обновляем стейт folders и folderMembers
      setFolders((prev: any) => prev.filter((f: any) => f.id !== folderId));
      setFolderMembers((prev: any) => {
        const copy = { ...prev };
        delete copy[folderId];
        return copy;
      });

      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      showToast("Папка удалена", "success");
    } catch (err) {
      console.error("[App] Ошибка при удалении папки:", err);
      showToast("Не удалось удалить папку", "error");
    }
  };



  // Варианты анимации появления списка чатов (Staggered)
  const chatListVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      }
    }
  };

  const chatItemVariants = {
    initial: { opacity: 0, y: 15 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    }
  };

  // Фильтрация чатов по выбранной папке и поиску
  const filteredChats = chats.filter((chat: any) => {
    if (selectedFolderId !== null) {
      const members = folderMembers[selectedFolderId] || [];
      if (!members.includes(chat.id)) return false;
    }
    return chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Обработчик изменения аватара профиля с кадрированием
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast("Загрузка для кадрирования...", "info");
      const dataUrl = await loadImageForCropping(file);
      setCropImageSrc(dataUrl);
      setCropTarget('profile');
      setCropModalOpen(true);
    } catch (err) {
      console.error("[App] Ошибка загрузки изображения:", err);
      showToast("Не удалось открыть фото", "error");
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Обработчик изменения аватара группы с кадрированием
  const handleGroupAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    try {
      showToast("Загрузка для кадрирования...", "info");
      const dataUrl = await loadImageForCropping(file);
      setCropImageSrc(dataUrl);
      setCropTarget('group');
      setCropModalOpen(true);
    } catch (err) {
      console.error("[App] Ошибка загрузки изображения группы:", err);
      showToast("Не удалось открыть фото", "error");
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Обработчик открытия редактора для ТЕКУЩЕГО аватара профиля
  const handleEditCurrentProfileAvatar = async () => {
    if (!profileAvatarUrl) {
      avatarInputRef.current?.click();
      return;
    }
    try {
      showToast("Загрузка для редактирования...", "info");
      const dataUrl = await loadUrlForCropping(profileAvatarUrl);
      setCropImageSrc(dataUrl);
      setCropTarget('profile');
      setCropModalOpen(true);
    } catch (err) {
      console.error("[App] Ошибка загрузки текущего аватара профиля:", err);
      avatarInputRef.current?.click();
    }
  };

  // Обработчик удаления аватара профиля
  const handleDeleteProfileAvatar = async () => {
    try {
      setProfileAvatarUrl(null);
      localStorage.removeItem("profile_avatar_url");
      await fetch(getBackendUrl("/api/v1/users/me/avatar"), {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
        },
        body: JSON.stringify({ avatar: "" })
      });
      showToast("Аватар удален", "success");
    } catch (err) {
      console.error("[App] Ошибка сброса аватара профиля:", err);
    }
  };

  // Обработчик открытия редактора для ТЕКУЩЕГО аватара группы
  const handleEditCurrentGroupAvatar = async () => {
    if (!activeChat?.avatar || activeChat.avatar === '👥') {
      groupAvatarInputRef.current?.click();
      return;
    }
    try {
      showToast("Загрузка для редактирования...", "info");
      const dataUrl = await loadUrlForCropping(activeChat.avatar);
      setCropImageSrc(dataUrl);
      setCropTarget('group');
      setCropModalOpen(true);
    } catch (err) {
      console.error("[App] Ошибка загрузки текущего аватара группы:", err);
      groupAvatarInputRef.current?.click();
    }
  };

  // Обработчик сброса аватара группы
  const handleDeleteGroupAvatar = async () => {
    if (!activeChat) return;
    try {
      setChats((prev: any) => prev.map((c: any) => {
        if (c.id === activeChat.id) {
          return { ...c, avatar: '👥' };
        }
        return c;
      }));
      storageManager.execute("UPDATE chats SET avatar = ? WHERE id = ?;", ['👥', activeChat.id]);
      await fetch(getBackendUrl("/api/v1/mls/update-group"), {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
        },
        body: JSON.stringify({ groupId: activeChat.id, avatar: '👥' })
      });
      showToast("Аватар группы сброшен", "success");
    } catch (err) {
      console.error("[App] Ошибка сброса аватара группы:", err);
    }
  };

  // Обработчик завершения кадрирования из AvatarCropModal
  const handleCropCompleted = async (croppedBlob: Blob, previewUrl: string) => {
    if (cropTarget === 'profile') {
      setIsAvatarUploading(true);
      setProfileAvatarUrl(previewUrl);

      try {
        const optimizedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
        const formData = new FormData();
        formData.append("file", optimizedFile, "avatar.jpg");

        const res = await fetch(getBackendUrl("/api/v1/media/upload"), {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
          },
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Ошибка загрузки: ${res.statusText}`);
        }

        const data = await res.json();
        if (data && data.url) {
          const patchRes = await fetch(getBackendUrl("/api/v1/users/me/avatar"), {
            method: "PATCH",
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
            },
            body: JSON.stringify({ avatar: data.url })
          });

          if (patchRes.ok) {
            setProfileAvatarUrl(data.url);
            localStorage.setItem("profile_avatar_url", data.url);
            try {
              await saveSessionToIndexedDB(
                localStorage.getItem("current_user_id") || "",
                localStorage.getItem("session_token") || "",
                data.url,
                localStorage.getItem("username") || ""
              );
            } catch (idbErr) {
              console.warn("[App] Ошибка сохранения аватара в IndexedDB:", idbErr);
            }
            showToast("Аватар успешно обновлен!", "success");
          } else {
            showToast("Не удалось сохранить аватар в профиле.", "error");
          }
        }
      } catch (err) {
        console.error("Ошибка при обновлении аватара:", err);
        showToast("Не удалось загрузить аватар. Попробуйте еще раз.", "error");
      } finally {
        setIsAvatarUploading(false);
      }
    } else if (cropTarget === 'group') {
      if (!activeChat) return;

      setIsGroupAvatarUploading(true);
      setChats((prev: any) => prev.map((c: any) => {
        if (c.id === activeChat.id) {
          return { ...c, avatar: previewUrl };
        }
        return c;
      }));

      try {
        const optimizedFile = new File([croppedBlob], "group_avatar.jpg", { type: "image/jpeg" });
        const formData = new FormData();
        formData.append("file", optimizedFile, "group_avatar.jpg");

        const res = await fetch(getBackendUrl("/api/v1/media/upload"), {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
          },
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Ошибка загрузки: ${res.statusText}`);
        }

        const data = await res.json();
        if (data && data.url) {
          const patchRes = await fetch(getBackendUrl("/api/v1/mls/update-group"), {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
            },
            body: JSON.stringify({ groupId: activeChat.id, avatar: data.url })
          });

          if (patchRes.ok) {
            setChats((prev: any) => prev.map((c: any) => {
              if (c.id === activeChat.id) {
                return { ...c, avatar: data.url };
              }
              return c;
            }));
            storageManager.execute("UPDATE chats SET avatar = ? WHERE id = ?;", [data.url, activeChat.id]);
            showToast("Аватар группы успешно обновлен!", "success");
          } else {
            showToast("Не удалось сохранить аватар группы.", "error");
          }
        }
      } catch (err) {
        console.error("Ошибка при обновлении аватара группы:", err);
        showToast("Не удалось загрузить аватар группы. Попробуйте еще раз.", "error");
      } finally {
        setIsGroupAvatarUploading(false);
      }
    }
  };

  const handleSaveGroupName = async () => {
    if (!activeChat) return;
    const trimmedName = newGroupName.trim();
    if (trimmedName === "") {
      showToast("Название группы не может быть пустым.", "error");
      return;
    }

    try {
      const patchRes = await fetch(getBackendUrl("/api/v1/mls/update-group"), {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
        },
        body: JSON.stringify({ groupId: activeChat.id, name: trimmedName })
      });

      if (patchRes.ok) {
        setChats((prev: any) => prev.map((c: any) => {
          if (c.id === activeChat.id) {
            return { ...c, name: trimmedName };
          }
          return c;
        }));
        storageManager.execute("UPDATE chats SET name = ? WHERE id = ?;", [trimmedName, activeChat.id]);
        showToast("Название группы успешно обновлено!", "success");
        setIsEditingGroupName(false);
      } else {
        showToast("Не удалось сохранить название группы.", "error");
      }
    } catch (err) {
      console.error("Ошибка при обновлении названия группы:", err);
      showToast("Не удалось обновить название группы. Попробуйте еще раз.", "error");
    }
  };

  // Универсальный обработчик фото/видео/файла для отправки в чат
  // Ядро подготовки медиа к отправке: HEIC-конвертация, сжатие видео, E2EE-шифрование,
  // загрузка на сервер. Без UI-состояния — переиспользуется одиночным флоу (модалка
  // превью) и батч-отправкой нескольких фото.
  const prepareMediaForUpload = async (
    file: File,
    onProgress?: (p: number) => void
  ): Promise<{ uploadedUrl: string; keyHex: string; ivHex: string; type: 'photo' | 'video'; normalizedPreviewUrl?: string } | null> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isVideo = file.type.startsWith("video/") || ['mov', 'mp4', 'avi', 'mkv', '3gp', 'flv', 'webm', 'qt', 'hevc', 'm4v'].includes(ext);

    let processedFile: File = file;
    let normalizedPreviewUrl: string | undefined;

    if (!isVideo) {
      try {
        processedFile = await normalizeImageToJpeg(file, file.name);
        if (processedFile !== file) {
          normalizedPreviewUrl = URL.createObjectURL(processedFile);
        }
      } catch (err) {
        console.error("Ошибка при нормализации изображения в JPEG:", err);
      }
    }

    const fileType: 'photo' | 'video' = isVideo ? "video" : "photo";

    try {
      let fileToUpload: File | Blob = processedFile;
      let uploadFilename = processedFile.name;

      if (isVideo) {
        try {
          const compressedBlob = await compressVideo(file, (progress: any) => {
            onProgress?.(Math.round(progress * 0.9));
          });
          const compressedName = file.name.replace(/\.[^/.]+$/, "") + "_compressed.mp4";
          fileToUpload = new File([compressedBlob], compressedName, { type: "video/mp4" });
          uploadFilename = compressedName;
          normalizedPreviewUrl = URL.createObjectURL(compressedBlob);
        } catch (compressErr) {
          console.error("[App] Ошибка сжатия видео (фоллбек на оригинал):", compressErr);
          fileToUpload = file;
        }
      }

      let keyHex = "";
      let ivHex = "";

      if (activeChat && activeChat.type !== 'channel') {
        try {
          const encryptResult = await encryptMediaBlob(fileToUpload);
          const encBlob = encryptResult.encryptedBlob;
          keyHex = encryptResult.keyHex;
          ivHex = encryptResult.ivHex;
          const baseName = uploadFilename.replace(/\.[^/.]+$/, "");
          uploadFilename = `${baseName}.enc`;
          fileToUpload = new File([encBlob], uploadFilename, { type: "application/octet-stream" });
        } catch (encErr) {
          // Fail-Closed (§12.5): незашифрованный файл не загружается на сервер
          console.error("[App] E2EE: Ошибка шифрования файла — блокирую загрузку (Fail-Closed §12.5):", encErr);
          throw encErr;
        }
      }

      let uploadedUrl = '';
      if (fileToUpload.size > 50 * 1024 * 1024) {
        uploadedUrl = await uploadMediaTus(fileToUpload, uploadFilename, (progress: any) => {
          onProgress?.(isVideo ? 90 + Math.round(progress * 0.1) : progress);
        });
      } else {
        const formData = new FormData();
        formData.append("file", fileToUpload, uploadFilename);

        const res = await fetch(getBackendUrl("/api/v1/media/upload"), {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
          },
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Ошибка загрузки файла: ${res.statusText}`);
        }

        const data = await res.json();
        if (!data || !data.url) {
          throw new Error("Неверный ответ от сервера");
        }
        uploadedUrl = data.url;
      }

      onProgress?.(100);
      return { uploadedUrl, keyHex, ivHex, type: fileType, normalizedPreviewUrl };
    } catch (err) {
      console.error("Ошибка загрузки файла:", err);
      return null;
    }
  };

  const handleProcessFile = async (file: File) => {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isHEIC = ['heic', 'heif'].includes(ext) || file.type === 'image/heic' || file.type === 'image/heif';
    if (isHEIC) showToast("Конвертация HEIC в JPEG...", "info");

    const previewUrl = URL.createObjectURL(file);
    // R4 (M4.2): не-медиа файлы идут как document (E2EE, tus для больших)
    const isImage = file.type.startsWith("image/") || ['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp'].includes(ext);
    const isVideo = file.type.startsWith("video/") || ['mov', 'mp4', 'avi', 'mkv', '3gp', 'flv', 'webm', 'qt', 'hevc', 'm4v'].includes(ext);
    setUploadingFile({
      file,
      previewUrl,
      type: isVideo ? "video" : (isImage ? "photo" : "document"),
      progress: 0,
      ...(isImage || isVideo ? {} : {
        filename: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      }),
    });

    const result = await prepareMediaForUpload(file, (p: any) => {
      setUploadingFile((prev: any) => (prev ? { ...prev, progress: p } : prev));
    });

    if (!result) {
      showToast("Не удалось загрузить файл на сервер.", "error");
      setUploadingFile(null);
      return;
    }

    if (isHEIC) showToast("Изображение HEIC успешно сконвертировано в JPEG!", "success");
    setUploadingFile({
      file,
      previewUrl: result.normalizedPreviewUrl || previewUrl,
      type: result.type,
      progress: 100,
      uploadedUrl: result.uploadedUrl,
      keyHex: result.keyHex,
      ivHex: result.ivHex
    });
    showToast("Файл успешно подготовлен!", "success");
  };

  // Батч-отправка нескольких фото (мультивыбор из галереи, лимит 10):
  // каждое фото — отдельным сообщением, строго последовательно (шифрование,
  // загрузка и отправка по одной очереди — без параллельных ratchet/PTS гонок)
  const [isBatchSendingPhotos, setIsBatchSendingPhotos] = useState(false);
  const handleSendPhotoBatch = async (files: File[]) => {
    const photos = files.filter((f: any) => {
      const ext = f.name?.split('.').pop()?.toLowerCase() || '';
      return f.type.startsWith("image/") || ['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp'].includes(ext);
    });
    if (photos.length === 0) {
      if (files.length > 0) handleProcessFile(files[0]);
      return;
    }
    const batch = photos.slice(0, 10);
    if (isBatchSendingPhotos) return;
    setIsBatchSendingPhotos(true);
    let sent = 0;
    let failed = 0;
    showToast(`Отправка фото: ${batch.length} шт...`, 'info');
    for (const photo of batch) {
      const prepared = await prepareMediaForUpload(photo);
      if (!prepared) {
        failed += 1;
        continue;
      }
      try {
        await handleSendMediaMessage('photo', prepared.uploadedUrl, '📷 Фотография', undefined, prepared.keyHex, prepared.ivHex);
        sent += 1;
      } catch (err) {
        console.error('[App] Ошибка отправки фото из батча:', err);
        failed += 1;
      }
    }
    setIsBatchSendingPhotos(false);
    if (failed === 0) showToast(`Отправлено ${sent} фото`, 'success');
    else if (sent === 0) showToast('Не удалось отправить фото', 'error');
    else showToast(`Отправлено ${sent}, не отправлено ${failed}`, 'info');
  };

  // Отправка текущей геолокации
  // R4 (M4.1): типизированная геолокация — координаты строго внутри E2EE-пейлоада
  const handleSendLocation = async (lat: number, lng: number, title?: string, opts?: { live?: boolean; address?: string }) => {
    if (!activeChat) return;
    const liveUntil = opts?.live ? Date.now() + 3600 * 1000 : undefined; // 1 час
    await handleSendMessage(undefined, '', {
      type: 'location',
      lat, lng,
      ...(title ? { locationTitle: title } : {}),
      ...(opts?.address ? { address: opts.address } : {}),
      ...(liveUntil ? { liveUntil } : {}),
    });
  };

  // R4 (M4.5): массовая пересылка — расшифрованный локально текст перешифровывается
  // РОВНО ОДИН раз под каждый целевой чат (Single-Encryption); медиа-блобы
  // переиспользуются без повторной загрузки (mediaUrl + key/iv в новом пейлоаде).
  const handleForwardSelected = async (targetChatIds: string[]) => {
    if (!activeChat) return;
    const sourceMsgs = activeChat.messages
      .filter((m: any) => selectedMessageIds.has(m.id) && !m.isService)
      .slice(0, 100);
    setSelectedMessageIds(new Set());
    setIsForwardModalOpen(false);
    for (const targetId of targetChatIds.slice(0, 20)) {
      const target = chats.find((c: any) => c.id === targetId);
      if (!target) continue;
      for (const msg of sourceMsgs) {
        let textToSend = '';
        try {
          const typed: any = { type: msg.type || 'text', text: msg.text, forwardFrom: msg.senderName };
          if (msg.mediaUrl) {
            typed.mediaUrl = msg.mediaUrl;
            if (msg.mediaKey) typed.key = msg.mediaKey;
            if (msg.mediaIv) typed.iv = msg.mediaIv;
          }
          if (msg.type === 'document') {
            typed.filename = msg.filename; typed.size = msg.fileSize; typed.mimeType = msg.mimeType;
          }
          if (msg.type === 'location') {
            typed.lat = msg.lat; typed.lng = msg.lng;
            if (msg.liveUntil) typed.liveUntil = msg.liveUntil;
          }
          if (msg.type === 'contact' && msg.contact) typed.contact = msg.contact;

          textToSend = JSON.stringify(typed);
          if (!target.isGroup && target.type !== 'channel') {
            textToSend = await encryptMessage(target.id, JSON.stringify(typed));
          } else if (target.isGroup) {
            let session = syncManager.getMlsSession(target.id);
            if (!session) session = await syncManager.initMlsSessionFromWelcomePackage(target.id);
            if (session) {
              const enc = await session.encryptMessage(JSON.stringify(typed));
              textToSend = JSON.stringify({
                ciphertextHex: enc.ciphertextHex, mlsCiphertextHex: enc.ciphertextHex,
                ivHex: enc.ivHex, epochNumber: enc.epochNumber,
              });
            } else {
              // Fail-Closed (§12.5): при отсутствии MLS-сессии открытый текст не отправляется,
              // переносим в оффлайн-очередь outbox для отложенной отправки после инициализации сессии
              console.warn(`[Forward] Нет MLS сессии для группы ${target.id} — сохраняем пересылку в оффлайн-очередь (Fail-Closed §12.5)`);
              try {
                await syncManager.enqueueOfflineMessage(target.id, JSON.stringify(typed), 'text');
                showToast(`Пересылка в группу ${target.name || target.id} сохранена в очередь (нет MLS-сессии)`, 'info');
              } catch (fwdErr) {
                console.error('[Forward] Ошибка добавления пересылки в очередь:', fwdErr);
              }
              continue;
            }
          }
          await tdlib.send("send_message", {
            chatId: target.id,
            text: textToSend,
            senderName: localStorage.getItem('username') || 'Я',
          });
        } catch (e) {
          console.error('[Forward] Ошибка пересылки сообщения:', msg.id, e);
          try {
            await syncManager.enqueueOfflineMessage(target.id, textToSend, 'text');
          } catch (fwdErr) {
            console.error('[Forward] Ошибка добавления пересылки в оффлайн-очередь:', fwdErr);
          }
        }
      }
    }
    showToast(`Переслано в ${targetChatIds.length} ${targetChatIds.length === 1 ? 'чат' : 'чатов'}`, 'info');
  };

  // Отправка загруженного медиафайла
  const handleSendUploadedFile = async () => {
    if (!uploadingFile || !uploadingFile.uploadedUrl) return;
    const mediaUrl = uploadingFile.uploadedUrl;
    const type = uploadingFile.type;
    const caption = uploadingFile.caption?.trim();
    const key = uploadingFile.keyHex;
    const iv = uploadingFile.ivHex;

    // R4 (M4.2): не-медиа файлы уходят как типизированный document (E2EE)
    if (type === 'document') {
      setUploadingFile(null);
      await handleSendMessage(undefined, caption || '', {
        type: 'document',
        mediaUrl,
        filename: uploadingFile.filename || 'file',
        size: uploadingFile.size || 0,
        mimeType: uploadingFile.mimeType,
        ...(key ? { key, iv } : {}),
      });
      return;
    }

    const fallbackText = type === 'photo' ? '📷 Фотография' : '🎥 Видео';
    const text = caption || fallbackText;

    setUploadingFile(null);
    await handleSendMediaMessage(type, mediaUrl, text, undefined, key, iv);
  };

  const renderChatItem = (chat: Chat) => (
    <motion.div
      key={chat.id}
      variants={chatItemVariants}
      onMouseDown={() => startLongPress(chat)}
      onMouseUp={() => cancelLongPress()}
      onMouseLeave={() => cancelLongPress()}
      onTouchStart={() => startLongPress(chat)}
      onTouchEnd={() => cancelLongPress()}
      onClick={(e: any) => {
        if (isLongPressActive.current) {
          e.preventDefault();
          e.stopPropagation();
          isLongPressActive.current = false;
          return;
        }
        if (selectedChatId && selectedChatId !== chat.id) {
          if (newMessageText.trim()) {
            setDrafts((prev: any) => ({ ...prev, [selectedChatId]: newMessageText }));
          } else {
            setDrafts((prev: any) => {
              const next = { ...prev };
              delete next[selectedChatId];
              return next;
            });
          }
        }
        setSelectedChatId(chat.id);
        setNewMessageText(drafts[chat.id] || '');
        setMobileView('chat');
      }}
      className={`
        p-3 rounded-xl cursor-pointer transition-all duration-200 flex items-center gap-3 relative
        ${selectedChatId === chat.id
          ? 'bg-white/8 border border-white/10 shadow-glass-sm'
          : 'hover:bg-white/3 border border-transparent'
        }
      `}
    >
      {/* Аватар с индикатором онлайн и возможностью просмотра */}
      <div
        onClick={(e: any) => {
          e.stopPropagation();
          setAvatarViewerState({
            isOpen: true,
            avatarUrl: chat.avatar,
            name: chat.isGroup ? chat.name : formatUserDisplayName(chat.id, chat.name, null),
            subtitle: chat.isGroup ? 'Групповой чат' : (chat.online ? 'в сети' : 'был(а) недавно'),
            isGroup: chat.isGroup,
            isEditable: false,
          });
        }}
        className="flex-shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-transform"
        title="Просмотреть аватар"
      >
        <Avatar
          avatarUrl={chat.avatar}
          name={chat.isGroup ? chat.name : formatUserDisplayName(chat.id, chat.name, null)}
          isGroup={chat.isGroup}
          online={chat.online}
          size="md"
        />
      </div>

      {/* Инфо чата */}
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <div className="flex items-center gap-1 min-w-0">
            {pinnedMessageMap[chat.id]?.length > 0 && (
              <Pin className="w-3 h-3 text-purple-400 fill-purple-400 flex-shrink-0" />
            )}
            {isChatIn152FzContour(chat.id) && (
              <span title="Сейф-Контур (DLP Защита)">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              </span>
            )}
            <h3 className="font-medium text-sm text-slate-100 truncate">
              {chat.isGroup ? chat.name : formatUserDisplayName(chat.id, chat.name, null)}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium shrink-0 ml-2">{formatChatTimestamp(chat.time)}</span>
        </div>
        <p className="text-xs text-slate-400 truncate">
          {drafts[chat.id] && selectedChatId !== chat.id ? (
            <span>
              <span className="text-red-400 font-semibold">Черновик: </span>
              <span className="text-slate-300">{drafts[chat.id]}</span>
            </span>
          ) : (
            formatChatPreview(chat.lastMessage, chat.messages)
          )}
        </p>
      </div>

      {/* Счетчик непрочитанных */}
      {chat.unread > 0 && (
        <div className="bg-purple-600 text-purple-100 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-5 text-center">
          {chat.unread}
        </div>
      )}
    </motion.div>
  );

  return {
    activeTopic, cancelLongPress, chatItemVariants, chatListVariants, chatSearch, cleanupRecordListeners,
    filteredChats, getBestAudioMimeType, handleActionCopy, handleActionDelete, handleActionEdit, handleActionForward,
    handleActionPin, handleActionReply, handleActionRetry, handleActionUnpin, handleAddGroupMember, handleAddMemberInputChange,
    handleAddMemberToGroup, handleApplyReaction, handleAvatarChange, handleCallbackQuery, handleCreateChat, handleCreatePoll,
    handleCropCompleted, handleDeleteChat, handleDeleteFolder, handleDeleteGroupAvatar, handleDeleteProfileAvatar, handleDiscardRecordedAudio,
    handleEditCurrentGroupAvatar, handleEditCurrentProfileAvatar, handleEmojiClick, handleEvictMember, handleForwardMessage, handleForwardSelected,
    handleGroupAvatarChange, handleGroupMemberInputChange, handleLoadMoreHistory, handleMessageReactionMenu, handleOpenCreateFolder, handleOpenEditFolder,
    handleOpenGroupInfo, handleProcessFile, handleRecordEnd, handleRecordMove, handleRecordStart, handleSaveFolder,
    handleSaveGroupName, handleSendLocation, handleSendMediaMessage, handleSendMessage, handleSendPhotoBatch, handleSendRecordedAudio,
    handleSendUploadedFile, handleToggleChannelMute, handleTogglePlayRecordedAudio, handleVotePoll, isBatchSendingPhotos, prepareMediaForUpload,
    renderChatItem, setIsBatchSendingPhotos, sortedActiveChatMessages, startAudioRecording, startLongPress, stopAudioRecording,
    typingUsersForHeader, uploadMediaBlob
  };
}
