import type { ParsedFile } from '../types.js';

import { GraphBuilder } from '../graph/graph-builder.js';

import { parseCodeFile } from '../parsers/parse-code-file.js';
import { parserCapabilityForPath, searchableParserExtensions } from '../parsers/capabilities.js';
import { isStructuralDiagnostic } from '../parsers/registry.js';

import { deriveLanguageBreakdown } from '../graph-coverage/coverage-builder.js';

import type { LanguageFileBreakdown } from '../graph-coverage/types.js';

import { DEFAULT_PARSE_CONCURRENCY, mapWithConcurrency } from './bounded-concurrency.js';

import {
  scanRepositoryDetailed,
  type RepositoryScanOptions,
  type RepositoryScanStats,
} from './repository-scanner.js';

/**
 * Deterministic per-language parser telemetry. Local only, never uploaded.
 */
export interface ParserLanguageStats {
  files: number;
  failures: number;
  durationMs: number;
}

export interface RepositoryIndexResult {
  files: number;
  symbols: number;
  edges: number;
  parseFailures: number;
  scan: RepositoryScanStats;
  graph: ReturnType<GraphBuilder['build']>;
  /*
   * Phase 68 additive coverage inputs.
   */
  acceptedFiles: string[];
  languages: LanguageFileBreakdown[];
  structuralFiles: number;
  lexicalOnlyFiles: number;
  crossFileResolutionLanguages: string[];
  parsedFiles: ParsedFile[];
  /*
   * Phase 69 additive parser telemetry and structural gap signals.
   */
  parserStats: Record<string, ParserLanguageStats>;
  /** Searchable files whose structural parser was unavailable (lexical fallback). */
  structuralFallbacks: number;
  /** Structurally parsed files that produced syntax/recovery diagnostics. */
  structuralDiagnostics: number;
}

export interface RepositoryIndexProgress {
  phase: 'scan' | 'parse';
  current: number;
  total: number;
  file?: string;
}

export interface RepositoryIndexOptions {
  onProgress?: (event: RepositoryIndexProgress) => void;
  concurrency?: number;
  maxWarnings?: number;
  scan?: RepositoryScanOptions;
  signal?: AbortSignal;
}

interface ParseAttempt {
  file: string;
  parsed: ParsedFile | null;
  durationMs: number;
}

export class RepositoryIndexer {
  async index(
    projectId: string,
    rootPath: string,
    options: RepositoryIndexOptions = {}
  ): Promise<RepositoryIndexResult> {
    const scanOptions: RepositoryScanOptions = {
      ...options.scan,
      extensions: options.scan?.extensions ?? searchableParserExtensions(),
    };

    if (options.signal) {
      scanOptions.signal = options.signal;
    }

    const scan = await scanRepositoryDetailed(rootPath, scanOptions);

    const files = scan.files;

    options.onProgress?.({
      phase: 'scan',
      current: files.length,
      total: files.length,
    });

    const maxWarnings = options.maxWarnings ?? 20;

    if (!Number.isSafeInteger(maxWarnings) || maxWarnings < 0) {
      throw new Error('maxWarnings must be a non-negative integer');
    }

    let parseFailures = 0;

    const attempts = await mapWithConcurrency(
      files,
      async (file): Promise<ParseAttempt> => {
        const startedAt = Date.now();
        try {
          const parsed = await parseCodeFile(projectId, rootPath, file);
          return { file, parsed, durationMs: Date.now() - startedAt };
        } catch (error) {
          parseFailures += 1;

          if (parseFailures <= maxWarnings) {
            console.warn(
              `[indexer] skipped ${file}:`,
              error instanceof Error ? error.message : error
            );
          }

          return { file, parsed: null, durationMs: Date.now() - startedAt };
        }
      },
      {
        concurrency: options.concurrency ?? DEFAULT_PARSE_CONCURRENCY,
        signal: options.signal,
        onProgress: ({ completed, total, index }) => {
          options.onProgress?.({
            phase: 'parse',
            current: completed,
            total,
            file: files[index],
          });
        },
      }
    );

    if (parseFailures > maxWarnings) {
      console.warn(`[indexer] ${parseFailures - maxWarnings} additional parse warnings suppressed`);
    }

    const parserStats: Record<string, ParserLanguageStats> = {};

    let structuralFiles = 0;
    let lexicalOnlyFiles = 0;
    let structuralFallbacks = 0;
    let structuralDiagnostics = 0;

    const crossFileResolutionLanguages = new Set<string>();

    for (const attempt of attempts) {
      const capability = parserCapabilityForPath(attempt.file);
      const language = capability?.language ?? 'unknown';

      const stats = (parserStats[language] ??= { files: 0, failures: 0, durationMs: 0 });
      stats.files += 1;
      stats.durationMs += attempt.durationMs;

      if (!attempt.parsed) {
        stats.failures += 1;
        continue;
      }

      if (attempt.parsed.diagnostics?.some(isStructuralDiagnostic)) {
        structuralDiagnostics += 1;
      }

      if (!capability || !capability.structural) {
        lexicalOnlyFiles += 1;
        continue;
      }

      if (attempt.parsed.parser?.structural !== true) {
        /* Searchable structural language that fell back to lexical parsing. */
        structuralFallbacks += 1;
        continue;
      }

      structuralFiles += 1;

      if (capability.engine === 'tree-sitter') {
        crossFileResolutionLanguages.add(capability.language);
      }
    }

    const parsed = attempts
      .map((attempt) => attempt.parsed)
      .filter((value): value is ParsedFile => value !== null);

    const graph = new GraphBuilder().build(projectId, parsed);

    const languages = deriveLanguageBreakdown(files, parserStats);

    return {
      files: parsed.length,
      symbols: graph.allSymbols(projectId).length,
      edges: graph.allEdges(projectId).length,
      parseFailures,
      scan: scan.stats,
      graph,
      acceptedFiles: files,
      languages,
      structuralFiles,
      lexicalOnlyFiles,
      crossFileResolutionLanguages: [...crossFileResolutionLanguages].sort(),
      parsedFiles: parsed,
      parserStats,
      structuralFallbacks,
      structuralDiagnostics,
    };
  }
}
