# code/

This directory is the `qwiki` deploy CLI (`src/cli.ts`, `src/convert.ts`,
`src/deploy.ts`). See the top-level [README](../README.md) for install/usage
and the content-file frontmatter reference. This document covers the two main
runtime flows in more depth: how content actually gets onto the wiki, and how
the "Add new entry" contextual category form works once it's there.

## Flow 1: Content deploy pipeline

`infra/scripts/import-wiki-content.sh` runs:

```
npx tsx code/src/cli.ts <content-dir> --wiki <url> --user Admin
```

1. **`cli.ts`** parses args, reads `MW_PASSWORD` from the environment, calls
   `convertDir()` then `deploy()`.
2. **`convert.ts`** walks `<content-dir>` for `*.md` files, parses YAML
   frontmatter (`gray-matter`), and produces `Page { title, body, model }`
   objects:
   - `raw: true` → body sent verbatim (used for CSS/JS/wikitext templates
     that must not go through pandoc).
   - otherwise → body is converted `markdown` → `mediawiki` via
     `pandoc-wasm`, and `categories:` frontmatter entries are appended as
     `[[Category:X]]` tags (only for non-raw pages — raw pages must add their
     own category wikitext, since the deploy pipeline doesn't touch raw
     bodies at all).
   - `model` is inferred from the title suffix: `.css` → `css`, `.js` →
     `javascript`, else `wikitext`.
3. **`deploy.ts`** pushes each `Page` to the wiki over the **MediaWiki Action
   API** (`<wiki>/api.php`) using plain `fetch()` — no MediaWiki client
   library:
   - `GET action=query&meta=tokens&type=login` → login token
   - `POST action=clientlogin` (username/password/token) → authenticates;
     session cookies are captured by a minimal hand-rolled `CookieJar` and
     replayed on every subsequent request
   - `GET action=query&meta=tokens` → CSRF token
   - for each page: `POST action=edit` with `title`, `text`, `token` (and
     `contentmodel` if not `wikitext`) — this is the actual write. It's
     exactly the same API call a human edit through the wiki UI would
     produce.

Every deploy is idempotent — re-running `import-wiki-content.sh` just re-issues
`action=edit` for every page again, overwriting with the current file
content.

## Flow 2: "Add new entry" contextual category pre-fill

Goal: clicking "Add new entry" in the sidebar should pre-check whatever
category(ies) the *page you were just looking at* belongs to, in the new
page's category picker — without hardcoding a page-to-category mapping
anywhere.

**Files involved** (all deployed via Flow 1, so edit the source `.md` files
under `example/wiki-content-files/`, not the wiki directly):

| File | Deploys to | Role |
|---|---|---|
| `templates/general-page.md` | `Template:GeneralPage` | Body field + `#arraymap` loop turning a comma-delimited category list into `[[Category:X]]` links |
| `templates/general-page-form.md` | `Form:GeneralPage` | The Page Forms form: a body field and a category field (`input type=tree`, rooted at `Category:Domains`) |
| `system/common-js.md` | `MediaWiki:Common.js` | Client-side gadget, runs on every page load (see below) |
| `system/sidebar.md` | `MediaWiki:Sidebar` | Adds the "Add new entry" nav link, pointing at `Special:FormStart/GeneralPage` |
| `infra/LocalSettings.php` | — | Loads the (already-bundled but previously unloaded) `ParserFunctions` extension, required for `#arraymap` |

**Runtime sequence:**

1. On every page load, the `Common.js` gadget reads `mw.config.get('wgCategories')`
   — MediaWiki's own list of the *current* page's real categories. If empty,
   it does nothing (plain "ask me for a name" link, no prefill).
2. It joins those categories into a single comma-delimited string and
   rewrites any link on the page whose `href` contains `Special:FormStart` or
   `Special:FormEdit`, appending that string as
   `GeneralPage[category]=<comma,joined,list>`.
3. Clicking "Add new entry" goes to `Special:FormStart/GeneralPage`, which
   only asks for a page **title** (MediaWiki requires one before anything
   can be created — this step can't be skipped). Whatever you typed as a
   query param is *not* auto-forwarded by this page — **it only reads a
   parameter literally named `params`** (see `PFFormStart.php`) and appends
   that string verbatim to the `Special:FormEdit` redirect it produces. So
   the gadget sets `?params=GeneralPage%5Bcategory%5D%3D...` on
   `Special:FormStart` links specifically, not the raw field param.
4. After you submit a title, you land on `Special:FormEdit/GeneralPage/<title>`
   with the category param intact. The tree widget (`PFTreeInput`) reads its
   current value as a delimiter-split string (default delimiter `,`) and
   pre-checks the matching nodes.
5. On save, `Template:GeneralPage`'s `#arraymap` loop splits that same
   comma-delimited value back out into one `[[Category:X]]` link per entry.

**Gotchas that cost real debugging time — don't relitigate these:**

- `Special:FormEdit/<Form>` alone (no page name) does **not** prompt for a
  name; it errors "No target page specified." `Special:FormStart/<Form>` is
  the page that prompts, then redirects to `FormEdit`.
- `Special:FormStart` forwards extra data to the resulting `FormEdit` URL
  **only** via its own `params` query parameter — anything else you tack
  onto the `FormStart` URL is silently dropped.
- `input type=categories` (and `input type=category`) look like they should
  select the category-tree widget, and are even referenced inside
  `PFTreeInput.php` — but that class is registered under the name `tree`
  only (`PFTreeInput::getName()` returns `'tree'`). Those aliases are dead
  code in this version; only `input type=tree` actually dispatches to the
  tree widget. Using `categories` silently falls back to a plain disabled
  text input with no error.
- A multi-select tree/list field's current value must arrive as **one
  comma-delimited string** (`category=A,B`), not repeated array-style query
  params (`category[]=A&category[]=B`). The latter produces a PHP array
  where a string is expected and the field silently ends up empty.
