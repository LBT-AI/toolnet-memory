import { parserCapabilityForPath, PARSER_CAPABILITIES } from '../parsers/capabilities.js';

import { edgeTypesForCapability } from '../graph/graph-semantics.js';

import type { RepositoryScanStats } from '../indexer/repository-scanner.js';

import type { ResolutionCoverageInput } from '../resolution/types.js';

import type { CrossServiceCoverageInput } from '../cross-service/types.js';

import {
  GRAPH_CAPABILITIES,
  STRUCTURAL_CAPABILITIES,
  type CapabilityCoverage,
  type CoverageReasonCode,
  type GraphCapability,
  type GraphCoverageSnapshot,
  type LanguageFileBreakdown,
} from './types.js';

export interface ParserLanguageStatInput {
  files: number;
  failures: number;
  durationMs: number;
}

export interface GraphCoverageBuildInput {
  projectId: string;
  indexedAt?: string;
  scan: RepositoryScanStats;
  acceptedFiles: string[];
  languages: LanguageFileBreakdown[];
  indexedFiles: number;
  structuralFiles: number;
  lexicalOnlyFiles: number;
  parseFailures: number;
  crossFileResolutionLanguages: string[];
  /*
   * Phase 69 additive structural gap signals.
   * Omitted by older callers -> treated as zero.
   */
  structuralParserUnavailable?: number;
  structuralParseFailed?: number;
  /*
   * Phase 70 additive resolution evidence.
   *
   * When present it supersedes the blanket cross-file "pending" marker: a
   * project whose references are all deterministically resolved is no longer
   * permanently partial.
   */
  resolution?: ResolutionCoverageInput;
  /*
   * Phase 72 additive cross-service evidence.
   *
   * Omitted by callers that do not run cross-service analysis; the
   * cross_service_graph capability then stays partial with
   * CROSS_SERVICE_UNRESOLVED instead of being silently trusted.
   */
  crossService?: CrossServiceCoverageInput;
}

const SCOPE_IGNORED_DIRECTORIES = [
  'node_modules',
  '.git',
  '.toolnet',
  '.toolnet-memory',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  '.parcel-cache',
  '.turbo',
  'vendor',
  'target',
].sort();

/*
 * Declared index scope policy:
 *
 * - ignored directories are excluded by policy -> never partial
 * - generated bundles (*.min.js / *.bundle.js) excluded by policy -> never partial
 * - symlinks excluded by security policy -> never partial
 * - sensitive files (.env, credentials, keys) excluded by security policy -> never partial
 *
 * In-scope problems DO affect coverage:
 * - parse failures (searchable source the parser rejected)
 * - oversized searchable sources (skipped before parse)
 * - unreadable searchable sources (skipped before parse)
 */
function parserIdFor(language: string, engine: string | undefined): string {
  if (engine === 'tree-sitter') {
    return `tree-sitter-${language}`;
  }
  if (engine === 'typescript-compiler-api') {
    return 'typescript-compiler-api';
  }
  return 'lexical-only';
}

