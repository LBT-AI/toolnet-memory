import type { ProjectManifest } from '../core/types.js';

import { answerRetrievedMemoryQuestion } from './memory-local-answer.js';

export interface MemoryAgentAnswer {
  answer: string;

  usedAi: boolean;
}

/**
 * Answers a continuity question from local ToolNet memory only.
 *
 * No LLM / AI provider is involved. The deterministic rule-based
 * answer from memory retrieval is returned directly.
 */
export async function askMemoryAgent(
  project: ProjectManifest,
  question: string
): Promise<MemoryAgentAnswer> {
  const local = answerRetrievedMemoryQuestion(project, question);

  if (!local.answer) {
    return {
      answer: 'ToolNet chưa có đủ memory cho câu hỏi này.',

      usedAi: false,
    };
  }

  return {
    answer: local.answer,

    usedAi: false,
  };
}
