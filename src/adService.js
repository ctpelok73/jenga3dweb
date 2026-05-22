/**
 * adService.js — Ad controller for Jenga 3D
 *
 * Manages Google AdSense integration:
 * - Dynamic script loading (like analyticsService.js pattern)
 * - Banner ad lifecycle (show/hide per game phase)
 * - Rewarded video lifecycle (request → show → reward callback)
 * - Integration with analyticsService.trackAdImpression/trackAdClick
 * - Premium check: if user purchased "remove ads", skip all ad calls
 */

import { trackAdImpression, trackAdClick, trackRewardedVideoStart, trackRewardedVideoReward, trackRewardedVideoError } from './analyticsService';

const AD_FREE_KEY = 'jenga3d_ad_free';
const ADSENSE_ID = import.meta.env.VITE_ADSENSE_ID || 'ca-pub-XXXXXXX';
const BANNER_SLOT_ID = import.meta.env.VITE_AD_BANNER_SLOT || '';
const REWARDED_SLOT_ID = import.meta.env.VITE_AD_REWARDED_SLOT || '';

let sdkLoaded = false;
let rewardedCallback = null;

// ─── Check if user has purchased "remove ads" ───
export function isAdFree() {
  try {
    return localStorage.getItem(AD_FREE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAdFree(value) {
  try {
    localStorage.setItem(AD_FREE_KEY, value ? '1' : '0');
  } catch {}
}

// ─── Load AdSense SDK dynamically ───
export function initAdSDK() {
  if (sdkLoaded || isAdFree()) return;

  if (typeof window !== 'undefined' && !window.adsbygoogle) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      sdkLoaded = true;
      console.log('[AdService] AdSense SDK loaded');
    };
    script.onerror = () => {
      console.warn('[AdService] AdSense SDK failed to load — ads will not show');
    };
    document.head.appendChild(script);
  } else if (window.adsbygoogle) {
    sdkLoaded = true;
  }
}

// ─── Banner Ad ───
/**
 * Show a banner ad in the specified container element.
 * Creates an <ins class="adsbygoogle"> element and pushes it to AdSense.
 *
 * @param {HTMLElement} containerEl — DOM element to insert ad into
 * @param {string} slotId — Ad slot ID (defaults to BANNER_SLOT_ID)
 */
export function showBannerAd(containerEl, slotId = BANNER_SLOT_ID) {
  if (isAdFree() || !sdkLoaded || !containerEl) return;

  // Clear previous ad content
  containerEl.innerHTML = '';

  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', ADSENSE_ID);
  ins.setAttribute('data-ad-slot', slotId);
  ins.setAttribute('data-ad-format', 'auto');
  ins.setAttribute('data-full-width-responsive', 'true');

  containerEl.appendChild(ins);

  // Push ad request
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    trackAdImpression('banner');
  } catch (e) {
    console.warn('[AdService] Banner push failed:', e);
  }
}

/**
 * Hide/collapse the banner ad container
 */
export function hideBannerAd(containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
}

// ─── Rewarded Video ───
/**
 * Request a rewarded video ad.
 * When the user completes the video, the onReward callback is called.
 *
 * @param {Function} onReward — callback when reward is granted (user watched full video)
 * @param {Function} onError — callback when ad fails or user skips
 */
export function showRewardedVideo(onReward, onError) {
  if (isAdFree()) {
    // If ad-free, just grant the reward without showing video
    if (onReward) onReward();
    return;
  }

  if (!sdkLoaded) {
    console.warn('[AdService] SDK not loaded — cannot show rewarded video');
    if (onError) onError('sdk_not_loaded');
    return;
  }

  trackRewardedVideoStart();

  rewardedCallback = { onReward, onError };

  try {
    // Google AdSense rewarded video format
    (window.adsbygoogle = window.adsbygoogle || []).push({
      google_ad_type: 'rewarded_video',
      google_ad_client: ADSENSE_ID,
      google_ad_slot: REWARDED_SLOT_ID,
      // Callbacks are handled via the global event listeners below
    });
  } catch (e) {
    console.warn('[AdService] Rewarded video push failed:', e);
    trackRewardedVideoError('push_failed');
    if (onError) onError('push_failed');
    rewardedCallback = null;
  }
}

// ─── Global AdSense event listeners ───
// Google AdSense dispatches events via the window object
if (typeof window !== 'undefined') {
  // Reward granted — user watched the full video
  window.addEventListener('rewardedVideoAdGranted', () => {
    console.log('[AdService] Rewarded video completed — granting reward');
    trackRewardedVideoReward(false); // not ad-free continuation, it's a regular reward
    trackAdClick('rewarded');
    if (rewardedCallback && rewardedCallback.onReward) {
      rewardedCallback.onReward();
    }
    rewardedCallback = null;
  });

  // Video closed before completion — no reward
  window.addEventListener('rewardedVideoAdClosed', () => {
    console.log('[AdService] Rewarded video closed without completion');
    if (rewardedCallback && rewardedCallback.onError) {
      rewardedCallback.onError('video_closed');
    }
    rewardedCallback = null;
  });

  // Ad error
  window.addEventListener('rewardedVideoAdError', (e) => {
    console.warn('[AdService] Rewarded video error:', e);
    trackRewardedVideoError('ad_error');
    if (rewardedCallback && rewardedCallback.onError) {
      rewardedCallback.onError('ad_error');
    }
    rewardedCallback = null;
  });
}

export default {
  initAdSDK,
  isAdFree,
  setAdFree,
  showBannerAd,
  hideBannerAd,
  showRewardedVideo,
};