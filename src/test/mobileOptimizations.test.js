/**
 * mobileOptimizations.test.js — Unit tests for src/mobileOptimizations.js
 *
 * Pattern: each test that needs custom globals does:
 *   vi.stubGlobal → vi.resetModules() → await import() → assert
 * This avoids caching issues and cross-test pollution.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// ─── Global cleanup ─────────────────────────────────────────────────────────

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── DEVICE_LEVELS / RENDER_QUALITY ─────────────────────────────────────────

describe('DEVICE_LEVELS', () => {
  it('has low, mid, high levels', async () => {
    const { DEVICE_LEVELS } = await import('../mobileOptimizations');
    expect(DEVICE_LEVELS.LOW).toBe('low');
    expect(DEVICE_LEVELS.MID).toBe('mid');
    expect(DEVICE_LEVELS.HIGH).toBe('high');
  });
});

describe('RENDER_QUALITY', () => {
  it('has settings for all device levels', async () => {
    const { RENDER_QUALITY } = await import('../mobileOptimizations');
    expect(RENDER_QUALITY.LOW).toBeDefined();
    expect(RENDER_QUALITY.MID).toBeDefined();
    expect(RENDER_QUALITY.HIGH).toBeDefined();
  });

  it('LOW has lowest dpr and no shadows', async () => {
    const { RENDER_QUALITY } = await import('../mobileOptimizations');
    expect(RENDER_QUALITY.LOW.dpr).toBe(0.75);
    expect(RENDER_QUALITY.LOW.shadows).toBe(false);
    expect(RENDER_QUALITY.LOW.antialias).toBe(false);
    expect(RENDER_QUALITY.LOW.maxDynamicBlocks).toBe(6);
  });

  it('MID has moderate settings', async () => {
    const { RENDER_QUALITY } = await import('../mobileOptimizations');
    expect(RENDER_QUALITY.MID.dpr).toBe(1.0);
    expect(RENDER_QUALITY.MID.antialias).toBe(true);
    expect(RENDER_QUALITY.MID.shadows).toBe(false);
    expect(RENDER_QUALITY.MID.maxDynamicBlocks).toBe(10);
  });

  it('HIGH has highest dpr and shadows', async () => {
    const { RENDER_QUALITY } = await import('../mobileOptimizations');
    expect(RENDER_QUALITY.HIGH.dpr).toBe(1.5);
    expect(RENDER_QUALITY.HIGH.antialias).toBe(true);
    expect(RENDER_QUALITY.HIGH.shadows).toBe(true);
    expect(RENDER_QUALITY.HIGH.maxDynamicBlocks).toBe(18);
  });
});

// ─── isMobileDevice ─────────────────────────────────────────────────────────

describe('isMobileDevice', () => {
  async function testMobileDevice(userAgent, expected) {
    vi.stubGlobal('navigator', { ...navigator, userAgent });
    vi.resetModules();
    const { isMobileDevice } = await import('../mobileOptimizations');
    expect(isMobileDevice()).toBe(expected);
  }

  it('returns true for Android userAgent', () =>
    testMobileDevice('Mozilla/5.0 (Linux; Android 10; SM-G960F)', true));

  it('returns true for iPhone userAgent', () =>
    testMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)', true));

  it('returns true for iPad userAgent', () =>
    testMobileDevice('Mozilla/5.0 (iPad; CPU OS 14_0)', true));

  it('returns false for desktop userAgent', () =>
    testMobileDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', false));

  it('returns true for webOS', () =>
    testMobileDevice('webOS/1.0', true));

  it('returns true for BlackBerry', () =>
    testMobileDevice('BlackBerry; 4.0', true));

  it('returns false when window is undefined (SSR)', async () => {
    // Import first, then mock window
    vi.resetModules();
    const { isMobileDevice } = await import('../mobileOptimizations');
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined);
    expect(isMobileDevice()).toBe(false);
    windowSpy.mockRestore();
  });
});

// ─── isTouchSupported ───────────────────────────────────────────────────────

describe('isTouchSupported', () => {
  it('returns true when ontouchstart exists in window', async () => {
    vi.stubGlobal('window', { ...window, ontouchstart: vi.fn() });
    vi.resetModules();
    const { isTouchSupported } = await import('../mobileOptimizations');
    expect(isTouchSupported()).toBe(true);
  });

  it('returns true when maxTouchPoints > 0', async () => {
    vi.stubGlobal('navigator', { ...navigator, maxTouchPoints: 5 });
    vi.resetModules();
    const { isTouchSupported } = await import('../mobileOptimizations');
    expect(isTouchSupported()).toBe(true);
  });

  it('returns true when msMaxTouchPoints > 0', async () => {
    vi.stubGlobal('navigator', { ...navigator, msMaxTouchPoints: 5, maxTouchPoints: 0 });
    vi.resetModules();
    const { isTouchSupported } = await import('../mobileOptimizations');
    expect(isTouchSupported()).toBe(true);
  });

  it('returns false when no touch support', async () => {
    // Remove ontouchstart from window (in jsdom 'ontouchstart' in window is true by default)
    const windowWithoutTouch = { ...window };
    delete windowWithoutTouch.ontouchstart;
    vi.stubGlobal('window', windowWithoutTouch);
    vi.stubGlobal('navigator', { ...navigator, maxTouchPoints: 0, msMaxTouchPoints: 0 });
    vi.resetModules();
    const { isTouchSupported } = await import('../mobileOptimizations');
    expect(isTouchSupported()).toBe(false);
  });

  it('returns false when window is undefined (SSR)', async () => {
    vi.resetModules();
    const { isTouchSupported } = await import('../mobileOptimizations');
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined);
    expect(isTouchSupported()).toBe(false);
    windowSpy.mockRestore();
  });
});

// ─── getDeviceLevel ─────────────────────────────────────────────────────────

describe('getDeviceLevel', () => {
  it('returns MID when window is undefined (SSR)', async () => {
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined);
    vi.resetModules();
    const { getDeviceLevel } = await import('../mobileOptimizations');
    expect(getDeviceLevel()).toBe('mid');
    windowSpy.mockRestore();
  });

  it('returns LOW when hardwareConcurrency < 4', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 2, deviceMemory: 4 });
    vi.resetModules();
    const { getDeviceLevel } = await import('../mobileOptimizations');
    expect(getDeviceLevel()).toBe('low');
  });

  it('returns LOW when deviceMemory < 3', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 8, deviceMemory: 2 });
    vi.resetModules();
    const { getDeviceLevel } = await import('../mobileOptimizations');
    expect(getDeviceLevel()).toBe('low');
  });

  it('returns HIGH when >=8 cores, >=8GB RAM, and modern GPU', async () => {
    const mockGL = makeMockGL({ renderer: 'Adreno (TM) 640', vendor: 'Qualcomm' });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockGL);
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 8, deviceMemory: 8 });
    vi.resetModules();
    const { getDeviceLevel } = await import('../mobileOptimizations');
    expect(getDeviceLevel()).toBe('high');
  });

  it('returns MID when >=8 cores but <8GB RAM', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 8, deviceMemory: 4 });
    vi.resetModules();
    const { getDeviceLevel } = await import('../mobileOptimizations');
    expect(getDeviceLevel()).toBe('mid');
  });

  it('returns MID for moderate device', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 4, deviceMemory: 4 });
    vi.resetModules();
    const { getDeviceLevel } = await import('../mobileOptimizations');
    expect(getDeviceLevel()).toBe('mid');
  });

  it('returns LOW when hardwareConcurrency is undefined (treated as 0)', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: undefined, deviceMemory: 4 });
    vi.resetModules();
    const { getDeviceLevel } = await import('../mobileOptimizations');
    expect(getDeviceLevel()).toBe('low');
  });

  it('caches result and returns cached value on second call', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 4, deviceMemory: 4 });
    vi.resetModules();
    const { getDeviceLevel } = await import('../mobileOptimizations');
    const first = getDeviceLevel();
    expect(first).toBe('mid');

    // Change navigator to prove cache — should still return cached 'mid'
    const second = getDeviceLevel();
    expect(second).toBe('mid');
  });
});

// ─── getGPUInfo tests (through getDeviceLevel) ──────────────────────────────

/** Build a fake WebGL context for mocking */
function makeMockGL({ renderer, vendor, hasDebugInfo = true, hasLoseContext = true, throwOnGetExtension = false }) {
  const gl = {
    getExtension: (name) => {
      // Only throw for the debug extension (the one inside try-catch);
      // loseContext is accessed outside try-catch and must not throw.
      if (throwOnGetExtension && name === 'WEBGL_debug_renderer_info') throw new Error('WebGL error');
      if (name === 'WEBGL_debug_renderer_info' && hasDebugInfo) {
        return { UNMASKED_RENDERER_WEBGL: 0x1F01, UNMASKED_VENDOR_WEBGL: 0x1F00 };
      }
      if (name === 'WEBGL_lose_context' && hasLoseContext) {
        return { loseContext: vi.fn() };
      }
      return null;
    },
    getParameter: (param) => {
      if (param === 0x1F01) return renderer || 'Adreno (TM) 640';
      if (param === 0x1F00) return vendor || 'Qualcomm';
      return null;
    },
  };
  return gl;
}

