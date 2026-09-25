import {
  defineConfig,
} from "@playwright/test";

export default defineConfig({
  testDir:
    "./e2e/lab-03",

  fullyParallel: false,

  workers: 1,

  timeout: 60_000,

  expect: {
    timeout: 10_000,
  },

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder:
          "playwright-report",

        open: "never",
      },
    ],
  ],

  use: {
    baseURL:
      "http://localhost:5173",

    trace:
      "on-first-retry",

    screenshot:
      "only-on-failure",

    video:
      "retain-on-failure",
  },

  webServer: [
    {
      command:
        "npm run dev",

      cwd:
        "./server",

      url:
        "http://127.0.0.1:3000/api/health",

      reuseExistingServer:
        true,

      timeout:
        120_000,
    },

    {
      command:
        "npm run dev -- --host localhost",

      cwd:
        "./client",

      url:
        "http://localhost:5173",

      reuseExistingServer:
        true,

      timeout:
        120_000,
    },
  ],
});
