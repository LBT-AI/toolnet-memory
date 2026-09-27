/*
 * Phase 81 — contract discovery.
 *
 * Discovers contract surfaces from the paths of a Phase 80 change snapshot
 * (never a second git read):
 *
 *   - schema files (OpenAPI / GraphQL / proto / JSON Schema / package.json)
 *     parsed from baseline and candidate source text;
 *   - route and event contracts derived from the graph (baseline) and from the
 *     candidate structural parse (candidate).
 *
 * Baseline and candidate are kept strictly separate: no edge from one
 * generation is ever mixed with the other.
 */

import { isSensitiveChangePath } from '../change/paths.js';

import { makeSnapshot } from './fingerprint.js';

import { contractKindForPath, parseContractFile } from './parsers/index.js';

import { canonicalType, contractId, normalizeEntry } from './shape.js';

import type {
  ContractEntry,
  ContractFacts,
  ContractLimits,
  ContractSnapshot,
  ContractSymbol,
  ContractUnresolvedRef,
  ContractUnsupported,
} from './types.js';

export interface ContractDiscoveryResult {
  baseline: ContractSnapshot;
  candidate: ContractSnapshot;
  /** Paths whose baseline content was unavailable. */
  baselinesUnavailable: string[];
  /** Paths whose candidate content was unavailable. */
  candidatesUnavailable: string[];
  filesChecked: number;
  filesParsed: number;
  truncated: boolean;
}

function parseHttpIdentity(name: string): { method?: string; path?: string } {
  const match = /^([A-Z]+)\s+(\S.*)$/u.exec(name.trim());

  if (!match) {
    return {};
  }

  return { method: match[1]!, path: match[2]! };
}

function symbolContract(symbol: ContractSymbol): ContractEntry | null {
  if (symbol.type === 'route') {
    const { method, path } = parseHttpIdentity(symbol.name);

    const entry: ContractEntry = {
      id: contractId('http', symbol.name),
      kind: 'http',
      identity: symbol.name,
      sourcePath: symbol.filePath,
      request: { fields: [] },
      response: { fields: [] },
    };

    if (method !== undefined) {
      entry.method = method;
    }

    if (path !== undefined) {
      entry.path = path;
    }

    return entry;
  }

  if (symbol.type === 'event') {
    const identity = `event:${symbol.name}`;

    return {
      id: contractId('event', identity),
      kind: 'event',
      identity,
      sourcePath: symbol.filePath,
      request: { fields: [] },
      response: { fields: [] },
    };
  }

  return null;
}

