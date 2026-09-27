import type { ParsedCall, ParsedFile, ParsedImport } from '../../types.js';
import type { CodeGraphStore } from '../../graph/graph-store.js';
import type { LanguageModuleResolver, ModuleResolution } from '../module-index.js';
import type { ResolutionEngineOptions } from '../resolution-engine.js';
import type { ParserLanguage } from '../../parsers/capabilities.js';
import type {
  ResolutionEvidence,
  ResolutionResult,
  ResolutionReason,
  SymbolReference,
} from '../types.js';

export function collectPythonEvidence(
  reference: SymbolReference,
  parsed: ParsedFile,
  graph: CodeGraphStore,
  moduleResolver: LanguageModuleResolver | undefined
): { candidates: string[]; evidence: ResolutionEvidence[]; reason?: ResolutionReason } {
  const evidence: ResolutionEvidence[] = [];
  const candidates: string[] = [];

  const localCalls = parsed.calls.filter((c) => {
    if (c.callerId === reference.sourceSymbolId) {
      return true;
    }
    if (!reference.sourceSymbolId && c.line === reference.line) {
      return true;
    }
    return false;
  });

  for (const call of localCalls) {
    if (call.qualifier) {
      evidence.push({ kind: 'receiver_type', typeSymbolId: call.qualifier });
    }
  }

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

export function resolvePythonCall(
  reference: SymbolReference,
  parsed: ParsedFile,
  graph: CodeGraphStore,
  moduleResolver: LanguageModuleResolver | undefined
): ResolutionResult {
  const { candidates, evidence } = collectPythonEvidence(reference, parsed, graph, moduleResolver);

  if (reference.qualifier && !evidence.some((e) => e.kind === 'receiver_type')) {
    return {
      status: 'unresolved',
      candidates,
      evidence,
      reason: 'UNKNOWN_RECEIVER_TYPE',
    };
  }

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
