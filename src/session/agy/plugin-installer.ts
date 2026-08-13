import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { installAgyHooks } from './hook-installer.js';

import { installAgyMcp } from './mcp-installer.js';

import { agyHooksFile, agyMcpConfigFile, agyPluginRoot } from './config-paths.js';

type JsonObject = Record<string, unknown>;

export interface InstallAgyPluginOptions {
  pluginRoot?: string;

  pluginName?: string;

  binary?: string;

  legacyMcpFile?: string;

  legacyHooksFile?: string;
}

export interface InstallAgyPluginResult {
  installed: boolean;

  pluginRoot: string;

  files: string[];

  migratedLegacy: string[];
}

export const AGY_CONTINUITY_RULE = `# ToolNet Memory Continuity

ToolNet Memory is the authoritative continuity layer for previous project work.

## Resume / continue behavior

Whenever the user asks to continue, resume, finish, pick up, return to, or complete previous work:

1. FIRST call the ToolNet Memory MCP tool \`memory_agent_ask\`.
2. Use ToolNet's compact continuity result to determine:
   - current task
   - completed work
   - current or last file
   - TODOs
   - blockers
   - next action
3. Only AFTER continuity is known may you inspect current source or git to verify repository truth.

## Forbidden continuity recovery

Do NOT reconstruct previous work by reading, listing, searching, or shelling into:

- \`.toolnet/sessions/**\`
- \`state.json\`
- \`events.jsonl\`
- raw transcripts
- \`~/.gemini/antigravity-cli/brain/**\`
- Antigravity \`transcript.jsonl\`
- another coding agent's internal session history

Do NOT run Bash/cat/tail/grep against those locations to discover previous work.

Do NOT search the filesystem for the implementation or schema of \`memory_agent_ask\`.
Invoke the MCP tool directly.

For direct continuity facts, prefer \`mode="local"\`.
Use \`mode="ai"\` only when continuity is ambiguous or requires synthesis.

Current repository evidence overrides stale memory after ToolNet has restored the working context.

Do not ask the user to repeat context already available through ToolNet Memory.
`;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function atomicWrite(file: string, content: string): void {
  mkdirSync(dirname(file), {
    recursive: true,
  });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  writeFileSync(temp, content, {
    encoding: 'utf8',
    mode: 0o600,
  });

  renameSync(temp, file);
}

function writeIfChanged(file: string, content: string): void {
  if (existsSync(file) && readFileSync(file, 'utf8') === content) {
    return;
  }

  atomicWrite(file, content);
}

function readJson(file: string): JsonObject {
  if (!existsSync(file)) {
    return {};
  }

  const raw = readFileSync(file, 'utf8').trim();

  if (!raw) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid legacy Antigravity config ${file}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!isObject(parsed)) {
    throw new Error(`Invalid legacy Antigravity config ${file}: root must be object`);
  }

  return parsed;
}

function removeLegacyMcp(file: string, serverName: string): boolean {
  if (!existsSync(file)) {
    return false;
  }

  const root = readJson(file);

  if (!isObject(root.mcpServers)) {
    return false;
  }

  if (!Object.prototype.hasOwnProperty.call(root.mcpServers, serverName)) {
    return false;
  }

  const servers = {
    ...root.mcpServers,
  };

  delete servers[serverName];

  atomicWrite(
    file,
    `${JSON.stringify(
      {
        ...root,
        mcpServers: servers,
      },
      null,
      2
    )}\n`
  );

  return true;
}

function removeLegacyHook(file: string): boolean {
  if (!existsSync(file)) {
    return false;
  }

  const root = readJson(file);

  if (!Object.prototype.hasOwnProperty.call(root, 'toolnet-memory')) {
    return false;
  }

  const next = {
    ...root,
  };

  delete next['toolnet-memory'];

  atomicWrite(file, `${JSON.stringify(next, null, 2)}\n`);

  return true;
}

export function installAgyPlugin(options: InstallAgyPluginOptions = {}): InstallAgyPluginResult {
  const pluginName = options.pluginName ?? 'toolnet-memory';

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const pluginRoot = options.pluginRoot ?? agyPluginRoot(pluginName);

  const pluginFile = join(pluginRoot, 'plugin.json');

  const mcpFile = join(pluginRoot, 'mcp_config.json');

  const hooksFile = join(pluginRoot, 'hooks.json');

  const ruleFile = join(pluginRoot, 'rules', 'toolnet-memory-continuity.md');

  mkdirSync(pluginRoot, {
    recursive: true,

    mode: 0o700,
  });

  writeIfChanged(
    pluginFile,
    `${JSON.stringify(
      {
        $schema: 'https://antigravity.google/schemas/v1/plugin.json',

        name: pluginName,

        description: 'Persistent project continuity and memory for Antigravity coding sessions.',
      },
      null,
      2
    )}\n`
  );

  installAgyMcp({
    configFile: mcpFile,

    binary,

    serverName: 'toolnet-memory',
  });

  installAgyHooks({
    hooksFile,

    binary,
  });

  writeIfChanged(ruleFile, `${AGY_CONTINUITY_RULE.trim()}\n`);

  /*
   * Migrate only ToolNet-owned legacy entries.
   * Preserve every unrelated MCP server/hook.
   */
  const legacyMcpFile = options.legacyMcpFile ?? agyMcpConfigFile();

  const legacyHooksFile = options.legacyHooksFile ?? agyHooksFile();

  const migratedLegacy: string[] = [];

  if (legacyMcpFile !== mcpFile && removeLegacyMcp(legacyMcpFile, 'toolnet-memory')) {
    migratedLegacy.push(legacyMcpFile);
  }

  if (legacyHooksFile !== hooksFile && removeLegacyHook(legacyHooksFile)) {
    migratedLegacy.push(legacyHooksFile);
  }

  return {
    installed: true,

    pluginRoot,

    files: [pluginFile, mcpFile, hooksFile, ruleFile],

    migratedLegacy,
  };
}
