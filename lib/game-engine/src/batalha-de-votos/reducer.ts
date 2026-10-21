import type { BatalhaReducerConfig } from './config';

export type Side = 'A' | 'B';
export type MatchPhase = 'aguardando' | 'contagem-inicial' | 'rodando' | 'prorrogacao' | 'intervalo' | 'finalizado';
export type SurpriseKind = 'hour-x2' | 'bonus-rain';
export type AnimationLevel = 'small' | 'medium' | 'epic';

export const INITIAL_COUNTDOWN_MS = 3_000;
export const COMBO_WINDOW_MS = 5_000;
export const CHAT_VOTE_COOLDOWN_MS = 0; // 0ms = sem tempo de espera, conforme comenta sobe 1 voto
export const SURPRISE_EVENT_MS = 15_000;
export const POWER_UP_DURATION_MS = 5_000;
export const METRIC_INTERVAL_MS = 10_000;
export const CHAT_VOTE_POINTS = 1;
export const BONUS_RAIN_POINTS_PER_GIFT = 1;
const LAST_MINUTE_MS = 60_000;
const DOUBLE_ANNOUNCE_BEFORE_MS = 70_000;
const LEAD_CHANGE_WINDOW_MS = 10_000;

export type RoundResult = {
  round: number;
  winner: Side | null;
  scoreA: number;
  scoreB: number;
  endedAt: number;
  overtime: boolean;
};

export type MatchMetric = {
  at: number;
  giftsPerMin: number;
  viewers: number;
  scoreDiff: number;
};

type EffectPayload =
  | { type: 'round_state'; phase: MatchPhase; round: number; at: number }
  | { type: 'round_result'; round: number; winner: Side | null; scoreA: number; scoreB: number }
  | { type: 'match_end'; winner: Side | null; draw: boolean; roundsWonA: number; roundsWonB: number }
  | { type: 'lead_change'; from: Side; to: Side; at: number }
  | { type: 'near_turn'; leader: Side; differencePercent: number; at: number }
  | { type: 'narration'; message: string; at: number }
  | { type: 'animation'; level: AnimationLevel; side: Side; giftId: string; points: number; quantity: number; donorName: string; at: number }
  | { type: 'combo'; userId: string; displayName: string; count: number; side: Side; at: number }
  | { type: 'bonus_event'; kind: SurpriseKind; active: boolean; endsAt: number; at: number }
  | { type: 'goal_unlocked'; goalIndex: number; side: Side; points: number; message: string; at: number }
  | { type: 'energy_bonus'; side: Side; points: number; totalEarned: number; at: number }
  | { type: 'power_up'; side: Side; affectedSide: Side; effect: 'shield' | 'freeze'; endsAt: number; blocked: boolean; at: number }
  | { type: 'metric'; metric: MatchMetric };

export type BatalhaEffect = EffectPayload & { id: number };

export type BatalhaState = {
  phase: MatchPhase;
  roundNumber: number;
  roundDurationMs: number;
  roundStartedAt: number | null;
  roundEndsAt: number | null;
  phaseEndsAt: number | null;
  overtimeReason: 'tie' | 'lead-change' | null;
  overtimeExtensions: number;
  tieOvertimeUsed: boolean;
  scoreA: number;
  scoreB: number;
  totalScoreA: number;
  totalScoreB: number;
  roundsWonA: number;
  roundsWonB: number;
  winner: Side | null;
  draw: boolean;
  roundResults: RoundResult[];
  doubleActive: boolean;
  doubleAnnounced: boolean;
  surprise: { kind: SurpriseKind; endsAt: number } | null;
  shieldUntil: Record<Side, number>;
  freezeUntil: Record<Side, number>;
  energy: Record<Side, { progress: number; bonusEarned: number }>;
  lastVoteAt: Record<string, number>;
  streakTotals: Record<string, number>;
  processedEventIds: string[];
  combos: Record<string, { count: number; lastGiftAt: number; side: Side; displayName: string }>;
  supporters: Record<Side, { userId: string; displayName: string; points: number; gifts: number }[]>;
  giftSamples: { at: number; quantity: number }[];
  metrics: MatchMetric[];
  nextMetricAt: number | null;
  latestViewers: number;
  unlockedGoals: string[];
  nearTurn: boolean;
  nowMs: number;
  effects: BatalhaEffect[];
  nextEffectId: number;
};

