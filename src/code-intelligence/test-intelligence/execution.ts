/*
 * Phase 82 — guarded test execution.
 *
 * Execution is EXPLICIT ONLY. Nothing here runs because a caller asked for
 * impact. Commands are never built from an untrusted string: argv is always an
 * array, the executable is resolved from the project's own tooling (never
 * installed, never fetched), the working directory is the project root, every
 * run is bounded by a timeout and an output budget, and the process group is
 * terminated on cancel/timeout.
 *
 * Test output is treated as hostile: it may print credentials, so anything
 * persisted or reported passes through the shared secret sanitizer.
 */

import { spawn as nodeSpawn } from 'node:child_process';

import { redactValue } from '../runtime-trace/sanitize.js';

import { adapterFor, isContainedTestPath } from './frameworks.js';

import { testExecutionFingerprint } from './fingerprint.js';

import { TEST_SELECTION_ALGORITHM_VERSION } from './fingerprint.js';

import type {
  RunSelectedTestsRequest,
  TestDescriptor,
  TestFacts,
  TestFramework,
  TestResultRecord,
  TestResultStatus,
  TestRun,
  TestRunStatus,
  TestSelection,
} from './types.js';

import { TestIntelligenceError } from './types.js';

export interface TestSpawnPlan {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  maxOutputBytes: number;
}

export interface TestSpawnResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  cancelled: boolean;
  spawnError?: string;
}

export type TestSpawnFn = (plan: TestSpawnPlan, signal: AbortSignal) => Promise<TestSpawnResult>;

