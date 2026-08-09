import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { StorageProvider } from '../storage/types.js';

import { sha256 } from '../session/utils.js';

import type { ProjectManual, ProjectManualRule, ProjectRuleMode } from './types.js';

const MAX_MANUAL_BYTES = 64 * 1024;

export const PROJECT_MANUAL_TEMPLATE = `# ToolNet Project Operating Manual

This file contains persistent instructions for AI agents working on this project.

## Critical Rules

<!--
Examples:

- [enforce] Never edit production files directly.
- [enforce] Edit source only in /path/to/source.
- [enforce] Deploy only with ./deploy.sh --apply
-->

## Workflow

<!--
Describe the correct working process.
-->

## Architecture

<!--
Important architecture conventions.
-->

## Verification

<!--
Tests / QA required after changes.
-->

## Known Gotchas

<!--
Things an AI agent should always remember.
-->

## Preferences

<!--
- [advisory] Prefer small focused files.
-->
`;

export function projectManualPath(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'PROJECT.md');
}

function normalizeRuleText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function parseRules(content: string): ProjectManualRule[] {
  const rules: ProjectManualRule[] = [];

  const seen = new Set<string>();

  const pattern = /^\s*[-*]\s+\[(enforce|advisory)\]\s+(.+?)\s*$/gimu;

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content))) {
    const mode = match[1].toLowerCase() as ProjectRuleMode;

    const text = normalizeRuleText(match[2]);

    if (!text) {
      continue;
    }

    const key = `${mode}:${text.toLowerCase()}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    rules.push({
      id: sha256(key).slice(0, 24),

      mode,

      text,

      source: 'manual',
    });
  }

  return rules;
}

export function ensureProjectManual(project: ProjectManifest): string {
  const file = projectManualPath(project);

  if (existsSync(file)) {
    return file;
  }

  mkdirSync(dirname(file), {
    recursive: true,
  });

  writeFileSync(file, PROJECT_MANUAL_TEMPLATE, {
    encoding: 'utf8',

    mode: 0o600,
  });

  return file;
}

export function loadProjectManual(
  project: ProjectManifest,

  createIfMissing = false
): ProjectManual | null {
  const file = createIfMissing ? ensureProjectManual(project) : projectManualPath(project);

  if (!existsSync(file)) {
    return null;
  }

  const size = statSync(file).size;

  if (size > MAX_MANUAL_BYTES) {
    throw new Error(`PROJECT.md exceeds ${MAX_MANUAL_BYTES} bytes`);
  }

  const content = readFileSync(file, 'utf8');

  return {
    path: file,

    content,

    digest: sha256(content),

    rules: parseRules(content),

    bytes: Buffer.byteLength(content, 'utf8'),

    updatedAt: new Date(statSync(file).mtimeMs).toISOString(),
  };
}

export async function syncProjectManual(
  project: ProjectManifest,

  storage: StorageProvider
): Promise<ProjectManual> {
  const manual = loadProjectManual(project, true);

  if (!manual) {
    throw new Error('Project manual unavailable');
  }

  const prefix = `projects/${project.id}/project`;

  await storage.put(`${prefix}/manual.md`, manual.content, 'text/markdown');

  await storage.put(
    `${prefix}/manual.json`,
    JSON.stringify(
      {
        version: 1,

        projectId: project.id,

        projectName: project.name,

        digest: manual.digest,

        bytes: manual.bytes,

        ruleCount: manual.rules.length,

        enforceRules: manual.rules.filter((rule) => rule.mode === 'enforce').length,

        advisoryRules: manual.rules.filter((rule) => rule.mode === 'advisory').length,

        updatedAt: manual.updatedAt,
      },
      null,
      2
    ) + '\n',
    'application/json'
  );

  return manual;
}
