import { createHash } from 'node:crypto';

import type { NormalizedSessionEvent } from '../session/types.js';

import type { LearnedMemoryCandidate, LearnedMemoryKind } from '../session/learner/types.js';

export type MemoryHierarchyLevel = 'raw' | 'fact' | 'scene' | 'knowledge';

export type MemoryHierarchyKnowledgeClass = 'permanent' | 'task' | 'session' | 'transient';

export type MemorySceneKind =
  'project-knowledge' | 'implementation' | 'continuation' | 'session-context';

export interface HierarchyCandidate extends LearnedMemoryCandidate {
  knowledgeClass: MemoryHierarchyKnowledgeClass;

  importanceScore: number;

  retrievalTerms: string[];
}

export interface RawMemoryAsset {
  id: string;

  level: 'raw';

  eventId: string;

  sourceEventId?: string;

  sequence: number;

  type: NormalizedSessionEvent['type'];

  role?: string;

  timestamp: string;

  sourcePath?: string;

  payloadDigest: string;
}

export interface FactMemoryAsset {
  id: string;

  level: 'fact';

  fingerprint: string;

  kind: LearnedMemoryKind;

  type: LearnedMemoryCandidate['type'];

  content: string;

  knowledgeClass: MemoryHierarchyKnowledgeClass;

  importanceScore: number;

  confidence: number;

  tags: string[];

  rawIds: string[];

  sourcePaths: string[];
}

export interface SceneMemoryAsset {
  id: string;

  level: 'scene';

  kind: MemorySceneKind;

  title: string;

  summary: string;

  factIds: string[];

  importanceScore: number;

  confidence: number;

  tags: string[];

  sourcePaths: string[];
}

export interface DurableKnowledgeAsset {
  id: string;

  level: 'knowledge';

  knowledgeClass: 'permanent' | 'task';

  title: string;

  content: string;

  sceneIds: string[];

  factIds: string[];

  importanceScore: number;

  confidence: number;

  tags: string[];

  sourcePaths: string[];
}

export type MemoryHierarchyLinkType = 'supports' | 'belongs_to' | 'promotes_to';

export interface MemoryHierarchyLink {
  from: string;

  to: string;

  type: MemoryHierarchyLinkType;
}

export interface MemoryHierarchy {
  schema: 'toolnet.memory-hierarchy.v1';

  version: 1;

  raw: RawMemoryAsset[];

  facts: FactMemoryAsset[];

  scenes: SceneMemoryAsset[];

  knowledge: DurableKnowledgeAsset[];

  links: MemoryHierarchyLink[];

  stats: {
    raw: number;

    facts: number;

    scenes: number;

    knowledge: number;

    links: number;
  };
}

const SCENE_ORDER: MemorySceneKind[] = [
  'project-knowledge',
  'implementation',
  'continuation',
  'session-context',
];

const SCENE_TITLES: Record<MemorySceneKind, string> = {
  'project-knowledge': 'Project knowledge',

  implementation: 'Implementation state',

  continuation: 'Work continuation',

  'session-context': 'Session context',
};

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableId(prefix: string, value: string): string {
  return `${prefix}:${hash(value).slice(0, 24)}`;
}

function payloadDigest(value: unknown): string {
  try {
    return hash(JSON.stringify(value));
  } catch {
    return hash(String(value));
  }
}

function unique(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();

  const output: string[] = [];

  for (const raw of values) {
    const value = raw?.replace(/\s+/gu, ' ').trim();

    if (!value) {
      continue;
    }

    const key = value.normalize('NFKC').toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    output.push(value);
  }

  return output;
}

