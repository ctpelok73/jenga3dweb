// ─── Score Tracker: localStorage-based persistence ───
// Tracks best scores, total games, and recent history for retention.
// Storage skeleton is provided by `createPersistedStore`.

import { createPersistedStore } from './storage/createPersistedStore';

const store = createPersistedStore({
  key: 'jenga3d_scores',
  version: 1,
  defaults: () => ({ bestTurns: 0, totalGames: 0, history: [] }),
});

export function getBestScore() {
  return store.load().bestTurns;
}

export function getTotalGames() {
  return store.load().totalGames;
}

export function getRecentHistory(limit = 5) {
  return store.load().history.slice(0, limit);
}

export function recordGame(turns, collapsed) {
  return store.update((data) => {
    data.totalGames += 1;
    if (turns > data.bestTurns) data.bestTurns = turns;
    data.history.unshift({
      turns,
      collapsed,
      date: new Date().toISOString().slice(0, 10),
    });
    if (data.history.length > 20) data.history = data.history.slice(0, 20);
    return data;
  });
}

export function resetAllScores() {
  store.reset();
}
