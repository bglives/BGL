import { logger } from '../lib/logger';
import type {
  ConnectionStatus,
  LiveEventHandler,
  LiveProvider,
  NormalizedChatEvent,
  NormalizedGiftEvent,
  NormalizedLikeEvent,
  NormalizedLiveEvent,
  NormalizedUser,
} from './types';

export class SimulationProvider implements LiveProvider {
  public readonly name = 'simulation-provider';

  private status: ConnectionStatus = 'disconnected';
  private targetUniqueId: string | null = null;
  private readonly listeners = new Set<LiveEventHandler>();

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getUniqueId(): string | null {
    return this.targetUniqueId;
  }

  public getRoomInfo(): Record<string, unknown> | null {
    return {
      title: 'Live Simulada - LiveArena',
      owner: { nickname: 'Streamer Simulado', uniqueId: this.targetUniqueId || 'simulador' },
      status: 2, // Live active
    };
  }

  public onEvent(handler: LiveEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  private emit(event: NormalizedLiveEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        logger.error({ err, eventType: event.type }, 'Erro no SimulationProvider ao notificar listener');
      }
    }
  }

  public async connect(uniqueId: string): Promise<void> {
    this.targetUniqueId = uniqueId || 'simulador';
    this.status = 'connected';
    this.emit({
      type: 'status',
      status: 'connected',
      message: 'Modo Simulador conectado com sucesso.',
    });
    this.emit({
      type: 'viewers',
      data: {
        eventId: `sim-viewers-${Date.now()}`,
        viewerCount: 150,
        timestamp: Date.now(),
      },
    });
  }

  public async disconnect(): Promise<void> {
    this.status = 'disconnected';
    this.emit({
      type: 'status',
      status: 'disconnected',
      message: 'Simulador pausado.',
    });
  }

  /**
   * Dispara um presente simulado
   */
  public simulateGift(params: {
    giftId: string;
    giftName?: string;
    giftImageUrl?: string;
    quantity?: number;
    diamondValue?: number;
    user?: Partial<NormalizedUser>;
  }): NormalizedGiftEvent {
    const qty = Math.max(1, params.quantity || 1);
    const user: NormalizedUser = {
      id: params.user?.id || `sim-user-${Math.floor(Math.random() * 1000)}`,
      uniqueId: params.user?.uniqueId || `torcedor_${Math.floor(Math.random() * 999)}`,
      nickname: params.user?.nickname || 'Super Fã',
      avatarUrl: params.user?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=livearena',
    };

    const event: NormalizedGiftEvent = {
      eventId: `sim-gift-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      giftId: params.giftId,
      giftName: params.giftName || 'Presente Simulado',
      giftImageUrl: params.giftImageUrl,
      diamondValue: params.diamondValue || 1,
      repeatCount: qty,
      deltaQuantity: qty,
      isStreakEnd: true,
      user,
      timestamp: Date.now(),
    };

    this.emit({ type: 'gift', data: event });
    return event;
  }

  /**
   * Dispara likes simulados
   */
  public simulateLike(count = 5, user?: Partial<NormalizedUser>): NormalizedLikeEvent {
    const defaultUser: NormalizedUser = {
      id: user?.id || `sim-user-${Math.floor(Math.random() * 1000)}`,
      uniqueId: user?.uniqueId || 'espectador_animado',
      nickname: user?.nickname || 'Espectador Animado',
      avatarUrl: user?.avatarUrl,
    };

    const event: NormalizedLikeEvent = {
      eventId: `sim-like-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      likesCount: count,
      user: defaultUser,
      timestamp: Date.now(),
    };

    this.emit({ type: 'like', data: event });
    return event;
  }

  /**
   * Dispara comentário no chat (ex: !a ou !b para votação no chat)
   */
  public simulateChat(comment: string, user?: Partial<NormalizedUser>): NormalizedChatEvent {
    const defaultUser: NormalizedUser = {
      id: user?.id || `sim-user-${Math.floor(Math.random() * 1000)}`,
      uniqueId: user?.uniqueId || 'comentarista',
      nickname: user?.nickname || 'Comentarista',
      avatarUrl: user?.avatarUrl,
    };

    const event: NormalizedChatEvent = {
      eventId: `sim-chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      comment,
      user: defaultUser,
      timestamp: Date.now(),
    };

    this.emit({ type: 'chat', data: event });
    return event;
  }

  /**
   * Dispara uma rajada de presentes (burst) para teste de estresse
   */
  public async simulateBurst(params: {
    giftId: string;
    giftName?: string;
    totalGifts: number;
    batchSize?: number;
    delayBetweenBatchesMs?: number;
  }): Promise<void> {
    const total = Math.max(1, params.totalGifts);
    const batchSize = Math.max(1, params.batchSize || 10);
    const delay = Math.max(10, params.delayBetweenBatchesMs || 50);

    let sent = 0;
    while (sent < total) {
      const currentBatch = Math.min(batchSize, total - sent);
      this.simulateGift({
        giftId: params.giftId,
        giftName: params.giftName,
        quantity: currentBatch,
        user: {
          nickname: `Tornado de Presentes`,
          uniqueId: `burst_donor`,
        },
      });
      sent += currentBatch;
      if (sent < total) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
