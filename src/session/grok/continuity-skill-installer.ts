import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { grokContinuitySkillFile } from './config-paths.js';

export interface InstallGrokContinuitySkillOptions {
  skillFile?: string;
}

export interface InstallGrokContinuitySkillResult {
  skillFile: string;

  changed: boolean;
}

const SKILL = `---
name: toolnet-continuity
description: Restore previous ToolNet project work when the user asks to continue, resume, pick up, finish unfinished work, or asks where work stopped.
when-to-use: continue, resume, pick up, carry on, tiếp tục, làm tiếp, làm nốt, đang làm đến đâu, dừng ở đâu
---

# ToolNet Continuity

When the user asks to continue or resume previous work:

1. Use the ToolNet Memory MCP server as the continuity source.
2. Invoke \`memory_agent_ask\` before exploring old history if the current
   ToolNet handoff is missing, stale, or ambiguous.
3. Prefer \`mode="local"\` for current task, last file, blocker, completed
   work, TODOs, and next action.
4. Use \`mode="ai"\` only when continuity requires synthesis.
5. Do not reconstruct previous work from:
   - \`.toolnet/runtime/sources/** and legacy .toolnet/sessions/**\`
   - ToolNet \`events.jsonl\` or \`state.json\`
   - raw transcripts
   - another coding agent's private session/history files
6. After ToolNet continuity is known, verify current git and repository
   source truth before changing code.
7. Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`;

function atomicWrite(file: string, value: string): void {
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });

  const temporary = `${file}.toolnet-${process.pid}-${Date.now()}.tmp`;

  try {
    writeFileSync(temporary, value, {
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

export function installGrokContinuitySkill(
  options: InstallGrokContinuitySkillOptions = {}
): InstallGrokContinuitySkillResult {
  const skillFile = options.skillFile ?? grokContinuitySkillFile();

  if (existsSync(skillFile) && readFileSync(skillFile, 'utf8') === SKILL) {
    return {
      skillFile,
      changed: false,
    };
  }

  atomicWrite(skillFile, SKILL);

  if (readFileSync(skillFile, 'utf8') !== SKILL) {
    throw new Error('Grok ToolNet continuity skill was written but verification failed.');
  }

  return {
    skillFile,
    changed: true,
  };
}
