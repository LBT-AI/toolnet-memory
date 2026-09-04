import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const out = 'bundle';

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const entries = {
  init: 'src/production/init.ts',
  update: 'src/production/update.ts',
  config: 'src/production/config-cli.ts',
  'status-cli': 'src/production/status-cli.ts',
  'graph-cli': 'src/production/graph-cli.ts',
  'help-cli': 'src/production/help-cli.ts',
  'graph-ui': 'src/visualization/server.ts',

  runtime: 'src/index.ts',
  'graph-index': 'src/code-intelligence/test-index.ts',
  incremental: 'src/code-intelligence/test-incremental.ts',
  semantic: 'src/code-intelligence/test-semantic.ts',
  impact: 'src/code-intelligence/test-impact.ts',

  'full-index': 'src/production/full-index.ts',
  doctor: 'src/production/doctor.ts',
  'auto-integrate': 'src/production/auto-integrate.ts',
  mcp: 'src/mcp/bootstrap.ts',
  api: 'src/api/bootstrap.ts',
  service: 'src/service/daemon.ts',
  'service-cli': 'src/service/cli.ts',
  'docker-healthcheck': 'src/service/docker-healthcheck.ts',
  snapshot: 'src/production/snapshot-cli.ts',
  gc: 'src/retention/cli.ts',
  audit: 'src/audit/cli.ts',
  'code-capabilities': 'src/code-intelligence/parsers/capability-cli.ts',
  'task-cli': 'src/tasks/cli.ts',

  opencode: 'src/session/opencode/cli.ts',
  agy: 'src/session/agy/cli.ts',
  'agy-hook': 'src/session/agy/hook.ts',
  claude: 'src/session/claude/cli.ts',
  'claude-hook': 'src/session/claude/hook.ts',
  kiro: 'src/session/kiro/cli.ts',
  'kiro-hook': 'src/session/kiro/hook.ts',

  cursor: 'src/session/cursor/cli.ts',
  'cursor-hook': 'src/session/cursor/hook.ts',
  copilot: 'src/session/copilot/cli.ts',
  'copilot-hook': 'src/session/copilot/hook.ts',
  grok: 'src/session/grok/cli.ts',
  'grok-hook': 'src/session/grok/hook.ts',
  'toolnet-cli': 'src/session/toolnet-cli/cli.ts',
  'background-refresh': 'src/multi-host/background-refresh-cli.ts',
  kilo: 'src/session/kilo/cli.ts',
  'integration-status': 'src/session/new-agents/scoped-status-cli.ts',
  'continuity-certify': 'src/production/continuity-certify-cli.ts',
  'recovery-certify': 'src/production/recovery-certify-cli.ts',
  'production-certify': 'src/production/production-certify-cli.ts',

  codex: 'src/session/codex/cli.ts',
  'codex-context': 'src/session/codex/context-hook.ts',

  learner: 'src/session/learner/cli.ts',
  'project-manual': 'src/project-manual/cli.ts',

  'work-continuity': 'src/work-continuity/cli.ts',
  'handoff-refresh': 'src/work-continuity/handoff-cli.ts',
  'memory-query': 'src/work-continuity/memory-query-cli.ts',
  'memory-agent': 'src/work-continuity/memory-agent-cli.ts',
  context: 'src/work-continuity/context-cli.ts',
  'context-runtime': 'src/work-continuity/context-runtime-cli.ts',

  // Shimmer progress worker (must be separate entry for Worker thread)
  'shimmer-worker': 'src/production/ui/shimmer-worker.ts',
};

await build({
  entryPoints: entries,
  outdir: out,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external',
  sourcemap: false,
  minify: true,
  legalComments: 'none',
});

// Package the existing ToolNet Graph UI with the production bundle.
// package.json already publishes the complete `bundle` directory.
const graphPublicDir = path.join(out, 'public');
const graphVendorDir = path.join(graphPublicDir, 'vendor');

fs.mkdirSync(graphVendorDir, {
  recursive: true,
});

fs.copyFileSync('src/visualization/public/index.html', path.join(graphPublicDir, 'index.html'));

fs.copyFileSync(
  'node_modules/3d-force-graph/dist/3d-force-graph.min.js',
  path.join(graphVendorDir, '3d-force-graph.min.js')
);

console.log('✓ production bundles created');
