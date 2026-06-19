import { trackAdImpression, trackAdClick, trackRewardedVideoStart, trackRewardedVideoReward, trackRewardedVideoError } from './analyticsService';

const AD_FREE_KEY = 'jenga3d_ad_free';
const ADSENSE_ID = import.meta.env.VITE_ADSENSE_ID || 'ca-pub-XXXXXXX';
const BANNER_SLOT_ID = import.meta.env.VITE_AD_BANNER_SLOT || '';
const REWARDED_SLOT_ID = import.meta.env.VITE_AD_REWARDED_SLOT || '';
const ADS_ENABLED = ADSENSE_ID !== 'ca-pub-XXXXXXX' && ADSENSE_ID.length > 0;

let sdkLoaded = false;
let rewardedCallback = null;
let rewardedAdInProgress = false;

export function areAdsConfigured() {
  return ADS_ENABLED;
}

export function isBannerAdConfigured(slotId = BANNER_SLOT_ID) {
  return ADS_ENABLED && Boolean(slotId);
}

export function isRewardedAdConfigured() {
  return ADS_ENABLED && Boolean(REWARDED_SLOT_ID);
}

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

export function initAdSDK() {
  if (sdkLoaded || isAdFree() || !ADS_ENABLED) return;

  if (typeof window !== 'undefined' && !window.adsbygoogle) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      sdkLoaded = true;
    };
    script.onerror = () => {
      console.warn('[AdService] AdSense SDK failed to load — ads will not show');
    };
    document.head.appendChild(script);
  } else if (typeof window !== 'undefined' && window.adsbygoogle && window.adsbygoogle.push) {
    sdkLoaded = true;
  }
}

export function showBannerAd(containerEl, slotId = BANNER_SLOT_ID) {
  if (isAdFree() || !sdkLoaded || !containerEl || !isBannerAdConfigured(slotId)) return;

  containerEl.innerHTML = '';

  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', ADSENSE_ID);
  ins.setAttribute('data-ad-slot', slotId);
  ins.setAttribute('data-ad-format', 'auto');
  ins.setAttribute('data-full-width-responsive', 'true');

  containerEl.appendChild(ins);

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    trackAdImpression('banner');
  } catch (e) {
    console.warn('[AdService] Banner push failed:', e);
  }
}

export function hideBannerAd(containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
}

export function showRewardedVideo(onReward, onError) {
  if (isAdFree()) {
    if (onReward) onReward();
    return;
  }

  if (rewardedAdInProgress) {
    if (onError) onError('ad_already_in_progress');
    return;
  }

  rewardedAdInProgress = true;
  trackRewardedVideoStart();

  rewardedCallback = { onReward, onError };

  if (!sdkLoaded || !isRewardedAdConfigured()) {
    trackRewardedVideoError('sdk_not_loaded');
    if (onError) onError('sdk_not_loaded');
    rewardedCallback = null;
    rewardedAdInProgress = false;
    return;
  }

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({
      google_ad_type: 'rewarded',
      google_ad_client: ADSENSE_ID,
      google_ad_slot: REWARDED_SLOT_ID,
      rewarded_ad_callback: () => {
        trackRewardedVideoReward(false);
        trackAdClick('rewarded');
        rewardedAdInProgress = false;
        if (rewardedCallback && rewardedCallback.onReward) {
          rewardedCallback.onReward();
        }
        rewardedCallback = null;
      },
      rewarded_ad_error_callback: (err) => {
        trackRewardedVideoError('ad_error');
        rewardedAdInProgress = false;
        if (rewardedCallback && rewardedCallback.onError) {
          rewardedCallback.onError('ad_error');
        }
        rewardedCallback = null;
      },
    });
  } catch (e) {
    console.warn('[AdService] Rewarded video push failed:', e);
    trackRewardedVideoError('push_failed');
    rewardedAdInProgress = false;
    if (onError) onError('push_failed');
    rewardedCallback = null;
  }
}
