import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deploy } from "../src/deploy.js";
import type { DeployOptions } from "../src/deploy.js";
import type { Page } from "../src/convert.js";

// Same minimal 1×1 red-pixel PNG used in convert.test.ts
const TINY_PNG = Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de" +
        "0000000c49444154789c63f8cfc0000003010100c9fe92ef0000000049454e44ae426082",
    "hex"
);

const tempDirs: string[] = [];

function tmpPng(name: string): string {
    const dir = mkdtempSync(join(tmpdir(), "qwiki-deploy-test-"));
    tempDirs.push(dir);
    const path = join(dir, name);
    writeFileSync(path, TINY_PNG);
    return path;
}

/** Minimal Response stand-in: only the surface area deploy() actually touches. */
function mockResponse(body: unknown, cookies: string[] = []) {
    return {
        json: () => Promise.resolve(body),
        headers: { getSetCookie: () => cookies },
    } as unknown as Response;
}

const WIKI = "http://wiki.test";
const OPTS: DeployOptions = { wiki: WIKI, user: "Admin", password: "pass" };

const LOGIN_TOKEN_RES = mockResponse(
    { query: { tokens: { logintoken: "LTOK" } } },
    ["mwsession=SESS; Path=/; HttpOnly"]
);
const LOGIN_PASS_RES = mockResponse({ clientlogin: { status: "PASS" } });
const CSRF_RES = mockResponse({ query: { tokens: { csrftoken: "CSRF" } } });
const EDIT_RES = mockResponse({ edit: { result: "Success" } });
const UPLOAD_RES = mockResponse({ upload: { result: "Success" } });

function setupHappyPath() {
    const mock = vi
        .fn()
        .mockResolvedValueOnce(LOGIN_TOKEN_RES)
        .mockResolvedValueOnce(LOGIN_PASS_RES)
        .mockResolvedValueOnce(CSRF_RES)
        .mockResolvedValue(EDIT_RES);
    vi.stubGlobal("fetch", mock);
    return mock;
}

function setupWithUpload() {
    const mock = vi
        .fn()
        .mockResolvedValueOnce(LOGIN_TOKEN_RES)
        .mockResolvedValueOnce(LOGIN_PASS_RES)
        .mockResolvedValueOnce(CSRF_RES)
        .mockResolvedValueOnce(UPLOAD_RES)
        .mockResolvedValue(EDIT_RES);
    vi.stubGlobal("fetch", mock);
    return mock;
}

