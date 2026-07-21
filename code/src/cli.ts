#!/usr/bin/env node
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { collectFiles, convertDir } from "./convert.js";
import { deploy } from "./deploy.js";

/** Print usage and exit non-zero. */
function usage(): never {
    process.stderr.write(
        "Usage: qwiki <content-dir> --wiki <url> --user <username>\n" +
            "       Password via MW_PASSWORD env variable\n"
    );
    process.exit(1);
}

/** Parse positional content-dir and --wiki/--user flags; exits via usage() if invalid. */
function parseArgs(): { contentDir: string; wiki: string; user: string } {
    const args = process.argv.slice(2);
    const contentDir = args[0];
    if (!contentDir || contentDir.startsWith("--")) usage();

    let wiki = "";
    let user = "";
    for (let i = 1; i < args.length; i++) {
        if (args[i] === "--wiki") wiki = args[++i] ?? "";
        else if (args[i] === "--user") user = args[++i] ?? "";
    }
    if (!wiki || !user) usage();

    return { contentDir: resolve(process.cwd(), contentDir), wiki, user };
}

/** Entry point: parse args, convert the content dir, deploy to the wiki. */
async function main(): Promise<void> {
    const { contentDir, wiki, user } = parseArgs();
    const password = process.env["MW_PASSWORD"];
    if (password === undefined || password === "") {
        process.stderr.write("Error: MW_PASSWORD environment variable is not set\n");
        process.exit(1);
    }

    console.log(`==> Converting: ${contentDir}`);
    const pages = await convertDir(contentDir);
    const files = collectFiles(contentDir);
    console.log(`    ${pages.length} page(s) converted`);
    if (files.length > 0) console.log(`    ${files.length} file(s) to upload`);

    let commit = "";
    try {
        commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    } catch {
        // not in a git repo or git unavailable — skip build-commit page
    }
    if (commit) {
        pages.push({
            title: "MediaWiki:Doikayt-build-commit",
            body: commit,
            model: "wikitext",
            sourcePath: "git rev-parse HEAD",
        });
    }

    console.log(`==> Deploying to: ${wiki}`);
    await deploy(pages, { wiki, user, password }, files);

    console.log("\nDone.");
}

main().catch((err: unknown) => {
    process.stderr.write(`Error: ${String(err)}\n`);
    process.exit(1);
});
