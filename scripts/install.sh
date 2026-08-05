#!/usr/bin/env bash
set -euo pipefail

REPO="LBT-AI/toolnet-memory"
PREFIX="${TOOLNET_PREFIX:-$HOME/.local}"

echo "Installing ToolNet Memory..."

command -v node >/dev/null || {
  echo "Node.js 22+ is required."
  exit 1
}

command -v npm >/dev/null || {
  echo "npm is required."
  exit 1
}

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"

if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node.js 22+ required. Current: $(node -v)"
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

RELEASE="$(
  curl -fsSL     "https://api.github.com/repos/$REPO/releases/latest"
)"

URL="$(
  printf '%s' "$RELEASE" |
  node -e '
    let s="";
    process.stdin.on("data",d=>s+=d);
    process.stdin.on("end",()=>{
      const r=JSON.parse(s);
      const a=(r.assets||[]).find(
        x=>/^toolnet-memory-.*\.tgz$/.test(x.name)
      );
      if(a) process.stdout.write(a.browser_download_url);
    });
  '
)"

[ -n "$URL" ] || {
  echo "Release package not found."
  exit 1
}

curl -fL "$URL"   -o "$TMP/toolnet-memory.tgz"

mkdir -p "$PREFIX"

npm install   --global   --prefix "$PREFIX"   "$TMP/toolnet-memory.tgz"

mkdir -p "$HOME/.config/toolnet-memory"

ENV_FILE="$HOME/.config/toolnet-memory/.env"
PACKAGE_ENV="$PREFIX/lib/node_modules/toolnet-memory/.env.example"

if [ ! -f "$ENV_FILE" ] && [ -f "$PACKAGE_ENV" ]; then
  cp "$PACKAGE_ENV" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

PROFILE="$HOME/.profile"

if ! grep -q '$HOME/.local/bin' "$PROFILE" 2>/dev/null; then
  printf '\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$PROFILE"
fi

export PATH="$PREFIX/bin:$PATH"

echo
toolnet-memory help

echo
echo "ToolNet Memory installed successfully."
echo
echo "Config:"
echo "  $ENV_FILE"
echo
echo "Usage:"
echo "  cd ~/your-project"
echo "  toolnet-memory index"
