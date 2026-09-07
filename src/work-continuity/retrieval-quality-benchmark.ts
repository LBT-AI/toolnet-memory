import type { CompositeRetrievalMode } from './composite-retrieval.js';
import type {
  IntentAwareRetrievalIntent,
  IntentAwareRetrievalSource,
} from './intent-aware-retrieval.js';

export const RETRIEVAL_QUALITY_BENCHMARK_VERSION = 'phase61-v1';

export interface RetrievalQualityBenchmarkCase {
  id: string;
  language: 'vi' | 'en';
  question: string;
  expectedMode: CompositeRetrievalMode;
  expectedIntents: IntentAwareRetrievalIntent[];
  expectedSources: IntentAwareRetrievalSource[];
  expectedOmittedIntents?: IntentAwareRetrievalIntent[];
  maxSources?: number;
  tags: string[];
}

/**
 * Fixed benchmark.
 *
 * This is intentionally hand-authored rather than generated from
 * the router implementation. It is external ground truth used to
 * detect routing regressions.
 */
export const RETRIEVAL_QUALITY_BENCHMARK: RetrievalQualityBenchmarkCase[] = [
  {
    id: 'vi-current-task',
    language: 'vi',
    question: 'task hiện tại là gì?',
    expectedMode: 'single',
    expectedIntents: ['current_work'],
    expectedSources: ['persistent-tasks'],
    tags: ['single', 'task'],
  },
  {
    id: 'en-current-task',
    language: 'en',
    question: 'what is the current task?',
    expectedMode: 'single',
    expectedIntents: ['current_work'],
    expectedSources: ['persistent-tasks'],
    tags: ['single', 'task'],
  },
  {
    id: 'vi-next-action',
    language: 'vi',
    question: 'tiếp theo cần làm gì?',
    expectedMode: 'single',
    expectedIntents: ['current_work'],
    expectedSources: ['persistent-tasks'],
    tags: ['single', 'task'],
  },
  {
    id: 'en-blocker',
    language: 'en',
    question: 'what blocker is still open?',
    expectedMode: 'single',
    expectedIntents: ['current_work'],
    expectedSources: ['persistent-tasks'],
    tags: ['single', 'task'],
  },
  {
    id: 'vi-artifact-deploy',
    language: 'vi',
    question: 'deploy production đã verified chưa?',
    expectedMode: 'single',
    expectedIntents: ['artifact'],
    expectedSources: ['task-artifacts'],
    tags: ['single', 'artifact'],
  },
  {
    id: 'en-artifact-deploy',
    language: 'en',
    question: 'what is the deployment status?',
    expectedMode: 'single',
    expectedIntents: ['artifact'],
    expectedSources: ['task-artifacts'],
    tags: ['single', 'artifact'],
  },
  {
    id: 'vi-backup-path',
    language: 'vi',
    question: 'đường dẫn backup production ở đâu?',
    expectedMode: 'single',
    expectedIntents: ['artifact'],
    expectedSources: ['task-artifacts'],
    tags: ['single', 'artifact'],
  },
  {
    id: 'vi-rule',
    language: 'vi',
    question: 'quy tắc production là gì?',
    expectedMode: 'single',
    expectedIntents: ['rules'],
    expectedSources: ['canonical-memory'],
    tags: ['single', 'memory', 'rule'],
  },
  {
    id: 'en-rule',
    language: 'en',
    question: 'what project rules must always apply?',
    expectedMode: 'single',
    expectedIntents: ['rules'],
    expectedSources: ['canonical-memory'],
    tags: ['single', 'memory', 'rule'],
  },
  {
    id: 'vi-decision',
    language: 'vi',
    question: 'vì sao chọn append-only operation log?',
    expectedMode: 'single',
    expectedIntents: ['decision'],
    expectedSources: ['canonical-memory'],
    tags: ['single', 'memory', 'decision'],
  },
  {
    id: 'en-decision',
    language: 'en',
    question: 'why did we choose append-only operation logs?',
    expectedMode: 'single',
    expectedIntents: ['decision'],
    expectedSources: ['canonical-memory'],
    tags: ['single', 'memory', 'decision'],
  },
  {
    id: 'vi-code',
    language: 'vi',
    question: 'TaskStore class được định nghĩa ở đâu?',
    expectedMode: 'single',
    expectedIntents: ['code'],
    expectedSources: ['code-intelligence'],
    tags: ['single', 'code'],
  },
  {
    id: 'en-code',
    language: 'en',
    question: 'where is the TaskStore class defined?',
    expectedMode: 'single',
    expectedIntents: ['code'],
    expectedSources: ['code-intelligence'],
    tags: ['single', 'code'],
  },
  {
    id: 'vi-history',
    language: 'vi',
    question: 'lịch sử replication trước đây thế nào?',
    expectedMode: 'single',
    expectedIntents: ['history'],
    expectedSources: ['canonical-memory'],
    tags: ['single', 'history'],
  },
  {
    id: 'en-history',
    language: 'en',
    question: 'show historical previous work for replication',
    expectedMode: 'single',
    expectedIntents: ['history'],
    expectedSources: ['canonical-memory'],
    tags: ['single', 'history'],
  },
  {
    id: 'vi-continuity',
    language: 'vi',
    question: 'agent trước bàn giao gì?',
    expectedMode: 'single',
    expectedIntents: ['continuity'],
    expectedSources: ['legacy-continuity'],
    tags: ['single', 'continuity'],
  },
  {
    id: 'en-continuity',
    language: 'en',
    question: 'what did the previous session handoff?',
    expectedMode: 'single',
    expectedIntents: ['continuity'],
    expectedSources: ['legacy-continuity'],
    tags: ['single', 'continuity'],
  },
  {
    id: 'vi-recent',
    language: 'vi',
    question: 'production hiện tại đang dùng config nào?',
    expectedMode: 'single',
    expectedIntents: ['recent_state'],
    expectedSources: ['canonical-memory'],
    tags: ['single', 'recent'],
  },
  {
    id: 'en-recent',
    language: 'en',
    question: 'what is the latest state of production?',
    expectedMode: 'single',
    expectedIntents: ['recent_state'],
    expectedSources: ['canonical-memory'],
    tags: ['single', 'recent'],
  },
  {
    id: 'vi-summary',
    language: 'vi',
    question: 'tóm tắt project hiện tại',
    expectedMode: 'single',
    expectedIntents: ['summary'],
    expectedSources: ['persistent-tasks'],
    tags: ['single', 'summary'],
  },
  {
    id: 'vi-current-artifact',
    language: 'vi',
    question: 'task hiện tại là gì và deploy production verified chưa?',
    expectedMode: 'composite',
    expectedIntents: ['current_work', 'artifact'],
    expectedSources: ['persistent-tasks', 'task-artifacts'],
    tags: ['composite', 'task', 'artifact'],
  },
  {
    id: 'en-current-code',
    language: 'en',
    question: 'what is the current task and where is TaskStore class defined?',
    expectedMode: 'composite',
    expectedIntents: ['current_work', 'code'],
    expectedSources: ['persistent-tasks', 'code-intelligence'],
    tags: ['composite', 'task', 'code'],
  },
  {
    id: 'vi-rule-decision',
    language: 'vi',
    question: 'quy tắc production là gì và vì sao chọn append-only operation log?',
    expectedMode: 'composite',
    expectedIntents: ['decision', 'rules'],
    expectedSources: ['canonical-memory'],
    tags: ['composite', 'same-source', 'memory'],
  },
  {
    id: 'vi-current-artifact-code',
    language: 'vi',
    question:
      'task hiện tại là gì, deploy production verified chưa và TaskStore class được định nghĩa ở đâu?',
    expectedMode: 'composite',
    expectedIntents: ['current_work', 'artifact', 'code'],
    expectedSources: ['persistent-tasks', 'task-artifacts', 'code-intelligence'],
    tags: ['composite', 'three-source'],
  },
  {
    id: 'en-history-code',
    language: 'en',
    question: 'show historical replication work and where is TaskStore class defined?',
    expectedMode: 'composite',
    expectedIntents: ['code', 'history'],
    expectedSources: ['code-intelligence', 'canonical-memory'],
    tags: ['composite', 'history', 'code'],
  },
  {
    id: 'vi-recent-artifact',
    language: 'vi',
    question: 'production hiện tại đang dùng config nào và deploy đã verified chưa?',
    expectedMode: 'composite',
    expectedIntents: ['artifact', 'recent_state'],
    expectedSources: ['task-artifacts', 'canonical-memory'],
    tags: ['composite', 'recent', 'artifact'],
  },
  {
    id: 'vi-continuity-current',
    language: 'vi',
    question: 'agent trước bàn giao gì và task hiện tại là gì?',
    expectedMode: 'composite',
    expectedIntents: ['current_work', 'continuity'],
    expectedSources: ['persistent-tasks', 'legacy-continuity'],
    tags: ['composite', 'continuity', 'task'],
  },
  {
    id: 'vi-memory-three-intents',
    language: 'vi',
    question:
      'quy tắc production là gì, vì sao chọn append-only log và lịch sử replication trước đây thế nào?',
    expectedMode: 'composite',
    expectedIntents: ['decision', 'rules', 'history'],
    expectedSources: ['canonical-memory'],
    tags: ['composite', 'same-source', 'memory'],
  },
  {
    id: 'vi-budget-four-intents',
    language: 'vi',
    question:
      'task hiện tại là gì và deploy production verified chưa và TaskStore class được định nghĩa ở đâu và vì sao chọn append-only operation log?',
    expectedMode: 'composite',
    expectedIntents: ['current_work', 'artifact', 'code'],
    expectedSources: ['persistent-tasks', 'task-artifacts', 'code-intelligence'],
    expectedOmittedIntents: ['decision'],
    maxSources: 3,
    tags: ['composite', 'budget', 'three-source'],
  },
];
