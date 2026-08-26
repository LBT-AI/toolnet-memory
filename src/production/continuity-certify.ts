import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { memoryAgentAsk } from '../mcp/tools/memory-agent-ask.js';

import { retrieveMemoryContext } from '../work-continuity/memory-retrieval.js';

export type CertifiedAgent =
  'agy' | 'codex' | 'opencode' | 'claude' | 'kiro' | 'cursor' | 'copilot' | 'grok';

export interface ContinuityCertificationChecks {
  canonicalHandoffPreferred: boolean;

  taskRecovered: boolean;

  fileRecovered: boolean;

  todoRecovered: boolean;

  nextActionRecovered: boolean;

  localModeOnly: boolean;

  noAiRequired: boolean;

  rawTranscriptIsolated: boolean;

  compact: boolean;

  structuredTakeoverRecovered: boolean;

  benchmarkDetailRecovered: boolean;

  highConfidence: boolean;

  evidenceRecovered: boolean;

  deterministicTakeover: boolean;
}

export interface ContinuityCertificationCase {
  from: CertifiedAgent;

  to: CertifiedAgent;

  passed: boolean;

  checks: ContinuityCertificationChecks;
}

export interface ContinuityCertificationResult {
  passed: boolean;

  total: number;

  passedCount: number;

  cases: ContinuityCertificationCase[];
}

const RAW_TRANSCRIPT_SENTINEL = 'RAW_TRANSCRIPT_MUST_NEVER_ENTER_CONTINUITY_CONTEXT_X1';

