import { AdrError } from './validate.js';

import type { AdrAlternative, AdrStatus, ArchitectureDecisionRecord } from './types.js';

/**
 * Deterministic, server-controlled filename: `0001-<slug>.md`.
 *
 * The slug is derived from the title with a fixed, bounded character set, so a
 * malicious title can never traverse out of the Markdown projection prefix.
 */
export function markdownFilename(
  record: Pick<ArchitectureDecisionRecord, 'number' | 'title'>
): string {
  const slug = record.title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 60)
    .replace(/-+$/gu, '');

  const number = String(record.number).padStart(4, '0');

  return slug ? `${number}-${slug}.md` : `${number}.md`;
}

function statusLabel(status: AdrStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function bulletList(values: readonly string[], empty = '_None._'): string[] {
  if (values.length === 0) {
    return [empty];
  }

  return values.map((value) => `- ${value}`);
}

function alternativeBlock(alternative: AdrAlternative): string[] {
  const lines = [`### ${alternative.title}`, ''];

  if (alternative.description) {
    lines.push(alternative.description, '');
  }

  if (alternative.rejectedBecause) {
    lines.push(`Rejected because: ${alternative.rejectedBecause}`, '');
  }

  return lines;
}

/**
 * Deterministic Markdown projection of a single ADR revision.
 *
 * Timestamps are deliberately excluded so the same record at the same revision
 * always produces byte-identical output.
 */
export function toMarkdown(record: ArchitectureDecisionRecord): string {
  const lines: string[] = [
    `# ${record.humanId}: ${record.title}`,
    '',
    `Status: ${statusLabel(record.status)}`,
    '',
  ];

  if (record.tags.length > 0) {
    lines.push(`Tags: ${record.tags.join(', ')}`, '');
  }

  lines.push('## Context', '', record.context.trim() || '_Not recorded._', '');
  lines.push('## Decision', '', record.decision.trim() || '_Not recorded._', '');
  lines.push('## Consequences', '');
  lines.push('### Positive', '', ...bulletList(record.consequences.positive), '');
  lines.push('### Negative', '', ...bulletList(record.consequences.negative), '');
  lines.push('### Neutral', '', ...bulletList(record.consequences.neutral), '');

  lines.push('## Alternatives', '');

  if (record.alternatives.length === 0) {
    lines.push('_None recorded._', '');
  } else {
    for (const alternative of record.alternatives) {
      lines.push(...alternativeBlock(alternative));
    }
  }

  lines.push(
    '## Affected Areas',
    '',
    ...bulletList(record.affectedPaths.map((path) => `\`${path}\``)),
    ''
  );

  if (record.affectedSymbols.length > 0) {
    lines.push(
      '## Affected Symbols',
      '',
      ...bulletList(record.affectedSymbols.map((symbol) => `\`${symbol}\``)),
      ''
    );
  }

  lines.push('## Supersedes', '', ...bulletList(record.supersedes), '');

  if (record.supersededBy) {
    lines.push('## Superseded By', '', `- ${record.supersededBy}`, '');
  }

  if (record.references.length > 0) {
    lines.push(
      '## References',
      '',
      ...record.references.map(
        (reference) =>
          `- ${reference.kind}: ${reference.target}${reference.note ? ` — ${reference.note}` : ''}`
      ),
      ''
    );
  }

  return `${lines.join('\n').replace(/\n+$/u, '')}\n`;
}

export interface ParsedAdrMarkdown {
  number: number;
  title: string;
  status: AdrStatus;
  tags: string[];
  context: string;
  decision: string;
  consequences: { positive: string[]; negative: string[]; neutral: string[] };
  alternatives: AdrAlternative[];
  affectedPaths: string[];
  affectedSymbols: string[];
  supersedes: string[];
}

function normalizeStatus(value: string): AdrStatus | undefined {
  const normalized = value.trim().toLowerCase();

  const statuses: AdrStatus[] = ['proposed', 'accepted', 'deprecated', 'superseded', 'rejected'];

  return statuses.find((status) => status === normalized);
}

function parseBullets(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter((line) => line && line !== '_None._');
}

function splitSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();

  let current: string | undefined;
  let buffer: string[] = [];

  for (const line of body.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/u);

    if (heading) {
      if (current) {
        sections.set(current, buffer.join('\n'));
      }

      current = (heading[1] ?? '').toLowerCase();
      buffer = [];
      continue;
    }

    if (current) {
      buffer.push(line);
    }
  }

  if (current) {
    sections.set(current, buffer.join('\n'));
  }

  return sections;
}

