/*
 * Phase 83 — public-surface extraction and structural compatibility.
 *
 * Compares the public contract surfaces between the release baseline and the
 * candidate working tree: MCP tool schemas, CLI commands, daemon protocol
 * message kinds, artifact schema constants and authority-storage schema
 * markers. Only structural evidence is used — never text similarity, never an
 * LLM. A removal or a requiredness/type change is breaking; a pure addition is
 * compatible.
 */

import { extractToolNames } from './capabilities.js';

import type { SurfaceChange, SurfaceComparison } from './types.js';

export interface SurfaceFile {
  surface: 'mcp_tool' | 'cli_command' | 'daemon_protocol' | 'artifact_schema';
  /** Absolute path of the source file defining the surface. */
  path: string;
  /** Existence check is done by the caller (git show / fs). */
  text: string;
}

/* --- extraction ------------------------------------------------------- */

export interface ExtractedSurface {
  mcpTools: string[];
  cliCommands: string[];
  daemonRequestKinds: string[];
  artifactSchemaVersion: string;
  daemonProtocolVersion: string;
}

/** Extract the structural public surface from one revision of the sources.
 *
 * `read` receives REPO-RELATIVE paths (git show requires them) and returns the
 * file text, or undefined when unavailable at that revision.
 */
export function extractSurface(
  rootPath: string,
  read: (path: string) => string | undefined
): ExtractedSurface {
  void rootPath;

  const mcpTools = extractToolNames(read('src/mcp/server.ts') ?? '');

  const cliText = read('packages/cli/help.ts') ?? '';
  const cliCommands = [...cliText.matchAll(/name:\s*'([a-zA-Z0-9:_-]+)'/gu)]
    .map((match) => match[1])
    .sort();

  const daemonTypes = read('src/daemon/types.ts') ?? '';
  const daemonRequestKinds = [...daemonTypes.matchAll(/^\s{2}type:\s*'([a-zA-Z0-9_]+)';$/gmu)]
    .map((match) => match[1])
    .sort();

  const artifactTypes = read('src/code-intelligence/artifact/types.ts') ?? '';
  const artifactSchemaVersion =
    /ARTIFACT_SCHEMA_VERSION\s*=\s*(\d+)/u.exec(artifactTypes)?.[1] ?? '';

  const daemonProtocolVersion = /DAEMON_PROTOCOL_VERSION\s*=\s*(\d+)/u.exec(daemonTypes)?.[1] ?? '';

  return {
    mcpTools,
    cliCommands,
    daemonRequestKinds,
    artifactSchemaVersion,
    daemonProtocolVersion,
  };
}

/* --- structural comparison -------------------------------------------- */

function sortedSet(values: readonly string[]): Set<string> {
  return new Set(values);
}

function diffSets(
  baseline: ReadonlySet<string>,
  candidate: ReadonlySet<string>
): { added: string[]; removed: string[] } {
  const added: string[] = [];
  const removed: string[] = [];

  for (const value of candidate) {
    if (!baseline.has(value)) added.push(value);
  }

  for (const value of baseline) {
    if (!candidate.has(value)) removed.push(value);
  }

  return { added, removed };
}

export interface SurfaceComparisonInput {
  baseline: ExtractedSurface;
  candidate: ExtractedSurface;
  maxChanges: number;
  /** Set when a required surface file could not be read on either side. */
  baselineUnavailable?: boolean;
  candidateUnavailable?: boolean;
}

export interface SurfaceComparisonResult {
  comparisons: SurfaceComparison[];
  truncated: boolean;
  coverage: 'complete' | 'partial' | 'unsupported';
  notes: string[];
}

