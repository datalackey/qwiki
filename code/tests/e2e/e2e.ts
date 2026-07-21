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

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const WIKI_URL = 'http://localhost:8080';
const CONTENT_DIR = resolve(repoRoot, 'example/wiki-content-files');

// Page titles linked from example/wiki-content-files/system/sidebar.md, in URL form.
// The rendered sidebar HTML must contain a link to each.
const EXPECTED_SIDEBAR_LINKS = [
  'Evaluation_Criteria',
];

// Parent category -> subcategories it must contain, per the `categories:`
// frontmatter in example/wiki-content-files/categories/*.md. Read via the
// categorymembers API (the same data CategoryTree renders) rather than
// scraping sidebar HTML, so this isn't sensitive to sidebar caching.
const EXPECTED_SUBCATEGORIES: Record<string, string[]> = {
  'Category:Communications': ['Category:Internal Comms', 'Category:Outbound Comms'],
};

function run(label: string, cmd: string, args: string[]): void {
  console.log(`\n=== ${label} ===`);
  const { status, error } = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'inherit' });
  if (error || status !== 0) {
    console.error(`FAIL: ${label} — ${error ? error.message : `exit status ${status}`}`);
    process.exit(1);
  }
}

run('fresh install', 'bash', ['infra/scripts/fresh-wiki-install.sh']);
run('import content', 'bash', ['infra/scripts/import-wiki-content.sh', CONTENT_DIR]);

console.log('\n=== verify sidebar ===');
const html = await (await fetch(WIKI_URL)).text();
const missing = EXPECTED_SIDEBAR_LINKS.filter((link) => !html.includes(link));
if (missing.length > 0) {
  console.error(`FAIL: sidebar is missing expected links: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`PASS: sidebar contains: ${EXPECTED_SIDEBAR_LINKS.join(', ')}`);

console.log('\n=== verify category tree ===');
for (const [parent, expectedChildren] of Object.entries(EXPECTED_SUBCATEGORIES)) {
  const qs = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: parent,
    cmtype: 'subcat',
    cmlimit: '50',
    format: 'json',
  });
  const res = (await (await fetch(`${WIKI_URL}/api.php?${qs}`)).json()) as {
    query?: { categorymembers?: { title: string }[] };
  };
  const actual = (res.query?.categorymembers ?? []).map((m) => m.title);
  const missingChildren = expectedChildren.filter((c) => !actual.includes(c));
  if (missingChildren.length > 0) {
    console.error(`FAIL: ${parent} is missing subcategories: ${missingChildren.join(', ')}`);
    process.exit(1);
  }
  console.log(`PASS: ${parent} contains subcategories: ${actual.join(', ')}`);

  // categorymembers reads categorylinks live, so it can pass even when the
  // category table's cached cat_subcats counter is stale (e.g. pending
  // CategoryMembershipChangeJob after a bulk import) — that stale counter is
  // what drives the CategoryTree sidebar's expand arrow, so check it too.
  const infoQs = new URLSearchParams({
    action: 'query',
    prop: 'categoryinfo',
    titles: parent,
    format: 'json',
  });
  const infoRes = (await (await fetch(`${WIKI_URL}/api.php?${infoQs}`)).json()) as {
    query?: { pages?: Record<string, { categoryinfo?: { subcats?: number } }> };
  };
  const pages = infoRes.query?.pages ?? {};
  const subcatCount = Object.values(pages)[0]?.categoryinfo?.subcats ?? 0;
  if (subcatCount < expectedChildren.length) {
    console.error(
      `FAIL: ${parent} categoryinfo.subcats is ${subcatCount}, expected >= ${expectedChildren.length} ` +
        `(cached counter stale — CategoryTree sidebar arrow will be inactive; run maintenance/runJobs.php)`
    );
    process.exit(1);
  }
  console.log(`PASS: ${parent} categoryinfo.subcats = ${subcatCount}`);
}
