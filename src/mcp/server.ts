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
  memoryAgentAsk,
  memoryAgentAskSchema,
  contextOffloadRead,
  contextOffloadReadSchema,
  skillMemorySearch,
  skillMemorySearchSchema,
  wikiSearch,
  wikiSearchSchema,
  wikiRead,
  wikiReadSchema,
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

export const TOOLNET_MCP_SERVER_INSTRUCTIONS = [
  '# ToolNet Memory — Persistent Project Continuity',
  '',
  'ToolNet Memory provides persistent work continuity across coding agents and sessions.',
  '',
  'CONTINUITY RULES:',
  '',
  '1. When the user asks to continue, resume, finish, pick up, or return to previous work,',
  '   call memory_agent_ask BEFORE reconstructing previous work from git, files, or session history.',
  '',
  '2. Use memory_agent_ask with mode="local" for direct continuity facts such as:',
  '   - current task',
  '   - completed work',
  '   - current/last file',
  '   - TODOs',
  '   - blockers',
  '   - next action',
  '',
  '3. Use mode="ai" only when the continuity question is ambiguous or requires synthesis.',
  '',
  '4. NEVER reconstruct previous work by reading or searching raw agent/session history, including:',
  '   - .toolnet/sessions/**',
  '   - state.json',
  '   - events.jsonl',
  '   - raw transcripts',
  '   - ~/.gemini/antigravity-cli/brain/**',
  "   - another coding agent's internal session history",
  '',
  '5. Do not search the filesystem for the implementation or JSON schema of memory_agent_ask.',
  '   Invoke the MCP tool directly.',
  '',
  '6. After ToolNet resolves continuity, inspect the current repository only to verify current truth.',
  '   Current repository evidence overrides stale memory.',
  '',
  '7. Do not ask the user to repeat project context already available through ToolNet Memory.',
  '',
  '8. Do not call memory_agent_ask for unrelated coding questions when current context is sufficient.',
  '',
  '9. Large tool/file payloads may be stored outside prompt context.',
  '   If the compact graph references a needed asset, call context_offload_read.',
  '',
  '10. Never bulk-load offloaded assets. Read only the minimum asset required.',
].join('\\n');

export function createMCPServer(ctx: MCPContext) {
  const server = new McpServer(
    {
      name: 'toolnet-memory',

      version: '0.1.0',
    },
    {
      instructions: TOOLNET_MCP_SERVER_INSTRUCTIONS,
    }
  );

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

  server.tool(
    'memory_agent_ask',
    [
      'Ask ToolNet Memory Agent about previous project work.',
      'CALL THIS TOOL before guessing when the user asks to continue/resume previous work,',
      'mentions a previous agent/session, asks what was unfinished, what file was last touched,',
      'which TODOs are complete, blockers, decisions, or what should happen next.',
      'Use mode=local for direct state facts and mode=ai for composite or ambiguous continuity questions.',
      'Do not use it for unrelated coding questions when current repository context is already sufficient.',
      'Returns concise selected memory instead of raw transcripts or full memory dumps.',
      'Short conversational follow-ups are supported using compact ToolNet Memory focus; raw transcripts are never replayed.',
    ].join(' '),
    memoryAgentAskSchema,
    async (input) => jsonText(await memoryAgentAsk(ctx, input))
  );

  server.tool(
    'context_offload_read',
    [
      'Read one external ToolNet tool/file asset referenced by the compact context graph.',
      'Use only when needed for the current task.',
      'Never bulk-load all offloaded assets.',
    ].join(' '),
    contextOffloadReadSchema,
    async (input) => jsonText(await contextOffloadRead(ctx, input))
  );

  server.tool(
    'skill_memory_search',
    [
      'Search successful ToolNet project work promoted into reusable Skill Memory SOPs.',
      'Call this before repeating a task that may have been solved successfully before.',
      'Returns compact procedure steps, files and verification evidence.',
      'Raw transcripts are never returned.',
    ].join(' '),
    skillMemorySearchSchema,
    async (input) => jsonText(await skillMemorySearch(ctx, input))
  );

  server.tool(
    'wiki_search',
    [
      'Search the ToolNet project Wiki for durable project knowledge.',
      'Use Wiki before rereading broad project history when a maintained knowledge page may exist.',
      'Returns compact metadata; call wiki_read only for the page needed.',
    ].join(' '),
    wikiSearchSchema,
    async (input) => jsonText(await wikiSearch(ctx, input))
  );

  server.tool(
    'wiki_read',
    [
      'Read one ToolNet Wiki page by slug or id.',
      'Returns the maintained page plus compact backlinks.',
      'Do not bulk-read unrelated Wiki pages.',
    ].join(' '),
    wikiReadSchema,
    async (input) => jsonText(await wikiRead(ctx, input))
  );

  return server;
}

export async function startMCPServer(ctx: MCPContext) {
  const server = createMCPServer(ctx);

  const transport = new StdioServerTransport();

  await server.connect(transport);
}
