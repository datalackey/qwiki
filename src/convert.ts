import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { convert } from 'pandoc-wasm';

export type ContentModel = 'wikitext' | 'css' | 'javascript';

export interface Page {
  title: string;
  body: string;
  model: ContentModel;
}

function modelForTitle(title: string): ContentModel {
  if (title.endsWith('.css')) return 'css';
  if (title.endsWith('.js')) return 'javascript';
  return 'wikitext';
}

function findMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findMarkdownFiles(fullPath));
    else if (entry.name.endsWith('.md')) results.push(fullPath);
  }
  return results;
}

export async function convertDir(dir: string): Promise<Page[]> {
  const files = findMarkdownFiles(dir);
  if (files.length === 0) throw new Error(`No .md files found under: ${dir}`);

  const pages: Page[] = [];

  for (const filePath of files) {
    const raw = readFileSync(filePath, { encoding: 'utf8' });
    const { data, content } = matter(raw);

    const title = data['title'] as string | undefined;
    if (!title) throw new Error(`Missing required "title" field in: ${filePath}`);

    const categories: string[] = Array.isArray(data['categories'])
      ? (data['categories'] as unknown[]).filter((c): c is string => typeof c === 'string')
      : [];

    const redirectFrom: string[] = Array.isArray(data['redirect_from'])
      ? (data['redirect_from'] as unknown[]).filter((r): r is string => typeof r === 'string')
      : [];

    const isRaw = data['raw'] === true;
    const model = modelForTitle(title);

    let body: string;
    if (isRaw) {
      body = content.trimStart();
      process.stdout.write(`  [raw]    ${title}\n`);
    } else {
      process.stdout.write(`  [pandoc] ${title}\n`);
      const result = await convert({ from: 'markdown', to: 'mediawiki' }, content);
      body = result.stdout;
      if (categories.length > 0) {
        const tags = categories.map((c) => `[[Category:${c}]]`).join('\n');
        body = body.trimEnd() + '\n\n' + tags + '\n';
      }
    }

    pages.push({ title, body, model });

    for (const from of redirectFrom) {
      pages.push({ title: from, body: `#REDIRECT [[${title}]]`, model: 'wikitext' });
    }
  }

  return pages;
}
