/**
 * Turning an import result into the pieces the UI renders (B-007 milestones 3 and 4).
 *
 * Pure, and separate from the dialog on purpose: the decisions here have edge cases worth
 * testing, and none of them need a DOM. The component's job is to interpolate the keys this
 * returns; **it never composes a sentence out of fragments**, because word order differs by
 * language (B-072).
 *
 * # The invariant that changed at milestone 4
 *
 * Milestone 3's shape was dictated by one measured fact: **there is at most one failure per
 * import, and it ends the import.** `pgn-reader`'s two errors are irrecoverable, so an
 * unterminated comment swallows the rest of the text.
 *
 * That is still true — of **one input**. Milestone 4 imports files, and *several files are
 * several inputs*, so an operation can now report a failure followed by later successes. This
 * is the "n games with holes" shape the standing constraint warns against, arriving
 * legitimately because the holes fall between files rather than inside one.
 *
 * So a report has two forms and one renderer:
 *
 * - **A paste** is one input: `files` is null and `failure` is the single failure, or null.
 * - **Files** are many inputs: `files` holds one row each, and `failure` is null even when
 *   some file failed, because "the failure" is no longer a thing that exists.
 *
 * Keeping `failure` non-null only in the single-input case is deliberate. The alternative —
 * synthesising a "first failure" for the multi-file case — would let every existing consumer
 * keep compiling while quietly showing one problem and hiding the rest, which is the failure
 * this module exists to prevent.
 */
import type {
  FileImport,
  ImportEncoding,
  ImportFailure,
  ImportSummary,
} from "@/shell/ipc";
import type { GameId } from "@/model/game";

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

/** Catalogue keys for why a file never reached the parser at all. */
export const FILE_REASON_KEYS = {
  file_unreadable: "import.reason.fileUnreadable",
} as const;

export type FileReasonKey =
  (typeof FILE_REASON_KEYS)[keyof typeof FILE_REASON_KEYS];

/** Which sentence the summary line is. */
export type ImportSummaryKey =
  | "import.summary.ok"
  | "import.summary.stopped"
  | "import.summary.none"
  | "import.summary.empty"
  | "import.summary.okFiles"
  | "import.summary.stoppedFiles"
  | "import.summary.noneFiles";

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

/** One row of a multi-file report. */
export interface ImportReportFile {
  /** Base name. Empty only in the pathological case the backend guards against. */
  readonly name: string;
  readonly imported: number;
  /** The parser refused a game in this file, ending it. */
  readonly failure: ImportReportFailure | null;
  /** The file never reached the parser — missing, a directory, no permission. */
  readonly unreadableKey: FileReasonKey | null;
  /**
   * Which decoder read it, or null when it could not be read.
   *
   * Surfaced rather than hidden because **milestone 4 is the first time ADR-0009 rule 5 is
   * reachable at all** — pasted text has already been decoded by the webview, so only a file
   * can trigger the Latin-1 fallback. A silent fallback is how a mis-decoded name gets into a
   * library and stays there.
   */
  readonly encoding: ImportEncoding | null;
}

export interface ImportReport {
  /** Total across every input. */
  readonly imported: number;
  readonly summaryKey: ImportSummaryKey;
  /** The single failure. Always null for a multi-file report — see the module note. */
  readonly failure: ImportReportFailure | null;
  /** One row per file, or null when this was a paste. */
  readonly files: readonly ImportReportFile[] | null;
  /** How many files did not finish, for the summary line. Zero for a paste. */
  readonly filesFailed: number;
  /**
   * The id of the only game imported, when exactly one arrived and nothing went wrong.
   *
   * Drives the offer to open it (owner's call, milestone 4). Null in every other case,
   * including a one-game import that also had a failure — there is something more important
   * to say then.
   */
  readonly singleGameId: GameId | null;
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
 * Reduce a single-input summary to what the report shows.
 *
 * Only the first failure is read. The backend cannot currently produce a second from one
 * input — but taking the first rather than asserting there is only one means a future importer
 * that *can* (see B-116, resynchronisation) degrades to showing the earliest problem instead
 * of crashing here.
 */
export function buildImportReport(summary: ImportSummary): ImportReport {
  const imported = summary.games.length;
  const first = summary.errors[0];
  const only = imported === 1 ? (summary.games[0]?.id ?? null) : null;

  if (first === undefined) {
    return {
      imported,
      summaryKey: imported === 0 ? "import.summary.empty" : "import.summary.ok",
      failure: null,
      files: null,
      filesFailed: 0,
      singleGameId: only,
    };
  }

  return {
    imported,
    summaryKey: imported === 0 ? "import.summary.none" : "import.summary.stopped",
    failure: toReportFailure(first),
    files: null,
    filesFailed: 0,
    singleGameId: null,
  };
}

/**
 * Reduce a batch of files to what the report shows.
 *
 * Every file gets a row, including the ones that went perfectly: the list is the record of
 * what was asked for as much as of what went wrong, and a list that only shows failures makes
 * "did it read the second file at all?" unanswerable.
 */
export function buildFileImportReport(
  results: readonly FileImport[],
): ImportReport {
  const files: ImportReportFile[] = results.map((result) => {
    if (result.outcome.kind === "unreadable") {
      return {
        name: result.name,
        imported: 0,
        failure: null,
        unreadableKey:
          FILE_REASON_KEYS[
            result.outcome.code as keyof typeof FILE_REASON_KEYS
          ] ?? FILE_REASON_KEYS.file_unreadable,
        encoding: null,
      };
    }
    const { summary, encoding } = result.outcome;
    const first = summary.errors[0];
    return {
      name: result.name,
      imported: summary.games.length,
      failure: first === undefined ? null : toReportFailure(first),
      unreadableKey: null,
      encoding,
    };
  });

  const imported = files.reduce((total, file) => total + file.imported, 0);
  const filesFailed = files.filter(
    (file) => file.failure !== null || file.unreadableKey !== null,
  ).length;

  // The single-game offer applies to files too: dropping one game on the library is the same
  // gesture as pasting one, and it would be strange for only one of them to offer to open it.
  const singleGameId =
    imported === 1 && filesFailed === 0
      ? (results.flatMap((result) =>
          result.outcome.kind === "imported" ? result.outcome.summary.games : [],
        )[0]?.id ?? null)
      : null;

  const summaryKey: ImportSummaryKey =
    filesFailed > 0
      ? imported === 0
        ? "import.summary.noneFiles"
        : "import.summary.stoppedFiles"
      : "import.summary.okFiles";

  return {
    imported,
    summaryKey,
    failure: null,
    files,
    filesFailed,
    singleGameId,
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
 * **Only a wholly clean import closes it**, and the exceptions are the point:
 *
 * - A failure must stay on screen. It is the only copy of "we stopped at game 13, and nothing
 *   after byte 1,204 was read", and a modal that dismisses that is worse than no report.
 * - Importing *nothing* must stay on screen too. Text with no games in it is not an error —
 *   the importer accepts anything — but silently closing on it looks exactly like a crash, and
 *   the user is owed the sentence explaining that their paste contained no games.
 * - **A single game stays, to offer to open it** (owner's call, milestone 4). That is not a
 *   fourth exception bolted on: the standing rule is *the strip always records; the dialog
 *   additionally stops you only when there is a decision*, and "open this now?" is a decision.
 *   Lichess does the opposite and navigates straight to the game — it can afford to, because a
 *   single game is the only case it has.
 */
export function shouldCloseAfterImport(report: ImportReport): boolean {
  return (
    report.failure === null &&
    report.filesFailed === 0 &&
    report.imported > 0 &&
    report.singleGameId === null
  );
}
