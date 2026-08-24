/**
 * ToolNet Memory CLI Help System
 *
 * Centralized command metadata and help generation.
 */

import {
  renderHeader,
  renderSectionTitle,
  renderCommandRow,
  renderKeyValue,
  renderError,
  dim,
  cyan,
  type CliUiOptions,
} from '../../src/production/ui/cli-ui.js';

export interface CommandMetadata {
  name: string;
  description: string;
  usage?: string;
  category:
    | 'core'
    | 'memory'
    | 'code'
    | 'ai'
    | 'system'
    | 'context'
    | 'work'
    | 'integration'
    | 'session'
    | 'guard'
    | 'snapshot'
    | 'service'
    | 'project'
    | 'advanced';
  hidden?: boolean;
  aliases?: string[];
  examples?: string[];
  pipeline?: string[];
}

export const COMMANDS: CommandMetadata[] = [
  // Core / Get Started
  {
    name: 'setup',
    description: 'Configure ToolNet',
    category: 'core',
  },
  {
    name: 'init',
    description: 'Initialize current project',
    usage: 'toolnet-memory init [path]',
    category: 'core',
  },
  {
    name: 'doctor',
    description: 'Check system health',
    category: 'core',
  },

  // Memory
  {
    name: 'ask',
    description: 'Ask project memory',
    usage: 'toolnet-memory ask <question>',
    category: 'memory',
  },
  {
    name: 'context',
    description: 'Show current project context',
    category: 'memory',
    aliases: ['context:print'],
  },
  {
    name: 'work',
    description: 'Show current work state',
    category: 'memory',
    aliases: ['work:status'],
  },

  // Code Intelligence
  {
    name: 'index',
    description: 'Build code intelligence',
    category: 'code',
    pipeline: [
      'Scanning files',
      'Parsing code',
      'Type Resolution',
      'Rich Graph',
      'Semantic Code Index',
      'Architecture Intelligence',
      'Graph Analysis',
      '3D Visualization Dataset',
    ],
  },
  {
    name: 'semantic',
    description: 'Semantic code search',
    usage: 'toolnet-memory semantic <query>',
    category: 'code',
  },
  {
    name: 'impact',
    description: 'Analyze change impact',
    usage: 'toolnet-memory impact <file>',
    category: 'code',
  },
  {
    name: 'graph',
    description: 'Open code graph UI',
    category: 'code',
  },
  {
    name: 'graph:ui',
    description: 'Open code graph UI',
    category: 'code',
    hidden: true,
  },

  // AI
  {
    name: 'model',
    description: 'View/change AI model',
    category: 'ai',
  },
  {
    name: 'provider',
    description: 'Manage AI providers',
    category: 'ai',
    aliases: ['provider:status'],
  },

  // System
  {
    name: 'status',
    description: 'Show ToolNet status',
    category: 'system',
  },
  {
    name: 'update',
    description: 'Update ToolNet Memory',
    category: 'system',
  },

  // Context & Memory (Advanced)
  {
    name: 'context:print',
    description: 'Print fast project context',
    category: 'context',
    hidden: true,
  },
  {
    name: 'context:sync',
    description: 'Show context hash/size',
    category: 'context',
  },
  {
    name: 'context:refresh',
    description: 'Rebuild deep startup brief cache',
    category: 'context',
  },
  {
    name: 'brief',
    description: 'Show full project brief',
    category: 'context',
  },
  {
    name: 'brief:json',
    description: 'Show brief as JSON',
    category: 'context',
  },
  {
    name: 'profile:show',
    description: 'Show .toolnet/profile.md',
    category: 'context',
  },
  {
    name: 'profile:sync',
    description: 'Sync profile to agent files',
    category: 'context',
  },

  // Work Continuity (Advanced)
  {
    name: 'work:status',
    description: 'Show current work state',
    category: 'work',
    hidden: true,
  },
  {
    name: 'work:json',
    description: 'Show work state as JSON',
    category: 'work',
  },
  {
    name: 'work:reconcile',
    description: 'Reconcile work continuity',
    category: 'work',
  },
  {
    name: 'handoff:latest',
    description: 'Show latest session handoff',
    category: 'work',
  },
  {
    name: 'handoff:refresh',
    description: 'Refresh handoff data',
    category: 'work',
  },

  // Code Intelligence (Advanced)
  {
    name: 'index:graph',
    description: 'Build graph index only',
    category: 'code',
  },
  {
    name: 'incremental',
    description: 'Incremental code indexing',
    category: 'code',
  },

  // AI / Providers (Advanced)
  {
    name: 'config',
    description: 'Manage configuration',
    usage: 'toolnet-memory config <get|set|list|open>',
    category: 'ai',
  },
  {
    name: 'provider:list',
    description: 'List available AI providers',
    category: 'ai',
  },
  {
    name: 'provider:status',
    description: 'Show AI provider status',
    category: 'ai',
    hidden: true,
  },
  {
    name: 'provider:test',
    description: 'Test AI provider connection',
    category: 'ai',
  },

  // Agent Integrations
  {
    name: 'integrate:detect',
    description: 'Detect agent integrations',
    category: 'integration',
  },
  {
    name: 'integrate:auto',
    description: 'Auto-enable integrations',
    category: 'integration',
  },
  {
    name: 'integrate:agy',
    description: 'Install Agy hooks',
    category: 'integration',
  },
  {
    name: 'integrate:codex',
    description: 'Install Codex integration',
    category: 'integration',
  },
  {
    name: 'integrate:opencode',
    description: 'Install OpenCode plugin',
    category: 'integration',
  },
  {
    name: 'integrate:claude',
    description: 'Install Claude Code integration',
    category: 'integration',
  },
  {
    name: 'integrate:kiro',
    description: 'Install Kiro CLI integration',
    usage: 'toolnet-memory integrate:kiro [--status] [--json]',
    category: 'integration',
  },

  // Sessions
  {
    name: 'session:agy-sync',
    description: 'Sync Agy session',
    category: 'session',
  },
  {
    name: 'session:agy-recover',
    description: 'Recover Agy sessions',
    category: 'session',
  },
  {
    name: 'session:agy-hook',
    description: 'Agy session hook',
    category: 'session',
    hidden: true,
  },
  {
    name: 'session:codex-sync',
    description: 'Sync Codex session',
    category: 'session',
  },
  {
    name: 'session:codex-recover',
    description: 'Recover Codex sessions',
    category: 'session',
  },
  {
    name: 'session:codex-notify',
    description: 'Codex notification hook',
    category: 'session',
    hidden: true,
  },
  {
    name: 'session:codex-context',
    description: 'Codex context hook',
    category: 'session',
    hidden: true,
  },
  {
    name: 'session:opencode-sync',
    description: 'Sync OpenCode session',
    category: 'session',
  },
  {
    name: 'session:opencode-recover',
    description: 'Recover OpenCode sessions',
    category: 'session',
  },
  {
    name: 'session:claude-hook',
    description: 'Claude session hook',
    category: 'session',
    hidden: true,
  },
  {
    name: 'session:kiro-hook',
    description: 'Kiro lifecycle hook',
    category: 'session',
    hidden: true,
  },
  {
    name: 'memory:review',
    description: 'Review memory entries',
    category: 'session',
  },
  {
    name: 'memory:reconcile',
    description: 'Reconcile memory state',
    category: 'session',
  },

  // Guard
  {
    name: 'guard:check',
    description: 'Check project rules',
    category: 'guard',
  },
  {
    name: 'guard:explain',
    description: 'Show rules and evidence',
    category: 'guard',
  },
  {
    name: 'guard:json',
    description: 'Output guard result as JSON',
    category: 'guard',
    hidden: true,
  },

  // Project Manual
  {
    name: 'project:manual-init',
    description: 'Initialize project manual',
    category: 'project',
  },
  {
    name: 'project:manual-show',
    description: 'Show project manual',
    category: 'project',
  },
  {
    name: 'project:manual-sync',
    description: 'Sync project manual',
    category: 'project',
  },

  // Snapshots & Recovery
  {
    name: 'snapshot:list',
    description: 'List snapshots',
    category: 'snapshot',
  },
  {
    name: 'snapshot:create',
    description: 'Create snapshot',
    category: 'snapshot',
  },
  {
    name: 'snapshot:restore',
    description: 'Restore snapshot',
    category: 'snapshot',
  },
  {
    name: 'recover',
    description: 'Recover latest snapshot',
    category: 'snapshot',
  },

  // Background Service
  {
    name: 'service',
    description: 'Run daemon in foreground',
    category: 'service',
  },
  {
    name: 'service:install',
    description: 'Install/start daemon',
    category: 'service',
  },
  {
    name: 'service:start',
    description: 'Start daemon',
    category: 'service',
  },
  {
    name: 'service:stop',
    description: 'Stop daemon',
    category: 'service',
  },
  {
    name: 'service:restart',
    description: 'Restart daemon',
    category: 'service',
  },
  {
    name: 'service:status',
    description: 'Show daemon status',
    category: 'service',
  },
  {
    name: 'service:remove',
    description: 'Remove daemon',
    category: 'service',
  },

  // Advanced / Developer
  {
    name: 'mcp',
    description: 'Run MCP server',
    category: 'advanced',
  },
  {
    name: 'api',
    description: 'Run API server',
    category: 'advanced',
  },
  {
    name: 'run',
    description: 'Run ToolNet runtime',
    category: 'advanced',
    hidden: true,
  },
  {
    name: 'production:certify',
    description: 'Verify production runtime',
    category: 'advanced',
  },
  {
    name: 'certify:continuity',
    description: 'Certify work continuity',
    category: 'advanced',
  },
  {
    name: 'ask-ai',
    description: 'Ask AI agent (advanced)',
    category: 'advanced',
    hidden: true,
  },
];

