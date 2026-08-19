/**
 * Applied filters, as removable chips (B-010).
 *
 * This is the *display* half of the filter feature; `FilterPanel` is the authoring half. The
 * split is the survey's clearest finding (`docs/ui-survey.md`): Gmail, GitLab, Finder, Music
 * and Lightroom all show applied state as chips or tokens, and **none of them authors filters
 * that way**. An early recommendation here conflated the two and would have built a pill bar
 * that had to grow a composer anyway.
 *
 * Only *active* criteria appear. A half-typed row filters nothing (see `isInert`), so showing
 * it as a chip would claim the table is narrower than it is.
 */
import { useTranslation } from "react-i18next";

import { formatIsoDate } from "@/i18n/format";

import { activeCriteria, type Criterion } from "./filters";
import { FIELD_LABEL_KEYS, OPERATOR_LABEL_KEYS, RESULT_LABEL_KEYS } from "./filterLabels";

interface FilterChipsProps {
  criteria: readonly Criterion[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function FilterChips({ criteria, onRemove, onClearAll }: FilterChipsProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const active = activeCriteria(criteria);

  if (active.length === 0) return null;

  /**
   * The operator, but only when it earns its place.
   *
   * "White: Carlsen" reads correctly without one and "Elo (W): 2700" does not — the reader
   * cannot tell over from under. So the default relation is left implicit and every other one
   * is spelled out. A range shows its two bounds instead, which says "between" by its shape.
   */
  function operatorLabel(criterion: Criterion): string | null {
    if (criterion.kind === "text" && criterion.operator === "contains") return null;
    if (criterion.kind === "result" && criterion.operator === "is") return null;
    if (criterion.operator === "between") return null;
    return t(OPERATOR_LABEL_KEYS[criterion.operator]);
  }

  function valueLabel(criterion: Criterion): string {
    const dash = t("library.filter.rangeTo");
    switch (criterion.kind) {
      case "text":
        return criterion.value.trim();
      case "number":
        return criterion.operator === "between"
          ? criterion.value + " " + dash + " " + criterion.value2
          : criterion.value.trim();
      case "date": {
        if (criterion.operator === "after") return formatIsoDate(criterion.from, locale);
        if (criterion.operator === "before") return formatIsoDate(criterion.to, locale);
        return (
          formatIsoDate(criterion.from, locale) +
          " " +
          dash +
          " " +
          formatIsoDate(criterion.to, locale)
        );
      }
      case "result":
        return criterion.value === ""
          ? ""
          : t(RESULT_LABEL_KEYS[criterion.value]);
    }
  }

  return (
    <div className="fb-chips">
      {active.map((criterion) => {
        const operator = operatorLabel(criterion);
        return (
          <span className="pill" key={criterion.id}>
            <span className="pill-field">{t(FIELD_LABEL_KEYS[criterion.field])}</span>
            {operator !== null && <span className="pill-op">{operator}</span>}
            <span className="pill-value">{valueLabel(criterion)}</span>
            <button
              type="button"
              className="pill-remove"
              aria-label={t("library.filter.removeChip")}
              title={t("library.filter.removeChip")}
              onClick={() => onRemove(criterion.id)}
            >
              ✕
            </button>
          </span>
        );
      })}
      <button type="button" className="chips-clear" onClick={onClearAll}>
        {t("library.filter.clearAll")}
      </button>
    </div>
  );
}
