import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { convertDir } from "../src/convert.js";
import type { Page } from "../src/convert.js";

const tempDirs: string[] = [];

function fixtureDir(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "qwiki-convert-test-"));
    tempDirs.push(dir);
    for (const [relPath, content] of Object.entries(files)) {
        const fullPath = join(dir, relPath);
        mkdirSync(join(fullPath, ".."), { recursive: true });
        writeFileSync(fullPath, content);
    }
    return dir;
}

afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function byTitle(pages: Page[], title: string): Page {
    const page = pages.find(p => p.title === title);
    if (page === undefined) throw new Error(`No page titled: ${title}`);
    return page;
}

describe("convertDir", () => {
    it("passes raw pages through without pandoc, trimming leading whitespace", async () => {
        const dir = fixtureDir({
            "styles.md": '---\ntitle: "Common.css"\nraw: true\n---\n\nbody { color: red; }\n',
        });
        const pages = await convertDir(dir);
        const page = byTitle(pages, "Common.css");
        expect(page.body).toBe("body { color: red; }\n");
    });

    it("converts markdown to mediawiki via pandoc", async () => {
        const dir = fixtureDir({
            "page.md": '---\ntitle: "Home"\n---\n\n# Welcome\n\nSome *emphasis* here.\n',
        });
        const pages = await convertDir(dir);
        const page = byTitle(pages, "Home");
        expect(page.body).toContain("= Welcome =");
        expect(page.body).toContain("''emphasis''");
        expect(page.model).toBe("wikitext");
    });

    it("appends category tags for the categories frontmatter list", async () => {
        const dir = fixtureDir({
            "page.md": '---\ntitle: "Home"\ncategories: [Docs, Guides]\n---\n\nHello.\n',
        });
        const pages = await convertDir(dir);
        const page = byTitle(pages, "Home");
        expect(page.body).toContain("[[Category:Docs]]\n[[Category:Guides]]");
    });

    it("emits redirect pages for redirect_from entries", async () => {
        const dir = fixtureDir({
            "page.md": '---\ntitle: "Home"\nredirect_from: [Start, Main]\n---\n\nHello.\n',
        });
        const pages = await convertDir(dir);
        expect(byTitle(pages, "Start").body).toBe("#REDIRECT [[Home]]");
        expect(byTitle(pages, "Main").body).toBe("#REDIRECT [[Home]]");
        expect(byTitle(pages, "Main").model).toBe("wikitext");
    });

    it("derives the content model from the title extension", async () => {
        const dir = fixtureDir({
            "css.md": '---\ntitle: "Common.css"\nraw: true\n---\nx\n',
            "js.md": '---\ntitle: "Common.js"\nraw: true\n---\nx\n',
            "text.md": '---\ntitle: "Plain"\nraw: true\n---\nx\n',
        });
        const pages = await convertDir(dir);
        expect(byTitle(pages, "Common.css").model).toBe("css");
        expect(byTitle(pages, "Common.js").model).toBe("javascript");
        expect(byTitle(pages, "Plain").model).toBe("wikitext");
    });

    it("finds markdown files in nested directories and ignores other files", async () => {
        const dir = fixtureDir({
            "top.md": '---\ntitle: "Top"\nraw: true\n---\nx\n',
            "sub/deep.md": '---\ntitle: "Deep"\nraw: true\n---\nx\n',
            "sub/ignored.txt": "not markdown",
        });
        const pages = await convertDir(dir);
        expect(pages.map(p => p.title).sort()).toEqual(["Deep", "Top"]);
    });

    it("throws when a page has no title", async () => {
        const dir = fixtureDir({ "page.md": "---\nraw: true\n---\nx\n" });
        await expect(convertDir(dir)).rejects.toThrow(/Missing required "title"/);
    });

    it("throws when no markdown files exist", async () => {
        const dir = fixtureDir({ "readme.txt": "nothing here" });
        await expect(convertDir(dir)).rejects.toThrow(/No \.md files found/);
    });
});
