import { z } from 'zod';

import type { MCPContext } from '../context.js';

import {
  AdrError,
  AdrStore,
  ArchitectureDecisionService,
  type AdrAlternative,
  type AdrMutationOptions,
  type AdrReference,
  type AdrStatus,
  type AdrUpdatableSections,
  type ArchitectureDecisionRecord,
} from '../../knowledge/adr/index.js';

const ADR_STATUS_VALUES = ['proposed', 'accepted', 'deprecated', 'superseded', 'rejected'] as const;

const consequenceSchema = z.object({
  positive: z.array(z.string()).optional(),
  negative: z.array(z.string()).optional(),
  neutral: z.array(z.string()).optional(),
});

const alternativeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  rejectedBecause: z.string().optional(),
});

const referenceSchema = z.object({
  kind: z.enum(['file', 'url', 'adr', 'commit', 'spec']),
  target: z.string().min(1),
  note: z.string().optional(),
});

export const manageAdrSchema = {
  action: z
    .enum([
      'create',
      'get',
      'list',
      'search',
      'update',
      'set_sections',
      'change_status',
      'supersede',
      'history',
      'chain',
      'export',
      'import',
    ])
    .describe('ADR operation. All operations are project-scoped and bounded.'),

  id: z.string().min(1).max(200).optional().describe('Human id (ADR-0001) or canonical id.'),
  oldId: z.string().min(1).max(200).optional().describe('Superseded ADR id.'),
  newId: z.string().min(1).max(200).optional().describe('Replacement ADR id.'),

  title: z.string().min(1).max(300).optional(),
  context: z.string().max(20000).optional(),
  decision: z.string().max(20000).optional(),
  status: z.enum(ADR_STATUS_VALUES).optional(),
  consequences: consequenceSchema.optional(),
  alternatives: z.array(alternativeSchema).max(200).optional(),
  affectedPaths: z.array(z.string()).max(200).optional(),
  affectedSymbols: z.array(z.string()).max(200).optional(),
  tags: z.array(z.string()).max(200).optional(),
  references: z.array(referenceSchema).max(200).optional(),

  sections: z
    .object({
      title: z.string().min(1).max(300).optional(),
      context: z.string().max(20000).optional(),
      decision: z.string().max(20000).optional(),
      consequences: consequenceSchema.optional(),
      alternatives: z.array(alternativeSchema).max(200).optional(),
      affectedPaths: z.array(z.string()).max(200).optional(),
      affectedSymbols: z.array(z.string()).max(200).optional(),
      tags: z.array(z.string()).max(200).optional(),
      references: z.array(referenceSchema).max(200).optional(),
    })
    .optional()
    .describe('Byte-preserving partial update: only the supplied sections change.'),

  markdown: z.string().max(200000).optional().describe('Canonical ADR Markdown for action=import.'),
  number: z.number().int().min(1).max(999999).optional(),
  persistExport: z
    .boolean()
    .optional()
    .describe('Write the Markdown projection to project storage.'),

  expectedRevision: z.number().int().min(1).optional().describe('Optimistic concurrency guard.'),
  query: z.string().min(2).max(500).optional(),
  tag: z.string().max(64).optional(),
  filterStatus: z.enum([...ADR_STATUS_VALUES, 'all']).optional(),
  includeHistorical: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).max(100000).optional(),
};

export interface ManageAdrInput {
  action:
    | 'create'
    | 'get'
    | 'list'
    | 'search'
    | 'update'
    | 'set_sections'
    | 'change_status'
    | 'supersede'
    | 'history'
    | 'chain'
    | 'export'
    | 'import';
  id?: string;
  oldId?: string;
  newId?: string;
  title?: string;
  context?: string;
  decision?: string;
  status?: AdrStatus;
  consequences?: { positive?: string[]; negative?: string[]; neutral?: string[] };
  alternatives?: AdrAlternative[];
  affectedPaths?: string[];
  affectedSymbols?: string[];
  tags?: string[];
  references?: AdrReference[];
  sections?: AdrUpdatableSections;
  markdown?: string;
  number?: number;
  persistExport?: boolean;
  expectedRevision?: number;
  query?: string;
  tag?: string;
  filterStatus?: AdrStatus | 'all';
  includeHistorical?: boolean;
  limit?: number;
  offset?: number;
}

