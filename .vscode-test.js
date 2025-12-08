const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig({
  files: 'out/**/*.test.js',
  workspaceFolder: './src/test/fixtures',
  mocha: {
    ui: 'tdd',
    timeout: 20000
  }
});
