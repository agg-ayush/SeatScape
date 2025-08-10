// eslint.config.js
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  // Ignore generated & build artifacts
  {
    ignores: [
      "**/node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "**/*.min.js",
    ],
  },

  // Base JS recommendations
  js.configs.recommended,

  // TypeScript/React files
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      // TSX runs in both places (Next server/client), so allow both globals
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
    },
    rules: {
      // Turn off base rules that don’t understand TS
      "no-undef": "off",
      "no-unused-vars": "off",

      // TS-aware replacements
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      // React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Don’t block builds on apostrophes inside JSX text
      "react/no-unescaped-entities": "off",
    },
    settings: { react: { version: "detect" } },
  },

  // Plain JS/Node scripts and config files
  {
    files: [
      "scripts/**/*.{js,cjs,mjs}",
      "**/*.{config,scripts}.{js,cjs,mjs}",
      "**/*.config.{js,cjs,mjs}",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        console: true,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
];
