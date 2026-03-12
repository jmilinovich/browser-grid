import { test, expect, chromium } from "@playwright/test";
import { setWindowBounds } from "../src/cdp";
import { getSlot } from "../src/grid";

/**
 * Critical test: verify that CDP window positioning does NOT
 * override the page viewport. Downstream consumers (e.g., canva-ai-routing)
 * set specific viewports (389×798 mobile) and the grid must not touch them.
 */
test.describe("viewport preservation", () => {
  test("setWindowBounds should not change page viewport", async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 389, height: 798 }, // mobile viewport
    });
    const page = await context.newPage();
    await page.goto("about:blank");

    try {
      // Position window via CDP (much larger than viewport)
      const slot = getSlot(0, { cols: 2, rows: 1, screenWidth: 1728, screenHeight: 1117 });
      await setWindowBounds(page, slot.bounds);

      // Viewport must still be the mobile size, not the window size
      const viewport = page.viewportSize();
      expect(viewport).toEqual({ width: 389, height: 798 });
    } finally {
      await browser.close();
    }
  });

  test("viewport set in context should survive CDP positioning", async () => {
    const browser = await chromium.launch({ headless: true });

    // Simulate what canva-ai-routing does: specific viewport + grid positioning
    const context = await browser.newContext({
      viewport: { width: 389, height: 798 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto("about:blank");

    try {
      const slot = getSlot(0, { cols: 4, rows: 1, gap: 4 });
      await setWindowBounds(page, slot.bounds);

      // All mobile context settings should be preserved
      const viewport = page.viewportSize();
      expect(viewport).toEqual({ width: 389, height: 798 });
    } finally {
      await browser.close();
    }
  });
});
