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
  selectTests,
  selectTestsSchema,
  runSelectedTestsTool,
  runSelectedTestsSchema,
  testRunStatusTool,
  testRunStatusSchema,
  releaseReadinessTool,
  releaseReadinessSchema,
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
  checkIndexCoverage,
  checkIndexCoverageSchema,
  fleetStatus,
  fleetStatusSchema,
  fleetProjects,
  fleetProjectsSchema,
  getGraphSchema,
  getGraphSchemaSchema,
  queryGraph,
  queryGraphSchema,
  verifyEvidence,
  verifyEvidenceSchema,
  ingestTraces,
  ingestTracesSchema,
  runtimeTraceStatusTool,
  runtimeTraceStatusSchema,
} from './tools/index.js';

import {
  knowledgeGovernanceStatus,
  knowledgeGovernanceStatusSchema,
} from './tools/knowledge-governance-status.js';

import { manageAdr, manageAdrSchema } from './tools/manage-adr.js';

import { manageGraphArtifact, manageGraphArtifactSchema } from './tools/manage-graph-artifact.js';

import { daemonStatus, daemonStatusSchema } from './tools/daemon-status.js';

import { toolnetStatus, toolnetStatusSchema } from './tools/toolnet-status.js';
import {
  taskList,
  taskListSchema,
  taskGet,
  taskGetSchema,
  taskCreate,
  taskCreateSchema,
  taskUpdate,
  taskUpdateSchema,
  taskStart,
  taskLifecycleSchema,
  taskBlock,
  taskBlockSchema,
  taskResume,
  taskComplete,
  taskProgress,
  taskProgressSchema,
  taskNextAction,
  taskNextActionSchema,
  taskDependencyAdd,
  taskDependencyRemove,
  taskDependencySchema,
  taskEvidenceAdd,
  taskEvidenceSchema,
  taskFileTouch,
  taskFileSchema,
  taskTestRecord,
  taskTestSchema,
  taskClaim,
  taskClaimSchema,
  taskHeartbeat,
  taskHeartbeatSchema,
  taskRelease,
  taskReleaseSchema,
  taskHandoff,
  taskHandoffSchema,
  taskNext,
  taskNextSchema,
  taskResumeContext,
  taskResumeContextSchema,
} from './tools/task-tools.js';

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
  '3. ToolNet Memory Agent is local-only; use mode="local" for all continuity questions.',
  '',
  '4. NEVER reconstruct previous work by reading or searching raw agent/session history, including:',
  '   - .toolnet/journal/**, .toolnet/runtime/sources/**, and legacy .toolnet/sessions/**',
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
  '',
  '11. Shared project Tasks are durable execution state.',
  '    When continuing planned project work, use task_next or task_get after continuity memory is resolved.',
  '',
  '12. Never reconstruct Tasks by reading .toolnet/tasks/events.jsonl or state.json directly.',
  '    Use Task MCP tools so revision, lifecycle, lease and dependency guards remain enforced.',
  '',
  'GRAPH COVERAGE & TRUST RULES (Phase 68):',
  '',
  '1. When a structural query (find_callers, trace_calls, graph_dependents, graph_path,',
  '   graph_neighborhood, analyze_impact, impact_guard, dead_code, find_symbol) returns no result,',
  '   inspect the coverage field before making a negative claim.',
  '',
  '2. If coverage.negativeClaimSafe is false (status partial/stale/unavailable), do not tell the',
  '   user that a symbol/caller/path/dependency definitely does not exist. State that it was not',
  '   found in the indexed graph and that graph coverage is limited.',
  '',
  '3. Use check_index_coverage when you need a dedicated coverage/freshness diagnosis before',
  '   asserting absence, or to verify freshness with the current repository state.',
  '',
  '4. Dead-code results are candidates only and must never be treated as authority to delete code.',
  '   If dead_code coverage.negativeClaimSafe is false, candidates are less trustworthy, not more.',
  '',
  '5. Positive query evidence remains valid even when coverage is partial; coverage only means',
  '   the graph may be missing additional results.',
  '',
  'CROSS-REPO / FLEET RULES (Phase 73):',
  '',
  '1. Fleet scope is only the ToolNet projects this install knows about (see fleet_projects).',
  '   Never claim organization-wide or internet-wide knowledge from the Fleet Graph.',
  '',
  '2. Cross-repo relationships keep their own edge types (CROSS_HTTP_CALLS, CROSS_EMITS,',
  '   CROSS_LISTENS_ON, CROSS_PACKAGE_DEPENDS_ON). They are never language-level CALLS.',
  '',
  '3. Before answering "does any repo call/depend on X?", use fleet_status and check',
  '   coverage.negativeClaimSafe. When it is false (partial/stale/unavailable or a stale/missing',
  '   project), say the relationship was not found in the verified Fleet Graph — do not say none exists.',
  '',
  '4. analyze_impact with includeCrossRepo=true returns crossRepoImpact with semantic path',
  '   evidence. If fleetCoverage.status is not complete, report that cross-repo blast radius may be',
  '   under-reported.',
  '',
  '5. Project graphs stay isolated: Fleet tools expose project identity and cross-project',
  "   relationships only, never another project's internal symbols or source.",
  '',
  'GRAPH QUERY RULES (Phase 74 — TGQL):',
  '',
  '1. Prefer the dedicated high-level tools (find_symbol, find_callers, graph_path,',
  '   graph_dependents, graph_neighborhood, trace_calls, analyze_impact) for common questions.',
  '   Use query_graph for ad-hoc combinations of several edge types, filters/projections,',
  '   cross-service or cross-repo exploration, and questions no dedicated tool covers.',
  '',
  '2. TGQL is read-only and bounded. Mutation clauses (CREATE, MERGE, DELETE, SET, REMOVE,',
  '   DROP, CALL, UNWIND, FOREACH, LOAD CSV) are rejected. Never try to write through it.',
  '',
  '3. Call get_graph_schema before writing non-trivial queries. Edge definitions report',
  '   status "active" vs "reserved" and currentlyProduced — reserved vocabulary (for example',
  '   CROSS_RPC_CALLS/CROSS_GRAPHQL_CALLS/CROSS_TRPC_CALLS) has no producer yet, so never',
  '   present those relationships as available knowledge.',
  '',
  '4. Every query result carries coverage. An empty result is NOT a negative claim: only when',
  '   coverage.negativeClaimSafe is true may you say the relationship does not exist. Otherwise',
  '   say it was not found in the verified graph.',
  '',
  '5. Do not issue broad unbounded queries. Keep LIMIT small, and treat "truncated: true" plus',
  '   nextCursor as "there is more", never as the complete answer.',
  '',
  'ARCHITECTURE DECISION RECORDS (Phase 75):',
  '',
  '1. Before changing an important module, check whether a decision constrains it: pass the',
  '   files/symbols you are about to touch to project_context (architectureDecisions), or read',
  '   analyze_impact.relevantADRs for a symbol. ADRs are context, not instructions.',
  '',
  '2. Use manage_adr to read (get, list, search, history, chain, export) and to write',
  '   (create, update, set_sections, change_status, supersede, import).',
  '',
  '3. Never treat a superseded, deprecated or rejected ADR as current guidance, and never',
  '   conclude that no decision exists from an empty list or search - say it was not found.',
  '',
  '4. Do not create or accept ADRs on your own initiative. Record a decision only when the user',
  '   asks for it, keep it proposed unless the user explicitly accepts it, and supersede rather',
  '   than editing history. Pass expectedRevision on updates so concurrent edits conflict',
  '   instead of silently overwriting.',
  '',
  '5. Import accepts canonical ADR Markdown only. Never infer decision fields from prose, and',
  '   never store credentials, tokens or connection strings in an ADR.',
  '',
  'PORTABLE GRAPH ARTIFACTS (Phase 76):',
  '',
  '1. An artifact is a DERIVED cache of the code graph. Never describe it as memory, task or',
  '   knowledge authority, and never use it to justify deleting or overwriting authoritative data.',
  '',
  '2. Use manage_graph_artifact with action=status before publishing or pulling, and action=publish',
  '   after a successful index when another machine should be able to reuse it.',
  '',
  '3. A failed pull is safe and expected when the local source differs from the artifact source.',
  '   The current graph is untouched; run a normal local index instead. Never retry a pull hoping',
  '   it will force adoption.',
  '',
  '4. Hydrating an artifact does not make coverage claims safe by itself. Coverage is re-evaluated',
  '   against the local source, so keep applying the normal negative-claim rules.',
  '',
  'LOCAL COORDINATION DAEMON (Phase 77):',
  '',
  '1. ToolNet may share one local daemon across agents and CLI processes so indexing, hydration',
  '   and the graph runtime are not duplicated. This is transparent: keep using the normal tools.',
  '',
  '2. Use daemon_status only for diagnostics (shared runtime state, resident projects, active jobs).',
  '   It is read-only and cannot start, stop or restart the daemon.',
  '',
  '3. Never try to shut down, restart or bypass the shared daemon from an agent tool call. A daemon',
  '   build/protocol mismatch is reported as a diagnostic; it must be resolved by the user through',
  "   the local CLI, not by killing another agent's runtime.",
  '',
  '4. The daemon is not an authority. Memory, Tasks, the Task WAL and ADRs remain in their own',
  '   persistent stores, and a daemon restart never loses them.',
  '',
  'EVIDENCE PROFILES (Phase 78 — Scout / Verify / Auditor):',
  '',
  '1. Use Scout for discovery: find a symbol, locate related code, collect a few callers. Scout',
  '   results are provisional. Never state "the only caller", "no callers", "safe to delete" or',
  '   "nothing depends on this" from Scout evidence.',
  '',
  '2. Use Verify before a task-critical conclusion (editing function X, checking the impact of a',
  '   route, confirming callers before a refactor, checking relevant ADRs). Verify checks coverage,',
  '   freshness and pagination before allowing a negative conclusion.',
  '',
  '3. Use Auditor for absence, uniqueness, exhaustive or dead-code claims, and for release or',
  '   security conclusions. Auditor needs a current generation, complete coverage for the declared',
  '   scope, exhausted pagination and no relevant unresolved references or source gaps.',
  '',
  '4. Call verify_evidence and state the claim explicitly (positive, negative, absence, uniqueness,',
  '   exhaustive, impact, dead_code). Never derive claim correctness from prose alone: the claim',
  '   kind is part of the request.',
  '',
  '5. Honor claimSafety. If decision is blocked or negativeClaimSafe is false, do not assert the',
  '   negative claim. Say it was not proven within the audited scope, and report the reason codes.',
  '',
  '6. Auditor is bounded exhaustive, never omniscient. A pass only covers the explicit scope',
  '   (project, path, symbol, or the registered Fleet participants). Never widen it to "all code".',
  '',
  '7. Reserved vocabulary (for example CROSS_RPC_CALLS) has no producer, so an absence claim over',
  '   it is never safe. Dead code is never automatically deletable, even after a clean audit.',
  '',
  '8. query_graph accepts evidenceProfile for ad-hoc queries; ordinary discovery keeps the default',
  '   behaviour, and the profile is only attached as metadata.',
  '',
  'CHANGE INTELLIGENCE (Phase 80 — impact_guard mode="change"):',
  '',
  '1. Before modifying high-impact code, run impact_guard with mode="change" to map the diff to',
  '   symbols, callers, routes, events, types, tests and ADR constraints. After significant edits,',
  '   re-run it against the current change.',
  '',
  '2. The change is described by the diff, the structure by the graph. An empty impact list is NOT',
  '   a safe change when coverage is partial: check guard.decision and guard.reasons.',
  '',
  '3. The regression guard reports sufficiency, never authorisation. safeToMerge and safeToDeploy',
  '   are always false; `clear` means only "no blocking issue detected within the verified scope".',
  '',
  '4. Before claiming "nothing else is affected", use evidenceProfile="auditor" and a bounded',
  '   scope. Runtime observations corroborate impact but never shrink the static blast radius, and',
  '   runtime absence never clears an impact.',
  '',
  'CONTRACT INTELLIGENCE (Phase 81 — impact_guard mode="change" includeContracts=true):',

  '1. Compatibility is decided by parsed structure and explicit deterministic rules, never by text',
  '   similarity and never by an LLM. Direction matters: making an optional request field required',
  '   is breaking; adding a response field is compatible; removing a guaranteed response field is',
  '   breaking.',

  '',
  '2. Structural compatibility is SEPARATE from consumer impact. A public API removing a required',
  '   response field is breaking even when zero consumers are known. Never treat "no consumers" as',
  '   "compatible".',

  '',
  '3. The contract guard reports sufficiency, never authorisation: safeToMerge and safeToDeploy are',
  '   always false. `compatible` means only "no deterministic incompatible contract change found',
  '   within the verified supported scope".',

  '',
  '4. Before claiming "no breaking contract change", use evidenceProfile="auditor" with a bounded',
  '   scope. An unsupported schema construct, an unresolved/blocked $ref or a partial coverage',
  '   state makes the claim incomplete, never compatible.',

  '',
  '5. Contract $refs are project-contained only. A remote (http/https) $ref is blocked and never',
  '   fetched; a ref escaping the project is blocked; ref cycles are bounded. No protoc, no npm',
  '   install, no network schema validation.',

  'TEST INTELLIGENCE (Phase 82 — select_tests / run_selected_tests / test_run_status):',

  '1. TEST PASS IS NEVER PROOF OF NO REGRESSION. A green selected-test run is evidence, never',
  '   authorisation: safeToMerge and safeToDeploy are always false, and test success removes only',
  '   TEST-SPECIFIC blockers, never coverage, contract or static blockers.',

  '',
  '2. Selection and execution are separate. select_tests is read-only and never runs anything.',
  '   Execution happens only through run_selected_tests with a selectionId ToolNet produced.',
  '   Never invent a test command; there is deliberately no command-string input.',

  '',
  '3. Categories are explicit (direct, contract, integration, transitive, related, e2e) and every',
  '   selected test carries a machine-readable reason code and its semantic path. There is no',
  '   relevance score; ordering is a deterministic tier order.',

  '',
  '4. IMPORTS alone is related evidence, NOT direct evidence. A file name never proves which',
  '   production symbol a test covers.',

  '',
  '5. "No tests cover X" is a negative claim. It requires evidenceProfile="auditor" and COMPLETE',
  '   test-discovery coverage. When discovery is partial, say "no known tests found in the indexed',
  '   scope" instead.',

  '',
  '6. A selection is bound to a change fingerprint and generation. If the working tree moves, the',
  '   run is stale (TEST_RESULT_STALE) and must never be presented as verification for the new',
  '   change.',

  '',
  '7. Test output may contain secrets and is sanitized. E2E tests are identified but never',
  '   auto-started (no browser, database, docker or service is launched). ToolNet never installs a',
  '   dependency and never enforces network isolation inside the target project, so it never',
  '   claims that it did.',

  'RUNTIME TRACE EVIDENCE (Phase 79):',
  '',
  '1. Runtime traces are EVIDENCE, never graph authority. A runtime observation never rewrites or',
  '   creates a static CALLS/HTTP_CALLS/EMITS edge, and an edge that was simply not observed at',
  '   runtime remains a valid static edge.',
  '',
  '2. NOT OBSERVED is never ABSENT. Never conclude "no caller", "no dependency", "dead code" or',
  '   "no client calls this endpoint" because a trace did not contain it. 100 executions that do',
  '   not call X do not prove production never calls X.',
  '',
  '3. Runtime absence can never make a negative or exhaustive claim safer. Use runtime observations',
  '   only to corroborate a positive finding, or to disprove a "never executed" claim about a',
  '   symbol that a trace proves did execute.',
  '',
  '4. Import traces explicitly with ingest_traces. ToolNet does not instrument processes, attach',
  '   debuggers, execute repository source, sniff packets or contact external tracing services.',
  '',
  '5. A runtime relation with no matching static edge is reported as RUNTIME_RELATION_NOT_IN_STATIC_GRAPH.',
  '   Treat it as a diagnostic (dynamic dispatch, reflection, generated code, unsupported parser or',
  '   a stale graph), never as a contradiction of the static graph.',
  '',
  '6. Runtime evidence carries a graph-generation compatibility (exact, source-compatible, stale or',
  '   unknown). Stale or unknown runtime evidence must not be presented as exact validation.',
  '',
  '7. Use runtime_trace_status for bounded trace-store state. Retention is bounded; traces are',
  '   derived state and are never part of Memory, Tasks, Sessions, ADRs or a graph artifact.',
  '',
  '8. analyze_impact with includeRuntimeEvidence=true returns runtimeObservedPaths SEPARATELY from',
  '   the static impacts list. The static blast radius is never reduced to the runtime-observed',
  '   subset, and runtime silence is never evidence that something has no impact.',
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

  server.tool(
    'find_symbol',
    [
      'Find code symbols by exact name in the indexed graph.',
      'An empty result means the symbol is absent from the indexed structural graph.',
      'It does NOT prove the symbol does not exist in the repository.',
      'Check check_index_coverage before making a repository-wide absence claim.',
    ].join(' '),
    findSymbolSchema,
    async (input) => jsonText(await findSymbol(ctx, input))
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
    'Legacy-compatible local code search using SQLite FTS5/BM25 lexical ranking. No embeddings or vector database.',
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
    [
      'Analyze blast radius before or after code changes. Maps changed files/lines to symbols, follows',
      'reverse dependencies, assigns risk and suggests verification targets.',
      'Phase 80: pass mode="change" for deterministic change intelligence over a git working tree,',
      'staged changes, a commit, a commit range or an explicit patch. The result maps semantic changes',
      '(body, signature, route, event, type, dependency) to direct/transitive/cross-service/cross-repo',
      'impact with a semantic path, maps tests and ADR constraints, and returns a structured',
      'regression guard (decision + reason codes). It relies on evidenceProfile for claim safety.',
      'The guard never approves a merge or a deployment: safeToMerge and safeToDeploy are always false.',
      'Git reads are read-only; no source or test is executed. For a read-only check use',
      'mode="git_diff" or mode="file".',
      'Phase 81: pass includeContracts=true to additionally run structural contract-compatibility',
      'analysis (HTTP/OpenAPI, GraphQL, gRPC/proto, exported types/interfaces, package exports and',
      'event channels). The result then carries contractCompatibility: structural deltas, request vs',
      'response direction, known consumers, coverage gaps and a contract guard. Compatibility is',
      'structural and independent of whether a consumer is known; a remote $ref is never fetched.',
      'Phase 82: pass includeTests=true to additionally run deterministic change-to-test selection',
      '(direct/contract/integration/transitive/related/e2e with reason codes). Selection is read-only',
      'and never executes a test; a passing test is evidence, never authorisation.',
    ].join(' '),
    impactGuardSchema,
    async (input) => jsonText(await impactGuard(ctx, input))
  );

  server.tool(
    'select_tests',
    [
      'Deterministically select the tests a change should run. Read-only: it maps a Phase 80 change',
      '(and optional Phase 81 contract analysis) to direct/contract/integration/transitive/related/e2e',
      'tests with machine-readable reason codes and semantic paths, plus uncovered changed entities',
      'and complete test-discovery coverage. Never executes a test. "No tests cover X" is a negative',
      'claim that requires evidenceProfile="auditor" and complete discovery.',
    ].join(' '),
    selectTestsSchema,
    async (input) => jsonText(await selectTests(ctx, input))
  );

  server.tool(
    'run_selected_tests',
    [
      'Explicitly execute a selection ToolNet previously produced (pass its selectionId, optionally a',
      'validated test subset). There is no command-string input: argv is built per framework and the',
      'executable is resolved from the project tooling (no installation, no network by default).',
      'Every run is bounded by a timeout and an output budget, and output is secret-sanitized. A',
      'passing run never authorises a merge or a deployment (safeToMerge/safeToDeploy are always false)',
      'and never clears coverage, contract or static blockers.',
    ].join(' '),
    runSelectedTestsSchema,
    async (input) => jsonText(await runSelectedTestsTool(ctx, input))
  );

  server.tool(
    'test_run_status',
    'Read-only bounded status of derived test-run evidence: the latest selection identity plus recent run summaries (status, counts, staleness). Never returns raw logs.',
    testRunStatusSchema,
    async (input) => jsonText(await testRunStatusTool(ctx, input))
  );

  server.tool(
    'release_readiness',
    [
      'Phase 83: deterministic release-readiness analysis for this project (read-only).',
      'Reports source vs packaged capability parity, version/manifest truth, public-surface',
      'compatibility (MCP tools, CLI commands, daemon protocol, artifact schema), npm package',
      'contents and secret/cache leak audit, bundle freshness, certification inventory and a',
      'structured readiness decision with machine-readable reason codes and an advisory semver',
      'recommendation. Never commits, pushes, tags, bumps a version or publishes; readiness is',
      'scoped to verified declared surfaces and is never a global safety guarantee.',
    ].join(' '),
    releaseReadinessSchema,
    async (input) => jsonText(await releaseReadinessTool(ctx, input))
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
    [
      'Find likely unused code. Results are candidates and must be verified before deletion.',
      'Trust metadata is attached: with partial/stale graph coverage, absence of usage edges',
      'is weaker evidence, never a deletion authority.',
    ].join(' '),
    deadCodeSchema,
    async (input) => jsonText(await deadCode(ctx, input))
  );

  server.tool(
    'check_index_coverage',
    [
      'Check deterministic graph coverage and freshness before making a negative structural claim',
      '("symbol/caller/dependency does not exist").',
      'Returns capability-specific status, negativeClaimSafe, reason codes and optional manifest',
      'freshness verification (verifyFreshness defaults to true for safe behavior).',
      'No LLM, embeddings or vector database are involved.',
    ].join(' '),
    checkIndexCoverageSchema,
    async (input) => jsonText(await checkIndexCoverage(ctx, input))
  );

  server.tool(
    'fleet_status',
    [
      'Report the derived cross-repo Fleet Graph status: registered/available/stale projects,',
      'cross-project edge counts, unresolved references and fleet coverage.',
      'The Fleet scope is only the ToolNet projects this install knows about, never an entire organization.',
      'With partial or stale fleet coverage, a negative cross-repo claim ("no repo calls this")',
      'is not safe. No source contents are returned; no network access is performed.',
    ].join(' '),
    fleetStatusSchema,
    async (input) => jsonText(await fleetStatus(ctx, input))
  );

  server.tool(
    'fleet_projects',
    [
      'List the ToolNet projects in the Fleet Graph with identity, availability, generation and',
      'staleness. Metadata only — never returns source contents, symbols or project internals.',
    ].join(' '),
    fleetProjectsSchema,
    async (input) => jsonText(await fleetProjects(ctx, input))
  );

  server.tool(
    'get_graph_schema',
    [
      'Return the machine-readable ToolNet Graph Query Language (TGQL) schema: node types,',
      'edge types with active/reserved status and producers, queryable properties, supported',
      'clauses and hard limits.',
      'Call this before writing non-trivial query_graph queries. Reserved edge vocabulary',
      '(for example CROSS_RPC_CALLS/CROSS_GRAPHQL_CALLS/CROSS_TRPC_CALLS) is queryable but has no',
      'producer yet and is reported with currentlyProduced=false.',
    ].join(' '),
    getGraphSchemaSchema,
    async (input) => jsonText(await getGraphSchema(ctx, input))
  );

  server.tool(
    'query_graph',
    [
      'Run a bounded, read-only TGQL graph query over the project graph (default) or the Fleet overlay.',
      'Example: MATCH (f:Function)-[:CALLS]->(g:Function) WHERE f.name = $name RETURN f, g LIMIT 50.',
      'Supported clauses: MATCH, WHERE, RETURN, ORDER BY, LIMIT, SKIP. Mutation clauses are rejected.',
      'Results include coverage; when coverage.negativeClaimSafe is false an empty result is not',
      'evidence of absence. Use explain=true to inspect the plan without executing.',
    ].join(' '),
    queryGraphSchema,
    async (input) => jsonText(await queryGraph(ctx, input))
  );

  server.tool(
    'manage_adr',
    [
      'Manage project Architecture Decision Records (ADR): the durable "why" behind the code.',
      'Read actions: get, list, search, history, chain, export.',
      'Write actions: create, update, set_sections, change_status, supersede, import.',
      'ADRs are project-scoped, revision-guarded (expectedRevision) and audited; mutations are',
      'idempotent on retry. Status transitions are explicit and supersession cycles are rejected.',
      'Import accepts canonical ADR Markdown only; fields are never guessed by an LLM.',
    ].join(' '),
    manageAdrSchema,
    async (input) => jsonText(await manageAdr(ctx, input))
  );

  server.tool(
    'manage_graph_artifact',
    [
      'Manage the portable code-intelligence artifact: the DERIVED graph cache that lets a second',
      'machine reuse this machine index instead of re-parsing the repository.',
      'Actions: status, publish, pull, verify, list, prune.',
      'An artifact is derived state only: it never carries or overwrites Memory, Tasks, Sessions,',
      'ADRs, the Wiki or the Project Manual, and a failed pull always leaves the current graph intact.',
      'The local code-search cache is never shipped; it is rebuilt locally after a pull.',
      'Prefer publish after a successful index, and pull only when the local graph is absent or stale.',
    ].join(' '),
    manageGraphArtifactSchema,
    async (input) => jsonText(await manageGraphArtifact(ctx, input))
  );

  server.tool(
    'daemon_status',
    [
      'Read-only diagnostics for the local coordination daemon that shares indexing, hydration and',
      'the graph runtime across agents and CLI processes.',
      'Reports the daemon instance, build fingerprint, sessions, resident projects, active jobs and',
      'watcher count. Use scope=project for this project runtime state.',
      'This tool never starts, stops or restarts the daemon; shutdown is a trusted local CLI action.',
    ].join(' '),
    daemonStatusSchema,
    async (input) => jsonText(await daemonStatus(ctx, input))
  );

  server.tool(
    'verify_evidence',
    [
      'Run a profile-driven evidence check and get a structured claim-safety decision.',
      'Profiles: scout (fast discovery, provisional only), verify (task-critical verification),',
      'auditor (bounded exhaustive: absence, uniqueness, exhaustive, dead-code, release/security).',
      'State the claim explicitly; ToolNet never derives claim correctness from prose.',
      'Scout evidence can never support a negative or exhaustive conclusion. Auditor requires a',
      'current generation, complete coverage, exhausted pagination and no relevant unresolved',
      'references or unclosed source gaps; exceeding a limit reports incomplete, never complete.',
      'Reserved edge vocabulary has no producer and blocks absence claims. Dead code is never',
      'auto-deletable. The scope must be explicit and bounded (Fleet claims need a project list).',
      'No LLM, embeddings or vector database are used.',
    ].join(' '),
    verifyEvidenceSchema,
    async (input) => jsonText(await verifyEvidence(ctx, input))
  );

  server.tool(
    'ingest_traces',
    [
      'Import an EXPLICIT runtime trace payload as supporting evidence for the static graph.',
      'ToolNet never instruments a process, attaches a debugger, executes repository source or',
      'fetches a URL: the caller must supply the trace (ToolNet trace JSON or exported OTLP spans).',
      'Runtime evidence CORROBORATES the static graph and never replaces it: a runtime observation',
      'never rewrites a CALLS edge, and NOT observing a call at runtime is never proof that it',
      'does not exist. Runtime data can never ground an absence, uniqueness or dead-code claim.',
      'Imports are atomic and idempotent: an identical payload resolves to the same session and is',
      'a no-op. Secrets (authorization, cookies, tokens, passwords, credentialed URLs) and request',
      'or response bodies are never persisted. Use prune=true for bounded retention.',
    ].join(' '),
    ingestTracesSchema,
    async (input) => jsonText(await ingestTraces(ctx, input))
  );

  server.tool(
    'runtime_trace_status',
    [
      'Read-only status of the project runtime trace evidence: sessions, compatibility, observation',
      'count, storage usage and retention policy. No raw trace payload is returned.',
      'Runtime absence is never reported as absence of code: canEstablishAbsence is always false.',
      'Use prune=true (optionally dryRun=true) to apply bounded retention.',
    ].join(' '),
    runtimeTraceStatusSchema,
    async (input) => jsonText(await runtimeTraceStatusTool(ctx, input))
  );

  server.tool(
    'memory_agent_ask',
    [
      'Ask ToolNet Memory Agent about previous project work.',
      'CALL THIS TOOL before guessing when the user asks to continue/resume previous work,',
      'mentions a previous agent/session, asks what was unfinished, what file was last touched,',
      'which TODOs are complete, blockers, decisions, or what should happen next.',
      'Use mode=local for continuity questions. Memory Agent is deterministic and local-only; no external AI provider is used.',
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

  server.tool(
    'task_list',
    'List durable project-shared Tasks with optional hierarchy/status filters.',
    taskListSchema,
    async (input) => jsonText(await taskList(ctx, input))
  );
  server.tool('task_get', 'Read one durable project Task by id.', taskGetSchema, async (input) =>
    jsonText(await taskGet(ctx, input))
  );
  server.tool(
    'task_create',
    'Create a project-shared Goal, Task or Subtask.',
    taskCreateSchema,
    async (input) => jsonText(await taskCreate(ctx, input))
  );
  server.tool(
    'task_update',
    'Update Task metadata using optional revision protection.',
    taskUpdateSchema,
    async (input) => jsonText(await taskUpdate(ctx, input))
  );
  server.tool(
    'task_start',
    'Move a pending Task into active state.',
    taskLifecycleSchema,
    async (input) => jsonText(await taskStart(ctx, input))
  );
  server.tool(
    'task_block',
    'Block an active Task with a durable reason and optional next action.',
    taskBlockSchema,
    async (input) => jsonText(await taskBlock(ctx, input))
  );
  server.tool('task_resume', 'Resume a blocked Task.', taskLifecycleSchema, async (input) =>
    jsonText(await taskResume(ctx, input))
  );
  server.tool(
    'task_complete',
    'Complete a Task only when deterministic completion guards pass.',
    taskLifecycleSchema,
    async (input) => jsonText(await taskComplete(ctx, input))
  );
  server.tool(
    'task_progress',
    'Set explicit deterministic Task progress such as 5/10.',
    taskProgressSchema,
    async (input) => jsonText(await taskProgress(ctx, input))
  );
  server.tool(
    'task_next_action',
    'Set or clear the durable next action for a Task.',
    taskNextActionSchema,
    async (input) => jsonText(await taskNextAction(ctx, input))
  );
  server.tool(
    'task_dependency_add',
    'Add a Task dependency with self/cycle protection.',
    taskDependencySchema,
    async (input) => jsonText(await taskDependencyAdd(ctx, input))
  );
  server.tool(
    'task_dependency_remove',
    'Remove a Task dependency.',
    taskDependencySchema,
    async (input) => jsonText(await taskDependencyRemove(ctx, input))
  );
  server.tool(
    'task_evidence_add',
    'Attach manual durable evidence to a Task.',
    taskEvidenceSchema,
    async (input) => jsonText(await taskEvidenceAdd(ctx, input))
  );
  server.tool(
    'task_file_touch',
    'Record a file touched by the current Task.',
    taskFileSchema,
    async (input) => jsonText(await taskFileTouch(ctx, input))
  );
  server.tool(
    'task_test_record',
    'Record pass/fail/skip test evidence for a Task.',
    taskTestSchema,
    async (input) => jsonText(await taskTestRecord(ctx, input))
  );
  server.tool(
    'task_claim',
    'Claim Task execution using the Phase 35 bounded agent lease.',
    taskClaimSchema,
    async (input) => jsonText(await taskClaim(ctx, input))
  );
  server.tool(
    'task_heartbeat',
    'Renew the current agent lease; fails closed for expired, foreign, or conflicted ownership.',
    taskHeartbeatSchema,
    async (input) => jsonText(await taskHeartbeat(ctx, input))
  );
  server.tool(
    'task_resume_context',
    'Build bounded durable execution context for resuming a Task.',
    taskResumeContextSchema,
    async (input) => jsonText(await taskResumeContext(ctx, input))
  );
  server.tool(
    'task_release',
    'Release a Task execution lease held by the requesting agent.',
    taskReleaseSchema,
    async (input) => jsonText(await taskRelease(ctx, input))
  );
  server.tool(
    'task_handoff',
    'Transfer active Task execution from one agent to another without losing state.',
    taskHandoffSchema,
    async (input) => jsonText(await taskHandoff(ctx, input))
  );
  server.tool(
    'task_next',
    'Resolve the deterministic next/resume Task for an agent; optionally claim it.',
    taskNextSchema,
    async (input) => jsonText(await taskNext(ctx, input))
  );
  server.tool(
    'toolnet_status',
    [
      'Inspect ToolNet MCP runtime health plus durable memory pipeline health.',
      'Returns dependency readiness, degraded state, retry counts,',
      'startup timing, hydration timing, storage source and project data counts.',
      'The memory section separates integration configuration from runtime capture:',
      'capture/wal/journal/memoryStore/materialization states, pending materialization,',
      'last capture and last materialization, and per-agent capture modes.',
      'Only metadata, counts and coded reasons are returned — never session content or secrets.',
    ].join(' '),
    toolnetStatusSchema,
    async () => jsonText(await toolnetStatus(ctx))
  );

  server.tool(
    'knowledge_governance_status',
    [
      'Inspect ToolNet Knowledge Governance health.',
      'Returns review counts, confidence, conflicts, stale knowledge, and optional compact pending reviews.',
      'Use this before trusting or changing important durable project knowledge.',
    ].join(' '),
    knowledgeGovernanceStatusSchema,
    async (input) => jsonText(await knowledgeGovernanceStatus(ctx, input))
  );

  return server;
}

export async function startMCPServer(ctx: MCPContext) {
  const server = createMCPServer(ctx);

  const transport = new StdioServerTransport();

  await server.connect(transport);
}