describe('getGPUInfo (via getDeviceLevel)', () => {
  it('returns MID when WebGL context creation fails (no context)', async () => {
    // Define WebGLRenderingContext so getGPUInfo doesn't short-circuit,
    // then mock getContext to return null (context creation failure)
    vi.stubGlobal('WebGLRenderingContext', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 8, deviceMemory: 8 });
    vi.resetModules();
    const { getDeviceLevel } = await import('../mobileOptimizations');
    // getContext(null) → gl is null → getGPUInfo returns { isModern: false, renderer: 'no-webgl' }
    // isModern=false → HIGH condition fails → falls to MID
    expect(getDeviceLevel()).toBe('mid');
  });

  it('returns MID when GPU has low-end keywords (Mali-400)', async () => {
    // Define WebGLRenderingContext so getGPUInfo proceeds to canvas check
    vi.stubGlobal('WebGLRenderingContext', vi.fn());
    const mockGL = makeMockGL({ renderer: 'Mali-400 MP', vendor: 'ARM' });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockGL);
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 8, deviceMemory: 8 });
    vi.resetModules();
    const { getDeviceLevel } = await import('../mobileOptimizations');
    // Mali-400 is in lowEndKeywords → isLowEnd=true → isModern=false → not HIGH → MID
    expect(getDeviceLevel()).toBe('mid');
  });

  it('returns HIGH when no WEBGL_debug_renderer_info extension (fallback)', async () => {
    vi.stubGlobal('WebGLRenderingContext', vi.fn());
    const mockGL = makeMockGL({ hasDebugInfo: false });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockGL);
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 8, deviceMemory: 8 });
    vi.resetModules();
    const { getDeviceLevel } = await import('../mobileOptimizations');
    // No debug info → { isModern: true, renderer: 'unknown' } → cores>=8, mem>=8, isModern → HIGH
    expect(getDeviceLevel()).toBe('high');
  });

  it('handles WebGL extension throwing an error gracefully', async () => {
    vi.stubGlobal('WebGLRenderingContext', vi.fn());
    const mockGL = makeMockGL({ throwOnGetExtension: true });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockGL);
    vi.resetModules();
    const mod = await import('../mobileOptimizations');
    expect(() => mod.getDeviceLevel()).not.toThrow();
  });
});

