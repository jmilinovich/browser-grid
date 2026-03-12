// Grid math
export {
  getSlot,
  getAllSlots,
  playwrightLaunchArgs,
  createGrid,
  autoPreset,
  presets,
  DEFAULT_SCREEN,
  DEFAULT_TOP_OFFSET,
} from "./grid";
export type { GridConfig, SlotResult } from "./grid";

// CDP window positioning
export { setWindowBounds, getWindowBounds } from "./cdp";
export type { WindowBounds } from "./cdp";

// Screen detection
export { detectScreen, detectDock, listDisplays } from "./screen";
export type { ScreenInfo, DisplayInfo } from "./screen";

// Overlay
export { injectOverlay, updateOverlay, removeOverlay } from "./overlay";
export type { OverlayOptions, OverlayStatus } from "./overlay";

// Chrome flags
export { MINIMAL_CHROME_FLAGS, APP_MODE_FLAGS } from "./chrome-flags";

// High-level launcher
export { launchGrid } from "./launch";
export type { LaunchGridOptions, GridSlot, GridInstance } from "./launch";

// Parallel test runner
export { runParallelTests } from "./runner";
export type { TestDefinition, RunnerOptions, RunnerResult } from "./runner";

// Playwright Test fixture
export { gridTest, gridConfig } from "./fixture";
export type { GridFixtureOptions } from "./fixture";
