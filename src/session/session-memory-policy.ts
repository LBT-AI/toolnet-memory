/**
 * Session Memory Policy
 * Controls how session data is archived and promoted to durable memory
 */

import { loadConfig } from '../core/config.js';

import {
  shouldPromoteScore,
  type CanonicalPromotionPolicy,
  type PromotionMode,
} from '../memory/promotion-policy.js';

export type SessionMemoryMode = 'off' | 'summary' | 'archive' | 'full';
export type { PromotionMode } from '../memory/promotion-policy.js';

export interface SessionMemoryPolicy {
  sessionSave: SessionMemoryMode;
  rawTranscript: boolean;
  memoryPromotion: PromotionMode;
  promoteMinScore: number;
  sessionSummaryMaxTokens: number;
  durableMemoryMaxItemsPerSession: number;
  archiveLocal: boolean;
  archiveRemote: boolean;
}

/**
 * Load session memory policy from config and environment
 */
export function loadSessionMemoryPolicy(): SessionMemoryPolicy {
  const config = loadConfig();

  // Session save mode
  const sessionSave = (process.env.TOOLNET_SESSION_SAVE || 'summary') as SessionMemoryMode;

  // Raw transcript archiving
  const rawTranscript =
    process.env.TOOLNET_RAW_TRANSCRIPT === 'on' ||
    sessionSave === 'archive' ||
    sessionSave === 'full';

  // Memory promotion mode
  const memoryPromotion = (process.env.TOOLNET_MEMORY_PROMOTION || 'conservative') as PromotionMode;

  // Minimum score for promotion
  const promoteMinScore = parseFloat(process.env.TOOLNET_PROMOTE_MIN_SCORE || '0.65');

  // Session summary max tokens
  const sessionSummaryMaxTokens = parseInt(
    process.env.TOOLNET_SESSION_SUMMARY_MAX_TOKENS || '700',
    10
  );

  // Max durable facts per session
  const durableMemoryMaxItemsPerSession = parseInt(
    process.env.TOOLNET_DURABLE_MEMORY_MAX_ITEMS_PER_SESSION || '10',
    10
  );

  // Archive location
  const archiveLocal = rawTranscript;
  const archiveRemote =
    process.env.TOOLNET_RAW_TRANSCRIPT_REMOTE === 'on' || sessionSave === 'full';

  return {
    sessionSave,
    rawTranscript,
    memoryPromotion,
    promoteMinScore,
    sessionSummaryMaxTokens,
    durableMemoryMaxItemsPerSession,
    archiveLocal,
    archiveRemote,
  };
}

/**
 * Check if raw transcript should be archived
 */
export function shouldArchiveRawTranscript(policy?: SessionMemoryPolicy): boolean {
  const p = policy || loadSessionMemoryPolicy();
  return p.rawTranscript;
}

/**
 * Check if a fact should be promoted to durable memory
 */
export function shouldPromoteDurableFact(
  score: number,
  category: string,
  policy?: SessionMemoryPolicy
): boolean {
  const current = policy ?? loadSessionMemoryPolicy();

  const canonicalPolicy: CanonicalPromotionPolicy = {
    mode: current.memoryPromotion,

    minScore: current.promoteMinScore,

    minConfidence: 0.78,
  };

  return shouldPromoteScore(score, category, canonicalPolicy);
}

/**
 * Get max facts per session
 */
export function maxFactsPerSession(policy?: SessionMemoryPolicy): number {
  const p = policy || loadSessionMemoryPolicy();
  return p.durableMemoryMaxItemsPerSession;
}

/**
 * Get session summary max tokens
 */
export function sessionSummaryMaxTokens(policy?: SessionMemoryPolicy): number {
  const p = policy || loadSessionMemoryPolicy();
  return p.sessionSummaryMaxTokens;
}

/**
 * Check if remote archive is enabled
 */
export function shouldArchiveRemote(policy?: SessionMemoryPolicy): boolean {
  const p = policy || loadSessionMemoryPolicy();
  return p.archiveRemote;
}
