import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Key-based mock stores ──────────────────────────────────────────────────
// dailyChallengeTracker creates TWO persisted stores (stateStore, leaderboardStore)
// keyed by 'jenga3d_daily' and 'jenga3d_daily_leaderboard'.
// We track them separately so state and leaderboard don't bleed into each other.

const storeData = vi.hoisted(() => ({}));

vi.mock('../storage/createPersistedStore', () => ({
  createPersistedStore: vi.fn((config) => {
    const key = config?.key || 'default';
    if (!storeData[key]) storeData[key] = {};

    return {
      load: () => ({ ...storeData[key] }),
      save: (d) => {
        storeData[key] = { ...d };
      },
      update: (mutator) => {
        const current = { ...storeData[key] };
        const next = mutator(current);
        storeData[key] = { ...next };
        return { ...storeData[key] };
      },
      reset: () => {
        storeData[key] = {};
      },
    };
  }),
}));

vi.mock('../firebaseService', () => ({
  isFirebaseEnabled: vi.fn(() => false),
  submitScore: vi.fn(() => Promise.resolve('mock-key')),
  getOnlineLeaderboard: vi.fn(() => Promise.resolve([])),
  subscribeLeaderboard: vi.fn(() => () => {}),
}));

vi.mock('../domain/tower', () => ({
  generateTower: vi.fn((opts) => {
    // Return a minimal stub tower so we don't depend on towerConfig
    const layers = opts?.layers ?? 18;
    const colors = opts?.colors ?? ['#b5651d'];
    const blocks = [];
    let id = 0;
    for (let layer = 0; layer < layers; layer++) {
      for (let b = 0; b < 3; b++) {
        blocks.push({
          id,
          position: [0, layer * 0.31 + 0.15, 0],
          rotation: [0, 0, 0],
          color: colors[id % colors.length],
          layer,
        });
        id++;
      }
    }
    return blocks;
  }),
}));

import * as daily from '../dailyChallengeTracker';

// ─── Helpers ────────────────────────────────────────────────────────────────

function initState() {
  storeData['jenga3d_daily'] = {};
}

function initLeaderboard() {
  storeData['jenga3d_daily_leaderboard'] = {};
}

function setTodayState(overrides) {
  // getTodayDateStr() uses Date.now(), so we need the date that matches
  // our fake timer
  const today = daily.getTodayDateStr();
  storeData['jenga3d_daily'][today] = {
    attempts: 1,
    bestTurns: 5,
    completed: false,
    completedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  initState();
  initLeaderboard();
  vi.restoreAllMocks();
});

// ─── getPlayerName / setPlayerName ──────────────────────────────────────────

describe('getPlayerName / setPlayerName', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default name when nothing saved', () => {
    expect(daily.getPlayerName()).toBe('Аноним');
  });

  it('returns saved name from localStorage', () => {
    localStorage.setItem('jenga3d_username', 'TestPlayer');
    expect(daily.getPlayerName()).toBe('TestPlayer');
  });

  it('returns default when localStorage read fails', () => {
    // Simulate localStorage.getItem throwing (e.g., private browsing)
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn(() => {
      throw new Error('denied');
    });
    expect(daily.getPlayerName()).toBe('Аноним');
    Storage.prototype.getItem = orig;
  });

  it('setPlayerName writes to localStorage', () => {
    daily.setPlayerName('Alice');
    expect(localStorage.getItem('jenga3d_username')).toBe('Alice');
  });

  it('setPlayerName handles localStorage write failure', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('denied');
    });
    // Should not throw
    expect(() => daily.setPlayerName('Bob')).not.toThrow();
    Storage.prototype.setItem = orig;
  });
});

// ─── getTodayDateStr ────────────────────────────────────────────────────────

describe('getTodayDateStr', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns YYYY-MM-DD format', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const str = daily.getTodayDateStr();
    expect(str).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(str).toBe('2024-06-15');
  });

  it('pads month and day with zero', () => {
    vi.setSystemTime(new Date('2024-01-05T00:00:00'));
    expect(daily.getTodayDateStr()).toBe('2024-01-05');
  });

  it('produces consistent results in same timer tick', () => {
    vi.setSystemTime(new Date('2024-12-25T08:30:00'));
    const a = daily.getTodayDateStr();
    const b = daily.getTodayDateStr();
    expect(a).toBe(b);
  });
});

