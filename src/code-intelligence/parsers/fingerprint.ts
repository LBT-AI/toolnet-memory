import { createHash } from 'node:crypto';

import { structuralAdapterIds } from './registry.js';
import { verifyGrammarAssets } from './tree-sitter/runtime.js';

/**
 * Phase 69 — Parser fingerprint.
 *
 * Structural graph identity is separate from source identity.
 *
 * Source identity    -> CodeManifest path -> SHA-256 (unchanged)
 * Parser identity    -> this fingerprint
 * Graph generation   -> stored alongside the graph snapshot
 *
 * When the fingerprint changes (adapter set, grammar asset hash, or
 * normalization schema version), a previously indexed structural graph can
 * no longer be trusted even when every source file hash is unchanged.
 *
 * No timestamps are used as identity.
 */
export const GRAPH_PARSER_SCHEMA_VERSION = 1;

export interface ParserFingerprint {
  schemaVersion: number;
  adapters: string[];
  grammars: Record<string, string>;
  digest: string;
}

export function computeParserFingerprint(): ParserFingerprint {
  const adapters = [...structuralAdapterIds()].sort();

  const grammars: Record<string, string> = {};
  for (const asset of verifyGrammarAssets()) {
    if (asset.available && asset.sha256) {
      grammars[asset.language] = asset.sha256;
    }
  }

  const sortedGrammars = Object.fromEntries(
    Object.entries(grammars).sort(([left], [right]) => left.localeCompare(right))
  );

  const digest = createHash('sha256')
    .update(
      JSON.stringify({
        schemaVersion: GRAPH_PARSER_SCHEMA_VERSION,
        adapters,
        grammars: sortedGrammars,
      })
    )
    .digest('hex');

  return {
    schemaVersion: GRAPH_PARSER_SCHEMA_VERSION,
    adapters,
    grammars: sortedGrammars,
    digest,
  };
}

export function parserFingerprintDigest(): string {
  return computeParserFingerprint().digest;
}
