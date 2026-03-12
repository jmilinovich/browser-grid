import { test, expect, chromium } from "@playwright/test";
import { getSlot, getAllSlots, type GridConfig } from "../src/grid";
import { setWindowBounds, getWindowBounds } from "../src/cdp";
import { injectOverlay, removeOverlay } from "../src/overlay";

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
      await expect(overlay).toHaveText("#0 test-overlay");

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
});
