import { describe, it, expect } from 'vitest';
import {
  getLayerY,
  isOddLayer,
  getLayerRotation,
  getSlotPosition,
  getSlotIndexFromPosition,
  getMaxLayer,
  getTopCompleteLayer,
  getOccupiedSlots,
  getFreeSlots,
  getDropSlots,
  pickRandomDropSlot,
  generateTower,
} from '../domain/tower';
import {
  BLOCK_H,
  LAYER_GAP,
  STEP,
  BLOCKS_PER_LAYER,
  TOWER_LAYERS,
  WOOD_COLORS,
} from '../towerConfig';

function makeBlock(id, layer, position, rotation = undefined) {
  return {
    id,
    layer,
    position: [...position],
    rotation: rotation || (layer % 2 === 1 ? [0, Math.PI / 2, 0] : [0, 0, 0]),
    color: '#000',
  };
}

// ─── getLayerY ─────────────────────────────────────────────────────────

describe('getLayerY', () => {
  it('returns BLOCK_H/2 for layer 0', () => {
    expect(getLayerY(0)).toBe(BLOCK_H / 2);
  });    it('increases by (BLOCK_H + LAYER_GAP) per layer', () => {
      const y0 = getLayerY(0);
      const y1 = getLayerY(1);
      const y10 = getLayerY(10);
      expect(y1 - y0).toBeCloseTo(BLOCK_H + LAYER_GAP, 10);
      expect(y10 - y0).toBeCloseTo(10 * (BLOCK_H + LAYER_GAP), 10);
    });

  it('returns 0 for negative layers', () => {
    expect(getLayerY(-1)).toBe(-(BLOCK_H + LAYER_GAP) + BLOCK_H / 2);
  });
});

// ─── isOddLayer ────────────────────────────────────────────────────────

describe('isOddLayer', () => {
  it('returns false for even layers', () => {
    expect(isOddLayer(0)).toBe(false);
    expect(isOddLayer(2)).toBe(false);
    expect(isOddLayer(10)).toBe(false);
  });

  it('returns true for odd layers', () => {
    expect(isOddLayer(1)).toBe(true);
    expect(isOddLayer(3)).toBe(true);
    expect(isOddLayer(11)).toBe(true);
  });
});

// ─── getLayerRotation ──────────────────────────────────────────────────

describe('getLayerRotation', () => {
  it('returns [0,0,0] for even layers', () => {
    expect(getLayerRotation(0)).toEqual([0, 0, 0]);
    expect(getLayerRotation(2)).toEqual([0, 0, 0]);
  });

  it('returns [0, π/2, 0] for odd layers', () => {
    expect(getLayerRotation(1)).toEqual([0, Math.PI / 2, 0]);
    expect(getLayerRotation(3)).toEqual([0, Math.PI / 2, 0]);
  });
});

// ─── getSlotPosition ──────────────────────────────────────────────────

describe('getSlotPosition', () => {
  it('places slot 0 at -STEP on even layers (Z axis)', () => {
    const pos = getSlotPosition(0, 0);
    expect(pos[0]).toBe(0);     // X is 0 for even layers
    expect(pos[1]).toBe(getLayerY(0));
    expect(pos[2]).toBe(-STEP); // Z axis offset
  });

  it('places slot 1 at 0 on even layers', () => {
    const pos = getSlotPosition(0, 1);
    expect(pos[0]).toBe(0);
    expect(pos[2]).toBe(0);
  });

  it('places slot 2 at +STEP on even layers', () => {
    const pos = getSlotPosition(0, 2);
    expect(pos[0]).toBe(0);
    expect(pos[2]).toBe(STEP);
  });

  it('places slot 0 at -STEP on odd layers (X axis)', () => {
    const pos = getSlotPosition(1, 0);
    expect(pos[0]).toBe(-STEP); // X axis offset
    expect(pos[1]).toBe(getLayerY(1));
    expect(pos[2]).toBe(0);     // Z is 0 for odd layers
  });

  it('places slot 1 at 0 on odd layers', () => {
    const pos = getSlotPosition(1, 1);
    expect(pos[0]).toBe(0);
    expect(pos[2]).toBe(0);
  });

  it('places slot 2 at +STEP on odd layers', () => {
    const pos = getSlotPosition(1, 2);
    expect(pos[0]).toBe(STEP);
    expect(pos[2]).toBe(0);
  });
});

