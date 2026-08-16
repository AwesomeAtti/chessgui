# Backlog

> The system of record for **all** work: features, bugs, technical debt, and rejected ideas.
> Append-only — nothing is deleted. Items change status; they don't disappear.

## Conventions

- **ID:** sequential, never reused (e.g. `B-001`).
- **Type:** `feature` · `bug` · `tech-debt` · `chore` · `idea`
- **Priority:** `P0` (now) · `P1` (soon) · `P2` (later) · `P3` (someday)
- **Status:** `proposed` · `approved` · `in-progress` · `done` · `deferred` · `rejected`

Deferred ideas worth keeping but not scheduling can also live in `docs/parking-lot.md`.

## Items

| ID | Type | Priority | Status | Description | Notes |
|-------|---------|----------|-------------|-------------|-------|
| B-001 | chore | P0 | done | Initialize repo with AI-dev starter kit | Methodology, prompts, handover, backlog in place |
| B-002 | chore | P0 | in-progress | Stage 0 — one-page product vision | Draft complete; pending approval to save `docs/product-vision.md` |
| B-003 | chore | P0 | proposed | Decision Gate: UI framework / desktop shell | Hard stop. Cross-platform Win/macOS/Linux. Open — see vision "Decision Gates" |
| B-004 | chore | P0 | proposed | Decision Gate: local storage / database engine | Hard stop. Local-first, embedded. MVP target 10k games; must not design out a separate reference DB (B-040) |
| B-005 | chore | P1 | proposed | Decision Gate: chess rules/PGN library vs. own implementation | Buy-vs-build; language-dependent, so follows B-003 |
| B-006 | chore | P1 | proposed | Decision Gate: engine process management & UCI transport | Hard stop if it becomes a platform-surface commitment (bundled engine, sandboxing, code signing) |
| B-007 | feature | P0 | proposed | PGN import (file + paste) into local database | MVP core. Must survive messy real-world PGN |
| B-008 | feature | P0 | proposed | Game list view with sort and column selection | MVP core |
| B-009 | feature | P0 | proposed | Board + move list; play through a game, navigate variations | MVP core |
| B-010 | feature | P0 | proposed | Header search & filter (player, event, date, result, ECO) | MVP core |
| B-011 | feature | P0 | proposed | Local persistence of the database across app restarts | MVP core |
| B-012 | feature | P1 | proposed | Chess.com import (account/archive) | Post-MVP; API rate limits and pagination |
| B-013 | feature | P1 | proposed | Lichess import (account/study/PGN export) | Post-MVP |
| B-014 | feature | P1 | proposed | UCI engine integration — attach engine, analyse position, show PV/eval | First post-MVP milestone |
| B-015 | feature | P1 | proposed | Annotations: comments, NAGs, variations, editing a game | Requires PGN write path |
| B-016 | feature | P1 | proposed | Create games manually (enter moves, set up position/FEN) | |
| B-017 | feature | P1 | proposed | PGN export (single game, selection, whole database) | Data-ownership commitment; pairs with import |
| B-018 | feature | P1 | proposed | Position search (find games reaching a position / pattern) | Expensive; needs position index (B-042). Design before building |
| B-019 | feature | P2 | proposed | Full-game engine analysis pass (blunder detection, accuracy) | |
| B-020 | feature | P2 | proposed | Collection-level analysis (opening repertoire, results by ECO, trends) | From vision "over time" list |
| B-021 | feature | P2 | proposed | Advanced search: boolean/saved queries, material & endgame filters | |
| B-022 | feature | P2 | proposed | Game management: tags, collections/folders, merge, dedupe, batch edit | |
| B-023 | feature | P2 | proposed | Opening explorer / tree view over the user's own games | |
| B-024 | feature | P2 | proposed | Design system: tokens, dark/light themes, board & piece theming | Vision's "modern" claim depends on this being deliberate |
| B-025 | feature | P3 | proposed | Play against an engine | Explicit "over time" item; not a play platform |
| B-026 | feature | P3 | proposed | Fair-play analysis | Explicit "over time" item. Ethically sensitive — needs its own spec |
| B-027 | feature | P3 | proposed | Endgame tablebase lookup (local or online) | |
| B-028 | feature | P3 | proposed | Opening-book (.bin/Polyglot) support | |
| B-029 | feature | P3 | proposed | Import from ChessBase formats (.cbh/.cbv) | Proprietary, poorly documented — high effort |
| B-030 | feature | P3 | proposed | Training / spaced-repetition on own mistakes | Adjacent product; keep out of core |
| B-031 | chore | P2 | proposed | Open-source readiness: licence, CONTRIBUTING, issue templates, public repo hygiene | Stated intent is to open source for the chess community |
| B-032 | chore | P2 | proposed | Packaging & distribution per platform (installer, signing, notarisation, auto-update) | Cost and friction often underestimated |
| B-033 | tech-debt | P2 | proposed | Import performance target: define & measure (games/sec, DB size ceiling) | Turns "fast" from adjective into number. MVP target: 10k games, filtered search <200 ms |
| B-040 | feature | P2 | proposed | Reference database: millions of master games, read-mostly, bulk-loaded | Post-MVP. Separate store from the personal DB — different shape, different access pattern. Constrains B-004 by requiring it not be designed out |
| B-041 | feature | P2 | proposed | Opening explorer over reference DB: move frequencies + W/D/L statistics | The reason B-040 exists. Depends on B-040 and B-042 |
| B-042 | tech-debt | P2 | proposed | Position index design (Zobrist-style hashing, dedupe, storage cost) | Shared foundation for B-018 and B-041. Spec before building either |
| B-043 | chore | P0 | proposed | Source data for reference DB: find a masters game set with redistributable licensing | Blocks B-040. Licensing and download size are the real constraints, not the code |
| B-044 | chore | P0 | done | git init, secrets hygiene, per-repo pseudonymous commit identity, push to GitHub | Initial commit `99a6079` pushed to `origin/main`. Identity verified pseudonymous; `.DS_Store` excluded |
| B-045 | chore | P2 | proposed | GitHub repo hygiene: branch protection, issue/PR templates, CODEOWNERS, Dependabot | Do when the repo goes public, not before |
| B-046 | chore | P2 | proposed | CI on GitHub Actions: build + test matrix across Windows, macOS, Linux | The only thing that keeps "cross-platform" honest. Follows B-003 |
| B-047 | chore | P3 | proposed | Distribute releases via GitHub Releases (installers per platform) | Distribution channel decision is separate from repo hosting; revisit at B-032 |

## Rejected / deferred (kept on purpose)

| ID | Type | Status | Description | Why |
|-------|---------|----------|-------------|-----|
| B-034 | idea | rejected | Build our own chess engine | Explicit non-goal. This is a GUI; engines are a solved, specialised problem |
| B-035 | idea | rejected | Become an all-in-one online chess platform (play vs. humans, lobbies, ratings) | Explicit non-goal in the vision. Chess.com/Lichess own this |
| B-036 | idea | deferred | Cloud sync / hosted account for the database | Conflicts with local-first data-ownership stance; revisit only if multi-device demand is real. Would trigger auth + infra gates |
| B-037 | idea | deferred | Mobile / tablet clients | Cross-platform means Windows, macOS, Linux desktop for now |
| B-038 | idea | deferred | Web version of the app | Same reason; also complicates local engine execution |
| B-039 | idea | deferred | Social features: sharing, comments, public collections | Out of scope; the product is a personal library |