export type BatalhaEvent =
  | { type: 'START_MATCH'; nowMs: number }
  | { type: 'CLOCK_TICK'; nowMs: number; viewers?: number }
  | {
      type: 'GIFT_RECEIVED';
      eventId: string;
      giftId: string;
      quantity: number;
      userId: string;
      displayName: string;
      nowMs: number;
      streak?: { id: string; totalQuantity: number };
    }
  | { type: 'LIKE_RECEIVED'; eventId: string; side: Side; likes: number; nowMs: number }
  | { type: 'CHAT_VOTE'; eventId: string; userId: string; side: Side; nowMs: number }
  | { type: 'START_SURPRISE'; eventId: string; kind: SurpriseKind; nowMs: number };

export function createInitialState(config: BatalhaReducerConfig): BatalhaState {
  return {
    phase: 'aguardando',
    roundNumber: 1,
    roundDurationMs: Number(config.roundMinutes) * 60_000,
    roundStartedAt: null,
    roundEndsAt: null,
    phaseEndsAt: null,
    overtimeReason: null,
    overtimeExtensions: 0,
    tieOvertimeUsed: false,
    scoreA: 0,
    scoreB: 0,
    totalScoreA: 0,
    totalScoreB: 0,
    roundsWonA: 0,
    roundsWonB: 0,
    winner: null,
    draw: false,
    roundResults: [],
    doubleActive: false,
    doubleAnnounced: false,
    surprise: null,
    shieldUntil: { A: 0, B: 0 },
    freezeUntil: { A: 0, B: 0 },
    energy: {
      A: { progress: 0, bonusEarned: 0 },
      B: { progress: 0, bonusEarned: 0 },
    },
    lastVoteAt: {},
    streakTotals: {},
    processedEventIds: [],
    combos: {},
    supporters: { A: [], B: [] },
    giftSamples: [],
    metrics: [],
    nextMetricAt: null,
    latestViewers: 0,
    unlockedGoals: [],
    nearTurn: false,
    nowMs: 0,
    effects: [],
    nextEffectId: 1,
  };
}

function emit(state: BatalhaState, effect: EffectPayload): BatalhaState {
  const emitted = { ...effect, id: state.nextEffectId } as BatalhaEffect;
  return {
    ...state,
    nextEffectId: state.nextEffectId + 1,
    effects: [...state.effects, emitted],
  };
}

function otherSide(side: Side): Side {
  return side === 'A' ? 'B' : 'A';
}

function leader(scoreA: number, scoreB: number): Side | null {
  if (scoreA === scoreB) return null;
  return scoreA > scoreB ? 'A' : 'B';
}

function maxRounds(config: BatalhaReducerConfig): number {
  if (config.mode === 'best-of-3') return 3;
  if (config.mode === 'best-of-5') return 5;
  return 1;
}

function winsNeeded(config: BatalhaReducerConfig): number {
  return Math.floor(maxRounds(config) / 2) + 1;
}

function beginRound(state: BatalhaState, at: number, config: BatalhaReducerConfig): BatalhaState {
  let next: BatalhaState = {
    ...state,
    phase: 'rodando',
    roundStartedAt: at,
    roundEndsAt: at + state.roundDurationMs,
    phaseEndsAt: null,
    overtimeReason: null,
    overtimeExtensions: 0,
    tieOvertimeUsed: false,
    scoreA: 0,
    scoreB: 0,
    doubleActive: false,
    doubleAnnounced: false,
    nextMetricAt: at + METRIC_INTERVAL_MS,
    unlockedGoals: [],
    nearTurn: false,
  };
  next = emit(next, { type: 'round_state', phase: 'rodando', round: next.roundNumber, at });
  return next;
}

