import type { CodeSymbol, GraphEdge, MemoryRecord, ProjectManifest } from '../core/types.js';

export type ToolNetServiceProject = Pick<ProjectManifest, 'id' | 'name' | 'remote' | 'rootPath'>;

export interface ToolNetServiceGraph {
  symbols: CodeSymbol[];
  edges: GraphEdge[];
}

export interface ToolNetServiceStats {
  pid: number;
  startedAt: string;
  requests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheEntries: number;
}

export type ToolNetServiceRequest =
  | {
      type: 'ping';
    }
  | {
      type: 'hydrate';
      project: ToolNetServiceProject;
    }
  | {
      type: 'invalidate';
      project: ToolNetServiceProject;
    };

export type ToolNetServiceResponse =
  | {
      ok: true;
      type: 'ping';
      stats: ToolNetServiceStats;
    }
  | {
      ok: true;
      type: 'hydrate';
      cacheHit: boolean;
      loadedAt: string;
      memory: MemoryRecord[];
      graph: ToolNetServiceGraph | null;
    }
  | {
      ok: true;
      type: 'invalidate';
      removed: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export interface ToolNetServiceProjectData {
  memory: MemoryRecord[];
  graph: ToolNetServiceGraph | null;
}
