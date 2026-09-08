import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { certifyDisasterRecovery } from '../../src/production/disaster-recovery-certify.js';
describe('Phase 67 disaster recovery', () => {
  it('passes the complete disaster-recovery drill', async () => {
    const result = await certifyDisasterRecovery();
    expect(result, JSON.stringify(result, null, 2)).toMatchObject({
      passed: true,
      backupIntegrity: true,
      taskRecovered: true,
      projectionRebuilt: true,
      walRecovered: true,
      journalRebuilt: true,
      remoteRecovered: true,
      newerRemoteObjectPreserved: true,
      tamperDetected: true,
      dryRunSafe: true,
      safetyBackupCreated: true,
    });
  });
  it('backs up source-of-truth state and excludes rebuildable state', () => {
    const source = readFileSync('src/recovery/disaster-recovery.ts', 'utf8');
    expect(source).toContain("'.toolnet/tasks/events.jsonl'");
    expect(source).toContain("'.toolnet/tasks/replication/replicated'");
    expect(source).toContain("'.toolnet/runtime/sources'");
    expect(source).toContain("'.toolnet/tasks/state.json'");
    expect(source).toContain("'.toolnet/tasks/replication/cursor.json'");
    expect(source).toContain('reconcileSharedProjectJournal');
    expect(source).toContain('rebuildProjection');
  });
  it('requires explicit apply and always creates a safety backup', () => {
    const source = readFileSync('src/recovery/disaster-recovery.ts', 'utf8');
    expect(source).toContain('if (!options.apply)');
    expect(source).toContain('`pre-restore:${backupId}`');
    expect(source).not.toContain('noSafety');
  });
  it('restores remote objects additively and never deletes remote state', () => {
    const source = readFileSync('src/recovery/disaster-recovery.ts', 'utf8');
    const restoreStart = source.indexOf('async function restoreRemoteObjects');
    expect(restoreStart).toBeGreaterThanOrEqual(0);
    const restoreBlock = source.slice(restoreStart, restoreStart + 3500);
    expect(restoreBlock).toContain('storage.put');
    expect(restoreBlock).not.toContain('storage.delete');
  });
  it('is release blocking', () => {
    const source = readFileSync('src/production/production-certify.ts', 'utf8');
    expect(source).toContain('certifyDisasterRecovery');
    expect(source).toContain("'phase67-disaster-recovery'");
  });
  it('does not add an unsafe public top-level restore command', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).not.toContain('recovery:restore)');
    expect(bin).not.toContain('disaster:restore)');
  });
});
