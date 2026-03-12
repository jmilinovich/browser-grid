import { launchGrid, type LaunchGridOptions, type GridSlot, type GridInstance } from "./launch";
import type { OverlayStatus } from "./overlay";

export interface TestDefinition {
  name: string;
  run: (page: GridSlot["page"], slot: GridSlot) => Promise<void>;
}

export interface RunnerOptions extends Omit<LaunchGridOptions, "count" | "labels"> {
  /** Called when a test starts */
  onTestStart?: (test: TestDefinition, slot: GridSlot) => void;
  /** Called when a test passes */
  onTestPass?: (test: TestDefinition, slot: GridSlot, durationMs: number) => void;
  /** Called when a test fails */
  onTestFail?: (test: TestDefinition, slot: GridSlot, error: Error, durationMs: number) => void;
}

export interface RunnerResult {
  passed: number;
  failed: number;
  results: Array<{
    name: string;
    status: "passed" | "failed";
    durationMs: number;
    error?: Error;
  }>;
}

/**
 * Run tests in parallel across a grid of browser windows.
 * Each test gets its own slot. All tests run simultaneously.
 *
 * ```ts
 * const result = await runParallelTests([
 *   { name: 'Homepage', run: async (page) => { await page.goto('...'); } },
 *   { name: 'Login', run: async (page) => { await page.goto('...'); } },
 * ]);
 * console.log(`${result.passed} passed, ${result.failed} failed`);
 * ```
 */
export async function runParallelTests(
  tests: TestDefinition[],
  options: RunnerOptions = {}
): Promise<RunnerResult> {
  const grid = await launchGrid({
    ...options,
    count: tests.length,
    labels: tests.map((t) => t.name),
  });

  const results: RunnerResult["results"] = [];

  try {
    await Promise.all(
      tests.map(async (test, i) => {
        const slot = grid.get(i);
        const start = Date.now();

        try {
          await slot.setStatus("running", test.name);
          options.onTestStart?.(test, slot);

          await test.run(slot.page, slot);

          const durationMs = Date.now() - start;
          await slot.setStatus("passed", `${test.name} ✓ ${(durationMs / 1000).toFixed(1)}s`);
          options.onTestPass?.(test, slot, durationMs);
          results.push({ name: test.name, status: "passed", durationMs });
        } catch (error) {
          const durationMs = Date.now() - start;
          await slot.setStatus("failed", `${test.name} ✗`);
          options.onTestFail?.(test, slot, error as Error, durationMs);
          results.push({ name: test.name, status: "failed", durationMs, error: error as Error });
        }
      })
    );
  } finally {
    // Give a moment to see the final status before closing
    await new Promise((r) => setTimeout(r, 2000));
    await grid.closeAll();
  }

  return {
    passed: results.filter((r) => r.status === "passed").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
}
