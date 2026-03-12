import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { getSlot, createGrid, type GridConfig } from "./grid";
import { setWindowBounds } from "./cdp";
import { injectOverlay, updateOverlay, type OverlayOptions, type OverlayStatus } from "./overlay";
import { detectScreen, detectDock } from "./screen";
import { APP_MODE_FLAGS, MINIMAL_CHROME_FLAGS } from "./chrome-flags";

export interface LaunchGridOptions {
  /** Number of browser windows to open */
  count: number;
  /** Grid preset or custom config */
  preset?: "auto" | "duo" | "quad" | "six" | "eight" | "nine" | GridConfig;
  /** Pixels between windows (default: 4) */
  gap?: number;
  /** Reserve a screen region */
  reserve?: GridConfig["reserve"];
  /** Use chromeless app-mode windows (default: true) */
  appMode?: boolean;
  /** Show slot overlays (default: true) */
  overlay?: boolean;
  /** Labels for each slot (defaults to "Slot 0", "Slot 1", etc.) */
  labels?: string[];
  /** Extra Chrome launch args */
  extraArgs?: string[];
  /** Delay between launches in ms (default: 200) */
  launchDelay?: number;
}

export interface GridSlot {
  /** Playwright Browser instance */
  browser: Browser;
  /** Browser context */
  context: BrowserContext;
  /** Page, ready to use */
  page: Page;
  /** Slot index */
  slot: number;
  /** Viewport dimensions */
  viewport: { width: number; height: number };
  /** Update this slot's overlay label and status */
  setStatus: (status: OverlayStatus, label?: string) => Promise<void>;
}

export interface GridInstance {
  /** All launched slots */
  slots: GridSlot[];
  /** Close all browsers */
  closeAll: () => Promise<void>;
  /** Get a specific slot */
  get: (index: number) => GridSlot;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Launch multiple browsers in a tiled grid. Handles the full sequence:
 * sequential launch, CDP positioning, overlays.
 *
 * ```ts
 * const grid = await launchGrid({ count: 4, reserve: { side: 'right', size: 700 } });
 * await grid.slots[0].page.goto('https://example.com');
 * // ... do work ...
 * await grid.closeAll();
 * ```
 */
export async function launchGrid(options: LaunchGridOptions): Promise<GridInstance> {
  const {
    count,
    gap = 4,
    appMode = true,
    overlay = true,
    labels,
    extraArgs = [],
    launchDelay = 200,
  } = options;

  const screen = detectScreen();

  // Auto-detect dock unless user provided their own reserve
  let reserve = options.reserve;
  if (!reserve) {
    const dock = detectDock();
    if (dock) reserve = dock;
  }

  const config: GridConfig = createGrid({
    preset: options.preset ?? "auto",
    workerCount: count,
    gap,
    screenWidth: screen.width,
    screenHeight: screen.height,
    topOffset: screen.topOffset,
    reserve,
  });

  const chromeFlags = appMode ? APP_MODE_FLAGS : MINIMAL_CHROME_FLAGS;
  const slots: GridSlot[] = [];

  for (let i = 0; i < count; i++) {
    const slotInfo = getSlot(i, config);
    const label = labels?.[i] ?? `Slot ${i}`;

    const browser = await chromium.launch({
      headless: false,
      args: [...slotInfo.launchArgs, ...chromeFlags, ...extraArgs],
    });

    const context = await browser.newContext({ viewport: slotInfo.viewport });
    const page = await context.newPage();

    await setWindowBounds(page, slotInfo.bounds);

    if (overlay) {
      await injectOverlay(page, {
        slot: i,
        testName: label,
        status: "idle",
      });
    }

    const setStatus = async (status: OverlayStatus, newLabel?: string) => {
      try {
        await updateOverlay(page, {
          slot: i,
          testName: newLabel ?? label,
          status,
        });
      } catch {
        // Page may be navigating or closed
      }
    };

    slots.push({
      browser,
      context,
      page,
      slot: i,
      viewport: slotInfo.viewport,
      setStatus,
    });

    if (i < count - 1) await sleep(launchDelay);
  }

  // Re-position after all settle
  await sleep(300);
  for (let i = 0; i < slots.length; i++) {
    const slotInfo = getSlot(i, config);
    await setWindowBounds(slots[i].page, slotInfo.bounds);
  }

  return {
    slots,
    get: (index: number) => slots[index],
    closeAll: async () => {
      for (const s of slots) {
        await s.browser.close().catch(() => {});
      }
    },
  };
}
