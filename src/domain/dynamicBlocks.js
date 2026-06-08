// src/domain/dynamicBlocks.js
// Pure helper for capping the set of dynamic blocks during a fall simulation
// on low-end devices. Picks the moveBlock plus the closest other dynamic
// candidates (by layer distance, then horizontal distance, then id) up to
// `maxDynamicBlocks`. Deterministic, no React, no app state.

export function capDynamicIdsForMobile(blocks, dynamicIds, moveBlock, removedLayer, maxDynamicBlocks = 7) {
  if (!dynamicIds || dynamicIds.size <= maxDynamicBlocks) return dynamicIds;

  const extractionX = moveBlock.position[0];
  const extractionZ = moveBlock.position[2];
  const candidates = blocks
    .filter((block) => dynamicIds.has(block.id))
    .map((block) => {
      const dx = block.position[0] - extractionX;
      const dz = block.position[2] - extractionZ;
      return {
        id: block.id,
        selected: block.id === moveBlock.id ? 0 : 1,
        layerDistance: Math.abs(block.layer - removedLayer),
        horizontalDistance: Math.sqrt(dx * dx + dz * dz),
      };
    })
    .sort((a, b) => (
      a.selected - b.selected ||
      a.layerDistance - b.layerDistance ||
      a.horizontalDistance - b.horizontalDistance ||
      a.id - b.id
    ));

  const capped = new Set(candidates.slice(0, maxDynamicBlocks).map((item) => item.id));
  capped.add(moveBlock.id);
  return capped;
}
