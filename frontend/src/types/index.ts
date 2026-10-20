// frontend/src/types/index.ts
import { InlineKeyboardMarkup } from '../features/bots/types';

export interface PollOption {
  id: number;
  text: string;
  votesCount?: number;
  percentage?: number;
}

export interface PollPayload {
  pollId: string;
  question: string;
  options: string[] | PollOption[];
  anonymous?: boolean;
  allowMultiple?: boolean;
  quiz?: boolean;
  correctOptionId?: number;
  closeAt?: number;
  tally?: { [optionId: number]: number };
  totalVoters?: number;
  myVotes?: number[];
  isClosed?: boolean;
}

export interface ChannelMember {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'poster' | 'subscriber';
  isBot?: boolean;
  joinedAt?: number;
}

// Release Train R5 (v2.2.0): Форумы, топики и групповые звонки Janus SFU

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
  created_at?: number;
}

export interface GroupCallParticipant {
  feedId: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  audioLevel?: number;
}

export interface GroupCallSession {
  callId: string;
  chatId: string;
  roomId: number;
  title: string;
  isActive: boolean;
  participants: GroupCallParticipant[];
  isScreenSharing: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  activeSpeakerFeedId?: number | null;
}

export interface Message {
  id: string;
  sender: 'me' | 'other' | string;
  senderName: string;
  text: string;
  time: string;
  pts?: number;
  type?: 'text' | 'sticker' | 'voice' | 'video_note' | 'photo' | 'video' | 'call' | 'unsupported' | 'poll' | 'service' | 'location' | 'contact' | 'document' | string;
  mediaUrl?: string;
  peaks?: number[];
  timestamp?: number;
  reaction?: string;
  replyToMessageId?: string;
  forwardFromUser?: string;
  status?: 'sent' | 'pending' | 'read' | 'error' | 'failed';
  isService?: boolean;
  isE2EEDecryptFailed?: boolean;
  isE2EESendFailed?: boolean;
  isUnencryptedIncoming?: boolean;
  isUnsupported?: boolean;
  serviceAction?: 'pin' | 'unpin' | 'poll_vote' | string;
  targetMessageId?: string;
  mediaKey?: string;
  mediaIv?: string;
  callStatus?: string;
  duration?: number;
  mediaType?: string;
  replyMarkup?: InlineKeyboardMarkup;
  reply_markup?: InlineKeyboardMarkup;
  invoiceId?: string;
  invoice_id?: string;
  invoice?: any;
  transferReceipt?: any;
  transfer_receipt?: any;
  edited_at?: number;
  topic_id?: number | null;
  expires_at?: number;
  poll?: PollPayload;
  pollId?: string;
  optionIds?: number[];
  // R4 (M4.1/M4.2): геолокация, контакты, документы
  lat?: number;
  lng?: number;
  liveUntil?: number;
  heading?: number | null;
  contact?: {
    displayName: string;
    phoneNumbers: string[];
    emails?: string[];
    organization?: string;
  };
  filename?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isGroup: boolean;
  online: boolean;
  messages: Message[];
  is152FzContour?: boolean;
  archived?: boolean;
  muted?: boolean;
  type?: 'dialog' | 'group' | 'channel';
  pinned_message_ids?: string[];
  draft?: string;
  username?: string;
  description?: string;
  owner_user_id?: number | string;
  role?: 'owner' | 'admin' | 'poster' | 'subscriber' | string;
  currentUserRole?: 'owner' | 'admin' | 'poster' | 'subscriber' | string;
  members_count?: number;
  membersCount?: number;
  is_forum?: boolean;
  topics_count?: number;
  wallpaper?: string;
  encryption?: 'e2ee' | 'mls' | 'public' | string;
  short_id?: number | null;
  collision?: boolean;
}

export interface ChatReadState {
  chat_id: string;
  user_id: string;
  last_read_pts: number;
  updated_at: number;
}
