/*
 * Phase 84C — build identity for the upgrade planner.
 *
 * An upgrade must never decide "the runtime changed" from the package version
 * alone. The package version can be identical across two builds that disagree
 * about the parser, the resolver, the graph semantics, the query schema or the
 * artifact schema — and it is always identical between a source checkout and
 * the packaged release built from it.
 *
 * So the planner compares the SAME digest the daemon uses for admission
 * (Phase 77): protocol version + package version + explicit build marker + all
 * runtime schema fingerprints + runtime root.
 */

import {
  daemonBuildFingerprint,
  daemonBuildHash,
  daemonBuildMarker,
} from '../../daemon/fingerprint.js';

import type { DaemonBuildFingerprint } from '../../daemon/types.js';

export type BuildSchema = DaemonBuildFingerprint['schema'];

/** One runtime's full build identity. */
export interface BuildDescriptor {
  protocolVersion: number;
  packageVersion: string;
  /** Explicit marker a packaged release sets at bundle time. */
  buildMarker: string;
  runtimeRoot: string;
  schema: BuildSchema;
}

export type BuildDriftReason =
  'none' | 'package_version' | 'build_marker' | 'schema' | 'protocol' | 'runtime_root' | 'multiple';

/** How two build identities differ. */
export interface BuildDrift {
  changed: boolean;
  reason: BuildDriftReason;
  hashBefore: string;
  hashAfter: string;
  packageVersionChanged: boolean;
  buildMarkerChanged: boolean;
  schemaChanged: boolean;
  protocolChanged: boolean;
  runtimeRootChanged: boolean;
}

export function buildHashOf(descriptor: BuildDescriptor): string {
  return daemonBuildHash({
    protocolVersion: descriptor.protocolVersion,
    packageVersion: descriptor.packageVersion,
    buildMarker: descriptor.buildMarker,
    runtimeRoot: descriptor.runtimeRoot,
    schema: descriptor.schema,
  });
}

/** Build identity from a fingerprint plus the explicit marker it was made with. */
export function buildDescriptorFromFingerprint(
  fingerprint: DaemonBuildFingerprint,
  buildMarker: string
): BuildDescriptor {
  return {
    protocolVersion: fingerprint.protocolVersion,
    packageVersion: fingerprint.packageVersion,
    buildMarker,
    runtimeRoot: fingerprint.runtimeRoot,
    schema: fingerprint.schema,
  };
}

/**
 * Build identity of the runtime this process is executing.
 *
 * Used by the real upgrade ports; the planner itself only ever receives the
 * before/after descriptors.
 */
export function currentBuildDescriptor(
  runtimeRoot: string,
  env: NodeJS.ProcessEnv = process.env
): BuildDescriptor {
  return buildDescriptorFromFingerprint(
    daemonBuildFingerprint(runtimeRoot),
    daemonBuildMarker(env)
  );
}

function schemasDiffer(before: BuildSchema, after: BuildSchema): boolean {
  return (
    before.parser !== after.parser ||
    before.resolver !== after.resolver ||
    before.graphSemantics !== after.graphSemantics ||
    before.querySchema !== after.querySchema ||
    before.artifactSchema !== after.artifactSchema
  );
}

/**
 * Compare two build identities.
 *
 * Deliberately does not short-circuit on equal package versions: a build-marker
 * or schema change at the same version still requires a daemon restart.
 */
export function compareBuilds(before: BuildDescriptor, after: BuildDescriptor): BuildDrift {
  const packageVersionChanged = before.packageVersion !== after.packageVersion;
  const buildMarkerChanged = before.buildMarker !== after.buildMarker;
  const schemaChanged = schemasDiffer(before.schema, after.schema);
  const protocolChanged = before.protocolVersion !== after.protocolVersion;
  const runtimeRootChanged = before.runtimeRoot !== after.runtimeRoot;

  const changedDimensions = [
    packageVersionChanged,
    buildMarkerChanged,
    schemaChanged,
    protocolChanged,
    runtimeRootChanged,
  ].filter(Boolean).length;

  const reason: BuildDriftReason =
    changedDimensions === 0
      ? 'none'
      : changedDimensions > 1
        ? 'multiple'
        : packageVersionChanged
          ? 'package_version'
          : buildMarkerChanged
            ? 'build_marker'
            : schemaChanged
              ? 'schema'
              : protocolChanged
                ? 'protocol'
                : 'runtime_root';

  return {
    changed: changedDimensions > 0,
    reason,
    hashBefore: buildHashOf(before),
    hashAfter: buildHashOf(after),
    packageVersionChanged,
    buildMarkerChanged,
    schemaChanged,
    protocolChanged,
    runtimeRootChanged,
  };
}
