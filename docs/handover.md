# Handover

> The current state of the project. Update at the end of every session so the next session
> (human or AI) can resume with zero chat history.

**Last updated:** 2026-08-16 · **Updated by:** AI (Stage 1 / session 2) · **Kit version:** 0.2.0
· **Head at session end:** `c84ade7`, plus uncommitted scope decisions and the B-048 write-up

## Project summary

`chessgui` — a modern, cross-platform (Windows / macOS / Linux) desktop chess database and
chess GUI: import, search, organize, annotate, and analyze your own games locally, using
UCI-compatible engines. Local-first, no account, no server. No product code yet; the stack is
chosen and now measured — a throwaway spike proved it works and was deleted.

## Current stage

Stage 1 essentially complete; Stage 2 begun (`docs/tech-stack.md`). **All blocking gates are
closed** — ADR-0001 (Tauri 2), ADR-0002 (GPL-3.0), ADR-0003 (chess libraries), ADR-0004
(SQLite). B-048 passed, so the framework choice survived contact with a measurement.
**Nothing is blocking implementation. The next session should be writing product code (B-054).**

## Active work

- Nothing in progress. B-048 is run and written up, B-004 is decided. Next is **B-054 — the M1
  skeleton**, and it is the first product code in the repository.

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

## Recently completed

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

- **Schema shape — B-058 (player table + name normalisation), B-059 (partial dates), B-060
  (full tag set as JSON).** ADR-0004 downgraded the *engine* decision, not these. They get baked
  into import code and every query, and are expensive to change no matter what sits underneath.
  Decide them at B-054, deliberately.
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
5. **Vision quality was becoming a trap; the spike broke the pattern but did not cure it.**
   Something finally ran. The count is now fourteen documents and one *discarded* executable —
   the project still has no product code. **Every gate is now closed, so deliberation has run
   out of legitimate excuses.** If the next session produces another document instead of B-054,
   this is no longer a risk but a diagnosis.
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
10. **A benchmark nearly produced a false negative against ADR-0001.** macOS Low Power Mode
    capped the machine to 30 fps on mains power, and the first spike run looked like a failure.
    A plain-browser control on the same machine is what caught it (B-077). Any future
    performance claim needs a control and a recorded power state.

## Next actions

1. **B-054 — M1 skeleton.** First product code. Window, static board from a FEN, mock game list,
   navigation. Write `docs/milestones/m1-skeleton.md` first. Three things get established here
   or get lost, all structural and all cheap only if present from the first screen:
   **B-072** (message catalogue — no user-facing string literals), **B-069** (portability
   guardrails — paths, shortcuts, dialogs behind abstractions), and the single frontend IPC
   adapter that keeps ADR-0001 reversible. **B-065** (SPDX) unblocks the moment the manifests
   exist. Decide B-058 – B-060 as part of this.
2. **B-046** — three-OS CI. Cheap, and it is what makes the amended cross-platform criterion
   true rather than aspirational. Best done with the skeleton, while there is almost nothing to
   compile and failures are trivial to diagnose.
3. **`docs/architecture.md`** — the remaining half of B-055. Carry the B-067 throttling rule
   across from `tech-stack.md` and record the layout the skeleton actually uses.

`B-053` (core workflows doc) is the remaining Stage 1 deliverable but is not on the critical
path. `B-065` (SPDX identifiers) unblocks once manifests exist at B-054.

**The spike ran, passed, and was thrown away — as designed.** The next thing that runs should be
something that survives: B-054, the M1 skeleton.

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
- **Session 2 is uncommitted at time of writing:** vision amendments, backlog B-050/B-072–B-077,
  `docs/tech-stack.md`, and this handover.
- **The B-048 spike was built and run outside this repo and is not tracked here.** Nothing from
  it should be committed. If a `spike/` directory turns up inside the repo, it is a mistake.
- **Practical note on running spikes:** the AI environment is a Linux sandbox with no Rust
  toolchain, so anything requiring `cargo` or a macOS window has to be run by hand in a real
  terminal. Expect that split on any future spike. Two things bit us and will bite again —
  Tauri needs `src-tauri/icons/icon.png` to exist or the build fails in a proc macro, and
  macOS Low Power Mode silently invalidates performance measurements.
- **Start the next session with `ai/prompts/session-start.md`.** This file plus `docs/backlog.md`
  should be sufficient — if the next session has to ask something that was settled here, this
  handover failed and is worth fixing rather than working around.
