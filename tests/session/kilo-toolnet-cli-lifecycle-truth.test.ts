import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  MCP_ONLY_CAPABILITIES,
  NATIVE_SESSION_IMPORT_CAPABILITIES,
} from '../../src/session/integration-capabilities.js';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Kilo and ToolNet CLI lifecycle truth', () => {
  it('keeps Kilo MCP-only until native lifecycle exists', () => {
    expect(MCP_ONLY_CAPABILITIES.mcp).toBe(true);

    expect(MCP_ONLY_CAPABILITIES.nativeCapture).toBe(false);

    expect(MCP_ONLY_CAPABILITIES.lifecycleHooks).toBe(false);

    expect(MCP_ONLY_CAPABILITIES.sharedJournalWrite).toBe(false);

    expect(MCP_ONLY_CAPABILITIES.level).toBe('mcp-only');
  });

  it('reports ToolNet CLI native session import without claiming lifecycle hooks', () => {
    expect(NATIVE_SESSION_IMPORT_CAPABILITIES.mcp).toBe(true);

    expect(NATIVE_SESSION_IMPORT_CAPABILITIES.nativeCapture).toBe(true);

    expect(NATIVE_SESSION_IMPORT_CAPABILITIES.lifecycleHooks).toBe(false);

    expect(NATIVE_SESSION_IMPORT_CAPABILITIES.sharedJournalWrite).toBe(true);

    expect(NATIVE_SESSION_IMPORT_CAPABILITIES.level).toBe('native-capture');
  });

  it('keeps ToolNet CLI watcher explicitly non-lifecycle', () => {
    const text = source('src/session/toolnet-cli/watcher.ts');

    expect(text).toContain('NOT reported as a native lifecycle hook');

    expect(text).not.toContain('idle?: boolean');

    expect(text).not.toContain('options.idle');
  });

  it('does not expose lifecycle idle on watch-bound', () => {
    const text = source('src/session/toolnet-cli/cli.ts');

    const lines = text.split('\n').filter((line) => line.includes('watch-bound'));

    for (const line of lines) {
      expect(line).not.toContain('--idle');
    }
  });

  it('does not fake background lifecycle refresh for Kilo or ToolNet CLI', () => {
    const files = [
      'src/session/kilo/cli.ts',
      'src/session/kilo/status.ts',
      'src/session/toolnet-cli/cli.ts',
      'src/session/toolnet-cli/watcher.ts',
      'src/session/toolnet-cli/adapter.ts',
      'src/session/toolnet-cli/recovery.ts',
    ];

    for (const path of files) {
      const text = source(path);

      expect(text).not.toContain('triggerProjectBackgroundRefresh');
    }
  });

  it('keeps safe project binding mandatory for ToolNet CLI imports', () => {
    const adapter = source('src/session/toolnet-cli/adapter.ts');

    expect(adapter).toContain('requireToolNetCliSessionBinding');

    const binding = source('src/session/toolnet-cli/project-binding.ts');

    expect(binding).toContain('already bound to another project');

    expect(binding).toContain('not bound to this project');
  });
});
