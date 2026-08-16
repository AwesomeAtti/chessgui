# Development Methodology

**Methodology version: 0.2.0** · See `CHANGELOG.md` for what changed and when.

The single source of truth for how AI-assisted development is structured and executed in this
project. If anything conflicts with the AI's default behavior, **this document wins.**

## Purpose

Ensure rapid delivery of working software, high maintainability, minimal complexity, strong
documentation discipline, and reliable session continuity that does not depend on chat history.

## Core principles

### 1. Simplicity first
Prefer simple solutions, conventional patterns, readable code, minimal dependencies, and low
operational overhead. Avoid clever or obscure implementations, premature optimization,
unnecessary abstraction, and framework-heavy designs without justification.

### 2. Momentum over perfection
Prefer visible progress over theoretical completeness. When multiple approaches exist, choose
the one that produces working software sooner, enables feedback earlier, and reduces
uncertainty faster.

### 3. Complexity guardrail
Before introducing complexity, answer:
1. What problem is being solved?
2. Why is the current approach insufficient?
3. What is the simplest alternative?
4. What is the long-term maintenance cost?

Complexity must always be justified.

### 4. Industry standards first
Identify how similar systems solve the problem. Prefer widely adopted patterns. Avoid novel
approaches unless necessary.

### 5. Documentation as project memory
Assume AI sessions have **no persistent memory.** Every important decision must live in the
repository, not in a conversation.

> The repository is the system of truth. The AI is replaceable. The documentation is not.

## Starting a new project

Before Stage 0, stand the project up. This takes a few minutes and every step exists because
skipping it causes a specific, recurring problem later.

1. **Create the project folder** and copy the starter kit's contents into its root.
2. **Delete `CHANGELOG.md`** from the copy — it tracks the methodology, not your product.
3. **`git init`, then set up secrets hygiene *before* the first commit** — add `.gitignore`
   (including `.env`), add `.env.example`, and set this repo's commit identity (see "Secrets
   and personal information"). Doing this after the first commit means fixing history rather
   than a file.
4. **Commit immediately**, before any code. Version control is the real save state; an
   uncommitted first hour is the easiest work in the project to lose.
5. **Fill in the project path** in `ai/prompts/session-start.md`, replacing the placeholder
   with the absolute path to this project. Sessions that can't locate the project can't read
   the handover, which defeats the entire continuity mechanism.
6. **Seed `docs/handover.md`** — project summary, current stage, and the **Kit version** from
   the header of this file. Without the version you can't tell later whether an odd process
   is a mistake or just an older methodology.
7. **Pick your AI tool's convention.** Most tools read `AGENTS.md` or `CLAUDE.md`. Use one.
   Maintaining both by hand guarantees they drift.
8. **Then start the first session** — `ai/prompts/vision.md` if the idea is still rough,
   otherwise `ai/prompts/kick-off.md`.

Only four documents should exist at this point: `AGENTS.md`, `ai/methodology.md`,
`docs/handover.md`, and `docs/backlog.md`. Everything else in `docs/` is created when the
project actually needs it.

## Development lifecycle

Each stage has a gate — a simple question that must be answerable before moving on.

| Stage | Deliverables | Gate |
|-------|-------------|------|
| 0 — Idea validation *(optional)* | Problem statement, target users, value proposition, success criteria | Can this be explained in one page? |
| 1 — Product definition | Product vision, MVP scope, core workflows, feature list | Can the MVP be explained in 5 minutes? |
| 2 — Architecture planning | Architecture doc, tech stack, initial ADRs | Could a new developer understand the system in 30 minutes? |
| 3 — Skeleton app | Placeholder pages, mock data, stub services, navigation | Can stakeholders see what's being built? |
| 4 — Feature delivery | Per feature, scaled to its size (see below) | Can the feature be demonstrated? |
| 5 — Hardening | Tests, security review, error handling, doc updates | Is this maintainable by another developer? |
| 6 — Release readiness | Docs complete, backlog updated, ADRs complete, known issues recorded | Could future-you support this in 6 months? |

Stages need not be strictly linear for a solo project — but never skip a gate silently.

