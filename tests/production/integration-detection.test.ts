import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { detectAgentIntegrations } from '../../src/production/integration-detection.js';

describe('automatic integration detection', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('detects Antigravity from config directory', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-agy-'));

    roots.push(home);

    mkdirSync(join(home, '.gemini', 'antigravity-cli'), {
      recursive: true,
    });

    const result = detectAgentIntegrations({
      home,

      commandExists: () => false,
    });

    const agy = result.find((item) => item.agent === 'agy');

    expect(agy?.detected).toBe(true);

    expect(agy?.configDetected).toBe(true);

    expect(agy?.commandDetected).toBe(false);
  });

  it('detects OpenCode from executable', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-opencode-'));

    roots.push(home);

    const result = detectAgentIntegrations({
      home,

      commandExists: (command) => command === 'opencode',
    });

    const opencode = result.find((item) => item.agent === 'opencode');

    expect(opencode?.detected).toBe(true);

    expect(opencode?.commandDetected).toBe(true);
  });

  it('detects Codex from CODEX_HOME equivalent', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-codex-'));

    roots.push(home);

    const codexHome = join(home, 'custom-codex-home');

    mkdirSync(codexHome, {
      recursive: true,
    });

    const result = detectAgentIntegrations({
      home,

      codexHome,

      commandExists: () => false,
    });

    const codex = result.find((item) => item.agent === 'codex');

    expect(codex?.detected).toBe(true);

    expect(codex?.configDetected).toBe(true);
  });

  it('returns clean negative results when nothing exists', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-empty-'));

    roots.push(home);

    const result = detectAgentIntegrations({
      home,

      commandExists: () => false,
    });

    expect(result).toHaveLength(4);

    expect(result.every((item) => !item.detected)).toBe(true);
  });
});
