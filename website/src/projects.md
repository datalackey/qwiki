# Projects

Here are the projects we have either in beta launch, or in development:

---

## Doikayt Wiki

Our [Wiki](https://wiki.doikayt.org/wiki/Main_Page)  is live -- and it is the first tool 
built with our [qwiki](https://github.com/doikayt/qwiki) framework. Its goal is 
to serve as the go-to hub for collaborative curation of digital tools for
technicians supporting organizations whose mission aligns with our charter.  

We bootstrapped the Wiki with easy-to-edit, locally-based Markdown content, which our
converter pipeline transforms into Wiki content directly via the MediaWiki API. Every
entry follows a known structure (schema), enforced by our shared Tool template -- the
same schema live contributors use when adding new tools through our New Submission
form.

That known schema has let us move fast on content: pointing Claude Code at a tool's
website -- giving a quick prompt: "look up pricing, license, and hosting details for X" -- 
and then having Claude draft the description. This is now a routine part of our
new entry update workfflow.

### Future Enhancements

Near term, we plan to close the loop in the other direction: capturing content
submitted live on the Wiki (via the New Submission form) and feeding it back into
git, so the pipeline stays the single source of truth for redeploys. See
[doikayt/qwiki#1](https://github.com/doikayt/qwiki/issues/1) for the proposed
approach.

Longer term we plan to expose our content as a tool AI language models can leverage via
[Model Context Protocol](https://en.wikipedia.org/wiki/Model_Context_Protocol).
The goal is to enable conversations along the lines of:  "I am looking for a low (or no)
cost tool to streamline the process of submitting my organization's weekly events to
various community calendars."

---

## Developer Tools

### qwiki

**Bootstrap a MediaWiki from local Markdown files.**

[qwiki](https://github.com/doikayt/qwiki) is a CLI tool for Unix command savvy-technical teams who
have content to publish but don't want to be slowed down by a Wiki web UI. You write
pages as Markdown files, organize them with grep and your favorite 
editor (which, of course, is vi ;^), and deploy everything to a running MediaWiki in one command
(Current cloud support is for [Digital Ocean](https://cloud.digitalocean.com/) only, but contributions are welcome.)


---



### gas-demodulify-plugin

**Webpack plugin for Google Apps Script add-ons.**

[gas-demodulify-plugin](https://github.com/doikayt/gas-demodulify-plugin) solves a
real problem in GAS development: Webpack's standard output (module wrappers, the
`__webpack_require__` runtime, IIFEs) is incompatible with the GAS execution
environment. Existing tools handle simple flat scripts but break down on complex
multi-subsystem extensions for GAS.

The plugin discards Webpack's runtime artifacts entirely and regenerates
GAS-compatible JavaScript with clean hierarchical namespaces — one per subsystem
(typically `ui`, `backend`, and `common`). The result is code that runs correctly
in both the GAS runtime and the `HtmlService` delivery model, without brittle
string manipulation of Webpack output.

---

### typescript-build-config

**Shared build configuration for all `@doikayt` TypeScript projects.**

[typescript-build-config](https://github.com/doikayt/typescript-build-config)
is a single source of truth for ESLint, Prettier, and TypeScript presets across
every project in the `@doikayt` scope. Installing it as a `devDependency` runs a
postinstall script that copies starter config files into your project root and wires
up the release pipeline.

The release pipeline uses [Changesets](https://www.npmjs.com/package/@changesets/cli):
`fix:`, `feat:`, and `perf:` commits automatically generate patch changesets; minor
and major bumps require a handwritten changeset. CI validates, tests, and publishes
— it never generates functional code or modifies logic.

---

### build-tools

**Support for auto-generation and verification of documentation from code**

[build-tools](https://github.com/doikayt/build-tools) layers on top of [typescript-build-config](https://github.com/doikayt/typescript-build-config), and serves as the home for shared
development infrastructure across Doikayt projects. The unifying theme is
automated documentation generation and verification: documentation drift —
inconsistency between source artifacts and the documentation that describes them —
is treated as a build failure, not a review comment.


The flagship package is [`@doikayt/autogen-markdown-doc`](https://github.com/doikayt/build-tools/tree/main/javascript/autogen-markdown-doc),
which keeps Markdown tables of contents and Mermaid build-graph diagrams
synchronized with source in a single command.
