import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
  }),
  {
    ignores: [
      ".next/*",
      ".firebase/*",
      "node_modules/*",
      "public/*",
      "out/*",
      "build/*",
      "next-env.d.ts",
      "*.config.*",
      "**/*.sql",
      "**/*.log",
      "**/*.txt",
      "**/*.json",
      "docs/**",
      "scripts/**",
      "supabase/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "react/display-name": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        vars: "all",
        args: "after-used",
        ignoreRestSiblings: true,
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
      }],
      "prefer-const": "error",
      "no-var": "error",
      "no-empty": ["warn", { allowEmptyCatch: false }],
      "eqeqeq": ["error", "always", { null: "ignore" }],
    },
  },
];

export default eslintConfig;

