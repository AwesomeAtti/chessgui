# Feature Spec: Local persistence (SQLite)

- **Backlog ID:** B-011
- **Status:** done (session 9) — M1–M4 complete. Committed (`297f3e0`, `f03b584`, `3e47802`, `1def042`) and pushed to `origin/main`. `cargo build`, full check chain, and owner app-restart verification all pass on the owner's machine. See `docs/handover.md`'s "Session 9" section.
- **Owner:** Brian

## Goal

Give the database ADR-0005 already specifies somewhere to live: imported games and players
survive an app restart, instead of existing only in the `Importer`'s in-memory state for the
life of the process. This is the last piece standing between B-007 (import) and B-008/B-010
(a real table and search) having something durable to read from.

## User story

As the owner, I want the games I've imported to still be there the next time I open the app,
so that importing is a one-time action rather than something I redo every session.

## Size tier: Large

New dependency (a SQLite crate), a new pattern (schema migrations, DB-backed identity replacing
the in-process `Importer` counters), and it fixes the shape every future query is written
against. ADR-0004 already closed the *engine* choice (SQLite, notify-and-proceed) — this spec is
about *how* it's wired in, which is the part that wasn't decided yet.

## Decisions this spec makes (all notify-and-proceed, none hard-stop)

1. **Crate: `rusqlite` with the `bundled` feature.** Bundled compiles SQLite from source and
   statically links it, so there's no dependency on a system SQLite version across
   Windows/macOS/Linux — the same reasoning that already governs this project's CI matrix
   (B-046). The alternative (linking the system library) trades that portability for a smaller
   binary, which isn't the tradeoff this project has been making anywhere else.
2. **One connection behind a `Mutex`, not a pool.** This is a single-user desktop app with one
   process; a connection pool solves a concurrency problem this app doesn't have. WAL mode
   (`PRAGMA journal_mode=WAL`) is turned on so a future read while a write is in flight doesn't
   block, which costs nothing to add now.
3. **Migrations: numbered SQL files, tracked with `PRAGMA user_version`.** No migration crate —
   at one migration, a dependency for it is premature, and `user_version` is a SQLite built-in
   built for exactly this. Revisit if a migration framework earns its keep once there are several.
4. **The database lives in Tauri's app-data directory**, not beside the PGN files — it's a
   derived artifact (ADR-0004 condition 1), not something the user manages directly.

   **Worth being explicit about, since it came up in review:** there are two different "source of
   truth" claims stacked on top of each other, and they're easy to conflate. ADR-0005 says the
   `pgn` *column on each row* is the source of truth for that row's own derived fields (hot
   columns, tags) — meaning once a game is imported, the app never needs the original file again;
   opening, exporting, and searching that game all come out of the database alone, because a
   full verbatim copy of the text was captured into the row at import time. ADR-0004 separately
   says the *original file on the user's disk* is what the database's derivability promise rests
   on — the ability to drop the whole database and rebuild it from scratch by re-importing, which
   is what let that ADR skip a full hard-stop review. That second claim is a safety net for the
   database as a whole (schema bugs, corruption, wanting to start clean), not something normal
   operation depends on. Deleting a source PGN file the moment after it's imported doesn't break
   anything about that game; it only means that if the database is ever wiped, that one game's row
   can't be reconstructed from an independent source and would be gone for good.
5. **The `Importer`'s in-memory identity scheme is retired.** `lib.rs` already says this is
   B-011's job ("B-011 replaces both the storage and this identity scheme"). The importer becomes
   a pure parse step with no id assignment; the database assigns `GameId`/`PlayerId` on insert,
   and player matching (find-by-`normalised_name`-or-insert) moves from the in-memory `HashMap`
   to a `SELECT` then `INSERT` inside the same transaction as the games that reference it.

## MVP definition

- `src-tauri/migrations/0001_initial.sql` — the ADR-0005 schema: `players` (id, name,
  normalised_name, indexed), `games` (id, white/black player FKs, event, site, the three date
  columns, round, result, eco, eco_url, white_elo, black_elo, ply_count, tags_json, pgn).
- A small `db` module: open-or-create the file, apply pending migrations, and expose
  find-or-insert-player / insert-game / list-games / get-game.
- `import_pgn_text` / `import_pgn_files` write straight to the database instead of returning full
  `Game` values for the frontend to hold. They keep returning `ImportSummary`/`FileImport`'s
  *errors* (still data, per ADR-0009) but games become "N imported", not N full payloads.
- Two new commands: `list_games` (hot fields only — no `pgn`, no `tags_json`) for the library
  table, and `get_game(id)` (the full row, including `pgn`) for opening one. This is also the fix
  for the B-033 finding: the payload that bloats to 1.5× the source file was every row carrying
  its own verbatim PGN across IPC, and the library table never read it.
