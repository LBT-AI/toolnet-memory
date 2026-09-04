#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || true
FAIL=0
gate() {
  NAME="$1"
  shift
  echo
  echo "============================================================"
  echo "$NAME"
  echo "============================================================"
  "$@"
  RC=$?
  if [ "$RC" -eq 0 ]; then
    echo "PASS — $NAME"
  else
    echo "FAIL — $NAME RC=$RC"
    FAIL=$((FAIL + 1))
  fi
  return 0
}
echo "=== ToolNet Memory v0.4.0 Release Preflight ==="
echo
echo "PACKAGE_VERSION=$(node -p "require('./package.json').version")"
echo "HEAD=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "BRANCH=$(git branch --show-current 2>/dev/null || echo unknown)"
gate \
  "v0.4.0 feature contract" \
  node scripts/verify-v0400-contract.mjs
gate \
  "Phase 39 full certification" \
  npm run phase39:certify
gate \
  "Release build" \
  npm run build:release
gate \
  "Standalone route parity" \
  npm run standalone:routes:audit
gate \
  "Graph security audit" \
  npm run graph:security:audit
gate \
  "Storage scope audit" \
  npm run storage:scope:audit
gate \
  "npm package dry run" \
  npm pack --dry-run --ignore-scripts
gate \
  "git diff check" \
  git diff --check
echo
echo "============================================================"
echo "v0.4.0 RELEASE PRE-FLIGHT RESULT"
echo "============================================================"
if [ "$FAIL" -eq 0 ]; then
  echo "V0400_RELEASE_PREFLIGHT=PASS"
  echo "V0400_RELEASE_READY=YES"
  echo "VERSION=0.4.0"
  echo "COMMIT=NO"
  echo "PUSH=NO"
  echo "TAG=NO"
  echo "NPM_PUBLISH=NO"
else
  echo "V0400_RELEASE_PREFLIGHT=FAIL"
  echo "V0400_RELEASE_READY=NO"
  echo "FAILED_GATES=$FAIL"
  echo "COMMIT=NO"
  echo "PUSH=NO"
  echo "TAG=NO"
  echo "NPM_PUBLISH=NO"
fi
