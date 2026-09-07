import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';
import { TaskOrchestrationEngine } from '../../src/tasks/orchestration-engine.js';
import { buildCurrentWorkProjection } from '../../src/work-continuity/current-work-projection.js';
const roots: string[] = [];
function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase55-'));
  roots.push(root);
  mkdirSync(join(root, '.toolnet'), {
    recursive: true,
  });
  return {
    id: `phase55-${roots.length}`,
    name: 'phase55-test',
    rootPath: root,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}
afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (!root) {
      continue;
    }
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
describe('Phase 55 structured Artifact evidence', () => {
  it('keeps planned, executed and verified as distinct immutable states', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'deploy-task',
      kind: 'task',
      title: 'Deploy production',
      priority: 'high',
    });
    await state.start(task.id);
    const planned = await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Production deploy',
      artifact: {
        key: 'production-deploy',
        type: 'deploy',
        state: 'planned',
        command: 'npm run deploy',
      },
    });
    expect(planned.evidence.at(-1)?.artifact?.state).toBe('planned');
    expect(planned.evidence.at(-1)?.artifact?.executedAt).toBeUndefined();
    expect(planned.evidence.at(-1)?.artifact?.verifiedAt).toBeUndefined();
    const executed = await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Production deploy',
      artifact: {
        key: 'production-deploy',
        type: 'deploy',
        state: 'executed',
        command: 'npm run deploy',
        exitCode: 0,
      },
    });
    const executedArtifact = executed.evidence.at(-1)?.artifact;
    expect(executedArtifact?.state).toBe('executed');
    expect(executedArtifact?.executedAt).toBeDefined();
    /*
     * Core Phase 55 invariant:
     *
     * command exit=0 does NOT mean production was verified.
     */
    expect(executedArtifact?.verifiedAt).toBeUndefined();
    const beforeVerification = buildCurrentWorkProjection(manifest);
    expect(beforeVerification.artifacts).toHaveLength(1);
    expect(beforeVerification.artifacts[0]).toContain('[executed] deploy');
    expect(beforeVerification.artifacts[0]).not.toContain('[verified]');
    const verified = await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Production deploy',
      ref: 'https://example.test/health',
      artifact: {
        key: 'production-deploy',
        type: 'deploy',
        state: 'verified',
        command: 'curl -fsS https://example.test/health',
        exitCode: 0,
      },
    });
    const verifiedArtifact = verified.evidence.at(-1)?.artifact;
    expect(verifiedArtifact?.state).toBe('verified');
    expect(verifiedArtifact?.executedAt).toBeDefined();
    expect(verifiedArtifact?.verifiedAt).toBeDefined();
    const afterVerification = buildCurrentWorkProjection(manifest);
    /*
     * current.md sees only newest logical state,
     * while immutable Task evidence still contains all 3 records.
     */
    expect(afterVerification.artifacts).toHaveLength(1);
    expect(afterVerification.artifacts[0]).toContain('[verified] deploy');
    expect(
      store
        .getTask(task.id)
        ?.evidence.filter(
          (item) => item.kind === 'artifact' && item.artifact?.key === 'production-deploy'
        )
    ).toHaveLength(3);
  });
  it('tracks important production and SEO artifact paths', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'seo-task',
      kind: 'task',
      title: 'SEO production audit',
      priority: 'high',
    });
    await state.start(task.id);
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Production backup',
      artifact: {
        key: 'production-backup',
        type: 'backup',
        state: 'verified',
        path: '/root/backups/site-2026-09-08',
        digest: 'sha256:backup-digest',
      },
    });
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'SEO audit JSON',
      artifact: {
        key: 'seo-report',
        type: 'seo-audit',
        state: 'executed',
        path: '/root/reports/seo-2026-09-08.json',
        exitCode: 0,
      },
    });
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Crawler output',
      artifact: {
        key: 'crawler-output',
        type: 'crawler-output',
        state: 'verified',
        path: '/root/reports/crawler-output.json',
      },
    });
    const current = buildCurrentWorkProjection(manifest);
    const rendered = current.artifacts.join('\n');
    expect(rendered).toContain('/root/backups/site-2026-09-08');
    expect(rendered).toContain('/root/reports/seo-2026-09-08.json');
    expect(rendered).toContain('/root/reports/crawler-output.json');
    expect(rendered).toContain('[verified] backup');
    expect(rendered).toContain('[executed] seo-audit');
    expect(rendered).toContain('[verified] crawler-output');
  });
  it('keeps legacy artifact evidence backward compatible', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'legacy-artifact-task',
      kind: 'task',
      title: 'Legacy artifact',
      priority: 'normal',
    });
    await state.start(task.id);
    const updated = await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Old report format',
      ref: '/tmp/legacy-report.json',
    });
    expect(updated.evidence.at(-1)?.artifact).toBeUndefined();
    const current = buildCurrentWorkProjection(manifest);
    expect(current.artifacts[0]).toContain('[legacy] artifact');
    expect(current.artifacts[0]).toContain('/tmp/legacy-report.json');
  });
  it('fails closed on invalid Artifact state combinations', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'invalid-artifact-task',
      kind: 'task',
      title: 'Invalid artifact checks',
      priority: 'normal',
    });
    await expect(
      state.addEvidence(task.id, {
        kind: 'artifact',
        summary: 'Impossible planned deploy',
        artifact: {
          type: 'deploy',
          state: 'planned',
          command: 'npm run deploy',
          exitCode: 0,
        },
      })
    ).rejects.toThrow('TASK_ARTIFACT_PLANNED_EXECUTION_METADATA');
    await expect(
      state.addEvidence(task.id, {
        kind: 'artifact',
        summary: 'Impossible verified failure',
        artifact: {
          type: 'deploy',
          state: 'verified',
          exitCode: 1,
        },
      })
    ).rejects.toThrow('TASK_ARTIFACT_VERIFIED_EXIT_CODE_INVALID');
    await expect(
      state.addEvidence(task.id, {
        kind: 'note',
        summary: 'Wrong evidence kind',
        artifact: {
          type: 'report',
          state: 'executed',
        },
      })
    ).rejects.toThrow('TASK_ARTIFACT_REQUIRES_ARTIFACT_EVIDENCE');
  });
  it('includes structured Artifacts in Task resume context', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'resume-artifact-task',
      kind: 'task',
      title: 'Resume production work',
      priority: 'high',
    });
    await state.start(task.id);
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Deployment report',
      artifact: {
        key: 'deploy-report',
        type: 'report',
        state: 'verified',
        path: '/root/reports/deploy.json',
      },
    });
    const orchestration = new TaskOrchestrationEngine(store);
    const context = orchestration.resumeContext(task.id);
    expect(context.artifacts).toHaveLength(1);
    expect(context.artifacts?.[0]).toContain('/root/reports/deploy.json');
    expect(context.artifacts?.[0]).toContain('[verified] report');
  });
});
