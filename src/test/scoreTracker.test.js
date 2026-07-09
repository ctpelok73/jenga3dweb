import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../storage/createPersistedStore';

// Mock store internals so we can control data flow for branch coverage
let mockData = { bestTurns: 0, totalGames: 0, history: [] };
let mockResetCalls = 0;

vi.mock('../storage/createPersistedStore', () => ({
  createPersistedStore: vi.fn(() => ({
    load: () => ({ ...mockData }),
    save: vi.fn(),
    update: (fn) => {
      const result = fn({ ...mockData });
      mockData = { ...result };
      return result;
    },
    reset: () => {
      mockResetCalls += 1;
      mockData = { bestTurns: 0, totalGames: 0, history: [] };
    },
  })),
}));

// Import AFTER vi.mock (hoisted)
let scoreTracker;
async function importModule() {
  scoreTracker = await import('../scoreTracker');
}

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.resetModules();
  mockData = { bestTurns: 0, totalGames: 0, history: [] };
  mockResetCalls = 0;
  await importModule();
});

// ─── getBestScore ─────────────────────────────────────────────────────────

describe('getBestScore', () => {
  it('returns 0 when no games played', () => {
    expect(scoreTracker.getBestScore()).toBe(0);
  });

  it('returns the best turns count', () => {
    mockData.bestTurns = 15;
    expect(scoreTracker.getBestScore()).toBe(15);
  });
});

// ─── getTotalGames ────────────────────────────────────────────────────────

describe('getTotalGames', () => {
  it('returns 0 when no games played', () => {
    expect(scoreTracker.getTotalGames()).toBe(0);
  });

  it('returns total game count', () => {
    mockData.totalGames = 42;
    expect(scoreTracker.getTotalGames()).toBe(42);
  });
});

// ─── getRecentHistory ─────────────────────────────────────────────────────

describe('getRecentHistory', () => {
  it('returns empty array when no history', () => {
    expect(scoreTracker.getRecentHistory()).toEqual([]);
  });

  it('returns up to 5 entries by default when limit not provided — branch: default param', () => {
    // History is stored most-recent-first (recordGame uses unshift)
    mockData.history = [
      { turns: 9, collapsed: false, date: '2025-01-06' },
      { turns: 15, collapsed: true, date: '2025-01-05' },
      { turns: 6, collapsed: false, date: '2025-01-04' },
      { turns: 12, collapsed: true, date: '2025-01-03' },
      { turns: 8, collapsed: false, date: '2025-01-02' },
      { turns: 10, collapsed: true, date: '2025-01-01' }, // 6th entry — excluded by default limit
    ];
    const result = scoreTracker.getRecentHistory();
    expect(result).toHaveLength(5);
    expect(result[0].turns).toBe(9); // most recent first
  });

  it('respects explicit limit argument — branch: custom limit', () => {
    mockData.history = [
      { turns: 10, collapsed: true, date: '2025-01-01' },
      { turns: 8, collapsed: false, date: '2025-01-02' },
      { turns: 12, collapsed: true, date: '2025-01-03' },
    ];
    expect(scoreTracker.getRecentHistory(2)).toHaveLength(2);
  });

  it('returns fewer than limit when history is short', () => {
    mockData.history = [
      { turns: 10, collapsed: true, date: '2025-01-01' },
    ];
    const result = scoreTracker.getRecentHistory(5);
    expect(result).toHaveLength(1);
  });
});

// ─── recordGame ───────────────────────────────────────────────────────────

