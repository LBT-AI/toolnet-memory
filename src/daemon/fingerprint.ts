/*
 * Phase 77 — deterministic daemon build fingerprint.
 *
 * Admission between a client and a daemon must never compare package version
 * alone: the source tree can carry uncommitted phase work while the package
 * version is unchanged. The fingerprint binds the protocol version, the package
 * version, an explicit build marker and every schema fingerprint the shared
 * runtime depends on.
 *
 * Phase 84D1: the version and the marker are no longer resolved here. They come
 * from `src/runtime/build-identity.ts`, the single truth the CLI, the daemon and
 * the standalone binary all read, so a packaged artifact cannot advertise one
 * version through one entry point and another through the next.
 */

import { createHash } from 'node:crypto';

import { resolveBuildMarker, resolvePackageVersion } from '../runtime/build-identity.js';

import { runtimeArtifactFingerprints } from '../code-intelligence/artifact/fingerprint.js';

import { DAEMON_PROTOCOL_VERSION, type DaemonBuildFingerprint } from './types.js';

/**
 * Explicit build marker.
 *
 * `TOOLNET_DAEMON_BUILD_ID` overrides it; a packaged build injects a marker
 * derived from the package version and the runtime source digest. `source`
 * means "not a packaged artifact". The marker is part of the fingerprint but
 * never a substitute for the schema fingerprints below.
 */
export function daemonBuildMarker(env: NodeJS.ProcessEnv = process.env): string {
  return resolveBuildMarker({ env }).value;
}

/** Package version this runtime advertises; bounded upward search, never throws. */
export function daemonPackageVersion(): string {
  return resolvePackageVersion().value;
}

/** Runtime-schema fingerprints, reused from the Phase 76 runtime contract. */
export function daemonSchemaFingerprints() {
  return runtimeArtifactFingerprints();
}

/**
 * The digest a client and daemon must agree on.
 *
 * Deterministic and free of timestamps or machine identity.
 */
export function daemonBuildHash(input: {
  protocolVersion: number;
  packageVersion: string;
  buildMarker: string;
  runtimeRoot: string;
  schema: ReturnType<typeof daemonSchemaFingerprints>;
}): string {
  const canonical = JSON.stringify({
    artifactSchema: input.schema.artifactSchema,
    buildMarker: input.buildMarker,
    graphSemantics: input.schema.graphSemantics,
    packageVersion: input.packageVersion,
    parser: input.schema.parser,
    protocolVersion: input.protocolVersion,
    querySchema: input.schema.querySchema,
    resolver: input.schema.resolver,
    runtimeRoot: input.runtimeRoot,
  });

  return createHash('sha256').update(canonical).digest('hex');
}

export function daemonBuildFingerprint(runtimeRoot: string): DaemonBuildFingerprint {
  const schema = daemonSchemaFingerprints();

  const packageVersion = daemonPackageVersion();

  return {
    protocolVersion: DAEMON_PROTOCOL_VERSION,
    packageVersion,
    buildHash: daemonBuildHash({
      protocolVersion: DAEMON_PROTOCOL_VERSION,
      packageVersion,
      buildMarker: daemonBuildMarker(),
      runtimeRoot,
      schema,
    }),
    schema,
    runtimeRoot,
  };
}