function compact(value: string, maxChars = 420): string {
  const text = value.replace(/\s+/gu, ' ').trim();

  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function sceneKind(kind: LearnedMemoryKind): MemorySceneKind {
  if (kind === 'rule' || kind === 'architecture') {
    return 'project-knowledge';
  }

  if (kind === 'decision' || kind === 'fix') {
    return 'implementation';
  }

  if (kind === 'todo') {
    return 'continuation';
  }

  return 'session-context';
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sceneSummary(facts: FactMemoryAsset[]): string {
  return facts
    .slice()
    .sort(
      (left, right) =>
        right.importanceScore - left.importanceScore ||
        right.confidence - left.confidence ||
        left.id.localeCompare(right.id)
    )
    .slice(0, 5)
    .map((fact) => compact(fact.content))
    .join(' | ');
}

function knowledgeContent(facts: FactMemoryAsset[]): string {
  return facts
    .slice()
    .sort(
      (left, right) =>
        right.importanceScore - left.importanceScore ||
        right.confidence - left.confidence ||
        left.id.localeCompare(right.id)
    )
    .slice(0, 6)
    .map((fact) => compact(fact.content))
    .join('\n');
}

/**
 * Build deterministic hierarchical memory assets.
 *
 * Raw payloads stay in the existing normalized session/WAL source.
 * The hierarchy stores raw references + digests rather than duplicating
 * full transcripts/tool output.
 *
 * raw event
 *   ↓ supports
 * atomic fact
 *   ↓ belongs_to
 * semantic scene
 *   ↓ promotes_to
 * durable knowledge
 */
export function buildMemoryHierarchy(
  events: NormalizedSessionEvent[],
  candidates: HierarchyCandidate[]
): MemoryHierarchy {
  const normalizedEvents = events
    .slice()
    .sort(
      (left, right) =>
        left.sequence - right.sequence ||
        left.timestamp.localeCompare(right.timestamp) ||
        left.id.localeCompare(right.id)
    );

  const raw: RawMemoryAsset[] = normalizedEvents.map((event) => ({
    id: stableId(
      'raw',
      [event.projectId, event.agent, event.nativeSessionId, event.id, String(event.sequence)].join(
        '|'
      )
    ),

    level: 'raw',

    eventId: event.id,

    sourceEventId: event.sourceEventId,

    sequence: event.sequence,

    type: event.type,

    role: event.role,

    timestamp: event.timestamp,

    sourcePath: event.provenance.sourcePath,

    payloadDigest: payloadDigest(event.data),
  }));

  const rawByEventId = new Map<string, string>();

  const rawBySourceEventId = new Map<string, string>();

  normalizedEvents.forEach((event, index) => {
    const asset = raw[index];

    if (!asset) {
      return;
    }

    rawByEventId.set(event.id, asset.id);

    if (event.sourceEventId) {
      rawBySourceEventId.set(event.sourceEventId, asset.id);
    }
  });

  const facts: FactMemoryAsset[] = candidates.map((candidate) => {
    const rawIds = unique([
      ...candidate.provenance.eventIds.map((id) => rawByEventId.get(id)),
      ...candidate.provenance.sourceEventIds.map((id) => rawBySourceEventId.get(id)),
    ]);

    return {
      id: stableId('fact', candidate.fingerprint),

      level: 'fact',

      fingerprint: candidate.fingerprint,

      kind: candidate.kind,

      type: candidate.type,

      content: candidate.content,

      knowledgeClass: candidate.knowledgeClass,

      importanceScore: candidate.importanceScore,

      confidence: candidate.confidence,

      tags: unique([
        ...candidate.tags,
        'level:fact',
        `class:${candidate.knowledgeClass}`,
        `kind:${candidate.kind}`,
      ]),

      rawIds,

      sourcePaths: unique(candidate.provenance.sourcePaths),
    };
  });

  const sceneGroups = new Map<MemorySceneKind, FactMemoryAsset[]>();

  for (const fact of facts) {
    const kind = sceneKind(fact.kind);

    const group = sceneGroups.get(kind) ?? [];

    group.push(fact);

    sceneGroups.set(kind, group);
  }

  const scenes: SceneMemoryAsset[] = [];

  for (const kind of SCENE_ORDER) {
    const group = sceneGroups.get(kind);

    if (!group?.length) {
      continue;
    }

    const ordered = group
      .slice()
      .sort(
        (left, right) =>
          right.importanceScore - left.importanceScore ||
          right.confidence - left.confidence ||
          left.id.localeCompare(right.id)
      );

    const factIds = ordered.map((fact) => fact.id);

    scenes.push({
      id: stableId('scene', `${kind}|${factIds.join('|')}`),

      level: 'scene',

      kind,

      title: SCENE_TITLES[kind],

      summary: sceneSummary(ordered),

      factIds,

      importanceScore: Math.max(...ordered.map((fact) => fact.importanceScore)),

      confidence: average(ordered.map((fact) => fact.confidence)),

      tags: unique(['level:scene', `scene:${kind}`, ...ordered.flatMap((fact) => fact.tags)]),

      sourcePaths: unique(ordered.flatMap((fact) => fact.sourcePaths)),
    });
  }

  const factsById = new Map(facts.map((fact) => [fact.id, fact]));

  const knowledge: DurableKnowledgeAsset[] = [];

  for (const scene of scenes) {
    const sceneFacts = scene.factIds
      .map((id) => factsById.get(id))
      .filter((fact): fact is FactMemoryAsset => Boolean(fact));

    const durableFacts = sceneFacts.filter(
      (fact) =>
        (fact.knowledgeClass === 'permanent' || fact.knowledgeClass === 'task') &&
        fact.importanceScore >= 0.55
    );

    if (durableFacts.length === 0) {
      continue;
    }

    const knowledgeClass: 'permanent' | 'task' = durableFacts.some(
      (fact) => fact.knowledgeClass === 'permanent'
    )
      ? 'permanent'
      : 'task';

    const content = knowledgeContent(durableFacts);

    knowledge.push({
      id: stableId(
        'knowledge',
        `${scene.id}|${knowledgeClass}|${durableFacts.map((fact) => fact.id).join('|')}`
      ),

      level: 'knowledge',

      knowledgeClass,

      title: scene.title,

      content,

      sceneIds: [scene.id],

      factIds: durableFacts.map((fact) => fact.id),

      importanceScore: Math.max(...durableFacts.map((fact) => fact.importanceScore)),

      confidence: average(durableFacts.map((fact) => fact.confidence)),

      tags: unique([
        'level:knowledge',
        `class:${knowledgeClass}`,
        `scene:${scene.kind}`,
        ...durableFacts.flatMap((fact) => fact.tags),
      ]),

      sourcePaths: unique(durableFacts.flatMap((fact) => fact.sourcePaths)),
    });
  }

  const links: MemoryHierarchyLink[] = [];

  for (const fact of facts) {
    for (const rawId of fact.rawIds) {
      links.push({
        from: rawId,

        to: fact.id,

        type: 'supports',
      });
    }
  }

  for (const scene of scenes) {
    for (const factId of scene.factIds) {
      links.push({
        from: factId,

        to: scene.id,

        type: 'belongs_to',
      });
    }
  }

  for (const item of knowledge) {
    for (const sceneId of item.sceneIds) {
      links.push({
        from: sceneId,

        to: item.id,

        type: 'promotes_to',
      });
    }
  }

  return {
    schema: 'toolnet.memory-hierarchy.v1',

    version: 1,

    raw,

    facts,

    scenes,

    knowledge,

    links,

    stats: {
      raw: raw.length,

      facts: facts.length,

      scenes: scenes.length,

      knowledge: knowledge.length,

      links: links.length,
    },
  };
}