function beginNextRound(state: BatalhaState, at: number): BatalhaState {
  const next: BatalhaState = {
    ...state,
    phase: 'contagem-inicial',
    roundNumber: state.roundNumber + 1,
    phaseEndsAt: at + INITIAL_COUNTDOWN_MS,
    roundStartedAt: null,
    roundEndsAt: null,
    overtimeReason: null,
    overtimeExtensions: 0,
    tieOvertimeUsed: false,
    scoreA: 0,
    scoreB: 0,
    doubleActive: false,
    doubleAnnounced: false,
    nextMetricAt: null,
    unlockedGoals: [],
    nearTurn: false,
  };
  return emit(next, { type: 'round_state', phase: 'contagem-inicial', round: next.roundNumber, at });
}

function closeRound(state: BatalhaState, at: number, config: BatalhaReducerConfig): BatalhaState {
  const roundWinner = leader(state.scoreA, state.scoreB);
  const totalScoreA = state.totalScoreA + state.scoreA;
  const totalScoreB = state.totalScoreB + state.scoreB;
  const roundsWonA = state.roundsWonA + (roundWinner === 'A' ? 1 : 0);
  const roundsWonB = state.roundsWonB + (roundWinner === 'B' ? 1 : 0);
  const result: RoundResult = {
    round: state.roundNumber,
    winner: roundWinner,
    scoreA: state.scoreA,
    scoreB: state.scoreB,
    endedAt: at,
    overtime: state.overtimeReason !== null,
  };
  let next: BatalhaState = {
    ...state,
    totalScoreA,
    totalScoreB,
    roundsWonA,
    roundsWonB,
    roundResults: [...state.roundResults, result],
    roundEndsAt: null,
    phaseEndsAt: null,
    nextMetricAt: null,
  };
  next = emit(next, {
    type: 'round_result',
    round: state.roundNumber,
    winner: roundWinner,
    scoreA: state.scoreA,
    scoreB: state.scoreB,
  });

  const matchIsDecided = roundsWonA >= winsNeeded(config) || roundsWonB >= winsNeeded(config);
  const noRoundsLeft = state.roundNumber >= maxRounds(config);
  if (matchIsDecided || noRoundsLeft) {
    const winner = roundsWonA > roundsWonB
      ? 'A'
      : roundsWonB > roundsWonA
        ? 'B'
        : totalScoreA > totalScoreB
          ? 'A'
          : totalScoreB > totalScoreA
            ? 'B'
            : null;
    next = {
      ...next,
      phase: 'finalizado',
      winner,
      draw: winner === null,
      overtimeReason: null,
    };
    next = emit(next, {
      type: 'match_end',
      winner,
      draw: winner === null,
      roundsWonA,
      roundsWonB,
    });
    return emit(next, { type: 'round_state', phase: 'finalizado', round: state.roundNumber, at });
  }

  next = {
    ...next,
    phase: 'intervalo',
    phaseEndsAt: at + config.intermissionSeconds * 1_000,
    overtimeReason: null,
  };
  return emit(next, { type: 'round_state', phase: 'intervalo', round: state.roundNumber, at });
}

function recordMetric(state: BatalhaState, at: number, viewers: number): BatalhaState {
  const cutoff = at - 60_000;
  const recent = state.giftSamples.filter((sample) => sample.at >= cutoff && sample.at <= at);
  const metric: MatchMetric = {
    at,
    giftsPerMin: recent.reduce((total, sample) => total + sample.quantity, 0),
    viewers,
    scoreDiff: state.scoreA - state.scoreB,
  };
  let next: BatalhaState = {
    ...state,
    metrics: [...state.metrics, metric],
    giftSamples: state.giftSamples.filter((sample) => sample.at >= cutoff),
  };
  return emit(next, { type: 'metric', metric });
}

