// ─── Settings Tracker: localStorage-based persistent settings ───
// Volume, move timer, difficulty, theme

const SETTINGS_KEY = 'jenga3d_settings';

const DEFAULT_SETTINGS = {
  volume: 70,            // 0-100
  moveTimer: 0,          // 0=off, 15, 30, 60 (seconds)
  difficulty: 'normal',  // easy, normal, hard
  theme: 'classic',      // classic, neon, marble — block textures
  environment: 'classic', // classic, space, beach, library — scene environment
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
// Cascading mode: initially only the removed block's layer becomes dynamic.
// Upper layers "hang" until the layer below them settles/falls, then cascade down layer-by-layer.
// easy: only removed block itself (no layer siblings) — very forgiving
// normal: blocks in the same layer as removed (siblings)
// hard: same layer + layer below (neighbors for extra instability)
export function getDifficultyDynamicIds(blocks, selectedBlock, removedLayer) {
  const settings = loadSettings();
  const difficulty = settings.difficulty;
  const dynamicIds = new Set();

  // The moved block itself is always dynamic
  dynamicIds.add(selectedBlock.id);

  for (const b of blocks) {
    if (b.id === selectedBlock.id) continue;

    if (difficulty === 'easy') {
      // Only blocks in the removed layer — minimal disruption
      if (b.layer === removedLayer) dynamicIds.add(b.id);
    } else if (difficulty === 'normal') {
      // Blocks in the removed layer (siblings) — upper layers will cascade
      if (b.layer === removedLayer) dynamicIds.add(b.id);
    } else if (difficulty === 'hard') {
      // Same layer + layer below for extra instability
      if (b.layer === removedLayer || b.layer === removedLayer - 1) dynamicIds.add(b.id);
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
  ice: [
    '#a8d8ea', '#88c8e8', '#68b8d8', '#48a8c8', '#c8e8f8',
    '#b0d0e0', '#98c0d0', '#78b0c0', '#58a0b0', '#d0f0ff',
  ],
  bamboo: [
    '#7dba4d', '#6da83d', '#5d962d', '#8dcc5d', '#9cdd6d',
    '#a8e878', '#b8f888', '#6cb048', '#5ca038', '#4c9028',
  ],
  candy: [
    '#ff6b9d', '#ff9a76', '#ffd166', '#06d6a0', '#118ab2',
    '#ef476f', '#ff85a1', '#ffc6d9', '#a8e6cf', '#dcedc1',
  ],
};

export function getThemeColors() {
  const settings = loadSettings();
  return THEME_COLORS[settings.theme] || THEME_COLORS.classic;
}