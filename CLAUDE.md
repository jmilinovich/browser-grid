# browser-grid

A Playwright plugin that tiles headful browser windows in a grid for watching parallel tests.

## Quick reference

- **Build**: `npm run build`
- **Test**: `npm test` (runs Playwright tests in test/)
- **Demo**: `npx tsx demo.ts [count] [reserveSide] [reserveSize]`
- **Demo with real sites**: `npx tsx demo-real.ts`
- **Publish dry-run**: `npm publish --dry-run`
- **Displays**: `node dist/cli.js displays`

## Architecture

```
src/
  grid.ts          Grid math (getSlot, getAllSlots, presets, autoPreset, createGrid)
  cdp.ts           CDP window positioning (setWindowBounds, getWindowBounds)
  screen.ts        macOS screen detection, multi-monitor (listScreens, resolveDisplay)
  overlay.ts       Status-colored slot label overlays
  chrome-flags.ts  Minimal & app-mode Chrome flag sets
  fixture.ts       Playwright Test fixture (gridTest, gridConfig, gridLaunchArgs)
  launch.ts        High-level launchGrid() API
  runner.ts        runParallelTests() for script-based usage
  cli.ts           CLI: browser-grid info, displays, slots
  index.ts         Public API re-exports
```

## Key design decisions

- CDP `Browser.setWindowBounds` for precise positioning, `--window-position` launch args as fallback
- `--app` mode for chromeless windows (no tab bar, no URL bar)
- Sequential browser launches with delays to prevent macOS window manager race conditions
- Double CDP positioning: once on launch, once after all windows settle
- `TEST_PARALLEL_INDEX` / `testInfo.parallelIndex` maps directly to grid slot
- `gridConfig()` stores options only — never sets `launchOptions` (prevents clobbering)
- `gridLaunchArgs()` returns chrome flags for user composition
- Multi-monitor: `display` option offsets grid to a specific screen's coordinates

## Goal function

See GOAL.md for the autonomous improvement loop. Pick the lowest unmet criterion and iterate.

---

## Workflow Rules (MUST FOLLOW)

These rules apply to every session working on this project. They are not optional.

### 1. Commit cadence

- **Commit after each meaningful unit of work** — a feature, a bug fix, a refactor, a test addition. Not after every file edit, but not after 500 lines either. One logical change = one commit.
- **Never end a session with uncommitted work.** If work is in progress, commit it on a feature branch with a WIP prefix: `WIP: description`.
- **Never commit generated artifacts without their source.** If you change a `.ts` file, the built `.js` must not be committed (it's in .gitignore). If you change a `.mmd` diagram, the `.png` must be re-rendered and committed together.

### 2. Commit messages

Format:
```
Short summary of what changed (imperative mood, <72 chars)

Optional body explaining WHY, not what. The diff shows what.
Mention breaking changes, new exports, or downstream impact.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

- First line: imperative mood ("Add X", "Fix Y", not "Added X" or "Fixes Y")
- If the change affects the public API or downstream consumers, say so in the body
- If tests were added/changed, mention what they cover

### 3. Branch and PR strategy

- **Small, contained changes** (bug fix, single feature, doc update): commit directly to `main`.
- **Larger features or risky changes** (new API surface, breaking changes, multi-file refactors): work on a feature branch, then open a PR into `main`.
- Branch naming: `feat/short-description`, `fix/short-description`, `docs/short-description`
- PRs must include:
  - Summary of what and why (not a diff recap)
  - Test plan (what was verified)
  - Downstream impact (does canva-ai-evals need updating?)
- Push to remote after committing. Don't leave commits local-only.

### 4. Testing requirements

Before every commit:
1. `npm run build` — must compile clean
2. `npm test` — all tests must pass
3. If you added new functionality, add tests for it
4. If you changed grid math or positioning, run a visual demo (`npx tsx demo.ts 4`) and confirm it looks right

### 5. Documentation updates

After any change, check whether these need updating:

| What changed | Update |
|---|---|
| New/renamed export | `src/index.ts` re-exports, README API section |
| New config option | README Configuration section, GOAL.md if it satisfies a criterion |
| New CLI command | README CLI section, `--help` text in cli.ts |
| Bug fix or feature | CHANGELOG.md (under next version heading) |
| Architecture change (new file, moved file) | CLAUDE.md architecture section |
| Satisfied a GOAL.md criterion | Note it as done in GOAL.md |
| Changed exports/config/fixture | Update `~/src/canva-ai-evals` per the downstream sync table in GOAL.md |

### 6. Downstream sync (canva-ai-evals)

`~/src/canva-ai-evals` is the primary consumer (test infrastructure). After any API or behavior change:
1. Check the sync table in GOAL.md
2. Update the affected files in canva-ai-evals
3. Verify the config still works: the import must resolve and the types must match

### 7. npm publishing

- Bump version in `package.json` before publishing
- Update CHANGELOG.md with the new version's changes
- `npm publish --access public` requires Touch ID — tell the user to run it in their terminal
- After publishing, tag the commit: `git tag v{version} && git push --tags`

### 8. End-of-session wrap-up

Before ending any session, run through this checklist (or use `/wrap-up`):
- [ ] All changes committed (no dirty working tree)
- [ ] All commits pushed to remote
- [ ] Tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated if there are user-facing changes
- [ ] Downstream canva-ai-evals updated if API/behavior changed
- [ ] CLAUDE.md architecture section still accurate
- [ ] If a new npm version is warranted, tell the user
