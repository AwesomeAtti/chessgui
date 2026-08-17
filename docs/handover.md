# Handover

> The current state of the project. Update at the end of every session so the next session
> (human or AI) can resume with zero chat history.

**Last updated:** 2026-08-17 · **Updated by:** AI (Stage 3 / session 4) · **Kit version:** 0.2.0
· **Head at session start:** `61fe8ed`, clean, and `origin/main` level with it — session 3 was
committed and pushed in seven increments. **The previous header claimed session 3 was
uncommitted; that was written before the commits and never corrected.** This is the second
consecutive handover to carry that same stale sentence, which is worth noticing: the header is
written first and then goes out of date during the session it describes. Write it last.

## Project summary

`chessgui` — a modern, cross-platform (Windows / macOS / Linux) desktop chess database and
chess GUI: import, search, organize, annotate, and analyze your own games locally, using
UCI-compatible engines. Local-first, no account, no server. **Product code now exists**: a
Tauri 2 + React 19 skeleton with a static board, a mock game list, and navigation.

## Current stage

**Stage 3 — M1 skeleton, in progress.** All gates closed: ADR-0001 (Tauri 2), ADR-0002
(GPL-3.0), ADR-0003 (chess libraries), ADR-0004 (SQLite), ADR-0005 (data model), ADR-0006
(React 19).

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
- **The database must stay derivable** (ADR-0004, B-078). PGN files are the retained source of
  truth; import is idempotent; dropping and rebuilding the DB is a supported path. This is the
  condition the whole storage decision rests on — if it lapses quietly, the gate re-hardens and
  nobody notices.
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
- **Risk 9 updated**: measurement has now overturned reasoning three times, and the rule was
  written down rather than left as three anecdotes.

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

- **B-049 — PGN import fidelity: accept / repair / reject malformed input.** Now the most
  urgent open decision, because it is the one B-007 cannot start without. Interacts with B-073:
  the policy has to say what happens when a German export contains `Sf3` instead of `Nf3`.
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
4. **Two chess rule implementations must agree** (shakmaty and chessops). Accepted cost of the
   ADR-0003 split; tracked as B-064.
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

    **Updated session 4 — this is now a pattern of three, not an anecdote.** The IPC flood was
    over-sized (risk 9), a benchmark nearly returned a false negative (risk 10), and the
    live-resize glitch was confidently attributed to the most complicated code in the frontend
    and turned out to belong to the webview (M1-F3, B-096). Every one of those explanations was
    coherent and plausible before it was checked. **In all three, the check was cheap** — a
    plain-browser control, a recorded power state, one window drag on a different tab. The
    working rule that falls out: when a symptom has an obvious culprit in our own code, find the
    control *first*, because the cost of running one is minutes and the cost of acting on a
    plausible story is rework plus a false belief that outlives it.
10. **A benchmark nearly produced a false negative against ADR-0001.** macOS Low Power Mode
    capped the machine to 30 fps on mains power, and the first spike run looked like a failure.
    A plain-browser control on the same machine is what caught it (B-077). Any future
    performance claim needs a control and a recorded power state.

## Next actions

**M1 is fully closed and nothing is outstanding from it.** The next action is the first M2 task.

1. **B-049 — PGN import fidelity policy.** The first real M2 task, and the one B-007 cannot
   start without: accept, repair, or reject malformed input, and what happens when a German
   export carries `Sf3` instead of `Nf3` (B-073). Notify-and-proceed, but it must be written
   down before any import code exists.
3. **B-007 — PGN import**, then **B-011 — persistence**, where the ADR-0005 migration finally
   gets written, then **B-008 / B-010** — the real table and search, where TanStack arrives and
   B-033's 200 ms target becomes measurable.
4. **`docs/architecture.md`** — the remaining half of B-055, whenever it earns its place. Carry
   the B-067 throttling rule across from `tech-stack.md`. The source layout is already recorded
   there, so this file is about component boundaries and data flow rather than directories.

**M1 is closed: the app runs, CI is green on three platforms, and everything is pushed.** The
project's centre of gravity has moved from deciding to building, and the next thing it needs is
the import path — the one part of the product that has to survive contact with real files.

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
- **Start the next session with `ai/prompts/session-start.md`.** This file plus `docs/backlog.md`
  should be sufficient — if the next session has to ask something that was settled here, this
  handover failed and is worth fixing rather than working around.
