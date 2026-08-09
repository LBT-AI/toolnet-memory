import { describe, expect, it } from 'vitest';

import {
  extractSessionMemory,
  dedupeFacts,
  type DurableFact,
} from '../../src/session/session-extractor.js';

describe('Session Extractor', () => {
  describe('extractSessionMemory', () => {
    it('extracts facts from clean messages', () => {
      const messages = [
        'User: Remember to always use TypeScript strict mode',
        'Assistant: I will use TypeScript strict mode',
        'User: Fix the authentication bug in src/auth.ts',
        'Assistant: Fixed authentication bug',
      ];

      const extraction = extractSessionMemory(messages, 'test-session');

      expect(extraction.durableFacts.length).toBeGreaterThan(0);
      expect(extraction.summary).toBeTruthy();
    });

    it('filters npm noise', () => {
      const messages = [
        'npm notice created a lockfile',
        'npm WARN deprecated package',
        'User: Deploy to production',
        'npm ERR! code ELIFECYCLE',
      ];

      const extraction = extractSessionMemory(messages);

      // Should extract deploy command but skip npm noise
      const deployFacts = extraction.durableFacts.filter((f) =>
        f.text.toLowerCase().includes('deploy')
      );
      expect(deployFacts.length).toBeGreaterThan(0);

      const npmFacts = extraction.durableFacts.filter((f) => f.text.includes('npm'));
      expect(npmFacts.length).toBe(0);
    });

    it('redacts sensitive information', () => {
      const messages = [
        'API_KEY=sk_live_1234567890abcdef',
        'TOKEN=ghp_abcdefghijklmnopqrstuvwxyz',
        'SECRET=my-secret-value',
        'PASSWORD=hunter2',
      ];

      const extraction = extractSessionMemory(messages);

      for (const fact of extraction.durableFacts) {
        expect(fact.text).not.toContain('sk_live_');
        expect(fact.text).not.toContain('ghp_');
        expect(fact.text).not.toContain('my-secret-value');
        expect(fact.text).not.toContain('hunter2');
      }
    });

    it('scores rules highly', () => {
      const messages = [
        'User: Remember this rule: always validate input',
        'User: Just a regular comment',
      ];

      const extraction = extractSessionMemory(messages);

      const ruleFacts = extraction.durableFacts.filter((f) => f.category === 'rule');
      expect(ruleFacts.length).toBeGreaterThan(0);

      if (ruleFacts.length > 0) {
        expect(ruleFacts[0].importance).toBeGreaterThan(0.7);
      }
    });

    it('limits facts per session', () => {
      const messages = Array.from({ length: 100 }, (_, i) => `User: Task ${i + 1}`);

      const extraction = extractSessionMemory(messages);

      // Should be limited to max facts per session (default 10)
      expect(extraction.durableFacts.length).toBeLessThanOrEqual(10);
    });

    it('categorizes facts correctly', () => {
      const messages = [
        'User: Remember to use strict mode',
        'User: Fixed bug in auth.ts',
        'User: Blocker: cannot deploy',
        'User: Next action: write tests',
        'User: Deploy to production',
        'User: Architecture: use microservices',
      ];

      const extraction = extractSessionMemory(messages);

      const categories = new Set(extraction.durableFacts.map((f) => f.category));

      expect(categories.size).toBeGreaterThan(1);
    });

    it('generates summary within token budget', () => {
      const longMessages = Array.from(
        { length: 50 },
        (_, i) => `User: This is a long message number ${i + 1} with lots of content`
      );

      const extraction = extractSessionMemory(longMessages);

      expect(extraction.summary).toBeTruthy();
      // Summary should be truncated to fit budget
      expect(extraction.summary.length).toBeLessThan(5000);
    });

    it('skips too short facts', () => {
      const messages = ['ok', 'done', 'yes', 'no', 'User: This is a proper fact'];

      const extraction = extractSessionMemory(messages);

      // Should skip single-word responses
      const shortFacts = extraction.durableFacts.filter((f) => f.text.length < 15);
      expect(shortFacts.length).toBe(0);
    });
  });

  describe('dedupeFacts', () => {
    it('removes duplicate facts', () => {
      const facts: DurableFact[] = [
        {
          category: 'rule',
          text: 'Always use TypeScript',
          importance: 0.8,
        },
        {
          category: 'rule',
          text: 'Always use TypeScript',
          importance: 0.9,
        },
        {
          category: 'decision',
          text: 'Use React',
          importance: 0.7,
        },
      ];

      const deduped = dedupeFacts(facts);

      expect(deduped.length).toBe(2);
      // Should keep higher importance version
      const typescriptFact = deduped.find((f) => f.text.includes('TypeScript'));
      expect(typescriptFact?.importance).toBe(0.9);
    });

    it('normalizes text for deduplication', () => {
      const facts: DurableFact[] = [
        {
          category: 'rule',
          text: 'Always  use   TypeScript',
          importance: 0.8,
        },
        {
          category: 'rule',
          text: 'always use typescript',
          importance: 0.9,
        },
      ];

      const deduped = dedupeFacts(facts);

      expect(deduped.length).toBe(1);
    });
  });

  describe('importance scoring', () => {
    it('scores high importance keywords highly', () => {
      const highImportance = [
        'Remember this rule',
        'Always do this',
        'Never do that',
        'Critical issue',
        'Blocker found',
      ];

      for (const msg of highImportance) {
        const extraction = extractSessionMemory([msg]);
        if (extraction.durableFacts.length > 0) {
          expect(extraction.durableFacts[0].importance).toBeGreaterThan(0.6);
        }
      }
    });

    it('scores noise patterns lowly', () => {
      const noise = [
        'npm notice created lockfile',
        'npm WARN deprecated',
        'found 0 vulnerabilities',
        'up to date',
      ];

      for (const msg of noise) {
        const extraction = extractSessionMemory([msg]);
        // Should either skip or score very low
        const noiseFacts = extraction.durableFacts.filter((f) => f.text.includes('npm'));
        expect(noiseFacts.length).toBe(0);
      }
    });
  });
});
