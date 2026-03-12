import { test as base, type Page } from "@playwright/test";
import { getSlot, createGrid, type GridConfig } from "./grid";
import { setWindowBounds } from "./cdp";
import { injectOverlay, updateOverlay, type OverlayOptions, type OverlayStatus } from "./overlay";
import { detectScreen, detectDock, resolveDisplay, type DisplaySelector } from "./screen";
import { MINIMAL_CHROME_FLAGS, APP_MODE_FLAGS } from "./chrome-flags";

/**
 * Configuration options for the browser-grid fixture.
 * Pass these via `gridConfig()` helper in playwright.config.ts.
 */
export interface GridFixtureOptions {
  /** Grid preset or custom config */
  preset?: "auto" | "duo" | "quad" | "six" | "eight" | "nine" | GridConfig;
  /** Number of workers (for 'auto' preset). Defaults to reading from env. */
  workerCount?: number;
  /** Pixels between windows (default: 0) */
  gap?: number;
  /** Reserve a screen region */
  reserve?: GridConfig["reserve"];
  /** Show slot overlay (default: true) */
  overlay?: boolean;
  /** Overlay auto-hide duration in ms (0 = always show, default: 0) */
  overlayDuration?: number;
  /** Overlay position (default: 'top-left') */
  overlayPosition?: OverlayOptions["position"];
  /** Screen width override (default: auto-detect) */
  screenWidth?: number;
  /** Screen height override (default: auto-detect) */
  screenHeight?: number;
  /** Screen X origin override for multi-monitor (default: auto-detect) */
  screenX?: number;
  /** Screen Y origin override for multi-monitor (default: auto-detect) */
  screenY?: number;
  /** Menu bar / top offset override (default: auto-detect) */
  topOffset?: number;
  /** Use chromeless app-mode windows — no tab bar, no URL bar (default: true) */
  appMode?: boolean;
  /** Auto-detect dock and avoid it (default: true). Set false if you handle it with reserve. */
  avoidDock?: boolean;
  /** Which display to tile on: "main", "internal"/"laptop", "secondary"/"external", index, or name substring */
  display?: DisplaySelector;
}

// Cache screen detection so we only run it once
let cachedScreen: { x: number; y: number; width: number; height: number; topOffset: number } | null = null;

function getScreen(options: GridFixtureOptions) {
  if (options.screenWidth && options.screenHeight) {
    return {
      x: options.screenX ?? 0,
      y: options.screenY ?? 0,
      width: options.screenWidth,
      height: options.screenHeight,
      topOffset: options.topOffset ?? 25,
    };
  }

  // If display selector is set, resolve to a specific display
  if (options.display !== undefined) {
    const display = resolveDisplay(options.display);
    if (display) {
      return {
        x: display.x,
        y: display.y,
        width: display.width,
        height: display.height,
        topOffset: display.visible.y - display.y, // menu bar height for this display
      };
    }
  }

  if (!cachedScreen) {
    const detected = detectScreen();
    cachedScreen = { x: 0, y: 0, ...detected };
  }
  return {
    x: cachedScreen.x,
    y: cachedScreen.y,
    width: options.screenWidth ?? cachedScreen.width,
    height: options.screenHeight ?? cachedScreen.height,
    topOffset: options.topOffset ?? cachedScreen.topOffset,
  };
}

/**
 * Helper to generate `use` options for playwright.config.ts.
 *
 * ```ts
 * // playwright.config.ts
 * import { gridConfig } from 'browser-grid';
 * export default defineConfig({
 *   use: {
 *     ...gridConfig({ preset: 'auto', gap: 4 }),
 *   },
 * });
 * ```
 */
/**
 * Returns the chrome flags that gridConfig would use.
 * Useful for merging with your own launchOptions:
 *
 * ```ts
 * launchOptions: {
 *   args: [...gridLaunchArgs(), '--my-custom-flag'],
 * }
 * ```
 */
export function gridLaunchArgs(options: { appMode?: boolean } = {}): string[] {
  return options.appMode !== false ? APP_MODE_FLAGS : MINIMAL_CHROME_FLAGS;
}

export function gridConfig(
  options: GridFixtureOptions = {}
): Record<string, unknown> {
  // Only store the grid options — do NOT set launchOptions here.
  // Users should compose launchOptions themselves using gridLaunchArgs()
  // to avoid clobbering their own args (e.g., --disable-blink-features).
  return {
    _browserGrid: options,
  };
}

/**
 * The key fixture. Extends Playwright's test with `gridPage` —
 * a page that is automatically positioned in a grid slot.
 *
 * ```ts
 * import { gridTest as test } from 'browser-grid';
 * test('my test', async ({ gridPage }) => {
 *   await gridPage.goto('https://example.com');
 * });
 * ```
 */
export const gridTest = base.extend<{ gridPage: Page }>({
  gridPage: async ({ page }, use, testInfo) => {
    const slotIndex = testInfo.parallelIndex;

    // Read config from project use options, or use defaults
    const projectUse = (testInfo.project.use as Record<string, unknown>) || {};
    const options: GridFixtureOptions =
      (projectUse._browserGrid as GridFixtureOptions) || {};

    // Detect screen
    const screen = getScreen(options);

    // Determine worker count for auto preset
    // Priority: explicit option > Playwright config > env var > default
    const workerCount =
      options.workerCount ??
      (testInfo.config as any).workers ??
      parseInt(process.env.TEST_WORKER_COUNT || "4", 10);

    // Auto-detect dock unless user provided their own reserve
    let reserve = options.reserve;
    if (!reserve && options.avoidDock !== false) {
      const dock = detectDock();
      if (dock) {
        reserve = dock;
      }
    }

    // Build grid config
    const gridCfg = createGrid({
      preset: options.preset ?? "auto",
      workerCount,
      gap: options.gap,
      screenWidth: screen.width,
      screenHeight: screen.height,
      screenX: screen.x,
      screenY: screen.y,
      topOffset: screen.topOffset,
      reserve,
    });

    // Get slot for this worker
    const slot = getSlot(slotIndex, gridCfg);

    // Position window via CDP (Chromium only, falls back gracefully)
    await setWindowBounds(page, slot.bounds);

    // Inject overlay if enabled (default: true)
    const showOverlay = options.overlay !== false;
    if (showOverlay) {
      await injectOverlay(page, {
        slot: slotIndex,
        testName: testInfo.title,
        duration: options.overlayDuration ?? 0,
        position: options.overlayPosition ?? "top-left",
        status: "running",
      });
    }

    await use(page);

    // Update overlay with test result status
    if (showOverlay) {
      const status: OverlayStatus =
        testInfo.status === "passed" ? "passed" :
        testInfo.status === "failed" || testInfo.status === "timedOut" ? "failed" :
        "idle";
      try {
        await updateOverlay(page, {
          slot: slotIndex,
          testName: testInfo.title,
          position: options.overlayPosition ?? "top-left",
          status,
        });
      } catch {
        // Page may be closed already
      }
    }
  },
});
