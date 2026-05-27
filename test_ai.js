import { chooseAIBlockAdvanced, aiPersonality } from './src/aiControllerAdvanced.js';
import { BLOCKS_PER_LAYER, STEP, BLOCK_H, LAYER_GAP } from './src/towerConfig.js';

// Mock blocks for a 3-layer tower
const blocks = [
  { id: 0, layer: 0, position: [-STEP, BLOCK_H/2, 0] },
  { id: 1, layer: 0, position: [0, BLOCK_H/2, 0] },
  { id: 2, layer: 0, position: [STEP, BLOCK_H/2, 0] },
  { id: 3, layer: 1, position: [0, BLOCK_H + LAYER_GAP + BLOCK_H/2, -STEP], rotation: [0, Math.PI/2, 0] },
  { id: 4, layer: 1, position: [0, BLOCK_H + LAYER_GAP + BLOCK_H/2, 0], rotation: [0, Math.PI/2, 0] },
  { id: 5, layer: 1, position: [0, BLOCK_H + LAYER_GAP + BLOCK_H/2, STEP], rotation: [0, Math.PI/2, 0] },
  { id: 6, layer: 2, position: [-STEP, 2*(BLOCK_H + LAYER_GAP) + BLOCK_H/2, 0] }
];

const topCompleteLayer = 1; // Layer 1 is complete, layer 2 is not.
const difficulty = 'normal';

console.log('Testing chooseAIBlockAdvanced...');
const block = chooseAIBlockAdvanced(blocks, topCompleteLayer, aiPersonality, difficulty);

if (block) {
  console.log('AI selected block:', block.id, 'at layer:', block.layer);
  if (block.layer >= topCompleteLayer) {
    console.error('FAILED: AI selected a block from or above the top complete layer!');
    process.exit(1);
  } else {
    console.log('SUCCESS: AI selected a valid block.');
  }
} else {
  console.error('FAILED: AI could not find a block!');
  process.exit(1);
}
