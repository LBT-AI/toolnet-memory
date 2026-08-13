import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { promoteKnowledgeToWiki, WikiService, WikiStore } from '../../src/wiki/index.js';

class FakeStorage {
  private readonly data = new Map<string, string>();

  async getText(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.data.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }
}

const roots: string[] = [];

function fixture() {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-wiki-auto-'));

  roots.push(rootPath);

  const project: ProjectManifest = {
    id: `project-${roots.length}`,
    name: 'knowledge-automation',
    remote: 'knowledge-automation',
    rootPath,
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };

  const storage = new FakeStorage();

  return {
    project,
    storage,
  };
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();

    if (root) {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  }
});

describe('Knowledge Automation', () => {
  it('promotes durable memory, scenes and skills without replaying raw transcript', async () => {
    const { project, storage } = fixture();

    const skills = join(project.rootPath, '.toolnet', 'memory', 'skills');

    mkdirSync(skills, {
      recursive: true,
    });

    writeFileSync(
      join(skills, 'skill-release.json'),
      JSON.stringify(
        {
          schema: 'toolnet.skill-memory.v1',
          version: 1,
          id: 'release-flow',
          fingerprint: 'release-flow',
          projectId: project.id,
          title: 'Release Workflow',
          task: 'Safely validate and build a release',
          summary: 'Run validation gates before committing.',
          steps: ['Run focused tests', 'Run full tests', 'Build production bundle'],
          verification: ['Typecheck passes', 'Tests pass'],
          files: ['package.json'],
        },
        null,
        2
      )
    );

    const hierarchy = {
      knowledge: [
        {
          id: 'architecture',
          knowledgeClass: 'permanent',
          title: 'Architecture Decisions',
          content: 'ToolNet uses durable canonical memory with derived knowledge projections.',
          rawTranscript: 'THIS RAW TRANSCRIPT MUST NEVER ENTER WIKI',
        },
        {
          id: 'temporary-note',
          knowledgeClass: 'transient',
          title: 'Temporary Note',
          content: 'This transient item must not be promoted.',
        },
      ],
      scenes: [
        {
          id: 'memory-hub',
          kind: 'implementation',
          title: 'Memory Hub Implementation',
          summary: 'Project, Team, Agent, ACL and Loadout are managed by Memory Hub.',
        },
        {
          id: 'session-only',
          kind: 'session-context',
          title: 'Session Context',
          content: 'This session-only scene must not be promoted.',
        },
      ],
    };

    const first = await promoteKnowledgeToWiki({
      project,
      storage,
      hierarchy,
    });

    expect(first.created).toBe(3);
    expect(first.failed).toBe(0);

    const wiki = new WikiService(new WikiStore(storage, project));

    await wiki.initialize();

    const pages = await wiki.listPages();

    expect(pages).toHaveLength(3);

    expect(pages.some((page) => page.content.includes('THIS RAW TRANSCRIPT'))).toBe(false);

    expect(pages.every((page) => page.tags.some((tag) => tag.startsWith('toolnet-auto-')))).toBe(
      true
    );

    const summary = await wiki.summary();

    expect(summary.automatedPages).toBe(3);
  });

  it('deduplicates unchanged sources and creates revisions only when knowledge changes', async () => {
    const { project, storage } = fixture();

    const hierarchy = {
      knowledge: [
        {
          id: 'architecture',
          knowledgeClass: 'permanent',
          title: 'Architecture',
          content: 'Canonical durable architecture knowledge version one.',
        },
      ],
      scenes: [],
    };

    const first = await promoteKnowledgeToWiki({
      project,
      storage,
      hierarchy,
    });

    expect(first.created).toBe(1);

    const second = await promoteKnowledgeToWiki({
      project,
      storage,
      hierarchy,
    });

    expect(second.created).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(1);

    hierarchy.knowledge[0]!.content =
      'Canonical durable architecture knowledge version two with an updated decision.';

    const third = await promoteKnowledgeToWiki({
      project,
      storage,
      hierarchy,
    });

    expect(third.created).toBe(0);
    expect(third.updated).toBe(1);

    const wiki = new WikiService(new WikiStore(storage, project));

    await wiki.initialize();

    const pages = await wiki.listPages();

    expect(pages).toHaveLength(1);
    expect(pages[0]!.revision).toBe(2);

    const history = await wiki.history(pages[0]!.slug);

    expect(history.map((item) => item.revision)).toEqual([2, 1]);
  });

  it('never overwrites a page that is not owned by its automation marker', async () => {
    const { project, storage } = fixture();

    const wiki = new WikiService(new WikiStore(storage, project));

    await wiki.initialize();

    await wiki.createPage({
      slug: 'manual-page',
      title: 'Manual Page',
      content: 'This page is maintained manually.',
      tags: ['manual'],
    });

    const result = await promoteKnowledgeToWiki({
      project,
      storage,
      hierarchy: {
        knowledge: [
          {
            id: 'manual-page',
            knowledgeClass: 'permanent',
            title: 'Manual Page',
            content: 'Automated knowledge remains isolated from manual pages.',
          },
        ],
        scenes: [],
      },
    });

    expect(result.failed).toBe(0);

    const manual = await wiki.getPage('manual-page');

    expect(manual.content).toBe('This page is maintained manually.');
  });
});
