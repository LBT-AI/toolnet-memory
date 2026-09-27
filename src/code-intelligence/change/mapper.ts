/*
 * Phase 80 — change mapper.
 *
 * Maps changed files/hunks onto baseline graph symbols and candidate-side
 * structural symbols, then classifies the semantic delta. Mapping is by exact
 * file + line ownership (never simple-name guessing), deleted entities are
 * resolved against the BASELINE graph (so their consumers are not lost) and a
 * body-only edit is never reported as a signature change.
 */

import { basename } from 'node:path';

import { isSensitiveChangePath } from './paths.js';

import type {
  ChangeFacts,
  ChangeGap,
  ChangeLimits,
  ChangeSymbol,
  ChangeCoverage,
  ChangedEntity,
  ChangedEntityKind,
  FileChange,
  SemanticChangeKind,
} from './types.js';

const MANIFEST_FILES = new Set([
  'package.json',
  'go.mod',
  'cargo.toml',
  'pyproject.toml',
  'requirements.txt',
  'pom.xml',
  'build.gradle',
]);

const CONFIG_EXTENSIONS = new Set([
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.env',
  '.properties',
]);

export interface MapChangeInput {
  files: readonly FileChange[];
  changedLines: Map<string, string[]>;
  facts: ChangeFacts;
  limits: ChangeLimits;
}

export interface MapChangeResult {
  entities: ChangedEntity[];
  coverage: ChangeCoverage;
  gaps: ChangeGap[];
  truncated: boolean;
}

function intersects(symbol: ChangeSymbol, file: FileChange): boolean {
  if (file.hunks.length === 0) {
    return true;
  }

  if (typeof symbol.startLine !== 'number' || typeof symbol.endLine !== 'number') {
    return false;
  }

  return file.hunks.some(
    (hunk) => symbol.startLine! <= hunk.newStart + hunk.newLines && symbol.endLine! >= hunk.newStart
  );
}

function isManifestPath(path: string): boolean {
  return MANIFEST_FILES.has(basename(path).toLowerCase());
}

function isConfigPath(path: string): boolean {
  const lower = path.toLowerCase();
  const dot = lower.lastIndexOf('.');

  if (dot === -1) {
    return false;
  }

  return CONFIG_EXTENSIONS.has(lower.slice(dot));
}

function entityKindFor(symbol: ChangeSymbol): ChangedEntityKind {
  if (symbol.type === 'route') {
    return 'route';
  }

  if (symbol.type === 'event') {
    return 'event';
  }

  return 'symbol';
}