export interface HelpOptions {
  version?: string;
  tty?: boolean;
  noColor?: boolean;
}

function toCliUiOptions(options: HelpOptions): CliUiOptions {
  return {
    tty: options.tty,
    noColor: options.noColor,
  };
}

export function generateDefaultHelp(options: HelpOptions): string {
  const lines: string[] = [];
  const version = options.version ?? '0.0.0';
  const uiOpts = toCliUiOptions(options);

  lines.push('');
  lines.push(renderHeader('ToolNet Memory', version, uiOpts));
  lines.push('  Persistent memory & code intelligence for AI coding agents');
  lines.push('');
  lines.push(renderSectionTitle('USAGE', uiOpts));
  lines.push('  toolnet-memory <command> [options]');
  lines.push('');

  // Group commands by category for default help
  const categories = [
    { key: 'core', title: 'GET STARTED' },
    { key: 'memory', title: 'MEMORY' },
    { key: 'code', title: 'CODE' },
    { key: 'ai', title: 'AI' },
    { key: 'system', title: 'SYSTEM' },
  ] as const;

  for (const { key, title } of categories) {
    const commands = COMMANDS.filter((cmd) => cmd.category === key && !cmd.hidden);
    if (commands.length === 0) continue;

    lines.push(renderSectionTitle(title, uiOpts));

    const maxLen = Math.max(...commands.map((cmd) => cmd.name.length));

    for (const cmd of commands) {
      lines.push(renderCommandRow(cmd.name, cmd.description, maxLen, uiOpts));
    }

    lines.push('');
  }

  lines.push(renderSectionTitle('MORE', uiOpts));
  lines.push(renderCommandRow('help --all', 'Show all advanced commands', 15, uiOpts));
  lines.push(renderCommandRow('help <command>', 'Show command details', 15, uiOpts));
  lines.push('');

  return lines.join('\n');
}

