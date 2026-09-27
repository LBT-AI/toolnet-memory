/*
 * Phase 81 — bounded YAML subset parser.
 *
 * There is no YAML dependency in this project, so OpenAPI YAML is only
 * supported for the conservative subset this parser can prove: block mappings,
 * block sequences, plain/quoted scalars, inline scalar arrays and empty
 * containers. Anything else (tabs, anchors, aliases, document markers, block
 * scalars, flow maps, duplicate keys) is REJECTED so the caller reports the
 * file as unsupported rather than silently mis-reading a schema.
 *
 * Prototype-safe by construction: objects are built with `Object.create(null)`
 * and `__proto__`/`constructor`/`prototype` keys are rejected.
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export class YamlUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YamlUnsupportedError';
  }
}

interface Line {
  indent: number;
  content: string;
  number: number;
}

export interface YamlParseOptions {
  maxNodes: number;
  maxDepth: number;
}

function stripComment(raw: string): string {
  let quote: string | null = null;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]!;

    if (quote) {
      if (char === quote) {
        quote = null;
      } else if (char === '\\' && quote === '"') {
        index += 1;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '#') {
      /* A comment needs a leading space (or line start) to not be part of a value. */
      if (index === 0 || /\s/u.test(raw[index - 1]!)) {
        return raw.slice(0, index);
      }
    }
  }

  return raw;
}

function toLines(source: string): Line[] {
  const lines: Line[] = [];

  for (const [index, rawLine] of source.split(/\r?\n/u).entries()) {
    const line = stripComment(rawLine).replace(/\s+$/u, '');

    if (line.trim().length === 0) {
      continue;
    }

    if (line.includes('\t')) {
      throw new YamlUnsupportedError('Tab indentation is not supported.');
    }

    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (trimmed === '---' || trimmed === '...') {
      throw new YamlUnsupportedError('Multi-document YAML is not supported.');
    }

    if (/^[&*]/u.test(trimmed)) {
      throw new YamlUnsupportedError('YAML anchors/aliases are not supported.');
    }

    lines.push({ indent, content: trimmed, number: index + 1 });
  }

  return lines;
}

function parseScalar(raw: string): unknown {
  const value = raw.trim();

  if (value.length === 0) {
    return null;
  }

  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/gu, '"').replace(/\\n/gu, '\n');
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/gu, "'");
  }

  if (value === '{}') {
    return Object.create(null) as Record<string, unknown>;
  }

  if (value === '[]') {
    return [];
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();

    if (inner.length === 0) {
      return [];
    }

    return inner.split(',').map((item) => parseScalar(item));
  }

  if (value.startsWith('{') || value.endsWith('}')) {
    throw new YamlUnsupportedError('Inline flow mappings are not supported.');
  }

  if (value === '|' || value === '>' || value.startsWith('|') || value.startsWith('>')) {
    throw new YamlUnsupportedError('Block scalars are not supported.');
  }

  if (value === 'null' || value === '~') {
    return null;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  if (/^-?\d+$/u.test(value)) {
    return Number.parseInt(value, 10);
  }

  if (/^-?\d*\.\d+$/u.test(value)) {
    return Number.parseFloat(value);
  }

  return value;
}

function splitKey(content: string): { key: string; rest: string } | null {
  let quote: string | null = null;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]!;

    if (quote) {
      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === ':' && (index + 1 === content.length || /\s/u.test(content[index + 1]!))) {
      const rawKey = content.slice(0, index).trim();

      const key =
        rawKey.length >= 2 &&
        ((rawKey.startsWith('"') && rawKey.endsWith('"')) ||
          (rawKey.startsWith("'") && rawKey.endsWith("'")))
          ? rawKey.slice(1, -1)
          : rawKey;

      if (key.length === 0) {
        return null;
      }

      if (FORBIDDEN_KEYS.has(key)) {
        throw new YamlUnsupportedError('Forbidden object key.');
      }

      return { key, rest: content.slice(index + 1).trim() };
    }
  }

  return null;
}

interface Cursor {
  lines: Line[];
  index: number;
  nodes: number;
  maxNodes: number;
  maxDepth: number;
}

function parseBlock(cursor: Cursor, indent: number, depth: number): unknown {
  if (depth > cursor.maxDepth) {
    throw new YamlUnsupportedError('Maximum nesting depth exceeded.');
  }

  const first = cursor.lines[cursor.index];

  if (!first || first.indent < indent) {
    return null;
  }

  if (/^-(?:\s|$)/u.test(first.content)) {
    return parseSequence(cursor, indent, depth);
  }

  return parseMapping(cursor, indent, depth);
}

