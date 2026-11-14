/**
 * Strict cloud-only write barrier.
 *
 * `durability-policy.ts` is the decision table; this module is the shared guard
 * every ToolNet-owned persistence path calls before it touches the filesystem.
 * It exists so a new writer cannot silently bypass strict mode by only checking
 * an environment variable itself.
 *
 * In strict mode:
 * - memory-durable, memory-transient and telemetry writes are refused;
 * - an invalid/typo durability mode fails closed (refused), never open;
 * - agent configuration and project source stay writable, because they are not
 *   ToolNet memory.
 *
 * Local-first deployments keep the legacy behaviour unchanged.
 */

import {
  DurabilityPolicy,
  DurabilityPolicyError,
  resolveDurabilityMode,
  type WriteClass,
} from './durability-policy.js';

export interface DurableWriteRequest {
  path: string;
  writeClass: WriteClass;
  reason: string;
}

/**
 * True when the process must not persist ToolNet memory.
 *
 * An unparsable mode is treated as strict: a configuration typo must not turn a
 * hardened VPS into a disk-writing deployment.
 */
export function isStrictCloudOnlyEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  try {
    return resolveDurabilityMode(env.TOOLNET_DURABILITY_MODE) === 'strict-cloud-only';
  } catch {
    return true;
  }
}

/** Throw if this write is forbidden in the current durability mode. */
export function assertDurableWriteAllowed(
  request: DurableWriteRequest,
  env: NodeJS.ProcessEnv = process.env
): void {
  let policy: DurabilityPolicy;

  try {
    policy = DurabilityPolicy.fromEnvironment(env);
  } catch (error) {
    if (error instanceof DurabilityPolicyError) {
      throw new DurabilityPolicyError(
        'STRICT_CLOUD_ONLY_WRITE_BLOCKED',
        `Refusing ${request.writeClass} write to ${request.path}: ${error.message}`
      );
    }

    throw error;
  }

  policy.assertAllowed(request);
}

/** True when the write is allowed; never throws for a known policy mode. */
export function durableWriteAllowed(
  request: DurableWriteRequest,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const policy = DurabilityPolicy.fromEnvironment(env);
  return policy.decide(request).allowed;
}
