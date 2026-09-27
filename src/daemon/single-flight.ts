/*
 * Phase 77 — single-flight coordination.
 *
 * Expensive shared work (indexing, artifact hydration) must run ONCE per
 * generation even when many sessions ask for it simultaneously. Sessions become
 * subscribers of the shared job and receive the same progress fanout.
 */

import { createHash } from 'node:crypto';

import type { DaemonProgressEvent, DaemonProgressPayload } from './types.js';

export type JobKind = 'index' | 'hydrate';

export type JobState = 'running' | 'complete' | 'failed' | 'cancelled';

export interface SingleFlightJob<T = unknown> {
  readonly id: string;
  readonly key: string;
  readonly projectId: string;
  readonly kind: JobKind;
  promise: Promise<T>;
  state: JobState;
  error?: string;
  readonly subscribers: Set<string>;
  readonly signal: AbortSignal;
  addedAt: number;
}

export interface StartJobOptions {
  projectId: string;
  kind: JobKind;
  /**
   * Cancel the shared job when its last subscriber leaves.
   *
   * Only safe for work whose runner checks the abort signal before committing
   * derived state (indexing/hydration both do).
   */
  cancelWhenEmpty?: boolean;
}

export interface SingleFlightRegistryOptions {
  /** Called for every progress event emitted by a running job. */
  onEvent?: (job: SingleFlightJob, event: DaemonProgressEvent) => void;
  /** Called when a job settles. */
  onSettled?: (job: SingleFlightJob) => void;
}

let jobCounter = 0;

/** Deterministic job key from the single-flight inputs. */
export function singleFlightKey(parts: readonly string[]): string {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);
}

export class SingleFlightRegistry {
  private readonly jobs = new Map<string, SingleFlightJob<unknown>>();

  private readonly byKey = new Map<string, SingleFlightJob<unknown>>();

  constructor(private readonly options: SingleFlightRegistryOptions = {}) {}

  get size(): number {
    return this.jobs.size;
  }

  list(): SingleFlightJob<unknown>[] {
    return [...this.jobs.values()];
  }

  get(jobId: string): SingleFlightJob<unknown> | undefined {
    return this.jobs.get(jobId);
  }

  activeForProject(projectId: string): SingleFlightJob<unknown>[] {
    return [...this.jobs.values()].filter((job) => job.projectId === projectId);
  }

  /**
   * Start or join a shared job.
   *
   * When a job already exists for `key` the caller joins it; the returned
   * `reused` flag lets the server report the dedupe honestly.
   */
  start<T>(
    key: string,
    runner: (signal: AbortSignal, report: (event: DaemonProgressPayload) => void) => Promise<T>,
    options: StartJobOptions
  ): { job: SingleFlightJob<T>; reused: boolean } {
    const existing = this.byKey.get(key) as SingleFlightJob<T> | undefined;

    if (existing && existing.state === 'running') {
      return { job: existing, reused: true };
    }

    jobCounter += 1;

    const id = `job-${jobCounter.toString(36)}-${key.slice(0, 8)}`;

    const controller = new AbortController();

    const job: SingleFlightJob<T> = {
      id,
      key,
      projectId: options.projectId,
      kind: options.kind,
      promise: undefined as unknown as Promise<T>,
      state: 'running',
      subscribers: new Set<string>(),
      signal: controller.signal,
      addedAt: Date.now(),
    };

    abortControllers.set(job as SingleFlightJob<unknown>, controller);

    const report = (event: DaemonProgressPayload): void => {
      this.options.onEvent?.(job, { ...event, jobId: id } as DaemonProgressEvent);
    };

    job.promise = (async () => {
      try {
        const result = await runner(controller.signal, report);

        if (job.state !== 'cancelled') {
          job.state = 'complete';
          report({
            kind: 'job',
            projectId: job.projectId,
            state: 'complete',
          });
        }

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (controller.signal.aborted) {
          job.state = 'cancelled';
          report({
            kind: 'job',
            projectId: job.projectId,
            state: 'cancelled',
          });
        } else {
          job.state = 'failed';
          job.error = message;
          report({
            kind: 'job',
            projectId: job.projectId,
            state: 'failed',
            error: message,
          });
        }

        throw error;
      } finally {
        /* The settled job must stop being joinable. */
        this.jobs.delete(id);
        if (this.byKey.get(key) === job) {
          this.byKey.delete(key);
        }
        this.options.onSettled?.(job);
      }
    })();

    this.jobs.set(id, job as SingleFlightJob<unknown>);
    this.byKey.set(key, job as SingleFlightJob<unknown>);

    return { job, reused: false };
  }

  addSubscriber(jobId: string, sessionId: string): SingleFlightJob<unknown> | undefined {
    const job = this.jobs.get(jobId);

    job?.subscribers.add(sessionId);

    return job;
  }

  /**
   * Remove a subscriber.
   *
   * The job is cancelled only when it has no subscribers left AND the caller
   * opted into `cancelWhenEmpty` at start time.
   */
  removeSubscriber(jobId: string, sessionId: string, cancelWhenEmpty = true): void {
    const job = this.jobs.get(jobId);

    if (!job || !job.subscribers.delete(sessionId)) {
      return;
    }

    if (cancelWhenEmpty && job.subscribers.size === 0) {
      this.cancel(jobId);
    }
  }

  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);

    if (!job || job.state !== 'running') {
      return false;
    }

    job.state = 'cancelled';

    /**
     * The runner is responsible for checking the signal before committing any
     * derived state, so an aborted job never publishes a partial generation.
     */
    const controller = abortControllers.get(job);

    controller?.abort();

    return true;
  }
}

/*
 * The AbortController is not exposed on the job shape (it is an implementation
 * detail); keep a side table so `cancel` can reach it without leaking the
 * controller through the protocol surface.
 */
const abortControllers = new WeakMap<SingleFlightJob<unknown>, AbortController>();
