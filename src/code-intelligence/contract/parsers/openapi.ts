/*
 * Phase 81 — OpenAPI 3.x contract parser (JSON and a bounded YAML subset).
 *
 * Passive and project-contained:
 *   - only intra-document `#/...` $refs are resolved;
 *   - a remote (`http://`, `https://`) ref is BLOCKED, never fetched;
 *   - a ref that escapes the document (`../`, absolute) is BLOCKED;
 *   - an external file ref is reported unresolved (this build does not read
 *     additional files for a schema);
 *   - ref cycles are detected and bounded.
 *
 * No network. No source execution. No external validation service.
 */

import { canonicalType, contractId } from '../shape.js';

import type {
  ContractEntry,
  ContractField,
  ContractUnresolvedRef,
  ContractUnsupported,
} from '../types.js';

import { parseYamlSubset, YamlUnsupportedError } from './yaml.js';

import { emptyParseResult, type ContractParseInput, type ContractParseResult } from './types.js';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function own(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

interface Resolver {
  root: unknown;
  unresolved: ContractUnresolvedRef[];
  path: string;
  nodes: number;
  maxNodes: number;
  maxRefDepth: number;
  /** Called when the node bound is exceeded, so the caller reports truncation. */
  onLimit(): void;
}

/** Resolve a JSON pointer inside the parsed document, bounded and cycle-safe. */
function resolveRef(resolver: Resolver, ref: string, seen: Set<string>, depth: number): unknown {
  if (/^https?:\/\//iu.test(ref)) {
    resolver.unresolved.push({ path: resolver.path, ref, reason: 'REMOTE_REF' });
    return undefined;
  }

  if (ref.startsWith('#/')) {
    if (seen.has(ref)) {
      resolver.unresolved.push({ path: resolver.path, ref, reason: 'REF_CYCLE' });
      return undefined;
    }

    if (depth >= resolver.maxRefDepth) {
      resolver.unresolved.push({ path: resolver.path, ref, reason: 'REF_DEPTH_EXCEEDED' });
      return undefined;
    }

    seen.add(ref);

    const segments = ref
      .slice(2)
      .split('/')
      .map((segment) => segment.replace(/~1/gu, '/').replace(/~0/gu, '~'));

    let current: unknown = resolver.root;

    for (const segment of segments) {
      if (!isRecord(current)) {
        resolver.unresolved.push({ path: resolver.path, ref, reason: 'UNRESOLVED_REF' });
        return undefined;
      }

      const next = own(current, segment);

      if (next === undefined) {
        resolver.unresolved.push({ path: resolver.path, ref, reason: 'UNRESOLVED_REF' });
        return undefined;
      }

      current = next;
    }

    return resolveMaybeRef(resolver, current, seen, depth + 1);
  }

  if (ref.includes('..') || ref.startsWith('/') || /^[A-Za-z]:[\\/]/u.test(ref)) {
    resolver.unresolved.push({ path: resolver.path, ref, reason: 'PATH_ESCAPE' });
    return undefined;
  }

  /* A relative external file ref: this build does not read other files. */
  resolver.unresolved.push({ path: resolver.path, ref, reason: 'UNRESOLVED_REF' });
  return undefined;
}

function resolveMaybeRef(
  resolver: Resolver,
  value: unknown,
  seen: Set<string>,
  depth: number
): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const ref = own(value, '$ref');

  if (typeof ref === 'string' && ref.length > 0) {
    return resolveRef(resolver, ref, seen, depth);
  }

  return value;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Convert a JSON-schema-ish node into canonical contract fields. */
function schemaToFields(
  resolver: Resolver,
  schema: unknown,
  depth: number,
  seen: Set<string>
): ContractField[] {
  resolver.nodes += 1;

  if (resolver.nodes > resolver.maxNodes || depth > resolver.maxRefDepth) {
    resolver.onLimit();
    return [];
  }

  const resolved = resolveMaybeRef(resolver, schema, seen, depth);

  if (!isRecord(resolved)) {
    return [];
  }

  const properties = own(resolved, 'properties');

  if (!isRecord(properties)) {
    return [];
  }

  const required = new Set(stringList(own(resolved, 'required')));
  const fields: ContractField[] = [];

  for (const name of Object.keys(properties).sort()) {
    resolver.nodes += 1;

    if (resolver.nodes > resolver.maxNodes) {
      resolver.onLimit();
      break;
    }

    const raw = own(properties, name);

    const property = isRecord(raw) ? resolveMaybeRef(resolver, raw, seen, depth + 1) : raw;

    if (!isRecord(property)) {
      fields.push({ name, type: 'unknown', required: required.has(name) });
      continue;
    }

    const enumValues = stringList(own(property, 'enum')).map(String);

    const rawType = own(property, 'type');

    const type =
      typeof rawType === 'string'
        ? canonicalType(rawType)
        : own(property, '$ref') !== undefined
          ? 'ref'
          : 'unknown';

    const field: ContractField = {
      name,
      type,
      required: required.has(name),
    };

    if (enumValues.length > 0) {
      field.enumValues = enumValues;
    }

    fields.push(field);
  }

  return fields;
}

function parametersToFields(resolver: Resolver, parameters: unknown): ContractField[] {
  if (!Array.isArray(parameters)) {
    return [];
  }

  const fields: ContractField[] = [];

  for (const raw of parameters) {
    const parameter = isRecord(raw) ? resolveMaybeRef(resolver, raw, new Set(), 0) : raw;

    if (!isRecord(parameter)) {
      continue;
    }

    const name = own(parameter, 'name');
    const location = own(parameter, 'in');

    if (typeof name !== 'string' || name.length === 0) {
      continue;
    }

    const schema = resolveMaybeRef(resolver, own(parameter, 'schema'), new Set(), 0);

    const rawType = isRecord(schema) ? own(schema, 'type') : undefined;

    const isPath = location === 'path';
    const requiredFlag = own(parameter, 'required');

    fields.push({
      name: `${typeof location === 'string' ? location : 'query'}.${name}`,
      type: typeof rawType === 'string' ? canonicalType(rawType) : 'unknown',
      required: isPath || requiredFlag === true,
    });
  }

  return fields;
}

function requestBodyFields(resolver: Resolver, body: unknown): ContractField[] {
  const resolved = resolveMaybeRef(resolver, body, new Set(), 0);

  if (!isRecord(resolved)) {
    return [];
  }

  const content = own(resolved, 'content');

  if (!isRecord(content)) {
    return [];
  }

  const json = own(content, 'application/json') ?? own(content, 'application/*+json');

  if (!isRecord(json)) {
    return [];
  }

  return schemaToFields(resolver, own(json, 'schema'), 0, new Set());
}

function responseFields(resolver: Resolver, responses: unknown): ContractField[] {
  const resolved = resolveMaybeRef(resolver, responses, new Set(), 0);

  if (!isRecord(resolved)) {
    return [];
  }

  const keys = Object.keys(resolved).sort();

  const success =
    keys.find((key) => key === '200') ??
    keys.find((key) => /^2\d\d$/u.test(key)) ??
    keys.find((key) => key === 'default');

  if (success === undefined) {
    return [];
  }

  const response = resolveMaybeRef(resolver, own(resolved, success), new Set(), 0);

  if (!isRecord(response)) {
    return [];
  }

  const content = own(response, 'content');

  if (!isRecord(content)) {
    return [];
  }

  const json = own(content, 'application/json') ?? own(content, 'application/*+json');

  if (!isRecord(json)) {
    return [];
  }

  return schemaToFields(resolver, own(json, 'schema'), 0, new Set());
}

function parseDocument(path: string, source: string, input: ContractParseInput): unknown {
  const trimmed = source.trimStart();

  if (trimmed.startsWith('{') || path.toLowerCase().endsWith('.json')) {
    try {
      return JSON.parse(source) as unknown;
    } catch {
      return undefined;
    }
  }

  try {
    return parseYamlSubset(source, {
      maxNodes: Math.min(input.maxNodes, 20_000),
      maxDepth: 32,
    });
  } catch (error) {
    if (error instanceof YamlUnsupportedError) {
      return undefined;
    }

    return undefined;
  }
}

export function parseOpenApi(input: ContractParseInput): ContractParseResult {
  const result = emptyParseResult();

  const document = parseDocument(input.path, input.source, input);

  if (!isRecord(document)) {
    result.unsupported.push({ path: input.path, reason: 'PARSE_FAILURE' });
    return result;
  }

  const version = own(document, 'openapi');

  if (typeof version !== 'string') {
    result.unsupported.push({ path: input.path, reason: 'UNSUPPORTED_VERSION' });
    return result;
  }

  const paths = own(document, 'paths');

  if (!isRecord(paths)) {
    result.unsupported.push({
      path: input.path,
      reason: 'UNSUPPORTED_CONSTRUCT',
      detail: 'no paths',
    });
    return result;
  }

  const resolver: Resolver = {
    root: document,
    unresolved: result.unresolvedRefs,
    path: input.path,
    nodes: 0,
    maxNodes: input.maxNodes,
    maxRefDepth: input.maxRefDepth,
    onLimit: () => {
      result.truncated = true;
    },
  };

  for (const route of Object.keys(paths).sort()) {
    const item = own(paths, route);

    if (!isRecord(item)) {
      continue;
    }

    for (const method of Object.keys(item).sort()) {
      if (!HTTP_METHODS.has(method.toLowerCase())) {
        continue;
      }

      const operation = own(item, method);

      if (!isRecord(operation)) {
        continue;
      }

      const canonical = `${method.toUpperCase()} ${route}`;

      const request: ContractField[] = [
        ...parametersToFields(resolver, own(item, 'parameters')),
        ...parametersToFields(resolver, own(operation, 'parameters')),
        ...requestBodyFields(resolver, own(operation, 'requestBody')),
      ];

      const response = responseFields(resolver, own(operation, 'responses'));

      const entry: ContractEntry = {
        id: contractId('openapi', canonical),
        kind: 'openapi',
        identity: canonical,
        sourcePath: input.path,
        method: method.toUpperCase(),
        path: route,
        request: { fields: request },
        response: { fields: response },
      };

      if (input.serviceId !== undefined) {
        entry.serviceId = input.serviceId;
      }

      result.entries.push(entry);
    }
  }

  return result;
}

export type { ContractUnsupported };
