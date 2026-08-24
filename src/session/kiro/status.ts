import { existsSync, readFileSync } from 'node:fs';

import { kiroGlobalHooksFile, kiroMcpConfigFile } from './config-paths.js';

type JsonObject = Record<string, unknown>;

const MANAGED_PREFIX = 'ToolNet Memory - ';

const REQUIRED_TRIGGERS = [
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'Stop',
] as const;

export interface KiroIntegrationStatusOptions {
  configFile?: string;

  hooksFile?: string;
}

export interface KiroIntegrationStatus {
  installed: boolean;

  state: 'ready' | 'partial' | 'not-installed' | 'invalid';

  mcp: {
    configured: boolean;

    configFile: string;

    error?: string;
  };

  hooks: {
    configured: boolean;

    hooksFile: string;

    triggers: string[];

    error?: string;
  };

  errors: string[];
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJson(file: string): { value?: JsonObject; error?: string } {
  if (!existsSync(file)) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (!isObject(parsed)) {
    return {
      error: 'root must be a JSON object',
    };
  }

  return {
    value: parsed,
  };
}

function mcpReady(root: JsonObject | undefined): boolean {
  if (!root || !isObject(root.mcpServers)) {
    return false;
  }

  const server = root.mcpServers['toolnet-memory'];

  if (!isObject(server)) {
    return false;
  }

  return (
    typeof server.command === 'string' &&
    server.command.trim().length > 0 &&
    Array.isArray(server.args) &&
    server.args.length === 1 &&
    server.args[0] === 'mcp' &&
    server.disabled !== true
  );
}

function hookCommand(value: unknown): string | undefined {
  if (!isObject(value) || !isObject(value.action)) {
    return undefined;
  }

  return typeof value.action.command === 'string' ? value.action.command : undefined;
}

function managedTriggers(root: JsonObject | undefined): string[] {
  if (!root || root.version !== 'v1' || !Array.isArray(root.hooks)) {
    return [];
  }

  const triggers = new Set<string>();

  for (const hook of root.hooks) {
    if (!isObject(hook)) {
      continue;
    }

    if (typeof hook.name !== 'string' || !hook.name.startsWith(MANAGED_PREFIX)) {
      continue;
    }

    const command = hookCommand(hook);

    if (!command || !command.includes('session:kiro-hook')) {
      continue;
    }

    if (hook.enabled === false) {
      continue;
    }

    if (typeof hook.trigger === 'string') {
      triggers.add(hook.trigger);
    }
  }

  return [...triggers];
}

export function inspectKiroIntegrationStatus(
  options: KiroIntegrationStatusOptions = {}
): KiroIntegrationStatus {
  const configFile = options.configFile ?? kiroMcpConfigFile();

  const hooksFile = options.hooksFile ?? kiroGlobalHooksFile();

  const mcpConfig = readJson(configFile);

  const hookConfig = readJson(hooksFile);

  const mcpConfigured = !mcpConfig.error && mcpReady(mcpConfig.value);

  const triggers = hookConfig.error ? [] : managedTriggers(hookConfig.value);

  const hooksConfigured = REQUIRED_TRIGGERS.every((trigger) => triggers.includes(trigger));

  const errors: string[] = [];

  if (mcpConfig.error) {
    errors.push(`MCP config: ${mcpConfig.error}`);
  }

  if (hookConfig.error) {
    errors.push(`Hooks config: ${hookConfig.error}`);
  }

  const installed = mcpConfigured && hooksConfigured;

  const anyExists = existsSync(configFile) || existsSync(hooksFile);

  const state: KiroIntegrationStatus['state'] =
    errors.length > 0 ? 'invalid' : installed ? 'ready' : anyExists ? 'partial' : 'not-installed';

  return {
    installed,

    state,

    mcp: {
      configured: mcpConfigured,

      configFile,

      error: mcpConfig.error,
    },

    hooks: {
      configured: hooksConfigured,

      hooksFile,

      triggers,

      error: hookConfig.error,
    },

    errors,
  };
}
