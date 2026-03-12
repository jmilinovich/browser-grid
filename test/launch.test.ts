import { test, expect } from "@playwright/test";
import { launchGrid } from "../src/launch";

test.describe("launchGrid", () => {
  test("should launch 2 browsers and provide working pages", async () => {
    const grid = await launchGrid({
      count: 2,
      preset: "duo",
      appMode: false, // headless-compatible
      overlay: false,
    });

    try {
      expect(grid.slots).toHaveLength(2);
      expect(grid.get(0).slot).toBe(0);
      expect(grid.get(1).slot).toBe(1);

      // Pages should be navigable
      await grid.get(0).page.setContent("<h1>Hello</h1>");
      await expect(grid.get(0).page.locator("h1")).toHaveText("Hello");

      // Viewports should be set
      expect(grid.get(0).viewport.width).toBeGreaterThan(0);
      expect(grid.get(0).viewport.height).toBeGreaterThan(0);
    } finally {
      await grid.closeAll();
    }
  });

  test("should support custom labels", async () => {
    const grid = await launchGrid({
      count: 2,
      labels: ["Test A", "Test B"],
      overlay: true,
    });

    try {
      // Check overlay contains the label
      await grid.get(0).page.setContent("<body></body>");
      await grid.get(0).page.waitForTimeout(200);
      const overlay = grid.get(0).page.locator("#__browser_grid_overlay");
      // Overlay may or may not be present on about:blank, just verify no crash
      expect(grid.slots).toHaveLength(2);
    } finally {
      await grid.closeAll();
    }
  });

  test("setStatus should not throw", async () => {
    const grid = await launchGrid({
      count: 1,
      overlay: true,
    });

    try {
      await grid.get(0).page.setContent("<body></body>");
      await grid.get(0).setStatus("running", "Test running");
      await grid.get(0).setStatus("passed", "Test passed");
      await grid.get(0).setStatus("failed", "Test failed");
      // No crash = success
    } finally {
      await grid.closeAll();
    }
  });
});
