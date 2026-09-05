import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 44 canonical WorkState projection path', () => {
  it('keeps SessionCore as the only session local checkpoint owner', () => {
    const core = readFileSync('src/session/core.ts', 'utf8');
    const checkpoint = readFileSync('src/session/local-checkpoint.ts', 'utf8');
    expect(core).toContain('checkpointLocalSession(this.project, this.identity, events)');
    expect(checkpoint).toContain('extractWorkObservations(identity, events)');
    expect(checkpoint).toContain('applyObservationsToLocalWorkState(project, observations)');
  });

  it('does not let Codex or OpenCode adapters write WorkState directly', () => {
    for (const file of ['src/session/codex/adapter.ts', 'src/session/opencode/adapter.ts']) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toContain('applyObservationsToLocalWorkState');
      expect(source).not.toContain('writeStableWorkStateToCurrent');
      expect(source).not.toContain('writeSessionOrigin');
    }
  });

  it('retains the legacy observation extractor and current.json compatibility boundary', () => {
    const local = readFileSync('src/work-continuity/local-work-state.ts', 'utf8');
    const reducer = readFileSync('src/work-continuity/reducer.ts', 'utf8');
    expect(local).toContain("join(project.rootPath, '.toolnet', 'work', 'current.json')");
    expect(reducer).toContain("join(localDirectory, 'current.json')");
    expect(reducer).toContain('projectWorkStateWithTasks');
  });
});
