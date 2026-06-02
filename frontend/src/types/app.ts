export type User = {
  name: string;
  studentId: string;
  photo?: string;
  bio?: string;
};

export type ChatRoomType = "direct" | "group";
export type PresenceStatus = "online" | "away" | "offline";
export type MessageStatus = "sending" | "sent" | "delivered" | "read";
export type AttachmentType = "photo" | "audio" | "video" | "document" | "voice";
export type DocumentClassLevel = "1" | "2" | "3" | "4" | "5";

export type UserProfile = {
  id: string;
  name: string;
  bio: string;
  photo?: string;
  presence: PresenceStatus;
  lastSeen: string;
};

export type ChatAttachment = {
  id: string;
  type: AttachmentType;
  name: string;
  uri?: string;
  size?: number;
};

export type MessageReaction = {
  emoji: string;
  by: string;
};

export type Message = {
  id: string;
  roomId: string;
  roomType: ChatRoomType;
  from: string;
  to?: string;
  message: string;
  timestamp: number;
  status?: MessageStatus;
  edited?: boolean;
  deleted?: boolean;
  replyToId?: string;
  forwarded?: boolean;
  reactions?: MessageReaction[];
  attachments?: ChatAttachment[];
};

export type ChatThread = {
  id: string;
  type: ChatRoomType;
  title: string;
  subtitle: string;
  members: string[];
  presence?: PresenceStatus;
  unread: number;
  pinned?: boolean;
  archived?: boolean;
};

export type DocumentRecord = {
  id: string;
  filename: string;
  originalName: string;
  uploadedBy: string;
  size: number;
  mimeType: string;
  url: string;
  timestamp: number;
  classLevel?: DocumentClassLevel;
  category?: string;
};

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Chat: undefined;
  Documents: undefined;
};
