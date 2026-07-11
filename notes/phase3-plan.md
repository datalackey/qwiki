# Phase 3 plan — replace XML transport with API deploy, generalize

## Context

Phases 1–2 (see `smoke/`) proved on a fresh wiki:

- CSS loads and applies when written via `action=edit` with `contentmodel=css`
- CategoryTree font must be explicit `12px` (`inherit` resolves to body 16px;
  nav links get 12px from a Vector skin rule that the CategoryTree portlet
  is not inside)
- Expand arrows work fine on a fresh install — the original pipeline's dead
  arrows were fallout from `importDump` silently refusing to update pages
  with css content model, leaving `MediaWiki:Common.css` permanently stale
- `action=clientlogin` is required in MW 1.46 (`action=login` silently fails)

Key discovery: the existing converter (`convert-to-mediawiki.ts`) already
uses pandoc via `pandoc-wasm` (npm-packaged WebAssembly build). Conversion
was never homegrown. The homegrown, defective part is the transport:
XML assembly + `importDump`. Phase 3 keeps conversion, replaces transport.

## Shape

One Node CLI — `src/cli.ts` plus two modules — replacing both
`convert-to-mediawiki.ts` and `scripts/import-content.sh`:

### 1. `src/convert.ts` (salvage from convert-to-mediawiki.ts)

- Walk content dir, parse frontmatter with gray-matter
- pandoc-wasm markdown→wikitext for normal pages; passthrough for `raw: true`
- Append `[[Category:...]]` tags from frontmatter
- DELETE: all XML assembly, `xmlbuilder2` dep, the namespace map
  (the API resolves namespaces from titles natively)

### 2. `src/deploy.ts` (new — Node, not bash)

- `action=clientlogin` → CSRF token → one `action=edit` per page
- Content model per title suffix: `.css` → `contentmodel=css`,
  `.js` → `javascript` (this is the exact call that fixed Common.css)
- Node 18+ built-in `fetch` + hand-rolled ~20-line cookie jar;
  zero new dependencies
- `edit` is create-or-update → no "delete all pages first" step;
  stale-page pruning documented as out of scope for alpha

### 3. CLI

```
md2wiki <content-dir> --wiki http://localhost:8080 --user Admin
```

- Password via `MW_PASSWORD` env only (never a flag — shell history)
- No hard-coded `Domains`, `localhost`, or `doikayt` anywhere in `src/`

## Fold in phase 1–2 insights

- `spike-content/system/common-css.md` gets the proven CSS
  (12px explicit; see `smoke/common.css` for the working ruleset)
- Post-deploy cache flush: try API `action=purge` first; investigate
  during implementation whether that suffices or an APCu container
  bounce is still needed (document whichever is true)

## Decisions locked

- **pandoc-wasm over system pandoc** — self-contained npm install,
  no external binary; right call for phase 4 distribution
- **`redirect_from`: implement it** (declared in frontmatter but was never
  implemented). Emit `#REDIRECT [[title]]` pages via the same edit call.
  ~10 lines now that transport is per-page.

## Validation

Fresh install (`scripts/fresh-install.sh`) → deploy `spike-content/` with
the new tool → three checks, same as smoke test but against real content:

1. Sidebar tree renders correct nesting
2. Tree font is 12px matching nav links
3. Expand arrows work

## Out of scope (phase 4)

Naming, README, license, npm publish prep, config file format.
