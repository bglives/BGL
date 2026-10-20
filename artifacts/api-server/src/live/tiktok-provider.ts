import { ControlEvent, TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import { logger } from '../lib/logger';
import { StreakTracker } from './streak-tracker';
import type {
  ConnectionStatus,
  LiveEventHandler,
  LiveProvider,
  NormalizedLiveEvent,
  NormalizedUser,
} from './types';

export class TikTokLiveConnectorProvider implements LiveProvider {
  public readonly name = 'tiktok-live-connector';

  private connection: TikTokLiveConnection | null = null;
  private currentUniqueId: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  private readonly listeners = new Set<LiveEventHandler>();
  private readonly streakTracker = new StreakTracker();

  // Reconnection backoff
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isExplicitlyClosed = false;

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getUniqueId(): string | null {
    return this.currentUniqueId;
  }

  public getRoomInfo(): Record<string, unknown> | null {
    if (!this.connection) return null;
    return (this.connection.state?.roomInfo as unknown as Record<string, unknown>) ?? null;
  }

  public onEvent(handler: LiveEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  private setStatus(newStatus: ConnectionStatus, message?: string): void {
    this.status = newStatus;
    this.emit({
      type: 'status',
      status: newStatus,
      message,
    });
  }

  private emit(event: NormalizedLiveEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        logger.error({ err, eventType: event.type }, 'Erro ao despachar evento para listener');
      }
    }
  }

  public async connect(uniqueId: string): Promise<void> {
    const cleanId = uniqueId.trim().replace(/^@/, '');
    if (!cleanId) {
      throw new Error('Nome de usuário do TikTok inválido.');
    }

    if (this.connection && this.currentUniqueId === cleanId && this.status === 'connected') {
      return;
    }

    await this.disconnect();

    this.isExplicitlyClosed = false;
    this.currentUniqueId = cleanId;
    this.setStatus('connecting', `Conectando à live de @${cleanId}...`);

    try {
      this.connection = new TikTokLiveConnection(cleanId, {
        processInitialData: false,
        enableExtendedGiftInfo: true,
      });

      this.setupConnectionEvents(this.connection, cleanId);

      await this.connection.connect();
    } catch (err: any) {
      logger.error({ err, uniqueId: cleanId }, 'Falha ao conectar no TikTok');
      this.setStatus('error', err?.message || 'Falha ao conectar na live do TikTok');
      this.scheduleReconnect();
    }
  }

  public async disconnect(): Promise<void> {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;

    if (this.connection) {
      try {
        this.connection.disconnect();
      } catch (err) {
        logger.warn({ err }, 'Aviso ao desconectar conexão TikTok');
      }
      this.connection = null;
    }

    this.streakTracker.reset();
    this.setStatus('disconnected', 'Conexão encerrada.');
  }

  private setupConnectionEvents(conn: TikTokLiveConnection, uniqueId: string): void {
    conn.on(ControlEvent.CONNECTED, () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected', `Conectado com sucesso à live de @${uniqueId}`);
      logger.info({ uniqueId }, 'TikTokLiveConnection conectada com sucesso');
    });

    conn.on(ControlEvent.DISCONNECTED, (evt) => {
      logger.warn({ evt, uniqueId }, 'TikTokLiveConnection desconectada');
      if (!this.isExplicitlyClosed) {
        this.setStatus('reconnecting', 'Conexão perdida. Tentando reconectar...');
        this.scheduleReconnect();
      }
    });

    conn.on(ControlEvent.ERROR, (err) => {
      logger.error({ err, uniqueId }, 'Erro na TikTokLiveConnection');
      if (!this.isExplicitlyClosed && this.status !== 'connected') {
        this.setStatus('error', err?.message || 'Erro na conexão com TikTok');
      }
    });

    conn.on(WebcastEvent.STREAM_END, () => {
      logger.info({ uniqueId }, 'Live do TikTok foi encerrada pelo criador');
      this.emit({ type: 'live_end', timestamp: Date.now() });
      this.disconnect().catch(() => {});
    });

    conn.on(WebcastEvent.CHAT, (msg) => {
      const user = this.normalizeUser(msg.user);
      this.emit({
        type: 'chat',
        data: {
          eventId: msg.common?.msgId || `chat-${Date.now()}-${Math.random()}`,
          comment: msg.content || '',
          user,
          timestamp: Date.now(),
        },
      });
    });

    conn.on(WebcastEvent.LIKE, (msg) => {
      const user = this.normalizeUser(msg.user);
      const likesCount = Math.max(1, msg.count || 1);
      const totalLikes = msg.total ? Number(msg.total) : undefined;
      this.emit({
        type: 'like',
        data: {
          eventId: msg.common?.msgId || `like-${Date.now()}-${Math.random()}`,
          likesCount,
          totalLikes,
          user,
          timestamp: Date.now(),
        },
      });
    });

    conn.on(WebcastEvent.ROOM_USER, (msg) => {
      const viewerCount = Number(msg.totalUser || msg.total || 0);
      this.emit({
        type: 'viewers',
        data: {
          eventId: msg.common?.msgId || `viewers-${Date.now()}`,
          viewerCount: Math.max(0, viewerCount),
          timestamp: Date.now(),
        },
      });
    });

    conn.on(WebcastEvent.MEMBER, (msg) => {
      const user = this.normalizeUser(msg.user);
      this.emit({
        type: 'member',
        data: {
          eventId: msg.common?.msgId || `member-${Date.now()}-${Math.random()}`,
          user,
          timestamp: Date.now(),
        },
      });
    });

    conn.on(WebcastEvent.GIFT, (msg) => {
      const repeatCount = Math.max(1, msg.repeatCount || 1);
      const isStreakEnd = Boolean(msg.repeatEnd);
      const eventId = msg.common?.msgId || `gift-${Date.now()}-${Math.random()}`;
      const userId = msg.user?.id || msg.user?.displayId || 'anonymous';
      const giftId = String(msg.giftId || msg.gift?.id || '');

      const streak = this.streakTracker.processGift({
        eventId,
        userId,
        giftId,
        repeatCount,
        groupId: msg.groupId,
        isStreakEnd,
      });

      if (streak.isDuplicate || streak.deltaQuantity <= 0) {
        return;
      }

      const user = this.normalizeUser(msg.user);
      const giftName = msg.gift?.name || 'Presente';
      const giftImageUrl = msg.gift?.image?.urlList?.[0];
      const diamondValue = Math.max(1, msg.gift?.diamondCount || msg.fanTicketCount || 1);

      this.emit({
        type: 'gift',
        data: {
          eventId,
          giftId,
          giftName,
          giftImageUrl,
          diamondValue,
          repeatCount,
          deltaQuantity: streak.deltaQuantity,
          isStreakEnd,
          user,
          timestamp: Date.now(),
        },
      });
    });
  }

  private normalizeUser(user?: any): NormalizedUser {
    if (!user) {
      return {
        id: `anon-${Date.now()}`,
        uniqueId: 'espectador',
        nickname: 'Espectador',
      };
    }
    return {
      id: String(user.id || user.displayId || 'unknown'),
      uniqueId: String(user.displayId || user.id || 'espectador'),
      nickname: String(user.nickname || user.displayId || 'Espectador'),
      avatarUrl: user.profilePicture?.urlList?.[0] || user.avatarUrl,
    };
  }

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed || !this.currentUniqueId) return;

    this.reconnectAttempts += 1;
    // Exponential backoff: 2s, 4s, 8s, 16s, up to max 30s
    const delay = Math.min(30_000, Math.pow(2, this.reconnectAttempts) * 1_000);

    logger.info(
      { uniqueId: this.currentUniqueId, attempt: this.reconnectAttempts, delayMs: delay },
      'Agendando reconexão automática...',
    );

    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitlyClosed && this.currentUniqueId) {
        this.connect(this.currentUniqueId).catch((err) => {
          logger.warn({ err }, 'Tentativa de reconexão falhou');
        });
      }
    }, delay);
  }
}