function advanceClock(
  state: BatalhaState,
  requestedNow: number,
  config: BatalhaReducerConfig,
  viewers = state.latestViewers,
): BatalhaState {
  const now = Math.max(state.nowMs, requestedNow);
  let next: BatalhaState = {
    ...state,
    effects: [],
    nowMs: now,
    latestViewers: Math.max(0, viewers),
  };

  if (next.surprise && next.surprise.endsAt <= now) {
    const ended = next.surprise;
    next = { ...next, surprise: null };
    next = emit(next, { type: 'bonus_event', kind: ended.kind, active: false, endsAt: ended.endsAt, at: ended.endsAt });
  }
  next = {
    ...next,
    shieldUntil: {
      A: next.shieldUntil.A <= now ? 0 : next.shieldUntil.A,
      B: next.shieldUntil.B <= now ? 0 : next.shieldUntil.B,
    },
    freezeUntil: {
      A: next.freezeUntil.A <= now ? 0 : next.freezeUntil.A,
      B: next.freezeUntil.B <= now ? 0 : next.freezeUntil.B,
    },
  };

  for (let steps = 0; steps < 40; steps += 1) {
    if (next.phase === 'contagem-inicial' && next.phaseEndsAt !== null && next.phaseEndsAt <= now) {
      next = beginRound(next, next.phaseEndsAt, config);
      continue;
    }

    if (next.phase === 'intervalo' && next.phaseEndsAt !== null && next.phaseEndsAt <= now) {
      next = beginNextRound(next, next.phaseEndsAt);
      continue;
    }

    if ((next.phase === 'rodando' || next.phase === 'prorrogacao') && next.roundEndsAt !== null) {
      const roundEndsAt = next.roundEndsAt;
      const timeLeft = roundEndsAt - now;
      if (config.doubleLastMinute && !next.doubleAnnounced && timeLeft <= DOUBLE_ANNOUNCE_BEFORE_MS) {
        next = { ...next, doubleAnnounced: true };
        next = emit(next, { type: 'narration', message: 'Votos em dobro começam em 10 segundos!', at: now });
      }
      if (config.doubleLastMinute && !next.doubleActive && timeLeft <= LAST_MINUTE_MS) {
        next = { ...next, doubleActive: true };
        next = emit(next, { type: 'narration', message: 'Votos em dobro ativos!', at: now });
      }

      while (
        next.nextMetricAt !== null
        && next.nextMetricAt <= now
        && next.nextMetricAt < roundEndsAt
      ) {
        const metricAt = next.nextMetricAt;
        next = recordMetric(next, metricAt, next.latestViewers);
        next = { ...next, nextMetricAt: metricAt + METRIC_INTERVAL_MS };
      }

      if (roundEndsAt <= now) {
        const endedAt = roundEndsAt;
        if (
          next.phase === 'rodando'
          && next.scoreA === next.scoreB
          && config.tieRule === 'overtime'
          && !next.tieOvertimeUsed
        ) {
          next = {
            ...next,
            phase: 'prorrogacao',
            roundEndsAt: endedAt + config.overtimeSeconds * 1_000,
            overtimeReason: 'tie',
            tieOvertimeUsed: true,
          };
          next = emit(next, { type: 'round_state', phase: 'prorrogacao', round: next.roundNumber, at: endedAt });
          continue;
        }
        next = closeRound(next, endedAt, config);
        continue;
      }
    }
    break;
  }
  return next;
}

function markProcessed(state: BatalhaState, eventId: string): BatalhaState {
  return { ...state, processedEventIds: [...state.processedEventIds, eventId] };
}

function prepareEvent(
  state: BatalhaState,
  eventId: string,
  nowMs: number,
  config: BatalhaReducerConfig,
): BatalhaState | null {
  if (!eventId || state.processedEventIds.includes(eventId)) return null;
  return markProcessed(advanceClock(state, nowMs, config), eventId);
}

function giftSide(config: BatalhaReducerConfig, giftId: string): Side | null {
  if (config.candidateA.gifts.some((gift) => gift.id === giftId)) return 'A';
  if (config.candidateB.gifts.some((gift) => gift.id === giftId)) return 'B';
  return null;
}

function getAnimationLevel(points: number, config: BatalhaReducerConfig): AnimationLevel {
  if (points >= config.epicThreshold) return 'epic';
  if (points >= config.mediumThreshold) return 'medium';
  return 'small';
}

function updateSupporters(
  state: BatalhaState,
  side: Side,
  userId: string,
  displayName: string,
  points: number,
  quantity: number,
): BatalhaState {
  const existing = state.supporters[side].find((supporter) => supporter.userId === userId);
  const supporters = existing
    ? state.supporters[side].map((supporter) => supporter.userId === userId
      ? { ...supporter, displayName, points: supporter.points + points, gifts: supporter.gifts + quantity }
      : supporter)
    : [...state.supporters[side], { userId, displayName, points, gifts: quantity }];
  supporters.sort((left, right) => right.points - left.points || left.userId.localeCompare(right.userId));
  return {
    ...state,
    supporters: { ...state.supporters, [side]: supporters },
  };
}

