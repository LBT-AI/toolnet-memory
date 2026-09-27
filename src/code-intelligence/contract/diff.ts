/*
 * Phase 81 — structural contract diff.
 *
 * Compatibility is decided here, and ONLY here, from parsed structure plus
 * explicit deterministic rules. Direction matters:
 *
 *   request  — the consumer dictates the shape. Removing an accepted field,
 *              adding a required field, tightening requiredness/nullability or
 *              changing a type is breaking.
 *   response — the provider dictates the shape. Removing a guaranteed field or
 *              changing a response type is breaking. Adding a response field is
 *              compatible.
 *
 * A structural break is a structural break even when zero consumers are known.
 * Consumers never influence the classification.
 */

import type {
  Compatibility,
  ContractChangeEntry,
  ContractDelta,
  ContractEntry,
  ContractField,
  ContractReasonCode,
  ContractSide,
} from './types.js';

const RANK: Record<Compatibility, number> = {
  compatible: 0,
  unknown: 1,
  potentially_breaking: 2,
  breaking: 3,
};

function worst(left: Compatibility, right: Compatibility): Compatibility {
  return RANK[right] > RANK[left] ? right : left;
}

function fieldIndex(fields: readonly ContractField[]): Map<string, ContractField> {
  const index = new Map<string, ContractField>();

  for (const field of fields) {
    index.set(field.name, field);
  }

  return index;
}

function enumDiff(
  baseline: ContractField,
  candidate: ContractField,
  side: ContractSide,
  kind: ContractEntry['kind']
): ContractChangeEntry[] {
  const before = baseline.enumValues ?? [];
  const after = candidate.enumValues ?? [];

  if (before.length === 0 && after.length === 0) {
    return [];
  }

  const changes: ContractChangeEntry[] = [];

  const removed = before.filter((value) => !after.includes(value));
  const added = after.filter((value) => !before.includes(value));

  if (removed.length > 0) {
    changes.push({
      code: 'ENUM_VALUE_REMOVED',
      side,
      field: baseline.name,
      detail: `Enum value(s) removed from ${baseline.name}: ${removed.sort().join(', ')}.`,
      ...(kind === 'type' ? { reason: 'PUBLIC_TYPE_CHANGED' as ContractReasonCode } : {}),
    });
  }

  if (added.length > 0) {
    changes.push({
      code: 'ENUM_VALUE_ADDED',
      side,
      field: baseline.name,
      detail: `Enum value(s) added to ${baseline.name}: ${added.sort().join(', ')}.`,
    });
  }

  return changes;
}

function compareField(
  baseline: ContractField,
  candidate: ContractField,
  side: ContractSide,
  kind: ContractEntry['kind']
): ContractChangeEntry[] {
  const changes: ContractChangeEntry[] = [];

  /* Protobuf field number is contract identity, not a detail. */
  if (
    baseline.number !== undefined &&
    candidate.number !== undefined &&
    baseline.number !== candidate.number
  ) {
    changes.push({
      code: 'PROTO_FIELD_NUMBER_CHANGED',
      side,
      field: baseline.name,
      detail: `Field ${baseline.name} number changed ${baseline.number} -> ${candidate.number}.`,
      reason: 'PROTO_FIELD_NUMBER_CHANGED',
    });
  }

  if (baseline.type !== candidate.type) {
    if (kind === 'type') {
      changes.push({
        code: 'FIELD_TYPE_CHANGED',
        side,
        field: baseline.name,
        detail: `Exported type member ${baseline.name} type changed ${baseline.type} -> ${candidate.type}.`,
        reason: 'PUBLIC_TYPE_CHANGED',
      });
    } else if (side === 'request') {
      changes.push({
        code: 'PARAMETER_TYPE_CHANGED',
        side,
        field: baseline.name,
        detail: `Request field ${baseline.name} type changed ${baseline.type} -> ${candidate.type}.`,
        reason: 'PARAMETER_TYPE_CHANGED',
      });
    } else {
      changes.push({
        code: 'FIELD_TYPE_CHANGED',
        side,
        field: baseline.name,
        detail: `Response field ${baseline.name} type changed ${baseline.type} -> ${candidate.type}.`,
        reason: kind === 'grpc' ? 'PROTO_FIELD_TYPE_CHANGED' : 'RESPONSE_TYPE_CHANGED',
      });
    }
  }

  /* GraphQL nullability is direction-sensitive. */
  if (baseline.nullable !== undefined && candidate.nullable !== undefined) {
    const tightenedInput = side === 'request' && baseline.nullable && !candidate.nullable;
    const loosenedOutput = side === 'response' && !baseline.nullable && candidate.nullable;

    if (tightenedInput) {
      changes.push({
        code: 'PARAMETER_REQUIREDNESS_CHANGED',
        side,
        field: baseline.name,
        detail: `GraphQL argument ${baseline.name} no longer accepts null.`,
        reason: 'GRAPHQL_NULLABILITY_TIGHTENED',
      });
    } else if (loosenedOutput) {
      changes.push({
        code: 'FIELD_REQUIREDNESS_CHANGED',
        side,
        field: baseline.name,
        detail: `GraphQL field ${baseline.name} is now nullable.`,
        reason: 'GRAPHQL_NULLABILITY_TIGHTENED',
      });
    }
  }

  if (baseline.required !== candidate.required) {
    if (side === 'request') {
      if (!baseline.required && candidate.required) {
        changes.push({
          code: 'PARAMETER_REQUIREDNESS_CHANGED',
          side,
          field: baseline.name,
          detail: `Request field ${baseline.name} became required.`,
          reason:
            kind === 'graphql' ? 'GRAPHQL_REQUIRED_ARGUMENT_ADDED' : 'REQUIRED_PARAMETER_ADDED',
        });
      }
    } else if (baseline.required && !candidate.required) {
      changes.push({
        code: 'FIELD_REQUIREDNESS_CHANGED',
        side,
        field: baseline.name,
        detail: `Response field ${baseline.name} is no longer guaranteed.`,
      });
    }
  }

  changes.push(...enumDiff(baseline, candidate, side, kind));

  return changes;
}

