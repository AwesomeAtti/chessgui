/**
 * Catalogue keys for filter fields, operators and result values (B-010).
 *
 * Data only — no JSX, no `t()` — because both the authoring panel (`FilterPanel`) and the
 * applied-state chips (`FilterChips`) need the same names, and one concept acquiring two
 * spellings is exactly the failure this file prevents.
 *
 * **Mapped rather than concatenated.** `t()` is typed against the catalogue's own key union,
 * so `"…operators." + operator` is a `string` and will not compile. That is the type system
 * doing its job: a concatenated key is how a catalogue entry gets renamed and a missing
 * translation ships silently. `satisfies` rather than a type annotation on each map, because
 * an annotation widens every value back to `string` and loses the literals `t()` needs —
 * this keeps the exhaustiveness check *and* the literal types.
 */
import type { FilterFieldId, OperatorId, ResultChoice } from "./filters";

/**
 * Where each field's name comes from.
 *
 * Most already exist for the table's columns or the info panel, and reusing them is
 * deliberate. Only `eitherPlayer` is new — nothing else in the app names that idea.
 */
export const FIELD_LABEL_KEYS = {
  white: "library.columns.white",
  black: "library.columns.black",
  eitherPlayer: "library.filter.fields.eitherPlayer",
  whiteElo: "library.columnMenu.whiteElo",
  blackElo: "library.columnMenu.blackElo",
  event: "library.columns.event",
  site: "info.site",
  round: "info.round",
  date: "library.columns.date",
  result: "library.columns.result",
  eco: "library.columns.eco",
  moves: "info.moves",
} as const satisfies Record<FilterFieldId, string>;

export const OPERATOR_LABEL_KEYS = {
  contains: "library.filter.operators.contains",
  notContains: "library.filter.operators.notContains",
  is: "library.filter.operators.is",
  isNot: "library.filter.operators.isNot",
  startsWith: "library.filter.operators.startsWith",
  over: "library.filter.operators.over",
  under: "library.filter.operators.under",
  between: "library.filter.operators.between",
  before: "library.filter.operators.before",
  after: "library.filter.operators.after",
} as const satisfies Record<OperatorId, string>;

export const RESULT_LABEL_KEYS = {
  white: "library.filter.results.white",
  black: "library.filter.results.black",
  draw: "library.filter.results.draw",
  unknown: "library.filter.results.unknown",
} as const satisfies Record<Exclude<ResultChoice, "">, string>;

export type FieldLabelKey = (typeof FIELD_LABEL_KEYS)[FilterFieldId];

export function fieldLabelKey(field: FilterFieldId): FieldLabelKey {
  return FIELD_LABEL_KEYS[field];
}
