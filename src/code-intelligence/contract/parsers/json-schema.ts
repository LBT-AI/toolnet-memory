/*
 * Phase 81 — JSON Schema contract parser.
 *
 * Supports project-contained JSON Schema documents with an explicit `properties`
 * / `required` object shape, plus named `$defs`/`definitions` entries. Unknown
 * constructs (combinators, conditional schemas) are reported as unsupported
 * rather than silently mis-read.
 *
 * No network `$ref`. No source execution.
 */

import { canonicalType, contractId } from '../shape.js';

import type { ContractEntry, ContractField } from '../types.js';

import { parseYamlSubset, YamlUnsupportedError } from './yaml.js';

import { emptyParseResult, type ContractParseInput, type ContractParseResult } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function own(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function fieldsFromObject(schema: Record<string, unknown>): ContractField[] {
  const properties = own(schema, 'properties');

  if (!isRecord(properties)) {
    return [];
  }

  const required = new Set(stringList(own(schema, 'required')));

  const fields: ContractField[] = [];

  for (const name of Object.keys(properties).sort()) {
    const property = own(properties, name);

    if (!isRecord(property)) {
      fields.push({ name, type: 'unknown', required: required.has(name) });
      continue;
    }

    const rawType = own(property, 'type');

    const enumValues = stringList(own(property, 'enum')).map(String);

    const field: ContractField = {
      name,
      type: typeof rawType === 'string' ? canonicalType(rawType) : 'unknown',
      required: required.has(name),
    };

    if (enumValues.length > 0) {
      field.enumValues = enumValues;
    }

    fields.push(field);
  }

  return fields;
}

function parseDocument(path: string, source: string): unknown {
  const trimmed = source.trimStart();

  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(source) as unknown;
    } catch {
      return undefined;
    }
  }

  try {
    return parseYamlSubset(source, { maxNodes: 20_000, maxDepth: 32 });
  } catch (error) {
    if (error instanceof YamlUnsupportedError) {
      return undefined;
    }

    return undefined;
  }
}

export function parseJsonSchema(input: ContractParseInput): ContractParseResult {
  const result = emptyParseResult();

  const document = parseDocument(input.path, input.source);

  if (!isRecord(document)) {
    result.unsupported.push({ path: input.path, reason: 'PARSE_FAILURE' });
    return result;
  }

  if (
    own(document, 'allOf') !== undefined ||
    own(document, 'oneOf') !== undefined ||
    own(document, 'anyOf') !== undefined
  ) {
    result.unsupported.push({
      path: input.path,
      reason: 'UNSUPPORTED_CONSTRUCT',
      detail: 'Combinator schemas are not supported.',
    });
    return result;
  }

  const rootFields = fieldsFromObject(document);

  if (rootFields.length === 0) {
    result.unsupported.push({
      path: input.path,
      reason: 'UNSUPPORTED_CONSTRUCT',
      detail: 'No top-level properties.',
    });
  } else {
    result.entries.push({
      id: contractId('json_schema', input.path),
      kind: 'json_schema',
      identity: input.path,
      sourcePath: input.path,
      request: { fields: rootFields },
      response: { fields: [] },
    });
  }

  const defs = own(document, '$defs') ?? own(document, 'definitions');

  if (isRecord(defs)) {
    let nodes = 0;

    for (const name of Object.keys(defs).sort()) {
      nodes += 1;

      if (nodes > input.maxNodes) {
        result.truncated = true;
        break;
      }

      const definition = own(defs, name);

      if (!isRecord(definition)) {
        continue;
      }

      const fields = fieldsFromObject(definition);

      if (fields.length === 0) {
        continue;
      }

      const entry: ContractEntry = {
        id: contractId('json_schema', `${input.path}#${name}`),
        kind: 'json_schema',
        identity: `${input.path}#${name}`,
        sourcePath: input.path,
        request: { fields },
        response: { fields: [] },
      };

      if (input.serviceId !== undefined) {
        entry.serviceId = input.serviceId;
      }

      result.entries.push(entry);
    }
  }

  return result;
}