function compareShapes(
  baseline: readonly ContractField[],
  candidate: readonly ContractField[],
  side: ContractSide,
  kind: ContractEntry['kind']
): ContractChangeEntry[] {
  const before = fieldIndex(baseline);
  const after = fieldIndex(candidate);

  const names = [...new Set([...before.keys(), ...after.keys()])].sort();

  const changes: ContractChangeEntry[] = [];

  for (const name of names) {
    const left = before.get(name);
    const right = after.get(name);

    if (left && !right) {
      if (kind === 'type') {
        changes.push({
          code: 'FIELD_REMOVED',
          side,
          field: name,
          detail: `Exported type member ${name} removed.`,
          reason: 'PUBLIC_TYPE_CHANGED',
        });
      } else if (kind === 'package_export') {
        changes.push({
          code: 'EXPORT_REMOVED',
          side,
          field: name,
          detail: `Declared package export ${name} removed.`,
          reason: 'EXPORT_REMOVED',
        });
      } else if (side === 'request') {
        changes.push({
          code: 'PARAMETER_REMOVED',
          side,
          field: name,
          detail: `Accepted request field ${name} removed.`,
          reason: 'CONTRACT_REMOVED',
        });
      } else {
        changes.push({
          code: 'FIELD_REMOVED',
          side,
          field: name,
          detail: `Response field ${name} removed.`,
          reason: kind === 'graphql' ? 'GRAPHQL_FIELD_REMOVED' : 'RESPONSE_FIELD_REMOVED',
        });
      }

      continue;
    }

    if (!left && right) {
      if (kind === 'package_export') {
        changes.push({
          code: 'EXPORT_ADDED',
          side,
          field: name,
          detail: `Declared package export ${name} added.`,
        });
      } else if (side === 'request' && right.required) {
        changes.push({
          code: 'PARAMETER_ADDED',
          side,
          field: name,
          detail: `Required request field ${name} added.`,
          reason:
            kind === 'graphql' ? 'GRAPHQL_REQUIRED_ARGUMENT_ADDED' : 'REQUIRED_PARAMETER_ADDED',
        });
      } else {
        changes.push({
          code: 'FIELD_ADDED',
          side,
          field: name,
          detail: `${side === 'request' ? 'Optional request' : 'Response'} field ${name} added.`,
        });
      }

      continue;
    }

    if (left && right) {
      changes.push(...compareField(left, right, side, kind));
    }
  }

  return changes;
}

function removalChange(entry: ContractEntry): {
  code: ContractChangeEntry['code'];
  reason: ContractReasonCode;
} {
  switch (entry.kind) {
    case 'graphql':
      return { code: 'FIELD_REMOVED', reason: 'GRAPHQL_FIELD_REMOVED' };
    case 'grpc':
      return entry.identity.includes('/')
        ? { code: 'RPC_METHOD_REMOVED', reason: 'RPC_METHOD_REMOVED' }
        : { code: 'CONTRACT_REMOVED', reason: 'CONTRACT_REMOVED' };
    case 'package_export':
      return { code: 'EXPORT_REMOVED', reason: 'EXPORT_REMOVED' };
    case 'type':
      return { code: 'EXPORT_REMOVED', reason: 'EXPORT_REMOVED' };
    case 'event':
      return { code: 'CONTRACT_REMOVED', reason: 'EVENT_CHANNEL_REMOVED' };
    default:
      return { code: 'CONTRACT_REMOVED', reason: 'CONTRACT_REMOVED' };
  }
}

/**
 * Reason codes that make a change structurally breaking.
 *
 * Any change carrying one of these reasons is breaking. A change with no
 * reason is either compatible (additive) or handled below.
 */
