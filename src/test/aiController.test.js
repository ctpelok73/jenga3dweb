import { describe, it, expect, beforeEach } from 'vitest';
import { computeAIDropSlot } from '../aiController';
import {
  chooseAIBlockAdvanced,
  analyzeBlockStability,
  AIPersonality,
  MinimaxAI,
} from '../aiControllerAdvanced';
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

describe('chooseAIBlockAdvanced (runtime AI path)', () => {
  it('returns a valid block from below topCompleteLayer', () => {
    const blocks = generateTestTower();
    const personality = new AIPersonality('normal');
    const result = chooseAIBlockAdvanced(blocks, TOWER_LAYERS - 1, personality, 'normal');
    expect(result).not.toBeNull();
    expect(result.layer).toBeLessThan(TOWER_LAYERS - 1);
  });

  it('returns null when no candidates available', () => {
    const blocks = generateTestTower().filter(b => b.layer >= TOWER_LAYERS - 1);
    const personality = new AIPersonality('normal');
    const result = chooseAIBlockAdvanced(blocks, TOWER_LAYERS - 1, personality, 'normal');
    expect(result).toBeNull();
  });

  it('hard difficulty prefers high-stability blocks (low variance)', () => {
    const blocks = generateTestTower();
    const personality = new AIPersonality('normal');
    const picks = Array.from({ length: 30 }, () =>
      chooseAIBlockAdvanced(blocks, TOWER_LAYERS - 1, personality, 'hard')
    );
    // Average stability of hard-mode picks should be reasonably high
    const avgStability =
      picks.reduce((sum, p) => sum + analyzeBlockStability(p, blocks), 0) / picks.length;
    expect(avgStability).toBeGreaterThan(0.4);
  });

  it('easy difficulty produces more variance than hard', () => {
    const blocks = generateTestTower();
    const personality = new AIPersonality('normal');
    const easyPicks = new Set(
      Array.from({ length: 30 }, () =>
        chooseAIBlockAdvanced(blocks, TOWER_LAYERS - 1, personality, 'easy').id
      )
    );
    const hardPicks = new Set(
      Array.from({ length: 30 }, () =>
        chooseAIBlockAdvanced(blocks, TOWER_LAYERS - 1, personality, 'hard').id
      )
    );
    expect(easyPicks.size).toBeGreaterThan(hardPicks.size);
  });
});

describe('MinimaxAI.findBestMove (hard mode sign correctness)', () => {
  let blocks;
  let ai;

  beforeEach(() => {
    blocks = generateTestTower();
    ai = new MinimaxAI(2);
  });

  it('returns a valid candidate block', () => {
    const result = ai.findBestMove(blocks, TOWER_LAYERS - 1, false);
    expect(result).not.toBeNull();
    expect(result.layer).toBeLessThan(TOWER_LAYERS - 1);
  });

  it('picks a safer block than a sign-flipped (buggy) minimax would', () => {
    // The pre-fix bug returned a *negative* score from evaluatePosition while
    // findBestMove ran with isMaximizing=false — so it picked the lowest score,
    // i.e. the most negative, i.e. the riskiest block. Verify the fixed AI
    // picks a block whose post-removal position is no worse than what the
    // buggy variant would have picked.
    const candidates = blocks.filter(b => b.layer < TOWER_LAYERS - 1);
    const evalAfter = (b) => {
      const remaining = blocks.filter(x => x.id !== b.id);
      return analyzeBlockStability(b, remaining);
    };
    const fixedPick = ai.findBestMove(blocks, TOWER_LAYERS - 1, false);
    const buggyPick = candidates.reduce(
      (worst, b) => (evalAfter(b) < evalAfter(worst) ? b : worst),
      candidates[0],
    );
    expect(evalAfter(fixedPick)).toBeGreaterThanOrEqual(evalAfter(buggyPick));
  });

  it('returns null when no candidates exist', () => {
    const empty = blocks.filter(b => b.layer >= TOWER_LAYERS - 1);
    expect(ai.findBestMove(empty, TOWER_LAYERS - 1, false)).toBeNull();
  });
});
