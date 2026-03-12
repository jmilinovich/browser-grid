import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";

const CLI = path.resolve(__dirname, "../dist/cli.js");

function run(args: string): string {
  return execSync(`node ${CLI} ${args}`, { encoding: "utf-8" }).trim();
}

test.describe("CLI", () => {
  test("info should display screen dimensions", () => {
    const output = run("info");
    expect(output).toMatch(/Screen: \d+×\d+/);
    expect(output).toMatch(/Top offset: \d+px/);
  });

  test("slots should display slot positions", () => {
    const output = run("slots 4");
    expect(output).toContain("Grid: 2×2");
    expect(output).toContain("Workers: 4");
    expect(output).toContain("Slot 0:");
    expect(output).toContain("Slot 3:");
  });

  test("slots --json should output valid JSON", () => {
    const output = run("slots 4 --json");
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(4);
    expect(parsed[0]).toHaveProperty("position");
    expect(parsed[0]).toHaveProperty("viewport");
    expect(parsed[0]).toHaveProperty("bounds");
    expect(parsed[0]).toHaveProperty("launchArgs");
  });

  test("slots with --gap should affect positions", () => {
    const withoutGap = JSON.parse(run("slots 4 --json"));
    const withGap = JSON.parse(run("slots 4 --gap 10 --json"));
    // With gap, second slot should be offset further right
    expect(withGap[1].position.x).toBeGreaterThan(withoutGap[1].position.x);
  });

  test("slots with --reserve should reduce available space", () => {
    const normal = JSON.parse(run("slots 4 --json"));
    const reserved = JSON.parse(run("slots 4 --reserve right 500 --json"));
    expect(reserved[0].viewport.width).toBeLessThan(normal[0].viewport.width);
  });

  test("--help should show usage", () => {
    const output = run("--help");
    expect(output).toContain("browser-grid");
    expect(output).toContain("slots");
    expect(output).toContain("info");
  });
});
