import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { MCPContext } from './context.js';

import {
  memorySearch,
  memorySearchSchema,
  memoryRemember,
  memoryRememberSchema,
  memoryForget,
  memoryForgetSchema,
  findSymbol,
  findSymbolSchema,
  findCallers,
  findCallersSchema,
  searchCode,
  searchCodeSchema,
  projectContext,
  projectContextSchema,
  traceCalls,
  traceCallsSchema,
  analyzeImpact,
  analyzeImpactSchema,
  getProjectArchitecture,
  findDependencies,
  findDependenciesSchema,
  semanticCodeSearch,
  semanticCodeSearchSchema,
  snapshotCreate,
  snapshotCreateSchema,
  snapshotList,
  snapshotRestore,
  snapshotRestoreSchema,
  impactGuard,
  impactGuardSchema,
  graphDependents,
  graphDependentsSchema,
  graphPath,
  graphPathSchema,
  graphNeighborhood,
  graphNeighborhoodSchema,
  deadCode,
  deadCodeSchema,
} from './tools/index.js';

function jsonText(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,

        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

export function createMCPServer(ctx: MCPContext) {
  const server = new McpServer({
    name: 'toolnet-memory',

    version: '0.1.0',
  });

  server.tool(
    'memory_search',
    'Search relevant long-term memory for the current project.',
    memorySearchSchema,
    async (input) => jsonText(await memorySearch(ctx, input))
  );

  server.tool(
    'memory_save',
    'Save an important memory, decision, rule, TODO or summary.',
    memoryRememberSchema,
    async (input) => jsonText(await memoryRemember(ctx, input))
  );

  server.tool('memory_forget', 'Delete a memory by id.', memoryForgetSchema, async (input) =>
    jsonText(await memoryForget(ctx, input))
  );

  server.tool('find_symbol', 'Find code symbols by exact name.', findSymbolSchema, async (input) =>
    jsonText(await findSymbol(ctx, input))
  );

  server.tool(
    'find_callers',
    'Find functions or methods calling a symbol.',
    findCallersSchema,
    async (input) => jsonText(await findCallers(ctx, input))
  );

  server.tool(
    'code_search',
    'Search indexed code symbols and files.',
    searchCodeSchema,
    async (input) => jsonText(await searchCode(ctx, input))
  );

  server.tool(
    'project_context',
    'Get compact project architecture, recent memory and relevant context.',
    projectContextSchema,
    async (input) => jsonText(await projectContext(ctx, input))
  );

  server.tool(
    'trace_calls',
    'Trace callers or callees through the code call graph.',
    traceCallsSchema,
    async (input) => jsonText(await traceCalls(ctx, input))
  );

  server.tool(
    'analyze_impact',
    'Analyze what code can be affected if a symbol changes.',
    analyzeImpactSchema,
    async (input) => jsonText(await analyzeImpact(ctx, input))
  );

  server.tool(
    'get_architecture',
    'Get compact architecture statistics for the indexed project.',
    {},
    async () => jsonText(await getProjectArchitecture(ctx))
  );

  server.tool(
    'find_dependencies',
    'Find direct file dependencies and reverse dependents.',
    findDependenciesSchema,
    async (input) => jsonText(await findDependencies(ctx, input))
  );

  server.tool(
    'semantic_code_search',
    'Search source code by semantic meaning, not only exact symbol names.',
    semanticCodeSearchSchema,
    async (input) => jsonText(await semanticCodeSearch(ctx, input))
  );

  server.tool(
    'snapshot_create',
    'Create a safe versioned snapshot of project memory, vectors and graph.',
    snapshotCreateSchema,
    async (input) => jsonText(await snapshotCreate(ctx, input))
  );

  server.tool('snapshot_list', 'List available ToolNet Memory snapshots.', {}, async () =>
    jsonText(await snapshotList(ctx))
  );

  server.tool(
    'snapshot_restore',
    'Restore a previous ToolNet Memory snapshot. A safety snapshot is created first.',
    snapshotRestoreSchema,
    async (input) => jsonText(await snapshotRestore(ctx, input))
  );

  server.tool(
    'impact_guard',
    'Analyze blast radius before or after code changes. Maps changed files/lines to symbols, follows reverse dependencies, assigns risk and suggests verification targets.',
    impactGuardSchema,
    async (input) => jsonText(await impactGuard(ctx, input))
  );

  server.tool(
    'graph_dependents',
    'Find code symbols that depend on a symbol through calls, imports, type usage, writes, inheritance or implementation relationships.',
    graphDependentsSchema,
    async (input) => jsonText(await graphDependents(ctx, input))
  );

  server.tool(
    'graph_path',
    'Find the shortest dependency path between two code symbols.',
    graphPathSchema,
    async (input) => jsonText(await graphPath(ctx, input))
  );

  server.tool(
    'graph_neighborhood',
    'Explore incoming and outgoing dependency relationships around a code symbol.',
    graphNeighborhoodSchema,
    async (input) => jsonText(await graphNeighborhood(ctx, input))
  );

  server.tool(
    'dead_code',
    'Find likely unused code. Results are candidates and must be verified before deletion.',
    deadCodeSchema,
    async (input) => jsonText(await deadCode(ctx, input))
  );

  return server;
}

export async function startMCPServer(ctx: MCPContext) {
  const server = createMCPServer(ctx);

  const transport = new StdioServerTransport();

  await server.connect(transport);
}
