/**
 * The record of the last import, above the games it is describing.
 *
 * **This is the half of the hybrid that answers the original complaint:** dismissing the dialog
 * used to be the end of the outcome. Now every import — clean or not — leaves its result here,
 * and the dialog's result step is an extra stop for the cases that need acting on rather than
 * the only copy.
 *
 * It stays until dismissed. No timeout: a message that disappears on its own is a message you
 * can miss by looking away, and the failure case is the one you would most want to still be
 * there when you look back.
 */
import { useTranslation } from "react-i18next";

import { ImportOutcome } from "./ImportOutcome";
import type { ImportReport } from "./importReport";

interface ImportStripProps {
  report: ImportReport;
  onDismiss: () => void;
}

export function ImportStrip({ report, onDismiss }: ImportStripProps) {
  const { t } = useTranslation();

  return (
    // `status` rather than `alert`: the outcome is worth announcing but never interrupts, and
    // the failure case has already been announced by the dialog it came from.
    <div className="import-strip" role="status">
      <ImportOutcome report={report} layout="inline" />
      <button
        type="button"
        className="import-strip-dismiss"
        onClick={onDismiss}
        aria-label={t("import.dismiss")}
        title={t("import.dismiss")}
      >
        ✕
      </button>
    </div>
  );
}
