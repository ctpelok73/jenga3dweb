/**
 * AdBanner.jsx — React component for Google AdSense banner ad
 *
 * Position: fixed bottom, responsive width
 * Only visible on PHASE_START and PHASE_GAME_OVER screens (not during gameplay!)
 * Lifecycle: mount → push ad, unmount → collapse
 */

import React, { useEffect, useRef } from 'react';
import { showBannerAd, hideBannerAd, isAdFree } from './adService';

export default function AdBanner({ visible, adSlot }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (visible && !isAdFree() && containerRef.current) {
      showBannerAd(containerRef.current, adSlot);
    } else if (containerRef.current) {
      hideBannerAd(containerRef.current);
    }

    // Cleanup on unmount
    return () => {
      if (containerRef.current) {
        hideBannerAd(containerRef.current);
      }
    };
  }, [visible, adSlot]);

  // Don't render anything if ad-free
  if (isAdFree()) return null;

  return (
    <div
      id="ad-banner-container"
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        minHeight: visible ? 50 : 0,
        maxHeight: visible ? 90 : 0,
        zIndex: 15,
        background: 'rgba(0, 0, 0, 0.9)',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease, min-height 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      aria-hidden="true"
    />
  );
}