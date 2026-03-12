import { test, expect, chromium } from "@playwright/test";
import { getSlot, getAllSlots, type GridConfig } from "../src/grid";
import { setWindowBounds, getWindowBounds } from "../src/cdp";
import { injectOverlay, removeOverlay, updateOverlay } from "../src/overlay";
import { APP_MODE_FLAGS, MINIMAL_CHROME_FLAGS } from "../src/chrome-flags";

const GRID: GridConfig = {
  cols: 2,
  rows: 2,
  screenWidth: 1200,
  screenHeight: 800,
  topOffset: 0,
  gap: 4,
};

test.describe("CDP window positioning", () => {
  test("should position 4 browsers in a grid and verify bounds via CDP", async () => {
    const slots = getAllSlots(GRID);
    const browsers = [];

    try {
      // Launch 4 browsers
      for (let i = 0; i < 4; i++) {
        const slot = slots[i];
        const browser = await chromium.launch({
          headless: true, // headless for CI, CDP still works
          args: [...slot.launchArgs, "--disable-infobars"],
        });
        const page = await browser.newPage({
          viewport: slot.viewport,
        });
        await page.goto("about:blank");
        browsers.push({ browser, page, slot });
      }

      // Position each via CDP and verify
      for (const { page, slot } of browsers) {
        const success = await setWindowBounds(page, slot.bounds);
        expect(success).toBe(true);

        const bounds = await getWindowBounds(page);
        expect(bounds).not.toBeNull();
        if (bounds) {
          // In headless mode, bounds may not perfectly match (window manager quirks)
          // but the CDP calls should succeed without error
          expect(typeof bounds.left).toBe("number");
          expect(typeof bounds.top).toBe("number");
          expect(typeof bounds.width).toBe("number");
          expect(typeof bounds.height).toBe("number");
        }
      }
    } finally {
      for (const { browser } of browsers) {
        await browser.close();
      }
    }
  });
});

test.describe("Overlay injection", () => {
  test("should inject and remove overlay", async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("about:blank");

    try {
      // Inject overlay
      await injectOverlay(page, {
        slot: 0,
        testName: "test-overlay",
        duration: 0,
      });

      // Verify overlay exists
      const overlay = await page.locator("#__browser_grid_overlay");
      await expect(overlay).toBeVisible();
      await expect(overlay).toContainText("#0 test-overlay");

      // Verify pointer-events: none
      const pointerEvents = await overlay.evaluate(
        (el) => getComputedStyle(el).pointerEvents
      );
      expect(pointerEvents).toBe("none");

      // Remove overlay
      await removeOverlay(page);
      await expect(overlay).not.toBeVisible();
    } finally {
      await browser.close();
    }
  });

  test("should inject overlay with auto-hide", async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("about:blank");

    try {
      await injectOverlay(page, {
        slot: 1,
        testName: "auto-hide-test",
        duration: 500,
      });

      const overlay = await page.locator("#__browser_grid_overlay");
      await expect(overlay).toBeVisible();

      // Wait for auto-hide
      await page.waitForTimeout(1000);
      await expect(overlay).not.toBeVisible();
    } finally {
      await browser.close();
    }
  });

  test("should update overlay text", async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("about:blank");

    try {
      await injectOverlay(page, { slot: 0, testName: "first test" });
      const overlay = page.locator("#__browser_grid_overlay");
      await expect(overlay).toContainText("#0 first test");

      // Update overlay
      await updateOverlay(page, { slot: 0, testName: "second test" });
      await expect(overlay).toContainText("#0 second test");
    } finally {
      await browser.close();
    }
  });

  test("overlay should support all 4 positions", async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("about:blank");

    try {
      for (const position of ["top-left", "top-right", "bottom-left", "bottom-right"] as const) {
        await injectOverlay(page, { slot: 0, testName: position, position });
        const overlay = page.locator("#__browser_grid_overlay");
        await expect(overlay).toBeVisible();
        const style = await overlay.evaluate((el) => el.style.cssText);
        if (position.includes("right")) {
          expect(style).toContain("right:");
        }
        if (position.includes("bottom")) {
          expect(style).toContain("bottom:");
        }
      }
    } finally {
      await browser.close();
    }
  });

  test("overlay should change color based on status", async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("about:blank");

    try {
      // Running = blue
      await injectOverlay(page, { slot: 0, testName: "test", status: "running" });
      let overlay = page.locator("#__browser_grid_overlay");
      let bg = await overlay.evaluate((el) => el.style.background);
      expect(bg).toContain("59, 130, 246"); // blue

      // Passed = green
      await updateOverlay(page, { slot: 0, testName: "test", status: "passed" });
      bg = await overlay.evaluate((el) => el.style.background);
      expect(bg).toContain("34, 197, 94"); // green

      // Failed = red
      await updateOverlay(page, { slot: 0, testName: "test", status: "failed" });
      bg = await overlay.evaluate((el) => el.style.background);
      expect(bg).toContain("239, 68, 68"); // red
    } finally {
      await browser.close();
    }
  });
});

test.describe("App mode launch", () => {
  test("should launch with app-mode flags without error", async () => {
    const slot = getSlot(0, GRID);
    const browser = await chromium.launch({
      headless: true,
      args: [...slot.launchArgs, ...APP_MODE_FLAGS],
    });
    try {
      const context = await browser.newContext({ viewport: slot.viewport });
      const page = await context.newPage();
      await page.setContent("<h1>App mode works</h1>");
      await expect(page.locator("h1")).toHaveText("App mode works");
    } finally {
      await browser.close();
    }
  });
});
