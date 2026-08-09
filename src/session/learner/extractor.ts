import type { ImportanceLevel, MemoryType } from '../../core/types.js';

import { scoreImportance } from '../../processor/importance-scorer.js';

import type { NormalizedSessionEvent, SessionIdentity } from '../types.js';

import type { LearnedMemoryCandidate, LearnedMemoryKind } from './types.js';

import { sha256 } from '../utils.js';

const RULE_CRITICAL = [
  /không được/iu,
  /tuyệt đối/iu,
  /bắt buộc/iu,
  /đừng\s+/iu,
  /must not/iu,
  /do not/iu,
  /don't/iu,
  /\bnever\b/iu,
];

const RULE_PERSISTENT = [
  /từ giờ/iu,
  /về sau/iu,
  /mỗi lần/iu,
  /luôn luôn/iu,
  /\bluôn\b/iu,
  /quy tắc/iu,
  /workflow/iu,
  /\balways\b/iu,
  /\brequired\b/iu,
  /\bmust\b/iu,
  /from now on/iu,
];

const DECISION = [
  /\bchốt\b/iu,
  /quyết định/iu,
  /sẽ dùng/iu,
  /chọn .+ thay/iu,
  /đổi sang/iu,
  /chuyển sang/iu,
  /\bdecided\b/iu,
  /\bchosen\b/iu,
  /we will use/iu,
  /use .+ instead/iu,
  /switch(?:ed)? to/iu,
];

const TODO = [
  /\btodo\b/iu,
  /cần làm/iu,
  /cần thêm/iu,
  /cần sửa/iu,
  /cần kiểm tra/iu,
  /tiếp theo/iu,
  /bước tiếp theo/iu,
  /còn phải/iu,
  /còn cần/iu,
  /next step/iu,
  /\bneed to\b/iu,
  /\bremaining\b/iu,
  /follow[- ]?up/iu,
];

const FIX = [
  /đã sửa/iu,
  /đã fix/iu,
  /đã khắc phục/iu,
  /đã xử lý/iu,
  /hoàn tất/iu,
  /hoàn thành/iu,
  /\bfixed\b/iu,
  /\bresolved\b/iu,
  /\bimplemented\b/iu,
  /\bcompleted\b/iu,
  /\bpasses?\b/iu,
];

const ARCHITECTURE = [
  /kiến trúc/iu,
  /pipeline/iu,
  /adapter/iu,
  /schema/iu,
  /runtime/iu,
  /namespace/iu,
  /storage/iu,
  /lưu trữ/iu,
  /workflow/iu,
  /session core/iu,
  /memory engine/iu,
  /retrieval/iu,
];

const ARCH_ACTION = [
  /\bdùng\b/iu,
  /\btách\b/iu,
  /\bthay\b/iu,
  /\bchuyển\b/iu,
  /\blưu\b/iu,
  /\bmap\b/iu,
  /\buse\b/iu,
  /\bsplit\b/iu,
  /\bstore\b/iu,
  /\breplace\b/iu,
  /\bmove\b/iu,
];

const CONTEXT = [
  /đường dẫn/iu,
  /\bpath\b/iu,
  /\bport\b/iu,
  /\bendpoint\b/iu,
  /\bdomain\b/iu,
  /\bbucket\b/iu,
  /\brepository\b/iu,
  /\brepo\b/iu,
  /\bbranch\b/iu,
  /\/[A-Za-z0-9._/-]{4,}/u,
];

const CONTEXT_ASSIGNMENT = [
  /\blà\b/iu,
  /\bở\b/iu,
  /\bdùng\b/iu,
  /\bnằm\b/iu,
  /\bis\b/iu,
  /\buse\b/iu,
  /located/iu,
  /runs on/iu,
];

const TEXT_KEYS = new Set([
  'content',
  'text',
  'message',
  'prompt',
  'summary',
  'description',
  'reason',
  'title',
  'last_assistant_message',
  'lastAssistantMessage',
  'input_messages',
  'inputMessages',
]);

const CONTAINER_KEYS = new Set([
  'payload',
  'data',
  'content',
  'message',
  'messages',
  'parts',
  'summary',
]);

