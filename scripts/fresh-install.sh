#!/usr/bin/env bash
set -e

ADMIN_PASS="${1:-AdminPass123}"
VOLUME="$(basename "$(pwd)")_mediawiki-db"

echo "==> Tearing down containers and wiping DB volume: $VOLUME"
docker compose down
docker volume rm "$VOLUME"

echo "==> Disabling LocalSettings.php bind mount"
sed -i 's|      - ./LocalSettings.php:/var/www/html/LocalSettings.php|      # - ./LocalSettings.php:/var/www/html/LocalSettings.php|' docker-compose.yml

echo "==> Starting containers"
docker compose up -d

echo "==> Waiting for database..."
until docker compose exec -T mediawiki bash -c "echo > /dev/tcp/database/3306" 2>/dev/null; do
  echo "   ..."
  sleep 3
done

echo "==> Running MediaWiki installer"
docker compose exec -T mediawiki php maintenance/run.php install \
  --dbname mediawiki --dbuser mediawiki --dbpass replace-me \
  --dbserver database --server http://localhost:8080 \
  --scriptpath "" --pass "$ADMIN_PASS" doikayt Admin

echo "==> Restoring docker-compose.yml and LocalSettings.php from git"
git checkout docker-compose.yml
rm -rf LocalSettings.php   # docker may have created a dir here if the file was missing
git checkout LocalSettings.php
docker compose up -d

echo "==> Running schema update for extensions (AbuseFilter etc.)..."
docker compose exec -T mediawiki php maintenance/run.php update --quick

echo ""
echo "Fresh wiki ready at http://localhost:8080"
echo "Log in as Admin / $ADMIN_PASS"
