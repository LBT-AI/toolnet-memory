import { closeSync, existsSync, openSync, readSync, statSync } from 'node:fs';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import type { NormalizedSessionEvent, SessionIdentity } from '../types.js';

import type { SessionWal } from '../wal.js';

import { runMemoryPipelineV2 } from '../../memory/pipeline-v2.js';

import { offloadSessionEvents } from '../../memory/context-offload.js';
import { promoteKnowledgeToWiki } from '../../wiki/automation.js';

import { buildSkillMemoryAssets, persistSkillMemoryAssets } from '../../memory/skill-memory.js';

import { SessionMemoryJournal } from './journal.js';

import { SessionMemoryHierarchyJournal } from './hierarchy-journal.js';

import type { SessionLearningResult } from './types.js';

interface EventRead {
  events: NormalizedSessionEvent[];

  nextOffset: number;
}

function readEvents(filePath: string, offset: number): EventRead {
  if (!existsSync(filePath)) {
    return {
      events: [],
      nextOffset: offset,
    };
  }

  const size = statSync(filePath).size;

  let start = Number.isFinite(offset) ? Math.max(0, offset) : 0;

  /*
   * Local WAL was rebuilt.
   */
  if (start > size) {
    start = 0;
  }

  if (start === size) {
    return {
      events: [],
      nextOffset: size,
    };
  }

  const length = size - start;

  const buffer = Buffer.alloc(length);

  const fd = openSync(filePath, 'r');

  try {
    readSync(fd, buffer, 0, length, start);
  } finally {
    closeSync(fd);
  }

  const text = buffer.toString('utf8');

  const lastNewline = text.lastIndexOf('\n');

  if (lastNewline < 0) {
    return {
      events: [],
      nextOffset: start,
    };
  }

  const complete = text.slice(0, lastNewline + 1);

  const events = complete
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as NormalizedSessionEvent];
      } catch {
        return [];
      }
    });

  return {
    events,

    nextOffset: start + Buffer.byteLength(complete, 'utf8'),
  };
}

export class SessionMemoryLearner {
  private readonly journal: SessionMemoryJournal;

  private readonly hierarchyJournal: SessionMemoryHierarchyJournal;

  constructor(
    private readonly options: {
      project: ProjectManifest;

      storage: StorageProvider;

      identity: SessionIdentity;

      wal: SessionWal;
    }
  ) {
    this.journal = new SessionMemoryJournal(options.storage);

    this.hierarchyJournal = new SessionMemoryHierarchyJournal(options.storage);
  }

