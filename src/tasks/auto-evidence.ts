import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { sanitizeDurableText } from '../security/durable-sanitizer.js';
import { taskLeaseActiveAt } from './handoff-projection.js';
import { TaskStateEngine } from './state-engine.js';
import { TaskStore } from './store.js';
import type { TaskRecord, TaskTestOutcome } from './types.js';
export interface TaskAutoEvidenceOptions {
  projectRoot: string;
  agentId: string;
  targetTaskId?: string;
  now?: () => number;
}
export interface TaskAutoEvidenceResult {
  recorded: boolean;
  reason: string;
  taskId?: string;
}
type CommandClassification =
  | {
      kind: 'test';
      label: string;
    }
  | {
      kind: 'verification';
      label: string;
    }
  | {
      kind: 'commit';
      label: 'git commit';
    };
const INTERNAL_PREFIXES = ['.toolnet/', '.git/', 'node_modules/'];
function normalizeText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}
function safeScriptName(value: string): string | undefined {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9:_-]{1,120}$/u.test(normalized)) {
    return undefined;
  }
  return normalized;
}
function commandFamily(command: string): CommandClassification | undefined {
  const normalized = normalizeText(command);
  /*
   * Never persist the raw command.
   *
   * Only deterministic recognized command families produce
   * a fixed/safe label.
   */
  if (/\bgit\s+commit(?:\s|$)/iu.test(normalized)) {
    return {
      kind: 'commit',
      label: 'git commit',
    };
  }
  if (
    /\bnpx\s+vitest(?:\s|$)/iu.test(normalized) ||
    /\bvitest\s+(?:run|watch)(?:\s|$)/iu.test(normalized)
  ) {
    return {
      kind: 'test',
      label: 'vitest',
    };
  }
  if (/\bnpx\s+jest(?:\s|$)/iu.test(normalized) || /\bjest(?:\s|$)/iu.test(normalized)) {
    return {
      kind: 'test',
      label: 'jest',
    };
  }
  if (
    /\bpython(?:3)?\s+-m\s+pytest(?:\s|$)/iu.test(normalized) ||
    /\bpytest(?:\s|$)/iu.test(normalized)
  ) {
    return {
      kind: 'test',
      label: 'pytest',
    };
  }
  if (/\bgo\s+test(?:\s|$)/iu.test(normalized)) {
    return {
      kind: 'test',
      label: 'go test',
    };
  }
  if (/\bcargo\s+test(?:\s|$)/iu.test(normalized)) {
    return {
      kind: 'test',
      label: 'cargo test',
    };
  }
  if (/\bbun\s+test(?:\s|$)/iu.test(normalized)) {
    return {
      kind: 'test',
      label: 'bun test',
    };
  }
  if (/\b(?:npm|pnpm|yarn)\s+test(?:\s|$)/iu.test(normalized)) {
    const manager = normalized.match(/\b(npm|pnpm|yarn)\s+test\b/iu)?.[1]?.toLowerCase();
    return {
      kind: 'test',
      label: manager ? `${manager} test` : 'package test',
    };
  }
  const runMatch = normalized.match(/\b(npm|pnpm|yarn|bun)\s+run\s+([A-Za-z0-9:_-]{1,120})/iu);
  if (runMatch) {
    const manager = runMatch[1]?.toLowerCase();
    const script = safeScriptName(runMatch[2] ?? '');
    if (manager && script) {
      if (
        /(?:^|:|-)(?:test|tests|vitest|jest|spec)(?:$|:|-)/iu.test(script) ||
        script.endsWith(':test')
      ) {
        return {
          kind: 'test',
          label: `${manager} run ${script}`,
        };
      }
      if (/(?:typecheck|lint|audit|verify|certif|build|smoke|check)/iu.test(script)) {
        return {
          kind: 'verification',
          label: `${manager} run ${script}`,
        };
      }
    }
  }
  if (
    /*
     * git diff --check
     */
    /\bgit\s+diff\s+--check\b/iu.test(normalized)
  ) {
    return {
      kind: 'verification',
      label: 'git diff --check',
    };
  }
  if (/\btsc\s+--noEmit\b/iu.test(normalized)) {
    return {
      kind: 'verification',
      label: 'tsc --noEmit',
    };
  }
  return undefined;
}
function commandFingerprint(label: string, outcome: string): string {
  return createHash('sha256').update(`${label}\u0000${outcome}`).digest('hex');
}
function testOutcome(exitCode: number): TaskTestOutcome {
  return exitCode === 0 ? 'pass' : 'fail';
}
function statusRank(task: TaskRecord): number {
  if (task.status === 'active') {
    return 0;
  }
  if (task.status === 'blocked') {
    return 1;
  }
  if (task.status === 'pending') {
    return 2;
  }
  return 3;
}
export class TaskAutoEvidenceEngine {
  private readonly projectRoot: string;
  private readonly agentId: string;
  private readonly targetTaskId?: string;
  private readonly now: () => number;
  private readonly state: TaskStateEngine;
  constructor(
    private readonly store: TaskStore,
    options: TaskAutoEvidenceOptions
  ) {
    this.projectRoot = resolve(options.projectRoot);
    this.agentId = sanitizeDurableText(options.agentId).trim();
    if (!this.agentId) {
      throw new Error('TASK_AUTO_EVIDENCE_AGENT_REQUIRED');
    }
    this.targetTaskId = options.targetTaskId?.trim() || undefined;
    this.now = options.now ?? (() => Date.now());
    this.state = new TaskStateEngine(store);
  }
  private activeClaim(task: TaskRecord, now: number): boolean {
    return task.activeLease?.agentId === this.agentId && taskLeaseActiveAt(task.activeLease, now);
  }
  private target(): TaskRecord | undefined {
    const now = this.now();
    if (this.targetTaskId) {
      const explicit = this.store.getTask(this.targetTaskId);
      if (explicit && this.activeClaim(explicit, now)) {
        return explicit;
      }
      return undefined;
    }
    const claimed = this.store
      .listTasks()
      .filter((task) => this.activeClaim(task, now))
      .sort(
        (left, right) =>
          statusRank(left) - statusRank(right) ||
          left.order - right.order ||
          left.updatedAt.localeCompare(right.updatedAt) ||
          left.id.localeCompare(right.id)
      );
    if (claimed.length === 1) {
      return claimed[0];
    }
    if (claimed.length > 1) {
      const active = claimed.filter((task) => task.status === 'active');
      if (active.length === 1) {
        return active[0];
      }
      /*
       * Fail closed.
       *
       * If one agent holds multiple equally plausible Tasks,
       * automatic evidence must not guess.
       *
       * Set TOOLNET_TASK_ID / targetTaskId explicitly.
       */
      return undefined;
    }
    return undefined;
  }
  private relativeProjectFile(filePath: string): string | undefined {
    const absolute = isAbsolute(filePath) ? resolve(filePath) : resolve(this.projectRoot, filePath);
    const local = relative(this.projectRoot, absolute);
    if (!local || local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local)) {
      return undefined;
    }
    const normalized = local.split(sep).join('/');
    if (INTERNAL_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      return undefined;
    }
    return sanitizeDurableText(normalized);
  }
  private headSha(): string | undefined {
    const result = spawnSync('git', ['-C', this.projectRoot, 'rev-parse', '--verify', 'HEAD'], {
      encoding: 'utf8',
      timeout: 2_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (result.status !== 0) {
      return undefined;
    }
    const sha = String(result.stdout ?? '').trim();
    if (!/^[0-9a-f]{40,64}$/iu.test(sha)) {
      return undefined;
    }
    return sha.toLowerCase();
  }
  async recordFileWrite(filePath: string): Promise<TaskAutoEvidenceResult> {
    const task = this.target();
    if (!task) {
      return {
        recorded: false,
        reason: 'no-unambiguous-claimed-task',
      };
    }
    const relativePath = this.relativeProjectFile(filePath);
    if (!relativePath) {
      return {
        recorded: false,
        reason: 'file-outside-project-or-internal',
        taskId: task.id,
      };
    }
    if (task.filesTouched.includes(relativePath)) {
      return {
        recorded: false,
        reason: 'file-already-recorded',
        taskId: task.id,
      };
    }
    await this.state.touchFile(task.id, relativePath, {
      actor: {
        kind: 'agent',
        id: this.agentId,
      },
    });
    return {
      recorded: true,
      reason: 'file-recorded',
      taskId: task.id,
    };
  }
  async recordCommand(
    command: string,
    exitCode: number | undefined
  ): Promise<TaskAutoEvidenceResult[]> {
    const classification = commandFamily(command);
    if (!classification || exitCode === undefined || !Number.isSafeInteger(exitCode)) {
      return [];
    }
    const task = this.target();
    if (!task) {
      return [
        {
          recorded: false,
          reason: 'no-unambiguous-claimed-task',
        },
      ];
    }
    const actor = {
      kind: 'agent' as const,
      id: this.agentId,
    };
    if (classification.kind === 'test') {
      const outcome = testOutcome(exitCode);
      await this.state.recordTest(
        task.id,
        {
          name: classification.label,
          outcome,
          detail:
            outcome === 'pass'
              ? 'Automatic test evidence'
              : `Automatic test evidence; exit=${exitCode}`,
        },
        {
          actor,
        }
      );
      return [
        {
          recorded: true,
          reason: `test-${outcome}`,
          taskId: task.id,
        },
      ];
    }
    if (classification.kind === 'verification') {
      const outcome = exitCode === 0 ? 'PASS' : 'FAIL';
      const fingerprint = commandFingerprint(classification.label, outcome);
      const current = this.store.getTask(task.id);
      const ref = `verification:${fingerprint}`;
      if (current?.evidence.some((evidence) => evidence.ref === ref)) {
        return [
          {
            recorded: false,
            reason: 'verification-already-recorded',
            taskId: task.id,
          },
        ];
      }
      await this.state.addEvidence(
        task.id,
        {
          kind: 'review',
          summary: `Verification ${outcome}: ${classification.label}`,
          ref,
        },
        {
          actor,
        }
      );
      return [
        {
          recorded: true,
          reason: `verification-${outcome.toLowerCase()}`,
          taskId: task.id,
        },
      ];
    }
    if (classification.kind === 'commit') {
      if (exitCode !== 0) {
        return [
          {
            recorded: false,
            reason: 'commit-command-failed',
            taskId: task.id,
          },
        ];
      }
      const sha = this.headSha();
      if (!sha) {
        return [
          {
            recorded: false,
            reason: 'commit-sha-unavailable',
            taskId: task.id,
          },
        ];
      }
      const current = this.store.getTask(task.id);
      if (
        current?.evidence.some((evidence) => evidence.kind === 'commit' && evidence.ref === sha)
      ) {
        return [
          {
            recorded: false,
            reason: 'commit-already-recorded',
            taskId: task.id,
          },
        ];
      }
      await this.state.addEvidence(
        task.id,
        {
          kind: 'commit',
          summary: `Commit ${sha.slice(0, 12)}`,
          ref: sha,
        },
        {
          actor,
        }
      );
      return [
        {
          recorded: true,
          reason: 'commit-recorded',
          taskId: task.id,
        },
      ];
    }
    return [];
  }
}
