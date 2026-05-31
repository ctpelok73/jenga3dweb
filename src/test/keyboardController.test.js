import { describe, expect, it, vi } from 'vitest';
import { cycleBlock, cycleInLayer, getSelectableBlocks, handleKeyEvent, jumpToLayer } from '../keyboardController';

const blocks = [
  { id: 0, layer: 0 },
  { id: 1, layer: 0 },
  { id: 2, layer: 1 },
  { id: 3, layer: 1 },
  { id: 4, layer: 2 },
];

describe('keyboardController', () => {
  it('returns only blocks below the top complete layer', () => {
    expect(getSelectableBlocks(blocks, 2)).toEqual([0, 1, 2, 3]);
  });

  it('cycles through selectable blocks', () => {
    expect(cycleBlock([0, 1, 2], null, 'next')).toBe(0);
    expect(cycleBlock([0, 1, 2], 2, 'next')).toBe(0);
    expect(cycleBlock([0, 1, 2], 0, 'prev')).toBe(2);
  });

  it('moves within a layer and across layers', () => {
    const selectable = [0, 1, 2, 3];
    expect(cycleInLayer(blocks, selectable, 0, 'right')).toBe(1);
    expect(jumpToLayer(blocks, selectable, 0, 'down')).toBe(2);
  });

  it('maps keys to focus/select/move actions', () => {
    const event = { key: 'Tab', shiftKey: false, preventDefault: vi.fn(), target: document.body };
    expect(handleKeyEvent(event, blocks, 2, null, null, false)).toEqual({ action: 'focus', focusId: 0 });
    expect(event.preventDefault).toHaveBeenCalled();

    const selectEvent = { key: 'Enter', preventDefault: vi.fn(), target: document.body };
    expect(handleKeyEvent(selectEvent, blocks, 2, 1, null, false)).toEqual({ action: 'select', focusId: 1 });

    const moveEvent = { key: ' ', preventDefault: vi.fn(), target: document.body };
    expect(handleKeyEvent(moveEvent, blocks, 2, 1, 1, true)).toEqual({ action: 'move', focusId: 1 });
  });
});
