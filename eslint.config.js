import js from "@eslint/js"
import stylistic from "@stylistic/eslint-plugin"
import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"
import importPlugin from "eslint-plugin-import"
import globals from "globals"

export default [
  js.configs.recommended,
  {
    ignores: [
      "dist/**",
      "test/build/**",
      "test/.react-router/**",
      "node_modules/**",
      "coverage/**",
      "*.min.js",
      "*.bundle.js",
    ],
  },
  {
    plugins: {
      "@stylistic": stylistic,
      "import": importPlugin,
    },
    rules: {
      "@stylistic/semi": ["error", "never"],
      "@stylistic/quotes": ["error", "double", { "allowTemplateLiterals": "always" }],
      "@stylistic/max-len": ["error", {
        "code": 120,
        "ignoreUrls": true,
        "ignoreStrings": true,
        "ignoreTemplateLiterals": true,
        "ignoreComments": true,
      }],
      // Indentation: align continuation function parameters with the first parameter
      "@stylistic/indent": ["error", 2, {
        "SwitchCase": 1,
        "FunctionDeclaration": { "parameters": "first" },
        "FunctionExpression": { "parameters": "first" },
        "CallExpression": { "arguments": "first" },
      }],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/brace-style": ["error", "1tbs", { "allowSingleLine": true }],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/array-bracket-spacing": ["error", "never"],
      "@stylistic/arrow-parens": ["error", "as-needed"],
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/eol-last": "error",

      "import/order": ["error", {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "never",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true,
        },
      }],
      "import/no-duplicates": "error",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: true,
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // TypeScript specific stylistic rules
      "@stylistic/member-delimiter-style": ["error", {
        "multiline": {
          "delimiter": "none",
          "requireLast": true,
        },
        "singleline": {
          "delimiter": "semi",
          "requireLast": false,
        },
      }],
      "@stylistic/type-annotation-spacing": "error",
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["src/plugin/**/*", "src/server/**/*", "src/test/**/*"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@stylistic/max-len": "off",
    },
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },
]
