import { describe, expect, it } from 'vitest';
import { StreakTracker } from './streak-tracker';

describe('StreakTracker', () => {
  it('correctly calculates deltas for a progressive streak without double-counting', () => {
    const tracker = new StreakTracker();

    // Sequence: Rose 1, Rose 2, Rose 3, Rose 5, Rose 10
    const r1 = tracker.processGift({
      eventId: 'msg-1',
      userId: 'user-123',
      giftId: 'gift-rose',
      repeatCount: 1,
      isStreakEnd: false,
    });
    expect(r1.isDuplicate).toBe(false);
    expect(r1.deltaQuantity).toBe(1);

    const r2 = tracker.processGift({
      eventId: 'msg-2',
      userId: 'user-123',
      giftId: 'gift-rose',
      repeatCount: 2,
      isStreakEnd: false,
    });
    expect(r2.deltaQuantity).toBe(1);

    const r3 = tracker.processGift({
      eventId: 'msg-3',
      userId: 'user-123',
      giftId: 'gift-rose',
      repeatCount: 3,
      isStreakEnd: false,
    });
    expect(r3.deltaQuantity).toBe(1);

    const r4 = tracker.processGift({
      eventId: 'msg-4',
      userId: 'user-123',
      giftId: 'gift-rose',
      repeatCount: 5,
      isStreakEnd: false,
    });
    expect(r4.deltaQuantity).toBe(2);

    const r5 = tracker.processGift({
      eventId: 'msg-5',
      userId: 'user-123',
      giftId: 'gift-rose',
      repeatCount: 10,
      isStreakEnd: true,
    });
    expect(r5.deltaQuantity).toBe(5);

    // Sum of deltas: 1 + 1 + 1 + 2 + 5 = 10 roses total!
    const totalDeltas = [r1, r2, r3, r4, r5].reduce((sum, item) => sum + item.deltaQuantity, 0);
    expect(totalDeltas).toBe(10);
  });

  it('deduplicates messages with the same eventId', () => {
    const tracker = new StreakTracker();

    const first = tracker.processGift({
      eventId: 'msg-repeat',
      userId: 'user-abc',
      giftId: 'gift-donut',
      repeatCount: 1,
      isStreakEnd: false,
    });
    expect(first.isDuplicate).toBe(false);
    expect(first.deltaQuantity).toBe(1);

    const duplicate = tracker.processGift({
      eventId: 'msg-repeat',
      userId: 'user-abc',
      giftId: 'gift-donut',
      repeatCount: 1,
      isStreakEnd: false,
    });
    expect(duplicate.isDuplicate).toBe(true);
    expect(duplicate.deltaQuantity).toBe(0);
  });

  it('handles independent streaks from different users without collision', () => {
    const tracker = new StreakTracker();

    const u1 = tracker.processGift({
      eventId: 'm1',
      userId: 'user-1',
      giftId: 'rose',
      repeatCount: 5,
      isStreakEnd: false,
    });
    const u2 = tracker.processGift({
      eventId: 'm2',
      userId: 'user-2',
      giftId: 'rose',
      repeatCount: 5,
      isStreakEnd: false,
    });

    expect(u1.deltaQuantity).toBe(5);
    expect(u2.deltaQuantity).toBe(5);
  });
});
