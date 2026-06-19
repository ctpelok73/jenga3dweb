import { pickRandomDropSlot } from './domain/tower';

export const AI_THINK_DELAY = 800;
export const AI_MOVE_DELAY = 1200;

export function computeAIDropSlot(blocks, _selectedBlock) {
  return pickRandomDropSlot(blocks);
}
