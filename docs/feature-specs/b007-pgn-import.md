# Feature Spec: B-007 — PGN import

- **Backlog ID:** B-007
- **Status:** draft — awaiting owner approval
- **Owner:** Project owner
- **Size tier:** **Large**, though smaller with each revision. One new Rust crate and the first IPC
  call carrying real data.
- **Governed by:** **ADR-0009 (strict import).** The first draft of this spec was written against
  ADR-0008's permissive, tiered policy and had six milestones; the owner rejected that policy as
  disproportionate and it is now superseded. This version has four.

## Goal

Turn a PGN file or pasted PGN text into rows in the library. Games the parser accepts import; games it
refuses are reported as errors naming the game and the reason. **We add no validation of our own.**

## User story

As someone with a decade of games in chess.com and lichess exports, I want to point the app at them
and see them all in one list — and when the parser cannot read a game, I want to be told which game
and why, rather than having it quietly repaired into something I did not play.

## The policy, in four lines

From ADR-0009, because everything below is downstream of it:

1. One game imports or one game errors. A file is never the unit of failure.
2. Nothing is repaired. A rejected game is not stored — **the source file is still on disk**, so
   re-importing is always available.
3. **The libraries are the validator and we add nothing** — not a spec checker, not a
   notation-language scan, not a zero-moves guard. An error is what `pgn-reader` refuses.
   **The importer does not check legality at all**: `pgn-reader` validates syntax, and asking
   `shakmaty` to play the moves would be us adding validation. Legality is checked on the display
   side by `chessops`, for the one game the user opens.
4. Variants are selected from the `Variant` tag — which in the MVP is entirely `chessops`' job,
   since the importer builds no position.

**How many of the 18 fixtures will error at import? Unmeasured, and possibly none.** That is
milestone 1's question. ADR-0009's "Accepted risks" table lists what the libraries tolerate.

## What this deletes from the previous plan

Recorded because the shrinkage is the point, and because each of these was already specified:

- No `clean` / `imported`-with-warnings / `quarantined` tiers — two states.
- No repair rules, so no warning vocabulary to design and no warning-code catalogue entries.
- No notation-language scan (**B-098 rejected**, not deferred).
- **No disposition or warning columns** in `src/model/game.ts` — ADR-0008 required them and, as it
  happens, they were never added, so there is nothing to unwind and B-011's migration stays smaller.
