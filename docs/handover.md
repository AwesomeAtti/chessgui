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
- **Commit identity: set per-repo, pseudonymous, GitHub no-reply address.** Verified present
  on the initial commit as both author and committer. The address is deliberately *not*
  written into any tracked file — it lives in `.git/config` only. Do not add it to
  documentation, and do not set it globally.

## Recently completed

- **Repository initialised, committed, and pushed to GitHub** (`main`, commit `99a6079`,
  tracking `origin/main`) with a pseudonymous per-repo identity. 15 files tracked;
  `.DS_Store` correctly excluded by `.gitignore`.
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

1. Run `ai/prompts/kick-off.md` for Stage 1: MVP scope, core workflows, feature list.
2. Then open the B-003 framework gate — with a spike on board rendering under engine I/O
   before committing to anything.

## Notes for the next session

- **Repo is public-facing on GitHub from commit one.** Anything committed from here on is
  permanently visible. The pre-commit habit that matters: check `git status` before staging,
  never `git add -A` blind once source and local databases exist.
- **AI assistants working in a sandboxed environment may not be able to delete files** in this
  folder, which can leave a stale `.git/index.lock` that blocks all git commands. Fix is
  `rm -f .git/index.lock` from a normal terminal; no repository data is at risk. Prefer
  running commits from a real terminal.
- **Identity hygiene is a standing rule, not a one-off.** It is set per-repo, so it does not
  survive a fresh clone made with a global identity. Re-verify with
  `git log --format='%an <%ae>'` before any push to a public remote — git records author and
  email on every commit independently of file contents, so clean files plus a real-name
  history is not clean.
- **Keep this repository free of personal information.** No real names, usernames, email
  addresses, or absolute filesystem paths containing a home directory — in code, docs, config,
  comments, or commit messages. The placeholder in `ai/prompts/session-start.md` is left
  unfilled on purpose for this reason; supply the project path in the chat session instead of
  committing it.
- `.DS_Store` files exist in the working tree; `.gitignore` covers them, but confirm they are
  not staged if git history is ever initialised from a copy.
- The methodology treats Stage 0 as optional; it was run deliberately here because the product
  is intended for public release, not just personal use.
