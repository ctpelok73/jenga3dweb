import { describe, expect, it, vi } from 'vitest';
import {
  cycleBlock,
  cycleInLayer,
  getSelectableBlocks,
  handleKeyEvent,
  jumpToLayer,
} from '../keyboardController';

// ─── Fixtures ───────────────────────────────────────────────────────────────

/** 5 blocks across 3 layers */
const blocks = [
  { id: 0, layer: 0 },
  { id: 1, layer: 0 },
  { id: 2, layer: 1 },
  { id: 3, layer: 1 },
  { id: 4, layer: 2 },
];

/**
 * Blocks with multiple ids per layer for layer-navigation & cycle tests.
 * Layer 0: ids 10, 11
 * Layer 1: ids 20, 21
 * Layer 2: ids 30, 31
 */
const layerBlocks = [
  { id: 10, layer: 0 },
  { id: 11, layer: 0 },
  { id: 20, layer: 1 },
  { id: 21, layer: 1 },
  { id: 30, layer: 2 },
  { id: 31, layer: 2 },
];

// ─── getSelectableBlocks ────────────────────────────────────────────────────

describe('getSelectableBlocks', () => {
  it('returns blocks below topCompleteLayer, sorted by layer then id', () => {
    const result = getSelectableBlocks(blocks, 2);
    expect(result).toEqual([0, 1, 2, 3]); // layers 0 and 1
  });

  it('returns empty array when all blocks are in or above topCompleteLayer', () => {
    expect(getSelectableBlocks(blocks, 0)).toEqual([]);
  });

  it('returns all blocks when topCompleteLayer is above the highest layer', () => {
    expect(getSelectableBlocks(blocks, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it('returns empty array for empty blocks input', () => {
    expect(getSelectableBlocks([], 2)).toEqual([]);
  });

  it('sorts by layer first, then by id', () => {
    const unsorted = [
      { id: 9, layer: 1 },
      { id: 1, layer: 0 },
      { id: 5, layer: 1 },
      { id: 3, layer: 0 },
    ];
    expect(getSelectableBlocks(unsorted, 5)).toEqual([1, 3, 5, 9]);
  });

  it('handles blocks with negative layer values', () => {
    const neg = [
      { id: 0, layer: -1 },
      { id: 1, layer: 0 },
    ];
    expect(getSelectableBlocks(neg, 2)).toEqual([0, 1]);
  });
});

// ─── cycleBlock ─────────────────────────────────────────────────────────────

describe('cycleBlock', () => {
  const ids = [1, 3, 5];

  it('returns null when selectableIds is empty', () => {
    expect(cycleBlock([], null, 'next')).toBeNull();
    expect(cycleBlock([], 1, 'next')).toBeNull();
  });

  it('returns first id when currentFocusId is null and direction is next', () => {
    expect(cycleBlock(ids, null, 'next')).toBe(1);
  });

  it('returns last id when currentFocusId is null and direction is prev', () => {
    expect(cycleBlock(ids, null, 'prev')).toBe(5);
  });

  it('wraps forward — last element cycles to first', () => {
    expect(cycleBlock(ids, 5, 'next')).toBe(1);
  });

  it('wraps backward — first element cycles to last', () => {
    expect(cycleBlock(ids, 1, 'prev')).toBe(5);
  });

  it('moves forward by one', () => {
    expect(cycleBlock(ids, 1, 'next')).toBe(3);
  });

  it('moves backward by one', () => {
    expect(cycleBlock(ids, 5, 'prev')).toBe(3);
  });

  it('returns first id when currentFocusId is not in the list', () => {
    expect(cycleBlock(ids, 999, 'next')).toBe(1);
    expect(cycleBlock(ids, 999, 'prev')).toBe(1);
  });

  it('works with single-element list', () => {
    expect(cycleBlock([7], null, 'next')).toBe(7);
    expect(cycleBlock([7], 7, 'next')).toBe(7);
    expect(cycleBlock([7], 7, 'prev')).toBe(7);
  });
});

// ─── jumpToLayer ────────────────────────────────────────────────────────────

describe('jumpToLayer', () => {
  const selectable = [10, 11, 20, 21, 30, 31];

  it('returns first selectable id when no current focus', () => {
    expect(jumpToLayer(layerBlocks, selectable, null, 'up')).toBe(10);
    expect(jumpToLayer(layerBlocks, selectable, null, 'down')).toBe(10);
  });

  it('returns null when both currentFocusId is null and selectableIds is empty', () => {
    expect(jumpToLayer(layerBlocks, [], null, 'up')).toBeNull();
  });

  it('returns first selectable when block for currentFocusId is not found', () => {
    expect(jumpToLayer(layerBlocks, selectable, 999, 'up')).toBe(10);
  });

  it('moves to a block in the layer above (up)', () => {
    // id 20 is in layer 1, layer above is layer 0 → expect 10 or 11
    const result = jumpToLayer(layerBlocks, selectable, 20, 'up');
    expect([10, 11]).toContain(result);
  });

  it('moves to a block in the layer below (down)', () => {
    // id 10 is in layer 0, layer below is layer 1 → expect 20 or 21
    const result = jumpToLayer(layerBlocks, selectable, 10, 'down');
    expect([20, 21]).toContain(result);
  });

  it('stays on current block when target layer has no selectable blocks', () => {
    // id 30 is in layer 2; jumping down to layer 3 which has no blocks
    expect(jumpToLayer(layerBlocks, selectable, 30, 'down')).toBe(30);
  });

  it('stays on current block when jumping above the topmost layer with blocks', () => {
    // id 10 is in layer 0; jumping up to layer -1 which has no blocks
    expect(jumpToLayer(layerBlocks, selectable, 10, 'up')).toBe(10);
  });

  it('returns first selectable on empty selectableIds even with valid focus', () => {
    expect(jumpToLayer(layerBlocks, [], 10, 'up')).toBeNull();
  });
});

// ─── cycleInLayer ───────────────────────────────────────────────────────────

describe('cycleInLayer', () => {
  const selectable = [10, 11, 20, 21, 30, 31];

  it('returns first selectable when no current focus', () => {
    expect(cycleInLayer(layerBlocks, selectable, null, 'right')).toBe(10);
    expect(cycleInLayer(layerBlocks, selectable, null, 'left')).toBe(10);
  });

  it('returns null when both no focus and empty list', () => {
    expect(cycleInLayer(layerBlocks, [], null, 'right')).toBeNull();
  });

  it('returns first selectable when block is not found', () => {
    expect(cycleInLayer(layerBlocks, selectable, 999, 'right')).toBe(10);
  });

  it('cycles right within the same layer', () => {
    expect(cycleInLayer(layerBlocks, selectable, 10, 'right')).toBe(11);
    expect(cycleInLayer(layerBlocks, selectable, 20, 'right')).toBe(21);
  });

  it('cycles left within the same layer', () => {
    expect(cycleInLayer(layerBlocks, selectable, 11, 'left')).toBe(10);
    expect(cycleInLayer(layerBlocks, selectable, 21, 'left')).toBe(20);
  });

  it('wraps around in same layer when at the edge', () => {
    // id 11 is last in layer 0 → right wraps to 10
    expect(cycleInLayer(layerBlocks, selectable, 11, 'right')).toBe(10);
    // id 10 is first in layer 0 → left wraps to 11
    expect(cycleInLayer(layerBlocks, selectable, 10, 'left')).toBe(11);
  });

  it('stays on current block when it is the only block in its layer', () => {
    const singleLayerBlocks = [
      { id: 1, layer: 0 },
      { id: 2, layer: 1 },
    ];
    expect(cycleInLayer(singleLayerBlocks, [1, 2], 1, 'right')).toBe(1);
    expect(cycleInLayer(singleLayerBlocks, [1, 2], 1, 'left')).toBe(1);
  });

  it('stays on current block when no other selectable blocks in same layer', () => {
    // Only id 11 is selectable in layer 0 (id 10 is above topCompleteLayer)
    const filteredSelectable = [11, 20];
    expect(cycleInLayer(layerBlocks, filteredSelectable, 11, 'right')).toBe(11);
  });
});

// ─── handleKeyEvent ─────────────────────────────────────────────────────────

describe('handleKeyEvent', () => {
  const topLayer = 2;

  function makeEvent(overrides = {}) {
    return {
      key: 'Tab',
      shiftKey: false,
      preventDefault: vi.fn(),
      target: document.body,
      ...overrides,
    };
  }

  // ── Ignore input fields ──

  it('returns null when event target is an INPUT element', () => {
    const event = makeEvent({ target: { tagName: 'INPUT' } });
    expect(handleKeyEvent(event, blocks, topLayer, null, null, false)).toBeNull();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('returns null when event target is a TEXTAREA element', () => {
    const event = makeEvent({ target: { tagName: 'TEXTAREA' } });
    expect(handleKeyEvent(event, blocks, topLayer, null, null, false)).toBeNull();
  });

  it('returns null when event target is a SELECT element', () => {
    const event = makeEvent({ target: { tagName: 'SELECT' } });
    expect(handleKeyEvent(event, blocks, topLayer, null, null, false)).toBeNull();
  });

  // ── Tab (focus navigation) ──

  it('maps Tab to focus next block', () => {
    const event = makeEvent({ key: 'Tab' });
    const result = handleKeyEvent(event, blocks, topLayer, null, null, false);
    expect(result).toEqual({ action: 'focus', focusId: 0 });
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('maps Shift+Tab to focus previous block', () => {
    const event = makeEvent({ key: 'Tab', shiftKey: true });
    // selectableIds = [0, 1, 2, 3]; focusId=0 → prev wraps to last selectable = 3
    const result = handleKeyEvent(event, blocks, topLayer, 0, null, false);
    expect(result).toEqual({ action: 'focus', focusId: 3 });
  });

  // ── Arrow keys ──

  it('maps ArrowUp to focus block in layer above', () => {
    const event = makeEvent({ key: 'ArrowUp' });
    // focusId=2 is layer 1, target layer = 0 → first selectable in layer 0 = id 0
    const result = handleKeyEvent(event, blocks, topLayer, 2, null, false);
    expect(result).toEqual({ action: 'focus', focusId: 0 });
  });

  it('maps ArrowDown to focus block in layer below', () => {
    const event = makeEvent({ key: 'ArrowDown' });
    const result = handleKeyEvent(event, blocks, topLayer, 0, null, false);
    expect(result).toEqual({ action: 'focus', focusId: 2 });
  });

  it('maps ArrowLeft to cycle within layer (left)', () => {
    const event = makeEvent({ key: 'ArrowLeft' });
    const result = handleKeyEvent(event, blocks, topLayer, 1, null, false);
    expect(result).toEqual({ action: 'focus', focusId: 0 });
  });

  it('maps ArrowRight to cycle within layer (right)', () => {
    const event = makeEvent({ key: 'ArrowRight' });
    const result = handleKeyEvent(event, blocks, topLayer, 0, null, false);
    expect(result).toEqual({ action: 'focus', focusId: 1 });
  });

  // ── Enter / Space (select & move) ──

  it('maps Enter to select when focusId differs from selectedId', () => {
    const event = makeEvent({ key: 'Enter' });
    // focusId=1, selectedId=null → different → select
    const result = handleKeyEvent(event, blocks, topLayer, 1, null, false);
    expect(result).toEqual({ action: 'select', focusId: 1 });
  });

  it('maps Space to move when focusId matches selectedId and canMove is true', () => {
    const event = makeEvent({ key: ' ' });
    // focusId=1, selectedId=1 → same; canMove=true → move
    const result = handleKeyEvent(event, blocks, topLayer, 1, 1, true);
    expect(result).toEqual({ action: 'move', focusId: 1 });
  });

  it('returns null for Enter when focusId matches selectedId but !canMove', () => {
    const event = makeEvent({ key: 'Enter' });
    const result = handleKeyEvent(event, blocks, topLayer, 1, 1, false);
    expect(result).toBeNull();
  });

  it('returns null for Enter when focusId is null', () => {
    const event = makeEvent({ key: 'Enter' });
    const result = handleKeyEvent(event, blocks, topLayer, null, null, false);
    expect(result).toBeNull();
  });

  it('returns null for Space when focusId is null', () => {
    const event = makeEvent({ key: ' ' });
    const result = handleKeyEvent(event, blocks, topLayer, null, null, false);
    expect(result).toBeNull();
  });

  it('returns null for Space when focusId matches selectedId but !canMove', () => {
    const event = makeEvent({ key: ' ' });
    const result = handleKeyEvent(event, blocks, topLayer, 1, 1, false);
    expect(result).toBeNull();
  });

  // ── Escape ──

  it('maps Escape to deselect when a block is selected', () => {
    const event = makeEvent({ key: 'Escape' });
    const result = handleKeyEvent(event, blocks, topLayer, 0, 0, false);
    expect(result).toEqual({ action: 'deselect', focusId: null });
  });

  it('maps Escape to pause when no block is selected', () => {
    const event = makeEvent({ key: 'Escape' });
    const result = handleKeyEvent(event, blocks, topLayer, 0, null, false);
    expect(result).toEqual({ action: 'pause', focusId: null });
  });

  // ── m / М → pause ──

  it('maps "m" to pause', () => {
    const event = makeEvent({ key: 'm' });
    const result = handleKeyEvent(event, blocks, topLayer, null, null, false);
    expect(result).toEqual({ action: 'pause', focusId: null });
  });

  it('maps Russian "М" (U+041C) to pause', () => {
    const event = makeEvent({ key: 'М' });
    const result = handleKeyEvent(event, blocks, topLayer, null, null, false);
    expect(result).toEqual({ action: 'pause', focusId: null });
  });

  // ── r / Р → restart ──

  it('maps "r" to restart', () => {
    const event = makeEvent({ key: 'r' });
    const result = handleKeyEvent(event, blocks, topLayer, null, null, false);
    expect(result).toEqual({ action: 'restart', focusId: null });
  });

  it('maps Russian "Р" (U+0420) to restart', () => {
    const event = makeEvent({ key: 'Р' });
    const result = handleKeyEvent(event, blocks, topLayer, null, null, false);
    expect(result).toEqual({ action: 'restart', focusId: null });
  });

  // ── Unhandled keys ──

  it('returns null for unhandled keys', () => {
    const event = makeEvent({ key: 'F1' });
    expect(handleKeyEvent(event, blocks, topLayer, null, null, false)).toBeNull();

    const event2 = makeEvent({ key: 'a' }); // lowercase a is not handled
    expect(handleKeyEvent(event2, blocks, topLayer, null, null, false)).toBeNull();
  });

  // ── Integration: focus → select → move flow ──

  it('focus → select → move cycle works via handleKeyEvent', () => {
    // 1. Tab to focus
    const tabEvent = makeEvent({ key: 'Tab' });
    const focus = handleKeyEvent(tabEvent, blocks, topLayer, null, null, false);
    expect(focus).toEqual({ action: 'focus', focusId: 0 });

    // 2. Enter to select the focused block
    const enterEvent = makeEvent({ key: 'Enter' });
    const select = handleKeyEvent(enterEvent, blocks, topLayer, 0, null, false);
    expect(select).toEqual({ action: 'select', focusId: 0 });

    // 3. Space to confirm move (now selectedId === focusId, canMove=true)
    const spaceEvent = makeEvent({ key: ' ' });
    const move = handleKeyEvent(spaceEvent, blocks, topLayer, 0, 0, true);
    expect(move).toEqual({ action: 'move', focusId: 0 });
  });
});