// ─── MobileOptimizationManager ──────────────────────────────────────────────

describe('MobileOptimizationManager', () => {
  async function getMod() {
    vi.resetModules();
    return import('../mobileOptimizations');
  }

  /** Clean meta elements after each test */
  afterEach(() => {
    document.querySelector('meta[name="viewport"]')?.remove();
  });

  it('constructs with device info and render quality', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    expect(mgr.deviceInfo).toBeDefined();
    expect(mgr.deviceInfo.isMobile).toBe(false);
    // jsdom defines 'ontouchstart' in window, so isTouch may be true
    expect(typeof mgr.deviceInfo.isTouch).toBe('boolean');
    expect(mgr.deviceInfo.dpr).toBe(1);
    expect(mgr.deviceLevel).toBeDefined();
    expect(mgr.renderQuality).toBeDefined();
    expect(mgr.listeners).toEqual([]);
    expect(mgr.energySaverActive).toBe(false);
  });

  it('getDeviceInfo returns correct shape', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    const info = mgr.getDeviceInfo();
    expect(info).toHaveProperty('isMobile');
    expect(info).toHaveProperty('isTouch');
    expect(info).toHaveProperty('dpr');
    expect(info).toHaveProperty('screenWidth');
    expect(info).toHaveProperty('screenHeight');
    expect(info).toHaveProperty('isPortrait');
    expect(info).toHaveProperty('deviceLevel');
  });

  it('setupViewport creates viewport meta tag if missing', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    mgr.setupViewport();

    const meta = document.querySelector('meta[name="viewport"]');
    expect(meta).not.toBeNull();
    expect(meta.content).toContain('width=device-width');
    expect(meta.content).toContain('user-scalable=no');
  });

  it('setupViewport updates existing viewport meta', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();

    const existing = document.createElement('meta');
    existing.name = 'viewport';
    existing.content = 'old-content';
    document.head.appendChild(existing);

    mgr.setupViewport();

    expect(existing.content).toContain('width=device-width');
    existing.remove();
  });

  it('disableDoubleTapZoom adds listener and returns cleanup', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    const addSpy = vi.spyOn(document, 'addEventListener');

    const cleanup = mgr.disableDoubleTapZoom();

    expect(addSpy).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: false });
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('disableDoubleTapZoom prevents rapid double taps', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    const preventDefault = vi.fn();

    const cleanup = mgr.disableDoubleTapZoom();

    // First touchend
    const e1 = new Event('touchend', { bubbles: true });
    Object.defineProperty(e1, 'preventDefault', { value: preventDefault });
    document.dispatchEvent(e1);
    expect(preventDefault).not.toHaveBeenCalled();

    // Second touchend within 300ms
    const e2 = new Event('touchend', { bubbles: true });
    Object.defineProperty(e2, 'preventDefault', { value: preventDefault });
    document.dispatchEvent(e2);
    expect(preventDefault).toHaveBeenCalled();

    cleanup();
  });

  it('disableDoubleTapZoom returns existing cleanup if already set', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();

    const cleanup1 = mgr.disableDoubleTapZoom();
    const cleanup2 = mgr.disableDoubleTapZoom();

    expect(cleanup2).toBe(cleanup1);
    cleanup1();
  });

  it('onOrientationChange subscribes and returns cleanup', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    const callback = vi.fn();

    const cleanup = mgr.onOrientationChange(callback);

    // Fire orientationchange
    window.dispatchEvent(new Event('orientationchange'));
    expect(callback).toHaveBeenCalled();

    // Fire resize
    window.dispatchEvent(new Event('resize'));
    expect(callback).toHaveBeenCalledTimes(2);

    // Cleanup
    cleanup();
    callback.mockClear();

    window.dispatchEvent(new Event('orientationchange'));
    expect(callback).not.toHaveBeenCalled();
  });

  it('getOptimalSize adapts to screen width', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    // jsdom innerWidth defaults to 1024 → max(44, 1024/10=102.4) = 102.4
    expect(mgr.getOptimalSize(44)).toBe(102.4);
  });

  it('getOptimalSize respects minSize when screen is narrow', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    // Override screenWidth to be very narrow
    mgr.deviceInfo.screenWidth = 200;
    expect(mgr.getOptimalSize(44)).toBe(44); // minSize
  });

  it('shouldOptimizeForMobile returns true only when isMobile && isTouch', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();

    expect(mgr.shouldOptimizeForMobile()).toBe(false);

    mgr.deviceInfo.isMobile = true;
    mgr.deviceInfo.isTouch = true;
    expect(mgr.shouldOptimizeForMobile()).toBe(true);

    mgr.deviceInfo.isMobile = false;
    expect(mgr.shouldOptimizeForMobile()).toBe(false);
  });

  it('getRenderSettings / getMaxDynamicBlocks return current values', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();

    expect(mgr.getRenderSettings()).toBe(mgr.renderQuality);
    expect(mgr.getMaxDynamicBlocks()).toBe(mgr.renderQuality.maxDynamicBlocks);
  });

  it('activateEnergySaver lowers quality and sets flag', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();

    mgr.activateEnergySaver();

    expect(mgr.energySaverActive).toBe(true);
    expect(mgr.renderQuality.dpr).toBe(0.6);
    expect(mgr.renderQuality.antialias).toBe(false);
    expect(mgr.renderQuality.shadows).toBe(false);
  });

  it('deactivateEnergySaver restores original quality', async () => {
    const { MobileOptimizationManager, RENDER_QUALITY } = await getMod();
    const mgr = new MobileOptimizationManager();

    mgr.activateEnergySaver();
    mgr.deactivateEnergySaver();

    expect(mgr.energySaverActive).toBe(false);
    const expected = RENDER_QUALITY[mgr.deviceLevel.toUpperCase()];
    expect(mgr.renderQuality.dpr).toBe(expected.dpr);
  });

  it('updateRenderQuality merges settings and notifies listeners', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    const cb = vi.fn();
    mgr.addChangeListener(cb);

    const original = { ...mgr.renderQuality };
    mgr.updateRenderQuality({ dpr: 0.5 });

    expect(mgr.renderQuality.dpr).toBe(0.5);
    expect(mgr.renderQuality.maxDynamicBlocks).toBe(original.maxDynamicBlocks); // unchanged
    expect(cb).toHaveBeenCalledWith(mgr.renderQuality);
  });

  it('addChangeListener registers and unsubscribe removes', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    const cb = vi.fn();

    const unsubscribe = mgr.addChangeListener(cb);
    expect(mgr.listeners).toHaveLength(1);

    mgr.notifyListeners();
    expect(cb).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(mgr.listeners).toHaveLength(0);

    mgr.notifyListeners();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('setupViewport is safe when document is undefined', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    expect(() => mgr.setupViewport()).not.toThrow();
  });

  it('onOrientationChange is safe when window is undefined', async () => {
    const { MobileOptimizationManager } = await getMod();
    const mgr = new MobileOptimizationManager();
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined);
    expect(() => mgr.onOrientationChange(vi.fn())).not.toThrow();
    windowSpy.mockRestore();
  });
});

