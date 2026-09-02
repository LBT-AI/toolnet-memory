import type { RetentionPolicy } from './types.js';

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  keepSnapshots: 10,
  runtimeDays: 30,
  staleLockMinutes: 10,
};

function integerAtLeast(value: number, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }

  return value;
}

export function validateRetentionPolicy(input: RetentionPolicy): RetentionPolicy {
  const keepSnapshots = integerAtLeast(input.keepSnapshots, 1, 'keepSnapshots');

  const runtimeDays = integerAtLeast(input.runtimeDays, 1, 'runtimeDays');

  const staleLockMinutes = integerAtLeast(input.staleLockMinutes, 1, 'staleLockMinutes');

  let snapshotMaxAgeDays: number | undefined;

  if (input.snapshotMaxAgeDays !== undefined) {
    snapshotMaxAgeDays = integerAtLeast(input.snapshotMaxAgeDays, 1, 'snapshotMaxAgeDays');
  }

  return {
    keepSnapshots,
    runtimeDays,
    staleLockMinutes,
    ...(snapshotMaxAgeDays !== undefined
      ? {
          snapshotMaxAgeDays,
        }
      : {}),
  };
}

export function retentionPolicy(overrides: Partial<RetentionPolicy> = {}): RetentionPolicy {
  return validateRetentionPolicy({
    ...DEFAULT_RETENTION_POLICY,
    ...overrides,
  });
}
