/**
 * Turning an import result into the pieces the UI renders (B-007 milestone 3).
 *
 * Pure, and separate from the dialog on purpose: the decisions here have edge cases worth
 * testing, and none of them need a DOM. The component's job is to interpolate the keys this
 * returns; **it never composes a sentence out of fragments**, because word order differs by
 * language (B-072).
 *
 * The shape of this module is dictated by one measured fact: **there is at most one failure
 * per import, and it ends the import.** `pgn-reader`'s two errors are irrecoverable, so an
 * unterminated comment swallows the rest of the text. That is why there is no list here, and
 * why the summary has to be able to say "12 games imported, then stopped" — a sentence no
 * import report wants to contain, and the honest one.
 */
import type { ImportFailure, ImportSummary } from "@/shell/ipc";

/**
 * Catalogue keys for why the parser refused a game.
 *
 * The vocabulary is closed because `pgn-reader`'s is — two messages, read from its source
 * rather than inferred. `import.reason.parseFailed` is the fallback for the release that grows
 * a third (B-063); reaching it means a game was refused for a reason we cannot yet name, which
 * is worth saying vaguely rather than not at all.
 */
export const IMPORT_REASON_KEYS = {
  unterminated_comment: "import.reason.unterminatedComment",
  unterminated_tag: "import.reason.unterminatedTag",
  parse_failed: "import.reason.parseFailed",
} as const;

export type ImportReasonKey =
  (typeof IMPORT_REASON_KEYS)[keyof typeof IMPORT_REASON_KEYS];

/** Which sentence the summary line is. */
export type ImportSummaryKey =
  | "import.summary.ok"
  | "import.summary.stopped"
  | "import.summary.none"
  | "import.summary.empty";

export interface ImportReportFailure {
  /** 1-based, because it is shown to a person counting games in a file. */
  readonly gameNumber: number;
  readonly reasonKey: ImportReasonKey;
  /** Header text identifying the game, or null where the tags never parsed. */
  readonly white: string | null;
  readonly black: string | null;
  readonly date: string | null;
  readonly byteOffset: number;
}

export interface ImportReport {
  readonly imported: number;
  readonly summaryKey: ImportSummaryKey;
  readonly failure: ImportReportFailure | null;
}

function reasonKey(code: string): ImportReasonKey {
  return (
    IMPORT_REASON_KEYS[code as keyof typeof IMPORT_REASON_KEYS] ??
    IMPORT_REASON_KEYS.parse_failed
  );
}

function toReportFailure(failure: ImportFailure): ImportReportFailure {
  return {
    gameNumber: failure.gameIndex + 1,
    reasonKey: reasonKey(failure.code),
    white: failure.white,
    black: failure.black,
    date: failure.date,
    byteOffset: failure.byteOffset,
  };
}

/**
 * Reduce a summary to what the report shows.
 *
 * Only the first failure is read. The backend cannot currently produce a second — but taking
 * the first rather than asserting there is only one means a future importer that *can* (see
 * B-116, resynchronisation) degrades to showing the earliest problem instead of crashing here.
 */
export function buildImportReport(summary: ImportSummary): ImportReport {
  const imported = summary.games.length;
  const first = summary.errors[0];

  if (first === undefined) {
    return {
      imported,
      summaryKey: imported === 0 ? "import.summary.empty" : "import.summary.ok",
      failure: null,
    };
  }

  return {
    imported,
    summaryKey: imported === 0 ? "import.summary.none" : "import.summary.stopped",
    failure: toReportFailure(first),
  };
}

/**
 * Whether the failing game can be named to a human at all.
 *
 * Measured: on an unterminated comment every roster tag arrives before the parser gives up, so
 * this is normally true. It is false when the tag section itself is what failed — and a report
 * that says "game 13" with no players is still better than one that invents them.
 */
export function hasGameIdentity(failure: ImportReportFailure): boolean {
  return failure.white !== null || failure.black !== null || failure.date !== null;
}

/**
 * Whether the dialog has finished its job and should get out of the way.
 *
 * **Only a clean import closes it**, and the two exceptions are the point:
 *
 * - A failure must stay on screen. It is the only copy of "we stopped at game 13, and nothing
 *   after byte 1,204 was read", and a modal that dismisses that is worse than no report.
 * - Importing *nothing* must stay on screen too. Text with no games in it is not an error —
 *   the importer accepts anything — but silently closing on it looks exactly like a crash, and
 *   the user is owed the sentence explaining that their paste contained no games.
 *
 * So the condition is "something arrived and nothing went wrong", which is narrower than
 * "no error" and was reported as awkward behaviour when it was the latter.
 */
export function shouldCloseAfterImport(report: ImportReport): boolean {
  return report.failure === null && report.imported > 0;
}
