import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getGlyphs, getRawWriteGlyphs, clearGlyphCache } from '../../../src/production/ui/glyphs.js';

describe('glyphs', () => {
  const originalEnv = process.env;
  const originalPlatform = process.platform;

  beforeEach(() => {
    process.env = { ...originalEnv };
    clearGlyphCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearGlyphCache();
  });

  describe('getGlyphs', () => {
    it('should return Unicode glyphs by default', () => {
      const glyphs = getGlyphs();
      expect(glyphs.barFilled).toBe('█');
      expect(glyphs.barEmpty).toBe('░');
      expect(glyphs.spinner).toContain('·');
      expect(glyphs.spinner).toContain('✢');
    });

    it('should return ASCII glyphs when TOOLNET_ASCII=1', () => {
      process.env.TOOLNET_ASCII = '1';
      clearGlyphCache();
      
      const glyphs = getGlyphs();
      expect(glyphs.barFilled).toBe('#');
      expect(glyphs.barEmpty).toBe('-');
      expect(glyphs.spinner).toContain('.');
      expect(glyphs.spinner).toContain('*');
    });

    it('should return Unicode glyphs when TOOLNET_UNICODE=1', () => {
      process.env.TOOLNET_UNICODE = '1';
      clearGlyphCache();
      
      const glyphs = getGlyphs();
      expect(glyphs.barFilled).toBe('█');
      expect(glyphs.barEmpty).toBe('░');
    });

    it('should cache the result', () => {
      const glyphs1 = getGlyphs();
      const glyphs2 = getGlyphs();
      expect(glyphs1).toBe(glyphs2);
    });
  });

  describe('getRawWriteGlyphs', () => {
    it('should return ASCII glyphs on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });
      clearGlyphCache();
      
      const glyphs = getRawWriteGlyphs();
      expect(glyphs.barFilled).toBe('#');
      expect(glyphs.barEmpty).toBe('-');
      
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });

    it('should return Unicode glyphs on non-Windows platforms', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });
      clearGlyphCache();
      
      const glyphs = getRawWriteGlyphs();
      expect(glyphs.barFilled).toBe('█');
      expect(glyphs.barEmpty).toBe('░');
      
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });
  });

  describe('glyph structure', () => {
    it('should have all required properties', () => {
      const glyphs = getGlyphs();
      expect(glyphs).toHaveProperty('spinner');
      expect(glyphs).toHaveProperty('barFilled');
      expect(glyphs).toHaveProperty('barEmpty');
      expect(glyphs).toHaveProperty('phaseDone');
      expect(glyphs).toHaveProperty('phaseActive');
      expect(glyphs).toHaveProperty('rail');
      expect(glyphs).toHaveProperty('branch');
      expect(glyphs).toHaveProperty('corner');
      expect(glyphs).toHaveProperty('dash');
    });

    it('should have spinner array with multiple glyphs', () => {
      const glyphs = getGlyphs();
      expect(Array.isArray(glyphs.spinner)).toBe(true);
      expect(glyphs.spinner.length).toBeGreaterThan(0);
    });
  });
});
