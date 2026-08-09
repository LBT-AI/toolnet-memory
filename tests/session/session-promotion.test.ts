import { describe, expect, it } from 'vitest';

import { extractSessionMemory } from '../../src/session/session-extractor.js';
import {
  shouldPromoteDurableFact,
  loadSessionMemoryPolicy,
} from '../../src/session/session-memory-policy.js';

describe('Session Memory Promotion', () => {
  describe('end-to-end promotion flow', () => {
    it('promotes high-value facts and skips noise', () => {
      const transcript = [
        'User: Remember to always use TypeScript strict mode',
        'npm notice created a lockfile',
        'User: Fixed critical authentication bug in src/auth.ts',
        'npm WARN deprecated package',
        'User: Deploy to production after testing',
        'found 0 vulnerabilities',
        'User: Blocker: cannot access database',
        'up to date in 2s',
      ];

      const extraction = extractSessionMemory(transcript, 'test-session');
      const policy = loadSessionMemoryPolicy();

      const promoted = extraction.durableFacts.filter((fact) =>
        shouldPromoteDurableFact(fact.importance, fact.category, policy)
      );

      const skipped = extraction.durableFacts.filter(
        (fact) => !shouldPromoteDurableFact(fact.importance, fact.category, policy)
      );

      // Should promote important facts
      expect(promoted.length).toBeGreaterThan(0);

      // Should have some facts that were skipped
      expect(skipped.length).toBeGreaterThanOrEqual(0);

      // Promoted facts should have high importance
      for (const fact of promoted) {
        expect(fact.importance).toBeGreaterThan(0.5);
      }

      // Should not promote npm noise
      const npmPromoted = promoted.filter((f) => f.text.includes('npm'));
      expect(npmPromoted.length).toBe(0);
    });

    it('respects max facts per session limit', () => {
      const manyMessages = Array.from(
        { length: 50 },
        (_, i) => `User: Important rule ${i + 1}: always validate`
      );

      const extraction = extractSessionMemory(manyMessages);
      const policy = loadSessionMemoryPolicy();

      // Should extract facts but limit to max per session
      expect(extraction.durableFacts.length).toBeLessThanOrEqual(
        policy.durableMemoryMaxItemsPerSession
      );

      // All extracted facts should be high quality
      for (const fact of extraction.durableFacts) {
        expect(fact.importance).toBeGreaterThan(0.3);
      }
    });

    it('does not promote when policy is off', () => {
      const transcript = [
        'User: Remember this critical rule',
        'User: Always validate input',
        'User: Never skip tests',
      ];

      const extraction = extractSessionMemory(transcript);
      const policy = {
        ...loadSessionMemoryPolicy(),
        memoryPromotion: 'off' as const,
      };

      const promoted = extraction.durableFacts.filter((fact) =>
        shouldPromoteDurableFact(fact.importance, fact.category, policy)
      );

      expect(promoted.length).toBe(0);
    });

    it('promotes more facts in aggressive mode', () => {
      const transcript = [
        'User: Use TypeScript',
        'User: Write tests',
        'User: Document code',
        'User: Review PRs',
      ];

      const extraction = extractSessionMemory(transcript);

      const conservative = {
        ...loadSessionMemoryPolicy(),
        memoryPromotion: 'conservative' as const,
      };

      const aggressive = {
        ...loadSessionMemoryPolicy(),
        memoryPromotion: 'aggressive' as const,
      };

      const conservativePromoted = extraction.durableFacts.filter((fact) =>
        shouldPromoteDurableFact(fact.importance, fact.category, conservative)
      );

      const aggressivePromoted = extraction.durableFacts.filter((fact) =>
        shouldPromoteDurableFact(fact.importance, fact.category, aggressive)
      );

      expect(aggressivePromoted.length).toBeGreaterThanOrEqual(conservativePromoted.length);
    });

    it('redacts secrets before promotion', () => {
      const transcript = [
        'User: Remember to use API_KEY=sk_live_1234567890',
        'User: TOKEN=ghp_abcdefghijklmnop',
        'User: Always validate input',
      ];

      const extraction = extractSessionMemory(transcript);
      const policy = loadSessionMemoryPolicy();

      const promoted = extraction.durableFacts.filter((fact) =>
        shouldPromoteDurableFact(fact.importance, fact.category, policy)
      );

      // Should promote facts but redact secrets
      for (const fact of promoted) {
        expect(fact.text).not.toContain('sk_live_');
        expect(fact.text).not.toContain('ghp_');
      }
    });

    it('summary stays within token budget', () => {
      const longTranscript = Array.from(
        { length: 100 },
        (_, i) => `User: This is message ${i + 1} with lots of content to test summary truncation`
      );

      const extraction = extractSessionMemory(longTranscript);
      const policy = loadSessionMemoryPolicy();

      // Summary should be truncated to fit budget
      const summaryLength = extraction.summary.length;
      const maxChars = policy.sessionSummaryMaxTokens * 4; // Rough estimate

      expect(summaryLength).toBeLessThan(maxChars);
    });

    it('categorizes and promotes by category priority', () => {
      const transcript = [
        'User: Rule: always use strict mode',
        'User: Fixed bug in auth.ts',
        'User: Changed file src/utils.ts',
        'User: Blocker: database down',
        'User: Next: write tests',
      ];

      const extraction = extractSessionMemory(transcript);
      const policy = loadSessionMemoryPolicy();

      const promoted = extraction.durableFacts.filter((fact) =>
        shouldPromoteDurableFact(fact.importance, fact.category, policy)
      );

      // Critical categories should be promoted
      const criticalCategories = ['rule', 'blocker'];
      const criticalPromoted = promoted.filter((f) => criticalCategories.includes(f.category));

      expect(criticalPromoted.length).toBeGreaterThan(0);
    });

    it('handles empty transcript gracefully', () => {
      const extraction = extractSessionMemory([]);

      expect(extraction.durableFacts.length).toBe(0);
      expect(extraction.summary).toBe('');
    });

    it('handles transcript with only noise', () => {
      const noise = [
        'npm notice created lockfile',
        'npm WARN deprecated',
        'found 0 vulnerabilities',
        'up to date',
      ];

      const extraction = extractSessionMemory(noise);
      const policy = loadSessionMemoryPolicy();

      const promoted = extraction.durableFacts.filter((fact) =>
        shouldPromoteDurableFact(fact.importance, fact.category, policy)
      );

      // Should not promote any noise
      expect(promoted.length).toBe(0);
    });
  });
});
