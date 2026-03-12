---
description: End-of-session checklist — commit, push, test, update docs, sync downstream
---

# Wrap-Up Checklist

Run through every item below. Fix anything that fails before finishing.

## 1. Build and test

```bash
npm run build
npm test
```

Both must pass. If tests fail, fix them before proceeding.

## 2. Check for uncommitted work

```bash
git status
git diff
```

If there are uncommitted changes:
- Stage and commit them with a descriptive message (see CLAUDE.md commit message format)
- If work is unfinished, use a feature branch with `WIP:` prefix

## 3. Push to remote

```bash
git log origin/main..HEAD --oneline
```

If there are unpushed commits, push them:
```bash
git push
```

If on a feature branch that hasn't been pushed yet:
```bash
git push -u origin HEAD
```

## 4. CHANGELOG.md

If this session made user-facing changes (new features, bug fixes, API changes):
- Add entries under the next version heading in CHANGELOG.md
- If no next version heading exists, create one (e.g., `## Unreleased` or `## 0.3.0`)

## 5. Documentation accuracy

Check these are still accurate after this session's changes:
- **CLAUDE.md** architecture section — does it list all current source files?
- **README.md** — do the API docs, config examples, and CLI docs match current code?
- **GOAL.md** — if a criterion was satisfied, mark it. If the architecture tree is stale, update it.

## 6. Downstream sync (canva-ai-evals)

If this session changed any exports, config shape, fixture behavior, or CLI:

1. Check the sync table in GOAL.md
2. Update affected files in `~/src/canva-ai-evals`:
   - `playwright.config.ts` — imports and config
   - `tests/routes.spec.ts` — fixture usage
   - `.claude/commands/test-routing.md` — browser-grid integration docs
3. Commit downstream changes too

## 7. npm version check

If changes warrant a new release:
- Bump version in package.json
- Update CHANGELOG.md
- Tell the user: "Ready to publish — run `npm publish --access public` in your terminal"

## 8. Summary

After completing the checklist, summarize for the user:
- What was done this session
- What was committed and pushed
- Whether downstream was updated
- Whether a new npm publish is recommended
