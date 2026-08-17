# Handover

> The current state of the project. Update at the end of every session so the next session
> (human or AI) can resume with zero chat history.

**Last updated:** 2026-08-17 · **Updated by:** AI (Stage 3 / session 5) · **Kit version:** 0.2.0

**Head at session start:** `760dcc9`, clean, level with `origin/main`. **Session 5 is committed and
pushed in eight increments** — `620b4b7`, `a10a18d`, `f058ba4`, `8ffbf4a`, `d3c7f18`, `255baa6`,
`6206d42`, `72b7d12`. `origin/main` is at `72b7d12`; `git log origin/main..HEAD` is empty and the tree
is clean. Verified at close rather than predicted, because this header has carried a stale claim in
three consecutive sessions and did again mid-session: it said "session 5's work is uncommitted", which
was true when written and false an hour later.

**Written last, deliberately.** That is the rule this file keeps breaking, so here it is as a
procedure rather than an intention: **write the header after the final push, from `git log`, not from
memory.**

**State in one line:** M1 closed and owner-verified; the project now has a test harness, an 18-fixture
PGN corpus, and a settled import policy in **ADR-0009 — the libraries validate, we add nothing**. The
import path is started: **B-007 milestone 1 is measured and done**. Next is milestone 2.

**Session 5 in a paragraph, for anyone who does not want the detail below.** It began as a state
review that recommended B-099 — and B-099 turned out not to be startable, because the project had no
test runner at all, which no document revealed. So the session built the harness (B-106), then the
corpus (B-099), and the corpus then changed the governing policy twice: ADR-0008's rule 3b was amended
(B-113), then ADR-0008 was superseded wholesale by **ADR-0009** (B-114) after the owner rejected it as
disproportionate. Four owner challenges did the real work, each cutting deeper than the concession
would have: the dedupe hash was solving a problem the MVP does not have; dependency behaviour is not
ours to second-guess; derivability was a production doctrine in a development-stage app; and *"if
pgn-reader doesn't validate, why do we need to?"* removed positions, FEN handling, variant selection
and an entire direct dependency from the importer. Net effect: **B-007 shrank from six milestones to
four, one backlog item was rejected, three were deferred, and two model columns were removed** — while
the MVP got closer rather than further away.

## Project summary

`chessgui` — a modern, cross-platform (Windows / macOS / Linux) desktop chess database and
chess GUI: import, search, organize, annotate, and analyze your own games locally, using
UCI-compatible engines. Local-first, no account, no server. **Product code now exists**: a
Tauri 2 + React 19 skeleton with a static board, a mock game list, and navigation.

## Current stage

**Stage 3 — M1 skeleton complete and verified; M2 (import) is next.** All gates closed:
ADR-0001 (Tauri 2), ADR-0002 (GPL-3.0), ADR-0003 (chess libraries), ADR-0004 (SQLite),
ADR-0005 (data model), ADR-0006 (React 19), ADR-0007 (layout C+), ADR-0008 (import fidelity —
accepted, amended, then **superseded**), and **ADR-0009 (strict import), which is the live policy**.

Two ADRs govern import and only one of them is current. Read ADR-0009; read ADR-0008 for how the
question was worked through, and note that its main body is no longer what we do.

**The document-to-code ratio finally moved.** Session 3 wrote the first product code in the
repository. Risk 5 is downgraded but not closed — see the risk register.

## Active work

**Nothing is in progress. M1 is fully verified and closed. M2 starts next, at B-049.**

### Session 4 so far: the M1 verification pass, and what it returned

**B-054 — M1 skeleton is DONE and now observed rather than assumed.** The owner walked the eight
secondary paths the previous handover left unticked, and **all eight pass**: the filter box
narrows the table with a live count, arrow keys plus Enter open a game from the library, Home/End
jump to either end of a game, clicking a move jumps the board, two tabs each keep their own ply
across a switch, Accel+W closes the active tab, the footer move buttons work, and no
document-level scrollbar appears at any window size.

**Every box was expected to pass. Every box passed. The pass still returned three findings.**
That is the sentence to keep: *a tick is not the same as an absence of information*, and nothing
here was visible from a green build. Written up as M1-F1 – M1-F3 in
`docs/milestones/m1-skeleton.md`.

- **M1-F1 — Home/End work, and are still effectively unavailable.** Confirmed via **fn+←/fn+→**,
  which is how Apple keyboards without a numpad emit those keys. So there is no bug. **The
  finding is that no key on the keyboard in front of the developer carries either label**, so a
  working shortcut is reachable only by someone who already knows the fn convention. The binding
  was inherited from Windows chess software without anyone checking the target keyboard — a
  B-069 portability miss in a category nobody had thought to file under "platform surface":
  keyboards. Widened **B-086** to own the whole shortcut scheme. **Deliberately not spot-fixed**
  — the owner's call was to choose all the bindings at once, since piecemeal additions are how a
  scheme becomes incoherent. Reachable meanwhile via the ⏮/⏭ footer buttons.
- **M1-F2 — Accel+W on the library tab closes the window, and it was reported as a bug.**
  Better read as an unexamined default. `App.tsx` returns early with no game tab open and does
  *not* call `preventDefault()`, so the key reaches Tauri's macOS menu where Cmd+W is Close
  Window. **Examined and kept**: that is the macOS convention, Chrome does the same with its last
  tab, and nothing can be lost while the MVP is read-only. The early return is now commented at
  length so nobody "fixes" the asymmetry into a no-op — **including a note that the reasoning
  expires at B-015**, when unsaved state starts to exist.
- **M1-F3 — the live-resize stretch turned out to be the webview's, not ours, and a control is
  what established that.** Everything right of the board appears elastic mid-drag, then snaps;
  settled layout correct, so repaint timing. The reported cause was **ruled out by reading the
  CSS** — the panel is a fixed grid column and cannot stretch. That left our JavaScript board
  sizing versus macOS compositing the last painted frame. **Rather than pick the plausible story,
  we ran the control** (B-077): the library tab has no JavaScript-sized element and stretches
  identically. So no code of ours participates and `useChessground.ts` is exonerated rather than
  merely unaccused. **B-096 rejected.** Cost: one window drag.

**Two meta-observations, and the second matters more.**

First, these are the first observed costs of trades this project made deliberately and wrote
down — JavaScript board sizing over CSS (B-069/B-066), and platform conventions behind one
boundary. Neither is a surprise; both are the documented price arriving.

