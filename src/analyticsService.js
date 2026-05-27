/**
 * analyticsService.js — сервис для Google Analytics 4 интеграции
 * Инициализирует GA4 и предоставляет методы для трекинга событий
 */

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_ID || 'G-XXXXXXXXXX';

export function initializeAnalytics() {
  // Загружаем GA скрипт динамически
  if (typeof window !== 'undefined' && !window.gtag) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      'anonymize_ip': true,
      'allow_google_signals': false,
    });
  }
}

/**
 * Трекинг события
 */
export function trackEvent(eventName, eventParams = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
}

/**
 * Трекинг начала игры
 */
export function trackGameStart(source = 'ui_button', playerMode = 1) {
  trackEvent('game_start', {
    'source': source,
    'player_mode': playerMode,
    'timestamp': new Date().toISOString(),
  });
}

/**
 * Трекинг хода
 */
export function trackBlockPlaced(turn, tower_height) {
  trackEvent('block_placed', {
    'turn': turn,
    'tower_height': tower_height,
  });
}

/**
 * Трекинг конца игры
 */
export function trackGameOver(turns, best_score, is_new_record = false) {
  trackEvent('game_over', {
    'turns': turns,
    'best_score': best_score,
    'is_new_record': is_new_record,
    'timestamp': new Date().toISOString(),
  });
}

/**
 * Трекинг социального шеринга
 */
export function trackShareClick(platform) {
  trackEvent('share_click', {
    'platform': platform, // twitter, telegram, facebook, whatsapp, copy
  });
}

/**
 * Трекинг просмотра рекламы
 */
export function trackAdImpression(ad_type = 'banner') {
  trackEvent('ad_impression', {
    'ad_type': ad_type,
  });
}

/**
 * Трекинг клика по рекламе
 */
export function trackAdClick(ad_type = 'banner') {
  trackEvent('ad_click', {
    'ad_type': ad_type,
  });
}

/**
 * Трекинг начала rewarded video
 */
export function trackRewardedVideoStart() {
  trackEvent('rewarded_video_start', {
    'timestamp': new Date().toISOString(),
  });
}

/**
 * Трекинг rewarded video reward granted
 */
export function trackRewardedVideoReward(ad_free_continuation = false) {
  trackEvent('rewarded_video_reward', {
    'ad_free_continuation': ad_free_continuation,
  });
}

/**
 * Трекинг ошибки rewarded video
 */
export function trackRewardedVideoError(error_code) {
  trackEvent('rewarded_video_error', {
    'error_code': error_code,
  });
}

/**
 * Трекинг установки PWA
 */
export function trackPWAInstall() {
  trackEvent('pwa_install', {
    'timestamp': new Date().toISOString(),
  });
}

/**
 * Трекинг покупки премиума
 */
export function trackPremiumPurchase(price, currency = 'USD') {
  trackEvent('premium_purchase', {
    'value': price,
    'currency': currency,
  });
}