**Stage 0 is optional.** Skip it for any project you can describe accurately in one sentence,
and go straight to Stage 1. Formal idea validation earns its keep when others are involved or
real money is at stake; on a solo build it is usually ceremony.

## Feature sizing (Stage 4)

Not every change deserves the same process. The AI classifies each request into one of three
tiers, **states the tier it chose**, and proceeds accordingly. Override it when it guesses
wrong — it will sometimes over-classify to be safe.

| Tier | Roughly | Process |
|------|---------|---------|
| **Trivial** | Under ~30 minutes, one or two files, no new dependencies, no new pattern | Just build it. Log a one-line backlog entry **afterwards**, in the same session. No plan, no spec. |
| **Small** | Fits in one session | One short paragraph first: what it does, the smallest useful slice, and how you'll verify it works. Then build. Backlog entry when done. |
| **Large** | Spans sessions, or introduces a new dependency, pattern, or platform surface | Full planning before code: use `ai/prompts/feature.md`, and write a feature spec. Backlog entry up front. |

If a tier is genuinely ambiguous, pick the smaller one and escalate if it turns out bigger.
Discovering mid-build that something is Large is normal and is not a failure — stop, record
what you learned, and re-plan.

**Backlog discipline is about recording, not gating.** Every request ends up in
`docs/backlog.md` — done, deferred, or rejected — but for Trivial and Small work the entry is
written *after* the work, not before it. Nothing disappears; nothing waits on paperwork.

## Rapid delivery principles

**Placeholder-first development.** Stub pages, mock data, empty workflows, "Coming soon"
states, and navigation-before-backend are all encouraged. Maximize visible progress early.

**The 80% rule.** If a feature delivers 80% of the value with 20% of the effort, prefer
stopping there and moving on. Record the remaining 20% in the backlog.

**Progressive enhancement.** Phase 1 visibility (UI, navigation, mock flows) → Phase 2
functionality (logic, persistence) → Phase 3 hardening (tests, reliability) → Phase 4
optimization (performance, refinement).

## UI layout is mocked before it is coded

Layout decisions — pane arrangement, navigation model, what is visible at the same time — are
**subjective and cannot be reasoned to**. They are also expensive to change once built, because
every component ends up encoding assumptions about who owns the viewport.

So they get a different process from the sizing tiers above:

1. **Survey first, if the product category already exists.** How do the established tools solve
   it, and where do they disagree with each other? Real products are better evidence than the
   AI's taste, and the disagreements tell you which parts are genuinely matters of preference.
2. **Show two or more genuinely different options**, as throwaway mockups. Not one proposal to
   react to — a single option invites "yes, fine" rather than a real choice, and gives no
   vocabulary for what is wrong with it.
3. **Structure-only fidelity by default.** Grey boxes and real proportions with real data. It
   keeps the conversation on layout instead of colour, which is a separate decision.
4. **Approve, then build once.**

The mockups are disposable and belong outside the source tree, like a spike.

**Why this is a rule and not a preference.** The alternative loop is: the AI guesses, codes the
guess, the human dislikes it, the AI guesses again. That loop is slow, expensive, and does not
converge, because "I don't like it" is not a bug report and should not have to be. Mocking moves
the iteration from minutes-per-round to seconds-per-round, which is the only thing that makes
subjective decisions tractable.

**Corollary for verification.** A clean build tells you nothing about whether a layout is right.
Anything whose acceptance criterion is visual is not verified until a human has looked at it —
and if the AI cannot run the UI itself, it must say plainly which parts remain unverified rather
than implying the work is done.

**A caution about categories.** Watch for asserting that some pattern is "what applications like
this do". If that claim has not been checked against actual products, it is a preference wearing
a costume.

## Decision Gates

Gates exist for decisions that are **expensive to reverse**. If a choice can be undone in an
afternoon, it does not need a gate — and gating it anyway trains you to rubber-stamp, which
defeats the whole mechanism. There are two tiers.

### Hard stop — stop and wait for approval

- Choosing a framework
- Choosing a database or persistence model
- Choosing hosting / deployment targets
- Adding an authentication system
- Introducing infrastructure components
- Committing to a platform target or its constraints (e.g. extension manifest version,
  minimum OS, store requirements)