function publicSurface(symbol: ChangeSymbol, path: string): boolean {
  if (symbol.exported === true) {
    return true;
  }

  if (isManifestPath(path)) {
    return true;
  }

  return (
    symbol.type === 'route' ||
    symbol.type === 'interface' ||
    symbol.type === 'service' ||
    symbol.type === 'event'
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

const DECL_KEYWORDS =
  /\b(function|def|class|interface|fn|func|public|private|protected|static|async|export|const|let|var)\b/u;

/**
 * Extract a bounded declaration signature for `name` from a diff line.
 *
 * Deliberately conservative: a line only counts as a declaration when it names
 * the symbol, has a parameter list and looks like a declaration (keyword, or a
 * braced/annotated head). A plain call site is never mistaken for a signature,
 * so a body-only edit stays `SYMBOL_MODIFIED`.
 */
function extractSignature(rawLine: string, name: string): string | null {
  const line = rawLine.replace(/^[+-]/u, '').trimEnd();

  if (!line || !name) {
    return null;
  }

  const nameRe = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'u');

  if (!nameRe.test(line)) {
    return null;
  }

  const open = line.indexOf('(');

  if (open === -1) {
    return null;
  }

  const before = line.slice(0, open);
  const keyword = DECL_KEYWORDS.test(line);

  if (!keyword) {
    /* A non-keyword declaration must not look like a call/property access. */
    if (before.includes('.') || before.includes('=') || before.includes('=>')) {
      return null;
    }

    const trimmed = line.trimEnd();

    const looksDeclarative =
      trimmed.endsWith('{') || trimmed.endsWith(')') || trimmed.includes('):');

    if (!looksDeclarative) {
      return null;
    }
  }

  return normalizeSignature(line);
}

function normalizeSignature(line: string): string {
  return line.replace(/\s+/gu, ' ').trim();
}

function parameterSlice(signature: string): string | null {
  const open = signature.indexOf('(');
  const close = signature.lastIndexOf(')');

  if (open === -1 || close <= open) {
    return null;
  }

  return signature.slice(open + 1, close).trim();
}

function returnSlice(signature: string): string | null {
  const close = signature.lastIndexOf(')');

  if (close === -1) {
    return null;
  }

  const rest = signature.slice(close + 1);

  const match = /^\s*:\s*([^{=]+)/u.exec(rest);

  return match ? match[1]!.trim() : null;
}

interface SignatureDelta {
  signatureChanged: boolean;
  parameterChanged: boolean;
  returnTypeChanged: boolean;
  visibilityChanged: boolean;
}

function classifySignature(changedLines: readonly string[], name: string): SignatureDelta {
  const removed = new Set<string>();
  const added = new Set<string>();

  for (const line of changedLines) {
    const signature = extractSignature(line, name);

    if (!signature) {
      continue;
    }

    if (line.startsWith('-')) {
      removed.add(signature);
    } else if (line.startsWith('+')) {
      added.add(signature);
    }
  }

  const removedList = [...removed].sort();
  const addedList = [...added].sort();

  if (removedList.length === 0 && addedList.length === 0) {
    return {
      signatureChanged: false,
      parameterChanged: false,
      returnTypeChanged: false,
      visibilityChanged: false,
    };
  }

  const parameterChanged =
    removedList.some((value) => {
      const params = parameterSlice(value);
      return params !== null && !addedList.some((next) => parameterSlice(next) === params);
    }) ||
    addedList.some((value) => {
      const params = parameterSlice(value);
      return params !== null && !removedList.some((prev) => parameterSlice(prev) === params);
    });

  const returnTypeChanged =
    removedList.some((value) => {
      const ret = returnSlice(value);
      return ret !== null && !addedList.some((next) => returnSlice(next) === ret);
    }) ||
    addedList.some((value) => {
      const ret = returnSlice(value);
      return ret !== null && !removedList.some((prev) => returnSlice(prev) === ret);
    });

  const visibilityChanged =
    addedList.some((value) => /\bexport\b|\bpublic\b/u.test(value)) !==
    removedList.some((value) => /\bexport\b|\bpublic\b/u.test(value));

  /* A removal with no matching addition is a declaration change. */
  const signatureChanged = removedList.join('\n') !== addedList.join('\n');

  return { signatureChanged, parameterChanged, returnTypeChanged, visibilityChanged };
}

function semanticFor(
  symbol: ChangeSymbol,
  file: FileChange,
  baseline: boolean,
  candidate: boolean,
  signature: SignatureDelta
): SemanticChangeKind[] {
  const semantic: SemanticChangeKind[] = [];

  const isRoute = symbol.type === 'route';
  const isEvent = symbol.type === 'event';

  if (!baseline && candidate) {
    semantic.push('SYMBOL_ADDED');
    if (isRoute) {
      semantic.push('ROUTE_ADDED');
    }
    if (isEvent) {
      semantic.push('EVENT_CHANNEL_CHANGED');
    }
  } else if (baseline && !candidate) {
    semantic.push('SYMBOL_DELETED');
    if (isRoute) {
      semantic.push('ROUTE_REMOVED');
    }
    if (isEvent) {
      semantic.push('EVENT_CHANNEL_CHANGED');
    }
  } else if (file.kind === 'renamed' && file.oldPath && file.oldPath !== file.path) {
    semantic.push('SYMBOL_RENAMED', 'SYMBOL_MODIFIED');
    if (isRoute) {
      semantic.push('ROUTE_CHANGED');
    }
  } else {
    semantic.push('SYMBOL_MODIFIED');
    if (isRoute) {
      semantic.push('ROUTE_CHANGED');
    }
    if (isEvent) {
      semantic.push('EVENT_CHANNEL_CHANGED');
    }
  }

  if (signature.signatureChanged) {
    semantic.push('SIGNATURE_CHANGED');
  }
  if (signature.parameterChanged) {
    semantic.push('PARAMETER_CHANGED');
  }
  if (signature.returnTypeChanged) {
    semantic.push('RETURN_TYPE_CHANGED');
  }
  if (signature.visibilityChanged) {
    semantic.push('VISIBILITY_CHANGED');
  }

  if (symbol.type === 'interface' || symbol.type === 'class') {
    semantic.push('TYPE_CHANGED');
  }

  return [...new Set(semantic)];
}

function fileLevelSemantic(file: FileChange): SemanticChangeKind[] {
  if (file.kind === 'added') {
    return ['SYMBOL_ADDED', 'UNKNOWN_TEXTUAL_CHANGE'];
  }

  if (file.kind === 'deleted') {
    return ['SYMBOL_DELETED', 'UNKNOWN_TEXTUAL_CHANGE'];
  }

  if (file.kind === 'renamed') {
    return ['SYMBOL_RENAMED', 'UNKNOWN_TEXTUAL_CHANGE'];
  }

  if (isManifestPath(file.path)) {
    return ['MANIFEST_CHANGED', 'DEPENDENCY_CHANGED'];
  }

  if (isConfigPath(file.path)) {
    return ['CONFIG_CHANGED'];
  }

  return ['UNKNOWN_TEXTUAL_CHANGE'];
}

function hasImportLine(lines: readonly string[]): boolean {
  return lines.some((line) => /^[+-]\s*(import\b|from\b|require\(|use\b|#include\b)/u.test(line));
}

export async function mapChange(input: MapChangeInput): Promise<MapChangeResult> {
  const entities = new Map<string, ChangedEntity>();
  const gaps: ChangeGap[] = [];

  let changedHunks = 0;
  let mappedFiles = 0;
  let binaryFiles = 0;
  let truncated = false;

  const changedSymbolIds = new Set<string>();

  for (const file of input.files) {
    changedHunks += file.hunks.length;

    if (isSensitiveChangePath(file.path)) {
      /* Never read or map a sensitive file; report path + classification only. */
      gaps.push({ kind: 'SENSITIVE_FILE', path: file.path });
      continue;
    }

    if (file.binary) {
      binaryFiles += 1;
      gaps.push({ kind: 'BINARY_FILE', path: file.path });

      const id = `file:${file.path}`;

      entities.set(id, {
        id,
        entityKind: 'file',
        semantic: fileLevelSemantic(file),
        filePath: file.path,
        baselinePresence: file.kind !== 'added',
        candidatePresence: file.kind !== 'deleted',
        signatureChanged: false,
        publicSurface: isManifestPath(file.path),
      });

      continue;
    }

    const baselineSymbols = input.facts.graph
      .symbols()
      .filter((symbol) => symbol.filePath === file.path);

    /*
     * Candidate-side symbols come from structural parsing. When a parser is
     * unavailable (`null`) the candidate side is UNKNOWN, not "unchanged": a
     * symbol that no longer parses must not silently look present. When no
     * parser is wired at all, baseline symbols are reused (no candidate view).
     */
    let candidateSymbols: readonly ChangeSymbol[];
    let candidateUnknown = false;

    if (file.kind === 'deleted') {
      candidateSymbols = [];
    } else if (input.facts.parseCandidate) {
      const parsed = await input.facts.parseCandidate(file.path);

      if (parsed === null) {
        candidateSymbols = [];
        candidateUnknown = true;
      } else {
        candidateSymbols = parsed;
      }
    } else {
      candidateSymbols = baselineSymbols;
    }

    const baselineChanged =
      file.kind === 'deleted'
        ? baselineSymbols
        : baselineSymbols.filter((symbol) => symbol.type !== 'file' && intersects(symbol, file));

    const candidateChanged =
      file.kind === 'deleted'
        ? []
        : candidateSymbols.filter((symbol) => symbol.type !== 'file' && intersects(symbol, file));

    const baselineIds = new Set(baselineChanged.map((symbol) => symbol.id));
    const candidateIds = new Set(candidateChanged.map((symbol) => symbol.id));

    const fileMapped = baselineChanged.length > 0 || candidateChanged.length > 0;

    if (fileMapped) {
      mappedFiles += 1;
    }

    if (candidateUnknown && file.kind !== 'deleted') {
      gaps.push({ kind: 'UNSUPPORTED_LANGUAGE', path: file.path });
    }

    const lines = input.changedLines.get(file.path) ?? [];
    const importChanged = hasImportLine(lines);

    for (const symbol of baselineChanged) {
      changedSymbolIds.add(symbol.id);

      const candidate = candidateIds.has(symbol.id);
      const signature = classifySignature(lines, symbol.name);

      const semantic = semanticFor(symbol, file, true, candidate, signature);

      const id = symbol.id;

      const existing = entities.get(id);

      const merged: ChangedEntity = {
        id,
        entityKind: entityKindFor(symbol),
        semantic: existing ? [...new Set([...existing.semantic, ...semantic])] : semantic,
        symbolId: symbol.id,
        name: symbol.name,
        ...(symbol.qualifiedName ? { qualifiedName: symbol.qualifiedName } : {}),
        filePath: file.path,
        ...(file.oldPath ? { oldFilePath: file.oldPath } : {}),
        baselinePresence: true,
        candidatePresence: candidate,
        signatureChanged: signature.signatureChanged,
        publicSurface: publicSurface(symbol, file.path),
      };

      entities.set(id, merged);
    }

    for (const symbol of candidateChanged) {
      if (baselineIds.has(symbol.id)) {
        continue;
      }

      changedSymbolIds.add(symbol.id);

      const signature = classifySignature(lines, symbol.name);

      const id = symbol.id;

      const existing = entities.get(id);

      const semantic = semanticFor(symbol, file, false, true, signature);

      const merged: ChangedEntity = {
        id,
        entityKind: entityKindFor(symbol),
        semantic: existing ? [...new Set([...existing.semantic, ...semantic])] : semantic,
        symbolId: symbol.id,
        name: symbol.name,
        ...(symbol.qualifiedName ? { qualifiedName: symbol.qualifiedName } : {}),
        filePath: file.path,
        ...(file.oldPath ? { oldFilePath: file.oldPath } : {}),
        baselinePresence: false,
        candidatePresence: true,
        signatureChanged: signature.signatureChanged,
        publicSurface: publicSurface(symbol, file.path),
      };

      entities.set(id, merged);
    }

    if (!fileMapped) {
      /* No symbol owns the change (e.g. a new file with no parser). */
      const id = `file:${file.path}`;

      const semantic = fileLevelSemantic(file);

      entities.set(id, {
        id,
        entityKind: isManifestPath(file.path)
          ? 'dependency'
          : isConfigPath(file.path)
            ? 'config'
            : 'file',
        semantic: importChanged
          ? [...new Set<SemanticChangeKind>([...semantic, 'IMPORT_CHANGED'])]
          : semantic,
        filePath: file.path,
        ...(file.oldPath ? { oldFilePath: file.oldPath } : {}),
        baselinePresence: file.kind !== 'added',
        candidatePresence: file.kind !== 'deleted',
        signatureChanged: false,
        publicSurface: isManifestPath(file.path),
      });

      if (!candidateUnknown) {
        gaps.push({ kind: 'UNMAPPED_HUNK', path: file.path });
      }
    }

    if (importChanged && fileMapped) {
      for (const entity of entities.values()) {
        if (entity.filePath === file.path && !entity.semantic.includes('IMPORT_CHANGED')) {
          entity.semantic.push('IMPORT_CHANGED');
        }
      }
    }
  }

  const entityList = [...entities.values()].sort(
    (left, right) => left.filePath.localeCompare(right.filePath) || left.id.localeCompare(right.id)
  );

  if (entityList.length > input.limits.maxChangedSymbols) {
    truncated = true;
  }

  const boundedEntities = entityList.slice(0, input.limits.maxChangedSymbols);

  const mappedSymbols = boundedEntities.filter((entity) => entity.symbolId !== undefined).length;

  const coverage: ChangeCoverage = {
    changedFiles: input.files.length,
    mappedFiles,
    changedHunks,
    changedSymbols: changedSymbolIds.size,
    mappedSymbols,
    binaryFiles,
    unmapped: gaps,
    truncated,
  };

  return { entities: boundedEntities, coverage, gaps, truncated };
}
