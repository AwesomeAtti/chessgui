/**
 * The single frontend IPC adapter.
 *
 * **This is the only module in the frontend permitted to import `@tauri-apps/api`.**
 * That is a standing constraint, not a style preference: it is the thing that keeps
 * ADR-0001 reversible. If Tauri calls get sprinkled through components, switching to
 * Electron (or to anything else) stops being a swap of this file and becomes a rewrite.
 * `scripts/check-no-literals.mjs` enforces the rule in CI.
 *
 * Two further rules, both from B-072:
 *
 * - The backend returns error **codes**, never English prose. This module surfaces them
 *   as-is; the caller maps them to localised messages.
 * - Nothing here produces a user-facing string.
 *
 * The adapter also degrades gracefully outside Tauri, so `npm run dev` works in a plain
 * browser. That is not just a convenience — a browser control is what caught the false
 * negative in B-048 (see B-077).
 */

import type { Game } from "@/model/game";

/** Machine-readable error. Mirrors `AppError` in `src-tauri/src/lib.rs`. */
export interface AppError {
  /** Stable key the frontend maps to a localised message. Never displayed raw. */
  readonly code: string;
  /** Non-translated diagnostic context. For logs, never for the user. */
  readonly detail?: string | undefined;
}

export type IpcResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: AppError };

/** Error codes this adapter can produce itself, independent of the backend. */
export const IpcErrorCode = {
  /** Running outside a Tauri window — expected during browser development. */
  Unavailable: "ipc.unavailable",
  /** The call reached the backend and failed in a way we could not classify. */
  Unknown: "ipc.unknown",
} as const;

/**
 * A game the importer refused. Mirrors `ImportError` in `src-tauri/src/import/model.rs`.
 *
 * **There is at most one of these per import, and it is always terminal.** That is a measured
 * property of `pgn-reader` rather than a design choice: its two errors are irrecoverable, so an
 * unterminated comment swallows the rest of the input. Anything downstream that assumes a list
 * of holes in an otherwise complete import is assuming something false — see ADR-0009's
 * session-6 addendum.
 */
export interface ImportFailure {
  /** 0-based position of the failing game within the pasted text. The UI adds one. */
  readonly gameIndex: number;
  /** Stable code, mapped to wording by the frontend (B-072). Never displayed raw. */
  readonly code: string;
  /** The parser's own untranslated message. Diagnostics only. */
  readonly detail: string;
  /** Byte offset past which nothing could be read. */
  readonly byteOffset: number;
  readonly white: string | null;
  readonly black: string | null;
  readonly date: string | null;
}

/** Mirrors `ImportSummary` in `src-tauri/src/import/model.rs`. */
export interface ImportSummary {
  readonly games: readonly Game[];
  readonly errors: readonly ImportFailure[];
}

/** Mirrors `AppInfo` in `src-tauri/src/lib.rs`. */
export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly license: string;
}

/** True when running inside a Tauri webview rather than a plain browser. */
export function isShellAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function toAppError(cause: unknown): AppError {
  // The backend sends `{ code, detail }`. Anything else is a genuine surprise.
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    const candidate = cause as { code: unknown; detail?: unknown };
    if (typeof candidate.code === "string") {
      return {
        code: candidate.code,
        detail:
          typeof candidate.detail === "string" ? candidate.detail : undefined,
      };
    }
  }
  return { code: IpcErrorCode.Unknown, detail: String(cause) };
}

/**
 * Invoke a backend command.
 *
 * Dynamically imported so the Tauri API is never pulled into a plain-browser bundle,
 * which is what lets the dev server run without a shell.
 */
async function invoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<IpcResult<T>> {
  if (!isShellAvailable()) {
    return { ok: false, error: { code: IpcErrorCode.Unavailable } };
  }
  try {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return { ok: true, value: (await tauriInvoke<T>(command, args)) };
  } catch (cause) {
    return { ok: false, error: toAppError(cause) };
  }
}

// --- The typed surface. One function per backend command; nothing else calls `invoke`. ---

export function getAppInfo(): Promise<IpcResult<AppInfo>> {
  return invoke<AppInfo>("app_info");
}

/**
 * Import pasted PGN text.
 *
 * The backend command returns no error of its own: under ADR-0009 a refused game is data in
 * `errors`, not a failed call. An `IpcResult` failure here therefore means the transport
 * failed — running outside Tauri, most likely — and not that the PGN was bad.
 */
export function importPgnText(text: string): Promise<IpcResult<ImportSummary>> {
  return invoke<ImportSummary>("import_pgn_text", { text });
}
