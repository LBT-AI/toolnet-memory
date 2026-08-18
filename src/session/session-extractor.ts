/**
 * Session Extractor
 * Extracts valuable facts from session transcripts
 */

// Removed filterEventData import - we do our own filtering
import { estimateTokens, truncateByTokens } from '../work-continuity/token-budget.js';

import { Sanitizer } from '../security/sanitizer.js';
import {
  loadSessionMemoryPolicy,
  maxFactsPerSession,
  sessionSummaryMaxTokens,
} from './session-memory-policy.js';

export type FactCategory =
  'rule' | 'decision' | 'fix' | 'file' | 'blocker' | 'next_action' | 'deploy' | 'architecture';

export interface DurableFact {
  category: FactCategory;
  text: string;
  importance: number;
  sourceSessionId?: string;
}

export interface SessionExtraction {
  summary: string;
  decisions: string[];
  projectRules: string[];
  filesChanged: string[];
  bugsFixed: string[];
  commands: string[];
  blockers: string[];
  nextActions: string[];
  durableFacts: DurableFact[];
}

/**
 * Redact sensitive information from text
 */
const extractionSanitizer = new Sanitizer();

/**
 * Session extraction is itself a persistence boundary.
 *
 * Adapters may call the extractor before SessionCore's sanitized
 * WAL representation is available, therefore extraction must never
 * assume its input is already safe.
 */
function redactSensitive(text: string): string {
  const trimmed = text.trim();

  /*
   * Most adapter extraction payloads are JSON.stringify(event.data).
   *
   * Parse them whenever possible so nested keys such as:
   *
   *   token
   *   cookie
   *   password
   *   authorization
   *
   * are redacted structurally rather than with fragile text regexes.
   */
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);

      return JSON.stringify(extractionSanitizer.sanitizeValue(parsed));
    } catch {
      // Fall through to text sanitization.
    }
  }

  let result = extractionSanitizer.sanitize(text).text;

  /*
   * Defense-in-depth for JSON fragments or mixed log lines
   * that are not valid standalone JSON.
   */
  result = result
    .replace(
      /("(?:api[_-]?key|token|secret|password|cookie|authorization)"\s*:\s*)"[^"]*"/gi,
      '$1"[REDACTED]"'
    )
    .replace(
      /('(?:api[_-]?key|token|secret|password|cookie|authorization)'\s*:\s*)'[^']*'/gi,
      "$1'[REDACTED]'"
    )
    .replace(
      /\b(api[_-]?key|token|secret|password|cookie|authorization)\b\s*[:=]\s*[^\s,;]+/gi,
      '$1=[REDACTED]'
    )
    .replace(/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]');

  return result;
}

/**
 * Calculate importance score for a text fragment
 */