Second, and this is the one to carry: **the obvious suspect was innocent.** `useChessground.ts`
is the most complicated, most hand-rolled, most apologised-for piece of code in the frontend, so
when a resize glitch appeared it was the natural culprit — and it had nothing to do with it. The
control that proved so was free, available from the moment the symptom was described, and would
not have been run at all if the confident diagnosis had been allowed to stand. **This is the
third time on this project that measurement has overturned reasoning** (risk 9's IPC flood,
risk 10's Low Power Mode, now this), and the pattern in all three is the same: the story was
coherent, plausible, and wrong.

### Session 3, kept for context: the layout took three attempts

**The layout took three attempts and the third was chosen properly rather than guessed.**
Attempt one was two screens with navigation — "felt like a web page". Attempt two was
master–detail, which the AI asserted was what applications in this category do; the survey
later showed no dedicated chess database uses it. Both were rejected on sight.

That prompted the process change below: **mock before coding**. A survey
(`docs/ui-survey.md`), a workflows document (`docs/core-workflows.md`), four mocked structural
options and two refinement rounds produced **ADR-0007 — layout C+**:

- a pinned library tab plus game tabs
- **the library tab is a single full-width table** — no side panel
- **a game tab is a fluid board plus a fixed 320px panel**, built as header / scrolling body /
  fixed footer, with a segmented control for tools

The library panel was built twice and removed twice — first as a preview board (every game
starts from the same position, so it showed the same thing for every row), then as a details
panel (it duplicated the table's own columns and charged a fifth of the width for it). The
lesson recorded in the ADR: **consistency of geometry is worth less than giving each view what
it needs**, and borrowing a pattern from a survey is not the same as borrowing the reason it
works.

**State is modelled as a list on purpose.** `openGames` is an array with a per-entry ply, so
the simpler single-board variant ("option E") remains a shell change rather than a rewrite.
Components below `App.tsx` never decide their own placement — the moment one knows it lives in
a tab, that reversibility is gone.

**Mainline move navigation was added** (B-093), outside B-054's original scope, because a board
that cannot move makes a layout impossible to judge and W3 makes move-stepping the most
repetitive interaction in the product.

**Frontend verified: typecheck, build and guardrails clean, and the PGN walker checked against
fixtures** — a FEN/SetUp header, castling, an unfinished game, and an illegal move mid-game
(truncates rather than throwing). Worth noting one near-miss: a fixture appeared to expose a
bug in the walker and turned out to be an illegal position I had written myself. Verify the
fixture before believing the failure.

## Decided

Earlier sessions:

- **Scale target.** MVP designs for a personal database of ~10,000 games. A reference database
  of millions of master games is post-MVP but must not be designed out. See
  `docs/product-vision.md` §7 and B-040.
- **Repository hosting: GitHub.** Cheap to reverse; distribution channel is a separate, later
  decision (B-047 / B-032).
- **Commit identity: per-repo, pseudonymous, GitHub no-reply address.** Lives in `.git/config`
  only — deliberately not written into any tracked file.

Session 1 (all recorded as ADRs):

- **ADR-0001 — UI framework: Tauri 2** with a TypeScript frontend. Chosen because it is the only
  candidate with a best-in-class off-the-shelf answer to both hard problems: `chessground` for
  the board, `shakmaty` + `pgn-reader` for bulk parsing and position hashing. Owner has prior
  production Tauri experience, which lowers the two-language risk.
- **ADR-0002 — Licence: GPL-3.0-or-later.** Forced by the chess stack and aligned with the
  stated intent to open-source. Decided now because it was free today and becomes effectively
  irreversible once contributors hold copyright.
- **ADR-0003 — Chess libraries: buy jobs 1–2, build job 3.** Rust `pgn-reader` + `shakmaty` own
  import; TypeScript `chessops` owns the open game; `chessground` renders the board; no
  third-party Rust game tree (`sacrifice` / `rpgn` declined).

- **Release sequencing: all three platforms remain the target; release order is gated by testing
  capacity** (B-068). This is *not* a scope reduction — cross-platform stays a first-class goal.
  The constraint is verification, not architecture: only macOS can currently be tested, so macOS
  releases first, and Windows and Linux release as testers become available (B-070). All three
  keep building in CI from day one (B-046, promoted to P1).

  The vision's old success criterion 6 conflated two things — *builds everywhere* and *verified
  everywhere*. **Amended this session** into two separate, measurable criteria: all three
  targets compile green in CI from the first commit; each platform ships once someone has
  actually run it.

**Working assumption for B-004, agreed but not yet gated:** one `games` table with hot header
fields extracted into indexed columns *and* the original PGN text stored verbatim in the same
row. Makes "zero data loss, round-trips cleanly" true by construction rather than by effort.
Schema details raised: B-058 (player table + name normalisation), B-059 (partial dates),
B-060 (full tag set as JSON, `Result` as integer), B-061/B-062 (compression, FTS5 — post-MVP).

Session 2:

- **B-050 — the MVP is read-only.** Import, browse, search, play through; nothing in the app
  modifies a game. Rationale: the MVP exists to validate the import path and the look and feel,
  and neither needs a write path. Storing games in a local SQL database is already a meaningful
  improvement over the file-based habits of existing GUIs, independent of editing.
  **Condition attached, and it matters at the B-004 gate:** read-only is a *build-order* choice,
  not a schema shape. Stable row IDs, verbatim PGN as the source of truth, header columns
  strictly derived — so annotation (B-015) is an addition, not a migration. The vision's open
  question 1 is answered but its warning is only deferred: a library you cannot write into may
  not displace anything, so B-015 is the first post-MVP milestone.
- **Multi-language support is a requirement, and was missing from every document.** English is
  the first locale, not the only one; no second language ships in the MVP. Recorded as B-072
  (externalise all strings, backend returns error codes, pseudo-locale check in CI), B-073
  (localised SAN — `Nf3` / `Sf3` / `Cf3` — forces storage notation and display notation apart,
  with figurine as the language-free escape hatch), B-074 (locale collation and dates, ties to
  B-058/B-059), B-075 (which locales, later). Vision amended: new value-proposition bullet, new
  success criterion, MVP sketch updated.

- **ADR-0004 — Storage: SQLite**, and B-004 downgraded from hard stop to notify-and-proceed.
  The downgrade is the substantive part. The gate's premise was "migrating a user's database is
  a data-safety problem" — but **PGN files are retained as source of truth and the MVP is
  read-only, so nothing exists only in the database.** Abandoning the store costs a re-import.
  True by construction, not by discipline.
  **The gate has an expiry date: B-015.** When annotations become writable, the DB holds data
  that lives nowhere else and the original reasoning applies again. B-079 pairs export (B-017)
  with annotation to defuse it a second time.
  SQLite itself was the boring choice: relational indexes are exactly right for header search
  over 10k rows, and a second SQLite file for the reference database stays open.

B-050 was recorded as a decision rather than an ADR — it is a scope choice, reversible by
building B-015.

Session 3:

- **ADR-0006 — Frontend framework: React 19**, with Vite 8. ADR-0001 said "TypeScript frontend"
  and never named a framework; the gap survived two sessions because no code existed to expose
  it. Raised as a hard stop before the first component was written.
  **The deciding argument was consistency with ADR-0003, not any property of React**: that ADR
  committed us to buying the hard problems, and the virtualised 10k-row game list (B-008,
  B-033) is the same kind of hard problem that `chessground` was, with TanStack as the same
  kind of off-the-shelf answer. Secondary: the contributor pool matters once the repo is public
  (B-031, B-070).
  **Explicitly not decided on performance grounds.** The "lighter runtime protects the frame
  budget" argument was set aside as unmeasured — B-048 showed 17.0 ms median and p95 with
  headroom. Per risk 9, an unbenchmarked performance claim was not allowed to carry a decision.
- **ADR-0005 — the game data model.** B-058, B-059, B-060 all closed. Players get their own
  table with a derived, lossy `normalisedName`; dates are stored raw *and* parsed with nullable
  year/month; the full tag set is retained as JSON and `result` is an integer. One rule
  underneath all three: **store the raw thing, derive the useful thing, index the derived
  thing** — which is what makes B-078's derivability true by construction.
  **The model was decided now even though M1 has no database**, because the mock list has a
  shape and an unchosen shape becomes the schema by default once B-007 imports real PGN.
- **TypeScript pinned to 5.9, not the current 7.x** (notify-and-proceed). TS 7 is the Go rewrite
  and is `latest` on npm, but it is a rewritten compiler at `.0.2` whose selling point is
  compile speed — irrelevant at four source files. Recorded in `docs/tech-stack.md`.
- **Source layout established and recorded** in `docs/tech-stack.md`, per AGENTS.md. Feature
  grouping under `src/features/`, with four load-bearing boundaries: `src/shell/` (the only
  Tauri-aware code), `src/i18n/` (every user-facing word), `useChessground.ts` (the only
  React↔chessground seam), and `App.tsx` (the only component that knows the layout exists).
  Rearranging this is now a hard stop.
- **ADR-0007 — application layout: C+.** A pinned library tab plus game tabs; one geometry
  everywhere (fluid left region, fixed 320px panel); the panel built as header / scrolling body
  / fixed footer. Decided from a survey, a workflows document and mocked options rather than
  from taste. Two principles worth carrying: **fixed measure for text, fluid for graphics** —
  which is why the panel never resizes and the board is sized by `ResizeObserver` — and **the
  window is the viewport**, which depends on `min-height: 0` on every ancestor of a scrolling
  region.

Session 4:

- **ADR-0008 — PGN import fidelity (B-049), status `proposed`.** The last thing standing in front
  of B-007. **The framing in the question was the trap, and spotting it was most of the work.**
  "Accept / repair / reject" sounds like three dispositions for a file, but ADR-0005 already
  stores the verbatim PGN in the row, so **repair cannot corrupt and rejection cannot lose** — all
  that is really being decided is how much *derived* understanding a partly-comprehensible game
  gets, and how the shortfall reaches the user. Once restated that way the answer is close to
  forced: be permissive, because permissiveness costs nothing in safety, *provided the shortfall
  is recorded rather than swallowed*.
  **Decision: tiered per game, and the file is never the unit of failure** — `clean` /
  `imported`-with-warnings / `quarantined`-but-retained. A 3,000-game export with four damaged
  games is not a damaged export. The disposition is itself **derived**, so a better parser next
  year upgrades old rows on a rebuild for free; that property is free now and expensive later,
  which is the same trade B-072 and B-069 were.
  Four sub-decisions were hiding inside the question and are the substance of the ADR: legality
  is validated but never blocks a row (and deliberately agrees with `mainline.ts`, which already
  truncates); **notation language is a property of the file, decided once, never guessed per
  token**; UTF-8 with a Latin-1 fallback and a record of which was used; and duplicate identity
  as a content hash over the normalised game rather than over the bytes.
  **The one to re-read before it hardens is the duplicate key** — it asserts that identical
  players, event, date, round, result and moves mean the same game. Almost always true, not a
  theorem, and the only rule here that can make a game the user expected go missing. Accepted
  because a false merge is visible and recoverable, while duplicates accumulating on every
  re-import are neither.
  **A finding worth keeping even if the ADR changes:** the obvious way to handle localised SAN is
  to try other languages when a token fails and accept whatever yields a legal move — and it is
  silently unsafe, because **`R` is rook in English and *roi* (king) in French**. Where both a
  rook and a king move to `d1` are legal, `Rd1` parses under either reading and means a different
  game, so **legality cannot arbitrate**. That is B-098, and it is the same species of error as
  the master–detail claim in session 3: an implementation that sounds obviously right and was
  never checked against a real case.
  **Amended within the same session, because the owner challenged the premise and was right.**
  The draft claimed imports-with-warnings would be common; the owner's objection was that
  chess.com and lichess exports are machine-generated and should be clean, so most imports will be
  `clean`. **That claim of mine had no evidence and is withdrawn** — the fourth unmeasured
  assertion this project has had to retract, and the most embarrassing of them, because it was
  about *the user's own data*, the cheapest thing available to check. Raised **B-101** to actually
  measure it. **B-098 dropped P1 → P3** since localised SAN barely exists for this user, though the
  correctness finding is kept at full strength for whenever someone does touch it.
  **The policy survived the challenge for a reason worth keeping, and it is not frequency:** the
  clean bulk is re-downloadable from the site it came from, and the tail — club games, arbiter
  exports, hand-typed games in "loose PGN files", which the vision names as part of this user's
  corpus — is not. Losing four irreplaceable games while importing 3,000 replaceable ones is
  failing at the only part that mattered. Two rules also fire constantly on clean input and are
  not malformed-PGN rules at all: dedupe runs on every re-import, which *is* the normal chess.com
  workflow, and the variant rule is triggered by a tag those sites emit on purpose.
  **Following the owner's premise then found a real gap, which is the best argument for the
  challenge:** it is the *clean* sources that emit variants. Lichess tags them explicitly, and
  walking an Antichess game under standard rules reports *illegal move at ply 2* — true, useless,
  and a misdiagnosis that would send someone hunting a parser bug. New rule 3b suspends move
  derivation on a non-standard `Variant` tag instead; **B-100**.

Session 5:

- **ADR-0009 — import is strict, and ADR-0008 is superseded (B-114).** The owner rejected the
  permissive tiered policy as disproportionate, and the evidence backs that rather than the ADR.
  **Four rules replace seven:** a game imports or it errors; nothing is repaired; **the libraries are
  the validator and we add nothing**; variants are selected from the tag.
- **A third correction, and the largest: "if pgn-reader doesn't validate, why do we need to?"**
  It doesn't, and we don't. `pgn-reader` validates *syntax* and says plainly that it does not check
  move legality — legality happens only if we ask `shakmaty` to play the tokens into a position, and
  **asking is us adding validation.** Nothing in the MVP needs a board: every ADR-0005 hot field comes
  from tags, `plyCount` is a token count, `result` comes from the tag or the termination marker.
  **And legality is already being checked in the place where it is free** — `mainline.ts` walks a game
  with `chessops` when the user opens it and truncates at the first illegal move. One game on demand,
  not three thousand at import. A game with a broken move now lands in the library and visibly stops
  when opened, which is a better failure than being refused at the door.
  **Three things fell out.** `shakmaty` is **not a direct dependency** — the `variant` feature I added
  an hour earlier is not needed until the position index. **B-064 largely evaporates for the MVP**
  (deferred to P3): "two rule implementations must agree" is a risk only because both walk moves, and
  now only one does. And **`expected.json` lost its import expectations entirely** — `outcome` and
  `errorCode` were written from theory, were wrong twice as the policy moved, and an import error is
  now exactly a game `pgn-reader` refuses, **which nobody has measured**. The manifest carries only
  measured values; milestone 1 fills the rest in, and the answer may be "none of them".
- **Two earlier corrections from the owner, both of which also cut deeper than my first pass.**
  *(a)* **"We cannot change the behaviour of dependencies — use their error handling and validation."**
  My first draft of ADR-0009 listed conditions the libraries *accept* — duplicate tags, a `Result`
  disagreeing with the termination marker, missing roster tags — which meant we would have had to check
  them ourselves. That is a validator by another name. Removed, along with the one exception I had
  argued for (a zero-moves guard to keep a PNG file out of the library), which was the same mistake
  wearing a smaller hat. **Consequence, stated plainly: only 4 of 18 fixtures are now errors**, and
  a non-PGN file imports as one empty junk row. Everything the libraries tolerate is now an entry in
  ADR-0009's **"Accepted risks"** table — seven of them, each measured, each with why it is accepted.
  *(b)* **Derivability was a production concern carried by a development-stage app.** It had acquired
  an owner, a re-hardening gate, conditions in two ADRs and a presence in three documents, for a fact
  that is one sentence: **we do not delete the PGN files, so the database is disposable.** B-078
  deferred to P3, and the ADRs' reasoning simplified accordingly. It becomes real at B-015.
  **Two facts decided it, and the frequency argument is neither of them.** The only real data anyone
  has looked at is spotless — B-101's chess.com survey found zero anomalies, and the malformed tail
  rules 4 and 5 existed for has *still* never been measured. And **ADR-0008's own safety argument was
  weaker than it looked**: it justified permissiveness with "repair cannot corrupt and rejection
  cannot lose" because verbatim PGN sits in the row, but the stronger fact is outside the database
  entirely — **the PGN file is still on the user's disk**, so refusing a game loses nothing the
  filesystem had not already kept. Permissiveness was free in safety and expensive in complexity, and
  only the first half had ever been weighed.
  **The clinching case is a fixture.** Under ADR-0008, a German file imported with a heuristic warning
  attached to a game that was never played, because the tokenizer rewrites `Sf3` to `f3`. Under
  ADR-0009 it is an error — which is the accurate answer, since PGN mandates English SAN and the file
  genuinely does not conform.
- **What the simplification bought, concretely.** **B-098 rejected outright** rather than deferred.
  `src/model/game.ts` never gains the disposition and warning columns ADR-0008 required — and they
  were specified but never added, so there was nothing to unwind and B-011's migration stays smaller.
  B-097 shrinks from "surface rare warnings without training the user to dismiss them" to "list the
  errors". B-100 keeps only variant selection. And **B-064's shared assertion becomes boolean**: the
  two rule implementations now only have to agree on whether a game is valid, not on the ply at which
  a mainline truncates.
- **The B-099 corpus was repurposed, not wasted, and that is the argument for having built it early.**
  All eighteen fixtures kept — **4 expected errors and 14 expected imports** once the "libraries are the validator" correction landed, with
  `disposition`/`warnings` replaced by `outcome`/`errorCode`. **The corpus changed the governing
  decision twice in one session** (rule 3b, then the whole policy) and survived both, because a file
  that must be *rejected* is exactly as useful a fixture as a file to be repaired. The rule-coverage
  test earned its keep immediately by failing the moment seven rules became four.
- **B-007 milestone 1 done — the measurement, and it is the most valuable thing in the session.**
  `src-tauri/tests/pgn_reader_probe.rs` ran `pgn-reader` over all eighteen fixtures. Results now in
  `expected.json` as `importOutcome`/`importTags`/`importTokens`, alongside the chessops numbers.
  **`pgn-reader` refuses exactly one of eighteen** — `unterminated-comment` — so the import-error set
  is nearly empty, as ADR-0009 suspected but could not claim.
  **The headline finding: the two libraries produce two *different* wrong games from the same
  non-English file, and neither says anything.** For `e4 e5 Sf3 Sc6 Lb5 a6`, `pgn-reader` **drops** the
  tokens it cannot parse (`e4 e5 a6`, so black's `a6` becomes white's third move) while `chessops`
  **rewrites** them (`Sf3` → the legal pawn move `f3`, giving `e4 e5 f3 c6`). Owner's decision: assume
  English SAN, record it as a known issue, fix the error handling in a later release — **B-115**.
  **Three "accepted risks" I had written down turned out to be chessops limitations rather than general
  ones.** `pgn-reader` reports two tags where two exist, all nine when three are duplicated, and zero
  for binary garbage; chessops fabricates seven defaults and collapses duplicates. So "telling them
  apart needs byte inspection we are not doing" was false of the side that actually stores data. One
  risk-table row is **retired**, and duplicate tags turn out not to be a validation question at all —
  the parser hands back both, so the importer must *choose*, which is a decision to document.
  **One consequence the MVP will visibly ship:** `illegal-move-midgame` yields 9 tokens at import and
  truncates at 6 on display, so the library table will say nine plies while the board stops at six.
  Accepted — making them agree means a legality walk over every import.
- **The probe needed two runs, and the reason is worth keeping.** The first printed a token *count*
  when the lists differed, which fired on exactly the two fixtures the measurement existed to
  explain — so it answered nothing. **An instrument that summarises where you needed the raw data is
  worse than no instrument, because it looks like an answer.** Second version prints both token lists
  and lets a human judge. It also had two false-positive sources: a raw scan that counted clock-comment
  fragments as moves, and a `Display` round-trip that reports `P@e4` → `@e4`, which is formatting
  rather than parsing.
- **B-007's spec rewritten against ADR-0009 and cut from six milestones to four.** Milestone 1 is
  unchanged and still the important one: measure whether `pgn-reader` alters tokens the way chessops
  does, because if it does, strictness needs an explicit check rather than a trusting one — the parser
  will hand back a game it has silently changed.
- **ADR-0008 amended earlier in the same session, and both halves were changed by something outside
  the document** — one
  measurement and one owner challenge. Status is still `accepted`; the addendum is at the end of the
  ADR and the header points at it. **Rule 3b superseded: select the variant named in the tag and walk
  it, on both sides.** Verified rather than assumed — `shakmaty` exposes `VariantPosition` with the
  same eight rule sets `chessops` has, **behind an opt-in `variant` cargo feature** that
  `src-tauri/Cargo.toml` will need and that would otherwise have appeared as a compile error inside
  B-007. A supported variant with legal moves is now `clean`; `variant_unsupported` narrows to
  unrecognised names, and a new `variant_assumed_standard` covers `Fischerandom` flattening to
  standard chess. **The old rule's premise was true of Rust and false of TypeScript** — shakmaty
  makes the caller choose a variant, chessops reads the tag — so the two libraries this project
  deliberately pairs have opposite defaults for the same tag. That is the B-064 category, and
  suspending derivation would have written the asymmetry into the specification.
- **Rule 6 removed from the MVP: nothing hashes a game any more.** The owner's challenge was that
  the MVP does not need a content key, and the ADR's own reasoning does not survive it. The hash
  served idempotent re-import, which served ADR-0004's derivability condition — but **derivability
  needs only that dropping the database and rebuilding from retained PGN reproduces it**, which holds
  with or without dedupe. Dedupe is the different property of importing one file twice into an
  existing database. Conflating the two is what made the hash look load-bearing, and the conflation
  was mine. B-007 now assigns stable row IDs and no key; duplicate rows are possible, **visible and
  removable**, which is the failure mode the ADR already said it preferred over a silent false merge.
  Dedupe moves to B-022; B-078's wording narrows accordingly.
  **The transferable part is the shape of the question.** A hole had been found in the key — the Seven
  Tag Roster omits `Variant`, so an Antichess and a standard game with identical headers and moves
  hash identically — and the instinct was to patch the key. Deleting it was better, and the question
  that got there was **"why are we hashing at all?" rather than "is the hash correct?"** The second
  question cannot reach the first, and I asked the second.

## Process change made this session

**UI layout is mocked and approved before it is coded.** Added to `AGENTS.md` (mandatory
behaviors) and `ai/methodology.md` (its own section, with the reasoning).

The trigger: two layouts were coded and both were rejected, in one session. The diagnosis is
that layout is subjective and cannot be reasoned to, so the build → dislike → rebuild loop does
not converge — "I don't like it" is not a bug report and should not have to be. Mocking moves
iteration from minutes per round to seconds per round.

Three parts to the rule: survey the established products first where the category exists; show
**two or more genuinely different** options rather than one proposal to react to; structure-only
fidelity so the conversation stays on layout rather than colour.

Two related corollaries, both also recorded:

- **A green build does not verify a layout.** Anything with a visual acceptance criterion is
  unverified until a human looks, and the AI must say plainly what it could not check.
- **Beware "this is what applications like this do."** That exact claim was made about
  master–detail this session and the survey did not support it — no dedicated chess database
  uses it. An unchecked category claim is a preference wearing a costume.

**These lessons are general, not chess-specific — backport them to the starter kit (B-088).**
The kit is at 0.2.0.

## Standing constraints

- **Keep the frontend Electron-portable.** All shell/IPC calls go through a single frontend
  adapter module. This is what keeps ADR-0001 reversible if WebKitGTK proves unworkable on
  Linux; it stops being true the moment Tauri APIs are sprinkled through components.
- **Everything links GPL-3.0-or-later.** No closed-source path exists any more. Check the
  licence of any new dependency before adding it.
- **No user-facing string literals in components** (B-072). Everything goes through a message
  catalogue; the Rust backend returns error codes, never English prose. English is the only
  locale that ships in the MVP — the constraint is that adding the second one is a translation
  job rather than a refactor. Layout must tolerate ~35% text expansion.
- **Read-only MVP must not become a read-only schema** (B-050). Header columns are derived;
  the verbatim PGN is the source of truth; rows carry stable IDs from the first migration.
- **All PGN input is assumed to be English SAN** (ADR-0009, owner's decision session 5). PGN mandates
  it and chess.com and lichess emit it. **The cost is a known issue, B-115, and it is the one place the
  policy lets a *silently wrong* game into the library:** a German file imports as a game nobody
  played. Measured — `pgn-reader` drops the tokens it cannot parse (`e4 e5 Sf3 Sc6 Lb5 a6` →
  `e4 e5 a6`), `chessops` rewrites them (`e4 e5 f3 c6`), the two disagree, and neither reports
  anything. Flagged for better error handling in a later release, and **the mechanism should be a
  token-count comparison rather than language detection** — we do not need to know which language a
  file is in, only that the parser silently discarded part of it, which is why B-115 is cheap where
  B-098 was not.
- **We do not delete PGN files, so the database is disposable** — drop it and import again.
  **That is the whole of it, and it replaces a much larger apparatus** (session 5). "Derivability"
  had acquired an owner (B-078, P1), a gate that "re-hardens", conditions quoted in two ADRs, and a
  place in three documents, for a fact that fits in one sentence. The owner's objection was that this
  is a production concern being carried by a development-stage app with no user data, which is
  correct. B-078 is deferred to P3; **do not quote derivability as a constraint on new work.** It
  becomes real at B-015, when annotations are the first data that exists nowhere else — and the answer
  then is an export path (B-017/B-079), not a doctrine.
- **`src/shell/` is the only place `@tauri-apps/api` may be imported** (ADR-0001). This is the
  concrete form of the Electron-portability constraint above, and it is now enforced by
  `npm run check:i18n` in CI rather than by remembering.
- **chessground owns its own DOM subtree.** `src/features/board/useChessground.ts` is the only
  React↔chessground seam, and its container div must never be given React children. If that
  slips, React and chessground fight over the same nodes and the symptom — pieces vanishing on
  unrelated state changes — looks nothing like the cause.
- **The source layout is now established** (`docs/tech-stack.md`). Per AGENTS.md, restructuring
  it is a hard stop.
- **Store the raw thing, derive the useful thing** (ADR-0005). Derived values are never
  authoritative, so a wrong derivation rule is a re-import rather than data loss.

## Recently completed

Session 5:

- **B-106 — the project got a test harness, and the reason it needed raising is the finding.**
  The session started by reviewing state and recommending B-099, and B-099 turned out not to be
  startable: **four sessions in, there was no test runner of any kind** — no vitest, no
  `*.test.ts`, no `#[cfg(test)]`, no `cargo test` in CI, no fixtures directory. Nothing in the
  handover said so, and worse, it read the other way: both `mainline.ts` and `survey-pgn.mjs` were
  described as "verified against fixtures", which was true and meant *by a throwaway script, run
  once, then discarded*. **In prose that is indistinguishable from having tests**, and B-099's
  whole premise — one corpus, walked by both `shakmaty` and `chessops` — silently assumed a
  harness on both sides.
  Delivered: vitest 4 (`npm test`), the `test` block in `vite.config.ts`, **eleven committed tests
  for `mainline.ts`** promoting session 3's discarded checks into permanent ones, `fixtures/` with
  its contract and two fixtures, `src-tauri/tests/fixtures_contract.rs`, and CI running both suites
  — `cargo test` on all three platforms rather than Linux-only, because the Rust test asserts a
  relative path resolves and that is a B-069 divergence category. Recorded in `docs/tech-stack.md`.
- **Writing the tests found two bugs, both in my own fixtures and neither in the walker.** A
  castling test moved the rook before castling, and an endgame FEN claimed castling rights the
  position could not have; `chessops` correctly refused both, and the first read of the red suite
  looked like a walker defect. This is session 3's near-miss reproduced exactly — **verify the
  fixture before believing the failure** — and it is the concrete argument for committing tests
  rather than running them once: the throwaway version of this would have logged a bug that does
  not exist. The fix was to check both positions against `chessops` directly before asserting
  anything, which took one script and about a minute.
- **Two negative controls run, and the habit is now five for five.** An intentionally illegal move
  in the `clean` fixture failed its case; a deliberately broken corpus path failed loudly at load.
  The second is the one worth keeping: without the `expected.length > 0` guard, a moved `fixtures/`
  directory would produce zero iterations and a green suite, which is the "green means nothing"
  failure that a test harness is supposed to remove rather than introduce.
- **`docs/tech-stack.md` and the source-layout tree updated** — `fixtures/`, `src-tauri/tests/`,
  the co-located test file, and a "Test harness" section carrying the reasoning.
- **B-099 done — eighteen fixtures covering ADR-0008 rules 1, 2, 3, 3b, 4, 5 and 6**, with a test
  asserting that exact rule set so the corpus cannot go stale unnoticed. Rule 7 is the import
  report, which is UI (B-097) and has nothing to assert against a file. **`expected.json` keeps two
  kinds of field apart on purpose:** `plies` and `truncatedAtPly` are *observed* and asserted today,
  `disposition` and `warnings` are *specification* that only B-007 can check. Calling the second
  pair verified would be B-106's mistake in a new place.
- **Every expectation was measured before it was written, and that is the whole argument for doing
  B-099 before B-007.** Three of the eighteen behave differently from what ADR-0008 would lead you
  to write, and an importer built first would have been written to the ADR's assumptions — so these
  would have looked like correct behaviour and the fixtures would have agreed with the bug.
- **Finding 1, and the most consequential: localised SAN is not rejected, it is silently
  reinterpreted.** `Sf3` does not fail. The PGN *tokenizer* drops the unrecognised piece letter and
  hands back `f3`, a legal pawn move, so a German game becomes a different legal game that nobody
  played — no warning, no truncation — until some later move happens to be impossible. Rule 4
  argued that legality cannot arbitrate between notation languages because of the `R`/*roi*
  collision; measured, it is worse, because the corruption happens *before* legality is consulted
  and `node.san` no longer holds the file's own text. **B-098 raised P3 → P2.**
- **Finding 2: `chessops` honours the `Variant` tag, so rule 3b's stated premise is false.**
  `startingPosition()` reads the header and returns the right variant position — verified across
  Antichess, Crazyhouse, Atomic, Three-check, King of the Hill, Horde and Racing Kings; a
  Crazyhouse drop plays as a drop, pocket visible in the FEN. Rule 3b would have the importer
  derive nothing for a game the frontend can play through in full, which is **B-064 divergence by
  specification rather than by bug** — worse than the bug version, because it is intentional and
  would be defended. Raised as **B-113**, and it is cheapest to settle now: no importer exists, so
  the change costs a paragraph.
- **Finding 3: an unsupported variant is indistinguishable from a broken position.** An unknown
  `Variant` value returns `ERR_VARIANT`, which the reader surfaces as `truncatedAtPly: 0` — the same
  observable as an unparseable FEN. And `[Variant "Fischerandom"]` silently maps to *standard
  chess*, so a Chess960 game with no FEN derives a plausible wrong mainline with no error at all.
  So rule 3b's instinct was right and its example was wrong.
- **Four smaller measurements, each recorded on its fixture:** an unterminated comment swallows four
  plies and the result token while reporting no truncation; an unterminated tag quote turns one
  damaged game into **two**, so "imported 4 of 3" is a reachable import report; chessops fills
  missing roster tags with `?`/`*`, so a missing tag is indistinguishable from a literal `"?"` and
  the importer must judge disposition from the bytes rather than the parser's header map; duplicate
  tags resolve **first-one-wins**, and nothing says `pgn-reader` agrees — a B-064 candidate with no
  illegal move anywhere in it; and the movetext's final result token **overwrites** a contradicting
  `Result` tag, which means a repair happens whether we ask for one or not.
- **Three more bad fixtures of mine, and the third one is the lesson.** A castling test that moved
  the rook first; an endgame FEN claiming castling rights it could not have; and an Antichess game
  whose moves were not legal Antichess either. The last is the dangerous kind: it truncated at ply 2
  and therefore appeared to *confirm* the rule-3b misdiagnosis the ADR predicted. **A fixture that
  fails for the wrong reason is worse than one that fails for no reason**, because it corroborates
  whatever you already believed. Cure was ten seconds per position against chessops before
  asserting anything.

Session 4:

- **The M1 verification pass run, all eight secondary paths ticked from observation, and the
  milestone closed honestly rather than by assertion.** Three findings (M1-F1 – M1-F3) written
  up in `docs/milestones/m1-skeleton.md` — **all three from paths that passed.**
- **B-096 raised and rejected in the same session, on evidence.** The live-resize stretch was
  chased with a control (the library tab, which has no JavaScript-sized element) and turned out
  to be the webview's, exonerating `useChessground.ts`. The note is kept because the method is
  the reusable part.
- **B-086 widened** to own the whole keyboard shortcut scheme, with the `Home`/`End`
  discoverability finding as its starting evidence. Bindings deliberately not spot-fixed.
- **M1-F2 resolved as a decision rather than a fix** — Cmd+W on the library tab keeps closing
  the window; the deliberate fall-through is now commented in `App.tsx`, with an expiry note
  pointing at B-015.
- **Risk 9 updated**: measurement has now overturned reasoning five times, and the rule was
  written down rather than left as a pile of anecdotes.
- **Three decisions taken at the end of the session and pushed into the model, not just the prose:**
  ADR-0008 **accepted**; `ecoUrl` promoted beside `eco` (B-102 decision 3); `whiteAccuracy` /
  `blackAccuracy` added (B-104). All three are in `src/model/game.ts` and the mock data, so the
  schema at B-011 inherits them by construction rather than by someone remembering.
- **`.gitignore` gained `.fuse_hidden*`.** The AI sandbox reaches this folder over a mount that
  cannot unlink an open file, so in-place edits orphan the original inode. Harmless, but this repo is
  public and a blind `git add` would commit it. This is the third distinct symptom of the same
  sandbox limitation, after the `index.lock` problem and `vite build` failing to empty `dist/`.
- **B-049 closed as ADR-0008 — the PGN import fidelity policy**, the last thing standing in
  front of B-007. **Raised B-097 – B-102.** Written up under "Decided" below, because the
  reasoning matters more than the outcome.
- **B-102 — the chess.com import shape, decided from measurement rather than documentation.**
  A real account (25 games, 20 archive months, 7 of them empty) was downloaded and inspected, and
  it corrected two things I had asserted. **Import uses the monthly JSON**, and the `pgn` field
  holds a complete per-game PGN, so the `/pgn` endpoint is redundant — verified by comparing all 13
  non-empty months, which carry the identical set of games. *Incidental but load-bearing: game order
  differs between the two representations in 5 of 13 months, so position-in-file can never be part
  of an identity.*
  **My "the JSON is a superset of the PGN" claim was wrong** — neither contains the other. JSON-only:
  `uuid`, `rules`, `accuracies`, `tcn`, `rated`, `time_class`, `initial_setup`. PGN-tag-only:
  `Event`, `Site`, `Round`, `Termination`, `Timezone`, `UTCDate`/`UTCTime`, `EndDate`, **and the ECO
  code** — the JSON `eco` field turns out to be an opening *URL*, so `C50` exists only as a PGN tag.
  That knocks out four ADR-0005 hot fields if you parse JSON alone.
  **Two decisions.** Hot fields derive from the **PGN tags**, by unwrapping the JSON and feeding each
  game's `pgn` through B-007's pipeline, with only `uuid`, `rules` and `accuracies` taken from JSON —
  one derivation path rather than two with a precedence rule. And **dedupe identity is per source:
  `uuid` for API games, the content hash for files.**
  **That second one is the best thing to come out of the whole B-049 thread.** ADR-0008 rule 6's
  content hash exists *only* because file PGN has no identity, and it was the rule flagged as
  highest-regret because it can silently merge two distinct games. chess.com supplies a stable
  `uuid`, so **for API-sourced games that risk is not mitigated, it is absent.** Rule 3b also stops
  being blind, since `rules` is read directly instead of inferred from a tag chess.com may not emit.
  Accepted cost: a game arriving by both API and file export can import twice, since the two keys
  cannot see each other — a visible, removable duplicate in exchange for a silent false merge.
  Raised **B-103** (the result vocabulary is per-player and richer than `1-0`, but the sample has no
  draws, so the draw strings are unobserved — do not guess them) and **B-104** (whether to store
  `accuracies` at all, given it is another engine's derived output that we cannot reproduce).
  **Decision 3 — both opening values are stored, as two columns** (`eco` and `ecoUrl`), on the
  owner's call. Inspecting the 23 distinct URLs supplied a better reason than "we might want it":
  **`ECOUrl` is not a prettier `ECO`, it is a finer classification** — `C41` and `C47` each mapped to
  two different URLs identifying two different lines, so the URL separates games the code cannot.
  Added to `src/model/game.ts` and the mock data, with an addendum to ADR-0005. Raised **B-105**,
  and the reason it exists is a trap worth remembering: **the obvious way to show an opening name is
  to prettify the URL slug, and it ships visibly wrong text.** `Kings-Indian-Attack` and
  `Birds-Defense` decode to "Kings Indian Attack" and "Birds Defense" — the apostrophes are gone —
  and the colon in "Ruy Lopez Opening: Berlin Defense" has no representation in a slug at all. Names
  come from an ECO table, which is also the only version that can be localised.
  **A postscript that is really the session's whole lesson in miniature.** Asked whether JSON `eco`
  maps safely to `ECOUrl`, the measured answer was yes — 21/21 byte-identical, zero mismatches — but
  `eco` is *absent* on 4 of 25 games whose PGN still has `ECOUrl`. All four were unrated daily games,
  which I was one sentence away from recording as the rule. **Testing it showed 13 other unrated
  daily games do have `eco`, so the pattern was noise.** Fifth plausible story corrected by
  measurement in a single session, and the only one where the check took longer to run than the
  wrong explanation would have taken to write.
- **`scripts/survey-pgn.mjs` written and tested — the instrument for B-101.** Dependency-free
  Node; `npm run survey:pgn -- <path>`. No flags — paths print relative to the scanned input.
  Verified against synthetic fixtures covering every metric and both collision paths, **with a
  negative control** (a clean lichess-shaped file reports no anomalies) and a robustness pass
  (random binary, empty file, truncated tags, unbalanced parens — no crash, no hang). The
  negative-control habit is now three for three: `check:i18n`, B-048's plain-browser baseline,
  and this.
  **It has no redaction mode, and the three corrections it took to get there are the lesson.**
  Successive drafts hid player names, then hid them behind a flag, then justified the flag by the
  repo's pseudonymous identity. Every version aimed at the wrong target, and the first one also broke
  the tool's most useful output — rule 6 is a judgement, and a *count* of collisions cannot test a
  judgement, so the report now prints each colliding pair game by game.
  **The privacy constraint, stated correctly at last: it covers the developer's footprint** — commit
  identity, home paths, secret-shaped strings — which is exactly what the session-3 scan looked for.
  **Game data is not in scope.** Online games are public, the account handle is the repo's own name,
  and opponents' names need nothing. **The only genuine leak was the absolute path, because a home
  directory contains a real name — now fixed structurally by printing paths relative to the scanned
  input, so there is no mode to remember.**
  **Two things generalise.** An over-general safety framing displaced a specific engineering
  requirement three times running, and each time the correction made the tool simpler *and* better.
  And following the objection through beat conceding it — B-100 came from the first, the collision
  report from the second, and a deleted flag from the third.
  **One result from the fixtures is worth keeping, because it validates rule 6's design rather
  than merely exercising it:** a game re-exported with different line wrapping, stripped clock
  comments and four fewer tags produced an *identical* content key to the original. That is
  precisely the case a hash over raw bytes would have missed and duplicated, and it is now
  demonstrated rather than argued.

Session 3:

- **First product code in the repository.** Tauri 2 shell (`src-tauri/`, standard lib/bin
  split), React 19 + Vite 8 frontend, `chessground` board rendering a static FEN validated by
  `chessops`, a four-row mock game list, and navigation between them.
- **`docs/milestones/m1-skeleton.md` written**, including an explicit out-of-scope list. Its
  central point: M1 is not about the two screens, it is about three structural things that are
  free now and expensive later.
- **All three structural guardrails landed with the first screen, not after it:**
  - **B-072** — `i18next` with *typed keys*, so a misspelt key is a compile error rather than a
    raw key shipped to a user. `Intl`-based date formatting and collation in
    `src/i18n/format.ts`. Rust returns `AppError { code, detail }`; no English crosses IPC.
  - **The IPC adapter** — `src/shell/ipc.ts` is the only module allowed to import
    `@tauri-apps/api`, which is what keeps ADR-0001 reversible. It also degrades outside Tauri
    so the app runs in a plain browser, which is the B-077 control habit built in.
  - **B-069** — `src/shell/platform.ts` holds accel-key, path separator, and line-ending
    differences behind one boundary.
- **`npm run check:i18n` — the guardrails are enforced in CI, not by memory.** Fails the build
  on a user-facing literal in a component or a `@tauri-apps/api` import outside `src/shell/`.
  **Two things about this script are worth carrying forward.** It parses with the TypeScript
  compiler API because the first regex version immediately produced three false positives by
  reading `=>` and `<` as JSX delimiters — and a guardrail that cries wolf gets switched off,
  which is worse than not having one. And it was verified with a **negative control**: a
  deliberately planted literal, confirmed to fail, then removed. B-077's lesson applied to
  something other than a benchmark.
- **B-046 — three-OS CI workflow added.** Frontend job (guardrails → typecheck → build) gating
  a `cargo build` matrix over macOS, Ubuntu 22.04, and Windows, with `fail-fast: false` so a
  break is identifiable as platform-specific or universal. **Never run** — status is
  in-progress, not done.
- **B-065 done** — SPDX `GPL-3.0-or-later` in both manifests from the commit that created them,
  so no window existed where the repo held code without a declared licence.
- **B-058, B-059, B-060 closed** via ADR-0005. **B-080 – B-083 added.**
- **The Tauri icon trap was pre-empted** — `src-tauri/icons/icon.png` is generated and in place,
  so the proc-macro failure that bit the B-048 spike cannot recur.
- **`docs/tech-stack.md` updated** — stale `Storage: Undecided` row corrected to SQLite,
  framework and build-tool rows added, source layout recorded.
- **`docs/ui-survey.md` written** — how ChessBase, Scid vs. PC, Lichess, chess.com and En
  Croissant lay out a database, board and moves, and what the community criticises. The
  decisive finding: **the whole category makes layout configurable**, because it is genuinely
  subjective. Two rejected layouts is the expected cost of seeking one right answer.
- **`docs/core-workflows.md` written (B-053 done)** — six journeys. It paid for itself within
  the hour: testing the chosen layout against W2 exposed a scan-and-reject loop that plain tabs
  make expensive. Two fixes were tried in the library panel and both removed; the answer was
  that W2 needs nothing added, because the columns that identify a game are already the table's.
- **ADR-0007 written and built.** Shell rebuilt: `TabBar`, `SidePanel`, `LibraryView`,
  `GameView`, `GameInfo`, `mainline.ts`. `useSplitter` and the old `GameList` deleted — the
  panel is a fixed width now, so there is nothing to drag.
- **B-093 added and built** — mainline navigation. **B-086 partly done** — arrow keys and Enter
  in the library, Accel+W to close a tab, routed through `platform.ts`.
- **B-090 – B-092 added** — narrow windows, board size ceiling, focus mode.

Session 2:

- **B-050 closed** — MVP scope set to read-only; vision §4, §7, §8 and success criteria amended.
- **B-072 – B-075 added** — multi-language requirement captured; vision §3 and §5 amended.
- **B-048 run and passed.** Tauri 2 + chessground + chessops + Stockfish spike built outside the
  repo, run on macOS, discarded afterwards. Frame time median and p95 both **17.0 ms (vsync)**,
  *identical* with the engine stopped and running; worst frame was actually lower under load
  (18 ms vs 22 ms). Pointer-down latency 1–5 ms. Emitter held **10.0 events/sec with zero
  drops**. Full write-up in `docs/tech-stack.md`.
- **`docs/tech-stack.md` created** — first Stage 2 deliverable, half of B-055. It carries the
  B-048 findings and the B-067 throttling rule. `docs/architecture.md` still outstanding.
- **B-076, B-077 added** from what the spike exposed.
- **B-004 closed — SQLite, ADR-0004** — and the gate itself downgraded from hard stop to
  notify-and-proceed. **Nothing is now blocking implementation.** B-006 remains open but only
  escalates to a gate if an engine binary is bundled (B-051), which M1 does not trigger.
- **B-078, B-079 added** — the conditions ADR-0004 depends on, given owners.

Session 1:

- Stage 1 kick-off review: read `AGENTS.md`, `ai/methodology.md`, `README.md`, vision, backlog,
  handover. Summarised state, risks, quick wins, and gates.
- **B-003, B-005, B-052 closed** — ADR-0001, ADR-0003, ADR-0002 written (commit `9260026`).
- **B-057 done** — `COPYING` added with verbatim GPL-3.0 text from the FSF, verified at 674
  lines / 35,149 bytes. In place *before* any GPL dependency exists (commit `6cc166f`).
- **B-048 specced** — `docs/feature-specs/b048-webview-engine-spike.md`, with pass/fail
  thresholds agreed in advance. Platform verification dependency recorded as B-068 – B-071
  (commit `4f67976`).
- **Vision amended** — cross-platform split into buildability vs. verification (commit
  `d86bc66`).
- `README.md` updated with a decisions-made table and a licence section.
- Backlog grown from 39 to **71 items**; B-002 corrected to `done`.

## Open decisions

- **B-049 — closed. ADR-0008 is `accepted`** (session 4), after one substantive owner challenge
  that changed it for the better. Nothing blocks B-007.
- **B-103 — the one decision deliberately left as a guess.** The owner approved guessing chess.com's
  draw vocabulary rather than waiting for evidence, which is sound because `result` is derived and a
  wrong mapping costs a re-import. **The condition is what matters: derive the winner positively and
  never infer a draw by default.** One side reading `win` means that side won; anything unrecognised
  must warn and leave `result` null. That way the guess self-corrects on the first real drawn game
  instead of silently misreporting scores.
- **B-112 — is broadcasting an audience this product serves?** Raised in session 5 when the owner
  asked for streamer features: detachable component windows (board, players, eval bar) so OBS can
  capture a *window* rather than a hand-drawn screen region. Recorded as B-107 – B-111, all at P3
  as a holding value, because **B-112 is what prices them** and it is the first request in five
  sessions that adds an *audience* rather than a capability. Not urgent and not blocking: nothing
  in that group touches import, storage or search. Two things from the write-up are worth knowing
  even if the answer is "no". **The architecture already permits popouts, and that is ADR-0007
  earning its keep** — no component below `App.tsx` knows its placement, so a popout is just a
  different container, which also means breaking that rule now costs more than it did. And
  **B-108 is a real gate rather than paperwork**: a second window is a second webview with its own
  JavaScript context, so it cannot see `App.tsx`'s state at all — though read-only projection
  windows would sidestep the whole state question, which is worth noticing before anyone builds a
  cross-window store for a use case that does not need one.
- **B-006 — Engine process management & UCI transport.** Escalates to a platform-surface
  commitment only if an engine binary is bundled. Not triggered by M1. The B-048 spike already
  demonstrated the transport half working (spawn, stdin/stdout, throttled emit, clean kill with
  no orphans), so what remains here is packaging, not mechanism.
- **B-051 — Bundle an engine or require user-supplied.** Unblocked on licensing grounds now
  (Stockfish is GPL-3.0, same family), so this reduces to binary size, signing, and per-platform
  builds.
- **B-031 — Public-repo timing.** Licence is settled; *when* the repo goes public is not.

## Risks

1. **WebKitGTK on Linux remains unverified.** As predicted, B-048 did not close it — the spike
   ran on macOS/WKWebView, so it validated the throttling architecture and the
   chessground/Stockfish plumbing but not WebKitGTK's frame pacing. Closing this is **B-066**,
   blocked on B-070 (testers). Two updates from the run: the macOS result was comfortably clean
   rather than marginal, which is weak positive evidence for the WebKit family; and the IPC
   flood that framed this risk **turned out to be much smaller than assumed** (see risk 9).
   Tauri is reportedly moving toward a Chromium-based Linux webview — treat as upside, not plan.
2. **"Modern" is still an adjective, not a spec.** B-024 sits at P2, which schedules the vision's
   central claim last. The web frontend makes it cheaper to deliver; it does not make it happen.
3. **Bus factor of one across the entire chess stack.** Niklas Fiekas maintains shakmaty,
   pgn-reader, chessops, chessground, and fishnet. Mitigated by all of it being GPL, open, and
   small — forkable if needed — but worth knowing rather than discovering.
4. **Two chess rule implementations must agree** (shakmaty and chessops) — **dormant for the MVP,
   session 5.** This was an accepted cost of the ADR-0003 split, but it is a risk only because both
   libraries walk moves, and under ADR-0009 the importer does not: `pgn-reader` checks syntax, and
   legality is `chessops`' job on the display side alone. **One walker, nothing to diverge.** It wakes
   up with the position index (B-018/B-042) and engine analysis (B-019), and wakes up smaller, since
   `fixtures/pgn/` already exists to test it against. B-064 deferred to P3. One live comparison
   remains at B-007 milestone 1, and it is about *parsing* rather than rules: chessops rewrites `Sf3`
   to `f3` and keeps the first of two duplicate tags, and if `pgn-reader` differs the same file yields
   different data on the two sides.
5. **Documentation-as-substitute-for-code: effectively closed, and it closed by being tested.**
   The app runs. More to the point, **running it immediately invalidated a design decision that
   had survived a specification, a milestone document, and a code review** (B-084). The screen
   model was wrong and nobody noticed until a window opened. Keep the general form of this:
   deliberation did not catch it and one minute of use did. The remaining edge of the risk is
   that session 3 still produced two ADRs and three documents alongside the code — the ratio is
   better, the habit is intact.

11. **Layout decisions are being made without the document that was supposed to inform them.**
    B-053 (core workflows) is the last Stage 1 deliverable, has been deprioritised twice as "not
    on the critical path", and its stated purpose is to feed the skeleton's screen list. B-084
    is what that costs. The same gap is waiting at B-008 and B-010, where the screens are bigger
    and the rework is not four components.
6. **The reference database is a second product hiding inside the first.** Licensing and download
   size (B-043) are likely harder than the code. Keep it post-MVP; let it veto storage choices
   that would make it impossible.
7. **Cross-platform is gated on testers, and testers were never planned for** (B-070). The goal
   is unchanged and the architecture supports it; what's missing is anyone to verify Windows and
   Linux. This is the risk most likely to be discovered late, because it looks like a release
   task and is actually a recruiting one with a long lead time. Mitigations: three-OS CI from
   the first commit (B-046), headless smoke tests (B-071), portability guardrails (B-069), and
   starting on testers well before the builds are ready for them.
8. **Packaging and distribution are routinely underestimated** (B-032).
9. **A risk we sized wrong, and the way we sized it wrong is the lesson.** The IPC flood was the
   headline risk in ADR-0001 and the spike spec. Measured, it barely exists: Stockfish emits
   0–1 lines/sec at depth, peaking around 44/sec with MultiPV 8 during the shallow phase. The
   feared 100×+ ratio never appeared. Two consequences. First, **the realistic pattern was never
   tested** — a real GUI restarts the search on every move, so a user clicking through a game
   replays the burst phase continuously, which is B-076 and is the normal case. Second, and more
   general: this project's risk register is built from reasoning rather than measurement, and
   the one item that got measured turned out to be misjudged. Worth remembering before treating
   any other entry on this list as sized.

    **Updated session 4 — this is now a pattern of four, not an anecdote.** The IPC flood was
    over-sized (risk 9), a benchmark nearly returned a false negative (risk 10), the live-resize
    glitch was confidently attributed to the most complicated code in the frontend and turned out
    to belong to the webview (M1-F3, B-096), and ADR-0008 asserted a malformed-PGN frequency that
    nobody had counted (B-101). Every one of those explanations was coherent and plausible before
    it was checked. **In all four, the check was cheap** — a plain-browser control, a recorded
    power state, one window drag on a different tab, and an export of the owner's own games.
    The working rule that falls out: when a symptom has an obvious culprit in our own code, or a
    plan rests on how often something happens, find the control *first*, because the cost of
    running one is minutes and the cost of acting on a plausible story is rework plus a false
    belief that outlives it.
    **Updated session 5 — this is now seven, and two of them are new in kind.** The *sixth* was the
    first found inside an *accepted ADR*; the *seventh* is the first where the wrong reasoning was
    about **a dependency's behaviour** rather than our own code, and where two libraries turned out to
    fail differently from each other rather than one of them failing. Details below. B-099's fixtures measured ADR-0008 rule 3b's premise and it is false: chessops honours the
    `Variant` tag, so a variant game does not produce the "illegal move at ply 2" misdiagnosis the
    rule was written to prevent. Two things make this the most instructive instance yet. First, the
    rule's *instinct* was right and its *example* was wrong, so a reader checking the conclusion
    rather than the reasoning would have found nothing — and the real failure branches (an unknown
    variant name presenting identically to a broken FEN, `Fischerandom` silently becoming standard
    chess) were both invisible from the armchair. Second, **one of my own fixtures corroborated the
    false premise**: an Antichess game whose moves were not legal Antichess truncated at ply 2,
    exactly as the ADR predicted, for entirely the wrong reason. A fixture that fails for the wrong
    reason is worse than one that fails for none, because it agrees with you.
    **The fourth one is different from the first three in a way worth recording.** The others
    were caught by measurement; this one was caught by the *owner disagreeing*, and it was the AI
    that had produced the unevidenced claim, inside a document whose whole purpose was to be more
    careful than a guess. Two lessons. A stated frequency is a measurement claim even when it is
    phrased as a design assumption — "this will be common" needed a number and got a vibe. And
    following the objection through, rather than merely conceding it, is what found B-100: the
    clean sources emit variants, so the gap was in the direction the owner was pointing.
10. **A benchmark nearly produced a false negative against ADR-0001.** macOS Low Power Mode
    capped the machine to 30 fps on mains power, and the first spike run looked like a failure.
    A plain-browser control on the same machine is what caught it (B-077). Any future
    performance claim needs a control and a recorded power state.

## Next actions

**Nothing is blocked and nothing is half-built.** Everything session 5 touched is committed, pushed,
and green on every gate CI applies — `npm test` (32), `typecheck`, `check:i18n`, `vite build`,
`cargo fmt`, `cargo clippy --all-targets -D warnings`, `cargo test`. No claim below rests on "should
work", and nothing in this session had a visual acceptance criterion, because none of it touched UI.

1. **B-007 milestone 2 — the pure import module.** `src-tauri/src/import/`: PGN text in, `Game` values
   plus whatever `pgn-reader` refused out. Hot fields from tags per ADR-0005, `result` as an integer,
   `PgnDate` raw plus parsed, full tag map retained, verbatim PGN byte-preserved, `plyCount` from a
   token count, UTF-8 with a Latin-1 fallback. **No positions, no FEN handling, no legality walk** —
   that is ADR-0009, and milestone 1 measured what it costs.
   **The one thing to measure rather than assume:** which `Result` `pgn-reader` reports when the tag
   and the termination marker disagree. The milestone-1 probe printed tag *names* only, so this is
   genuinely open. `Visitor::outcome()` reports the marker separately from `tag()`, so the importer
   will have both and must choose — prefer the tag, and prefer agreeing with chessops if they conflict,
   but *look first*.
   Then assert the measured numbers in `expected.json` (`importOutcome`, `importTags`, `importTokens`)
   from the Rust side, which is what turns that manifest from a record into a guard.
2. **B-007 milestone 3 — IPC and the paste path**, then **milestone 4 — file import**. Milestone 3 is
   the first point at which a human must look, and the first honest measurement of how long 3,000
   games takes.
3. **B-011 — persistence.** The ADR-0005 migration, now smaller than it was a session ago: no
   disposition or warning columns, no content key, no accuracy columns.
4. **B-008 / B-010** — the real table and search, where TanStack arrives and B-033's 200 ms target
   becomes measurable. Then **`docs/architecture.md`**, the remaining half of B-055.

**Read before starting B-007:** `docs/adr/0009-strict-pgn-import.md` — in particular its **Stated
assumption** (all input is English SAN) and its **Accepted risks** table, which is measured on both
libraries and is the difference between implementing this policy and re-deriving it. ADR-0008 is kept
as history; its main body is no longer what we do.

### Waiting on the owner, not on the code

Neither of these blocks anything above; both make later work better-founded.

- **B-101 — point the survey at loose PGN files.** `npm run survey:pgn -- <path>`; the output is
  safe to paste as-is, since paths print relative to the input. The chess.com corpus is already measured
  and recorded, and it is a *clean-source* sample: it told us the tag surface and nothing about the
  malformed tail, which is what ADR-0008 rules 4 and 5 exist for. **The number to read first is
  same-file content-key collisions**, the only direct evidence about rule 6 — cross-file collisions
  are the rule working as intended on overlapping exports, same-file ones are candidate false merges
  and want eyeballing individually. The downloaded chess.com data sits in `local/pgn/` (untracked).
  **The chess.com half was run in session 5 and the numbers are in B-101's backlog entry** — 100%
  UTF-8, every date complete, zero anomalies of any kind, 0 same-file collisions and 25 cross-file
  ones that are each a game matching across its own JSON and PGN copies. That last figure is
  better rule-6 evidence than the synthetic fixture, because the two representations are genuinely
  different serialisations rather than the same text rewrapped. **What it cannot tell us**: rule 3b
  is untested rather than confirmed, since the account has no variant games, and nothing here
  exercises rules 4 or 5. The loose files are the remaining half and the interesting one.
- **B-031 — check the GitHub side before treating the repo as safely public.** Visibility,
  description, topics, the account profile. The session-3 privacy scan covered the repository and
  cannot see any of that.

**M1 is closed, CI is green on three platforms, and the import path is fully specified but not
started.** The centre of gravity moved from deciding to building two sessions ago; what changed this
session is that the decisions in front of B-007 stopped being guesses. Five of them were checked
against real data and five plausible explanations turned out wrong — which is the reason to keep
doing it, not a reason to slow down.

## Notes for the next session

- **Repo is public-facing on GitHub from commit one.** Check `git status` before staging; never
  `git add -A` blind once source and local databases exist.
- **AI assistants in a sandboxed environment may not be able to delete files** here, which can
  leave a stale `.git/index.lock` blocking all git commands. Fix is `rm -f .git/index.lock` from
  a normal terminal. Prefer running commits from a real terminal.
- **Identity hygiene is a standing rule.** Set per-repo, so it does not survive a fresh clone
  made with a global identity. Re-verify with `git log --format='%an <%ae>'` before any push.
- **Keep this repository free of personal information** — no real names, usernames, email
  addresses, or absolute paths containing a home directory. The placeholder in
  `ai/prompts/session-start.md` is left unfilled on purpose; supply the project path in chat.
- `.DS_Store` files exist in the working tree and are correctly covered by `.gitignore`.
- **Session 1 committed in four increments:** `9260026` (ADRs), `6cc166f` (licence), `4f67976`
  (spike spec + platform dependency), `d86bc66` (vision amendment), plus `c84ade7` (handover).
- **Session 2 *was* committed** — `f2830a3`, `3c11413`, `ec76ee3`. The previous handover said it
  was uncommitted; that was written before the commits and never corrected. Corrected here.
- **Sessions 1 and 2 were committed but never pushed.** `origin/main` sat at `737ece4` — the
  repo-setup commit — while eight commits accumulated locally. The handover said "public-facing
  on GitHub from commit one", which was true of intent and not of fact. Session 3's push is the
  first time any of the ADRs, the vision amendments or any code reached GitHub. Worth checking
  `git log origin/main..HEAD` at the end of a session, not just `git status`.
- **Privacy scan run before the push** (session 3), over the working tree, every untracked
  file, and every commit in history. Clean: no home paths, no secret-shaped strings, no stray
  `.env`/`.pem`/`.DS_Store`/database files ever committed. Exactly two email addresses appear
  anywhere — the pseudonymous GitHub no-reply used as the commit identity, and
  `user@example.com`, the documented placeholder. All commits are authored by the single
  pseudonymous identity. **What the scan cannot see** is anything GitHub-side: repository
  visibility, description, topics, the account's own profile, or any fork. Check those in the
  browser before treating the repo as safely public (B-031).
- **The mysterious `.git/index.lock` is solved: the AI causes it.** Every `git status` run from
  the sandbox refreshes the index, writes `index.lock`, and then cannot unlink it because the
  sandbox has no delete permission — leaving a stale lock that blocks the *next* git command.
  It is not corruption and nothing is wrong with the repository. **Rule: the AI should avoid
  running git from the sandbox**, and use `git status --short` only when needed, expecting to
  clean up after. `rm -f .git/index.lock` from a real terminal clears it. (Delete permission was
  granted for this folder mid-session, which also resolves it.)
- **Session 3 was committed and pushed** in seven increments (see `git log`). The split keeps
  the layout *reasoning* separate from the layout *code*, because the reasoning is the more
  valuable half. Original plan, for reference:
  1. ADR-0005 + ADR-0006 + `m1-skeleton.md` + `tech-stack.md` + `README.md` (decisions)
  2. scaffold + guardrails + skeleton UI + `Cargo.lock` (the code)
  3. `.github/workflows/ci.yml`
  4. `AGENTS.md` + `ai/methodology.md` — the mock-before-code rule (process)
  5. `docs/ui-survey.md` + `docs/core-workflows.md` + ADR-0007 (the layout decision)
  6. the C+ shell rebuild
  7. backlog + handover

  Splitting 5 from 6 is worth doing: it keeps "here is why the layout is this shape" separate
  from "here is the shape", and the reasoning is the more valuable half.
- **Check `git status` before staging.** Untracked `dist/` and `node_modules/` are present and
  covered by `.gitignore`, but this is the first session where a blind `git add -A` could do
  real damage. `package-lock.json` *should* be committed.
- **The AI sandbox cannot delete files.** This bit twice in session 3: `npm run build` fails at
  the point where Vite tries to empty an existing `dist/` (the build itself is fine — verified
  by building to a fresh output path), and the git lock above. Not a code problem; do not
  "fix" it in the build config.
- **The B-048 spike was built and run outside this repo and is not tracked here.** Nothing from
  it should be committed. If a `spike/` directory turns up inside the repo, it is a mistake.
- **Practical note on running spikes:** the AI environment is a Linux sandbox with no Rust
  toolchain, so anything requiring `cargo` or a macOS window has to be run by hand in a real
  terminal. **This is now permanent, not spike-specific** — every session from here produces
  Rust that only you can compile. Plan for the AI to deliver frontend work verified and Rust
  work unverified, and say so in the handover each time rather than implying otherwise.
  `src-tauri/icons/icon.png` is now in place, so that particular proc-macro failure is handled;
  macOS Low Power Mode still silently invalidates performance measurements.
- **CI paid for itself on its first run.** The Windows job failed with `icons/icon.ico not
  found; required for generating a Windows Resource file` — a second, different icon trap that
  macOS and Linux do not hit. Nothing on the developer machine could have caught it. This is
  the concrete argument for B-046 and for keeping the untested platforms compiling (B-068):
  the divergence was one missing file, found in three minutes, and it would have been found
  instead by the first Windows tester a year from now.
- **Mock data uses invented player names on purpose.** Real players would have been easier and
  are exactly the habit that eventually puts a real name in a commit. The fixtures instead carry
  the awkward cases deliberately: accents, Cyrillic, the same person written two ways, a fully
  unknown date, and an unfinished game.
- **`npm run check:i18n` is a real gate, not decoration.** If it starts failing, fix the code
  rather than the script. If it produces a false positive, fix the script properly — the whole
  value of the thing is that it is trustworthy.
- **The layout rule is one sentence: the window is the viewport.** The shell is exactly one
  screen tall, the document never scrolls, and any pane that overflows scrolls its own body.
  Nearly everything that makes a desktop app feel like a web page is a violation of it. Note
  that this depends on `min-height: 0` on every ancestor of a scrolling pane — CSS grid and
  flex children default to `min-height: auto` and refuse to shrink, which is the single most
  common way this rule breaks silently.
- **Board sizing is JavaScript, not CSS, on purpose** (`useChessground.ts`). A `ResizeObserver`
  measures the pane and sets pixel dimensions, floored to a multiple of 8 so squares are even.
  Do not "simplify" this into `aspect-ratio` + container queries without testing WebKitGTK
  first — that is precisely the untested platform (B-066).
- **Layout is in scope for M1; visual design is not.** Panes, splitters, scroll containers,
  selection states and hit areas are structural and expensive to change later. Palettes, board
  and piece theming, and type scale are B-024 and remain deliberately absent. If the app still
  looks plain, that is the intended state, not an oversight.
- **The AI sandbox cannot delete files, and this now has three distinct symptoms.** `index.lock`
  left behind by `git status`; `vite build` failing to empty an existing `dist/`; and, new this
  session, **in-place edits orphaning the original inode as `.fuse_hidden*`** — now covered by
  `.gitignore`, because the repo is public and a blind `git add` would have committed it. None of
  these is a code problem and none should be "fixed" in the build config.
- **The `index.lock` problem has an actual fix, and it replaces the previous advice.** Earlier
  handovers said "the AI should avoid running git from the sandbox", which is discipline rather than
  a mechanism, and it failed repeatedly in session 4 — including during the final verification pass,
  stranding a lock that blocked the owner's own commit. **The mechanism is
  `git --no-optional-locks`:** it skips the optional index refresh that writes `index.lock`, which is
  the write the mount cannot undo. Verified in session 4 — `git --no-optional-locks status
  --porcelain` returned correct output *while a stale lock was present* and created no new lock,
  where plain `git status` emits `warning: unable to unlink .git/index.lock`. **Rule for the AI: read
  git state only via `git --no-optional-locks <cmd>`. Writing commands (`add`, `commit`, `push`) stay
  with the owner in a real terminal**, since those legitimately need the lock. Clearing a stranded
  one is still `rm -f .git/index.lock`.
- **`local/` holds the chess.com download** — 20 monthly JSON archives plus the redundant PGN
  copies, untracked and covered by `.gitignore`. Safe to delete; re-downloadable in a minute with
  the command in B-012's note. The `.pgn` files are genuinely redundant now that B-102 established
  the JSON carries the same games.
- **A measured fact worth not re-deriving: chess.com's PGN tag set.** `Event, Site, Date, Round,
  White, Black, Result, CurrentPosition, Timezone, ECO, ECOUrl, UTCDate, UTCTime, WhiteElo,
  BlackElo, TimeControl, Termination, StartTime, EndDate, EndTime, Link` on every game, plus
  `SetUp`/`FEN` when the game starts from a position. That covers every ADR-0005 hot field, which
  is why B-102 decided to derive from tags rather than from JSON.
- **Five plausible explanations were wrong this session, and all five checks were cheap.** The
  standing habit that came out of it, now in risk 9: when a symptom has an obvious culprit in our
  own code, or a plan rests on how often something happens, find the control *first*. The most
  instructive one was the smallest — four games missing a JSON field all looked like "unrated daily
  games omit `eco`", and thirteen other unrated daily games had it.
- **`npm test` is the fourth check, alongside `typecheck`, `check:i18n` and `build`** (B-106).
  Tests sit beside the code they test (`mainline.test.ts`); the shared PGN corpus is `fixtures/`,
  which is at the repository root because neither language owns it. Read `fixtures/README.md`
  before adding a fixture — invented names only, and every entry needs an `expected.json` row.
- **A lesson for this file rather than for the code: "verified against fixtures" is a claim about a
  moment unless the fixtures are committed.** Two entries in this handover said exactly that, both
  truthfully, and the project still had no test runner in session 5. **Prose cannot distinguish
  between a test suite and a script that was run once**, so from now on say which — and if a check
  was performed by something that no longer exists, say that too. This is the same species as
  session 4's unmeasured frequency claim: a sentence that reads like evidence and is really a
  memory. Worth backporting to the starter kit (B-088).
- **Two Rust facts that cost a round trip each to learn, so the next session should not relearn them.**
  `pgn-reader` **does not validate move legality** — it hands back SAN tokens and legality is the
  caller's job through `shakmaty`, which is what made ADR-0009's "no legality walk" possible. And
  `shakmaty`'s variants live behind an **opt-in `variant` cargo feature**: omitting it is a compile
  error rather than a silent fallback, which is the good failure mode. Neither is a direct dependency
  today; `pgn-reader` carries shakmaty transitively.
- **`expected.json` now holds measurements from both libraries, and that is its whole value.** Two
  earlier versions carried *predicted* importer behaviour (`disposition`/`warnings`, then
  `outcome`/`errorCode`) and both were wrong as the policy moved. The rule that came out of it:
  **if a field cannot be filled from a measurement, leave it out until it can.** An empty column is
  honest; a guessed one gets asserted against and then defended.
- **An instrument that summarises where you needed raw data is worse than none.** The milestone-1
  probe's first version printed a token count when the lists differed — precisely on the two fixtures
  it existed to explain. It looked like an answer. Print the data, let a human judge.
- **Session 5 was committed and pushed in eight increments.** `620b4b7` harness · `a10a18d` corpus ·
  `f058ba4` ADR-0008 amendment · `8ffbf4a` contract test strengthened · `d3c7f18` + `255baa6` ADR-0009 ·
  `6206d42` milestone-1 measurement · `72b7d12` English-SAN assumption. The split keeps each policy
  reversal separate from the code that followed it, which is what makes `git log` readable as a record
  of *why* rather than *what*.
- **Backport the session-5 lessons to the kit (B-088), which now carries eight.** The two newest are
  (7) "verified against fixtures" is a claim about a moment unless the fixtures are committed, and
  (8) ask for the test harness at the point the methodology first says "verify before claiming done".
- **Start the next session with `ai/prompts/session-start.md`.** This file plus `docs/backlog.md`
  should be sufficient — if the next session has to ask something that was settled here, this
  handover failed and is worth fixing rather than working around.
- **Write this file's header last.** Two consecutive handovers carried a stale "session N is
  uncommitted" line because the header was written first and went out of date during the session it
  described.
