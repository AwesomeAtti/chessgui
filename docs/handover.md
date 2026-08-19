# Handover

> The current state of the project. Update at the end of every session so the next session
> (human or AI) can resume with zero chat history. **Keep this file to current-state facts —
> active work, open decisions, risks, next actions.** Session-by-session narrative belongs in
> `docs/session-archive.md`, not here (see B-118). If an entry below would take more than a
> few sentences to justify, put the reasoning in the archive and link to it.

**Last updated:** 2026-08-19 · **Updated by:** AI (Stage 3 / session 17) ·
**Kit version:** 0.2.0

**State in one line (session 17):** **B-010 is done — composed library filters are built,
verified, and confirmed working by the owner in the real app.** It is a criterion-row builder (Finder/Music/Lightroom shape)
plus applied-state chips, not the fixed form that was mocked first and not the pill bar that was
recommended second; **both changed on evidence, and the second time the owner asked for the
survey that overturned the AI's own recommendation.** Also settled this session: the owner's
definition of "modern" is now written down (`docs/ui-survey.md` session-17 section and project
memory), which closes the long-standing "modern is an adjective, not a spec" risk, and the
TanStack v8 pin is a deliberate documented judgment call rather than an inherited one. `main` is
committed and pushed; the working tree is clean.

**Previously:** **B-008 is done — all six milestones built, and confirmed working by the
owner in the real app**, including column reorder, which took three attempts across sessions
13–15 before it actually worked on a real WKWebView (see "Sessions 13–15" below for what each
attempt got wrong and why headless verification kept missing it). Reorder has only minimal visual
feedback for what's being dragged and where it'll land — the owner explicitly deferred improving
that to a later release. (Those commits have since been pushed.) Next up:
B-010 (composed filter panel).

**Sessions 13–15, condensed (full detail in `docs/session-archive.md` and the B-008 row in
`docs/backlog.md`):** Session 13 built all six B-008 milestones in one pass (sort/visibility
already existed) and shipped them as "done" without the owner having looked yet — premature, per
this project's own standing rule that sandbox-green isn't sufficient for anything touching
drag-and-drop or native input. The owner's first real-app look (session 14) found two bugs
neither headless Playwright nor the sandbox's typecheck/build chain caught: reorder didn't work
at all (Tauri's own window-level native drag-drop, used for PGN import, conflicts with HTML5
`draggable` inside WKWebView), and resizing one column visibly moved locked ones (CSS
`table-layout: fixed` redistributes width across every `<col>` with an explicit size once the
table's own resolved width doesn't match their sum — "locked" isn't a concept CSS tables have).
Session 14 fixed resize for good (explicit JS-computed pixel widths, no CSS redistribution left
possible) and fixed reorder by dropping HTML5 DnD for hand-rolled Mouse Events — which *also*
turned out insufficient: session 15 found reorder still didn't work, because `.th-sort` is a real
`<button>` and WebKit's native form controls implicitly capture the pointer on press, silently
suppressing `mousemove` dispatch to `window`. The real fix was Pointer Events with explicit
`setPointerCapture()`, which has its own gotcha (pinning `pointerup`'s target to the drag's
origin, so a stray compatibility `click` needs suppressing) — documented in the code and in
project memory (`wkwebview_vs_headless.md`). **Session 16 confirmed reorder actually works** and
did cleanup: removed the file's inline blow-by-blow bug-fix narrative now that the outcome is
settled (that history belongs in the archive/backlog, not code comments), leaving the doc comment
describing only the current, working design.

**Standing lesson from all three sessions, worth internalising rather than re-learning:**
headless Chromium is not a reliable predictor for anything involving drag gestures, native form
controls, or CSS `table-layout: fixed` in this app — it passed clean on every attempt, including
the two that didn't work. Treat headless-green as "didn't regress anything else," never as
confirmation a drag/native-input fix works, for this codebase specifically.

**Environment note: `git` via the device bridge leaves stale `.git/*.lock` files.** Every git
write (even `git status`) can warn `unable to unlink '.git/index.lock': Operation not permitted`,
and the *next* git command then fails outright with `Unable to create '.git/index.lock': File
exists` — the bridge's mount can create lock files but not delete them, so git's own cleanup
silently fails. Fix that has worked every time: `mv .git/index.lock .git/index.lock.stale-<ts>`
(or `HEAD.lock`) immediately before the next git command — `mv` succeeds where `rm`/`unlink`
cannot. Recorded in project memory (`git_device_bash.md`).

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

**B-010 is done, owner-confirmed, committed and pushed.** Full detail in the B-010 backlog row;
the short version is a pure `filters.ts` model (28 unit tests) plus `FilterPanel` (authoring),
`FilterChips` (applied state) and `filterLabels` (shared catalogue keys), with the criteria owned
by `App.tsx` rather than `LibraryView` because that view unmounts on every game-tab switch.
Verified by typecheck, 114 tests, `check:i18n`, a headless-Chromium pass driving the real
components, **and the owner exercising it in the running app, where it worked first time.**

**That last part is worth not glossing over.** Three sessions running, headless-green preceded a
feature that did not work on the owner's machine; this time it predicted correctly. The
difference is not luck and it bounds the rule: B-010 involves no drag gesture, no interaction on
a native form control under WebKit's implicit pointer capture, and no `table-layout: fixed`. Those
three remain the categories where headless proves nothing here; outside them it is real evidence,
and it is what caught the field picker being silently clipped by an `overflow` ancestor this
session. See project memory `wkwebview_vs_headless.md`.

**Still outstanding for the MVP core:** B-033's remaining half (10k-row render, <200ms filtered
search), now finally testable and never yet measured.

