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

## Addendum, 2026-08-17 — `ecoUrl` promoted alongside `eco` (B-102)

Measuring a real chess.com account produced a reason to hold two opening columns rather than one.
**`ECOUrl` is not a prettier `ECO`; it is a finer classification.** In the sample, `C41` and `C47`
each mapped to two *different* opening URLs identifying two different lines — so the URL
distinguishes games the code cannot. Both are therefore promoted: `eco` because it is coarse,
standard and cross-source, and `ecoUrl` because it is more specific where it exists.

`ecoUrl` is `null` for every source that does not emit the tag, which is most of them. That is
accepted: a sparse column is honest about the data, and the alternative — inventing a value — would
break the rule this ADR is built on.

**Two traps recorded so they are not walked into later.**

**Do not derive a display name from the URL slug.** The real opening name contains punctuation the
slug destroys: `Kings-Indian-Attack` and `Birds-Defense` decode to "Kings Indian Attack" and "Birds
Defense", and the colon in "Ruy Lopez Opening: Berlin Defense" is unrecoverable. An opening *name*
column, if wanted, comes from an ECO-to-name table instead — vendor-neutral and correctly
punctuated. That is **B-105**.

**Do not source `ecoUrl` from the chess.com JSON `eco` field**, even though the two are
byte-identical wherever both appear (21/21 in the sample, zero mismatches). The JSON field is
*absent* on 4 of 25 games whose PGN still carries the tag, so it is strictly the less available
copy. Per B-102 both opening values come from the PGN tags.

## Addendum, 2026-08-17 — `whiteAccuracy` / `blackAccuracy` (B-104)

chess.com reports accuracy percentages per player, present on 100% of the measured sample. Decided:
**store them as columns on the game.**

**This is the first field in the model that breaks its governing rule, and the exception needs to be
explicit rather than discovered.** "Store the raw thing, derive the useful thing" works because
every derived value can be recomputed from the retained PGN. Accuracy cannot — it is another
engine's output, and no amount of re-parsing the PGN will reproduce it. It is neither raw (we did
not observe it) nor derivable (we cannot recompute it). It is **retained third-party judgement**.

**The consequence that matters, because it can break something load-bearing silently:** ADR-0004's
storage gate rests on the database staying derivable (B-078) — drop it, re-import, get the same
database back. If accuracy lives only in a column and only the PGN is retained, a rebuild loses it
and the derivability condition quietly stops holding. **So storing accuracy obliges B-012 to retain
the source JSON for API-imported games**, not just the PGN it contains. B-011's migration and
B-012's importer both inherit that.

Display rule: never present these as the application's own assessment. B-019 will compute our own
accuracy figures and they will disagree with these, so the provenance has to survive into the UI.