export interface AdrSymbolLink {
  target: string;
  status: 'resolved' | 'unresolved';
  symbolId?: string;
}

export interface AdrRecordOutput {
  id: string;
  projectId: string;
  humanId: string;
  number: number;
  title: string;
  status: string;
  context: string;
  decision: string;
  consequences: { positive: string[]; negative: string[]; neutral: string[] };
  alternatives: AdrAlternative[];
  affectedPaths: string[];
  affectedSymbols: string[];
  tags: string[];
  references: AdrReference[];
  supersedes: string[];
  supersededBy?: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  symbolLinks?: AdrSymbolLink[];
}

export interface AdrSummaryOutput {
  id: string;
  humanId: string;
  number: number;
  title: string;
  status: string;
  tags: string[];
  affectedPaths: string[];
  revision: number;
  updatedAt: string;
  supersededBy?: string;
}

export type ManageAdrResult =
  | {
      ok: true;
      action: ManageAdrInput['action'];
      record?: AdrRecordOutput;
      replacement?: AdrRecordOutput;
      records?: AdrSummaryOutput[];
      results?: Array<{ record: AdrSummaryOutput; score: number }>;
      history?: Array<{
        operation: string;
        at: string;
        beforeRevision: number;
        afterRevision: number;
        changedFields: string[];
      }>;
      total?: number;
      limit?: number;
      offset?: number;
      idempotent?: boolean;
      markdown?: string;
      filename?: string;
      exportKeys?: string[];
      supersedes?: string[];
      supersededBy?: string[];
      coverage?: { status: 'authoritative'; scope: string; projectId: string };
    }
  | {
      ok: false;
      action: ManageAdrInput['action'];
      error: { code: string; message: string };
    };

function summary(record: ArchitectureDecisionRecord): AdrSummaryOutput {
  return {
    id: record.id,
    humanId: record.humanId,
    number: record.number,
    title: record.title,
    status: record.status,
    tags: record.tags,
    affectedPaths: record.affectedPaths,
    revision: record.revision,
    updatedAt: record.updatedAt,
    ...(record.supersededBy ? { supersededBy: record.supersededBy } : {}),
  };
}

/**
 * Optional, exact-only symbol linkage.
 *
 * A symbol id is verified through the graph; a qualified name must match
 * exactly. Simple-name guessing is deliberately not performed.
 */
function linkSymbols(ctx: MCPContext, symbols: string[]): AdrSymbolLink[] {
  if (symbols.length === 0) {
    return [];
  }

  const graph = ctx.graph;

  let byQualifiedName: Map<string, string> | undefined;

  return symbols.map((target) => {
    const direct = graph?.getSymbol?.(target);

    if (direct) {
      return { target, status: 'resolved' as const, symbolId: direct.id };
    }

    if (!byQualifiedName && graph?.allSymbols) {
      byQualifiedName = new Map<string, string>();

      for (const symbol of graph.allSymbols(ctx.project.id)) {
        if (symbol.qualifiedName && !byQualifiedName.has(symbol.qualifiedName)) {
          byQualifiedName.set(symbol.qualifiedName, symbol.id);
        }
      }
    }

    const matched = byQualifiedName?.get(target);

    return matched
      ? { target, status: 'resolved' as const, symbolId: matched }
      : { target, status: 'unresolved' as const };
  });
}

function record(record: ArchitectureDecisionRecord, ctx: MCPContext): AdrRecordOutput {
  return {
    ...structuredClone(record),
    symbolLinks: linkSymbols(ctx, record.affectedSymbols),
  };
}