function parseSequence(cursor: Cursor, indent: number, depth: number): unknown[] {
  const out: unknown[] = [];

  while (cursor.index < cursor.lines.length) {
    const line = cursor.lines[cursor.index]!;

    if (line.indent < indent || !/^-(?:\s|$)/u.test(line.content)) {
      break;
    }

    if (line.indent > indent) {
      throw new YamlUnsupportedError('Unexpected indentation in sequence.');
    }

    cursor.nodes += 1;

    if (cursor.nodes > cursor.maxNodes) {
      throw new YamlUnsupportedError('Maximum node count exceeded.');
    }

    const rest = line.content.slice(1).trim();

    cursor.index += 1;

    if (rest.length === 0) {
      const next = cursor.lines[cursor.index];

      if (next && next.indent > indent) {
        out.push(parseBlock(cursor, next.indent, depth + 1));
      } else {
        out.push(null);
      }

      continue;
    }

    const pair = splitKey(rest);

    if (pair) {
      /* A mapping whose first key sits on the dash line. */
      const map: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      const childIndent = indent + (line.content.length - rest.length);

      if (pair.key in map) {
        throw new YamlUnsupportedError('Duplicate key.');
      }

      map[pair.key] =
        pair.rest.length > 0 ? parseScalar(pair.rest) : parseNested(cursor, childIndent, depth + 1);

      while (cursor.index < cursor.lines.length) {
        const next = cursor.lines[cursor.index]!;

        if (next.indent !== childIndent || /^-(?:\s|$)/u.test(next.content)) {
          break;
        }

        const nestedPair = splitKey(next.content);

        if (!nestedPair) {
          throw new YamlUnsupportedError('Malformed mapping entry.');
        }

        if (nestedPair.key in map) {
          throw new YamlUnsupportedError('Duplicate key.');
        }

        map[nestedPair.key] =
          nestedPair.rest.length > 0
            ? parseScalar(nestedPair.rest)
            : (cursor.index++, parseNested(cursor, childIndent, depth + 1));

        cursor.index += 0;
      }

      out.push(map);
      continue;
    }

    out.push(parseScalar(rest));
  }

  return out;
}

function parseNested(cursor: Cursor, parentIndent: number, depth: number): unknown {
  const next = cursor.lines[cursor.index];

  if (next && next.indent > parentIndent) {
    return parseBlock(cursor, next.indent, depth + 1);
  }

  return null;
}

function parseMapping(cursor: Cursor, indent: number, depth: number): Record<string, unknown> {
  const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

  while (cursor.index < cursor.lines.length) {
    const line = cursor.lines[cursor.index]!;

    if (line.indent < indent) {
      break;
    }

    if (line.indent > indent) {
      throw new YamlUnsupportedError('Unexpected indentation in mapping.');
    }

    if (/^-(?:\s|$)/u.test(line.content)) {
      break;
    }

    const pair = splitKey(line.content);

    if (!pair) {
      throw new YamlUnsupportedError('Malformed mapping entry.');
    }

    if (pair.key in out) {
      throw new YamlUnsupportedError('Duplicate key.');
    }

    cursor.nodes += 1;

    if (cursor.nodes > cursor.maxNodes) {
      throw new YamlUnsupportedError('Maximum node count exceeded.');
    }

    cursor.index += 1;

    out[pair.key] =
      pair.rest.length > 0 ? parseScalar(pair.rest) : parseNested(cursor, indent, depth + 1);
  }

  return out;
}

/**
 * Parse a YAML subset. Throws `YamlUnsupportedError` when the document uses a
 * construct this parser cannot prove.
 */
export function parseYamlSubset(source: string, options: YamlParseOptions): unknown {
  const lines = toLines(source);

  if (lines.length === 0) {
    return null;
  }

  const cursor: Cursor = {
    lines,
    index: 0,
    nodes: 0,
    maxNodes: options.maxNodes,
    maxDepth: options.maxDepth,
  };

  const value = parseBlock(cursor, lines[0]!.indent, 0);

  if (cursor.index < lines.length) {
    throw new YamlUnsupportedError('Trailing content after the root node.');
  }

  return value;
}