export async function discoverContracts(input: {
  facts: ContractFacts;
  limits: ContractLimits;
}): Promise<ContractDiscoveryResult> {
  const { facts, limits } = input;

  const allPaths = facts.changedPaths();

  const paths = [...new Set(allPaths)].sort();

  const bounded = paths.slice(0, limits.maxContractFiles);

  const truncated = paths.length > bounded.length;

  const unsupported: ContractUnsupported[] = [];
  const unresolvedRefs: ContractUnresolvedRef[] = [];

  const baselineEntries: ContractEntry[] = [];
  const candidateEntries: ContractEntry[] = [];

  const baselinesUnavailable: string[] = [];
  const candidatesUnavailable: string[] = [];

  let filesChecked = 0;
  let filesParsed = 0;
  let parseTruncated = false;

  const hasBaselineReader = typeof facts.readBaseline === 'function';
  const hasCandidateReader = typeof facts.readCandidate === 'function';

  const openapiIdentities = new Set<string>();

  for (const path of bounded) {
    if (isSensitiveChangePath(path)) {
      unsupported.push({ path, reason: 'SENSITIVE_FILE' });
      continue;
    }

    const kind = contractKindForPath(path);

    if (kind === null) {
      continue;
    }

    filesChecked += 1;

    const kindOfChange = facts.fileKind?.(path);

    const baselineSource = hasBaselineReader
      ? await facts.readBaseline!(path, limits.maxSourceReadBytes)
      : null;

    const candidateSource = hasCandidateReader
      ? await facts.readCandidate!(path, limits.maxSourceReadBytes)
      : null;

    /* An added file has no baseline and a deleted file has no candidate. */
    if (baselineSource === null && kindOfChange !== 'added') {
      baselinesUnavailable.push(path);
    } else if (baselineSource !== null && baselineSource.length > limits.maxSourceReadBytes) {
      unsupported.push({ path, reason: 'OVERSIZED_SOURCE' });
    }

    if (candidateSource === null && kindOfChange !== 'deleted') {
      candidatesUnavailable.push(path);
    } else if (candidateSource !== null && candidateSource.length > limits.maxSourceReadBytes) {
      unsupported.push({ path, reason: 'OVERSIZED_SOURCE' });
    }

    const parseSide = (
      source: string | null,
      target: ContractEntry[],
      side: 'baseline' | 'candidate'
    ): void => {
      if (source === null) {
        return;
      }

      const parsed = parseContractFile(kind, {
        path,
        source,
        maxNodes: limits.maxSchemaNodes,
        maxRefDepth: limits.maxRefDepth,
      });

      if (parsed.truncated) {
        parseTruncated = true;
        unsupported.push({ path, reason: 'OVERSIZED_SOURCE' });
      }

      for (const entry of parsed.entries) {
        if (kind === 'openapi') {
          openapiIdentities.add(entry.identity);
        }

        target.push(normalizeEntry(entry));
      }

      for (const item of parsed.unsupported) {
        /* The same unsupported file on both sides is reported once. */
        if (
          !unsupported.some(
            (existing) => existing.path === item.path && existing.reason === item.reason
          )
        ) {
          unsupported.push(item);
        }
      }

      for (const ref of parsed.unresolvedRefs) {
        if (
          !unresolvedRefs.some((existing) => existing.path === ref.path && existing.ref === ref.ref)
        ) {
          unresolvedRefs.push(ref);
        }
      }

      if (parsed.entries.length > 0 && side.length >= 0) {
        filesParsed += 1;
      }
    };

    parseSide(baselineSource, baselineEntries, 'baseline');
    parseSide(candidateSource, candidateEntries, 'candidate');
  }

  /* Route / event contracts derived from the graph and the candidate parse. */
  const pathSet = new Set(bounded);

  const baselineSymbols = facts.graph
    .symbols()
    .filter((symbol) => pathSet.has(symbol.filePath) || paths.includes(symbol.filePath));

  for (const symbol of baselineSymbols) {
    const entry = symbolContract(symbol);

    if (entry) {
      baselineEntries.push(normalizeEntry(entry));
    }
  }

  if (facts.parseCandidate) {
    for (const path of bounded) {
      const kind = contractKindForPath(path);

      /* Only symbol-bearing source files can hold route/event declarations. */
      if (kind === null && !/\.[a-z]+$/iu.test(path)) {
        continue;
      }

      let symbols: readonly ContractSymbol[] | null = null;

      try {
        symbols = await facts.parseCandidate(path);
      } catch {
        symbols = null;
      }

      if (!symbols) {
        continue;
      }

      for (const symbol of symbols) {
        const entry = symbolContract(symbol);

        if (entry) {
          candidateEntries.push(normalizeEntry(entry));
        }
      }
    }
  }

  /* Drop graph-derived http contracts already described by OpenAPI. */
  const filteredBaseline = baselineEntries.filter(
    (entry) => entry.kind !== 'http' || !openapiIdentities.has(entry.identity)
  );

  const filteredCandidate = candidateEntries.filter(
    (entry) => entry.kind !== 'http' || !openapiIdentities.has(entry.identity)
  );

  const generation = facts.generation;

  const baseline = makeSnapshot({
    generation,
    entries: filteredBaseline.slice(0, limits.maxContracts),
    unsupported,
    unresolvedRefs,
  });

  const candidate = makeSnapshot({
    generation: facts.candidateGeneration ?? generation,
    entries: filteredCandidate.slice(0, limits.maxContracts),
    unsupported: [],
    unresolvedRefs: [],
  });

  if (
    filteredBaseline.length > limits.maxContracts ||
    filteredCandidate.length > limits.maxContracts
  ) {
    return {
      baseline,
      candidate,
      baselinesUnavailable,
      candidatesUnavailable,
      filesChecked,
      filesParsed,
      truncated: true,
    };
  }

  return {
    baseline,
    candidate,
    baselinesUnavailable,
    candidatesUnavailable,
    filesChecked,
    filesParsed,
    truncated: truncated || parseTruncated,
  };
}

export { canonicalType };
