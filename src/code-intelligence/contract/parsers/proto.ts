/*
 * Phase 81 — protobuf / gRPC contract parser.
 *
 * Parses message fields (name, type, field NUMBER, repeated) and RPC methods
 * from a `.proto` source without running protoc. Field numbers are part of the
 * wire contract identity, so a renamed-but-renumbered field is detected as
 * PROTO_FIELD_NUMBER_CHANGED rather than compared by name alone.
 *
 * No protoc. No execution. No network. Reserved/extension-range semantics are
 * NOT implemented, so this build never claims complete protobuf compatibility.
 */

import { canonicalType, contractId } from '../shape.js';

import type { ContractEntry, ContractField } from '../types.js';

import { emptyParseResult, type ContractParseInput, type ContractParseResult } from './types.js';

const SCALAR_TYPES = new Set([
  'double',
  'float',
  'int32',
  'int64',
  'uint32',
  'uint64',
  'sint32',
  'sint64',
  'fixed32',
  'fixed64',
  'sfixed32',
  'sfixed64',
  'bool',
  'string',
  'bytes',
]);

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/[^\n]*/gu, '');
}

function packageOf(source: string): string {
  const match = /\bpackage\s+([A-Za-z_][A-Za-z0-9_.]*)\s*;/u.exec(source);
  return match ? match[1]! : '';
}

interface Block {
  kind: 'message' | 'enum' | 'service';
  name: string;
  body: string;
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

function extractBlocks(source: string): Block[] {
  const blocks: Block[] = [];

  const pattern = /\b(message|enum|service)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/gu;

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const braceStart = match.index + match[0].length - 1;
    const braceEnd = matchBrace(source, braceStart);

    if (braceEnd === -1) {
      break;
    }

    blocks.push({
      kind: match[1] as Block['kind'],
      name: match[2]!,
      body: source.slice(braceStart + 1, braceEnd),
    });

    pattern.lastIndex = braceEnd + 1;
  }

  return blocks;
}

function parseField(line: string): ContractField | null {
  const match =
    /^(repeated\s+|optional\s+|required\s+)?([A-Za-z_][A-Za-z0-9_.<>]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\d+)/u.exec(
      line.trim()
    );

  if (!match) {
    return null;
  }

  const label = (match[1] ?? '').trim();

  const rawType = match[2]!;

  const field: ContractField = {
    name: match[3]!,
    type: `ref:${rawType}`,
    required: label !== 'repeated' && label !== 'optional',
    number: Number.parseInt(match[4]!, 10),
  };

  if (label === 'repeated') {
    field.repeated = true;
    field.type = 'array';
  } else if (SCALAR_TYPES.has(rawType.toLowerCase())) {
    field.type = canonicalType(rawType);
  }

  return field;
}

function messageFields(body: string): ContractField[] {
  const fields: ContractField[] = [];

  for (const raw of body.split(/[;\n]/u)) {
    const line = raw.trim();

    if (line.length === 0 || line.startsWith('option')) {
      continue;
    }

    /* Skip nested declarations; only direct scalar/message fields count. */
    if (/^(message|enum|oneof|reserved|extensions|service)\b/u.test(line)) {
      continue;
    }

    const field = parseField(line);

    if (field) {
      fields.push(field);
    }
  }

  return fields;
}

export function parseProto(input: ContractParseInput): ContractParseResult {
  const result = emptyParseResult();

  const source = stripComments(input.source);

  if (!/\bsyntax\s*=/u.test(source) && !/\b(message|service|enum)\s+/u.test(source)) {
    result.unsupported.push({
      path: input.path,
      reason: 'UNSUPPORTED_CONSTRUCT',
      detail: 'No protobuf declarations found.',
    });
    return result;
  }

  const pkg = packageOf(source);

  let nodes = 0;

  for (const block of extractBlocks(source)) {
    nodes += 1;

    if (nodes > input.maxNodes) {
      result.truncated = true;
      break;
    }

    if (block.kind === 'message') {
      const entry: ContractEntry = {
        id: contractId('grpc', `message:${pkg ? `${pkg}.` : ''}${block.name}`),
        kind: 'grpc',
        identity: `message:${pkg ? `${pkg}.` : ''}${block.name}`,
        sourcePath: input.path,
        request: { fields: messageFields(block.body) },
        response: { fields: [] },
      };

      if (input.serviceId !== undefined) {
        entry.serviceId = input.serviceId;
      }

      result.entries.push(entry);
      continue;
    }

    if (block.kind === 'enum') {
      const values = block.body
        .split(/[;\n]/u)
        .map((line) => line.trim())
        .filter(
          (line) => line.length > 0 && !line.startsWith('option') && !line.startsWith('reserved')
        )
        .map((line) => line.split(/\s*=/u)[0]!.trim())
        .filter((value) => value.length > 0);

      result.entries.push({
        id: contractId('grpc', `enum:${pkg ? `${pkg}.` : ''}${block.name}`),
        kind: 'grpc',
        identity: `enum:${pkg ? `${pkg}.` : ''}${block.name}`,
        sourcePath: input.path,
        request: { fields: [] },
        response: {
          fields: [{ name: 'values', type: 'enum', required: true, enumValues: values }],
        },
      });
      continue;
    }

    /* service */
    const rpcPattern = /\brpc\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gu;

    let rpc: RegExpExecArray | null;

    while ((rpc = rpcPattern.exec(block.body)) !== null) {
      const methodName = rpc[1]!;

      result.entries.push({
        id: contractId('grpc', `${block.name}/${methodName}`),
        kind: 'grpc',
        identity: `${block.name}/${methodName}`,
        sourcePath: input.path,
        serviceId: input.serviceId ?? block.name,
        request: { fields: [] },
        response: { fields: [] },
      });
    }
  }

  return result;
}
