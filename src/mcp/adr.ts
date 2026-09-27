import type { MCPContext } from './context.js';

import {
  AdrStore,
  ArchitectureDecisionService,
  relevantDecisionIds,
  relevantDecisions,
  type AdrContextEntry,
  type AdrRelevanceInput,
} from '../knowledge/adr/index.js';

/**
 * Phase 75 — bounded ADR access for MCP tools.
 *
 * ADR data is project-scoped persistent knowledge. When storage or an ADR is
 * unavailable/corrupt the caller degrades gracefully (the field is omitted)
 * instead of failing the whole tool, so existing output shapes are preserved.
 */
export async function loadAdrService(
  ctx: Pick<MCPContext, 'project' | 'storage'>
): Promise<ArchitectureDecisionService | undefined> {
  if (!ctx.storage) {
    return undefined;
  }

  try {
    const service = new ArchitectureDecisionService(new AdrStore(ctx.storage, ctx.project));

    await service.initialize();

    return service;
  } catch {
    return undefined;
  }
}

export async function loadRelevantAdrIds(
  ctx: Pick<MCPContext, 'project' | 'storage'>,
  input: AdrRelevanceInput
): Promise<string[] | undefined> {
  const service = await loadAdrService(ctx);

  if (!service) {
    return undefined;
  }

  try {
    return await relevantDecisionIds(service, input);
  } catch {
    return undefined;
  }
}

export async function loadRelevantAdrContext(
  ctx: Pick<MCPContext, 'project' | 'storage'>,
  input: AdrRelevanceInput
): Promise<AdrContextEntry[] | undefined> {
  const service = await loadAdrService(ctx);

  if (!service) {
    return undefined;
  }

  try {
    return await relevantDecisions(service, input);
  } catch {
    return undefined;
  }
}
