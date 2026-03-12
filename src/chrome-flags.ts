/**
 * Chrome flags to strip browser UI down to a minimal viewport.
 * Removes bookmarks bar, extensions, sync UI, first-run prompts, etc.
 */
export const MINIMAL_CHROME_FLAGS = [
  "--disable-infobars",
  "--hide-scrollbars",
  "--disable-bookmarks-bar",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-component-update",
  "--disable-sync",
  "--ash-no-nudges",
  "--disable-features=TranslateUI,PasswordManagerOnboarding",
];

/**
 * Chrome flags for fully chromeless "app" mode windows.
 * No tab bar, no URL bar, no bookmarks — just the page content
 * with a thin title bar.
 *
 * Note: --app requires a URL. Use --app=about:blank as a starting point,
 * then navigate with page.goto().
 */
export const APP_MODE_FLAGS = [
  "--app=data:text/html,<html></html>",
  ...MINIMAL_CHROME_FLAGS,
];
