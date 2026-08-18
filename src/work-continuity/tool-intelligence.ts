import type { NormalizedSessionEvent } from '../session/types.js';

import type { FileWorkAction, WorkCheckKind, WorkCheckStatus } from './types.js';

export interface InferredWorkSignal {
  kind: 'file' | 'command' | 'test';

  text: string;

  fileAction?: FileWorkAction;

  checkKind?: WorkCheckKind;

  checkStatus?: WorkCheckStatus;

  confidence: number;
}

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : null;
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, '');
}

function walk(
  value: unknown,
  visit: (key: string, value: unknown, parent: JsonObject) => void,
  depth = 0
): void {
  if (depth > 8) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value.slice(0, 50)) {
      walk(item, visit, depth + 1);
    }

    return;
  }

  const current = object(value);

  if (!current) {
    return;
  }

  for (const [key, child] of Object.entries(current)) {
    visit(key, child, current);

    walk(child, visit, depth + 1);
  }
}

function deepStringsForKeys(value: unknown, keys: Set<string>): string[] {
  const output: string[] = [];

  walk(value, (key, child) => {
    if (!keys.has(normalizedKey(key))) {
      return;
    }

    if (typeof child === 'string' && child.trim()) {
      output.push(child.trim());
    }
  });

  return output;
}

function parseEmbeddedJson(value: string): JsonObject | null {
  const text = value.trim();

  if (!text.startsWith('{')) {
    return null;
  }

  try {
    return object(JSON.parse(text));
  } catch {
    return null;
  }
}

function toolName(event: NormalizedSessionEvent): string {
  const data = event.data;

  for (const key of ['tool', 'toolName', 'tool_name']) {
    const value = data[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim().toLowerCase();
    }
  }

  let found = '';

  walk(data, (key, child, parent) => {
    if (found) {
      return;
    }

    const normalized = normalizedKey(key);

    if (['tool', 'toolname'].includes(normalized) && typeof child === 'string') {
      found = child.trim().toLowerCase();

      return;
    }

    if (normalized !== 'name' || typeof child !== 'string') {
      return;
    }

    const parentType = typeof parent.type === 'string' ? parent.type.toLowerCase() : '';

    if (
      parentType.includes('tool') ||
      parentType.includes('function') ||
      parentType.includes('command')
    ) {
      found = child.trim().toLowerCase();
    }
  });

  return found;
}

function commands(event: NormalizedSessionEvent): string[] {
  const result = deepStringsForKeys(event.data, new Set(['command', 'cmd', 'script']));

  const argumentStrings = deepStringsForKeys(event.data, new Set(['arguments', 'args']));

  for (const value of argumentStrings) {
    const parsed = parseEmbeddedJson(value);

    if (!parsed) {
      continue;
    }

    for (const command of deepStringsForKeys(parsed, new Set(['command', 'cmd', 'script']))) {
      result.push(command);
    }
  }

  return Array.from(new Set(result.map((item) => item.trim()).filter(Boolean)));
}

function filePaths(event: NormalizedSessionEvent): string[] {
  const values = deepStringsForKeys(
    event.data,
    new Set(['filepath', 'file_path', 'filename', 'file', 'path', 'target'].map(normalizedKey))
  );

  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length < 1000 && !value.includes('\n'))
    )
  );
}

function mutationAction(event: NormalizedSessionEvent, name: string): FileWorkAction | null {
  if (event.type === 'file_edit') {
    return 'modified';
  }

  if (event.type === 'file_write') {
    return 'modified';
  }

  if (/\b(delete|remove|unlink)\b/iu.test(name)) {
    return 'deleted';
  }

  if (/\b(create|add[_-]?file|new[_-]?file)\b/iu.test(name)) {
    return 'created';
  }

  if (/\b(edit|write|patch|apply[_-]?patch|replace|update[_-]?file)\b/iu.test(name)) {
    return 'modified';
  }

  return null;
}

