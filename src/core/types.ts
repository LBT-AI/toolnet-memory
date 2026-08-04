export type MemoryType =
  | "code"
  | "activity"
  | "decision"
  | "rule"
  | "todo"
  | "summary";

export type ImportanceLevel =
  | "critical"
  | "high"
  | "normal"
  | "temporary";

export interface MemoryRecord {
  id: string;
  projectId: string;
  type: MemoryType;
  content: string;

  importance: ImportanceLevel;
  importanceScore: number;

  tags: string[];
  source: string;

  createdAt: string;
  updatedAt: string;
  expiresAt?: string;

  metadata?: Record<string, unknown>;
}

export interface ActivityEvent {
  id: string;
  projectId: string;

  type:
    | "session_start"
    | "session_end"
    | "user_prompt"
    | "tool_call"
    | "file_read"
    | "file_write"
    | "command"
    | "test"
    | "error"
    | "commit"
    | "deploy"
    | "decision"
    | "todo";

  timestamp: string;
  data: Record<string, unknown>;
}

export interface ProjectManifest {
  id: string;
  name: string;

  /**
   * Stable remote namespace inside:
   * projects/<remote>/
   *
   * Optional for backwards compatibility with older manifests.
   */
  remote?: string;

  rootPath: string;

  createdAt: string;
  updatedAt: string;

  graphVersion: number;
  memoryVersion: number;

  metadata?: Record<string, unknown>;
}

export interface SearchQuery {
  projectId: string;
  query: string;

  types?: MemoryType[];
  tags?: string[];

  limit?: number;
  minImportanceScore?: number;
}

export interface SearchResult {
  memory: MemoryRecord;
  score: number;

  source:
    | "bm25"
    | "vector"
    | "graph"
    | "recent"
    | "important"
    | "memory";
}

export interface CodeSymbol {
  id: string;
  projectId: string;

  name: string;
  qualifiedName?: string;

  type:
    | "file"
    | "module"
    | "class"
    | "interface"
    | "function"
    | "method"
    | "route"
    | "property"
    | "service";

  filePath: string;

  startLine?: number;
  endLine?: number;

  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;

  projectId: string;

  from: string;
  to: string;

  type:
    | "CALLS"
    | "IMPORTS"
    | "ROUTE"
    | "TESTS"
    | "USES_TYPE"
    | "WRITES"
    | "CALL_REFERENCE"
    | "DEFINES"
    | "INHERITS"
    | "IMPLEMENTS"
    | "HTTP_CALLS"
    | "READS"
    | "WRITES";

  metadata?: Record<string, unknown>;
}
