/**
 * ToolNet v0.7 cross-host handoff of dirty working-tree changes.
 *
 * Provides safe Git patch/artifact transfer for AGY on VPS-A to Codex on VPS-B.
 * Keeps memory history distinct from source tree.
 * Reports when code changes were not transferred; never marks state reproducible
 * without commit/patch integrity verification.
 */

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { ProjectManifest } from '../core/types.js';

export interface WorkingTreeChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  diff?: string;
  hash: string;
}

export interface HandoffArtifact {
  version: 1;
  projectId: string;
  projectName: string;
  sourceHostId: string;
  sourceCodeRevision: string;
  createdAt: string;
  changes: WorkingTreeChange[];
  patchBase64: string;
  patchSha256: string;
  integrityVerified: boolean;
}

export interface CrossHostHandoffResult {
  success: boolean;
  artifact?: HandoffArtifact;
  error?: string;
  warnings: string[];
}

interface GitStatusResult {
  modified: string[];
  added: string[];
  deleted: string[];
  renamed: Array<{ from: string; to: string }>;
}

function runGitCommand(projectRoot: string, args: string[]): string {
  try {
    return execSync(['git', ...args].join(' '), {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`GIT_COMMAND_FAILED: ${message}`);
  }
}

function getGitStatus(projectRoot: string): GitStatusResult {
  const output = runGitCommand(projectRoot, ['status', '--porcelain=v1']);

  const modified: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];
  const renamed: Array<{ from: string; to: string }> = [];

  for (const line of output.split('\n')) {
    if (!line.trim()) continue;

    const status = line.slice(0, 2);
    const path = line.slice(3).trim();

    switch (status[0]) {
      case 'M':
        modified.push(path);
        break;
      case 'A':
        added.push(path);
        break;
      case 'D':
        deleted.push(path);
        break;
      case 'R':
        const [from, to] = path.split(' -> ');
        renamed.push({ from: from.trim(), to: to.trim() });
        break;
    }
  }

  return { modified, added, deleted, renamed };
}

function getGitDiff(projectRoot: string, paths: string[]): string {
  if (paths.length === 0) return '';

  return runGitCommand(projectRoot, ['diff', '--no-color', '--', ...paths]);
}

function getGitDiffCached(projectRoot: string, paths: string[]): string {
  if (paths.length === 0) return '';

  return runGitCommand(projectRoot, ['diff', '--cached', '--no-color', '--', ...paths]);
}

function getCurrentCommitHash(projectRoot: string): string {
  return runGitCommand(projectRoot, ['rev-parse', 'HEAD']);
}

function getHostId(): string {
  try {
    return execSync('hostname', { encoding: 'utf8' }).trim();
  } catch {
    return `pid-${process.pid}`;
  }
}

function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function createHandoffArtifact(
  project: ProjectManifest,
  options: {
    includeUntracked?: boolean;
    excludePatterns?: string[];
    outputDir?: string;
  } = {}
): Promise<CrossHostHandoffResult> {
  const warnings: string[] = [];
  const projectRoot = project.rootPath;

  if (!existsSync(join(projectRoot, '.git'))) {
    return {
      success: false,
      error: 'NOT_A_GIT_REPOSITORY: project root is not a Git repository',
      warnings: ['Cross-host handoff requires a Git repository'],
    };
  }

  const gitStatus = getGitStatus(projectRoot);
  const allChangedPaths = [
    ...gitStatus.modified,
    ...gitStatus.added,
    ...gitStatus.deleted,
    ...gitStatus.renamed.map((r) => r.to),
  ];

  if (allChangedPaths.length === 0) {
    warnings.push('WORKING_TREE_CLEAN: no dirty changes to transfer');
  }

  const filteredPaths = options.excludePatterns
    ? allChangedPaths.filter(
        (p) => !options.excludePatterns!.some((pattern) => p.includes(pattern))
      )
    : allChangedPaths;

  if (filteredPaths.length !== allChangedPaths.length) {
    warnings.push(
      `EXCLUDED_CHANGES: ${allChangedPaths.length - filteredPaths.length} changes excluded by patterns`
    );
  }

  const diff = getGitDiff(projectRoot, filteredPaths);
  const diffCached = getGitDiffCached(projectRoot, filteredPaths);
  const fullDiff = [diffCached, diff].filter(Boolean).join('\n');

  const changes: WorkingTreeChange[] = [];

  for (const path of gitStatus.modified) {
    if (!filteredPaths.includes(path)) continue;
    const fileDiff = getGitDiff(projectRoot, [path]);
    changes.push({
      path,
      status: 'modified',
      diff: fileDiff,
      hash: computeHash(readFileSync(join(projectRoot, path), 'utf8')),
    });
  }

  for (const path of gitStatus.added) {
    if (!filteredPaths.includes(path)) continue;
    changes.push({
      path,
      status: 'added',
      diff: getGitDiff(projectRoot, [path]),
      hash: computeHash(readFileSync(join(projectRoot, path), 'utf8')),
    });
  }

  for (const path of gitStatus.deleted) {
    if (!filteredPaths.includes(path)) continue;
    changes.push({
      path,
      status: 'deleted',
      hash: computeHash(''), // deleted file has empty content
    });
  }

  for (const { from, to } of gitStatus.renamed) {
    if (!filteredPaths.includes(to)) continue;
    changes.push({
      path: to,
      status: 'renamed',
      diff: getGitDiff(projectRoot, [from, to]),
      hash: computeHash(readFileSync(join(projectRoot, to), 'utf8')),
    });
  }

  if (options.includeUntracked) {
    const untrackedOutput = runGitCommand(projectRoot, [
      'ls-files',
      '--others',
      '--exclude-standard',
    ]);
    for (const path of untrackedOutput.split('\n').filter(Boolean)) {
      if (!filteredPaths.includes(path)) continue;
      changes.push({
        path,
        status: 'added',
        hash: computeHash(readFileSync(join(projectRoot, path), 'utf8')),
      });
      warnings.push(`UNTRACKED_FILE_INCLUDED: ${path}`);
    }
  }

  const sourceCodeRevision = getCurrentCommitHash(projectRoot);
  const patchBase64 = Buffer.from(fullDiff).toString('base64');
  const patchSha256 = computeHash(fullDiff);

  const artifact: HandoffArtifact = {
    version: 1,
    projectId: project.id,
    projectName: project.name,
    sourceHostId: getHostId(),
    sourceCodeRevision,
    createdAt: new Date().toISOString(),
    changes,
    patchBase64,
    patchSha256,
    integrityVerified: false,
  };

  if (options.outputDir) {
    mkdirSync(options.outputDir, { recursive: true });
    const artifactPath = join(options.outputDir, `handoff-${project.id}-${Date.now()}.json`);
    writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), 'utf8');
    warnings.push(`ARTIFACT_WRITTEN: ${artifactPath}`);
  }

  return { success: true, artifact, warnings };
}

