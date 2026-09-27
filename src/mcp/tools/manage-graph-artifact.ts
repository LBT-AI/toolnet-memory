import { z } from 'zod';

import type { MCPContext } from '../context.js';

import {
  ARTIFACT_LIMITS,
  ARTIFACT_REASON_CODES,
  ArtifactError,
  CodeIntelligenceArtifactStore,
  applyArtifactRetention,
  artifactProjectContext,
  artifactStatus,
  downloadArtifact,
  hydrateArtifact,
  publishArtifact,
} from '../../code-intelligence/artifact/index.js';

export const manageGraphArtifactSchema = {
  action: z
    .enum(['status', 'publish', 'pull', 'verify', 'list', 'prune'])
    .describe(
      [
        'Artifact operation.',
        'status: local vs published generation, compatibility and component presence.',
        'publish: build and upload the current derived graph as an immutable generation.',
        'pull: verify and hydrate the published generation into this machine.',
        'verify: verify the published generation without writing anything.',
        'list: published generations with manifest metadata.',
        'prune: apply bounded retention (current generation is never deleted).',
      ].join(' ')
    ),

  generation: z
    .string()
    .regex(/^gen-[0-9a-f]{32}$/)
    .optional()
    .describe('Target a specific published generation instead of the current pointer.'),

  verifySource: z
    .boolean()
    .optional()
    .describe('status only: run the hash-only source comparison (slower, proves adoptability).'),

  retain: z
    .number()
    .int()
    .min(0)
    .max(ARTIFACT_LIMITS.maxRetainedGenerations)
    .optional()
    .describe('prune/publish: previous generations kept in addition to the current one.'),

  dryRun: z
    .boolean()
    .optional()
    .describe('prune: report what would be deleted without deleting it.'),

  includeComponents: z
    .boolean()
    .optional()
    .describe('list: include per-component size and hash metadata.'),
};

export interface ManageGraphArtifactInput {
  action: 'status' | 'publish' | 'pull' | 'verify' | 'list' | 'prune';
  generation?: string;
  verifySource?: boolean;
  retain?: number;
  dryRun?: boolean;
  includeComponents?: boolean;
}

export type ManageGraphArtifactResult =
  | { ok: true; action: ManageGraphArtifactInput['action']; [key: string]: unknown }
  | {
      ok: false;
      action: ManageGraphArtifactInput['action'];
      error: { code: string; message: string };
      reasonCodes: readonly string[];
    };

function fail(
  action: ManageGraphArtifactInput['action'],
  error: unknown
): ManageGraphArtifactResult {
  if (error instanceof ArtifactError) {
    return {
      ok: false,
      action,
      error: { code: error.code, message: error.message },
      reasonCodes: ARTIFACT_REASON_CODES,
    };
  }

  return {
    ok: false,
    action,
    error: {
      code: 'ARTIFACT_IO_ERROR',
      message: error instanceof Error ? error.message : 'Artifact operation failed',
    },
    reasonCodes: ARTIFACT_REASON_CODES,
  };
}

/**
 * Shared entry point for the artifact MCP surface.
 *
 * Note for callers: a failed pull is a normal, safe outcome. The current graph
 * is left untouched and the correct next step is a normal local index.
 */
export async function manageGraphArtifact(
  ctx: MCPContext,
  input: ManageGraphArtifactInput
): Promise<ManageGraphArtifactResult> {
  const storage = ctx.storage;

  if (!storage) {
    return {
      ok: false,
      action: input.action,
      error: { code: 'ARTIFACT_IO_ERROR', message: 'Project storage is unavailable.' },
      reasonCodes: ARTIFACT_REASON_CODES,
    };
  }

  const context = artifactProjectContext(ctx.project);

  const store = new CodeIntelligenceArtifactStore(storage, ctx.project.id);

  try {
    switch (input.action) {
      case 'status': {
        const status = await artifactStatus(storage, context, {
          ...(input.verifySource !== undefined ? { verifySource: input.verifySource } : {}),
        });

        return { ok: true, action: input.action, status };
      }

      case 'publish': {
        const result = await publishArtifact(storage, context, {
          ...(input.retain !== undefined ? { retain: input.retain } : {}),
        });

        return {
          ok: true,
          action: input.action,
          generation: result.generation,
          artifactSha256: result.artifactSha256,
          artifactBytes: result.artifactBytes,
          manifestSha256: result.manifestSha256,
          idempotent: result.idempotent,
          components: result.components.map((component) => ({
            name: component.name,
            kind: component.kind,
            size: component.size,
          })),
          pruned: result.pruned,
        };
      }

      case 'pull': {
        const result = await hydrateArtifact(storage, context, {
          ...(input.generation !== undefined ? { generation: input.generation } : {}),
          ...(ctx.rootStorage ? { rootStorage: ctx.rootStorage } : {}),
        });

        return {
          ok: true,
          action: input.action,
          generation: result.generation,
          components: result.components,
          files: result.files,
          symbols: result.symbols,
          edges: result.edges,
          fleetRepinned: result.fleetRepinned,
          note: 'Local code-search cache is rebuilt locally; it is never shipped in an artifact.',
        };
      }

      case 'verify': {
        const verification = await downloadArtifact(store, {
          stagingRoot: `${ctx.project.rootPath}/.toolnet/cache/artifacts/staging`,
          ...(input.generation !== undefined ? { generation: input.generation } : {}),
        });

        const preview = await hydrateArtifact(storage, context, {
          ...(input.generation !== undefined ? { generation: input.generation } : {}),
          dryRun: true,
        });

        return {
          ok: true,
          action: input.action,
          generation: verification.generation,
          artifactSha256: verification.archiveSha256,
          artifactBytes: verification.bytes,
          compatible: true,
          components: preview.components,
        };
      }

      case 'list': {
        const generations = await store.listGenerations();

        const current = await store.getCurrent();

        const entries = [];

        for (const generation of generations) {
          const manifest = await store.getGenerationManifest(generation);

          entries.push({
            generation,
            current: current?.generation === generation,
            createdAt: manifest?.createdAt,
            projectIdentity: manifest?.projectIdentity,
            symbolCount: manifest?.stats.symbols,
            edgeCount: manifest?.stats.edges,
            ...(input.includeComponents
              ? {
                  components: (manifest?.components ?? []).map((component) => ({
                    name: component.name,
                    size: component.size,
                    sha256: component.sha256,
                  })),
                }
              : {}),
          });
        }

        return { ok: true, action: input.action, generations: entries, total: entries.length };
      }

      case 'prune': {
        const removed = await applyArtifactRetention(store, {
          ...(input.retain !== undefined ? { keep: input.retain } : {}),
          ...(input.dryRun !== undefined ? { dryRun: input.dryRun } : {}),
        });

        return {
          ok: true,
          action: input.action,
          dryRun: input.dryRun ?? false,
          removed,
        };
      }

      default: {
        return {
          ok: false,
          action: input.action,
          error: { code: 'ARTIFACT_IO_ERROR', message: 'Unsupported artifact action.' },
          reasonCodes: ARTIFACT_REASON_CODES,
        };
      }
    }
  } catch (error) {
    return fail(input.action, error);
  }
}
