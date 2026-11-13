import { describe, expect, it } from 'vitest';

import {
  compileResumePacket,
  type ResumePacketSource,
} from '../../src/work-continuity/resume-packet-v07.js';

function fixture(): ResumePacketSource {
  return {
    project: {
      id: 'project-a',
      name: 'Project A',
      branch: 'main',
      currentCodeRevision: 'sha-123',
      flows: [
        { id: 'flow-auth', description: 'API -> Queue -> Worker -> DB', critical: true },
        { id: 'flow-admin', description: 'Admin -> API -> DB', critical: false },
      ],
      rules: [
        { id: 'no-token-logs', text: 'Never log raw access tokens.', mandatory: true, verified: true },
        {
          id: 'keep-public-api',
          text: 'Preserve public API contracts.',
          mandatory: true,
          verified: true,
        },
        { id: 'style', text: 'Prefer guard clauses.', mandatory: false, verified: true },
      ],
    },
    checkpoint: {
      revision: 42,
      cloudAcknowledged: true,
      sourceAgent: 'agy-cli',
      codeRevision: 'sha-123',
    },
    taskBoard: {
      completed: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
      pending: ['T9', 'T10'],
      blocked: [],
    },
    activeTask: {
      id: 'T8',
      title: 'Fix worker retry handling',
      status: 'in_progress',
      verification: 'partially_verified',
      done: ['Retry logic implemented'],
      remaining: ['Complete error handling', 'Run integration tests'],
      filesTouched: ['src/worker/retry.ts'],
      blockers: [],
      nextAction: 'Complete retry errors and run integration tests.',
      evidenceRefs: ['test-run:42'],
    },
  };
}

describe('v0.7 cross-agent resume packet compiler', () => {
  it('preserves active task, task board, next actions, mandatory rules and critical flow', () => {
    const result = compileResumePacket(fixture(), { budgetTokens: 2000 });

    expect(result.sourceRevision).toBe(42);
    expect(result.text).toContain('cloud ACK');
    expect(result.text).toContain('source agy-cli');
    expect(result.text).toContain('T1; T2; T3; T4; T5; T6; T7');
    expect(result.text).toContain('active=T8 (in_progress)');
    expect(result.text).toContain('pending=T9; T10');
    expect(result.text).toContain('Run integration tests');
    expect(result.text).toContain('src/worker/retry.ts');
    expect(result.text).toContain('Never log raw access tokens.');
    expect(result.text).toContain('Preserve public API contracts.');
    expect(result.text).toContain('API -> Queue -> Worker -> DB');
    expect(result.exceedsBudget).toBe(false);
  });

  it('never removes mandatory facts even when token budget is too small', () => {
    const result = compileResumePacket(fixture(), { budgetTokens: 1 });

    expect(result.exceedsBudget).toBe(true);
    expect(result.warnings).toContain('MANDATORY_CONTEXT_EXCEEDS_SOFT_BUDGET');
    expect(result.text).toContain('Never log raw access tokens.');
    expect(result.text).toContain('T8');
    expect(result.text).toContain('Run integration tests');
  });

  it('refuses to claim a checkpoint persisted without cloud acknowledgment', () => {
    const source = fixture();
    source.checkpoint.cloudAcknowledged = false;

    expect(() => compileResumePacket(source)).toThrow('RESUME_UNACKNOWLEDGED_CLOUD_CHECKPOINT');
  });

  it('rejects an active task already marked completed', () => {
    const source = fixture();
    source.taskBoard.completed.push('T8');

    expect(() => compileResumePacket(source)).toThrow('RESUME_ACTIVE_TASK_ALREADY_COMPLETED');
  });

  it('detects status conflict across board collections', () => {
    const source = fixture();
    source.taskBoard.pending.push('T7');

    expect(() => compileResumePacket(source)).toThrow('RESUME_CONFLICTING_TASK_STATUS');
  });

  it('warns about code revision mismatch and does not pretend code was verified', () => {
    const source = fixture();
    source.project.currentCodeRevision = 'sha-new';

    const result = compileResumePacket(source, { budgetTokens: 2000 });
    expect(result.warnings).toContain('CODE_REVISION_MISMATCH: verify working tree before editing');
    expect(result.text).toContain('WARNING: code revision differs');
  });

  it('distinguishes unverified mandatory rules from verified project rules', () => {
    const source = fixture();
    source.project.rules[0].verified = false;

    const result = compileResumePacket(source, { budgetTokens: 2000 });
    expect(result.text).toContain('UNVERIFIED RULE [no-token-logs]');
    expect(result.warnings).toContain('RULE_NOT_VERIFIED:no-token-logs');
  });

  it('accepts injected token counter, avoids optional content and reports overflow', () => {
    const result = compileResumePacket(fixture(), {
      mode: 'standard',
      budgetTokens: 200,
      countTokens: (text) => text.length,
    });

    expect(result.omittedOptionalSections).toContain('evidence');
    expect(result.text).not.toContain('test-run:42');
    expect(result.text).toContain('Preserve public API contracts.');
    expect(result.exceedsBudget).toBe(true);
  });

  it('never fabricates an unknown next action', () => {
    const source = fixture();
    source.activeTask.nextAction = '';

    const result = compileResumePacket(source, { budgetTokens: 2000 });
    expect(result.text).toContain('Next action: UNKNOWN - verify task before editing');
  });

  it('does not read/write storage while formatting a packet', () => {
    const original = fixture();
    const before = JSON.stringify(original);
    compileResumePacket(original, { mode: 'full', budgetTokens: 4000 });
    expect(JSON.stringify(original)).toBe(before);
  });
});
