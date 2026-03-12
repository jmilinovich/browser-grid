import { test, expect } from "@playwright/test";
import { gridConfig, gridLaunchArgs } from "../src/fixture";

test.describe("gridConfig", () => {
  test("should return _browserGrid without launchOptions", () => {
    const config = gridConfig({ preset: "quad", gap: 4 });
    expect(config._browserGrid).toEqual({ preset: "quad", gap: 4 });
    // gridConfig no longer sets launchOptions (avoids clobbering user args)
    expect(config.launchOptions).toBeUndefined();
  });

  test("should pass through all options", () => {
    const opts = {
      preset: "eight" as const,
      gap: 8,
      reserve: { side: "right" as const, size: 500 },
      overlay: false,
      overlayDuration: 3000,
    };
    const config = gridConfig(opts);
    expect(config._browserGrid).toEqual(opts);
  });
});

test.describe("gridLaunchArgs", () => {
  test("should return app-mode flags by default", () => {
    const args = gridLaunchArgs();
    expect(args.some((a) => a.startsWith("--app="))).toBe(true);
    expect(args).toContain("--disable-extensions");
  });

  test("should return minimal flags when appMode is false", () => {
    const args = gridLaunchArgs({ appMode: false });
    expect(args.some((a) => a.startsWith("--app="))).toBe(false);
    expect(args).toContain("--disable-extensions");
  });

  test("should be composable with user args", () => {
    const userArgs = ["--disable-blink-features=AutomationControlled"];
    const combined = [...gridLaunchArgs(), ...userArgs];
    expect(combined).toContain("--disable-blink-features=AutomationControlled");
    expect(combined.some((a) => a.startsWith("--app="))).toBe(true);
  });
});
