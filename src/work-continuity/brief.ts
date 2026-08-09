import type { ProjectManifest } from '../core/types.js';

import type { StorageProvider } from '../storage/types.js';

import { loadProjectManual, projectManualPath } from '../project-manual/manager.js';

import { loadLatestHandoff } from './handoff.js';

import { loadWorkState } from './reducer.js';

import { loadSemanticWorkState } from './semantic-reducer.js';

export interface StartupBrief {
  version: 1;

  projectId: string;

  projectName: string;

  text: string;

  estimatedTokens: number;

  maxTokens: number;

  hasManual: boolean;

  hasWorkState: boolean;

  hasHandoff: boolean;

  generatedAt: string;
}

function estimateTokens(value: string): number {
  if (!value) {
    return 0;
  }

  const chars = Array.from(value).length;

  const words = value.trim().split(/\s+/u).filter(Boolean).length;

  /*
   * Lightweight conservative approximation.
   * No tokenizer dependency required.
   */
  return Math.ceil(Math.max(chars / 3.5, words * 1.3));
}

function clip(
  value: string,

  maxChars: number
): string {
  const clean = value.replace(/\s+/g, ' ').trim();

  if (clean.length <= maxChars) {
    return clean;
  }

  return clean.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
}

function manualNotes(content: string): string[] {
  const output: string[] = [];

  let inComment = false;

  for (const raw of content.split(/\r?\n/u)) {
    let line = raw.trim();

    if (line.includes('<!--')) {
      inComment = true;
    }

    if (inComment) {
      if (line.includes('-->')) {
        inComment = false;
      }

      continue;
    }

    const lower = line.toLowerCase();

    if (
      !line ||
      line.startsWith('#') ||
      line === '```' ||
      lower.startsWith('- [enforce]') ||
      lower.startsWith('* [enforce]') ||
      lower.startsWith('- [advisory]') ||
      lower.startsWith('* [advisory]')
    ) {
      continue;
    }

    line = line.replace(/^[-*]\s+/u, '');

    if (line) {
      output.push(clip(line, 280));
    }

    if (output.length >= 16) {
      break;
    }
  }

  return output;
}

function parseRemoteRules(content: string) {
  const enforce: string[] = [];

  const advisory: string[] = [];

  for (const raw of content.split(/\\r?\\n/u)) {
    const line = raw.trim();

    const lower = line.toLowerCase();

    const prefixes = ['- [enforce]', '* [enforce]', '- [advisory]', '* [advisory]'];

    const prefix = prefixes.find((item) => lower.startsWith(item));

    if (!prefix) {
      continue;
    }

    const text = line.slice(prefix.length).trim();

    if (!text) {
      continue;
    }

    if (prefix.includes('enforce')) {
      enforce.push(text);
    } else {
      advisory.push(text);
    }
  }

  return {
    enforce,
    advisory,
  };
}

function fitLines(
  lines: string[],

  maxTokens: number
): string {
  const output: string[] = [];

  for (const line of lines) {
    const candidate = [...output, line].join('\n');

    if (estimateTokens(candidate) <= maxTokens) {
      output.push(line);

      continue;
    }

    const used = estimateTokens(output.join('\n'));

    const remaining = Math.max(0, maxTokens - used);

    if (remaining >= 16) {
      const maxChars = Math.floor(remaining * 3.2);

      const partial = clip(line, maxChars);

      if (partial) {
        output.push(partial);
      }
    }

    break;
  }

  return output.join('\n').trim();
}

