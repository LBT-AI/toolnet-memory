export type RepositoryCapabilityStatus =
  'supported' | 'unsupported' | 'legacy-removed' | 'compatibility';
export interface RepositoryCapability {
  id: string;
  status: RepositoryCapabilityStatus;
  implementation?: string;
  replacement?: string;
  note: string;
}
export const REPOSITORY_CAPABILITIES: readonly RepositoryCapability[] = [
  {
    id: 'storage.local',
    status: 'supported',
    implementation: 'src/storage/local',
    note: 'Local storage provider is implemented and supported.',
  },
  {
    id: 'storage.huggingface',
    status: 'supported',
    implementation: 'src/storage/huggingface',
    note: 'Hugging Face S3-compatible storage is implemented and supported.',
  },
  {
    id: 'storage.s3',
    status: 'supported',
    implementation: 'src/storage/s3',
    note: 'S3-compatible storage is implemented and supported.',
  },
  {
    id: 'storage.r2',
    status: 'supported',
    implementation: 'src/storage/s3',
    note: 'Cloudflare R2 uses the implemented S3-compatible provider.',
  },
  {
    id: 'storage.google-drive',
    status: 'unsupported',
    implementation: 'none',
    note: 'Google Drive storage is not implemented. Existing frozen placeholder files are not a supported backend.',
  },
  {
    id: 'storage.github',
    status: 'unsupported',
    implementation: 'none',
    note: 'GitHub storage is not implemented. Existing frozen placeholder files are not a supported backend.',
  },
  {
    id: 'security.client-side-encryption',
    status: 'unsupported',
    implementation: 'none',
    note: 'ToolNet Memory does not provide client-side encryption in this release and does not require an encryption key.',
  },
  {
    id: 'sync.legacy-engine',
    status: 'legacy-removed',
    implementation: 'none',
    replacement: 'src/multi-host',
    note: 'The old src/sync scaffold was never implemented. Multi-host convergence is implemented by the append-only operation architecture under src/multi-host.',
  },
  {
    id: 'retrieval.bm25',
    status: 'supported',
    implementation: 'src/retrieval/bm25.ts',
    note: 'Deterministic lexical retrieval uses BM25.',
  },
  {
    id: 'retrieval.hybrid-ranking',
    status: 'supported',
    implementation: 'src/retrieval/hybrid-search.ts',
    note: 'Hybrid ranking combines deterministic local retrieval signals. It does not require embeddings.',
  },
  {
    id: 'retrieval.query-classifier',
    status: 'unsupported',
    implementation: 'none',
    note: 'The previous empty query-classifier scaffold is not an implemented runtime capability.',
  },
  {
    id: 'retrieval.query-expansion',
    status: 'unsupported',
    implementation: 'none',
    note: 'No synonym, LLM, embedding, or semantic query-expansion subsystem is implemented.',
  },
  {
    id: 'retrieval.dedicated-graph-search-layer',
    status: 'unsupported',
    implementation: 'none',
    note: 'The old empty src/retrieval/graph scaffold is not the active code graph implementation.',
  },
  {
    id: 'retrieval.model-reranker',
    status: 'unsupported',
    implementation: 'none',
    note: 'No model-based reranker is used by the deterministic runtime.',
  },
  {
    id: 'mcp.memory-rules-dedicated-tool',
    status: 'unsupported',
    implementation: 'none',
    replacement: 'memory-search',
    note: 'No dedicated memory-rules MCP tool is registered. Rules remain searchable through the implemented memory tools.',
  },
  {
    id: 'mcp.memory-todos-dedicated-tool',
    status: 'unsupported',
    implementation: 'none',
    replacement: 'memory-search',
    note: 'No dedicated memory-todos MCP tool is registered.',
  },
  {
    id: 'mcp.memory-decisions-dedicated-tool',
    status: 'unsupported',
    implementation: 'none',
    replacement: 'memory-search',
    note: 'No dedicated memory-decisions MCP tool is registered.',
  },
  {
    id: 'mcp.memory-recent-dedicated-tool',
    status: 'unsupported',
    implementation: 'none',
    replacement: 'memory-search',
    note: 'No dedicated memory-recent MCP tool is registered.',
  },
  {
    id: 'mcp.index-repository-dedicated-tool',
    status: 'unsupported',
    implementation: 'none',
    replacement: 'CLI index command',
    note: 'The empty MCP index-repository scaffold was never a registered tool.',
  },
];
export function repositoryCapability(id: string): RepositoryCapability | undefined {
  return REPOSITORY_CAPABILITIES.find((capability) => capability.id === id);
}
export function repositoryCapabilitySupported(id: string): boolean {
  return repositoryCapability(id)?.status === 'supported';
}
