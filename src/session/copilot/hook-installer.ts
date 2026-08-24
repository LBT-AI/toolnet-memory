import { copilotToolnetHookFile } from './config-paths.js';

import {
  atomicWriteHooks,
  isJsonObject,
  readHooksRoot,
  type JsonObject,
} from '../hook-capture/json-hooks.js';

export interface InstallCopilotHooksOptions {
  hooksFile?: string;

  binary?: string;
}

export interface InstallCopilotHooksResult {
  hooksFile: string;

  changed: boolean;

  hookCount: number;
}

const EVENTS = [
  ['sessionStart', 10],
  ['userPromptSubmitted', 10],
  ['userPromptTransformed', 10],
  ['preToolUse', 10],
  ['postToolUse', 15],
  ['agentStop', 30],
] as const;

function commandText(value: JsonObject): string | undefined {
  if (typeof value.command === 'string') {
    return value.command;
  }

  if (typeof value.bash === 'string') {
    return value.bash;
  }

  return undefined;
}

function isManagedEntry(value: unknown): boolean {
  return isJsonObject(value) && commandText(value)?.includes('session:copilot-hook') === true;
}

function desiredEntry(event: string, binary: string, timeoutSec: number): JsonObject {
  const entry: JsonObject = {
    type: 'command',
    command: `${binary} session:copilot-hook`,
    env: {
      TOOLNET_HOOK_EVENT: event,
    },
    timeoutSec,
  };

  if (event === 'preToolUse') {
    entry.matcher = '.*';
  }

  return entry;
}

export function installCopilotHooks(
  options: InstallCopilotHooksOptions = {}
): InstallCopilotHooksResult {
  const hooksFile = options.hooksFile ?? copilotToolnetHookFile();

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const root = readHooksRoot(hooksFile, 'GitHub Copilot CLI');

  if (root.version !== undefined && root.version !== 1) {
    throw new Error(
      `Unsupported existing GitHub Copilot CLI hooks version: ${String(root.version)}`
    );
  }

  const currentHooks = root.hooks;

  if (currentHooks !== undefined && !isJsonObject(currentHooks)) {
    throw new Error('Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.');
  }

  const hooks: JsonObject = isJsonObject(currentHooks) ? { ...currentHooks } : {};

  for (const [event, timeoutSec] of EVENTS) {
    const existing = hooks[event];

    if (existing !== undefined && !Array.isArray(existing)) {
      throw new Error(
        `Invalid existing GitHub Copilot CLI hooks file: hooks.${event} must be an array.`
      );
    }

    const preserved = Array.isArray(existing)
      ? existing.filter((item) => !isManagedEntry(item))
      : [];

    hooks[event] = [...preserved, desiredEntry(event, binary, timeoutSec)];
  }

  const next: JsonObject = {
    ...root,
    version: 1,
    hooks,
  };

  if (JSON.stringify(root) === JSON.stringify(next)) {
    return {
      hooksFile,
      changed: false,
      hookCount: EVENTS.length,
    };
  }

  atomicWriteHooks(hooksFile, next);

  const verify = readHooksRoot(hooksFile, 'GitHub Copilot CLI');

  if (verify.version !== 1 || !isJsonObject(verify.hooks)) {
    throw new Error('GitHub Copilot CLI hooks were written but verification failed.');
  }

  let managedCount = 0;

  for (const [event] of EVENTS) {
    const entries = verify.hooks[event];

    if (!Array.isArray(entries)) {
      throw new Error('GitHub Copilot CLI hooks were written but verification failed.');
    }

    managedCount += entries.filter(isManagedEntry).length;
  }

  if (managedCount !== EVENTS.length) {
    throw new Error('GitHub Copilot CLI hooks were written but verification failed.');
  }

  return {
    hooksFile,
    changed: true,
    hookCount: EVENTS.length,
  };
}
