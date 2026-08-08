#!/usr/bin/env bash

set -u
set -o pipefail

PACKAGE="toolnet-memory"
REGISTRY="https://registry.npmjs.org/"
MIN_NODE_MAJOR=22
INSTALL_TIMEOUT_SECONDS=600
LOG="${TMPDIR:-/tmp}/toolnet-memory-install-$$.log"

export TERM="${TERM:-xterm}"

# Some VPS providers advertise IPv6 but have unreliable IPv6 egress.
# Prefer IPv4 for Node/npm while preserving user NODE_OPTIONS.
NPM_NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--dns-result-order=ipv4first"

# ==========================================================
# TERMINAL
# ==========================================================

TTY=0

if [ -t 1 ] && [ "${TERM:-dumb}" != "dumb" ]; then
  TTY=1
fi

if [ "$TTY" -eq 1 ] && [ -z "${NO_COLOR:-}" ]; then
  RESET=$'\033[0m'
  BOLD=$'\033[1m'
  DIM=$'\033[2m'
  GREEN=$'\033[38;5;82m'
  CYAN=$'\033[38;5;51m'
  WHITE=$'\033[38;5;255m'
  RED=$'\033[38;5;196m'
  YELLOW=$'\033[38;5;220m'
else
  RESET=""
  BOLD=""
  DIM=""
  GREEN=""
  CYAN=""
  WHITE=""
  RED=""
  YELLOW=""
fi

cleanup() {
  if [ "$TTY" -eq 1 ]; then
    printf '\033[?25h' 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

# ==========================================================
# UI
# ==========================================================

header() {
  printf '\n'
  printf "${CYAN}${BOLD}"
  printf '╭──────────────────────────────────────────╮\n'
  printf '│              TOOLNET MEMORY              │\n'
  printf '╰──────────────────────────────────────────╯\n'
  printf "${RESET}\n"
}

bar() {
  percent="$1"
  width=28

  filled=$((percent * width / 100))
  empty=$((width - filled))

  left=""
  right=""

  if [ "$filled" -gt 0 ]; then
    left="$(printf '%*s' "$filled" '' | tr ' ' '=')"
  fi

  if [ "$empty" -gt 0 ]; then
    right="$(printf '%*s' "$empty" '' | tr ' ' '-')"
  fi

  printf '['
  printf "${GREEN}%s${RESET}" "$left"
  printf "${DIM}%s${RESET}" "$right"
  printf '] %3d%%' "$percent"
}

format_duration() {
  total="$1"
  mins=$((total / 60))
  secs=$((total % 60))
  printf '%02d:%02d' "$mins" "$secs"
}

draw_stage() {
  icon="$1"
  title="$2"
  percent="$3"
  elapsed="$4"

  # Single-line redraw is much more reliable in Termius/mobile terminals.
  printf '\r\033[2K'
  printf "${CYAN}%s${RESET} ${WHITE}%-29s${RESET} " "$icon" "$title"
  bar "$percent"
  printf " ${DIM}%s${RESET}" "$(format_duration "$elapsed")"
}

finish_stage() {
  title="$1"
  elapsed="$2"

  printf '\r\033[2K'
  printf "${GREEN}✓${RESET} ${WHITE}%-29s${RESET} " "$title"
  bar 100
  printf " ${DIM}%s${RESET}\n\n" "$(format_duration "$elapsed")"
}

plain_stage() {
  title="$1"
  shift

  start="$(date +%s)"
  printf '%s... ' "$title"

  : >"$LOG"

  if "$@" >>"$LOG" 2>&1; then
    elapsed=$(( $(date +%s) - start ))
    printf 'OK (%s)\n' "$(format_duration "$elapsed")"
    return 0
  fi

  elapsed=$(( $(date +%s) - start ))
  printf 'FAILED (%s)\n' "$(format_duration "$elapsed")"
  return 1
}

run_stage() {
  title="$1"
  shift

  if [ "$TTY" -ne 1 ]; then
    plain_stage "$title" "$@"
    return $?
  fi

  : >"$LOG"

  "$@" >>"$LOG" 2>&1 &
  pid=$!

  start="$(date +%s)"
  percent=1
  frame=0

  while kill -0 "$pid" 2>/dev/null; do
    case "$frame" in
      0) icon="○" ;;
      1) icon="◔" ;;
      2) icon="◑" ;;
      *) icon="●" ;;
    esac

    elapsed=$(( $(date +%s) - start ))
    draw_stage "$icon" "$title" "$percent" "$elapsed"

    frame=$(( (frame + 1) % 4 ))

    # Progress is intentionally capped below 100 until the real command exits.
    # The elapsed timer continues changing, so slow installs never look frozen.
    if [ "$percent" -lt 70 ]; then
      percent=$((percent + 2))
    elif [ "$percent" -lt 90 ]; then
      percent=$((percent + 1))
    elif [ "$percent" -lt 95 ]; then
      percent=$((percent + 1))
    fi

    sleep 0.15
  done

  wait "$pid"
  rc=$?
  elapsed=$(( $(date +%s) - start ))

  if [ "$rc" -ne 0 ]; then
    printf '\r\033[2K'
    printf "${RED}✗${RESET} ${WHITE}%s${RESET} ${DIM}(%s)${RESET}\n" \
      "$title" "$(format_duration "$elapsed")"
    return "$rc"
  fi

  finish_stage "$title" "$elapsed"
  return 0
}

