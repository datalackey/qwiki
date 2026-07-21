import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'marked';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'website/src');
const DIST = resolve(ROOT, 'website/dist');
const template = readFileSync(resolve(ROOT, 'website/template.html'), 'utf8');

mkdirSync(DIST, { recursive: true });

copyFileSync(resolve(SRC, 'styles.css'), resolve(DIST, 'styles.css'));

const pages = readdirSync(SRC).filter(f => f.endsWith('.md'));
for (const file of pages) {
  const slug = basename(file, '.md');
  const md = readFileSync(resolve(SRC, file), 'utf8');
  const titleMatch = md.match(/^#[ \t]+(.+)$/m);
  const pageTitle = titleMatch ? titleMatch[1] : slug;
  const html = template
    .replace('{{PAGE_TITLE}}', pageTitle)
    .replace('{{BODY}}', parse(md));
  writeFileSync(resolve(DIST, `${slug}.html`), html);
}

console.log(`Built ${pages.length} pages → website/dist/`);
