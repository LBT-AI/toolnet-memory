import type { ProjectManifest } from '../../core/types.js';
import { TaskMirrorEngine } from '../../tasks/mirror-engine.js';
import type { TaskMirrorPlan } from '../../tasks/mirror-types.js';
import { TaskStore } from '../../tasks/store.js';
import type { NormalizedSessionEvent } from '../types.js';
import { extractNativePlanSnapshots } from './index.js';
import type { NativePlanDiagnostic } from './common.js';

export interface NativePlanShadowResult {
  plans: TaskMirrorPlan[];
  diagnostics: NativePlanDiagnostic[];
}

export function planNativeTaskMirrorsShadow(
  project: Pick<ProjectManifest, 'id'>,
  store: TaskStore,
  events: NormalizedSessionEvent[]
): NativePlanShadowResult {
  const extracted = extractNativePlanSnapshots(events);
  const mirror = new TaskMirrorEngine(project, store);
  return {
    plans: extracted.snapshots.map((snapshot) => mirror.plan(snapshot)),
    diagnostics: extracted.diagnostics,
  };
}