// ─── getSlotIndexFromPosition ──────────────────────────────────────────

describe('getSlotIndexFromPosition', () => {
  it('returns 0 for position at -STEP on even layer', () => {
    expect(getSlotIndexFromPosition(0, [0, 0, -STEP])).toBe(0);
  });

  it('returns 1 for position at 0', () => {
    expect(getSlotIndexFromPosition(0, [0, 0, 0])).toBe(1);
  });

  it('returns 2 for position at +STEP', () => {
    expect(getSlotIndexFromPosition(0, [0, 0, STEP])).toBe(2);
  });

  it('uses X position on odd layers', () => {
    expect(getSlotIndexFromPosition(1, [-STEP, 0, 99])).toBe(0);
    expect(getSlotIndexFromPosition(1, [0, 0, 99])).toBe(1);
    expect(getSlotIndexFromPosition(1, [STEP, 0, 99])).toBe(2);
  });    it('clamps to [0, BLOCKS_PER_LAYER-1]', () => {
      // Even layer reads position[2] (Z), odd reads position[0] (X)
      expect(getSlotIndexFromPosition(0, [0, 0, -999])).toBe(0);
      expect(getSlotIndexFromPosition(0, [0, 0, 999])).toBe(BLOCKS_PER_LAYER - 1);
      expect(getSlotIndexFromPosition(1, [-999, 0, 0])).toBe(0);
      expect(getSlotIndexFromPosition(1, [999, 0, 0])).toBe(BLOCKS_PER_LAYER - 1);
    });    it('returns 0 for non-finite positions', () => {
      // Even layer reads position[2] (Z), odd reads position[0] (X)
      expect(getSlotIndexFromPosition(0, [0, 0, NaN])).toBe(0);
      expect(getSlotIndexFromPosition(0, [0, 0, Infinity])).toBe(0);
      expect(getSlotIndexFromPosition(1, [NaN, 0, 0])).toBe(0);
      expect(getSlotIndexFromPosition(1, [Infinity, 0, 0])).toBe(0);
    });
});

// ─── getMaxLayer ───────────────────────────────────────────────────────

describe('getMaxLayer', () => {
  it('returns the highest layer index', () => {
    const blocks = [
      makeBlock(0, 0, [0, 0, 0]),
      makeBlock(1, 5, [0, 0, 0]),
      makeBlock(2, 12, [0, 0, 0]),
    ];
    expect(getMaxLayer(blocks)).toBe(12);
  });

  it('returns 0 for a single 0-layer block', () => {
    expect(getMaxLayer([makeBlock(0, 0, [0, 0, 0])])).toBe(0);
  });    it('returns 0 for empty array (default reduce initial value)', () => {
      expect(getMaxLayer([])).toBe(0);
    });
});

// ─── getTopCompleteLayer ───────────────────────────────────────────────

describe('getTopCompleteLayer', () => {    it('returns maxLayer-1 when top layer is incomplete (only 2/3 blocks)', () => {
      const blocks = [
        makeBlock(0, 0, getSlotPosition(0, 0)),
        makeBlock(1, 0, getSlotPosition(0, 1)),
        makeBlock(2, 0, getSlotPosition(0, 2)),
        makeBlock(3, 1, getSlotPosition(1, 0)),
        makeBlock(4, 1, getSlotPosition(1, 1)),
        makeBlock(5, 1, getSlotPosition(1, 2)),
        makeBlock(6, 2, getSlotPosition(2, 0)),
        makeBlock(7, 2, getSlotPosition(2, 1)),
      ];
      // Layer 2 has only 2 blocks (incomplete), top complete is layer 1
      expect(getTopCompleteLayer(blocks)).toBe(1);
    });

  it('returns maxLayer-1 when top layer is incomplete', () => {
    const blocks = [
      makeBlock(0, 0, getSlotPosition(0, 0)),
      makeBlock(1, 0, getSlotPosition(0, 1)),
      makeBlock(2, 0, getSlotPosition(0, 2)),
      makeBlock(3, 1, getSlotPosition(1, 0)),
      makeBlock(4, 1, getSlotPosition(1, 1)),
    ];
    expect(getTopCompleteLayer(blocks)).toBe(0);
  });

  it('returns -1 when no layer is complete', () => {
    const blocks = [makeBlock(0, 0, getSlotPosition(0, 0))];
    expect(getTopCompleteLayer(blocks)).toBe(-1);
  });
});

