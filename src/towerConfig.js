// Real Jenga proportions: 75mm × 25mm × 15mm (length × width × height)
// Scene scale: 1 unit ≈ 5cm → BLOCK_W=1.5, BLOCK_D=0.5, BLOCK_H=0.3
// Ratio 5:1.67:1 matches real blocks (flat planks, not square bricks)

export const BLOCK_W = 1.5;   // length (long dimension)
export const BLOCK_H = 0.3;   // height (thickness — thin like real Jenga)
export const BLOCK_D = 0.5;   // width (short cross-section)
export const GAP = 0.02;
export const LAYER_GAP = 0.01;
export const TOWER_LAYERS = 18;
export const BLOCKS_PER_LAYER = 3;
export const STEP = BLOCK_D + GAP;

// 3 blocks side-by-side span: 3×0.5 + 2×0.02 = 1.54 ≈ BLOCK_W (1.5) ✓

export const WOOD_COLORS = [
  '#b5651d', '#a0522d', '#8b4513', '#cd853f', '#deb887',
  '#d2b48c', '#c19a6b', '#b8860b', '#daa520', '#bc8f8f',
];

export const BLOCK_PHYSICS = {
  mass: 1.0,
  restitution: 0.05,   // less bouncy — wood on wood
  friction: 0.7,       // wood friction
  linearDamping: 0.4,
  angularDamping: 0.6,
};

export function generateTower() {
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
        color: WOOD_COLORS[id % WOOD_COLORS.length],
        layer,
      });
      id++;
    }
  }
  return blocks;
}
