import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { Page } from "./convert.js";

/** Produced by cli.ts from parsed CLI args; consumed by deploy(). */
export interface DeployOptions {
    wiki: string;
    user: string;
    password: string;
}

/**
 * Session cookie store for the MediaWiki API. MediaWiki ties both the login
 * handshake and the resulting authenticated session to cookies, so every
 * request in deploy() must reuse the same jar in sequence.
 */
class CookieJar {
    private jar = new Map<string, string>();

    /** Merge any Set-Cookie headers from a response into the jar. */
    absorb(res: Response): void {
        const getAll = (res.headers as Headers & { getSetCookie?(): string[] }).getSetCookie;
        const raw: string[] =
            typeof getAll === "function"
                ? getAll.call(res.headers)
                : (res.headers.get("set-cookie") ?? "").split(/,(?=\s*\w+=)/).filter(Boolean);
        for (const c of raw) {
            const semi = c.indexOf(";");
            const pair = semi === -1 ? c : c.slice(0, semi);
            const eq = pair.indexOf("=");
            if (eq === -1) continue;
            this.jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
        }
    }

    /** Serialize the jar as a `Cookie:` request header value. */
    header(): string {
        return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    }
}

/** GET `<wiki>/api.php` with the given query params, forcing JSON output. */
async function apiGet(
    wiki: string,
    jar: CookieJar,
    params: Record<string, string>
): Promise<Record<string, unknown>> {
    const qs = new URLSearchParams({ ...params, format: "json" });
    const res = await fetch(`${wiki}/api.php?${qs}`, {
        headers: { Cookie: jar.header() },
    });
    jar.absorb(res);
    return res.json() as Promise<Record<string, unknown>>;
}

/** POST `<wiki>/api.php` with the given form params, forcing JSON output. */
async function apiPost(
    wiki: string,
    jar: CookieJar,
    params: Record<string, string>
): Promise<Record<string, unknown>> {
    const body = new URLSearchParams({ ...params, format: "json" });
    const res = await fetch(`${wiki}/api.php`, {
        method: "POST",
        headers: { Cookie: jar.header(), "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });
    jar.absorb(res);
    return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Upload a single file to the wiki via `action=upload` (multipart/form-data).
 * `ignorewarnings=1` suppresses duplicate/exists warnings so re-runs are idempotent.
 */
async function uploadFile(wiki: string, jar: CookieJar, csrf: string, filePath: string): Promise<void> {
    const filename = basename(filePath);
    const form = new FormData();
    form.append("action", "upload");
    form.append("filename", filename);
    form.append("token", csrf);
    form.append("ignorewarnings", "1");
    form.append("format", "json");
    form.append("file", new Blob([readFileSync(filePath)]), filename);

    const res = await fetch(`${wiki}/api.php`, {
        method: "POST",
        headers: { Cookie: jar.header() },
        body: form,
    });
    jar.absorb(res);
    const data = (await res.json()) as Record<string, unknown>;
    const upload = data["upload"] as Record<string, string> | undefined;
    const err = data["error"] as Record<string, string> | undefined;
    const result = upload?.["result"] ?? err?.["code"] ?? "unknown";
    process.stdout.write(`  [upload] ${filename}: ${result}\n`);
}

/**
 * Authenticate against the MediaWiki Action API and write every page via
 * `action=edit` - the same call a human edit through the wiki UI produces.
 * Sequence: fetch a login token, clientlogin, fetch a CSRF token, then one
 * edit POST per page (idempotent - re-running overwrites with current content).
 */
export async function deploy(pages: Page[], opts: DeployOptions, files: string[] = []): Promise<void> {
    const { wiki, user, password } = opts;
    const jar = new CookieJar();

    // Login
    const loginTokenRes = await apiGet(wiki, jar, {
        action: "query",
        meta: "tokens",
        type: "login",
    });
    const loginToken = (loginTokenRes["query"] as Record<string, Record<string, string>>)["tokens"][
        "logintoken"
    ];

    const loginRes = await apiPost(wiki, jar, {
        action: "clientlogin",
        username: user,
        password,
        logintoken: loginToken,
        loginreturnurl: wiki,
    });
    const loginStatus = (loginRes["clientlogin"] as Record<string, string>)["status"];
    if (loginStatus !== "PASS") {
        throw new Error(`Login failed: ${loginStatus}`);
    }
    process.stdout.write(`  Login: ${loginStatus}\n`);

    // CSRF token
    const csrfRes = await apiGet(wiki, jar, { action: "query", meta: "tokens" });
    const csrf = (csrfRes["query"] as Record<string, Record<string, string>>)["tokens"][
        "csrftoken"
    ];

    // Upload files
    for (const filePath of files) {
        await uploadFile(wiki, jar, csrf, filePath);
    }

    // Edit pages
    for (const page of pages) {
        const params: Record<string, string> = {
            action: "edit",
            title: page.title,
            text: page.body,
            token: csrf,
        };
        if (page.model !== "wikitext") params["contentmodel"] = page.model;

        const res = await apiPost(wiki, jar, params);
        const edit = res["edit"] as Record<string, string> | undefined;
        const err = res["error"] as Record<string, string> | undefined;
        const result = edit?.["result"] ?? err?.["code"] ?? "unknown";
        process.stdout.write(`  ${page.title}: ${result}\n`);
    }
}
