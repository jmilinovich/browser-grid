import { chromium } from "playwright";
import { getSlot, createGrid, type GridConfig } from "./src/grid";
import { setWindowBounds } from "./src/cdp";
import { injectOverlay } from "./src/overlay";
import { detectScreen } from "./src/screen";

/**
 * Demo: opens browsers in a grid, showcasing CDP positioning + overlays.
 *
 * Usage:
 *   npx tsx demo.ts              # 2x2 grid (4 browsers)
 *   npx tsx demo.ts 8            # 4x2 grid (8 browsers)
 *   npx tsx demo.ts 4 right 700  # 2x2 grid, reserve 700px on the right
 */
async function main() {
  const count = parseInt(process.argv[2] || "4", 10);
  const reserveSide = process.argv[3] as "left" | "right" | undefined;
  const reserveSize = parseInt(process.argv[4] || "0", 10);

  const screen = detectScreen();
  console.log(`Screen: ${screen.width}×${screen.height} (top offset: ${screen.topOffset})`);

  const config: GridConfig = createGrid({
    preset: "auto",
    workerCount: count,
    gap: 4,
    screenWidth: screen.width,
    screenHeight: screen.height,
    topOffset: screen.topOffset,
    ...(reserveSide && reserveSize > 0 && {
      reserve: { side: reserveSide, size: reserveSize },
    }),
  });

  console.log(`Grid: ${config.cols}×${config.rows} (${count} browsers)`);

  const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#34495e"];
  const testNames = [
    "Homepage", "Login flow", "Dashboard", "Settings",
    "Profile edit", "Search", "Notifications", "Logout",
    "Signup", "Checkout", "Admin panel", "API health",
  ];

  const browsers = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const slot = getSlot(i, config);
      const browser = await chromium.launch({
        headless: false,
        args: [...slot.launchArgs, "--disable-infobars"],
      });
      const page = await browser.newPage({ viewport: slot.viewport });

      // Precise positioning via CDP
      const cdpOk = await setWindowBounds(page, slot.bounds);

      // Load a colored page
      await page.setContent(`
        <body style="margin:0; background:${colors[i % colors.length]}; display:flex; align-items:center; justify-content:center; height:100vh; font-family:system-ui;">
          <div style="text-align:center; color:white;">
            <div style="font-size:64px; font-weight:bold;">Slot ${i}</div>
            <div style="font-size:18px; opacity:0.8;">${slot.viewport.width}×${slot.viewport.height}</div>
            <div style="font-size:14px; opacity:0.5;">CDP: ${cdpOk ? "yes" : "fallback"}</div>
          </div>
        </body>
      `);

      // Inject overlay label
      await injectOverlay(page, {
        slot: i,
        testName: testNames[i % testNames.length],
      });

      return { browser, page, slot };
    })
  );

  console.log(`\n✓ ${count} browsers tiled in ${config.cols}×${config.rows} grid`);
  if (reserveSide) console.log(`  Reserved: ${reserveSize}px on ${reserveSide}`);
  console.log("  Press Ctrl+C to close\n");

  // Keep alive
  await new Promise(() => {});
}

main().catch(console.error);
