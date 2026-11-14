/**
 * ToolNet v0.7 durability policy.
 *
 * Strict cloud-only mode exists because the memory authority lives in the
 * cloud. In that mode the process may keep data in RAM only: no memory
 * database, WAL, task state, session history, snapshot, index, cache, staging
 * directory, telemetry file or temporary memory payload may be persisted on the
 * VPS.
 *
 * This module deliberately imports nothing from `node:fs`. It is the single
 * decision point used by callers before a durable write happens.
 */

export type DurabilityMode = 'local-first' | 'strict-cloud-only';

/**
 * What a write is for. Only memory data is forbidden on disk in strict mode;
 * agent integration configuration and project source files are not ToolNet
 * memory and stay writable.
 */
export type WriteClass =
  'memory-durable' | 'memory-transient' | 'telemetry' | 'agent-config' | 'source';

export type DurabilityErrorCode = 'DURABILITY_MODE_INVALID' | 'STRICT_CLOUD_ONLY_WRITE_BLOCKED';

export class DurabilityPolicyError extends Error {
  readonly code: DurabilityErrorCode;

  constructor(code: DurabilityErrorCode, message: string) {
    super(message);
    this.name = 'DurabilityPolicyError';
    this.code = code;
  }
}

export interface DurabilityWriteRequest {
  /** Absolute or project-relative path of the intended write. */
  path: string;
  writeClass: WriteClass;
  /** Short human-readable reason, used by status/doctor output. */
  reason: string;
}

export interface DurabilityDecision {
  allowed: boolean;
  mode: DurabilityMode;
  writeClass: WriteClass;
  path: string;
  reason: string;
  code?: 'STRICT_CLOUD_ONLY_WRITE_BLOCKED';
}

const ALLOWED_IN_STRICT_MODE: ReadonlySet<WriteClass> = new Set<WriteClass>([
  'agent-config',
  'source',
]);

const KNOWN_MODES: ReadonlySet<string> = new Set<string>(['local-first', 'strict-cloud-only']);

/**
 * Resolve the durability mode from configuration.
 *
 * An unknown value is rejected instead of silently defaulting: a typo must not
 * turn a strict deployment into a disk-writing one.
 */
export function resolveDurabilityMode(value: string | undefined): DurabilityMode {
  if (value === undefined || value.trim() === '') {
    return 'local-first';
  }

  const normalized = value.trim().toLowerCase();

  if (!KNOWN_MODES.has(normalized)) {
    throw new DurabilityPolicyError(
      'DURABILITY_MODE_INVALID',
      `Unknown durability mode: ${normalized}. Expected local-first or strict-cloud-only.`
    );
  }

  return normalized as DurabilityMode;
}

export function isStrictCloudOnly(mode: DurabilityMode): boolean {
  return mode === 'strict-cloud-only';
}

export class DurabilityPolicy {
  readonly mode: DurabilityMode;

  constructor(mode: DurabilityMode) {
    this.mode = mode;
  }

  static fromEnvironment(env: NodeJS.ProcessEnv = process.env): DurabilityPolicy {
    return new DurabilityPolicy(resolveDurabilityMode(env.TOOLNET_DURABILITY_MODE));
  }

  decide(request: DurabilityWriteRequest): DurabilityDecision {
    if (this.mode === 'local-first' || ALLOWED_IN_STRICT_MODE.has(request.writeClass)) {
      return {
        allowed: true,
        mode: this.mode,
        writeClass: request.writeClass,
        path: request.path,
        reason: request.reason,
      };
    }

    return {
      allowed: false,
      mode: this.mode,
      writeClass: request.writeClass,
      path: request.path,
      reason: request.reason,
      code: 'STRICT_CLOUD_ONLY_WRITE_BLOCKED',
    };
  }

  assertAllowed(request: DurabilityWriteRequest): void {
    const decision = this.decide(request);

    if (decision.allowed) {
      return;
    }

    throw new DurabilityPolicyError(
      'STRICT_CLOUD_ONLY_WRITE_BLOCKED',
      `Strict cloud-only mode forbids ${request.writeClass} writes to ${request.path}: ${request.reason}`
    );
  }
}