export function deriveLanguageBreakdown(
  acceptedFiles: readonly string[],
  parserStats: Record<string, ParserLanguageStatInput> = {}
): LanguageFileBreakdown[] {
  const counts = new Map<string, number>();

  for (const file of acceptedFiles) {
    const capability = parserCapabilityForPath(file);

    if (!capability) {
      continue;
    }

    counts.set(capability.language, (counts.get(capability.language) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([language, files]) => {
      const capability = PARSER_CAPABILITIES.find((item) => item.language === language);
      const isTreeSitter = capability?.engine === 'tree-sitter';
      const breakdown: LanguageFileBreakdown = {
        language,
        files,
        structural: capability?.structural ?? false,
        lexicalSearch: capability?.lexicalSearch ?? false,
        crossFileResolution: isTreeSitter ? 'pending' : 'complete',
        parser: parserIdFor(language, capability?.engine),
        parseFailures: parserStats[language]?.failures ?? 0,
      };
      return breakdown;
    })
    .sort((left, right) => left.language.localeCompare(right.language));
}

function indexTimeCoverage(
  capability: GraphCapability,
  input: GraphCoverageBuildInput
): CapabilityCoverage {
  const reasons: CoverageReasonCode[] = [];

  let partial = false;

  if (input.parseFailures > 0) {
    reasons.push('PARSE_FAILURE');
    partial = true;
  }

  if (STRUCTURAL_CAPABILITIES.includes(capability)) {
    const hasLexicalOnly = input.languages.some((language) => !language.structural);

    if (hasLexicalOnly) {
      reasons.push('LEXICAL_ONLY_LANGUAGE');
      partial = true;
    }

    if (input.resolution) {
      /*
       * Evidence-based: only the capabilities genuinely weakened by
       * unresolved/ambiguous references are marked partial.
       */
      const resolution = input.resolution;

      /*
       * The capability -> edge-type mapping is the single authority: a
       * capability is weakened by unresolved calls only when it actually
       * consumes CALLS/CALL_REFERENCE, and by unresolved imports only when it
       * consumes IMPORTS (or depends on the call graph).
       */
      const edgeTypes = edgeTypesForCapability(capability);
      const isCallBearing = edgeTypes.includes('CALLS') || edgeTypes.includes('CALL_REFERENCE');
      const usesImports = edgeTypes.includes('IMPORTS') || isCallBearing;

      if (isCallBearing) {
        if (resolution.unresolvedCallReferences > 0) {
          reasons.push('UNRESOLVED_CALL_REFERENCE');
          partial = true;
        }
        if (resolution.ambiguousCallTargets > 0) {
          reasons.push('AMBIGUOUS_CALL_TARGET');
          partial = true;
        }
        if (resolution.unknownReceiverTypes > 0) {
          reasons.push('UNKNOWN_RECEIVER_TYPE');
          partial = true;
        }
        if (resolution.indirectCalls > 0) {
          reasons.push('INDIRECT_CALL_TARGET');
          partial = true;
        }
      }

      if (usesImports && resolution.unresolvedImports > 0) {
        reasons.push('UNRESOLVED_IMPORT');
        partial = true;
      }
    } else if (input.crossFileResolutionLanguages.length > 0) {
      reasons.push('CROSS_FILE_RESOLUTION_PENDING');
      partial = true;
    }

    if ((input.structuralParserUnavailable ?? 0) > 0) {
      reasons.push('STRUCTURAL_PARSER_UNAVAILABLE');
      partial = true;
    }

    if ((input.structuralParseFailed ?? 0) > 0) {
      reasons.push('STRUCTURAL_PARSE_FAILED');
      partial = true;
    }
  }

  if (capability === 'cross_service_graph') {
    const crossService = input.crossService;

    if (!crossService) {
      reasons.push('CROSS_SERVICE_UNRESOLVED');
      partial = true;
    } else {
      if (crossService.unsupportedFrameworks.length > 0) {
        reasons.push('UNSUPPORTED_SERVICE_FRAMEWORK');
        partial = true;
      }
      if (crossService.dynamic > 0) {
        reasons.push('DYNAMIC_ENDPOINT');
        partial = true;
      }
      if (crossService.ambiguous > 0) {
        reasons.push('AMBIGUOUS_ENDPOINT');
        partial = true;
      }
      if (crossService.unresolvedChannels > 0) {
        reasons.push('UNRESOLVED_EVENT_CHANNEL');
        partial = true;
      }
      if (crossService.unresolved > 0) {
        reasons.push('UNRESOLVED_HTTP_REFERENCE');
        partial = true;
      }
    }
  }

  if (input.scan.skippedOversized > 0) {
    reasons.push('SKIPPED_OVERSIZED_SOURCE');
    partial = true;
  }

  if (input.scan.skippedUnreadable > 0) {
    reasons.push('SKIPPED_UNREADABLE_SOURCE');
    partial = true;
  }

  if (partial) {
    return {
      status: 'partial',
      negativeClaimSafe: false,
      reasons,
    };
  }

  return {
    status: 'complete',
    negativeClaimSafe: true,
    reasons: [],
  };
}

export class GraphCoverageBuilder {
  build(input: GraphCoverageBuildInput): GraphCoverageSnapshot {
    const capabilities = {} as Record<GraphCapability, CapabilityCoverage>;

    for (const capability of GRAPH_CAPABILITIES) {
      capabilities[capability] = indexTimeCoverage(capability, input);
    }

    return {
      version: 1,
      projectId: input.projectId,
      indexedAt: input.indexedAt ?? new Date().toISOString(),
      files: {
        accepted: input.scan.accepted,
        indexed: input.indexedFiles,
        structural: input.structuralFiles,
        lexicalOnly: input.lexicalOnlyFiles,
        parseFailures: input.parseFailures,
      },
      scan: {
        skippedOversized: input.scan.skippedOversized,
        skippedUnreadable: input.scan.skippedUnreadable,
        skippedSensitive: input.scan.skippedSensitive,
        skippedGenerated: input.scan.skippedGenerated,
        skippedSymlinks: input.scan.skippedSymlinks,
        skippedIgnoredDirectories: input.scan.skippedIgnoredDirectories,
      },
      languages: input.languages,
      capabilities,
      scope: {
        ignoredDirectories: SCOPE_IGNORED_DIRECTORIES,
        generatedFilesExcluded: true,
        symlinksExcluded: true,
        sensitiveFilesExcluded: true,
      },
    };
  }
}
