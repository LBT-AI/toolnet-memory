#!/usr/bin/env node
/**
 * Context Runtime CLI
 *
 * Fast context operations without deep Memory access.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  buildFastProjectContext,
  findProjectRoot,
  hashContext,
  syncAgentInstructionFiles,
} from './fast-context.js';
import { refreshStartupBriefCache } from './brief-cache.js';
import { loadConfig, ProjectManager } from '../core/index.js';
import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';

interface CliOptions {
  project?: string;
  limit?: number;
  mode?: 'minimal' | 'focused' | 'deep';
  query?: string;
  agent?: string;
}

function parseArgs(): {
  command: string;
  options: CliOptions;
} {
  const args = process.argv.slice(2);
  const command = args[0] || 'print';
  const options: CliOptions = {
    mode: 'minimal',
  };
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] === '--project' && args[index + 1]) {
      options.project = args[index + 1];
      index += 1;
      continue;
    }
    if (args[index] === '--limit' && args[index + 1]) {
      options.limit = Number.parseInt(args[index + 1]!, 10);
      index += 1;
      continue;
    }
    if (args[index] === '--focused' && args[index + 1]) {
      options.mode = 'focused';
      options.query = args[index + 1];
      index += 1;
      continue;
    }
    if (args[index] === '--deep') {
      options.mode = 'deep';
      continue;
    }
    if (args[index] === '--agent' && args[index + 1]) {
      options.agent = args[index + 1];
      index += 1;
    }
  }
  return {
    command,
    options,
  };
}

function contextOptions(options: CliOptions) {
  return {
    projectPath: options.project,
    ...(Number.isFinite(options.limit)
      ? {
          maxChars: options.limit,
        }
      : {}),
    agentId: options.agent ?? process.env.TOOLNET_AGENT_ID ?? 'opencode',
  };
}

async function main() {
  const { command, options } = parseArgs();
  try {
    switch (command) {
      case 'print':
        await handlePrint(options);
        break;
      case 'sync':
        await handleSync(options);
        break;
      case 'refresh':
        await handleRefresh(options);
        break;
      case 'profile-show':
        await handleProfileShow(options);
        break;
      case 'profile-sync':
        await handleProfileSync(options);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Available commands: print, sync, refresh, profile-show, profile-sync');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function handlePrint(options: CliOptions) {
  const mode = options.mode || 'minimal';
  if (mode === 'minimal') {
    /*
     * Phase 56:
     *
     * Do not prepend Task Session Bootstrap here.
     * That duplicated Task/Files/Tests with current.md.
     *
     * buildFastProjectContext() now derives canonical
     * Current Work directly from Persistent Tasks.
     */
    const context = buildFastProjectContext(contextOptions(options));
    if (!context) {
      console.error('No ToolNet project found. Run toolnet-memory init first.');
      process.exit(1);
    }
    process.stdout.write(context);
    return;
  }
  if (mode === 'focused' || mode === 'deep') {
    console.error('Focused and deep modes require storage access.');
    console.error('Use: toolnet-memory brief --deep for deep context');
    process.exit(1);
  }
}

async function handleSync(options: CliOptions) {
  const context = buildFastProjectContext(contextOptions(options));
  if (!context) {
    console.error('No ToolNet project found.');
    process.exit(1);
  }
  const hash = hashContext(context);
  console.log(`Context hash: ${hash}`);
  console.log(`Context size: ${context.length} chars`);
}

async function handleRefresh(options: CliOptions) {
  console.log('Refreshing deep startup brief cache...');
  const projectPath = options.project || process.cwd();
  const projectRoot = findProjectRoot(projectPath);
  if (!projectRoot) {
    console.error('No ToolNet project found.');
    process.exit(1);
  }
  const project = new ProjectManager().detect(projectRoot);
  const config = loadConfig();
  const raw = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 2,
    }
  );
  const storage = new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
  await refreshStartupBriefCache(project, storage);
  console.log('Deep startup brief cache refreshed.');
}

async function handleProfileShow(options: CliOptions) {
  const projectPath = options.project || process.cwd();
  const projectRoot = findProjectRoot(projectPath);
  if (!projectRoot) {
    console.error('No ToolNet project found.');
    process.exit(1);
  }
  const profilePath = path.join(projectRoot, '.toolnet', 'profile.md');
  if (!fs.existsSync(profilePath)) {
    console.error('No profile.md found in .toolnet directory.');
    process.exit(1);
  }
  process.stdout.write(fs.readFileSync(profilePath, 'utf-8'));
}

async function handleProfileSync(options: CliOptions) {
  const created = syncAgentInstructionFiles(contextOptions(options));
  console.log('Created/updated:');
  for (const file of created) {
    console.log(`- ${file}`);
  }
}

main();
