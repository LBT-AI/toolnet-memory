#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
CERT_ROOT="${TOOLNET_NATIVE_CERT_ROOT:-$HOME/.cache/toolnet-memory/native-e2e-v${VERSION}}"
WORKSPACE="$CERT_ROOT/project"
GLOBAL_WORKSPACE="$CERT_ROOT/global-workspace"
RUN_ROOT="$CERT_ROOT/run"
BACKUP_ROOT="$RUN_ROOT/backup"
LOG_ROOT="$RUN_ROOT/logs"
DEDUPE_ROOT="$RUN_ROOT/dedupe"
INVOCATION_LOG="$RUN_ROOT/invocations.log"

mkdir -p "$CERT_ROOT" "$WORKSPACE" "$GLOBAL_WORKSPACE"

rm -rf "$RUN_ROOT"
mkdir -p "$BACKUP_ROOT" "$LOG_ROOT" "$DEDUPE_ROOT"
: > "$INVOCATION_LOG"

FAILURES=()
BLOCKERS=()
PASSES=()

pass() {
  PASSES+=("$1")
  printf 'PASS  %s\n' "$1"
}

fail() {
  FAILURES+=("$1")
  printf 'FAIL  %s\n' "$1"
}

block() {
  BLOCKERS+=("$1")
  printf 'BLOCK %s\n' "$1"
}

run_capture() {
  local outfile="$1"
  shift

  timeout "${TOOLNET_NATIVE_TIMEOUT_SEC:-120}" "$@" >"$outfile" 2>&1
}

make_workspace() {
  local dir="$1"

  mkdir -p "$dir"

  if [ ! -d "$dir/.git" ]; then
    git -C "$dir" init -q
  fi
}

make_workspace "$WORKSPACE"
make_workspace "$GLOBAL_WORKSPACE"

mkdir -p "$WORKSPACE/.toolnet"
printf '{}\n' > "$WORKSPACE/.toolnet/project.json"

rm -rf \
  "$GLOBAL_WORKSPACE/.cursor" \
  "$GLOBAL_WORKSPACE/.github" \
  "$GLOBAL_WORKSPACE/.grok" \
  "$GLOBAL_WORKSPACE/.toolnet"

REAL_TOOLNET="$ROOT/bin/toolnet-memory"

make_shim() {
  local path="$1"
  local lane="$2"

  mkdir -p "$(dirname "$path")"

  cat > "$path" <<SHIM
#!/usr/bin/env bash
set -uo pipefail

REAL_TOOLNET=$(printf '%q' "$REAL_TOOLNET")
INVOCATION_LOG=$(printf '%q' "$INVOCATION_LOG")
RUN_ROOT=$(printf '%q' "$RUN_ROOT")
LANE=$(printf '%q' "$lane")

cmd="\${1:-}"

if [[ "\$cmd" == session:* ]]; then
  mkdir -p "\$RUN_ROOT/hook-inputs"
  tmp="\$(mktemp "\$RUN_ROOT/hook-inputs/\${LANE}.XXXXXX.json")"
  cat > "\$tmp"

  event="\$(python3 - "\$tmp" <<'PY'
import json
import sys

path = sys.argv[1]

try:
    data = json.load(open(path))
except Exception:
    print("unknown")
    raise SystemExit(0)

for key in (
    "hookEventName",
    "hook_event_name",
    "event",
    "eventName",
    "event_name",
):
    value = data.get(key)
    if isinstance(value, str) and value:
        print(value)
        break
else:
    print("unknown")
PY
)"

  printf '%s lane=%s kind=hook cmd=%s event=%s cwd=%q\n' \
    "\$(date +%s%3N)" "\$LANE" "\$cmd" "\$event" "\$PWD" >> "\$INVOCATION_LOG"

  exec "\$REAL_TOOLNET" "\$@" < "\$tmp"
fi

printf '%s lane=%s kind=process cmd=%s cwd=%q\n' \
  "\$(date +%s%3N)" "\$LANE" "\$cmd" "\$PWD" >> "\$INVOCATION_LOG"

