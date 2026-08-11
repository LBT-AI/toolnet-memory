import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { installCodexMcp } from '../../src/session/codex/mcp-installer.js';

describe('Codex MCP installer', () => {
  test('registers ToolNet MCP and is idempotent', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-codex-mcp-'));

    try {
      const state = join(root, 'state.json');

      const fakeCodex = join(root, 'codex');

      writeFileSync(
        fakeCodex,
        `#!/usr/bin/env node

const fs = require('fs');

const stateFile =
  ${JSON.stringify(state)};

let state = {};

if (
  fs.existsSync(stateFile)
) {
  state =
    JSON.parse(
      fs.readFileSync(
        stateFile,
        'utf8'
      )
    );
}

const args =
  process.argv.slice(2);

if (
  args[0] === 'mcp' &&
  args[1] === 'get'
) {
  const name =
    args[2];

  if (!state[name]) {
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        name,
        enabled: true,
        transport: {
          type: 'stdio',
          command:
            state[name].command,
          args:
            state[name].args,
        },
      }
    )
  );

  process.exit(0);
}

if (
  args[0] === 'mcp' &&
  args[1] === 'remove'
) {
  delete state[
    args[2]
  ];

  fs.writeFileSync(
    stateFile,
    JSON.stringify(state)
  );

  process.exit(0);
}

if (
  args[0] === 'mcp' &&
  args[1] === 'add'
) {
  const name =
    args[2];

  const separator =
    args.indexOf('--');

  const command =
    args[
      separator + 1
    ];

  const commandArgs =
    args.slice(
      separator + 2
    );

  state[name] = {
    command,
    args:
      commandArgs,
  };

  fs.writeFileSync(
    stateFile,
    JSON.stringify(state)
  );

  process.exit(0);
}

process.exit(1);
`,
        'utf8'
      );

      chmodSync(fakeCodex, 0o755);

      const first = installCodexMcp({
        binary: 'toolnet-memory',

        codexBinary: fakeCodex,
      });

      expect(first.installed).toBe(true);

      expect(first.changed).toBe(true);

      const stored = JSON.parse(readFileSync(state, 'utf8'));

      expect(stored['toolnet-memory']).toEqual({
        command: 'toolnet-memory',

        args: ['mcp'],
      });

      const second = installCodexMcp({
        binary: 'toolnet-memory',

        codexBinary: fakeCodex,
      });

      expect(second.installed).toBe(true);

      expect(second.changed).toBe(false);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
