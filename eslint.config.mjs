import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "scratch/**",
    "migrate.js",
    "run_all_migrations.js",
    "run_my_migrations.js",
    "run_remaining_migrations.js",
    "scripts/**/*.js",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
