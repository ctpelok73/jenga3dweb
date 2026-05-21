/**
 * dailyChallengeTracker.js — Daily Challenge system for Jenga 3D
 * 
 * Features:
 * - Deterministic daily seed from date → same tower for all players today
 * - Daily challenge definitions (varying goals per day)
 * - Local leaderboard (top 10 per day)
 * - Challenge completion tracking
 */

const DAILY_KEY = 'jenga3d_daily';
const LEADERBOARD_KEY = 'jenga3d_daily_leaderboard';

// ─── Deterministic seed from date ───
// Simple hash: convert YYYY-MM-DD to a numeric seed
function dateToSeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getTodayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getDailySeed() {
  return dateToSeed(getTodayDateStr());
}

// ─── Seeded random number generator (for deterministic tower variation) ───
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

// ─── Challenge definitions ───
// Each day has a different challenge type, cycling through these
const CHALLENGE_TYPES = [
  { id: 'survive_10', title: '🛡️ Стойкость', description: 'Собери 10 ходов без падения', targetMoves: 10, mustSurvive: true },
  { id: 'survive_15', title: '💪 Выдержка', description: 'Собери 15 ходов без падения', targetMoves: 15, mustSurvive: true },
  { id: 'survive_20', title: '🏆 Мастер', description: 'Собери 20 ходов без падения', targetMoves: 20, mustSurvive: true },
  { id: 'reach_layer_12', title: '🏗️ Строитель', description: 'Достигни 12 слоёв', targetHeight: 12 },
  { id: 'reach_layer_15', title: '🌆 Высота', description: 'Достигни 15 слоёв', targetHeight: 15 },
  { id: 'speed_5', title: '⚡ Скорость', description: '5 ходов за 60 секунд', targetMoves: 5, maxTimeMs: 60000 },
  { id: 'speed_8', title: '🔥 Быстрый', description: '8 ходов за 90 секунд', targetMoves: 8, maxTimeMs: 90000 },
  { id: 'survive_5', title: '🌱 Новичок', description: 'Собери 5 ходов без падения', targetMoves: 5, mustSurvive: true },
  { id: 'reach_layer_10', title: '🧱 Архитектор', description: 'Достигни 10 слоёв', targetHeight: 10 },
  { id: 'survive_25', title: '👑 Грандмастер', description: 'Собери 25 ходов без падения', targetMoves: 25, mustSurvive: true },
];

export function getDailyChallenge() {
  const seed = getDailySeed();
  const index = seed % CHALLENGE_TYPES.length;
  const challenge = CHALLENGE_TYPES[index];
  return {
    ...challenge,
    seed,
    date: getTodayDateStr(),
  };
}

// ─── Generate deterministic tower from seed ───
// Uses seeded random to vary block colors slightly, creating a unique visual pattern per day
export function generateDailyTower(getThemeColors, BLOCK_H, LAYER_GAP, BLOCKS_PER_LAYER, STEP) {
  const seed = getDailySeed();
  const rng = seededRandom(seed);
  const colors = getThemeColors();
  const blocks = [];
  let id = 0;
  const TOWER_LAYERS = 18;

  for (let layer = 0; layer < TOWER_LAYERS; layer++) {
    const y = layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    const isOdd = layer % 2 === 1;
    const rot = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];
    for (let b = 0; b < BLOCKS_PER_LAYER; b++) {
      const offset = -STEP + b * STEP;
      // Deterministic color selection using seeded RNG
      const colorIndex = Math.floor(rng() * colors.length);
      blocks.push({
        id,
        position: [isOdd ? offset : 0, y, isOdd ? 0 : offset],
        rotation: rot,
        color: colors[colorIndex],
        layer,
      });
      id++;
    }
  }
  return blocks;
}

// ─── Daily challenge state ───
function loadDailyState() {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveDailyState(state) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(state));
  } catch { /* quota exceeded */ }
}

// ─── Check if challenge is completed ───
export function isDailyChallengeCompleted() {
  const state = loadDailyState();
  const today = getTodayDateStr();
  return state[today]?.completed || false;
}

export function getDailyChallengeResult() {
  const state = loadDailyState();
  const today = getTodayDateStr();
  return state[today] || null;
}

// ─── Record daily challenge attempt ───
export function recordDailyChallengeAttempt(turns, towerHeight, survived, timeMs) {
  const state = loadDailyState();
  const today = getTodayDateStr();
  const challenge = getDailyChallenge();

  // Check if challenge goal is met
  let completed = false;
  if (challenge.mustSurvive && survived && turns >= challenge.targetMoves) {
    completed = true;
  } else if (challenge.targetHeight && towerHeight >= challenge.targetHeight) {
    completed = true;
  } else if (challenge.maxTimeMs && timeMs && timeMs <= challenge.maxTimeMs && turns >= challenge.targetMoves) {
    completed = true;
  }

  const existing = state[today];
  const bestTurns = existing ? Math.max(existing.bestTurns || 0, turns) : turns;

  state[today] = {
    attempts: (existing?.attempts || 0) + 1,
    bestTurns,
    completed: existing?.completed || completed,
    completedAt: completed ? new Date().toISOString() : existing?.completedAt,
  };

  saveDailyState(state);

  // If completed, add to leaderboard
  if (completed && !existing?.completed) {
    addToLeaderboard(turns, towerHeight);
  }

  return { completed, bestTurns, challenge };
}

// ─── Leaderboard ───
function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveLeaderboard(lb) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb));
  } catch { /* quota exceeded */ }
}

function addToLeaderboard(turns, towerHeight) {
  const lb = loadLeaderboard();
  const today = getTodayDateStr();

  if (!lb[today]) lb[today] = [];

  // Add entry (anonymized — just "Вы" for local)
  lb[today].push({
    name: 'Вы',
    turns,
    towerHeight,
    timestamp: new Date().toISOString(),
  });

  // Sort by turns descending, keep top 10
  lb[today].sort((a, b) => b.turns - a.turns);
  lb[today] = lb[today].slice(0, 10);

  saveLeaderboard(lb);
}

export function getDailyLeaderboard() {
  const lb = loadLeaderboard();
  const today = getTodayDateStr();
  return lb[today] || [];
}

// ─── Reset daily data (for testing) ───
export function resetDailyData() {
  localStorage.removeItem(DAILY_KEY);
  localStorage.removeItem(LEADERBOARD_KEY);
}