function patchSignals(event: NormalizedSessionEvent): InferredWorkSignal[] {
  const values = deepStringsForKeys(
    event.data,
    new Set(['patch', 'diff', 'arguments', 'input'].map(normalizedKey))
  );

  const result: InferredWorkSignal[] = [];

  for (const value of values) {
    const patterns: Array<{
      regex: RegExp;
      action: FileWorkAction;
    }> = [
      {
        regex: /^\*\*\* Update File:\s*(.+)$/gimu,
        action: 'modified',
      },
      {
        regex: /^\*\*\* Add File:\s*(.+)$/gimu,
        action: 'created',
      },
      {
        regex: /^\*\*\* Delete File:\s*(.+)$/gimu,
        action: 'deleted',
      },
    ];

    for (const pattern of patterns) {
      for (const match of value.matchAll(pattern.regex)) {
        const file = match[1]?.trim();

        if (!file) {
          continue;
        }

        result.push({
          kind: 'file',
          text: file,
          fileAction: pattern.action,
          confidence: 0.99,
        });
      }
    }
  }

  return result;
}

function checkKind(command: string): WorkCheckKind | null {
  const value = command.toLowerCase();

  if (/\b(typecheck|type-check)\b/u.test(value) || /\btsc\b[\s\S]*--noemit\b/u.test(value)) {
    return 'typecheck';
  }

  if (/\b(eslint|lint)\b/u.test(value)) {
    return 'lint';
  }

  if (
    /\b(vitest|jest|pytest)\b/u.test(value) ||
    /\bgo\s+test\b/u.test(value) ||
    /\bcargo\s+test\b/u.test(value) ||
    /\b(npm|pnpm|yarn)\s+(run\s+)?test\b/u.test(value)
  ) {
    return 'test';
  }

  if (
    /\b(npm|pnpm|yarn)\s+(run\s+)?build\b/u.test(value) ||
    /\bcargo\s+build\b/u.test(value) ||
    /\bgo\s+build\b/u.test(value) ||
    /\btsc\b/u.test(value)
  ) {
    return 'build';
  }

  return null;
}

function numericExitCode(value: unknown): number | null {
  let found: number | null = null;

  walk(value, (key, child) => {
    if (found !== null) {
      return;
    }

    if (!['exitcode', 'code'].includes(normalizedKey(key))) {
      return;
    }

    if (typeof child === 'number' && Number.isFinite(child)) {
      found = child;

      return;
    }

    if (typeof child === 'string') {
      const parsed = Number(child);

      if (Number.isFinite(parsed)) {
        found = parsed;
      }
    }
  });

  return found;
}

function statusStrings(value: unknown): string[] {
  return deepStringsForKeys(
    value,
    new Set(['status', 'state', 'result', 'output', 'outputsummary', 'message', 'text'])
  );
}

function checkStatus(event: NormalizedSessionEvent): WorkCheckStatus {
  const exitCode = numericExitCode(event.data);

  if (exitCode !== null) {
    return exitCode === 0 ? 'passed' : 'failed';
  }

  const text = statusStrings(event.data).join('\n').toLowerCase();

  if (/\b(error|failed|failure|failing)\b/u.test(text) && !/\b0\s+failed\b/u.test(text)) {
    return 'failed';
  }

  if (
    /\b(success|successful|completed|passed|green)\b/u.test(text) ||
    /\b\d+\s+passed\b/u.test(text)
  ) {
    return 'passed';
  }

  if (/\b(running|started|in[_ -]?progress)\b/u.test(text)) {
    return 'running';
  }

  return 'unknown';
}

function dedupe(signals: InferredWorkSignal[]): InferredWorkSignal[] {
  const output: InferredWorkSignal[] = [];

  const seen = new Set<string>();

  for (const signal of signals) {
    const key = [
      signal.kind,
      signal.fileAction ?? '',
      signal.checkKind ?? '',
      signal.checkStatus ?? '',
      signal.text,
    ].join('|');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    output.push(signal);
  }

  return output;
}

export function inferToolWorkSignals(event: NormalizedSessionEvent): InferredWorkSignal[] {
  const result: InferredWorkSignal[] = [];

  const name = toolName(event);

  const action = mutationAction(event, name);

  if (action) {
    for (const file of filePaths(event)) {
      result.push({
        kind: 'file',
        text: file,
        fileAction: action,
        confidence: event.type === 'file_edit' || event.type === 'file_write' ? 1 : 0.96,
      });
    }
  }

  result.push(...patchSignals(event));

  for (const command of commands(event)) {
    result.push({
      kind: 'command',
      text: command,
      confidence: 0.98,
    });

    const kind = checkKind(command);

    if (kind) {
      result.push({
        kind: 'test',
        text: command,
        checkKind: kind,
        checkStatus: checkStatus(event),
        confidence: 0.98,
      });
    }
  }

  return dedupe(result);
}
