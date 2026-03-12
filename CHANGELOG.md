# Changelog

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
