#!/usr/bin/env bash

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"

cd "$ROOT" || {
  echo "Cannot enter repository root: $ROOT"
  false
}

FAIL=0
VERSION="$(tr -d '[:space:]' < .release-target 2>/dev/null)"

if [ -z "$VERSION" ]; then
  VERSION="INVALID"
fi

pass() {
  printf "PASS  %s\n" "$1"
}

fail() {
  printf "FAIL  %s\n" "$1"
  FAIL=1
}

run_gate() {
  NAME="$1"
  shift

  echo
  echo "=== $NAME ==="

  "$@"
  RC=$?

  if [ "$RC" -eq 0 ]; then
    pass "$NAME"
    return 0
  fi

  fail "$NAME ($RC)"
  return 0
}


echo "=============================================="
echo "=== TOOLNET MEMORY FINAL RELEASE CERTIFY ==="
echo "=============================================="
echo "Target version: $VERSION"


# ------------------------------------------------------------
# Static release invariants
# ------------------------------------------------------------

echo
echo "=== RELEASE METADATA ==="

PACKAGE_VERSION="$(
  node -p "require('./package.json').version" 2>/dev/null
)"

LOCK_VERSION="$(
  node -p "require('./package-lock.json').version" 2>/dev/null
)"

MANIFEST_VERSION="$(
  node -p "require('./release-manifest.json').version" 2>/dev/null
)"

TARGET_VERSION="$(
  tr -d '[:space:]' < .release-target 2>/dev/null
)"

if [ "$PACKAGE_VERSION" = "$VERSION" ]; then
  pass "package.json version"
else
  fail "package.json version=$PACKAGE_VERSION"
fi

if [ "$LOCK_VERSION" = "$VERSION" ]; then
  pass "package-lock.json version"
else
  fail "package-lock.json version=$LOCK_VERSION"
fi

if [ "$MANIFEST_VERSION" = "$VERSION" ]; then
  pass "release manifest version"
else
  fail "release manifest version=$MANIFEST_VERSION"
fi

if [ "$TARGET_VERSION" = "$VERSION" ]; then
  pass "release target version"
else
  fail "release target version=$TARGET_VERSION"
fi

if grep -q "Current release: \*\*v$VERSION\*\*" README.md; then
  pass "README release version"
else
  fail "README release version"
fi

if grep -q "## \[$VERSION\]" CHANGELOG.md; then
  pass "CHANGELOG release section"
else
  fail "CHANGELOG release section"
fi


# ------------------------------------------------------------
# Git / safety invariants
# ------------------------------------------------------------

echo
echo "=== SOURCE SAFETY ==="

if git diff --check; then
  pass "git diff check"
else
  fail "git diff check"
fi

STORAGE_DIFF="$(
  git diff --name-only HEAD -- src/storage
)"

if [ -z "$STORAGE_DIFF" ]; then
  pass "src/storage unchanged"
else
  fail "src/storage changed"
  printf '%s\n' "$STORAGE_DIFF"
fi

ENV_TRACKED="$(
  git ls-files |
  grep -E '(^|/)\.env$' |
  head -20
)"

if [ -z "$ENV_TRACKED" ]; then
  pass "no tracked .env secrets"
else
  fail "tracked .env detected"
  printf '%s\n' "$ENV_TRACKED"
fi


# ------------------------------------------------------------
# Runtime architecture contract
# ------------------------------------------------------------

echo
echo "=== LOCAL MEMORY ARCHITECTURE ==="

STALE_RUNTIME="$(
  grep -RniE \
    'TOOLNET_LLM_|TOOLNET_EMBEDDING_' \
    src \
    packages \
    .env.example \
    2>/dev/null |
  head -40
)"

if [ -z "$STALE_RUNTIME" ]; then
  pass "no stale LLM/embedding runtime config"
else
  fail "stale LLM/embedding runtime config"
  printf '%s\n' "$STALE_RUNTIME"
fi

if grep -q '"requiresLlm": false' release-manifest.json &&
   grep -q '"requiresEmbeddings": false' release-manifest.json; then
  pass "local-only release manifest"
else
  fail "local-only release manifest"
fi


# ------------------------------------------------------------
# Capability registry contract
# ------------------------------------------------------------

echo
echo "=== 10-AGENT CAPABILITY CONTRACT ==="

for AGENT in \
  agy \
  opencode \
  codex \
  claude \
  kiro \
  cursor \
  copilot \
  grok \
  toolnet-cli \
  kilo
do
  if grep -q "\"$AGENT\"" release-manifest.json; then
    pass "manifest agent: $AGENT"
    continue
  fi

  fail "manifest agent missing: $AGENT"
done


# ------------------------------------------------------------
# Quality certification
# npm test intentionally appears exactly once.
# ------------------------------------------------------------

