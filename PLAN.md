# browser-grid

**A Playwright plugin that tiles headful browser windows in a grid so you can watch parallel tests run.**

No tool like this exists. Zalenium (archived) validated the concept for Selenium. This is the Playwright-native version.

## Goal Function

> **A future Claude session can pick up this file and work autonomously to improve browser-grid. The goal function below defines "better" — iterate until every criterion scores green.**

### Definition of Done (Goal Function)

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | **Zero-config tiling**: `import { gridTest } from 'browser-grid'` and parallel Playwright workers auto-tile based on `TEST_PARALLEL_INDEX` | Run `npx playwright test --workers=4 --headed` with the fixture and all 4 windows tile without overlap |
| 2 | **Slot overlay**: Each browser window shows a small, non-intrusive label (test name + slot number + status) in the corner | Visual inspection — overlay visible, doesn't interfere with page content, auto-hides after 3s or stays as configurable |
| 3 | **Dynamic re-tiling**: When a test finishes and a new one starts in the same worker, the window smoothly inherits the slot. When total workers change, grid recalculates. | Run 8 tests with 4 workers — as tests cycle, windows stay in their slots. No drift, no overlap. |
| 4 | **CDP-powered positioning**: Use `Browser.setWindowBounds` via CDP session for precise, runtime window control. Fall back to `--window-position` launch args. | Windows snap to exact grid positions. `getSlot()` coordinates match actual window bounds (verify via CDP `getWindowBounds`). |
| 5 | **Screen auto-detection**: Detect macOS logical resolution and dock position. No hardcoded screen size. | Works on a 1440p laptop and a 4K external monitor without config changes. |
| 6 | **Clean public API**: Exported functions: `gridTest` (Playwright fixture), `getSlot()`, `getAllSlots()`, `createGrid()`, presets. TypeScript, fully typed. | `npm pack` produces a working package. Types resolve. No Playwright peer dep version lock-in. |
| 7 | **README with GIF**: A README showing the grid in action (4+ browsers tiled, tests running). | README exists with install, usage, API docs, and a demo GIF/screenshot. |
| 8 | **Tests pass**: Unit tests for grid math. Integration test that launches 4 browsers and verifies positions via CDP. | `npm test` green. |
| 9 | **Reserve zones**: User can reserve screen regions (e.g., right 700px for terminal). Grid tiles in remaining space. | Configure `reserve: { side: "right", size: 700 }`, verify browsers don't overlap reserved zone. |
| 10 | **npm publishable**: package.json, LICENSE, .npmignore, builds cleanly, no local path deps. | `npm publish --dry-run` succeeds. |
| 11 | **Composable config — no clobbering**: `gridConfig()` must NOT set `launchOptions` or any key that would overwrite the consumer's own config. Use `gridLaunchArgs()` for chrome flags that users compose themselves. | Verify: spreading `...gridConfig()` after a custom `launchOptions: { args: [...] }` does NOT lose the user's args. |
| 12 | **Downstream skill freshness**: When the API, exports, fixture behavior, or config shape changes, update the downstream consumer at `~/src/canva-ai-routing`. The files to sync are: `playwright.config.ts`, `tests/routes.spec.ts`, and `.claude/commands/route-test.md`. See the table below for what triggers what. | After any API change, check that `cd ~/src/canva-ai-routing && npx playwright test --headed --workers=4` still runs with browser-grid tiling 4 portrait windows. |
| 13 | **Viewport must not be overridden**: The `gridPage` fixture must position/size the window but NEVER override the viewport set in `playwright.config.ts`. Downstream consumers set specific viewports (e.g., 389×798 mobile). The fixture controls the *window*, not the *viewport*. | Set `viewport: { width: 389, height: 798 }` in config, use `gridPage` — verify `page.viewportSize()` is still 389×798. |
| 14 | **launchGrid() for script-based testing**: `launchGrid()` and `runParallelTests()` handle the full lifecycle (launch, position, overlay, status, cleanup) for non-fixture usage (agent scripts, custom runners). | `launchGrid({ count: 4 })` opens 4 tiled browsers, `grid.closeAll()` cleans up. No leaked processes. |

### Downstream Consumer: canva-ai-routing

`~/src/canva-ai-routing` uses browser-grid for Playwright route testing against Canva AI (20 routes, 4 parallel portrait mobile windows at 389×798).

| Change in browser-grid | Update needed in canva-ai-routing |
|---|---|
| Renamed exports (gridTest, gridConfig, gridLaunchArgs) | `playwright.config.ts`, `tests/routes.spec.ts` |
| Changed GridConfig shape / preset names | `playwright.config.ts` grid config |
| Changed fixture behavior (viewport, window sizing) | Verify 389×798 viewport still works — fixture must NOT override viewport |
| New features (overlay options, reserve, status colors, etc.) | Consider adopting in config, update `.claude/commands/route-test.md` |
| Published new version to npm | Update `package.json` dep version (currently uses `file:../browser-grid`) |

