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
 */
import { useTranslation } from "react-i18next";

import { hasGameIdentity, type ImportReport } from "./importReport";

interface ImportOutcomeProps {
  report: ImportReport;
  layout: "block" | "inline";
}

export function ImportOutcome({ report, layout }: ImportOutcomeProps) {
  const { t } = useTranslation();
  const { failure } = report;

  return (
    <div className={`import-outcome import-outcome-${layout}`}>
      <span className="import-summary">
        {t(report.summaryKey, { count: report.imported })}
      </span>

      {failure !== null && (
        <>
          <span className="import-failure-game">
            {hasGameIdentity(failure)
              ? t("import.failedGameNamed", {
                  number: failure.gameNumber,
                  white: failure.white ?? t("info.absent"),
                  black: failure.black ?? t("info.absent"),
                  date: failure.date ?? t("date.unknown"),
                })
              : t("import.failedGame", { number: failure.gameNumber })}
          </span>
          <span className="import-reason">{t(failure.reasonKey)}</span>
          {/*
            The awkward sentence, and it appears in both places for the same reason it exists
            at all: milestone 2 measured that the parser's errors are irrecoverable, so
            everything past this offset was never read. Leaving it out of the strip would make
            the strip a friendlier lie than the dialog.
          */}
          <span className="import-stopped">
            {t("import.stoppedAt", { offset: failure.byteOffset })}
          </span>
        </>
      )}
    </div>
  );
}
