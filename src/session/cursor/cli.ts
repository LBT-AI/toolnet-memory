import { installCursorIntegration } from './installer.js';

import { inspectCursorScopedIntegrationStatus } from './scoped-status.js';

import {
  parseIntegrationScope,
  resolveIntegrationProjectRoot,
  type IntegrationScope,
} from '../integration-scope/index.js';

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);

  return index >= 0 ? args[index + 1] : undefined;
}

function normalizedArgs(): string[] {
  const args = process.argv.slice(2);

  return args[0] === 'install' ? args.slice(1) : args;
}

function renderStatus(scope: IntegrationScope, projectRoot?: string): void {
  const status = inspectCursorScopedIntegrationStatus({
    scope,
    projectRoot,
  });

  console.log('Cursor CLI Integration');
  console.log('======================');
  console.log('');
  console.log(`State : ${status.state}`);
  console.log(`Scope : ${status.requestedScope}`);

  if (status.global) {
    console.log('');
    console.log('Global');
    console.log(
      `  MCP   : ${status.global.mcp.configured ? 'ready' : 'missing'} — ${status.global.mcp.configFile}`
    );
    console.log(
      `  Hooks : ${status.global.hooks.configured ? 'ready' : 'missing'} — ${status.global.hooks.hooksFile}`
    );
  }

  if (status.projectScope) {
    console.log('');
    console.log('Project');
    console.log(`  Root  : ${status.project?.root ?? '-'}`);
    console.log(
      `  MCP   : ${status.projectScope.mcp.configured ? 'ready' : 'missing'} — ${status.projectScope.mcp.configFile}`
    );
    console.log(
      `  Hooks : ${status.projectScope.hooks.configured ? 'ready' : 'missing'} — ${status.projectScope.hooks.hooksFile}`
    );
    console.log(
      `  Rule  : ${status.projectScope.rule.configured ? 'ready' : 'missing'} — ${status.projectScope.rule.ruleFile}`
    );
    console.log(`  Trust : ${status.trustRequired ? 'required' : 'n/a'}`);
  }

  console.log('');
  console.log(`Dedupe: ${status.dedupeReady ? 'ready' : 'missing'}`);

  for (const warning of status.warnings) {
    console.log(`Note  : ${warning}`);
  }

  console.log('');

  if (!status.installed) {
    process.exitCode = 1;
  }
}

function main(): void {
  const args = normalizedArgs();
  const json = args.includes('--json');
  const wantsStatus = args.includes('--status') || args[0] === 'status';
  const scope = parseIntegrationScope(args);
  const explicitProject = valueAfter(args, '--project');

  const project =
    scope === 'global'
      ? undefined
      : resolveIntegrationProjectRoot({
          project: explicitProject,
        });

  if (wantsStatus) {
    const status = inspectCursorScopedIntegrationStatus({
      scope,
      projectRoot: project?.root,
    });

    if (json) {
      console.log(JSON.stringify(status, null, 2));

      if (!status.installed) {
        process.exitCode = 1;
      }

      return;
    }

    renderStatus(scope, project?.root);

    return;
  }

  const result = installCursorIntegration({
    scope,
    projectRoot: project?.root,
  });

  const status = inspectCursorScopedIntegrationStatus({
    scope,
    projectRoot: project?.root,
  });

  if (!status.installed) {
    throw new Error(
      `Cursor integration installation did not verify successfully (state=${status.state}).`
    );
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          installed: true,
          changed: result.changed,
          scope: result.scope,
          files: result.files,
          status,
        },
        null,
        2
      )
    );

    return;
  }

  console.log('✅ Cursor CLI integration installed');
  console.log(`Scope: ${scope}`);

  for (const file of result.files) {
    console.log(`File: ${file}`);
  }

  if (scope === 'both') {
    console.log('Hook dedupe: enabled');
    console.log('Project trust: required by Cursor');
  }

  console.log('Server: toolnet-memory');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
