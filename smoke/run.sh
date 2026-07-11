#!/usr/bin/env bash
set -e

WIKI_URL="http://localhost:8080"
ADMIN_PASS="${ADMIN_PASS:-AdminPass123}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Checking wiki is up..."
if ! curl -sf --max-time 5 "$WIKI_URL" > /dev/null; then
  echo "ERROR: Wiki not reachable at $WIKI_URL — run scripts/fresh-install.sh first"
  exit 1
fi
echo "    OK"

MW_COOKIES=$(mktemp)
cleanup() { rm -f "$MW_COOKIES"; }
trap cleanup EXIT

echo "==> Logging in..."
LOGIN_TOKEN=$(curl -s -c "$MW_COOKIES" -b "$MW_COOKIES" \
  "$WIKI_URL/api.php?action=query&meta=tokens&type=login&format=json" \
  | jq -r '.query.tokens.logintoken')

LOGIN_RESULT=$(curl -s -c "$MW_COOKIES" -b "$MW_COOKIES" -X POST "$WIKI_URL/api.php" \
  --data-urlencode "username=Admin" \
  --data-urlencode "password=${ADMIN_PASS}" \
  --data-urlencode "logintoken=${LOGIN_TOKEN}" \
  -d "action=clientlogin&loginreturnurl=http%3A%2F%2Flocalhost%3A8080%2F&format=json" \
  | jq -r '.clientlogin.status')
echo "    Login: ${LOGIN_RESULT}"
[ "$LOGIN_RESULT" = "PASS" ] || { echo "ERROR: Login failed"; exit 1; }

echo "==> Fetching CSRF token..."
CSRF=$(curl -s -c "$MW_COOKIES" -b "$MW_COOKIES" \
  "$WIKI_URL/api.php?action=query&meta=tokens&format=json" \
  | jq -r '.query.tokens.csrftoken')

api_edit() {
  local title="$1" text="$2"
  curl -s -c "$MW_COOKIES" -b "$MW_COOKIES" -X POST "$WIKI_URL/api.php" \
    --data-urlencode "title=${title}" \
    --data-urlencode "text=${text}" \
    --data-urlencode "token=${CSRF}" \
    -d "action=edit&format=json" \
    | jq -r '"    " + .edit.title + ": " + (.edit.result // .error.code)'
}

echo "==> Writing MediaWiki:Common.css..."
curl -s -c "$MW_COOKIES" -b "$MW_COOKIES" -X POST "$WIKI_URL/api.php" \
  --data-urlencode "text@${SCRIPT_DIR}/common.css" \
  --data-urlencode "token=${CSRF}" \
  -d "action=edit&title=MediaWiki%3ACommon.css&contentmodel=css&format=json" \
  | jq -r '"    Common.css: " + (.edit.result // .error.code)'

echo "==> Creating categories..."
api_edit "Category:Domains" "Top-level navigation root."
api_edit "Category:Animals" "Sample subcategory.

[[Category:Domains]]"
api_edit "Category:Mammals" "Sample leaf category.

[[Category:Animals]]"

echo "==> Bouncing containers..."
bash "$(dirname "$0")/../scripts/bounce.sh"

echo "==> Waiting for wiki..."
until curl -sf --max-time 2 "$WIKI_URL" > /dev/null; do sleep 1; done

echo ""
echo "Done — $WIKI_URL"
echo "Hard-refresh the browser and check the CategoryTree sidebar font."
