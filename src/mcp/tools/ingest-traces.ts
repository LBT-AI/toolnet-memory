/*
 * Phase 79 — ingest_traces MCP tool.
 *
 * Imports an EXPLICIT runtime trace payload into the project's derived trace
 * evidence store. ToolNet never instruments a process, never attaches a
 * debugger, never executes repository source and never fetches a URL: the trace
 * must be supplied by the caller.
 *
 * Only structured data or a JSON string is accepted. There is deliberately no
 * "path" input, so an MCP client can never make the server read an arbitrary
 * filesystem location.
 *
 * Runtime evidence is EVIDENCE about the static graph, never authority over it.
 */

import { z } from 'zod';

import {
  RUNTIME_TRACE_LIMITS,
  applyRuntimeTraceRetention,
  type RuntimeTraceImportResult,
} from '../../code-intelligence/runtime-trace/index.js';

import type { MCPContext } from '../context.js';

import { loadProjectGeneration } from '../fleet.js';

import { ensureRuntimeTraceStore, importRuntimeTrace } from '../runtime-trace.js';

export const ingestTracesSchema = {
  format: z
    .enum(['auto', 'toolnet-json', 'otel-json'])
    .optional()
    .describe('Trace payload format. auto detects; an explicit format is honoured as given.'),
  trace: z
    .unknown()
    .optional()
    .describe('Structured trace payload (ToolNet trace JSON or OTLP JSON span records).'),
  json: z
    .string()
    .max(RUNTIME_TRACE_LIMITS.maxTraceBytes)
    .optional()
    .describe('Raw trace JSON text, bounded before parsing.'),
  sessionId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,64}$/u)
    .optional()
    .describe(
      'Explicit session id. Identical payloads otherwise derive the same id automatically.'
    ),
  environment: z.string().max(120).optional(),
  expectedGeneration: z
    .string()
    .max(200)
    .optional()
    .describe('Graph generation the instrumented process observed; used for compatibility only.'),
  allowPartial: z
    .boolean()
    .optional()
    .describe('Accept a session that rejected some events and report the rejected count.'),
  prune: z
    .boolean()
    .optional()
    .describe('After a successful import, apply bounded retention to the trace store.'),
  maxAgeDays: z.number().int().min(0).max(3650).optional(),
  maxSessions: z.number().int().min(1).max(RUNTIME_TRACE_LIMITS.maxStoredSessions).optional(),
};

export interface IngestTracesInput {
  format?: 'auto' | 'toolnet-json' | 'otel-json';
  trace?: unknown;
  json?: string;
  sessionId?: string;
  environment?: string;
  expectedGeneration?: string;
  allowPartial?: boolean;
  prune?: boolean;
  maxAgeDays?: number;
  maxSessions?: number;
}

export interface IngestTracesResult {
  import: RuntimeTraceImportResult;
  retention?: { removed: string[]; retained: number };
}

export async function ingestTraces(
  ctx: MCPContext,
  input: IngestTracesInput
): Promise<IngestTracesResult> {
  const store = await ensureRuntimeTraceStore(ctx);

  if (!store) {
    return {
      import: {
        ok: false,
        acceptedEvents: 0,
        rejectedEvents: 0,
        deduplicatedEvents: 0,
        observations: { calls: 0, http: 0, events: 0 },
        generation: { compatibility: 'unknown' },
        diagnostics: [],
        error: {
          code: 'TRACE_STORE_UNAVAILABLE',
          message: 'No project storage is available for runtime traces.',
        },
      },
    };
  }

  const graphGeneration = await loadProjectGeneration(ctx);

  const result = await importRuntimeTrace(ctx, store, {
    projectId: ctx.project.id,
    graph: ctx.graph,
    ...(graphGeneration ? { graphGeneration } : {}),
    input: {
      ...(input.trace !== undefined ? { trace: input.trace } : {}),
      ...(input.json !== undefined ? { json: input.json } : {}),
      ...(input.format !== undefined ? { format: input.format } : {}),
      ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
      ...(input.environment !== undefined ? { environment: input.environment } : {}),
      ...(input.expectedGeneration !== undefined
        ? { expectedGeneration: input.expectedGeneration }
        : {}),
      ...(input.allowPartial !== undefined ? { allowPartial: input.allowPartial } : {}),
    },
  });

  if (input.prune !== true || !result.ok) {
    return { import: result };
  }

  const retention = await applyRuntimeTraceRetention(store, ctx.project.id, {
    ...(input.maxAgeDays !== undefined ? { maxAgeDays: input.maxAgeDays } : {}),
    ...(input.maxSessions !== undefined ? { maxSessions: input.maxSessions } : {}),
  });

  return {
    import: result,
    retention: { removed: retention.removed, retained: retention.retained },
  };
}
