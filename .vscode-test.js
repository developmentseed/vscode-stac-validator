const { defineConfig } = require("@vscode/test-cli");

module.exports = defineConfig({
  files: "out/**/*.test.js",
  workspaceFolder: "./src/test/fixtures",
  mocha: {
    ui: "tdd",
    timeout: 20000,
  },
  version: process.env.VSCODE_TEST_VERSION || "stable",
  launchArgs: ["--disable-extensions", "--disable-gpu"],
  env: {
    DISPLAY: ":99.0",
  },
});
