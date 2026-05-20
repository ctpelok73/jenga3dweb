// ─── Score Tracker: localStorage-based persistence ───
// Tracks best scores, total games, and recent history for retention

const STORAGE_KEY = 'jenga3d_scores';

function loadScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { bestTurns: 0, totalGames: 0, history: [] };
    return JSON.parse(raw);
  } catch {
    return { bestTurns: 0, totalGames: 0, history: [] };
  }
}

function saveScores(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

export function getBestScore() {
  return loadScores().bestTurns;
}

export function getTotalGames() {
  return loadScores().totalGames;
}

export function getRecentHistory(limit = 5) {
  return loadScores().history.slice(0, limit);
}

export function recordGame(turns, collapsed) {
  const data = loadScores();
  data.totalGames += 1;
  if (!collapsed && turns > data.bestTurns) {
    data.bestTurns = turns;
  }
  data.history.unshift({
    turns,
    collapsed,
    date: new Date().toISOString().slice(0, 10),
  });
  // Keep only last 20 entries
  if (data.history.length > 20) data.history = data.history.slice(0, 20);
  saveScores(data);
  return data;
}

export function resetAllScores() {
  localStorage.removeItem(STORAGE_KEY);
}