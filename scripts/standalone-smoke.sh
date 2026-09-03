#!/usr/bin/env bash
TARGET="$(
  node -e '
    const p = process.platform === "darwin"
      ? "macos"
      : process.platform === "win32"
        ? "win"
        : "linux";
    process.stdout.write(`node22-${p}-${process.arch}`);
  '
)"
PLATFORM="$(node -p 'process.platform')"
ARCH="$(node -p 'process.arch')"
if [ "$PLATFORM" = "darwin" ]; then
  LABEL_PLATFORM="macos"
elif [ "$PLATFORM" = "win32" ]; then
  LABEL_PLATFORM="windows"
else
  LABEL_PLATFORM="linux"
fi
if [ "$PLATFORM" = "win32" ]; then
  EXT=".exe"
else
  EXT=""
fi
BINARY="$PWD/dist/standalone/toolnet-memory-${LABEL_PLATFORM}-${ARCH}${EXT}"
echo "=== Standalone build ==="
npm run standalone:build -- \
  --target "$TARGET" \
  --output "$BINARY"
R1=$?
echo
echo "=== Standalone direct version ==="
if [ "$R1" -eq 0 ]; then
  "$BINARY" --version
  R2=$?
else
  R2=99
fi
echo
echo "=== Standalone help ==="
if [ "$R2" -eq 0 ]; then
  "$BINARY" help \
    >/tmp/toolnet-standalone-help.log \
    2>&1
  R3=$?
else
  R3=99
fi
if [ "$R3" -eq 0 ]; then
  tail -20 /tmp/toolnet-standalone-help.log
fi
echo
echo "=== No-Node target-host proof ==="
R4=0
if [ "$PLATFORM" = "linux" ] && command -v docker >/dev/null 2>&1; then
  ABS_BINARY="$(realpath "$BINARY")"
  docker run \
    --rm \
    -v "$ABS_BINARY:/toolnet-memory:ro" \
    debian:bookworm-slim \
    sh -c '
      if command -v node >/dev/null 2>&1; then
        echo "TARGET_NODE_PRESENT=UNEXPECTED"
        exit 91
      fi
      if command -v npm >/dev/null 2>&1; then
        echo "TARGET_NPM_PRESENT=UNEXPECTED"
        exit 92
      fi
      /toolnet-memory --version
    '
  R4=$?
else
  echo "NO_NODE_CONTAINER_SMOKE=SKIP_NOT_LINUX_OR_DOCKER_UNAVAILABLE"
fi
echo
echo "=== RESULT ==="
echo "standalone_build=$R1"
echo "standalone_version=$R2"
echo "standalone_help=$R3"
echo "no_node_target=$R4"
if [ "$R1" -eq 0 ] && [ "$R2" -eq 0 ] && [ "$R3" -eq 0 ] && [ "$R4" -eq 0 ]; then
  echo "STANDALONE_SMOKE=PASS"
else
  echo "STANDALONE_SMOKE=FAIL"
fi
test \
  "$R1" -eq 0 \
  -a "$R2" -eq 0 \
  -a "$R3" -eq 0 \
  -a "$R4" -eq 0