import { mkdtempSync, readdirSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { InMemoryCloudAuthority } from '../../src/v0.7/cloud-authority.js';
import { CheckpointEngine } from '../../src/v0.7/checkpoint.js';
import { resumeFromCloud } from '../../src/v0.7/resume.js';
import { buildProjectBrain } from '../../src/v0.7/project-brain.js';
import { StrictCloudMode } from '../../src/v0.7/strict-mode.js';
import { DurabilityPolicy, resolveDurabilityMode } from '../../src/v0.7/durability-policy.js';
import { createDurabilityAwareStorageProvider } from '../../src/v0.7/cloud-storage.js';
import { MigrationManager } from '../../src/v0.7/security/migration-manager.js';
import { ProjectAuthenticator } from '../../src/v0.7/security/project-auth.js';
import { RevisionManager } from '../../src/v0.7/security/revision-fencing.js';
import { SecretRedactor } from '../../src/v0.7/security/secret-redaction.js';

describe('v0.7 Zero-Disk Runtime Audit - All Write Paths', () => {
  let testRoot: string;
  let authority: InMemoryCloudAuthority;
  let strictMode: StrictCloudMode;

  beforeEach(() => {
    testRoot = mkdtempSync(join(tmpdir(), 'toolnet-zero-disk-'));
    authority = new InMemoryCloudAuthority();
    authority.seed({
      projectId: 'test-project',
      projectName: 'Test Project',
      tasks: [{ id: 't1', title: 'T1', status: 'in_progress' }],
    });
    strictMode = new StrictCloudMode({ strictCloudOnly: true, allowLocalFallback: false });
  });

  afterEach(() => {
    rmSync(testRoot, { recursive: true, force: true });
  });

  const findToolnetViolations = (dir: string = testRoot): string[] => {
    const violations: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.toolnet') {
        violations.push(join(dir, entry.name));
      }
      if (entry.isDirectory()) {
        violations.push(...findToolnetViolations(join(dir, entry.name)));
      }
    }
    return violations;
  };

  const findMemoryFileViolations = (dir: string = testRoot): string[] => {
    const violations: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    const forbiddenPatterns = [
      'session-wal',
      'task-store',
      'work-state',
      'checkpoint',
      'handoff',
      'cache',
      'index',
      'codeintelligence',
      'telemetry',
      'log',
      'migration-backup',
      '.toolnet',
    ];

    for (const entry of entries) {
      const name = entry.name.toLowerCase();
      for (const pattern of forbiddenPatterns) {
        if (name.includes(pattern)) {
          violations.push(join(dir, entry.name));
        }
      }
      if (entry.isDirectory()) {
        violations.push(...findMemoryFileViolations(join(dir, entry.name)));
      }
    }
    return violations;
  };

  describe('StrictCloudMode enforcement', () => {
    it('blocks all 12 memory write classes in strict mode', () => {
      const writeClasses = [
        'session.wal',
        'taskstore.write',
        'workstate.save',
        'handoff.snapshot',
        'startup.cache',
        'injection.marker',
        'memory.index',
        'codeintelligence.index',
        'retrieval.cache',
        'telemetry.write',
        'background.worker',
        'temporary.file',
      ];

      for (const wc of writeClasses) {
        const allowed = strictMode.validateStorageAccess('test-project', wc);
        expect(allowed).toBe(false);
      }
      expect(strictMode.getViolations().length).toBe(writeClasses.length);
    });

    it('allows agent-config and source writes in strict mode', () => {
      strictMode.clearViolations();
      expect(strictMode.validateStorageAccess('test-project', 'agent-config')).toBe(true);
      expect(strictMode.validateStorageAccess('test-project', 'source')).toBe(true);
    });

    it('fails closed on cloud failure - no local fallback', () => {
      const result = strictMode.validateCloudFailureHandling('test-project');
      expect(result).toBe(false);
      expect(strictMode.getViolations().length).toBe(1);
    });

    it('enforces checkpoint must be cloud-acknowledged', () => {
      expect(
        strictMode.validateCheckpointAcknowledged('test-project', { acknowledged: true })
      ).toBe(true);
      expect(
        strictMode.validateCheckpointAcknowledged('test-project', { acknowledged: false })
      ).toBe(false);
      expect(strictMode.validateCheckpointAcknowledged('test-project', null)).toBe(false);
      expect(strictMode.validateCheckpointAcknowledged('test-project', undefined)).toBe(false);
    });

    it('enforces memory buffer limits', () => {
      const strictModeSmall = new StrictCloudMode({
        strictCloudOnly: true,
        maxMemoryBufferSize: 1000,
      });
      expect(strictModeSmall.validateMemoryBuffer('test-project', 500)).toBe(true);
      expect(strictModeSmall.validateMemoryBuffer('test-project', 2000)).toBe(false);
    });
  });

  describe('CheckpointEngine - cloud-only, RAM buffered', () => {
    it('submits to cloud authority only, never writes local files', async () => {
      const engine = new CheckpointEngine({ authority, mode: 'strict-cloud-only' });
      const result = await engine.submit({
        projectId: 'test-project',
        agentId: 'agy',
        expectedRevision: 0,
        operations: [{ type: 'decision.add', text: 'hello' }],
        now: Date.now(),
      });
      expect(result.durabilityMode).toBe('strict-cloud-only');
      expect(result.status).toBe('acknowledged');
      expect(findToolnetViolations()).toHaveLength(0);
      expect(findMemoryFileViolations()).toHaveLength(0);
    });

    it('buffers in RAM on retryable failure, no disk spill', async () => {
      const failingAuthority = new InMemoryCloudAuthority();
      failingAuthority.failCommits(1);
      failingAuthority.seed({
        projectId: 'fail-project',
        projectName: 'Fail Project',
        tasks: [{ id: 't1', title: 'T1' }],
      });

      const engine = new CheckpointEngine({
        authority: failingAuthority,
        mode: 'strict-cloud-only',
      });
      const result = await engine.submit({
        projectId: 'fail-project',
        agentId: 'agy',
        expectedRevision: 0,
        operations: [{ type: 'decision.add', text: 'fail' }],
        now: Date.now(),
      });
      expect(result.status).toBe('unacknowledged');
      expect(result.retryable).toBe(true);
      expect(result.buffered).toBe(1);
      expect(findToolnetViolations()).toHaveLength(0);
      expect(findMemoryFileViolations()).toHaveLength(0);
    });

    it('rejects non-retryable failures without buffering', async () => {
      const failingAuthority = new InMemoryCloudAuthority();
      failingAuthority.failCommitsWith('AUTHORITY_AUTH_FAILED', 1);
      failingAuthority.seed({
        projectId: 'auth-fail',
        projectName: 'Auth Fail',
        tasks: [{ id: 't1', title: 'T1' }],
      });

      const engine = new CheckpointEngine({
        authority: failingAuthority,
        mode: 'strict-cloud-only',
      });
      const result = await engine.submit({
        projectId: 'auth-fail',
        agentId: 'agy',
        expectedRevision: 0,
        operations: [{ type: 'decision.add', text: 'auth' }],
        now: Date.now(),
      });
      expect(result.status).toBe('unacknowledged');
      expect(result.retryable).toBe(false);
      expect(result.buffered).toBe(0);
      expect(findToolnetViolations()).toHaveLength(0);
    });
  });

  describe('resumeFromCloud - cloud-only, no local state', () => {
    it('fetches from cloud authority only, no local files created', async () => {
      const engine = new CheckpointEngine({ authority, mode: 'strict-cloud-only' });
      await engine.submit({
        projectId: 'test-project',
        agentId: 'agy',
        expectedRevision: 0,
        operations: [{ type: 'decision.add', text: 'hello' }],
        now: Date.now(),
      });
      const result = await resumeFromCloud({
        authority,
        projectId: 'test-project',
        mode: 'standard',
      });
      expect(result.available).toBe(true);
      expect(findToolnetViolations()).toHaveLength(0);
      expect(findMemoryFileViolations()).toHaveLength(0);
    });

    it('returns unavailable when no acknowledged checkpoint', async () => {
      const freshAuthority = new InMemoryCloudAuthority();
      freshAuthority.seed({
        projectId: 'no-checkpoint',
        projectName: 'No Checkpoint',
        tasks: [{ id: 't1', title: 'T1', status: 'pending' }],
      });
      const result = await resumeFromCloud({
        authority: freshAuthority,
        projectId: 'no-checkpoint',
      });
      expect(result.available).toBe(false);
      if (!result.available) {
        expect(result.code).toBe('NO_ACKNOWLEDGED_CHECKPOINT');
      }
      expect(findToolnetViolations()).toHaveLength(0);
    });

    it('fails closed when cloud authority unavailable', async () => {
      const failingAuthority = new InMemoryCloudAuthority();
      failingAuthority.setOffline(true);
      const result = await resumeFromCloud({
        authority: failingAuthority,
        projectId: 'unavailable',
      });
      expect(result.available).toBe(false);
      if (!result.available) {
        expect(result.code).toBe('AUTHORITY_UNAVAILABLE');
      }
      expect(findToolnetViolations()).toHaveLength(0);
    });
  });

  describe('ProjectBrain - derived view only, no writes', () => {
    it('builds from authority snapshot without any disk writes', async () => {
      const snapshot = await authority.fetchSnapshot('test-project');
      const brain = buildProjectBrain({ snapshot, currentCodeRevision: 'abc123' });
      expect(brain.projectId).toBe('test-project');
      expect(brain.rules).toBeDefined();
      expect(findToolnetViolations()).toHaveLength(0);
    });
  });

  describe('DurabilityPolicy - single decision point', () => {
    it('resolveDurabilityMode rejects unknown values', () => {
      expect(() => resolveDurabilityMode('invalid-mode')).toThrow('DURABILITY_MODE_INVALID');
    });

    it('returns strict-cloud-only when env set', () => {
      const mode = resolveDurabilityMode('strict-cloud-only');
      expect(mode).toBe('strict-cloud-only');
    });

    it('returns local-first when env not set', () => {
      const mode = resolveDurabilityMode(undefined);
      expect(mode).toBe('local-first');
    });

    it('DurabilityPolicy.decide blocks memory writes in strict mode', () => {
      const policy = new DurabilityPolicy('strict-cloud-only');
      const decision = policy.decide({
        path: '/tmp/test.json',
        writeClass: 'memory-durable',
        reason: 'test write',
      });
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe('STRICT_CLOUD_ONLY_WRITE_BLOCKED');
    });

    it('DurabilityPolicy.decide allows agent-config and source in strict mode', () => {
      const policy = new DurabilityPolicy('strict-cloud-only');
      expect(
        policy.decide({ path: '/tmp/config.json', writeClass: 'agent-config', reason: 'config' })
          .allowed
      ).toBe(true);
      expect(
        policy.decide({ path: '/src/main.ts', writeClass: 'source', reason: 'source' }).allowed
      ).toBe(true);
    });

    it('DurabilityPolicy.assertAllowed throws on blocked write', () => {
      const policy = new DurabilityPolicy('strict-cloud-only');
      expect(() =>
        policy.assertAllowed({
          path: '/tmp/test.json',
          writeClass: 'memory-durable',
          reason: 'test',
        })
      ).toThrow('STRICT_CLOUD_ONLY_WRITE_BLOCKED');
    });
  });

  describe('CloudStorage - fails closed without credentials', () => {
    it('throws when R2 credentials missing in strict mode', () => {
      expect(() =>
        createDurabilityAwareStorageProvider(
          {
            provider: 'r2',
            r2: { accountId: '', bucket: 'test', accessKeyId: '', secretAccessKey: '' },
          },
          'strict-cloud-only'
        )
      ).toThrow('STRICT_CLOUD_ONLY_WRITE_BLOCKED');
    });

    it('throws when S3 credentials missing in strict mode', () => {
      expect(() =>
        createDurabilityAwareStorageProvider(
          {
            provider: 's3',
            s3: { bucket: 'test', accessKeyId: '', secretAccessKey: '' },
          },
          'strict-cloud-only'
        )
      ).toThrow('STRICT_CLOUD_ONLY_WRITE_BLOCKED');
    });

    it('throws when provider not cloud in strict mode', () => {
      expect(() =>
        createDurabilityAwareStorageProvider(
          {
            provider: 'local',
          },
          'strict-cloud-only'
        )
      ).toThrow('STRICT_CLOUD_ONLY_WRITE_BLOCKED');
    });

    it('allows local-first mode with local provider', () => {
      const provider = createDurabilityAwareStorageProvider(
        {
          provider: 'local',
        },
        'local-first'
      );
      expect(provider).toBeDefined();
    });
  });

  describe('MigrationManager - backups cloud-only in strict mode', () => {
    it('migrates v0.6.2 data without local backup files in strict mode', async () => {
      const manager = new MigrationManager();
      const sourceData = {
        version: '0.6.2',
        projects: [{ id: 'p1', name: 'P1', tasks: [{ id: 't1', title: 'T1' }] }],
      };
      const sourcePath = join(testRoot, 'v062-data.json');
      writeFileSync(sourcePath, JSON.stringify(sourceData));

      const result = await manager.migrateFromV062(sourcePath, 'test-project');
      expect(result.success).toBe(true);
      expect(result.backup).toBeDefined();
      expect(findToolnetViolations()).toHaveLength(0);
      expect(findMemoryFileViolations()).toHaveLength(0);
    });

    it('backup record has correct source version', async () => {
      const manager = new MigrationManager();
      const sourceData = { version: '0.6.2', projects: [] };
      const sourcePath = join(testRoot, 'v062-data.json');
      writeFileSync(sourcePath, JSON.stringify(sourceData));
      const result = await manager.migrateFromV062(sourcePath, 'test-project');
      expect(result.backup!.version).toBe('0.6.2');
    });
  });

  describe('Security - ProjectAuthenticator, RevisionManager, SecretRedactor', () => {
    it('ProjectAuthenticator validates tokens without disk', () => {
      const auth = new ProjectAuthenticator();
      auth.register({
        projectId: 'p1',
        projectName: 'P1',
        token: 'secret',
        allowedAgents: ['agy'],
        allowedOperations: ['read', 'write'],
      });
      expect(auth.validateAuth('p1', 'secret', 'agy').valid).toBe(true);
      expect(auth.validateAuth('p1', 'wrong', 'agy').valid).toBe(false);
      expect(auth.validateAuth('p1', 'secret', 'codex').valid).toBe(false);
      expect(findToolnetViolations()).toHaveLength(0);
    });

    it('RevisionManager tracks revisions in memory only', () => {
      const rev = new RevisionManager();
      const r1 = rev.trackRevision('p1', { data: 'test' }, 'agy');
      expect(r1.version).toBe(1);
      const r2 = rev.trackRevision('p1', { data: 'test2' }, 'agy');
      expect(r2.version).toBe(2);
      const conflict = rev.validateRevision('p1', 1, r1.checksum);
      expect(conflict.error).toBe('OK');
      expect(findToolnetViolations()).toHaveLength(0);
    });

    it('SecretRedactor redacts secrets without writing logs to disk', () => {
      const redactor = new SecretRedactor();
      const input = { apiKey: 'sk-1234567890abcdefghijklmnopqrstuvwx', message: 'hello' };
      const output = redactor.redact(input);
      const outputStr = JSON.stringify(output);
      expect(outputStr).not.toContain('sk-1234567890abcdefghijklmnopqrstuvwx');
      expect(outputStr).toContain('[REDACTED]');
      expect(findToolnetViolations()).toHaveLength(0);
    });
  });

  describe('Filesystem Instrumentation - detect unauthorized writes', () => {
    it('detects any .toolnet directory creation', () => {
      const forbiddenDir = join(testRoot, '.toolnet', 'memory');
      mkdirSync(forbiddenDir, { recursive: true });
      expect(existsSync(forbiddenDir)).toBe(true);
      const violations = findToolnetViolations();
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some((v) => v.includes('.toolnet'))).toBe(true);
    });

    it('detects memory-related file patterns', () => {
      const forbiddenFiles = [
        'session-wal.json',
        'task-store.json',
        'work-state.json',
        'checkpoint.json',
        'handoff-snapshot.json',
        'cache.json',
        'index.json',
        'telemetry.json',
        'migration-backup.json',
      ];
      for (const f of forbiddenFiles) {
        writeFileSync(join(testRoot, f), 'test');
      }
      const violations = findMemoryFileViolations();
      expect(violations.length).toBeGreaterThan(0);
    });

    it('allows legitimate test runner and OS files', () => {
      writeFileSync(join(testRoot, 'test-results.xml'), '<testsuite></testsuite>');
      writeFileSync(join(testRoot, 'coverage.json'), '{}');
      mkdirSync(join(testRoot, 'node_modules'), { recursive: true });
      writeFileSync(join(testRoot, 'node_modules', 'package.json'), '{}');
      expect(findToolnetViolations()).toHaveLength(0);
      expect(findMemoryFileViolations()).toHaveLength(0);
    });
  });
});
