import { describe, expect, it } from 'vitest';
import { configSchema, type BatalhaDeVotosConfig } from './config-schema';
import {
  COMBO_WINDOW_MS,
  CHAT_VOTE_COOLDOWN_MS,
  INITIAL_COUNTDOWN_MS,
  POWER_UP_DURATION_MS,
  createInitialState,
  reducer,
  type BatalhaState,
} from './reducer';

function gifts(prefix: string) {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `${prefix}${index + 1}`,
    name: `Presente ${prefix.toUpperCase()}${index + 1}`,
    imageUrl: '',
    costCoins: 5,
    votes: 2,
  }));
}

function makeConfig(overrides: Partial<BatalhaDeVotosConfig> = {}): BatalhaDeVotosConfig {
  const config: BatalhaDeVotosConfig = {
    title: '',
    candidateA: { name: 'Lado A', color: '#62e6b0', avatar: undefined, gifts: gifts('a') },
    candidateB: { name: 'Lado B', color: '#ff8b9f', avatar: undefined, gifts: gifts('b') },
    backgroundImage: undefined,
    backgroundVideo: undefined,
    format: 'vertical',
    mode: 'single',
    roundMinutes: '5',
    intermissionSeconds: 20,
    tieRule: 'draw',
    doubleLastMinute: true,
    announceDoubleSeconds: 10,
    leadChangeOvertime: true,
    overtimeSeconds: 20,
    maxOvertimes: 2,
    likesEnergy: false,
    energyBonusThreshold: 10,
    energyBonusPoints: 4,
    energyBonusCap: 8,
    chatCommands: false,
    collectiveGoals: [],
    surpriseEvents: false,
    powerUps: false,
    powerUpEffect: 'shield',
    powerUpGiftA: '',
    powerUpGiftB: '',
    smallThreshold: 1,
    mediumThreshold: 10,
    epicThreshold: 50,
    textNarrator: true,
    voiceNarrator: false,
    soundVolume: 65,
    muted: false,
  };
  return { ...config, ...overrides };
}

function startRunning(config: BatalhaDeVotosConfig, startAt = 100_000) {
  let state = createInitialState(config);
  state = reducer(state, { type: 'START_MATCH', nowMs: startAt }, config);
  state = reducer(state, { type: 'CLOCK_TICK', nowMs: startAt + INITIAL_COUNTDOWN_MS }, config);
  return { state, roundStartedAt: startAt + INITIAL_COUNTDOWN_MS };
}

function sendGift(
  config: BatalhaDeVotosConfig,
  state: BatalhaState,
  options: Partial<Extract<Parameters<typeof reducer>[1], { type: 'GIFT_RECEIVED' }>> = {},
) {
  const event = {
    type: 'GIFT_RECEIVED' as const,
    eventId: `gift-${state.processedEventIds.length + 1}`,
    giftId: 'a1',
    quantity: 1,
    userId: 'viewer-1',
    displayName: 'Viewer One',
    nowMs: state.nowMs + 1,
    ...options,
  };
  return reducer(state, event, config);
}

