/**
 * AriaAnnouncer.jsx — Screen reader live region for Jenga 3D
 * 
 * Provides aria-live="assertive" region for announcing game state changes:
 * - Block selection/deselection
 * - Game phase transitions (start, playing, game over)
 * - Achievement unlocks
 * - Move results (stabilized, collapsed)
 * 
 * Usage: <AriaAnnouncer announcement={announcement} />
 * The announcement state is set in App.jsx and cleared after a short delay.
 */

import React, { useEffect, useRef } from 'react';

export default function AriaAnnouncer({ announcement }) {
  const regionRef = useRef(null);

  // Clear announcement after it's been read by screen reader
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = '';
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {announcement || ''}
    </div>
  );
}