import { createHash } from 'node:crypto';

import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { basename, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import { WikiError, WikiService, wikiSlug } from './service.js';

import { WikiStore, type WikiStorage } from './store.js';

import type { WikiPageV1 } from './types.js';

const LEDGER_KEY = 'wiki/automation.v1.json';

const LEDGER_SCHEMA = 'toolnet.wiki-automation.v1' as const;

const MAX_CONTENT = 8_000;

const BLOCKED_KEYS = new Set([
  'raw',
  'rawtext',
  'raw_text',
  'rawtranscript',
  'raw_transcript',
  'transcript',
  'messages',
  'message',
  'payload',
  'prompt',
  'response',
  'assistantmessage',
  'assistant_message',
  'userprompt',
  'user_prompt',
]);

export type WikiAutomationSourceType = 'memory' | 'scene' | 'skill';

export interface WikiAutomationLedgerEntry {
  sourceKey: string;
  sourceType: WikiAutomationSourceType;
  slug: string;
  digest: string;
  marker: string;
  updatedAt: string;
}

export interface WikiAutomationLedgerV1 {
  schema: typeof LEDGER_SCHEMA;
  version: 1;
  projectId: string;
  entries: WikiAutomationLedgerEntry[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
}

export interface WikiAutomationCandidate {
  sourceKey: string;
  sourceType: WikiAutomationSourceType;
  title: string;
  summary?: string;
  content: string;
  tags: string[];
}

export interface WikiAutomationResult {
  schema: 'toolnet.wiki-automation-result.v1';
  scanned: number;
  eligible: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  pages: Array<{
    sourceKey: string;
    sourceType: WikiAutomationSourceType;
    slug: string;
    action: 'created' | 'updated' | 'unchanged';
  }>;
}

export interface PromoteKnowledgeToWikiOptions {
  project: ProjectManifest;
  storage: WikiStorage;
  hierarchy?: unknown;
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function record(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const clean = value.replace(/\s+/gu, ' ').trim();

  return clean || undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(stringValue).filter((item): item is string => Boolean(item));
}

function firstString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = stringValue(source[key]);

    if (value) {
      return value;
    }
  }

  return undefined;
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const clean = value.replace(/\s+/gu, ' ').trim();

    if (!clean) {
      continue;
    }

    const key = clean.normalize('NFKC').toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(clean);
  }

  return output;
}

function collectMeaningfulStrings(value: unknown, depth = 0, parentKey = ''): string[] {
  if (depth > 3) {
    return [];
  }

  const normalizedKey = parentKey.replace(/[^a-z0-9]/giu, '').toLowerCase();

  if (BLOCKED_KEYS.has(normalizedKey)) {
    return [];
  }

  if (typeof value === 'string') {
    const clean = value.replace(/\s+/gu, ' ').trim();

    if (clean.length < 8) {
      return [];
    }

    return [clean];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMeaningfulStrings(item, depth + 1, parentKey));
  }

  const object = record(value);

  if (!object) {
    return [];
  }

  const output: string[] = [];

  for (const [key, child] of Object.entries(object)) {
    const normalized = key.replace(/[^a-z0-9]/giu, '').toLowerCase();

    if (BLOCKED_KEYS.has(normalized)) {
      continue;
    }

    output.push(...collectMeaningfulStrings(child, depth + 1, key));
  }

  return output;
}

function meaningfulContent(source: Record<string, unknown>): string {
  const preferredKeys = [
    'content',
    'summary',
    'text',
    'value',
    'statement',
    'description',
    'decision',
    'task',
    'knowledge',
    'context',
    'outcome',
    'reason',
    'rationale',
  ];

  const preferred = unique(
    preferredKeys.flatMap((key) => collectMeaningfulStrings(source[key], 0, key))
  );

  const values = preferred.length > 0 ? preferred : unique(collectMeaningfulStrings(source));

  return values.join('\n\n').slice(0, MAX_CONTENT);
}

function identityOf(source: Record<string, unknown>, fallback: string): string {
  return firstString(source, ['id', 'key', 'fingerprint', 'knowledgeId', 'sceneId']) ?? fallback;
}

function candidateTitle(source: Record<string, unknown>, fallback: string): string {
  return (
    firstString(source, ['title', 'name', 'topic', 'label', 'task', 'kind', 'type']) ?? fallback
  );
}

function knowledgeClass(source: Record<string, unknown>): string {
  return (
    firstString(source, ['knowledgeClass', 'class', 'classification', 'scope']) ?? ''
  ).toLowerCase();
}

function sceneKind(source: Record<string, unknown>): string {
  return (firstString(source, ['kind', 'sceneKind', 'type']) ?? '').toLowerCase();
}

