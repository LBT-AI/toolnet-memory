import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { detectAgentIntegrations } from '../../src/production/integration-detection.js';
import {
  cursorCliConfigDirectory,
  cursorCliConfigFile,
  cursorDetectionPaths,
  cursorHomeDirectory,
  cursorHooksDirectory,
  cursorHooksFile,
  cursorMcpConfigFile,
} from '../../src/session/cursor/config-paths.js';
import {
  copilotDetectionPaths,
  copilotHomeDirectory,
  copilotHooksDirectory,
  copilotMcpConfigFile,
  copilotToolnetHookFile,
} from '../../src/session/copilot/config-paths.js';
import {
  grokConfigFile,
  grokDetectionPaths,
  grokHomeDirectory,
  grokHooksDirectory,
  grokToolnetHookFile,
} from '../../src/session/grok/config-paths.js';

describe('Phase 01: Cursor + Copilot + Grok detection', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it('detects Cursor CLI from official agent executable', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-cursor-command-'));
    roots.push(home);

    const result = detectAgentIntegrations({
      home,
      cursorHome: join(home, 'missing-cursor-home'),
      cursorConfigDir: join(home, 'missing-cursor-config'),
      copilotHome: join(home, 'missing-copilot-home'),
      grokHome: join(home, 'missing-grok-home'),
      kiroHome: join(home, 'missing-kiro-home'),
      commandExists: (command) => command === 'agent',
    });

    const cursor = result.find((item) => item.agent === 'cursor');

    expect(cursor?.detected).toBe(true);
    expect(cursor?.commandDetected).toBe(true);
    expect(cursor?.configDetected).toBe(false);
    expect(cursor?.evidence).toContain('command:agent');
  });

  it('detects Cursor from ~/.cursor', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-cursor-config-'));
    roots.push(home);

    const cursorHome = join(home, '.cursor');
    mkdirSync(cursorHome, { recursive: true });

    const result = detectAgentIntegrations({
      home,
      cursorHome,
      cursorConfigDir: cursorHome,
      copilotHome: join(home, 'missing-copilot-home'),
      grokHome: join(home, 'missing-grok-home'),
      kiroHome: join(home, 'missing-kiro-home'),
      commandExists: () => false,
    });

    const cursor = result.find((item) => item.agent === 'cursor');

    expect(cursor?.detected).toBe(true);
    expect(cursor?.configDetected).toBe(true);
    expect(cursor?.evidence).toContain(`config:${cursorHome}`);
  });

  it('resolves Cursor config paths including CURSOR_CONFIG_DIR/XDG equivalent', () => {
    const home = '/tmp/toolnet-cursor-home';
    const cursorHome = join(home, '.cursor');
    const cursorConfigDir = join(home, 'custom-cursor-config');

    const options = {
      home,
      cursorHome,
      cursorConfigDir,
    };

    expect(cursorHomeDirectory(options)).toBe(cursorHome);
    expect(cursorCliConfigDirectory(options)).toBe(cursorConfigDir);
    expect(cursorCliConfigFile(options)).toBe(join(cursorConfigDir, 'cli-config.json'));
    expect(cursorMcpConfigFile(options)).toBe(join(cursorHome, 'mcp.json'));
    expect(cursorHooksFile(options)).toBe(join(cursorHome, 'hooks.json'));
    expect(cursorHooksDirectory(options)).toBe(join(cursorHome, 'hooks'));
    expect(cursorDetectionPaths(options)).toEqual([cursorHome, cursorConfigDir]);
  });

  it('detects GitHub Copilot CLI from copilot executable', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-copilot-command-'));
    roots.push(home);

    const result = detectAgentIntegrations({
      home,
      cursorHome: join(home, 'missing-cursor-home'),
      cursorConfigDir: join(home, 'missing-cursor-config'),
      copilotHome: join(home, 'missing-copilot-home'),
      grokHome: join(home, 'missing-grok-home'),
      kiroHome: join(home, 'missing-kiro-home'),
      commandExists: (command) => command === 'copilot',
    });

    const copilot = result.find((item) => item.agent === 'copilot');

    expect(copilot?.detected).toBe(true);
    expect(copilot?.commandDetected).toBe(true);
    expect(copilot?.configDetected).toBe(false);
    expect(copilot?.evidence).toContain('command:copilot');
  });

  it('detects Copilot from COPILOT_HOME equivalent', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-copilot-config-'));
    roots.push(home);

    const copilotHome = join(home, 'custom-copilot-home');
    mkdirSync(copilotHome, { recursive: true });

    const result = detectAgentIntegrations({
      home,
      cursorHome: join(home, 'missing-cursor-home'),
      cursorConfigDir: join(home, 'missing-cursor-config'),
      copilotHome,
      grokHome: join(home, 'missing-grok-home'),
      kiroHome: join(home, 'missing-kiro-home'),
      commandExists: () => false,
    });

    const copilot = result.find((item) => item.agent === 'copilot');

    expect(copilot?.detected).toBe(true);
    expect(copilot?.configDetected).toBe(true);
    expect(copilot?.evidence).toContain(`config:${copilotHome}`);
  });

  it('resolves Copilot config paths consistently', () => {
    const home = '/tmp/toolnet-copilot-home';
    const copilotHome = join(home, '.copilot');
    const options = { home, copilotHome };

    expect(copilotHomeDirectory(options)).toBe(copilotHome);
    expect(copilotMcpConfigFile(options)).toBe(join(copilotHome, 'mcp-config.json'));
    expect(copilotHooksDirectory(options)).toBe(join(copilotHome, 'hooks'));
    expect(copilotToolnetHookFile(options)).toBe(join(copilotHome, 'hooks', 'toolnet-memory.json'));
    expect(copilotDetectionPaths(options)).toEqual([copilotHome]);
  });

  it('detects Grok Build from grok executable', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-grok-command-'));
    roots.push(home);

    const result = detectAgentIntegrations({
      home,
      cursorHome: join(home, 'missing-cursor-home'),
      cursorConfigDir: join(home, 'missing-cursor-config'),
      copilotHome: join(home, 'missing-copilot-home'),
      grokHome: join(home, 'missing-grok-home'),
      kiroHome: join(home, 'missing-kiro-home'),
      commandExists: (command) => command === 'grok',
    });

    const grok = result.find((item) => item.agent === 'grok');

    expect(grok?.detected).toBe(true);
    expect(grok?.commandDetected).toBe(true);
    expect(grok?.configDetected).toBe(false);
    expect(grok?.evidence).toContain('command:grok');
  });

  it('detects Grok from GROK_HOME equivalent', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-grok-config-'));
    roots.push(home);

    const grokHome = join(home, 'custom-grok-home');
    mkdirSync(grokHome, { recursive: true });

    const result = detectAgentIntegrations({
      home,
      cursorHome: join(home, 'missing-cursor-home'),
      cursorConfigDir: join(home, 'missing-cursor-config'),
      copilotHome: join(home, 'missing-copilot-home'),
      grokHome,
      kiroHome: join(home, 'missing-kiro-home'),
      commandExists: () => false,
    });

    const grok = result.find((item) => item.agent === 'grok');

    expect(grok?.detected).toBe(true);
    expect(grok?.configDetected).toBe(true);
    expect(grok?.evidence).toContain(`config:${grokHome}`);
  });

  it('resolves Grok config paths consistently', () => {
    const home = '/tmp/toolnet-grok-home';
    const grokHome = join(home, '.grok');
    const options = { home, grokHome };

    expect(grokHomeDirectory(options)).toBe(grokHome);
    expect(grokConfigFile(options)).toBe(join(grokHome, 'config.toml'));
    expect(grokHooksDirectory(options)).toBe(join(grokHome, 'hooks'));
    expect(grokToolnetHookFile(options)).toBe(join(grokHome, 'hooks', 'toolnet-memory.json'));
    expect(grokDetectionPaths(options)).toEqual([grokHome]);
  });

  it('returns 8 clean agent results when none are present', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-detect-eight-empty-'));
    roots.push(home);

    const result = detectAgentIntegrations({
      home,
      codexHome: join(home, 'missing-codex-home'),
      kiroHome: join(home, 'missing-kiro-home'),
      cursorHome: join(home, 'missing-cursor-home'),
      cursorConfigDir: join(home, 'missing-cursor-config'),
      copilotHome: join(home, 'missing-copilot-home'),
      grokHome: join(home, 'missing-grok-home'),
      xdgConfigHome: join(home, 'missing-xdg'),
      commandExists: () => false,
    });

    expect(result).toHaveLength(8);
    expect(result.every((item) => !item.detected)).toBe(true);
  });
});
