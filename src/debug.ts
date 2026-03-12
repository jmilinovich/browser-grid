const PREFIX = "[browser-grid]";

function isDebug(): boolean {
  return !!(
    process.env.BROWSER_GRID_DEBUG ||
    process.env.DEBUG?.includes("browser-grid")
  );
}

export function debug(msg: string, ...args: unknown[]): void {
  if (isDebug()) {
    console.log(`${PREFIX} ${msg}`, ...args);
  }
}

export function warn(msg: string, ...args: unknown[]): void {
  if (isDebug()) {
    console.warn(`${PREFIX} ${msg}`, ...args);
  }
}
