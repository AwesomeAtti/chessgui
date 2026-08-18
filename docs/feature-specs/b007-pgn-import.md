# Feature Spec: B-007 — PGN import

- **Backlog ID:** B-007
- **Status:** **milestones 1, 2 and 3 done** (sessions 5, 6 and 7); milestone 4 is next
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

**Measured at milestone 1: `pgn-reader` refuses exactly 1 of the 18 fixtures** — `unterminated-comment`.
Everything else imports, several files despite not conforming to the PGN specification. ADR-0009's
"Accepted risks" table records each one, measured on both sides.

**One stated assumption, which is a known issue rather than an oversight: all input is English SAN**
(ADR-0009). A German or French file imports as a game nobody played and nothing reports it — flagged as
**B-115** for better error handling in a later release.

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

A short section, as it turns out: milestone 1 measured exactly one refusal in eighteen fixtures. Where
an error does occur it carries

- the **file** it came from (once milestone 4 exists) and the **game's index** within it,
- a stable **code** — never English, per B-072; the frontend composes the wording,
- the **offending token or byte offset** where the parser can give one,
- enough header text to identify the game to a human (players and date, if the tag section parsed at
  all).

"Invalid movetext in game 412" is a worse experience than a silent repair. "Game 412, Ivanov–Petrov
2019.04.02: unterminated comment" is better than either — note that the example cannot be about an
illegal move any more, because the importer does not look.

**Measured at milestone 2, and it makes the report simpler and worse at the same time.** The byte
offset is always available, because the reader's own `stream_position` gives it. The header text is
usually available, because the tag section is parsed before the movetext fails — all seven roster tags
arrive before an unterminated comment is noticed. And there is **at most one error**, so B-097's
"list the errors" is a list of length zero or one. The part that is worse: the report must also say
that everything after that offset was never read, which is a sentence no import report wants to
contain.

## Acceptance criteria

- [x] Pasting a multi-game PGN produces one row per game, with players, event, date, round, result,
      ECO and ply count derived from the tags. *(Milestone 2; the paste target itself is milestone 3.)*
- [x] ~~A file of 3,000 games containing 4 the parser refuses imports 2,996 rows and reports 4 errors,
      each identifying its game. **No error causes the other games to be lost.**~~
      **Falsified by measurement at milestone 2, and replaced.** `pgn-reader`'s errors are
      irrecoverable: an unterminated `{` swallows the rest of the input into the comment and
      `has_more()` goes false, so **there is at most one error per input and the games after it are
      lost.** The corrected criterion: *a file whose 13th game is malformed imports the first 12,
      reports one error naming that game and the byte offset past which nothing could be read, and
      does not pretend the rest was read.* See ADR-0009's session-6 addendum for why we do not
      resynchronise, and `tests/import_corpus.rs` for the test that pins it.
- [x] `cargo test` asserts the milestone-1 measurements from the Rust side —
      `importOutcome`/`importErrorCode`/`importTokens` in `expected.json`, plus `importedTags`, added
      at milestone 2 — which is what turns that manifest from a record into a guard.
      **`importedTags` is not a duplicate of `importTags`:** the parser reports every tag pair
      including repeats, the importer keeps the first of each, and the two differ on exactly one
      fixture. Recording both keeps the library's truth and our decision separate.
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
- [x] Re-importing the same text twice produces duplicate rows. **Expected**, and worth a test so
      nobody later "fixes" it into a silent merge.
- [x] `npm run check:i18n` passes: no error text in components, no English from Rust.
- [x] `src/mock/games.ts` is deleted.

## Risks & dependencies

**Risks**

- **The two libraries produce different wrong games from a non-English file — measured, B-115.**
  `pgn-reader` drops tokens it cannot parse; `chessops` rewrites them into different legal moves. So a
  German file yields `plyCount` 3 at import and a four-ply game on the board, and neither side
  complains. Covered by ADR-0009's stated assumption that input is English SAN.
- **`pgn-reader`'s visitor API was unknown to the AI and is now exercised** — see
  `src-tauri/tests/pgn_reader_probe.rs` for a working `Visitor` with `Tags`/`Movetext`/`Output` and
  `ControlFlow`. It compiled on the first try after the crate docs were read rather than guessed. Still
  shifts across 0.x releases (B-063).
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

