import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import { askMemoryAgent } from '../work-continuity/memory-agent.js';

import {
  prepareMemoryConversation,
  readMemoryConversationState,
} from '../work-continuity/memory-conversation.js';

import { answerRetrievedMemoryQuestion } from '../work-continuity/memory-local-answer.js';

import { applyObservationsToLocalWorkState } from '../work-continuity/local-work-state.js';

import { writeStableWorkStateToCurrent } from '../work-continuity/work-state-current.js';

export interface RecoveryCertificationCheck {
  id: string;

  label: string;

  passed: boolean;

  detail?: string;
}

export interface RecoveryCertificationResult {
  passed: boolean;

  total: number;

  passedCount: number;

  checks: RecoveryCertificationCheck[];
}

function project(rootPath: string, id: string): ProjectManifest {
  return {
    id,

    name: id,

    rootPath,

    createdAt: '2026-08-13T16:00:00.000Z',

    updatedAt: '2026-08-13T16:00:00.000Z',

    graphVersion: 1,

    memoryVersion: 1,
  };
}

function ensureProjectDirectories(root: string): void {
  mkdirSync(join(root, '.toolnet', 'work'), {
    recursive: true,
    mode: 0o700,
  });

  mkdirSync(join(root, '.toolnet', 'context'), {
    recursive: true,
    mode: 0o700,
  });

  mkdirSync(join(root, '.toolnet', 'runtime', 'sources'), {
    recursive: true,
    mode: 0o700,
  });
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(join(file, '..'), {
    recursive: true,
  });

  writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {
    encoding: 'utf8',
    mode: 0o600,
  });
}

function writeOrigin(
  projectManifest: ProjectManifest,
  task: string,
  file: string,
  nextAction: string
): void {
  writeJson(join(projectManifest.rootPath, '.toolnet', 'context', 'session-origin.json'), {
    version: 1,

    projectId: projectManifest.id,

    agent: 'codex',

    nativeSessionId: 'x2-origin',

    updatedAt: '2026-08-13T16:00:00.000Z',

    currentTask: task,

    currentPhase: 'X2 Recovery',

    lastTouchedFile: file,

    latestNextAction: nextAction,
  });
}

function writeWorkState(
  projectManifest: ProjectManifest,
  task: string,
  file: string,
  nextAction: string
): void {
  const occurredAt = '2026-08-13T16:00:00.000Z';

  const base = {
    version: 1 as const,

    projectId: projectManifest.id,

    confidence: 1,

    occurredAt,

    sequence: 1,

    agent: 'opencode',

    nativeSessionId: 'x2-work',

    sessionKey: 'opencode:x2-work',
  };

  const state = applyObservationsToLocalWorkState(projectManifest, [
    {
      ...base,

      id: 'x2-task-observation',

      kind: 'task',

      key: 'task:x2',

      text: task,

      status: 'in_progress',

      order: 1,

      eventId: 'x2-task-event',
    },

    {
      ...base,

      id: 'x2-file-observation',

      kind: 'file',

      key: 'file:x2',

      text: file,

      eventId: 'x2-file-event',
    },

    {
      ...base,

      id: 'x2-next-observation',

      kind: 'next_action',

      key: 'next:x2',

      text: nextAction,

      eventId: 'x2-next-event',
    },
  ]);

  writeStableWorkStateToCurrent(projectManifest, state);
}

function canonicalHandoff(
  projectManifest: ProjectManifest,
  task: string,
  file: string,
  todo: string,
  nextAction: string
): unknown {
  return {
    continuity: {
      schema: 'toolnet.handoff.v2',

      version: 2,

      project: {
        id: projectManifest.id,

        name: projectManifest.name,
      },

      source: {
        agent: 'agy',

        nativeSessionId: 'x2-handoff',

        sessionKey: 'agy:x2-handoff',

        sequence: 99,

        reason: 'checkpoint',
      },

      capturedAt: '2026-08-13T16:00:00.000Z',

      current: {
        phase: {
          id: 'x2',

          title: 'X2 Recovery',

          status: 'in_progress',
        },

        task: {
          id: 'x2-task',

          title: task,

          status: 'in_progress',
        },

        file,
      },

      completed: {
        phases: ['X1'],

        tasks: ['X1 cross-agent continuity'],
      },

      remaining: {
        phases: ['X2'],

        tasks: [task],

        todos: [todo],
      },

      nextAction,

      blockers: [],

      decisions: ['Canonical handoff must remain authoritative'],

      files: {
        current: file,

        recent: [file],
      },

      tests: {
        status: 'passing',

        recent: ['X1 PASS 4/4'],
      },

      attention: [],

      progress: {
        phasesTotal: 3,

        phasesCompleted: 1,

        tasksTotal: 3,

        tasksCompleted: 1,

        blocked: 0,
      },

      stateDigest: 'a'.repeat(64),
    },
  };
}

