import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';
import { sanitizeDurableValue } from '../security/durable-sanitizer.js';

import type { AuditActor, AuditEventInput, AuditRecord, AuditVerificationResult } from './types.js';

const ZERO_HASH = '0'.repeat(64);
const LOCK_STALE_MS = 30_000;
const LOCK_ATTEMPTS = 100;
const LOCK_RETRY_MS = 20;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, milliseconds);
  });
}

export function auditDirectory(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(project.rootPath, '.toolnet', 'audit');
}

export function auditLogPath(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(auditDirectory(project), 'events.jsonl');
}

function auditLockPath(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(project.rootPath, '.toolnet', 'runtime', 'locks', 'audit.lock');
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalValue(record[key])])
  );
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function hashPayload(record: Omit<AuditRecord, 'hash'>): string {
  return createHash('sha256').update(canonicalJson(record), 'utf8').digest('hex');
}

function actorFromEnvironment(): AuditActor {
  const configured = process.env.TOOLNET_AGENT_ID?.trim() || process.env.TOOLNET_AGENT?.trim();
  if (configured) {
    return { kind: 'agent', id: configured };
  }
  return { kind: 'system', id: `pid:${process.pid}` };
}

function readRecords(project: Pick<ProjectManifest, 'rootPath'>): AuditRecord[] {
  const file = auditLogPath(project);
  if (!existsSync(file)) {
    return [];
  }
  const text = readFileSync(file, 'utf8');
  const records: AuditRecord[] = [];
  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    records.push(JSON.parse(trimmed) as AuditRecord);
  }
  return records;
}

function lockIsStale(file: string): boolean {
  try {
    return Date.now() - statSync(file).mtimeMs > LOCK_STALE_MS;
  } catch {
    return true;
  }
}

async function acquireLock(project: Pick<ProjectManifest, 'rootPath'>): Promise<string> {
  const file = auditLockPath(project);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    const token = randomUUID();
    try {
      const fd = openSync(file, 'wx', 0o600);
      try {
        writeFileSync(
          fd,
          JSON.stringify({
            token,
            pid: process.pid,
            createdAt: new Date().toISOString(),
          }) + '\n'
        );
      } finally {
        closeSync(fd);
      }
      return token;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') {
        throw error;
      }
      if (lockIsStale(file)) {
        try {
          unlinkSync(file);
        } catch {
          // Another process may have recovered it first.
        }
        continue;
      }
      await sleep(LOCK_RETRY_MS);
    }
  }
  throw new Error('AUDIT_LOCK_TIMEOUT');
}

function releaseLock(project: Pick<ProjectManifest, 'rootPath'>, token: string): void {
  const file = auditLockPath(project);
  if (!existsSync(file)) {
    return;
  }
  try {
    const current = JSON.parse(readFileSync(file, 'utf8')) as {
      token?: string;
    };
    if (current.token !== token) {
      return;
    }
    unlinkSync(file);
  } catch {
    /*
     * Never delete a lock whose ownership cannot be proven.
     */
  }
}

function lastRecord(project: Pick<ProjectManifest, 'rootPath'>): AuditRecord | undefined {
  const records = readRecords(project);
  return records.at(-1);
}

export async function appendAuditEvent(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  input: AuditEventInput
): Promise<AuditRecord> {
  const token = await acquireLock(project);
  try {
    const previous = lastRecord(project);
    if (previous) {
      const verification = verifyAuditLog(project);
      if (!verification.valid) {
        throw new Error(
          ['AUDIT_LOG_INTEGRITY_FAILED', verification.error ?? ''].filter(Boolean).join(' ')
        );
      }
    }
    const sanitizedDetails = input.details ? sanitizeDurableValue(input.details) : undefined;
    const sanitizedTarget = input.target ? sanitizeDurableValue(input.target) : undefined;
    const actor = sanitizeDurableValue(input.actor ?? actorFromEnvironment());
    const base: Omit<AuditRecord, 'hash'> = {
      version: 1,
      sequence: (previous?.sequence ?? 0) + 1,
      id: randomUUID(),
      at: input.at ?? new Date().toISOString(),
      projectId: project.id,
      action: input.action,
      outcome: input.outcome,
      actor,
      ...(sanitizedTarget ? { target: sanitizedTarget } : {}),
      ...(sanitizedDetails ? { details: sanitizedDetails } : {}),
      previousHash: previous?.hash ?? ZERO_HASH,
    };
    const record: AuditRecord = {
      ...base,
      hash: hashPayload(base),
    };
    const file = auditLogPath(project);
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    appendFileSync(file, JSON.stringify(record) + '\n', { encoding: 'utf8', mode: 0o600 });
    return record;
  } finally {
    releaseLock(project, token);
  }
}

export async function safeAppendAuditEvent(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  input: AuditEventInput
): Promise<boolean> {
  try {
    await appendAuditEvent(project, input);
    return true;
  } catch (error) {
    console.warn(`[audit] ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

export function verifyAuditLog(
  project: Pick<ProjectManifest, 'rootPath'>
): AuditVerificationResult {
  let records: AuditRecord[];
  try {
    records = readRecords(project);
  } catch (error) {
    return {
      valid: false,
      records: 0,
      lastHash: ZERO_HASH,
      firstInvalidLine: 1,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  let previousHash = ZERO_HASH;
  let expectedSequence = 1;
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.sequence !== expectedSequence) {
      return {
        valid: false,
        records: records.length,
        lastHash: previousHash,
        firstInvalidLine: index + 1,
        error: 'AUDIT_SEQUENCE_INVALID',
      };
    }
    if (record.previousHash !== previousHash) {
      return {
        valid: false,
        records: records.length,
        lastHash: previousHash,
        firstInvalidLine: index + 1,
        error: 'AUDIT_PREVIOUS_HASH_INVALID',
      };
    }
    const { hash, ...base } = record;
    const expectedHash = hashPayload(base);
    if (hash !== expectedHash) {
      return {
        valid: false,
        records: records.length,
        lastHash: previousHash,
        firstInvalidLine: index + 1,
        error: 'AUDIT_HASH_INVALID',
      };
    }
    previousHash = hash;
    expectedSequence += 1;
  }
  return {
    valid: true,
    records: records.length,
    lastHash: previousHash,
  };
}

export function readAuditEvents(
  project: Pick<ProjectManifest, 'rootPath'>,
  limit = 50
): AuditRecord[] {
  const safeLimit = Math.max(1, Math.min(1_000, Math.trunc(limit)));
  return readRecords(project).slice(-safeLimit);
}
