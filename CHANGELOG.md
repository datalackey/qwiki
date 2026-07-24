# @datalackey/qwiki

## 0.1.36

### Patch Changes

-   - feat(website): move rabbis photo to founder's statement, add Bund cover
    - fix(website): swap People photo to cat-work, italicize Vibe bullets
    - feat(website): add cat images to Company Structure page

## 0.1.35

### Patch Changes

-   - fix(website): tighten Mission bullets and expand Careers intern duties

## 0.1.34

### Patch Changes

-   - fix(website): expand Technical mission's thought-leadership bullet

## 0.1.33

### Patch Changes

-   - feat(website): add Intern position to Careers page
    - fix(website): trim Success Drivers to the strongest point
    - feat(website): replace Mission tab with Technical/Community/Success Drivers

## 0.1.32

### Patch Changes

-   - fix(website): clear Doikayt Vibe list below the People photo
    - feat(website): link key terms in the founder's statement
    - feat(website): add Careers page

## 0.1.31

### Patch Changes

-   - fix(website): point footer link at qwiki GitHub repo instead of wiki

## 0.1.30

### Patch Changes

-   - feat(website): add photo to Doikayt Vibe, fix list/float text alignment
    - fix(content): Nextcloud Calendar wording assumed you already run Nextcloud

## 0.1.29

### Patch Changes

-   - perf(deploy): parallelize page edits with a concurrency cap
    - feat(website): add rebuilding photo to Company Structure page
    - feat(content): add Eventbrite for event promotion
    - feat(content): add Donor & Volunteer CRM and Password Management categories
    - fix(content): correct Akaunting's category mismatch, add regression test
    - feat(content): flag Google Workspace and Slack as not recommended
    - feat(content): add Akaunting and Nextcloud Calendar, filling two empty categories

## 0.1.28

### Patch Changes

-   - feat(content): add Mattermost and Rocket.Chat as Slack peers
    - feat(website): add content images to home and About "Our Name" pages
    - fix(content): capitalize "Wiki" consistently when referring to our own Wiki

## 0.1.27

### Patch Changes

-   - fix(website): tighten Company Structure and People & Culture wording
    - fix(content): link Bundists to Wikipedia, drop unsupported Douglass emphasis
    - feat(website): replace home page with "Hello, World" mission statement

## 0.1.26

### Patch Changes

-   - feat(website): point wiki links at local docker instance when previewing locally
    - feat(website): flesh out About page Company Structure and People & Culture tabs
    - feat(website): heading anchors + local/prod link rewriting for content links

## 0.1.25

### Patch Changes

-   - fix(content): point wiki About page link at website About page
    - feat(content): add Office Suite category with OnlyOffice and Nextcloud
    - feat(content): add Email category and Proton Mail
    - feat(sidebar): hover tooltips for CategoryTree leaves and categories
    - feat(website): split About page into tabbed sub-pages
    - fix(sidebar): hide empty-category clutter in nav tree

## 0.1.24

### Patch Changes

-   - feat(sidebar): strip taglines from nav tree; disallow hyphens in company names

## 0.1.23

### Patch Changes

-   - fix(deploy): replace **QWIKI_BUILD_COMMIT** placeholder with QWIKI_COMMIT_LINK
    - feat(content): tagline convention — pipeline validation, backfill, new categories and Montastic

## 0.1.22

### Patch Changes

-   - fix(infra): don't silently discard uncommitted LocalSettings.php edits

## 0.1.21

### Patch Changes

-   - fix(dev): build website in the .envrc reload shortcut

## 0.1.20

### Patch Changes

-   - fix(wiki,tests): keep logo link local in dev; adopt shared Playwright config
    - fix(infra): build website during first-time bootstrap and full local reset

## 0.1.19

### Patch Changes

-   - fix(cli): remove unused GITHUB_REPO constant that broke tsc build
    - feat(website,wiki): add build-commit footer link; fix sidebar layout and font sizes

## 0.1.18

### Patch Changes

-   - feat(website,wiki): add build-commit footer link; fix sidebar layout and font sizes

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
