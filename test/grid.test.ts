import { test, expect } from "@playwright/test";
import {
  getSlot,
  getAllSlots,
  autoPreset,
  createGrid,
  presets,
  playwrightLaunchArgs,
  DEFAULT_SCREEN,
  DEFAULT_TOP_OFFSET,
} from "../src/grid";

test.describe("getSlot", () => {
  const baseConfig = { cols: 2, rows: 2, screenWidth: 1000, screenHeight: 800, topOffset: 0, gap: 0 };

  test("should compute correct positions for a 2x2 grid", () => {
    const s0 = getSlot(0, baseConfig);
    expect(s0.position).toEqual({ x: 0, y: 0 });
    expect(s0.viewport).toEqual({ width: 500, height: 400 });

    const s1 = getSlot(1, baseConfig);
    expect(s1.position).toEqual({ x: 500, y: 0 });

    const s2 = getSlot(2, baseConfig);
    expect(s2.position).toEqual({ x: 0, y: 400 });

    const s3 = getSlot(3, baseConfig);
    expect(s3.position).toEqual({ x: 500, y: 400 });
  });

  test("should apply top offset for menu bar", () => {
    const config = { ...baseConfig, topOffset: 25 };
    const s0 = getSlot(0, config);
    expect(s0.position.y).toBe(25);
    expect(s0.viewport.height).toBe(Math.floor((800 - 25) / 2));
  });

  test("should use default screen size when not specified", () => {
    const config = { cols: 1, rows: 1 };
    const s = getSlot(0, config);
    expect(s.viewport.width).toBe(DEFAULT_SCREEN.width);
    expect(s.viewport.height).toBe(DEFAULT_SCREEN.height - DEFAULT_TOP_OFFSET);
  });

  test("should handle gap between windows", () => {
    const config = { ...baseConfig, gap: 10 };
    const s0 = getSlot(0, config);
    const s1 = getSlot(1, config);

    expect(s0.viewport.width).toBe(495);
    expect(s1.position.x).toBe(505);
  });

  test("should wrap slots around the grid", () => {
    const s = getSlot(4, baseConfig);
    expect(s.position).toEqual({ x: 0, y: 0 });
    expect(s.slot).toBe(4);
  });

  test("should include bounds matching position and viewport", () => {
    const s = getSlot(0, baseConfig);
    expect(s.bounds).toEqual({
      left: s.position.x,
      top: s.position.y,
      width: s.viewport.width,
      height: s.viewport.height,
    });
  });

  test("should include correct launch args", () => {
    const s = getSlot(1, baseConfig);
    expect(s.launchArgs).toContain(`--window-position=${s.position.x},${s.position.y}`);
    expect(s.launchArgs).toContain(`--window-size=${s.viewport.width},${s.viewport.height}`);
  });
});

test.describe("reserve zones", () => {
  const base = { cols: 2, rows: 1, screenWidth: 1000, screenHeight: 800, topOffset: 0, gap: 0 };

  test("should reserve right side", () => {
    const config = { ...base, reserve: { side: "right" as const, size: 300 } };
    const s0 = getSlot(0, config);
    const s1 = getSlot(1, config);

    expect(s0.viewport.width).toBe(350);
    expect(s1.position.x).toBe(350);
    expect(s1.position.x + s1.viewport.width).toBe(700);
  });

  test("should reserve left side", () => {
    const config = { ...base, reserve: { side: "left" as const, size: 200 } };
    const s0 = getSlot(0, config);
    expect(s0.position.x).toBe(200);
    expect(s0.viewport.width).toBe(400);
  });

  test("should reserve top", () => {
    const config = { ...base, rows: 2, reserve: { side: "top" as const, size: 100 } };
    const s0 = getSlot(0, config);
    expect(s0.position.y).toBe(100);
    expect(s0.viewport.height).toBe(350);
  });

  test("should reserve bottom", () => {
    const config = { ...base, rows: 2, reserve: { side: "bottom" as const, size: 100 } };
    const s0 = getSlot(0, config);
    expect(s0.viewport.height).toBe(350);
  });
});

test.describe("getAllSlots", () => {
  test("should return correct number of slots", () => {
    const slots = getAllSlots({ cols: 3, rows: 2 });
    expect(slots).toHaveLength(6);
  });

  test("should not have overlapping slots", () => {
    const config = { cols: 2, rows: 2, screenWidth: 1000, screenHeight: 800, topOffset: 0, gap: 4 };
    const slots = getAllSlots(config);

    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];
        const overlapX =
          a.position.x < b.position.x + b.viewport.width &&
          a.position.x + a.viewport.width > b.position.x;
        const overlapY =
          a.position.y < b.position.y + b.viewport.height &&
          a.position.y + a.viewport.height > b.position.y;
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });
});

test.describe("autoPreset", () => {
  test("should return 1x1 for 1 worker", () => {
    expect(autoPreset(1)).toEqual({ cols: 1, rows: 1 });
  });

  test("should return duo for 2 workers", () => {
    expect(autoPreset(2)).toEqual(presets.duo);
  });

  test("should return quad for 3-4 workers", () => {
    expect(autoPreset(3)).toEqual(presets.quad);
    expect(autoPreset(4)).toEqual(presets.quad);
  });

  test("should return six for 5-6 workers", () => {
    expect(autoPreset(5)).toEqual(presets.six);
    expect(autoPreset(6)).toEqual(presets.six);
  });

  test("should handle large worker counts", () => {
    const config = autoPreset(16);
    expect(config.cols * config.rows).toBeGreaterThanOrEqual(16);
  });
});

test.describe("createGrid", () => {
  test("should use auto preset by default", () => {
    const config = createGrid({ workerCount: 4 });
    expect(config.cols).toBe(2);
    expect(config.rows).toBe(2);
  });

  test("should accept named presets", () => {
    const config = createGrid({ preset: "six", gap: 4 });
    expect(config.cols).toBe(3);
    expect(config.rows).toBe(2);
    expect(config.gap).toBe(4);
  });

  test("should accept custom grid config", () => {
    const config = createGrid({ preset: { cols: 5, rows: 3 } });
    expect(config.cols).toBe(5);
    expect(config.rows).toBe(3);
  });

  test("should merge reserve option", () => {
    const config = createGrid({
      preset: "quad",
      reserve: { side: "right", size: 700 },
    });
    expect(config.reserve).toEqual({ side: "right", size: 700 });
  });
});

test.describe("playwrightLaunchArgs", () => {
  test("should return launch args array", () => {
    const args = playwrightLaunchArgs(0, { cols: 2, rows: 2 });
    expect(args).toHaveLength(2);
    expect(args[0]).toMatch(/^--window-position=/);
    expect(args[1]).toMatch(/^--window-size=/);
  });
});