  async learnNew(): Promise<SessionLearningResult> {
    const state = this.options.wal.loadState();

    const rawOffset = Number(state.sourceCursors['memory.learner.offset'] ?? 0);

    const offset = Number.isFinite(rawOffset) ? rawOffset : 0;

    const read = readEvents(
      this.options.wal.eventsFile,

      offset
    );

    if (read.events.length === 0) {
      return {
        scannedEvents: 0,

        candidates: 0,

        journalWritten: false,

        nextOffset: read.nextOffset,
      };
    }

    const pipeline = runMemoryPipelineV2(
      this.options.identity,

      read.events
    );

    const candidates = pipeline.candidates;

    let journalWritten = false;

    if (candidates.length > 0) {
      const key = await this.journal.write(
        this.options.identity,

        read.events,

        candidates
      );

      journalWritten = Boolean(key);
    }

    let hierarchyJournalWritten = false;

    if (pipeline.hierarchy.facts.length > 0) {
      const key = await this.hierarchyJournal.write(
        this.options.identity,
        read.events,
        pipeline.hierarchy
      );

      hierarchyJournalWritten = Boolean(key);
    }

    /*
     * T3 Skill Memory.
     *
     * Successful work is promoted into deterministic reusable SOP assets.
     * Skill persistence is authoritative for this learner range:
     * if a skill asset should be written and persistence fails,
     * the learner throws before memory.learner.offset advances.
     */
    const skillAssets = buildSkillMemoryAssets(this.options.identity, read.events, pipeline.state);

    const skillPersist = persistSkillMemoryAssets(this.options.project, skillAssets);

    /*
     * Advance only after immutable learning journal succeeds.
     * If journal write throws, next flush retries same range.
     */
    this.options.wal.setSourceCursor('memory.pipeline.version', 2);

    this.options.wal.setSourceCursor(
      'memory.pipeline.normalized_events',
      pipeline.stats.normalizedEvents
    );

    this.options.wal.setSourceCursor(
      'memory.pipeline.persisted',
      pipeline.stats.persistedCandidates
    );

    this.options.wal.setSourceCursor('memory.pipeline.permanent', pipeline.stats.permanent);

    this.options.wal.setSourceCursor('memory.pipeline.task', pipeline.stats.task);

    this.options.wal.setSourceCursor('memory.pipeline.session', pipeline.stats.session);

    this.options.wal.setSourceCursor('memory.pipeline.transient', pipeline.stats.transient);

    this.options.wal.setSourceCursor(
      'memory.pipeline.hierarchy.version',
      pipeline.hierarchy.version
    );

    this.options.wal.setSourceCursor('memory.pipeline.hierarchy.raw', pipeline.hierarchy.stats.raw);

    this.options.wal.setSourceCursor(
      'memory.pipeline.hierarchy.facts',
      pipeline.hierarchy.stats.facts
    );

    this.options.wal.setSourceCursor(
      'memory.pipeline.hierarchy.scenes',
      pipeline.hierarchy.stats.scenes
    );

    this.options.wal.setSourceCursor(
      'memory.pipeline.hierarchy.knowledge',
      pipeline.hierarchy.stats.knowledge
    );

    this.options.wal.setSourceCursor(
      'memory.pipeline.hierarchy.journal_written',
      hierarchyJournalWritten ? 1 : 0
    );

    this.options.wal.setSourceCursor('memory.skill.assets', skillAssets.length);

    this.options.wal.setSourceCursor('memory.skill.written', skillPersist.written);

    this.options.wal.setSourceCursor('memory.skill.deduped', skillPersist.deduped);

    /*
     * T2 Context Offload is best-effort.
     * Canonical WAL remains authoritative if local offload storage fails.
     */
    try {
      const offload = offloadSessionEvents(this.options.project.rootPath, read.events);

      this.options.wal.setSourceCursor('memory.context_offload.eligible', offload.eligible);

      this.options.wal.setSourceCursor('memory.context_offload.written', offload.written);

      this.options.wal.setSourceCursor('memory.context_offload.deduped', offload.deduped);

      this.options.wal.setSourceCursor('memory.context_offload.graph_nodes', offload.graphNodes);

      this.options.wal.setSourceCursor('memory.context_offload.failed', 0);
    } catch {
      this.options.wal.setSourceCursor('memory.context_offload.failed', 1);
    }

    /*
     * Knowledge Automation is a derived projection.
     *
     * Canonical hierarchy / Skill Memory / WAL remain authoritative.
     * Wiki promotion is best-effort and must not block memory learning.
     * The learner offset advances only after this attempt completes.
     */
    try {
      const wikiAutomation = await promoteKnowledgeToWiki({
        project: this.options.project,
        storage: this.options.storage,
        hierarchy: pipeline.hierarchy,
      });

      this.options.wal.setSourceCursor('memory.wiki_automation.scanned', wikiAutomation.scanned);

      this.options.wal.setSourceCursor('memory.wiki_automation.eligible', wikiAutomation.eligible);

      this.options.wal.setSourceCursor('memory.wiki_automation.created', wikiAutomation.created);

      this.options.wal.setSourceCursor('memory.wiki_automation.updated', wikiAutomation.updated);

      this.options.wal.setSourceCursor(
        'memory.wiki_automation.unchanged',
        wikiAutomation.unchanged
      );

      this.options.wal.setSourceCursor('memory.wiki_automation.skipped', wikiAutomation.skipped);

      this.options.wal.setSourceCursor('memory.wiki_automation.failed', wikiAutomation.failed);
    } catch {
      this.options.wal.setSourceCursor('memory.wiki_automation.failed', 1);
    }

    this.options.wal.setSourceCursor('memory.learner.offset', read.nextOffset);

    return {
      scannedEvents: read.events.length,

      candidates: candidates.length,

      journalWritten,

      nextOffset: read.nextOffset,
    };
  }
}