exec "\$REAL_TOOLNET" "\$@"
SHIM

  chmod +x "$path"
}

GLOBAL_SHIM="$CERT_ROOT/bin/toolnet-memory-global"
PROJECT_SHIM="$CERT_ROOT/bin/toolnet-memory-project"

make_shim "$GLOBAL_SHIM" global
make_shim "$PROJECT_SHIM" project

CURSOR_HOME="$HOME/.cursor"
COPILOT_HOME_EFFECTIVE="${COPILOT_HOME:-$HOME/.copilot}"
GROK_HOME_EFFECTIVE="${GROK_HOME:-$HOME/.grok}"

declare -a BACKUP_PATHS=(
  "$CURSOR_HOME/mcp.json"
  "$CURSOR_HOME/hooks.json"
  "$COPILOT_HOME_EFFECTIVE/mcp-config.json"
  "$COPILOT_HOME_EFFECTIVE/hooks/toolnet-memory.json"
  "$GROK_HOME_EFFECTIVE/config.toml"
  "$GROK_HOME_EFFECTIVE/hooks/toolnet-memory.json"
  "$GROK_HOME_EFFECTIVE/skills/toolnet-continuity/SKILL.md"
)

backup_file() {
  local path="$1"
  local key
  key="$(printf '%s' "$path" | sha256sum | awk '{print $1}')"

  printf '%s\n' "$path" > "$BACKUP_ROOT/$key.path"

  if [ -e "$path" ]; then
    printf '1\n' > "$BACKUP_ROOT/$key.exists"
    cp -a "$path" "$BACKUP_ROOT/$key.data"
  else
    printf '0\n' > "$BACKUP_ROOT/$key.exists"
  fi
}

restore_file() {
  local path="$1"
  local key
  key="$(printf '%s' "$path" | sha256sum | awk '{print $1}')"

  mkdir -p "$(dirname "$path")"

  if [ "$(cat "$BACKUP_ROOT/$key.exists")" = "1" ]; then
    rm -f "$path"
    cp -a "$BACKUP_ROOT/$key.data" "$path"
  else
    rm -f "$path"
  fi
}

restore_all() {
  local path

  for path in "${BACKUP_PATHS[@]}"; do
    restore_file "$path" || true
  done

  rmdir "$COPILOT_HOME_EFFECTIVE/hooks" 2>/dev/null || true
  rmdir "$GROK_HOME_EFFECTIVE/hooks" 2>/dev/null || true
  rmdir "$GROK_HOME_EFFECTIVE/skills/toolnet-continuity" 2>/dev/null || true
  rmdir "$GROK_HOME_EFFECTIVE/skills" 2>/dev/null || true
}

for path in "${BACKUP_PATHS[@]}"; do
  backup_file "$path"
done

trap restore_all EXIT

echo "============================================================"
echo " ToolNet Native E2E Certification"
echo "============================================================"
echo "Version     : $VERSION"
echo "Workspace   : $WORKSPACE"
echo "Cert root   : $CERT_ROOT"
echo "Live prompts: ${TOOLNET_NATIVE_LIVE_PROMPTS:-1}"
echo

CURSOR_BIN=""
if command -v agent >/dev/null 2>&1; then
  CURSOR_BIN="$(command -v agent)"
elif command -v cursor-agent >/dev/null 2>&1; then
  CURSOR_BIN="$(command -v cursor-agent)"
fi

COPILOT_BIN="$(command -v copilot 2>/dev/null || true)"
GROK_BIN="$(command -v grok 2>/dev/null || true)"

if [ -n "$CURSOR_BIN" ]; then
  pass "Cursor native binary: $CURSOR_BIN"
else
  block "Cursor CLI missing (expected agent or cursor-agent)"
fi

if [ -n "$COPILOT_BIN" ]; then
  pass "Copilot native binary: $COPILOT_BIN"
else
  block "GitHub Copilot CLI missing (expected copilot)"
fi

if [ -n "$GROK_BIN" ]; then
  pass "Grok Build native binary: $GROK_BIN"
else
  block "Grok Build CLI missing (expected grok)"
fi

