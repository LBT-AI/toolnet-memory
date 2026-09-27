import type { CodeSymbol } from '../../core/types.js';

import type { ParserLanguage } from '../parsers/capabilities.js';

import type { SymbolIndexes } from './symbol-index.js';
import type { ScopeIndex, LexicalScope } from './scope-index.js';
import type { LanguageModuleResolver, ModuleResolution } from './module-index.js';
import type {
  ResolutionEvidence,
  ResolutionResult,
  ResolutionReason,
  SymbolReference,
} from './types.js';

export interface Candidate {
  symbolId: string;
  evidence: ResolutionEvidence[];
}

const MAX_CANDIDATES = 16;

export type ModuleResolverLookup = (language: ParserLanguage) => LanguageModuleResolver | undefined;

/** Owner type symbolId -> direct parent/interface symbolIds. */
export type ParentTypesByType = ReadonlyMap<string, readonly string[]>;

function resolveModule(
  lookup: ModuleResolverLookup,
  language: ParserLanguage,
  importerFile: string,
  source: string
): ModuleResolution | undefined {
  const resolver = lookup(language);
  if (!resolver) {
    return undefined;
  }
  return resolver.resolveImport(importerFile, source);
}

function resolvedFile(
  lookup: ModuleResolverLookup,
  language: ParserLanguage,
  importerFile: string,
  source: string
): string | undefined {
  const result = resolveModule(lookup, language, importerFile, source);
  if (result?.status === 'resolved' && result.files && result.files.length === 1) {
    return result.files[0];
  }
  return undefined;
}

function lastSegment(qualifiedName: string | undefined, name: string): boolean {
  if (!qualifiedName || qualifiedName === name) {
    return false;
  }
  const parts = qualifiedName.split(/[.:]+/u).filter(Boolean);
  return parts.length > 0 && parts[parts.length - 1] === name;
}

function nameMatches(symbol: CodeSymbol, name: string): boolean {
  return symbol.name === name || lastSegment(symbol.qualifiedName, name);
}

/**
 * Deterministic candidate collection.
 *
 * Evidence kinds are the only resolution authority. Nothing here guesses:
 * every candidate comes from a lexical binding, an explicit import, a proven
 * module target, a declared receiver type, or a deterministic inheritance
 * edge.
 */
