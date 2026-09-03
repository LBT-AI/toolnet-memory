#!/usr/bin/env node
/**
 * Guard CLI
 * Check for rule violations and conflicts
 */

import { ProjectManager } from '../core/index.js';
import { loadGuardConfig } from './rules.js';
import { checkPath, checkCommand, checkProject, type GuardResult } from './detector.js';
import { safeAppendAuditEvent } from '../audit/log.js';

interface CliOptions {
  file?: string;
  command?: string;
  json?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      options.file = args[i + 1];
      i++;
    } else if (args[i] === '--command' && args[i + 1]) {
      options.command = args[i + 1];
      i++;
    } else if (args[i] === '--json') {
      options.json = true;
    }
  }

  return options;
}

function formatWarning(warning: GuardResult['warnings'][0]): string {
  const lines: string[] = [];

  lines.push('⚠ TOOLNET GUARD WARNING');
  lines.push('');
  lines.push(`Type: ${warning.type.replace(/_/g, ' ')}`);
  lines.push(`Severity: ${warning.severity.toUpperCase()}`);
  lines.push('');
  lines.push(`Reason:`);
  lines.push(warning.reason);

  if (warning.matchedRule) {
    lines.push('');
    lines.push(`Matched rule:`);
    lines.push(warning.matchedRule);
  }

  if (warning.target) {
    lines.push('');
    lines.push(`Target:`);
    lines.push(warning.target);
  }

  if (warning.evidence) {
    lines.push('');
    lines.push(`Evidence:`);
    lines.push(warning.evidence);
  }

  if (warning.recommendation) {
    lines.push('');
    lines.push(`Recommended action:`);
    lines.push(warning.recommendation);
  }

  return lines.join('\n');
}

function printResult(result: GuardResult, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.warnings.length === 0) {
    console.log('✓ No warnings detected');
    console.log('');
    console.log(`Mode: ${result.mode}`);
    console.log(`Rules loaded: ${result.rules.length}`);
    if (result.sourcePath) {
      console.log(`Source path: ${result.sourcePath}`);
    }
    if (result.deployCommand) {
      console.log(`Deploy command: ${result.deployCommand}`);
    }
    return;
  }

  for (const warning of result.warnings) {
    console.log(formatWarning(warning));
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
  }

  console.log(`Total warnings: ${result.warnings.length}`);
  console.log(`Mode: ${result.mode}`);

  if (result.mode === 'strict' && !result.ok) {
    console.log('');
    console.log('❌ Operation blocked in strict mode');
    process.exit(1);
  }
}

function printExplanation(result: GuardResult): void {
  console.log('TOOLNET GUARD CONFIGURATION');
  console.log('===========================');
  console.log('');
  console.log(`Mode: ${result.mode}`);
  console.log('');

  if (result.sourcePath) {
    console.log(`Source Path: ${result.sourcePath}`);
  }

  if (result.deployCommand) {
    console.log(`Deploy Command: ${result.deployCommand}`);
  }

  if (result.forbiddenPaths.length > 0) {
    console.log('');
    console.log('Forbidden Paths:');
    for (const path of result.forbiddenPaths) {
      console.log(`  - ${path}`);
    }
  }

  console.log('');
  console.log('PROJECT RULES');
  console.log('=============');
  console.log('');

  const rulesBySource = new Map<string, typeof result.rules>();
  for (const rule of result.rules) {
    const rules = rulesBySource.get(rule.source) || [];
    rules.push(rule);
    rulesBySource.set(rule.source, rules);
  }

  for (const [source, rules] of rulesBySource) {
    console.log(`From ${source}:`);
    for (const rule of rules) {
      console.log(`  [${rule.severity}] ${rule.text}`);
    }
    console.log('');
  }

  console.log('CODE EVIDENCE');
  console.log('=============');
  console.log('');

  if (result.evidence.framework) {
    console.log(`Framework: ${result.evidence.framework}`);
  }

  if (result.evidence.database) {
    console.log(`Database: ${result.evidence.database}`);
  }

  if (result.evidence.stateManagement) {
    console.log(`State Management: ${result.evidence.stateManagement}`);
  }

  if (result.evidence.buildTool) {
    console.log(`Build Tool: ${result.evidence.buildTool}`);
  }

  if (result.evidence.deployScripts.length > 0) {
    console.log('');
    console.log('Deploy Scripts:');
    for (const script of result.evidence.deployScripts) {
      console.log(`  - ${script}`);
    }
  }

  const depCount = Object.keys(result.evidence.dependencies).length;
  const devDepCount = Object.keys(result.evidence.devDependencies).length;

  console.log('');
  console.log(`Dependencies: ${depCount}`);
  console.log(`Dev Dependencies: ${devDepCount}`);
}

async function main() {
  const options = parseArgs();

  try {
    const project = new ProjectManager().detect(process.cwd());

    if (!project) {
      console.error('No ToolNet project found. Run toolnet-memory init first.');
      process.exit(1);
    }

    const config = loadGuardConfig();

    let result: GuardResult;

    if (options.file) {
      result = checkPath(project, options.file, config);
    } else if (options.command) {
      result = checkCommand(project, options.command, config);
    } else {
      result = checkProject(project, config);
    }

    if (options.json) {
      printResult(result, true);
    } else if (options.file || options.command) {
      printResult(result, false);
    } else {
      printExplanation(result);
    }

    if (!result.ok && config.mode === 'strict') {
      process.exit(1);
    }

    // Audit the check itself; raw command text is never recorded.
    const checkType = options.command ? 'command' : options.file ? 'file' : 'project';
    void safeAppendAuditEvent(project, {
      action: 'guard.check',
      outcome: !result.ok && config.mode === 'strict' ? 'blocked' : 'success',
      actor: {
        kind: 'agent',
        id: process.env.TOOLNET_AGENT_ID?.trim() || 'cli',
      },
      details: {
        checkType,
        mode: result.mode,
        ok: result.ok,
        warnings: result.warnings.length,
        warningTypes: result.warnings.map((warning) => warning.type).sort(),
      },
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
