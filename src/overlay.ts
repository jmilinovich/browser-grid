import type { Page } from "@playwright/test";

export type OverlayStatus = "running" | "passed" | "failed" | "idle";

export interface OverlayOptions {
  /** Slot number to display */
  slot: number;
  /** Test name to display */
  testName?: string;
  /** Auto-hide after this many ms (0 = always show, default: 0) */
  duration?: number;
  /** Overlay position (default: 'top-left') */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Test status — changes the overlay color (default: 'running') */
  status?: OverlayStatus;
}

const STATUS_COLORS: Record<OverlayStatus, string> = {
  running: "rgba(59,130,246,0.85)",  // blue
  passed: "rgba(34,197,94,0.85)",    // green
  failed: "rgba(239,68,68,0.85)",    // red
  idle: "rgba(0,0,0,0.7)",          // dark gray
};

const STATUS_ICONS: Record<OverlayStatus, string> = {
  running: "▶",
  passed: "✓",
  failed: "✗",
  idle: "○",
};

/**
 * Inject a slot label overlay into the page.
 * Shows slot number, test name, and status indicator.
 * Uses pointer-events: none so it doesn't interfere with page interaction.
 */
export async function injectOverlay(
  page: Page,
  options: OverlayOptions
): Promise<void> {
  const { slot, testName, duration = 0, position = "top-left", status = "running" } = options;

  const icon = STATUS_ICONS[status];
  const color = STATUS_COLORS[status];
  const label = testName ? `${icon} #${slot} ${testName}` : `${icon} #${slot}`;

  const positionStyles: Record<string, string> = {
    "top-left": "top:4px;left:4px;",
    "top-right": "top:4px;right:4px;",
    "bottom-left": "bottom:4px;left:4px;",
    "bottom-right": "bottom:4px;right:4px;",
  };

  const posStyle = positionStyles[position] || positionStyles["top-left"];

  const overlayScript = `
    (function() {
      const existing = document.getElementById('__browser_grid_overlay');
      if (existing) existing.remove();

      const el = document.createElement('div');
      el.id = '__browser_grid_overlay';
      el.textContent = ${JSON.stringify(label)};
      el.style.cssText = 'position:fixed;${posStyle}z-index:2147483647;pointer-events:none;background:${color};color:#fff;font:bold 11px/1.4 system-ui,-apple-system,sans-serif;padding:2px 8px;border-radius:4px;white-space:nowrap;transition:opacity 0.3s,background 0.3s;letter-spacing:0.3px;';
      document.documentElement.appendChild(el);

      ${
        duration > 0
          ? `setTimeout(function() { el.style.opacity = '0'; setTimeout(function() { el.remove(); }, 300); }, ${duration});`
          : ""
      }
    })();
  `;

  try {
    // Try to inject immediately if page has content
    await page.evaluate(overlayScript).catch(() => {});

    // Also add as init script so it re-injects on navigation
    await page.addInitScript(overlayScript);
  } catch {
    // Page might not be ready; the addInitScript will catch future navigations
  }
}

/**
 * Update the overlay text and/or status.
 */
export async function updateOverlay(
  page: Page,
  options: OverlayOptions
): Promise<void> {
  await injectOverlay(page, options);
}

/**
 * Remove the overlay from the page.
 */
export async function removeOverlay(page: Page): Promise<void> {
  try {
    await page.evaluate(`
      (function() {
        const el = document.getElementById('__browser_grid_overlay');
        if (el) el.remove();
      })();
    `);
  } catch {
    // Ignore if page is closed or not ready
  }
}
