/**
 * ToolNet Memory Model CLI
 *
 * User-friendly AI model management interface.
 */

import { loadAiConfig } from '../ai/config.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  renderHeader,
  renderSectionTitle,
  renderKeyValue,
  renderCommandRow,
  renderError,
  renderSuccess,
  dim,
  cyan,
  type CliUiOptions,
} from './ui/cli-ui.js';

interface ModelCliOptions {
  tty?: boolean;
  noColor?: boolean;
}

function toCliUiOptions(options: ModelCliOptions): CliUiOptions {
  return {
    tty: options.tty,
    noColor: options.noColor,
  };
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'toolnet-memory');
const ENV_FILE = path.join(CONFIG_DIR, '.env');

function ensureConfig() {
  fs.mkdirSync(CONFIG_DIR, {
    recursive: true,
    mode: 0o700,
  });

  if (!fs.existsSync(ENV_FILE)) {
    fs.writeFileSync(ENV_FILE, '', {
      encoding: 'utf8',
      mode: 0o600,
    });
  }
}

function parseLines() {
  ensureConfig();
  return fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);
}

function setValue(key: string, value: string) {
  const lines = parseLines();
  let replaced = false;

  const updated = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}=`)) {
      replaced = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!replaced) {
    if (updated.length && updated[updated.length - 1] !== '') {
      updated.push('');
    }
    updated.push(`${key}=${value}`);
  }

  fs.writeFileSync(ENV_FILE, updated.join('\n'), {
    encoding: 'utf8',
    mode: 0o600,
  });

  fs.chmodSync(ENV_FILE, 0o600);
}

async function showModelStatus(options: ModelCliOptions): Promise<void> {
  const aiConfig = loadAiConfig();
  const uiOpts = toCliUiOptions(options);

  console.log('');
  console.log(renderHeader('AI Model', undefined, uiOpts));
  console.log('');

  console.log(renderSectionTitle('CURRENT', uiOpts));
  console.log(renderKeyValue('Provider', aiConfig.llm.provider, 8, uiOpts));
  console.log(renderKeyValue('Model', aiConfig.llm.model ?? 'not set', 8, uiOpts));
  console.log('');

  console.log(renderSectionTitle('COMMANDS', uiOpts));
  console.log(renderCommandRow('model list', 'List available models', 15, uiOpts));
  console.log(renderCommandRow('model set <model>', 'Change model', 15, uiOpts));
  console.log(renderCommandRow('model status', 'Show current model', 15, uiOpts));
  console.log('');
}

async function listModels(options: ModelCliOptions): Promise<void> {
  const aiConfig = loadAiConfig();
  const uiOpts = toCliUiOptions(options);

  console.log('');
  console.log(renderHeader('Available Models', undefined, uiOpts));
  console.log('');

  console.log(renderSectionTitle('CURRENT MODEL', uiOpts));
  console.log(`  ${cyan('●', uiOpts)} ${aiConfig.llm.model ?? 'not set'}`);
  console.log('');
  console.log(dim('  Model discovery not available.', uiOpts));
  console.log(dim('  Use `model set <model>` to change the model.', uiOpts));
  console.log('');
}

async function setModel(modelName: string, options: ModelCliOptions): Promise<void> {
  const aiConfig = loadAiConfig();
  const uiOpts = toCliUiOptions(options);

  console.log('');
  console.log(renderHeader('Change Model', undefined, uiOpts));
  console.log('');

  try {
    setValue('TOOLNET_LLM_MODEL', modelName);

    console.log(renderSuccess(uiOpts) + ' Model updated');
    console.log('');
    console.log(renderKeyValue('Provider', aiConfig.llm.provider, 8, uiOpts));
    console.log(renderKeyValue('Model', modelName, 8, uiOpts));
    console.log('');
  } catch (error) {
    console.log(renderError(uiOpts) + ' Failed to update model');
    console.log('');
    console.log(dim(`  ${error instanceof Error ? error.message : String(error)}`, uiOpts));
    console.log('');
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const subcommand = args[0];

  const options: ModelCliOptions = {
    tty: process.stdout.isTTY,
    noColor: process.env.NO_COLOR !== undefined || args.includes('--no-color'),
  };

  if (!subcommand || subcommand === 'status') {
    await showModelStatus(options);
    return;
  }

  if (subcommand === 'list') {
    await listModels(options);
    return;
  }

  if (subcommand === 'set') {
    const modelName = args[1];
    if (!modelName) {
      const uiOpts = toCliUiOptions(options);
      console.log('');
      console.log(renderError(uiOpts) + ' Missing model name');
      console.log('');
      console.log('Usage: toolnet-memory model set <model>');
      console.log('');
      process.exitCode = 1;
      return;
    }

    await setModel(modelName, options);
    return;
  }

  // Unknown subcommand
  const uiOpts = toCliUiOptions(options);
  console.log('');
  console.log(renderError(uiOpts) + ` Unknown subcommand: ${subcommand}`);
  console.log('');
  console.log('Available commands:');
  console.log('  model');
  console.log('  model status');
  console.log('  model list');
  console.log('  model set <model>');
  console.log('');
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  process.exitCode = 1;
});
