import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createShimmerProgress } from '../../../src/production/ui/shimmer-progress.js';

describe('shimmer-progress', () => {
  const originalIsTTY = process.stdout.isTTY;
  const originalWrite = process.stdout.write;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalIsTTY,
      configurable: true,
    });
    process.stdout.write = originalWrite;
  });

  describe('non-TTY mode', () => {
    it('should output plain text without ANSI codes', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });

      const writes: string[] = [];
      process.stdout.write = ((chunk: string) => {
        writes.push(chunk);
        return true;
      }) as any;

      const progress = createShimmerProgress();

      progress.onProgress({ stage: 'scan', current: 100, total: 0 });
      progress.onProgress({ stage: 'parse', current: 50, total: 100 });
      progress.onProgress({ stage: 'type-resolution', current: 0, total: 0 });

      // Should output plain text lines
      expect(writes.some((w) => w.includes('Scanning files'))).toBe(true);
      expect(writes.some((w) => w.includes('Parsing code'))).toBe(true);
      expect(writes.some((w) => w.includes('Type Resolution'))).toBe(true);

      // Should not contain ANSI escape codes
      const allOutput = writes.join('');
      expect(allOutput).not.toMatch(/\x1b\[/);
    });

    it('should not repeat stage names', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });

      const writes: string[] = [];
      process.stdout.write = ((chunk: string) => {
        writes.push(chunk);
        return true;
      }) as any;

      const progress = createShimmerProgress();

      // Same stage multiple times
      progress.onProgress({ stage: 'parse', current: 10, total: 100 });
      progress.onProgress({ stage: 'parse', current: 20, total: 100 });
      progress.onProgress({ stage: 'parse', current: 30, total: 100 });

      // Should only output once
      const parseLines = writes.filter((w) => w.includes('Parsing code'));
      expect(parseLines.length).toBe(1);
    });
  });

  describe('TTY mode', () => {
    // Skip worker tests in CI - they require tsx loader which isn't available in worker context
    it.skip('should use worker thread for animation', async () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        configurable: true,
      });

      const writes: string[] = [];
      process.stdout.write = ((chunk: string) => {
        writes.push(chunk);
        return true;
      }) as any;

      const progress = createShimmerProgress();

      progress.onProgress({ stage: 'scan', current: 100, total: 0 });

      // Give worker time to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      await progress.stop();

      // Should have written completed stage line
      const allOutput = writes.join('');
      expect(allOutput).toMatch(/Scanning files/);
    });

    // Skip worker tests in CI - they require tsx loader which isn't available in worker context
    it.skip('should handle stage transitions', async () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        configurable: true,
      });

      const writes: string[] = [];
      process.stdout.write = ((chunk: string) => {
        writes.push(chunk);
        return true;
      }) as any;

      const progress = createShimmerProgress();

      progress.onProgress({ stage: 'scan', current: 100, total: 0 });
      await new Promise((resolve) => setTimeout(resolve, 50));

      progress.onProgress({ stage: 'parse', current: 50, total: 100 });
      await new Promise((resolve) => setTimeout(resolve, 50));

      await progress.stop();

      const allOutput = writes.join('');

      // Should have completed scan stage
      expect(allOutput).toMatch(/Scanning files/);

      // Should have completed parse stage
      expect(allOutput).toMatch(/Parsing code/);
    });
  });

  describe('progress reporting', () => {
    it('should handle percentage-based progress', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });

      const writes: string[] = [];
      process.stdout.write = ((chunk: string) => {
        writes.push(chunk);
        return true;
      }) as any;

      const progress = createShimmerProgress();

      progress.onProgress({ stage: 'parse', current: 50, total: 100 });

      // Should output stage name
      expect(writes.some((w) => w.includes('Parsing code'))).toBe(true);
    });

    it('should handle count-based progress', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });

      const writes: string[] = [];
      process.stdout.write = ((chunk: string) => {
        writes.push(chunk);
        return true;
      }) as any;

      const progress = createShimmerProgress();

      progress.onProgress({ stage: 'scan', current: 604, total: 0 });

      // Should output stage name
      expect(writes.some((w) => w.includes('Scanning files'))).toBe(true);
    });
  });

  describe('stage mapping', () => {
    it('should map all ToolNet stages correctly', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });

      const writes: string[] = [];
      process.stdout.write = ((chunk: string) => {
        writes.push(chunk);
        return true;
      }) as any;

      const progress = createShimmerProgress();

      const stages = [
        'scan',
        'parse',
        'type-resolution',
        'rich-graph',
        'semantic-index',
        'architecture',
        'graph-analysis',
        'visualization',
      ];

      stages.forEach((stage) => {
        progress.onProgress({ stage, current: 0, total: 0 });
      });

      const allOutput = writes.join('');

      // Verify all stages are present
      expect(allOutput).toMatch(/Scanning files/);
      expect(allOutput).toMatch(/Parsing code/);
      expect(allOutput).toMatch(/Type Resolution/);
      expect(allOutput).toMatch(/Rich Graph/);
      expect(allOutput).toMatch(/Semantic Code Index/);
      expect(allOutput).toMatch(/Architecture Intelligence/);
      expect(allOutput).toMatch(/Graph Analysis/);
      expect(allOutput).toMatch(/3D Visualization Dataset/);
    });
  });
});
