import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { detectAgentIntegrations } from '../../src/production/integration-detection.js';

import {
  kiroCliSettingsFile,
  kiroDetectionPaths,
  kiroHomeDirectory,
  kiroMcpConfigFile,
  kiroSettingsDirectory,
} from '../../src/session/kiro/config-paths.js';

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

  it('detects Kiro from kiro-cli executable', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-kiro-command-'));

    roots.push(home);

    const result = detectAgentIntegrations({
      home,

      commandExists: (command) => command === 'kiro-cli',
    });

    const kiro = result.find((item) => item.agent === 'kiro');

    expect(kiro?.detected).toBe(true);

    expect(kiro?.commandDetected).toBe(true);

    expect(kiro?.configDetected).toBe(false);

    expect(kiro?.evidence).toContain('command:kiro-cli');
  });

  it('detects Kiro from the default ~/.kiro directory', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-kiro-config-'));

    roots.push(home);

    mkdirSync(join(home, '.kiro'), {
      recursive: true,
    });

    const result = detectAgentIntegrations({
      home,

      commandExists: () => false,
    });

    const kiro = result.find((item) => item.agent === 'kiro');

    expect(kiro?.detected).toBe(true);

    expect(kiro?.commandDetected).toBe(false);

    expect(kiro?.configDetected).toBe(true);

    expect(kiro?.evidence).toContain(`config:${join(home, '.kiro')}`);
  });

  it('supports an explicit Kiro home override', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-kiro-home-'));

    roots.push(home);

    const kiroHome = join(home, 'custom-kiro-home');

    mkdirSync(kiroHome, {
      recursive: true,
    });

    const result = detectAgentIntegrations({
      home,

      kiroHome,

      commandExists: () => false,
    });

    const kiro = result.find((item) => item.agent === 'kiro');

    expect(kiro?.detected).toBe(true);

    expect(kiro?.configDetected).toBe(true);

    expect(kiro?.evidence).toContain(`config:${kiroHome}`);
  });

  it('resolves Kiro config paths consistently', () => {
    const home = '/tmp/toolnet-kiro-home';

    expect(kiroHomeDirectory({ home })).toBe(join(home, '.kiro'));

    expect(kiroSettingsDirectory({ home })).toBe(join(home, '.kiro', 'settings'));

    expect(kiroCliSettingsFile({ home })).toBe(join(home, '.kiro', 'settings', 'cli.json'));

    expect(kiroMcpConfigFile({ home })).toBe(join(home, '.kiro', 'settings', 'mcp.json'));

    expect(kiroDetectionPaths({ home })).toEqual([join(home, '.kiro')]);
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

      kiroHome: join(home, 'missing-kiro-home'),

      commandExists: () => false,
    });

    expect(result).toHaveLength(8);

    expect(result.every((item) => !item.detected)).toBe(true);
  });
});
