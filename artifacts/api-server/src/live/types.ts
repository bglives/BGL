export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type NormalizedUser = {
  id: string;
  uniqueId: string;
  nickname: string;
  avatarUrl?: string;
};

export type NormalizedGiftEvent = {
  eventId: string;
  giftId: string;
  giftName: string;
  giftImageUrl?: string;
  diamondValue: number;
  repeatCount: number;
  deltaQuantity: number;
  isStreakEnd: boolean;
  user: NormalizedUser;
  timestamp: number;
};

export type NormalizedLikeEvent = {
  eventId: string;
  likesCount: number;
  totalLikes?: number;
  user: NormalizedUser;
  timestamp: number;
};

export type NormalizedChatEvent = {
  eventId: string;
  comment: string;
  user: NormalizedUser;
  timestamp: number;
};

export type NormalizedMemberEvent = {
  eventId: string;
  user: NormalizedUser;
  timestamp: number;
};

export type NormalizedRoomUserEvent = {
  eventId: string;
  viewerCount: number;
  timestamp: number;
};

export type NormalizedLiveEvent =
  | { type: 'gift'; data: NormalizedGiftEvent }
  | { type: 'like'; data: NormalizedLikeEvent }
  | { type: 'chat'; data: NormalizedChatEvent }
  | { type: 'member'; data: NormalizedMemberEvent }
  | { type: 'viewers'; data: NormalizedRoomUserEvent }
  | { type: 'live_end'; timestamp: number }
  | { type: 'status'; status: ConnectionStatus; message?: string };

export type LiveEventHandler = (event: NormalizedLiveEvent) => void;

export interface LiveProvider {
  readonly name: string;
  connect(uniqueId: string): Promise<void>;
  disconnect(): Promise<void>;
  onEvent(handler: LiveEventHandler): () => void;
  getStatus(): ConnectionStatus;
  getUniqueId(): string | null;
  getRoomInfo(): Record<string, unknown> | null;
}
