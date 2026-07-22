import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectFiles, convertDir } from "../src/convert.js";
import type { Page } from "../src/convert.js";

// Minimal valid 1×1 red-pixel PNG (69 bytes), generated and verified offline.
const TINY_PNG = Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de" +
        "0000000c49444154789c63f8cfc0000003010100c9fe92ef0000000049454e44ae426082",
    "hex"
);

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

describe("collectFiles", () => {
    it("returns empty array when no files/ subdirectory exists", () => {
        const dir = fixtureDir({ "page.md": '---\ntitle: "X"\nraw: true\n---\nx\n' });
        expect(collectFiles(dir)).toEqual([]);
    });

    it("returns paths of files inside files/ using real image bytes", () => {
        const dir = fixtureDir({
            "files/logo.png": TINY_PNG.toString("binary"),
            "files/icon.png": TINY_PNG.toString("binary"),
        });
        // Write as binary (fixtureDir uses writeFileSync with string; re-write as Buffer)
        writeFileSync(join(dir, "files/logo.png"), TINY_PNG);
        writeFileSync(join(dir, "files/icon.png"), TINY_PNG);
        const files = collectFiles(dir);
        expect(files).toHaveLength(2);
        expect(files.map(f => f.split("/").at(-1)).sort()).toEqual(["icon.png", "logo.png"]);
    });

    it("skips subdirectories inside files/", () => {
        const dir = fixtureDir({});
        mkdirSync(join(dir, "files/subdir"), { recursive: true });
        writeFileSync(join(dir, "files/logo.png"), TINY_PNG);
        const files = collectFiles(dir);
        expect(files).toHaveLength(1);
        expect(files[0]).toContain("logo.png");
    });
});

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

    it("throws when title is an empty string", async () => {
        const dir = fixtureDir({ "page.md": '---\ntitle: ""\nraw: true\n---\nx\n' });
        await expect(convertDir(dir)).rejects.toThrow(/Missing required "title"/);
    });

    it("does not append category tags for raw pages", async () => {
        const dir = fixtureDir({
            "styles.md": '---\ntitle: "Common.css"\nraw: true\ncategories: [Styles]\n---\nbody { color: red; }\n',
        });
        const pages = await convertDir(dir);
        const page = byTitle(pages, "Common.css");
        expect(page.body).not.toContain("[[Category:");
        expect(page.body).toBe("body { color: red; }\n");
    });

    it("emits no redirect pages when redirect_from is empty", async () => {
        const dir = fixtureDir({
            "page.md": '---\ntitle: "Home"\nredirect_from: []\n---\nHello.\n',
        });
        const pages = await convertDir(dir);
        expect(pages).toHaveLength(1);
    });

    it("preserves QWIKI_COMMIT_LINK through pandoc — regression: __TEXT__ is bold syntax so placeholder must not use double underscores", async () => {
        const dir = fixtureDir({
            "page.md": '---\ntitle: "About"\n---\n\nDeployed from commit QWIKI_COMMIT_LINK.\n',
        });
        const pages = await convertDir(dir);
        expect(byTitle(pages, "About").body).toContain("QWIKI_COMMIT_LINK");
    });

    it("filters non-string entries out of categories", async () => {
        const dir = fixtureDir({
            "page.md": '---\ntitle: "Home"\ncategories:\n  - Docs\n  - 42\n---\nHello.\n',
        });
        const pages = await convertDir(dir);
        const page = byTitle(pages, "Home");
        expect(page.body).toContain("[[Category:Docs]]");
        expect(page.body).not.toContain("[[Category:42]]");
    });
});

describe("tagline validation", () => {
    it("throws when tagline is a single word", async () => {
        const dir = fixtureDir({
            "t.md": '---\ntitle: "X"\ntagline: "single"\nraw: true\n---\nx\n',
        });
        await expect(convertDir(dir)).rejects.toThrow(/must be 2–10/);
    });

    it("throws when tagline is empty string", async () => {
        const dir = fixtureDir({
            "t.md": '---\ntitle: "X"\ntagline: ""\nraw: true\n---\nx\n',
        });
        await expect(convertDir(dir)).rejects.toThrow(/must be 2–10/);
    });

    it("throws when tagline exceeds 10 words", async () => {
        const dir = fixtureDir({
            "t.md": '---\ntitle: "X"\ntagline: "one two three four five six seven eight nine ten eleven"\nraw: true\n---\nx\n',
        });
        await expect(convertDir(dir)).rejects.toThrow(/must be 2–10/);
    });

    it("accepts exactly 2 words", async () => {
        const dir = fixtureDir({
            "t.md": '---\ntitle: "X"\ntagline: "two words"\nraw: true\n---\nx\n',
        });
        await expect(convertDir(dir)).resolves.toBeDefined();
    });

    it("accepts exactly 10 words", async () => {
        const dir = fixtureDir({
            "t.md": '---\ntitle: "X"\ntagline: "one two three four five six seven eight nine ten"\nraw: true\n---\nx\n',
        });
        await expect(convertDir(dir)).resolves.toBeDefined();
    });

    it("pages without tagline frontmatter are not affected", async () => {
        const dir = fixtureDir({
            "t.md": '---\ntitle: "X"\nraw: true\n---\nx\n',
        });
        await expect(convertDir(dir)).resolves.toBeDefined();
    });

    it("throws when company name contains a hyphen", async () => {
        const dir = fixtureDir({
            "t.md": '---\ntitle: "Acme-Corp - great two word tool"\ntagline: "great two word tool"\nraw: true\n---\nx\n',
        });
        await expect(convertDir(dir)).rejects.toThrow(/contains a hyphen/);
    });

    it("accepts a company name with spaces but no hyphens", async () => {
        const dir = fixtureDir({
            "t.md": '---\ntitle: "Acme Corp - great two word tool"\ntagline: "great two word tool"\nraw: true\n---\nx\n',
        });
        await expect(convertDir(dir)).resolves.toBeDefined();
    });
});

describe("tagline injection", () => {
    it("inserts tagline after |company= when body has no |tagline=", async () => {
        const dir = fixtureDir({
            "t.md": '---\ntitle: "X"\ntagline: "two good words"\nraw: true\n---\n{{Tool\n|company=Acme\n|url=acme.com\n}}\n',
        });
        const pages = await convertDir(dir);
        expect(byTitle(pages, "X").body).toContain("|company=Acme\n|tagline=two good words\n");
    });

    it("replaces existing |tagline= value with frontmatter tagline", async () => {
        const dir = fixtureDir({
            "t.md": '---\ntitle: "X"\ntagline: "updated tag line"\nraw: true\n---\n{{Tool\n|company=Acme\n|tagline=old value here\n}}\n',
        });
        const pages = await convertDir(dir);
        const body = byTitle(pages, "X").body;
        expect(body).toContain("|tagline=updated tag line");
        expect(body).not.toContain("old value here");
    });
});