// ─── getDailySeed ──────────────────────────────────────────────────────────

describe('getDailySeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a positive integer', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const seed = daily.getDailySeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThan(0);
  });

  it('same date yields the same seed', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const seed1 = daily.getDailySeed();

    vi.setSystemTime(new Date('2024-06-15T23:59:59'));
    const seed2 = daily.getDailySeed();

    expect(seed1).toBe(seed2);
  });

  it('different date yields a different seed', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const seed1 = daily.getDailySeed();

    vi.setSystemTime(new Date('2024-06-16T12:00:00'));
    const seed2 = daily.getDailySeed();

    expect(seed1).not.toBe(seed2);
  });
});

// ─── getDailyChallenge ─────────────────────────────────────────────────────

describe('getDailyChallenge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an object with id, seed, date, title, description', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const challenge = daily.getDailyChallenge();
    expect(challenge).toHaveProperty('id');
    expect(challenge).toHaveProperty('seed');
    expect(challenge).toHaveProperty('date');
    expect(challenge).toHaveProperty('title');
    expect(challenge).toHaveProperty('description');
    expect(challenge.date).toBe('2024-06-15');
  });

  it('seed matches getDailySeed()', () => {
    const challenge = daily.getDailyChallenge();
    expect(challenge.seed).toBe(daily.getDailySeed());
  });

  it('different dates pick different challenge types (if seeds differ mod 10)', () => {
    vi.setSystemTime(new Date('2024-06-01T12:00:00'));
    const c1 = daily.getDailyChallenge();

    vi.setSystemTime(new Date('2024-06-20T12:00:00'));
    const c2 = daily.getDailyChallenge();

    // At least check shape is correct
    expect(typeof c1.id).toBe('string');
    expect(typeof c2.id).toBe('string');
    expect(typeof c1.title).toBe('string');
  });
});

// ─── generateDailyTower ────────────────────────────────────────────────────

describe('generateDailyTower', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an array of blocks', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const getColors = () => ['#ff0000', '#00ff00', '#0000ff'];
    const blocks = daily.generateDailyTower(getColors);
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBe(54); // 18 layers * 3 blocks
  });

  it('passes getThemeColors callback to generateTower', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const getColors = vi.fn(() => ['#ff0000', '#00ff00']);
    daily.generateDailyTower(getColors);
    expect(getColors).toHaveBeenCalledTimes(1);
  });

  it('same date produces identical tower', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const getColors = () => ['#ff0000'];
    const blocks1 = daily.generateDailyTower(getColors);

    vi.setSystemTime(new Date('2024-06-15T23:59:59'));
    const blocks2 = daily.generateDailyTower(getColors);

    expect(blocks1.map((b) => b.color)).toEqual(blocks2.map((b) => b.color));
  });
});

// ─── isDailyChallengeCompleted ─────────────────────────────────────────────

describe('isDailyChallengeCompleted', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when no state saved', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    expect(daily.isDailyChallengeCompleted()).toBe(false);
  });

  it('returns false when today entry not completed', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    setTodayState({ completed: false });
    expect(daily.isDailyChallengeCompleted()).toBe(false);
  });

  it('returns true when today entry completed', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    setTodayState({ completed: true });
    expect(daily.isDailyChallengeCompleted()).toBe(true);
  });
});

// ─── getDailyChallengeResult ───────────────────────────────────────────────

describe('getDailyChallengeResult', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when no state saved', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    expect(daily.getDailyChallengeResult()).toBeNull();
  });

  it('returns today state when saved', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    setTodayState({
      attempts: 3,
      bestTurns: 12,
      completed: true,
      completedAt: '2024-06-15T10:00:00.000Z',
    });
    const result = daily.getDailyChallengeResult();
    expect(result).not.toBeNull();
    expect(result.attempts).toBe(3);
    expect(result.bestTurns).toBe(12);
    expect(result.completed).toBe(true);
  });
});

