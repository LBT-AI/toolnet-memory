import { spawnSync } from 'node:child_process';

import type { ParserLanguage } from './capabilities.js';

export interface LspCapability {
  language: ParserLanguage;
  command: string;
  installed: boolean;
  version?: string;
  mode: 'external-optional';
  activeInStructuralGraph: false;
}

export const LSP_COMMANDS: ReadonlyArray<{
  language: ParserLanguage;
  command: string;
}> = [
  { language: 'python', command: 'pyright-langserver' },
  { language: 'go', command: 'gopls' },
  { language: 'rust', command: 'rust-analyzer' },
  { language: 'c', command: 'clangd' },
  { language: 'cpp', command: 'clangd' },
];

function firstLine(value: string): string | undefined {
  const line = value
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .find(Boolean);
  return line || undefined;
}

export function detectLspServer(language: ParserLanguage, command: string): LspCapability {
  const result = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    timeout: 2_000,
    windowsHide: true,
  });
  const installed = !result.error && result.status === 0;
  const output = [result.stdout ?? '', result.stderr ?? ''].join('\n');
  return {
    language,
    command,
    installed,
    ...(installed ? { version: firstLine(output) } : {}),
    mode: 'external-optional',
    activeInStructuralGraph: false,
  };
}

export function detectLspCapabilities(): LspCapability[] {
  return LSP_COMMANDS.map((item) => detectLspServer(item.language, item.command));
}
