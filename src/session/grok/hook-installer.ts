import { grokToolnetHookFile } from './config-paths.js';

import {
  atomicWriteHooks,
  isJsonObject,
  readHooksRoot,
  type JsonObject,
} from '../hook-capture/json-hooks.js';

export interface InstallGrokHooksOptions {
  hooksFile?: string;

  binary?: string;
}

export interface InstallGrokHooksResult {
  hooksFile: string;

  changed: boolean;

  hookCount: number;
}

const EVENTS = [
  ['SessionStart', 10],
  ['UserPromptSubmit', 10],
  ['PreToolUse', 10],
  ['PostToolUse', 15],
  ['Stop', 30],
] as const;

function isManagedGroup(value: unknown): boolean {
  if (!isJsonObject(value) || !Array.isArray(value.hooks)) {
    return false;
  }

  return value.hooks.some(
    (handler) =>
      isJsonObject(handler) &&
      typeof handler.command === 'string' &&
      handler.command.includes('session:grok-hook')
  );
}

function desiredGroup(event: string, binary: string, timeout: number): JsonObject {
  const group: JsonObject = {
    hooks: [
      {
        type: 'command',
        command: `${binary} session:grok-hook`,
        timeout,
        env: {
          TOOLNET_HOOK_EVENT: event,
        },
      },
    ],
  };

  if (event === 'PreToolUse') {
    group.matcher = '.*';
  }

  return group;
}

export function installGrokHooks(options: InstallGrokHooksOptions = {}): InstallGrokHooksResult {
  const hooksFile = options.hooksFile ?? grokToolnetHookFile();

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const root = readHooksRoot(hooksFile, 'Grok Build');

  const currentHooks = root.hooks;

  if (currentHooks !== undefined && !isJsonObject(currentHooks)) {
    throw new Error('Invalid existing Grok Build hooks file: hooks must be an object.');
  }

  const hooks: JsonObject = isJsonObject(currentHooks) ? { ...currentHooks } : {};

  for (const [event, timeout] of EVENTS) {
    const existing = hooks[event];

    if (existing !== undefined && !Array.isArray(existing)) {
      throw new Error(`Invalid existing Grok Build hooks file: hooks.${event} must be an array.`);
    }

    const preserved = Array.isArray(existing)
      ? existing.filter((item) => !isManagedGroup(item))
      : [];

    hooks[event] = [...preserved, desiredGroup(event, binary, timeout)];
  }

  const next: JsonObject = {
    ...root,
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

  const verify = readHooksRoot(hooksFile, 'Grok Build');

  if (!isJsonObject(verify.hooks)) {
    throw new Error('Grok Build hooks were written but verification failed.');
  }

  let managedCount = 0;

  for (const [event] of EVENTS) {
    const entries = verify.hooks[event];

    if (!Array.isArray(entries)) {
      throw new Error('Grok Build hooks were written but verification failed.');
    }

    managedCount += entries.filter(isManagedGroup).length;
  }

  if (managedCount !== EVENTS.length) {
    throw new Error('Grok Build hooks were written but verification failed.');
  }

  return {
    hooksFile,
    changed: true,
    hookCount: EVENTS.length,
  };
}
