import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import { sha256 } from '../session/utils.js';

export interface FastHandoffCache {
  version: 1;

  projectId: string;

  projectName: string;

  text: string;

  digest: string;

  generatedAt: string;
}

export function fastHandoffFile(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'context', 'handoff.md');
}

export function fastHandoffMetaFile(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'context', 'handoff.json');
}

function atomicWriteText(file: string, content: string): void {
  mkdirSync(dirname(file), {
    recursive: true,
  });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  writeFileSync(temp, content.endsWith('\n') ? content : `${content}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  renameSync(temp, file);
}

function atomicWriteJson(file: string, value: unknown): void {
  atomicWriteText(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeFastHandoff(project: ProjectManifest, text: string): FastHandoffCache | null {
  const normalized = text.replace(/\r\n/g, '\n').trim();

  if (!normalized) {
    return null;
  }

  const cache: FastHandoffCache = {
    version: 1,

    projectId: project.id,

    projectName: project.name,

    text: normalized,

    digest: sha256(normalized),

    generatedAt: new Date().toISOString(),
  };

  atomicWriteText(fastHandoffFile(project), normalized);

  atomicWriteJson(fastHandoffMetaFile(project), cache);

  return cache;
}

export function readFastHandoff(project: ProjectManifest): FastHandoffCache | null {
  const file = fastHandoffFile(project);

  if (!existsSync(file)) {
    return null;
  }

  try {
    const text = readFileSync(file, 'utf8').trim();

    if (!text) {
      return null;
    }

    let generatedAt = new Date(0).toISOString();

    const metaFile = fastHandoffMetaFile(project);

    if (existsSync(metaFile)) {
      try {
        const parsed = JSON.parse(readFileSync(metaFile, 'utf8')) as Partial<FastHandoffCache>;

        if (typeof parsed.generatedAt === 'string') {
          generatedAt = parsed.generatedAt;
        }
      } catch {
        // Markdown remains the source of truth.
      }
    }

    return {
      version: 1,

      projectId: project.id,

      projectName: project.name,

      text,

      digest: sha256(text),

      generatedAt,
    };
  } catch {
    return null;
  }
}

export function formatFastHandoffContext(project: ProjectManifest, maxChars = 1800): string | null {
  const cache = readFastHandoff(project);

  if (!cache?.text) {
    return null;
  }

  let text = cache.text;

  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}\n\n[Fast handoff truncated]`;
  }

  return [
    '[TOOLNET FAST HANDOFF]',
    '',
    `Project: ${project.name}`,
    `Updated: ${cache.generatedAt}`,
    '',
    text,
  ].join('\n');
}
