import { test, expect } from "@playwright/test";
import { runParallelTests, type TestDefinition } from "../src/runner";

test.describe("runParallelTests", () => {
  test("should run tests in parallel and report results", async () => {
    const tests: TestDefinition[] = [
      {
        name: "passing test",
        run: async (page) => {
          await page.setContent("<h1>Hello</h1>");
          const text = await page.locator("h1").textContent();
          if (text !== "Hello") throw new Error("Unexpected text");
        },
      },
      {
        name: "another passing test",
        run: async (page) => {
          await page.setContent("<p>World</p>");
        },
      },
    ];

    const result = await runParallelTests(tests, { appMode: false });

    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].status).toBe("passed");
    expect(result.results[1].status).toBe("passed");
    expect(result.results[0].durationMs).toBeGreaterThan(0);
  });

  test("should report failed tests without throwing", async () => {
    const tests: TestDefinition[] = [
      {
        name: "failing test",
        run: async () => {
          throw new Error("intentional failure");
        },
      },
      {
        name: "passing test",
        run: async (page) => {
          await page.setContent("<h1>OK</h1>");
        },
      },
    ];

    const result = await runParallelTests(tests, { appMode: false });

    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results.find(r => r.name === "failing test")?.status).toBe("failed");
    expect(result.results.find(r => r.name === "failing test")?.error).toBeDefined();
    expect(result.results.find(r => r.name === "passing test")?.status).toBe("passed");
  });

  test("should call lifecycle callbacks", async () => {
    const events: string[] = [];

    const tests: TestDefinition[] = [
      {
        name: "callback test",
        run: async (page) => {
          await page.setContent("<h1>Done</h1>");
        },
      },
    ];

    await runParallelTests(tests, {
      appMode: false,
      onTestStart: (t) => events.push(`start:${t.name}`),
      onTestPass: (t) => events.push(`pass:${t.name}`),
      onTestFail: (t) => events.push(`fail:${t.name}`),
    });

    expect(events).toContain("start:callback test");
    expect(events).toContain("pass:callback test");
    expect(events).not.toContain("fail:callback test");
  });
});
