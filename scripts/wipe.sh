
# 1. Confirm containers are down (already done per your output above)
docker compose down

# 2. Verify the exact volume name before deleting anything
docker volume ls | grep doikayt

# 3. Remove the database volume
docker volume rm doikayt_mediawiki-db

# 4. Clear the images bind mount too (separate from the DB, not wiped by step 3)
sudo rm -rf ./images/*

# 5. Relaunch fresh
docker compose up -d

# 6. Confirm both containers are healthy
docker compose ps
