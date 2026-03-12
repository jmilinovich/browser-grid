# browser-grid

A Playwright plugin that tiles headful browser windows in a grid for watching parallel tests.

## Quick reference

- **Build**: `npm run build`
- **Test**: `npm test` (runs Playwright tests in test/)
- **Demo**: `npx tsx demo.ts [count] [reserveSide] [reserveSize]`
- **Demo with real sites**: `npx tsx demo-real.ts`
- **Publish dry-run**: `npm publish --dry-run`

## Architecture

```
src/
  grid.ts        Grid math (getSlot, getAllSlots, presets, autoPreset, createGrid)
  cdp.ts         CDP window positioning (setWindowBounds, getWindowBounds)
  screen.ts      macOS screen detection (resolution, dock, menu bar)
  overlay.ts     Inject slot label overlay into pages
  chrome-flags.ts  Minimal/app-mode Chrome flags
  fixture.ts     Playwright Test fixture (gridTest, gridConfig)
  index.ts       Public API re-exports
```

## Key design decisions

- CDP `Browser.setWindowBounds` for precise positioning, `--window-position` launch args as fallback
- `--app` mode for chromeless windows (no tab bar, no URL bar)
- Sequential browser launches with delays to prevent macOS window manager race conditions
- Double CDP positioning: once on launch, once after all windows settle
- `TEST_PARALLEL_INDEX` / `testInfo.parallelIndex` maps directly to grid slot

## Working on this project

See PLAN.md for the goal function. Pick the lowest unmet criterion and iterate.

When making changes:
- Run `npm run build` to check TypeScript compiles
- Run `npm test` to verify all tests pass (26 currently)
- Test visually with `npx tsx demo.ts 4` or `npx tsx demo.ts 8`
- Pre-commit hook will block secrets/credentials
