# ADR-0005: Game data model — players, dates, and the tag set

- **Status:** accepted
- **Date:** 2026-08-16
- **Deciders:** Owner (session 3)
- **Backlog link:** B-058, B-059, B-060 — decided at B-054

## Context

ADR-0004 chose SQLite and downgraded the storage gate to notify-and-proceed, on the grounds
that PGN files are retained as the source of truth and the MVP is read-only, so abandoning the
database costs a re-import rather than data. **That downgrade explicitly did not cover the
schema shape.** The engine is cheap to change; the shape is not, because it gets baked into
import code and into every query written afterwards.

M1 builds no database. But it does build a mock game list, and that list has a shape. If the
shape is invented ad hoc it becomes the de facto schema by the time B-007 imports real PGN —
chosen by accident rather than on purpose. So the model is decided now and the migration is
written later (B-011).

Three questions, all forced by what real-world PGN actually contains:

- Player names arrive as free text, inconsistently (`Carlsen, Magnus` / `Magnus Carlsen`,
  with and without accents, in several scripts).
- Dates are routinely partial: `2024.??.??`, `????.??.??`, `2024.06.??`.
- The tag set is open-ended. Beyond the Seven Tag Roster, files carry `Annotator`, `PlyCount`,
  `Variant`, `FEN`, `SetUp`, `WhiteElo`, `ECO`, and arbitrary site-specific tags.

Two standing constraints bound every answer. **The database must stay derivable** (B-078): the
verbatim PGN is stored in the row and re-import must reproduce the database exactly. And
**read-only must not become a read-only schema** (B-050): stable row IDs from the first
migration, header fields strictly derived, so annotation (B-015) is an addition and not a
migration.

## Options considered

1. **Flat table, headers as text columns, nothing else kept** — simplest; silently drops
   unknown tags and cannot answer "my games as Black" reliably.
2. **Verbatim PGN only, parse on read** — perfect fidelity, trivially derivable, but every
   search becomes a full scan. Fails B-033's 200 ms target at 10k games.
3. **Verbatim PGN as source of truth, plus derived indexed columns, plus a normalised
   `players` table and a JSON tag blob** — more machinery up front; answers all three
   questions without losing anything.

## Decision

We chose **option 3**. Concretely:

**B-058 — players get their own table.** `games` holds `white_player_id` / `black_player_id`
foreign keys, not name strings. The `players` table stores the name as it appeared plus a
`normalised_name` used for matching and grouping — case-folded, accent-stripped, reordered to
a canonical `Lastname, Firstname`. Normalisation is *lossy and derived*; the original string
survives in the tag JSON and in the PGN itself, so a bad normalisation rule is a re-import,
not a data loss. Merging mis-split identities is B-022.

**B-059 — dates are stored twice.** `date_raw` keeps the PGN string verbatim (`2024.??.??`).
`date_parsed` is a nullable ISO date, populated only when the date is complete enough to be
meaningful, alongside `date_year` and `date_month` nullable integers so a partially-known date
still sorts and filters sensibly. Sorting and filtering use the parsed values; fidelity lives
in the raw one. Never format a date by hand (B-074).

**B-060 — the full tag set is kept as JSON**, in a `tags_json` column, alongside the hot fields
promoted to indexed columns (players, event, site, date, round, result, ECO, both Elos). Hot
columns are strictly derived from the tags; the JSON is the complete record; the PGN text is
the ultimate authority. `result` is stored as an integer — `1` white win, `0` draw, `-1` black
win, `NULL` unknown/ongoing — never the string `"1-0"`.

**Notation stays canonical English on disk** (B-073). Localised SAN may be tolerated on import
per the B-049 fidelity policy, but nothing language-dependent enters the schema. Display
notation is rendered per-locale at the edge.

## Rationale

Every one of these is the same move: **store the raw thing, derive the useful thing, index the
derived thing.** That pattern is what makes B-078 true by construction rather than by
discipline — if a derivation rule turns out to be wrong, the fix is to change the rule and
re-import, and no user data is at risk because none of the derived values are authoritative.

The alternative that looks simpler — option 1 — is only simpler until the first real PGN file
arrives with a tag we didn't anticipate, at which point the data is gone and we don't know it.
Option 2 is architecturally purer and fails a measured requirement.

The cost is that import does more work and the schema has more parts. That cost is paid once,
by us, at import time. The cost of the alternatives is paid repeatedly, by the user, in the
form of games that don't group, dates that don't sort, and tags that vanish.

## Consequences

- **Positive:** "my Sicilians as Black" (B-010) becomes a real query. Partial dates sort
  correctly. Nothing in a PGN file is ever silently discarded. Dedupe and merge (B-022) have
  something to work with. `result` as an integer makes score aggregation arithmetic rather
  than string matching.
- **Negative / tradeoffs:** import is more complex and slower. Name normalisation will make
  mistakes — it always does — and will need a manual merge path eventually. The JSON column is
  a place where unstructured data can quietly accumulate, and it is not searchable without
  further work.
- **Follow-ups:** B-011 writes the migration. B-022 provides identity merge. B-062 (FTS5) makes
  the JSON and names fuzzy-searchable. B-074 covers locale collation for name sorting, which
  this ADR assumes but does not implement. B-061 (zstd) may later compress the PGN column.
- **This ADR does not re-open the storage gate.** It rests on the same conditions ADR-0004
  does, and re-hardens with it at B-015.