### Improvement Loop

A Claude session working on this should:
1. Read this file and the current source
2. Pick the lowest-numbered criterion that isn't fully met
3. Implement it
4. Verify it (run tests, visual check, etc.)
5. If the change affects exports/config/fixture behavior, also update `~/src/canva-ai-routing` per the table above
6. Commit
7. Repeat

---

## Architecture

```
browser-grid/
├── src/
│   ├── index.ts          # Public API exports
│   ├── grid.ts           # Grid math (getSlot, getAllSlots, presets)
│   ├── cdp.ts            # CDP window positioning (setWindowBounds, getWindowBounds)
│   ├── screen.ts         # macOS screen detection (resolution, dock, menu bar)
│   ├── overlay.ts        # Inject slot label overlay into pages
│   └── fixture.ts        # Playwright Test fixture (gridTest)
├── test/
│   ├── grid.test.ts      # Unit tests for grid math
│   └── integration.test.ts # Launch browsers, verify positions
├── demo.ts               # Visual demo script
├── PLAN.md               # This file
├── README.md             # Usage docs
├── package.json
└── tsconfig.json
```

## Key Design Decisions

### 1. Playwright Test Fixture (`gridTest`)
The primary API. Extends Playwright's `test` with a `gridPage` fixture that auto-positions based on `TEST_PARALLEL_INDEX`.

```ts
import { gridTest as test } from 'browser-grid';

test('my test', async ({ gridPage }) => {
  await gridPage.goto('https://myapp.com');
  // browser is already tiled in the grid
});
```

Under the hood:
- Reads `TEST_PARALLEL_INDEX` (set by Playwright Test for each worker)
- Computes grid slot from index
- Launches with `--window-position` args
- After launch, uses CDP `Browser.setWindowBounds` for precise placement
- Injects overlay showing test name + slot

### 2. CDP for Positioning (not just launch args)
Launch args set initial position but can't re-tile. CDP `Browser.setWindowBounds` allows:
- Precise positioning after launch
- Re-tiling when grid config changes
- Verifying actual position matches expected

```ts
const session = await page.context().newCDPSession(page);
const { windowId } = await session.send('Browser.getWindowForTarget');
await session.send('Browser.setWindowBounds', {
  windowId,
  bounds: { left: x, top: y, width: w, height: h, windowState: 'normal' }
});
```

### 3. Screen Detection
Use macOS `system_profiler` or `NSScreen` (via a small Swift helper or osascript) to get:
- Logical resolution (points, not retina pixels)
- Menu bar height
- Dock position and size
- Multi-monitor support (tile across monitors or pick one)

### 4. Slot Overlays
Inject a small `<div>` into each page via `page.addInitScript()` or `page.evaluate()`:
- Shows: slot number, test file name, pass/fail status
- Positioned: top-left corner, semi-transparent
- Non-intrusive: `pointer-events: none`, small font, auto-fade option

### 5. Dynamic Re-tiling
Playwright Test reuses workers. When a worker picks up a new test:
- The slot index stays the same (tied to worker, not test)
- Overlay updates with new test name
- Window stays in position (no jitter)

If the user changes grid config mid-run (unlikely but possible via API), re-tile all windows via CDP.

## Presets

```ts
export const presets = {
  duo:    { cols: 2, rows: 1 },  // 2 side-by-side
  quad:   { cols: 2, rows: 2 },  // 2×2
  six:    { cols: 3, rows: 2 },  // 3×2
  eight:  { cols: 4, rows: 2 },  // 4×2
  nine:   { cols: 3, rows: 3 },  // 3×3
  auto: 'auto',                  // pick based on worker count
};
```

`auto` mode: detect worker count from `TEST_PARALLEL_INDEX` range and pick the tightest grid.

## Configuration

```ts
// playwright.config.ts
import { gridConfig } from 'browser-grid';

export default defineConfig({
  use: {
    ...gridConfig({
      preset: 'auto',           // or { cols: 4, rows: 2 }
      gap: 4,                   // pixels between windows
      reserve: { side: 'right', size: 700 },  // keep terminal visible
      overlay: true,            // show slot labels
      overlayDuration: 3000,    // ms before auto-hide (0 = always show)
    }),
  },
});
```

## npm Package Details

- **Name**: `browser-grid` (check availability) or `playwright-grid-view`
- **Peer dep**: `@playwright/test >= 1.40`
- **Zero runtime deps**
- **License**: MIT
