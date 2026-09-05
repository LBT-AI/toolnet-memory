import type { ProjectManifest } from '../../core/types.js';
import type { TaskMirrorBindingDiagnostic } from '../../tasks/mirror-binding-types.js';
import { TaskMirrorBindingStore } from '../../tasks/mirror-binding-store.js';
import { TaskMirrorEngine } from '../../tasks/mirror-engine.js';
import type { TaskMirrorPlan } from '../../tasks/mirror-types.js';
import { TaskStore } from '../../tasks/store.js';
import type { NormalizedSessionEvent } from '../types.js';
import { extractNativePlanSnapshots } from './index.js';

export interface CorrelatedNativePlanShadowResult {
  plans: TaskMirrorPlan[];
  diagnostics: TaskMirrorBindingDiagnostic[];
  replayedSnapshots: number;
  persistedSnapshots: number;
  ignoredSnapshots: number;
}

export async function planCorrelatedNativeTaskMirrorsShadow(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  taskStore: TaskStore,
  events: NormalizedSessionEvent[]
): Promise<CorrelatedNativePlanShadowResult> {
  const extracted = extractNativePlanSnapshots(events);
  const bindingStore = new TaskMirrorBindingStore(project);
  const mirror = new TaskMirrorEngine(project, taskStore);
  const plans: TaskMirrorPlan[] = [];
  const diagnostics: TaskMirrorBindingDiagnostic[] = extracted.diagnostics.map((item) => ({
    provider: item.provider,
    sourceEventId: item.sourceEventId,
    code: item.code,
    message: item.message,
  }));
  let replayedSnapshots = 0;
  let persistedSnapshots = 0;
  let ignoredSnapshots = 0;

  for (const snapshot of extracted.snapshots) {
    const correlated = await bindingStore.correlate(snapshot);
    diagnostics.push(...correlated.diagnostics);
    if (correlated.replay) {
      replayedSnapshots += 1;
    }
    if (correlated.persisted) {
      persistedSnapshots += 1;
    }
    if (correlated.ignored || !correlated.snapshot) {
      ignoredSnapshots += 1;
      continue;
    }
    plans.push(mirror.plan(correlated.snapshot));
  }

  return {
    plans,
    diagnostics,
    replayedSnapshots,
    persistedSnapshots,
    ignoredSnapshots,
  };
}