function unlockGoals(
  state: BatalhaState,
  side: Side,
  previousScore: number,
  currentScore: number,
  at: number,
  config: BatalhaReducerConfig,
): BatalhaState {
  let next = state;
  config.collectiveGoals.forEach((goal, index) => {
    const appliesToSide = goal.side === 'both'
      || (goal.side === 'candidateA' && side === 'A')
      || (goal.side === 'candidateB' && side === 'B');
    const key = `${index}:${side}`;
    if (appliesToSide && previousScore < goal.points && currentScore >= goal.points && !next.unlockedGoals.includes(key)) {
      next = {
        ...next,
        unlockedGoals: [...next.unlockedGoals, key],
      };
      next = emit(next, {
        type: 'goal_unlocked',
        goalIndex: index,
        side,
        points: goal.points,
        message: goal.message,
        at,
      });
    }
  });
  return next;
}

function applyPoints(state: BatalhaState, side: Side, points: number, at: number, config: BatalhaReducerConfig): BatalhaState {
  if (!Number.isFinite(points) || points <= 0) return state;
  const previousScore = side === 'A' ? state.scoreA : state.scoreB;
  const beforeLeader = leader(state.scoreA, state.scoreB);
  const updatedScore = previousScore + points;
  let next: BatalhaState = side === 'A'
    ? { ...state, scoreA: updatedScore }
    : { ...state, scoreB: updatedScore };

  const afterLeader = leader(next.scoreA, next.scoreB);
  if (beforeLeader && afterLeader && beforeLeader !== afterLeader) {
    next = emit(next, { type: 'lead_change', from: beforeLeader, to: afterLeader, at });
    next = emit(next, { type: 'narration', message: `VIRADA! O lado ${afterLeader} assumiu a liderança.`, at });
    if (
      config.leadChangeOvertime
      && next.roundEndsAt !== null
      && next.roundEndsAt - at <= LEAD_CHANGE_WINDOW_MS
      && next.overtimeExtensions < config.maxOvertimes
      && (next.phase === 'rodando' || next.phase === 'prorrogacao')
    ) {
      next = {
        ...next,
        phase: 'prorrogacao',
        roundEndsAt: next.roundEndsAt + config.overtimeSeconds * 1_000,
        overtimeReason: 'lead-change',
        overtimeExtensions: next.overtimeExtensions + 1,
      };
      next = emit(next, { type: 'round_state', phase: 'prorrogacao', round: next.roundNumber, at });
    }
  }

  const total = next.scoreA + next.scoreB;
  const differencePercent = total === 0 ? 0 : (Math.abs(next.scoreA - next.scoreB) / total) * 100;
  const isNearTurn = total > 0 && differencePercent < 3 && afterLeader !== null;
  if (isNearTurn && !next.nearTurn && afterLeader) {
    next = emit(next, { type: 'near_turn', leader: afterLeader, differencePercent, at });
    next = emit(next, { type: 'narration', message: 'QUASE VIRANDO! A disputa está muito equilibrada.', at });
  }
  next = { ...next, nearTurn: isNearTurn };
  return unlockGoals(next, side, previousScore, updatedScore, at, config);
}

function activatePowerUp(state: BatalhaState, side: Side, at: number, config: BatalhaReducerConfig): BatalhaState {
  if (!config.powerUps) return state;
  const effect = config.powerUpEffect;
  const endsAt = at + POWER_UP_DURATION_MS;
  if (effect === 'shield') {
    const freezeUntil = { ...state.freezeUntil, [side]: 0 };
    const next: BatalhaState = {
      ...state,
      shieldUntil: { ...state.shieldUntil, [side]: endsAt },
      freezeUntil,
    };
    return emit(next, {
      type: 'power_up',
      side,
      affectedSide: side,
      effect,
      endsAt,
      blocked: false,
      at,
    });
  }

  const affectedSide = otherSide(side);
  if (state.shieldUntil[affectedSide] > at) {
    const next: BatalhaState = {
      ...state,
      shieldUntil: { ...state.shieldUntil, [affectedSide]: 0 },
    };
    return emit(next, {
      type: 'power_up',
      side,
      affectedSide,
      effect,
      endsAt,
      blocked: true,
      at,
    });
  }
  const next: BatalhaState = {
    ...state,
    freezeUntil: { ...state.freezeUntil, [affectedSide]: endsAt },
  };
  return emit(next, {
    type: 'power_up',
    side,
    affectedSide,
    effect,
    endsAt,
    blocked: false,
    at,
  });
}

