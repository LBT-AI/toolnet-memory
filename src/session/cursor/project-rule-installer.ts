import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { cursorToolnetProjectRuleFile } from './config-paths.js';

export interface InstallCursorProjectRuleOptions {
  projectRoot: string;
  ruleFile?: string;
}

export interface InstallCursorProjectRuleResult {
  ruleFile: string;
  changed: boolean;
}

export const CURSOR_TOOLNET_PROJECT_RULE = `---
description: ToolNet Memory project continuity and safety rules
alwaysApply: true
---

# ToolNet Memory

Use ToolNet Memory as the continuity source for this project.

- When the user asks to continue, resume, pick up, finish unfinished work,
  or asks where work stopped, use ToolNet continuity before reconstructing
  context from old chat/session history.
- Use the ToolNet MCP server and \`memory_agent_ask\` when fast project context
  is missing, stale, or ambiguous.
- Prefer \`mode="local"\` for current task, current file, blockers, TODOs,
  completed work, and next action.
- Use \`mode="ai"\` only when synthesis is actually required.
- Do not reconstruct continuity by reading:
  - \`.toolnet/runtime/sources/** and legacy .toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat project context that ToolNet already provides.

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

export function installCursorProjectRule(
  options: InstallCursorProjectRuleOptions
): InstallCursorProjectRuleResult {
  const ruleFile = options.ruleFile ?? cursorToolnetProjectRuleFile(options.projectRoot);

  try {
    if (readFileSync(ruleFile, 'utf8') === CURSOR_TOOLNET_PROJECT_RULE) {
      return {
        ruleFile,
        changed: false,
      };
    }
  } catch {
    // file does not exist or is unreadable; write managed ToolNet rule
  }

  atomicWrite(ruleFile, CURSOR_TOOLNET_PROJECT_RULE);

  if (readFileSync(ruleFile, 'utf8') !== CURSOR_TOOLNET_PROJECT_RULE) {
    throw new Error('Cursor ToolNet project rule was written but verification failed.');
  }

  return {
    ruleFile,
    changed: true,
  };
}
