/**
 * Portability guardrails (B-069).
 *
 * Only macOS can currently be tested (B-068), and the failure mode that makes Windows and
 * Linux unshippable a year from now is not a big architectural mistake — it is a hundred
 * small implicit macOS assumptions, each individually reasonable. This module is where
 * those assumptions are made explicit and kept in one place.
 *
 * Known leak points, per B-069: path handling, file dialogs, Cmd vs Ctrl shortcuts,
 * menu-bar conventions, engine binary discovery, line endings. Each gets an abstraction
 * here *before* it is needed in a component, not after.
 *
 * Detection is currently user-agent based, which is crude. That is acceptable precisely
 * because it is behind this boundary: swapping it for `@tauri-apps/plugin-os` later
 * changes this file and nothing else.
 */

export type PlatformKind = "macos" | "windows" | "linux" | "web";

let cached: PlatformKind | null = null;

export function platformKind(): PlatformKind {
  if (cached !== null) return cached;

  if (typeof navigator === "undefined") {
    cached = "web";
    return cached;
  }
  const ua = navigator.userAgent;
  if (/Mac|iPhone|iPad/i.test(ua)) cached = "macos";
  else if (/Win/i.test(ua)) cached = "windows";
  else if (/Linux|X11/i.test(ua)) cached = "linux";
  else cached = "web";

  return cached;
}

export function isMac(): boolean {
  return platformKind() === "macos";
}

/**
 * The platform's primary modifier: Cmd on macOS, Ctrl everywhere else.
 *
 * Returns a symbol/word for display. It is a *label*, and labels are user-facing, so the
 * caller passes it through the message catalogue rather than rendering it directly.
 */
export function accelKeyLabel(): string {
  return isMac() ? "⌘" : "Ctrl";
}

/** True when the platform's primary modifier is held. Use this, never `e.metaKey`. */
export function isAccelPressed(event: KeyboardEvent | MouseEvent): boolean {
  return isMac() ? event.metaKey : event.ctrlKey;
}

/** Path separator for display purposes. Path *construction* belongs in Rust. */
export function pathSeparator(): string {
  return platformKind() === "windows" ? "\\" : "/";
}

/**
 * The line ending to use when writing text the user will open in a native editor —
 * relevant to PGN export (B-017). PGN itself is newline-tolerant on read.
 */
export function nativeLineEnding(): string {
  return platformKind() === "windows" ? "\r\n" : "\n";
}
