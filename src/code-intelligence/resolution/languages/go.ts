import type { ParsedCall, ParsedFile, ParsedImport } from '../../types.js';
import type { CodeGraphStore } from '../../graph/graph-store.js';
import type { LanguageModuleResolver } from '../module-index.js';
import type { ParserLanguage } from '../../parsers/capabilities.js';
import type {
  ResolutionEvidence,
  ResolutionResult,
  ResolutionReason,
  SymbolReference,
} from '../types.js';

export function collectGoEvidence(
  reference: SymbolReference,
  parsed: ParsedFile,
  graph: CodeGraphStore
): { candidates: string[]; evidence: ResolutionEvidence[] } {
  const evidence: ResolutionEvidence[] = [];
  const candidates: string[] = [];

  const imports = parsed.imports;
  for (const imp of imports) {
    for (const binding of imp.bindings) {
      if (binding.localName === reference.name) {
        evidence.push({
          kind: 'explicit_import',
          module: imp.source,
          importedName: binding.importedName,
        });
      }
    }
  }

  const graphSymbols = graph.allSymbols(reference.projectId);
  for (const symbol of graphSymbols) {
    if (symbol.name === reference.name && symbol.filePath === reference.filePath) {
      candidates.push(symbol.id);
    }
  }

  return { candidates, evidence };
}

export function resolveGoCall(
  reference: SymbolReference,
  parsed: ParsedFile,
  graph: CodeGraphStore,
  moduleResolver: LanguageModuleResolver | undefined
): ResolutionResult {
  const { candidates, evidence } = collectGoEvidence(reference, parsed, graph);

  if (candidates.length === 0) {
    return {
      status: 'unresolved',
      candidates: [],
      evidence,
      reason: 'NO_CANDIDATE',
    };
  }

  if (candidates.length > 1) {
    return {
      status: 'ambiguous',
      candidates,
      evidence,
      reason: 'MULTIPLE_CANDIDATES',
    };
  }

  return {
    status: 'resolved',
    targetSymbolId: candidates[0],
    candidates,
    evidence,
  };
}
