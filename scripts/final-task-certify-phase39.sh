#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || true
TOTAL=0
PASS=0
FAIL=0
FAILED_GATES=""
run_gate() {
  NAME="$1"
  shift
  TOTAL=$((TOTAL + 1))
  echo
  echo "============================================================"
  echo "GATE $TOTAL — $NAME"
  echo "============================================================"
  echo "+ $*"
  echo
  "$@"
  RC=$?
  echo
  if [ "$RC" -eq 0 ]; then
    PASS=$((PASS + 1))
    echo "PASS — $NAME"
  else
    FAIL=$((FAIL + 1))
    FAILED_GATES="${FAILED_GATES}${NAME} (rc=${RC})\n"
    echo "FAIL — $NAME — RC=$RC"
  fi
  return 0
}
echo
echo "============================================================"
echo "PHASE 39 — FULL CERTIFICATION"
echo "============================================================"
echo
echo "DATE=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "NODE=$(node --version 2>/dev/null || echo unavailable)"
echo "NPM=$(npm --version 2>/dev/null || echo unavailable)"
echo "PLATFORM=$(uname -a 2>/dev/null || echo unavailable)"
echo
echo "PACKAGE_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo unknown)"
echo "BRANCH=$(git branch --show-current 2>/dev/null || echo unknown)"
echo "HEAD=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo
echo "=== WORKING TREE BEFORE CERTIFICATION ==="
git status --short
# ============================================================
# TASK SYSTEM — TARGETED TESTS
# ============================================================
run_gate \
  "Phase 33 Task Core tests" \
  npm run tasks:core:test
run_gate \
  "Phase 34 Task State tests" \
  npm run tasks:state:test
run_gate \
  "Phase 35 Task Handoff tests" \
  npm run tasks:handoff:test
run_gate \
  "Phase 36 Task CLI + MCP tests" \
  npm run tasks:cli-mcp:test
run_gate \
  "Phase 37 Tasks Panel tests" \
  npm run tasks:panel:test
run_gate \
  "Phase 38 Auto Evidence tests" \
  npm run tasks:auto-evidence:test
# ============================================================
# PHASE STATIC AUDITS
# ============================================================
run_gate \
  "Phase 33 audit" \
  npm run phase33:audit
run_gate \
  "Phase 34 audit" \
  npm run phase34:audit
run_gate \
  "Phase 35 audit" \
  npm run phase35:audit
run_gate \
  "Phase 36 audit" \
  npm run phase36:audit
run_gate \
  "Phase 37 audit" \
  npm run phase37:audit
run_gate \
  "Phase 38 audit" \
  npm run phase38:audit
# ============================================================
# TYPES / STYLE / FULL TEST SUITE
# ============================================================
run_gate \
  "TypeScript typecheck" \
  npm run typecheck
run_gate \
  "ESLint" \
  npm run lint
run_gate \
  "Prettier format check" \
  npm run format:check
run_gate \
  "Full Vitest suite" \
  npm test
# ============================================================
# HISTORICAL ARCHITECTURE REGRESSION
# ============================================================
run_gate \
  "Repository truth audit" \
  npm run repository:truth:audit
run_gate \
  "Documentation truth audit" \
  npm run docs:truth:audit
run_gate \
  "Code search naming audit" \
  npm run code:search:naming:audit
run_gate \
  "Project identity audit" \
  npm run project:identity:audit
run_gate \
  "Conflict Engine V2 audit" \
  npm run memory:conflict-v2:audit
run_gate \
  "Phase 29 audit + Auto-GC/Audit Log" \
  npm run phase29:audit
run_gate \
  "Phase 30 non-TS intelligence audit" \
  npm run phase30:audit
# ============================================================
# SECURITY / STORAGE
# ============================================================
run_gate \
  "Security isolation tests" \
  npm run security:isolation:test
run_gate \
  "Graph security tests" \
  npm run graph:security:test
run_gate \
  "Graph security audit" \
  npm run graph:security:audit
run_gate \
  "Remote encryption tests" \
  npm run security:remote-encryption:test
run_gate \
  "Remote encryption audit" \
  npm run security:remote-encryption:audit
run_gate \
  "Storage scope audit" \
  npm run storage:scope:audit
# ============================================================
# AUDIT LOG + AUTO GC
# ============================================================
run_gate \
  "Tamper-evident audit log tests" \
  npm run audit:test
run_gate \
  "Auto-GC scheduler tests" \
  npm run retention:auto-gc:test
# ============================================================
# NON-TS / STANDALONE
# ============================================================
run_gate \
  "Non-TS local search tests" \
  npm run code:non-ts:test
run_gate \
  "Standalone route parity" \
  npm run standalone:routes:audit
run_gate \
  "Standalone contract tests" \
  npm run standalone:contract:test
run_gate \
  "Standalone contract audit" \
  npm run standalone:contract:audit
# ============================================================
# DOCKER CONTRACT
# ============================================================
run_gate \
  "Docker contract tests" \
  npm run docker:contract:test
run_gate \
  "Docker contract audit" \
  npm run docker:contract:audit
# ============================================================
# RELEASE BUILD
# ============================================================
run_gate \
  "Production release build" \
  npm run build:release
# ============================================================
# REAL STANDALONE SMOKE
# ============================================================
if command -v docker >/dev/null 2>&1; then
  run_gate \
    "Standalone real no-Node smoke" \
    npm run standalone:smoke
