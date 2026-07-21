# @datalackey/qwiki

## 0.1.17

### Patch Changes

-   - feat(website,wiki): add build-commit footer link; fix sidebar layout and font sizes

## 0.1.16

### Patch Changes

-   - feat(website): add Projects page, align colors with wiki watermelon theme

## 0.1.15

### Patch Changes

-   - feat(deploy): record source .md path in MediaWiki edit summary

## 0.1.14

### Patch Changes

-   - feat(website): add static site for doikayt.org

## 0.1.13

### Patch Changes

-   - fix(infra): replace GitHub deploy key with org-wide PAT, fix live-tested deploy bugs

## 0.1.12

### Patch Changes

-   - feat(infra): lay groundwork for droplet deployment via reserved IP + deploy key

## 0.1.11

### Patch Changes

-   - fix(infra): expand sidebar category tree 2 levels deep by default

## 0.1.10

### Patch Changes

-   - fix(infra): drain job queue after content import to fix stale CategoryTree counts

## 0.1.9

### Patch Changes

-   - feat(content): restructure categories and add Slack, DigitalOcean tool entries

## 0.1.8

### Patch Changes

-   - fix(content): remove animal example content and clarify import behaviour
    - fix(content): correct Project Management category parent and remove redundant page

## 0.1.7

### Patch Changes

-   - fix: header issues
    - fix(ci): update reachability probe URL for New Submission rename
    - fix(wiki): fix intra-wiki links, rename "Add New Tool" to "New Submission"

## 0.1.6

### Patch Changes

-   - fix(wiki): improve form validation error visibility and fix amount/category rules

## 0.1.5

### Patch Changes

-   - feat: add category-tree "Add new entry" form with contextual pre-fill
    - fix: correct Vector legacy sidebar CSS to stop header overflow
    - feat: add ensure-extensions.sh to pin PageForms/Cargo to the MediaWiki version
    - feat: wire PageForms and Cargo extensions into MediaWiki
    - fix: pin mediawiki image to 1.46 in docker-compose.yml

## 0.1.4

### Patch Changes

-   - fix: update import-content.sh cli path after code/ restructure
    - fix: correct repoRoot path in e2e test after code/ restructure

## 0.1.3

### Patch Changes

-   - fix: align with typescript-build-config 0.1.6

## 0.1.2

### Patch Changes

-   - feat: consolidate CI checks into npm run ci script

## 0.1.1

### Patch Changes

-   - feat: adopt typescript-build-config base config and release pipeline
