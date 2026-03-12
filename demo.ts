import { chromium } from "playwright";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getSlot, createGrid, type GridConfig } from "./src/grid";
import { setWindowBounds } from "./src/cdp";
import { injectOverlay } from "./src/overlay";
import { detectScreen, resolveDisplay, type DisplaySelector } from "./src/screen";
import { APP_MODE_FLAGS } from "./src/chrome-flags";

/**
 * Demo: opens browsers in a grid with chromeless app-mode windows.
 *
 * Usage:
 *   npx tsx demo.ts              # 2x2 grid (4 browsers)
 *   npx tsx demo.ts 8            # 4x2 grid (8 browsers)
 *   npx tsx demo.ts 4 right 700  # 2x2 grid, reserve 700px on the right
 *   npx tsx demo.ts 4 --display internal  # target built-in display
 */

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 4;
  let reserveSide: "left" | "right" | undefined;
  let reserveSize = 0;
  let display: DisplaySelector | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--display" && args[i + 1]) {
      display = args[++i];
    } else if (!reserveSide && /^\d+$/.test(args[i])) {
      count = parseInt(args[i], 10);
    } else if (!reserveSide && ["left", "right"].includes(args[i])) {
      reserveSide = args[i] as "left" | "right";
      if (args[i + 1] && /^\d+$/.test(args[i + 1])) {
        reserveSize = parseInt(args[++i], 10);
      }
    }
  }

  return { count, reserveSide, reserveSize, display };
}

async function main() {
  const { count, reserveSide, reserveSize, display } = parseArgs();

  // Resolve screen from display selector or auto-detect
  let screenX = 0, screenY = 0, screenW: number, screenH: number, topOffset: number;

  if (display !== undefined) {
    const resolved = resolveDisplay(display);
    if (resolved) {
      screenX = resolved.x;
      screenY = resolved.y;
      screenW = resolved.width;
      screenH = resolved.height;
      topOffset = resolved.visible.y - resolved.y;
      console.log(`Display: ${resolved.name} (${screenW}×${screenH} at ${screenX},${screenY}, menu bar: ${topOffset}px)`);
    } else {
      console.error(`Display "${display}" not found, using main`);
      const screen = detectScreen();
      screenW = screen.width;
      screenH = screen.height;
      topOffset = screen.topOffset;
    }
  } else {
    const screen = detectScreen();
    screenW = screen.width;
    screenH = screen.height;
    topOffset = screen.topOffset;
    console.log(`Screen: ${screenW}×${screenH} (top offset: ${topOffset})`);
  }

  const config: GridConfig = createGrid({
    preset: "auto",
    workerCount: count,
    gap: 4,
    screenWidth: screenW,
    screenHeight: screenH,
    screenX,
    screenY,
    topOffset,
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

  const browsers: Array<{ context: any; page: any; slot: any }> = [];
  const tempDirs: string[] = [];

  // Launch sequentially with a small delay so windows don't race/swallow each other
  for (let i = 0; i < count; i++) {
    const slot = getSlot(i, config);

    // Use launchPersistentContext so --app flag actually applies to our page
    const tempDir = mkdtempSync(join(tmpdir(), "browser-grid-demo-"));
    tempDirs.push(tempDir);

    const context = await chromium.launchPersistentContext(tempDir, {
      headless: false,
      viewport: slot.viewport,
      args: [
        ...slot.launchArgs,
        ...APP_MODE_FLAGS,
      ],
    });
    const page = context.pages()[0] || await context.newPage();

    // Precise positioning via CDP
    const cdpOk = await setWindowBounds(page, slot.bounds);

    // Load a colored page with a proper title (shown in app-mode title bar)
    await page.setContent(`
      <html><head><title>${testNames[i % testNames.length]}</title></head>
      <body style="margin:0; background:${colors[i % colors.length]}; display:flex; align-items:center; justify-content:center; height:100vh; font-family:system-ui;">
        <div style="text-align:center; color:white;">
          <div style="font-size:48px; font-weight:bold;">Slot ${i}</div>
          <div style="font-size:16px; opacity:0.8;">${slot.viewport.width}×${slot.viewport.height}</div>
        </div>
      </body></html>
    `);

    // Inject overlay label
    await injectOverlay(page, {
      slot: i,
      testName: testNames[i % testNames.length],
    });

    browsers.push({ context, page, slot });
    console.log(`  Slot ${i}: ${testNames[i % testNames.length]} (${slot.viewport.width}×${slot.viewport.height})`);

    // Small delay between launches
    if (i < count - 1) await sleep(200);
  }

  // Re-position all windows after they've all settled
  await sleep(500);
  for (const { page, slot } of browsers) {
    await setWindowBounds(page, slot.bounds);
  }

  console.log(`\n✓ ${count} browsers tiled in ${config.cols}×${config.rows} grid`);
  if (reserveSide) console.log(`  Reserved: ${reserveSize}px on ${reserveSide}`);
  console.log("  Press Ctrl+C to close\n");

  // Keep alive
  await new Promise(() => {});
}

main().catch(console.error);
