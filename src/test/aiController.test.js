import { describe, it, expect } from 'vitest';
import { chooseAIBlock, computeAIDropSlot } from '../aiController';
import { BLOCK_H, LAYER_GAP, STEP, BLOCKS_PER_LAYER, TOWER_LAYERS } from '../towerConfig';

function generateTestTower() {
  const blocks = [];
  let id = 0;
  for (let layer = 0; layer < TOWER_LAYERS; layer++) {
    const y = layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    const isOdd = layer % 2 === 1;
    const rot = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];
    for (let b = 0; b < BLOCKS_PER_LAYER; b++) {
      const offset = -STEP + b * STEP;
      blocks.push({
        id,
        position: [isOdd ? offset : 0, y, isOdd ? 0 : offset],
        rotation: rot,
        color: '#b5651d',
        layer,
      });
      id++;
    }
  }
  return blocks;
}

describe('chooseAIBlock', () => {
  it('returns a valid block from below topCompleteLayer', () => {
    const blocks = generateTestTower();
    const topCompleteLayer = TOWER_LAYERS - 1;
    const result = chooseAIBlock(blocks, topCompleteLayer);
    expect(result).not.toBeNull();
    expect(result.layer).toBeLessThan(topCompleteLayer);
  });

  it('returns null when no candidates available', () => {
    const blocks = generateTestTower().filter(b => b.layer >= TOWER_LAYERS - 1);
    const result = chooseAIBlock(blocks, TOWER_LAYERS - 1);
    expect(result).toBeNull();
  });
});

describe('computeAIDropSlot', () => {
  it('returns a valid drop slot', () => {
    const blocks = generateTestTower();
    const block = blocks[0];
    const slot = computeAIDropSlot(blocks, block);
    expect(slot).not.toBeNull();
    expect(slot.position).toHaveLength(3);
    expect(slot.rotation).toHaveLength(3);
    expect(slot.slotIndex).toBeGreaterThanOrEqual(0);
    expect(slot.slotIndex).toBeLessThan(BLOCKS_PER_LAYER);
  });

  it('creates new layer when top layer is full', () => {
    const blocks = generateTestTower();
    const block = blocks[0];
    const slot = computeAIDropSlot(blocks, block);
    expect(slot.newLayer).toBe(TOWER_LAYERS);
  });
});
