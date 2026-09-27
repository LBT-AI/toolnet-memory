# Packaged Build Identity (Phase 84D1)

One build identity for every ToolNet Memory runtime: the npm CLI, the local
daemon and the standalone binary.

Module: `src/runtime/build-identity.ts`
Probe: `toolnet-memory identity`

## Why it exists

A build barrier is only as good as the identity it compares. Before 84D1 the
identity had three sources — the shell dispatcher read `package.json`, the
standalone build injected a version constant, and the daemon walked up to the
nearest `package.json` — which is three answers waiting to disagree.

A package version alone is also not enough to identify a runtime. During phased
development the source tree carries uncommitted work while the version stays
put, so two artifacts can claim the same version and disagree about the parser,
the resolver, the graph semantics, the query schema or the artifact schema.

## Resolution order

| Value | Order |
|---|---|
| Package version | `TOOLNET_PACKAGE_VERSION` → caller-injected constant → build-injected `__TOOLNET_PACKAGE_VERSION__` → nearest `package.json` → `0.0.0` |
| Build marker | `TOOLNET_DAEMON_BUILD_ID` → build-injected `__TOOLNET_BUILD_ID__` → `source` |

Every resolved value carries which source produced it, so a mismatch is
diagnosable instead of mysterious. `source` means "this is a source checkout, not
a packaged artifact".

## Injected constants

`scripts/build-bundle.mjs` and `scripts/build-standalone.mjs` both inject:

```
__TOOLNET_PACKAGE_VERSION__ = pkg.version                       (from package.json)
__TOOLNET_BUILD_ID__        = pkg.version + '+' + digest[0:16]  (from the source tree)
```

`scripts/build-standalone.mjs` additionally keeps injecting
`__TOOLNET_VERSION__`, which the standalone entry point feeds into the shared
resolver, so the standalone binary reports the same identity as the npm bundle
built from the same source.

Nothing reads a hard-coded version. The constants are only ever reached through a
`typeof` guard, which is the one expression that is safe on an identifier a
non-packaged run never declared.

## Source digest

The marker binds the artifact to the source it was built from:

- `runtimeSourceDigest(root)` in `src/runtime/build-identity.ts`,
- the same algorithm in `scripts/source-digest.mjs`.

Both hash every regular file under `<root>/src`, in code-unit path order, with
CRLF normalized. The runtime copy cannot import the build copy (`scripts/` is not
published) and the build copy cannot import the TypeScript one (build scripts run
under plain node), so there are deliberately two implementations. They are held
in agreement by `npm run phase84d1:certify`, which compares the marker a packaged
artifact reports against the marker the TypeScript implementation computes for
the same tree. If they ever drift, that test fails.

The digest is conservative on purpose: any source change changes it, including a
file that does not reach a given bundle. Over-reporting "this is a different
runtime" is safe; under-reporting is not.

## Daemon admission

`daemonBuildHash` binds the protocol version, the package version, the build
marker, the runtime root and all five schema fingerprints. A client and a daemon
exchange it on connect; a mismatch is refused with `DAEMON_BUILD_MISMATCH`. Two
builds from different source therefore cannot talk to each other even when they
report the same version, and a schema change at an unchanged version and marker
is still detected.

## Probing the artifact

```
toolnet-memory identity
```

prints the identity the packaged runtime actually carries, plus the capability
inventory that proves which phase work the artifact contains: the storage
contract counts, a live compatibility decision on the legacy resolution
snapshot, the upgrade phase order and the blocker a legacy authority store
produces.

The inventory is not decoration. A packaged artifact is minified, so grepping it
for identifiers proves nothing; asking it to classify a store and to plan an
upgrade proves the code is present **and** executable.
