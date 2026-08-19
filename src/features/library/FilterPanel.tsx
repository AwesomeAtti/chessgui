/**
 * The composed filter panel (B-010) — criterion rows, authored in a popover.
 *
 * # Why rows and not a form, and not pills either
 *
 * Surveyed before building, per AGENTS.md, and deliberately outside the chess category
 * (`docs/ui-survey.md`): macOS Finder's Smart Folders, Music's Smart Playlists and Lightroom's
 * Smart Collections are the three closest analogues to this problem — a large personal
 * collection with many attributes — and all three independently compose filters as
 * `field · operator · value` rows with add/remove per row. Chips are how every one of them
 * (and Gmail, and GitLab) shows *applied* state; none of them authors filters that way. The
 * chips live in `LibraryView`; this is the authoring half.
 *
 * A fixed form was mocked first and rejected: its size is proportional to the fields the app
 * supports rather than the fields in use, so every field B-021 adds would enlarge the panel
 * for someone filtering on one thing.
 *
 * # Three details that are not arbitrary
 *
 * - **The match all/any control is absent until there are two criteria.** Copied from Music,
 *   which does exactly this: with one rule the question has no meaning and the control is
 *   noise.
 * - **The field control is a button opening a searchable menu, not a `<select>`.** At today's
 *   twelve fields a `<select>` would do; B-021 pushes well past that, and Finder's own
 *   attribute menu ends in a searchable "Other…" list for the same reason. Deliberate small
 *   over-build, taken once rather than as a later rewrite.
 * - **The picker is `position: fixed`, positioned from the trigger's own rect.** `.fb-body`
 *   scrolls, and an `overflow` ancestor clips absolutely-positioned descendants *whether or
 *   not it is currently scrolling* — the menu came out silently truncated in the mockup before
 *   this was fixed. `.column-menu` in `LibraryView` already solves it the same way.
 *
 * # Draft state
 *
 * Edits are a draft, applied on Apply. This component is mounted only while open, so the
 * draft is seeded once from props and Cancel discards by unmounting. The alternative — filter
 * on every keystroke — re-filters and re-sorts thousands of rows per character, and B-033's
 * row-count target is not measured yet.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  FILTER_FIELDS,
  newCriterion,
  operatorsFor,
  type Criterion,
  type FilterFieldId,
  type MatchMode,
} from "./filters";

import { FIELD_LABEL_KEYS, OPERATOR_LABEL_KEYS, RESULT_LABEL_KEYS } from "./filterLabels";

const RESULT_CHOICES = ["white", "black", "draw", "unknown"] as const;

interface FilterPanelProps {
  criteria: readonly Criterion[];
  matchMode: MatchMode;
  onApply: (criteria: readonly Criterion[], matchMode: MatchMode) => void;
  onClose: () => void;
}

export function FilterPanel({ criteria, matchMode, onApply, onClose }: FilterPanelProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Seeded once, on mount. Opening with nothing applied starts on one empty row rather than
  // an empty panel — the same thing Finder and Music do, and it saves a click in the common
  // case of "I opened this to add one filter".
  const [draft, setDraft] = useState<readonly Criterion[]>(() =>
    criteria.length > 0 ? criteria.slice() : [newCriterion("white")],
  );
  const [mode, setMode] = useState<MatchMode>(matchMode);
  /** Which row's field picker is open, and where to put it. Null when none is. */
  const [picker, setPicker] = useState<{ id: string; x: number; y: number } | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  // Escape cancels, a click outside cancels. Same three-way close as `.column-menu`, minus the
  // scroll case: this panel is anchored to a control in a bar that does not scroll.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // The picker is a layer above the panel, so Escape closes that first.
      if (picker !== null) setPicker(null);
      else onClose();
    };
    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node) ?? false) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown, true);
    };
  }, [onClose, picker]);

  function replaceAt(index: number, criterion: Criterion) {
    setDraft((current) => current.map((entry, at) => (at === index ? criterion : entry)));
  }

  /**
   * Change a row's field.
   *
   * The criterion is rebuilt rather than patched: `contains` means nothing to a number and a
   * text value means nothing to a date, so carrying either across a kind change would produce
   * a row that cannot be evaluated. The id is kept so React does not remount the row.
   */
  function changeField(index: number, id: string, field: FilterFieldId) {
    replaceAt(index, { ...newCriterion(field), id } as Criterion);
    setPicker(null);
    setPickerQuery("");
  }

  /** A field not already in the draft, so pressing Add twice does not offer the same row. */
  function nextUnusedField(): FilterFieldId {
    const used = new Set(draft.map((entry) => entry.field));
    return (FILTER_FIELDS.find((field) => !used.has(field.id))?.id ??
      FILTER_FIELDS[0]!.id) as FilterFieldId;
  }

  const pickerMatches = useMemo(() => {
    const needle = pickerQuery.trim().toLocaleLowerCase();
    return FILTER_FIELDS.filter(
      (field) =>
        needle === "" ||
        t(FIELD_LABEL_KEYS[field.id]).toLocaleLowerCase().includes(needle),
    );
  }, [pickerQuery, t]);

  function openPicker(id: string, trigger: HTMLElement) {
    const rect = trigger.getBoundingClientRect();
    setPicker({ id, x: rect.left, y: rect.bottom + 3 });
    setPickerQuery("");
  }

  return (
    <div className="fb-panel" ref={panelRef} role="dialog" aria-label={t("library.filter.title")}>
      <div className="fb-head">
        <span className="fb-title">{t("library.filter.title")}</span>
        {draft.length > 1 && (
          <>
            <span className="fb-spacer" />
            <label className="fb-match">
              {t("library.filter.matchLabel")}{" "}
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as MatchMode)}
              >
                <option value="all">{t("library.filter.matchAll")}</option>
                <option value="any">{t("library.filter.matchAny")}</option>
              </select>
            </label>
          </>
        )}
      </div>

      <div className="fb-body">
        {draft.map((criterion, index) => (
          <div className="fb-row" key={criterion.id}>
            <button
              type="button"
              className={picker?.id === criterion.id ? "fb-field open" : "fb-field"}
              aria-haspopup="menu"
              aria-expanded={picker?.id === criterion.id}
              onClick={(event) => openPicker(criterion.id, event.currentTarget)}
            >
              {t(FIELD_LABEL_KEYS[criterion.field])}
              <span className="caret" aria-hidden="true">
                ▾
              </span>
            </button>

            <select
              aria-label={t(FIELD_LABEL_KEYS[criterion.field])}
              value={criterion.operator}
              onChange={(event) =>
                replaceAt(index, { ...criterion, operator: event.target.value } as Criterion)
              }
            >
              {operatorsFor(criterion.field).map((operator) => (
                <option key={operator} value={operator}>
                  {t(OPERATOR_LABEL_KEYS[operator])}
                </option>
              ))}
            </select>

            <CriterionValue
              criterion={criterion}
              onChange={(next) => replaceAt(index, next)}
            />

            <button
              type="button"
              className="fb-remove"
              aria-label={t("library.filter.remove")}
              title={t("library.filter.remove")}
              onClick={() => setDraft((current) => current.filter((_, at) => at !== index))}
            >
              −
            </button>
          </div>
        ))}

        <button
          type="button"
          className="fb-add"
          onClick={() =>
            setDraft((current) => [...current, newCriterion(nextUnusedField())])
          }
        >
          <span aria-hidden="true">＋</span>
          {t("library.filter.add")}
        </button>
      </div>

      <div className="fb-foot">
        <button
          type="button"
          className="muted"
          onClick={() => setDraft([newCriterion("white")])}
        >
          {t("library.filter.clearAll")}
        </button>
        <div className="right">
          <button type="button" onClick={onClose}>
            {t("library.filter.cancel")}
          </button>
          <button type="button" className="primary" onClick={() => onApply(draft, mode)}>
            {t("library.filter.apply")}
          </button>
        </div>
      </div>

      {picker !== null && (
        <div
          className="fb-picker"
          role="menu"
          aria-label={t("library.filter.fieldSearch")}
          style={{ left: picker.x, top: picker.y }}
        >
          <input
            className="fb-picker-search"
            type="text"
            autoFocus
            value={pickerQuery}
            placeholder={t("library.filter.fieldSearch")}
            aria-label={t("library.filter.fieldSearch")}
            onChange={(event) => setPickerQuery(event.target.value)}
            onKeyDown={(event) => {
              // Enter takes the first match, so the whole gesture is type-then-Enter without
              // reaching for the mouse. This is the accelerator the survey found is always
              // secondary to the menu, never a replacement for it.
              if (event.key !== "Enter") return;
              const first = pickerMatches[0];
              const index = draft.findIndex((entry) => entry.id === picker.id);
              if (first !== undefined && index !== -1) changeField(index, picker.id, first.id);
            }}
          />
          {pickerMatches.length === 0 ? (
            <p className="fb-picker-empty">{t("library.filter.fieldNone")}</p>
          ) : (
            pickerMatches.map((field) => (
              <button
                key={field.id}
                type="button"
                role="menuitem"
                className="picker-item"
                onClick={() => {
                  const index = draft.findIndex((entry) => entry.id === picker.id);
                  if (index !== -1) changeField(index, picker.id, field.id);
                }}
              >
                {t(FIELD_LABEL_KEYS[field.id])}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The value control, which is whatever the criterion's kind needs.
 *
 * Split out because this is the one part of a row that genuinely varies: a text box, one or
 * two numbers, one or two dates, or a list of results. Keeping it inline made the row's JSX
 * unreadable for no benefit.
 */
function CriterionValue({
  criterion,
  onChange,
}: {
  criterion: Criterion;
  onChange: (next: Criterion) => void;
}) {
  const { t } = useTranslation();
  const label = t(FIELD_LABEL_KEYS[criterion.field]);

  switch (criterion.kind) {
    case "text":
      return (
        <input
          type="text"
          aria-label={label}
          value={criterion.value}
          onChange={(event) => onChange({ ...criterion, value: event.target.value })}
        />
      );

    case "number":
      return criterion.operator === "between" ? (
        <div className="fb-range">
          <input
            type="text"
            inputMode="numeric"
            aria-label={label}
            value={criterion.value}
            onChange={(event) => onChange({ ...criterion, value: event.target.value })}
          />
          <span className="sep" aria-hidden="true">
            {t("library.filter.rangeTo")}
          </span>
          <input
            type="text"
            inputMode="numeric"
            aria-label={label}
            value={criterion.value2}
            onChange={(event) => onChange({ ...criterion, value2: event.target.value })}
          />
        </div>
      ) : (
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={criterion.value}
          onChange={(event) => onChange({ ...criterion, value: event.target.value })}
        />
      );

    case "date":
      // `after` reads the lower bound and `before` the upper one, so each operator shows the
      // bound it actually means rather than one box labelled two different things.
      if (criterion.operator === "after") {
        return (
          <input
            type="date"
            aria-label={label}
            value={criterion.from}
            onChange={(event) => onChange({ ...criterion, from: event.target.value })}
          />
        );
      }
      if (criterion.operator === "before") {
        return (
          <input
            type="date"
            aria-label={label}
            value={criterion.to}
            onChange={(event) => onChange({ ...criterion, to: event.target.value })}
          />
        );
      }
      return (
        <div className="fb-range">
          <input
            type="date"
            aria-label={label}
            value={criterion.from}
            onChange={(event) => onChange({ ...criterion, from: event.target.value })}
          />
          <span className="sep" aria-hidden="true">
            {t("library.filter.rangeTo")}
          </span>
          <input
            type="date"
            aria-label={label}
            value={criterion.to}
            onChange={(event) => onChange({ ...criterion, to: event.target.value })}
          />
        </div>
      );

    case "result":
      return (
        <select
          aria-label={label}
          value={criterion.value}
          onChange={(event) =>
            onChange({ ...criterion, value: event.target.value } as Criterion)
          }
        >
          {/* An empty first option so a freshly added result row is inert rather than
              silently asserting "White win" before the user has chosen anything. */}
          <option value="" />
          {RESULT_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {t(RESULT_LABEL_KEYS[choice])}
            </option>
          ))}
        </select>
      );
  }
}
