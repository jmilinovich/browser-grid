import { chromium } from "playwright";
import { getSlot, createGrid, type GridConfig } from "../src/grid";
import { setWindowBounds } from "../src/cdp";
import { injectOverlay } from "../src/overlay";
import { detectScreen } from "../src/screen";
import { execSync } from "child_process";
import path from "path";

/**
 * Captures a screenshot of the grid demo for the README.
 * Launches browsers, waits for them to render, takes a macOS screenshot.
 *
 * Usage: npx tsx scripts/capture-demo.ts
 * Output: assets/demo.png
 */
async function main() {
  const screen = detectScreen();
  const count = 6;

  const config: GridConfig = createGrid({
    preset: "auto",
    workerCount: count,
    gap: 4,
    screenWidth: screen.width,
    screenHeight: screen.height,
    topOffset: screen.topOffset,
  });

  const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];
  const testNames = ["Homepage", "Login flow", "Dashboard", "Settings", "Profile edit", "Search"];

  console.log(`Launching ${count} browsers in ${config.cols}×${config.rows} grid...`);

  const browsers = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const slot = getSlot(i, config);
      const browser = await chromium.launch({
        headless: false,
        args: [...slot.launchArgs, "--disable-infobars"],
      });
      const page = await browser.newPage({ viewport: slot.viewport });
      await setWindowBounds(page, slot.bounds);

      await page.setContent(`
        <body style="margin:0; background:${colors[i]}; display:flex; align-items:center; justify-content:center; height:100vh; font-family:system-ui;">
          <div style="text-align:center; color:white;">
            <div style="font-size:48px; font-weight:bold;">${testNames[i]}</div>
            <div style="font-size:16px; opacity:0.7; margin-top:8px;">Worker ${i} · Running...</div>
          </div>
        </body>
      `);

      await injectOverlay(page, { slot: i, testName: testNames[i] });
      return { browser, page };
    })
  );

  // Wait for rendering
  await new Promise((r) => setTimeout(r, 2000));

  // Capture macOS screenshot
  const outPath = path.resolve(__dirname, "../assets/demo.png");
  try {
    execSync(`mkdir -p ${path.dirname(outPath)}`);
    execSync(`screencapture -x ${outPath}`);
    console.log(`✓ Screenshot saved to ${outPath}`);
  } catch {
    console.log("  (screencapture not available — take a manual screenshot)");
  }

  // Cleanup
  for (const { browser } of browsers) {
    await browser.close();
  }
}

main().catch(console.error);
