#!/usr/bin/env node
/**
 * Memory Review CLI
 * Review extracted session facts and promotion decisions
 */

import { existsSync } from 'node:fs';
import { ProjectManager, loadConfig } from '../core/index.js';
import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';
import { extractSessionMemory, type DurableFact } from './session-extractor.js';
import { shouldPromoteDurableFact, loadSessionMemoryPolicy } from './session-memory-policy.js';

interface CliOptions {
  project?: string;
  sessionId?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      options.project = args[i + 1];
      i++;
    } else if (args[i] === '--session' && args[i + 1]) {
      options.sessionId = args[i + 1];
      i++;
    }
  }

  return options;
}

function formatFact(fact: DurableFact, promoted: boolean): string {
  const score = fact.importance.toFixed(2);
  const status = promoted ? '✓ PROMOTED' : '✗ SKIPPED';
  const category = fact.category.toUpperCase().padEnd(12);
  return `[${score}] [${category}] ${status}: ${fact.text}`;
}

async function main() {
  const options = parseArgs();

  try {
    const projectPath = options.project || process.cwd();
    const project = new ProjectManager().detect(projectPath);

    if (!project) {
      console.error('No ToolNet project found. Run toolnet-memory init first.');
      process.exit(1);
    }

    const config = loadConfig();
    const raw = withStorageRetry(
      createStorageProvider({
        provider: config.storage.provider,
        huggingface: config.storage.huggingface,
        localRoot: config.storage.localRoot,
      }),
      { attempts: 2 }
    );

    const storage = new ProjectScopedStorageProvider(
      raw,
      project.id,
      project.name,
      project.remote ?? project.name
    );

    const policy = loadSessionMemoryPolicy();

    console.log('Memory Review');
    console.log('=============\n');
    console.log(`Project: ${project.name}`);
    console.log(`Policy: ${policy.memoryPromotion}`);
    console.log(`Min Score: ${policy.promoteMinScore}`);
    console.log(`Max Facts/Session: ${policy.durableMemoryMaxItemsPerSession}\n`);

    // For demo, create a sample extraction
    const sampleTranscript = [
      'User: Remember to always use TypeScript strict mode',
      'Assistant: I will use TypeScript strict mode',
      'npm notice created a lockfile',
      'User: Fix the authentication bug in src/auth.ts',
      'Assistant: Fixed authentication bug',
      'User: Deploy to production after testing',
      'npm WARN deprecated package',
    ];

    const extraction = extractSessionMemory(sampleTranscript, options.sessionId);

    console.log('Session Summary:');
    console.log('----------------');
    console.log(extraction.summary || '(no summary)');
    console.log('');

    console.log('Extracted Facts:');
    console.log('----------------\n');

    const promoted: DurableFact[] = [];
    const skipped: DurableFact[] = [];

    for (const fact of extraction.durableFacts) {
      const shouldPromote = shouldPromoteDurableFact(fact.importance, fact.category, policy);
      if (shouldPromote) {
        promoted.push(fact);
      } else {
        skipped.push(fact);
      }
    }

    if (promoted.length > 0) {
      console.log('PROMOTED TO DURABLE MEMORY:');
      for (const fact of promoted) {
        console.log(formatFact(fact, true));
      }
      console.log('');
    }

    if (skipped.length > 0) {
      console.log('SKIPPED (below threshold):');
      for (const fact of skipped) {
        console.log(formatFact(fact, false));
      }
      console.log('');
    }

    console.log('Summary:');
    console.log(`- Total facts extracted: ${extraction.durableFacts.length}`);
    console.log(`- Promoted: ${promoted.length}`);
    console.log(`- Skipped: ${skipped.length}`);
    console.log('');

    if (extraction.decisions.length > 0) {
      console.log(`Decisions: ${extraction.decisions.length}`);
    }
    if (extraction.projectRules.length > 0) {
      console.log(`Rules: ${extraction.projectRules.length}`);
    }
    if (extraction.blockers.length > 0) {
      console.log(`Blockers: ${extraction.blockers.length}`);
    }
    if (extraction.nextActions.length > 0) {
      console.log(`Next Actions: ${extraction.nextActions.length}`);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
