import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, "../../example/wiki-content-files");

function findMarkdownFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) results.push(...findMarkdownFiles(full));
        else if (entry.name.endsWith(".md")) results.push(full);
    }
    return results;
}

describe("content integrity", () => {
    it('sidebar "New Submission" entry links to Project:New Submission', () => {
        const sidebar = readFileSync(resolve(CONTENT_DIR, "system/sidebar.md"), "utf8");
        expect(sidebar).toContain("Project:New Submission|New Submission");
    });

    it("Project:New Submission page exists with correct title", () => {
        const page = readFileSync(resolve(CONTENT_DIR, "project/add-new-tool.md"), "utf8");
        expect(page).toContain('title: "Project:New Submission"');
    });

    it('main page "Click here" link targets Project:New Submission', () => {
        const page = readFileSync(resolve(CONTENT_DIR, "main-page.md"), "utf8");
        expect(page).toContain("[[Project:New Submission|Click here]]");
    });

    it("amount regexp allows empty string — regression: blank amount showed banner with no field highlight", () => {
        const form = readFileSync(resolve(CONTENT_DIR, "templates/tool-form.md"), "utf8");
        // ^$| prefix makes empty valid so PageForms does not fire a regexp error on
        // optional blank amount; the JS pricing hook handles the conditional requirement.
        expect(form).toContain("^$|");
    });

    it("JS requires amount when pricing is not free", () => {
        const js = readFileSync(resolve(CONTENT_DIR, "system/common-js.md"), "utf8");
        expect(js).toContain('"Tool[pricing]"');
        expect(js).toContain('"Tool[amount]"');
        expect(js).toContain("!== 'free'");
    });

    it("probe() receives a full URL not a bare domain — regression: 'not-there-no-no-bad123.org' was treated as relative path", () => {
        // Bug: probe($( this ).val()) passed bare domain to fetch(); browser
        // treated it as a relative path, hit MediaWiki, always got "reachable".
        // Fix: getFullUrl() prepends protocol so fetch gets https://not-there-no-no-bad123.org
        const js = readFileSync(resolve(CONTENT_DIR, "system/common-js.md"), "utf8");
        expect(js).toContain("function getFullUrl()");
        expect(js).toContain("protocol + '://' + domain");
        expect(js).toContain("probe( getFullUrl() )");
    });

    it("every Tool page's category= matches an actual Category: page — regression: Akaunting used \"Finance & Accounting\" (with spaces) but the real page is \"Finance&Accounting\", so it silently landed in an orphaned category and never showed up in the sidebar tree", () => {
        const files = findMarkdownFiles(CONTENT_DIR);

        const categoryTitles = new Set<string>();
        for (const file of files) {
            const content = readFileSync(file, "utf8");
            const m = content.match(/^title:\s*"Category:([^"]+)"/m);
            if (m) categoryTitles.add(m[1]);
        }

        for (const file of files) {
            const content = readFileSync(file, "utf8");
            if (!content.includes("{{Tool")) continue;
            const m = content.match(/\|category=([^\n]+)/);
            expect(m, `${file}: Tool page has no |category= field`).toBeTruthy();
            const category = m![1].trim();
            expect(
                categoryTitles.has(category),
                `${file}: category "${category}" has no matching Category: page (check spacing/typos, e.g. "&" vs " & ")`
            ).toBe(true);
        }
    });
});
