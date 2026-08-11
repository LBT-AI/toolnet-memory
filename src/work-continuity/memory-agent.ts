import type { ProjectManifest } from '../core/types.js';

import { createResilientAiRouter } from '../ai/router.js';

import { answerMemoryQuestion } from './memory-query.js';

import { loadLocalWorkState } from './local-work-state.js';

import { readSessionOrigin } from './session-origin.js';

export interface MemoryAgentAnswer {
  answer: string;

  provider?: string;

  model?: string;

  usedAi: boolean;
}

function compactJson(value: unknown, maxChars: number): string {
  const text = JSON.stringify(value, null, 2);

  if (text.length <= maxChars) {
    return text;
  }

  return text.slice(0, maxChars) + '\n[truncated]';
}

function buildMemoryContext(project: ProjectManifest, question: string): string {
  const direct = answerMemoryQuestion(project, question);

  const origin = readSessionOrigin(project);

  const state = loadLocalWorkState(project);

  const context = {
    project: {
      id: project.id,

      name: project.name,
    },

    directAnswer: direct.answer,

    previousSession: origin,

    workState: state
      ? {
          goal: state.goal,

          plan: state.plan,

          currentPhase: state.currentPhase,

          currentTask: state.currentTask,

          tasks: state.tasks,

          blockers: state.blockers,

          decisions: state.decisions,

          nextActions: state.nextActions,

          filesTouched: state.filesTouched,

          tests: state.tests,

          progress: state.progress,

          lastSession: state.lastSession,
        }
      : null,
  };

  return compactJson(context, 7000);
}

export async function askMemoryAgent(
  project: ProjectManifest,
  question: string
): Promise<MemoryAgentAnswer> {
  const local = answerMemoryQuestion(project, question);

  const context = buildMemoryContext(project, question);

  const router = createResilientAiRouter();

  try {
    const result = await router.generate({
      temperature: 0.1,

      maxTokens: 450,

      messages: [
        {
          role: 'system',

          content: `
You are ToolNet Memory Agent.

You are NOT the coding agent.

Your job is to help another coding AI continue work from previous sessions.

Rules:

1. Answer only from the supplied ToolNet project memory.
2. Never invent completed work, files, blockers, decisions, or test results.
3. Prefer the latest session/work state over old information.
4. Be concise.
5. Do not dump raw JSON or full memory files.
6. Tell the coding agent exactly:
   - what the previous agent was doing,
   - what is already completed,
   - what remains unfinished,
   - what file was last touched,
   - what should be done next,
   when those facts are available.
7. If information is missing, say it is not recorded.
8. Do not explain ToolNet internals unless asked.
9. Do not repeat irrelevant history.
10. Respond in the same language as the question.

Think of yourself as the project's memory coworker talking directly to another AI.
`.trim(),
        },

        {
          role: 'user',

          content: `
Question from coding agent:

${question}

ToolNet selected memory:

${context}

Answer the coding agent directly.
`.trim(),
        },
      ],
    });

    const text = result.text.trim();

    if (!text) {
      return {
        answer: local.answer,

        usedAi: false,
      };
    }

    return {
      answer: text,

      provider: result.provider,

      model: result.model,

      usedAi: true,
    };
  } catch {
    /*
     * AI failure must never destroy continuity.
     *
     * Rule-based local query remains the fallback.
     */
    return {
      answer: local.answer,

      usedAi: false,
    };
  }
}
