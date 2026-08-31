import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { installAgyHooks } from './hook-installer.js';

import { installAgyMcp } from './mcp-installer.js';

import { agyPluginRoot } from './config-paths.js';

type JsonObject = Record<string, unknown>;

export interface InstallAgyPluginOptions {
  pluginRoot?: string;

  pluginName?: string;

  binary?: string;

  scope?: 'global' | 'workspace' | 'both';

  cwd?: string;

  force?: boolean;
}

export interface InstallAgyPluginResult {
  installed: boolean;

  pluginRoot: string;

  files: string[];
}

/**
 * ToolNet Memory continuity rule for AGY.
 *
 * No mode="ai" references. Local-only memory agent.
 * Uses official camelCase hook payload fields.
 */
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

/**
 * Install ToolNet Memory plugin for AGY / Antigravity CLI.
 *
 * Official plugin path: ~/.gemini/antigravity-cli/plugins/<plugin_name>/
 *
 * Plugin structure:
 * - plugin.json (required)
 * - mcp_config.json (optional)
 * - hooks.json (optional)
 * - rules/ (optional)
 *
 * Does NOT auto-remove legacy entries.
 * Only creates/updates the plugin directory.
 */
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
    force: options.force,
  });

  installAgyHooks({
    hooksFile,
    binary,
    pluginName,
  });

  writeIfChanged(ruleFile, `${AGY_CONTINUITY_RULE.trim()}\n`);

  return {
    installed: true,
    pluginRoot,
    files: [pluginFile, mcpFile, hooksFile, ruleFile],
  };
}