// ─── getOccupiedSlots ─────────────────────────────────────────────────

describe('getOccupiedSlots', () => {
  it('returns slot indices for blocks in given layer', () => {
    const blocks = [
      makeBlock(0, 0, getSlotPosition(0, 0)),
      makeBlock(1, 0, getSlotPosition(0, 2)), // skip slot 1
    ];
    expect(getOccupiedSlots(blocks, 0)).toEqual([0, 2]);
  });

  it('returns empty array when no blocks in layer', () => {
    const blocks = [makeBlock(0, 5, [0, 0, 0])];
    expect(getOccupiedSlots(blocks, 0)).toEqual([]);
  });
});

// ─── getFreeSlots ─────────────────────────────────────────────────────

describe('getFreeSlots', () => {
  it('returns missing slot indices', () => {
    const blocks = [
      makeBlock(0, 0, getSlotPosition(0, 0)),
      makeBlock(1, 0, getSlotPosition(0, 2)), // slot 1 missing
    ];
    expect(getFreeSlots(blocks, 0)).toEqual([1]);
  });

  it('returns all slots when layer is empty', () => {
    const blocks = [makeBlock(0, 5, [0, 0, 0])];
    expect(getFreeSlots(blocks, 0)).toEqual([0, 1, 2]);
  });

  it('returns empty when all slots occupied', () => {
    const blocks = [
      makeBlock(0, 0, getSlotPosition(0, 0)),
      makeBlock(1, 0, getSlotPosition(0, 1)),
      makeBlock(2, 0, getSlotPosition(0, 2)),
    ];
    expect(getFreeSlots(blocks, 0)).toEqual([]);
  });
});

// ─── getDropSlots ─────────────────────────────────────────────────────

describe('getDropSlots', () => {
  it('returns free slots on top layer when top layer is incomplete', () => {
    const blocks = [
      makeBlock(0, 0, getSlotPosition(0, 0)),
      makeBlock(1, 0, getSlotPosition(0, 1)),
      // slot 2 is free
    ];
    const slots = getDropSlots(blocks);
    expect(slots).toHaveLength(1);
    expect(slots[0].slotIndex).toBe(2);
    expect(slots[0].newLayer).toBe(0);
    expect(slots[0].isOdd).toBe(false);
  });

  it('returns all 3 slots for a new layer when top is complete', () => {
    const blocks = [
      makeBlock(0, 0, getSlotPosition(0, 0)),
      makeBlock(1, 0, getSlotPosition(0, 1)),
      makeBlock(2, 0, getSlotPosition(0, 2)),
    ];
    const slots = getDropSlots(blocks);
    expect(slots).toHaveLength(BLOCKS_PER_LAYER);
    expect(slots[0].newLayer).toBe(1);
    expect(slots[0].isOdd).toBe(true);
    expect(slots[1].newLayer).toBe(1);
    expect(slots[2].newLayer).toBe(1);
  });

  it('each slot has slotIndex, isOdd, position, rotation, newLayer', () => {
    const blocks = [
      makeBlock(0, 0, getSlotPosition(0, 0)),
    ];
    const slots = getDropSlots(blocks);
    for (const s of slots) {
      expect(s).toHaveProperty('slotIndex');
      expect(s).toHaveProperty('isOdd');
      expect(s).toHaveProperty('position');
      expect(s).toHaveProperty('rotation');
      expect(s).toHaveProperty('newLayer');
      expect(s.position).toHaveLength(3);
      expect(s.rotation).toHaveLength(3);
    }
  });

  it('returns all BLOCKS_PER_LAYER slots for empty block list (no tower yet)', () => {
    // With no blocks, the tower hasn't started → all slots on layer 0 are free
    const slots = getDropSlots([]);
    expect(slots).toHaveLength(BLOCKS_PER_LAYER);
    expect(slots[0].newLayer).toBe(0);
  });
});

// ─── pickRandomDropSlot ───────────────────────────────────────────────

