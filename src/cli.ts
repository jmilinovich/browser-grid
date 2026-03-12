#!/usr/bin/env node

import { getSlot, createGrid, getAllSlots } from "./grid";
import { detectScreen, listDisplays, listScreens, resolveDisplay } from "./screen";

const args = process.argv.slice(2);
const command = args[0];

function printUsage() {
  console.log(`browser-grid — tile Playwright browser windows in a grid

Usage:
  browser-grid info                 Show detected screen and display info
  browser-grid displays             Show all displays with positions (for multi-monitor)
  browser-grid slots [count]        Print slot positions for N workers (default: 4)
  browser-grid slots [count] --json Print as JSON

Options:
  --gap N              Gap between windows in pixels (default: 0)
  --reserve SIDE SIZE  Reserve screen region (e.g., --reserve right 700)
  --preset NAME        Use preset: duo, quad, six, eight, nine, auto (default: auto)
  --display SELECTOR   Target display: main, internal/laptop, secondary/external, or name
`);
}

function parseFlag(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

if (!command || command === "--help" || command === "-h") {
  printUsage();
  process.exit(0);
}

if (command === "info") {
  const screen = detectScreen();
  console.log(`Main screen: ${screen.width}×${screen.height}`);
  console.log(`Top offset: ${screen.topOffset}px (menu bar)\n`);

  const displays = listDisplays();
  console.log(`Displays (${displays.length}):`);
  for (const d of displays) {
    const tags = [
      d.isMain ? "main" : "",
      d.isInternal ? "internal" : "external",
      d.retina ? "retina" : "",
    ].filter(Boolean).join(", ");
    console.log(`  ${d.name}: ${d.width}×${d.height} (${tags})`);
  }
  process.exit(0);
}

if (command === "displays") {
  const screens = listScreens();
  const json = hasFlag("--json");

  if (json) {
    console.log(JSON.stringify(screens, null, 2));
  } else {
    console.log(`Displays (${screens.length}):\n`);
    for (let i = 0; i < screens.length; i++) {
      const s = screens[i];
      const tags = [
        s.isMain ? "main" : "",
        s.isInternal ? "internal" : "external",
      ].filter(Boolean).join(", ");
      console.log(`  [${i}] ${s.name} (${tags})`);
      console.log(`      Position: (${s.x}, ${s.y})  Size: ${s.width}×${s.height}`);
      console.log(`      Usable:   (${s.visible.x}, ${s.visible.y})  ${s.visible.width}×${s.visible.height}`);
      console.log();
    }
    console.log(`Use in config:  gridConfig({ display: "internal" })`);
    console.log(`Or by name:     gridConfig({ display: "HP Z27" })`);
  }
  process.exit(0);
}

if (command === "slots") {
  const count = parseInt(args[1] || "4", 10);
  const gap = parseInt(parseFlag("--gap") || "0", 10);
  const preset = parseFlag("--preset") || "auto";
  const reserveSide = parseFlag("--reserve");
  const reserveSize = reserveSide ? parseInt(args[args.indexOf("--reserve") + 2] || "0", 10) : 0;
  const displaySelector = parseFlag("--display");
  const json = hasFlag("--json");

  // Resolve display or fall back to main screen
  let screenX = 0, screenY = 0, screenW: number, screenH: number, topOffset: number;
  let displayName = "";

  if (displaySelector) {
    const display = resolveDisplay(displaySelector);
    if (display) {
      screenX = display.x;
      screenY = display.y;
      screenW = display.width;
      screenH = display.height;
      topOffset = display.visible.y - display.y;
      displayName = display.name;
    } else {
      console.error(`Display "${displaySelector}" not found, using main`);
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

  const config = createGrid({
    preset: preset as any,
    workerCount: count,
    gap,
    screenWidth: screenW,
    screenHeight: screenH,
    screenX,
    screenY,
    topOffset,
    ...(reserveSide && reserveSize > 0 && {
      reserve: { side: reserveSide as any, size: reserveSize },
    }),
  });

  const slots = getAllSlots(config).slice(0, count);

  if (json) {
    console.log(JSON.stringify(slots, null, 2));
  } else {
    const displayInfo = displayName ? ` (${displayName})` : "";
    console.log(`Screen: ${screenW}×${screenH}${displayInfo} | Grid: ${config.cols}×${config.rows} | Workers: ${count}\n`);
    for (const slot of slots) {
      console.log(
        `  Slot ${slot.slot}: pos(${slot.position.x},${slot.position.y}) size(${slot.viewport.width}×${slot.viewport.height})`
      );
    }
  }
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
printUsage();
process.exit(1);