export async function applyHandoffArtifact(
  project: ProjectManifest,
  artifact: HandoffArtifact,
  options: {
    verifyIntegrity?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<CrossHostHandoffResult> {
  const warnings: string[] = [];
  const projectRoot = project.rootPath;

  if (!existsSync(join(projectRoot, '.git'))) {
    return {
      success: false,
      error: 'NOT_A_GIT_REPOSITORY: project root is not a Git repository',
      warnings: ['Cross-host handoff requires a Git repository'],
    };
  }

  if (options.verifyIntegrity !== false) {
    const patch = Buffer.from(artifact.patchBase64, 'base64').toString('utf8');
    const computedHash = computeHash(patch);

    if (computedHash !== artifact.patchSha256) {
      return {
        success: false,
        error:
          'INTEGRITY_CHECK_FAILED: patch hash mismatch - artifact may be corrupted or tampered',
        warnings: ['Patch integrity verification failed'],
      };
    }

    artifact.integrityVerified = true;
    warnings.push('INTEGRITY_VERIFIED: patch hash matches');
  }

  const currentCommit = getCurrentCommitHash(projectRoot);

  if (currentCommit !== artifact.sourceCodeRevision) {
    warnings.push(
      `CODE_REVISION_MISMATCH: current HEAD (${currentCommit.slice(0, 12)}) differs from artifact base (${artifact.sourceCodeRevision.slice(0, 12)})`
    );
    warnings.push('Applying patch may cause conflicts; manual resolution may be required');
  }

  if (options.dryRun) {
    warnings.push('DRY_RUN: patch not applied');
    return { success: true, artifact, warnings };
  }

  const patch = Buffer.from(artifact.patchBase64, 'base64').toString('utf8');
  const patchFile = join(projectRoot, `.toolnet-handoff-${Date.now()}.patch`);
  writeFileSync(patchFile, patch, 'utf8');

  try {
    runGitCommand(projectRoot, ['apply', '--check', patchFile]);
    runGitCommand(projectRoot, ['apply', patchFile]);
    warnings.push('PATCH_APPLIED: working tree updated with transferred changes');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `PATCH_APPLY_FAILED: ${message}`,
      warnings: [
        'Patch could not be applied cleanly; manual resolution required',
        artifact.patchBase64,
      ],
    };
  }

  return { success: true, artifact, warnings };
}

export function detectDirtyWorkingTree(project: ProjectManifest): {
  dirty: boolean;
  changes: string[];
} {
  const gitStatus = getGitStatus(project.rootPath);
  const allChanges = [
    ...gitStatus.modified,
    ...gitStatus.added,
    ...gitStatus.deleted,
    ...gitStatus.renamed.map((r) => r.to),
  ];
  return { dirty: allChanges.length > 0, changes: allChanges };
}
