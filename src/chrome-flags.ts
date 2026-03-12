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
