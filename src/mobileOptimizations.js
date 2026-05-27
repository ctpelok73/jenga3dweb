/**
 * mobileOptimizations.js — Оптимизации для мобильных устройств
 */

import React from 'react';

/**
 * Проверить, мобильное ли устройство
 */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Проверить, поддерживается ли touch
 */
export function isTouchSupported() {
  if (typeof window === 'undefined') return false;
  return (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0)
  );
}

/**
 * Получить информацию о устройстве
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTouch: false, dpr: 1 };
  }

  return {
    isMobile: isMobileDevice(),
    isTouch: isTouchSupported(),
    dpr: window.devicePixelRatio || 1,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    isPortrait: window.innerHeight > window.innerWidth,
  };
}

/**
 * Оптимизировать размеры кнопок для touch
 * Минимум 44x44px для удобства на мобильных
 */
export const TOUCH_TARGET_SIZE = 44; // pixels

/**
 * Класс для управления viewport и масштабированием
 */
export class ViewportManager {
  constructor() {
    this.deviceInfo = getDeviceInfo();
    this.listeners = [];
  }

  /**
   * Установить оптимальный viewport для мобильных
   */
  setupViewport() {
    if (typeof document === 'undefined') return;

    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }

    // Оптимальные настройки для мобильных
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  }

  /**
   * Отключить zoom на double-tap
   */
  disableDoubleTapZoom() {
    if (typeof document === 'undefined') return;

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }

  /**
   * Слушать изменения ориентации
   */
  onOrientationChange(callback) {
    if (typeof window === 'undefined') return;

    const handleChange = () => {
      this.deviceInfo = getDeviceInfo();
      callback(this.deviceInfo);
    };

    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);

    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  }

  /**
   * Получить оптимальный размер для элемента на мобильном
   */
  getOptimalSize(minSize = TOUCH_TARGET_SIZE) {
    return Math.max(minSize, this.deviceInfo.screenWidth / 10);
  }

  /**
   * Проверить, нужна ли оптимизация для мобильных
   */
  shouldOptimizeForMobile() {
    return this.deviceInfo.isMobile && this.deviceInfo.isTouch;
  }
}

/**
 * Singleton instance
 */
export const viewportManager = new ViewportManager();

/**
 * React Hook для мобильной оптимизации
 */
export function useMobileOptimizations() {
  const [deviceInfo, setDeviceInfo] = React.useState(getDeviceInfo());

  React.useEffect(() => {
    viewportManager.setupViewport();
    viewportManager.disableDoubleTapZoom();

    const unsubscribe = viewportManager.onOrientationChange((info) => {
      setDeviceInfo(info);
    });

    return unsubscribe;
  }, []);

  return {
    deviceInfo,
    shouldOptimize: viewportManager.shouldOptimizeForMobile(),
    optimalSize: viewportManager.getOptimalSize(),
  };
}
