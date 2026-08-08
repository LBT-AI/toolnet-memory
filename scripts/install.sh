#!/usr/bin/env bash

set -u
set -o pipefail

PACKAGE="toolnet-memory"
MIN_NODE_MAJOR=22
LOG="${TMPDIR:-/tmp}/toolnet-memory-install-$$.log"

export TERM="${TERM:-xterm}"

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

draw_stage() {
  icon="$1"
  title="$2"
  percent="$3"

  printf '\r\033[2K'
  printf "${CYAN}%s${RESET} ${WHITE}%s${RESET}\n" "$icon" "$title"

  printf '\033[2K'
  bar "$percent"

  # quay lên 1 dòng để lần sau redraw cả 2 dòng
  printf '\033[1A'
}

finish_stage() {
  title="$1"

  printf '\r\033[2K'
  printf "${GREEN}✓${RESET} ${WHITE}%s${RESET}\n" "$title"

  printf '\033[2K'
  bar 100
  printf '\n\n'
}

plain_stage() {
  title="$1"
  shift

  printf '%s... ' "$title"

  : >"$LOG"

  if "$@" >>"$LOG" 2>&1; then
    printf 'OK\n'
    return 0
  fi

  printf 'FAILED\n'
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

  percent=1
  frame=0

  while kill -0 "$pid" 2>/dev/null; do
    case "$frame" in
      0) icon="○" ;;
      1) icon="◔" ;;
      2) icon="◑" ;;
      *) icon="●" ;;
    esac

    draw_stage "$icon" "$title" "$percent"

    frame=$(( (frame + 1) % 4 ))

    if [ "$percent" -lt 70 ]; then
      percent=$((percent + 2))
    elif [ "$percent" -lt 90 ]; then
      percent=$((percent + 1))
    elif [ "$percent" -lt 97 ]; then
      # đoạn cuối chậm hơn để không giả vờ hoàn tất
      percent=$((percent + 1))
    fi

    sleep 0.10
  done

  wait "$pid"
  rc=$?

  if [ "$rc" -ne 0 ]; then
    printf '\r\033[2K'
    printf "${RED}✗${RESET} %s\n" "$title"
    printf '\033[2K\n'
    return "$rc"
  fi

  while [ "$percent" -lt 100 ]; do
    percent=$((percent + 1))

    case "$frame" in
      0) icon="○" ;;
      1) icon="◔" ;;
      2) icon="◑" ;;
      *) icon="●" ;;
    esac

    draw_stage "$icon" "$title" "$percent"
    frame=$(( (frame + 1) % 4 ))

    sleep 0.025
  done

  finish_stage "$title"
  return 0
}

fail() {
  message="$1"

  printf '\n${RED}✗ %s${RESET}\n' "$message"

  if [ -s "$LOG" ]; then
    printf '\n${DIM}Last installer output:${RESET}\n'
    tail -20 "$LOG"
  fi

  printf '\n${DIM}Log: %s${RESET}\n' "$LOG"
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

  major="$(node -p 'Number(process.versions.node.split(".")[0])')" ||
    return 1

  if [ "$major" -lt "$MIN_NODE_MAJOR" ]; then
    echo "Node.js 22+ required. Current: $(node -v)"
    return 1
  fi

  return 0
}

LATEST_VERSION=""

resolve_latest() {
  LATEST_VERSION="$(
    with_timeout 10 \
      npm view "${PACKAGE}@latest" version --silent \
      2>>"$LOG"
  )" || true

  # Version lookup chỉ để hiển thị.
  # Nếu registry chậm, installer vẫn tiếp tục bằng @latest.
  if [ -z "$LATEST_VERSION" ]; then
    echo "Version lookup timed out; continuing with @latest."
  fi

  return 0
}

determine_install_prefix() {
  if [ "$(id -u)" -eq 0 ]; then
    PREFIX="$(
      npm prefix -g 2>/dev/null ||
      printf '/usr/local'
    )"
  else
    PREFIX="${TOOLNET_PREFIX:-$HOME/.local}"
  fi

  BIN_DIR="$PREFIX/bin"
}

install_toolnet() {
  mkdir -p "$PREFIX" || return 1

  with_timeout 240 \
    npm install \
      -g \
      --prefix "$PREFIX" \
      "${PACKAGE}@latest" \
      --no-fund \
      --no-audit \
      --loglevel=error
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

find_toolnet ||
  fail "toolnet-memory executable not found"

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

VERSION="$(
  "$TOOLNET_BIN" --version 2>/dev/null ||
  printf 'unknown'
)"

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
