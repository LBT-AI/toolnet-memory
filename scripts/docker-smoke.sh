#!/usr/bin/env bash
IMAGE="${TOOLNET_DOCKER_TEST_IMAGE:-toolnet-memory:phase26-test}"
NAME="toolnet-memory-phase26-$$"
RC=0
CID=""
cleanup() {
  if [ -n "$CID" ]; then
    docker rm \
      -f \
      "$CID" \
      >/dev/null \
      2>&1 \
      || true
  fi
}
trap \
  cleanup \
  EXIT INT TERM
echo "=== Docker build ==="
docker build \
  -t "$IMAGE" \
  .
BUILD_RC=$?
if [ "$BUILD_RC" -ne 0 ]; then
  echo "DOCKER_BUILD=FAIL"
  RC=1
fi
if [ "$RC" -eq 0 ]; then
  echo
  echo "=== Runtime identity ==="
  USER_ID="$(
    docker run \
      --rm \
      --entrypoint id \
      "$IMAGE" \
      -u
  )"
  USER_RC=$?
  echo "CONTAINER_UID=$USER_ID"
  if [ "$USER_RC" -ne 0 ] || \
     [ "$USER_ID" = "0" ]; then
    echo "NON_ROOT_RUNTIME=FAIL"
    RC=1
  else
    echo "NON_ROOT_RUNTIME=PASS"
  fi
fi
if [ "$RC" -eq 0 ]; then
  echo
  echo "=== CLI version ==="
  docker run \
    --rm \
    "$IMAGE" \
    --version
  VERSION_RC=$?
  if [ "$VERSION_RC" -ne 0 ]; then
    echo "CLI_VERSION=FAIL"
    RC=1
  else
    echo "CLI_VERSION=PASS"
  fi
fi
if [ "$RC" -eq 0 ]; then
  echo
  echo "=== Daemon health ==="
  CID="$(
    docker run \
      -d \
      --name "$NAME" \
      "$IMAGE"
  )"
  START_RC=$?
  if [ "$START_RC" -ne 0 ] || \
     [ -z "$CID" ]; then
    echo "DAEMON_START=FAIL"
    RC=1
  else
    echo "DAEMON_START=PASS"
  fi
fi
if [ "$RC" -eq 0 ]; then
  HEALTH="starting"
  ATTEMPT=0
  while [ "$ATTEMPT" -lt 30 ]; do
    HEALTH="$(
      docker inspect \
        --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
        "$CID" \
        2>/dev/null
    )"
    echo "HEALTH[$ATTEMPT]=$HEALTH"
    if [ "$HEALTH" = "healthy" ]; then
      break
    fi
    if [ "$HEALTH" = "unhealthy" ]; then
      break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
  done
  if [ "$HEALTH" = "healthy" ]; then
    echo "DOCKER_HEALTHCHECK=PASS"
  else
    echo "DOCKER_HEALTHCHECK=FAIL"
    RC=1
  fi
fi
echo
echo "=============================="
if [ "$RC" -eq 0 ]; then
  echo "DOCKER_SMOKE=PASS"
else
  echo "DOCKER_SMOKE=FAIL"
fi
echo "=============================="
test \
  "$RC" \
  -eq 0