/**
 * The "Add games" dialog (B-007 milestones 3 and 4, approved from mockups per AGENTS.md).
 *
 * **This is where every import source lives**, not just paste. That was the deciding argument
 * for this shape over the alternatives at milestone 3: file import, chess.com (B-012) and
 * lichess (B-013) each become a tab here rather than a new place to look. Milestone 4 is the
 * second source arriving as planned, so **the tab strip appears now** — it was deliberately
 * absent while there was one, because a strip of one is furniture.
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
 * # Why the Files tab stages a list when the survey says nobody does
 *
 * Surveyed, no product in this category stages chosen files before importing: Scid vs. PC
 * multi-selects in the OS dialog and goes, Lightroom's staged grid is a photo-library pattern
 * that exists to pick *which* of 400 images to take. The list is here anyway, on the owner's
 * call, and the reason is the drop path rather than the picker: **a drag is easy to make by
 * accident and an OS picker is not**, so a drop needs a surface that names what it caught
 * before it acts. Naming the files *is* the confirmation, which is why there is no separate
 * "import 3 files?" prompt in front of it. The picker fills the same list so that the two
 * paths cannot behave differently.
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
export type ImportSource = "paste" | "files";

interface ImportDialogProps {
  open: boolean;
  step: ImportStep;
  source: ImportSource;
  onSourceChange: (source: ImportSource) => void;
  /** PGN text in the box. Owned above, so a paste can prefill it before the dialog opens. */
  text: string;
  onTextChange: (text: string) => void;
  /**
   * Absolute paths staged for import, owned above so a drop can fill them before the dialog
   * opens. Never rendered — only their base names are, because a path contains a home
   * directory and that is not something to put on screen.
   */
  paths: readonly string[];
  onChooseFiles: () => void;
  onRemovePath: (index: number) => void;
  /** The result being shown on the result step. Null on the input step. */
  report: ImportReport | null;
  busy: boolean;
  onImport: () => void;
  /** Open the one game that arrived. Present only when there is exactly one. */
  onOpenGame: (() => void) | null;
  /** Return to the input step with the text and file list intact. */
  onBack: () => void;
  onClose: () => void;
}

/** The last path segment, for display. Mirrors what the backend does with the same string. */
function baseName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] ?? "";
}

export function ImportDialog({
  open,
  step,
  source,
  onSourceChange,
  text,
  onTextChange,
  paths,
  onChooseFiles,
  onRemovePath,
  report,
  busy,
  onImport,
  onOpenGame,
  onBack,
  onClose,
}: ImportDialogProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const files = useRef<HTMLButtonElement | null>(null);
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
    if (step === "result") result.current?.focus();
    else if (source === "files") files.current?.focus();
    else input.current?.focus();
  }, [open, step, source]);

  const canImport =
    !busy && (source === "paste" ? text.trim() !== "" : paths.length > 0);

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

        {step === "input" && (
          // Hidden on the result step: the result belongs to the import that just ran, and
          // offering to switch source while looking at it invites reading the two as related.
          <div className="dialog-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={source === "paste"}
              className={source === "paste" ? "active" : undefined}
              onClick={() => onSourceChange("paste")}
            >
              {t("import.tabs.paste")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={source === "files"}
              className={source === "files" ? "active" : undefined}
              onClick={() => onSourceChange("files")}
            >
              {t("import.tabs.files")}
            </button>
          </div>
        )}

        {step === "input" ? (
          <>
            {source === "paste" ? (
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
              </>
            ) : (
              <>
                <span className="dialog-label">{t("import.files.label")}</span>
                <div className="import-drop">
                  {/* Not a drop target itself. The real one is the window, because that is
                      what Tauri's event covers — this only says so, and the list below is
                      where a drop shows up. */}
                  <p className="import-drop-hint">{t("import.files.dropHint")}</p>
                  <button type="button" ref={files} onClick={onChooseFiles}>
                    {t("import.files.choose")}
                  </button>
                </div>
                {paths.length > 0 && (
                  <ul className="import-file-list">
                    {paths.map((path, index) => (
                      // Keyed by position: the same file may legitimately appear twice, and
                      // removing by index is what the caller expects.
                      <li key={`${path}-${index}`}>
                        <span className="import-file-name">{baseName(path)}</span>
                        <button
                          type="button"
                          className="import-file-remove"
                          onClick={() => onRemovePath(index)}
                          aria-label={t("import.files.remove")}
                          title={t("import.files.remove")}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <div className="dialog-actions">
              <button type="button" onClick={onClose}>
                {t("import.cancel")}
              </button>
              <button type="button" onClick={onImport} disabled={!canImport}>
                {source === "files" && paths.length > 0
                  ? t("import.files.confirm", { count: paths.length })
                  : t("import.confirm")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="import-result" ref={result} tabIndex={-1}>
              {report !== null && <ImportOutcome report={report} layout="block" />}
            </div>
            <div className="dialog-actions">
              {/* Back keeps the text and the file list, which is the one thing worth doing
                  from here: trim the paste or drop a file, and try again without fetching it
                  from wherever it came from. */}
              <button type="button" onClick={onBack}>
                {t("import.back")}
              </button>
              {onOpenGame !== null && (
                <button type="button" onClick={onOpenGame}>
                  {t("import.openGame")}
                </button>
              )}
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
