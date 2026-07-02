module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2020, sourceType: "module" },
  env: { node: true, browser: true },
  extends: ["eslint:recommended"],
  ignorePatterns: ["node_modules", "out", ".remotion", "src/data/conversation.json"],
};