function hierarchyCandidates(hierarchy: unknown): WikiAutomationCandidate[] {
  const root = record(hierarchy);

  if (!root) {
    return [];
  }

  const candidates: WikiAutomationCandidate[] = [];

  const knowledge = array(root.knowledge);

  for (const [index, raw] of knowledge.entries()) {
    const item = record(raw);

    if (!item) {
      continue;
    }

    const classification = knowledgeClass(item);

    if (classification === 'session' || classification === 'transient') {
      continue;
    }

    const content = meaningfulContent(item);

    if (content.length < 20) {
      continue;
    }

    const id = identityOf(item, digest(item).slice(0, 16));

    const title = candidateTitle(item, `Durable Memory ${index + 1}`);

    candidates.push({
      sourceKey: `memory:${id}`,
      sourceType: 'memory',
      title,
      summary: firstString(item, ['summary', 'description']),
      content,
      tags: unique(['toolnet', 'auto', 'memory', ...(classification ? [classification] : [])]),
    });
  }

  const scenes = array(root.scenes);

  for (const [index, raw] of scenes.entries()) {
    const item = record(raw);

    if (!item) {
      continue;
    }

    const kind = sceneKind(item);

    if (kind === 'session-context') {
      continue;
    }

    const content = meaningfulContent(item);

    if (content.length < 20) {
      continue;
    }

    const id = identityOf(item, digest(item).slice(0, 16));

    const title = candidateTitle(item, `Knowledge Scene ${index + 1}`);

    candidates.push({
      sourceKey: `scene:${id}`,
      sourceType: 'scene',
      title,
      summary: firstString(item, ['summary', 'description']),
      content,
      tags: unique(['toolnet', 'auto', 'scene', ...(kind ? [kind] : [])]),
    });
  }

  return candidates;
}

function skillRoot(projectRoot: string): string {
  return join(projectRoot, '.toolnet', 'memory', 'skills');
}

