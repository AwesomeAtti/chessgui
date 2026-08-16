# Handover

> The current state of the project. Update at the end of every session so the next session
> (human or AI) can resume with zero chat history.

**Last updated:** 2026-08-16 · **Updated by:** AI (Stage 0 session) · **Kit version:** 0.2.0

## Project summary

`chessgui` — a modern, cross-platform (Windows / macOS / Linux) desktop chess database and
chess GUI: import, search, organize, annotate, and analyze your own games locally, using
UCI-compatible engines. Local-first, no account, no server. Currently at Stage 0 → 1; no code
exists yet and no technology has been chosen.

## Current stage

Stage 0 — Idea validation: **complete**. Gate passed — the idea fits on one page
(`docs/product-vision.md`). Ready for Stage 1 (Product definition) via
`ai/prompts/kick-off.md`.

## Active work

- Nothing in progress. Next session starts Stage 1.

## Decided

- **Scale target.** MVP designs for a **personal database of ~10,000 games** — read/write,
  header search, no position index. A **reference database** of millions of master games
  (read-mostly, bulk-loaded, position-indexed, for opening search and W/D/L statistics) is
  **post-MVP** but must not be designed out. Working assumption: two stores of different
  shapes, not one store stretched to cover both. See `docs/product-vision.md` §7 and B-040.
- **Repository hosting: GitHub.** Project created. This is a hosting decision, but a cheap one
  to reverse (a git remote), so it is recorded here rather than gated. Distribution channel
  for built releases is a *separate*, later decision (B-047 / B-032) and should not be assumed
  to follow from this.

## Recently completed

- `docs/product-vision.md` written and approved: problem, users, value proposition, MVP,
  success criteria, non-goals, open questions.
- `docs/backlog.md` seeded with 39 items (B-001 – B-039), including future features and
  explicitly rejected ideas.
- `README.md` replaced — was still the starter kit's README, now describes this project.

## Open decisions

Four **hard-stop** Decision Gates, all open, all blocking implementation. Use
`ai/prompts/decision.md` (six-part format) and record each as an ADR once approved:

- **B-003 — UI framework / desktop shell.** Largest and least reversible. No stated leaning;
  fully open.
- **B-004 — Local storage / database engine.** Scale target now settled (see *Decided*), so
  this gate is judged on two criteria: comfortably meets the 10k-game MVP, *and* leaves room
  for a separate read-mostly reference database later.
- **B-005 — Chess rules & PGN handling: library vs. own implementation.** Follows B-003, since
  available libraries depend on the language.
- **B-006 — Engine process management & UCI transport.** Escalates to a platform-surface
  commitment if an engine binary is bundled (signing, notarisation, sandboxing).

No notify-and-proceed choices made this session — nothing technical has been decided.

## Risks

1. **Framework choice dominates everything.** Language, libraries, storage options, packaging,
   and the performance ceiling are all downstream. Resolve first; do not let code accumulate
   before it is settled.
2. **UI performance under engine load is unproven.** Rendering an interactive board smoothly
   while an engine floods stdout is the concrete thing to spike before committing to B-003.
3. **"Modern" is currently an adjective, not a spec.** The vision's central claim rests on
   design quality; without a deliberate design system (B-024) this becomes the first thing to
   quietly slip.
4. **The reference database is a second product hiding inside the first.** Millions of games,
   a position index, aggregate statistics, and a redistributable data source (B-043) — the
   licensing and download size are likely harder than the code. Keep it firmly post-MVP, but
   let it veto storage choices that would make it impossible.
5. **Cross-platform is claimed from day one** but only gets verified if all three OSes are
   built and run early. "Linux later" is how it stops being true.
6. **Packaging and distribution are routinely underestimated** — installers, code signing,
   macOS notarisation, auto-update (B-032).

## Next actions

1. **`git init` and first commit** (B-044) — see the identity warning below. The GitHub
   project exists; the local repo does not. Everything written so far lives only on disk.
2. Run `ai/prompts/kick-off.md` for Stage 1: MVP scope, core workflows, feature list.
3. Then open the B-003 framework gate with a spike on board rendering + engine I/O.

## Notes for the next session

- **Not a git repository yet.** `git init` has not been run, so nothing is committed and the
  GitHub remote has never been pushed to. Per `ai/methodology.md` ("Starting a new project"),
  do secrets hygiene *before* the first commit: `.gitignore` is in place, and a **per-repo**
  commit identity must be set (`git config user.name` / `git config user.email`) using a
  pseudonym and a GitHub `@users.noreply.github.com` address. This matters more than usual —
  the repo is destined for GitHub and the intent is to open-source it. Git records author name
  and email on every commit independently of file contents, so a repo with clean files and a
  real-name commit history is not clean. Verify with `git log --format='%an <%ae>'` before the
  first push.
- **Keep this repository free of personal information.** No real names, usernames, email
  addresses, or absolute filesystem paths containing a home directory — in code, docs, config,
  comments, or commit messages. The placeholder in `ai/prompts/session-start.md` is left
  unfilled on purpose for this reason; supply the project path in the chat session instead of
  committing it.
- `.DS_Store` files exist in the working tree; `.gitignore` covers them, but confirm they are
  not staged if git history is ever initialised from a copy.
- The methodology treats Stage 0 as optional; it was run deliberately here because the product
  is intended for public release, not just personal use.