describe('recordGame', () => {
  it('increments totalGames on first game', () => {
    scoreTracker.recordGame(10, false);
    expect(scoreTracker.getTotalGames()).toBe(1);
  });

  it('increments totalGames on subsequent games', () => {
    scoreTracker.recordGame(5, false);
    scoreTracker.recordGame(8, true);
    expect(scoreTracker.getTotalGames()).toBe(2);
  });

  it('updates bestTurns when current turns exceed previous best — branch: turns > bestTurns (true)', () => {
    mockData.bestTurns = 5;
    scoreTracker.recordGame(10, false);
    expect(scoreTracker.getBestScore()).toBe(10);
  });

  it('does NOT update bestTurns when current turns are not a record — branch: turns > bestTurns (false)', () => {
    mockData.bestTurns = 10;
    scoreTracker.recordGame(5, false);
    expect(scoreTracker.getBestScore()).toBe(10); // unchanged
  });

  it('records collapsed=true in history', () => {
    const saved = scoreTracker.recordGame(7, true);
    // saved is the updated data from update()
    expect(saved.history[0].collapsed).toBe(true);
  });

  it('records collapsed=false in history', () => {
    const saved = scoreTracker.recordGame(7, false);
    expect(saved.history[0].collapsed).toBe(false);
  });

  it('prepends new entries to history (most recent first)', () => {
    mockData.history = [
      { turns: 5, collapsed: false, date: '2025-01-01' },
    ];
    scoreTracker.recordGame(10, true);
    const history = scoreTracker.getRecentHistory();
    expect(history[0].turns).toBe(10); // most recent first
    expect(history[1].turns).toBe(5);
  });

  it('truncates history to 20 entries when exceeded — branch: history.length > 20 (true)', () => {
    // Fill history with 20 entries
    mockData.history = Array.from({ length: 20 }, (_, i) => ({
      turns: i + 1,
      collapsed: false,
      date: '2025-01-01',
    }));
    scoreTracker.recordGame(99, true);
    const history = scoreTracker.getRecentHistory(25);
    expect(history).toHaveLength(20); // truncated
    expect(history[0].turns).toBe(99); // new entry at front
  });

  it('keeps history under 20 when count is below threshold — branch: history.length > 20 (false)', () => {
    mockData.history = Array.from({ length: 5 }, (_, i) => ({
      turns: i + 1,
      collapsed: false,
      date: '2025-01-01',
    }));
    scoreTracker.recordGame(99, false);
    const history = scoreTracker.getRecentHistory(10);
    expect(history).toHaveLength(6); // 5 old + 1 new
    expect(history[0].turns).toBe(99);
  });

  it('returns the updated data object from update()', () => {
    const result = scoreTracker.recordGame(8, true);
    expect(result).toHaveProperty('totalGames', 1);
    expect(result).toHaveProperty('bestTurns', 8);
    expect(result.history).toHaveLength(1);
  });

  it('records the date as YYYY-MM-DD', () => {
    const result = scoreTracker.recordGame(5, false);
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    expect(result.history[0].date).toMatch(datePattern);
  });
});

// ─── resetAllScores ───────────────────────────────────────────────────────

describe('resetAllScores', () => {
  it('resets bestTurns to 0', () => {
    mockData.bestTurns = 20;
    scoreTracker.resetAllScores();
    expect(scoreTracker.getBestScore()).toBe(0);
  });

  it('resets totalGames to 0', () => {
    mockData.totalGames = 100;
    scoreTracker.resetAllScores();
    expect(scoreTracker.getTotalGames()).toBe(0);
  });

  it('clears history', () => {
    mockData.history = [{ turns: 10, collapsed: false, date: '2025-01-01' }];
    scoreTracker.resetAllScores();
    expect(scoreTracker.getRecentHistory()).toEqual([]);
  });

  it('can be called multiple times', () => {
    scoreTracker.resetAllScores();
    scoreTracker.resetAllScores();
    scoreTracker.resetAllScores();
    expect(scoreTracker.getBestScore()).toBe(0);
  });
});

// ─── Integration ──────────────────────────────────────────────────────────

describe('integration', () => {
  it('full lifecycle: record games, check state, reset', () => {
    // First game
    const r1 = scoreTracker.recordGame(12, true);
    expect(r1.totalGames).toBe(1);
    expect(r1.bestTurns).toBe(12);

    // Second game — new record
    const r2 = scoreTracker.recordGame(18, false);
    expect(r2.totalGames).toBe(2);
    expect(r2.bestTurns).toBe(18);

    // Third game — no record
    const r3 = scoreTracker.recordGame(10, true);
    expect(r3.totalGames).toBe(3);
    expect(r3.bestTurns).toBe(18); // unchanged

    // Reset
    scoreTracker.resetAllScores();
    expect(scoreTracker.getBestScore()).toBe(0);
    expect(scoreTracker.getTotalGames()).toBe(0);
  });

  it('state persists through repeated calls (since mock store uses shared mockData)', () => {
    scoreTracker.recordGame(15, false);
    scoreTracker.recordGame(20, true);
    scoreTracker.recordGame(10, false);

    expect(scoreTracker.getTotalGames()).toBe(3);
    expect(scoreTracker.getBestScore()).toBe(20);
    expect(scoreTracker.getRecentHistory()).toHaveLength(3);
  });
});
