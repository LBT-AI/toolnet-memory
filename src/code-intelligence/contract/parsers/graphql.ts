/*
 * Phase 81 — GraphQL SDL contract parser.
 *
 * Parses type / interface / input / enum definitions deterministically. Each
 * field of a type becomes a contract whose args are the request side and whose
 * return type is the response side, so a removed field, an added required
 * argument and a tightened nullability are each detected structurally.
 *
 * No resolver-function-name guessing. No schema fetch. No execution.
 */

import { canonicalType, contractId } from '../shape.js';

import type { ContractEntry, ContractField } from '../types.js';

import { emptyParseResult, type ContractParseInput, type ContractParseResult } from './types.js';

const DEFINITION_KEYWORDS = new Set(['type', 'interface', 'input', 'enum', 'extend']);

function stripComments(source: string): string {
  return source
    .split(/\r?\n/u)
    .map((line) => {
      const index = line.indexOf('#');
      return index === -1 ? line : line.slice(0, index);
    })
    .join('\n');
}

interface Block {
  keyword: string;
  name: string;
  body: string;
}

/** Extract `keyword Name { body }` blocks with balanced-brace scanning. */
function extractBlocks(source: string): Block[] {
  const blocks: Block[] = [];

  const text = stripComments(source);

  let index = 0;

  while (index < text.length) {
    const rest = text.slice(index);

    const match = /\b(type|interface|input|enum)\s+([A-Za-z_][A-Za-z0-9_]*)/u.exec(rest);

    if (!match) {
      break;
    }

    const keyword = match[1]!;

    const name = match[2]!;

    const headerEnd = index + match.index + match[0].length;

    /* Skip to the opening brace of the definition. */
    const braceStart = text.indexOf('{', headerEnd);

    const nextDefinition = text
      .slice(headerEnd)
      .search(/\b(type|interface|input|enum)\s+[A-Za-z_]/u);

    if (braceStart === -1 || (nextDefinition !== -1 && headerEnd + nextDefinition < braceStart)) {
      index = headerEnd;
      continue;
    }

    const braceEnd = matchBrace(text, braceStart);

    if (braceEnd === -1) {
      index = headerEnd;
      continue;
    }

    blocks.push({ keyword, name, body: text.slice(braceStart + 1, braceEnd) });

    index = braceEnd + 1;
  }

  return blocks;
}

function matchBrace(text: string, start: number): number {
  let depth = 0;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]!;

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

/** Split a block body into top-level definitions (fields), ignoring nested (). */
function splitDefs(body: string): string[] {
  const defs: string[] = [];

  let depth = 0;
  let current = '';

  for (const char of body) {
    if (char === '(' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === ']') {
      depth = Math.max(0, depth - 1);
    }

    if ((char === '\n' || char === ',') && depth === 0) {
      if (current.trim().length > 0) {
        defs.push(current.trim());
      }

      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    defs.push(current.trim());
  }

  return defs;
}

interface ParsedType {
  type: string;
  nullable: boolean;
}

function parseGraphqlType(raw: string): ParsedType {
  let value = raw.trim();

  const nullable = !value.endsWith('!');

  if (!nullable) {
    value = value.slice(0, -1);
  }

  return { type: canonicalType(value.replace(/[[\]!]/gu, '').trim()), nullable };
}

function parseArgs(raw: string | undefined): ContractField[] {
  if (!raw) {
    return [];
  }

  const fields: ContractField[] = [];

  for (const def of splitDefs(raw)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/u.exec(def);

    if (!match) {
      continue;
    }

    const parsed = parseGraphqlType(match[2]!);

    fields.push({
      name: match[1]!,
      type: parsed.type,
      required: !parsed.nullable,
      nullable: parsed.nullable,
    });
  }

  return fields;
}

function parseFieldDef(
  def: string
): { name: string; args: ContractField[]; type: ParsedType } | null {
  const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*(\(([\s\S]*?)\))?\s*:\s*(.+)$/u.exec(def);

  if (!match) {
    return null;
  }

  return {
    name: match[1]!,
    args: parseArgs(match[3]),
    type: parseGraphqlType(match[4]!),
  };
}

export function parseGraphql(input: ContractParseInput): ContractParseResult {
  const result = emptyParseResult();

  const blocks = extractBlocks(input.source);

  if (blocks.length === 0 && input.source.trim().length > 0) {
    result.unsupported.push({
      path: input.path,
      reason: 'UNSUPPORTED_CONSTRUCT',
      detail: 'No GraphQL definitions found.',
    });
    return result;
  }

  let nodes = 0;

  for (const block of blocks) {
    if (block.keyword === 'enum') {
      const values = splitDefs(block.body)
        .map((value) => value.split(/\s+/u)[0]!)
        .filter(Boolean);

      const entry: ContractEntry = {
        id: contractId('graphql', `enum:${block.name}`),
        kind: 'graphql',
        identity: `enum:${block.name}`,
        sourcePath: input.path,
        request: { fields: [] },
        response: {
          fields: [{ name: 'values', type: 'enum', required: true, enumValues: values }],
        },
      };

      if (input.serviceId !== undefined) {
        entry.serviceId = input.serviceId;
      }

      result.entries.push(entry);
      continue;
    }

    const isInput = block.keyword === 'input';

    for (const def of splitDefs(block.body)) {
      nodes += 1;

      if (nodes > input.maxNodes) {
        result.truncated = true;
        break;
      }

      if (isInput) {
        const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/u.exec(def);

        if (!match) {
          continue;
        }

        const parsed = parseGraphqlType(match[2]!);

        const entry: ContractEntry = {
          id: contractId('graphql', `input:${block.name}`),
          kind: 'graphql',
          identity: `input:${block.name}`,
          sourcePath: input.path,
          request: {
            fields: [
              {
                name: match[1]!,
                type: parsed.type,
                required: !parsed.nullable,
                nullable: parsed.nullable,
              },
            ],
          },
          response: { fields: [] },
        };

        if (input.serviceId !== undefined) {
          entry.serviceId = input.serviceId;
        }

        result.entries.push(entry);
        continue;
      }

      const field = parseFieldDef(def);

      if (!field) {
        continue;
      }

      const entry: ContractEntry = {
        id: contractId('graphql', `${block.name}.${field.name}`),
        kind: 'graphql',
        identity: `${block.name}.${field.name}`,
        sourcePath: input.path,
        request: { fields: field.args },
        response: {
          fields: [
            {
              name: 'result',
              type: field.type.type,
              required: true,
              nullable: field.type.nullable,
            },
          ],
        },
      };

      if (input.serviceId !== undefined) {
        entry.serviceId = input.serviceId;
      }

      result.entries.push(entry);
    }

    if (result.truncated) {
      break;
    }
  }

  return result;
}

export { DEFINITION_KEYWORDS };