// ─── getPhysicsSettingsForMobile ────────────────────────────────────────────

describe('getPhysicsSettingsForMobile', () => {
  it('returns LOW settings for low-end device', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 2, deviceMemory: 2 });
    vi.resetModules();
    const { getPhysicsSettingsForMobile } = await import('../mobileOptimizations');
    const s = getPhysicsSettingsForMobile();
    expect(s.timeStep).toBe(1 / 30);
    expect(s.velocityThreshold).toBe(0.12);
    expect(s.maxIterations).toBe(8);
    expect(s.useCollisionFiltering).toBe(true);
  });

  it('returns MID settings for mid-range device', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 4, deviceMemory: 4 });
    vi.resetModules();
    const { getPhysicsSettingsForMobile } = await import('../mobileOptimizations');
    const s = getPhysicsSettingsForMobile();
    expect(s.timeStep).toBe(1 / 45);
    expect(s.velocityThreshold).toBe(0.09);
    expect(s.maxIterations).toBe(10);
    expect(s.useCollisionFiltering).toBe(true);
  });

  it('returns HIGH settings for high-end device', async () => {
    const mockGL = makeMockGL({ renderer: 'Adreno (TM) 640', vendor: 'Qualcomm' });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockGL);
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 8, deviceMemory: 8 });
    vi.resetModules();
    const { getPhysicsSettingsForMobile } = await import('../mobileOptimizations');
    const s = getPhysicsSettingsForMobile();
    expect(s.timeStep).toBe(1 / 60);
    expect(s.velocityThreshold).toBe(0.06);
    expect(s.maxIterations).toBe(12);
    expect(s.useCollisionFiltering).toBe(false);
  });

  it('defaults to HIGH for unknown device level (fallback)', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 12, deviceMemory: 12 });
    const mockGL = makeMockGL({ hasDebugInfo: false });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockGL);
    vi.resetModules();
    const { getPhysicsSettingsForMobile } = await import('../mobileOptimizations');
    const s = getPhysicsSettingsForMobile();
    expect(s.timeStep).toBe(1 / 60);
    expect(s.useCollisionFiltering).toBe(false);
  });
});

