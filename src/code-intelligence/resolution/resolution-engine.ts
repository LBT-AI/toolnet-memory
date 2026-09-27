import { createHash } from 'node:crypto';

import type { CodeGraphStore } from '../graph/graph-store.js';
import type { ParsedFile } from '../types.js';
import type { ParserLanguage } from '../parsers/capabilities.js';
import type { StageProgressCallback } from '../types.js';

import {
  SymbolReference,
  ResolutionSnapshot,
  ResolutionResult,
  ResolutionStatus,
  ResolutionCoverageInput,
} from './types.js';
import { buildSymbolIndexes } from './symbol-index.js';
import { buildScopeIndex } from './scope-index.js';
import { resolverForLanguage, type LanguageModuleResolver } from './module-index.js';
import { collectCandidates, buildResolutionResult } from './candidate-collector.js';
import { parserFingerprintDigest } from '../parsers/fingerprint.js';

import { semanticFingerprint } from '../graph/graph-semantics.js';

/*
 * Resolution identity.
 *
 * Bump these when the resolver algorithm, schema, or module rules change so
 * previously persisted resolution snapshots are treated as stale.
 */
export const RESOLUTION_SCHEMA_VERSION = 1;
export const RESOLVER_IMPLEMENTATION_VERSION = 2;
export const MODULE_RULES_VERSION = 1;
import {
  MAX_CANDIDATES,
  MAX_INHERITANCE_TRAVERSAL_DEPTH,
  MAX_MODULE_TRAVERSAL_DEPTH,
} from './resolution-policy.js';

function languageForFile(filePath: string): ParserLanguage | undefined {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'tsx';
    case 'js':
      return 'javascript';
    case 'jsx':
      return 'jsx';
    case 'mts':
      return 'mts';
    case 'cts':
      return 'cts';
    case 'mjs':
      return 'mjs';
    case 'cjs':
      return 'cjs';
    case 'py':
      return 'python';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'hh':
      return 'cpp';
    default:
      return undefined;
  }
}

function normalize(value: string): string {
  return value.replaceAll('\\', '/');
}

function toResolutionKind(
  callSyntax: ParsedFile['calls'][number]['syntax'] | undefined,
  heritageType?: string
): import('./types.js').ResolutionKind {
  if (heritageType === 'INHERITS') {
    return 'inheritance';
  }
  if (heritageType === 'IMPLEMENTS') {
    return 'implementation';
  }
  if (callSyntax?.kind === 'member') {
    return 'member';
  }
  if (callSyntax?.kind === 'qualified') {
    return 'type';
  }
  return 'call';
}

export interface ResolutionEngineOptions {
  projectId: string;
  rootPath: string;
  graph: CodeGraphStore;
  parsedFiles: ParsedFile[];
  maxCandidates?: number;
  maxModuleDepth?: number;
  maxInheritanceDepth?: number;
  signal?: AbortSignal;
  onProgress?: StageProgressCallback;
}

export interface ResolutionEngineResult {
  snapshot: ResolutionSnapshot;
  stats: {
    total: number;
    resolved: number;
    ambiguous: number;
    unresolved: number;
    external: number;
  };
}

/**
 * Deterministic resolution generation for a given symbol set.
 *
 * No timestamps: identical symbols + identical parser/resolver generation
 * always produce the same value.
 */
export function resolutionGeneration(
  symbolIds: readonly string[],
  parserFingerprint = parserFingerprintDigest(),
  graphSemanticFingerprint = semanticFingerprint()
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        schema: RESOLUTION_SCHEMA_VERSION,
        resolverVersion: RESOLVER_IMPLEMENTATION_VERSION,
        moduleRulesVersion: MODULE_RULES_VERSION,
        parserFingerprint,
        semanticFingerprint: graphSemanticFingerprint,
        symbols: [...symbolIds].sort(),
      })
    )
    .digest('hex');
}

/**
 * A resolution snapshot is only valid for the graph generation and parser
 * generation it was computed from. A snapshot from another generation is
 * stale, never resolution evidence.
 */
export function isResolutionStale(
  snapshot: Pick<ResolutionSnapshot, 'generation'>,
  symbolIds: readonly string[]
): boolean {
  return snapshot.generation !== resolutionGeneration(symbolIds);
}

/**
 * Deterministic aggregation of resolution quality for graph coverage.
 *
 * Counts only affect the capabilities they actually weaken: unresolved calls
 * never make lexical search partial, and external dependencies never count as
 * a gap at all.
 */
