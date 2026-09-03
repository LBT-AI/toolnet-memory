#!/usr/bin/env bash
FAILURES=0

run_gate() {
  NAME="$1"
  shift
  echo
  echo "=============================================="
  echo "GATE=$NAME"
  echo "=============================================="
  "$@"
  RC=$?
  if [ "$RC" -eq 0 ]; then
    echo "${NAME}=PASS"
  else
    echo "${NAME}=FAIL RC=$RC"
    FAILURES=$((FAILURES + 1))
  fi
}

run_gate "V0317_FEATURE_CONTRACT" node scripts/verify-v0317-contract.mjs
run_gate "PHASE29_AUDIT_TESTS" npm run audit:test
run_gate "PHASE29_AUTO_GC_TESTS" npm run retention:auto-gc:test
run_gate "PHASE29_AUDIT" npm run phase29:audit
run_gate "PHASE30_NON_TS_TESTS" npm run code:non-ts:test
run_gate "PHASE30_AUDIT" npm run phase30:audit
run_gate "GRAPH_SECURITY_AUDIT" npm run graph:security:audit
run_gate "DOCKER_CONTRACT_AUDIT" npm run docker:contract:audit
run_gate "REMOTE_ENCRYPTION_AUDIT" npm run security:remote-encryption:audit
run_gate "STANDALONE_CONTRACT_AUDIT" npm run standalone:contract:audit
run_gate "REPOSITORY_TRUTH_AUDIT" npm run repository:truth:audit
run_gate "DOCUMENTATION_TRUTH_AUDIT" npm run docs:truth:audit
run_gate "STORAGE_SCOPE_AUDIT" npm run storage:scope:audit
run_gate "STANDALONE_ROUTE_PARITY" npm run standalone:routes:audit
run_gate "TYPECHECK" npm run typecheck
run_gate "FULL_TEST_SUITE" npm test
run_gate "BUILD_RELEASE" npm run build:release
run_gate "STANDALONE_NO_NODE_SMOKE" npm run standalone:smoke
run_gate "DOCKER_REAL_SMOKE" npm run docker:smoke
run_gate "PACKAGE_DRY_RUN" npm pack --dry-run
run_gate "DIFF_CHECK" git diff --check

echo
echo "=============================================="
echo "FINAL_FAILURES=$FAILURES"
if [ "$FAILURES" -eq 0 ]; then
  echo "FINAL_RELEASE_CERTIFICATION=PASS"
  echo "VERSION=0.3.17"
  echo "READY_FOR_RELEASE_COMMIT=YES"
else
  echo "FINAL_RELEASE_CERTIFICATION=FAIL"
  echo "VERSION=0.3.17"
  echo "READY_FOR_RELEASE_COMMIT=NO"
fi
echo "=============================================="
test "$FAILURES" -eq 0