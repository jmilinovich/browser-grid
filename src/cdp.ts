import type { Page } from "@playwright/test";

export interface WindowBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Set browser window bounds using CDP.
 * Only works with Chromium-based browsers.
 * Falls back gracefully if CDP is unavailable.
 */
export async function setWindowBounds(
  page: Page,
  bounds: WindowBounds
): Promise<boolean> {
  try {
    const session = await page.context().newCDPSession(page);
    const { windowId } = await session.send("Browser.getWindowForTarget");
    await session.send("Browser.setWindowBounds", {
      windowId,
      bounds: {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        windowState: "normal",
      },
    });
    await session.detach();
    return true;
  } catch (error) {
    // CDP not available (e.g., Firefox, WebKit) — fail silently
    // The launch args fallback should still position the window approximately
    if (
      process.env.BROWSER_GRID_DEBUG ||
      process.env.DEBUG?.includes("browser-grid")
    ) {
      console.warn(
        `[browser-grid] CDP setWindowBounds failed (expected for non-Chromium):`,
        (error as Error).message
      );
    }
    return false;
  }
}

/**
 * Get current browser window bounds using CDP.
 * Only works with Chromium-based browsers.
 * Returns null if CDP is unavailable.
 */
export async function getWindowBounds(
  page: Page
): Promise<WindowBounds | null> {
  try {
    const session = await page.context().newCDPSession(page);
    const { windowId } = await session.send("Browser.getWindowForTarget");
    const result = await session.send("Browser.getWindowBounds", { windowId });
    await session.detach();
    const { left, top, width, height } = result.bounds;
    return {
      left: left ?? 0,
      top: top ?? 0,
      width: width ?? 0,
      height: height ?? 0,
    };
  } catch (error) {
    if (
      process.env.BROWSER_GRID_DEBUG ||
      process.env.DEBUG?.includes("browser-grid")
    ) {
      console.warn(
        `[browser-grid] CDP getWindowBounds failed:`,
        (error as Error).message
      );
    }
    return null;
  }
}
