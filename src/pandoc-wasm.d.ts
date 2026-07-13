/**
 * Minimal typings for pandoc-wasm, which ships no declaration file.
 * Consumed by convert.ts; mirrors the subset of the API qwiki uses.
 */
declare module "pandoc-wasm" {
    export interface PandocResult {
        stdout: string;
        stderr: string;
    }

    export function convert(
        options: { from: string; to: string },
        input: string
    ): Promise<PandocResult>;
}