- No content key, no dedupe (already removed by ADR-0008's addendum).

## MVP definition

**Paste before file, and no database.**

- A pure Rust module: PGN text in, `Vec<Game>` plus whatever `pgn-reader` refused out. Tags,
  a token count for `plyCount`, the verbatim PGN. **No positions, no FEN handling, no legality.**
- One Tauri command, `import_pgn_text`.
- A paste target in the UI; imported games replace `src/mock/games.ts`, which is deleted.
- Games live **in memory for the process lifetime** — they disappear on restart.

**Out of scope, each with an owner:** persistence (B-011); file dialogs (milestone 4, because a
dialog is a platform surface, B-069, and paste needs none); the polished error report (B-097);
progress streaming (B-067, and not until a measurement asks for it); chess.com API import (B-012,
which reuses this pipeline per B-102).

## The error shape

Probably a short section in practice, since milestone 1 may find that `pgn-reader` refuses almost
nothing. Where an error does occur it carries

- the **file** it came from (once milestone 4 exists) and the **game's index** within it,
- a stable **code** — never English, per B-072; the frontend composes the wording,
- the **offending token or byte offset** where the parser can give one,
- enough header text to identify the game to a human (players and date, if the tag section parsed at
  all).

"Invalid movetext in game 412" is a worse experience than a silent repair. "Game 412, Ivanov–Petrov
2019.04.02: unterminated comment" is better than either — note that the example cannot be about an
illegal move any more, because the importer does not look.

## Acceptance criteria

- [ ] Pasting a multi-game PGN produces one row per game, with players, event, date, round, result,
      ECO and ply count derived from the tags.
- [ ] A file of 3,000 games containing 4 the parser refuses imports 2,996 rows and reports 4 errors,
      each identifying its game. **No error causes the other games to be lost.**
- [ ] `cargo test` passes over all eighteen corpus fixtures, asserting whatever milestone 1
      measured `pgn-reader` to do with each.
- [ ] A legal Antichess or Crazyhouse game imports normally — trivially, since the importer never
      consults the rules.
- [ ] Variant handling is **not** an import concern: `[Variant "Grand Chess"]` and
      `[Variant "Fischerandom"]`-without-`FEN` both import, and both fail or mislead on the display
      side instead. Fixtures assert exactly that, so nobody "fixes" it into a check we own.
- [ ] German or French movetext **imports as a game nobody played, and nothing reports it.** Measured
      at milestone 1: `pgn-reader` drops the unparseable tokens (`e4 e5 Sf3 Sc6 Lb5 a6` → `e4 e5 a6`)
      while `chessops` rewrites them (`e4 e5 f3 c6`). **This is the stated assumption, not a bug to
      fix here:** all input is assumed English SAN, and the known issue is **B-115**, flagged for
      better error handling in a later release. A test should pin the current behaviour so the
      later fix has something to change.
- [ ] Bytes that are only PGN by extension do not crash the importer. They produce **one empty junk
      row**, because the library returns a game with default headers rather than refusing —
      accepted, visible, removable, and asserted by a fixture.
- [ ] A Latin-1 file with accented names imports, since Latin-1 is what the PGN spec actually names.
- [ ] Re-importing the same text twice produces duplicate rows. **Expected**, and worth a test so
      nobody later "fixes" it into a silent merge.
- [ ] `npm run check:i18n` passes: no error text in components, no English from Rust.
- [ ] `src/mock/games.ts` is deleted.

## Risks & dependencies

**Risks**

- **`pgn-reader`'s tokenizer behaviour is unmeasured**, and milestone 1 measures it.
  B-099 found that `chessops` does not reject `Sf3` — it rewrites it to `f3`, a legal pawn move.
  **The outcome does not change the policy**, since we accept the libraries' behaviour either way, but
  it changes what an error message can honestly say — and a *difference between the two libraries* is
  a real B-064 finding worth recording.
- **`pgn-reader`'s visitor API is a streaming interface the AI has never compiled**, and it shifts
  across 0.x releases (B-063). Mitigated by making milestone 1 tiny.
- **`shakmaty` is deliberately not a direct dependency.** The importer never builds a board, so it
  is not needed; `pgn-reader` carries it transitively. It returns, with its `variant` feature, when
  the position index (B-018/B-042) arrives.
- **Performance unmeasured** (B-033): a 3,000-game paste crosses IPC as one string. Measure, then
  decide; do not pre-optimise.
- **Diagnostic quality is now a feature, not a nicety** — see the error shape above.
- **Player identity without a database.** `Game.white` needs a `PlayerId`; stable IDs are B-011's.
  MVP assigns per-session sequential IDs and derives `normalisedName`. Merging is B-022.

**Dependencies**

- ADR-0009 (this policy), ADR-0003 (libraries), ADR-0005 (model), ADR-0004 (SQLite).
- **Not a dependency, despite earlier drafts saying so: "derivability" (B-078).** We do not delete
  PGN files, so the database can always be rebuilt by importing again. That is one sentence, and it
  needs no mechanism, no gate and no owner while this is a development-stage app with no user data.
  It becomes a real concern at B-015, when annotations create data that exists nowhere else.
- B-099's corpus, repurposed: a corpus of files that must be **rejected** is as useful as one of
  files to be repaired, and its measured `plies`/`truncatedAtPly` values still describe the frontend
  reader and are unaffected.
- One new crate: `pgn-reader = "0.29"`, GPL-3.0-or-later.

## Implementation plan

Each milestone ends with a command the owner runs, because the AI cannot compile Rust. The corpus is
what makes that workable: one `cargo test` asserts eighteen cases whose expected values were
measured before the code existed.

**Milestone 1 — measure `pgn-reader` against the corpus. No product code. WRITTEN, awaiting a run.**
Delivered as `src-tauri/tests/pgn_reader_probe.rs` plus the two crates in `Cargo.toml`
(`pgn-reader = "0.29"`).
**One fact from the crate docs changed the design, and it is the reason this spec shrank again:**
`pgn-reader` states plainly that it **does not validate move legality** — it hands back SAN tokens,
and legality only happens if the caller asks `shakmaty` to play them. Asking is us adding validation.
So the MVP importer does not, and `shakmaty` is not a direct dependency at all.
The probe **asserts nothing about behaviour, deliberately**: asserting before a human has read the
output would bake in whatever the library does today, which is how a test ends up certifying a bug.
It also does not select variants — that is milestone 2 — so the variant fixtures are expected to show
refusals, and that is not a finding.
Add the crates. A `#[cfg(test)]` test walks every fixture and prints what pgn-reader produces: game
count, ply count, the first token it refuses, and whether it alters a token instead of refusing it.
→ `cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture`
→ Expect a table of eighteen results and a written finding for anything that disagrees with the
chessops observations already in `expected.json`. **This milestone can fail usefully**: a
disagreement is the B-064 divergence risk finally producing a result instead of a paragraph.

**Milestone 2 — the pure import module.**
`src-tauri/src/import/`: text in, games plus errors out. Hot fields per ADR-0005, `result` as an
integer, `PgnDate` raw plus parsed, full tag map retained, verbatim PGN byte-preserved, `plyCount`
from a token count. UTF-8 with Latin-1 fallback. **No legality walk and no positions** — that is the
point of milestone 1 having measured what `pgn-reader` alone refuses.
→ `cargo test` asserting, for all eighteen fixtures, whatever milestone 1 established.

**Milestone 3 — IPC and the paste path.**
`import_pgn_text`; `ipc.ts` gains the call and the result types; a paste target; `LibraryView` reads
imported games; `src/mock/games.ts` deleted; error codes get catalogue entries.
→ `npm run typecheck && npm test && npm run check:i18n`, then `npm run tauri dev` and paste a real
export. **First point at which a human must look**, and the first honest measurement of how long
3,000 games takes.

**Milestone 4 — file import.**
The file dialog behind `src/shell/`, reading bytes rather than a string, plus the encoding path. A
plain error list, handed to B-097 for the polished version.

## Future enhancements

- Streaming import with progress (B-067), once a measurement justifies it.
- Import a directory tree; remember the last folder (B-085).
- **Revisit strictness if the loose-file survey earns it.** ADR-0009's accepted cost is that the
  irreplaceable tail gets refused rather than half-understood. B-101's un-run half is the evidence
  that could reopen it — and if it does, the right response is a new decision, not repair rules
  smuggled in underneath this one.
