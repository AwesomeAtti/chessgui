# Feature Spec: B-007 — PGN import

- **Backlog ID:** B-007
- **Status:** draft — awaiting owner approval
- **Owner:** Project owner
- **Size tier:** **Large**, but smaller than the first draft of this spec. Two new Rust crates and
  the first IPC call carrying real data.
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
   notation-language scan, not a zero-moves guard. An error is what `pgn-reader` or `shakmaty`
   refuses, and its own error kind is the code.
4. Variants are selected from the `Variant` tag and walked under those rules, not refused.

**Only 4 of the 18 corpus fixtures are errors**, which is the honest measure of this policy: an
illegal move, two localised-notation files that fail at a later token, and an unrecognised variant
name. The other fourteen the libraries accept — several despite not conforming to the PGN spec — and
ADR-0009's "Accepted risks" table lists what that costs.

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

- A pure Rust module: PGN text in, `Vec<Game>` plus `Vec<ImportError>` out.
- One Tauri command, `import_pgn_text`.
- A paste target in the UI; imported games replace `src/mock/games.ts`, which is deleted.
- Games live **in memory for the process lifetime** — they disappear on restart.

**Out of scope, each with an owner:** persistence (B-011); file dialogs (milestone 4, because a
dialog is a platform surface, B-069, and paste needs none); the polished error report (B-097);
progress streaming (B-067, and not until a measurement asks for it); chess.com API import (B-012,
which reuses this pipeline per B-102).

## The error shape, which is now the load-bearing part

Under ADR-0008 a vague diagnostic could hide behind a disposition. It cannot here: strictness is only
as good as the message. Every error carries

- the **file** it came from (once milestone 4 exists) and the **game's index** within it,
- a stable **code** — never English, per B-072; the frontend composes the wording,
- the **offending token or byte offset** where the parser can give one,
- enough header text to identify the game to a human (players and date, if the tag section parsed at
  all).

"Invalid movetext in game 412" is a worse experience than a silent repair. "Game 412, Ivanov–Petrov
2019.04.02: `Lb5` is not a legal move at ply 5" is better than either.

## Acceptance criteria

- [ ] Pasting a multi-game PGN produces one row per conforming game, with players, event, date,
      round, result, ECO and ply count derived from the tags.
- [ ] A file of 3,000 games containing 4 the parser refuses imports 2,996 rows and reports 4 errors,
      each identifying its game. **No error causes the other games to be lost.**
- [ ] `cargo test` passes over all eighteen corpus fixtures, asserting import-or-error and the error
      code for each.
- [ ] A legal Antichess or Crazyhouse game imports normally.
- [ ] `[Variant "Grand Chess"]` is an error, because both libraries refuse it, and its code is
      distinguishable from a malformed FEN — the libraries' own error kinds carry that distinction.
      `[Variant "Fischerandom"]`-without-`FEN` **imports as standard chess**, an accepted risk rather
      than a bug, with a fixture asserting exactly that so nobody "fixes" it into a check we own.
- [ ] German or French movetext errors at the first token the library will not play. **Note what this
      does not claim:** the earlier plies have already been silently rewritten (`Sf3` → `f3`), we do
      not detect that, and a file that reinterpreted cleanly throughout would import as a wrong game.
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
- **`shakmaty` needs `features = ["variant"]`** — opt-in, and a compile error if omitted.
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
- New crates: `pgn-reader`, `shakmaty` with `features = ["variant"]`. Both GPL-3.0-or-later.

## Implementation plan

Each milestone ends with a command the owner runs, because the AI cannot compile Rust. The corpus is
what makes that workable: one `cargo test` asserts eighteen cases whose expected values were
measured before the code existed.

**Milestone 1 — measure `pgn-reader` against the corpus. No product code.**
Add the crates. A `#[cfg(test)]` test walks every fixture and prints what pgn-reader produces: game
count, ply count, the first token it refuses, and whether it alters a token instead of refusing it.
→ `cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture`
→ Expect a table of eighteen results and a written finding for anything that disagrees with the
chessops observations already in `expected.json`. **This milestone can fail usefully**: a
disagreement is the B-064 divergence risk finally producing a result instead of a paragraph.

**Milestone 2 — the pure import module.**
`src-tauri/src/import/`: text in, conforming games plus errors out. Hot fields per ADR-0005, `result`
as an integer, `PgnDate` raw plus parsed, full tag map retained, verbatim PGN byte-preserved.
Legality walked under the variant named in the tag. UTF-8 with Latin-1 fallback.
→ `cargo test` asserting import-or-error plus the error code for all eighteen fixtures.

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
