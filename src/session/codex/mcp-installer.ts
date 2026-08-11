import { spawnSync } from 'node:child_process';

export interface CodexMcpInstallOptions {
  binary?: string;

  codexBinary?: string;

  serverName?: string;
}

export interface CodexMcpInstallResult {
  installed: boolean;

  changed: boolean;

  serverName: string;

  command: string;

  args: string[];

  error?: string;
}

interface CodexMcpJson {
  name?: string;

  enabled?: boolean;

  transport?: {
    type?: string;

    command?: string;

    args?: string[];
  };
}

function run(command: string, args: string[]) {
  return spawnSync(command, args, {
    encoding: 'utf8',

    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function existingServer(codexBinary: string, serverName: string): CodexMcpJson | null {
  const result = run(codexBinary, ['mcp', 'get', serverName, '--json']);

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  try {
    return JSON.parse(result.stdout) as CodexMcpJson;
  } catch {
    return null;
  }
}

function matches(existing: CodexMcpJson, binary: string): boolean {
  return (
    existing.enabled !== false &&
    existing.transport?.type === 'stdio' &&
    existing.transport?.command === binary &&
    Array.isArray(existing.transport?.args) &&
    existing.transport?.args.length === 1 &&
    existing.transport.args[0] === 'mcp'
  );
}

export function installCodexMcp(options: CodexMcpInstallOptions = {}): CodexMcpInstallResult {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const codexBinary = options.codexBinary ?? 'codex';

  const serverName = options.serverName ?? 'toolnet-memory';

  const existing = existingServer(codexBinary, serverName);

  if (existing && matches(existing, binary)) {
    return {
      installed: true,

      changed: false,

      serverName,

      command: binary,

      args: ['mcp'],
    };
  }

  /*
   * The name "toolnet-memory" belongs to ToolNet's
   * managed integration. If an old ToolNet definition
   * exists but differs, replace only this one server.
   *
   * Never touch other MCP servers.
   */
  if (existing) {
    const remove = run(codexBinary, ['mcp', 'remove', serverName]);

    if (remove.status !== 0) {
      return {
        installed: false,

        changed: false,

        serverName,

        command: binary,

        args: ['mcp'],

        error: (
          remove.stderr ||
          remove.stdout ||
          'Unable to remove old ToolNet MCP configuration.'
        ).trim(),
      };
    }
  }

  const add = run(codexBinary, ['mcp', 'add', serverName, '--', binary, 'mcp']);

  if (add.status !== 0) {
    return {
      installed: false,

      changed: false,

      serverName,

      command: binary,

      args: ['mcp'],

      error: (add.stderr || add.stdout || 'Unable to register ToolNet MCP.').trim(),
    };
  }

  const verification = existingServer(codexBinary, serverName);

  if (!verification || !matches(verification, binary)) {
    return {
      installed: false,

      changed: true,

      serverName,

      command: binary,

      args: ['mcp'],

      error:
        'Codex accepted MCP registration but verification did not match expected ToolNet command.',
    };
  }

  return {
    installed: true,

    changed: true,

    serverName,

    command: binary,

    args: ['mcp'],
  };
}
