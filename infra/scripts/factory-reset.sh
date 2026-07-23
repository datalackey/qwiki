#!/usr/bin/env bash
# Full reset: wipes the wiki DB *and* uploaded image files, reinstalls
# MediaWiki from scratch, rebuilds the website, and reimports content.
# The one-command "clean slate" -- see lightweight-reload.sh for the
# non-destructive day-2-update alternative.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
INFRA_DIR="$REPO_ROOT/infra"
ADMIN_PASS="${1:-AdminPass123}"
CONTENT_DIR="${2:-}"

export MW_PASSWORD="$ADMIN_PASS"

echo "==> Clearing uploaded image files..."
sudo rm -rf "$INFRA_DIR/images"/*

echo "==> Building website..."
(cd "$REPO_ROOT" && npm run build:website)

bash "$SCRIPT_DIR/fresh-wiki-install.sh" "$ADMIN_PASS"

if [ -n "$CONTENT_DIR" ]; then
  bash "$SCRIPT_DIR/import-wiki-content.sh" "$CONTENT_DIR"
else
  bash "$SCRIPT_DIR/import-wiki-content.sh"
fi
