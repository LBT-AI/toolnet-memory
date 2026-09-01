import { buildFastProjectContext } from '../../work-continuity/fast-context.js';

type JsonObject = Record<string, unknown>;

const MAX_CONTEXT_CHARS = 6500;

const RESUME_PATTERNS: RegExp[] = [
  /\bcontinue\b/i,
  /\bresume\b/i,
  /\bpick\s+up\b/i,
  /\bcarry\s+on\b/i,
  /\bfinish\s+(?:the\s+)?(?:previous|last|unfinished|remaining)\b/i,
  /\bwhere\s+(?:did\s+we|were\s+we)\b/i,
  /\bwhat\s+was\s+(?:the\s+)?(?:last|previous)\b/i,

  /(?:^|[\s,.;:!?])tiếp\s+tục(?:$|[\s,.;:!?])/iu,
  /(?:^|[\s,.;:!?])làm\s+tiếp(?:$|[\s,.;:!?])/iu,
  /(?:^|[\s,.;:!?])làm\s+nốt(?:$|[\s,.;:!?])/iu,
  /(?:^|[\s,.;:!?])tiếp\s+phần(?:$|[\s,.;:!?])/iu,
  /(?:^|[\s,.;:!?])phần\s+đang\s+dở(?:$|[\s,.;:!?])/iu,
  /(?:^|[\s,.;:!?])đang\s+làm\s+(?:gì|đến\s+đâu)(?:$|[\s,.;:!?])/iu,
  /(?:^|[\s,.;:!?])dừng\s+(?:ở|tại)\s+đâu(?:$|[\s,.;:!?])/iu,
  /(?:^|[\s,.;:!?])task\s+(?:lúc\s+nãy|trước|đang\s+dở)(?:$|[\s,.;:!?])/iu,
];

const FORBIDDEN_MARKERS = [
  '.toolnet/journal/',
  '.toolnet/sessions/',
  '.toolnet\\sessions\\',
  '/.toolnet/sessions',
  '\\.toolnet\\sessions',

  '.gemini/antigravity-cli/brain/',
  '.gemini\\antigravity-cli\\brain\\',

  '/transcript.jsonl',
  '\\transcript.jsonl',
];

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, '/').toLowerCase();
}

function bounded(value: string): string {
  if (value.length <= MAX_CONTEXT_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_CONTEXT_CHARS)}\n\n[ToolNet Kiro context truncated]`;
}

function flattenStrings(value: unknown, output: string[], depth = 0): void {
  if (depth > 6 || output.length >= 200) {
    return;
  }

  if (typeof value === 'string') {
    output.push(value);

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      flattenStrings(item, output, depth + 1);

      if (output.length >= 200) {
        break;
      }
    }

    return;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value as JsonObject)) {
      flattenStrings(item, output, depth + 1);

      if (output.length >= 200) {
        break;
      }
    }
  }
}

function containsForbiddenSessionReference(value: string): boolean {
  const normalized = normalizeSlashes(value);

  if (
    normalized.includes('.toolnet/journal/') ||
    normalized.includes('.toolnet/runtime/sources/') ||
    normalized.endsWith('.toolnet/journal') ||
    normalized.endsWith('.toolnet/runtime/sources') ||
    normalized.includes('.toolnet/sessions/') ||
    normalized.endsWith('.toolnet/sessions')
  ) {
    return true;
  }

  if (normalized.includes('.gemini/antigravity-cli/brain/')) {
    return true;
  }

  /*
   * transcript.jsonl is blocked only when it is being referenced as a path.
   * This avoids interfering with unrelated prose that merely mentions
   * transcript formats.
   */
  if (normalized.includes('/transcript.jsonl') || normalized.endsWith('transcript.jsonl')) {
    return true;
  }

  return FORBIDDEN_MARKERS.some((marker) => normalized.includes(normalizeSlashes(marker)));
}

export function isKiroResumePrompt(prompt: string): boolean {
  const normalized = prompt.trim();

  if (!normalized) {
    return false;
  }

  return RESUME_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function buildKiroStartupContext(cwd: string): string {
  if (!cwd.trim()) {
    return '';
  }

  try {
    const context = buildFastProjectContext({
      projectPath: cwd,
    });

    return context?.trim() ? bounded(context.trim()) : '';
  } catch {
    return '';
  }
}

export function buildKiroPromptContext(input: JsonObject): string {
  const prompt = text(input.prompt) ?? text(process.env.USER_PROMPT) ?? '';

  if (!prompt || !isKiroResumePrompt(prompt)) {
    return '';
  }

  const cwd = text(input.cwd) ?? '';

  const fastContext = buildKiroStartupContext(cwd);

  const directive = `
[TOOLNET RESUME REQUEST]

The user is asking to continue previous project work.

Required order:
1. Use the injected ToolNet fast continuity handoff first.
2. If that handoff is missing, stale, or ambiguous, invoke the MCP tool
   memory_agent_ask BEFORE repository/history exploration.
3. Get current task, last file, blocker, completed work, TODOs, and next action.
4. Do NOT reconstruct prior work from .toolnet/sessions/**, state.json,
   events.jsonl, raw transcripts, or another agent's internal history.
5. After continuity is known, verify current git/source truth and continue
   the work. Do not ask the user to repeat context ToolNet already provides.

Memory Agent is local-only. No AI/LLM mode.
Current repository evidence overrides stale memory.
`.trim();

  if (!fastContext) {
    return directive;
  }

  return bounded(`${fastContext}\n\n${directive}`);
}

export interface KiroPreToolGuardResult {
  blocked: boolean;

  reason?: string;
}

export function buildKiroPreToolGuard(input: JsonObject): KiroPreToolGuardResult {
  const toolInput =
    input.tool_input && typeof input.tool_input === 'object'
      ? (input.tool_input as JsonObject)
      : {};

  const values: string[] = [];

  flattenStrings(toolInput, values);

  const blockedValue = values.find(containsForbiddenSessionReference);

  if (!blockedValue) {
    return {
      blocked: false,
    };
  }

  return {
    blocked: true,

    reason:
      'ToolNet continuity guard: do not read or reconstruct previous work from raw ' +
      'ToolNet/agent session history. Use the injected continuity handoff first; if it is ' +
      'insufficient, invoke the MCP tool memory_agent_ask directly. Then inspect normal ' +
      'repository source/git evidence.',
  };
}

export function isKiroPreToolEvent(value: unknown): boolean {
  return value === 'PreToolUse' || value === 'preToolUse';
}

export function isKiroStartupEvent(value: unknown): boolean {
  return value === 'SessionStart' || value === 'agentSpawn';
}

export function isKiroPromptEvent(value: unknown): boolean {
  return value === 'UserPromptSubmit' || value === 'userPromptSubmit';
}