function writeJson(file: string, value: unknown): void {
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function createCanonicalHandoff(
  projectId: string,
  projectName: string,
  from: CertifiedAgent,
  to: CertifiedAgent,
  task: string,
  currentFile: string,
  todo: string,
  nextAction: string
): Record<string, unknown> {
  return {
    continuity: {
      schema: 'toolnet.handoff.v2',

      version: 2,

      project: {
        id: projectId,

        name: projectName,
      },

      source: {
        agent: from,

        nativeSessionId: `${from}-x1-source`,

        sessionKey: `${from}:${from}-x1-source`,

        sequence: 42,

        reason: 'checkpoint',
      },

      capturedAt: '2026-08-13T05:30:00.000Z',

      goal: `Continue ${projectName} safely across agents`,

      request: `Recover ${task} with exact evidence and next action`,

      activity: `Preparing ${to} takeover from ${from}`,

      current: {
        phase: {
          id: 'x1',

          title: 'Cross-Agent Continuity E2E',

          status: 'in_progress',
        },

        task: {
          id: 'x1-cross-agent',

          title: task,

          status: 'in_progress',
        },

        file: currentFile,
      },

      completed: {
        phases: ['A1 OpenCode Adapter', 'A2 Agy Adapter', 'A3 Claude Code Adapter'],

        tasks: ['Build canonical handoff schema', 'Build intelligent memory retrieval'],
      },

      remaining: {
        phases: ['X1 Cross-Agent Continuity E2E'],

        tasks: [task],

        todos: [todo],
      },

      nextAction,

      blockers: [],

      decisions: [
        'Canonical handoff must override stale session state',
        'Never replay raw transcripts during continuity recovery',
      ],

      files: {
        current: currentFile,

        recent: [currentFile],
      },

      tests: {
        status: 'passing',

        recent: ['A1-A3 adapter tests passed'],

        checks: [
          {
            kind: 'test',

            status: 'passed',

            command: `node scripts/${from}-to-${to}-verify.mjs`,
          },
        ],
      },

      evidence: {
        commands: [`node scripts/${from}-to-${to}-verify.mjs`],

        references: [`https://example.test/${from}/${to}/continuity-report`],
      },

      attention: [],

      progress: {
        phasesTotal: 3,

        phasesCompleted: 2,

        tasksTotal: 4,

        tasksCompleted: 3,

        blocked: 0,
      },

      stateDigest: 'a'.repeat(64),
    },
  };
}

async function askLocal(project: Parameters<typeof retrieveMemoryContext>[0], question: string) {
  const ctx = {
    project,
  } as unknown as Parameters<typeof memoryAgentAsk>[0];

  return memoryAgentAsk(ctx, {
    question,

    mode: 'local',
  });
}

async function certifyPair(
  from: CertifiedAgent,
  to: CertifiedAgent
): Promise<ContinuityCertificationCase> {
  const root = mkdtempSync(join(tmpdir(), `toolnet-x1-${from}-${to}-`));

  try {
    const projectId = `x1-${from}-${to}`;

    const projectName = `x1-${from}-to-${to}`;

    const project: Parameters<typeof retrieveMemoryContext>[0] = {
      id: projectId,

      name: projectName,

      rootPath: root,

      createdAt: '2026-08-13T05:30:00.000Z',

      updatedAt: '2026-08-13T05:30:00.000Z',

      graphVersion: 1,

      memoryVersion: 1,
    };

    const workDirectory = join(root, '.toolnet', 'work');

    const contextDirectory = join(root, '.toolnet', 'context');

    const rawSessionDirectory = join(root, '.toolnet', 'sessions', from, 'raw-session-x1');

    mkdirSync(workDirectory, {
      recursive: true,
    });

    mkdirSync(contextDirectory, {
      recursive: true,
    });

    mkdirSync(rawSessionDirectory, {
      recursive: true,
    });

    const task = `X1 ${from} to ${to} canonical continuity`;

    const currentFile = `src/x1/${from}-to-${to}.ts`;

    const todo = `Implement ${to} continuation step`;

    const nextAction = `Continue ${task} in ${currentFile}`;

    /*
     * Canonical durable handoff.
     */
    writeJson(
      join(workDirectory, 'handoff-latest.json'),
      createCanonicalHandoff(projectId, projectName, from, to, task, currentFile, todo, nextAction)
    );

    /*
     * Deliberately stale competing state.
     *
     * X1 must prove M3 prefers canonical M2 handoff
     * instead of rebuilding continuity from stale state.
     */
    writeJson(join(contextDirectory, 'session-origin.json'), {
      version: 1,

      projectId,

      agent: 'stale-agent',

      nativeSessionId: 'stale-session',

      updatedAt: '2026-01-01T00:00:00.000Z',

      currentTask: 'STALE TASK MUST NOT WIN',

      currentPhase: 'STALE PHASE',

      lastTouchedFile: 'src/stale/old.ts',

      latestNextAction: 'STALE NEXT ACTION',
    });

    /*
     * A raw transcript exists physically to prove the
     * continuity path never reads/replays it.
     */
    writeFileSync(
      join(rawSessionDirectory, 'events.jsonl'),
      JSON.stringify({
        text: RAW_TRANSCRIPT_SENTINEL,
      }) + '\n',
      'utf8'
    );

    const ranked = retrieveMemoryContext(project, 'Tôi phải làm gì tiếp?', {
      maxFacts: 12,

      maxChars: 3200,
    });

    const taskAnswer = await askLocal(project, 'Task hiện tại đang làm là gì?');

    const fileAnswer = await askLocal(project, 'File hiện tại là file nào?');

    const todoAnswer = await askLocal(project, 'TODO còn lại là gì?');

    const nextAnswer = await askLocal(project, 'Tôi phải làm gì tiếp?');

    /*
     * Code 7:
     *
     * Simulate a real new coding agent asking for a deep takeover.
     * mode=ai is intentional: Code 6 must route this to the
     * deterministic structured handoff without calling an LLM.
     */
    const takeoverAnswer = await memoryAgentAsk(
      {
        project,
      } as unknown as Parameters<typeof memoryAgentAsk>[0],
      {
        mode: 'ai',

        detail: 'benchmark',

        question:
          'Summarize current state, completed work, evidence, files, tests, blockers and exact next action for benchmark agent takeover.',
      }
    );

    const takeoverMeta = takeoverAnswer as unknown as {
      answer: string;

      usedAi: boolean;

      routing?: string;

      detail?: string;

      confidence?: string;

      missingContext?: string[];
    };

    const expectedCommand = `node scripts/${from}-to-${to}-verify.mjs`;

    const expectedReference = `https://example.test/${from}/${to}/continuity-report`;

    const allAnswers = [
      taskAnswer.answer,
      fileAnswer.answer,
      todoAnswer.answer,
      nextAnswer.answer,
      takeoverAnswer.answer,
    ].join('\n');

    const responses = [taskAnswer, fileAnswer, todoAnswer, nextAnswer];

    const checks: ContinuityCertificationChecks = {
      canonicalHandoffPreferred: ranked.facts[0]?.source === 'handoff',

      taskRecovered: taskAnswer.answer.includes(task),

      fileRecovered: fileAnswer.answer.includes(currentFile),

      todoRecovered: todoAnswer.answer.includes(todo),

      nextActionRecovered: nextAnswer.answer.includes(nextAction),

      localModeOnly: responses.every((response) => response.mode === 'local'),

      noAiRequired: responses.every((response) => response.usedAi === false),

      rawTranscriptIsolated: !allAnswers.includes(RAW_TRANSCRIPT_SENTINEL),

      compact: responses.every((response) => response.answer.length < 1600),

      structuredTakeoverRecovered:
        takeoverAnswer.answer.includes('CURRENT_STATE') &&
        takeoverAnswer.answer.includes('COMPLETED') &&
        takeoverAnswer.answer.includes('EVIDENCE') &&
        takeoverAnswer.answer.includes('FILES_TOUCHED') &&
        takeoverAnswer.answer.includes('BLOCKERS') &&
        takeoverAnswer.answer.includes('NEXT_ACTION'),

      benchmarkDetailRecovered:
        takeoverMeta.detail === 'benchmark' &&
        takeoverAnswer.answer.includes('HANDOFF_DETAIL: benchmark'),

      highConfidence:
        takeoverMeta.confidence === 'high' &&
        Array.isArray(takeoverMeta.missingContext) &&
        takeoverMeta.missingContext.length === 0,

      evidenceRecovered:
        takeoverAnswer.answer.includes(expectedCommand) &&
        takeoverAnswer.answer.includes(expectedReference),

      deterministicTakeover:
        takeoverAnswer.usedAi === false && takeoverMeta.routing === 'deterministic-handoff',
    };

    return {
      from,

      to,

      passed: Object.values(checks).every(Boolean),

      checks,
    };
  } finally {
    rmSync(root, {
      recursive: true,

      force: true,
    });
  }
}

/**
 * Canonical cross-agent ring:
 *
 * Agy -> Codex -> OpenCode -> Claude -> Kiro -> Cursor
 * -> Copilot -> Grok -> Agy
 *
 * X3 will later certify real installed adapters/hooks.
 * X1 certifies the shared continuity contract itself.
 */
export async function certifyCrossAgentContinuity(): Promise<ContinuityCertificationResult> {
  const transitions: Array<[CertifiedAgent, CertifiedAgent]> = [
    ['agy', 'codex'],

    ['codex', 'opencode'],

    ['opencode', 'claude'],

    ['claude', 'kiro'],

    ['kiro', 'cursor'],

    ['cursor', 'copilot'],

    ['copilot', 'grok'],

    ['grok', 'agy'],
  ];

  const cases: ContinuityCertificationCase[] = [];

  for (const [from, to] of transitions) {
    cases.push(await certifyPair(from, to));
  }

  const passedCount = cases.filter((item) => item.passed).length;

  return {
    passed: passedCount === cases.length,

    total: cases.length,

    passedCount,

    cases,
  };
}
