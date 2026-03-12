import { launchGrid } from "./src/launch";

/**
 * Simplest possible demo using launchGrid().
 * Usage: npx tsx demo-simple.ts
 */
async function main() {
  const grid = await launchGrid({
    count: 4,
    labels: ["GitHub", "Wikipedia", "Hacker News", "Example.com"],
    gap: 4,
  });

  // Navigate all pages in parallel
  await Promise.all([
    grid.get(0).page.goto("https://github.com").then(() => grid.get(0).setStatus("passed", "GitHub ✓")),
    grid.get(1).page.goto("https://en.wikipedia.org").then(() => grid.get(1).setStatus("passed", "Wikipedia ✓")),
    grid.get(2).page.goto("https://news.ycombinator.com").then(() => grid.get(2).setStatus("passed", "HN ✓")),
    grid.get(3).page.goto("https://example.com").then(() => grid.get(3).setStatus("passed", "Example ✓")),
  ]);

  console.log("✓ All 4 pages loaded. Press Ctrl+C to close.");
  await new Promise(() => {});
}

main().catch(console.error);
