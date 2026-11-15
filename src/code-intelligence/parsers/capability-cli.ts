import { PARSER_CAPABILITIES } from './capabilities.js';
import { buildCapabilityReport } from './capability-report.js';
import { detectLspCapabilities } from './lsp-capabilities.js';

/**
 * Capability reporting with runtime truth.
 *
 * PARSER_CAPABILITIES declares what the software supports; whether a
 * tree-sitter language is *structurally* available right here depends on the
 * grammar assets resolving in this runtime (npm install: yes; standalone
 * single-binary without embeddable wasm: no, with lexical fallback).
 *
 * The registry is loaded lazily so runtimes where the parser engine itself
 * cannot initialize (e.g. Emscripten dynamic-require limits inside a
 * single-binary build) still report honestly instead of crashing: an
 * unloadable engine means no structural languages from that engine.
 */
async function treeSitterStructuralLanguages(): Promise<Set<string>> {
  try {
    const registry = await import('./registry.js');
    const adapters = registry.getStructuralParserAdapters();
    return new Set(adapters.flatMap((adapter) => [...adapter.languages]));
  } catch {
    return new Set<string>();
  }
}

async function main(): Promise<void> {
  const json = process.argv.includes('--json');
  const lsp = detectLspCapabilities();
  const treeSitter = await treeSitterStructuralLanguages();
  const report = buildCapabilityReport(treeSitter, lsp);

  const payload = {
    structuralParser: {
      engine: 'typescript-compiler-api',
      languages: report.structuralLanguages,
    },
    treeSitterRuntime: {
      available: report.treeSitterAvailable,
      languages: report.treeSitterLanguages,
      unavailable: report.treeSitterUnavailable,
    },
    lexicalSearch: {
      engine: 'sqlite-fts5-bm25',
      languages: PARSER_CAPABILITIES.filter((item) => item.lexicalSearch).map(
        (item) => item.language
      ),
    },
    lspFoundation: {
      mode: 'detection-only',
      automaticDownload: false,
      structuralGraphIntegration: false,
      servers: lsp,
    },
  };

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  for (const line of report.textLines) {
    console.log(line);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
