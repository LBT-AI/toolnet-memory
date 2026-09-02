import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
  claimHookEvent,
  resolveHookEventDedupeDirectory,
} from '../../src/session/integration-scope/index.js';

const roots: string[] = [];

function tempRoot(prefix = 'toolnet-dedupe-project-'): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function initializedProject(id: string): string {
  const root = tempRoot();

  const toolnet = join(root, '.toolnet');
  mkdirSync(toolnet, {
    recursive: true,
  });

  writeFileSync(
    join(toolnet, 'project.json'),
    JSON.stringify(
      {
        version: 1,
        id,
        name: `project-${id}`,
        remote: `project-${id}`,
        rootPath: root,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        graphVersion: 0,
        memoryVersion: 0,
      },
      null,
      2
    )
  );

  mkdirSync(join(root, 'src', 'nested'), {
    recursive: true,
  });

  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

describe('project-scoped cross-container hook dedupe', () => {
  test('uses project runtime directory instead of /tmp', () => {
    const root = initializedProject('project-a');

    const scope = resolveHookEventDedupeDirectory({
      agent: 'cursor',
      event: 'postToolUse',
      input: {
        cwd: join(root, 'src', 'nested'),
        sessionId: 'session-a',
        toolUseId: 'tool-1',
      },
    });

    expect(scope.scope).toBe('project');

    expect(scope.projectId).toBe('project-a');

    expect(scope.directory).toBe(join(root, '.toolnet', 'runtime', 'dedupe', 'hooks'));
  });

  test('same project event is claimed once through shared project directory', () => {
    const root = initializedProject('project-shared');

    const input = {
      cwd: root,
      sessionId: 'session-a',
      toolUseId: 'tool-1',
      toolName: 'bash',
      toolArgs: {
        command: 'npm test',
      },
    };

    const first = claimHookEvent({
      agent: 'copilot',
      event: 'preToolUse',
      input,
      nowMs: 1_000,
      ttlMs: 10_000,
    });

    const second = claimHookEvent({
      agent: 'copilot',
      event: 'preToolUse',
      input,
      nowMs: 1_001,
      ttlMs: 10_000,
    });

    expect(first.scope).toBe('project');

    expect(first.duplicate).toBe(false);

    expect(second.duplicate).toBe(true);

    expect(second.key).toBe(first.key);

    expect(second.file).toBe(first.file);
  });

  test('project id prevents collision between different projects', () => {
    const firstRoot = initializedProject('project-one');

    const secondRoot = initializedProject('project-two');

    const first = claimHookEvent({
      agent: 'grok',
      event: 'postToolUse',
      input: {
        cwd: firstRoot,
        sessionId: 'same-session',
        toolUseId: 'same-tool',
      },
      nowMs: 1_000,
    });

    const second = claimHookEvent({
      agent: 'grok',
      event: 'postToolUse',
      input: {
        cwd: secondRoot,
        sessionId: 'same-session',
        toolUseId: 'same-tool',
      },
      nowMs: 1_000,
    });

    expect(first.key).not.toBe(second.key);

    expect(first.duplicate).toBe(false);

    expect(second.duplicate).toBe(false);
  });

  test('different project mount aliases normalize to same logical payload', () => {
    const root = initializedProject('project-mounted');

    const aliasParent = tempRoot('toolnet-dedupe-alias-');

    const alias = join(aliasParent, 'workspace');
    symlinkSync(root, alias, 'dir');

    const first = claimHookEvent({
      agent: 'cursor',
      event: 'postToolUse',
      projectRoot: root,
      input: {
        cwd: root,
        sessionId: 'session-a',
        toolUseId: 'tool-a',
        filePath: join(root, 'src', 'index.ts'),
      },
      directory: join(root, '.toolnet', 'runtime', 'dedupe', 'hooks'),
      projectId: 'project-mounted',
      nowMs: 1_000,
    });

    const second = claimHookEvent({
      agent: 'cursor',
      event: 'postToolUse',
      projectRoot: alias,
      input: {
        cwd: alias,
        sessionId: 'session-a',
        toolUseId: 'tool-a',
        filePath: join(alias, 'src', 'index.ts'),
      },
      directory: join(root, '.toolnet', 'runtime', 'dedupe', 'hooks'),
      projectId: 'project-mounted',
      nowMs: 1_001,
    });

    expect(first.payloadFingerprint).toBe(second.payloadFingerprint);

    expect(first.key).toBe(second.key);

    expect(second.duplicate).toBe(true);
  });

  test('PID and hook source do not affect event identity', () => {
    const directory = tempRoot();

    const first = claimHookEvent({
      agent: 'copilot',
      event: 'postToolUse',
      directory,
      projectId: 'project-a',
      input: {
        sessionId: 'session-a',
        toolUseId: 'tool-a',
        pid: 100,
        hookSource: 'global',
        toolName: 'bash',
      },
      nowMs: 1_000,
    });

    const second = claimHookEvent({
      agent: 'copilot',
      event: 'postToolUse',
      directory,
      projectId: 'project-a',
      input: {
        sessionId: 'session-a',
        toolUseId: 'tool-a',
        pid: 999,
        hookSource: 'project',
        toolName: 'bash',
      },
      nowMs: 1_001,
    });

    expect(second.key).toBe(first.key);

    expect(second.duplicate).toBe(true);
  });

  test('marker contains an ownership token but not process identity', () => {
    const root = initializedProject('project-owner');

    const result = claimHookEvent({
      agent: 'cursor',
      event: 'sessionStart',
      input: {
        cwd: root,
        sessionId: 'session-owner',
      },
      nowMs: 1_000,
    });

    const marker = JSON.parse(readFileSync(result.file, 'utf8')) as Record<string, unknown>;

    expect(marker.version).toBe(2);

    expect(typeof marker.token).toBe('string');

    expect(marker.projectId).toBe('project-owner');

    expect(marker).not.toHaveProperty('pid');
  });

  test('expired marker can be reclaimed safely', () => {
    const root = initializedProject('project-expired');

    const input = {
      cwd: root,
      sessionId: 'session-a',
      toolUseId: 'tool-expired',
    };

    const first = claimHookEvent({
      agent: 'copilot',
      event: 'postToolUse',
      input,
      nowMs: 1_000,
      ttlMs: 100,
    });

    const firstMarker = JSON.parse(readFileSync(first.file, 'utf8')) as {
      token: string;
    };

    const second = claimHookEvent({
      agent: 'copilot',
      event: 'postToolUse',
      input,
      nowMs: 1_200,
      ttlMs: 100,
    });

    const secondMarker = JSON.parse(readFileSync(second.file, 'utf8')) as {
      token: string;
    };

    expect(second.duplicate).toBe(false);

    expect(secondMarker.token).not.toBe(firstMarker.token);
  });

  test('falls back to temporary scope without initializing a project', () => {
    const root = tempRoot();

    const result = claimHookEvent({
      agent: 'grok',
      event: 'sessionStart',
      input: {
        cwd: root,
        sessionId: 'session-fallback',
      },
      nowMs: 1_000,
    });

    expect(result.scope).toBe('temporary');

    expect(join(root, '.toolnet', 'project.json')).not.toBe(result.file);
  });

  test('fails closed when explicit project identity disagrees with manifest', () => {
    const root = initializedProject('actual-project');

    expect(() =>
      claimHookEvent({
        agent: 'cursor',
        event: 'sessionStart',
        projectRoot: root,
        projectId: 'wrong-project',
        input: {
          cwd: root,
          sessionId: 'session-a',
        },
      })
    ).toThrow('Hook dedupe project mismatch');
  });
});
