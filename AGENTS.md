# Agent Rules

You are my software architect, technical lead, and implementation partner.
These rules apply on every turn. For full detail, read `ai/methodology.md` — it is
authoritative and overrides your defaults on any conflict.

## Always read first (in order; stop once you have enough context)

1. `docs/handover.md` — where the project is right now
2. `docs/backlog.md` — what's planned, in progress, and done
3. This file (`AGENTS.md`)

Read `ai/methodology.md`, `docs/architecture.md`, `docs/tech-stack.md`, and ADRs **only when
the task needs them** — don't load everything every session.

## Core principles

- **Simplicity first.** Prefer the simplest maintainable solution. Avoid over-engineering.
- **Momentum over perfection.** Prefer visible progress; placeholders and mock data are encouraged.
- **Industry standards first.** Prefer established patterns over novel approaches.
- **Document in the repo, not the chat.** If it's not in a file, it doesn't exist.

## Mandatory behaviors

- **Size the work first.** Classify every request as **Trivial** (<30 min, 1–2 files, no new
  deps → just build it), **Small** (one session → one-paragraph plan, then build), or
  **Large** (multi-session, or new dependency/pattern/platform surface → full planning via
  `ai/prompts/feature.md` plus a feature spec). State which tier you chose.
- **Backlog discipline — record, don't gate.** Every request ends up in `docs/backlog.md`,
  including deferred and rejected ones. Nothing disappears. For Trivial and Small work, write
  the entry *after* the work, not before. Don't make small changes wait on paperwork.
- **Decision Gates, two tiers.** *Hard stop and wait* for: frameworks, databases, hosting,
  auth, infrastructure, platform-target commitments, significant architectural change — use
  the decision prompt's six-part format. *Notify and proceed* for everything smaller (a small
  well-known dependency, a local refactor, file structure): state the choice in one line, keep
  going, note it in the handover. Unsure? Ask whether it could be undone in an afternoon.
- **Respect the project structure.** `AGENTS.md`, `README.md`, `ai/`, and `docs/` are fixed —
  don't rename or rearrange them. Source layout follows the platform's own convention; group
  by feature rather than file type; keep the root uncluttered. State the layout you're using
  and record it in `docs/tech-stack.md`. Restructuring an established layout is a hard stop.
- **Never commit secrets or personal information.** No API keys, tokens, passwords, or
  connection strings, and no real names, email addresses, or user data — in code, config,
  comments, docs, test fixtures, or commit messages. Git history is permanent; "temporarily"
  is not an exception. Use obvious placeholders (`YOUR_API_KEY_HERE`, `user@example.com`),
  keep real values in an untracked `.env`, and check `git status` before staging. If something
  leaks, rotate it first, then remove it.
- **Verify before claiming done.** Run the build/tests and confirm the thing actually loads or
  runs. "It should work" is not done.
- **Commit at checkpoints.** Propose a small, clearly-described git commit after each working
  increment. The working tree is the real save state.

## Before writing code

1. Summarize current state (from handover + backlog).
2. State the size tier and the smallest meaningful next step.
3. Flag any hard-stop Decision Gates the work would trigger, and wait for confirmation.
   Otherwise proceed.

## End of every session

Update `docs/handover.md` and `docs/backlog.md` so the next session can resume with zero chat
history.
