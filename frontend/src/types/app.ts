export type User = {
  name: string;
  studentId: string;
};

export type ChatRoomType = "direct" | "group";

export type Message = {
  id: string;
  roomId: string;
  roomType: ChatRoomType;
  from: string;
  to?: string;
  message: string;
  timestamp: number;
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
};

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Chat: undefined;
  Documents: undefined;
};
