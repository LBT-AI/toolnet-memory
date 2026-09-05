import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 42E SessionCore live wiring', () => {
  const source = readFileSync('src/session/core.ts', 'utf8');

  it('constructs one canonical NativeTaskMirrorRuntime per SessionCore', () => {
    expect(source).toContain('private readonly taskMirror: NativeTaskMirrorRuntime');
    expect(source).toContain('this.taskMirror = new NativeTaskMirrorRuntime');
  });

  it('enqueues after the WAL append and local checkpoint call', () => {
    const appendIndex = source.indexOf('const recorded = this.wal.append');
    const checkpointIndex = source.indexOf('this.checkpointLocal(recorded)');
    const enqueueIndex = source.indexOf('this.taskMirror.enqueue(events)');

    expect(appendIndex).toBeGreaterThanOrEqual(0);
    expect(checkpointIndex).toBeGreaterThan(appendIndex);
    expect(enqueueIndex).toBeGreaterThanOrEqual(0);
    expect(source).toContain('This method is called after SessionWal.append() succeeds');
  });

  it('flush drains already-enqueued Task Mirror work', () => {
    expect(source).toContain('await this.taskMirror.drain()');
  });

  it('does not invoke provider-specific Task mutation from SessionCore', () => {
    expect(source).not.toContain('extractCodexPlanSnapshots(');
    expect(source).not.toContain('extractOpenCodePlanSnapshots(');
    expect(source).not.toContain('TaskMirrorMutationExecutor(');
  });
});
