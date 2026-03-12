# Changelog

## Unreleased

### Added
- **Multi-monitor display targeting** — `display` option in `gridConfig()` and `launchGrid()` to tile on a specific monitor: `"main"`, `"internal"`/`"laptop"`, `"secondary"`/`"external"`, index, or name substring (e.g., `"HP Z27"`)
- `listScreens()` — returns all displays with positions in CDP-compatible screen coordinates
- `resolveDisplay()` — resolve a display selector to full display bounds
- `DisplayBounds` and `DisplaySelector` types
- CLI `browser-grid displays` command — show all monitors with positions and usable areas
- Demo scripts accept `--display` flag for multi-monitor targeting
- `/wrap-up` skill — end-of-session checklist for commits, docs, downstream sync
- Workflow rules in CLAUDE.md for deterministic autonomous sessions

### Fixed
- **Menu bar offset detection** — `detectScreen()` now uses NSScreen for accurate menu bar height (was hardcoded 25px, modern MacBooks with notch are 33px)
- **App-mode windows actually work** — `launchGrid()` now uses `launchPersistentContext` so the `--app` flag applies to the page you control (previously `chromium.launch` + `newContext` created a separate non-app window)

### Changed
- `GridConfig` gains `screenX`/`screenY` for display origin offset
- `createGrid()` accepts `screenX`/`screenY` options
- Grid math offsets all slot positions by display origin (enables tiling on non-primary monitors)

## 0.2.0

### Added
- **`launchGrid()` high-level API** — launch multiple tiled browsers in one call with labels, status updates, and cleanup
- **App-mode windows** (`--app` flag) — chromeless windows with no tab bar or URL bar, enabled by default
- **Status-colored overlays** — overlays change color based on test status (blue=running, green=passed, red=failed)
- **CLI** — `browser-grid info` and `browser-grid slots` commands for inspecting grid layout
- **Multi-monitor support** — `listDisplays()` returns all connected displays
- **Shared debug logging** — set `BROWSER_GRID_DEBUG=1` for verbose output
- `MINIMAL_CHROME_FLAGS` and `APP_MODE_FLAGS` exports
- `OverlayStatus` type and status icons
- `GridSlot.setStatus()` for live overlay updates
- `DisplayInfo` type with retina/main/internal flags

### Changed
- Fixture auto-updates overlay status after test completes (pass/fail)
- Fixture reads `testInfo.config.workers` for auto preset (not just env var)
- `gridConfig()` defaults to app-mode launch flags

## 0.1.0

### Added
- Grid math: `getSlot()`, `getAllSlots()`, `createGrid()`, `autoPreset()`, presets
- CDP positioning: `setWindowBounds()`, `getWindowBounds()`
- Screen detection: `detectScreen()`, `detectDock()`
- Overlay injection: `injectOverlay()`, `updateOverlay()`, `removeOverlay()`
- Playwright Test fixture: `gridTest`, `gridConfig()`
- Sequential browser launch with delay (prevents window manager race conditions)
- Reserve zones for terminal/IDE
- Pre-commit hook blocking secrets
