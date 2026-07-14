import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, "../../infra/scripts/ensure-extensions.sh");

// Fake git lines — written as an array to avoid template-literal escaping of $ and \
const FAKE_GIT_LINES = [
  "#!/usr/bin/env bash",
  'echo "$*" >> "${GIT_CALL_LOG:?}"',
  'args=("$@")',
  "i=0",
  "subcommand=",
  "while [[ $i -lt ${#args[@]} ]]; do",
  '  if [[ "${args[$i]}" == "-C" ]]; then i=$((i+2)); continue; fi',
  '  subcommand="${args[$i]}"',
  "  break",
  "done",
  'case "$subcommand" in',
  '  ls-remote) printf "%s\\n" "${FAKE_LS_REMOTE_OUTPUT:-}" ;;',
  '  rev-parse) printf "%s\\n" "${FAKE_REV_PARSE_BRANCH:-}" ;;',
  '  clone) mkdir -p "${args[-1]}" ;;',
  "esac",
].join("\n");

interface TestEnv {
  infraDir: string;
  tempDir: string;
  callLog: string;
  processEnv: NodeJS.ProcessEnv;
}

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeEnv(options: {
  imageTag: string;
  preCreateExtensions?: boolean;
  lsRemoteOutput?: string;
  revParseBranch?: string;
}): TestEnv {
  const tempDir = mkdtempSync(join(tmpdir(), "qwiki-ext-test-"));
  tempDirs.push(tempDir);

  const infraDir = join(tempDir, "infra");
  const binDir = join(tempDir, "bin");
  const callLog = join(tempDir, "git-calls.log");

  mkdirSync(infraDir, { recursive: true });
  mkdirSync(binDir, { recursive: true });

  writeFileSync(
    join(infraDir, "docker-compose.yml"),
    `name: qwiki\nservices:\n  mediawiki:\n    image: ${options.imageTag}\n`,
  );

  if (options.preCreateExtensions) {
    mkdirSync(join(infraDir, "extensions", "PageForms"), { recursive: true });
    mkdirSync(join(infraDir, "extensions", "Cargo"), { recursive: true });
  }

  const fakePath = join(binDir, "git");
  writeFileSync(fakePath, FAKE_GIT_LINES);
  chmodSync(fakePath, 0o755);

  const processEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${binDir}:${process.env["PATH"] ?? ""}`,
    GIT_CALL_LOG: callLog,
    INFRA_DIR_OVERRIDE: infraDir,
    FAKE_LS_REMOTE_OUTPUT: options.lsRemoteOutput ?? "",
    FAKE_REV_PARSE_BRANCH: options.revParseBranch ?? "",
  };

  return { infraDir, tempDir, callLog, processEnv };
}

function gitCalls(env: TestEnv): string {
  return existsSync(env.callLog) ? readFileSync(env.callLog, "utf8") : "";
}

function run(env: TestEnv) {
  return spawnSync("bash", [SCRIPT], { env: env.processEnv, encoding: "utf8" });
}

describe("ensure-extensions.sh", () => {
  it("exits 1 when image tag is not pinned", () => {
    const env = makeEnv({ imageTag: "mediawiki" });
    const result = run(env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("not version-pinned");
    expect(gitCalls(env)).toBe("");
  });

  it("exits 1 when extension branch is missing on remote", () => {
    const env = makeEnv({ imageTag: "mediawiki:1.46", lsRemoteOutput: "" });
    const result = run(env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("REL1_46");
    expect(result.stderr).toContain("PageForms");
    expect(result.stderr).toContain("https://www.mediawiki.org/wiki/Extension:PageForms");
    expect(gitCalls(env)).toContain("ls-remote");
    expect(gitCalls(env)).not.toContain("clone");
  });

  it("exits 1 when cloned extension is on wrong branch", () => {
    const env = makeEnv({
      imageTag: "mediawiki:1.46",
      preCreateExtensions: true,
      revParseBranch: "REL1_41",
    });
    const result = run(env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("PageForms");
    expect(result.stderr).toContain("REL1_41");
    expect(result.stderr).toContain("REL1_46");
    expect(gitCalls(env)).toContain("rev-parse");
    expect(gitCalls(env)).not.toContain("clone");
  });

  it("exits 0 and clones both extensions on a fresh setup", () => {
    const env = makeEnv({
      imageTag: "mediawiki:1.46",
      lsRemoteOutput: "abc123\trefs/heads/REL1_46",
    });
    const result = run(env);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Cloning PageForms");
    expect(result.stdout).toContain("Cloning Cargo");
    expect(result.stdout).toContain("Extensions ready");
    const calls = gitCalls(env);
    expect(calls).toContain("ls-remote");
    expect(calls).toContain("clone");
    expect(existsSync(join(env.infraDir, "extensions", "PageForms"))).toBe(true);
    expect(existsSync(join(env.infraDir, "extensions", "Cargo"))).toBe(true);
  });

  it("exits 0 and skips both extensions when already cloned on correct branch", () => {
    const env = makeEnv({
      imageTag: "mediawiki:1.46",
      preCreateExtensions: true,
      revParseBranch: "REL1_46",
    });
    const result = run(env);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("skipping");
    const calls = gitCalls(env);
    expect(calls).toContain("rev-parse");
    expect(calls).not.toContain("ls-remote");
    expect(calls).not.toContain("clone");
  });
});
