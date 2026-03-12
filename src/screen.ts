import { execSync } from "child_process";
import { DEFAULT_SCREEN, DEFAULT_TOP_OFFSET } from "./grid";

export interface ScreenInfo {
  width: number;
  height: number;
  topOffset: number;
}

export interface DisplayInfo {
  name: string;
  width: number;
  height: number;
  retina: boolean;
  isMain: boolean;
  isInternal: boolean;
}

/**
 * Detect macOS screen resolution using system_profiler.
 * Returns logical resolution (points, not retina pixels) for the main display.
 * Falls back to sensible defaults if detection fails.
 */
export function detectScreen(): ScreenInfo {
  try {
    return detectMacOSScreen();
  } catch {
    return {
      width: DEFAULT_SCREEN.width,
      height: DEFAULT_SCREEN.height,
      topOffset: DEFAULT_TOP_OFFSET,
    };
  }
}

/**
 * List all connected displays with their resolutions.
 * Useful for multi-monitor setups where you want to tile on a specific display.
 */
export function listDisplays(): DisplayInfo[] {
  try {
    const profilerOutput = execSync(
      "system_profiler SPDisplaysDataType -json",
      { encoding: "utf-8", timeout: 5000 }
    );
    const data = JSON.parse(profilerOutput);
    const displays: DisplayInfo[] = [];

    for (const gpu of data?.SPDisplaysDataType || []) {
      for (const display of gpu.spdisplays_ndrvs || []) {
        const resStr = display._spdisplays_resolution || display.spdisplays_resolution || "";
        const match = resStr.match(/(\d+)\s*x\s*(\d+)/);
        if (match) {
          displays.push({
            name: display._name || "Unknown",
            width: parseInt(match[1], 10),
            height: parseInt(match[2], 10),
            retina: (display.spdisplays_pixelresolution || "").toLowerCase().includes("retina"),
            isMain: display.spdisplays_main === "spdisplays_yes",
            isInternal: display.spdisplays_connection_type === "spdisplays_internal",
          });
        }
      }
    }

    return displays;
  } catch {
    return [{
      name: "Default",
      width: DEFAULT_SCREEN.width,
      height: DEFAULT_SCREEN.height,
      retina: true,
      isMain: true,
      isInternal: true,
    }];
  }
}

function detectMacOSScreen(): ScreenInfo {
  const profilerOutput = execSync(
    "system_profiler SPDisplaysDataType -json",
    { encoding: "utf-8", timeout: 5000 }
  );

  const data = JSON.parse(profilerOutput);
  const displays = data?.SPDisplaysDataType;

  let width = DEFAULT_SCREEN.width;
  let height = DEFAULT_SCREEN.height;

  if (displays && displays.length > 0) {
    for (const gpu of displays) {
      const ndrvs = gpu.spdisplays_ndrvs;
      if (ndrvs && ndrvs.length > 0) {
        for (const display of ndrvs) {
          const isMain = display.spdisplays_main === "spdisplays_yes";
          const resStr =
            display._spdisplays_resolution || display.spdisplays_resolution || "";
          const match = resStr.match(/(\d+)\s*x\s*(\d+)/);
          if (match) {
            const w = parseInt(match[1], 10);
            const h = parseInt(match[2], 10);
            if (isMain || width === DEFAULT_SCREEN.width) {
              width = w;
              height = h;
            }
            if (isMain) break;
          }
        }
      }
    }
  }

  const topOffset = detectTopOffset();
  return { width, height, topOffset };
}

function detectTopOffset(): number {
  let offset = DEFAULT_TOP_OFFSET; // menu bar

  try {
    const dockOrientation = execSync(
      "defaults read com.apple.dock orientation 2>/dev/null || echo bottom",
      { encoding: "utf-8", timeout: 2000 }
    ).trim();

    if (dockOrientation === "top") {
      try {
        const tileSize = parseInt(
          execSync("defaults read com.apple.dock tilesize 2>/dev/null || echo 48", {
            encoding: "utf-8",
            timeout: 2000,
          }).trim(),
          10
        );
        offset += tileSize + 20;
      } catch {
        offset += 70;
      }
    }
  } catch {
    // Ignore dock detection failures
  }

  return offset;
}

/**
 * Get dock info for reserve zone calculation.
 */
export function detectDock(): { side: "left" | "right" | "bottom" | "top"; size: number } | null {
  try {
    const orientation = execSync(
      "defaults read com.apple.dock orientation 2>/dev/null || echo bottom",
      { encoding: "utf-8", timeout: 2000 }
    ).trim();

    const tileSize = parseInt(
      execSync("defaults read com.apple.dock tilesize 2>/dev/null || echo 48", {
        encoding: "utf-8",
        timeout: 2000,
      }).trim(),
      10
    );

    const autohide = execSync(
      "defaults read com.apple.dock autohide 2>/dev/null || echo 0",
      { encoding: "utf-8", timeout: 2000 }
    ).trim();

    if (autohide === "1") {
      return null;
    }

    const size = tileSize + 20;
    const side = orientation as "left" | "right" | "bottom" | "top";
    return { side: side === "top" ? "top" : side, size };
  } catch {
    return null;
  }
}
