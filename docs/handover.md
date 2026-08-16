# Handover

> The current state of the project. Update at the end of every session so the next session
> (human or AI) can resume with zero chat history.

**Last updated:** 2026-08-16 · **Updated by:** AI (Stage 1 / session 2) · **Kit version:** 0.2.0
· **Head at session end:** `c84ade7` + uncommitted scope decisions

## Project summary

`chessgui` — a modern, cross-platform (Windows / macOS / Linux) desktop chess database and
chess GUI: import, search, organize, annotate, and analyze your own games locally, using
UCI-compatible engines. Local-first, no account, no server. Still no code; the stack is now
chosen.

## Current stage

Stage 1 — Product definition, in progress. Stage 0 complete. Three hard-stop gates closed this
session (ADR-0001, ADR-0002, ADR-0003); one remains open (B-004).

## Active work

- Nothing in progress. B-048 spike is next; Rust, Node, and a local Stockfish binary are
  confirmed available on the dev machine.

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

No notify-and-proceed choices made this session. B-050 was recorded as a decision rather than an
ADR — it is a scope choice, reversible by building B-015.

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

## Recently completed

Session 2:

- **B-050 closed** — MVP scope set to read-only; vision §4, §7, §8 and success criteria amended.
- **B-072 – B-075 added** — multi-language requirement captured; vision §3 and §5 amended.

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

- **B-004 — Local storage / database engine.** The one remaining hard stop. Now much more
  constrained: Rust backend, 10k-game MVP, read-only at MVP (B-050), must leave room for a
  separate read-mostly position-indexed reference database. SQLite is the obvious candidate; the
  gate still needs running properly, including the schema questions in B-058 – B-062. B-050
  makes the gate *easier* — no edit or drift path to design for — provided the read-only
  simplification is not baked in irreversibly.
- **B-006 — Engine process management & UCI transport.** Escalates to a platform-surface
  commitment only if an engine binary is bundled. Not triggered by M1.
- **B-051 — Bundle an engine or require user-supplied.** Unblocked on licensing grounds now
  (Stockfish is GPL-3.0, same family), so this reduces to binary size, signing, and per-platform
  builds.
- **B-031 — Public-repo timing.** Licence is settled; *when* the repo goes public is not.

## Risks

1. **WebKitGTK on Linux remains unverified, and B-048 will not close it.** The spike runs on
   macOS (WKWebView), so it validates the throttling architecture and the chessground/Stockfish
   plumbing but not WebKitGTK's frame pacing. Closing this is **B-066**, blocked on B-070
   (testers). Note the reframe in the spike spec: the dominant risk is flooding the IPC boundary
   with per-line engine events, which would melt any webview including Chromium — throttling in
   Rust (B-067) addresses it, and that is webview-independent. Tauri is reportedly moving toward
   a Chromium-based Linux webview — treat as upside, not as a plan.
2. **"Modern" is still an adjective, not a spec.** B-024 sits at P2, which schedules the vision's
   central claim last. The web frontend makes it cheaper to deliver; it does not make it happen.
3. **Bus factor of one across the entire chess stack.** Niklas Fiekas maintains shakmaty,
   pgn-reader, chessops, chessground, and fishnet. Mitigated by all of it being GPL, open, and
   small — forkable if needed — but worth knowing rather than discovering.
4. **Two chess rule implementations must agree** (shakmaty and chessops). Accepted cost of the
   ADR-0003 split; tracked as B-064.
5. **Vision quality has become a trap.** Twelve documents and no executable. The methodology's
   "momentum over perfection" exists for exactly this failure mode — the next session should
   produce something that runs.
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

## Next actions

1. **B-048 — run the spike.** Spec and pass/fail thresholds are already written; read
   `docs/feature-specs/b048-webview-engine-spike.md` and build to it. Needs a locally supplied
   Stockfish binary (bundling is B-051, undecided), plus Rust and Node toolchains. **Build it
   outside this repo**, in a throwaway directory — only the findings and the throttling design
   come back, into `docs/tech-stack.md`.
2. **B-004** — run the storage gate once the spike is in. Include the schema questions
   (B-058 – B-062).
3. **B-054** (M1 Skeleton) and **B-055** (`tech-stack.md`, `architecture.md`). The skeleton is
   where B-072 (message catalogue) and B-069 (portability guardrails) either get established or
   get lost — both are structural, and both are cheap only if they are there from the first
   screen. B-065 (SPDX) also unblocks here.
4. **B-046** — three-OS CI. Cheap, and it is what makes the amended cross-platform criterion
   true rather than aspirational.

`B-053` (core workflows doc) is the remaining Stage 1 deliverable but is not on the critical
path. `B-065` (SPDX identifiers) unblocks once manifests exist at B-054.

**This project has produced twelve documents and zero executables.** The next session should
end with something that runs. That is the point of B-048 being first.

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
- **Session committed in four increments:** `9260026` (ADRs), `6cc166f` (licence), `4f67976`
  (spike spec + platform dependency), `d86bc66` (vision amendment). Only this handover update
  remains uncommitted.
- **Start the next session with `ai/prompts/session-start.md`.** This file plus `docs/backlog.md`
  should be sufficient — if the next session has to ask something that was settled here, this
  handover failed and is worth fixing rather than working around.
