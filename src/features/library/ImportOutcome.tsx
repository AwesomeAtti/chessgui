/**
 * What an import did, rendered once and shown in two places.
 *
 * The dialog's result step and the library's strip both display this. **That is deliberate and
 * it is what keeps the hybrid one pattern rather than two**: if the wording lived in each
 * surface separately, the strip and the dialog would drift apart on the first change, and the
 * user would learn two vocabularies for the same event.
 *
 * Layout is the caller's — `block` stacks for the dialog, `inline` runs on one line for the
 * strip. Nothing else differs, including which sentences appear.
 *
 * # Two shapes, one component (milestone 4)
 *
 * A paste is one input and has at most one failure. Files are several inputs and can have
 * several. Rather than branch into two components, the per-file list is simply absent for a
 * paste — which keeps the summary sentence, the failure wording and the awkward
 * "nothing after byte N was read" line identical whichever way the games arrived.
 */
import { useTranslation } from "react-i18next";

import {
  hasGameIdentity,
  type ImportReport,
  type ImportReportFailure,
  type ImportReportFile,
} from "./importReport";

interface ImportOutcomeProps {
  report: ImportReport;
  layout: "block" | "inline";
}

export function ImportOutcome({ report, layout }: ImportOutcomeProps) {
  const { t } = useTranslation();
  const { failure, files } = report;

  // Every key is written as a literal here rather than passed through a variable, which is
  // what keeps the typed-key guarantee (the lesson `catalogue.test.ts` records). The switch
  // also makes the interpolation differences explicit: the multi-file sentences take
  // already-pluralised phrases, the single-input ones take a raw count.
  const summary = (() => {
    switch (report.summaryKey) {
      case "import.summary.ok":
        return t("import.summary.ok", { count: report.imported });
      case "import.summary.stopped":
        return t("import.summary.stopped", { count: report.imported });
      case "import.summary.none":
        return t("import.summary.none");
      case "import.summary.empty":
        return t("import.summary.empty");
      case "import.summary.okFiles":
        return t("import.summary.okFiles", {
          games: t("import.count.games", { count: report.imported }),
          files: t("import.count.files", { count: files?.length ?? 0 }),
        });
      case "import.summary.stoppedFiles":
        return t("import.summary.stoppedFiles", {
          games: t("import.count.games", { count: report.imported }),
          files: t("import.count.files", { count: files?.length ?? 0 }),
          failed: t("import.count.files", { count: report.filesFailed }),
        });
      case "import.summary.noneFiles":
        return t("import.summary.noneFiles", {
          files: t("import.count.files", { count: files?.length ?? 0 }),
        });
    }
  })();

  /** The failure wording, identical whether it came from a paste or from inside a file. */
  const renderFailure = (value: ImportReportFailure) => (
    <>
      <span className="import-failure-game">
        {hasGameIdentity(value)
          ? t("import.failedGameNamed", {
              number: value.gameNumber,
              white: value.white ?? t("info.absent"),
              black: value.black ?? t("info.absent"),
              date: value.date ?? t("date.unknown"),
            })
          : t("import.failedGame", { number: value.gameNumber })}
      </span>
      <span className="import-reason">{t(value.reasonKey)}</span>
      {/*
        The awkward sentence, and it appears everywhere for the same reason it exists at all:
        milestone 2 measured that the parser's errors are irrecoverable, so everything past
        this offset was never read. Leaving it out of the strip would make the strip a
        friendlier lie than the dialog.
      */}
      <span className="import-stopped">
        {t("import.stoppedAt", { offset: value.byteOffset })}
      </span>
    </>
  );

  const renderFile = (file: ImportReportFile, index: number) => (
    // Keyed by position rather than by name: the same file can legitimately be imported twice
    // in one batch, and the backend returns one entry per path in the order asked for.
    <li key={`${file.name}-${index}`} className="import-file">
      <span className="import-file-name">
        {file.name === "" ? t("import.files.unnamed") : file.name}
      </span>
      {/*
        No count for a file that never opened. "0 games" next to "this file could not be
        opened" is redundant at best, and at worst it reads as a measurement — as though we
        looked inside and found nothing, which is the opposite of what happened. Caught by
        looking at the rendered list rather than by reading the code.
      */}
      {file.unreadableKey === null ? (
        <span className="import-file-count">
          {t("import.count.games", { count: file.imported })}
        </span>
      ) : (
        <span className="import-reason">{t(file.unreadableKey)}</span>
      )}
      {file.failure !== null && renderFailure(file.failure)}
      {file.encoding === "latin1" && (
        <span className="import-note">{t("import.files.latin1")}</span>
      )}
    </li>
  );

  return (
    <div className={`import-outcome import-outcome-${layout}`}>
      <span className="import-summary">{summary}</span>

      {/* One input: the failure, if there was one. */}
      {failure !== null && renderFailure(failure)}

      {/* Several inputs: a row each, including the ones that went perfectly — a list of only
          the failures makes "did it read the second file at all?" unanswerable. */}
      {files !== null && files.length > 0 && (
        <ul className="import-files">{files.map(renderFile)}</ul>
      )}
    </div>
  );
}
