import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { SessionEventInput } from '../session/types.js';

const AUTO_BEGIN = '<!-- TOOLNET:AUTO-CURRENT:BEGIN -->';

const AUTO_END = '<!-- TOOLNET:AUTO-CURRENT:END -->';

const TEXT_KEYS = new Set([
  'content',
  'text',
  'message',
  'prompt',
  'summary',
  'title',
  'description',
  'last_assistant_message',
  'lastAssistantMessage',
]);

export interface AutoCurrentResult {
  updated: boolean;

  reason: 'updated' | 'unchanged' | 'no-meaningful-events';

  chars: number;
}

function atomicWrite(file: string, content: string): void {
  mkdirSync(dirname(file), {
    recursive: true,
  });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  writeFileSync(temp, content.endsWith('\n') ? content : `${content}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  renameSync(temp, file);
}

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function compact(value: string, max = 700): string {
  const text = normalize(value);

  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max)}…`;
}

function collectStrings(value: unknown, output: string[], depth = 0): void {
  if (depth > 6) {
    return;
  }

  if (typeof value === 'string') {
    if (value.trim()) {
      output.push(value);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value.slice(0, 60)) {
      collectStrings(item, output, depth + 1);
    }

    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (TEXT_KEYS.has(key) || ['data', 'payload', 'parts', 'messages', 'output'].includes(key)) {
      collectStrings(child, output, depth + 1);
    }
  }
}

function eventText(event: SessionEventInput): string {
  const values: string[] = [];

  collectStrings(event.data, values);

  return values.map(normalize).filter(Boolean).join('\n');
}

function unique(values: string[], limit: number): string[] {
  const result: string[] = [];

  const seen = new Set<string>();

  for (const raw of values) {
    const value = compact(raw, 300);

    const key = value.toLowerCase();

    if (!value || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function extractLines(texts: string[], pattern: RegExp, limit: number): string[] {
  const matches: string[] = [];

  for (const text of texts) {
    for (const rawLine of text.split(/\n+/u)) {
      const line = normalize(rawLine);

      if (line.length < 4 || line.length > 500) {
        continue;
      }

      if (pattern.test(line)) {
        matches.push(line);
      }

      pattern.lastIndex = 0;
    }
  }

  return unique(matches.reverse(), limit);
}

function extractFiles(texts: string[]): string[] {
  const files: string[] = [];

  const pattern =
    /(?:^|[\s"'`(])((?:\.{0,2}\/|\/)?(?:[\w.@+-]+\/)*[\w.@+-]+\.(?:ts|tsx|js|jsx|mjs|cjs|vue|py|go|rs|java|kt|swift|php|rb|json|yaml|yml|toml|md|css|scss|html|sql))(?:$|[\s"'`),:])/giu;

  for (const text of texts) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text))) {
      if (match[1]) {
        files.push(match[1]);
      }
    }
  }

  return unique(files.reverse(), 8);
}

function latestText(
  events: SessionEventInput[],
  type: 'user_prompt' | 'assistant_message'
): string | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (event.type !== type) {
      continue;
    }

    const text = eventText(event);

    if (text) {
      return compact(text, type === 'user_prompt' ? 550 : 750);
    }
  }

  return null;
}

function bullets(title: string, values: string[]): string[] {
  if (values.length === 0) {
    return [];
  }

  return ['', `${title}:`, ...values.map((value) => `- ${value}`)];
}

function renderAutoSection(options: {
  agent: string;

  nativeSessionId: string;

  events: SessionEventInput[];
}): string | null {
  const meaningful = options.events.filter((event) =>
    [
      'user_prompt',
      'assistant_message',
      'file_write',
      'file_edit',
      'tool_result',
      'test',
      'todo',
      'decision',
      'error',
    ].includes(event.type)
  );

  if (meaningful.length === 0) {
    return null;
  }

  const texts = meaningful.map(eventText).filter(Boolean);

  const user = latestText(meaningful, 'user_prompt');

  const assistant = latestText(meaningful, 'assistant_message');

  const files = extractFiles(texts);

  const nextActions = extractLines(
    texts,
    /^(?:next|next action|next step|todo|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu,
    5
  );

  const blockers = extractLines(
    texts,
    /\b(?:blocker|blocked|error|failed|failure|đang vướng|bị vướng|đang kẹt|chưa xong|chưa hoàn tất)\b/iu,
    4
  );

  const decisions = extractLines(
    texts,
    /\b(?:decision|decided|chốt|quyết định|must|không được|giữ nguyên)\b/iu,
    4
  );

  const completed = extractLines(
    texts,
    /\b(?:completed|complete|done|finished|passed|hoàn thành|hoàn tất|đã xong|xong)\b/iu,
    5
  );

  const lines: string[] = [
    AUTO_BEGIN,
    '# Automatic Work State',
    '',
    `Updated: ${new Date().toISOString()}`,
    `Agent: ${options.agent}`,
    `Session: ${options.nativeSessionId}`,
  ];

  if (user) {
    lines.push('', 'Current request:', user);
  }

  if (assistant) {
    lines.push('', 'Latest agent progress:', assistant);
  }

  lines.push(...bullets('Recently completed / verified', completed));

  lines.push(...bullets('Next actions', nextActions));

  lines.push(...bullets('Blockers / unfinished', blockers));

  lines.push(...bullets('Important decisions', decisions));

  lines.push(...bullets('Files mentioned / touched', files));

  lines.push(
    '',
    'Continuation:',
    '- Continue from the latest unfinished point.',
    '- Do not redo clearly completed work.',
    '- Ask ToolNet Memory for deeper history when needed.',
    AUTO_END
  );

  return lines.join('\n');
}

function replaceAutoSection(existing: string, auto: string): string {
  const start = existing.indexOf(AUTO_BEGIN);

  const end = existing.indexOf(AUTO_END);

  if (start >= 0 && end >= start) {
    const after = end + AUTO_END.length;

    return [existing.slice(0, start).trimEnd(), auto, existing.slice(after).trimStart()]
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }

  const manual = existing.trim();

  return manual ? `${manual}\n\n${auto}` : auto;
}

export function updateCurrentFromSession(
  project: ProjectManifest,
  options: {
    agent: string;

    nativeSessionId: string;

    events: SessionEventInput[];
  }
): AutoCurrentResult {
  const auto = renderAutoSection(options);

  if (!auto) {
    return {
      updated: false,
      reason: 'no-meaningful-events',
      chars: 0,
    };
  }

  const file = join(project.rootPath, '.toolnet', 'current.md');

  let existing = '';

  if (existsSync(file)) {
    try {
      existing = readFileSync(file, 'utf8');
    } catch {
      existing = '';
    }
  }

  const next = replaceAutoSection(existing, auto);

  if (next.trim() === existing.trim()) {
    return {
      updated: false,
      reason: 'unchanged',
      chars: next.length,
    };
  }

  atomicWrite(file, next);

  return {
    updated: true,
    reason: 'updated',
    chars: next.length,
  };
}
