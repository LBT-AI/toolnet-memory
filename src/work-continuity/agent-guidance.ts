export const MEMORY_AGENT_TOOL = 'memory_agent_ask';

/**
 * Full instructions for persistent agent instruction files
 * and MCP-aware environments.
 */
export function memoryAgentGuidance(): string {
  return `
[TOOLNET MEMORY AGENT]

Tool available:
- ${MEMORY_AGENT_TOOL}

Use it automatically BEFORE guessing when:

- The user asks to continue, resume, or pick up previous work.
- The user says things like:
  - "tiếp tục task lúc nãy"
  - "làm tiếp phần đang dở"
  - "agent trước đang làm gì?"
  - "dừng ở đâu?"
  - "todo nào chưa xong?"
  - "continue the previous task"
  - "resume the last session"
- Previous-agent state, unfinished work, blockers,
  decisions, touched files, or next actions are unclear.
- Fast startup context is not enough to safely continue.

Preferred mode:

- mode="local"
  for direct factual questions such as:
  current task, last file, blocker, completed TODOs.

- mode="ai"
  for composite or ambiguous continuity questions
  that benefit from ToolNet Memory Agent reasoning.

Do NOT call it automatically when:

- Normal startup context already gives enough information.
- The question is unrelated to previous project work.
- The answer is obvious from current repository evidence.

Rules:

- Never invent previous work.
- Current repository evidence overrides stale memory.
- Do not dump raw transcripts or full memory.
- After receiving the ToolNet answer, continue the task
  instead of asking the user to repeat known context.
- If ToolNet says information is not recorded, say so.
`.trim();
}

/**
 * Tiny startup-safe guidance.
 *
 * Must remain:
 * - local only
 * - compact
 * - free from deep-history payload markers
 * - safe for Codex/Agy startup context
 */
export function memoryAgentStartupGuidance(): string {
  return `
[TOOLNET MEMORY AGENT]

Tool:
- ${MEMORY_AGENT_TOOL}

If the user asks to resume previous work and the fast context
is insufficient, call ${MEMORY_AGENT_TOOL} before guessing.

Use:
- mode="local" for current task, last file, blocker or next action.
- mode="ai" for ambiguous or combined continuity questions.

Current repository evidence overrides stale memory.
`.trim();
}
