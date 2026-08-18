import { describe, expect, it } from "vitest";

import type { Game } from "@/model/game";
import type { FileImport, ImportFailure, ImportSummary } from "@/shell/ipc";

import {
  buildFileImportReport,
  buildImportReport,
  FILE_REASON_KEYS,
  hasGameIdentity,
  IMPORT_REASON_KEYS,
  shouldCloseAfterImport,
} from "./importReport";

/** A game shaped like the importer's output. Only the count matters to this module. */
function game(id: number): Game {
  return {
    id,
    white: { id: 1, name: "Vasquez, Marta", normalisedName: "vasquez, marta" },
    black: { id: 2, name: "Oyelaran, Tunde", normalisedName: "oyelaran, tunde" },
    event: null,
    site: null,
    date: { raw: "", parsed: null, year: null, month: null },
    round: null,
    result: null,
    eco: null,
    ecoUrl: null,
    whiteElo: null,
    blackElo: null,
    plyCount: 0,
    tags: {},
    pgn: "",
  };
}

function failure(overrides: Partial<ImportFailure> = {}): ImportFailure {
  return {
    gameIndex: 12,
    code: "unterminated_comment",
    detail: "unterminated comment",
    byteOffset: 1204,
    white: "Aliyev, Kamran",
    black: "Novak, Petra",
    date: "2024.05.01",
    ...overrides,
  };
}

function summary(games: number, errors: readonly ImportFailure[] = []): ImportSummary {
  return {
    games: Array.from({ length: games }, (_, index) => game(index)),
    errors,
  };
}

describe("buildImportReport", () => {
  it("reports a clean import", () => {
    const report = buildImportReport(summary(12));
    expect(report.summaryKey).toBe("import.summary.ok");
    expect(report.imported).toBe(12);
    expect(report.failure).toBeNull();
  });

  it("distinguishes an empty paste from a successful one", () => {
    // Not an error: the importer accepts anything, and text with no games in it simply has
    // no games in it. Saying "0 games imported" as though it were a success reads as a bug.
    expect(buildImportReport(summary(0)).summaryKey).toBe("import.summary.empty");
  });

  it("says games imported *and then stopped*, because both halves are true", () => {
    const report = buildImportReport(summary(12, [failure()]));
    expect(report.summaryKey).toBe("import.summary.stopped");
    expect(report.imported).toBe(12);
    expect(report.failure?.gameNumber).toBe(13);
  });

  it("distinguishes stopping partway from importing nothing at all", () => {
    const report = buildImportReport(summary(0, [failure({ gameIndex: 0 })]));
    expect(report.summaryKey).toBe("import.summary.none");
    expect(report.failure?.gameNumber).toBe(1);
  });

  it("counts games from one, because a person counting them in a file does", () => {
    expect(buildImportReport(summary(1, [failure({ gameIndex: 1 })])).failure?.gameNumber).toBe(2);
  });

  it("maps each measured parser refusal to its own wording", () => {
    expect(buildImportReport(summary(1, [failure()])).failure?.reasonKey).toBe(
      IMPORT_REASON_KEYS.unterminated_comment,
    );
    expect(
      buildImportReport(summary(1, [failure({ code: "unterminated_tag" })])).failure?.reasonKey,
    ).toBe(IMPORT_REASON_KEYS.unterminated_tag);
  });

  it("falls back rather than showing nothing when the parser grows a new message", () => {
    // B-063: `pgn-reader` is 0.x and its error vocabulary can change under us. A refused game
    // reported vaguely is recoverable; a refused game reported not at all is not.
    const report = buildImportReport(summary(3, [failure({ code: "something_new" })]));
    expect(report.failure?.reasonKey).toBe(IMPORT_REASON_KEYS.parse_failed);
    expect(report.summaryKey).toBe("import.summary.stopped");
  });

  it("reads only the first failure, so a future importer that reports several still renders", () => {
    // Today the backend cannot produce two. B-116 (resynchronisation) is the change that
    // would, and this asserts that arriving would degrade rather than break.
    const report = buildImportReport(
      summary(5, [failure({ gameIndex: 5 }), failure({ gameIndex: 40 })]),
    );
    expect(report.failure?.gameNumber).toBe(6);
  });

  it("carries the byte offset, which is the only thing that locates the problem in the file", () => {
    expect(buildImportReport(summary(1, [failure()])).failure?.byteOffset).toBe(1204);
  });
});

describe("hasGameIdentity", () => {
  const report = (f: Partial<ImportFailure>) =>
    buildImportReport(summary(1, [failure(f)])).failure;

  it("is true when the tag section parsed before the movetext failed", () => {
    const f = report({});
    expect(f !== null && hasGameIdentity(f)).toBe(true);
  });

  it("is true on a partial header, because half a name still identifies a game", () => {
    const f = report({ black: null, date: null });
    expect(f !== null && hasGameIdentity(f)).toBe(true);
  });

  it("is false when nothing parsed, so the report says 'game 13' rather than inventing players", () => {
    const f = report({ white: null, black: null, date: null });
    expect(f !== null && hasGameIdentity(f)).toBe(false);
  });
});

