#!/usr/bin/env bash
set -e

INFRA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(dirname "$INFRA_DIR")"
COMPOSE="docker compose -f $INFRA_DIR/docker-compose.yml"

ADMIN_PASS="${1:-AdminPass123}"

echo "==> Ensuring extensions are cloned..."
bash "$INFRA_DIR/scripts/ensure-extensions.sh"
# Matches the "name: qwiki" project name pinned in docker-compose.yml
VOLUME="qwiki_mediawiki-db"

echo "==> Tearing down containers and wiping DB volume: $VOLUME"
$COMPOSE down
docker volume rm "$VOLUME" 2>/dev/null || true

echo "==> Disabling LocalSettings.php bind mount"
sed -i 's|      - ./LocalSettings.php:/var/www/html/LocalSettings.php|      # - ./LocalSettings.php:/var/www/html/LocalSettings.php|' "$INFRA_DIR/docker-compose.yml"

echo "==> Starting containers"
$COMPOSE up -d

echo "==> Waiting for database..."
until $COMPOSE exec -T mediawiki bash -c "echo > /dev/tcp/database/3306" 2>/dev/null; do
  echo "   ..."
  sleep 3
done

echo "==> Running MediaWiki installer"
$COMPOSE exec -T mediawiki php maintenance/run.php install \
  --dbname mediawiki --dbuser mediawiki --dbpass replace-me \
  --dbserver database --server http://localhost:8080 \
  --scriptpath "" --pass "$ADMIN_PASS" doikayt Admin

echo "==> Restoring docker-compose.yml and LocalSettings.php from git"
git -C "$REPO_ROOT" checkout infra/docker-compose.yml
rm -rf "$INFRA_DIR/LocalSettings.php"   # docker may have created a dir here if the file was missing
git -C "$REPO_ROOT" checkout infra/LocalSettings.php
$COMPOSE up -d

echo "==> Running schema update for extensions (AbuseFilter etc.)..."
$COMPOSE exec -T mediawiki php maintenance/run.php update --quick

echo ""
echo "Fresh wiki ready at http://localhost:8080"
echo "Log in as Admin / $ADMIN_PASS"
