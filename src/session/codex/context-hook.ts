import { buildFastProjectContext } from '../../work-continuity/fast-context.js';

import { triggerProjectBackgroundRefresh } from '../../multi-host/refresh-trigger.js';

import { findCodexToolNetProject } from './project-resolver.js';

const MAX_CONTEXT_CHARS = 3200;

async function readInput(): Promise<Record<string, unknown>> {
  let raw = '';

  for await (const chunk of process.stdin) {
    raw += chunk.toString();
  }

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeEmpty(): void {
  process.stdout.write('{}');
}

function limitContext(text: string): string {
  if (text.length <= MAX_CONTEXT_CHARS) {
    return text;
  }

  return `${text.slice(0, MAX_CONTEXT_CHARS)}\n\n[ToolNet startup context truncated]`;
}

function debugTiming(startedAt: number, cwd: string, chars: number): void {
  if (process.env.TOOLNET_CODEX_STARTUP_DEBUG !== '1') {
    return;
  }

  const elapsedMs = Date.now() - startedAt;

  process.stderr.write(
    `[toolnet-memory] codex SessionStart ${elapsedMs}ms cwd=${cwd} chars=${chars}\n`
  );
}

async function main(): Promise<void> {
  const startedAt = Date.now();

  const input = await readInput();

  if (input.hook_event_name !== 'SessionStart') {
    writeEmpty();

    return;
  }

  const cwd = typeof input.cwd === 'string' ? input.cwd : '';

  if (!cwd) {
    writeEmpty();

    return;
  }

  /*
   * Important:
   * SessionStart must never auto-create a ToolNet project.
   *
   * A valid .toolnet/project.json must already exist.
   */
  const project = findCodexToolNetProject(cwd);

  if (!project) {
    writeEmpty();

    return;
  }

  triggerProjectBackgroundRefresh(project.rootPath);

  try {
    /*
     * C1 FAST PATH
     *
     * LOCAL FILES ONLY.
     *
     * Forbidden on Codex SessionStart:
     * - Storage provider creation
     * - R2 / S3 / Hugging Face
     * - LLM calls
     * - Embeddings
     * - Semantic retrieval
     * - Session recovery
     * - Full code indexing
     *
     * Deep memory is available later through ToolNet/MCP.
     */
    const context = buildFastProjectContext({
      projectPath: cwd,
    });

    if (!context?.trim()) {
      writeEmpty();

      return;
    }

    const limited = limitContext(context);

    const output = {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',

        additionalContext: limited,
      },
    };

    debugTiming(startedAt, cwd, limited.length);

    process.stdout.write(JSON.stringify(output));
  } catch {
    /*
     * Fail open:
     * ToolNet must never prevent Codex from starting.
     */
    writeEmpty();
  }
}

main().catch(() => {
  writeEmpty();

  process.exitCode = 0;
});
