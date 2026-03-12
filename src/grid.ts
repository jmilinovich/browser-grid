export interface GridConfig {
  /** Number of columns in the grid */
  cols: number;
  /** Number of rows in the grid */
  rows: number;
  /** Total screen width in logical pixels (default: auto-detect macOS) */
  screenWidth?: number;
  /** Total screen height in logical pixels (default: auto-detect macOS) */
  screenHeight?: number;
  /** Gap between windows in pixels (default: 0) */
  gap?: number;
  /** Top offset for menu bar (default: 25) */
  topOffset?: number;
  /** Reserve a region of the screen (e.g., for your terminal) */
  reserve?: {
    side: "left" | "right" | "top" | "bottom";
    size: number;
  };
}

export interface SlotResult {
  /** Viewport size for Playwright context */
  viewport: { width: number; height: number };
  /** Chrome launch args for window position and size */
  launchArgs: string[];
  /** Raw position values */
  position: { x: number; y: number };
  /** Window bounds for CDP */
  bounds: { left: number; top: number; width: number; height: number };
  /** Slot index */
  slot: number;
}

/**
 * macOS logical resolution (points, not retina pixels).
 * Common default for MacBook Pro 16".
 */
export const DEFAULT_SCREEN = { width: 1728, height: 1117 };
export const DEFAULT_TOP_OFFSET = 25; // macOS menu bar

/**
 * Get the position and size for a specific grid slot.
 */
export function getSlot(slot: number, config: GridConfig): SlotResult {
  const screenW = config.screenWidth ?? DEFAULT_SCREEN.width;
  const screenH = config.screenHeight ?? DEFAULT_SCREEN.height;
  const gap = config.gap ?? 0;
  const topOffset = config.topOffset ?? DEFAULT_TOP_OFFSET;

  // Calculate available area after reservations
  let areaX = 0;
  let areaY = topOffset;
  let areaW = screenW;
  let areaH = screenH - topOffset;

  if (config.reserve) {
    const { side, size } = config.reserve;
    switch (side) {
      case "left":
        areaX += size;
        areaW -= size;
        break;
      case "right":
        areaW -= size;
        break;
      case "top":
        areaY += size;
        areaH -= size;
        break;
      case "bottom":
        areaH -= size;
        break;
    }
  }

  const col = slot % config.cols;
  const row = Math.floor(slot / config.cols) % config.rows;

  const cellW = Math.floor((areaW - gap * (config.cols - 1)) / config.cols);
  const cellH = Math.floor((areaH - gap * (config.rows - 1)) / config.rows);

  const x = areaX + col * (cellW + gap);
  const y = areaY + row * (cellH + gap);

  return {
    viewport: { width: cellW, height: cellH },
    position: { x, y },
    bounds: { left: x, top: y, width: cellW, height: cellH },
    launchArgs: [
      `--window-position=${x},${y}`,
      `--window-size=${cellW},${cellH}`,
    ],
    slot,
  };
}

/**
 * Get all slots for a grid configuration.
 */
export function getAllSlots(config: GridConfig): SlotResult[] {
  const total = config.rows * config.cols;
  return Array.from({ length: total }, (_, i) => getSlot(i, config));
}

/**
 * Helper: create Playwright launch options for a specific grid slot.
 */
export function playwrightLaunchArgs(
  slot: number,
  config: GridConfig
): string[] {
  return getSlot(slot, config).launchArgs;
}

/**
 * Common grid presets.
 */
export const presets = {
  /** 2 browsers side by side */
  duo: { cols: 2, rows: 1 } as GridConfig,
  /** 2x2 grid = 4 browsers */
  quad: { cols: 2, rows: 2 } as GridConfig,
  /** 3x2 grid = 6 browsers */
  six: { cols: 3, rows: 2 } as GridConfig,
  /** 4x2 grid = 8 browsers */
  eight: { cols: 4, rows: 2 } as GridConfig,
  /** 3x3 grid = 9 browsers */
  nine: { cols: 3, rows: 3 } as GridConfig,
};

/**
 * Auto-select the best preset based on worker count.
 * Picks the smallest grid that can hold all workers.
 */
export function autoPreset(workerCount: number): GridConfig {
  if (workerCount <= 1) return { cols: 1, rows: 1 };
  if (workerCount <= 2) return presets.duo;
  if (workerCount <= 4) return presets.quad;
  if (workerCount <= 6) return presets.six;
  if (workerCount <= 8) return presets.eight;
  if (workerCount <= 9) return presets.nine;
  // For > 9, compute a reasonable grid
  const cols = Math.ceil(Math.sqrt(workerCount));
  const rows = Math.ceil(workerCount / cols);
  return { cols, rows };
}

/**
 * Create a grid config, resolving 'auto' preset and merging options.
 */
export function createGrid(
  options: {
    preset?: "auto" | "duo" | "quad" | "six" | "eight" | "nine" | GridConfig;
    workerCount?: number;
    gap?: number;
    screenWidth?: number;
    screenHeight?: number;
    topOffset?: number;
    reserve?: GridConfig["reserve"];
  } = {}
): GridConfig {
  let base: GridConfig;

  if (!options.preset || options.preset === "auto") {
    base = autoPreset(options.workerCount ?? 4);
  } else if (typeof options.preset === "string") {
    base = presets[options.preset];
  } else {
    base = options.preset;
  }

  return {
    ...base,
    ...(options.gap !== undefined && { gap: options.gap }),
    ...(options.screenWidth !== undefined && { screenWidth: options.screenWidth }),
    ...(options.screenHeight !== undefined && { screenHeight: options.screenHeight }),
    ...(options.topOffset !== undefined && { topOffset: options.topOffset }),
    ...(options.reserve !== undefined && { reserve: options.reserve }),
  };
}
