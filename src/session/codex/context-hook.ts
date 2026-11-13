import { buildFastProjectContext } from '../../work-continuity/fast-context.js';

import { triggerProjectBackgroundRefresh } from '../../multi-host/refresh-trigger.js';

import { findCodexToolNetProject } from './project-resolver.js';

import { renderTaskSessionBootstrap } from '../../tasks/session-resume.js';

import {
  createCloudAuthorityFromEnv,
  hasCloudAuthorityConfig,
  resolveDurabilityMode,
} from '../../v0.7/index.js';

import { resumeFromCloud } from '../../v0.7/resume.js';

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

function mergeTaskBootstrap(context: string, bootstrap: string | undefined): string {
  if (!bootstrap) {
    return context;
  }

  const taskLine = bootstrap.match(/^Task:\s+(.+)$/mu)?.[1]?.trim();
  if (taskLine && context.includes(taskLine)) {
    return context;
  }

  return `${bootstrap}\n\n${context}`;
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

  const project = findCodexToolNetProject(cwd);

  if (!project) {
    writeEmpty();
    return;
  }

  triggerProjectBackgroundRefresh(project.rootPath);

  try {
    let cloudResumeText = '';

    /*
     * v0.7 cloud-backed resume: when a cloud authority is configured, prefer
     * the acknowledged resume packet over the local fast context. In strict
     * cloud-only mode we never fall back to local memory if the cloud is
     * unavailable — we simply omit the cloud packet and keep the read-only
     * local projection (which contains no durable memory writes).
     */
    try {
      const mode = resolveDurabilityMode(process.env.TOOLNET_DURABILITY_MODE);
      const strict = mode === 'strict-cloud-only';

      if (hasCloudAuthorityConfig() || !strict) {
        const authority = createCloudAuthorityFromEnv();
        const result = await resumeFromCloud({
          authority,
          projectId: project.id,
          mode: 'standard',
          budgetTokens: 1_500,
        });

        if (result.available) {
          cloudResumeText = result.text;
        }
      }
    } catch {
      cloudResumeText = '';
    }

    const baseContext = mergeTaskBootstrap(
      buildFastProjectContext({ projectPath: cwd }) ?? '',
      renderTaskSessionBootstrap(project, {
        agentId: 'codex',
        maxChars: 4_000,
      })
    );

    const context = cloudResumeText ? `${cloudResumeText}\n\n${baseContext}` : baseContext;

    if (!context.trim()) {
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
    writeEmpty();
  }
}

main().catch(() => {
  writeEmpty();
  process.exitCode = 0;
});
