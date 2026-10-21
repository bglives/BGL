import {
  createInitialState,
  reducer,
  type BatalhaEffect,
  type BatalhaEvent,
  type BatalhaReducerConfig,
  type BatalhaState,
  type Side,
} from '@workspace/game-engine';
import { logger } from '../lib/logger';
import { SimulationProvider } from './simulation-provider';
import { TikTokLiveConnectorProvider } from './tiktok-provider';
import type { ConnectionStatus, LiveProvider, NormalizedLiveEvent } from './types';

export type MatchListener = (payload: {
  type: 'state' | 'effects' | 'status' | 'event';
  state: BatalhaState;
  effects?: BatalhaEffect[];
  status?: ConnectionStatus;
  statusMessage?: string;
  rawEvent?: NormalizedLiveEvent;
}) => void;

export class MatchSession {
  public readonly id: string;
  public readonly config: BatalhaReducerConfig;
  public readonly isSimulation: boolean;
  public readonly tiktokUsername: string;

  private state: BatalhaState;
  private provider: LiveProvider;
  private unsubscribeProvider: (() => void) | null = null;
  private clockInterval: NodeJS.Timeout | null = null;
  private listeners = new Set<MatchListener>();

  constructor(params: {
    id: string;
    config: BatalhaReducerConfig;
    tiktokUsername?: string;
    isSimulation?: boolean;
  }) {
    this.id = params.id;
    this.config = params.config;
    this.tiktokUsername = (params.tiktokUsername || '').trim().replace(/^@/, '');
    this.isSimulation = Boolean(params.isSimulation);

    this.state = createInitialState(this.config);

    if (this.isSimulation) {
      this.provider = new SimulationProvider();
    } else {
      this.provider = new TikTokLiveConnectorProvider();
    }
  }

  public getState(): BatalhaState {
    return this.state;
  }

  public getStatus(): ConnectionStatus {
    return this.provider.getStatus();
  }

  public getProvider(): LiveProvider {
    return this.provider;
  }

  public subscribe(listener: MatchListener): () => void {
    this.listeners.add(listener);
    // Send immediate state
    listener({
      type: 'state',
      state: this.state,
      status: this.provider.getStatus(),
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private broadcast(payload: {
    type: 'state' | 'effects' | 'status' | 'event';
    effects?: BatalhaEffect[];
    status?: ConnectionStatus;
    statusMessage?: string;
    rawEvent?: NormalizedLiveEvent;
  }): void {
    for (const listener of this.listeners) {
      try {
        listener({
          ...payload,
          state: this.state,
        });
      } catch (err) {
        logger.error({ err, matchId: this.id }, 'Erro ao transmitir atualização para listener');
      }
    }
  }

  public dispatch(event: BatalhaEvent): void {
    const prevState = this.state;
    const nextState = reducer(prevState, event, this.config);
    this.state = nextState;

    if (nextState.effects && nextState.effects.length > 0) {
      this.broadcast({
        type: 'effects',
        effects: nextState.effects,
      });
    } else {
      this.broadcast({ type: 'state' });
    }
  }

  public async start(): Promise<void> {
    logger.info({ matchId: this.id, isSimulation: this.isSimulation }, 'Iniciando partida');

    // 1. Dispatch START_MATCH to transition from 'aguardando' to 'contagem-inicial'
    this.dispatch({
      type: 'START_MATCH',
      nowMs: Date.now(),
    });

    // 2. Start 1-second clock tick
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = setInterval(() => {
      this.dispatch({
        type: 'CLOCK_TICK',
        nowMs: Date.now(),
        viewers: this.state.latestViewers,
      });
    }, 1_000);

    // 3. Connect the LiveProvider
    this.unsubscribeProvider = this.provider.onEvent((liveEvent) => {
      this.handleLiveEvent(liveEvent);
    });

    const targetUser = this.isSimulation ? 'simulador' : this.tiktokUsername;
    await this.provider.connect(targetUser);
  }

  public async stop(): Promise<void> {
    logger.info({ matchId: this.id }, 'Encerrando partida');

    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }

    if (this.unsubscribeProvider) {
      this.unsubscribeProvider();
      this.unsubscribeProvider = null;
    }

    await this.provider.disconnect();

    this.broadcast({
      type: 'status',
      status: 'disconnected',
      statusMessage: 'Partida finalizada.',
    });
  }

  private handleLiveEvent(liveEvent: NormalizedLiveEvent): void {
    const now = Date.now();

    if (liveEvent.type === 'status') {
      this.broadcast({
        type: 'status',
        status: liveEvent.status,
        statusMessage: liveEvent.message,
      });
      return;
    }

    if (liveEvent.type === 'viewers') {
      this.state = {
        ...this.state,
        latestViewers: liveEvent.data.viewerCount,
      };
      this.broadcast({ type: 'state' });
      return;
    }

    if (liveEvent.type === 'chat') {
      const comment = liveEvent.data.comment.trim().toLowerCase();
      let side: Side | null = null;
      const candA = (this.config as any)?.candidateA;
      const candB = (this.config as any)?.candidateB;
      const numA = candA?.number ? String(candA.number).trim().toLowerCase() : '13';
      const numB = candB?.number ? String(candB.number).trim().toLowerCase() : '22';

      const matchesA =
        comment === '13' ||
        comment.startsWith('13 ') ||
        comment.startsWith('!13') ||
        comment.includes('13') ||
        (numA && numA !== '13' && (comment === numA || comment.startsWith(`${numA} `) || comment.startsWith(`!${numA}`))) ||
        comment === 'a' ||
        comment.startsWith('!a');

      const matchesB =
        comment === '22' ||
        comment.startsWith('22 ') ||
        comment.startsWith('!22') ||
        comment.includes('22') ||
        (numB && numB !== '22' && (comment === numB || comment.startsWith(`${numB} `) || comment.startsWith(`!${numB}`))) ||
        comment === 'b' ||
        comment.startsWith('!b');

      if (matchesA && !matchesB) {
        side = 'A';
      } else if (matchesB && !matchesA) {
        side = 'B';
      }

      if (side && this.config.chatCommands) {
        this.dispatch({
          type: 'CHAT_VOTE',
          eventId: liveEvent.data.eventId,
          userId: liveEvent.data.user.id || liveEvent.data.user.uniqueId,
          side,
          nowMs: now,
        });
      }
      return;
    }

    if (liveEvent.type === 'like') {
      if (this.config.likesEnergy) {
        // Distribute likes by alternating or random side
        const side: Side = Math.random() > 0.5 ? 'A' : 'B';
        this.dispatch({
          type: 'LIKE_RECEIVED',
          eventId: liveEvent.data.eventId,
          side,
          likes: liveEvent.data.likesCount,
          nowMs: now,
        });
      }
      return;
    }

    if (liveEvent.type === 'gift') {
      const { giftId, deltaQuantity, user, eventId } = liveEvent.data;

      // Verify if gift is configured for Candidate A or Candidate B
      const isSideA = this.config.candidateA.gifts.some((g) => g.id === giftId);
      const isSideB = this.config.candidateB.gifts.some((g) => g.id === giftId);

      if (!isSideA && !isSideB) {
        logger.debug({ giftId }, 'Presente recebido não está na lista dos candidatos (ignorado no placar)');
        return;
      }

      this.dispatch({
        type: 'GIFT_RECEIVED',
        eventId,
        giftId,
        quantity: deltaQuantity,
        userId: user.id || user.uniqueId,
        displayName: user.nickname,
        nowMs: now,
      });
    }
  }
}