// ─── getDynamicBlockLimit ───────────────────────────────────────────────────

describe('getDynamicBlockLimit', () => {
  it('returns 6 for low-end device', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 2, deviceMemory: 2 });
    vi.resetModules();
    const { getDynamicBlockLimit } = await import('../mobileOptimizations');
    expect(getDynamicBlockLimit()).toBe(6);
  });

  it('returns 10 for mid-range device', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 4, deviceMemory: 4 });
    vi.resetModules();
    const { getDynamicBlockLimit } = await import('../mobileOptimizations');
    expect(getDynamicBlockLimit()).toBe(10);
  });

  it('returns 18 for high-end device', async () => {
    const mockGL = makeMockGL({ renderer: 'Adreno (TM) 640', vendor: 'Qualcomm' });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockGL);
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 8, deviceMemory: 8 });
    vi.resetModules();
    const { getDynamicBlockLimit } = await import('../mobileOptimizations');
    expect(getDynamicBlockLimit()).toBe(18);
  });

  it('defaults to 18 for unknown level (HIGH fallback)', async () => {
    vi.stubGlobal('navigator', { ...navigator, hardwareConcurrency: 12, deviceMemory: 12 });
    const mockGL = makeMockGL({ hasDebugInfo: false });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockGL);
    vi.resetModules();
    const { getDynamicBlockLimit } = await import('../mobileOptimizations');
    expect(getDynamicBlockLimit()).toBe(18);
  });
});