function matches(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\r/g, '')
    .replace(/^[\s>*#\-•]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fingerprintText(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}:/._-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function useful(value: string): boolean {
  if (value.length < 12 || value.length > 1000) {
    return false;
  }

  const letters = (value.match(/\p{L}/gu) ?? []).length;

  if (letters < 6) {
    return false;
  }

  if (/^(?:https?:\/\/\S+|[A-Za-z0-9+/=]{80,})$/u.test(value)) {
    return false;
  }

  return true;
}

function collectText(value: unknown, key: string | undefined, output: string[], depth = 0): void {
  if (depth > 6) {
    return;
  }

  if (typeof value === 'string') {
    if (!key || TEXT_KEYS.has(key)) {
      output.push(value);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value.slice(0, 50)) {
      collectText(item, key, output, depth + 1);
    }

    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
    if (TEXT_KEYS.has(childKey) || CONTAINER_KEYS.has(childKey)) {
      collectText(childValue, childKey, output, depth + 1);
    }
  }
}

function fragments(event: NormalizedSessionEvent): string[] {
  const raw: string[] = [];

  collectText(event.data, undefined, raw);

  const result: string[] = [];

  const seen = new Set<string>();

  for (const block of raw) {
    for (const piece of block.split(/\n+|(?<=[.!?])\s+/u)) {
      const text = normalizeText(piece);

      if (!useful(text)) {
        continue;
      }

      if (seen.has(text)) {
        continue;
      }

      seen.add(text);

      result.push(text);

      if (result.length >= 50) {
        return result;
      }
    }
  }

  return result;
}

function roleOf(event: NormalizedSessionEvent): string {
  return (event.role ?? (typeof event.data.role === 'string' ? event.data.role : '')).toLowerCase();
}

function classify(
  text: string,
  role: string,
  event: NormalizedSessionEvent
): {
  kind: LearnedMemoryKind;

  confidence: number;
} | null {
  if (event.type === 'decision') {
    return {
      kind: 'decision',

      confidence: 1,
    };
  }

  if (event.type === 'todo') {
    return {
      kind: 'todo',

      confidence: 1,
    };
  }

  const isUser = role === 'user' || event.type === 'user_prompt';

  const isAssistant = role === 'assistant' || event.type === 'assistant_message';

  if (isUser && matches(text, RULE_CRITICAL)) {
    return {
      kind: 'rule',

      confidence: 0.98,
    };
  }

  if (isUser && matches(text, RULE_PERSISTENT)) {
    return {
      kind: 'rule',

      confidence: 0.92,
    };
  }

  if (matches(text, DECISION)) {
    return {
      kind: matches(text, ARCHITECTURE) ? 'architecture' : 'decision',

      confidence: isUser ? 0.93 : 0.86,
    };
  }

  if (isUser && matches(text, TODO)) {
    return {
      kind: 'todo',

      confidence: 0.87,
    };
  }

  if (matches(text, ARCHITECTURE) && matches(text, ARCH_ACTION)) {
    return {
      kind: 'architecture',

      confidence: isUser ? 0.88 : 0.82,
    };
  }

  if (isAssistant && matches(text, FIX)) {
    return {
      kind: 'fix',

      confidence: 0.8,
    };
  }

  if (isUser && matches(text, CONTEXT) && matches(text, CONTEXT_ASSIGNMENT)) {
    return {
      kind: 'context',

      confidence: 0.79,
    };
  }

  return null;
}

function memoryType(kind: LearnedMemoryKind): MemoryType {
  switch (kind) {
    case 'rule':
      return 'rule';

    case 'decision':
    case 'architecture':
      return 'decision';

    case 'todo':
      return 'todo';

    case 'fix':
    case 'context':
      return 'code';
  }
}

function importance(kind: LearnedMemoryKind, type: MemoryType, content: string): ImportanceLevel {
  if (kind === 'rule' && matches(content, RULE_CRITICAL)) {
    return 'critical';
  }

  if (kind === 'architecture' || kind === 'decision' || kind === 'rule') {
    return 'high';
  }

  if (kind === 'fix' || kind === 'context') {
    return 'normal';
  }

  return scoreImportance(type, content);
}

export function extractLearnedMemories(
  identity: SessionIdentity,
  events: NormalizedSessionEvent[]
): LearnedMemoryCandidate[] {
  const output: LearnedMemoryCandidate[] = [];

  const fingerprints = new Set<string>();

  const messageRoles = new Map<string, string>();

  for (const event of events) {
    const messageId = typeof event.data.messageId === 'string' ? event.data.messageId : undefined;

    const role = roleOf(event);

    if (messageId && role) {
      messageRoles.set(messageId, role);
    }
  }

  for (const event of events) {
    let role = roleOf(event);

    const messageId = typeof event.data.messageId === 'string' ? event.data.messageId : undefined;

    if (!role && messageId) {
      role = messageRoles.get(messageId) ?? '';
    }

    for (const text of fragments(event)) {
      const classified = classify(text, role, event);

      if (!classified || classified.confidence < 0.75) {
        continue;
      }

      const type = memoryType(classified.kind);

      const normalized = fingerprintText(text);

      const fingerprint = sha256([identity.projectId, classified.kind, normalized].join('|'));

      if (fingerprints.has(fingerprint)) {
        continue;
      }

      fingerprints.add(fingerprint);

      const sourcePaths = event.provenance.sourcePath ? [event.provenance.sourcePath] : [];

      const sourceEventIds = event.sourceEventId ? [event.sourceEventId] : [];

      output.push({
        version: 1,

        fingerprint,

        projectId: identity.projectId,

        agent: identity.agent,

        nativeSessionId: identity.nativeSessionId,

        sessionKey: identity.sessionKey,

        kind: classified.kind,

        type,

        content: text,

        confidence: classified.confidence,

        importance: importance(classified.kind, type, text),

        /*
         * Keep decision/rule tags generic.
         * ConflictDetector uses non-generic tags as topic hints.
         */
        tags: [type],

        provenance: {
          agent: identity.agent,

          nativeSessionId: identity.nativeSessionId,

          sessionKey: identity.sessionKey,

          eventIds: [event.id],

          sourceEventIds,

          sourcePaths,

          firstSequence: event.sequence,

          lastSequence: event.sequence,
        },

        createdAt: event.timestamp,
      });
    }
  }

  return output;
}