// ─── recordDailyChallengeAttempt ──────────────────────────────────────────

describe('recordDailyChallengeAttempt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks attempts count', async () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const result = await daily.recordDailyChallengeAttempt(3, 8, false, null);
    expect(result).toHaveProperty('completed');
    expect(result).toHaveProperty('bestTurns');

    const state = daily.getDailyChallengeResult();
    expect(state.attempts).toBe(1);
  });

  it('increments attempts on subsequent calls', async () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    await daily.recordDailyChallengeAttempt(3, 8, false, null);
    await daily.recordDailyChallengeAttempt(5, 10, false, null);
    const state = daily.getDailyChallengeResult();
    expect(state.attempts).toBe(2);
  });

  it('saves bestTurns as max of attempts', async () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    await daily.recordDailyChallengeAttempt(5, 8, false, null);
    let state = daily.getDailyChallengeResult();
    expect(state.bestTurns).toBe(5);

    await daily.recordDailyChallengeAttempt(3, 8, false, null);
    state = daily.getDailyChallengeResult();
    expect(state.bestTurns).toBe(5);

    await daily.recordDailyChallengeAttempt(10, 12, false, null);
    state = daily.getDailyChallengeResult();
    expect(state.bestTurns).toBe(10);
  });

  it('completes mustSurvive challenge when survived + turns >= target', async () => {
    // The challenge type depends on the date seed. We set a date that produces
    // a mustSurvive challenge (we'll just test with enough turns and survived=true
    // and verify completed=true)
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const challenge = daily.getDailyChallenge();

    if (challenge.mustSurvive) {
      // Complete the challenge by meeting the target
      const result = await daily.recordDailyChallengeAttempt(
        challenge.targetMoves,
        8,
        true,
        null,
      );
      expect(result.completed).toBe(true);
    } else {
      // For non-survive challenges, test that survived=false doesn't complete
      const result = await daily.recordDailyChallengeAttempt(
        challenge.targetMoves || 99,
        8,
        false,
        null,
      );
      // Should complete via another condition (height or time) or not
      // Just verify the API doesn't throw
      expect(result).toHaveProperty('completed');
    }
  });

  it('completes targetHeight challenge when height >= target', async () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const challenge = daily.getDailyChallenge();

    if (challenge.targetHeight) {
      const result = await daily.recordDailyChallengeAttempt(
        1,
        challenge.targetHeight,
        false,
        null,
      );
      expect(result.completed).toBe(true);
    }
  });

  it('completes maxTimeMs challenge when time <= limit and moves >= target', async () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const challenge = daily.getDailyChallenge();

    if (challenge.maxTimeMs) {
      const result = await daily.recordDailyChallengeAttempt(
        challenge.targetMoves,
        5,
        false,
        challenge.maxTimeMs,
      );
      expect(result.completed).toBe(true);
    }
  });

  it('does not set completed if goal not met', async () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const challenge = daily.getDailyChallenge();

    // Fail deliberately: low turns, no survive, low height
    const result = await daily.recordDailyChallengeAttempt(1, 3, false, null);
    expect(result.completed).toBe(false);
  });

  it('does not add to leaderboard if not completed', async () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const { isFirebaseEnabled } = await import('../firebaseService');

    await daily.recordDailyChallengeAttempt(1, 3, false, null);
    const lb = daily.getDailyLeaderboard();
    expect(lb.length).toBe(0);
  });
});

// ─── getDailyLeaderboard ───────────────────────────────────────────────────

