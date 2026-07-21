#!/usr/bin/env bash
# First-time droplet bootstrap: installs MediaWiki fresh and deploys content.
# Run once, from within a freshly cloned checkout (e.g. by cloud-init).
# For routine updates to an already-running wiki, use reload.sh instead --
# this script runs fresh-install.sh, which wipes the MediaWiki DB.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
source "$SCRIPT_DIR/do-metadata.sh"

echo "==> Installing npm dependencies..."
(cd "$REPO_ROOT" && npm ci)

# NOTE: this is the droplet's ephemeral public IP, not the Reserved IP --
# see do-metadata.sh. Fine until the Caddy/DNS cutover; revisit then.
PUBLIC_IP=$(curl -s "$DO_METADATA_PUBLIC_IPV4")
export WIKI_SERVER_URL="http://${PUBLIC_IP}:8080"

echo "==> Fresh MediaWiki install (server: $WIKI_SERVER_URL)..."
bash "$SCRIPT_DIR/fresh-install.sh" "${WIKI_ADMIN_PASSWORD:-AdminPass123}"

echo "==> Deploying content..."
# import-content.sh reads MW_PASSWORD (a different name than the
# WIKI_ADMIN_PASSWORD used above) -- bridge them so both scripts log in
# with the same real password instead of import-content.sh silently
# falling back to its own default and failing to authenticate.
export MW_PASSWORD="${WIKI_ADMIN_PASSWORD:-AdminPass123}"

# Persist it for reload.sh -- WIKI_ADMIN_PASSWORD only exists as a
# one-time env var during this cloud-init run; reload.sh runs later, in
# a fresh shell, with no way to know the real password otherwise.
echo "$MW_PASSWORD" > "$HOME/.wiki_admin_password"
chmod 600 "$HOME/.wiki_admin_password"

bash "$SCRIPT_DIR/import-content.sh"

echo ""
echo "Done — $WIKI_SERVER_URL"
