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

export interface ContinuityGuardResult {
  blocked: boolean;

  reason?: string;
}

function bounded(value: string, agentLabel: string): string {
  if (value.length <= MAX_CONTEXT_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_CONTEXT_CHARS)}\n\n[ToolNet ${agentLabel} context truncated]`;
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, '/').toLowerCase();
}

function flattenStrings(value: unknown, output: string[], depth = 0): void {
  if (depth > 6 || output.length >= 250) {
    return;
  }

  if (typeof value === 'string') {
    output.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      flattenStrings(item, output, depth + 1);

      if (output.length >= 250) {
        break;
      }
    }

    return;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value as JsonObject)) {
      flattenStrings(item, output, depth + 1);

      if (output.length >= 250) {
        break;
      }
    }
  }
}

function isForbiddenRawHistoryReference(value: string): boolean {
  const normalized = normalizeSlashes(value);

  if (
    normalized.includes('.toolnet/runtime/sources/') ||
    normalized.endsWith('.toolnet/runtime/sources') ||
    normalized.includes('.toolnet/sessions/') ||
    normalized.endsWith('.toolnet/sessions')
  ) {
    return true;
  }

  if (
    normalized.includes('.gemini/antigravity-cli/brain/') ||
    normalized.endsWith('.gemini/antigravity-cli/brain')
  ) {
    return true;
  }

  if (normalized.includes('/transcript.jsonl') || normalized.endsWith('transcript.jsonl')) {
    return true;
  }

  /*
   * Block ToolNet-owned raw WAL/state files, but do not block an
   * application's unrelated state.json/events.jsonl.
   */
  if (
    normalized.includes('.toolnet/') &&
    (normalized.endsWith('/events.jsonl') ||
      normalized.endsWith('/state.json') ||
      normalized.includes('/sessions/'))
  ) {
    return true;
  }

  /*
   * Cursor exposes a raw conversation transcript path through an env var.
   * A tool call attempting to read that transcript is the same forbidden
   * reconstruction path even if the filename differs from transcript.jsonl.
   */
  const cursorTranscript = process.env.CURSOR_TRANSCRIPT_PATH;

  if (cursorTranscript && normalizeSlashes(cursorTranscript) === normalized) {
    return true;
  }

  return false;
}

export function isResumePrompt(prompt: string): boolean {
  const normalized = prompt.trim();

  if (!normalized) {
    return false;
  }

  return RESUME_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function buildStartupContinuityContext(cwd: string, agentLabel: string): string {
  if (!cwd.trim()) {
    return '';
  }

  let fastContext = '';

  try {
    fastContext =
      buildFastProjectContext({
        projectPath: cwd,
      })?.trim() ?? '';
  } catch {
    fastContext = '';
  }

  const directive = `
[TOOLNET CONTINUITY]

ToolNet Memory is the continuity source for this repository.

When the user asks to continue, resume, pick up, or finish previous work:
1. Use this injected ToolNet fast handoff first.
2. If the handoff is missing, stale, or ambiguous, invoke the MCP tool
   memory_agent_ask before exploring prior history.
3. Prefer mode="local" for current task, last file, blocker, completed work,
   TODOs, and next action.
4. Use mode="ai" only when continuity requires synthesis.
5. Never reconstruct prior work from .toolnet/sessions/**, events.jsonl,
   state.json, raw transcripts, or another agent's private history.
6. After continuity is known, verify current git/source truth and continue.
7. Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`.trim();

  return bounded(fastContext ? `${fastContext}\n\n${directive}` : directive, agentLabel);
}

export function buildResumeContinuityContext(
  prompt: string,
  cwd: string,
  agentLabel: string
): string {
  if (!isResumePrompt(prompt)) {
    return '';
  }

  const startup = buildStartupContinuityContext(cwd, agentLabel);

  const resumeDirective = `
[TOOLNET RESUME REQUEST]

The current user message explicitly asks to continue previous work.
Use memory_agent_ask now if the fast handoff does not contain a clear,
current next action. Do not reconstruct continuity from raw session files.
`.trim();

  return bounded(startup ? `${startup}\n\n${resumeDirective}` : resumeDirective, agentLabel);
}

export function buildContinuityPreToolGuard(toolInput: unknown): ContinuityGuardResult {
  const values: string[] = [];

  flattenStrings(toolInput, values);

  const blockedValue = values.find(isForbiddenRawHistoryReference);

  if (!blockedValue) {
    return {
      blocked: false,
    };
  }

  return {
    blocked: true,
    reason:
      'ToolNet continuity guard: do not read or reconstruct previous work ' +
      'from raw ToolNet/agent session history. Use the injected ToolNet ' +
      'handoff first; if it is insufficient, invoke the MCP tool ' +
      'memory_agent_ask directly. Then verify normal repository/git source truth.',
  };
}
