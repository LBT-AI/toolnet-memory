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

  runtime: 'src/index.ts',
  'graph-index': 'src/code-intelligence/test-index.ts',
  incremental: 'src/code-intelligence/test-incremental.ts',
  semantic: 'src/code-intelligence/test-semantic.ts',
  impact: 'src/code-intelligence/test-impact.ts',

  'full-index': 'src/production/full-index.ts',
  doctor: 'src/production/doctor.ts',
  provider: 'src/ai/provider-cli.ts',
  setup: 'src/production/setup.ts',
  'auto-integrate': 'src/production/auto-integrate.ts',
  mcp: 'src/mcp/bootstrap.ts',
  api: 'src/api/bootstrap.ts',
  service: 'src/service/daemon.ts',
  'service-cli': 'src/service/cli.ts',
  snapshot: 'src/production/snapshot-cli.ts',

  opencode: 'src/session/opencode/cli.ts',
  agy: 'src/session/agy/cli.ts',
  'agy-hook': 'src/session/agy/hook.ts',
  claude: 'src/session/claude/cli.ts',
  'claude-hook': 'src/session/claude/hook.ts',
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

console.log('✓ production bundles created');