if [ -n "$CURSOR_BIN" ]; then
  run_capture "$LOG_ROOT/cursor-version.txt" "$CURSOR_BIN" --version ||
    run_capture "$LOG_ROOT/cursor-version.txt" "$CURSOR_BIN" version ||
    block "Cursor version probe failed"
fi

if [ -n "$COPILOT_BIN" ]; then
  run_capture "$LOG_ROOT/copilot-version.txt" "$COPILOT_BIN" --version ||
    block "Copilot version probe failed"
fi

if [ -n "$GROK_BIN" ]; then
  run_capture "$LOG_ROOT/grok-version.txt" "$GROK_BIN" version ||
    run_capture "$LOG_ROOT/grok-version.txt" "$GROK_BIN" --version ||
    block "Grok version probe failed"
fi

echo
echo "== Install isolated certification surfaces =="

install_agent_scopes() {
  local agent="$1"

  TOOLNET_MEMORY_BIN="$GLOBAL_SHIM" \
    "$REAL_TOOLNET" "integrate:$agent" \
      --scope global \
      --json >"$LOG_ROOT/$agent-install-global.json" 2>&1 || {
        fail "$agent global install"
        return 1
      }

  TOOLNET_MEMORY_BIN="$PROJECT_SHIM" \
    "$REAL_TOOLNET" "integrate:$agent" \
      --scope project \
      --project "$WORKSPACE" \
      --json >"$LOG_ROOT/$agent-install-project.json" 2>&1 || {
        fail "$agent project install"
        return 1
      }

  pass "$agent global + project installation"
}

install_agent_scopes cursor
install_agent_scopes copilot
install_agent_scopes grok

"$REAL_TOOLNET" integrate:status \
  --scope both \
  --project "$WORKSPACE" \
  --json >"$LOG_ROOT/toolnet-scoped-status.json" 2>&1

if node - "$LOG_ROOT/toolnet-scoped-status.json" <<'NODE'
const fs = require('node:fs');
const status = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

if (status.installed !== true || status.state !== 'ready') process.exit(1);
if (status.summary?.ready !== 3) process.exit(1);

for (const agent of status.agents ?? []) {
  if (agent.effective?.mcp !== 'project') process.exit(1);
  if (agent.effective?.hooks !== 'both') process.exit(1);
  if (agent.effective?.work !== 'project') process.exit(1);
}
NODE
then
  pass "ToolNet unified both-scope status"
else
  fail "ToolNet unified both-scope status"
fi

clear_invocations() {
  : > "$INVOCATION_LOG"
}

assert_lane() {
  local lane="$1"

  grep -q "lane=$lane kind=process" "$INVOCATION_LOG"
}

echo
echo "== Native MCP discovery / precedence =="

if [ -n "$CURSOR_BIN" ]; then
  clear_invocations

  if (
    cd "$GLOBAL_WORKSPACE" &&
      run_capture "$LOG_ROOT/cursor-mcp-global.txt" \
        "$CURSOR_BIN" mcp list-tools toolnet-memory
  ) && grep -qi "memory_agent_ask" "$LOG_ROOT/cursor-mcp-global.txt" &&
    assert_lane global
  then
    pass "Cursor global MCP connects and exposes memory_agent_ask"
  else
    fail "Cursor global MCP native connection/tool discovery"
  fi

  clear_invocations

  if (
    cd "$WORKSPACE" &&
      run_capture "$LOG_ROOT/cursor-mcp-project.txt" \
        "$CURSOR_BIN" mcp list-tools toolnet-memory
  ) && grep -qi "memory_agent_ask" "$LOG_ROOT/cursor-mcp-project.txt" &&
    assert_lane project &&
    ! grep -q "lane=global kind=process" "$INVOCATION_LOG"
  then
    pass "Cursor project MCP wins over same-name global MCP"
  else
    fail "Cursor project MCP native precedence"
  fi
fi

