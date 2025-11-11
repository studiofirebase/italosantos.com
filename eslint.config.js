const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: [
      "node_modules",
      ".next",
      "out",
      ".firebase",
      ".idx",
      "build",
      "dist",
      "coverage",
      "public",
      "*.config.js",
      "*.config.mjs",
      "ios-web-payments",
      ".dataconnect",
      "firebase-genkit",
      "src/firebase-genkit",
      "src/app/api/genkit",
      "src/app/api/genkit.disabled*",
      "functions",
      "dataconnect",
      "italosantos-com",
      "*.d.ts",
      "next-env.d.ts",
      "src/dataconnect-generated",
    ],
  },
  {
    files: ["**/*.{ts,tsx}", "**/*.d.ts"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      // Keep rule available to avoid "rule not found" errors; tune enforcement later
      "@typescript-eslint/no-var-requires": "warn",
    },
  },
  ...compat.extends("next/core-web-vitals"),
];
