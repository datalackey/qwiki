#!/usr/bin/env bash
# Pull the latest qwiki content/code and redeploy to an already-running wiki.
# Safe to re-run any time -- never touches the MediaWiki DB (unlike
# launch-in-cloud.sh, which is for first-time bootstrap only).
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

WIKI_URL="http://localhost:8080"

echo "==> Checking wiki is up..."
if ! curl -sf --max-time 5 "$WIKI_URL" > /dev/null; then
  echo "ERROR: Wiki not reachable at $WIKI_URL"
  echo "       Start it with: bash infra/scripts/launch-docker.sh up -d"
  exit 1
fi
echo "    OK"

echo "==> Pulling latest qwiki..."
git -C "$REPO_ROOT" pull

echo "==> Installing npm dependencies..."
(cd "$REPO_ROOT" && npm ci)

echo "==> Building website..."
(cd "$REPO_ROOT" && npm run build:website)

echo "==> Reloading Caddy config..."
docker exec qwiki-caddy-1 caddy reload \
  --config /etc/caddy/Caddyfile --adapter caddyfile 2>/dev/null \
  || echo "    (Caddy not running -- skipped)"

echo "==> Redeploying content..."
# See launch-in-cloud.sh -- it persists the real admin password here
# since WIKI_ADMIN_PASSWORD (the env var cloud-init used) doesn't exist
# in this shell. Without this, import-wiki-content.sh silently falls back to
# its own wrong default and fails to authenticate.
if [ -z "$MW_PASSWORD" ] && [ -f "$HOME/.wiki_admin_password" ]; then
  export MW_PASSWORD="$(cat "$HOME/.wiki_admin_password")"
fi
bash "$SCRIPT_DIR/import-wiki-content.sh"

echo ""
echo "Reload complete."