if [ -n "$COPILOT_BIN" ]; then
  clear_invocations

  if (
    cd "$GLOBAL_WORKSPACE" &&
      run_capture "$LOG_ROOT/copilot-mcp-global.json" \
        "$COPILOT_BIN" mcp get toolnet-memory --json
  ) && grep -qi "memory_agent_ask" "$LOG_ROOT/copilot-mcp-global.json" &&
    assert_lane global
  then
    pass "Copilot global MCP connects and exposes memory_agent_ask"
  else
    fail "Copilot global MCP native connection/tool discovery"
  fi

  clear_invocations

  if (
    cd "$WORKSPACE" &&
      run_capture "$LOG_ROOT/copilot-mcp-project.json" \
        "$COPILOT_BIN" mcp get toolnet-memory --json
  ) && grep -qi "memory_agent_ask" "$LOG_ROOT/copilot-mcp-project.json" &&
    assert_lane project
  then
    pass "Copilot project MCP is effective in project workspace"
  else
    fail "Copilot project MCP native precedence"
  fi

  if (
    cd "$WORKSPACE" &&
      run_capture "$LOG_ROOT/copilot-resources.json" \
        "$COPILOT_BIN" plugins list --json
  ) &&
    grep -qi "toolnet-memory" "$LOG_ROOT/copilot-resources.json" &&
    grep -qi "instruction" "$LOG_ROOT/copilot-resources.json"
  then
    pass "Copilot native resource discovery sees ToolNet project resources"
  else
    fail "Copilot native project instruction/resource discovery"
  fi
fi

if [ -n "$GROK_BIN" ]; then
  clear_invocations

  if (
    cd "$GLOBAL_WORKSPACE" &&
      run_capture "$LOG_ROOT/grok-mcp-global.json" \
        "$GROK_BIN" mcp doctor toolnet-memory --json
  ) && assert_lane global
  then
    pass "Grok global MCP doctor connects"
  else
    fail "Grok global MCP native doctor"
  fi

  clear_invocations

  if (
    cd "$WORKSPACE" &&
      run_capture "$LOG_ROOT/grok-mcp-project.json" \
        "$GROK_BIN" mcp doctor toolnet-memory --json
  ) && assert_lane project &&
    ! grep -q "lane=global kind=process" "$INVOCATION_LOG"
  then
    pass "Grok project MCP fully replaces same-name global MCP"
  else
    fail "Grok project MCP native precedence"
  fi

  if (
    cd "$WORKSPACE" &&
      run_capture "$LOG_ROOT/grok-inspect.json" \
        "$GROK_BIN" inspect --json
  ) &&
    grep -qi "toolnet-memory" "$LOG_ROOT/grok-inspect.json" &&
    grep -qi "toolnet-continuity" "$LOG_ROOT/grok-inspect.json"
  then
    pass "Grok inspect sees ToolNet MCP + continuity skill"
  else
    fail "Grok native inspect/resource discovery"
  fi
fi

echo
echo "== Native lifecycle hooks + cross-layer dedupe =="

LIVE="${TOOLNET_NATIVE_LIVE_PROMPTS:-1}"

run_hook_proof() {
  local agent="$1"
  shift
  local dedupe="$DEDUPE_ROOT/$agent"

  rm -rf "$dedupe"
  mkdir -p "$dedupe"
  clear_invocations

  if ! (
    cd "$WORKSPACE" &&
      TOOLNET_HOOK_DEDUPE_DIR="$dedupe" \
      "$@"
  ); then
    return 1
  fi

  local global_count
  local project_count
  local attempts
  local markers

  global_count="$(grep -c "lane=global kind=hook cmd=session:$agent-hook" "$INVOCATION_LOG" 2>/dev/null || true)"
  project_count="$(grep -c "lane=project kind=hook cmd=session:$agent-hook" "$INVOCATION_LOG" 2>/dev/null || true)"
  attempts=$((global_count + project_count))
  markers="$(find "$dedupe" -type f 2>/dev/null | wc -l | tr -d ' ')"

  {
    echo "global_hook_attempts=$global_count"
    echo "project_hook_attempts=$project_count"
    echo "total_hook_attempts=$attempts"
    echo "dedupe_markers=$markers"
  } > "$LOG_ROOT/$agent-hook-proof.txt"

  if [ "$global_count" -lt 1 ] || [ "$project_count" -lt 1 ]; then
    return 2
  fi

  if [ "$markers" -lt 1 ] || [ "$markers" -ge "$attempts" ]; then
    return 3
  fi

  return 0
}