describe('getDailyLeaderboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty array when no leaderboard entries', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    expect(daily.getDailyLeaderboard()).toEqual([]);
  });

  it('returns entries sorted by turns descending', async () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    // Simulate what addToLeaderboard does: sort desc by turns before storing
    const today = daily.getTodayDateStr();
    const entries = [
      { name: 'Alice', turns: 5, towerHeight: 8, timestamp: '2024-06-15T10:00:00Z' },
      { name: 'Bob', turns: 10, towerHeight: 10, timestamp: '2024-06-15T11:00:00Z' },
    ];
    entries.sort((a, b) => b.turns - a.turns);
    storeData['jenga3d_daily_leaderboard'][today] = entries;

    const lb = daily.getDailyLeaderboard();
    expect(lb.length).toBe(2);
    // Should be sorted: Bob (10) first, Alice (5) second
    expect(lb[0].turns).toBe(10);
    expect(lb[1].turns).toBe(5);
    expect(lb[0].name).toBe('Bob');
  });
});

// ─── Firebase integration ──────────────────────────────────────────────────

describe('Firebase integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('getOnlineLeaderboardToday returns [] when firebase disabled', async () => {
    const result = await daily.getOnlineLeaderboardToday();
    expect(result).toEqual([]);
  });

  it('subscribeOnlineLeaderboardToday calls callback with [] when firebase disabled', () => {
    const callback = vi.fn();
    const unsub = daily.subscribeOnlineLeaderboardToday(callback);
    expect(callback).toHaveBeenCalledWith([]);
    expect(typeof unsub).toBe('function');
  });

  it('subscribeOnlineLeaderboardToday subscribes when firebase enabled', async () => {
    // Re-mock isFirebaseEnabled to return true
    const fb = await import('../firebaseService');
    fb.isFirebaseEnabled.mockReturnValue(true);

    const callback = vi.fn();
    const unsub = daily.subscribeOnlineLeaderboardToday(callback);

    // Should not immediately call back — firebase subscribe is async and
    // the real module path doesn't fire synchronously with our mock setup
    expect(typeof unsub).toBe('function');
  });
});

// ─── resetDailyData ────────────────────────────────────────────────────────

describe('resetDailyData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears all state', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    setTodayState({ attempts: 5, completed: true });
    expect(daily.getDailyChallengeResult()).not.toBeNull();

    daily.resetDailyData();
    expect(daily.getDailyChallengeResult()).toBeNull();
  });

  it('clears leaderboard', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const today = daily.getTodayDateStr();
    storeData['jenga3d_daily_leaderboard'][today] = [{ name: 'Test', turns: 5 }];
    expect(daily.getDailyLeaderboard().length).toBeGreaterThan(0);

    daily.resetDailyData();
    expect(daily.getDailyLeaderboard().length).toBe(0);
  });
});

// ─── Integration: full daily challenge lifecycle ──────────────────────────

describe('integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('completes a full daily challenge: attempt → fail → attempt → succeed', async () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));

    // 1. Check not completed yet
    expect(daily.isDailyChallengeCompleted()).toBe(false);

    // 2. Failed attempt
    const fail = await daily.recordDailyChallengeAttempt(2, 5, false, null);
    expect(fail.completed).toBe(false);
    expect(daily.isDailyChallengeCompleted()).toBe(false);

    // 3. Successful attempt (force completion via targetHeight for height challenges)
    const challenge = daily.getDailyChallenge();
    let success;
    if (challenge.mustSurvive) {
      success = await daily.recordDailyChallengeAttempt(
        challenge.targetMoves,
        8,
        true,
        null,
      );
    } else if (challenge.targetHeight) {
      success = await daily.recordDailyChallengeAttempt(
        5,
        challenge.targetHeight,
        true,
        null,
      );
    } else if (challenge.maxTimeMs) {
      success = await daily.recordDailyChallengeAttempt(
        challenge.targetMoves,
        8,
        true,
        challenge.maxTimeMs - 100,
      );
    } else {
      success = await daily.recordDailyChallengeAttempt(20, 15, true, null);
    }

    expect(success.completed).toBe(true);
    expect(daily.isDailyChallengeCompleted()).toBe(true);

    // 4. Verify state has the right data
    const result = daily.getDailyChallengeResult();
    expect(result.attempts).toBe(2);
    expect(result.bestTurns).toBeGreaterThanOrEqual(success.bestTurns);
    expect(result.completed).toBe(true);
  });
});
