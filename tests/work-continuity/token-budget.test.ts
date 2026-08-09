import { describe, expect, it } from 'vitest';

import {
  estimateTokens,
  truncateByTokens,
  compactBullets,
  enforceContextBudget,
  createMinimalContext,
  createFocusedContext,
  createDeepContext,
  type ContextSection,
} from '../../src/work-continuity/token-budget.js';

describe('Token Budget', () => {
  describe('estimateTokens', () => {
    it('estimates tokens for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('estimates tokens for short text', () => {
      const text = 'Hello world';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('estimates tokens for long text', () => {
      const text = 'a'.repeat(1000);
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(200);
      expect(tokens).toBeLessThan(400);
    });
  });

  describe('truncateByTokens', () => {
    it('does not truncate if within budget', () => {
      const text = 'Short text';
      const result = truncateByTokens(text, 100);
      expect(result).toBe(text);
    });

    it('truncates text exceeding budget', () => {
      const text = 'a'.repeat(1000);
      const result = truncateByTokens(text, 50);
      expect(result.length).toBeLessThan(text.length);
      expect(estimateTokens(result)).toBeLessThanOrEqual(50);
    });

    it('tries to break at sentence boundary', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = truncateByTokens(text, 5);
      expect(result).toContain('.');
    });
  });

  describe('compactBullets', () => {
    it('keeps all lines if within limit', () => {
      const text = '- Item 1\n- Item 2\n- Item 3';
      const result = compactBullets(text, 5);
      expect(result).toBe(text);
    });

    it('truncates to max lines', () => {
      const text = '- Item 1\n- Item 2\n- Item 3\n- Item 4\n- Item 5';
      const result = compactBullets(text, 3);
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
      expect(result).toContain('Item 3');
      expect(result).toContain('2 more items omitted');
    });
  });

  describe('enforceContextBudget', () => {
    it('includes all sections if within budget', () => {
      const sections: ContextSection[] = [
        { title: 'Section 1', content: 'Short content', priority: 100 },
        { title: 'Section 2', content: 'More content', priority: 90 },
      ];

      const result = enforceContextBudget(sections, { maxTokens: 1000 });
      expect(result).toContain('Section 1');
      expect(result).toContain('Section 2');
      expect(result).not.toContain('[Context trimmed');
    });

    it('prioritizes high-priority sections', () => {
      const sections: ContextSection[] = [
        { title: 'Low Priority', content: 'a'.repeat(500), priority: 10 },
        { title: 'High Priority', content: 'Important', priority: 100 },
      ];

      const result = enforceContextBudget(sections, { maxTokens: 50 });
      expect(result).toContain('High Priority');
      expect(result).toContain('Important');
    });

    it('adds trim marker when content is truncated', () => {
      const sections: ContextSection[] = [
        { title: 'Section 1', content: 'a'.repeat(1000), priority: 100 },
      ];

      const result = enforceContextBudget(sections, { maxTokens: 50 });
      expect(result).toContain('[Context trimmed by ToolNet Memory token budget]');
    });
  });

  describe('createMinimalContext', () => {
    it('creates minimal context within 800 tokens', () => {
      const profile = '- Rule 1\n- Rule 2\n- Rule 3';
      const current = '- Task 1\n- Task 2';

      const result = createMinimalContext(profile, current);
      const tokens = estimateTokens(result);

      expect(tokens).toBeLessThanOrEqual(800);
      expect(result).toContain('Profile');
      expect(result).toContain('Current Work');
    });

    it('compacts long profile', () => {
      const profile = Array.from({ length: 50 }, (_, i) => `- Rule ${i + 1}`).join('\n');
      const current = '- Task 1';

      const result = createMinimalContext(profile, current);
      const tokens = estimateTokens(result);

      expect(tokens).toBeLessThanOrEqual(800);
      expect(result).toContain('more items omitted');
    });
  });

  describe('createFocusedContext', () => {
    it('creates focused context within 1200 tokens', () => {
      const profile = '- Rule 1\n- Rule 2';
      const current = '- Task 1';
      const memory = ['Memory 1', 'Memory 2', 'Memory 3', 'Memory 4'];

      const result = createFocusedContext(profile, current, memory);
      const tokens = estimateTokens(result);

      expect(tokens).toBeLessThanOrEqual(1200);
      expect(result).toContain('Profile');
      expect(result).toContain('Current Work');
      expect(result).toContain('Context 1');
    });

    it('limits to top 3 memory items', () => {
      const profile = '- Rule 1';
      const current = '- Task 1';
      const memory = ['Memory 1', 'Memory 2', 'Memory 3', 'Memory 4', 'Memory 5'];

      const result = createFocusedContext(profile, current, memory);

      expect(result).toContain('Context 1');
      expect(result).toContain('Context 2');
      expect(result).toContain('Context 3');
      expect(result).not.toContain('Memory 4');
      expect(result).not.toContain('Memory 5');
    });
  });

  describe('createDeepContext', () => {
    it('creates deep context within 4000 tokens', () => {
      const profile = '- Rule 1\n- Rule 2';
      const current = '- Task 1';
      const brief = 'Brief summary';
      const handoff = 'Handoff notes';

      const result = createDeepContext(profile, current, brief, handoff);
      const tokens = estimateTokens(result);

      expect(tokens).toBeLessThanOrEqual(4000);
      expect(result).toContain('Profile');
      expect(result).toContain('Current Work');
      expect(result).toContain('Brief');
      expect(result).toContain('Handoff');
    });

    it('truncates if exceeding 4000 tokens', () => {
      const profile = 'a'.repeat(5000);
      const current = 'b'.repeat(5000);
      const brief = 'c'.repeat(5000);
      const handoff = 'd'.repeat(5000);

      const result = createDeepContext(profile, current, brief, handoff);
      const tokens = estimateTokens(result);

      // Allow small overhead for headers/separators
      expect(tokens).toBeLessThanOrEqual(4100);
      expect(result).toContain('[Context trimmed');
    });
  });
});
