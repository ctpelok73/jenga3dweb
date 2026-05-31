import { describe, it, expect } from 'vitest';
import { DEVICE_LEVELS, RENDER_QUALITY, getPhysicsSettingsForMobile, getDynamicBlockLimit } from '../mobileOptimizations';

describe('RENDER_QUALITY', () => {
  it('has settings for all device levels', () => {
    expect(RENDER_QUALITY.LOW).toBeDefined();
    expect(RENDER_QUALITY.MID).toBeDefined();
    expect(RENDER_QUALITY.HIGH).toBeDefined();
  });

  it('LOW has lowest dpr and no shadows', () => {
    expect(RENDER_QUALITY.LOW.dpr).toBeLessThan(RENDER_QUALITY.MID.dpr);
    expect(RENDER_QUALITY.LOW.shadows).toBe(false);
    expect(RENDER_QUALITY.LOW.antialias).toBe(false);
  });

  it('HIGH has highest dpr and shadows', () => {
    expect(RENDER_QUALITY.HIGH.dpr).toBeGreaterThan(RENDER_QUALITY.MID.dpr);
    expect(RENDER_QUALITY.HIGH.shadows).toBe(true);
  });

  it('maxDynamicBlocks increases with quality', () => {
    expect(RENDER_QUALITY.LOW.maxDynamicBlocks).toBeLessThan(RENDER_QUALITY.MID.maxDynamicBlocks);
    expect(RENDER_QUALITY.MID.maxDynamicBlocks).toBeLessThan(RENDER_QUALITY.HIGH.maxDynamicBlocks);
  });
});

describe('getPhysicsSettingsForMobile', () => {
  it('returns valid physics settings', () => {
    const settings = getPhysicsSettingsForMobile();
    expect(settings.timeStep).toBeGreaterThan(0);
    expect(settings.timeStep).toBeLessThanOrEqual(1/30);
    expect(settings.velocityThreshold).toBeGreaterThan(0);
  });
});

describe('getDynamicBlockLimit', () => {
  it('returns a positive number', () => {
    const limit = getDynamicBlockLimit();
    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThanOrEqual(18);
  });
});
