import { existsSync, readFileSync } from 'node:fs';

import { cursorHooksFile, cursorMcpConfigFile } from '../cursor/config-paths.js';

import { copilotMcpConfigFile, copilotToolnetHookFile } from '../copilot/config-paths.js';

import {
  grokConfigFile,
  grokContinuitySkillFile,
  grokToolnetHookFile,
} from '../grok/config-paths.js';

type JsonObject = Record<string, unknown>;

export type NewAgentId = 'cursor' | 'copilot' | 'grok';

export interface NewAgentIntegrationStatus {
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
    events: string[];
    error?: string;
  };
  skill?: {
    configured: boolean;
    skillFile: string;
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

  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));

    return isObject(parsed) ? { value: parsed } : { error: 'root must be a JSON object' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function jsonMcpReady(root: JsonObject | undefined, requireTools: boolean): boolean {
  if (!root || !isObject(root.mcpServers)) {
    return false;
  }

  const server = root.mcpServers['toolnet-memory'];

  if (
    !isObject(server) ||
    typeof server.command !== 'string' ||
    !server.command.trim() ||
    !Array.isArray(server.args) ||
    server.args.length !== 1 ||
    server.args[0] !== 'mcp'
  ) {
    return false;
  }

  return !requireTools || (Array.isArray(server.tools) && server.tools.includes('*'));
}

function flatHookEvents(
  root: JsonObject | undefined,
  required: readonly string[],
  route: string
): string[] {
  if (!root || !isObject(root.hooks)) {
    return [];
  }

  const hooks = root.hooks;

  return required.filter((event) => {
    const entries = hooks[event];

    return (
      Array.isArray(entries) &&
      entries.some(
        (entry) =>
          isObject(entry) &&
          ((typeof entry.command === 'string' && entry.command.includes(route)) ||
            (typeof entry.bash === 'string' && entry.bash.includes(route)))
      )
    );
  });
}

function grokHookEvents(root: JsonObject | undefined, required: readonly string[]): string[] {
  if (!root || !isObject(root.hooks)) {
    return [];
  }

  const hooks = root.hooks;

  return required.filter((event) => {
    const groups = hooks[event];

    return (
      Array.isArray(groups) &&
      groups.some((group) => {
        if (!isObject(group) || !Array.isArray(group.hooks)) {
          return false;
        }

        return group.hooks.some(
          (handler) =>
            isObject(handler) &&
            typeof handler.command === 'string' &&
            handler.command.includes('session:grok-hook')
        );
      })
    );
  });
}

function grokMcpReady(file: string): boolean {
  if (!existsSync(file)) {
    return false;
  }

  const source = readFileSync(file, 'utf8');
  const header = /\[mcp_servers\.(?:"toolnet-memory"|'toolnet-memory'|toolnet-memory)\]/;

  const start = source.search(header);

  if (start < 0) {
    return false;
  }

  const tail = source.slice(start);
  const next = tail.slice(1).search(/\n\s*\[[^\]]+\]/);
  const section = next >= 0 ? tail.slice(0, next + 1) : tail;

  return (
    /command\s*=\s*"[^"]+"/.test(section) &&
    /args\s*=\s*\[\s*"mcp"\s*\]/.test(section) &&
    !/enabled\s*=\s*false/.test(section)
  );
}

function finishStatus(options: {
  mcpConfigured: boolean;
  configFile: string;
  mcpError?: string;
  hooksConfigured: boolean;
  hooksFile: string;
  events: string[];
  hookError?: string;
  skill?: {
    configured: boolean;
    skillFile: string;
  };
}): NewAgentIntegrationStatus {
  const errors: string[] = [];

  if (options.mcpError) {
    errors.push(`MCP config: ${options.mcpError}`);
  }

  if (options.hookError) {
    errors.push(`Hooks config: ${options.hookError}`);
  }

  const installed =
    options.mcpConfigured && options.hooksConfigured && (options.skill?.configured ?? true);

  const anyExists =
    existsSync(options.configFile) ||
    existsSync(options.hooksFile) ||
    (options.skill ? existsSync(options.skill.skillFile) : false);

  const state: NewAgentIntegrationStatus['state'] =
    errors.length > 0 ? 'invalid' : installed ? 'ready' : anyExists ? 'partial' : 'not-installed';

  return {
    installed,
    state,
    mcp: {
      configured: options.mcpConfigured,
      configFile: options.configFile,
      error: options.mcpError,
    },
    hooks: {
      configured: options.hooksConfigured,
      hooksFile: options.hooksFile,
      events: options.events,
      error: options.hookError,
    },
    skill: options.skill,
    errors,
  };
}

export function inspectNewAgentIntegrationStatus(
  agent: NewAgentId,
  overrides: {
    configFile?: string;
    hooksFile?: string;
    skillFile?: string;
  } = {}
): NewAgentIntegrationStatus {
  if (agent === 'cursor') {
    const required = [
      'sessionStart',
      'beforeSubmitPrompt',
      'preToolUse',
      'postToolUse',
      'afterAgentResponse',
      'stop',
    ] as const;

    const configFile = overrides.configFile ?? cursorMcpConfigFile();
    const hooksFile = overrides.hooksFile ?? cursorHooksFile();
    const mcp = readJson(configFile);
    const hooks = readJson(hooksFile);
    const events = hooks.error ? [] : flatHookEvents(hooks.value, required, 'session:cursor-hook');

    return finishStatus({
      mcpConfigured: !mcp.error && jsonMcpReady(mcp.value, false),
      configFile,
      mcpError: mcp.error,
      hooksConfigured: required.every((event) => events.includes(event)),
      hooksFile,
      events,
      hookError: hooks.error,
    });
  }

  if (agent === 'copilot') {
    const required = [
      'sessionStart',
      'userPromptSubmitted',
      'userPromptTransformed',
      'preToolUse',
      'postToolUse',
      'agentStop',
    ] as const;

    const configFile = overrides.configFile ?? copilotMcpConfigFile();
    const hooksFile = overrides.hooksFile ?? copilotToolnetHookFile();
    const mcp = readJson(configFile);
    const hooks = readJson(hooksFile);
    const events = hooks.error ? [] : flatHookEvents(hooks.value, required, 'session:copilot-hook');

    return finishStatus({
      mcpConfigured: !mcp.error && jsonMcpReady(mcp.value, true),
      configFile,
      mcpError: mcp.error,
      hooksConfigured: required.every((event) => events.includes(event)),
      hooksFile,
      events,
      hookError: hooks.error,
    });
  }

  const required = [
    'SessionStart',
    'UserPromptSubmit',
    'PreToolUse',
    'PostToolUse',
    'Stop',
  ] as const;

  const configFile = overrides.configFile ?? grokConfigFile();
  const hooksFile = overrides.hooksFile ?? grokToolnetHookFile();
  const skillFile = overrides.skillFile ?? grokContinuitySkillFile();
  const hooks = readJson(hooksFile);
  const events = hooks.error ? [] : grokHookEvents(hooks.value, required);
  const skillConfigured =
    existsSync(skillFile) && readFileSync(skillFile, 'utf8').includes('memory_agent_ask');

  return finishStatus({
    mcpConfigured: grokMcpReady(configFile),
    configFile,
    hooksConfigured: required.every((event) => events.includes(event)),
    hooksFile,
    events,
    hookError: hooks.error,
    skill: {
      configured: skillConfigured,
      skillFile,
    },
  });
}
