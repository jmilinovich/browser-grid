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
 * Full display bounds in screen coordinates (origin top-left of primary, y down).
 * These coordinates are directly usable for CDP window positioning.
 */
export interface DisplayBounds {
  name: string;
  /** X origin in virtual screen space */
  x: number;
  /** Y origin in virtual screen space */
  y: number;
  /** Display width in logical pixels */
  width: number;
  /** Display height in logical pixels */
  height: number;
  /** Usable area (excluding menu bar, dock) */
  visible: { x: number; y: number; width: number; height: number };
  isMain: boolean;
  isInternal: boolean;
}

/** Which display to tile on */
export type DisplaySelector = "main" | "internal" | "laptop" | "secondary" | "external" | number | string;

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

/**
 * List all displays with their positions in screen coordinates (top-left origin, y down).
 * Uses NSScreen via osascript for accurate virtual-space positions.
 * These coordinates map directly to CDP Browser.setWindowBounds.
 */
export function listScreens(): DisplayBounds[] {
  try {
    const script = `
ObjC.import("AppKit");
var screens = $.NSScreen.screens;
var result = [];
for (var i = 0; i < screens.count; i++) {
  var s = screens.objectAtIndex(i);
  var f = s.frame;
  var v = s.visibleFrame;
  var desc = s.deviceDescription;
  var num = desc.objectForKey($("NSScreenNumber")).intValue;
  result.push({
    name: s.localizedName.js,
    fx: f.origin.x, fy: f.origin.y, fw: f.size.width, fh: f.size.height,
    vx: v.origin.x, vy: v.origin.y, vw: v.size.width, vh: v.size.height,
    num: num
  });
}
JSON.stringify(result);`;

    const raw = execSync(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    const nsScreens: Array<{
      name: string;
      fx: number; fy: number; fw: number; fh: number;
      vx: number; vy: number; vw: number; vh: number;
      num: number;
    }> = JSON.parse(raw);

    if (nsScreens.length === 0) return [];

    // NSScreen[0] is always the main display. Its height is the reference for y-flip.
    const primaryHeight = nsScreens[0].fh;

    return nsScreens.map((ns, i) => {
      // Convert from Cocoa coords (bottom-left origin, y up) to screen coords (top-left origin, y down)
      const x = ns.fx;
      const y = primaryHeight - ns.fy - ns.fh;
      const visX = ns.vx;
      const visY = primaryHeight - ns.vy - ns.vh;

      // Heuristic: built-in displays have known names
      const nameLower = ns.name.toLowerCase();
      const isInternal = nameLower.includes("built-in") || nameLower.includes("internal") || nameLower.includes("color lcd");

      return {
        name: ns.name,
        x,
        y,
        width: ns.fw,
        height: ns.fh,
        visible: { x: visX, y: visY, width: ns.vw, height: ns.vh },
        isMain: i === 0,
        isInternal,
      };
    });
  } catch {
    return [{
      name: "Default",
      x: 0,
      y: 0,
      width: DEFAULT_SCREEN.width,
      height: DEFAULT_SCREEN.height,
      visible: { x: 0, y: DEFAULT_TOP_OFFSET, width: DEFAULT_SCREEN.width, height: DEFAULT_SCREEN.height - DEFAULT_TOP_OFFSET },
      isMain: true,
      isInternal: true,
    }];
  }
}

/**
 * Resolve a display selector to a specific DisplayBounds.
 * Returns undefined if no match found.
 */
export function resolveDisplay(selector: DisplaySelector): DisplayBounds | undefined {
  const screens = listScreens();
  if (screens.length === 0) return undefined;

  if (typeof selector === "number") {
    return screens[selector];
  }

  switch (selector) {
    case "main":
      return screens.find(s => s.isMain) ?? screens[0];
    case "internal":
    case "laptop":
      return screens.find(s => s.isInternal) ?? screens[0];
    case "secondary":
    case "external":
      return screens.find(s => !s.isMain) ?? screens[0];
    default:
      // Name substring match (case-insensitive)
      return screens.find(s =>
        s.name.toLowerCase().includes(selector.toLowerCase())
      );
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