describe("shouldCloseAfterImport", () => {
  const close = (games: number, errors: readonly ImportFailure[] = []) =>
    shouldCloseAfterImport(buildImportReport(summary(games, errors)));

  it("closes on a clean import, because the games arriving are the confirmation", () => {
    expect(close(12)).toBe(true);
  });

  it("stays open on a failure, which is the only copy of what went wrong", () => {
    expect(close(12, [failure()])).toBe(false);
    expect(close(0, [failure({ gameIndex: 0 })])).toBe(false);
  });

  it("stays open when nothing was imported, so an empty paste is not a silent dismissal", () => {
    // Not an error — the importer accepts anything — but closing here looks like a crash.
    expect(close(0)).toBe(false);
  });

  it("stays open on a single game, to offer to open it", () => {
    // Owner's call at milestone 4, and consistent with the standing rule rather than an
    // exception to it: the dialog stops you when there is a decision, and this is one.
    expect(close(1)).toBe(false);
  });
});

// --- Milestone 4: several files are several inputs -------------------------------------

function imported(name: string, games: number, errors: readonly ImportFailure[] = []): FileImport {
  return {
    name,
    outcome: { kind: "imported", summary: summary(games, errors), encoding: "utf8" },
  };
}

function unreadable(name: string): FileImport {
  return {
    name,
    outcome: {
      kind: "unreadable",
      code: "file_unreadable",
      detail: "No such file or directory (os error 2)",
    },
  };
}

describe("buildFileImportReport", () => {
  it("totals games across files and keeps a row for each", () => {
    const report = buildFileImportReport([
      imported("january.pgn", 142),
      imported("club.pgn", 31),
    ]);
    expect(report.imported).toBe(173);
    expect(report.files?.map((file) => file.name)).toEqual(["january.pgn", "club.pgn"]);
    expect(report.summaryKey).toBe("import.summary.okFiles");
  });

  it("keeps a row for the files that went perfectly, not only the ones that did not", () => {
    // A list of failures alone makes "did it read the second file at all?" unanswerable.
    const report = buildFileImportReport([
      imported("good.pgn", 5),
      unreadable("gone.pgn"),
    ]);
    expect(report.files).toHaveLength(2);
    expect(report.files?.[0]?.imported).toBe(5);
  });

  /**
   * **The test this file exists for.** Milestone 3's report was built on "at most one failure,
   * and it ends the import". Across files that is false, and a report that shows one problem
   * while hiding the rest is worse than one that admits there were several.
   */
  it("reports a failure in one file and a success in the next, because they are separate inputs", () => {
    const report = buildFileImportReport([
      imported("first.pgn", 10),
      imported("bad.pgn", 3, [failure({ gameIndex: 3 })]),
      imported("third.pgn", 7),
    ]);
    expect(report.imported).toBe(20);
    expect(report.filesFailed).toBe(1);
    expect(report.files?.[1]?.failure?.gameNumber).toBe(4);
    expect(report.files?.[2]?.failure).toBeNull();
    expect(report.summaryKey).toBe("import.summary.stoppedFiles");
  });

  it("counts every kind of not-finishing, not just parser refusals", () => {
    const report = buildFileImportReport([
      imported("bad.pgn", 1, [failure()]),
      unreadable("gone.pgn"),
      imported("fine.pgn", 2),
    ]);
    expect(report.filesFailed).toBe(2);
  });

  it("never synthesises a single `failure` for a multi-file report", () => {
    // If this ever becomes non-null, every consumer written for milestone 3 keeps compiling
    // and starts showing one problem while silently dropping the others.
    const report = buildFileImportReport([imported("bad.pgn", 1, [failure()])]);
    expect(report.failure).toBeNull();
  });

  it("says nothing was imported rather than reporting a success of zero", () => {
    const report = buildFileImportReport([unreadable("gone.pgn")]);
    expect(report.summaryKey).toBe("import.summary.noneFiles");
    expect(report.files?.[0]?.unreadableKey).toBe(FILE_REASON_KEYS.file_unreadable);
  });

  it("falls back rather than showing nothing if the backend grows a new file code", () => {
    const odd: FileImport = {
      name: "odd.pgn",
      outcome: { kind: "unreadable", code: "something_new", detail: "" },
    };
    expect(buildFileImportReport([odd]).files?.[0]?.unreadableKey).toBe(
      FILE_REASON_KEYS.file_unreadable,
    );
  });

  it("surfaces the Latin-1 fallback, which only a file can trigger", () => {
    // ADR-0009 rule 5 is unreachable from paste — the webview has already decoded that text —
    // so this is the first milestone where the fallback is observable at all. A silent
    // fallback is how a mis-decoded name gets into a library and stays.
    const latin1: FileImport = {
      name: "old.pgn",
      outcome: { kind: "imported", summary: summary(2), encoding: "latin1" },
    };
    expect(buildFileImportReport([latin1]).files?.[0]?.encoding).toBe("latin1");
  });

  it("offers to open a lone game, and only when nothing else needs saying", () => {
    expect(buildFileImportReport([imported("one.pgn", 1)]).singleGameId).not.toBeNull();
    // One game plus a problem: the problem is the more important thing on screen.
    expect(
      buildFileImportReport([imported("one.pgn", 1), unreadable("gone.pgn")]).singleGameId,
    ).toBeNull();
    expect(buildFileImportReport([imported("two.pgn", 2)]).singleGameId).toBeNull();
  });

  it("does not close the dialog while a file is still worth reading about", () => {
    expect(
      shouldCloseAfterImport(buildFileImportReport([imported("a.pgn", 5), imported("b.pgn", 6)])),
    ).toBe(true);
    expect(
      shouldCloseAfterImport(buildFileImportReport([imported("a.pgn", 5), unreadable("b.pgn")])),
    ).toBe(false);
  });
});
