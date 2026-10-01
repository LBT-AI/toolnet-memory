import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

import { dirname, join, resolve } from 'node:path';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { plandexBaseDir } from './config-paths.js';

import { shouldFilterEvent } from '../transcript-filter.js';
import { extractSessionMemory } from '../session-extractor.js';
import { shouldArchiveRawTranscript, shouldArchiveRemote } from '../session-memory-policy.js';
import { syncMaterialization, type SyncMaterialization } from '../sync-materialization.js';

export interface PlandexPlanRef {
  orgId: string;
  planId: string;
}

export interface PlandexSyncOptions {
  project: ProjectManifest;
  storage: StorageProvider;
  plan: PlandexPlanRef;
  cwd?: string;
  baseDir?: string;
  /** Set of already-processed message filenames for delta-only ingestion. */
  seenMessages?: Set<string>;
}

export interface PlandexSyncResult {
  orgId: string;
  planId: string;
  imported: number;
  eventCount: number;
  chunkCount: number;
  status: string;
  reset: boolean;
  materialization?: SyncMaterialization;
}

function listConversationFiles(baseDir: string, plan: PlandexPlanRef): string[] {
  const conversationDir = join(baseDir, 'orgs', plan.orgId, 'plans', plan.planId, 'conversation');

  if (!existsSync(conversationDir)) {
    return [];
  }

  try {
    return readdirSync(conversationDir)
      .filter((entry) => entry.endsWith('.json'))
      .sort()
      .map((entry) => join(conversationDir, entry));
  } catch {
    return [];
  }
}

function readConversationMessage(
  filePath: string
): { role: string; content: string; timestamp: string; fileName: string } | null {
  try {
    const content = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const role = typeof parsed.role === 'string' ? parsed.role : 'unknown';
    const messageContent =
      typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content ?? '');
    const timestamp =
      typeof parsed.timestamp === 'string' ? parsed.timestamp : new Date().toISOString();

    return {
      role,
      content: messageContent,
      timestamp,
      fileName: filePath,
    };
  } catch {
    return null;
  }
}

export async function syncPlandexPlan(options: PlandexSyncOptions): Promise<PlandexSyncResult> {
  const { project, storage, plan, cwd, baseDir, seenMessages } = options;

  const planBaseDir = baseDir ?? plandexBaseDir();
  const resolvedCwd = cwd ?? project.rootPath;

  const sessionId = `plandex:${plan.orgId}:${plan.planId}`;

  const core = new SessionCore({
    project,
    storage,
    agent: 'plandex',
    nativeSessionId: sessionId,
    metadata: {
      source: 'plandex-manual-recovery',
      cwd: resolvedCwd,
      baseDir: planBaseDir,
      orgId: plan.orgId,
      planId: plan.planId,
    },
    eventContext: {
      source: 'plandex',
      cwd: resolvedCwd || project.rootPath,
    },
  });

  const events: Array<
    | {
        type: 'session_start';
        sourceEventId: string;
        data: Record<string, unknown>;
        provenance: { source: string };
      }
    | {
        type: 'session_end';
        sourceEventId: string;
        data: Record<string, unknown>;
        provenance: { source: string };
      }
    | {
        type: 'user_prompt';
        sourceEventId: string;
        data: Record<string, unknown>;
        provenance: { source: string };
      }
    | {
        type: 'assistant_message';
        sourceEventId: string;
        data: Record<string, unknown>;
        provenance: { source: string };
      }
  > = [];

  if (core.status().lastSequence === 0) {
    events.push({
      type: 'session_start',
      sourceEventId: `plandex:${sessionId}:start`,
      data: {
        sessionId,
        orgId: plan.orgId,
        planId: plan.planId,
        cwd: resolvedCwd,
        baseDir: planBaseDir,
      },
      provenance: { source: 'plandex-manual-recovery' },
    });
  }

  const conversationFiles = listConversationFiles(planBaseDir, plan);
  const processedFiles = seenMessages ?? new Set<string>();
  let importCount = 0;

  for (const filePath of conversationFiles) {
    const fileName = filePath.split('/').pop() ?? filePath;

    if (processedFiles.has(fileName)) {
      continue;
    }

    const message = readConversationMessage(filePath);

    if (!message) {
      continue;
    }

    if (shouldFilterEvent({ role: message.role, content: message.content })) {
      processedFiles.add(fileName);
      continue;
    }

    const eventType = message.role === 'user' ? 'user_prompt' : 'assistant_message';

    events.push({
      type: eventType,
      sourceEventId: `plandex:${sessionId}:${eventType}:${fileName}`,
      data: {
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        source: 'plandex-conversation',
        fileName,
      },
      provenance: { source: 'plandex-conversation' },
    });

    processedFiles.add(fileName);
    importCount++;
  }

  events.push({
    type: 'session_end',
    sourceEventId: `plandex:${sessionId}:end`,
    data: { sessionId, orgId: plan.orgId, planId: plan.planId, imported: importCount },
    provenance: { source: 'plandex-manual-recovery' },
  });

  const recorded = core.recordMany(events);

  if (recorded.length > 0) {
    try {
      const messages = recorded.map((e) => JSON.stringify(e.data));
      const extraction = extractSessionMemory(messages, sessionId);

      core.setSourceCursor('plandex.session.summary', extraction.summary);
      core.setSourceCursor('plandex.session.facts_count', extraction.durableFacts.length);

      if (shouldArchiveRawTranscript() && !shouldArchiveRemote()) {
        core.setSourceCursor('plandex.raw_transcript.archived', 'local');
      }
    } catch {
      // Extraction failure must not break session sync.
    }
  }

  core.setSourceCursor('plandex.base_dir', planBaseDir);
  core.setSourceCursor(`plandex.plan.${plan.orgId}.${plan.planId}.seen_count`, processedFiles.size);

  const flushed = await core.flush();

  return {
    orgId: plan.orgId,
    planId: plan.planId,
    imported: recorded.length,
    eventCount: flushed.eventCount,
    chunkCount: flushed.chunkCount,
    status: flushed.status,
    reset: false,
    materialization: syncMaterialization(flushed),
  };
}
