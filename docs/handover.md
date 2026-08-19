# Handover

> The current state of the project. Update at the end of every session so the next session
> (human or AI) can resume with zero chat history. **Keep this file to current-state facts —
> active work, open decisions, risks, next actions.** Session-by-session narrative belongs in
> `docs/session-archive.md`, not here (see B-118). If an entry below would take more than a
> few sentences to justify, put the reasoning in the archive and link to it.

**Last updated:** 2026-08-19 · **Updated by:** AI (Stage 3 / session 13) ·
**Kit version:** 0.2.0

**State in one line:** **B-008 is fully done — all six milestones (sort, visibility, reorder,
reset, default order, resize with min/max width) built, verified in the AI sandbox, committed
locally.** `main` is 5 commits ahead of `origin/main`, **none pushed, none looked at by the
owner in the real app yet** — that's the standing gate before any of this counts as verified.
Session 13 built the four milestones session 12 had logged and deliberately held back
(reorder/reset/default-order/resize), all in one pass as the owner asked. One correction
happened mid-build, same shape as milestone 2's: a first mockup used a web-app affordance (a
grip icon for drag-to-reorder) that turned out not to match the desktop convention once checked
against Explorer/Excel — caught by asking "what's the pattern for desktop apps" before building,
not after. Next up: owner review + push, then B-010's filter panel.