function findConversationStateFile(root: string): string | null {
  const directory = join(root, '.toolnet', 'context');

  for (const name of readdirSync(directory)) {
    const file = join(directory, name);

    if (!name.endsWith('.json')) {
      continue;
    }

    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
        schema?: unknown;
      };

      if (parsed.schema === 'toolnet.memory-conversation.v1') {
        return file;
      }
    } catch {
      // Ignore unrelated/corrupt JSON while locating conversation state.
    }
  }

  return null;
}

async function runCheck(
  id: string,
  label: string,
  operation: () => boolean | Promise<boolean>
): Promise<RecoveryCertificationCheck> {
  try {
    const passed = await operation();

    return {
      id,

      label,

      passed,

      detail: passed ? undefined : 'Certification condition returned false.',
    };
  } catch (error) {
    return {
      id,

      label,

      passed: false,

      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function certifyRecoveryResilience(): Promise<RecoveryCertificationResult> {
  const checks: RecoveryCertificationCheck[] = [];

  checks.push(
    await runCheck('corrupt-handoff', 'corrupt handoff → safe fallback', () => {
      const root = mkdtempSync(join(tmpdir(), 'toolnet-x2-corrupt-handoff-'));

      try {
        const manifest = project(root, 'x2-corrupt-handoff');

        ensureProjectDirectories(root);

        writeFileSync(
          join(root, '.toolnet', 'work', 'handoff-latest.json'),
          '{ definitely broken',
          'utf8'
        );

        writeOrigin(
          manifest,
          'Recover task from session origin',
          'src/x2/session-origin.ts',
          'Continue safely'
        );

        const answer = answerRetrievedMemoryQuestion(manifest, 'Task hiện tại là gì?');

        return (
          answer.source === 'session-origin' &&
          answer.answer.includes('Recover task from session origin')
        );
      } finally {
        rmSync(root, {
          recursive: true,
          force: true,
        });
      }
    })
  );

  checks.push(
    await runCheck('missing-handoff', 'missing handoff → WorkState fallback', () => {
      const root = mkdtempSync(join(tmpdir(), 'toolnet-x2-missing-handoff-'));

      try {
        const manifest = project(root, 'x2-missing-handoff');

        ensureProjectDirectories(root);

        writeWorkState(
          manifest,
          'Recover task from WorkState',
          'src/x2/work-state.ts',
          'Continue from WorkState'
        );

        const answer = answerRetrievedMemoryQuestion(manifest, 'Task hiện tại là gì?');

        return (
          answer.source === 'work-state' && answer.answer.includes('Recover task from WorkState')
        );
      } finally {
        rmSync(root, {
          recursive: true,
          force: true,
        });
      }
    })
  );

  checks.push(
    await runCheck('corrupt-session-origin', 'corrupt session-origin → WorkState fallback', () => {
      const root = mkdtempSync(join(tmpdir(), 'toolnet-x2-corrupt-origin-'));

      try {
        const manifest = project(root, 'x2-corrupt-origin');

        ensureProjectDirectories(root);

        writeFileSync(
          join(root, '.toolnet', 'context', 'session-origin.json'),
          '{ broken origin',
          'utf8'
        );

        writeWorkState(
          manifest,
          'WorkState survives corrupt origin',
          'src/x2/origin-fallback.ts',
          'Use current WorkState'
        );

        const answer = answerRetrievedMemoryQuestion(manifest, 'Task hiện tại là gì?');

        return (
          answer.source === 'work-state' &&
          answer.answer.includes('WorkState survives corrupt origin')
        );
      } finally {
        rmSync(root, {
          recursive: true,
          force: true,
        });
      }
    })
  );

  checks.push(
    await runCheck('corrupt-conversation', 'corrupt conversation → fresh clean state', () => {
      const root = mkdtempSync(join(tmpdir(), 'toolnet-x2-conversation-'));

      try {
        const manifest = project(root, 'x2-conversation');

        ensureProjectDirectories(root);

        writeOrigin(
          manifest,
          'Conversation recovery task',
          'src/x2/conversation.ts',
          'Recover conversation'
        );

        prepareMemoryConversation(manifest, 'Task hiện tại là gì?');

        const conversationFile = findConversationStateFile(root);

        if (!conversationFile) {
          return false;
        }

        writeFileSync(conversationFile, '{ broken conversation', 'utf8');

        const prepared = prepareMemoryConversation(manifest, 'Rồi sao?');

        const recovered = readMemoryConversationState(manifest);

        return (
          prepared.usedPriorFocus === false &&
          recovered?.schema === 'toolnet.memory-conversation.v1' &&
          recovered.projectId === manifest.id
        );
      } finally {
        rmSync(root, {
          recursive: true,
          force: true,
        });
      }
    })
  );

  checks.push(
    await runCheck('corrupt-work-state', 'corrupt WorkState → safe empty answer', () => {
      const root = mkdtempSync(join(tmpdir(), 'toolnet-x2-workstate-'));

      try {
        const manifest = project(root, 'x2-corrupt-workstate');

        ensureProjectDirectories(root);

        writeFileSync(
          join(root, '.toolnet', 'work', 'current.json'),
          '{ broken work state',
          'utf8'
        );

        const answer = answerRetrievedMemoryQuestion(manifest, 'Task hiện tại là gì?');

        return answer.source === 'none' && answer.answer.includes('ToolNet chưa có đủ memory');
      } finally {
        rmSync(root, {
          recursive: true,
          force: true,
        });
      }
    })
  );

  checks.push(
    await runCheck(
      'ai-failure',
      'AI/provider failure → deterministic local continuity',
      async () => {
        const root = mkdtempSync(join(tmpdir(), 'toolnet-x2-ai-'));

        try {
          const manifest = project(root, 'x2-ai');

          ensureProjectDirectories(root);

          writeOrigin(
            manifest,
            'Deterministic AI outage fallback',
            'src/x2/ai-fallback.ts',
            'Continue without provider'
          );

          const answer = await askMemoryAgent(manifest, 'Task hiện tại là gì?');

          return (
            answer.usedAi === false && answer.answer.includes('Deterministic AI outage fallback')
          );
        } finally {
          rmSync(root, {
            recursive: true,
            force: true,
          });
        }
      }
    )
  );

  checks.push(
    await runCheck(
      'canonical-priority',
      'valid canonical handoff → stale fallback rejected',
      () => {
        const root = mkdtempSync(join(tmpdir(), 'toolnet-x2-priority-'));

        try {
          const manifest = project(root, 'x2-priority');

          ensureProjectDirectories(root);

          const handoffFile = join(root, '.toolnet', 'work', 'handoff-latest.json');

          writeJson(
            handoffFile,
            canonicalHandoff(
              manifest,
              'CANONICAL X2 TASK',
              'src/x2/canonical.ts',
              'Canonical TODO',
              'Canonical next action'
            )
          );

          writeOrigin(manifest, 'STALE ORIGIN TASK', 'src/x2/stale-origin.ts', 'Stale origin next');

          writeWorkState(
            manifest,
            'STALE WORKSTATE TASK',
            'src/x2/stale-work.ts',
            'Stale WorkState next'
          );

          const answer = answerRetrievedMemoryQuestion(manifest, 'Task hiện tại là gì?');

          return (
            answer.source === 'handoff' &&
            answer.answer.includes('CANONICAL X2 TASK') &&
            !answer.answer.includes('STALE ORIGIN TASK') &&
            !answer.answer.includes('STALE WORKSTATE TASK')
          );
        } finally {
          rmSync(root, {
            recursive: true,
            force: true,
          });
        }
      }
    )
  );

  checks.push(
    await runCheck('memory-preserved', 'recovery read → valid handoff never destroyed', () => {
      const root = mkdtempSync(join(tmpdir(), 'toolnet-x2-preserve-'));

      try {
        const manifest = project(root, 'x2-preserve');

        ensureProjectDirectories(root);

        const handoffFile = join(root, '.toolnet', 'work', 'handoff-latest.json');

        writeJson(
          handoffFile,
          canonicalHandoff(
            manifest,
            'Preserve canonical state',
            'src/x2/preserve.ts',
            'Preserve TODO',
            'Preserve next action'
          )
        );

        const before = readFileSync(handoffFile, 'utf8');

        answerRetrievedMemoryQuestion(manifest, 'Tôi phải làm gì tiếp?');

        const after = readFileSync(handoffFile, 'utf8');

        return before === after;
      } finally {
        rmSync(root, {
          recursive: true,
          force: true,
        });
      }
    })
  );

  checks.push(
    await runCheck('raw-transcript-isolation', 'raw transcript → never used for recovery', () => {
      const root = mkdtempSync(join(tmpdir(), 'toolnet-x2-transcript-'));

      try {
        const manifest = project(root, 'x2-transcript');

        ensureProjectDirectories(root);

        const sentinel = 'X2_SECRET_RAW_TRANSCRIPT_MUST_NEVER_ENTER_CONTINUITY';

        writeFileSync(
          join(root, '.toolnet', 'runtime', 'sources', 'raw-transcript.json'),
          JSON.stringify({
            transcript: sentinel,
          }),
          'utf8'
        );

        writeFileSync(
          join(root, '.toolnet', 'runtime', 'sources', 'events.jsonl'),
          JSON.stringify({
            text: sentinel,
          }) + '\n',
          'utf8'
        );

        const answer = answerRetrievedMemoryQuestion(manifest, 'Agent trước đang làm gì?');

        return answer.source === 'none' && !answer.answer.includes(sentinel);
      } finally {
        rmSync(root, {
          recursive: true,
          force: true,
        });
      }
    })
  );

  const passedCount = checks.filter((check) => check.passed).length;

  return {
    passed: passedCount === checks.length,

    total: checks.length,

    passedCount,

    checks,
  };
}
