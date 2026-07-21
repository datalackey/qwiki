#!/usr/bin/env node
/**
 * Ensure the wiki is reachable before running Playwright tests.
 * Starts Docker containers if they are stopped (non-destructive: DB volume kept).
 * Does NOT run fresh-wiki-install.sh — if the wiki needs a fresh install, run:
 *   npm run test:e2e
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const INFRA    = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSE  = ["compose", "-f", `${INFRA}/docker-compose.yml`];

function localBaseUrl() {
    try {
        const cfg = JSON.parse(readFileSync(resolve(INFRA, "..", "local.config.json"), "utf8"));
        return cfg.wikiBaseUrl ?? "http://localhost:8080";
    } catch {
        return "http://localhost:8080";
    }
}

const WIKI_URL = localBaseUrl() + "/wiki/Main_Page";
const POLL_MS  = 2_000;
const TIMEOUT_MS = 30_000;

async function reachable() {
    try {
        const res = await fetch(WIKI_URL, { signal: AbortSignal.timeout(3_000) });
        return res.ok;
    } catch {
        return false;
    }
}

function dockerUp() {
    const r = spawnSync("docker", [...COMPOSE, "up", "-d"], { stdio: "inherit" });
    if (r.status !== 0) {
        console.error("docker compose up -d failed.");
        process.exit(1);
    }
}

async function waitForWiki() {
    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, POLL_MS));
        if (await reachable()) return true;
        process.stdout.write(".");
    }
    return false;
}

if (await reachable()) {
    console.log("Wiki already up — skipping docker compose.");
} else {
    console.log("Wiki not reachable — running docker compose up -d …");
    dockerUp();
    process.stdout.write("Waiting for wiki");
    if (!await waitForWiki()) {
        console.error(`\nWiki did not respond within ${TIMEOUT_MS / 1000}s.`);
        console.error("For a fresh install run:  npm run test:e2e");
        process.exit(1);
    }
    console.log("\nWiki is up.");
}
