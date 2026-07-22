import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";
import { convert } from "pandoc-wasm";

export type ContentModel = "wikitext" | "css" | "javascript";

/**
 * Produced by convertDir() from a single Markdown file; consumed by deploy().
 * - Producer: convertDir() in convert.ts
 * - Consumer: deploy() in deploy.ts (title/body/model for action=edit; sourcePath for summary)
 */
export interface Page {
    title: string;
    body: string;
    model: ContentModel;
    /** Path of the source .md file relative to the content dir, e.g. "categories/foo.md". */
    sourcePath: string;
}

/** Infer MediaWiki content model from the title suffix (.css/.js), else wikitext. */
function modelForTitle(title: string): ContentModel {
    if (title.endsWith(".css")) return "css";
    if (title.endsWith(".js")) return "javascript";
    return "wikitext";
}

/** Recursively collect every `*.md` file path under dir. */
function findMarkdownFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) results.push(...findMarkdownFiles(fullPath));
        else if (entry.name.endsWith(".md")) results.push(fullPath);
    }
    return results;
}

/**
 * Return paths of every file directly inside `<contentDir>/files/`.
 * Returns an empty array if the subdirectory does not exist.
 * Directories within `files/` are skipped.
 */
export function collectFiles(contentDir: string): string[] {
    const filesDir = join(contentDir, "files");
    if (!existsSync(filesDir)) return [];
    return readdirSync(filesDir, { withFileTypes: true })
        .filter(e => !e.isDirectory())
        .map(e => join(filesDir, e.name));
}

/**
 * Walk dir for Markdown files and turn each into one or more wiki Page(s).
 * `raw: true` frontmatter sends the body verbatim (CSS/JS/template wikitext
 * that must not go through pandoc); otherwise the body is converted
 * markdown -> mediawiki and `categories:` frontmatter is appended as
 * `[[Category:X]]` tags. Each `redirect_from:` entry produces an extra
 * `#REDIRECT [[title]]` page.
 */
export async function convertDir(dir: string): Promise<Page[]> {
    const files = findMarkdownFiles(dir);
    if (files.length === 0) throw new Error(`No .md files found under: ${dir}`);

    const pages: Page[] = [];

    for (const filePath of files) {
        const raw = readFileSync(filePath, { encoding: "utf8" });
        const { data, content } = matter(raw);

        const title = data["title"] as string | undefined;
        if (title === undefined || title === "")
            throw new Error(`Missing required "title" field in: ${filePath}`);

        const tagline = data["tagline"] as string | undefined;
        if (tagline !== undefined) {
            const wordCount = tagline.trim().split(/\s+/).filter(Boolean).length;
            if (wordCount < 2 || wordCount > 10)
                throw new Error(
                    `"tagline" in ${filePath} has ${wordCount} word(s); must be 2–10.`
                );
            const sepIdx = title.indexOf(" - ");
            if (sepIdx !== -1 && title.slice(0, sepIdx).includes("-"))
                throw new Error(
                    `Company name in ${filePath} contains a hyphen; hyphens are ` +
                    `reserved for the " - " title separator — use spaces only.`
                );
        }

        const categories: string[] = Array.isArray(data["categories"])
            ? (data["categories"] as unknown[]).filter((c): c is string => typeof c === "string")
            : [];

        const redirectFrom: string[] = Array.isArray(data["redirect_from"])
            ? (data["redirect_from"] as unknown[]).filter((r): r is string => typeof r === "string")
            : [];

        const isRaw = data["raw"] === true;
        const model = modelForTitle(title);

        let body: string;
        if (isRaw) {
            body = content.trimStart();
            if (tagline !== undefined) {
                if (/^\|tagline=/m.test(body)) {
                    body = body.replace(/^\|tagline=[^\n]*/m, `|tagline=${tagline}`);
                } else {
                    body = body.replace(/(^\|company=[^\n]*\n)/m, `$1|tagline=${tagline}\n`);
                }
            }
            process.stdout.write(`  [raw]    ${title}\n`);
        } else {
            process.stdout.write(`  [pandoc] ${title}\n`);
            const result = await convert({ from: "markdown", to: "mediawiki" }, content);
            body = result.stdout;
            if (categories.length > 0) {
                const tags = categories.map(c => `[[Category:${c}]]`).join("\n");
                body = body.trimEnd() + "\n\n" + tags + "\n";
            }
        }

        const sourcePath = relative(dir, filePath);
        pages.push({ title, body, model, sourcePath });

        for (const from of redirectFrom) {
            pages.push({ title: from, body: `#REDIRECT [[${title}]]`, model: "wikitext", sourcePath: `${sourcePath} (redirect)` });
        }
    }

    return pages;
}
