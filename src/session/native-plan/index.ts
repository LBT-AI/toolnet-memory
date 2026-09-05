import type { NormalizedSessionEvent } from '../types.js';
import { extractCodexPlanSnapshots } from '../codex/plan-adapter.js';
import { extractOpenCodePlanSnapshots } from '../opencode/plan-adapter.js';
import type { NativePlanExtraction } from './common.js';

export * from './common.js';

export function extractNativePlanSnapshots(events: NormalizedSessionEvent[]): NativePlanExtraction {
  const codex = extractCodexPlanSnapshots(events);
  const opencode = extractOpenCodePlanSnapshots(events);
  return {
    snapshots: [...codex.snapshots, ...opencode.snapshots].sort(
      (left, right) =>
        left.observedAt.localeCompare(right.observedAt) ||
        left.sourceEventId.localeCompare(right.sourceEventId)
    ),
    diagnostics: [...codex.diagnostics, ...opencode.diagnostics],
  };
}
