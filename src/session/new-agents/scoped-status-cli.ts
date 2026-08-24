import {
  inspectUnifiedScopedIntegrationStatus,
  type InspectUnifiedScopedStatusOptions,
} from './scoped-status.js';

import { renderUnifiedScopedIntegrationStatus } from './scoped-status-renderer.js';

import {
  parseIntegrationScope,
  resolveIntegrationProjectRoot,
  type ScopedAgent,
} from '../integration-scope/index.js';

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);

  return index >= 0 ? args[index + 1] : undefined;
}

function parseAgent(args: string[]): ScopedAgent[] | undefined {
  const value = valueAfter(args, '--agent');

  if (!value) {
    return undefined;
  }

  if (value !== 'cursor' && value !== 'copilot' && value !== 'grok') {
    throw new Error(`Invalid --agent value: ${value}`);
  }

  return [value];
}

function main(): void {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const scope = parseIntegrationScope(args);
  const explicitProject = valueAfter(args, '--project');
  const agents = parseAgent(args);

  const project =
    scope === 'global'
      ? undefined
      : resolveIntegrationProjectRoot({
          project: explicitProject,
        });

  const options: InspectUnifiedScopedStatusOptions = {
    scope,
    projectRoot: project?.root,
    agents,
  };

  const status = inspectUnifiedScopedIntegrationStatus(options);

  if (json) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.log(renderUnifiedScopedIntegrationStatus(status));
  }

  if (!status.installed) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