export function generateFullHelp(options: HelpOptions): string {
  const lines: string[] = [];
  const version = options.version ?? '0.0.0';
  const uiOpts = toCliUiOptions(options);

  lines.push('');
  lines.push(renderHeader('ToolNet Memory', version, uiOpts));
  lines.push('  Persistent memory & code intelligence for AI coding agents');
  lines.push('');
  lines.push(renderSectionTitle('USAGE', uiOpts));
  lines.push('  toolnet-memory <command> [options]');
  lines.push('');

  // Group all commands by category
  const categoryGroups = [
    { key: 'core', title: 'PROJECT SETUP' },
    { key: 'memory', title: 'MEMORY' },
    { key: 'code', title: 'CODE INTELLIGENCE' },
    { key: 'ai', title: 'AI / PROVIDERS' },
    { key: 'system', title: 'SYSTEM' },
    { key: 'context', title: 'CONTEXT & MEMORY' },
    { key: 'work', title: 'WORK CONTINUITY' },
    { key: 'integration', title: 'AGENT INTEGRATIONS' },
    { key: 'session', title: 'SESSIONS' },
    { key: 'guard', title: 'GUARD' },
    { key: 'project', title: 'PROJECT MANUAL' },
    { key: 'snapshot', title: 'SNAPSHOTS & RECOVERY' },
    { key: 'service', title: 'BACKGROUND SERVICE' },
    { key: 'advanced', title: 'DEVELOPER / PRODUCTION' },
  ] as const;

  for (const { key, title } of categoryGroups) {
    const commands = COMMANDS.filter((cmd) => cmd.category === key && !cmd.hidden);
    if (commands.length === 0) continue;

    lines.push(renderSectionTitle(title, uiOpts));

    const maxLen = Math.max(...commands.map((cmd) => cmd.name.length));

    for (const cmd of commands) {
      lines.push(renderCommandRow(cmd.name, cmd.description, maxLen, uiOpts));
    }

    lines.push('');
  }

  return lines.join('\n');
}