- Significant architectural change

For each, the AI provides:

1. Industry-standard approach
2. Simplest alternative
3. Recommendation
4. Tradeoffs (pros / cons)
5. Long-term maintenance impact
6. Risk level

Then it waits. Approved decisions are recorded as an ADR.

### Notify and proceed — say it, then keep going

- Adding a small, well-established dependency
- A refactor local to one module
- Choosing a library-level pattern that could be swapped later
- File / folder structure decisions

The AI states the choice and its reasoning in one line, continues working, and records it in
`docs/handover.md` under open decisions. No ADR, no waiting. You can always object after the
fact — the cost of reversal is the point.

**When unsure which tier applies, ask: could I undo this in an afternoon?** If yes, notify and
proceed. If no, hard stop.

## Engineering discipline

**Version control is the real save state.** Commit small, working increments with clear
messages. Don't let a working feature live only in an editor or a chat. A reasonable default
is one logical change per commit.

**Verification before "done."** Every increment must build and run. The AI confirms the app
loads, the extension installs, or the test passes before calling work complete. Placeholder
output is fine; broken output is not.

**Feature completion rule.** A feature is not complete until three things are true:

1. `docs/backlog.md` is updated.
2. `docs/handover.md` is updated.
3. A demo path exists — you can show the thing working.

For **Large** features only, add: acceptance criteria met, and any technical debt recorded in
the backlog.

## Project structure

Every project using this methodology has the same shape at the top level. The point is that
any project — extension, web, desktop, or mobile — is navigable without orientation, and the
AI can find what it needs from paths alone.

### The fixed part

These paths mean the same thing in every project and must not be renamed or rearranged:

```
<project-root>/
├── AGENTS.md              Always-on rules for the AI. (Copy to CLAUDE.md if your
│                          tool reads that instead — pick one, don't maintain both.)
├── README.md              What this project is and how to run it. Written for a
│                          human arriving cold.
├── ai/
│   ├── methodology.md     This file. Carries the methodology version.
│   └── prompts/           Session prompts, copied from the kit.
├── docs/                  All project documentation. See "Documentation system".
└── <source code>          Layout follows platform convention — see below.
```

Only four documents exist on day one — `AGENTS.md`, `ai/methodology.md`, `docs/handover.md`,
and `docs/backlog.md`. The rest of `docs/` appears as the project earns it. Creating the full
tree upfront violates *simplicity first*.

The kit's own `CHANGELOG.md` is **not** copied into projects; it tracks the methodology, not
your product. A project may keep its own changelog later, for its own releases.

### The variable part

Source layout **follows the platform's own convention** rather than a layout invented here —
this is *industry standards first* applied to folders. A Chrome extension keeps
`manifest.json` at the root; a Vite web app uses `src/`; a mobile project uses whatever its
toolchain generates. Fighting the convention costs you tooling support and confuses every
other developer, including future you.

Sensible defaults when the platform doesn't dictate one:

```
src/            Application code
assets/         Static images, icons, fonts
tests/          Tests, if not colocated with source
scripts/        Build and maintenance scripts
```

Rules that hold regardless of platform:

- **Keep the root uncluttered.** Config files and the fixed paths above. If the root is
  filling up with source files, they belong in a subfolder.
- **Group by feature, not by file type,** once the project outgrows a handful of files.
  `src/treasures/` beats scattering related code across `src/models/`, `src/views/`, and
  `src/utils/`.
- **One folder per bounded concern.** If you can't say what a folder is *for* in a short
  phrase, it's a junk drawer and needs splitting.
- **Never nest deeper than you must.** Three levels below `src/` is a smell.

Record the chosen layout in `docs/tech-stack.md` once it exists — a short "where things live"
section is enough. Choosing it is a *notify-and-proceed* decision: the AI states the layout it
is using and continues. Restructuring an established layout later is a *hard stop*, because by
then it touches every import in the codebase.

## Secrets and personal information

This is a **standing rule, not a stage.** Stage 5 hardening is far too late: a secret
committed at Stage 3 has been in the repository for weeks by then, and the methodology's own
"commit early and often" discipline gets it there fast.

