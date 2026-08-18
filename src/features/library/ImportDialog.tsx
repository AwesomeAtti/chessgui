/**
 * The "Add games" dialog (B-007 milestone 3, approved from mockups per AGENTS.md).
 *
 * **This is where every import source will live**, not just paste. That was the deciding
 * argument for this shape over the alternatives: file import (milestone 4), chess.com (B-012)
 * and lichess (B-013) each become a tab here rather than a new place to look. The tab strip is
 * deliberately absent while there is one source — a strip of one is furniture, and greyed-out
 * tabs for unbuilt features are a promise this project has not made.
 *
 * # Two steps, and why they are not symmetric
 *
 * The dialog has an **input** step and a **result** step, and the result step is only reached
 * when the import needs something from you. A clean import closes the dialog instead, because
 * the games arriving in the library behind it are the answer, and making you dismiss a message
 * to see the thing the message is about is ceremony the event does not deserve.
 *
 * That asymmetry is not inconsistency — it is intrusiveness matched to criticality, which is
 * what the survey of this category supports. Scid vs. PC shows import feedback in a frame that
 * is always there and never modal; Lichess navigates you to the imported game; ChessBase opens
 * a board window. **None of them shows a modal "here is what happened".** The two-step modal is
 * the convention of installers and setup wizards — one-off linear flows — and importing games
 * into a library is a thing you do repeatedly.
 *
 * The record of what happened lives in `ImportStrip`, above the table, for *every* import. So
 * this dialog's result step is a stop, never the only copy, and dismissing it loses nothing.
 *
 * Native `<dialog>` rather than a hand-rolled overlay: focus trapping, Escape and the backdrop
 * come with it. WebKitGTK support is a B-066 unknown like everything else on Linux, and the
 * failure mode is visible rather than silent — an unsupported `<dialog>` renders inline.
 */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { ImportOutcome } from "./ImportOutcome";
import type { ImportReport } from "./importReport";

export type ImportStep = "input" | "result";

interface ImportDialogProps {
  open: boolean;
  step: ImportStep;
  /** PGN text in the box. Owned above, so a paste can prefill it before the dialog opens. */
  text: string;
  onTextChange: (text: string) => void;
  /** The result being shown on the result step. Null on the input step. */
  report: ImportReport | null;
  busy: boolean;
  onImport: () => void;
  /** Return to the input step with the text intact. */
  onBack: () => void;
  onClose: () => void;
}

export function ImportDialog({
  open,
  step,
  text,
  onTextChange,
  report,
  busy,
  onImport,
  onBack,
  onClose,
}: ImportDialogProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const result = useRef<HTMLDivElement | null>(null);

  // `showModal()` rather than the `open` attribute: only the former gives the top layer, the
  // backdrop, and the focus trap. React cannot express that difference declaratively.
  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  // Focus follows the step, so the keyboard lands on the thing that just appeared and a screen
  // reader reads it. Without this, tabbing after an import starts from wherever the Import
  // button used to be.
  useEffect(() => {
    if (!open) return;
    if (step === "input") input.current?.focus();
    else result.current?.focus();
  }, [open, step]);

  return (
    <dialog
      ref={dialog}
      className="import-dialog"
      aria-labelledby="import-dialog-title"
      // Escape and the backdrop both fire `cancel`/`close`; route them through the same exit as
      // the buttons so the parent's state cannot drift out of step with the element's. On the
      // result step this means Escape is "done" rather than "cancel", which is right: the work
      // has already happened and there is nothing left to abandon.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <form method="dialog" onSubmit={(event) => event.preventDefault()}>
        <h2 id="import-dialog-title" className="dialog-title">
          {t("import.title")}
        </h2>

        {step === "input" ? (
          <>
            <label className="dialog-label" htmlFor="import-pgn">
              {t("import.pasteLabel")}
            </label>
            <textarea
              id="import-pgn"
              ref={input}
              className="import-input"
              value={text}
              spellCheck={false}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder={t("import.pastePlaceholder")}
            />
            <div className="dialog-actions">
              <button type="button" onClick={onClose}>
                {t("import.cancel")}
              </button>
              <button
                type="button"
                onClick={onImport}
                disabled={busy || text.trim() === ""}
              >
                {t("import.confirm")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="import-result" ref={result} tabIndex={-1}>
              {report !== null && <ImportOutcome report={report} layout="block" />}
            </div>
            <div className="dialog-actions">
              {/* Back keeps the text, which is the one thing worth doing from here: trim the
                  paste and try again without fetching it from wherever it came from. */}
              <button type="button" onClick={onBack}>
                {t("import.back")}
              </button>
              <button type="button" onClick={onClose}>
                {t("import.done")}
              </button>
            </div>
          </>
        )}
      </form>
    </dialog>
  );
}
