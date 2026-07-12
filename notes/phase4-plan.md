# Phase 4 plan — qwiki alpha release

## What it is

**qwiki** — Bootstrap a MediaWiki from local Markdown files.

Target user: technical teams who have a lot of content in their heads and
want to get a wiki off the ground fast, without being slowed down by the
wiki web UI. They think in files, use grep/sed/awk, and need to explore
and restructure content freely before committing to a final site shape.
qwiki handles the initial content bootstrap; once the wiki is live, normal
wiki editing takes over.

## Package identity

- CLI binary: `qwiki`
- npm package: `qwiki`
- GitHub repo: `qwiki`
- Tagline: *Bootstrap a MediaWiki from local Markdown files*

## Three components

### 1. Infrastructure

Local Docker dev environment — everything needed to spin up a fresh
MediaWiki for testing, with zero prior wiki knowledge required.

Files:
- `docker-compose.yml` — scrubbed of doikayt-specific values; uses env
  vars or documented placeholders for site name, passwords, etc.
- `scripts/fresh-install.sh` — clean slate wiki in one command
- `scripts/bounce.sh` — restart containers to flush APCu/ResourceLoader
- `scripts/wipe.sh` — full teardown
- `LocalSettings.php` — generalized template: no hardcoded site name,
  email, secret key, or upgrade key; these become placeholders with
  comments explaining what to change. CategoryTree enabled and
  `$wgCategoryTreeSidebarRoot` set to the example content root.

Goal: `bash scripts/fresh-install.sh` → working MediaWiki in minutes,
no MediaWiki expertise required.

### 2. Example content

Demonstrates the full frontmatter schema and directory layout a user
would copy as their starting point.

- `spike-content/` renamed to `example-content/`
- Stripped of all doikayt-specific subject matter; replaced with a
  clearly generic worked example (e.g. a small project wiki with one
  root category, two subcategories, a handful of pages, one system page)
- `spike-content/system/common-css.md` kept — demonstrates the
  `raw: true` + system page pattern
- `example-content/templates/` added — demonstrates templates as
  first-class content via `raw: true` + `Template:` namespace title.
  Worked example: `Template:EvaluationCriteria` — a reusable table
  for evaluating tools against Cost, Risk, and Accessibility criteria.
  Authors drop `{{EvaluationCriteria|cost_notes=...|risk_notes=...}}`
  into any page to get a consistently structured table.
- `smoke/` folds in as `example-content/smoke/` or is documented
  alongside as the minimal one-category test
- Frontmatter schema documented inline via comments in the example files

### 3. The tool (src/)

**Step 0 — standard tooling baseline (do this first):**
qwiki must conform to the standard @datalackey TypeScript project prototype:
- Install `@datalackey/typescript-build-config` as devDependency; let its
  post-install script generate ESLint, Prettier, and tsconfig config files
- Add Vitest for testing
- Add `engines: { "node": ">=18" }` to package.json
- Wire `lint`, `format`, and `test` npm scripts
- ESM-only already in place (`"type": "module"`) — no change needed
- NX not needed at alpha (single package); revisit if workspace grows

See: https://github.com/datalackey/typescript-build-config
Reference: https://github.com/datalackey/build-tools/tree/main/javascript

**Then the phase 4 changes:**

`src/convert.ts`, `src/deploy.ts`, `src/cli.ts` — as built in phase 3,
with the following changes:

- Remove all hard-coded references to `doikayt`, `localhost:8080`,
  `Domains`, `AdminPass123`
- `package.json`: rename to `qwiki`, update description, add `bin`,
  add `engines` field (Node 18+)
- Delete `convert-to-mediawiki.ts` (superseded, would confuse new users)
- Delete `spike-content-import.xml` (old XML artifact)
- Choose license (MIT recommended)
- Add `README.md` covering:
  - What qwiki is and who it's for
  - Prerequisites (Node 18+, Docker)
  - Quickstart: fresh-install + deploy example content
  - Frontmatter schema reference (title, categories, redirect_from, raw)
  - Templates: how to author and deploy reusable wiki macros via
    `Template:` namespace pages with `raw: true`
  - CLI usage and MW_PASSWORD env var
  - How the Docker dev environment works
  - How to adapt example-content for your own wiki

## Cross-cutting cleanup

- Remove stray screenshots (*.png at repo root)
- Remove `LocalSettings.php.bak`, `LocalSettings.php.old`
- Remove `spike-content-import.xml`
- Remove `content.rough.outline.txt`, `DOIKAYT.txt` (project scratch files)
- `.gitignore`: add `*.png`, `*.bak`, `*.old`, `node_modules/`, `*.xml`
- Generalize `LocalSettings.php`: replace secret key, upgrade key,
  site name, email with placeholders; add comment directing users to
  run the installer to generate real values

## Validation

Fresh clone (simulated) → follow README quickstart → wiki up with
example content → sidebar tree, font, expand arrows all correct.
Same three checks as phase 3, but driven by the README instead of
prior knowledge.

## Out of scope for alpha

- npm publish (prep the package.json but don't publish yet)
- CI/CD pipeline
- Non-Docker installation paths
- Windows support
