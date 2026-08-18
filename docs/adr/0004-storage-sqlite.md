# ADR-0004: Local storage — SQLite, on a reversibility argument

- **Status:** accepted
- **Date:** 2026-08-16
- **Deciders:** Project owner
- **Backlog link:** B-004

## Context

`chessgui` needs a local, embedded store for a personal database of ~10,000 games, meeting a
200 ms filtered-search target (vision §5), and it must not design out a separate, read-mostly,
position-indexed reference database of millions of master games later (B-040, §7).

B-004 was recorded as a **hard-stop gate** on the grounds that "migrating a user's database
later is a data-safety problem, not a refactor."

**That premise does not hold during development, and the reason is worth stating precisely.**
PGN files are retained as the source of truth. The database is populated *from* them by import.
Combined with the read-only MVP (B-050), there is no data that exists only in the
database — so abandoning the store costs a re-import, not data. This is true by construction,
not by discipline.

The gate therefore has an expiry date, and it is not B-004. It is **B-015** (annotations): the
first moment a user can create data that lives nowhere else. Until then, the storage choice is
reversible in an afternoon, which is the methodology's own test for notify-and-proceed.

## Options considered

1. **SQLite** (industry standard) — embedded relational engine, ubiquitous, excellent Rust
   support (`rusqlite`), FTS5 and JSON1 available, single-file database.
2. **Plain files plus an index** (simplest alternative) — PGN on disk with a derived index.
   Effectively what the app already has; adds nothing over re-parsing.
3. **Embedded key-value store** (`redb`, `sled`) — fast, Rust-native, no SQL. Would require
   hand-building every query, sort, and filter the game list needs.

## Decision

We chose **SQLite**, and we downgrade B-004 from hard stop to notify-and-proceed.

## Rationale

SQLite wins on the criteria that actually apply. Header search and filtering over 10k rows is
exactly the workload relational indexes are for, and 200 ms is not in question at this scale.
It is the most boring, best-understood option available, which is *simplicity first* and
*industry standards first* applied literally.

It also leaves the reference database open rather than foreclosing it: a separate SQLite file
with a different schema, bulk-loaded and read-mostly, is a normal thing to do — and if the
position index later demands something specialised, that is a second store, which was always
the working assumption (§7).

The key-value stores were rejected not on performance but on what they would cost: sorting,
filtering, and ad-hoc queries would all be hand-written, which is a lot of code to replace
something SQLite does correctly for free.

The downgrade from hard stop is the substantive part of this ADR. Spending a full gate on a
decision whose failure mode is "re-import your PGNs" is paperwork, and the project's own risk
register (handover risk 5) says the failure mode here is deliberation, not error.

## Consequences

- **Positive:** unblocks B-054 (M1 skeleton) immediately. FTS5 (B-062) and JSON storage of the
  full tag set (B-060) come for free rather than needing to be built.
- **Negative / tradeoffs:** we are accepting a decision made without the full six-part gate.
  That is defensible *only while the reversibility conditions below hold*, and it stops being
  defensible silently if they lapse.
- **Conditions this decision depends on — treat as standing constraints:**
  1. **The database stays derivable.** The user's PGN files remain the retained source of
     truth; import is idempotent; the DB can be dropped and rebuilt from them at any time.
  2. **Verbatim PGN text is stored in the row**, with header columns strictly derived from it
     (the B-004 working assumption, unchanged).
  3. **Rows carry stable IDs** from the first migration, so annotations can attach later
     without a migration (B-050).
- **The gate re-hardens at B-015.** When annotations become writable, the database holds data
  that exists nowhere else, and the original reasoning for a hard stop applies again. Export
  (B-017) is what would defuse it a second time — which is an argument for building export
  alongside annotation rather than after it.
- **Follow-ups:** the schema questions are *not* downgraded with the engine. B-058 (player
  table and name normalisation), B-059 (partial dates), B-060 (full tag set as JSON) all get
  baked into import code and every query, and are expensive to change regardless of which
  engine sits underneath. Decide them deliberately at B-054.

## Addendum, session 9 (B-011) — two "source of truth" claims, not one

Raised in review of the B-011 spec: condition 1 above ("the database stays derivable") and
ADR-0005's "store the raw thing" rule sound like the same claim and are not. **This ADR's
derivability condition is about the original file on the user's disk** — it is what lets the
whole database be dropped and rebuilt from scratch, which is the reasoning that justified
downgrading this to notify-and-proceed in the first place. **ADR-0005's rule is about the `pgn`
column on each row** — a verbatim copy captured at import time, which is what the running app
actually reads from once a game exists in the database. The two are related, not identical: the
per-row copy makes normal operation self-sufficient (no game ever depends on its source file
still existing at its original path to be opened, searched, or exported); the original file is
what the *whole-database* rebuild promise depends on if the database itself is ever lost. Losing
a source file after import costs the rebuild safety net for that one game, not the game itself.
