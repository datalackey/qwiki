import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parse } from 'marked';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'website/src');
const DIST = resolve(ROOT, 'website/dist');

const GITHUB_REPO = 'https://github.com/doikayt/qwiki';
const commit = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
const commitLink = `<a href="${GITHUB_REPO}/commit/${commit}">${commit.slice(0, 7)}</a>`;

const template = readFileSync(resolve(ROOT, 'website/template.html'), 'utf8')
  .replace('{{BUILD_COMMIT_LINK}}', commitLink);

mkdirSync(DIST, { recursive: true });

copyFileSync(resolve(SRC, 'styles.css'), resolve(DIST, 'styles.css'));
copyFileSync(resolve(ROOT, 'infra/images/logo.png'), resolve(DIST, 'logo.png'));

// Pages sharing a horizontal sub-nav; order here sets tab order.
const ABOUT_TABS = [
  { slug: 'about', label: 'Our Name' },
  { slug: 'about-mission', label: 'Mission' },
  { slug: 'about-company-structure', label: 'Company Structure' },
  { slug: 'about-people', label: 'People' },
];

function buildTabsHtml(slug) {
  if (!ABOUT_TABS.some(t => t.slug === slug)) return '';
  const links = ABOUT_TABS.map(t => {
    const cls = t.slug === slug ? ' class="active"' : '';
    return `<a href="/${t.slug}.html"${cls}>${t.label}</a>`;
  }).join('\n    ');
  return `<nav class="about-tabs">\n    ${links}\n  </nav>`;
}

const pages = readdirSync(SRC).filter(f => f.endsWith('.md'));
for (const file of pages) {
  const slug = basename(file, '.md');
  const md = readFileSync(resolve(SRC, file), 'utf8');
  const titleMatch = md.match(/^#[ \t]+(.+)$/m);
  const pageTitle = titleMatch ? titleMatch[1] : slug;
  const body = titleMatch ? md.replace(titleMatch[0], '') : md;
  const html = template
    .replaceAll('{{PAGE_TITLE}}', pageTitle)
    .replace('{{TABS}}', buildTabsHtml(slug))
    .replace('{{BODY}}', parse(body));
  writeFileSync(resolve(DIST, `${slug}.html`), html);
}

console.log(`Built ${pages.length} pages → website/dist/`);
