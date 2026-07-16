import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, "../../example/wiki-content-files");

describe("content integrity", () => {
    it('sidebar "Add new tool" entry links to Project:Add New Tool', () => {
        const sidebar = readFileSync(resolve(CONTENT_DIR, "system/sidebar.md"), "utf8");
        expect(sidebar).toContain("Project:Add New Tool|Add new tool");
    });

    it("Project:Add New Tool page exists with correct title", () => {
        const page = readFileSync(resolve(CONTENT_DIR, "project/add-new-tool.md"), "utf8");
        expect(page).toContain('title: "Project:Add New Tool"');
    });

    it('main page "Click here" link targets Project:Add New Tool', () => {
        const page = readFileSync(resolve(CONTENT_DIR, "main-page.md"), "utf8");
        expect(page).toContain("[[Project:Add New Tool|Click here]]");
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
});
