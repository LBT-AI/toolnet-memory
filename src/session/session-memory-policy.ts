/**
 * Session Memory Policy
 * Controls how session data is archived and promoted to durable memory
 */

import { loadConfig } from '../core/config.js';

export type SessionMemoryMode = 'off' | 'summary' | 'archive' | 'full';
export type PromotionMode = 'off' | 'conservative' | 'balanced' | 'aggressive';

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
  const sessionSave = (process.env.TOOLNET_SESSION_SAVE ||
    'summary') as SessionMemoryMode;

  // Raw transcript archiving
  const rawTranscript =
    process.env.TOOLNET_RAW_TRANSCRIPT === 'on' ||
    sessionSave === 'archive' ||
    sessionSave === 'full';

  // Memory promotion mode
  const memoryPromotion = (process.env.TOOLNET_MEMORY_PROMOTION ||
    'conservative') as PromotionMode;

  // Minimum score for promotion
  const promoteMinScore = parseFloat(
    process.env.TOOLNET_PROMOTE_MIN_SCORE || '0.65'
  );

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
  const p = policy || loadSessionMemoryPolicy();

  if (p.memoryPromotion === 'off') {
    return false;
  }

  // Adjust threshold based on promotion mode
  let threshold = p.promoteMinScore;

  if (p.memoryPromotion === 'aggressive') {
    threshold = Math.max(0.5, threshold - 0.15);
  } else if (p.memoryPromotion === 'balanced') {
    threshold = Math.max(0.55, threshold - 0.1);
  }

  // Critical categories have lower threshold
  const criticalCategories = ['rule', 'blocker', 'architecture', 'deploy'];
  if (criticalCategories.includes(category)) {
    threshold = Math.max(0.5, threshold - 0.1);
  }

  return score >= threshold;
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
