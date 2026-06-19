// ─── Settings Tracker: localStorage-based persistent settings ───
// Volume, move timer, difficulty, theme. Storage skeleton lives in
// `createPersistedStore`.

import { createPersistedStore } from './storage/createPersistedStore';
import { BLOCK_H, LAYER_GAP } from './towerConfig';

const DEFAULT_SETTINGS = {
  volume: 70,
  moveTimer: 0,
  difficulty: 'normal',
  theme: 'classic',
  environment: 'classic',
};

const store = createPersistedStore({
  key: 'jenga3d_settings',
  version: 1,
  defaults: () => ({ ...DEFAULT_SETTINGS }),
});

let cachedSettings = null;

export function getSettings() {
  if (cachedSettings) {
    return cachedSettings;
  }

  cachedSettings = store.load();
  return cachedSettings;
}

export function updateSetting(key, value) {
  const result = store.update((settings) => {
    settings[key] = value;
    return settings;
  });

  cachedSettings = result;
  return result;
}

export function updateAllSettings(newSettings) {
  const result = store.update((settings) => ({ ...settings, ...newSettings }));

  cachedSettings = result;
  return result;
}

export function resetSettings() {
  cacheInvalidate();

  store.save({ ...DEFAULT_SETTINGS });
  cachedSettings = { ...DEFAULT_SETTINGS };

  return { ...DEFAULT_SETTINGS };
}

function cacheInvalidate() {
  cachedSettings = null;
}

export function getDifficultyDynamicIds(blocks, selectedBlock, removedLayer) {
  const settings = getSettings();
  const difficulty = settings.difficulty;
  const dynamicIds = new Set();

  const holeY = selectedBlock.position[1];
  const LAYER_HEIGHT = BLOCK_H + LAYER_GAP;

  for (const b of blocks) {
    if (b.id === selectedBlock.id) {
      dynamicIds.add(b.id);
      continue;
    }

    // Blocks clearly above the hole should always be dynamic
    if (b.position[1] > holeY + 0.1) {
      dynamicIds.add(b.id);
      continue;
    }

    // Siblings or blocks below depend on difficulty
    if (difficulty === 'easy') {
      // Siblings stay fixed
    } else if (difficulty === 'normal') {
      if (Math.abs(b.position[1] - holeY) < 0.1) {
        dynamicIds.add(b.id);
      }
    } else if (difficulty === 'hard') {
      if (b.position[1] > holeY - LAYER_HEIGHT - 0.1 && b.position[1] < holeY + 0.1) {
        dynamicIds.add(b.id);
      }
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
  const settings = getSettings();
  return THEME_COLORS[settings.theme] || THEME_COLORS.classic;
}
