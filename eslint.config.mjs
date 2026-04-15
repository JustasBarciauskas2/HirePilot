import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: {
        rootDir: ["apps/website", "apps/portal"],
      },
    },
    rules: {
      // Valid patterns for Firebase init, layout measurement, and hydration; too noisy for this repo.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/node_modules/**",
    "**/next-env.d.ts",
    "pnpm-lock.yaml",
  ]),
]);

export default eslintConfig;
