// src/domain/collapse.js
// Block-collapse detection. The check is a deliberately coarse Y-threshold
// (no center-of-mass, no tilt math): a block is considered fallen if it
// dropped through the safety net or if it is more than 3 layer-heights
// below where its layer index says it should sit.
//
// The Y-threshold is intentionally coarse — it's fast (O(blocks)) and is
// "good enough" for hold-and-restore detection. The natural upgrade path is
// center-of-mass + tilt analysis once Rapier rigid-body data is exposed
// per-frame.

import { BLOCK_H, LAYER_GAP } from '../towerConfig';

export const FALLEN_Y = -0.5;
export const COLLAPSE_DROP_THRESHOLD = (BLOCK_H + LAYER_GAP) * 3;

export function isCollapsedBlock(block) {
  if (block.position[1] < FALLEN_Y) return true;
  if (block.layer < 0) return false;

  const expectedY = block.layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
  return block.position[1] < expectedY - COLLAPSE_DROP_THRESHOLD;
}
