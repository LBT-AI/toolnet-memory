/**
 * ToolNet Memory Status CLI
 *
 * Compact system status overview.
 */

import { ProjectManager, loadConfig } from '../core/index.js';
import { loadAiConfig } from '../ai/config.js';
import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
} from '../storage/index.js';
import { inspectSessionCaptureHealth } from './session-capture-health.js';
import {
  renderHeader,
  renderSectionTitle,
  renderKeyValue,
  renderSuccess,
  renderError,
  renderWarning,
  dim,
  type CliUiOptions,
} from './ui/cli-ui.js';

interface StatusCliOptions {
  tty?: boolean;
  noColor?: boolean;
}

function toCliUiOptions(options: StatusCliOptions): CliUiOptions {
  return {
    tty: options.tty,
    noColor: options.noColor,
  };
}

async function showStatus(options: StatusCliOptions): Promise<void> {
  const uiOpts = toCliUiOptions(options);

  console.log('');
  console.log(renderHeader('ToolNet Status', undefined, uiOpts));
  console.log('');

  try {
    const project = new ProjectManager().detect();
    const config = loadConfig();
    const aiConfig = loadAiConfig();

    // Project status
    console.log(renderSectionTitle('PROJECT', uiOpts));
    console.log(renderKeyValue('Name', project.name, 8, uiOpts));

    // Check if memory/index exists
    const rawStorage = withStorageRetry(
      createStorageProvider({
        provider: config.storage.provider,
        r2: config.storage.r2,
        s3: config.storage.s3,
        huggingface: config.storage.huggingface,
        localRoot: config.storage.localRoot,
      }),
      { attempts: 3 }
    );

    const storage = new ProjectScopedStorageProvider(
      rawStorage,
      project.id,
      project.name,
      project.remote ?? project.name
    );

    let memoryStatus = 'unknown';
    let indexStatus = 'unknown';

    try {
      const memoryExists = await storage.exists(`${project.id}/memory.json`);
      memoryStatus = memoryExists ? 'ready' : 'not initialized';
    } catch {
      memoryStatus = 'error';
    }

    try {
      const graphExists = await storage.exists(`${project.id}/code-graph.json`);
      indexStatus = graphExists ? 'ready' : 'not built';
    } catch {
      indexStatus = 'error';
    }

    console.log(renderKeyValue('Memory', memoryStatus, 8, uiOpts));
    console.log(renderKeyValue('Index', indexStatus, 8, uiOpts));
    console.log('');

    // AI status
    console.log(renderSectionTitle('AI', uiOpts));
    console.log(renderKeyValue('Provider', aiConfig.llm.provider, 8, uiOpts));
    console.log(renderKeyValue('Model', aiConfig.llm.model ?? 'not set', 8, uiOpts));
    console.log('');

    // Service status (optional)
    const capture = inspectSessionCaptureHealth(project);
    if (capture.agents.length > 0) {
      console.log(renderSectionTitle('SERVICE', uiOpts));
      const serviceStatus =
        capture.syncHealth === 'healthy'
          ? 'running'
          : capture.syncHealth === 'degraded'
            ? 'degraded'
            : 'stopped';
      console.log(renderKeyValue('Daemon', serviceStatus, 8, uiOpts));
      console.log('');
    }
  } catch (error) {
    console.log(renderError(uiOpts) + ' Failed to get status');
    console.log('');
    console.log(dim(`  ${error instanceof Error ? error.message : String(error)}`, uiOpts));
    console.log('');
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options: StatusCliOptions = {
    tty: process.stdout.isTTY,
    noColor: process.env.NO_COLOR !== undefined || args.includes('--no-color'),
  };

  await showStatus(options);
}

main().catch((error) => {
  console.error('');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  process.exitCode = 1;
});
