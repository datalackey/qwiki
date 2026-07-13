import type { Page } from "./convert.js";

export interface DeployOptions {
    wiki: string;
    user: string;
    password: string;
}

class CookieJar {
    private jar = new Map<string, string>();

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

    header(): string {
        return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    }
}

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

export async function deploy(pages: Page[], opts: DeployOptions): Promise<void> {
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
