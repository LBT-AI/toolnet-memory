import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { copilotToolnetProjectInstructionFile } from './config-paths.js';

export interface InstallCopilotProjectInstructionOptions {
  projectRoot: string;
  instructionFile?: string;
}

export interface InstallCopilotProjectInstructionResult {
  instructionFile: string;
  changed: boolean;
}

export const COPILOT_TOOLNET_PROJECT_INSTRUCTION = `---
applyTo: "**"
---

# ToolNet Memory project continuity

Use ToolNet Memory as the continuity source for this repository.

- When the user asks to continue, resume, pick up, finish unfinished work,
  or asks where work stopped, recover ToolNet continuity before reconstructing
  state from chat/session history.
- Use the ToolNet MCP server and \`memory_agent_ask\` when fast project context
  is missing, stale, or ambiguous.
- Prefer \`mode="local"\` for current task, current file, blockers, TODOs,
  completed work, and next action.
- ToolNet Memory Agent is local-only; use \`mode="local"\` for all continuity questions.
- Do not reconstruct continuity by reading:
  - \`.toolnet/journal/**, .toolnet/runtime/sources/**, and legacy .toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`;

function atomicWrite(file: string, content: string): void {
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });

  const temporary = `${file}.toolnet-${process.pid}-${Date.now()}.tmp`;

  try {
    writeFileSync(temporary, content, {
      encoding: 'utf8',
      mode: 0o600,
    });

    renameSync(temporary, file);
  } finally {
    rmSync(temporary, {
      force: true,
    });
  }
}

export function installCopilotProjectInstruction(
  options: InstallCopilotProjectInstructionOptions
): InstallCopilotProjectInstructionResult {
  const instructionFile =
    options.instructionFile ?? copilotToolnetProjectInstructionFile(options.projectRoot);

  try {
    if (readFileSync(instructionFile, 'utf8') === COPILOT_TOOLNET_PROJECT_INSTRUCTION) {
      return {
        instructionFile,
        changed: false,
      };
    }
  } catch {
    // managed file absent/unreadable; write it
  }

  atomicWrite(instructionFile, COPILOT_TOOLNET_PROJECT_INSTRUCTION);

  if (readFileSync(instructionFile, 'utf8') !== COPILOT_TOOLNET_PROJECT_INSTRUCTION) {
    throw new Error('Copilot ToolNet project instruction verification failed.');
  }

  return {
    instructionFile,
    changed: true,
  };
}
