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
- NEVER reconstruct previous work by reading ToolNet internal session files.
- NEVER read/list/search .toolnet/sessions/**, session state.json,
  events.jsonl, or raw transcripts to discover previous-agent state.
- Do not search the filesystem for the implementation/schema of
  memory_agent_ask. Invoke the MCP tool directly when deeper
  continuity is required.
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

For resume/continue requests:

1. Use the injected ToolNet continuity handoff FIRST.
2. If the handoff is missing or ambiguous, invoke
   ${MEMORY_AGENT_TOOL} directly BEFORE repository/history exploration.
3. NEVER reconstruct prior work from:
   - .toolnet/sessions/**
   - state.json
   - events.jsonl
   - raw transcripts
4. NEVER search for the implementation/schema of
   ${MEMORY_AGENT_TOOL}; invoke the MCP tool directly.
5. Inspect git/source only AFTER continuity context is known.

Use:
- mode="local" for current task, last file, blocker or next action.
- mode="ai" for ambiguous or combined continuity questions.

Current repository evidence overrides stale memory.
`.trim();
}
