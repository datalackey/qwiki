<!-- TOC:START -->
- [qwiki](#qwiki)
  - [Prerequisites](#prerequisites)
  - [How To Use](#how-to-use)
    - [Install](#install)
    - [Run](#run)
  - [Local Development Quickstart](#local-development-quickstart)
    - [1. Start a fresh local wiki](#1-start-a-fresh-local-wiki)
    - [2. Deploy content](#2-deploy-content)
  - [Content directory layout](#content-directory-layout)
    - [Frontmatter reference](#frontmatter-reference)
    - [File uploads](#file-uploads)
      - [Site logo auto-wiring](#site-logo-auto-wiring)
    - [Namespace detection](#namespace-detection)
    - [Templates](#templates)
    - [Category pages](#category-pages)
    - [Links](#links)
  - [Local Docker environment](#local-docker-environment)
    - [Configuration](#configuration)
  - [Development](#development)
    - [Setup](#setup)
    - [Unit tests](#unit-tests)
    - [Linting](#linting)
    - [End-to-end test](#end-to-end-test)
    - [Playwright (browser) tests](#playwright-browser-tests)
    - [Before committing](#before-committing)
    - [Full CI check](#full-ci-check)
  - [Build configuration and releases](#build-configuration-and-releases)
  - [Documentation maintenance](#documentation-maintenance)
  - [License](#license)
<!-- TOC:END -->


# qwiki

Bootstraps a MediaWiki from local Markdown files.

**For:** technical teams or individuals who have a clear idea of

- the wiki content that they want to publish, and
- the general guardrails and formatting guidelines they wish to establish
  for that content's ongoing maintenance

…but have not yet nailed down a complete picture of how they wish to
structure it. This framework assists in getting
the wiki content and structure off the ground fast — without being slowed down
by the wiki web UI. It allows you to write and restructure pages with grep, sed, and your
editor. When you're ready, deploy everything to a running MediaWiki in one
command.

Once the wiki is live, normal wiki editing takes over. qwiki is a bootstrap
tool, not a sync tool.

---

## Prerequisites

- Node.js 22+
- Docker (for the local dev environment)

---

## How To Use

### Install

```bash
npm install --save-dev @doikayt/qwiki
```

### Run

```bash
MW_PASSWORD=<wiki-password> npx qwiki <content-dir> --wiki <url> --user <username>
```

| Argument | Required | Description |
|---|---|---|
| `<content-dir>` | yes | Path to your Markdown content directory |
| `--wiki` | yes | Base URL of the running MediaWiki instance |
| `--user` | yes | Wiki username with write access |

The password is always passed via `MW_PASSWORD` — never as a flag.

See [Content directory layout](#content-directory-layout) for how to structure
your Markdown files.

---

## Local Development Quickstart

### 1. Start a fresh local wiki

```bash
bash infra/scripts/fresh-install.sh
```

This tears down any existing wiki, runs the MediaWiki installer, and brings
up a clean instance at `http://localhost:8080`.

Default admin credentials: `Admin` / `AdminPass123`

### 2. Deploy content

```bash
bash infra/scripts/import-content.sh
```

This converts `example/wiki-content-files/` and pushes all pages to the wiki via the
MediaWiki API. Open `http://localhost:8080` and hard-refresh to see the result.

---

## Content directory layout

```
example/wiki-content-files/
  files/               # Image and media assets (uploaded to the File: namespace)
  categories/          # Category namespace pages (Category:X)
  templates/           # Template namespace pages (Template:X)
  system/              # System pages (MediaWiki:Common.css etc.)
  <topic>/             # Regular pages, organised however you like
  main-page.md         # Main Page
```

Each file is a Markdown file with YAML frontmatter:

```yaml
---
title: "My Page"          # required — the wiki page title (including namespace prefix)
categories:               # optional — list of category names this page belongs to
  - Some Category
redirect_from: []         # optional — list of old titles that should redirect here
raw: false                # optional — if true, body is sent as-is (no pandoc conversion)
---

Page content here in Markdown.
```

### Frontmatter reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Full wiki title, e.g. `"Category:Habitats"` or `"Template:EvalTable"` |
| `categories` | string[] | no | Each entry becomes `[[Category:X]]` appended to the page body |
| `redirect_from` | string[] | no | Each entry creates a `#REDIRECT [[title]]` page |
| `raw` | boolean | no | Skip pandoc; send body verbatim (CSS, wikitext templates, system pages) |

### File uploads

Any file placed directly inside `files/` is uploaded to the wiki's `File:`
namespace via `action=upload` as part of the same deploy run. Uploads happen
before page edits so images are available when page content is written.

```
files/
  logo.png        → File:logo.png on the wiki
  banner.svg      → File:banner.svg on the wiki
```

Re-running qwiki is safe — uploads use `ignorewarnings=1` so existing files are
overwritten without error.

To reference an uploaded file in a page:

```wikitext
[[File:logo.png|thumb|Caption here]]
```

#### Site logo auto-wiring

Name the file exactly `logo.png`. After uploading it, qwiki queries the
canonical file URL from the API and patches the `$wgLogos` block in
`infra/LocalSettings.php` automatically:

```php
$wgLogos = [
    '1x' => "http://localhost:8080/w/images/.../logo.png",
    'icon' => "http://localhost:8080/w/images/.../logo.png",
];
```

Then restart MediaWiki to apply the change:

```bash
bash infra/scripts/bounce.sh
```

If `infra/LocalSettings.php` is not found relative to the working directory,
qwiki prints the URL so you can paste it in manually.

### Namespace detection

qwiki infers the MediaWiki namespace from the title prefix:

| Title prefix | Namespace |
|---|---|
| `Category:` | Category (14) |
| `Template:` | Template (10) |
| `MediaWiki:` | MediaWiki (8) |
| `Help:` | Help (12) |
| *(none)* | Main (0) |

Content model is inferred from the title suffix: `.css` → css, `.js` → javascript,
everything else → wikitext.

### Templates

Templates are just wiki pages in the `Template:` namespace with `raw: true`.
The body is standard MediaWiki template syntax:

```markdown
---
title: "Template:EvaluationCriteria"
raw: true
---
{| class="wikitable"
! Criterion !! Notes
|-
| Cost || {{{cost_notes|default}}}
|-
| Risk || {{{risk_notes|default}}}
|}
```

Use them on any page with `{{EvaluationCriteria|cost_notes=Low|risk_notes=Medium}}`.

### Category pages

A category page uses the `Category:` namespace prefix in its title:

```markdown
---
title: "Category:Internal Operations"
categories:
  - Domains
redirect_from: []
---

Brief description of this domain.
```

Any page that lists this category in its `categories:` frontmatter will
automatically appear under it on the wiki. No new tests are needed when adding
a category page — the test suite checks specific named pages, not all
categories.

### Links

**External links** — standard Markdown syntax, converted by pandoc:

```markdown
[Link text](https://example.com)
```

**Intra-wiki links** — use MediaWiki wikilink syntax via pandoc's raw
passthrough:

```markdown
`[[Page Title]]`{=mediawiki}
`[[Page Title|Custom display text]]`{=mediawiki}
```

Do not use `/wiki/Page_Name` URL-style links for internal pages. That format
depends on the wiki's article path configuration and will break on installs
where the path differs.

---

## Local Docker environment

The `infra/` directory (`scripts/`, `docker-compose.yml`, `LocalSettings.php`)
provides a self-contained local wiki for content development and testing.

| Script | What it does |
|---|---|
| `infra/scripts/fresh-install.sh` | Full reset: tear down containers, wipe DB volume, reinstall |
| `infra/scripts/import-content.sh` | Deploy `example/wiki-content-files/` to the running wiki |
| `infra/scripts/bounce.sh` | Restart containers (flushes APCu/ResourceLoader cache) |
| `infra/scripts/wipe.sh` | Tear down containers and volumes without reinstalling |

### Configuration

Edit `infra/LocalSettings.php` before running `fresh-install.sh`:

- `$wgSitename` — your wiki's display name
- `$wgMetaNamespace` — namespace prefix (no spaces)
- `$wgEmergencyContact` / `$wgPasswordSender` — your email
- `$wgCategoryTreeSidebarRoot` — root category key for the sidebar tree

The secret key and upgrade key are regenerated by the installer each time
you run `fresh-install.sh`.

Edit `local.config.json` in the repo root to set the wiki URL used by the
Playwright test runner. See [Playwright (browser) tests](#playwright-browser-tests)
for details.

---

## Development

### Setup

```bash
git clone git@github.com:doikayt/qwiki.git
cd qwiki
npm install
```

### Unit tests

```bash
npm test
```

Runs the vitest suite in `code/tests/`, covering:

- Markdown → MediaWiki conversion (frontmatter, pandoc, categories, redirects,
  content models, raw pass-through)
- MediaWiki API deploy sequence (login token, clientlogin, CSRF token, per-page
  edit POSTing, cookie threading, non-wikitext content models)

No docker required.

### Linting

```bash
npm run lint
```

Runs ESLint over `code/src/`. No docker required.

### End-to-end test

```bash
npm run test:e2e
```

Runs the full bootstrap cycle against a local docker environment: fresh
install, `example/wiki-content-files/` import, then verifies the rendered
sidebar contains the links defined in
`example/wiki-content-files/system/sidebar.md`.
Destructive — wipes the local wiki DB volume. Requires docker.

### Playwright (browser) tests

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm run test:pw
```

Browser-level tests that exercise JavaScript form validation in a real
browser against the running local wiki. Covers field-level error display
for the Tool submission form (pricing/amount rules, category requirement,
URL reachability probe).

`npm run test:pw` starts Docker automatically if the containers are stopped
(non-destructive — DB volume is kept), runs a reachability preflight, then
runs the Playwright suite.

**Test preflight:** `infra/scripts/check-reachability.js` runs before the
suite and fails fast with a diagnosis instead of letting broken infrastructure
surface as opaque per-test timeouts. Phase A (always) probes key wiki URLs
from the current environment, verifying a content sentinel in each body and
sampling latency (a slow-but-up wiki is flagged before it causes locator
flake). Phase B (`--docker` flag) needs the docker CLI, so run it from the
host: it checks container state and restart counts (crash loops hidden by
`restart: always`), then HTTP and DB connectivity from inside the mediawiki
container:

```bash
npm run check-wiki             # Phase A only (works anywhere)
npm run check-wiki -- --docker # Phases A + B (run from the host)
```

**Chromium:** Playwright needs a Chromium binary. On NixOS the system binary
works:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/run/current-system/sw/bin/chromium npm run test:pw
```

On other systems, install Playwright's bundled browser once:

```bash
npx playwright install chromium
```

Then run without the env var.

**Base URL configuration:** The tests read `local.config.json` in the repo
root to determine the wiki URL. The default (localhost:8080) is correct when
running on the host. If you run the tests from inside a Docker container
(e.g. a sandboxed dev environment), set the Docker bridge gateway instead:

```json
{ "wikiBaseUrl": "http://172.17.0.1:8080" }
```

`local.config.json` is committed. Change it to match your environment and
commit the result.

### Before committing

```bash
npm run update-all-format
```

Runs Prettier over `code/src/` then regenerates the README TOC. Run this before
staging a commit whenever you have edited source files or changed section headings.

### Full CI check

```bash
npm run ci
```

Runs everything in order: README TOC validation, unit tests, end-to-end test.
This mirrors exactly what the release workflow runs on every push to `main`.
Requires docker.

---

## Build configuration and releases

The ESLint/Prettier/tsconfig presets and the release pipeline come from
[`@doikayt/typescript-build-config`][tbc]. Its postinstall copies the
canonical top-level config files once, and keeps the pipeline files
(`.github/workflows/release.yml`, `.changeset/config.json`,
`scripts/auto-changeset.sh`) in sync, warning when a local copy drifts.

Releases are automated with Changesets on every push to `main`:

- `fix:` / `feat:` / `perf:` commits auto-generate a patch changeset
- minor and major bumps require a handwritten `npx changeset`
- a breaking-change marker without a handwritten changeset fails the release job

See [RELEASE-PROCESS][release-process] for the full policy.

[tbc]: https://github.com/doikayt/typescript-build-config
[release-process]:
  https://github.com/doikayt/typescript-build-config/blob/main/docs/RELEASE-PROCESS.md

---

## Documentation maintenance

The table of contents at the top of this README is auto-generated by
[`@doikayt/autogen-markdown-doc`][autogen-markdown-doc].
Use `npm run update-all-format` to reformat source and regenerate the TOC in one step.
To regenerate the TOC alone:

```bash
npm run update-markdown-docs
```

`npm run check-markdown-docs` validates the TOC without writing, exiting
non-zero on drift — suitable as a CI gate.

[autogen-markdown-doc]:
  https://github.com/doikayt/build-tools/tree/main/javascript/autogen-markdown-doc

---

## License

MIT

