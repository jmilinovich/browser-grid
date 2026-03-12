import { execSync } from "child_process";
import { DEFAULT_SCREEN, DEFAULT_TOP_OFFSET } from "./grid";

export interface ScreenInfo {
  width: number;
  height: number;
  topOffset: number;
}

/**
 * Detect macOS screen resolution using system_profiler.
 * Returns logical resolution (points, not retina pixels).
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

function detectMacOSScreen(): ScreenInfo {
  // Get display resolution from system_profiler
  const profilerOutput = execSync(
    "system_profiler SPDisplaysDataType -json",
    { encoding: "utf-8", timeout: 5000 }
  );

  const data = JSON.parse(profilerOutput);
  const displays = data?.SPDisplaysDataType;

  let width = DEFAULT_SCREEN.width;
  let height = DEFAULT_SCREEN.height;

  if (displays && displays.length > 0) {
    // Find the main/built-in display, or use the first one
    for (const gpu of displays) {
      const ndrvs = gpu.spdisplays_ndrvs;
      if (ndrvs && ndrvs.length > 0) {
        for (const display of ndrvs) {
          // Look for the main display (spdisplays_main = "spdisplays_yes")
          const isMain = display.spdisplays_main === "spdisplays_yes";
          // Parse resolution like "1728 x 1117" from _spdisplays_resolution
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

  // Detect menu bar + dock offset
  const topOffset = detectTopOffset();

  return { width, height, topOffset };
}

function detectTopOffset(): number {
  let offset = DEFAULT_TOP_OFFSET; // menu bar

  try {
    // Check dock position
    const dockOrientation = execSync(
      "defaults read com.apple.dock orientation 2>/dev/null || echo bottom",
      { encoding: "utf-8", timeout: 2000 }
    ).trim();

    if (dockOrientation === "top") {
      // Dock at top adds to the top offset
      try {
        const tileSize = parseInt(
          execSync("defaults read com.apple.dock tilesize 2>/dev/null || echo 48", {
            encoding: "utf-8",
            timeout: 2000,
          }).trim(),
          10
        );
        // Dock height is roughly tilesize + some padding
        offset += tileSize + 20;
      } catch {
        offset += 70; // default dock height
      }
    }
  } catch {
    // Ignore dock detection failures
  }

  return offset;
}

/**
 * Get dock info for reserve zone calculation.
 * Returns the side the dock is on and its approximate size.
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

    // Check if dock is set to auto-hide
    const autohide = execSync(
      "defaults read com.apple.dock autohide 2>/dev/null || echo 0",
      { encoding: "utf-8", timeout: 2000 }
    ).trim();

    if (autohide === "1") {
      return null; // Auto-hidden dock doesn't take space
    }

    const size = tileSize + 20; // tile size + padding
    const side = orientation as "left" | "right" | "bottom" | "top";
    return { side: side === "top" ? "top" : side, size };
  } catch {
    return null;
  }
}
