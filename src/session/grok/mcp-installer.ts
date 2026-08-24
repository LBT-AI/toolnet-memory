import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { grokConfigFile } from './config-paths.js';

export interface InstallGrokMcpOptions {
  configFile?: string;

  binary?: string;

  serverName?: string;
}

export interface InstallGrokMcpResult {
  installed: boolean;

  changed: boolean;

  configFile: string;

  serverName: string;

  command: string;

  args: string[];
}

function readConfig(file: string): string {
  if (!existsSync(file)) {
    return '';
  }

  return readFileSync(file, 'utf8');
}

function atomicWriteText(file: string, value: string): void {
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temp, value, {
      encoding: 'utf8',
      mode: 0o600,
    });

    renameSync(temp, file);
  } finally {
    rmSync(temp, {
      force: true,
    });
  }
}

function escapeTomlString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function sectionHeader(serverName: string): string {
  /*
   * Quote the server key so arbitrary names remain valid TOML keys.
   * Example: [mcp_servers."toolnet-memory"]
   */
  return `[mcp_servers."${escapeTomlString(serverName)}"]`;
}

function renderSection(serverName: string, binary: string): string {
  return [
    sectionHeader(serverName),
    `command = "${escapeTomlString(binary)}"`,
    'args = ["mcp"]',
    'enabled = true',
  ].join('\n');
}

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();

  return trimmed.startsWith('[') && trimmed.includes(']');
}

function normalizeHeader(line: string): string {
  return line.trim().replace(/\s+/g, '');
}

function targetHeaderVariants(serverName: string): Set<string> {
  return new Set([
    normalizeHeader(`[mcp_servers.${serverName}]`),
    normalizeHeader(`[mcp_servers."${serverName}"]`),
    normalizeHeader(`[mcp_servers.'${serverName}']`),
  ]);
}

function findTargetSection(
  source: string,
  serverName: string
): { start: number; end: number } | null {
  const lines = source.split(/\r?\n/);
  const targets = targetHeaderVariants(serverName);

  let startLine = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const candidate = normalizeHeader(lines[index].replace(/\s+#.*$/, ''));

    if (targets.has(candidate)) {
      startLine = index;
      break;
    }
  }

  if (startLine < 0) {
    return null;
  }

  let endLine = lines.length;

  for (let index = startLine + 1; index < lines.length; index += 1) {
    if (isSectionHeader(lines[index])) {
      endLine = index;
      break;
    }
  }

  const offsets: number[] = [];
  let offset = 0;

  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }

  const start = offsets[startLine] ?? 0;
  const end = endLine >= lines.length ? source.length : (offsets[endLine] ?? source.length);

  return {
    start,
    end,
  };
}

function upsertSection(source: string, serverName: string, binary: string): string {
  const section = `${renderSection(serverName, binary)}\n`;
  const existing = findTargetSection(source, serverName);

  if (existing) {
    const before = source.slice(0, existing.start);
    const after = source.slice(existing.end);

    return `${before}${section}${after.replace(/^\n+/, '')}`;
  }

  if (!source.trim()) {
    return section;
  }

  return `${source.replace(/\s*$/, '')}\n\n${section}`;
}

function hasExpectedServer(source: string, serverName: string, binary: string): boolean {
  const section = findTargetSection(source, serverName);

  if (!section) {
    return false;
  }

  const text = source.slice(section.start, section.end);

  return (
    text.includes(`command = "${escapeTomlString(binary)}"`) &&
    /args\s*=\s*\[\s*"mcp"\s*\]/.test(text) &&
    /enabled\s*=\s*true/.test(text)
  );
}

export function installGrokMcp(options: InstallGrokMcpOptions = {}): InstallGrokMcpResult {
  const configFile = options.configFile ?? grokConfigFile();

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const serverName = options.serverName ?? 'toolnet-memory';

  const source = readConfig(configFile);

  if (hasExpectedServer(source, serverName, binary)) {
    return {
      installed: true,
      changed: false,
      configFile,
      serverName,
      command: binary,
      args: ['mcp'],
    };
  }

  const next = upsertSection(source, serverName, binary);

  atomicWriteText(configFile, next);

  const verify = readConfig(configFile);

  if (!hasExpectedServer(verify, serverName, binary)) {
    throw new Error('Grok Build MCP configuration was written but verification failed.');
  }

  return {
    installed: true,
    changed: true,
    configFile,
    serverName,
    command: binary,
    args: ['mcp'],
  };
}