run_gate \
  "V0316_FEATURE_CONTRACT" \
  node scripts/verify-v0316-contract.mjs
run_gate \
  "PROJECT_IDENTITY_AUDIT" \
  node scripts/project-identity-audit.mjs
run_gate \
  "REPOSITORY_TRUTH_AUDIT" \
  node scripts/repository-truth-audit.mjs
run_gate \
  "CODE_SEARCH_NAMING_AUDIT" \
  node scripts/code-search-naming-audit.mjs
run_gate \
  "DOCUMENTATION_TRUTH_AUDIT" \
  node scripts/documentation-truth-audit.mjs
run_gate \
  "CONFLICT_V2_AUDIT" \
  node scripts/conflict-v2-audit.mjs

run_gate \
  "STATIC_RELEASE_CONTRACT" \
  node scripts/verify-release-contract.mjs

run_gate \
  "FORMAT_CHECK" \
  npm run format:check

run_gate \
  "LINT" \
  npm run lint

run_gate \
  "TYPECHECK" \
  npm run typecheck

run_gate \
  "LARGE_REPO_SCAN_10K" \
  npm run benchmark:large-repo -- --profile 10k

run_gate \
  "FULL_TEST_SUITE" \
  npm test

run_gate \
  "BUILD_RELEASE" \
  npm run build:release


# ------------------------------------------------------------
# Production runtime certification
#
# Bundle is already built above. Disable npm lifecycle scripts
# for the internal npm-pack inspection so prepack does not build
# the project a second time.
# ------------------------------------------------------------

run_gate \
  "PRODUCTION_CERTIFY" \
  env npm_config_ignore_scripts=true \
  ./bin/toolnet-memory production:certify


# ------------------------------------------------------------
# Final generated-package invariants
# ------------------------------------------------------------

echo
echo "=== PACKAGE CONTRACT ==="

PACK_JSON="$(
  npm pack \
    --dry-run \
    --json \
    --ignore-scripts \
    2>/dev/null
)"

PACK_RC=$?

if [ "$PACK_RC" -ne 0 ] || [ -z "$PACK_JSON" ]; then
  fail "npm package dry-run"
else
  pass "npm package dry-run"

  printf '%s' "$PACK_JSON" > /tmp/toolnet-final-pack.json
fi

PACK_FILES="$(
  printf '%s' "$PACK_JSON" |
  node -e '
    let raw = "";

    process.stdin.on("data", (chunk) => {
      raw += chunk;
    });

    process.stdin.on("end", () => {
      try {
        const parsed = JSON.parse(raw);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        const files = Array.isArray(entry?.files) ? entry.files : [];

        for (const file of files) {
          if (typeof file?.path !== "string") {
            continue;
          }

          console.log(file.path);
        }
      } catch {
        process.exitCode = 1;
      }
    });
  '
)"

PACK_PARSE_RC=$?

if [ "$PACK_PARSE_RC" -ne 0 ]; then
  fail "parse npm package manifest"
else
  pass "parse npm package manifest"
fi

if printf '%s\n' "$PACK_FILES" |
   grep -Fxq 'release-manifest.json'; then
  pass "release-manifest packaged"
else
  fail "release-manifest missing from npm package"
fi

PACK_SRC="$(
  printf '%s\n' "$PACK_FILES" |
  grep '^src/' |
  head -20
)"

if [ -z "$PACK_SRC" ]; then
  pass "raw src excluded from npm package"
else
  fail "raw src leaked into npm package"
  printf '%s\n' "$PACK_SRC"
fi


# ------------------------------------------------------------
# Build must not mutate protected storage source.
# ------------------------------------------------------------

POST_STORAGE_DIFF="$(
  git diff --name-only HEAD -- src/storage
)"

if [ -z "$POST_STORAGE_DIFF" ]; then
  pass "post-build src/storage unchanged"
else
  fail "post-build src/storage changed"
  printf '%s\n' "$POST_STORAGE_DIFF"
fi


# ------------------------------------------------------------
# Native-host E2E
# Optional on this host.
# ------------------------------------------------------------

echo
echo "=== NATIVE CLI E2E ==="
echo "SKIP  native agent E2E — optional/non-blocking on hosts without agents"


# ------------------------------------------------------------
# Verdict
# ------------------------------------------------------------

echo
echo "=============================================="

if [ "$FAIL" -eq 0 ]; then
  echo "FINAL_RELEASE_CERTIFICATION=PASS"
  echo "VERSION=$VERSION"
  echo "READY_FOR_RELEASE_COMMIT=YES"
  true
else
  echo "FINAL_RELEASE_CERTIFICATION=FAIL"
  echo "VERSION=$VERSION"
  echo "READY_FOR_RELEASE_COMMIT=NO"
  false
fi
