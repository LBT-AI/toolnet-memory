import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ansiColorsEnabled } from '../../../src/production/ui/color.js';

describe('color', () => {
  const originalEnv = process.env;
  const originalArgv = process.argv;
  const originalIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalIsTTY,
      configurable: true,
    });
  });

  describe('ansiColorsEnabled', () => {
    it('should return false when --no-color is present', () => {
      process.argv = ['node', 'script.js', '--no-color'];
      expect(ansiColorsEnabled()).toBe(false);
    });

    it('should return true when --color is present', () => {
      process.argv = ['node', 'script.js', '--color'];
      expect(ansiColorsEnabled()).toBe(true);
    });

    it('should return false when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      expect(ansiColorsEnabled()).toBe(false);
    });

    it('should return true when FORCE_COLOR is set to truthy value', () => {
      process.env.FORCE_COLOR = '1';
      expect(ansiColorsEnabled()).toBe(true);
    });

    it('should return false when FORCE_COLOR is set to 0', () => {
      process.env.FORCE_COLOR = '0';
      expect(ansiColorsEnabled()).toBe(false);
    });

    it('should return false when FORCE_COLOR is set to false', () => {
      process.env.FORCE_COLOR = 'false';
      expect(ansiColorsEnabled()).toBe(false);
    });

    it('should return true when stdout is TTY and TERM is not dumb', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        configurable: true,
      });
      process.env.TERM = 'xterm-256color';
      expect(ansiColorsEnabled()).toBe(true);
    });

    it('should return false when TERM is dumb', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        configurable: true,
      });
      process.env.TERM = 'dumb';
      delete process.env.CI;
      expect(ansiColorsEnabled()).toBe(false);
    });

    it('should return true when CI is set', () => {
      process.env.CI = 'true';
      expect(ansiColorsEnabled()).toBe(true);
    });

    it('should return false when stdout is not TTY and no overrides', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });
      delete process.env.CI;
      delete process.env.FORCE_COLOR;
      expect(ansiColorsEnabled()).toBe(false);
    });

    it('should prioritize --no-color over --color', () => {
      process.argv = ['node', 'script.js', '--color', '--no-color'];
      expect(ansiColorsEnabled()).toBe(false);
    });

    it('should prioritize --color over NO_COLOR', () => {
      process.argv = ['node', 'script.js', '--color'];
      process.env.NO_COLOR = '1';
      expect(ansiColorsEnabled()).toBe(true);
    });
  });
});