describe('Batalha de Votos reducer', () => {
  it('aplica a contagem inicial antes de iniciar a rodada', () => {
    const config = makeConfig();
    let state = createInitialState(config);
    state = reducer(state, { type: 'START_MATCH', nowMs: 1_000 }, config);

    expect(state.phase).toBe('contagem-inicial');
    expect(state.phaseEndsAt).toBe(1_000 + INITIAL_COUNTDOWN_MS);

    state = reducer(state, { type: 'CLOCK_TICK', nowMs: 1_000 + INITIAL_COUNTDOWN_MS }, config);
    expect(state.phase).toBe('rodando');
    expect(state.roundEndsAt).toBe(1_000 + INITIAL_COUNTDOWN_MS + 5 * 60_000);
  });

  it('pontua somente presentes cadastrados pelo valor em votos vezes quantidade', () => {
    const config = makeConfig();
    const { state } = startRunning(config);
    const scored = sendGift(config, state, { quantity: 3 });
    expect(scored.scoreA).toBe(6);

    const ignored = sendGift(config, state, { eventId: 'unknown', giftId: 'not-configured' });
    expect(ignored.scoreA).toBe(0);
    expect(ignored.processedEventIds).toContain('unknown');
  });

  it('deduplica o mesmo ID de evento sem aplicar pontos novamente', () => {
    const config = makeConfig();
    const { state } = startRunning(config);
    const event = {
      type: 'GIFT_RECEIVED' as const,
      eventId: 'same-event',
      giftId: 'a1',
      quantity: 2,
      userId: 'viewer-1',
      displayName: 'Viewer One',
      nowMs: state.nowMs + 1,
    };
    const scored = reducer(state, event, config);
    const duplicate = reducer(scored, event, config);

    expect(scored.scoreA).toBe(4);
    expect(duplicate).toBe(scored);
  });

  it('conta apenas o delta de uma sequência de streak', () => {
    const config = makeConfig();
    const { state } = startRunning(config);
    const first = reducer(state, {
      type: 'GIFT_RECEIVED',
      eventId: 'streak-1',
      giftId: 'a1',
      quantity: 2,
      userId: 'viewer-1',
      displayName: 'Viewer One',
      nowMs: state.nowMs + 1,
      streak: { id: 'sequence-1', totalQuantity: 2 },
    }, config);
    const second = reducer(first, {
      type: 'GIFT_RECEIVED',
      eventId: 'streak-2',
      giftId: 'a1',
      quantity: 5,
      userId: 'viewer-1',
      displayName: 'Viewer One',
      nowMs: first.nowMs + 1,
      streak: { id: 'sequence-1', totalQuantity: 5 },
    }, config);

    expect(first.scoreA).toBe(4);
    expect(second.scoreA).toBe(10);
  });

  it('ativa e anuncia o dobro no último minuto sem empilhar multiplicadores x2', () => {
    const config = makeConfig();
    const { state } = startRunning(config);
    const end = state.roundEndsAt!;
    const announced = reducer(state, { type: 'CLOCK_TICK', nowMs: end - 70_000 }, config);
    expect(announced.doubleAnnounced).toBe(true);
    expect(announced.doubleActive).toBe(false);

    const finalMinute = reducer(announced, {
      type: 'CLOCK_TICK',
      nowMs: end - 60_000,
    }, config);
    const hourX2 = reducer(finalMinute, {
      type: 'START_SURPRISE',
      eventId: 'surprise-x2',
      kind: 'hour-x2',
      nowMs: end - 59_000,
    }, makeConfig({ surpriseEvents: true }));
    const scored = sendGift(
      makeConfig({ surpriseEvents: true }),
      hourX2,
      { eventId: 'double-gift', quantity: 1, nowMs: end - 30_000 },
    );

    expect(finalMinute.doubleActive).toBe(true);
    expect(scored.scoreA).toBe(4);
  });

  it('estende a rodada nas viradas finais até o limite de duas extensões', () => {
    const config = makeConfig();
    const { state, roundStartedAt } = startRunning(config);
    let next = sendGift(config, state, { eventId: 'lead-a', quantity: 1, nowMs: roundStartedAt + 1 });
    const originalEnd = next.roundEndsAt!;
    next = sendGift(config, next, {
      eventId: 'lead-b',
      giftId: 'b1',
      quantity: 2,
      userId: 'viewer-2',
      displayName: 'Viewer Two',
      nowMs: originalEnd - 9_000,
    });
    expect(next.phase).toBe('prorrogacao');
    expect(next.overtimeExtensions).toBe(1);
    expect(next.roundEndsAt).toBe(originalEnd + 20_000);

    next = sendGift(config, next, {
      eventId: 'lead-a-again',
      giftId: 'a1',
      quantity: 2,
      nowMs: next.roundEndsAt! - 5_000,
    });
    expect(next.overtimeExtensions).toBe(2);
    expect(next.roundEndsAt).toBe(originalEnd + 40_000);

    next = sendGift(config, next, {
      eventId: 'lead-b-again',
      giftId: 'b1',
      quantity: 2,
      userId: 'viewer-2',
      displayName: 'Viewer Two',
      nowMs: next.roundEndsAt! - 5_000,
    });
    expect(next.overtimeExtensions).toBe(2);
    expect(next.roundEndsAt).toBe(originalEnd + 40_000);
  });

  it('usa uma prorrogação de 20 segundos para resolver empate e termina empatado se persistir', () => {
    const config = makeConfig({ tieRule: 'overtime' });
    const { state } = startRunning(config);
    const originalEnd = state.roundEndsAt!;
    const overtime = reducer(state, { type: 'CLOCK_TICK', nowMs: originalEnd }, config);
    expect(overtime.phase).toBe('prorrogacao');
    expect(overtime.roundEndsAt).toBe(originalEnd + 20_000);

    const finished = reducer(overtime, { type: 'CLOCK_TICK', nowMs: originalEnd + 20_000 }, config);
    expect(finished.phase).toBe('finalizado');
    expect(finished.draw).toBe(true);
    expect(finished.roundResults[0]?.winner).toBeNull();
  });

  it('mantém combo visual de 5 segundos sem alterar a fórmula de pontos', () => {
    const config = makeConfig();
    const { state } = startRunning(config);
    const first = sendGift(config, state, { eventId: 'combo-1', nowMs: state.nowMs + 1 });
    const second = sendGift(config, first, {
      eventId: 'combo-2',
      nowMs: first.nowMs + COMBO_WINDOW_MS,
    });

    expect(second.scoreA).toBe(4);
    expect(second.combos['viewer-1']?.count).toBe(2);
    expect(second.effects.some((effect) => effect.type === 'combo' && effect.count === 2)).toBe(true);
  });

  it('aplica bônus de likes por lado e respeita o teto por partida', () => {
    const config = makeConfig({
      likesEnergy: true,
      energyBonusThreshold: 10,
      energyBonusPoints: 4,
      energyBonusCap: 6,
    });
    const { state } = startRunning(config);
    const first = reducer(state, {
      type: 'LIKE_RECEIVED',
      eventId: 'likes-1',
      side: 'A',
      likes: 15,
      nowMs: state.nowMs + 1,
    }, config);
    const second = reducer(first, {
      type: 'LIKE_RECEIVED',
      eventId: 'likes-2',
      side: 'A',
      likes: 20,
      nowMs: first.nowMs + 1,
    }, config);

    expect(first.scoreA).toBe(4);
    expect(first.energy.A).toEqual({ progress: 5, bonusEarned: 4 });
    expect(second.scoreA).toBe(6);
    expect(second.energy.A.bonusEarned).toBe(6);
    expect(second.energy.B.bonusEarned).toBe(0);
  });

  it('limita comandos de chat a um ponto por pessoa a cada dez segundos', () => {
    const config = makeConfig({ chatCommands: true });
    const { state } = startRunning(config);
    const first = reducer(state, {
      type: 'CHAT_VOTE',
      eventId: 'chat-1',
      userId: 'viewer-1',
      side: 'A',
      nowMs: state.nowMs + 1,
    }, config);
    const tooSoon = reducer(first, {
      type: 'CHAT_VOTE',
      eventId: 'chat-2',
      userId: 'viewer-1',
      side: 'B',
      nowMs: first.nowMs + CHAT_VOTE_COOLDOWN_MS - 1,
    }, config);
    const afterCooldown = reducer(tooSoon, {
      type: 'CHAT_VOTE',
      eventId: 'chat-3',
      userId: 'viewer-1',
      side: 'B',
      nowMs: first.nowMs + CHAT_VOTE_COOLDOWN_MS,
    }, config);

    expect(first.scoreA).toBe(1);
    expect(tooSoon.scoreB).toBe(0);
    expect(afterCooldown.scoreB).toBe(1);
  });

  it('ativa Hora X2 e encerra o evento após quinze segundos', () => {
    const config = makeConfig({ surpriseEvents: true });
    const { state } = startRunning(config);
    const startAt = state.nowMs + 100;
    const active = reducer(state, {
      type: 'START_SURPRISE',
      eventId: 'hour-start',
      kind: 'hour-x2',
      nowMs: startAt,
    }, config);
    const scored = sendGift(config, active, { eventId: 'hour-gift', nowMs: startAt + 1 });
    expect(scored.scoreA).toBe(4);

    const ended = reducer(scored, {
      type: 'CLOCK_TICK',
      nowMs: startAt + 15_000,
    }, config);
    expect(ended.surprise).toBeNull();
    expect(ended.effects.some((effect) => effect.type === 'bonus_event' && !effect.active)).toBe(true);
  });

  it('soma um ponto por unidade durante Chuva de bônus por quinze segundos', () => {
    const config = makeConfig({ surpriseEvents: true });
    const { state } = startRunning(config);
    const active = reducer(state, {
      type: 'START_SURPRISE',
      eventId: 'rain-start',
      kind: 'bonus-rain',
      nowMs: state.nowMs + 100,
    }, config);
    const scored = sendGift(config, active, {
      eventId: 'rain-gift',
      quantity: 3,
      nowMs: active.nowMs + 1,
    });

    expect(scored.scoreA).toBe(9);
  });

  it('congela a pontuação rival por cinco segundos ao receber o presente marcado', () => {
    const config = makeConfig({
      powerUps: true,
      powerUpEffect: 'freeze',
      powerUpGiftA: 'a1',
      powerUpGiftB: 'b1',
    });
    const { state } = startRunning(config);
    const activated = sendGift(config, state, { eventId: 'freeze-a', nowMs: state.nowMs + 1 });
    expect(activated.freezeUntil.B).toBe(activated.nowMs + POWER_UP_DURATION_MS);

    const blocked = sendGift(config, activated, {
      eventId: 'frozen-b',
      giftId: 'b1',
      userId: 'viewer-2',
      displayName: 'Viewer Two',
      nowMs: activated.nowMs + POWER_UP_DURATION_MS - 1,
    });
    expect(blocked.scoreB).toBe(0);

    const after = sendGift(config, blocked, {
      eventId: 'after-freeze-b',
      giftId: 'b1',
      userId: 'viewer-2',
      displayName: 'Viewer Two',
      nowMs: activated.nowMs + POWER_UP_DURATION_MS + 1,
    });
    expect(after.scoreB).toBe(2);
  });

  it('escudo remove congelamento ativo do próprio lado e protege por cinco segundos', () => {
    const config = makeConfig({
      powerUps: true,
      powerUpEffect: 'shield',
      powerUpGiftA: 'a1',
      powerUpGiftB: 'b1',
    });
    const { state } = startRunning(config);
    const frozenState: BatalhaState = {
      ...state,
      freezeUntil: { ...state.freezeUntil, A: state.nowMs + POWER_UP_DURATION_MS },
    };
    const protectedState = sendGift(config, frozenState, { eventId: 'shield-a' });

    expect(protectedState.scoreA).toBe(2);
    expect(protectedState.freezeUntil.A).toBe(0);
    expect(protectedState.shieldUntil.A).toBe(protectedState.nowMs + POWER_UP_DURATION_MS);
  });

  it('desbloqueia metas uma vez por lado ao atingir o limite', () => {
    const config = makeConfig({
      collectiveGoals: [{ side: 'candidateA', points: 4, message: 'Meta A' }],
    });
    const { state } = startRunning(config);
    const first = sendGift(config, state, { eventId: 'goal-1', quantity: 2 });
    const second = sendGift(config, first, { eventId: 'goal-2', quantity: 1 });

    expect(first.unlockedGoals).toEqual(['0:A']);
    expect(first.effects.some((effect) => effect.type === 'goal_unlocked' && effect.message === 'Meta A')).toBe(true);
    expect(second.effects.some((effect) => effect.type === 'goal_unlocked')).toBe(false);
  });

  it('acumula vitórias e placar no campeonato e encerra quando um lado vence duas rodadas', () => {
    const config = makeConfig({ mode: 'best-of-3' });
    const { state, roundStartedAt } = startRunning(config);
    const firstRoundScore = sendGift(config, state, { eventId: 'round-1-gift', nowMs: roundStartedAt + 1 });
    const firstEnd = reducer(firstRoundScore, { type: 'CLOCK_TICK', nowMs: firstRoundScore.roundEndsAt! }, config);
    expect(firstEnd.phase).toBe('intervalo');
    expect(firstEnd.roundsWonA).toBe(1);
    expect(firstEnd.totalScoreA).toBe(2);

    const secondCountdown = reducer(firstEnd, { type: 'CLOCK_TICK', nowMs: firstEnd.phaseEndsAt! }, config);
    const secondRound = reducer(secondCountdown, { type: 'CLOCK_TICK', nowMs: secondCountdown.phaseEndsAt! }, config);
    const secondRoundScore = sendGift(config, secondRound, {
      eventId: 'round-2-gift',
      nowMs: secondRound.nowMs + 1,
    });
    const finished = reducer(secondRoundScore, { type: 'CLOCK_TICK', nowMs: secondRoundScore.roundEndsAt! }, config);

    expect(finished.phase).toBe('finalizado');
    expect(finished.winner).toBe('A');
    expect(finished.roundsWonA).toBe(2);
    expect(finished.totalScoreA).toBe(4);
    expect(finished.roundResults).toHaveLength(2);
  });

  it('grava métricas a cada dez segundos com presentes/min, audiência e diferença de placar', () => {
    const config = makeConfig();
    const { state, roundStartedAt } = startRunning(config);
    const scored = sendGift(config, state, {
      eventId: 'metric-gift',
      quantity: 3,
      nowMs: roundStartedAt + 1_000,
    });
    const sampled = reducer(scored, {
      type: 'CLOCK_TICK',
      nowMs: roundStartedAt + 10_000,
      viewers: 125,
    }, config);

    expect(sampled.metrics[0]).toEqual({
      at: roundStartedAt + 10_000,
      giftsPerMin: 3,
      viewers: 125,
      scoreDiff: 6,
    });
  });

  it('detecta uma disputa quase empatada quando a diferença é menor que 3%', () => {
    const config = makeConfig({ chatCommands: true });
    const { state } = startRunning(config);
    let current = state;
    let nearTurnState: BatalhaState | undefined;
    for (let index = 0; index < 99; index += 1) {
      current = reducer(current, {
        type: 'CHAT_VOTE',
        eventId: `vote-a-${index}`,
        userId: `viewer-a-${index}`,
        side: 'A',
        nowMs: current.nowMs + 1,
      }, config);
      if (current.effects.some((effect) => effect.type === 'near_turn')) nearTurnState = current;
    }
    for (let index = 0; index < 97; index += 1) {
      current = reducer(current, {
        type: 'CHAT_VOTE',
        eventId: `vote-b-${index}`,
        userId: `viewer-b-${index}`,
        side: 'B',
        nowMs: current.nowMs + 1,
      }, config);
      if (current.effects.some((effect) => effect.type === 'near_turn')) nearTurnState = current;
    }
    expect(current.nearTurn).toBe(true);
    expect(nearTurnState?.effects.some((effect) => effect.type === 'near_turn')).toBe(true);
  });
});

describe('configuração usada pelo reducer', () => {
  it('rejeita menos de cinco presentes por candidato', () => {
    const config = makeConfig();
    const result = configSchema.safeParse({
      ...config,
      candidateA: { ...config.candidateA, gifts: config.candidateA.gifts.slice(0, 4) },
    });
    expect(result.success).toBe(false);
  });

  it('rejeita IDs de presentes repetidos entre os candidatos', () => {
    const config = makeConfig();
    const result = configSchema.safeParse({
      ...config,
      candidateB: {
        ...config.candidateB,
        gifts: config.candidateB.gifts.map((gift, index) => index === 0 ? { ...gift, id: 'a1' } : gift),
      },
    });
    expect(result.success).toBe(false);
  });
});
