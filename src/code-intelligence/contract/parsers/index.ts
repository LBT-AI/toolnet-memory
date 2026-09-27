/*
 * Phase 81 — contract parser dispatcher.
 *
 * Path classification is deliberately conservative: a file is only treated as a
 * contract surface when its name/extension proves the format. A `.ts` file
 * yields exported type contracts; a `package.json` yields export contracts;
 * route/event contracts come from the graph (discovery), never from guessing.
 */

import { basename } from 'node:path';

import type { ContractKind } from '../types.js';

import { parseGraphql } from './graphql.js';

import { parseJsonSchema } from './json-schema.js';

import { parseOpenApi } from './openapi.js';

import { parsePackage } from './package.js';

import { parseProto } from './proto.js';

import { parseTypeScriptContracts } from './typescript.js';

import type { ContractParseInput, ContractParseResult } from './types.js';

export type { ContractParseInput, ContractParseResult } from './types.js';

export { emptyParseResult } from './types.js';

/** Extended supported kinds implemented by this dispatcher. */
export const SUPPORTED_CONTRACT_KINDS: readonly ContractKind[] = [
  'http',
  'openapi',
  'graphql',
  'grpc',
  'type',
  'json_schema',
  'package_export',
  'event',
];

const SCHEMA_DIR = /(^|\/)(schema|schemas|contracts|apis)(\/|$)/u;

export function contractKindForPath(path: string): ContractKind | null {
  const name = basename(path).toLowerCase();
  const lower = path.toLowerCase();

  if (/^(openapi|swagger)\.(json|ya?ml)$/u.test(name) || /(^|\.)openapi\./.test(name)) {
    return 'openapi';
  }

  if (name.endsWith('.graphql') || name.endsWith('.gql')) {
    return 'graphql';
  }

  if (name.endsWith('.proto')) {
    return 'grpc';
  }

  if (name === 'package.json') {
    return 'package_export';
  }

  if (name.endsWith('.schema.json') || (name.endsWith('.json') && SCHEMA_DIR.test(lower))) {
    return 'json_schema';
  }

  if (
    name.endsWith('.ts') ||
    name.endsWith('.tsx') ||
    name.endsWith('.mts') ||
    name.endsWith('.cts')
  ) {
    /* Declaration files are pure contract surfaces; runtime files may still hold
       exported types, so both map to the `type` kind. */
    return 'type';
  }

  return null;
}

export function parseContractFile(
  kind: ContractKind,
  input: ContractParseInput
): ContractParseResult {
  switch (kind) {
    case 'openapi':
      return parseOpenApi(input);
    case 'graphql':
      return parseGraphql(input);
    case 'grpc':
      return parseProto(input);
    case 'json_schema':
      return parseJsonSchema(input);
    case 'package_export':
      return parsePackage(input);
    case 'type':
      return parseTypeScriptContracts(input);
    default:
      return { entries: [], unsupported: [], unresolvedRefs: [], truncated: false };
  }
}
