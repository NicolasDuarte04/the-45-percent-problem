import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // cp-08: the v2 design package ships Babel-standalone JSX (loaded
    // by Onboarding v2.html in a browser via @babel/standalone). Not
    // real TSX, not transpiled by Next.js, never imported from src/.
    // Reference material only; lint would otherwise flag the JSX as
    // invalid because the runtime hooks are window-injected.
    "design-output/**",
  ]),
]);

export default eslintConfig;
