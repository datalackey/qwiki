import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["code/tests/**/*.test.ts"],
    },
});