**Milestone 1 — measure `pgn-reader` against the corpus. No product code. DONE (session 5).**
Delivered as `src-tauri/tests/pgn_reader_probe.rs` plus the two crates in `Cargo.toml`
(`pgn-reader = "0.29"`).
**One fact from the crate docs changed the design, and it is the reason this spec shrank again:**
`pgn-reader` states plainly that it **does not validate move legality** — it hands back SAN tokens,
and legality only happens if the caller asks `shakmaty` to play them. Asking is us adding validation.
So the MVP importer does not, and `shakmaty` is not a direct dependency at all.
The probe **asserts nothing about behaviour, deliberately**: asserting before a human has read the
output would bake in whatever the library does today, which is how a test ends up certifying a bug.
**Results:** one refusal in eighteen (`unterminated-comment`); tokens silently *dropped* on the
localised-notation fixtures where chessops rewrites them (B-115); tags reported truthfully where
chessops fabricates defaults. All recorded in `expected.json` and ADR-0009's risk table. It took two
runs — the first printed a token count where the token lists were needed, on exactly the fixtures that
mattered.
Add the crates. A `#[cfg(test)]` test walks every fixture and prints what pgn-reader produces: game
count, ply count, the first token it refuses, and whether it alters a token instead of refusing it.
→ `cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture`
→ Expect a table of eighteen results and a written finding for anything that disagrees with the
chessops observations already in `expected.json`. **This milestone can fail usefully**: a
disagreement is the B-064 divergence risk finally producing a result instead of a paragraph.

**Milestone 2 — the pure import module. DONE (session 6).**
Delivered as `src-tauri/src/import/` — `mod.rs` (the `Importer`), `model.rs` (ADR-0005 in Rust),
`decode.rs`, `derive.rs`, `visitor.rs` — plus `src-tauri/tests/import_corpus.rs`. 32 Rust tests,
`cargo fmt` and `cargo clippy --all-targets -D warnings` clean.

**Four things were measured rather than assumed, and three of them changed something:**

1. **`Result` tag vs termination marker.** `pgn-reader` reports both and reconciles neither — tag
   `1-0`, marker `0-1`, same game. The spec's guidance ("prefer the tag, and prefer agreeing with
   chessops") is not satisfiable on that file, because chessops prefers the marker. **The tag wins**,
   since ADR-0005 derives hot fields from tags; the marker is the fallback when there is no tag.
2. **The error vocabulary is two messages**, read from the crate source rather than guessed, so the
   error codes are a closed set with one fallback for the version that grows a third (B-063).
3. **Errors are terminal** — see ADR-0009's session-6 addendum and the falsified acceptance criterion
   above. This is the finding of the milestone.
4. **The MSRV claim was already false** (B-094): `pgn-reader` declares `rust-version = "1.88"` and the
   `shakmaty` it pulls in declares `1.95`, against our `1.77.2`. Corrected to `1.95`, which is what CI
   has pinned all along.

**And one bug, caught by a test rather than by review:** accent-stripping by Unicode decomposition
also decomposes Cyrillic `й` into `и` plus a combining breve, so a blanket strip rewrote `Анатолий` as
`анатолии` — a different name, which would have matched a different player. A combining mark is now
dropped only when it sits on a Latin letter. **The plausible rule was wrong in a way no amount of
reading it would have shown**, which is the same shape as the other seven on this project's list.

→ `cargo test --manifest-path src-tauri/Cargo.toml`

**Milestone 3 — IPC and the paste path. DONE (session 7), and owner-verified in the running app.**
Delivered: `import_pgn_text` with one long-lived `Importer` in Tauri state; `ipc.ts` gains the call
and the result types; the **Add games dialog**; `ImportStrip`; `ImportOutcome`; `importReport.ts`
(pure, tested); `src/mock/games.ts` deleted; catalogue entries for the three error codes.

**The UI was mocked and approved before it was coded**, per AGENTS.md, and the survey behind it is in
`docs/ui-survey.md` — including the two findings that would have been guessed wrong (two of the four
surveyed products have no paste box at all, and the newest organises import by *source* as tabs).

**Decisions taken from the mockups:**

- **The dialog is the home for every import source.** Milestone 4, B-012 and B-013 become tabs here
  rather than new screens. The tab strip is absent while there is one source — a strip of one is
  furniture, and greyed-out tabs advertise features that do not exist.
- **Paste anywhere in the library opens the dialog, prefilled.** The pasted text is **not** sniffed
  for PGN-ness: deciding what a valid game looks like is the validation ADR-0009 declines, and
  `pgn-reader` is the only thing entitled to that opinion.
- **The outcome lives in a strip above the table for every import; the dialog additionally holds on
  a result step when there is something to act on.** Owner-reported twice on the way there: staying
  open on success was awkward, and closing outright lost the record. The rule that resolves both is
  *the strip always records; the dialog stops you only when there is a decision.*
- **Drag-and-drop deferred to milestone 4**, because reading a dropped file is Tauri's file-drop
  event — a platform surface (B-069), which is why file import has its own milestone.

**Two findings from the owner running it, both fixed in the same session:** the info panel formatted
real chess.com data poorly — five separate causes, only one of them styling, written up under B-105
and rebuilt as curated groups over a full-tag disclosure — and the dialog's first version stayed open
after a clean import.

→ `npm run typecheck && npm test && npm run check:i18n`, then `npm run tauri dev` and paste a real
export. **Timing 3,000 games is still unmeasured** — the owner's paste was a month of chess.com
games, not a decade — so B-033 has no number yet.

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
