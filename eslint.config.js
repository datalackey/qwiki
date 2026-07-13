import config from "@datalackey/typescript-build-config/eslint";

export default [
    ...config,
    {
        ignores: ["dist/**", "node_modules/**"],
    },
];