export async function buildStartupBrief(options: {
  project: ProjectManifest;

  storage: StorageProvider;

  maxTokens?: number;
}): Promise<StartupBrief> {
  const maxTokens = Math.max(256, Math.min(2000, options.maxTokens ?? 1000));

  const localManual = loadProjectManual(options.project, false);

  let manualContent = localManual?.content ?? '';

  /*
   * Cross-machine/VPS fallback.
   * If PROJECT.md isn't local yet, read the project-scoped
   * copy from remote storage.
   */
  if (!manualContent) {
    manualContent =
      (await options.storage.getText(`projects/${options.project.id}/project/manual.md`)) ?? '';
  }

  const parsedRemote = parseRemoteRules(manualContent);

  const enforce = localManual
    ? localManual.rules.filter((rule) => rule.mode === 'enforce').map((rule) => rule.text)
    : parsedRemote.enforce;

  const advisory = localManual
    ? localManual.rules.filter((rule) => rule.mode === 'advisory').map((rule) => rule.text)
    : parsedRemote.advisory;

  const notes = manualContent ? manualNotes(manualContent) : [];

  const state = await loadWorkState(options.project, options.storage);

  const semantic = await loadSemanticWorkState(options.project, options.storage);

  const handoff = await loadLatestHandoff(options.project, options.storage);

  const lines: string[] = [];

  lines.push('[TOOLNET PROJECT CONTEXT]');

  lines.push(`Project: ${options.project.name}`);

  lines.push(
    'Continue existing project state. Do not restart completed work unless evidence shows it is necessary.'
  );

  if (manualContent) {
    lines.push(`Full operating manual: ${projectManualPath(options.project)}`);
  }

  /*
   * Highest priority:
   * project operating rules.
   */
  if (enforce.length) {
    lines.push('', 'PROJECT RULES — MUST FOLLOW');

    for (const rule of enforce.slice(0, 24)) {
      lines.push(`- [ENFORCE] ${clip(rule, 240)}`);
    }
  }

  if (advisory.length) {
    lines.push('', 'PROJECT PREFERENCES');

    for (const rule of advisory.slice(0, 10)) {
      lines.push(`- ${clip(rule, 220)}`);
    }
  }

  /*
   * Semantic continuity:
   * tell the new agent WHAT it is doing and WHY,
   * before telling it which checkbox comes next.
   */
  if (semantic) {
    if (semantic.mission) {
      lines.push('', 'MISSION', clip(semantic.mission.value, 420));
    }

    if (semantic.activeObjective) {
      lines.push('', 'CURRENT OBJECTIVE', clip(semantic.activeObjective.value, 420));
    }

    if (semantic.why) {
      lines.push('', 'WHY THIS WORK MATTERS', clip(semantic.why.value, 420));
    }

    if (semantic.desiredOutcome) {
      lines.push('', 'DESIRED OUTCOME', clip(semantic.desiredOutcome.value, 420));
    }

    if (semantic.planRationale) {
      lines.push('', 'WHY THIS APPROACH', clip(semantic.planRationale.value, 420));
    }
  }

  /*
   * Next priority:
   * unfinished execution state.
   */
  if (state) {
    lines.push('', 'ACTIVE WORK');

    if (state.goal) {
      lines.push(`Goal: ${clip(state.goal, 320)}`);
    }

    if (state.plan) {
      lines.push(`Plan: ${clip(state.plan, 320)}`);
    }

    lines.push(
      `Progress: phases ${state.progress.phasesCompleted}/${state.progress.phasesTotal}; tasks ${state.progress.tasksCompleted}/${state.progress.tasksTotal}; blocked ${state.progress.blocked}`
    );

    if (state.currentPhase) {
      lines.push(`Current phase: ${state.currentPhase.title} [${state.currentPhase.status}]`);
    }

    if (state.currentPhase && semantic) {
      const semanticPhase = semantic.phases.find(
        (item) => item.order === state.currentPhase?.order
      );

      if (semanticPhase) {
        if (semanticPhase.objective) {
          lines.push(`Phase objective: ${clip(semanticPhase.objective.value, 340)}`);
        }

        if (semanticPhase.why) {
          lines.push(`Why this phase: ${clip(semanticPhase.why.value, 340)}`);
        } else {
          lines.push(
            'Why this phase: not explicitly recorded. Inspect existing implementation before assuming intent.'
          );
        }

        if (semanticPhase.deliverable) {
          lines.push(`Deliverable: ${clip(semanticPhase.deliverable.value, 340)}`);
        }

        if (semanticPhase.dependencies.length) {
          lines.push(
            `Depends on: ${semanticPhase.dependencies
              .slice(0, 4)
              .map((item) => clip(item.value, 180))
              .join('; ')}`
          );
        }

        if (semanticPhase.acceptanceCriteria.length) {
          lines.push('', 'DEFINITION OF DONE');

          semanticPhase.acceptanceCriteria.slice(0, 6).forEach((item) => {
            lines.push(`- ${clip(item.value, 260)}`);
          });
        }

        if (semanticPhase.openQuestions.length) {
          lines.push('', 'OPEN QUESTIONS FOR CURRENT PHASE');

          semanticPhase.openQuestions.slice(0, 4).forEach((item) => {
            lines.push(`- ${clip(item.value, 260)}`);
          });
        }
      }
    }

    if (state.currentTask) {
      lines.push(`Current task: ${state.currentTask.title} [${state.currentTask.status}]`);
    }

    if (state.nextActions.length) {
      lines.push('', 'NEXT ACTIONS');

      state.nextActions.slice(0, 6).forEach((action, index) => {
        lines.push(`${index + 1}. ${clip(action, 260)}`);
      });
    }

    if (state.blockers.length) {
      lines.push('', 'BLOCKERS');

      state.blockers.slice(0, 5).forEach((blocker) => {
        lines.push(`- ${clip(blocker, 260)}`);
      });
    }

    if (state.warnings.length) {
      lines.push('', 'ATTENTION');

      state.warnings.slice(-5).forEach((warning) => {
        lines.push(`- ${clip(warning, 260)}`);
      });
    }

    if (state.decisions.length) {
      lines.push('', 'RECENT DECISIONS');

      state.decisions.slice(-5).forEach((decision) => {
        lines.push(`- ${clip(decision, 260)}`);
      });
    }

    if (state.lastSession) {
      lines.push(
        '',
        `Last work session: ${state.lastSession.agent} / ${state.lastSession.nativeSessionId}`
      );
    }
  }

  if (semantic && semantic.openQuestions.length) {
    lines.push('', 'UNRESOLVED QUESTIONS');

    semantic.openQuestions.slice(0, 5).forEach((item) => {
      lines.push(`- ${clip(item.value, 260)}`);
    });
  }

  if (handoff) {
    lines.push(`Latest handoff: ${handoff.reason} / ${handoff.sourceSession.agent}`);
  }

  /*
   * Lower priority operational notes.
   */
  if (notes.length) {
    lines.push('', 'OPERATING NOTES');

    for (const note of notes) {
      lines.push(`- ${note}`);
    }
  }

  lines.push(
    '',
    'Before changing anything: verify the current repository state and continue from the active phase/task above.'
  );

  const text = fitLines(lines, maxTokens);

  return {
    version: 1,

    projectId: options.project.id,

    projectName: options.project.name,

    text,

    estimatedTokens: estimateTokens(text),

    maxTokens,

    hasManual: Boolean(manualContent),

    hasWorkState: Boolean(state),

    hasHandoff: Boolean(handoff),

    generatedAt: new Date().toISOString(),
  };
}