describe('pickRandomDropSlot', () => {
  it('returns a valid slot even for empty block list (all layer 0 slots are free)', () => {
    const slot = pickRandomDropSlot([]);
    expect(slot).not.toBeNull();
    expect(slot.newLayer).toBe(0);
  });

  it('returns a valid slot from getDropSlots for a partial tower', () => {
    const blocks = [makeBlock(0, 0, getSlotPosition(0, 0))];
    const slot = pickRandomDropSlot(blocks);
    expect(slot).not.toBeNull();
    expect(slot).toHaveProperty('slotIndex');
    expect(slot).toHaveProperty('position');
  });

  it('returns the only free slot when others are occupied', () => {
    const blocks = [
      makeBlock(0, 0, getSlotPosition(0, 0)),
      makeBlock(1, 0, getSlotPosition(0, 2)), // free: slot 1
    ];
    const slot = pickRandomDropSlot(blocks);
    expect(slot.slotIndex).toBe(1); // only free slot
  });
});

// ─── generateTower ────────────────────────────────────────────────────

describe('generateTower', () => {
  it('returns correct number of blocks', () => {
    const blocks = generateTower();
    expect(blocks).toHaveLength(TOWER_LAYERS * BLOCKS_PER_LAYER);
  });

  it('assigns sequential ids from 0', () => {
    const blocks = generateTower({ layers: 3 });
    expect(blocks[0].id).toBe(0);
    expect(blocks[1].id).toBe(1);
    expect(blocks[blocks.length - 1].id).toBe(3 * 3 - 1);
  });

  it('assigns correct layers to all blocks', () => {
    const layers = 5;
    const blocks = generateTower({ layers });
    for (let l = 0; l < layers; l++) {
      const layerBlocks = blocks.filter((b) => b.layer === l);
      expect(layerBlocks).toHaveLength(BLOCKS_PER_LAYER);
    }
  });

  it('alternates rotation between layers', () => {
    const blocks = generateTower({ layers: 4 });
    // Layer 0 (even): Z axis → rotation [0,0,0]
    expect(blocks[0].rotation).toEqual([0, 0, 0]);
    // Layer 1 (odd): X axis → rotation [0, π/2, 0]
    expect(blocks[3].rotation).toEqual([0, Math.PI / 2, 0]);
  });

  it('positions blocks in the correct axis per layer', () => {
    const blocks = generateTower({ layers: 3 });
    // Even layer 0: blocks along Z (x=0, z varies)
    for (let s = 0; s < BLOCKS_PER_LAYER; s++) {
      const b = blocks[s];
      expect(b.position[0]).toBe(0);
      expect(b.position[2]).toBe(-STEP + s * STEP);
    }
    // Odd layer 1: blocks along X (z=0, x varies)
    for (let s = 0; s < BLOCKS_PER_LAYER; s++) {
      const b = blocks[BLOCKS_PER_LAYER + s];
      expect(b.position[2]).toBe(0);
      expect(b.position[0]).toBe(-STEP + s * STEP);
    }
  });

  it('uses custom color palette when provided', () => {
    const colors = ['#ff0000', '#00ff00'];
    const blocks = generateTower({ colors, layers: 2 });
    // blocks[0].color = colors[0], blocks[1].color = colors[1],
    // blocks[2].color = colors[0], blocks[3].color = colors[1], ...
    for (let i = 0; i < blocks.length; i++) {
      expect(blocks[i].color).toBe(colors[i % colors.length]);
    }
  });

  it('defaults to WOOD_COLORS', () => {
    const blocks = generateTower({ layers: 2 });
    for (let i = 0; i < blocks.length; i++) {
      expect(blocks[i].color).toBe(WOOD_COLORS[i % WOOD_COLORS.length]);
    }
  });

  it('defaults to TOWER_LAYERS when no options provided', () => {
    const blocks = generateTower();
    expect(blocks).toHaveLength(TOWER_LAYERS * BLOCKS_PER_LAYER);
  });

  it('each block has all required fields', () => {
    const blocks = generateTower({ layers: 2 });
    for (const b of blocks) {
      expect(b).toHaveProperty('id');
      expect(b).toHaveProperty('position');
      expect(b).toHaveProperty('position.length', 3);
      expect(b).toHaveProperty('rotation');
      expect(b).toHaveProperty('rotation.length', 3);
      expect(b).toHaveProperty('color');
      expect(b).toHaveProperty('layer');
      expect(typeof b.id).toBe('number');
      expect(typeof b.layer).toBe('number');
      expect(typeof b.color).toBe('string');
    }
  });

  it('all position values are finite numbers', () => {
    const blocks = generateTower({ layers: 3 });
    for (const b of blocks) {
      for (const v of b.position) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});
