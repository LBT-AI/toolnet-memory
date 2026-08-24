import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

describe('Phase 07H native E2E certification wiring', () => {
  test('native release gate exists and is strict about blockers', () => {
    const source = readFileSync('scripts/native-e2e-certify.sh', 'utf8');

    expect(source).toContain('PHASE 07H NATIVE CERTIFICATION: BLOCKED');
    expect(source).toContain('PHASE 07H NATIVE CERTIFICATION: FAIL');
    expect(source).toContain('PHASE 07H NATIVE CERTIFICATION: PASS');
    expect(source).toContain('No release version bump should be performed yet.');
  });

  test('native gate tests real Cursor/Copilot/Grok commands', () => {
    const source = readFileSync('scripts/native-e2e-certify.sh', 'utf8');

    expect(source).toContain('mcp list-tools toolnet-memory');
    expect(source).toContain('mcp get toolnet-memory --json');
    expect(source).toContain('mcp doctor toolnet-memory --json');
    expect(source).toContain('plugins list --json');
    expect(source).toContain('inspect --json');
  });

  test('native gate distinguishes global and project MCP through separate shims', () => {
    const source = readFileSync('scripts/native-e2e-certify.sh', 'utf8');

    expect(source).toContain('toolnet-memory-global');
    expect(source).toContain('toolnet-memory-project');
    expect(source).toContain('lane=global');
    expect(source).toContain('lane=project');
  });

  test('native gate proves layered hook invocation before ToolNet dedupe', () => {
    const source = readFileSync('scripts/native-e2e-certify.sh', 'utf8');

    expect(source).toContain('global_hook_attempts');
    expect(source).toContain('project_hook_attempts');
    expect(source).toContain('dedupe_markers');
    expect(source).toContain('TOOLNET_HOOK_DEDUPE_DIR');
  });

  test('native gate backs up and restores global configuration', () => {
    const source = readFileSync('scripts/native-e2e-certify.sh', 'utf8');

    expect(source).toContain('backup_file');
    expect(source).toContain('restore_all');
    expect(source).toContain('trap restore_all EXIT');
  });
});
