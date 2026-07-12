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
    - [End-to-end test](#end-to-end-test)
  - [Documentation maintenance](#documentation-maintenance)
  - [License](#license)
<!-- TOC:END -->



# qwiki

Bootstrap a MediaWiki from local Markdown files.

**For:** technical teams who have a lot of content in their heads and want to
get a wiki off the ground fast — without being slowed down by the wiki web UI.
Write and restructure pages with grep, sed, and your editor. When you're ready,
deploy everything to a running MediaWiki in one command.

Once the wiki is live, normal wiki editing takes over. qwiki is a bootstrap
tool, not a sync tool.

---

## Prerequisites

- Node.js 18+
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
MW_PASSWORD=AdminPass123 npx tsx src/cli.ts ./my-content --wiki http://localhost:8080 --user Admin
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
| `raw` | boolean | no | Skip pandoc; send body verbatim. Use for CSS, wikitext templates, system pages |

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

### End-to-end test

```bash
npm run test:e2e
```

Runs the full bootstrap cycle against the local docker environment: fresh
install, `example/wiki-content-files/` import, then verifies the rendered sidebar
contains the links defined in `example/wiki-content-files/system/sidebar.md`.
Destructive — wipes the local wiki DB volume. Requires docker.

---

## Documentation maintenance

The table of contents at the top of this README is auto-generated by
[`@datalackey/autogen-markdown-doc`][autogen-markdown-doc].
After changing section headings, regenerate it with:

```bash
npm run update-markdown-docs
```

`npm run check-markdown-docs` validates the TOC without writing, exiting
non-zero on drift — suitable as a CI gate.

[autogen-markdown-doc]:
  https://github.com/datalackey/build-tools/tree/main/javascript/autogen-markdown-doc

---

## License

MIT
