import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import {
  appendAuditEvent,
  auditLogPath,
  readAuditEvents,
  verifyAuditLog,
} from '../../src/audit/log.js';

const roots: string[] = [];

function project() {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-audit-'));
  roots.push(rootPath);
  return { id: 'project-audit', rootPath };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 29 audit log', () => {
  it('creates a valid hash chain', async () => {
    const p = project();

    await appendAuditEvent(p, {
      action: 'memory.save',
      outcome: 'success',
      actor: { kind: 'mcp', id: 'test-agent' },
      details: { memoryId: 'm1' },
    });
    await appendAuditEvent(p, {
      action: 'guard.check',
      outcome: 'blocked',
      actor: { kind: 'agent', id: 'agent-2' },
      details: { warnings: 2 },
    });

    const result = verifyAuditLog(p);
    expect(result.valid).toBe(true);
    expect(result.records).toBe(2);
    const records = readAuditEvents(p, 10);
    expect(records[1].previousHash).toBe(records[0].hash);
  });

  it('detects tampering', async () => {
    const p = project();
    await appendAuditEvent(p, {
      action: 'gc.manual',
      outcome: 'success',
    });
    const file = auditLogPath(p);
    const original = readFileSync(file, 'utf8');
    writeFileSync(file, original.replace('"success"', '"failed"'));
    expect(verifyAuditLog(p).valid).toBe(false);
  });

  it('sanitizes secret-like durable details', async () => {
    const p = project();
    const secret = 'AKIAIOSFODNN7EXAMPLE';
    await appendAuditEvent(p, {
      action: 'guard.check',
      outcome: 'success',
      details: { accidentalSecret: secret },
    });
    expect(readFileSync(auditLogPath(p), 'utf8')).not.toContain(secret);
  });

  it('rejects extension after corrupt tail', async () => {
    const p = project();
    await appendAuditEvent(p, {
      action: 'memory.save',
      outcome: 'success',
    });
    appendFileSync(auditLogPath(p), '{"broken":\n');
    await expect(
      appendAuditEvent(p, {
        action: 'memory.save',
        outcome: 'success',
      })
    ).rejects.toThrow();
  });
});