function parseConsequences(value: string): {
  positive: string[];
  negative: string[];
  neutral: string[];
} {
  const output = { positive: [] as string[], negative: [] as string[], neutral: [] as string[] };

  let current: keyof typeof output = 'neutral';
  let buffer: string[] = [];

  const flush = () => {
    output[current].push(...parseBullets(buffer.join('\n')));
    buffer = [];
  };

  for (const line of value.split('\n')) {
    const heading = line.match(/^###\s+(.+?)\s*$/u);

    if (heading) {
      flush();

      const label = (heading[1] ?? '').toLowerCase();

      if (label.startsWith('positive')) {
        current = 'positive';
      } else if (label.startsWith('negative')) {
        current = 'negative';
      } else {
        current = 'neutral';
      }

      continue;
    }

    buffer.push(line);
  }

  flush();

  return output;
}

function parseAlternatives(value: string): AdrAlternative[] {
  const output: AdrAlternative[] = [];

  let current: AdrAlternative | undefined;
  let buffer: string[] = [];

  const flush = () => {
    if (!current) {
      return;
    }

    const description = buffer.join('\n').trim();

    if (description) {
      const rejected = description.match(/^Rejected because:\s*([\s\S]*)$/u);

      if (rejected) {
        current.rejectedBecause = (rejected[1] ?? '').trim();
      } else {
        current.description = description;
      }
    }

    output.push(current);
    current = undefined;
    buffer = [];
  };

  for (const line of value.split('\n')) {
    const heading = line.match(/^###\s+(.+?)\s*$/u);

    if (heading) {
      flush();
      current = { title: (heading[1] ?? '').trim() };
      continue;
    }

    if (current) {
      buffer.push(line);
    }
  }

  flush();

  return output.filter((item) => item.title);
}

/**
 * Strict, deterministic parser for canonical ADR Markdown.
 *
 * Anything that does not match the canonical shape is rejected: fields are
 * never guessed (no LLM, no heuristics).
 */
export function parseMarkdown(text: string): ParsedAdrMarkdown {
  const normalized = text.replace(/\r\n/gu, '\n');

  const titleMatch = normalized.match(/^#\s+ADR-(\d{1,6}):\s*(.+?)\s*$/mu);

  if (!titleMatch) {
    throw new AdrError(
      'ADR_UNSUPPORTED_FORMAT',
      'Unsupported ADR Markdown: expected a "# ADR-0001: Title" heading'
    );
  }

  const statusMatch = normalized.match(/^Status:\s*(.+?)\s*$/mu);

  if (!statusMatch) {
    throw new AdrError(
      'ADR_UNSUPPORTED_FORMAT',
      'Unsupported ADR Markdown: missing "Status:" line'
    );
  }

  const status = normalizeStatus(statusMatch[1] ?? '');

  if (!status) {
    throw new AdrError('ADR_UNSUPPORTED_FORMAT', 'Unsupported ADR Markdown: unknown status value');
  }

  const bodyStart = normalized.indexOf('\n', normalized.indexOf(titleMatch[0]));

  const sections = splitSections(normalized.slice(bodyStart < 0 ? 0 : bodyStart));

  const tagsLine = normalized.match(/^Tags:\s*(.+?)\s*$/mu);

  const affected = sections.get('affected areas') ?? '';
  const symbols = sections.get('affected symbols') ?? '';

  return {
    number: Number.parseInt(titleMatch[1] ?? '0', 10),
    title: (titleMatch[2] ?? '').trim(),
    status,
    tags: tagsLine ? (tagsLine[1] ?? '').split(',').map((tag) => tag.trim()) : [],
    context: (sections.get('context') ?? '').trim(),
    decision: (sections.get('decision') ?? '').trim(),
    consequences: parseConsequences(sections.get('consequences') ?? ''),
    alternatives: parseAlternatives(sections.get('alternatives') ?? ''),
    affectedPaths: parseBullets(affected).map((item) => item.replace(/^`|`$/gu, '')),
    affectedSymbols: parseBullets(symbols).map((item) => item.replace(/^`|`$/gu, '')),
    supersedes: parseBullets(sections.get('supersedes') ?? ''),
  };
}
