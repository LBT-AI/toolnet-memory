import type { TreeSitterRuntime } from '../parsers/tree-sitter/runtime.js';
import type { ProtocolExtractor } from './extractor.js';
import { GoCrossServiceExtractor } from './languages/go.js';
import { PythonCrossServiceExtractor } from './languages/python.js';
import { TypeScriptCrossServiceExtractor } from './languages/typescript.js';

/**
 * Central extractor registry.
 *
 * Extractors are never selected through a giant if/else chain: the engine asks
 * the registry which extractor supports a file. Duplicate registrations of the
 * same extractor id are rejected so parser selection stays deterministic.
 */
export class CrossServiceExtractorRegistry {
  private readonly extractors: ProtocolExtractor[];

  constructor(extractors: readonly ProtocolExtractor[]) {
    const byId = new Map<string, ProtocolExtractor>();

    for (const extractor of extractors) {
      if (byId.has(extractor.id)) {
        throw new Error(`Duplicate cross-service extractor id: ${extractor.id}`);
      }
      byId.set(extractor.id, extractor);
    }

    this.extractors = [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  forFile(filePath: string): ProtocolExtractor[] {
    return this.extractors.filter((extractor) => extractor.supports(filePath));
  }

  all(): readonly ProtocolExtractor[] {
    return this.extractors;
  }

  ids(): string[] {
    return this.extractors.map((extractor) => extractor.id);
  }
}

export interface ExtractorRegistryOptions {
  runtime?: TreeSitterRuntime | null;
}

export function createDefaultExtractorRegistry(
  options: ExtractorRegistryOptions = {}
): CrossServiceExtractorRegistry {
  const extractors: ProtocolExtractor[] = [new TypeScriptCrossServiceExtractor()];

  if (options.runtime?.available) {
    extractors.push(new PythonCrossServiceExtractor(options.runtime));
    extractors.push(new GoCrossServiceExtractor(options.runtime));
  }

  return new CrossServiceExtractorRegistry(extractors);
}