fail() {
  message="$1"

  printf "\n${RED}✗ %s${RESET}\n" "$message"

  if [ -s "$LOG" ]; then
    printf "\n${DIM}Last installer output:${RESET}\n"
    tail -20 "$LOG"
  fi

  printf "\n${DIM}Log: %s${RESET}\n" "$LOG"
  exit 1
}

with_timeout() {
  seconds="$1"
  shift

  if command -v timeout >/dev/null 2>&1; then
    timeout "${seconds}s" "$@"
  else
    "$@"
  fi
}

# ==========================================================
# INSTALL TASKS
# ==========================================================

prepare_installation() {
  command -v node >/dev/null 2>&1 || {
    echo "Node.js 22+ is required."
    return 1
  }

  command -v npm >/dev/null 2>&1 || {
    echo "npm is required."
    return 1
  }

  major="$(node -p 'Number(process.versions.node.split(".")[0])')" || return 1

  if [ "$major" -lt "$MIN_NODE_MAJOR" ]; then
    echo "Node.js 22+ required. Current: $(node -v)"
    return 1
  fi

  return 0
}

check_registry() {
  # First use HTTPS directly. curl handles dual-stack networking better
  # than some Node/npm configurations on VPS providers.
  if command -v curl >/dev/null 2>&1; then
    if with_timeout 20 curl -fsS       --connect-timeout 10       --max-time 20       -o /dev/null       "$REGISTRY"; then
      return 0
    fi

    # Retry explicitly over IPv4 when IPv6 routing is unreliable.
    if with_timeout 20 curl -4 -fsS       --connect-timeout 10       --max-time 20       -o /dev/null       "$REGISTRY"; then
      return 0
    fi
  fi

  # Final npm-native probe, with retries and IPv4-first DNS ordering.
  attempt=1
  while [ "$attempt" -le 3 ]; do
    if with_timeout 30       env NODE_OPTIONS="$NPM_NODE_OPTIONS"       npm ping --registry="$REGISTRY"; then
      return 0
    fi

    attempt=$((attempt + 1))
    sleep 1
  done

  return 1
}

LATEST_VERSION=""

resolve_latest() {
  LATEST_VERSION="$(
    with_timeout 45 \
      env NODE_OPTIONS="$NPM_NODE_OPTIONS" \
      npm view "${PACKAGE}@latest" version --silent --registry="$REGISTRY" \
      2>>"$LOG"
  )" || true

  if [ -z "$LATEST_VERSION" ]; then
    echo "Version lookup timed out; continuing with @latest."
  fi

  return 0
}

determine_install_prefix() {
  if [ "$(id -u)" -eq 0 ]; then
    PREFIX="$(npm prefix -g 2>/dev/null || printf '/usr/local')"
  else
    PREFIX="${TOOLNET_PREFIX:-$HOME/.local}"
  fi

  BIN_DIR="$PREFIX/bin"
}

