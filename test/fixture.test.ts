import { test, expect } from "@playwright/test";
import { gridConfig } from "../src/fixture";

test.describe("gridConfig", () => {
  test("should return _browserGrid and launchOptions", () => {
    const config = gridConfig({ preset: "quad", gap: 4 });
    expect(config._browserGrid).toEqual({ preset: "quad", gap: 4 });
    expect(config.launchOptions).toBeDefined();
    const args = (config.launchOptions as any).args as string[];
    expect(args.some((a: string) => a.startsWith("--app="))).toBe(true);
  });

  test("should use minimal flags when appMode is false", () => {
    const config = gridConfig({ appMode: false });
    const args = (config.launchOptions as any).args as string[];
    expect(args.some((a: string) => a.startsWith("--app="))).toBe(false);
    expect(args).toContain("--disable-extensions");
  });

  test("should default to app mode", () => {
    const config = gridConfig();
    const args = (config.launchOptions as any).args as string[];
    expect(args.some((a: string) => a.startsWith("--app="))).toBe(true);
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
