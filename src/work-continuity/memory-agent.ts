import type { ProjectManifest } from '../core/types.js';

import { createResilientAiRouter } from '../ai/router.js';

import { answerRetrievedMemoryQuestion } from './memory-local-answer.js';

import { retrieveMemoryContext } from './memory-retrieval.js';

type MemoryAgentRouter = Pick<ReturnType<typeof createResilientAiRouter>, 'generate'>;

export interface MemoryAgentOptions {
  /**
   * Primarily used by recovery certification/tests.
   * Production callers continue to use createResilientAiRouter().
   */
  router?: MemoryAgentRouter;
}

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
  const direct = answerRetrievedMemoryQuestion(project, question);

  const retrieval = retrieveMemoryContext(project, question, {
    maxFacts: 12,

    maxChars: 3200,
  });

  return compactJson(
    {
      project: retrieval.context.project,

      intent: retrieval.intent,

      directAnswer: direct.answer,

      selectedMemory: retrieval.context.selectedFacts,

      retrievalStats: retrieval.stats,
    },
    4200
  );
}

export async function askMemoryAgent(
  project: ProjectManifest,
  question: string,
  options: MemoryAgentOptions = {}
): Promise<MemoryAgentAnswer> {
  const local = answerRetrievedMemoryQuestion(project, question);

  const context = buildMemoryContext(project, question);

  const router = options.router ?? createResilientAiRouter();

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
