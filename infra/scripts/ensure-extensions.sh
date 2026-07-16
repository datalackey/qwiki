#!/usr/bin/env bash
set -euo pipefail

INFRA_DIR="${INFRA_DIR_OVERRIDE:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_FILE="$INFRA_DIR/docker-compose.yml"
EXTENSIONS_DIR="$INFRA_DIR/extensions"

EXTENSIONS=(
  "PageForms:https://github.com/wikimedia/mediawiki-extensions-PageForms"
  "Cargo:https://github.com/wikimedia/mediawiki-extensions-Cargo"
)

MW_IMAGE=$(grep -E '^\s+image:\s+mediawiki' "$COMPOSE_FILE" | head -1 | sed 's/.*image:[[:space:]]*//')

if [[ "$MW_IMAGE" != *:* ]]; then
  echo "ERROR: MediaWiki image is not version-pinned in docker-compose.yml." >&2
  echo "       Change 'image: mediawiki' to e.g. 'image: mediawiki:1.46'" >&2
  exit 1
fi

MW_VERSION="${MW_IMAGE##*:}"
MAJOR_MINOR=$(echo "$MW_VERSION" | grep -oE '^[0-9]+\.[0-9]+')
BRANCH="REL${MAJOR_MINOR//./_}"

echo "==> MediaWiki $MW_VERSION → extensions branch $BRANCH"

mkdir -p "$EXTENSIONS_DIR"

for entry in "${EXTENSIONS[@]}"; do
  NAME="${entry%%:*}"
  URL="${entry#*:}"
  DIR="$EXTENSIONS_DIR/$NAME"

  if [[ -d "$DIR" ]]; then
    CURRENT_BRANCH=$(git -C "$DIR" rev-parse --abbrev-ref HEAD)
    if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
      echo "ERROR: $NAME is on branch '$CURRENT_BRANCH' but docker-compose.yml requires '$BRANCH'." >&2
      echo "       Fix: rm -rf \"$DIR\" && bash \"$(dirname "$0")/ensure-extensions.sh\"" >&2
      exit 1
    fi
    echo "    $NAME already on $BRANCH — skipping clone"
  else
    echo "==> Checking remote for $NAME @ $BRANCH..."
    if ! git ls-remote --heads "$URL" "$BRANCH" | grep -q "$BRANCH"; then
      echo "ERROR: Branch '$BRANCH' not found for $NAME." >&2
      echo "       The extension may not yet support MediaWiki $MW_VERSION." >&2
      echo "       Check: https://www.mediawiki.org/wiki/Extension:$NAME" >&2
      exit 1
    fi
    echo "==> Cloning $NAME @ $BRANCH..."
    git clone --branch "$BRANCH" --depth 1 "$URL" "$DIR"
  fi
done

echo "==> Applying local patches..."
node "$(dirname "$0")/apply-patches.js" "$EXTENSIONS_DIR" "$INFRA_DIR/patches"

echo "==> Extensions ready."
