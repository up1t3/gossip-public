import React, { useState, useMemo } from 'react';
import { Search, Plus, ArrowLeft, Lock, MessageSquare, Edit2, X } from 'lucide-react';

export interface TopicItem {
  topic_id: number;
  chat_id: string;
  title: string;
  icon_emoji: string;
  icon_color: string;
  is_closed: boolean;
  pinned_message_id?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

export interface TopicListProps {
  chat: {
    id: string;
    name: string;
    avatar?: string;
    isGroup?: boolean;
    [key: string]: any;
  };
  topics: TopicItem[];
  selectedTopicId: number | null;
  onSelectTopic: (topicId: number) => void;
  onCreateTopicClick: () => void;
  onEditTopicClick?: (topic: TopicItem) => void;
  onBackToChatList: () => void;
}

export const TopicList: React.FC<TopicListProps> = ({
  chat,
  topics,
  selectedTopicId,
  onSelectTopic,
  onCreateTopicClick,
  onEditTopicClick,
  onBackToChatList
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Всегда формируем виртуальный топик «Общий (General)» (topic_id: 0), если его нет в списке
  const generalTopic: TopicItem = useMemo(() => {
    const found = topics.find((t) => t.topic_id === 0);
    if (found) return found;
    return {
      topic_id: 0,
      chat_id: chat.id,
      title: 'Общий',
      icon_emoji: '💬',
      icon_color: '#3b82f6',
      is_closed: false,
      unread_count: 0,
      last_message: 'Главный топик группы'
    };
  }, [topics, chat.id]);

  // Фильтруем кастомные топики (topic_id > 0)
  const customTopics = useMemo(() => {
    return topics.filter((t) => t.topic_id !== 0);
  }, [topics]);

  // Список всех топиков, где General всегда первый
  const allDisplayTopics = useMemo(() => {
    return [generalTopic, ...customTopics];
  }, [generalTopic, customTopics]);

  // Применяем поисковую фильтрацию
  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allDisplayTopics;
    return allDisplayTopics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.last_message && t.last_message.toLowerCase().includes(q))
    );
  }, [allDisplayTopics, searchQuery]);

  return (
    <div
      data-testid="topic-list-container"
      className="flex flex-col h-full w-full bg-neutral-950/90 text-white select-none overflow-hidden"
    >
      {/* Шапка списка топиков */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-neutral-900/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            data-testid="topic-back-btn"
            onClick={onBackToChatList}
            aria-label="Назад к списку чатов"
            className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-lg flex-shrink-0">
              {chat.avatar || '👥'}
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-base font-semibold truncate leading-tight">{chat.name}</h2>
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                Форумная группа · {topics.length + (topics.some((t) => t.topic_id === 0) ? 0 : 1)} топиков
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            data-testid="topic-search-toggle-btn"
            onClick={() => {
              setIsSearchOpen((prev) => !prev);
              if (isSearchOpen) setSearchQuery('');
            }}
            aria-label="Поиск топиков"
            className={`p-2 rounded-xl transition ${
              isSearchOpen
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            data-testid="create-topic-btn"
            onClick={onCreateTopicClick}
            aria-label="Создать новый топик"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Новый топик</span>
          </button>
        </div>
      </div>

      {/* Панель поиска */}
      {isSearchOpen && (
        <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900/80 border-b border-white/5 backdrop-blur-md">
          <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <input
            data-testid="topic-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск топика по названию или тексту..."
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Список топиков */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {filteredTopics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-neutral-500 text-sm gap-2">
            <MessageSquare className="w-8 h-8 stroke-1" />
            <span>Топики не найдены</span>
          </div>
        ) : (
          filteredTopics.map((topic) => {
            const isSelected = selectedTopicId === topic.topic_id;
            const isGeneral = topic.topic_id === 0;

            return (
              <div
                key={topic.topic_id}
                data-testid={`topic-item-${topic.topic_id}`}
                onClick={() => onSelectTopic(topic.topic_id)}
                className={`group relative flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/40 shadow-lg shadow-blue-600/10'
                    : 'bg-neutral-900/40 hover:bg-neutral-900/80 border-white/5 hover:border-white/10'
                } backdrop-blur-md`}
              >
                {/* Левая часть: Иконка + Инфо */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Цветная Obsidian Glassmorphism иконка */}
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-inner border border-white/10 transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${topic.icon_color || '#3b82f6'}22`,
                      borderColor: `${topic.icon_color || '#3b82f6'}44`,
                      boxShadow: `0 0 12px ${topic.icon_color || '#3b82f6'}15`
                    }}
                  >
                    <span>{topic.icon_emoji || '💬'}</span>
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-neutral-100 truncate">
                        {topic.title}
                      </span>

                      {/* Индикаторы */}
                      {isGeneral && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          General
                        </span>
                      )}

                      {topic.is_closed && (
                        <span
                          data-testid={`topic-closed-badge-${topic.topic_id}`}
                          title="Топик закрыт для сообщений"
                          className="flex items-center gap-0.5 text-xs text-amber-400/90"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Превью последнего сообщения или описания */}
                    <div className="text-xs text-neutral-400 truncate mt-0.5">
                      {topic.last_message || 'Нет сообщений'}
                    </div>
                  </div>
                </div>

                {/* Правая часть: Время, Бейджи, Действия */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {topic.last_message_time && (
                    <span className="text-[11px] text-neutral-500 hidden sm:inline">
                      {topic.last_message_time}
                    </span>
                  )}

                  {/* Бейдж непрочитанных */}
                  {topic.unread_count > 0 && (
                    <span
                      data-testid={`topic-unread-badge-${topic.topic_id}`}
                      className="min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow-md shadow-blue-600/30"
                    >
                      {topic.unread_count > 99 ? '99+' : topic.unread_count}
                    </span>
                  )}

                  {/* Кнопка редактирования для кастомных топиков */}
                  {!isGeneral && onEditTopicClick && (
                    <button
                      data-testid={`topic-edit-btn-${topic.topic_id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTopicClick(topic);
                      }}
                      title="Редактировать топик"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