if [ "$LIVE" != "1" ]; then
  block "Live native prompt certification disabled (set TOOLNET_NATIVE_LIVE_PROMPTS=1)"
else
  PROMPT='Reply exactly TOOLNET_NATIVE_OK. Do not edit files. Do not run shell commands. Do not use external network tools.'

  if [ -n "$CURSOR_BIN" ]; then
    if (
      cd "$WORKSPACE" &&
        run_capture "$LOG_ROOT/cursor-auth.txt" "$CURSOR_BIN" status
    ); then
      :
    else
      block "Cursor authentication/status is not ready; see $LOG_ROOT/cursor-auth.txt"
    fi

    if run_hook_proof cursor \
      run_capture "$LOG_ROOT/cursor-prompt.txt" \
        "$CURSOR_BIN" -p "$PROMPT" --mode=ask --approve-mcps
    then
      pass "Cursor native global+project hooks fire and ToolNet dedupes"
    else
      rc=$?
      if [ "$rc" -eq 2 ]; then
        block "Cursor project hook not proven; workspace trust may be required"
      else
        block "Cursor live prompt/hook proof failed; see $LOG_ROOT/cursor-prompt.txt"
      fi
    fi
  fi

  if [ -n "$COPILOT_BIN" ]; then
    if run_hook_proof copilot \
      env \
        GITHUB_COPILOT_PROMPT_MODE_REPO_HOOKS=true \
        GITHUB_COPILOT_PROMPT_MODE_WORKSPACE_MCP=true \
        COPILOT_ALLOW_ALL=1 \
      timeout "${TOOLNET_NATIVE_TIMEOUT_SEC:-120}" \
        "$COPILOT_BIN" -s -p "$PROMPT" --no-ask-user \
        >"$LOG_ROOT/copilot-prompt.txt" 2>&1
    then
      pass "Copilot native global+project hooks fire and ToolNet dedupes"
    else
      rc=$?
      if [ "$rc" -eq 2 ]; then
        block "Copilot repository hook not proven; trust/prompt-mode policy may block it"
      else
        block "Copilot live prompt/hook proof failed; see $LOG_ROOT/copilot-prompt.txt"
      fi
    fi
  fi

  if [ -n "$GROK_BIN" ]; then
    if run_hook_proof grok \
      run_capture "$LOG_ROOT/grok-prompt.txt" \
        "$GROK_BIN" \
          --no-auto-update \
          --always-approve \
          --cwd "$WORKSPACE" \
          -p "$PROMPT" \
          --output-format plain
    then
      pass "Grok native global+project hooks fire and ToolNet dedupes"
    else
      rc=$?
      if [ "$rc" -eq 2 ]; then
        block "Grok project hooks are not trusted; open this workspace and run /hooks-trust: $WORKSPACE"
      else
        block "Grok live prompt/hook proof failed; see $LOG_ROOT/grok-prompt.txt"
      fi
    fi
  fi
fi

echo
echo "== Native certification summary =="

echo "PASS count    : ${#PASSES[@]}"
echo "BLOCK count   : ${#BLOCKERS[@]}"
echo "FAIL count    : ${#FAILURES[@]}"
echo "Logs          : $LOG_ROOT"
echo "Workspace     : $WORKSPACE"
echo

if [ "${#FAILURES[@]}" -gt 0 ]; then
  echo "PHASE 07H NATIVE CERTIFICATION: FAIL"
  printf ' - %s\n' "${FAILURES[@]}"
  exit 1
fi

if [ "${#BLOCKERS[@]}" -gt 0 ]; then
  echo "PHASE 07H NATIVE CERTIFICATION: BLOCKED"
  printf ' - %s\n' "${BLOCKERS[@]}"
  echo
  echo "No release version bump should be performed yet."
  exit 2
fi

echo "PHASE 07H NATIVE CERTIFICATION: PASS"
echo "Cursor + Copilot + Grok native gate is GREEN."
