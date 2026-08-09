/**
 * Transcript Filter - Remove noise from session transcripts
 * Filters out system messages, tool logs, ephemeral content
 */

export interface FilteredContent {
  content: string;
  filtered: boolean;
  reason?: string;
}

/**
 * Patterns to detect and filter out
 */
const NOISE_PATTERNS = [
  // System and ephemeral messages
  /^<SYSTEM MESSAGE>/i,
  /^<EPHEMERAL MESSAGE>/i,
  /^<system>/i,
  /^<ephemeral>/i,

  // Tool execution noise
  /^ManageTask:/i,
  /^Task \d+ status:/i,
  /^Task \d+ killed/i,
  /^Task \d+ loading/i,
  /^Thought for \d+ tokens/i,
  /^Prioritizing Tool Usage/i,
  /^Tool call:/i,
  /^Tool response:/i,

  // Build/npm noise
  /^npm notice/i,
  /^npm WARN/i,
  /^added \d+ packages/i,
  /^removed \d+ packages/i,
  /^up to date/i,
  /^\d+ packages are looking for funding/i,
  /^run `npm fund` for details/i,

  // Progress indicators
  /^[\d.]+%/,
  /^\[={10,}\]/,
  /^Loading\.\.\./i,
  /^Processing\.\.\./i,

  // Raw bash output
  /^bash-\d+\.\d+\$/,
  /^\$ /,

  // Empty or whitespace only
  /^\s*$/,
];

/**
 * Sensitive patterns to redact
 */
const SENSITIVE_PATTERNS = [
  /api[_-]?key[:\s=]+[^\s]+/gi,
  /token[:\s=]+[^\s]+/gi,
  /secret[:\s=]+[^\s]+/gi,
  /password[:\s=]+[^\s]+/gi,
  /bearer\s+[^\s]+/gi,
  /authorization:\s*[^\s]+/gi,
];

/**
 * Keywords indicating durable facts to keep
 */
const DURABLE_KEYWORDS = [
  'decision',
  'decided',
  'rule',
  'convention',
  'architecture',
  'pattern',
  'fixed',
  'resolved',
  'implemented',
  'created',
  'updated',
  'deleted',
  'deployed',
  'blocker',
  'blocked',
  'issue',
  'bug',
  'error',
  'next',
  'todo',
  'action',
  'requirement',
  'must',
  'should',
  'important',
];

/**
 * Check if line contains durable facts
 */
function hasDurableFacts(line: string): boolean {
  const lower = line.toLowerCase();
  return DURABLE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Check if line is noise
 */
function isNoise(line: string): boolean {
  // Empty lines
  if (!line.trim()) {
    return true;
  }

  // Check noise patterns
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(line)) {
      return true;
    }
  }

  // Keep lines with durable facts even if they match some patterns
  if (hasDurableFacts(line)) {
    return false;
  }

  // Filter repeated command output (more than 5 identical lines)
  return false;
}

/**
 * Redact sensitive information
 */
function redactSensitive(text: string): string {
  let result = text;

  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, (match) => {
      const parts = match.split(/[:\s=]+/);
      if (parts.length > 1) {
        return `${parts[0]}: [REDACTED]`;
      }
      return '[REDACTED]';
    });
  }

  return result;
}

/**
 * Filter a single line of transcript
 */
export function filterLine(line: string): FilteredContent {
  const trimmed = line.trim();

  if (!trimmed) {
    return {
      content: '',
      filtered: true,
      reason: 'empty',
    };
  }

  if (isNoise(trimmed)) {
    return {
      content: '',
      filtered: true,
      reason: 'noise',
    };
  }

  const redacted = redactSensitive(trimmed);

  return {
    content: redacted,
    filtered: false,
  };
}

/**
 * Filter entire transcript text
 */
export function filterTranscript(text: string): string {
  const lines = text.split('\n');
  const filtered: string[] = [];
  const lineCount = new Map<string, number>();

  for (const line of lines) {
    const result = filterLine(line);

    if (result.filtered) {
      continue;
    }

    // Detect repeated lines (spam)
    const normalized = result.content.toLowerCase().trim();
    const count = lineCount.get(normalized) || 0;

    if (count >= 5) {
      // Skip repeated spam
      continue;
    }

    lineCount.set(normalized, count + 1);
    filtered.push(result.content);
  }

  return filtered.join('\n');
}

/**
 * Filter session event data
 */
export function filterEventData(data: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      const result = filterLine(value);
      if (!result.filtered) {
        filtered[key] = result.content;
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      filtered[key] = filterEventData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      filtered[key] = value
        .map((item) => {
          if (typeof item === 'string') {
            const result = filterLine(item);
            return result.filtered ? null : result.content;
          }
          if (item && typeof item === 'object') {
            return filterEventData(item as Record<string, unknown>);
          }
          return item;
        })
        .filter((item) => item !== null);
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * Check if event should be filtered out entirely
 */
export function shouldFilterEvent(event: Record<string, unknown>): boolean {
  const type = typeof event.type === 'string' ? event.type.toLowerCase() : '';

  // Filter system and ephemeral events
  if (type.includes('system') || type.includes('ephemeral')) {
    return true;
  }

  // Filter tool call events (keep only results)
  if (type === 'tool_call' && !event.result) {
    return true;
  }

  // Check if data contains only noise
  if (event.data && typeof event.data === 'object') {
    const data = event.data as Record<string, unknown>;
    const content = typeof data.content === 'string' ? data.content : '';

    if (content) {
      const result = filterLine(content);
      if (result.filtered) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract durable facts from transcript
 */
export function extractDurableFacts(text: string): string[] {
  const lines = text.split('\n');
  const facts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || isNoise(trimmed)) {
      continue;
    }

    if (hasDurableFacts(trimmed)) {
      const redacted = redactSensitive(trimmed);
      facts.push(redacted);
    }
  }

  return facts;
}
