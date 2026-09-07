/**
 * Fast Project Context
 *
 * Local-only startup path:
 * - no network
 * - no remote storage
 * - no transcript replay
 * - no deep Memory query
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ProjectManifest } from '../core/types.js';
import { buildCompactContextOffloadGraph } from '../memory/context-offload.js';
import { loadProjectManual } from '../project-manual/manager.js';
import { readLatestDurableCheckpoint } from '../session/durable-checkpoint.js';
import { renderUntrustedProjectData } from '../security/project-document-trust.js';
import { memoryAgentGuidance, memoryAgentStartupGuidance } from './agent-guidance.js';
import { buildCurrentWorkProjection } from './current-work-projection.js';
import { formatFastHandoffContext, readFastHandoff } from './fast-handoff.js';
import {
  compactStartupText,
  isRecentTimestamp,
  renderCompactCurrentWork,
  renderRankedContextSections,
  selectDurableCheckpointFacts,
} from './context-noise-filter.js';

interface FastContextOptions {
  projectPath?: string;
  maxChars?: number;
  agentId?: string;
  now?: number;
}

/**
 * Find project root by looking for .toolnet directory.
 */
export function findProjectRoot(startPath: string): string | null {
  let currentPath = path.resolve(startPath);
  const root = path.parse(currentPath).root;
  while (currentPath !== root) {
    const toolnetDir = path.join(currentPath, '.toolnet');
    if (fs.existsSync(toolnetDir) && fs.statSync(toolnetDir).isDirectory()) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  return null;
}

function readFileSafe(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch {
    return null;
  }
}

function filterSensitiveContent(content: string): string {
  return content
    .split('\n')
    .filter((line) => {
      const upper = line.toUpperCase();
      return !(
        upper.includes('SECRET') ||
        upper.includes('TOKEN') ||
        upper.includes('API_KEY') ||
        upper.includes('APIKEY') ||
        upper.includes('PASSWORD') ||
        upper.includes('PASS=')
      );
    })
    .join('\n');
}

function hardLimit(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  const marker = '\n[ToolNet startup context hard limit reached]';
  return value.slice(0, Math.max(0, maxChars - marker.length)) + marker;
}

function projectManifest(projectRoot: string): ProjectManifest | null {
  const file = path.join(projectRoot, '.toolnet', 'project.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    const id =
      typeof parsed.id === 'string'
        ? parsed.id
        : typeof parsed.projectId === 'string'
          ? parsed.projectId
          : undefined;
    const name =
      typeof parsed.name === 'string'
        ? parsed.name
        : typeof parsed.projectName === 'string'
          ? parsed.projectName
          : undefined;
    if (!id || !name) {
      return null;
    }
    const now = new Date(0).toISOString();
    return {
      ...parsed,
      id,
      name,
      rootPath: projectRoot,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : now,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : now,
      graphVersion: typeof parsed.graphVersion === 'number' ? parsed.graphVersion : 0,
      memoryVersion: typeof parsed.memoryVersion === 'number' ? parsed.memoryVersion : 0,
    } as ProjectManifest;
  } catch {
    return null;
  }
}

function uniqueLines(values: string[], limit: number): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw.replace(/\s+/gu, ' ').trim();
    if (!value) {
      continue;
    }
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(value);
    if (output.length >= limit) {
      break;
    }
  }
  return output;
}

/**
 * Build ranked local context.
 *
 * `maxChars` is a real hard budget in Phase 56.
 */
