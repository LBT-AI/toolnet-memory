function normalizeQuestion(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
}

const CONTINUITY_CUES = [
  /\bhandoff\b/u,
  /\bcontinuity\b/u,
  /\bcontinue\b/u,
  /\bresume\b/u,
  /\btakeover\b/u,
  /\btake over\b/u,
  /tiếp tục/u,
  /tiếp quản/u,
  /bàn giao/u,
  /dừng ở đâu/u,
  /đang làm gì/u,
];

const SECTION_CUES = [
  /\bcurrent state\b/u,
  /\bcurrent task\b/u,
  /\bevidence\b/u,
  /\breport locations?\b/u,
  /\bfiles?\b/u,
  /\burls?\b/u,
  /\bassets?\b/u,
  /\btests?\b/u,
  /\bcommands?\b/u,
  /\bblockers?\b/u,
  /\bnext actions?\b/u,
  /trạng thái hiện tại/u,
  /task hiện tại/u,
  /bằng chứng/u,
  /vị trí báo cáo/u,
  /file/u,
  /url/u,
  /blocker/u,
  /việc tiếp theo/u,
  /bước tiếp theo/u,
];

const SUMMARY_CUES = [
  /\bsummarize\b/u,
  /\bsummary\b/u,
  /\bfull state\b/u,
  /\bfull context\b/u,
  /tóm tắt/u,
  /đầy đủ/u,
  /toàn bộ trạng thái/u,
];

function countSectionRequests(question: string): number {
  let count = 0;

  for (const pattern of SECTION_CUES) {
    if (pattern.test(question)) {
      count += 1;
    }
  }

  return count;
}

/**
 * Decide whether memory_agent_ask should return the canonical
 * structured handoff instead of a short deterministic fact answer.
 *
 * Direct questions such as "blocker là gì?" or "next action?"
 * remain concise unless the user clearly asks for continuity/handoff
 * context or multiple state dimensions.
 */
export function shouldUseStructuredHandoff(question: string, intent: string): boolean {
  const normalized = normalizeQuestion(question);

  /*
   * Explicit TODO queries are direct deterministic questions.
   *
   * detectMemoryQueryIntent() currently classifies TODO questions
   * as summary because there is no dedicated TODO intent.
   *
   * Do NOT route these into the takeover formatter, otherwise
   * canonical remaining.todos disappears from the direct answer.
   */
  const explicitTodo =
    /(?:^|\s)(?:todo|to-do)(?:\s|$)/u.test(normalized) ||
    /(?:việc|task)\s+(?:còn lại|chưa làm|chưa xong|chưa hoàn thành)/u.test(normalized) ||
    /(?:còn|các)\s+(?:todo|việc)\b/u.test(normalized);

  if (explicitTodo) {
    return false;
  }

  if (intent === 'summary' || intent === 'status') {
    return true;
  }

  if (!normalized) {
    return false;
  }

  const hasContinuityCue = CONTINUITY_CUES.some((pattern) => pattern.test(normalized));

  const hasSummaryCue = SUMMARY_CUES.some((pattern) => pattern.test(normalized));

  const requestedSections = countSectionRequests(normalized);

  /*
   * Explicit handoff/continuity request.
   */
  if (hasContinuityCue && requestedSections >= 1) {
    return true;
  }

  /*
   * User asks to summarize multiple dimensions of work state.
   *
   * Example:
   * "summarize current state, evidence/report locations,
   * files, blockers and next actions"
   */
  if (hasSummaryCue && requestedSections >= 2) {
    return true;
  }

  /*
   * Even without the word "summary", requesting several canonical
   * handoff dimensions means this is effectively an agent takeover.
   */
  if (requestedSections >= 4) {
    return true;
  }

  return false;
}
