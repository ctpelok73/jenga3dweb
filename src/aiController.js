import { BLOCKS_PER_LAYER, STEP, BLOCK_H, LAYER_GAP } from './towerConfig';
import { getSettings } from './settingsTracker';

export const AI_THINK_DELAY = 800;
export const AI_MOVE_DELAY = 1200;

function isSideBlock(block) {
  const isOdd = block.layer % 2 === 1;
  const val = isOdd ? block.position[0] : block.position[2];
  const slotIndex = Math.round((val + STEP) / STEP);
  return slotIndex === 0 || slotIndex === BLOCKS_PER_LAYER - 1;
}

function isCenterBlock(block) {
  const isOdd = block.layer % 2 === 1;
  const val = isOdd ? block.position[0] : block.position[2];
  const slotIndex = Math.round((val + STEP) / STEP);
  return slotIndex === 1;
}

function countBlocksInLayer(blocks, layer) {
  return blocks.filter(b => b.layer === layer).length;
}

function scoreBlock(block, blocks, difficulty) {
  let score = 0;

  const blocksInLayer = countBlocksInLayer(blocks, block.layer);

  if (blocksInLayer === 3) {
    if (isSideBlock(block)) {
      score += 10;
    } else if (isCenterBlock(block)) {
      score += 2;
    }
  } else if (blocksInLayer === 2) {
    score -= 5;
  } else {
    score -= 20;
  }

  if (block.layer < 3) {
    score -= 3;
  }

  if (difficulty === 'easy') {
    score += (Math.random() - 0.5) * 15;
  } else if (difficulty === 'normal') {
    score += (Math.random() - 0.5) * 6;
  } else {
    score += (Math.random() - 0.5) * 2;
  }

  return score;
}

export function chooseAIBlock(blocks, topCompleteLayer) {
  const settings = getSettings();
  const difficulty = settings.difficulty;

  const candidates = blocks.filter(b => b.layer < topCompleteLayer);

  if (candidates.length === 0) return null;

  const scored = candidates.map(b => ({ block: b, score: scoreBlock(b, blocks, difficulty) }));
  scored.sort((a, b) => b.score - a.score);

  const topN = difficulty === 'easy' ? Math.min(5, scored.length)
    : difficulty === 'normal' ? Math.min(3, scored.length)
    : 1;

  const pick = scored[Math.floor(Math.random() * topN)];
  return pick.block;
}

export function computeAIDropSlot(blocks, selectedBlock) {
  const maxLayer = blocks.reduce((m, b) => Math.max(m, b.layer), 0);
  const topLayerBlocks = blocks.filter(b => b.layer === maxLayer);

  if (topLayerBlocks.length >= BLOCKS_PER_LAYER) {
    const newLayer = maxLayer + 1;
    const y = newLayer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    const isOdd = newLayer % 2 === 1;
    const rot = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];
    const s = Math.floor(Math.random() * BLOCKS_PER_LAYER);
    const offset = -STEP + s * STEP;
    return {
      slotIndex: s,
      isOdd,
      position: [isOdd ? offset : 0, y, isOdd ? 0 : offset],
      rotation: rot,
      newLayer,
    };
  } else {
    const y = maxLayer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    const isOdd = maxLayer % 2 === 1;
    const rot = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];
    const occupiedSlots = topLayerBlocks.map(b => {
      const val = isOdd ? b.position[0] : b.position[2];
      return Math.round((val + STEP) / STEP);
    });
    const freeSlots = [];
    for (let s = 0; s < BLOCKS_PER_LAYER; s++) {
      if (!occupiedSlots.includes(s)) {
        freeSlots.push(s);
      }
    }
    if (freeSlots.length === 0) return null;
    const s = freeSlots[Math.floor(Math.random() * freeSlots.length)];
    const offset = -STEP + s * STEP;
    return {
      slotIndex: s,
      isOdd,
      position: [isOdd ? offset : 0, y, isOdd ? 0 : offset],
      rotation: rot,
      newLayer: maxLayer,
    };
  }
}