export function buildFastProjectContext(options: FastContextOptions = {}): string | null {
  const startPath = options.projectPath || process.cwd();
  const projectRoot = findProjectRoot(startPath);
  if (!projectRoot) {
    return null;
  }
  const now = Number.isFinite(options.now) ? Math.trunc(options.now!) : Date.now();
  const maxChars = Math.max(2_000, Math.min(12_000, Math.trunc(options.maxChars ?? 6_000)));
  const project = projectManifest(projectRoot);
  const projectName = project?.name ?? 'Unknown';
  const profilePath = path.join(projectRoot, '.toolnet', 'profile.md');
  const profileContent = filterSensitiveContent(readFileSafe(profilePath) ?? '');
  let manualRules: string[] = [];
  let manualPreferences: string[] = [];
  if (project) {
    try {
      const manual = loadProjectManual(project, false);
      if (manual) {
        manualRules = manual.rules
          .filter((rule) => rule.mode === 'enforce')
          .map((rule) => rule.text);
        manualPreferences = manual.rules
          .filter((rule) => rule.mode === 'advisory')
          .map((rule) => rule.text);
      }
    } catch {
      /*
       * Fast context remains available even if the
       * optional Project Manual projection is damaged.
       */
    }
  }
  const checkpointMemory = project
    ? selectDurableCheckpointFacts(readLatestDurableCheckpoint(project), now)
    : {
        rules: [],
        observations: [],
      };
  const longTermRules = uniqueLines(
    [
      ...manualRules.map((rule) => `[ENFORCE] ${rule}`),
      ...checkpointMemory.rules.map((rule) => `[HIGH-CONFIDENCE RULE] ${rule}`),
    ],
    10
  );
  const projection = project
    ? buildCurrentWorkProjection(project, {
        agentId: options.agentId,
        now,
      })
    : undefined;
  const currentWork = projection
    ? renderCompactCurrentWork(projection, {
        now,
        maxChars: 3_000,
      })
    : '';
  /*
   * Fast Handoff is legacy/fallback continuity only.
   *
   * Once Persistent Tasks own the project, a handoff
   * must never compete with canonical Current Work.
   */
  let handoffContext = '';
  if (project && projection?.authority !== 'persistent-tasks') {
    const handoff = readFastHandoff(project);
    if (handoff && isRecentTimestamp(handoff.generatedAt, 14, now)) {
      handoffContext = formatFastHandoffContext(project, 900) ?? '';
    }
  }
  const offloadGraph = buildCompactContextOffloadGraph(projectRoot, {
    maxAssets: 4,
    maxChars: 600,
  });
  const profile = compactStartupText(profileContent, 7, 220);
  const header = [
    '[TOOLNET PROJECT CONTEXT]',
    '',
    `Project: ${projectName}`,
    `Root: ${projectRoot}`,
    '',
  ].join('\n');
  const footer = [
    '',
    memoryAgentStartupGuidance(),
    '',
    'Startup rules:',
    '- Current repository evidence overrides stale Memory.',
    '- Persistent Tasks are execution authority.',
    '- Do not revive stale/completed Task history automatically.',
    '- Do not replay raw sessions at startup.',
    '- Use memory_agent_ask only when deeper history is actually needed.',
  ].join('\n');
  const fixedChars = header.length + footer.length + 4;
  const bodyTokens = Math.max(160, Math.floor(Math.max(700, maxChars - fixedChars) / 3.5));
  const body = renderRankedContextSections(
    [
      {
        title: 'Long-term Rules',
        content: longTermRules.join('\n'),
        priority: 130,
        maxTokens: 260,
      },
      {
        title: 'Current Work',
        content: currentWork
          ? renderUntrustedProjectData('.toolnet/current-work-projection', currentWork)
          : '',
        priority: 120,
        maxTokens: 420,
      },
      {
        title: 'Project Preferences',
        content: uniqueLines(manualPreferences, 6).join('\n'),
        priority: 105,
        maxTokens: 100,
      },
      {
        title: 'Recent High-Confidence Memory',
        content: checkpointMemory.observations.length
          ? renderUntrustedProjectData(
              '.toolnet/memory/checkpoints/latest.json',
              checkpointMemory.observations.map((item) => `- ${item}`).join('\n')
            )
          : '',
        priority: 95,
        maxTokens: 160,
      },
      {
        title: 'Project Profile',
        content: profile ? renderUntrustedProjectData('.toolnet/profile.md', profile) : '',
        priority: 80,
        maxTokens: 110,
      },
      {
        title: 'Fallback Handoff',
        content: handoffContext
          ? renderUntrustedProjectData('.toolnet/context/handoff.md', handoffContext)
          : '',
        priority: 50,
        maxTokens: 120,
      },
      {
        title: 'Context Offload Pointers',
        content: offloadGraph,
        priority: 30,
        maxTokens: 100,
      },
    ],
    bodyTokens
  );
  const output = [header.trimEnd(), body, footer.trimStart()].filter(Boolean).join('\n\n');
  return hardLimit(output, maxChars);
}

/**
 * Agent instruction files now receive the same ranked/filtered
 * startup context instead of raw profile/current history.
 */
export function syncAgentInstructionFiles(options: FastContextOptions = {}): string[] {
  const startPath = options.projectPath || process.cwd();
  const projectRoot = findProjectRoot(startPath);
  if (!projectRoot) {
    throw new Error('Not in a ToolNet project (no .toolnet directory found)');
  }
  const context =
    buildFastProjectContext({
      ...options,
      projectPath: projectRoot,
      maxChars: Math.min(options.maxChars ?? 5_200, 5_200),
    }) ?? '';
  const agentContent = `# AI Startup Instructions
Use the ranked ToolNet context below.
Rules:
- Do not ingest raw .toolnet session history automatically.
- Do not run session:agy-recover, handoff:latest, or brief automatically.
- Do not invent previous-session state.
- Persistent Tasks are execution authority.
- Current repository evidence overrides stale memory.
${memoryAgentGuidance()}
---
${context}
`;
  const files = ['GEMINI.md', 'AGENTS.md', 'CLAUDE.md'];
  const created: string[] = [];
  for (const file of files) {
    const filePath = path.join(projectRoot, file);
    try {
      fs.writeFileSync(filePath, agentContent, 'utf-8');
      created.push(file);
    } catch (error) {
      console.error(`Failed to write ${file}:`, error);
    }
  }
  return created;
}

export function hashContext(context: string): string {
  return crypto.createHash('sha256').update(context, 'utf-8').digest('hex');
}
