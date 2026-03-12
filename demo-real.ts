import { chromium } from "playwright";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getSlot, createGrid, type GridConfig } from "./src/grid";
import { setWindowBounds } from "./src/cdp";
import { injectOverlay, updateOverlay } from "./src/overlay";
import { detectScreen, resolveDisplay, type DisplaySelector } from "./src/screen";
import { APP_MODE_FLAGS } from "./src/chrome-flags";

/**
 * Demo: simulates parallel test runs visiting real pages.
 * Shows browsers loading different sites simultaneously.
 *
 * Usage:
 *   npx tsx demo-real.ts                  # 6 browsers on main display
 *   npx tsx demo-real.ts --display internal  # target built-in display
 */

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface TestCase {
  name: string;
  url: string;
}

const tests: TestCase[] = [
  { name: "GitHub", url: "https://github.com" },
  { name: "Wikipedia", url: "https://en.wikipedia.org" },
  { name: "Hacker News", url: "https://news.ycombinator.com" },
  { name: "Example.com", url: "https://example.com" },
  { name: "MDN Docs", url: "https://developer.mozilla.org" },
  { name: "NPM", url: "https://www.npmjs.com" },
];

async function main() {
  const count = Math.min(tests.length, 6);
  const displayArg = process.argv.indexOf("--display");
  const display: DisplaySelector | undefined = displayArg >= 0 ? process.argv[displayArg + 1] : undefined;

  let screenX = 0, screenY = 0, screenW: number, screenH: number, topOffset: number;

  if (display !== undefined) {
    const resolved = resolveDisplay(display);
    if (resolved) {
      screenX = resolved.x;
      screenY = resolved.y;
      screenW = resolved.width;
      screenH = resolved.height;
      topOffset = resolved.visible.y - resolved.y;
      console.log(`Display: ${resolved.name} (${screenW}×${screenH})`);
    } else {
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
  }

  const config: GridConfig = createGrid({
    preset: "six",
    gap: 4,
    screenWidth: screenW,
    screenHeight: screenH,
    screenX,
    screenY,
    topOffset,
  });

  console.log(`Launching ${count} browsers in ${config.cols}×${config.rows} grid...`);

  const browsers: Array<{ context: any; page: any; slot: any }> = [];
  const tempDirs: string[] = [];

  for (let i = 0; i < count; i++) {
    const slot = getSlot(i, config);
    const tempDir = mkdtempSync(join(tmpdir(), "browser-grid-demo-"));
    tempDirs.push(tempDir);

    const context = await chromium.launchPersistentContext(tempDir, {
      headless: false,
      viewport: slot.viewport,
      args: [...slot.launchArgs, ...APP_MODE_FLAGS],
    });
    const page = context.pages()[0] || await context.newPage();
    await setWindowBounds(page, slot.bounds);

    await injectOverlay(page, {
      slot: i,
      testName: `${tests[i].name} — loading...`,
    });

    // Navigate to the real URL
    page.goto(tests[i].url, { timeout: 10000 }).then(async () => {
      // Update overlay after page loads
      await updateOverlay(page, {
        slot: i,
        testName: `${tests[i].name} ✓`,
      });
      console.log(`  ✓ Slot ${i}: ${tests[i].name} loaded`);
    }).catch(() => {
      console.log(`  ✗ Slot ${i}: ${tests[i].name} failed`);
    });

    browsers.push({ context, page, slot });
    if (i < count - 1) await sleep(200);
  }

  // Re-position after settle
  await sleep(500);
  for (const { page, slot } of browsers) {
    await setWindowBounds(page, slot.bounds);
  }

  console.log(`\n✓ ${count} browsers tiled — watching tests run`);
  console.log("  Press Ctrl+C to close\n");

  await new Promise(() => {});
}

main().catch(console.error);
