import { runParallelTests } from "./src/runner";

/**
 * Demo: run 6 parallel "tests" with the runner API.
 * Usage: npx tsx demo-runner.ts
 */
async function main() {
  const result = await runParallelTests(
    [
      {
        name: "GitHub loads",
        run: async (page) => {
          await page.goto("https://github.com");
          if (!(await page.title()).includes("GitHub")) throw new Error("Wrong title");
        },
      },
      {
        name: "NPM loads",
        run: async (page) => {
          await page.goto("https://www.npmjs.com/package/browser-grid");
          await page.locator("h2, h3").first().waitFor({ timeout: 10000 });
        },
      },
      {
        name: "Example.com",
        run: async (page) => {
          await page.goto("https://example.com");
          await page.locator("h1").waitFor();
        },
      },
      {
        name: "HN loads",
        run: async (page) => {
          await page.goto("https://news.ycombinator.com");
          await page.locator(".storylink, .titleline").first().waitFor();
        },
      },
      {
        name: "MDN Docs",
        run: async (page) => {
          await page.goto("https://developer.mozilla.org");
          await page.locator("header").first().waitFor({ timeout: 10000 });
        },
      },
      {
        name: "Intentional fail",
        run: async (page) => {
          await page.goto("https://example.com");
          // Fail on purpose to show red overlay
          throw new Error("Assertion failed: expected 'Foo' but got 'Example Domain'");
        },
      },
    ],
    {
      gap: 4,
      preset: "six",
      onTestStart: (test) => console.log(`  ▶ ${test.name}`),
      onTestPass: (test, _, ms) => console.log(`  ✓ ${test.name} (${(ms / 1000).toFixed(1)}s)`),
      onTestFail: (test, _, err, ms) => console.log(`  ✗ ${test.name} (${(ms / 1000).toFixed(1)}s): ${err.message.slice(0, 60)}`),
    }
  );

  console.log(`\nResults: ${result.passed} passed, ${result.failed} failed`);
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch(console.error);
