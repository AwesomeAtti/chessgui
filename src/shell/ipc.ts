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

import type { Game, GameId, GameSummary } from "@/model/game";

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

/**
 * What one `import_pgn_text` call persisted. Mirrors `TextImportResult` in
 * `src-tauri/src/lib.rs`.
 *
 * **No full `Game` values here** (B-011) — that is the fix for the B-033 finding that the IPC
 * payload was 1.5x the source file because every row carried its own verbatim PGN over the
 * wire, and the library table never read it. `imported` is just the new, stable ids the
 * database assigned; re-read the library with [`listGames`] and fetch one game with
 * [`getGame`].
 */
export interface TextImportResult {
  readonly imported: readonly GameId[];
  readonly errors: readonly ImportFailure[];
}

/** Which decoder read a file's bytes. Mirrors `Encoding` in `src-tauri/src/import/model.rs`. */
export type ImportEncoding = "utf8" | "latin1";

/**
 * What one file produced. Mirrors `FileOutcome` in `src-tauri/src/files.rs`.
 *
 * A discriminated union rather than optional fields, for the same reason it is one on the Rust
 * side: a file either reached the parser or never got that far, and the two cases share no
 * data.
 */
export type FileOutcome =
  | {
      readonly kind: "imported";
      readonly imported: readonly GameId[];
      readonly errors: readonly ImportFailure[];
      readonly encoding: ImportEncoding;
    }
  | {
      readonly kind: "unreadable";
      /** Stable code, mapped to wording by the frontend (B-072). Never displayed raw. */
      readonly code: string;
      /** The OS message, untranslated. Diagnostics only — it carries no path. */
      readonly detail: string;
    };

/** One file's worth of import. Mirrors `FileImport` in `src-tauri/src/files.rs`. */
export interface FileImport {
  /** Base name only. The backend never sends the directory. */
  readonly name: string;
  readonly outcome: FileOutcome;
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
 * Import pasted PGN text and persist whatever parsed.
 *
 * **Parsing still cannot fail in the ADR-0009 sense**: a refused game is data in `errors`, not a
 * failed call. What changed at B-011 is that persistence can fail — a database error (full disk,
 * a poisoned connection) now surfaces as a real `IpcResult` failure with the backend's own error
 * code, not only as the transport failure ("running outside Tauri") this used to be the sole
 * cause of. See the note at the top of `src-tauri/src/lib.rs`.
 */
export function importPgnText(text: string): Promise<IpcResult<TextImportResult>> {
  return invoke<TextImportResult>("import_pgn_text", { text });
}

/**
 * Import one or more PGN files by path (B-007 milestone 4) and persist whatever parsed.
 *
 * Returns one entry per path, in the order given, so the caller can pair results with what it
 * asked for. An unreadable file or a refused game is that entry's outcome rather than a failed
 * call, exactly as before B-011. A database failure is a failed call — see `importPgnText`.
 *
 * **This is the call that breaks the "at most one failure" assumption**, and every consumer
 * needs to know it: that invariant belongs to a single input, and several files are several
 * inputs. See `src-tauri/src/files.rs`.
 */
export function importPgnFiles(
  paths: readonly string[],
): Promise<IpcResult<readonly FileImport[]>> {
  return invoke<readonly FileImport[]>("import_pgn_files", { paths });
}

/**
 * Every game in the database, hot fields only (B-011). **Never carries `tags` or `pgn`** — see
 * [`GameSummary`].
 */
export function listGames(): Promise<IpcResult<readonly GameSummary[]>> {
  return invoke<readonly GameSummary[]>("list_games");
}

/**
 * One game in full, including `tags` and the verbatim `pgn` (B-011). `value` is `null` when
 * `id` does not exist — there is no delete path yet, so in practice that means a stale id from
 * before the database was dropped and rebuilt.
 */
export function getGame(id: GameId): Promise<IpcResult<Game | null>> {
  return invoke<Game | null>("get_game", { id });
}
