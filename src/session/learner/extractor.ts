import type { ImportanceLevel, MemoryType } from '../../core/types.js';

import { scoreImportance } from '../../processor/importance-scorer.js';

import type { NormalizedSessionEvent, SessionIdentity } from '../types.js';

import type { LearnedMemoryCandidate, LearnedMemoryKind } from './types.js';

import { sha256 } from '../utils.js';

import { hasSecretContent } from '../../memory/promotion-policy.js';

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

const NEXT_ACTION = [
  /tiếp theo/iu,
  /bước tiếp theo/iu,
  /việc tiếp theo/iu,
  /sau đó cần/iu,
  /next step/iu,
  /next action/iu,
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
  /\bprovider\b/iu,
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

/*
 * Phase 86D durable knowledge kinds.
 *
 * A lasting requirement is a positive, durable expectation ("the API must
 * support X"). It is deliberately distinct from a rule/constraint ("never do
 * Y") because a requirement stays valid even while the implementation is
 * broken, so a bug observation must never supersede it.
 */
const REQUIREMENT = [
  /\byêu cầu\b/iu,
  /\bphải (?:hỗ trợ|đảm bảo|có|duy trì|giữ)\b/iu,
  /\bcần (?:hỗ trợ|đảm bảo)\b/iu,
  /\brequirements?\b/iu,
  /\bmust (?:support|remain|keep|stay|preserve|continue)\b/iu,
  /\bshould (?:support|remain|keep|stay)\b/iu,
  /\bneed(?:s)? to (?:support|remain|keep|stay)\b/iu,
];

const ROOT_CAUSE = [
  /nguyên nhân/iu,
  /\broot cause\b/iu,
  /\bcaused by\b/iu,
  /\bbecause of\b/iu,
  /\bthe reason (?:is|was)\b/iu,
  /\blỗi do\b/iu,
  /\bdo\b[^.]{1,48}\bgây ra\b/iu,
];

const BLOCKER = [
  /\bblockers?\b/iu,
  /\bblocked\b/iu,
  /\bblocking\b/iu,
  /\bwaiting (?:on|for)\b/iu,
  /\bđang bị chặn\b/iu,
  /\bbị chặn\b/iu,
  /\bkhông thể tiếp tục\b/iu,
];

const DEPLOY = [
  /\bdeploy(?:ed|ing|ment)?\b/iu,
  /\btriển khai\b/iu,
  /\breleased?\b/iu,
  /\brelease\b/iu,
  /\bproduction\b/iu,
  /\bprod\b/iu,
];

const DEPLOY_VERSION = /\bv?(\d+\.\d+\.\d+)\b/u;

const HANDOFF = [
  /\bhandoff\b/iu,
  /\bbàn giao\b/iu,
  /\bnext session\b/iu,
  /\bsession summary\b/iu,
  /\bcontinue in (?:a )?(?:new|next) session\b/iu,
];

/*
 * Ephemeral chat noise. This is a deterministic pre-filter: greetings,
 * acknowledgements, self-narration and raw command output never carry durable
 * knowledge, so they must not even become candidates.
 */
const GREETING =
  /^(?:hi|hello|hey|yo|chào|xin chào|good morning|good afternoon|good evening)\b[\s!.,]*$/iu;

const ACKNOWLEDGEMENT =
  /^(?:ok(?:ay)?|oke|k|thanks|thank you|thanks!|cảm ơn|got it|sure|yes|yeah|no|nope|yep|được|vâng|dạ|cool|nice|great)\b[\s!.,]*$/iu;

const PROGRESS_NARRATION =
  /^(?:i(?:'m| am) (?:now |currently )?(?:editing|updating|reading|writing|running|checking|looking|searching)|let me (?:now )?(?:update|edit|read|run|check|search)|đang (?:sửa|đọc|chạy|kiểm tra|cập nhật))/iu;

const COMMAND_OUTPUT =
  /(?:^|\n)\s*\$\s|\bnpm (?:notice|warn|error|ERR!)\b|\badded \d+ packages\b|\bpackages in \d+(?:\.\d+)?s\b|\bfound \d+ vulnerabilities?\b|\bnode_modules\b/iu;

/*
 * Deterministic structured identity for keyed operational facts.
 *
 * `subject = value` (or `subject: value` for keyed identifiers) gives the
 * conflict detector a class-independent identity, so a changed value is an
 * update (supersession) while a different subject stays a separate fact.
 */
const SUBJECT_EQUALS = /\b([A-Za-z][A-Za-z0-9_.-]{2,39})\s*=\s*([^\s,;=]{1,80})/u;

const SUBJECT_KEYED = /\b([A-Za-z][A-Za-z0-9]*(?:[_.-][A-Za-z0-9]+)+)\s*[:=]\s*([^\s,;=]{1,80})/u;

const SUBJECT_BLOCKLIST = new Set([
  'blocker',
  'blockers',
  'rule',
  'rules',
  'decision',
  'decisions',
  'todo',
  'requirement',
  'requirements',
  'root_cause',
  'note',
  'notes',
  'fix',
  'fixes',
  'handoff',
  'step',
  'steps',
]);

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

function isNoise(value: string): boolean {
  if (GREETING.test(value) || ACKNOWLEDGEMENT.test(value)) {
    return true;
  }

  if (COMMAND_OUTPUT.test(value)) {
    return true;
  }

  if (value.length <= 160 && PROGRESS_NARRATION.test(value)) {
    return true;
  }

  return false;
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

  if (isNoise(value)) {
    return false;
  }

  return true;
}

function normalizeSubject(value: string): string | undefined {
  const normalized = value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[.\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!/^[a-z][a-z0-9_]{2,39}$/u.test(normalized)) {
    return undefined;
  }

  if (SUBJECT_BLOCKLIST.has(normalized)) {
    return undefined;
  }

  return normalized;
}

function subjectOf(
  kind: LearnedMemoryKind,
  text: string
): { subject: string; value: string } | undefined {
  const equals = SUBJECT_EQUALS.exec(text);

  if (equals) {
    const subject = normalizeSubject(equals[1]);

    if (subject) {
      return { subject, value: equals[2].trim() };
    }
  }

  const keyed = SUBJECT_KEYED.exec(text);

  if (keyed) {
    const subject = normalizeSubject(keyed[1]);

    if (subject) {
      return { subject, value: keyed[2].trim() };
    }
  }

  /*
   * A deployment fact is keyed by the version it shipped. Two deploy facts
   * therefore share the `version` subject and the newer one supersedes the
   * older, which is exactly the currentness rule we want.
   */
  if (kind === 'deploy') {
    const version = DEPLOY_VERSION.exec(text);

    if (version) {
      return { subject: 'version', value: version[1] };
    }
  }

  return undefined;
}

function collectText(value: unknown, key: string | undefined, output: string[], depth = 0): void {
  if (depth > 6) {
    return;
  }

  if (typeof value === 'string' && key && !TEXT_KEYS.has(key)) {
    return;
  }

  if (typeof value === 'string') {
    output.push(value);

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

  if (matches(text, BLOCKER)) {
    return {
      kind: 'blocker',
      confidence: 0.9,
    };
  }

  if (matches(text, ROOT_CAUSE)) {
    return {
      kind: 'root_cause',
      confidence: 0.85,
    };
  }

  if (matches(text, REQUIREMENT)) {
    return {
      kind: 'requirement',
      confidence: isUser ? 0.9 : 0.82,
    };
  }

  if (matches(text, HANDOFF)) {
    return {
      kind: 'handoff',
      confidence: 0.85,
    };
  }

  if (isUser && matches(text, NEXT_ACTION)) {
    return {
      kind: 'next_action',
      confidence: 0.88,
    };
  }
  if (isUser && matches(text, TODO)) {
    return {
      kind: 'todo',
      confidence: 0.87,
    };
  }

  if (matches(text, DEPLOY) && DEPLOY_VERSION.test(text)) {
    return {
      kind: 'deploy',
      confidence: 0.86,
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

function evidenceFor(
  kind: LearnedMemoryKind,
  role: string,
  event: NormalizedSessionEvent
): LearnedMemoryCandidate['evidence'] {
  const isUser = role === 'user' || event.type === 'user_prompt';

  const isAssistant = role === 'assistant' || event.type === 'assistant_message';

  const sourceVerified =
    Boolean(event.provenance.sourcePath) &&
    (kind === 'architecture' ||
      kind === 'context' ||
      kind === 'fix' ||
      kind === 'root_cause' ||
      kind === 'deploy');

  const testVerified =
    (kind === 'fix' || kind === 'root_cause' || kind === 'deploy') &&
    /(?:test|tests|pass|passed|passing|verified|confirmed)/iu.test(JSON.stringify(event.data));

  return {
    userExplicit: isUser,

    sourceVerified,

    testVerified,

    crossSessionConfirmations: 1,

    assistantDerived: isAssistant,
  };
}

function memoryType(kind: LearnedMemoryKind): MemoryType {
  switch (kind) {
    case 'rule':
    case 'requirement':
      return 'rule';

    case 'decision':
    case 'architecture':
    case 'deploy':
      return 'decision';

    case 'todo':
    case 'next_action':
    case 'blocker':
      return 'todo';

    case 'fix':
    case 'context':
    case 'root_cause':
      return 'code';

    case 'handoff':
      return 'summary';
  }
}

function importance(kind: LearnedMemoryKind, type: MemoryType, content: string): ImportanceLevel {
  if (kind === 'rule' && matches(content, RULE_CRITICAL)) {
    return 'critical';
  }

  if (
    kind === 'architecture' ||
    kind === 'decision' ||
    kind === 'rule' ||
    kind === 'requirement' ||
    kind === 'blocker' ||
    kind === 'deploy'
  ) {
    return 'high';
  }

  if (kind === 'fix' || kind === 'context' || kind === 'root_cause' || kind === 'handoff') {
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

      /*
       * Secret safety. A candidate is written to the immutable learned
       * journal on disk, so a secret must never even become a candidate —
       * the policy gate would reject it later, but by then it would already
       * have been persisted raw.
       */
      if (hasSecretContent(text)) {
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

      const subject = subjectOf(classified.kind, text);

      const tags: string[] = [type];

      if (subject) {
        tags.push(`subject:${subject.subject}`);
      }

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

        evidence: evidenceFor(classified.kind, role, event),

        subject: subject?.subject,

        subjectValue: subject?.value,

        /*
         * Keep decision/rule tags generic. ConflictDetector uses non-generic
         * tags as topic hints, and the `subject:` tag as structured identity.
         */
        tags,

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
