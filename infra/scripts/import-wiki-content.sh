#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

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

LOGO_SRC="$CONTENT_DIR/files/logo.png"
if [ -f "$LOGO_SRC" ]; then
  echo "==> Copying logo.png into wiki container..."
  # -L: logo.png may be a symlink (e.g. into docs/assets/) -- dereference it
  # so the container gets the actual file, not an unresolvable symlink.
  bash "$SCRIPT_DIR/launch-docker.sh" cp -L "$LOGO_SRC" mediawiki:/var/www/html/images/logo.png
fi

echo "==> Deploying content..."
(cd "$REPO_ROOT" && npx tsx code/src/cli.ts "$CONTENT_DIR" --wiki "$WIKI_URL" --user Admin)

echo "==> Running pending jobs (category counters, search index, etc.)..."
bash "$SCRIPT_DIR/launch-docker.sh" exec -T mediawiki \
  php maintenance/runJobs.php --quiet

echo "==> Initializing Cargo tables..."
bash "$SCRIPT_DIR/launch-docker.sh" exec -T mediawiki \
  php extensions/Cargo/maintenance/cargoRecreateData.php --table tool --quiet

echo "==> Bouncing containers to flush APCu/ResourceLoader cache..."
bash "$SCRIPT_DIR/bounce.sh"

echo "==> Waiting for wiki..."
until curl -sf --max-time 2 "$WIKI_URL" > /dev/null; do sleep 1; done

echo ""
echo "Done — $WIKI_URL"
