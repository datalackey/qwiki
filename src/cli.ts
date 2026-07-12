#!/usr/bin/env node
import { resolve } from "node:path";
import { convertDir } from "./convert.ts";
import { deploy } from "./deploy.ts";

function usage(): never {
    process.stderr.write(
        "Usage: md2wiki <content-dir> --wiki <url> --user <username>\n" +
            "       Password via MW_PASSWORD env variable\n"
    );
    process.exit(1);
}

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

async function main(): Promise<void> {
    const { contentDir, wiki, user } = parseArgs();
    const password = process.env["MW_PASSWORD"];
    if (!password) {
        process.stderr.write("Error: MW_PASSWORD environment variable is not set\n");
        process.exit(1);
    }

    console.log(`==> Converting: ${contentDir}`);
    const pages = await convertDir(contentDir);
    console.log(`    ${pages.length} page(s) converted`);

    console.log(`==> Deploying to: ${wiki}`);
    await deploy(pages, { wiki, user, password });

    console.log("\nDone.");
}

main().catch((err: unknown) => {
    process.stderr.write(`Error: ${String(err)}\n`);
    process.exit(1);
});
