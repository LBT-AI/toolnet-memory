import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 51 SessionCore self-healing wiring', () => {
  const source = readFileSync('src/session/core.ts', 'utf8');

  it('runs durable Task recovery during session startup', () => {
    expect(source).toContain('recoverSessionTaskState(');
  });

  it('records the durable session resume event before async recovery can overtake later writes', () => {
    const record = source.indexOf('const recorded = this.record({');
    const recovery = source.indexOf('recoverSessionTaskState(', record);
    expect(record).toBeGreaterThanOrEqual(0);
    expect(recovery).toBeGreaterThan(record);
  });

  it('keeps startup recovery fail soft', () => {
    expect(source).toContain('this.taskSelfHealingResultValue = undefined');
  });

  it('exposes recovery diagnostics', () => {
    expect(source).toContain('taskSelfHealingStatus()');
  });
});
