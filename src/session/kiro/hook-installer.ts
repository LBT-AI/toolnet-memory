import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { kiroGlobalHooksFile, kiroProjectHooksFile } from './config-paths.js';

type JsonObject = Record<string, unknown>;

const MANAGED_PREFIX = 'ToolNet Memory - ';

export interface InstallKiroHooksOptions {
  hooksFile?: string;

  binary?: string;

  scope?: 'global' | 'project' | 'both';

  cwd?: string;

  force?: boolean;
}

export interface InstallKiroHooksResult {
  hooksFile: string;

  changed: boolean;

  hookCount: number;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:-]+$/u.test(value)) {
    return value;
  }

  return `'${value.replace(/'/gu, `'\\''`)}'`;
}

function readRoot(file: string): JsonObject {
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
  } catch {
    throw new Error(
      `Invalid existing Kiro hooks file at ${file}: parse error. Not overwriting.`
    );
  }

  if (!isObject(parsed)) {
    throw new Error(
      `Invalid existing Kiro hooks file at ${file}: root must be a JSON object. Not overwriting.`
    );
  }

  return parsed;
}

function isManagedHook(value: unknown): boolean {
  if (!isObject(value)) {
    return false;
  }

  return typeof value.name === 'string' && value.name.startsWith(MANAGED_PREFIX);
}

function commandAction(command: string): JsonObject {
  return {
    type: 'command',
    command,
  };
}

/**
 * Official Kiro V3 hooks schema:
 * {
 *   "version": "v1",
 *   "hooks": [
 *     {
 *       "name": "...",
 *       "trigger": "SessionStart|UserPromptSubmit|PreToolUse|PostToolUse|Stop",
 *       "action": { "type": "command", "command": "..." },
 *       "timeout": 10,
 *       "enabled": true
 *     }
 *   ]
 * }
 */
function desiredHooks(command: string): JsonObject[] {
  return [
    {
      name: `${MANAGED_PREFIX}Session Start`,
      description: 'Inject compact local ToolNet continuity and capture Kiro session activation.',
      trigger: 'SessionStart',
      action: commandAction(command),
      timeout: 10,
      enabled: true,
    },
    {
      name: `${MANAGED_PREFIX}Prompt Continuity`,
      description:
        'Capture prompts and refresh ToolNet guidance only for resume/continue requests.',
      trigger: 'UserPromptSubmit',
      action: commandAction(command),
      timeout: 10,
      enabled: true,
    },
    {
      name: `${MANAGED_PREFIX}Raw History Guard`,
      description: 'Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.',
      trigger: 'PreToolUse',
      matcher: '*',
      action: commandAction(command),
      timeout: 10,
      enabled: true,
    },
    {
      name: `${MANAGED_PREFIX}Tool Capture`,
      description: 'Capture durable tool activity while filtering noisy read-only events.',
      trigger: 'PostToolUse',
      matcher: '*',
      action: commandAction(command),
      timeout: 15,
      enabled: true,
    },
    {
      name: `${MANAGED_PREFIX}Final Flush`,
      description: 'Flush pending Kiro WAL events when the assistant finishes a turn.',
      trigger: 'Stop',
      action: commandAction(command),
      timeout: 30,
      enabled: true,
    },
  ];
}

function atomicWrite(file: string, value: JsonObject): void {
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });

  const temporary = `${file}.toolnet-${process.pid}-${Date.now()}.tmp`;

  try {
    writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', {
      encoding: 'utf8',
      mode: 0o600,
    });

    renameSync(temporary, file);
  } finally {
    rmSync(temporary, {
      force: true,
    });
  }
}

function installToSingleFile(
  hooksFile: string,
  command: string,
  force: boolean
): { changed: boolean; hookCount: number } {
  const root = readRoot(hooksFile);

  if (root.version !== undefined && root.version !== 'v1') {
    throw new Error(`Unsupported existing Kiro hooks version: ${String(root.version)}`);
  }

  const currentHooks = root.hooks;

  if (currentHooks !== undefined && !Array.isArray(currentHooks)) {
    throw new Error('Invalid existing Kiro hooks file: hooks must be an array.');
  }

  const preserved = Array.isArray(currentHooks)
    ? currentHooks.filter((hook) => !isManagedHook(hook))
    : [];

  const managed = desiredHooks(command);

  const next: JsonObject = {
    ...root,
    version: 'v1',
    hooks: [...preserved, ...managed],
  };

  if (!force && JSON.stringify(root) === JSON.stringify(next)) {
    return {
      changed: false,
      hookCount: managed.length,
    };
  }

  atomicWrite(hooksFile, next);

  const verify = readRoot(hooksFile);

  if (
    verify.version !== 'v1' ||
    !Array.isArray(verify.hooks) ||
    verify.hooks.filter(isManagedHook).length !== managed.length
  ) {
    throw new Error('Kiro hooks were written but verification failed.');
  }

  return {
    changed: true,
    hookCount: managed.length,
  };
}

/**
 * Install ToolNet hooks for Kiro CLI.
 *
 * Official Kiro V3 hooks schema:
 * - version: "v1"
 * - hooks: array of hook objects
 * - PascalCase triggers: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop
 *
 * Global: ~/.kiro/hooks/toolnet-memory.json
 * Project: <project>/.kiro/hooks/toolnet-memory.json
 *
 * Preserves all existing non-ToolNet hooks.
 * Stops on invalid JSON (never overwrites corrupt config).
 */
export function installKiroHooks(options: InstallKiroHooksOptions = {}): InstallKiroHooksResult {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const scope = options.scope ?? 'global';

  const command = `${shellQuote(binary)} session:kiro-hook`;

  if (options.hooksFile) {
    const result = installToSingleFile(options.hooksFile, command, options.force ?? false);
    return {
      hooksFile: options.hooksFile,
      ...result,
    };
  }

  if (scope === 'both') {
    const globalFile = kiroGlobalHooksFile();
    const projectFile = kiroProjectHooksFile({ cwd: options.cwd });

    const globalResult = installToSingleFile(globalFile, command, options.force ?? false);
    const projectResult = installToSingleFile(projectFile, command, options.force ?? false);

    return {
      hooksFile: globalFile,
      changed: globalResult.changed || projectResult.changed,
      hookCount: globalResult.hookCount,
    };
  }

  const hooksFile =
    scope === 'project'
      ? kiroProjectHooksFile({ cwd: options.cwd })
      : kiroGlobalHooksFile();

  const result = installToSingleFile(hooksFile, command, options.force ?? false);

  return {
    hooksFile,
    ...result,
  };
}
