import { createHash } from 'node:crypto';

import type { CodeSymbol, GraphEdge } from '../../core/types.js';
import {
  EDGE_SEMANTIC_REGISTRY,
  type EdgeSemanticDefinition,
  type GraphEdgeType,
  isEdgeTypeAllowed as checkEdgeTypeAllowed,
} from './edge-semantic-registry.js';
import { createEdgeProvenance, type EdgeProvenance } from './edge-provenance.js';

export interface EdgeFactoryOptions {
  projectId: string;
  from: string;
  to: string;
  type: GraphEdgeType;
  provenance: EdgeProvenance;
  sites?: Array<{ filePath: string; line?: number }>;
  metadata?: Record<string, unknown>;
}

export function createGraphEdge(options: EdgeFactoryOptions): GraphEdge {
  const { projectId, from, to, type, provenance, sites, metadata } = options;

  const definition = EDGE_SEMANTIC_REGISTRY[type];
  if (!definition) {
    throw new Error(`Unknown edge type: ${type}`);
  }

  const id = createHash('sha256')
    .update(`${projectId}:${from}:${type}:${to}`)
    .digest('hex')
    .slice(0, 24);

  const edgeMetadata: Record<string, unknown> = {
    ...metadata,
    provenance,
  };

  if (sites && sites.length > 0) {
    const boundedSites = sites.slice(0, 100);
    edgeMetadata.sites = boundedSites;
    edgeMetadata.siteCount = sites.length;
    edgeMetadata.sitesTruncated = sites.length > 100;
  }

  return {
    id,
    projectId,
    from,
    to,
    type,
    metadata: edgeMetadata,
  };
}
