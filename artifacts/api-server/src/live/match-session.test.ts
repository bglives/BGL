import { describe, expect, it } from 'vitest';
import type { BatalhaReducerConfig } from '@workspace/game-engine';
import { MatchSession } from './match-session';
import { SimulationProvider } from './simulation-provider';

const mockConfig: BatalhaReducerConfig = {
  candidateA: {
    gifts: [
      { id: 'gift-rose', votes: 1 },
      { id: 'gift-ice-cream', votes: 5 },
    ],
  },
  candidateB: {
    gifts: [
      { id: 'gift-heart', votes: 1 },
      { id: 'gift-donut', votes: 5 },
    ],
  },
  mode: 'single',
  roundMinutes: '5',
  intermissionSeconds: 20,
  tieRule: 'draw',
  doubleLastMinute: false,
  leadChangeOvertime: false,
  overtimeSeconds: 20,
  maxOvertimes: 2,
  likesEnergy: false,
  energyBonusThreshold: 100,
  energyBonusPoints: 5,
  energyBonusCap: 20,
  chatCommands: true,
  collectiveGoals: [],
  surpriseEvents: false,
  powerUps: false,
  powerUpEffect: 'shield',
  smallThreshold: 1,
  mediumThreshold: 10,
  epicThreshold: 50,
};

describe('MatchSession and SimulationProvider', () => {
  it('connects simulation provider and correctly processes gifts and chat votes', async () => {
    const session = new MatchSession({
      id: 'test-match-1',
      config: mockConfig,
      isSimulation: true,
    });

    const eventsReceived: any[] = [];
    const unsubscribe = session.subscribe((payload) => {
      eventsReceived.push(payload);
    });

    await session.start();

    // After start, phase is contagem-inicial (3s countdown)
    expect(session.getState().phase).toBe('contagem-inicial');

    // Advance clock past initial 3s countdown to 'rodando'
    session.dispatch({
      type: 'CLOCK_TICK',
      nowMs: Date.now() + 4_000,
    });
    expect(session.getState().phase).toBe('rodando');

    const provider = session.getProvider() as SimulationProvider;
    expect(provider).toBeInstanceOf(SimulationProvider);

    // Simulate sending gift-rose for Candidate A (qty: 3, votes: 3)
    provider.simulateGift({
      giftId: 'gift-rose',
      quantity: 3,
      user: { nickname: 'Fã do A', id: 'user-a' },
    });

    expect(session.getState().scoreA).toBe(3);
    expect(session.getState().scoreB).toBe(0);

    // Simulate sending gift-donut for Candidate B (qty: 2, votes: 5 each = 10 votes)
    provider.simulateGift({
      giftId: 'gift-donut',
      quantity: 2,
      user: { nickname: 'Fã do B', id: 'user-b' },
    });

    expect(session.getState().scoreA).toBe(3);
    expect(session.getState().scoreB).toBe(10);

    // Simulate chat command !a for Candidate A (+1 vote)
    provider.simulateChat('!a Vamos vencer!', { id: 'chat-user-1' });
    expect(session.getState().scoreA).toBe(4);

    await session.stop();
    unsubscribe();
  });

  it('supports custom candidate voting numbers (e.g., 13 and 22)', async () => {
    const customConfig = {
      ...mockConfig,
      candidateA: {
        ...mockConfig.candidateA,
        number: '13',
      },
      candidateB: {
        ...mockConfig.candidateB,
        number: '22',
      },
    };

    const session = new MatchSession({
      id: 'test-custom-numbers',
      config: customConfig,
      isSimulation: true,
    });

    await session.start();
    session.dispatch({
      type: 'CLOCK_TICK',
      nowMs: Date.now() + 4_000,
    });
    expect(session.getState().phase).toBe('rodando');

    const provider = (session as any).provider as SimulationProvider;

    // Vote with number 13
    provider.simulateChat('13', { id: 'voter-1' });
    expect(session.getState().scoreA).toBe(1);

    // Vote with !22
    provider.simulateChat('!22 lula nao', { id: 'voter-2' });
    expect(session.getState().scoreB).toBe(1);

    // Vote with letter A still works
    provider.simulateChat('a', { id: 'voter-3' });
    expect(session.getState().scoreA).toBe(2);

    // Vote with letter B still works
    provider.simulateChat('b', { id: 'voter-4' });
    expect(session.getState().scoreB).toBe(2);

    await session.stop();
  });
});
