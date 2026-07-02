const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 20000,
  use: {
    baseURL: 'http://localhost:3737',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npx serve . -p 3737 -s',
    url: 'http://localhost:3737',
    reuseExistingServer: true,
    timeout: 10000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
