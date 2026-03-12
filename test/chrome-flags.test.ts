import { test, expect } from "@playwright/test";
import { MINIMAL_CHROME_FLAGS, APP_MODE_FLAGS } from "../src/chrome-flags";

test.describe("chrome flags", () => {
  test("MINIMAL_CHROME_FLAGS should include key flags", () => {
    expect(MINIMAL_CHROME_FLAGS).toContain("--disable-extensions");
    expect(MINIMAL_CHROME_FLAGS).toContain("--no-first-run");
    expect(MINIMAL_CHROME_FLAGS).toContain("--disable-sync");
  });

  test("APP_MODE_FLAGS should include --app and all minimal flags", () => {
    const appFlag = APP_MODE_FLAGS.find((f) => f.startsWith("--app="));
    expect(appFlag).toBeDefined();
    // Should include all minimal flags
    for (const flag of MINIMAL_CHROME_FLAGS) {
      expect(APP_MODE_FLAGS).toContain(flag);
    }
  });

  test("APP_MODE_FLAGS --app should use a data URL", () => {
    const appFlag = APP_MODE_FLAGS.find((f) => f.startsWith("--app="))!;
    expect(appFlag).toMatch(/^--app=data:/);
  });
});