The governing idea is that **git history is permanent and public by default.** Deleting a line
does not remove it from history. Anything committed must be assumed to be permanently visible.

### Never commit

- Secrets of any kind: API keys, tokens, passwords, private keys, connection strings,
  signing certificates, OAuth client secrets.
- Personal information: real names, email addresses, phone numbers, physical addresses, real
  user data. This applies to source code, config, comments, documentation, test fixtures,
  sample data, screenshots, **and commit messages**.
- "Temporarily" is not an exception. A temporary commit is a permanent commit.

### Commit identity

Git records an author name and email on **every commit**, independently of the code. Check
this before the first commit, not after:

- Set the identity per repository rather than relying on a global default:
  `git config user.name "…"` and `git config user.email "…"`.
- For anything that may become public, use a pseudonym and a no-reply or alias address. GitHub
  provides a `@users.noreply.github.com` address for exactly this.
- Verify with `git log --format='%an <%ae>'` before pushing anywhere public.

### Configuration

- `.gitignore` exists from the first commit and covers `.env`, local config, credential files,
  and build artifacts.
- Real values live in `.env`, which is never tracked. `.env.example` is tracked and contains
  placeholder values only — never a real key that "isn't used anymore."
- Test fixtures and sample data use fabricated values. Never copy real user data into the
  repository, even to reproduce a bug.

### Working with an AI assistant

- **Never paste real credentials into a prompt.** Use placeholders. Prompts may be logged or
  retained; assume anything pasted is stored.
- Review what gets staged. `git add -A` sweeps up untracked files including any `.env` that
  slipped past `.gitignore` — check `git status` before committing.
- The AI must not invent realistic-looking credentials or personal details in examples. Use
  obvious placeholders (`YOUR_API_KEY_HERE`, `user@example.com`).

### If something leaks

Treat it as compromised, not as a mistake to tidy up.

1. **Rotate the credential immediately.** This is the only step that actually protects you.
2. Then remove it from the code and, if practical, from history.
3. Record it in `docs/known-issues.md` and note the rotation in `docs/handover.md`.

Deleting the line without rotating leaves a live credential in history. Rotation first, always.

## Documentation system

Start with the minimum (see `README.md`) and add documents as the project grows.

- **`docs/handover.md`** — current state: active work, open decisions, risks, next actions.
  Updated every session. This is the file that makes continuity possible.
- **`docs/backlog.md`** — append-only system of record for all work: features, bugs, tech
  debt, and rejected ideas. Nothing disappears.
- **`docs/known-issues.md`** — bugs: issue, severity, status, workaround.
- **`docs/parking-lot.md`** — good ideas not currently prioritized. Prevents scope creep while
  preserving the idea.
- **`docs/adr/`** — Architecture Decision Records. One per significant decision: context,
  options, decision, rationale, consequences, status.
- **`docs/feature-specs/`** — per major feature: goal, MVP definition, user story, acceptance
  criteria, future enhancements.
- **`docs/milestones/`** — milestone planning (e.g. M1 Skeleton, M2 MVP, M3 Beta,
  M4 Production).

## AI context hierarchy

To keep context lean, read in tiers — not everything, every time.

- **Every session:** `docs/handover.md`, `docs/backlog.md`, `AGENTS.md`
- **When planning:** `docs/product-vision.md`, `docs/architecture.md`, `docs/tech-stack.md`
- **When deciding:** `docs/adr/*`, this methodology

## Session workflow

**Start of session**
1. Read handover, backlog, and `AGENTS.md`.
2. Summarize current state, active work, and risks.
3. Identify quick wins and the next best task.
4. Check for any triggered **hard-stop** Decision Gates before proceeding.

**End of session**
Update `docs/backlog.md` and `docs/handover.md` (and ADRs / known-issues if relevant). Ensure
the repository is self-contained and resumable without any chat history.

## Project health review

At each milestone, evaluate complexity growth, dependency count, documentation completeness,
technical debt, and alignment with vision. Ask: *would I still make these decisions today?* If
not, create backlog items for cleanup.