/** Default runner: array argv, bounded output, process-group termination. */
export const defaultTestSpawn: TestSpawnFn = (plan, signal) =>
  new Promise<TestSpawnResult>((resolvePromise) => {
    let settled = false;

    let timedOut = false;
    let cancelled = false;

    let stdout = '';
    let stderr = '';

    let child: ReturnType<typeof nodeSpawn> | undefined;

    const finish = (result: TestSpawnResult): void => {
      if (settled) {
        return;
      }

      settled = true;

      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);

      resolvePromise(result);
    };

    const kill = (): void => {
      if (!child?.pid) {
        return;
      }

      try {
        /* Kill the whole process group so a runner cannot leave orphans. */
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        try {
          child.kill('SIGKILL');
        } catch {
          /* Already gone. */
        }
      }
    };

    const onAbort = (): void => {
      cancelled = true;
      kill();
      finish({ code: null, stdout, stderr, timedOut, cancelled });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      kill();
      finish({ code: null, stdout, stderr, timedOut, cancelled });
    }, plan.timeoutMs);

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener('abort', onAbort, { once: true });

    try {
      child = nodeSpawn(plan.command, plan.args, {
        cwd: plan.cwd,
        shell: false,
        detached: true,
        windowsHide: true,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      finish({
        code: null,
        stdout,
        stderr,
        timedOut,
        cancelled,
        spawnError: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const cap = plan.maxOutputBytes;

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');

    child.stdout?.on('data', (chunk: string) => {
      if (stdout.length < cap) {
        stdout += chunk.slice(0, cap - stdout.length);
      }
    });

    child.stderr?.on('data', (chunk: string) => {
      if (stderr.length < cap) {
        stderr += chunk.slice(0, cap - stderr.length);
      }
    });

    child.on('error', (error) => {
      finish({
        code: null,
        stdout,
        stderr,
        timedOut,
        cancelled,
        spawnError: error instanceof Error ? error.message : String(error),
      });
    });

    child.on('close', (code) => {
      finish({ code, stdout, stderr, timedOut, cancelled });
    });
  });

/** Bound and sanitize runner output for persistence/reporting. */
export function sanitizeOutput(
  value: string,
  maxBytes: number
): { text: string; truncated: boolean; bytes: number } {
  const bytes = Buffer.byteLength(value, 'utf8');

  const bounded = value.slice(0, maxBytes);

  /* Redact credential-looking substrings line by line. */
  const sanitized = bounded
    .split(/\r?\n/u)
    .map((line) => redactValue(line, 2_000))
    .join('\n');

  return { text: sanitized, truncated: bytes > maxBytes, bytes };
}

function normalizeStatus(status: TestResultStatus): TestResultStatus {
  return status;
}

function frameworkFor(descriptors: readonly TestDescriptor[]): TestFramework | 'mixed' {
  const frameworks = new Set(descriptors.map((descriptor) => descriptor.framework));

  if (frameworks.size === 0) {
    return 'mixed';
  }

  if (frameworks.size === 1) {
    return [...frameworks][0]!;
  }

  return 'mixed';
}

export interface RunTestsInput {
  selection: TestSelection;
  request: RunSelectedTestsRequest;
  facts: TestFacts;
  limits: {
    maxProcesses: number;
    maxRunOutputBytes: number;
    runTimeoutMs: number;
  };
  spawn?: TestSpawnFn;
  signal?: AbortSignal;
  now?: () => Date;
}

export async function runSelectedTests(input: RunTestsInput): Promise<TestRun> {
  const { selection, request, facts, limits } = input;

  const now = input.now ?? (() => new Date());

  const spawnFn = input.spawn ?? defaultTestSpawn;

  if (request.selectionId !== selection.selectionId) {
    throw new TestIntelligenceError(
      'TEST_SELECTION_NOT_FOUND',
      'The selection id does not match a selection computed for this project.'
    );
  }

  /* Every selected test, flattened, in deterministic tier/path order. */
  const allSelected: TestDescriptor[] = [
    ...selection.categories.direct,
    ...selection.categories.contract,
    ...selection.categories.integration,
    ...selection.categories.e2e,
    ...selection.categories.transitive,
    ...selection.categories.related,
  ].map((entry) => entry.test);

  const byId = new Map(allSelected.map((descriptor) => [descriptor.id, descriptor]));

  let chosen: TestDescriptor[];

  let userSelectedSubset = false;

  if (request.tests && request.tests.length > 0) {
    chosen = [];

    for (const id of request.tests) {
      if (typeof id !== 'string' || id.length === 0 || id.length > 512) {
        throw new TestIntelligenceError('TEST_ID_INVALID', 'A test id is malformed.');
      }

      const descriptor = byId.get(id);

      if (!descriptor) {
        throw new TestIntelligenceError(
          'TEST_NOT_IN_SELECTION',
          `Test ${id} is not part of the given selection.`
        );
      }

      chosen.push(descriptor);
    }

    userSelectedSubset = chosen.length < allSelected.length;
  } else {
    chosen = allSelected;
  }

  /* Staleness: the selection must still describe the live change/generation. */
  const generationChanged = facts.currentGeneration() !== selection.generations.baseline;

  let changeChanged = false;

  if (facts.recheckSnapshot) {
    try {
      changeChanged = (await facts.recheckSnapshot()) !== selection.changeFingerprint;
    } catch {
      changeChanged = true;
    }
  }

  if (request.changeFingerprint && request.changeFingerprint !== selection.changeFingerprint) {
    changeChanged = true;
  }

  const startedAt = now().toISOString();

  const runnerFingerprint = `${TEST_SELECTION_ALGORITHM_VERSION}`;

  const executionFingerprint = testExecutionFingerprint({
    projectId: facts.projectId,
    selectionFingerprint: selection.fingerprint,
    ...(selection.changeFingerprint ? { changeFingerprint: selection.changeFingerprint } : {}),
    sourceGeneration: selection.generations.baseline ?? 'unknown',
    framework: String(frameworkFor(chosen)),
    runnerFingerprint,
    networkAllowed: request.networkAllowed ?? false,
    selectedTestIds: chosen.map((descriptor) => descriptor.id),
  });

  const environment = {
    networkAllowed: request.networkAllowed ?? false,
    networkIsolation: 'not_enforced' as const,
  };

  if (generationChanged || changeChanged) {
    return {
      id: `run_${executionFingerprint}`,
      projectId: facts.projectId,
      ...(selection.changeFingerprint ? { changeFingerprint: selection.changeFingerprint } : {}),
      sourceGeneration: selection.generations.baseline,
      selectionId: selection.selectionId,
      framework: frameworkFor(chosen),
      selectedTests: chosen.map((descriptor) => descriptor.id),
      userSelectedSubset,
      startedAt,
      endedAt: startedAt,
      status: 'errored',
      results: [],
      output: { truncated: false, bytes: 0 },
      environment,
      stale: true,
      errors: ['TEST_SELECTION_STALE'],
      attempts: 1,
    };
  }

  /* Build one plan per unique test path, deterministically ordered. */
  const plans = new Map<
    string,
    {
      descriptor: TestDescriptor;
      command: string;
      args: string[];
      framework: TestFramework;
      unavailable: boolean;
    }
  >();

  for (const descriptor of chosen) {
    /*
     * A test path is DATA, never a command fragment. A path that escapes the
     * project root (or is absolute) is rejected before any plan is built, so a
     * hostile path can never reach argv or the runner's working directory.
     */
    if (!isContainedTestPath(descriptor.path)) {
      throw new TestIntelligenceError(
        'TEST_PATH_ESCAPE',
        'A selected test path is not project-contained.'
      );
    }

    if (plans.has(descriptor.path)) {
      continue;
    }

    const framework = descriptor.framework;

    const adapter = adapterFor(framework);

    const override = facts.runnerPlan?.(framework, descriptor.path) ?? null;

    if (!adapter && !override) {
      plans.set(descriptor.path, {
        descriptor,
        command: framework,
        args: [],
        framework,
        unavailable: true,
      });
      continue;
    }

    const plan = override
      ? { command: override.command, args: override.args, unavailable: false }
      : adapter!.buildCommand({ rootPath: facts.rootPath, testPath: descriptor.path });

    plans.set(descriptor.path, {
      descriptor,
      command: plan.command,
      args: plan.args,
      framework,
      unavailable: plan.unavailable,
    });
  }

  const planList = [...plans.entries()].sort(([left], [right]) => left.localeCompare(right));

  const results: TestResultRecord[] = [];
  const errors: string[] = [];

  let cancelled = false;
  let timedOut = false;
  let errored = false;
  let anyFailure = false;
  let outputTruncated = false;
  let outputBytes = 0;
  let excerpt = '';

  const runPlan = async (entry: (typeof planList)[number]): Promise<void> => {
    const [path, plan] = entry;

    const descriptors = chosen.filter((descriptor) => descriptor.path === path);

    if (plan.unavailable) {
      errored = true;
      errors.push(`TEST_RUNNER_UNAVAILABLE:${plan.framework}`);

      for (const descriptor of descriptors) {
        results.push({ testId: descriptor.id, status: 'errored' });
      }

      return;
    }

    const spawnResult = await spawnFn(
      {
        command: plan.command,
        args: plan.args,
        cwd: facts.rootPath,
        timeoutMs: request.timeoutMs ?? limits.runTimeoutMs,
        maxOutputBytes: limits.maxRunOutputBytes,
      },
      input.signal ?? new AbortController().signal
    );

    if (spawnResult.cancelled) {
      cancelled = true;
      errors.push('TEST_RUN_CANCELLED');
      return;
    }

    if (spawnResult.timedOut) {
      timedOut = true;
      errors.push('TEST_RUN_TIMEOUT');
    }

    if (spawnResult.spawnError) {
      errored = true;
      errors.push(`TEST_RUNNER_ERROR:${spawnResult.spawnError}`);
    }

    const stdout = sanitizeOutput(spawnResult.stdout, limits.maxRunOutputBytes);
    const stderr = sanitizeOutput(spawnResult.stderr, limits.maxRunOutputBytes);

    outputTruncated = outputTruncated || stdout.truncated || stderr.truncated;
    outputBytes += stdout.bytes + stderr.bytes;

    if (!excerpt) {
      excerpt = (stdout.text || stderr.text).slice(0, 4_000);
    }

    const adapter = adapterFor(plan.framework);

    const parsed = adapter ? adapter.parseResults(spawnResult.stdout, spawnResult.stderr) : null;

    /* Aggregate fallback: distinguish runner error from assertion failure. */
    const aggregateStatus: TestResultStatus = spawnResult.code === 0 ? 'passed' : 'failed';

    if (parsed && parsed.length > 0) {
      for (const descriptor of descriptors) {
        const match =
          parsed.find((result) => result.testId === descriptor.id) ??
          parsed.find(
            (result) =>
              descriptor.testName !== undefined && result.testId.endsWith(descriptor.testName)
          ) ??
          parsed.find(
            (result) => descriptor.suite !== undefined && result.testId.includes(descriptor.suite)
          );

        if (!match) {
          /* Unmapped test: the run reported no per-test entry for it. */
          results.push({ testId: descriptor.id, status: 'errored' });
          continue;
        }

        const status = normalizeStatus(match.status);

        if (status === 'failed' || status === 'errored') {
          anyFailure = true;
        }

        results.push({
          testId: descriptor.id,
          status,
          ...(match.durationMs !== undefined ? { durationMs: match.durationMs } : {}),
          ...(match.failure ? { failure: sanitizeOutput(match.failure, 2_000).text } : {}),
        });
      }

      return;
    }

    if (timedOut && parsed === null) {
      for (const descriptor of descriptors) {
        results.push({ testId: descriptor.id, status: 'errored' });
      }

      return;
    }

    if (aggregateStatus === 'failed') {
      anyFailure = true;
    }

    for (const descriptor of descriptors) {
      results.push({ testId: descriptor.id, status: aggregateStatus });
    }
  };

  /* Bounded concurrency: never more than maxProcesses concurrent runners. */
  const concurrency = Math.max(1, Math.min(limits.maxProcesses, planList.length));

  let cursor = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < planList.length) {
      const index = cursor;

      cursor += 1;

      await runPlan(planList[index]!);
    }
  });

  await Promise.all(workers);

  const endedAt = now().toISOString();

  const status: TestRunStatus = cancelled
    ? 'cancelled'
    : timedOut || errored
      ? 'errored'
      : anyFailure
        ? 'failed'
        : results.length === 0
          ? 'errored'
          : 'passed';

  const stale =
    facts.currentGeneration() !== selection.generations.baseline ||
    (await (async (): Promise<boolean> => {
      if (!facts.recheckSnapshot) {
        return false;
      }

      try {
        return (await facts.recheckSnapshot()) !== selection.changeFingerprint;
      } catch {
        return true;
      }
    })());

  return {
    id: `run_${executionFingerprint}`,
    projectId: facts.projectId,
    ...(selection.changeFingerprint ? { changeFingerprint: selection.changeFingerprint } : {}),
    sourceGeneration: selection.generations.baseline,
    selectionId: selection.selectionId,
    framework: frameworkFor(chosen),
    selectedTests: chosen.map((descriptor) => descriptor.id),
    userSelectedSubset,
    startedAt,
    endedAt,
    status,
    results: results.sort((left, right) => left.testId.localeCompare(right.testId)),
    output: {
      truncated: outputTruncated,
      bytes: outputBytes,
      ...(excerpt ? { excerpt } : {}),
    },
    environment,
    stale,
    errors: [...new Set(errors)],
    attempts: 1,
  };
}
