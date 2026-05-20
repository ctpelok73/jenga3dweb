// ─── Settings Tracker: localStorage-based persistent settings ───
// Volume, move timer, difficulty, theme

const SETTINGS_KEY = 'jenga3d_settings';

const DEFAULT_SETTINGS = {
  volume: 70,            // 0-100
  moveTimer: 0,          // 0=off, 15, 30, 60 (seconds)
  difficulty: 'normal',  // easy, normal, hard
  theme: 'classic',      // classic, neon, marble
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* quota exceeded — ignore */ }
}

export function getSettings() {
  return loadSettings();
}

export function updateSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
  return settings;
}

export function updateAllSettings(newSettings) {
  const settings = { ...loadSettings(), ...newSettings };
  saveSettings(settings);
  return settings;
}

export function resetSettings() {
  saveSettings(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
}

// Difficulty affects how many blocks become dynamic during simulation
// easy: only blocks above removed layer + 1 layer
// normal: blocks above removed layer (current behavior)
// hard: ALL blocks above removed layer + neighboring blocks
export function getDifficultyDynamicIds(blocks, selectedBlock, removedLayer) {
  const settings = loadSettings();
  const difficulty = settings.difficulty;
  const dynamicIds = new Set();

  for (const b of blocks) {
    if (b.id === selectedBlock.id) {
      dynamicIds.add(b.id);
      continue;
    }

    if (difficulty === 'easy') {
      // Only blocks 1 layer above removed
      if (b.layer >= removedLayer + 1) dynamicIds.add(b.id);
    } else if (difficulty === 'normal') {
      // All blocks above removed layer (current behavior)
      if (b.layer >= removedLayer) dynamicIds.add(b.id);
    } else if (difficulty === 'hard') {
      // All blocks above removed + blocks in same layer as removed (neighbors)
      if (b.layer >= removedLayer) dynamicIds.add(b.id);
      // Also add blocks in layers just below for extra instability
      if (b.layer === removedLayer - 1) dynamicIds.add(b.id);
    }
  }

  return dynamicIds;
}

// Theme colors for blocks
export const THEME_COLORS = {
  classic: [
    '#b5651d', '#a0522d', '#8b4513', '#cd853f', '#deb887',
    '#d2b48c', '#c19a6b', '#b8860b', '#daa520', '#bc8f8f',
  ],
  neon: [
    '#00ff88', '#ff00ff', '#00ffff', '#ffff00', '#ff8800',
    '#88ff00', '#ff0088', '#0088ff', '#8800ff', '#ff4444',
  ],
  marble: [
    '#f0ead6', '#e8e0cc', '#d4cbb8', '#c8bda0', '#bfb494',
    '#e0d8c4', '#d0c4a8', '#c4b898', '#b8a888', '#a89878',
  ],
};

export function getThemeColors() {
  const settings = loadSettings();
  return THEME_COLORS[settings.theme] || THEME_COLORS.classic;
}