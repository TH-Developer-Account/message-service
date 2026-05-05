import js from "@eslint/js";
import globals from "globals";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig } from "eslint/config";

export default defineConfig([
  js.configs.recommended, // ✅ this is the correct way

  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      "unused-imports": unusedImports,
    },
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "no-undef": "error",
      "no-console": "error",

      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": "error",
    },
  },
]);