else
  TOTAL=$((TOTAL + 1))
  FAIL=$((FAIL + 1))
  FAILED_GATES="${FAILED_GATES}Standalone real no-Node smoke (docker unavailable)\n"
  echo
  echo "FAIL — Standalone real no-Node smoke"
  echo "Docker is required for FULL certification."
fi
# ============================================================
# REAL DOCKER SMOKE
# ============================================================
if command -v docker >/dev/null 2>&1; then
  run_gate \
    "Real Docker container + IPC smoke" \
    npm run docker:smoke
else
  TOTAL=$((TOTAL + 1))
  FAIL=$((FAIL + 1))
  FAILED_GATES="${FAILED_GATES}Real Docker container + IPC smoke (docker unavailable)\n"
  echo
  echo "FAIL — Real Docker container + IPC smoke"
  echo "Docker is required for FULL certification."
fi
# ============================================================
# NPM PACKAGE DRY RUN
# ============================================================
run_gate \
  "npm pack dry-run" \
  npm pack --dry-run --ignore-scripts
# ============================================================
# SOURCE / RELEASE HYGIENE
# ============================================================
run_gate \
  "git diff --check" \
  git diff --check
# ============================================================
# TASK ARCHITECTURE NEGATIVE ASSERTIONS
# ============================================================
echo
echo "============================================================"
echo "TASK ARCHITECTURE NEGATIVE ASSERTIONS"
echo "============================================================"
TASK_ARCH_RC=0
if grep -RniE \
  'OpenAI|Anthropic|Gemini|EmbeddingProvider|sqlite-vec|hnswlib|VectorDatabase' \
  src/tasks \
  2>/dev/null
then
  echo "FAIL — prohibited AI/vector runtime found under src/tasks"
  TASK_ARCH_RC=1
else
  echo "PASS — no LLM/embedding/vector DB under src/tasks"
fi
if grep -RniE \
  'distributedLock|S3.*lock|R2.*lock|WebSocket.*lock' \
  src/tasks \
  2>/dev/null
then
  echo "FAIL — fake distributed Task lock claim found"
  TASK_ARCH_RC=1
else
  echo "PASS — no fake distributed Task lock"
fi
if grep -n \
  '\.complete(' \
  src/tasks/auto-evidence.ts \
  2>/dev/null
then
  echo "FAIL — Auto Evidence may auto-complete Tasks"
  TASK_ARCH_RC=1
else
  echo "PASS — Auto Evidence cannot auto-complete Tasks"
fi
if grep -nE \
  'stdout:|stderr:|toolOutput|commandOutput' \
  src/tasks/auto-evidence.ts \
  2>/dev/null
then
  echo "FAIL — Auto Evidence may persist raw command output"
  TASK_ARCH_RC=1
else
  echo "PASS — raw command output not persisted by Auto Evidence"
fi
TOTAL=$((TOTAL + 1))
if [ "$TASK_ARCH_RC" -eq 0 ]; then
  PASS=$((PASS + 1))
  echo "PASS — Task architecture invariant gate"
else
  FAIL=$((FAIL + 1))
  FAILED_GATES="${FAILED_GATES}Task architecture invariant gate\n"
  echo "FAIL — Task architecture invariant gate"
fi
# ============================================================
# FINAL STATUS
# ============================================================
echo
echo
echo "============================================================"
echo "PHASE 39 FINAL RESULT"
echo "============================================================"
echo "TOTAL_GATES=$TOTAL"
echo "PASSED_GATES=$PASS"
echo "FAILED_GATES=$FAIL"
echo
echo "PACKAGE_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo unknown)"
echo "HEAD=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "BRANCH=$(git branch --show-current 2>/dev/null || echo unknown)"
echo
echo "=== WORKING TREE AFTER CERTIFICATION ==="
git status --short
if [ "$FAIL" -eq 0 ]; then
  echo
  echo "PHASE39_FULL_CERTIFICATION=PASS"
  echo "TASK_CORE=PASS"
  echo "TASK_STATE_ENGINE=PASS"
  echo "MULTI_AGENT_HANDOFF=PASS"
  echo "TASK_CLI_MCP=PASS"
  echo "TASKS_PANEL=PASS"
  echo "AUTO_TASK_EVIDENCE=PASS"
  echo "FULL_TEST_SUITE=PASS"
  echo "TYPECHECK=PASS"
  echo "LINT=PASS"
  echo "FORMAT_CHECK=PASS"
  echo "BUILD_RELEASE=PASS"
  echo "GRAPH_SECURITY=PASS"
  echo "REMOTE_ENCRYPTION=PASS"
  echo "STORAGE_SCOPE=PASS"
  echo "STANDALONE_CONTRACT=PASS"
  echo "STANDALONE_REAL_SMOKE=PASS"
  echo "DOCKER_CONTRACT=PASS"
  echo "DOCKER_REAL_SMOKE=PASS"
  echo "NPM_PACK_DRY_RUN=PASS"
  echo "DIFF_CHECK=PASS"
  echo "V0400_RELEASE_READY=YES"
  echo "VERSION_BUMPED=NO"
  echo "COMMIT=NO"
  echo "PUSH=NO"
  echo "TAG=NO"
  true
else
  echo
  echo "PHASE39_FULL_CERTIFICATION=FAIL"
  echo
  echo "FAILED:"
  printf "%b" "$FAILED_GATES"
  echo
  echo "V0400_RELEASE_READY=NO"
  echo "VERSION_BUMPED=NO"
  echo "COMMIT=NO"
  echo "PUSH=NO"
  echo "TAG=NO"
  false
fi