function scoreGift(state: BatalhaState, event: Extract<BatalhaEvent, { type: 'GIFT_RECEIVED' }>, config: BatalhaReducerConfig): BatalhaState {
  const side = giftSide(config, event.giftId);
  if (!side || event.quantity <= 0 || !Number.isInteger(event.quantity)) return state;

  const at = Math.max(state.nowMs, event.nowMs);
  const streakKey = event.streak ? `${event.userId}:${event.giftId}:${event.streak.id}` : null;
  const previousStreakTotal = streakKey ? state.streakTotals[streakKey] ?? 0 : 0;
  const quantity = event.streak
    ? Math.max(0, event.streak.totalQuantity - previousStreakTotal)
    : event.quantity;
  const nextStreakTotals = streakKey
    ? { ...state.streakTotals, [streakKey]: Math.max(previousStreakTotal, event.streak!.totalQuantity) }
    : state.streakTotals;
  let next: BatalhaState = {
    ...state,
    streakTotals: nextStreakTotals,
    giftSamples: quantity > 0 ? [...state.giftSamples, { at, quantity }] : state.giftSamples,
  };
  if (quantity === 0 || (next.phase !== 'rodando' && next.phase !== 'prorrogacao')) return next;

  const candidate = side === 'A' ? config.candidateA : config.candidateB;
  const gift = candidate.gifts.find((item) => item.id === event.giftId);
  if (!gift) return next;
  const chosenPowerUpGift = config.powerUps
    && ((side === 'A' && config.powerUpGiftA === event.giftId)
      || (side === 'B' && config.powerUpGiftB === event.giftId));
  if (chosenPowerUpGift && config.powerUpEffect === 'shield') {
    next = activatePowerUp(next, side, at, config);
  }

  const frozen = next.freezeUntil[side] > at;
  if (frozen) {
    next = emit(next, { type: 'narration', message: `O placar do lado ${side} está congelado.`, at });
    return next;
  }

  const x2Active = next.doubleActive || (next.surprise?.kind === 'hour-x2' && next.surprise.endsAt > at);
  const multiplier = x2Active ? 2 : 1;
  const rainBonus = next.surprise?.kind === 'bonus-rain' && next.surprise.endsAt > at
    ? quantity * BONUS_RAIN_POINTS_PER_GIFT
    : 0;
  const points = gift.votes * quantity * multiplier + rainBonus;
  next = applyPoints(next, side, points, at, config);
  next = updateSupporters(next, side, event.userId, event.displayName, points, quantity);

  const existingCombo = next.combos[event.userId];
  const comboCount = existingCombo && at - existingCombo.lastGiftAt <= COMBO_WINDOW_MS
    ? existingCombo.count + quantity
    : quantity;
  next = {
    ...next,
    combos: {
      ...next.combos,
      [event.userId]: { count: comboCount, lastGiftAt: at, side, displayName: event.displayName },
    },
  };
  next = emit(next, {
    type: 'combo',
    userId: event.userId,
    displayName: event.displayName,
    count: comboCount,
    side,
    at,
  });
  next = emit(next, {
    type: 'animation',
    level: getAnimationLevel(points, config),
    side,
    giftId: event.giftId,
    points,
    quantity,
    donorName: event.displayName,
    at,
  });
  if (chosenPowerUpGift && config.powerUpEffect === 'freeze') {
    next = activatePowerUp(next, side, at, config);
  }
  return next;
}