const BREAKING_REASONS: ReadonlySet<ContractReasonCode> = new Set<ContractReasonCode>([
  'CONTRACT_REMOVED',
  'REQUIRED_PARAMETER_ADDED',
  'PARAMETER_TYPE_CHANGED',
  'RESPONSE_FIELD_REMOVED',
  'RESPONSE_TYPE_CHANGED',
  'GRAPHQL_FIELD_REMOVED',
  'GRAPHQL_REQUIRED_ARGUMENT_ADDED',
  'GRAPHQL_NULLABILITY_TIGHTENED',
  'RPC_METHOD_REMOVED',
  'PROTO_FIELD_NUMBER_CHANGED',
  'PROTO_FIELD_TYPE_CHANGED',
  'EXPORT_REMOVED',
  'PUBLIC_TYPE_CHANGED',
  'EVENT_CHANNEL_REMOVED',
  'EVENT_SCHEMA_CHANGED',
]);

function compatibilityOf(changes: readonly ContractChangeEntry[]): Compatibility {
  let result: Compatibility = 'compatible';

  for (const change of changes) {
    if (change.reason && BREAKING_REASONS.has(change.reason)) {
      result = worst(result, 'breaking');
      continue;
    }

    if (change.code === 'ENUM_VALUE_REMOVED') {
      /* Removing a value a request may send is breaking; a response enum
         narrowing only risks an unhandled value. */
      result = worst(result, change.side === 'request' ? 'breaking' : 'potentially_breaking');
      continue;
    }

    if (change.code === 'FIELD_REQUIREDNESS_CHANGED') {
      result = worst(result, 'potentially_breaking');
    }
  }

  return result;
}

export function diffContracts(
  baseline: readonly ContractEntry[],
  candidate: readonly ContractEntry[],
  limits: { maxContractChanges: number }
): { deltas: ContractDelta[]; truncated: boolean } {
  const before = new Map(baseline.map((entry) => [entry.id, entry]));
  const after = new Map(candidate.map((entry) => [entry.id, entry]));

  const ids = [...new Set([...before.keys(), ...after.keys()])].sort();

  const deltas: ContractDelta[] = [];

  let changesReported = 0;
  let truncated = false;

  for (const id of ids) {
    const left = before.get(id);
    const right = after.get(id);

    if (left && !right) {
      const { code, reason } = removalChange(left);

      deltas.push({
        contractId: id,
        kind: left.kind,
        identity: left.identity,
        sourcePath: left.sourcePath,
        compatibility: 'breaking',
        baselineFingerprint: baselineFingerprintOf(left),
        changes: [
          {
            code,
            side: 'contract',
            detail: `Contract ${left.identity} was removed.`,
            reason,
          },
        ],
      });

      changesReported += 1;
      continue;
    }

    if (!left && right) {
      deltas.push({
        contractId: id,
        kind: right.kind,
        identity: right.identity,
        sourcePath: right.sourcePath,
        compatibility: 'compatible',
        candidateFingerprint: baselineFingerprintOf(right),
        changes: [
          {
            code: right.kind === 'grpc' ? 'OPERATION_ADDED' : 'CONTRACT_ADDED',
            side: 'contract',
            detail: `Contract ${right.identity} was added.`,
          },
        ],
      });

      changesReported += 1;
      continue;
    }

    if (!left || !right) {
      continue;
    }

    const changes = [
      ...compareShapes(left.request.fields, right.request.fields, 'request', left.kind),
      ...compareShapes(left.response.fields, right.response.fields, 'response', left.kind),
    ].sort(
      (a, b) =>
        a.side.localeCompare(b.side) ||
        a.code.localeCompare(b.code) ||
        (a.field ?? '').localeCompare(b.field ?? '')
    );

    if (changes.length === 0) {
      continue;
    }

    changesReported += changes.length;

    if (changesReported > limits.maxContractChanges) {
      truncated = true;
      break;
    }

    deltas.push({
      contractId: id,
      kind: left.kind,
      identity: left.identity,
      sourcePath: left.sourcePath,
      compatibility: compatibilityOf(changes),
      baselineFingerprint: baselineFingerprintOf(left),
      candidateFingerprint: baselineFingerprintOf(right),
      changes,
    });
  }

  return { deltas, truncated };
}

function baselineFingerprintOf(entry: ContractEntry): string {
  /* A per-entry fingerprint keeps the delta provenance explicit and stable. */
  return [
    entry.kind,
    entry.identity,
    entry.request.fields
      .map(
        (field) =>
          `${field.name}:${field.type}:${field.required}:${field.number ?? ''}:${(field.enumValues ?? []).join('|')}`
      )
      .join(','),
    entry.response.fields
      .map(
        (field) =>
          `${field.name}:${field.type}:${field.required}:${field.number ?? ''}:${(field.enumValues ?? []).join('|')}`
      )
      .join(','),
  ].join(';');
}