**Standing rule added session 17: do not record commit or push state in this file.** It goes
stale within minutes and `git status` is authoritative. This file carried "`main` is 7 commits
ahead of `origin/main`" across several sessions after those commits had in fact been pushed, and
then immediately repeated the mistake by committing a line asserting that session 17's own work
was uncommitted — while committing it. Say what was *built*, not what was *committed*.

**Files touched session 17:** new
`src/features/library/{filters.ts,filters.test.ts,FilterPanel.tsx,FilterChips.tsx,filterLabels.ts}`;
modified `src/App.tsx`, `src/features/library/LibraryView.tsx`, `src/i18n/format.ts`
(`formatIsoDate`), `src/i18n/locales/en.ts` (a `library.filter` section), `src/styles.css`;
docs `docs/ui-survey.md` (the session-17 cross-category pass), `docs/backlog.md`, this file.

**Files touched session 16:** `src/features/library/LibraryView.tsx` only — doc-comment cleanup,
no behaviour change (removed the inline round-by-round bug-fix narrative now that reorder is
confirmed working; the design's current shape is still fully described, just not its history).
Plus `docs/backlog.md`, project memory (`wkwebview_vs_headless.md` corrected), and this file.

**One design correction mid-build in session 13, worth internalising as a standing habit:** the
first drag-to-reorder mockup put a small grip icon (⠿) on every header, the way Notion/Trello/most
web apps do it. Checked against actual desktop precedent before building (Windows Explorer, Excel)
rather than after — Explorer drags the header cell itself, no grip. Built the Explorer-style
version. **The lesson, reinforced again by column visibility (milestone 2) the same session: when
mocking anything with a real-world desktop precedent, check that precedent before showing options,
not after the owner has to ask whether desktop conventions differ.**

**Before starting B-010:** mock the layout first (AGENTS.md's mandatory rule — two or more
genuinely different options, screenshotted, sent to the owner) and check real-world precedent
(web-app vs. desktop-app conventions) as part of that mock, the same way B-008's milestone 2 and
reorder mockups were checked — not as a follow-up question the owner has to ask.

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
2. **"Modern" is now a spec, but an unapplied one.** The owner defined it in session 17 —
   desktop-app patterns, latest stable libraries, familiar from popular apps *outside* the chess
   category (games, social media, utilities), with developer tools explicitly not counting as a
   substitute. Written up in `docs/ui-survey.md` and project memory; B-010 is the first feature
   designed against it. The residual risk is narrower than it was: B-024 (design system) still
   sits at P2, so the standard exists but nothing systematically applies it.
3. **Bus factor of one across the chess stack.** Niklas Fiekas maintains shakmaty, pgn-reader,
   chessops, chessground, and fishnet. Mitigated by all of it being GPL, open, and small enough to
   fork if needed.
4. **Two chess rule implementations (shakmaty, chessops) must eventually agree** — dormant for the
   MVP, since only `chessops` walks moves (at display time, one game at a time; the importer
   doesn't walk moves at all under ADR-0009). Wakes up, smaller, at the position index
   (B-018/B-042) and engine analysis (B-019).
5. **Cross-platform release is gated on testers, and testers were never recruited** (B-070).
   **Now live rather than looming: session 17 built the installers, so the gap is no longer
   hypothetical.** The architecture supports Windows/Linux; nothing verifies them. Likely to be discovered late
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
9. **Doc bloat was a live risk and B-118 fixed it once**, not permanently — this file grew again
   over sessions 13–16 and got a lighter trim as part of session 16's handover. Watch
   `docs/handover.md` and `docs/backlog.md` size at the end of every session; archive before it
   reaches the point where nobody reads the whole thing.

## Next actions

1. **B-070 — recruit Windows and Linux testers.** Raised to P0 in session 17, because B-032 now
   produces installers for both and there is nobody to run them. This stopped being a code task
   and became the critical path, and it is a recruiting job with a long lead time wearing a
   release job's clothes — which is precisely the shape risk 5 below predicted.
2. **B-033's remaining half, still not measured** — 10k rows rendered, <200ms filtered search.
   The only MVP performance claim never checked, and measurable on one machine without any
   testers; do not let it wait behind B-070.
3. **Signing** (B-032's expensive half) — unsigned macOS builds report as "damaged", which reads
   as a corrupt download rather than a policy block, so the first tester report will be a bug
   that isn't one. Whatever ships to testers needs install instructions alongside it.
4. **B-085's settings-storage decision still needs making before column layout persists** across a
   relaunch — order/visibility/width are all session-only right now, same as sort always was. Not
   urgent; nothing is blocked on it, the interaction already works without it. Worth bundling with
   window geometry/pane sizes (B-085's original scope) rather than solving column persistence
   alone.
5. Then `docs/architecture.md` (the remaining half of B-055).
6. **Exercise the file picker and a drag-drop early** in whatever session next opens the running
   app — `src-tauri/capabilities/default.json` governs both, and a wrong permission identifier
   fails at runtime with a completely green build (see the Environment notes below).
7. **This file has grown again since the last B-118 trim** (session ~12). Consider another
   archive pass if it keeps growing — move settled session narrative to `docs/session-archive.md`,
   keep this file to current-state facts only, per the standing rule at the top of this file.

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
  can't (see `visual_verification.md`). It does not replace the owner looking at the real app —
  **confirmed the hard way in session 14**: HTML5 drag-and-drop passed headless (Playwright's
  synthetic input runs through Chromium's own native DnD state machine) but silently didn't work
  at all in the real app's WKWebView, because Tauri's own window-level native drag-drop (used for
  PGN file import) conflicts with it. Anything touching native drag-and-drop or window-level input
  handling needs the owner's machine before it counts as verified, not just a green headless run.
- **Full verification chain:** `npm run typecheck && npm test && npm run check:i18n && npm run
  build`, then `cargo test --manifest-path src-tauri/Cargo.toml` and `cargo clippy --all-targets
  -- -D warnings`. The Tauri crate itself only builds on the owner's machine.
- **The AI can run that frontend chain directly on the owner's machine through the device bridge**
  (session 17): `node`, `npm` and the installed `node_modules` are all reachable, so typecheck,
  vitest and `check:i18n` are real runs rather than sandbox approximations. **`npm run build` is
  the exception and it is not a code failure:** vite empties `dist/` before writing, the mount
  cannot unlink, and the build dies with `EPERM … unlink` *after* transforming every module.
  Build to a fresh directory (`--outDir dist-something`) to get a genuine result.
- **Headless screenshots still work, via a two-step route** (session 17): the bridge has no
  network so Playwright cannot be installed there, and the AI container has no `node_modules`.
  Build a throwaway preview bundle on the owner's machine (`base: "./"`, fresh `outDir`), stage the
  built files into the container, serve them over `python3 -m http.server` — **not `file://`,
  which CORS-blocks ES modules** — and drive the real components with the container's Chromium.
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