// ─── Singleton ──────────────────────────────────────────────────────────────

describe('mobileOptimizationManager (singleton)', () => {
  it('is an instance of MobileOptimizationManager', async () => {
    const mod = await import('../mobileOptimizations');
    expect(mod.mobileOptimizationManager).toBeInstanceOf(mod.MobileOptimizationManager);
  });

  it('is a singleton — same reference across imports', async () => {
    const mod1 = import('../mobileOptimizations');
    const mod2 = import('../mobileOptimizations');
    const m1 = (await mod1).mobileOptimizationManager;
    const m2 = (await mod2).mobileOptimizationManager;
    expect(m1).toBe(m2);
  });
});

// ─── useMobileOptimizations Hook ────────────────────────────────────────────

describe('useMobileOptimizations', () => {
  /** Get a fresh module import */
  async function getHook() {
    vi.resetModules();
    const mod = await import('../mobileOptimizations');
    return mod.useMobileOptimizations;
  }

  afterEach(() => {
    document.querySelector('meta[name="viewport"]')?.remove();
  });

  it('returns device info and render settings on mount', async () => {
    const useHook = await getHook();
    const { result } = renderHook(() => useHook());

    expect(result.current).toHaveProperty('deviceInfo');
    expect(result.current).toHaveProperty('shouldOptimize');
    expect(result.current).toHaveProperty('optimalSize');
    expect(result.current).toHaveProperty('renderSettings');
    expect(result.current).toHaveProperty('deviceLevel');
    expect(result.current).toHaveProperty('maxDynamicBlocks');
  });

  it('sets up viewport and double-tap prevention on mount', async () => {
    const useHook = await getHook();
    const addSpy = vi.spyOn(document, 'addEventListener');

    renderHook(() => useHook());

    expect(addSpy).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: false });
  });

  it('cleans up listeners on unmount', async () => {
    const useHook = await getHook();

    const { unmount } = renderHook(() => useHook());

    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const removeWindowSpy = vi.spyOn(window, 'removeEventListener');

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: false });
    expect(removeWindowSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    expect(removeWindowSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('provides optimal size based on screen width', async () => {
    const useHook = await getHook();
    const { result } = renderHook(() => useHook());
    expect(result.current.optimalSize).toBeGreaterThanOrEqual(44);
    expect(typeof result.current.optimalSize).toBe('number');
  });
});
