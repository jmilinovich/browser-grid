/**
 * Example: how to use browser-grid in your actual Playwright test scripts.
 *
 * This shows the pattern for agent-driven testing where you want
 * visibility into N parallel browser sessions.
 */
import { chromium, Browser, Page } from "playwright";
import { getSlot, GridConfig } from "./src/index";

// Define your layout once
const GRID: GridConfig = {
  cols: 4,
  rows: 2,
  gap: 4,
  // Keep your terminal visible on the right
  reserve: { side: "right", size: 700 },
};

/**
 * Launch a browser pinned to a specific grid slot.
 */
export async function launchInSlot(slot: number): Promise<{ browser: Browser; page: Page }> {
  const s = getSlot(slot, GRID);
  const browser = await chromium.launch({
    headful: true,
    args: [...s.launchArgs, "--disable-infobars"],
  });
  const page = await browser.newPage({ viewport: s.viewport });
  return { browser, page };
}

// --- Usage in a parallel test runner ---

async function runTest(slot: number, testName: string, url: string) {
  const { browser, page } = await launchInSlot(slot);
  try {
    console.log(`[Slot ${slot}] Running: ${testName}`);
    await page.goto(url);
    // ... your test logic here ...
    await page.waitForTimeout(5000);
    console.log(`[Slot ${slot}] ✓ ${testName} passed`);
  } finally {
    await browser.close();
  }
}

async function main() {
  // Run 8 tests in parallel, each in its own grid slot
  await Promise.all([
    runTest(0, "Homepage load", "https://example.com"),
    runTest(1, "Login flow", "https://example.com"),
    runTest(2, "Dashboard render", "https://example.com"),
    runTest(3, "Settings page", "https://example.com"),
    runTest(4, "Profile edit", "https://example.com"),
    runTest(5, "Search feature", "https://example.com"),
    runTest(6, "Notifications", "https://example.com"),
    runTest(7, "Logout flow", "https://example.com"),
  ]);
}

main().catch(console.error);
