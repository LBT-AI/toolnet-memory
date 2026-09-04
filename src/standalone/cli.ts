declare const __TOOLNET_VERSION__: string;

type ModuleLoader = () => Promise<unknown>;

const VERSION = __TOOLNET_VERSION__;

process.env.TOOLNET_STANDALONE = '1';
process.title = 'toolnet-memory';

function standalonePlatform(): string {
  return [process.platform, process.arch].join('-');
}

function unsupported(title: string, detail: string): void {
  console.error('');
  console.error(`ToolNet standalone: ${title}`);
  console.error('');
  console.error(detail);
  console.error('');
  process.exitCode = 2;
}

async function runModule(args: string[], loader: ModuleLoader): Promise<void> {
  process.argv = [process.execPath, process.execPath, ...args];
  await loader();
}

async function runGraph(args: string[]): Promise<void> {
  // The npm CLI launches graph-ui.js as a child process.
  // A single-file executable has no sibling graph-ui.js, therefore the
  // standalone binary runs the same graph server directly in this process.
  // Phase 25 security still applies because this imports the same
  // visualization server implementation.
  process.argv = [process.execPath, process.execPath, ...args];
  await import('../visualization/server.js');
}

function serviceLifecycleUnsupported(command: string): void {
  unsupported(
    command,
    [
      'Background service installation is not bundled into the standalone binary yet.',
      '',
      'Foreground daemon:',
      '  toolnet-memory service',
      '',
      'For managed startup use your operating system service manager,',
      'Docker, or the npm/PM2 distribution.',
    ].join('\n')
  );
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const command = rawArgs[0] ?? 'context:print';
  const args = rawArgs.slice(1);

  if (command === '--version' || command === '-v') {
    console.log(`v${VERSION}`);
    return;
  }

  switch (command) {
    case 'init':
      await runModule(args, () => import('../production/init.js'));
      return;
    case 'ask':
      await runModule(args, () => import('../work-continuity/memory-query-cli.js'));
      return;
    case 'background:refresh':
      await runModule(args, () => import('../multi-host/background-refresh-cli.js'));
      return;
    case 'handoff:refresh':
      await runModule(args, () => import('../work-continuity/handoff-cli.js'));
      return;
    case 'update':
      unsupported(
        'update',
        [
          'npm-based self-update is not used by standalone binaries.',
          '',
          'Download the matching executable from the ToolNet Memory GitHub Release.',
          `Current standalone version: v${VERSION}`,
        ].join('\n')
      );
      return;
    case 'config':
      await runModule(args, () => import('../production/config-cli.js'));
      return;
    case 'doctor':
      await runModule(args, () => import('../production/doctor.js'));
      return;
    case 'gc':
      await runModule(args, () => import('../retention/cli.js'));
      return;
    case 'audit':
      await runModule(args, () => import('../audit/cli.js'));
      return;
    case 'audit:verify':
      await runModule(['verify', ...args], () => import('../audit/cli.js'));
      return;
    case 'code:capabilities':
      await runModule(args, () => import('../code-intelligence/parsers/capability-cli.js'));
      return;
    case 'task:list':
      await runModule(['list', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:show':
      await runModule(['show', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:create':
      await runModule(['create', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:update':
      await runModule(['update', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:start':
      await runModule(['start', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:block':
      await runModule(['block', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:resume':
      await runModule(['resume', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:complete':
      await runModule(['complete', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:progress':
      await runModule(['progress', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:next-action':
      await runModule(['next-action', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:dependency-add':
      await runModule(['dependency:add', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:dependency-remove':
      await runModule(['dependency:remove', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:evidence':
      await runModule(['evidence', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:file':
      await runModule(['file', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:test':
      await runModule(['test', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:claim':
      await runModule(['claim', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:heartbeat':
      await runModule(['heartbeat', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:release':
      await runModule(['release', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:handoff':
      await runModule(['handoff', ...args], () => import('../tasks/cli.js'));
      return;
    case 'task:next':
      await runModule(['next', ...args], () => import('../tasks/cli.js'));
      return;
    case 'run':
      await runModule([], () => import('../index.js'));
      return;
    case 'mcp':
      await runModule([], () => import('../mcp/bootstrap.js'));
      return;
    case 'api':
      await runModule([], () => import('../api/bootstrap.js'));
      return;
    case 'service':
      if (process.platform === 'win32') {
        unsupported(
          'service',
          [
            'The current ToolNet daemon transport uses a Unix-domain socket.',
            'Windows foreground service transport is not claimed as supported yet.',
          ].join('\n')
        );
        return;
      }
      await runModule(args, () => import('../service/daemon.js'));
      return;
    case 'service:install':
      serviceLifecycleUnsupported(command);
      return;
    case 'service:start':
      serviceLifecycleUnsupported(command);
      return;
    case 'service:stop':
      serviceLifecycleUnsupported(command);
      return;
    case 'service:restart':
      serviceLifecycleUnsupported(command);
      return;
    case 'service:remove':
      serviceLifecycleUnsupported(command);
      return;
    case 'service:status':
      if (process.platform === 'win32') {
        unsupported(command, 'Windows daemon transport is not implemented in this release.');
        return;
      }
      await runModule(['status', ...args], () => import('../service/cli.js'));
      return;
    case 'production:certify':
      await runModule([], () => import('../production/production-certify-cli.js'));
      return;
    case 'index':
      await runModule([], () => import('../production/full-index.js'));
      return;
    case 'index:graph':
      await runModule([], () => import('../code-intelligence/test-index.js'));
      return;
    case 'incremental':
      await runModule([], () => import('../code-intelligence/test-incremental.js'));
      return;
    case 'semantic':
      await runModule(args, () => import('../code-intelligence/test-semantic.js'));
      return;
    case 'impact':
      await runModule(args, () => import('../code-intelligence/test-impact.js'));
      return;
    case 'snapshot:list':
      await runModule(['list'], () => import('../production/snapshot-cli.js'));
      return;
    case 'snapshot:create':
      await runModule(['create', ...args], () => import('../production/snapshot-cli.js'));
      return;
    case 'snapshot:restore':
      await runModule(['restore', ...args], () => import('../production/snapshot-cli.js'));
      return;
    case 'recover':
      await runModule(['recover-latest'], () => import('../production/snapshot-cli.js'));
      return;
    case 'session:opencode-sync':
      await runModule(['sync', ...args], () => import('../session/opencode/cli.js'));
      return;
    case 'session:opencode-recover':
      await runModule(['recover', ...args], () => import('../session/opencode/cli.js'));
      return;
    case 'integrate:detect':
      await runModule(['--detect-only', ...args], () => import('../production/auto-integrate.js'));
      return;
    case 'integrate:auto':
      await runModule(args, () => import('../production/auto-integrate.js'));
      return;
    case 'integrate:opencode':
      await runModule(['install-plugin', ...args], () => import('../session/opencode/cli.js'));
      return;
    case 'session:agy-hook':
      await runModule(args, () => import('../session/agy/hook.js'));
      return;
    case 'session:agy-sync':
      await runModule(['sync', ...args], () => import('../session/agy/cli.js'));
      return;
    case 'session:agy-recover':
      await runModule(['recover', ...args], () => import('../session/agy/cli.js'));
      return;
    case 'integrate:agy':
      await runModule(['install-hooks', ...args], () => import('../session/agy/cli.js'));
      return;
    case 'certify:continuity':
      await runModule(args, () => import('../production/continuity-certify-cli.js'));
      return;
    case 'session:claude-hook':
      await runModule(args, () => import('../session/claude/hook.js'));
      return;
    case 'session:kiro-hook':
      await runModule(args, () => import('../session/kiro/hook.js'));
      return;
    case 'session:cursor-hook':
      await runModule(args, () => import('../session/cursor/hook.js'));
      return;
    case 'session:copilot-hook':
      await runModule(args, () => import('../session/copilot/hook.js'));
      return;
    case 'session:grok-hook':
      await runModule(args, () => import('../session/grok/hook.js'));
      return;
    case 'integrate:claude':
      await runModule(['install', ...args], () => import('../session/claude/cli.js'));
      return;
    case 'integrate:kiro':
      await runModule(['install', ...args], () => import('../session/kiro/cli.js'));
      return;
    case 'integrate:cursor':
      await runModule(args, () => import('../session/cursor/cli.js'));
      return;
    case 'integrate:copilot':
      await runModule(args, () => import('../session/copilot/cli.js'));
      return;
    case 'integrate:grok':
      await runModule(args, () => import('../session/grok/cli.js'));
      return;
    case 'integrate:toolnet-cli':
      await runModule(args, () => import('../session/toolnet-cli/cli.js'));
      return;
    case 'integrate:kilo':
      await runModule(args, () => import('../session/kilo/cli.js'));
      return;
    case 'integrate:all':
      await runModule(args, () => import('../production/auto-integrate.js'));
      return;
    case 'integrate:status':
      await runModule(args, () => import('../session/new-agents/scoped-status-cli.js'));
      return;
    case 'session:codex-notify':
      await runModule(['notify', ...args], () => import('../session/codex/cli.js'));
      return;
    case 'session:codex-sync':
      await runModule(['sync', ...args], () => import('../session/codex/cli.js'));
      return;
    case 'session:codex-recover':
      await runModule(['recover', ...args], () => import('../session/codex/cli.js'));
      return;
    case 'integrate:codex':
      await runModule(['install-notify', ...args], () => import('../session/codex/cli.js'));
      return;
    case 'memory:reconcile':
      await runModule(['reconcile', ...args], () => import('../session/learner/cli.js'));
      return;
    case 'memory:review':
      await runModule(args, () => import('../session/memory-review-cli.js'));
      return;
    case 'guard:check':
      await runModule(args, () => import('../guard/cli.js'));
      return;
    case 'guard:explain':
      await runModule(args, () => import('../guard/cli.js'));
      return;
    case 'guard:json':
      await runModule(['--json', ...args], () => import('../guard/cli.js'));
      return;
    case 'project:manual-init':
      await runModule(['init', ...args], () => import('../project-manual/cli.js'));
      return;
    case 'project:manual-show':
      await runModule(['show', ...args], () => import('../project-manual/cli.js'));
      return;
    case 'project:manual-sync':
      await runModule(['sync', ...args], () => import('../project-manual/cli.js'));
      return;
    case 'work:status':
      await runModule(['status', ...args], () => import('../work-continuity/cli.js'));
      return;
    case 'work:json':
      await runModule(['json', ...args], () => import('../work-continuity/cli.js'));
      return;
    case 'work:reconcile':
      await runModule(['reconcile', ...args], () => import('../work-continuity/cli.js'));
      return;
    case 'brief':
      await runModule(['brief', ...args], () => import('../work-continuity/context-cli.js'));
      return;
    case 'brief:json':
      await runModule(['brief-json', ...args], () => import('../work-continuity/context-cli.js'));
      return;
    case 'handoff:latest':
      await runModule(
        ['handoff-latest', ...args],
        () => import('../work-continuity/context-cli.js')
      );
      return;
    case 'context:sync':
      await runModule(['sync', ...args], () => import('../work-continuity/context-runtime-cli.js'));
      return;
    case 'context:print':
      await runModule(
        ['print', ...args],
        () => import('../work-continuity/context-runtime-cli.js')
      );
      return;
    case 'context:refresh':
      await runModule(
        ['refresh', ...args],
        () => import('../work-continuity/context-runtime-cli.js')
      );
      return;
    case 'profile:show':
      await runModule(
        ['profile-show', ...args],
        () => import('../work-continuity/context-runtime-cli.js')
      );
      return;
    case 'profile:sync':
      await runModule(
        ['profile-sync', ...args],
        () => import('../work-continuity/context-runtime-cli.js')
      );
      return;
    case 'session:codex-context':
      await runModule(args, () => import('../session/codex/context-hook.js'));
      return;
    case 'help':
      await runModule(args, () => import('../production/help-cli.js'));
      return;
    case '--help':
      await runModule(args, () => import('../production/help-cli.js'));
      return;
    case '-h':
      await runModule(args, () => import('../production/help-cli.js'));
      return;
    case 'context':
      await runModule(
        ['print', ...args],
        () => import('../work-continuity/context-runtime-cli.js')
      );
      return;
    case 'work':
      await runModule(['status', ...args], () => import('../work-continuity/cli.js'));
      return;
    case 'graph':
      await runGraph(args);
      return;
    case 'graph:ui':
      await runGraph(args);
      return;
    case 'status':
      await runModule(args, () => import('../production/status-cli.js'));
      return;
    default:
      await runModule(['--unknown', command], () => import('../production/help-cli.js'));
  }
}

void main().catch((error) => {
  console.error('');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(`Standalone platform: ${standalonePlatform()}`);
  process.exitCode = 1;
});