afterEach(() => {
    vi.unstubAllGlobals();
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("deploy", () => {
    it("throws on login failure", async () => {
        const mock = vi
            .fn()
            .mockResolvedValueOnce(
                mockResponse({ query: { tokens: { logintoken: "LTOK" } } })
            )
            .mockResolvedValueOnce(mockResponse({ clientlogin: { status: "FAILED" } }));
        vi.stubGlobal("fetch", mock);

        const page: Page = { title: "Home", body: "Hello", model: "wikitext" };
        await expect(deploy([page], OPTS)).rejects.toThrow("Login failed: FAILED");
    });

    it("calls the MW API in the correct order with correct params", async () => {
        const mock = setupHappyPath();
        const page: Page = { title: "Home", body: "Hello", model: "wikitext" };
        await deploy([page], OPTS);

        expect(mock).toHaveBeenCalledTimes(4);

        // 1. Login token GET
        const [url1] = mock.mock.calls[0] as [string, RequestInit];
        const qs1 = new URL(url1).searchParams;
        expect(qs1.get("action")).toBe("query");
        expect(qs1.get("type")).toBe("login");

        // 2. clientlogin POST
        const [, init2] = mock.mock.calls[1] as [string, RequestInit];
        const body2 = new URLSearchParams(init2.body as string);
        expect(body2.get("action")).toBe("clientlogin");
        expect(body2.get("logintoken")).toBe("LTOK");
        expect(body2.get("username")).toBe("Admin");
        expect(body2.get("password")).toBe("pass");

        // 3. CSRF token GET
        const [url3] = mock.mock.calls[2] as [string, RequestInit];
        const qs3 = new URL(url3).searchParams;
        expect(qs3.get("action")).toBe("query");
        expect(qs3.get("meta")).toBe("tokens");

        // 4. edit POST
        const [, init4] = mock.mock.calls[3] as [string, RequestInit];
        const body4 = new URLSearchParams(init4.body as string);
        expect(body4.get("action")).toBe("edit");
        expect(body4.get("title")).toBe("Home");
        expect(body4.get("text")).toBe("Hello");
        expect(body4.get("token")).toBe("CSRF");
        expect(body4.get("contentmodel")).toBeNull();
    });

    it("includes contentmodel param for non-wikitext pages", async () => {
        const mock = setupHappyPath();
        await deploy([{ title: "Common.css", body: "body{}", model: "css" }], OPTS);

        const [, init] = mock.mock.calls[3] as [string, RequestInit];
        expect(new URLSearchParams(init.body as string).get("contentmodel")).toBe("css");
    });

    it("omits contentmodel param for wikitext pages", async () => {
        const mock = setupHappyPath();
        await deploy([{ title: "Home", body: "Hello", model: "wikitext" }], OPTS);

        const [, init] = mock.mock.calls[3] as [string, RequestInit];
        expect(new URLSearchParams(init.body as string).get("contentmodel")).toBeNull();
    });

    it("threads cookies set by login-token response into all subsequent requests", async () => {
        const mock = setupHappyPath();
        await deploy([{ title: "Home", body: "Hello", model: "wikitext" }], OPTS);

        for (const [, init] of mock.mock.calls.slice(1) as [string, RequestInit][]) {
            expect((init.headers as Record<string, string>)["Cookie"]).toContain("mwsession=SESS");
        }
    });

    it("sends one edit POST per page", async () => {
        const mock = setupHappyPath();
        const pages: Page[] = [
            { title: "A", body: "a", model: "wikitext" },
            { title: "B", body: "b", model: "wikitext" },
            { title: "C", body: "c", model: "wikitext" },
        ];
        await deploy(pages, OPTS);

        // 3 setup calls (login-token, clientlogin, csrf) + 3 edit calls
        expect(mock).toHaveBeenCalledTimes(6);
    });

    it("runs edits with real concurrency, capped at EDIT_CONCURRENCY (5)", async () => {
        let inFlight = 0;
        let maxInFlight = 0;
        const totalPages = 12;

        const mock = vi
            .fn()
            .mockResolvedValueOnce(LOGIN_TOKEN_RES)
            .mockResolvedValueOnce(LOGIN_PASS_RES)
            .mockResolvedValueOnce(CSRF_RES)
            .mockImplementation(async (url: string) => {
                // Only edit POSTs (api.php with a body, not the setup GETs) count.
                if (!url.endsWith("/api.php")) return CSRF_RES;
                inFlight++;
                maxInFlight = Math.max(maxInFlight, inFlight);
                await new Promise(r => setTimeout(r, 5));
                inFlight--;
                return EDIT_RES;
            });
        vi.stubGlobal("fetch", mock);

        const pages: Page[] = Array.from({ length: totalPages }, (_, i) => ({
            title: `Page${i}`,
            body: "x",
            model: "wikitext" as const,
        }));
        await deploy(pages, OPTS);

        expect(maxInFlight).toBe(5);
        // 3 setup calls + 12 edit calls
        expect(mock).toHaveBeenCalledTimes(3 + totalPages);
    });

    it("uploads a real PNG file with correct FormData fields", async () => {
        const mock = setupWithUpload();
        const logoPath = tmpPng("logo.png");
        const page: Page = { title: "Home", body: "Hello", model: "wikitext" };
        await deploy([page], OPTS, [logoPath]);

        // 4th call (index 3) is the upload POST
        const [url, init] = mock.mock.calls[3] as [string, RequestInit];
        expect(url).toBe(`${WIKI}/api.php`);
        const form = init.body as FormData;
        expect(form.get("action")).toBe("upload");
        expect(form.get("filename")).toBe("logo.png");
        expect(form.get("token")).toBe("CSRF");
        expect(form.get("ignorewarnings")).toBe("1");
        const blob = form.get("file") as Blob;
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.size).toBe(TINY_PNG.length);
        // Verify the bytes are the actual PNG (starts with PNG signature)
        const uploaded = Buffer.from(await blob.arrayBuffer());
        expect(uploaded.slice(0, 8)).toEqual(TINY_PNG.slice(0, 8));
    });

    it("uploads before editing pages so images are available when pages are written", async () => {
        const mock = setupWithUpload();
        const logoPath = tmpPng("logo.png");
        const page: Page = { title: "Home", body: "Hello", model: "wikitext" };
        await deploy([page], OPTS, [logoPath]);

        // 5 calls: login-token, clientlogin, csrf, upload, edit
        expect(mock).toHaveBeenCalledTimes(5);
        const uploadBody = (mock.mock.calls[3] as [string, RequestInit])[1].body as FormData;
        const editBody = new URLSearchParams(
            (mock.mock.calls[4] as [string, RequestInit])[1].body as string
        );
        expect(uploadBody.get("action")).toBe("upload");
        expect(editBody.get("action")).toBe("edit");
    });
});