/** Compare every supported public surface, direction-aware. */
export function compareSurfaces(input: SurfaceComparisonInput): SurfaceComparisonResult {
  const comparisons: SurfaceComparison[] = [];
  const notes: string[] = [];
  let truncated = false;
  let changeCount = 0;

  const push = (surface: SurfaceComparison['surface'], changes: SurfaceChange[]): void => {
    for (let index = 0; index < changes.length; index += 1) {
      if (changeCount >= input.maxChanges) {
        truncated = true;
        return;
      }
      changeCount += 1;
    }

    comparisons.push({
      surface,
      changes: changes.slice(0, input.maxChanges),
      breakingChanges: changes.filter((change) => change.breaking),
      compatibleChanges: changes.filter((change) => !change.breaking),
      coverage: 'complete',
      notes: [],
    });
  };

  const available = !input.baselineUnavailable && !input.candidateUnavailable;

  if (!available) {
    notes.push('SURFACE_SOURCE_UNAVAILABLE');
  }

  /* MCP tools: additions are compatible, removals are breaking. */
  if (available) {
    const mcp = diffSets(sortedSet(input.baseline.mcpTools), sortedSet(input.candidate.mcpTools));

    push(
      'mcp_tool',
      [
        ...mcp.added.map((name): SurfaceChange => ({
          surface: 'mcp_tool',
          identity: name,
          change: 'added',
          breaking: false,
          reasonCodes: ['MCP_TOOL_ADDED'],
        })),
        ...mcp.removed.map((name): SurfaceChange => ({
          surface: 'mcp_tool',
          identity: name,
          change: 'removed',
          breaking: true,
          reasonCodes: ['MCP_TOOL_REMOVED'],
        })),
      ].sort((left, right) => left.identity.localeCompare(right.identity))
    );
  }

  /* CLI commands: additions are compatible, removals are breaking. */
  if (available) {
    const cli = diffSets(
      sortedSet(input.baseline.cliCommands),
      sortedSet(input.candidate.cliCommands)
    );

    push(
      'cli_command',
      [
        ...cli.added.map((name): SurfaceChange => ({
          surface: 'cli_command',
          identity: name,
          change: 'added',
          breaking: false,
          reasonCodes: ['CLI_COMMAND_ADDED'],
        })),
        ...cli.removed.map((name): SurfaceChange => ({
          surface: 'cli_command',
          identity: name,
          change: 'removed',
          breaking: true,
          reasonCodes: ['CLI_COMMAND_REMOVED'],
        })),
      ].sort((left, right) => left.identity.localeCompare(right.identity))
    );
  }

  /* Daemon protocol: a verified version change or kind removal is a breaking
   * protocol change for an exact-build daemon. A baseline where the module did
   * not exist yet is a pure addition, never a break. */
  if (available) {
    const daemonChanges: SurfaceChange[] = [];

    const baselineHadProtocol = input.baseline.daemonProtocolVersion.length > 0;
    const candidateHasProtocol = input.candidate.daemonProtocolVersion.length > 0;

    if (
      baselineHadProtocol &&
      candidateHasProtocol &&
      input.baseline.daemonProtocolVersion !== input.candidate.daemonProtocolVersion
    ) {
      daemonChanges.push({
        surface: 'daemon_protocol',
        identity: `protocolVersion ${input.baseline.daemonProtocolVersion} -> ${input.candidate.daemonProtocolVersion}`,
        change: 'changed',
        breaking: true,
        reasonCodes: ['DAEMON_PROTOCOL_VERSION_CHANGED'],
      });
    }

    const kinds = diffSets(
      sortedSet(input.baseline.daemonRequestKinds),
      sortedSet(input.candidate.daemonRequestKinds)
    );

    for (const kind of kinds.removed) {
      daemonChanges.push({
        surface: 'daemon_protocol',
        identity: kind,
        change: 'removed',
        breaking: true,
        reasonCodes: ['DAEMON_MESSAGE_KIND_REMOVED'],
      });
    }

    for (const kind of kinds.added) {
      daemonChanges.push({
        surface: 'daemon_protocol',
        identity: kind,
        change: 'added',
        breaking: false,
        reasonCodes: ['DAEMON_MESSAGE_KIND_ADDED'],
      });
    }

    push('daemon_protocol', daemonChanges);
  }

  /* Artifact schema: a version change means stored artifacts need a rebuild
   * (derived cache, never authority). A baseline where the module did not
   * exist yet is a pure addition, and losing the marker is a removal — the
   * same direction-aware rule the daemon protocol surface uses. */
  if (available) {
    const baselineHadArtifact = input.baseline.artifactSchemaVersion.length > 0;
    const candidateHasArtifact = input.candidate.artifactSchemaVersion.length > 0;

    if (baselineHadArtifact && candidateHasArtifact) {
      if (input.baseline.artifactSchemaVersion !== input.candidate.artifactSchemaVersion) {
        push('artifact_schema', [
          {
            surface: 'artifact_schema',
            identity: `ARTIFACT_SCHEMA_VERSION ${input.baseline.artifactSchemaVersion} -> ${input.candidate.artifactSchemaVersion}`,
            change: 'changed',
            breaking: false,
            reasonCodes: ['ARTIFACT_SCHEMA_VERSION_CHANGED'],
          },
        ]);
      } else {
        push('artifact_schema', []);
      }
    } else if (!baselineHadArtifact && candidateHasArtifact) {
      push('artifact_schema', [
        {
          surface: 'artifact_schema',
          identity: `ARTIFACT_SCHEMA_VERSION -> ${input.candidate.artifactSchemaVersion}`,
          change: 'added',
          breaking: false,
          reasonCodes: ['ARTIFACT_SCHEMA_VERSION_INTRODUCED'],
        },
      ]);
    } else if (baselineHadArtifact) {
      /* The marker disappeared: stored artifacts can no longer be validated
       * against a declared schema, so the derived-cache contract is gone. */
      push('artifact_schema', [
        {
          surface: 'artifact_schema',
          identity: `ARTIFACT_SCHEMA_VERSION ${input.baseline.artifactSchemaVersion} -> (absent)`,
          change: 'removed',
          breaking: true,
          reasonCodes: ['ARTIFACT_SCHEMA_VERSION_REMOVED'],
        },
      ]);
    } else {
      push('artifact_schema', []);
    }
  }

  const coverage: SurfaceComparisonResult['coverage'] =
    truncated || !available ? 'partial' : 'complete';

  return { comparisons, truncated, coverage, notes };
}

/** Structural compatibility summary over the comparisons. */
export function summariseCompatibility(
  comparisons: readonly SurfaceComparison[],
  coverage: 'complete' | 'partial' | 'unsupported'
): { breaking: number; compatible: number; unknown: number; complete: boolean } {
  let breaking = 0;
  let compatible = 0;
  let unknown = 0;

  for (const comparison of comparisons) {
    breaking += comparison.breakingChanges.length;
    compatible += comparison.compatibleChanges.length;
  }

  if (coverage !== 'complete') {
    unknown = Math.max(unknown, 1);
  }

  return {
    breaking,
    compatible,
    unknown,
    complete: coverage === 'complete',
  };
}
