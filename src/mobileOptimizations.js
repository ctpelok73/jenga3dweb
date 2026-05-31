/**
 * mobileOptimizations.js — Комплексные оптимизации для мобильных устройств
 *
 * Добавлено:
 * - Автоматическое определение уровня устройства (low/mid/high-end)
 * - Динамическая настройка качества рендеринга
 * - Оптимизация touch-интерфейса для мобильных
 * - Управление энергопотреблением
 * - Адаптивные лимиты для физики
 */

import React from 'react';

// ─── Константы оптимизации ───
export const DEVICE_LEVELS = {
  LOW: 'low',      // 2-4 ядра, <4GB RAM, старые GPU
  MID: 'mid',      // 4-6 ядер, 4-6GB RAM, средние GPU
  HIGH: 'high',    // 6+ ядер, 6GB+ RAM, современные GPU
};

export const RENDER_QUALITY = {
  LOW: { dpr: 0.75, antialias: false, shadows: false, maxDynamicBlocks: 6 },
  MID: { dpr: 1.0, antialias: true, shadows: false, maxDynamicBlocks: 10 },
  HIGH: { dpr: 1.5, antialias: true, shadows: true, maxDynamicBlocks: 18 },
};

// ─── Проверка возможностей устройства ───
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isTouchSupported() {
  if (typeof window === 'undefined') return false;
  return (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0)
  );
}

// ─── Определение уровня устройства ───
export function getDeviceLevel() {
  if (typeof window === 'undefined') return DEVICE_LEVELS.MID;

  const { hardwareConcurrency, deviceMemory } = navigator;
  const gpuInfo = getGPUInfo();

  // Low-end: <4 cores, <3GB RAM
  if ((hardwareConcurrency || 0) < 4 || (deviceMemory || 0) < 3) {
    return DEVICE_LEVELS.LOW;
  }

  // High-end: >=8 cores, >=8GB RAM, современный GPU
  if ((hardwareConcurrency || 0) >= 8 && (deviceMemory || 0) >= 8 && gpuInfo.isModern) {
    return DEVICE_LEVELS.HIGH;
  }

  return DEVICE_LEVELS.MID;
}

// ─── Получение информации о GPU ───
function getGPUInfo() {
  if (typeof window === 'undefined' || !window.WebGLRenderingContext) {
    return { isModern: true, renderer: 'unknown' };
  }

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) {
    return { isModern: false, renderer: 'no-webgl' };
  }

  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

      // Определяем "современные" GPU
      const modernGPUKeywords = ['Adreno', 'Mali', 'PowerVR', 'Apple', 'Intel', 'NVIDIA', 'AMD'];
      const lowEndKeywords = ['PowerVR SGX', 'Mali-400', 'Mali-450', 'Adreno 2xx', 'Adreno 3xx'];

      const isLowEnd = lowEndKeywords.some(k => renderer.includes(k));
      const isModern = modernGPUKeywords.some(k => renderer.includes(k)) && !isLowEnd;

      return { isModern, renderer, vendor };
    }
  } catch (e) {
    // Ignore errors
  }

  return { isModern: true, renderer: 'unknown' };
}

// ─── Оценка производительности ───
export function getPerformanceScore() {
  if (typeof window === 'undefined') return 50;

  let score = 50;

  // CPU cores
  const cores = navigator.hardwareConcurrency || 4;
  score += Math.min(cores * 5, 20);

  // RAM
  const ram = navigator.deviceMemory || 4;
  score += Math.min((ram - 2) * 5, 15);

  // GPU (оценка на основе renderer)
  const gpu = getGPUInfo();
  if (gpu.isModern) score += 15;

  // Touch capability
  if (isTouchSupported()) score += 10;

  return Math.min(Math.max(score, 0), 100);
}

// ─── Класс для управления оптимизациями ───
export class MobileOptimizationManager {
  constructor() {
    this.deviceInfo = this.getDeviceInfo();
    this.deviceLevel = getDeviceLevel();
    this.renderQuality = RENDER_QUALITY[this.deviceLevel.toUpperCase()];
    this.listeners = [];
    this.doubleTapCleanup = null;
    this.energySaverActive = false;
  }