export function summarizeResolution(
  snapshot: Pick<ResolutionSnapshot, 'results'>
): ResolutionCoverageInput {
  let unresolvedCallReferences = 0;
  let ambiguousCallTargets = 0;
  let unknownReceiverTypes = 0;
  let unresolvedImports = 0;
  let indirectCalls = 0;

  for (const result of snapshot.results) {
    if (result.reason === 'EXTERNAL_DEPENDENCY') {
      continue;
    }

    if (result.status === 'ambiguous') {
      ambiguousCallTargets += 1;
      continue;
    }

    if (result.status !== 'unresolved') {
      continue;
    }

    if (result.kind === 'import') {
      unresolvedImports += 1;
      continue;
    }

    if (result.reason === 'UNKNOWN_RECEIVER_TYPE') {
      unknownReceiverTypes += 1;
      continue;
    }

    if (result.reason === 'INDIRECT_CALL' || result.reason === 'DYNAMIC_REFERENCE') {
      indirectCalls += 1;
      continue;
    }

    if (result.kind === 'call' || result.kind === 'member' || result.kind === 'type') {
      unresolvedCallReferences += 1;
    }
  }

  return {
    unresolvedCallReferences,
    ambiguousCallTargets,
    unknownReceiverTypes,
    unresolvedImports,
    indirectCalls,
  };
}

export class ResolutionEngine {
  private readonly projectId: string;
  private readonly rootPath: string;
  private readonly graph: CodeGraphStore;
  private readonly parsedFiles: ParsedFile[];
  private readonly maxCandidates: number;
  private readonly maxModuleDepth: number;
  private readonly maxInheritanceDepth: number;
  private readonly signal?: AbortSignal;
  private readonly onProgress?: StageProgressCallback;

  constructor(options: ResolutionEngineOptions) {
    this.projectId = options.projectId;
    this.rootPath = options.rootPath;
    this.graph = options.graph;
    this.parsedFiles = options.parsedFiles;
    this.maxCandidates = options.maxCandidates ?? MAX_CANDIDATES;
    this.maxModuleDepth = options.maxModuleDepth ?? MAX_MODULE_TRAVERSAL_DEPTH;
    this.maxInheritanceDepth = options.maxInheritanceDepth ?? MAX_INHERITANCE_TRAVERSAL_DEPTH;
    this.signal = options.signal;
    this.onProgress = options.onProgress;
  }

