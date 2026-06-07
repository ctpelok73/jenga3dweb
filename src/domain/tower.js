// src/domain/tower.js
// Pure tower geometry. The single source of truth for layer math, slot
// positions, drop-slot computation, and tower generation. Anything that needs
// to translate between (layer, slotIndex) and 3D world coordinates lives here.
//
// Conventions:
//   - Layer Y is the *centre* of the block: layer*(BLOCK_H+LAYER_GAP) + BLOCK_H/2.
//   - Even layers extend along Z (rotation [0,0,0]); odd layers extend along X
//     (rotation [0, π/2, 0]).
//   - slotIndex is in [0, BLOCKS_PER_LAYER); offset = -STEP + slotIndex * STEP.

import {
  BLOCK_H,
  LAYER_GAP,
  STEP,
  BLOCKS_PER_LAYER,
  TOWER_LAYERS,
  WOOD_COLORS,
} from '../towerConfig';

const ODD_ROTATION = [0, Math.PI / 2, 0];
const EVEN_ROTATION = [0, 0, 0];

export function getLayerY(layer) {
  return layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
}

export function isOddLayer(layer) {
  return layer % 2 === 1;
}

export function getLayerRotation(layer) {
  return isOddLayer(layer) ? ODD_ROTATION : EVEN_ROTATION;
}

export function getSlotPosition(layer, slotIndex) {
  const y = getLayerY(layer);
  const offset = -STEP + slotIndex * STEP;
  return isOddLayer(layer) ? [offset, y, 0] : [0, y, offset];
}

export function getSlotIndexFromPosition(layer, position) {
  const val = isOddLayer(layer) ? position[0] : position[2];
  return Math.round((val + STEP) / STEP);
}

export function getMaxLayer(blocks) {
  return blocks.reduce((m, b) => Math.max(m, b.layer), 0);
}

export function getTopCompleteLayer(blocks) {
  const maxLayer = getMaxLayer(blocks);
  const inMax = blocks.filter((b) => b.layer === maxLayer).length;
  return inMax >= BLOCKS_PER_LAYER ? maxLayer : maxLayer - 1;
}

export function getOccupiedSlots(blocks, layer) {
  return blocks
    .filter((b) => b.layer === layer)
    .map((b) => getSlotIndexFromPosition(layer, b.position));
}

export function getFreeSlots(blocks, layer) {
  const occupied = new Set(getOccupiedSlots(blocks, layer));
  const free = [];
  for (let s = 0; s < BLOCKS_PER_LAYER; s++) {
    if (!occupied.has(s)) free.push(s);
  }
  return free;
}

/**
 * Compute the list of drop slots available on top of the tower for a single
 * extracted block. If the top layer is full, returns BLOCKS_PER_LAYER entries
 * for a brand-new layer. Otherwise returns one entry per free slot in the
 * current top layer.
 */
export function getDropSlots(blocks) {
  const maxLayer = getMaxLayer(blocks);
  const topLayerBlocks = blocks.filter((b) => b.layer === maxLayer);

  if (topLayerBlocks.length >= BLOCKS_PER_LAYER) {
    const newLayer = maxLayer + 1;
    const isOdd = isOddLayer(newLayer);
    const rotation = getLayerRotation(newLayer);
    const slots = [];
    for (let s = 0; s < BLOCKS_PER_LAYER; s++) {
      slots.push({
        slotIndex: s,
        isOdd,
        position: getSlotPosition(newLayer, s),
        rotation,
        newLayer,
      });
    }
    return slots;
  }

  const isOdd = isOddLayer(maxLayer);
  const rotation = getLayerRotation(maxLayer);
  return getFreeSlots(blocks, maxLayer).map((s) => ({
    slotIndex: s,
    isOdd,
    position: getSlotPosition(maxLayer, s),
    rotation,
    newLayer: maxLayer,
  }));
}

/**
 * Compute one drop slot for an AI move — random pick from `getDropSlots`.
 * Returns null only if the only slots available are on the same row the AI is
 * pulling from (which `useAIPlayer` already filters via topCompleteLayer).
 */
export function pickRandomDropSlot(blocks) {
  const slots = getDropSlots(blocks);
  if (slots.length === 0) return null;
  return slots[Math.floor(Math.random() * slots.length)];
}

/**
 * Generate a fresh tower. `colors` defaults to WOOD_COLORS but callers can
 * pass a themed palette (used by App.jsx to honour user-selected themes and by
 * dailyChallengeTracker for a deterministic seeded run).
 */
export function generateTower({ colors = WOOD_COLORS, layers = TOWER_LAYERS } = {}) {
  const blocks = [];
  let id = 0;
  for (let layer = 0; layer < layers; layer++) {
    const y = getLayerY(layer);
    const isOdd = isOddLayer(layer);
    const rotation = getLayerRotation(layer);
    for (let b = 0; b < BLOCKS_PER_LAYER; b++) {
      const offset = -STEP + b * STEP;
      blocks.push({
        id,
        position: [isOdd ? offset : 0, y, isOdd ? 0 : offset],
        rotation,
        color: colors[id % colors.length],
        layer,
      });
      id++;
    }
  }
  return blocks;
}
