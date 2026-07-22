import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, "../../example/wiki-content-files");

/**
 * common-js.md is shipped verbatim to MediaWiki:Common.js (raw: true content
 * model), not imported as a module, so its functions aren't reachable via
 * `import`. Extract firstParagraph()'s source by brace-matching and eval it,
 * so the test exercises the exact code that ships, not a re-implementation.
 */
function extractFunction(source: string, name: string): string {
    const marker = `function ${name}(`;
    const start = source.indexOf(marker);
    if (start === -1) throw new Error(`function ${name} not found in common-js.md`);
    const braceStart = source.indexOf("{", start);
    let depth = 0;
    let i = braceStart;
    for (; i < source.length; i++) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}") {
            depth--;
            if (depth === 0) {
                i++;
                break;
            }
        }
    }
    return source.slice(start, i);
}

function loadFirstParagraph(): (wikitext: string) => string {
    const js = readFileSync(resolve(CONTENT_DIR, "system/common-js.md"), "utf8");
    const fnSource = extractFunction(js, "firstParagraph");
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = new Function(`${fnSource}\nreturn firstParagraph;`);
    return factory();
}

describe("sidebar category tooltip: firstParagraph()", () => {
    it("skips pandoc's header-anchor span and returns the description — regression: category tooltips showed literal <span id=...> instead of text", () => {
        // Actual output of convertDir()'s pandoc markdown->mediawiki step (code/src/convert.ts)
        // for a category page like example/wiki-content-files/categories/web-site.md.
        const wikitext =
            '<span id="web-site"></span>\n' +
            "= Web Site =\n" +
            "\n" +
            "Tools for web site content creation and administration (excludes hosting platforms).\n";

        const firstParagraph = loadFirstParagraph();

        expect(firstParagraph(wikitext)).toBe(
            "Tools for web site content creation and administration (excludes hosting platforms)."
        );
    });

    it("de-links [[wiki links]] in the extracted description", () => {
        const wikitext = "= Title =\n\nSee [[Category:Foo|Foo]] for details.\n";
        const firstParagraph = loadFirstParagraph();
        expect(firstParagraph(wikitext)).toBe("See Foo for details.");
    });
});