  getDeviceInfo() {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTouch: false,
        dpr: 1,
        screenWidth: 1920,
        screenHeight: 1080,
        isPortrait: false,
        deviceLevel: DEVICE_LEVELS.MID,
      };
    }

    return {
      isMobile: isMobileDevice(),
      isTouch: isTouchSupported(),
      dpr: window.devicePixelRatio || 1,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      isPortrait: window.innerHeight > window.innerWidth,
      deviceLevel: this.deviceLevel,
    };
  }

  // ─── Настройка viewport для мобильных ───
  setupViewport() {
    if (typeof document === 'undefined') return;

    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }

    // Оптимальные настройки для мобильных
    viewportMeta.content =
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  }

  // ─── Отключение double-tap zoom ───
  disableDoubleTapZoom() {
    if (typeof document === 'undefined') return;

    if (this.doubleTapCleanup) return this.doubleTapCleanup;

    let lastTouchEnd = 0;
    const handleTouchEnd = (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    this.doubleTapCleanup = () => {
      document.removeEventListener('touchend', handleTouchEnd, { passive: false });
      this.doubleTapCleanup = null;
    };

    return this.doubleTapCleanup;
  }

  // ─── Слушатель изменений ориентации ───
  onOrientationChange(callback) {
    if (typeof window === 'undefined') return;

    const handleChange = () => {
      this.deviceInfo = this.getDeviceInfo();
      callback(this.deviceInfo);
    };

    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);

    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  }

  // ─── Оптимизированный размер элементов ───
  getOptimalSize(minSize = 44) {
    const { screenWidth } = this.deviceInfo;
    return Math.max(minSize, screenWidth / 10);
  }

  // ─── Проверка необходимости оптимизации ───
  shouldOptimizeForMobile() {
    return this.deviceInfo.isMobile && this.deviceInfo.isTouch;
  }

  // ─── Получить настройки рендеринга для текущего устройства ───
  getRenderSettings() {
    return this.renderQuality;
  }

  // ─── Получить максимальное количество динамических блоков ───
  getMaxDynamicBlocks() {
    return this.renderQuality.maxDynamicBlocks;
  }

  // ─── Активация энергосберегающего режима ───
  activateEnergySaver() {
    this.energySaverActive = true;
    this.updateRenderQuality({ dpr: 0.6, antialias: false, shadows: false });
  }

  // ─── Деактивация энергосберегающего режима ───
  deactivateEnergySaver() {
    this.energySaverActive = false;
    this.updateRenderQuality(RENDER_QUALITY[this.deviceLevel.toUpperCase()]);
  }

  // ─── Обновление настроек рендеринга ───
  updateRenderQuality(settings) {
    this.renderQuality = { ...this.renderQuality, ...settings };
    this.notifyListeners();
  }

  // ─── Регистрация слушателей изменений ───
  addChangeListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach((cb) => cb(this.renderQuality));
  }
}

// ─── Singleton instance ───
export const mobileOptimizationManager = new MobileOptimizationManager();

// ─── React Hook для мобильной оптимизации ───
export function useMobileOptimizations() {
  const [deviceInfo, setDeviceInfo] = React.useState(() => mobileOptimizationManager.getDeviceInfo());
  const [renderSettings, setRenderSettings] = React.useState(
    mobileOptimizationManager.getRenderSettings()
  );

  React.useEffect(() => {
    mobileOptimizationManager.setupViewport();
    const cleanupDoubleTap = mobileOptimizationManager.disableDoubleTapZoom();

    const unsubscribe = mobileOptimizationManager.onOrientationChange((info) => {
      setDeviceInfo(info);
    });

    const cleanupRender = mobileOptimizationManager.addChangeListener((settings) => {
      setRenderSettings(settings);
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (cleanupDoubleTap) cleanupDoubleTap();
      if (cleanupRender) cleanupRender();
    };
  }, []);

  return {
    deviceInfo,
    shouldOptimize: mobileOptimizationManager.shouldOptimizeForMobile(),
    optimalSize: mobileOptimizationManager.getOptimalSize(),
    renderSettings,
    deviceLevel: deviceInfo.deviceLevel,
    maxDynamicBlocks: renderSettings.maxDynamicBlocks,
  };
}

// ─── Функции для интеграции с другими модулями ───

// Получить настройки физики для мобильных устройств
export function getPhysicsSettingsForMobile() {
  const deviceLevel = getDeviceLevel();

  switch (deviceLevel) {
    case DEVICE_LEVELS.LOW:
      return {
        timeStep: 1 / 30, // 30 FPS
        velocityThreshold: 0.12,
        maxIterations: 8,
        useCollisionFiltering: true,
      };
    case DEVICE_LEVELS.MID:
      return {
        timeStep: 1 / 45, // 45 FPS
        velocityThreshold: 0.09,
        maxIterations: 10,
        useCollisionFiltering: true,
      };
    case DEVICE_LEVELS.HIGH:
    default:
      return {
        timeStep: 1 / 60, // 60 FPS
        velocityThreshold: 0.06,
        maxIterations: 12,
        useCollisionFiltering: false,
      };
  }
}

// Оптимизированный лимит для динамических блоков
export function getDynamicBlockLimit() {
  const deviceLevel = getDeviceLevel();

  switch (deviceLevel) {
    case DEVICE_LEVELS.LOW:
      return 6;
    case DEVICE_LEVELS.MID:
      return 10;
    case DEVICE_LEVELS.HIGH:
    default:
      return 18;
  }
}

// Проверка, нужно ли использовать low-power режим
export function shouldUseLowPowerMode() {
  const deviceLevel = getDeviceLevel();
  return deviceLevel === DEVICE_LEVELS.LOW;
}
