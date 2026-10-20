export type StreakResult = {
  isDuplicate: boolean;
  deltaQuantity: number;
  streakId: string;
};

export class StreakTracker {
  private readonly processedEventIds = new Set<string>();
  private readonly eventIdQueue: string[] = [];
  private readonly maxEventHistory = 3000;

  // Key: `${userId}:${giftId}:${groupId}` -> { count: number; lastUpdated: number }
  private readonly streaks = new Map<string, { count: number; lastUpdated: number }>();
  private readonly streakExpiryMs = 60_000;

  /**
   * Evaluates a gift event and returns the delta to count, ensuring
   * repeated streak messages do not double-count gifts.
   */
  public processGift(params: {
    eventId: string;
    userId: string;
    giftId: string;
    repeatCount: number;
    groupId?: string;
    isStreakEnd: boolean;
    now?: number;
  }): StreakResult {
    const now = params.now ?? Date.now();
    const streakId = `${params.userId}:${params.giftId}:${params.groupId || '0'}`;

    // 1. Deduplication by eventId/msgId
    if (params.eventId && this.processedEventIds.has(params.eventId)) {
      return { isDuplicate: true, deltaQuantity: 0, streakId };
    }

    if (params.eventId) {
      this.processedEventIds.add(params.eventId);
      this.eventIdQueue.push(params.eventId);
      if (this.eventIdQueue.length > this.maxEventHistory) {
        const oldest = this.eventIdQueue.shift();
        if (oldest) this.processedEventIds.delete(oldest);
      }
    }

    this.cleanupOldStreaks(now);

    const repeatCount = Math.max(1, params.repeatCount || 1);
    const existing = this.streaks.get(streakId);

    let deltaQuantity: number;

    if (!existing) {
      // First event of this streak sequence
      deltaQuantity = repeatCount;
      this.streaks.set(streakId, { count: repeatCount, lastUpdated: now });
    } else {
      // Subsequent event in ongoing streak
      if (repeatCount > existing.count) {
        deltaQuantity = repeatCount - existing.count;
        this.streaks.set(streakId, { count: repeatCount, lastUpdated: now });
      } else {
        // Equal or lower count already accounted for
        deltaQuantity = 0;
      }
    }

    if (params.isStreakEnd) {
      this.streaks.delete(streakId);
    }

    return {
      isDuplicate: false,
      deltaQuantity,
      streakId,
    };
  }

  public reset(): void {
    this.processedEventIds.clear();
    this.eventIdQueue.length = 0;
    this.streaks.clear();
  }

  private cleanupOldStreaks(now: number): void {
    if (this.streaks.size < 50) return;
    for (const [key, record] of this.streaks.entries()) {
      if (now - record.lastUpdated > this.streakExpiryMs) {
        this.streaks.delete(key);
      }
    }
  }
}
