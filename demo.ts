import { chromium } from "playwright";
import { getSlot, presets, GridConfig } from "./src/index";

/**
 * Demo: opens 4 browsers in a 2x2 grid, each loading a different colored page.
 * Run: npx tsx demo.ts
 */
async function main() {
  const config: GridConfig = {
    ...presets.quad,
    // Reserve the right half for your terminal
    // reserve: { side: "right", size: 860 },
    gap: 4,
  };

  const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#34495e"];
  const total = config.rows * config.cols;

  const browsers = await Promise.all(
    Array.from({ length: total }, async (_, i) => {
      const slot = getSlot(i, config);
      const browser = await chromium.launch({
        headful: true,
        args: [
          ...slot.launchArgs,
          "--disable-infobars",
        ],
      });
      const page = await browser.newPage({
        viewport: slot.viewport,
      });

      // Load a simple page showing the slot number
      await page.setContent(`
        <body style="margin:0; background:${colors[i % colors.length]}; display:flex; align-items:center; justify-content:center; height:100vh; font-family:system-ui;">
          <div style="text-align:center; color:white;">
            <div style="font-size:80px; font-weight:bold;">Slot ${i}</div>
            <div style="font-size:20px; opacity:0.8;">${slot.viewport.width}×${slot.viewport.height}</div>
            <div style="font-size:16px; opacity:0.6;">pos: (${slot.position.x}, ${slot.position.y})</div>
          </div>
        </body>
      `);

      return { browser, page, slot };
    })
  );

  console.log(`✓ Opened ${total} browsers in a ${config.cols}×${config.rows} grid`);
  console.log("  Press Ctrl+C to close all browsers");

  // Keep alive until interrupted
  await new Promise(() => {});
}

main().catch(console.error);