export function collectCandidates(
  reference: SymbolReference,
  indexes: SymbolIndexes,
  scopes: ScopeIndex,
  lookup: ModuleResolverLookup,
  parentTypesByType: ParentTypesByType,
  maxCandidates = MAX_CANDIDATES
): Candidate[] {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  function add(symbolId: string, evidence: ResolutionEvidence[]): void {
    if (seen.has(symbolId)) {
      return;
    }
    seen.add(symbolId);
    candidates.push({ symbolId, evidence });
  }

  const file = reference.filePath;
  const name = reference.name;
  const language = reference.language;

  const fileScopes = scopes.scopesByFile.get(file);
  const fileScope = fileScopes?.find((scope) => scope.symbolId === file) ?? fileScopes?.[0];

  const scopeId = reference.sourceSymbolId;
  const scope = scopeId ? scopes.scopesBySymbol.get(scopeId) : undefined;

  /*
   * Import references resolve through module identity only. Resolving them by
   * local name would let a same-named local declaration masquerade as the
   * imported symbol and produce ambiguous/wrong module targets.
   */
  const isImport = reference.kind === 'import';

  /*
   * Qualified references (`Child::save()`, `repo.save()`, `lib.save()`) must be
   * proven through the receiver/module, never by a bare same-file name match.
   * Matching by name here produced false positives for identically named
   * members and unknown receivers.
   */
  const isQualified = Boolean(reference.qualifier);

  if (!isImport && !isQualified) {
    /*
     * 1. Same-file declarations.
     */
    for (const symbol of indexes.symbolsByFile.get(file) ?? []) {
      if (symbol.name === name && symbol.id !== scopeId) {
        add(symbol.id, [{ kind: 'same_lexical_scope', scopeSymbolId: file }]);
      }
    }

    /*
     * 2. Lexical scope chain: current scope, then parents, then file scope.
     */
    if (scope) {
      let current: LexicalScope | undefined = scope;
      while (current) {
        for (const [bindingName, binding] of current.bindings) {
          if (bindingName === name) {
            add(binding.symbolId, [
              { kind: 'same_lexical_scope', scopeSymbolId: current.symbolId },
            ]);
          }
        }
        const parentId: string | undefined = current.parentScopeId;
        current = parentId ? scopes.scopesBySymbol.get(parentId) : undefined;
      }
    }

    if (fileScope) {
      for (const [bindingName, binding] of fileScope.bindings) {
        if (bindingName === name) {
          add(binding.symbolId, [
            { kind: 'same_lexical_scope', scopeSymbolId: fileScope.symbolId },
          ]);
        }
      }
    }
  }

  /*
   * 3. Explicit import of a module path (import references carry the specifier).
   */
  if (reference.moduleSpecifier) {
    const targetFile = resolvedFile(lookup, language, file, reference.moduleSpecifier);
    if (targetFile) {
      const before = candidates.length;
      for (const symbol of indexes.symbolsByFile.get(targetFile) ?? []) {
        if (nameMatches(symbol, name)) {
          add(symbol.id, [
            { kind: 'explicit_import', module: reference.moduleSpecifier, importedName: name },
          ]);
        }
      }
      /*
       * A module import with no named match resolves to the imported module
       * file itself, so IMPORTS relationships stay deterministic instead of
       * silently disappearing.
       */
      if (candidates.length === before && reference.kind === 'import') {
        const fileSymbol = (indexes.symbolsByFile.get(targetFile) ?? []).find(
          (symbol) => symbol.type === 'file'
        );
        if (fileSymbol) {
          add(fileSymbol.id, [{ kind: 'module_export', moduleFile: targetFile }]);
        }
      }
    }
  }

  /*
   * 4. Explicit imports bound in the file (named, aliased, default).
   */
  for (const imp of indexes.importsByFile.get(file) ?? []) {
    for (const binding of imp.bindings) {
      if (binding.localName !== name) {
        continue;
      }
      const targetFile = resolvedFile(lookup, language, file, imp.source);
      if (!targetFile) {
        continue;
      }
      const targetName = binding.importedName === 'default' ? name : binding.importedName;
      for (const symbol of indexes.symbolsByFile.get(targetFile) ?? []) {
        if (nameMatches(symbol, targetName)) {
          add(symbol.id, [
            { kind: 'explicit_import', module: imp.source, importedName: binding.importedName },
          ]);
        }
      }
    }
  }

  /*
   * 4b. Include/namespace scope for C and C++.
   *
   * `#include "orders.h"` brings the header's declarations into scope, so a
   * bare call resolves through the resolved project-local header. System
   * includes never resolve (no system header crawl).
   */
  if (language === 'c' || language === 'cpp') {
    for (const imp of indexes.importsByFile.get(file) ?? []) {
      const targetFile = resolvedFile(lookup, language, file, imp.source);
      if (!targetFile) {
        continue;
      }
      for (const symbol of indexes.symbolsByFile.get(targetFile) ?? []) {
        if (symbol.name === name && symbol.type !== 'file') {
          add(symbol.id, [{ kind: 'module_export', moduleFile: targetFile }]);
        }
      }
    }
  }

  /*
   * 5. Qualified references: namespace/module imports, receiver types, and
   *    inheritance.
   */
  if (reference.qualifier) {
    const qualifier = reference.qualifier;

    /* 5a. Defensive: qualifier already holds a symbol id. */
    const qualifierSymbol = indexes.symbolById.get(qualifier);
    if (qualifierSymbol) {
      for (const member of indexes.membersByType.get(qualifierSymbol.id) ?? []) {
        if (member.name === name) {
          add(member.id, [{ kind: 'receiver_type', typeSymbolId: qualifierSymbol.id }]);
        }
      }
    }

    /* 5b. Namespace / module import: `orders.create()` where `orders` is a module. */
    for (const imp of indexes.importsByFile.get(file) ?? []) {
      for (const binding of imp.bindings) {
        if (binding.localName !== qualifier) {
          continue;
        }
        const targetFile = resolvedFile(lookup, language, file, imp.source);
        if (!targetFile) {
          continue;
        }
        for (const symbol of indexes.symbolsByFile.get(targetFile) ?? []) {
          if (nameMatches(symbol, name)) {
            add(symbol.id, [{ kind: 'namespace_qualification', symbolId: symbol.id }]);
          }
        }
      }
    }

    /* 5c. Receiver type declared in this file or imported into it. */
    const ownerCandidates: CodeSymbol[] = [];
    for (const symbol of indexes.symbolsByFile.get(file) ?? []) {
      if (symbol.name === qualifier && symbol.type !== 'file') {
        ownerCandidates.push(symbol);
      }
    }
    for (const imp of indexes.importsByFile.get(file) ?? []) {
      for (const binding of imp.bindings) {
        if (binding.localName !== qualifier) {
          continue;
        }
        const targetFile = resolvedFile(lookup, language, file, imp.source);
        if (!targetFile) {
          continue;
        }
        const targetName = binding.importedName === 'default' ? qualifier : binding.importedName;
        for (const symbol of indexes.symbolsByFile.get(targetFile) ?? []) {
          if (nameMatches(symbol, targetName) && symbol.type !== 'file') {
            ownerCandidates.push(symbol);
          }
        }
      }
    }

    const visitedTypes = new Set<string>();

    for (const owner of ownerCandidates) {
      if (visitedTypes.has(owner.id)) {
        continue;
      }
      visitedTypes.add(owner.id);

      for (const member of indexes.membersByType.get(owner.id) ?? []) {
        if (member.name === name) {
          add(member.id, [{ kind: 'receiver_type', typeSymbolId: owner.id }]);
        }
      }
    }

    /*
     * 5d. Inheritance-aware member lookup (bounded, deterministic).
     */
    let frontier = ownerCandidates.map((owner) => owner.id);
    const visitedAncestors = new Set<string>(frontier);
    const maxDepth = 4;

    for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
      const next: string[] = [];
      for (const typeId of frontier) {
        for (const parentId of parentTypesByType.get(typeId) ?? []) {
          if (visitedAncestors.has(parentId)) {
            continue;
          }
          visitedAncestors.add(parentId);
          next.push(parentId);

          for (const member of indexes.membersByType.get(parentId) ?? []) {
            if (member.name === name) {
              add(member.id, [{ kind: 'inheritance_member', typeSymbolId: parentId }]);
            }
          }
        }
      }
      frontier = next;
    }
  }

  return candidates
    .sort((left, right) => {
      const symbolA = indexes.symbolById.get(left.symbolId);
      const symbolB = indexes.symbolById.get(right.symbolId);
      const fileA = symbolA?.filePath ?? '';
      const fileB = symbolB?.filePath ?? '';
      const cmp = fileA.localeCompare(fileB);
      if (cmp !== 0) {
        return cmp;
      }
      const qnA = symbolA?.qualifiedName ?? symbolA?.name ?? '';
      const qnB = symbolB?.qualifiedName ?? symbolB?.name ?? '';
      const cmp2 = qnA.localeCompare(qnB);
      if (cmp2 !== 0) {
        return cmp2;
      }
      return left.symbolId.localeCompare(right.symbolId);
    })
    .slice(0, maxCandidates);
}

export function buildResolutionResult(
  reference: SymbolReference,
  candidates: Candidate[]
): ResolutionResult {
  if (candidates.length === 0) {
    return {
      status: 'unresolved',
      candidates: [],
      evidence: [],
      reason: reasonForMiss(reference),
    };
  }

  if (candidates.length > 1) {
    return {
      status: 'ambiguous',
      candidates: candidates.map((candidate) => candidate.symbolId),
      evidence: candidates[0]?.evidence ?? [],
      reason: 'MULTIPLE_CANDIDATES',
    };
  }

  return {
    status: 'resolved',
    targetSymbolId: candidates[0].symbolId,
    candidates: [candidates[0].symbolId],
    evidence: candidates[0].evidence,
  };
}

function reasonForMiss(reference: SymbolReference): ResolutionReason {
  if (reference.qualifier) {
    return 'UNKNOWN_RECEIVER_TYPE';
  }
  if (reference.moduleSpecifier) {
    return 'UNRESOLVED_IMPORT';
  }
  return 'NO_CANDIDATE';
}