  async resolve(): Promise<ResolutionEngineResult> {
    const indexes = buildSymbolIndexes(
      this.projectId,
      this.graph.allSymbols(this.projectId),
      this.parsedFiles
    );
    const scopes = buildScopeIndex(this.projectId, this.graph.allSymbols(this.projectId));

    /*
     * Module resolution is language-specific. Using one language's resolver
     * for another language silently produced wrong module targets.
     */
    const resolvers = new Map<string, LanguageModuleResolver | undefined>();
    const getResolver = (language: ParserLanguage): LanguageModuleResolver | undefined => {
      if (!resolvers.has(language)) {
        resolvers.set(language, resolverForLanguage(language, this.rootPath));
      }
      return resolvers.get(language);
    };

    /*
     * Deterministic inheritance map used for inherited member lookup.
     */
    const parentTypesByType = new Map<string, string[]>();
    for (const edge of this.graph.allEdges(this.projectId)) {
      if (edge.type !== 'INHERITS' && edge.type !== 'IMPLEMENTS') {
        continue;
      }
      const existing = parentTypesByType.get(edge.from);
      if (existing) {
        if (!existing.includes(edge.to)) {
          existing.push(edge.to);
        }
      } else {
        parentTypesByType.set(edge.from, [edge.to]);
      }
    }

    const results: ResolutionResult[] = [];
    const unresolvedReferences: ResolutionSnapshot['unresolvedReferences'] = [];
    const byLanguage: Record<
      string,
      { total: number; resolved: number; ambiguous: number; unresolved: number }
    > = {};

    let total = 0;
    let resolved = 0;
    let ambiguous = 0;
    let unresolved = 0;
    let external = 0;

    let processed = 0;
    const totalFiles = this.parsedFiles.length;

    for (const parsed of this.parsedFiles) {
      const language =
        ((parsed.parser?.language ?? languageForFile(parsed.filePath)) as
          ParserLanguage | undefined) ?? 'typescript';
      const langKey = language;

      if (!byLanguage[langKey]) {
        byLanguage[langKey] = { total: 0, resolved: 0, ambiguous: 0, unresolved: 0 };
      }

      const references: SymbolReference[] = [];

      for (const call of parsed.calls) {
        references.push({
          projectId: this.projectId,
          filePath: normalize(parsed.filePath),
          sourceSymbolId: call.callerId,
          kind: toResolutionKind(call.syntax),
          name: call.calleeName,
          qualifier: call.qualifier,
          line: call.line,
          language,
        });
      }

      for (const imp of parsed.imports) {
        for (const binding of imp.bindings) {
          references.push({
            projectId: this.projectId,
            filePath: normalize(parsed.filePath),
            kind: 'import',
            name: binding.localName,
            moduleSpecifier: imp.source,
            language,
          });
        }
      }

      for (const h of parsed.heritage) {
        references.push({
          projectId: this.projectId,
          filePath: normalize(parsed.filePath),
          sourceSymbolId: h.fromId,
          kind: h.type === 'INHERITS' ? 'inheritance' : 'implementation',
          name: h.targetName,
          language,
        });
      }

      for (const reference of references) {
        if (this.signal?.aborted) {
          break;
        }

        /*
         * External dependencies are expected, not a coverage gap. They are
         * recorded as unsupported/external rather than unresolved so a project
         * that imports `react` or `fmt` is not permanently marked partial.
         */
        if (reference.kind === 'import' && reference.moduleSpecifier) {
          const moduleResolution = getResolver(reference.language)?.resolveImport(
            reference.filePath,
            reference.moduleSpecifier
          );
          if (moduleResolution?.status === 'external') {
            const externalResult: ResolutionResult = {
              status: 'unsupported',
              evidence: [],
              reason: 'EXTERNAL_DEPENDENCY',
              kind: reference.kind,
              sourceFile: reference.filePath,
              sourceLine: reference.line,
              expression: reference.name,
            };
            results.push(externalResult);
            total += 1;
            byLanguage[langKey].total += 1;
            external += 1;
            continue;
          }
        }

        const candidates = collectCandidates(
          reference,
          indexes,
          scopes,
          getResolver,
          parentTypesByType,
          this.maxCandidates
        );
        let result = buildResolutionResult(reference, candidates);
        result = {
          ...result,
          kind: reference.kind,
          sourceFile: reference.filePath,
          sourceLine: reference.line,
          expression: reference.name,
        };

        results.push(result);
        total++;
        byLanguage[langKey].total++;

        if (result.status === 'resolved') {
          resolved++;
          byLanguage[langKey].resolved++;
        } else if (result.status === 'ambiguous') {
          ambiguous++;
          byLanguage[langKey].ambiguous++;
        } else if (result.status === 'unresolved') {
          unresolved++;
          byLanguage[langKey].unresolved++;
          unresolvedReferences.push({
            projectId: this.projectId,
            filePath: reference.filePath,
            sourceSymbolId: reference.sourceSymbolId,
            kind: reference.kind,
            name: reference.name,
            qualifier: reference.qualifier,
            line: reference.line,
            reason: result.reason ?? 'NO_CANDIDATE',
          });
        } else if (result.status === 'unsupported') {
          external++;
          byLanguage[langKey].unresolved++;
          unresolvedReferences.push({
            projectId: this.projectId,
            filePath: reference.filePath,
            sourceSymbolId: reference.sourceSymbolId,
            kind: reference.kind,
            name: reference.name,
            qualifier: reference.qualifier,
            line: reference.line,
            reason: result.reason ?? 'UNSUPPORTED_LANGUAGE_FEATURE',
          });
        }
      }

      processed++;
      this.onProgress?.({
        current: processed,
        total: totalFiles,
        phase: 'resolution',
        detail: parsed.filePath,
      });
    }

    const generation = resolutionGeneration(
      this.graph.allSymbols(this.projectId).map((symbol) => symbol.id)
    );

    const fingerprint = createHash('sha256')
      .update(`${generation}:${total}:${resolved}:${ambiguous}:${unresolved}`)
      .digest('hex');

    const snapshot: ResolutionSnapshot = {
      version: 1,
      projectId: this.projectId,
      generation,
      resolvedAt: new Date().toISOString(),
      fingerprint,
      stats: {
        total,
        resolved,
        ambiguous,
        unresolved,
        external,
      },
      byLanguage: Object.fromEntries(
        Object.entries(byLanguage).sort(([a], [b]) => a.localeCompare(b))
      ),
      results,
      unresolvedReferences,
    };

    return {
      snapshot,
      stats: {
        total,
        resolved,
        ambiguous,
        unresolved,
        external,
      },
    };
  }
}
