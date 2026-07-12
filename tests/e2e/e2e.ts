/**
 * End-to-end test: fresh wiki install → content import → sidebar verification.
 *
 * Exercises the full bootstrap cycle using the infra/ scripts, then checks
 * that the rendered wiki sidebar contains the links defined in
 * example/wiki-content-files/system/sidebar.md.
 *
 * Requires docker on the host. Destructive: wipes the local wiki DB volume.
 *
 * Run with: npm run test:e2e
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WIKI_URL = 'http://localhost:8080';
const CONTENT_DIR = resolve(repoRoot, 'example/wiki-content-files');

// Page titles linked from example/wiki-content-files/system/sidebar.md, in URL form.
// The rendered sidebar HTML must contain a link to each.
const EXPECTED_SIDEBAR_LINKS = [
  'Evaluation_Criteria',
  'Habitats',
  'Care_and_Husbandry',
  'Why_Animals',
];

function run(label: string, cmd: string, args: string[]): void {
  console.log(`\n=== ${label} ===`);
  const { status, error } = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'inherit' });
  if (error || status !== 0) {
    console.error(`FAIL: ${label} — ${error ? error.message : `exit status ${status}`}`);
    process.exit(1);
  }
}

run('fresh install', 'bash', ['infra/scripts/fresh-install.sh']);
run('import content', 'bash', ['infra/scripts/import-content.sh', CONTENT_DIR]);

console.log('\n=== verify sidebar ===');
const html = await (await fetch(WIKI_URL)).text();
const missing = EXPECTED_SIDEBAR_LINKS.filter((link) => !html.includes(link));
if (missing.length > 0) {
  console.error(`FAIL: sidebar is missing expected links: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`PASS: sidebar contains: ${EXPECTED_SIDEBAR_LINKS.join(', ')}`);
