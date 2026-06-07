import { describe, it, expect } from 'vitest';
import { isCollapsedBlock, FALLEN_Y, COLLAPSE_DROP_THRESHOLD } from '../domain/collapse';
import { BLOCK_H, LAYER_GAP } from '../towerConfig';

function blockAt(layer, y) {
  return { id: 0, layer, position: [0, y, 0], rotation: [0, 0, 0], color: '#000' };
}

describe('isCollapsedBlock', () => {
  it('returns true for blocks below FALLEN_Y regardless of layer', () => {
    expect(isCollapsedBlock(blockAt(5, FALLEN_Y - 0.1))).toBe(true);
    expect(isCollapsedBlock(blockAt(0, -10))).toBe(true);
  });

  it('returns false for layer<0 blocks above FALLEN_Y (placeholder/AI ghost blocks)', () => {
    expect(isCollapsedBlock(blockAt(-1, 0))).toBe(false);
    expect(isCollapsedBlock(blockAt(-1, 5))).toBe(false);
  });

  it('returns false for blocks sitting at their expected layer height', () => {
    const layer = 5;
    const expectedY = layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    expect(isCollapsedBlock(blockAt(layer, expectedY))).toBe(false);
  });

  it('returns true for blocks dropped more than COLLAPSE_DROP_THRESHOLD below their layer', () => {
    const layer = 10;
    const expectedY = layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    expect(isCollapsedBlock(blockAt(layer, expectedY - COLLAPSE_DROP_THRESHOLD - 0.01))).toBe(true);
  });

  it('returns false at the exact threshold boundary (strict inequality)', () => {
    const layer = 10;
    const expectedY = layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    expect(isCollapsedBlock(blockAt(layer, expectedY - COLLAPSE_DROP_THRESHOLD))).toBe(false);
  });
});
