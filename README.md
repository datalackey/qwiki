<!-- TOC:START -->
- [qwiki](#qwiki)
  - [Prerequisites](#prerequisites)
  - [Quickstart](#quickstart)
    - [1. Start a fresh local wiki](#1-start-a-fresh-local-wiki)
    - [2. Deploy content](#2-deploy-content)
    - [3. Use qwiki directly](#3-use-qwiki-directly)
  - [Content directory layout](#content-directory-layout)
    - [Frontmatter reference](#frontmatter-reference)
    - [Namespace detection](#namespace-detection)
    - [Templates](#templates)
  - [Local Docker environment](#local-docker-environment)
    - [Configuration](#configuration)
  - [Development](#development)
    - [Unit tests](#unit-tests)
    - [End-to-end test](#end-to-end-test)
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

## Quickstart

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

### 3. Use qwiki directly

```bash
MW_PASSWORD=AdminPass123 npx tsx src/cli.ts ./my-content \
                        --wiki http://localhost:8080 --user Admin
```

Password is always passed via the `MW_PASSWORD` environment variable —
never as a flag.

---

## Content directory layout

```
example/wiki-content-files/
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

---

## Development

```bash
git clone git@github.com:doikayt/qwiki.git
cd qwiki
npm install
```

### Unit tests

```bash
npm test
```

Runs the vitest suite in `tests/`, covering the Markdown → MediaWiki conversion
logic (frontmatter handling, pandoc conversion, categories, redirects, content
models). No docker required.

### End-to-end test

```bash
npm run test:e2e
```

Runs the full bootstrap cycle against a local docker environment: fresh
install, `example/wiki-content-files/` import, then verifies the rendered
sidebar contains the links defined in
`example/wiki-content-files/system/sidebar.md`.
Destructive — wipes the local wiki DB volume. Requires docker.

### Before committing

```bash
npm run update-all-format
```

Runs Prettier over `src/` then regenerates the README TOC. Run this before
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
[`@datalackey/typescript-build-config`][tbc]. Its postinstall copies the
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
[`@datalackey/autogen-markdown-doc`][autogen-markdown-doc].
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