function calculateImportance(text: string, category: FactCategory): number {
  const lower = text.toLowerCase();
  let score = 0.5; // Base score

  // High importance keywords
  const highKeywords = [
    'nhớ',
    'remember',
    'quy tắc',
    'rule',
    'từ giờ',
    'from now',
    'không được',
    'must not',
    'luôn luôn',
    'always',
    'never',
    'critical',
    'important',
    'blocker',
    'deploy',
    'production',
    'architecture',
  ];

  for (const keyword of highKeywords) {
    if (lower.includes(keyword)) {
      score += 0.15;
    }
  }

  // Category-based scoring
  if (category === 'rule' || category === 'architecture' || category === 'blocker') {
    score += 0.2;
  } else if (category === 'decision' || category === 'deploy') {
    score += 0.15;
  } else if (category === 'fix' || category === 'next_action') {
    score += 0.1;
  }

  // Length penalty for too short or too long
  if (text.length < 20) {
    score -= 0.3;
  } else if (text.length > 500) {
    score -= 0.1;
  }

  // Noise detection
  const noisePatterns = [
    /npm (notice|warn|ERR)/i,
    /\d+ packages? in \d+/i,
    /found \d+ vulnerabilities/i,
    /up to date/i,
    /added \d+ packages/i,
    /^(ok|done|success|error|warning)$/i,
  ];

  for (const pattern of noisePatterns) {
    if (pattern.test(text)) {
      score -= 0.4;
    }
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Extract facts from filtered messages
 */
function extractFacts(messages: string[], sessionId?: string): DurableFact[] {
  const facts: DurableFact[] = [];
  const seen = new Set<string>();

  for (const msg of messages) {
    const lines = msg.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip too short
      if (trimmed.length < 15) continue;

      // Skip duplicates
      const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      // Detect category
      let category: FactCategory = 'decision';

      if (
        /\b(rule|quy tắc|policy|standard|convention)\b/i.test(trimmed) ||
        /\b(always|never|must|should|từ giờ|không được)\b/i.test(trimmed)
      ) {
        category = 'rule';
      } else if (/\b(fix|fixed|bug|issue|error|lỗi)\b/i.test(trimmed)) {
        category = 'fix';
      } else if (/\b(blocker|blocked|stuck|cannot|không thể)\b/i.test(trimmed)) {
        category = 'blocker';
      } else if (/\b(next|todo|action|task|cần làm)\b/i.test(trimmed)) {
        category = 'next_action';
      } else if (/\b(deploy|release|publish|ship)\b/i.test(trimmed)) {
        category = 'deploy';
      } else if (/\b(architecture|design|structure|pattern)\b/i.test(trimmed)) {
        category = 'architecture';
      } else if (/\.(ts|js|py|go|rs|java|cpp|c|h)\b/i.test(trimmed)) {
        category = 'file';
      }

      const importance = calculateImportance(trimmed, category);

      // Skip low importance
      if (importance < 0.3) continue;

      const redacted = redactSensitive(trimmed);

      facts.push({
        category,
        text: redacted,
        importance,
        sourceSessionId: sessionId,
      });
    }
  }

  // Sort by importance and limit
  const policy = loadSessionMemoryPolicy();
  const maxFacts = maxFactsPerSession(policy);

  return facts.sort((a, b) => b.importance - a.importance).slice(0, maxFacts);
}

/**
 * Generate summary from messages
 */
function generateSummary(messages: string[]): string {
  const policy = loadSessionMemoryPolicy();
  const maxTokens = sessionSummaryMaxTokens(policy);

  // Combine messages
  const combined = messages.join('\n\n');

  // Extract key points (simple heuristic)
  const lines = combined.split('\n').filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.length > 20 &&
      !trimmed.startsWith('npm') &&
      !trimmed.startsWith('✓') &&
      !trimmed.startsWith('Error:')
    );
  });

  const summary = lines
    .slice(0, 20)
    .map((line) => redactSensitive(line))
    .join('\n');

  // Enforce token budget only after security sanitization.
  return truncateByTokens(summary, maxTokens);
}

/**
 * Extract session memory from transcript
 */
export function extractSessionMemory(
  transcript: string | string[],
  sessionId?: string
): SessionExtraction {
  // Convert to array of messages
  const messages = Array.isArray(transcript)
    ? transcript
    : transcript.split('\n\n').filter((msg) => msg.trim());

  // Filter noise - use string directly, filterEventData handles both string and object
  const filtered = messages
    .map((msg) => {
      // If it's already a string, just filter it
      if (typeof msg === 'string') {
        return msg;
      }
      // If it's an object, stringify it
      return JSON.stringify(msg);
    })
    .filter((msg) => msg.trim());

  // Extract facts
  const durableFacts = extractFacts(filtered, sessionId);

  // Categorize facts
  const decisions = durableFacts.filter((f) => f.category === 'decision').map((f) => f.text);

  const projectRules = durableFacts.filter((f) => f.category === 'rule').map((f) => f.text);

  const filesChanged = durableFacts.filter((f) => f.category === 'file').map((f) => f.text);

  const bugsFixed = durableFacts.filter((f) => f.category === 'fix').map((f) => f.text);

  const blockers = durableFacts.filter((f) => f.category === 'blocker').map((f) => f.text);

  const nextActions = durableFacts.filter((f) => f.category === 'next_action').map((f) => f.text);

  const commands = durableFacts.filter((f) => f.category === 'deploy').map((f) => f.text);

  // Generate summary
  const summary = generateSummary(filtered);

  return {
    summary,
    decisions,
    projectRules,
    filesChanged,
    bugsFixed,
    commands,
    blockers,
    nextActions,
    durableFacts,
  };
}

/**
 * Deduplicate facts across multiple extractions
 */
export function dedupeFacts(facts: DurableFact[]): DurableFact[] {
  const seen = new Map<string, DurableFact>();

  for (const fact of facts) {
    const key = fact.text.toLowerCase().replace(/\s+/g, ' ');

    const existing = seen.get(key);
    if (!existing || fact.importance > existing.importance) {
      seen.set(key, fact);
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.importance - a.importance);
}
