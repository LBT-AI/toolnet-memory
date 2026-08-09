import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { homedir } from 'node:os';

import { dirname, join } from 'node:path';

export interface CodexNotifyInstallOptions {
  configFile?: string;

  previousFile?: string;

  binary?: string;
}

function stringsFromTomlArray(value: string): string[] {
  const result: string[] = [];

  const regex = /"((?:\\.|[^"\\])*)"|'([^']*)'/g;

  let match;

  while ((match = regex.exec(value))) {
    const raw = match[1] ?? match[2] ?? '';

    try {
      result.push(match[1] !== undefined ? JSON.parse(`"${raw}"`) : raw);
    } catch {
      result.push(raw);
    }
  }

  return result;
}

export function installCodexNotify(options: CodexNotifyInstallOptions = {}): {
  configFile: string;

  previousFile: string;

  preservedPrevious: boolean;
} {
  const configFile =
    options.configFile ?? join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'config.toml');

  const previousFile =
    options.previousFile ??
    join(homedir(), '.config', 'toolnet-memory', 'codex-notify-previous.json');

  mkdirSync(dirname(configFile), {
    recursive: true,
  });

  mkdirSync(dirname(previousFile), {
    recursive: true,
  });

  let content = existsSync(configFile) ? readFileSync(configFile, 'utf8') : '';

  const binary = options.binary ?? 'toolnet-memory';

  const newLine = `notify = [${JSON.stringify(binary)}, "session:codex-notify"]`;

  /*
   * Root TOML keys occur before first table.
   */
  const lines = content.split('\n');

  let firstTable = lines.findIndex((line) => /^\s*\[/.test(line));

  if (firstTable < 0) {
    firstTable = lines.length;
  }

  let notifyStart = -1;

  let notifyEnd = -1;

  for (let index = 0; index < firstTable; index += 1) {
    if (/^\s*notify\s*=/.test(lines[index])) {
      notifyStart = index;

      notifyEnd = index;

      /*
       * Handle multiline TOML array.
       */
      if (lines[index].includes('[') && !lines[index].includes(']')) {
        while (notifyEnd + 1 < firstTable) {
          notifyEnd += 1;

          if (lines[notifyEnd].includes(']')) {
            break;
          }
        }
      }

      break;
    }
  }

  let previous: string[] = [];

  if (notifyStart >= 0) {
    const oldBlock = lines.slice(notifyStart, notifyEnd + 1).join('\n');

    previous = stringsFromTomlArray(oldBlock);

    lines.splice(notifyStart, notifyEnd - notifyStart + 1, newLine);
  } else {
    firstTable = lines.findIndex((line) => /^\s*\[/.test(line));

    if (firstTable < 0) {
      firstTable = lines.length;
    }

    lines.splice(firstTable, 0, newLine);
  }

  const isToolNet =
    previous.length >= 2 && previous[previous.length - 1] === 'session:codex-notify';

  if (previous.length > 0 && !isToolNet) {
    writeFileSync(previousFile, JSON.stringify(previous, null, 2) + '\n', {
      encoding: 'utf8',

      mode: 0o600,
    });
  }

  content = lines.join('\n');

  if (!content.endsWith('\n')) {
    content += '\n';
  }

  writeFileSync(configFile, content, {
    encoding: 'utf8',

    mode: 0o600,
  });

  return {
    configFile,
    previousFile,

    preservedPrevious: previous.length > 0 && !isToolNet,
  };
}