function skillCandidates(projectRoot: string): {
  candidates: WikiAutomationCandidate[];
  failed: number;
} {
  const root = skillRoot(projectRoot);

  if (!existsSync(root)) {
    return {
      candidates: [],
      failed: 0,
    };
  }

  const candidates: WikiAutomationCandidate[] = [];
  let failed = 0;

  const files = readdirSync(root)
    .filter((file) => file.endsWith('.json'))
    .sort();

  for (const file of files) {
    try {
      const parsed = JSON.parse(readFileSync(join(root, file), 'utf8')) as unknown;

      const skill = record(parsed);

      if (!skill || skill.schema !== 'toolnet.skill-memory.v1') {
        continue;
      }

      const id = firstString(skill, ['id', 'fingerprint']) ?? basename(file, '.json');

      const task = firstString(skill, ['task']) ?? '';

      const title = firstString(skill, ['title']) || task || `Reusable Skill ${id.slice(0, 8)}`;

      const summary = firstString(skill, ['summary']) ?? undefined;

      const steps = stringArray(skill.steps);
      const verification = stringArray(skill.verification);
      const filesUsed = stringArray(skill.files);

      const sections: string[] = [];

      if (task) {
        sections.push(`## Task\n${task}`);
      }

      if (summary) {
        sections.push(`## Summary\n${summary}`);
      }

      if (steps.length > 0) {
        sections.push(
          `## Procedure\n${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`
        );
      }

      if (verification.length > 0) {
        sections.push(`## Verification\n${verification.map((item) => `- ${item}`).join('\n')}`);
      }

      if (filesUsed.length > 0) {
        sections.push(`## Relevant Files\n${filesUsed.map((item) => `- \`${item}\``).join('\n')}`);
      }

      const content = sections.join('\n\n').slice(0, MAX_CONTENT);

      if (content.length < 20) {
        continue;
      }

      candidates.push({
        sourceKey: `skill:${id}`,
        sourceType: 'skill',
        title,
        summary,
        content,
        tags: ['toolnet', 'auto', 'skill', 'sop'],
      });
    } catch {
      failed += 1;
    }
  }

  return {
    candidates,
    failed,
  };
}

function initialLedger(projectId: string): WikiAutomationLedgerV1 {
  const now = new Date().toISOString();

  return {
    schema: LEDGER_SCHEMA,
    version: 1,
    projectId,
    entries: [],
    createdAt: now,
    updatedAt: now,
  };
}

async function loadLedger(
  storage: WikiStorage,
  projectId: string
): Promise<WikiAutomationLedgerV1> {
  const text = await storage.getText(LEDGER_KEY);

  if (!text) {
    return initialLedger(projectId);
  }

  try {
    const parsed = JSON.parse(text) as Partial<WikiAutomationLedgerV1>;

    if (
      parsed.schema !== LEDGER_SCHEMA ||
      parsed.version !== 1 ||
      parsed.projectId !== projectId ||
      !Array.isArray(parsed.entries)
    ) {
      return initialLedger(projectId);
    }

    return parsed as WikiAutomationLedgerV1;
  } catch {
    return initialLedger(projectId);
  }
}

async function saveLedger(storage: WikiStorage, ledger: WikiAutomationLedgerV1): Promise<void> {
  await storage.put(LEDGER_KEY, JSON.stringify(ledger, null, 2), 'application/json');
}

function markerFor(sourceKey: string): string {
  return `toolnet-auto-${digest(sourceKey).slice(0, 12)}`;
}

function generatedSlug(candidate: WikiAutomationCandidate): string {
  const name = wikiSlug(candidate.title).slice(0, 72);

  const id = digest(candidate.sourceKey).slice(0, 10);

  return wikiSlug(`auto-${candidate.sourceType}-${name}-${id}`);
}

function generatedContent(candidate: WikiAutomationCandidate): string {
  const sourceLabel =
    candidate.sourceType === 'skill'
      ? 'reusable Skill Memory'
      : candidate.sourceType === 'scene'
        ? 'semantic memory scene'
        : 'durable memory';

  return [
    `> Auto-generated by ToolNet Knowledge Automation from ${sourceLabel}.`,
    '',
    candidate.content,
  ]
    .join('\n')
    .slice(0, MAX_CONTENT);
}

function candidateDigest(candidate: WikiAutomationCandidate): string {
  return digest({
    sourceType: candidate.sourceType,
    title: candidate.title,
    summary: candidate.summary,
    content: candidate.content,
    tags: candidate.tags,
  });
}

function ownsPage(page: WikiPageV1, marker: string): boolean {
  return page.tags.includes(marker);
}

export async function promoteKnowledgeToWiki(
  options: PromoteKnowledgeToWikiOptions
): Promise<WikiAutomationResult> {
  const hierarchy = hierarchyCandidates(options.hierarchy);

  const skills = skillCandidates(options.project.rootPath);

  const byKey = new Map<string, WikiAutomationCandidate>();

  for (const candidate of [...hierarchy, ...skills.candidates]) {
    byKey.set(candidate.sourceKey, candidate);
  }

  const candidates = [...byKey.values()].sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));

  const result: WikiAutomationResult = {
    schema: 'toolnet.wiki-automation-result.v1',
    scanned: hierarchy.length + skills.candidates.length,
    eligible: candidates.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    failed: skills.failed,
    pages: [],
  };

  const wiki = new WikiService(new WikiStore(options.storage, options.project));

  await wiki.initialize();

  const ledger = await loadLedger(options.storage, options.project.id);

  const pages = await wiki.listPages();

  const pageBySlug = new Map(pages.map((page) => [page.slug, page]));

  const entryBySource = new Map(ledger.entries.map((entry) => [entry.sourceKey, entry]));

  for (const candidate of candidates) {
    try {
      const marker = markerFor(candidate.sourceKey);

      const nextDigest = candidateDigest(candidate);

      const existingEntry = entryBySource.get(candidate.sourceKey);

      const slug = existingEntry?.slug ?? generatedSlug(candidate);

      let page = pageBySlug.get(slug);

      if (page && !ownsPage(page, marker)) {
        result.skipped += 1;
        continue;
      }

      const tags = unique([...candidate.tags, marker]);

      if (!page) {
        page = await wiki.createPage({
          slug,
          title: candidate.title,
          summary: candidate.summary,
          content: generatedContent(candidate),
          tags,
        });

        pageBySlug.set(page.slug, page);

        result.created += 1;

        result.pages.push({
          sourceKey: candidate.sourceKey,
          sourceType: candidate.sourceType,
          slug: page.slug,
          action: 'created',
        });
      } else if (existingEntry?.digest !== nextDigest) {
        page = await wiki.updatePage(slug, {
          title: candidate.title,
          summary: candidate.summary ?? '',
          content: generatedContent(candidate),
          tags,
        });

        pageBySlug.set(page.slug, page);

        result.updated += 1;

        result.pages.push({
          sourceKey: candidate.sourceKey,
          sourceType: candidate.sourceType,
          slug: page.slug,
          action: 'updated',
        });
      } else {
        result.unchanged += 1;

        result.pages.push({
          sourceKey: candidate.sourceKey,
          sourceType: candidate.sourceType,
          slug,
          action: 'unchanged',
        });
      }

      const now = new Date().toISOString();

      const entry: WikiAutomationLedgerEntry = {
        sourceKey: candidate.sourceKey,
        sourceType: candidate.sourceType,
        slug,
        digest: nextDigest,
        marker,
        updatedAt: now,
      };

      const index = ledger.entries.findIndex((item) => item.sourceKey === candidate.sourceKey);

      if (index >= 0) {
        ledger.entries[index] = entry;
      } else {
        ledger.entries.push(entry);
      }

      entryBySource.set(candidate.sourceKey, entry);
    } catch (error) {
      if (error instanceof WikiError && error.statusCode === 409) {
        result.skipped += 1;
        continue;
      }

      result.failed += 1;
    }
  }

  const now = new Date().toISOString();

  ledger.updatedAt = now;
  ledger.lastRunAt = now;

  ledger.entries.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));

  await saveLedger(options.storage, ledger);

  return result;
}
