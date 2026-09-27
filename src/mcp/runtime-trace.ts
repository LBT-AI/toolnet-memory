/*
 * Phase 79 — MCP runtime trace helpers.
 *
 * One place decides how trace evidence is stored and read, so the tools, the
 * Evidence Profile layer and the daemon all observe the same derived state.
 *
 * Trace state is derived: it never becomes an authority and never enters
 * Memory, Tasks, Sessions or ADRs.
 */

import {
  PersistentRuntimeTraceStore,
  fleetParticipantsFromSnapshot,
  importTraceSession,
  loadRuntimeTraceFacts,
  type ImportTraceSessionInput,
} from '../code-intelligence/runtime-trace/index.js';

import type { RuntimeTraceImportResult } from '../code-intelligence/runtime-trace/index.js';

import type { EvidenceRuntimeFacts } from '../code-intelligence/evidence/types.js';

import type { MCPContext } from './context.js';

import { loadProjectGeneration } from './fleet.js';

/**
 * Resolve the trace store for the current project.
 *
 * The store addresses `projects/<projectId>/runtime-traces/...`, so it works
 * with either a project-scoped or root storage provider. Returns `null` when no
 * storage is available (degraded hydration), so callers degrade instead of
 * failing.
 */
export async function ensureRuntimeTraceStore(
  ctx: MCPContext
): Promise<PersistentRuntimeTraceStore | null> {
  const storage = ctx.storage ?? ctx.rootStorage ?? null;

  if (!storage) {
    return null;
  }

  return new PersistentRuntimeTraceStore(storage);
}

/**
 * Import a trace session.
 *
 * Uses the shared runtime when one is available (so the daemon can coordinate
 * and single-flight concurrent identical imports) and otherwise imports
 * directly. Both paths write the same derived records, which is what makes
 * standalone and daemon evidence equivalent.
 */
export async function importRuntimeTrace(
  ctx: MCPContext,
  store: PersistentRuntimeTraceStore,
  options: Omit<ImportTraceSessionInput, 'store'>
): Promise<RuntimeTraceImportResult> {
  const runtime = ctx.codeRuntime;

  if (runtime) {
    try {
      return await runtime.ingestTraces(
        { id: ctx.project.id, name: ctx.project.name, rootPath: ctx.project.rootPath },
        {
          projectId: options.projectId,
          ...(options.graphGeneration ? { graphGeneration: options.graphGeneration } : {}),
          input: options.input,
          ...(options.fleetParticipants
            ? { fleetParticipants: [...options.fleetParticipants] }
            : {}),
          ...(options.now ? { now: options.now } : {}),
        }
      );
    } catch {
      /* Fall back to the local import; the daemon is an optimisation, not a requirement. */
    }
  }

  return importTraceSession({
    ...options,
    store,
    ...(options.fleetParticipants
      ? { fleetParticipants: options.fleetParticipants }
      : { fleetParticipants: fleetParticipantsFromSnapshot(ctx.fleet) }),
  });
}

/**
 * Load runtime facts for an evidence request.
 *
 * A project with no imported traces yields `available: false` with empty facts.
 * That is "no runtime evidence", never "nothing runs".
 */
export async function loadEvidenceRuntimeFacts(
  ctx: MCPContext,
  subject: { symbolIds?: readonly string[]; name?: string }
): Promise<EvidenceRuntimeFacts | null> {
  const store = await ensureRuntimeTraceStore(ctx);

  if (!store) {
    return null;
  }

  const graphGeneration = await loadProjectGeneration(ctx);

  return loadRuntimeTraceFacts({
    store,
    projectId: ctx.project.id,
    subject,
    ...(graphGeneration ? { graphGeneration } : {}),
  });
}
