import { chromium } from "playwright";
import { getSlot, createGrid, type GridConfig } from "./src/grid";
import { setWindowBounds } from "./src/cdp";
import { injectOverlay, updateOverlay, type OverlayStatus } from "./src/overlay";
import { detectScreen } from "./src/screen";
import { APP_MODE_FLAGS } from "./src/chrome-flags";

/**
 * Demo: simulates test lifecycle with status-colored overlays.
 * Shows browsers transitioning through running → passed/failed states.
 *
 * Usage: npx tsx demo-status.ts
 */

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const count = 6;
  const screen = detectScreen();

  const config: GridConfig = createGrid({
    preset: "six",
    gap: 4,
    screenWidth: screen.width,
    screenHeight: screen.height,
    topOffset: screen.topOffset,
  });

  const testNames = [
    "Homepage load", "Login flow", "Dashboard render",
    "Settings save", "Profile upload", "Search results",
  ];

  // Simulate test durations and outcomes
  const testOutcomes: Array<{ duration: number; status: OverlayStatus }> = [
    { duration: 2000, status: "passed" },
    { duration: 3500, status: "passed" },
    { duration: 1500, status: "failed" },
    { duration: 4000, status: "passed" },
    { duration: 2500, status: "passed" },
    { duration: 3000, status: "failed" },
  ];

  const browsers: Array<{ browser: any; page: any; slot: any; index: number }> = [];

  console.log("Launching 6 test browsers...\n");

  for (let i = 0; i < count; i++) {
    const slot = getSlot(i, config);
    const browser = await chromium.launch({
      headless: false,
      args: [...slot.launchArgs, ...APP_MODE_FLAGS],
    });
    const context = await browser.newContext({ viewport: slot.viewport });
    const page = await context.newPage();
    await setWindowBounds(page, slot.bounds);

    // Start with "running" status
    await page.setContent(`
      <body style="margin:0; background:#1a1a2e; display:flex; align-items:center; justify-content:center; height:100vh; font-family:system-ui;">
        <div style="text-align:center; color:white;">
          <div style="font-size:32px; font-weight:bold;">${testNames[i]}</div>
          <div id="status" style="font-size:18px; opacity:0.7; margin-top:12px;">Running...</div>
          <div id="progress" style="width:200px;height:4px;background:#333;border-radius:2px;margin:16px auto 0;">
            <div id="bar" style="width:0%;height:100%;background:#3b82f6;border-radius:2px;transition:width 0.1s;"></div>
          </div>
        </div>
      </body>
    `);
    await injectOverlay(page, { slot: i, testName: testNames[i], status: "running" });

    browsers.push({ browser, page, slot, index: i });
    if (i < count - 1) await sleep(150);
  }

  // Re-position
  await sleep(300);
  for (const { page, slot } of browsers) {
    await setWindowBounds(page, slot.bounds);
  }

  console.log("All browsers launched. Simulating test runs...\n");

  // Simulate tests running with progress bars
  const promises = browsers.map(async ({ page, index }) => {
    const { duration, status } = testOutcomes[index];
    const steps = 20;
    const stepDuration = duration / steps;

    for (let s = 1; s <= steps; s++) {
      await sleep(stepDuration);
      const pct = Math.round((s / steps) * 100);
      await page.evaluate(`
        document.getElementById('bar').style.width = '${pct}%';
      `).catch(() => {});
    }

    // Update to final status
    const statusText = status === "passed" ? "Passed ✓" : "Failed ✗";
    const bgColor = status === "passed" ? "#064e3b" : "#450a0a";
    const barColor = status === "passed" ? "#22c55e" : "#ef4444";

    await page.evaluate(`
      document.body.style.background = '${bgColor}';
      document.getElementById('status').textContent = '${statusText}';
      document.getElementById('bar').style.background = '${barColor}';
    `).catch(() => {});

    await updateOverlay(page, {
      slot: index,
      testName: testNames[index],
      status,
    });

    const icon = status === "passed" ? "✓" : "✗";
    console.log(`  ${icon} Slot ${index}: ${testNames[index]} — ${status} (${(duration / 1000).toFixed(1)}s)`);
  });

  await Promise.all(promises);

  const passed = testOutcomes.filter((t) => t.status === "passed").length;
  const failed = testOutcomes.filter((t) => t.status === "failed").length;
  console.log(`\n✓ ${passed} passed, ✗ ${failed} failed`);
  console.log("  Press Ctrl+C to close\n");

  await new Promise(() => {});
}

main().catch(console.error);
