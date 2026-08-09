import { describe, expect, it } from 'vitest';

import {
  loadSessionMemoryPolicy,
  shouldArchiveRawTranscript,
  shouldPromoteDurableFact,
  maxFactsPerSession,
  sessionSummaryMaxTokens,
  shouldArchiveRemote,
} from '../../src/session/session-memory-policy.js';

describe('Session Memory Policy', () => {
  describe('loadSessionMemoryPolicy', () => {
    it('loads default policy', () => {
      const policy = loadSessionMemoryPolicy();

      expect(policy.sessionSave).toBe('summary');
      expect(policy.memoryPromotion).toBe('conservative');
      expect(policy.promoteMinScore).toBe(0.65);
      expect(policy.sessionSummaryMaxTokens).toBe(700);
      expect(policy.durableMemoryMaxItemsPerSession).toBe(10);
    });

    it('respects environment overrides', () => {
      const originalEnv = { ...process.env };

      try {
        process.env.TOOLNET_SESSION_SAVE = 'archive';
        process.env.TOOLNET_MEMORY_PROMOTION = 'aggressive';
        process.env.TOOLNET_PROMOTE_MIN_SCORE = '0.5';

        const policy = loadSessionMemoryPolicy();

        expect(policy.sessionSave).toBe('archive');
        expect(policy.memoryPromotion).toBe('aggressive');
        expect(policy.promoteMinScore).toBe(0.5);
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('shouldArchiveRawTranscript', () => {
    it('returns false by default', () => {
      const policy = loadSessionMemoryPolicy();
      expect(shouldArchiveRawTranscript(policy)).toBe(false);
    });

    it('returns true when session save is archive', () => {
      const policy = {
        ...loadSessionMemoryPolicy(),
        sessionSave: 'archive' as const,
        rawTranscript: true,
      };

      expect(shouldArchiveRawTranscript(policy)).toBe(true);
    });
  });

  describe('shouldPromoteDurableFact', () => {
    it('promotes high-scoring facts', () => {
      const policy = loadSessionMemoryPolicy();

      expect(shouldPromoteDurableFact(0.8, 'decision', policy)).toBe(true);
      expect(shouldPromoteDurableFact(0.9, 'rule', policy)).toBe(true);
    });

    it('skips low-scoring facts', () => {
      const policy = loadSessionMemoryPolicy();

      expect(shouldPromoteDurableFact(0.3, 'decision', policy)).toBe(false);
      expect(shouldPromoteDurableFact(0.5, 'file', policy)).toBe(false);
    });

    it('lowers threshold for critical categories', () => {
      const policy = loadSessionMemoryPolicy();

      // Rule category gets lower threshold
      expect(shouldPromoteDurableFact(0.6, 'rule', policy)).toBe(true);
      expect(shouldPromoteDurableFact(0.6, 'blocker', policy)).toBe(true);
      expect(shouldPromoteDurableFact(0.6, 'architecture', policy)).toBe(true);

      // Non-critical category needs higher score
      expect(shouldPromoteDurableFact(0.6, 'file', policy)).toBe(false);
    });

    it('respects promotion mode', () => {
      const conservative = {
        ...loadSessionMemoryPolicy(),
        memoryPromotion: 'conservative' as const,
      };

      const aggressive = {
        ...loadSessionMemoryPolicy(),
        memoryPromotion: 'aggressive' as const,
      };

      // Aggressive mode promotes more
      expect(shouldPromoteDurableFact(0.55, 'decision', conservative)).toBe(false);
      expect(shouldPromoteDurableFact(0.55, 'decision', aggressive)).toBe(true);
    });

    it('skips all when promotion is off', () => {
      const policy = {
        ...loadSessionMemoryPolicy(),
        memoryPromotion: 'off' as const,
      };

      expect(shouldPromoteDurableFact(0.9, 'rule', policy)).toBe(false);
      expect(shouldPromoteDurableFact(1.0, 'blocker', policy)).toBe(false);
    });
  });

  describe('maxFactsPerSession', () => {
    it('returns default limit', () => {
      const policy = loadSessionMemoryPolicy();
      expect(maxFactsPerSession(policy)).toBe(10);
    });

    it('respects custom limit', () => {
      const policy = {
        ...loadSessionMemoryPolicy(),
        durableMemoryMaxItemsPerSession: 5,
      };

      expect(maxFactsPerSession(policy)).toBe(5);
    });
  });

  describe('sessionSummaryMaxTokens', () => {
    it('returns default token limit', () => {
      const policy = loadSessionMemoryPolicy();
      expect(sessionSummaryMaxTokens(policy)).toBe(700);
    });

    it('respects custom token limit', () => {
      const policy = {
        ...loadSessionMemoryPolicy(),
        sessionSummaryMaxTokens: 500,
      };

      expect(sessionSummaryMaxTokens(policy)).toBe(500);
    });
  });

  describe('shouldArchiveRemote', () => {
    it('returns false by default', () => {
      const policy = loadSessionMemoryPolicy();
      expect(shouldArchiveRemote(policy)).toBe(false);
    });

    it('returns true when session save is full', () => {
      const policy = {
        ...loadSessionMemoryPolicy(),
        sessionSave: 'full' as const,
        archiveRemote: true,
      };

      expect(shouldArchiveRemote(policy)).toBe(true);
    });
  });
});