- Frontend: `LibraryView` calls `list_games` after import instead of holding what import handed
  back; opening a game calls `get_game`. `src/model/game.ts` gets a `GameSummary` type alongside
  `Game` for the two shapes.
- Re-importing the same text still produces duplicate rows — dedupe is explicitly B-022, not
  this. The existing test pinning that behaviour moves from the `Importer` to the DB layer.

**Out of scope for MVP:** dedupe (B-022), full-text search (B-062, arrives with B-010), the
position index, any DB backup/export tooling, and a "rebuild from PGN" command — nothing writes
data yet that isn't reproducible by re-importing, so an automatic rebuild tool isn't needed for
the derivability *property* to hold, only for it to be convenient, which can wait.

## Acceptance criteria

- [x] Games and players persist across an app restart — owner-verified on real hardware
      (M4): imported games, quit, relaunched, games were still in the library.
- [x] `list_games` never carries `pgn` or `tags_json` over IPC; `get_game` does. Enforced by
      `GameSummary` having no such fields at all (`db::tests::list_games_never_carries_tags_or_pgn`).
- [x] The Rust db-layer tests mirror the existing `Importer` tests: ids unique across imports, the
      same player (by normalised name) reuses one row — including two *new* players sharing a
      name within one import batch — a nameless player is never pooled, re-importing duplicates
      rows on purpose. 10 tests in `db.rs`.
- [x] `cargo test`, `cargo clippy --all-targets -D warnings` clean, both in the mirror crate
      (per `rust_verification.md`, 48 tests) and re-verified on the owner's machine against the
      real Tauri crate itself (`cargo build`/`cargo test`/`cargo clippy` all green, 48 tests).
- [x] `npm run typecheck && npm test && npm run check:i18n && npm run build` clean — verified
      against the real toolchain in this session's sandbox (86 tests, before and after the change).
- [x] Rendered and screenshotted headless (per `visual_verification.md`) — empty database and
      populated states, including a non-Latin name, no rendering regression from the
      `Game`→`GameSummary` prop-type change. Harness deleted afterward.

## Risks & dependencies

- **Player matching inside one import batch must stay one row.** The current `HashMap` approach
  guarantees two occurrences of "Vasquez, Marta" in the same paste resolve to one player id; the
  DB version needs the same games-and-their-new-players insert to happen inside a single
  transaction, in order, or two concurrent-looking inserts could both miss and create two rows.
  Single connection behind a `Mutex` (decision 2) makes this straightforward rather than a real
  concurrency problem.
- **Hand-synced schema, again.** `model.rs`, `src/model/game.ts`, and now SQL column names are
  three places that have to agree, same risk the module header already flags for the first two.
  No generator for any of it yet.
- **`rusqlite` with `bundled` should compile in the AI's sandbox** (no webview needed, unlike the
  Tauri crate itself) — verify this early, because if it doesn't, the whole "compiled and tested
  before handover" pattern this project relies on breaks for this feature specifically.
- **Dependency:** ADR-0004, ADR-0005 (schema), B-007 (the `Importer`/`Game` shapes being replaced).

## Implementation plan

1. **M1 — DB layer, no Tauri.** Add `rusqlite` (bundled). Write the migration SQL. Write
   `src-tauri/src/db.rs` (or `db/` if it grows) with open/migrate, find-or-insert-player,
   insert-game, list-games, get-game — pure enough to unit-test against a temp/in-memory SQLite
   file, no Tauri involved. Compile and test in a mirror crate per project memory, same method
   session 8 used for the `Cargo.lock` regeneration.
2. **M2 — wire into Tauri.** `AppState` holds `Mutex<rusqlite::Connection>`, opened in `run()`
   against the app-data dir, migrations applied at startup. Rewrite `import_pgn_text` /
   `import_pgn_files` to persist through the db layer. Add `list_games` / `get_game` commands.
   This half is uncompiled by the sandbox as always (needs the Tauri crate) — handed over for the
   owner to build.
3. **M3 — frontend.** `GameSummary` type, `ipc.ts` wrappers for the two new commands,
   `LibraryView` fetches on mount/after import instead of holding import's return value, opening
   a game fetches full detail. Remove the now-dead in-memory game list state.
4. **M4 — verify.** Full check chain, then owner-run: import something, quit, relaunch, confirm
   it's still there; open a game and confirm the PGN/detail still renders.

Each milestone ends in something demonstrable, same shape as B-007.

## Future enhancements

- A migration framework, once there's more than one migration.
- `PRAGMA user_version` mismatch handling beyond "apply what's pending" (e.g. a DB from a newer
  app version opened by an older one) — not reachable pre-release.
- Explicit "rebuild database from PGN" command, once there's a UI reason to want one.
- B-022 dedupe, B-062 FTS5, the reference-database second store (B-040).