function scoreLikes(state: BatalhaState, event: Extract<BatalhaEvent, { type: 'LIKE_RECEIVED' }>, config: BatalhaReducerConfig): BatalhaState {
  if (!config.likesEnergy || event.likes <= 0 || !Number.isInteger(event.likes)) return state;
  if (state.phase !== 'rodando' && state.phase !== 'prorrogacao') return state;
  const at = Math.max(state.nowMs, event.nowMs);
  if (state.freezeUntil[event.side] > at) return state;

  const current = state.energy[event.side];
  const rawProgress = current.progress + event.likes;
  const completedBars = Math.floor(rawProgress / config.energyBonusThreshold);
  const progress = rawProgress % config.energyBonusThreshold;
  const possibleBonus = completedBars * config.energyBonusPoints;
  const remainingCap = Math.max(0, config.energyBonusCap - current.bonusEarned);
  const bonus = Math.min(possibleBonus, remainingCap);
  let next: BatalhaState = {
    ...state,
    energy: {
      ...state.energy,
      [event.side]: {
        progress,
        bonusEarned: current.bonusEarned + bonus,
      },
    },
  };
  if (bonus > 0) {
    next = applyPoints(next, event.side, bonus, at, config);
    next = emit(next, {
      type: 'energy_bonus',
      side: event.side,
      points: bonus,
      totalEarned: next.energy[event.side].bonusEarned,
      at,
    });
  }
  return next;
}

function scoreChatVote(state: BatalhaState, event: Extract<BatalhaEvent, { type: 'CHAT_VOTE' }>, config: BatalhaReducerConfig): BatalhaState {
  if (!config.chatCommands || (state.phase !== 'rodando' && state.phase !== 'prorrogacao')) return state;
  const at = Math.max(state.nowMs, event.nowMs);
  const lastVote = state.lastVoteAt[event.userId];
  if (lastVote !== undefined && at - lastVote < CHAT_VOTE_COOLDOWN_MS) return state;
  if (state.freezeUntil[event.side] > at) return state;
  let next: BatalhaState = {
    ...state,
    lastVoteAt: { ...state.lastVoteAt, [event.userId]: at },
  };
  next = applyPoints(next, event.side, CHAT_VOTE_POINTS, at, config);
  return emit(next, { type: 'narration', message: `Torcida recebida para o lado ${event.side}!`, at });
}

function startSurprise(state: BatalhaState, event: Extract<BatalhaEvent, { type: 'START_SURPRISE' }>, config: BatalhaReducerConfig): BatalhaState {
  if (
    !config.surpriseEvents
    || (state.phase !== 'rodando' && state.phase !== 'prorrogacao')
    || state.surprise
  ) return state;
  const at = Math.max(state.nowMs, event.nowMs);
  const endsAt = at + SURPRISE_EVENT_MS;
  const next: BatalhaState = { ...state, surprise: { kind: event.kind, endsAt } };
  return emit(next, { type: 'bonus_event', kind: event.kind, active: true, endsAt, at });
}

export function reducer(state: BatalhaState, event: BatalhaEvent, config: BatalhaReducerConfig): BatalhaState {
  if (event.type === 'CLOCK_TICK') {
    return advanceClock(state, event.nowMs, config, event.viewers ?? state.latestViewers);
  }

  if (event.type === 'START_MATCH') {
    if (state.phase !== 'aguardando') return state;
    const at = Math.max(state.nowMs, event.nowMs);
    let next: BatalhaState = {
      ...state,
      phase: 'contagem-inicial',
      phaseEndsAt: at + INITIAL_COUNTDOWN_MS,
      nowMs: at,
      effects: [],
    };
    next = emit(next, { type: 'round_state', phase: 'contagem-inicial', round: next.roundNumber, at });
    return next;
  }

  const prepared = prepareEvent(state, event.eventId, event.nowMs, config);
  if (!prepared) return state;
  let next = prepared;
  if (event.type === 'GIFT_RECEIVED') {
    next = scoreGift(next, event, config);
  } else if (event.type === 'LIKE_RECEIVED') {
    next = scoreLikes(next, event, config);
  } else if (event.type === 'CHAT_VOTE') {
    next = scoreChatVote(next, event, config);
  } else {
    next = startSurprise(next, event, config);
  }
  return next;
}
