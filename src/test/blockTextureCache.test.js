import { describe, it, expect, vi, beforeEach } from 'vitest';
import { textureCache, themeMapCache, clearTextureCache } from '../blockTextureCache';

beforeEach(() => {
  textureCache.clear();
  themeMapCache.clear();
});

describe('blockTextureCache', () => {
  describe('textureCache', () => {
    it('is a Map', () => {
      expect(textureCache).toBeInstanceOf(Map);
    });

    it('can store and retrieve items', () => {
      textureCache.set('key1', { value: 1 });
      expect(textureCache.get('key1')).toEqual({ value: 1 });
    });
  });

  describe('themeMapCache', () => {
    it('is a Map', () => {
      expect(themeMapCache).toBeInstanceOf(Map);
    });

    it('can store and retrieve items', () => {
      themeMapCache.set('neon', { normalMap: 'n', roughnessMap: 'r' });
      expect(themeMapCache.get('neon')).toEqual({ normalMap: 'n', roughnessMap: 'r' });
    });
  });

  describe('clearTextureCache', () => {
    it('clears textureCache', () => {
      textureCache.set('k1', {});
      textureCache.set('k2', {});
      expect(textureCache.size).toBe(2);

      clearTextureCache();

      expect(textureCache.size).toBe(0);
    });

    it('clears themeMapCache', () => {
      themeMapCache.set('classic', {
        normalMap: { dispose: vi.fn() },
        roughnessMap: { dispose: vi.fn() },
      });
      expect(themeMapCache.size).toBe(1);

      clearTextureCache();

      expect(themeMapCache.size).toBe(0);
    });

    it('calls dispose() on textureCache items that have a map', () => {
      const disposeMock = vi.fn();
      textureCache.set('k1', { map: { dispose: disposeMock } });
      textureCache.set('k2', { map: { dispose: disposeMock } });

      clearTextureCache();

      expect(disposeMock).toHaveBeenCalledTimes(2);
    });

    it('calls dispose() on themeMapCache normalMap and roughnessMap', () => {
      const normalDispose = vi.fn();
      const roughnessDispose = vi.fn();
      themeMapCache.set('classic', {
        normalMap: { dispose: normalDispose },
        roughnessMap: { dispose: roughnessDispose },
      });

      clearTextureCache();

      expect(normalDispose).toHaveBeenCalledTimes(1);
      expect(roughnessDispose).toHaveBeenCalledTimes(1);
    });

    it('handles textureCache items without map property gracefully', () => {
      textureCache.set('withoutMap', { other: 'data' });

      expect(() => clearTextureCache()).not.toThrow();
      expect(textureCache.size).toBe(0);
    });

    it('handles themeMapCache items without normalMap or roughnessMap', () => {
      themeMapCache.set('partial', { normalMap: { dispose: vi.fn() } });
      themeMapCache.set('empty', {});

      expect(() => clearTextureCache()).not.toThrow();
      expect(themeMapCache.size).toBe(0);
    });

    it('handles items where map.dispose is not a function', () => {
      textureCache.set('invalid', { map: { dispose: 'not-a-function' } });

      // Accessing a non-function as function would throw
      // The code calls props.map.dispose() which would fail if dispose is not callable
      // In jsdom, calling a string as function throws
      expect(() => clearTextureCache()).toThrow();
    });

    it('handles already empty caches', () => {
      expect(textureCache.size).toBe(0);
      expect(themeMapCache.size).toBe(0);

      expect(() => clearTextureCache()).not.toThrow();
    });

    it('clears all items from both caches after dispose', () => {
      textureCache.set('k1', { map: { dispose: vi.fn() } });
      textureCache.set('k2', {});
      themeMapCache.set('t1', { normalMap: { dispose: vi.fn() }, roughnessMap: { dispose: vi.fn() } });

      clearTextureCache();

      expect(textureCache.size).toBe(0);
      expect(themeMapCache.size).toBe(0);
    });
  });
});