function fail(action: ManageAdrInput['action'], error: unknown): ManageAdrResult {
  if (error instanceof AdrError) {
    return { ok: false, action, error: { code: error.code, message: error.message } };
  }

  return {
    ok: false,
    action,
    error: {
      code: 'ADR_INVALID',
      message: error instanceof Error ? error.message : 'ADR operation failed',
    },
  };
}

function mutationOptions(input: ManageAdrInput): AdrMutationOptions {
  return input.expectedRevision !== undefined ? { expectedRevision: input.expectedRevision } : {};
}

export async function manageAdr(ctx: MCPContext, input: ManageAdrInput): Promise<ManageAdrResult> {
  const storage = ctx.storage;

  if (!storage) {
    return {
      ok: false,
      action: input.action,
      error: { code: 'ADR_INVALID', message: 'ADR storage unavailable' },
    };
  }

  const service = new ArchitectureDecisionService(new AdrStore(storage, ctx.project));

  try {
    await service.initialize();

    const coverage = {
      status: 'authoritative' as const,
      scope: 'project',
      projectId: ctx.project.id,
    };

    switch (input.action) {
      case 'create': {
        const result = await service.create({
          title: input.title ?? '',
          ...(input.context !== undefined ? { context: input.context } : {}),
          ...(input.decision !== undefined ? { decision: input.decision } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.consequences !== undefined ? { consequences: input.consequences } : {}),
          ...(input.alternatives !== undefined ? { alternatives: input.alternatives } : {}),
          ...(input.affectedPaths !== undefined ? { affectedPaths: input.affectedPaths } : {}),
          ...(input.affectedSymbols !== undefined
            ? { affectedSymbols: input.affectedSymbols }
            : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(input.references !== undefined ? { references: input.references } : {}),
          ...(input.number !== undefined ? { number: input.number } : {}),
        });

        return {
          ok: true,
          action: input.action,
          record: record(result.record, ctx),
          idempotent: result.idempotent,
          coverage,
        };
      }

      case 'import': {
        if (!input.markdown) {
          return {
            ok: false,
            action: input.action,
            error: { code: 'ADR_INVALID', message: 'markdown is required for action=import' },
          };
        }

        const result = await service.importMarkdown(input.markdown, {
          ...(input.number !== undefined ? { number: input.number } : {}),
        });

        return {
          ok: true,
          action: input.action,
          record: record(result.record, ctx),
          idempotent: result.idempotent,
          coverage,
        };
      }

      case 'get': {
        if (!input.id) {
          return {
            ok: false,
            action: input.action,
            error: { code: 'ADR_INVALID', message: 'id is required for action=get' },
          };
        }

        return {
          ok: true,
          action: input.action,
          record: record(await service.get(input.id), ctx),
          coverage,
        };
      }

      case 'list': {
        const page = await service.list({
          ...(input.filterStatus !== undefined ? { status: input.filterStatus } : {}),
          ...(input.tag !== undefined ? { tag: input.tag } : {}),
          ...(input.limit !== undefined ? { limit: input.limit } : {}),
          ...(input.offset !== undefined ? { offset: input.offset } : {}),
        });

        return {
          ok: true,
          action: input.action,
          records: page.records.map(summary),
          total: page.total,
          limit: page.limit,
          offset: page.offset,
          coverage,
        };
      }

      case 'search': {
        if (!input.query) {
          return {
            ok: false,
            action: input.action,
            error: { code: 'ADR_INVALID', message: 'query is required for action=search' },
          };
        }

        const results = await service.search(input.query, {
          ...(input.limit !== undefined ? { limit: input.limit } : {}),
          ...(input.includeHistorical !== undefined
            ? { includeHistorical: input.includeHistorical }
            : {}),
        });

        return {
          ok: true,
          action: input.action,
          results: results.map((item) => ({ record: summary(item.record), score: item.score })),
          total: results.length,
          coverage,
        };
      }

      case 'update':
      case 'set_sections': {
        const sections: AdrUpdatableSections = input.sections ?? {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.context !== undefined ? { context: input.context } : {}),
          ...(input.decision !== undefined ? { decision: input.decision } : {}),
          ...(input.consequences !== undefined ? { consequences: input.consequences } : {}),
          ...(input.alternatives !== undefined ? { alternatives: input.alternatives } : {}),
          ...(input.affectedPaths !== undefined ? { affectedPaths: input.affectedPaths } : {}),
          ...(input.affectedSymbols !== undefined
            ? { affectedSymbols: input.affectedSymbols }
            : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(input.references !== undefined ? { references: input.references } : {}),
        };

        if (!input.id) {
          return {
            ok: false,
            action: input.action,
            error: { code: 'ADR_INVALID', message: 'id is required' },
          };
        }

        const result =
          input.action === 'update'
            ? await service.update(input.id, sections, mutationOptions(input))
            : await service.setSections(input.id, sections, mutationOptions(input));

        return {
          ok: true,
          action: input.action,
          record: record(result.record, ctx),
          idempotent: result.idempotent,
          coverage,
        };
      }

      case 'change_status': {
        if (!input.id || !input.status) {
          return {
            ok: false,
            action: input.action,
            error: { code: 'ADR_INVALID', message: 'id and status are required' },
          };
        }

        const result = await service.changeStatus(input.id, input.status, mutationOptions(input));

        return {
          ok: true,
          action: input.action,
          record: record(result.record, ctx),
          idempotent: result.idempotent,
          coverage,
        };
      }

      case 'supersede': {
        if (!input.oldId || !input.newId) {
          return {
            ok: false,
            action: input.action,
            error: { code: 'ADR_INVALID', message: 'oldId and newId are required' },
          };
        }

        const result = await service.supersede(input.oldId, input.newId, mutationOptions(input));

        return {
          ok: true,
          action: input.action,
          record: record(result.superseded, ctx),
          replacement: record(result.replacement, ctx),
          idempotent: result.idempotent,
          coverage,
        };
      }

      case 'history': {
        if (!input.id) {
          return {
            ok: false,
            action: input.action,
            error: { code: 'ADR_INVALID', message: 'id is required for action=history' },
          };
        }

        const events = await service.history(input.id);

        return {
          ok: true,
          action: input.action,
          history: events.map((event) => ({
            operation: event.operation,
            at: event.at,
            beforeRevision: event.beforeRevision,
            afterRevision: event.afterRevision,
            changedFields: event.changedFields,
          })),
          coverage,
        };
      }

      case 'chain': {
        if (!input.id) {
          return {
            ok: false,
            action: input.action,
            error: { code: 'ADR_INVALID', message: 'id is required for action=chain' },
          };
        }

        const chain = await service.supersessionChain(input.id);

        return {
          ok: true,
          action: input.action,
          supersedes: chain.supersedes,
          supersededBy: chain.supersededBy,
          coverage,
        };
      }

      case 'export': {
        /*
         * Without an id this persists every projection to the fixed,
         * server-controlled destination and returns keys only: exporting the
         * whole corpus must never return an unbounded payload.
         */
        if (!input.id) {
          const all = await service.exportAll();

          return {
            ok: true,
            action: input.action,
            exportKeys: all
              .map((entry) => entry.key)
              .filter((key): key is string => typeof key === 'string'),
            total: all.length,
            coverage,
          };
        }

        const exported = await service.exportMarkdown(input.id, input.persistExport ?? false);

        return {
          ok: true,
          action: input.action,
          markdown: exported.markdown,
          filename: exported.filename,
          ...(exported.key ? { exportKeys: [exported.key] } : {}),
          coverage,
        };
      }

      default: {
        return {
          ok: false,
          action: input.action,
          error: { code: 'ADR_INVALID', message: `Unsupported action: ${String(input.action)}` },
        };
      }
    }
  } catch (error) {
    return fail(input.action, error);
  }
}
