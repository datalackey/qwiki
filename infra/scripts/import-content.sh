#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

WIKI_URL="http://localhost:8080"
CONTENT_DIR="${1:-$REPO_ROOT/example/wiki-content-files}"

echo "==> Checking wiki is up..."
if ! curl -sf --max-time 5 "$WIKI_URL" > /dev/null; then
  echo "ERROR: Wiki not reachable at $WIKI_URL"
  echo "       Start it with: docker compose -f infra/docker-compose.yml up -d"
  exit 1
fi
echo "    OK"

export MW_PASSWORD="${MW_PASSWORD:-AdminPass123}"

echo "==> Deploying content..."
(cd "$REPO_ROOT" && npx tsx src/cli.ts "$CONTENT_DIR" --wiki "$WIKI_URL" --user Admin)

echo "==> Bouncing containers to flush APCu/ResourceLoader cache..."
bash "$SCRIPT_DIR/bounce.sh"

echo "==> Waiting for wiki..."
until curl -sf --max-time 2 "$WIKI_URL" > /dev/null; do sleep 1; done

echo ""
echo "Done — $WIKI_URL"
