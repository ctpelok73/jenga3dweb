/**
 * keyboardController.js — Keyboard accessibility navigation for Jenga 3D
 * 
 * Controls:
 *   Tab / Shift+Tab — cycle through selectable blocks
 *   Enter / Space   — select focused block / make move
 *   Escape          — deselect / open pause menu
 *   Arrow Up/Down   — move between layers
 *   Arrow Left/Right — move between blocks in same layer
 *   M               — open pause menu
 *   R               — restart game
 */

/**
 * Get list of selectable block IDs (not in top complete layer)
 * Sorted by layer then position for natural Tab order
 */
export function getSelectableBlocks(blocks, topCompleteLayer) {
  return blocks
    .filter(b => b.layer < topCompleteLayer)
    .sort((a, b) => {
      // Sort by layer first, then by id for consistent ordering
      if (a.layer !== b.layer) return a.layer - b.layer;
      return a.id - b.id;
    })
    .map(b => b.id);  // Return IDs, not full block objects
}

/**
 * Find next/previous block in selectable list
 */
export function cycleBlock(selectableIds, currentFocusId, direction = 'next') {
  if (selectableIds.length === 0) return null;
  
  if (currentFocusId === null) {
    // No current focus — start from first or last
    return direction === 'next' ? selectableIds[0] : selectableIds[selectableIds.length - 1];
  }

  const currentIndex = selectableIds.indexOf(currentFocusId);
  if (currentIndex === -1) {
    // Current focus not in selectable list — start from beginning
    return selectableIds[0];
  }

  if (direction === 'next') {
    const nextIndex = (currentIndex + 1) % selectableIds.length;
    return selectableIds[nextIndex];
  } else {
    const prevIndex = (currentIndex - 1 + selectableIds.length) % selectableIds.length;
    return selectableIds[prevIndex];
  }
}

/**
 * Find block in adjacent layer (Arrow Up/Down)
 */
export function jumpToLayer(blocks, selectableIds, currentFocusId, direction = 'up') {
  if (currentFocusId === null || selectableIds.length === 0) {
    return selectableIds[0] || null;
  }

  const currentBlock = blocks.find(b => b.id === currentFocusId);
  if (!currentBlock) return selectableIds[0];

  const targetLayer = direction === 'up' 
    ? currentBlock.layer - 1 
    : currentBlock.layer + 1;

  // Find first selectable block in target layer
  const layerBlock = selectableIds.find(id => {
    const b = blocks.find(bl => bl.id === id);
    return b && b.layer === targetLayer;
  });

  // If target layer has no selectable blocks, stay on current
  return layerBlock !== undefined ? layerBlock : currentFocusId;
}

/**
 * Find block in same layer, adjacent position (Arrow Left/Right)
 */
export function cycleInLayer(blocks, selectableIds, currentFocusId, direction = 'right') {
  if (currentFocusId === null || selectableIds.length === 0) {
    return selectableIds[0] || null;
  }

  const currentBlock = blocks.find(b => b.id === currentFocusId);
  if (!currentBlock) return selectableIds[0];

  // Get selectable blocks in same layer
  const sameLayerIds = selectableIds.filter(id => {
    const b = blocks.find(bl => bl.id === id);
    return b && b.layer === currentBlock.layer;
  });

  if (sameLayerIds.length === 0) return currentFocusId;

  const currentIndex = sameLayerIds.indexOf(currentFocusId);
  if (currentIndex === -1) return sameLayerIds[0];

  if (direction === 'right') {
    return sameLayerIds[(currentIndex + 1) % sameLayerIds.length];
  } else {
    return sameLayerIds[(currentIndex - 1 + sameLayerIds.length) % sameLayerIds.length];
  }
}

/**
 * Handle keyboard event and return action
 * Returns: { action, focusId } or null if key not handled
 */
export function handleKeyEvent(event, blocks, topCompleteLayer, currentFocusId, currentSelectedId, canMove) {
  const selectableIds = getSelectableBlocks(blocks, topCompleteLayer);
  
  // Ignore keys when typing in input fields
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') return null;

  switch (event.key) {
    case 'Tab': {
      event.preventDefault();
      const direction = event.shiftKey ? 'prev' : 'next';
      const nextId = cycleBlock(selectableIds, currentFocusId, direction);
      return { action: 'focus', focusId: nextId };
    }
    case 'ArrowUp': {
      event.preventDefault();
      const nextId = jumpToLayer(blocks, selectableIds, currentFocusId, 'up');
      return { action: 'focus', focusId: nextId };
    }
    case 'ArrowDown': {
      event.preventDefault();
      const nextId = jumpToLayer(blocks, selectableIds, currentFocusId, 'down');
      return { action: 'focus', focusId: nextId };
    }
    case 'ArrowLeft': {
      event.preventDefault();
      const nextId = cycleInLayer(blocks, selectableIds, currentFocusId, 'left');
      return { action: 'focus', focusId: nextId };
    }
    case 'ArrowRight': {
      event.preventDefault();
      const nextId = cycleInLayer(blocks, selectableIds, currentFocusId, 'right');
      return { action: 'focus', focusId: nextId };
    }
    case 'Enter':
    case ' ': {
      event.preventDefault();
      if (currentFocusId !== null) {
        // If a block is keyboard-focused but not yet selected → select it
        if (currentSelectedId !== currentFocusId) {
          return { action: 'select', focusId: currentFocusId };
        }
        // If already selected and can move → make move
        if (canMove) {
          return { action: 'move', focusId: currentFocusId };
        }
      }
      return null;
    }
    case 'Escape': {
      event.preventDefault();
      if (currentSelectedId !== null) {
        return { action: 'deselect', focusId: null };
      }
      return { action: 'pause', focusId: null };
    }
    case 'm':
    case 'М': {
      // Open pause menu
      return { action: 'pause', focusId: null };
    }
    case 'r':
    case 'Р': {
      // Restart — only during gameplay
      return { action: 'restart', focusId: null };
    }
    default:
      return null;
  }
}