install_toolnet() {
  mkdir -p "$PREFIX" || return 1

  with_timeout "$INSTALL_TIMEOUT_SECONDS" \
    env NODE_OPTIONS="$NPM_NODE_OPTIONS" \
    npm install \
      -g \
      --prefix "$PREFIX" \
      "${PACKAGE}@latest" \
      --registry="$REGISTRY" \
      --no-fund \
      --no-audit \
      --prefer-online \
      --fetch-retries=4 \
      --fetch-retry-mintimeout=1000 \
      --fetch-retry-maxtimeout=20000 \
      --fetch-timeout=120000 \
      --loglevel=error

  rc=$?

  if [ "$rc" -eq 124 ]; then
    echo "npm install timed out after ${INSTALL_TIMEOUT_SECONDS} seconds."
  fi

  return "$rc"
}

configure_path() {
  export PATH="$BIN_DIR:$PATH"

  if [ "$(id -u)" -ne 0 ]; then
    PROFILE="$HOME/.profile"
    touch "$PROFILE"

    if [ "$BIN_DIR" = "$HOME/.local/bin" ]; then
      if ! grep -Fq '$HOME/.local/bin' "$PROFILE" 2>/dev/null; then
        printf '\nexport PATH="$HOME/.local/bin:$PATH"\n' >>"$PROFILE"
      fi
    fi
  fi
}

find_toolnet() {
  if [ -x "$BIN_DIR/toolnet-memory" ]; then
    TOOLNET_BIN="$BIN_DIR/toolnet-memory"
    return 0
  fi

  TOOLNET_BIN="$(command -v toolnet-memory 2>/dev/null || true)"
  [ -n "$TOOLNET_BIN" ] && [ -x "$TOOLNET_BIN" ]
}

verify_toolnet() {
  find_toolnet || return 1
  "$TOOLNET_BIN" --version
}

# ==========================================================
# RUN
# ==========================================================

: >"$LOG"

if [ "$TTY" -eq 1 ]; then
  printf '\033[?25l'
fi

header

run_stage \
  "Preparing installation" \
  prepare_installation ||
  fail "Environment check failed"

run_stage \
  "Checking npm registry" \
  check_registry ||
  fail "npm registry is unreachable"

run_stage \
  "Resolving latest version" \
  resolve_latest ||
  fail "Unable to resolve package"

determine_install_prefix

run_stage \
  "Installing ToolNet Memory" \
  install_toolnet ||
  fail "ToolNet Memory installation failed"

configure_path

run_stage \
  "Verifying installation" \
  verify_toolnet ||
  fail "ToolNet Memory verification failed"

# ==========================================================
# SETUP
# ==========================================================

find_toolnet || fail "toolnet-memory executable not found"

if [ "$TTY" -eq 1 ]; then
  printf '\033[?25h'
fi

printf "${WHITE}Configuring ToolNet Memory${RESET}\n\n"

if [ -r /dev/tty ] && [ -w /dev/tty ] && [ -t 0 ]; then
  "$TOOLNET_BIN" setup </dev/tty >/dev/tty 2>/dev/tty || true
else
  "$TOOLNET_BIN" setup </dev/null || true
fi

# ==========================================================
# DONE
# ==========================================================

VERSION="$("$TOOLNET_BIN" --version 2>/dev/null || printf 'unknown')"

printf '\n'
printf "${GREEN}✓${RESET} ${BOLD}${WHITE}TOOLNET MEMORY installed successfully${RESET}\n"
printf "${CYAN}${BOLD}%s${RESET}\n" "$VERSION"

printf "\n${WHITE}Executable:${RESET}\n"
printf '  %s\n' "$TOOLNET_BIN"

printf "\n${WHITE}Config:${RESET}\n"
printf '  %s\n' "$HOME/.config/toolnet-memory/.env"

if [ "$(id -u)" -ne 0 ]; then
  printf "\n${DIM}If needed, reload your shell:${RESET}\n"
  printf '  source ~/.profile\n'
fi

printf "\n${WHITE}Next:${RESET}\n"
printf '  cd /path/to/project\n'
printf '  toolnet-memory doctor\n'
printf '  toolnet-memory index\n'
printf '\n'