export function generateCommandHelp(command: string, options: HelpOptions): string | null {
  const cmd = COMMANDS.find((c) => c.name === command || c.aliases?.includes(command));

  if (!cmd) {
    return null;
  }

  const lines: string[] = [];
  const uiOpts = toCliUiOptions(options);

  lines.push('');
  lines.push(renderHeader(cmd.name, undefined, uiOpts));
  lines.push('');
  lines.push(cmd.description);
  lines.push('');

  if (cmd.usage) {
    lines.push(renderSectionTitle('USAGE', uiOpts));
    lines.push(`  ${cmd.usage}`);
    lines.push('');
  }

  if (cmd.aliases && cmd.aliases.length > 0) {
    lines.push(renderSectionTitle('ALIASES', uiOpts));
    for (const alias of cmd.aliases) {
      lines.push(`  ${alias}`);
    }
    lines.push('');
  }

  if (cmd.pipeline && cmd.pipeline.length > 0) {
    lines.push(renderSectionTitle('PIPELINE', uiOpts));
    for (const stage of cmd.pipeline) {
      lines.push(`  ${stage}`);
    }
    lines.push('');
  }

  if (cmd.examples && cmd.examples.length > 0) {
    lines.push(renderSectionTitle('EXAMPLES', uiOpts));
    for (const example of cmd.examples) {
      lines.push(`  ${example}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function findSimilarCommands(input: string): string[] {
  const allNames = COMMANDS.flatMap((cmd) => [cmd.name, ...(cmd.aliases ?? [])]);

  // Simple similarity: starts with same prefix or contains substring
  const similar = allNames.filter((name) => {
    if (name === input) return false;
    if (name.startsWith(input)) return true;
    if (input.length >= 3 && name.includes(input)) return true;
    return false;
  });

  return similar.slice(0, 3);
}