**This session: B-008 milestone 2 (column visibility), including a revised design decision.**
Right-click any header now opens a checklist of hideable columns (TanStack's built-in
`columnVisibility` state, no new dependency); `White`/`Black`/`Result` are locked visible
(`enableHiding: false`), which doubles as the guarantee that a header is always right-clickable
even with everything optional hidden — no separate "more columns" affordance needed. **Mocked
three structurally different options first**, per AGENTS.md's mandatory rule (toolbar button,
table-corner icon, right-click header) as an HTML/CSS mockup, screenshotted headlessly, sent to
the owner. **The owner's first answer picked the toolbar button** — the pattern every web-app
source converges on (MUI X, TanStack's own docs, shadcn, GitHub Issues, Linear, Notion) — but
then asked whether being a desktop app changes the answer. It does: Windows Explorer, Outlook,
and desktop-style enterprise grids (AG Grid, DevExpress) all converge on right-click-the-header
instead, which is the actual native-desktop convention rather than a web-SaaS habit. Re-surveyed,
re-presented, owner picked right-click. **Worth remembering for any future layout mock: ask "is
this a web pattern or a desktop pattern" before presenting options, not after the owner has to
ask it.** Verified via typecheck/check:i18n/build and a headless-Playwright walk: open the menu,
hide each optional column one at a time, confirm the locked columns and the menu itself still
work with everything else hidden, confirm Escape closes it. Committed locally as `8079f2e`, not
pushed. **This is a frontend-only change** (`LibraryView.tsx`, `en.ts`, `styles.css`), nothing in
`src-tauri/`, so there was nothing for the owner's machine to verify that the sandbox couldn't
already cover; still needs a look in the real running app per the standing visual-verification
rule, just not blocked on `cargo`.

**Environment note: `git` via the device bridge leaves stale `.git/*.lock` files.** Every git
write in this session (even `git status`) warned `unable to unlink '.git/index.lock':
Operation not permitted`, and the *next* git command then failed outright with `Unable to
create '.git/index.lock': File exists` — the bridge's mount can create lock files but not
delete them, so git's own cleanup silently fails and the stale lock blocks the next invocation.
Fix that worked every time: `mv .git/index.lock .git/index.lock.stale-<ts>` (or `HEAD.lock`)
immediately before the next git command — `mv` succeeds where `rm`/`unlink` cannot, same
constraint as ordinary file deletes through this bridge. Recorded in this session's project
memory (`git_device_bash.md`) so it doesn't have to be rediscovered.

**Prior session's only change was documentation hygiene (B-118), not product code.**
`docs/handover.md` had grown to 147 KB / 1840 lines and `docs/backlog.md` to 129 KB, both required
reading in full every session. Fix: the full session-by-session narrative that used to live in
this file is now in `docs/session-archive.md`, verbatim; several backlog items whose Notes column
had become a multi-paragraph investigation log are now short current-state summaries in
`docs/backlog.md`, with the full text moved to `docs/backlog-archive.md`. **Nothing was deleted —
only relocated.** `ai/methodology.md`'s documentation system and AI context hierarchy sections were
updated to name both archive files as read-when-needed, not every-session. See B-088 for the
starter-kit backport of this lesson (a template should not have to discover this at 250+ KB).

## Project summary

`chessgui` — a modern, cross-platform (Windows / macOS / Linux) desktop chess database and chess
GUI: import, search, organize, annotate, and analyze your own games locally, using UCI-compatible
engines. Local-first, no account, no server.

## Current stage

**Stage 3 — M1 (skeleton) complete. B-007 (import) and B-011 (persistence) are both done and
verified**, including on the owner's own machine. What remains for the MVP core is the real
table and search (B-008/B-010). All Decision Gates closed so far: ADR-0001 (Tauri 2), ADR-0002
(GPL-3.0), ADR-0003 (chess libraries), ADR-0004 (SQLite), ADR-0005 (data model), ADR-0006
(React 19), ADR-0007 (layout C+), ADR-0008 (import fidelity — accepted, amended, then
**superseded**), and **ADR-0009 (strict import), which is the live policy.** Read ADR-0009 for
current behaviour; ADR-0008 is kept for how the question was worked through, but its main body is
no longer what the app does.

## Active work

**B-008 is done — all six milestones.** Nothing is half-built or uncommitted. `main` is 5
commits ahead of `origin/main` — push is the owner's call, not yet made.

**Files touched this session (13):** `src/features/library/LibraryView.tsx` (drag-to-reorder via
native HTML5 drag-and-drop on the header's own click target, `columnSizing`/`columnOrder`
TanStack state, a `<colgroup>` driving column widths so resize/reorder have one source of truth
instead of fighting the old fixed-`rem` CSS), `src/i18n/locales/en.ts` (`library.columnMenu.reset`),
`src/styles.css` (`.col-resizer`, `.dragging`, `.drop-target`; removed the now-redundant
`.col-elo`/`.col-date`/`.col-result`/`.col-eco` width rules), plus `docs/backlog.md` and this
file. No new dependency — same `@tanstack/react-table` already in use since milestone 1.

**One design correction mid-build, worth internalising as a standing habit rather than a one-off
fix:** the first mockup for drag-to-reorder put a small grip icon (⠿) on every header, the way
Notion/Trello/most web apps do it. Checked against the actual desktop precedent before building
(Windows Explorer, Excel) rather than after — Explorer drags the header cell itself, no grip;
Excel's gesture is different again (edge + Shift) and specific to spreadsheet semantics, not
applicable here. Built the Explorer-style version. **The lesson from both milestone 2 and this:
when mocking anything with a real-world desktop precedent, check that precedent before showing
options, not after the owner asks whether desktop conventions differ.**

**Next planned work: owner review of the whole B-008 feature set in the real app (right-click a
header, try dragging one, try resizing one, try Reset columns), then push, then B-010's Option C
filter panel** (a "Filter" control opening composed player/event/date/result/ECO criteria, active
filters shown as removable chips — decided in session 10). That's also where the still-unmeasured
half of B-033 (rendering 10k rows, <200ms filtered search) finally becomes testable. Mock any
further layout change before coding it (AGENTS.md's mandatory rule) — and check real-world
precedent (web vs. desktop, or whatever's relevant) as part of that mock, not as a follow-up
question the owner has to ask.

## Standing constraints

- **Keep the frontend Electron-portable.** All shell/IPC calls go through a single frontend
  adapter module (`src/shell/`). This is what keeps ADR-0001 reversible if WebKitGTK proves
  unworkable on Linux; it stops being true the moment Tauri APIs are sprinkled through components.
- **Everything links GPL-3.0-or-later.** No closed-source path exists any more. Check the licence
  of any new dependency before adding it.
- **No user-facing string literals in components** (B-072). Everything goes through a message
  catalogue; the Rust backend returns error codes, never English prose. English is the only
  locale that ships in the MVP — the constraint is that adding the second one is a translation
  job rather than a refactor. Layout must tolerate ~35% text expansion. Every user-visible number
  goes through `Intl` (`{{value, number}}` in the catalogue, never a bare `{{value}}`).
- **Read-only MVP must not become a read-only schema** (B-050). Header columns are derived; the
  verbatim PGN is the source of truth; rows carry stable IDs from the first migration.
- **All PGN input is assumed to be English SAN** (ADR-0009). PGN mandates it and chess.com and
  lichess emit it. A non-conforming file is a known gap, **B-115** — `pgn-reader` and `chessops`
  fail *differently* on the same file and neither reports anything, so a German or French export
  can silently import as a game nobody played. Fix is deferred; the mechanism should be a
  token-count comparison, not language detection.
- **We do not delete PGN files, so the database is disposable** — drop it and import again. That
  is the whole of derivability (B-078, deferred P3); do not quote it as a constraint on new work.
  It becomes real at B-015 (annotations), when the DB holds data that exists nowhere else.
- **`src/shell/` is the only place anything under `@tauri-apps/` may be imported** (ADR-0001),
  enforced by `npm run check:i18n` in CI — matches the whole `@tauri-apps/*` namespace and both
  static and dynamic `import()` forms.
- **chessground owns its own DOM subtree.** `src/features/board/useChessground.ts` is the only
  React↔chessground seam; its container div must never be given React children.
- **`@tanstack/react-table` is pinned to the `^8.21.3` line, deliberately not npm's `latest`
  (9.1.2, added B-008 session 10).** v9 shipped as stable very recently and replaced the v8 hook
  API (`useReactTable`, `getCoreRowModel()`, `getSortedRowModel()`) with a feature-flag
  architecture (`useTable`, `tableFeatures()`, per-column-typed `createColumnHelper`) that has
  far fewer real-world examples and is a meaningfully bigger surface for a solo-maintained
  project. v8 is what every existing tutorial, Stack Overflow answer, and this codebase's own
  `LibraryView.tsx` already use. Don't "upgrade" to v9 without a deliberate reason — it's a
  rewrite of the table wiring, not a version bump.
- **The source layout is established** (`docs/tech-stack.md`). Per AGENTS.md, restructuring it is
  a hard stop.
- **Store the raw thing, derive the useful thing** (ADR-0005). Derived values are never
  authoritative, so a wrong derivation rule is a re-import, not data loss.
- **An import error is terminal, and there is at most one per *input*.** `pgn-reader`'s errors are
  irrecoverable, so anything downstream must be built for "n games and then a wall," not "n games
  with holes." Several files are several inputs, so a multi-file import can legitimately report a
  failure followed by later successes — that is not a violation of the rule, it's the rule applied
  per input. B-116 (resynchronisation) would change this and is deferred behind a measurement
  (B-101's loose-file survey).
- **`src-tauri/src/import/` never builds a position and never imports `shakmaty`** (ADR-0009). If
  a future change needs one, that's a decision to record, not a dependency to add quietly.

## Open decisions

- **B-103 — the one decision deliberately left as a guess.** chess.com's draw-termination
  vocabulary is unobserved (no drawn games in the sample). Owner approved guessing it, on the
  condition that the winner is always derived *positively* — one side reading `win` means that
  side won; anything unrecognised must warn and leave `result` null, never default to a draw.
- **B-112 — is broadcasting an audience this product serves?** Prices B-107–B-111 (detachable
  component windows for streamers), all parked at P3. Nothing in that group touches import,
  storage, or search, so it doesn't block anything either way.
- **B-006 — engine process management & UCI transport.** Escalates to a hard-stop gate only if an
  engine binary is bundled; not triggered yet. B-048's spike already proved the transport half.
- **B-051 — bundle an engine or require user-supplied.** Unblocked on licensing (Stockfish is
  GPL-3.0); reduces to binary size, signing, and per-platform builds.
- **B-031 — public-repo timing.** Licence is settled (GPL-3.0-or-later); *when* the repo goes
  public is not decided.

### Waiting on the owner, not on the code

Neither blocks anything above; both make later work better-founded.

- **B-101 — point `npm run survey:pgn -- <path>` at the loose/hand-typed PGN files.** The
  chess.com corpus is already measured and clean (zero anomalies). The loose files are the
  malformed tail this project's import-fidelity policy was actually written for, and the result
  gates a real decision: if they contain unterminated comments, build B-116 (resynchronisation);
  if not, the current deferral is settled rather than merely convenient.
- **B-031 — check the GitHub side before treating the repo as safely public.** Visibility,
  description, topics, the account profile — nothing run from the sandbox can see any of that.

## Risks

1. **WebKitGTK on Linux remains unverified.** B-048's spike ran on macOS/WKWebView only. Blocked
   on B-070 (testers); tracked as B-066. Tauri reportedly moving toward a Chromium-based Linux
   webview — treat as upside, not plan.
2. **"Modern" is still an adjective, not a spec.** B-024 (design system) sits at P2, scheduling
   the vision's central claim last.
3. **Bus factor of one across the chess stack.** Niklas Fiekas maintains shakmaty, pgn-reader,
   chessops, chessground, and fishnet. Mitigated by all of it being GPL, open, and small enough to
   fork if needed.
4. **Two chess rule implementations (shakmaty, chessops) must eventually agree** — dormant for the
   MVP, since only `chessops` walks moves (at display time, one game at a time; the importer
   doesn't walk moves at all under ADR-0009). Wakes up, smaller, at the position index
   (B-018/B-042) and engine analysis (B-019).
5. **Cross-platform release is gated on testers, and testers were never recruited** (B-070). The
   architecture supports Windows/Linux; nothing verifies them. Likely to be discovered late
   because it looks like a release task and is actually a recruiting one with a long lead time.
   Mitigations in place: 3-OS CI from commit one (B-046), headless smoke tests (B-071), portability
   guardrails (B-069).
6. **The reference database (B-040) is a second product hiding inside the first.** Licensing and
   download size are likely harder than the code. Keep it post-MVP; don't let storage choices rule
   it out.
7. **Packaging and distribution are routinely underestimated** (B-032).
8. **This project's risk register is built from reasoning, not measurement**, and every item that
   has actually been measured turned out misjudged (an IPC flood sized 100x too high, a benchmark
   that nearly gave a false negative from an unrecorded power state, a resize glitch confidently
   blamed on the wrong code, an acceptance criterion wrong about a dependency's behaviour, a
   Unicode accent-stripping technique that was standard and wrong for Cyrillic — nine instances by
   session 6, more since). **Standing rule: when a symptom has an obvious culprit in our own code,
   or a plan rests on how often something happens, find the control first** — every check so far
   has been cheap. Full instance-by-instance record in `docs/session-archive.md`.
9. **Doc bloat was a live risk and B-118 (this session) is the fix**, not a guarantee it won't
   recur. Watch `docs/handover.md` and `docs/backlog.md` size at the end of every session; archive
   before it reaches the point where nobody reads the whole thing.

## Next actions

1. **Owner: look at all of B-008 in the real running app**, and push — `main` is 5 commits ahead
   of `origin/main`. Try each: right-click a header (menu, hide, Reset columns), drag a header to
   reorder, drag a resize handle on White/Black/Event (Elo/Result/Date/ECO are deliberately
   locked, no handle), click a header with no drag movement to confirm sort still works.
2. **B-085's settings-storage decision still needs making before any of this persists** across a
   relaunch — order/visibility/width are all session-only right now, same as sort always was.
   Not urgent; nothing is blocked on it, the interaction already works without it.
3. **B-010 — the Option C composed filter panel.** Where B-033's remaining half (10k-row render,
   <200ms filtered search) finally becomes measurable. Mock the layout before coding it, and
   check real-world precedent (web-app vs. desktop-app conventions, same as B-008's two rounds)
   as part of building that mock rather than after presenting it.
4. Then `docs/architecture.md` (the remaining half of B-055).
5. **Exercise the file picker and a drag-drop early** in whatever session next opens the running
   app — `src-tauri/capabilities/default.json` governs both, and a wrong permission identifier
   fails at runtime with a completely green build (see the Environment notes below).

## Environment & operating notes

Durable facts that keep being worth knowing at the start of a session. Project-specific tool
capabilities (what this sandbox can and can't build/verify) are also recorded in this session's
project memory — `rust_verification.md` and `visual_verification.md` — read those too.

- **The AI sandbox has Rust** (cargo, crates.io reachable) and can compile/test/lint pure Rust
  modules in a mirror crate, but **cannot build the Tauri crate itself** (no system webview
  libraries) or install an old toolchain (`static.rust-lang.org` is blocked while crates.io is
  not). Anything touching `tauri`, a window, or the two Tauri plugins needs the owner's machine.
- **The UI can be rendered headless and screenshotted** (Playwright against the pre-installed
  Chromium) even without a Tauri window — useful for catching rendering faults a green build
  can't (see `visual_verification.md`). It does not replace the owner looking at the real app.
- **Full verification chain:** `npm run typecheck && npm test && npm run check:i18n && npm run
  build`, then `cargo test --manifest-path src-tauri/Cargo.toml` and `cargo clippy --all-targets
  -- -D warnings`. The Tauri crate itself only builds on the owner's machine.
- **Repo is public-facing on GitHub.** No real names, usernames, email addresses, or absolute
  paths containing a home directory in any tracked file. Check `git status` before staging; never
  blind `git add -A`.
- **Mock UI layout before coding it, always** (AGENTS.md mandatory behavior). Layout is
  subjective and the build → dislike → rebuild loop doesn't converge; show two or more genuinely
  different options.
- **The window is the viewport.** The shell is exactly one screen tall, the document never
  scrolls, any pane that overflows scrolls its own body. Depends on `min-height: 0` on every
  ancestor of a scrolling pane — CSS grid/flex children default to `min-height: auto` and refuse
  to shrink, which is the most common way this rule breaks silently.
- **Board sizing is JavaScript, not CSS, on purpose** (`useChessground.ts`, `ResizeObserver`).
  Don't "simplify" to `aspect-ratio` + container queries without testing WebKitGTK first (B-066 is
  still open).
- **A capability/permission system has two failure shapes and only one is loud.** A wrong
  identifier is a build error; an *incoherent* set (a command granted with no scope, or a scope
  granted with no command) is a feature that silently does nothing with everything green. When a
  capability-gated feature is inert, read the generated `src-tauri/gen/schemas/acl-manifests.json`
  rather than reasoning about the entry name.
- **Two Rust facts worth not relearning:** `pgn-reader` does not validate move legality — it hands
  back SAN tokens and legality is the caller's job via `shakmaty`. `shakmaty`'s variants live
  behind an opt-in `variant` cargo feature; omitting it is a compile error, not a silent fallback.
- **`fixtures/pgn/` is dual-purpose** — it's the shared Rust/TypeScript test corpus, and it's also
  usable as manual drag-and-drop test material for anyone exercising the running app by hand
  (B-124); see `fixtures/README.md`.

## Documentation map

- `docs/session-archive.md` — full session-by-session narrative through session 9. Read for the
  reasoning behind a past decision; not required reading for a new session.
- `docs/backlog-archive.md` — full pre-trim Notes text for backlog items whose live entry is now a
  short summary. Search by ID.
- `docs/adr/` — Architecture Decision Records, the authoritative record of what was decided and
  why for anything gate-worthy.
- `ai/methodology.md`'s "AI context hierarchy" section has the full read-priority tiering.
