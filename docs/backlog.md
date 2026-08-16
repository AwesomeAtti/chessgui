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
| B-002 | chore | P0 | done | Stage 0 — one-page product vision | Approved and committed as `docs/product-vision.md`. Gate passed |
| B-003 | chore | P0 | done | Decision Gate: UI framework / desktop shell | **Tauri 2** + TypeScript frontend. See ADR-0001. Frontend stays Electron-portable via a single IPC adapter module |
| B-004 | chore | P0 | proposed | Decision Gate: local storage / database engine | Hard stop. Local-first, embedded. MVP target 10k games; must not design out a separate reference DB (B-040). **Working assumption (agreed, to confirm at the gate):** one `games` table with hot header fields extracted into indexed columns *and* the original PGN text stored verbatim in the same row — makes lossless round-trip true by construction. See B-058 – B-062 for the schema details this raises |
| B-005 | chore | P1 | done | Decision Gate: chess rules/PGN library vs. own implementation | **Buy jobs 1–2, build job 3.** Rust `pgn-reader` + `shakmaty` for import; TS `chessops` for the open game; `chessground` for the board; no third-party Rust game tree. See ADR-0003 |
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
| B-048 | chore | P0 | proposed | Spike: board render + move interaction while a UCI engine floods stdout | Timeboxed, throwaway. Validates the B-003 shortlist before committing. Risk 2 in handover exists precisely because this is unproven |
| B-049 | chore | P1 | proposed | Decide PGN import fidelity policy: accept / repair / reject malformed input | Vision open question 2. Notify-and-proceed, but must be written down before B-007 is built |
| B-050 | chore | P1 | proposed | Decide whether MVP is read-only or writes annotations | Vision open question 1. Shapes the storage schema, so answer before B-004 is finalised. Read-only-first is simpler; a library you can't write into may not displace anything |
| B-051 | chore | P1 | proposed | Decide whether to bundle an engine (e.g. Stockfish) or require user-supplied | Vision open question 3. Distinct from B-006: that is transport, this is licensing, binary size, signing, per-platform builds |
| B-052 | chore | P2 | done | Decide open-source timing and licence | **GPL-3.0-or-later.** Forced by the chess stack (shakmaty/pgn-reader/chessops/chessground all GPL-3.0+), and aligned with stated intent. See ADR-0002. Public-repo *timing* still open — tracked under B-031 |
| B-057 | chore | P0 | done | Add `COPYING` — full, verbatim GPL-3.0 text | Fetched from the FSF and verified: 674 lines, 35,149 bytes, correct header and closing paragraph. In place before any GPL dependency was added |
| B-065 | chore | P1 | proposed | Add SPDX identifiers (`GPL-3.0-or-later`) to `Cargo.toml` and `package.json` | Split from B-057 — blocked until the manifests exist, i.e. until the M1 skeleton (B-054) is scaffolded |
| B-058 | tech-debt | P1 | proposed | Player identity: separate `players` table with FK, plus name normalisation | Case, accents, `Lastname, Firstname` vs `Firstname Lastname`. Needed for "my Sicilians as Black" (B-010) and for dedupe/merge (B-022). More work up front, much less pain later |
| B-059 | tech-debt | P1 | proposed | Partial-date handling: store raw PGN date string *and* a nullable parsed date | Real PGN routinely carries `2024.??.??` or `????.??.??`. Sorting/filtering needs the parsed value; fidelity needs the original |
| B-060 | tech-debt | P1 | proposed | Store the full PGN tag set as JSON alongside extracted columns | Real files carry `Annotator`, `PlyCount`, `Variant`, `FEN`, `SetUp`, `WhiteTitle`, and site-specific tags. Extract the hot ones; keep everything so nothing is silently dropped. Store `Result` as an integer, not `"1-0"` |
| B-061 | idea | P3 | proposed | zstd-compress stored PGN text | Raw PGN compresses extremely well. Post-MVP; noted so it isn't rediscovered |
| B-062 | idea | P3 | proposed | SQLite FTS5 over player and event names for fuzzy search | Cheap once the store is chosen. Post-MVP |
| B-063 | tech-debt | P2 | proposed | Annual dependency upgrade chore: `pgn-reader` / `shakmaty` 0.x breaking releases | pgn-reader's author describes maintenance as minimal, following shakmaty. Pin versions; expect one upgrade pass per year |
| B-064 | tech-debt | P2 | proposed | Keep the two chess rule implementations consistent (shakmaty vs. chessops) | Accepted cost of the ADR-0003 split. They never arbitrate the same question — Rust at import, TS at interaction — but divergence would be confusing. Consider a shared test corpus |
| B-053 | chore | P0 | proposed | Stage 1 deliverable: core workflows document | The one Stage 1 deliverable the vision does not already cover. 4–6 end-to-end user journeys (import → find → open → play through). Feeds the skeleton's screen list |
| B-054 | chore | P0 | proposed | Milestone M1 — Skeleton: window, static board from FEN, mock game list, navigation | Stage 3. First visible progress. Blocked by B-003. Write `docs/milestones/m1-skeleton.md` |
| B-055 | chore | P1 | proposed | Create `docs/tech-stack.md` and `docs/architecture.md` | Stage 2. Written immediately after B-003/B-004 land, not before — they have nothing to say until then |
| B-056 | idea | P3 | proposed | Position setup by FEN paste as a cheap early board test | Falls out of B-016; useful as a skeleton-stage smoke test before any database exists |

## Rejected / deferred (kept on purpose)

| ID | Type | Status | Description | Why |
|-------|---------|----------|-------------|-----|
| B-034 | idea | rejected | Build our own chess engine | Explicit non-goal. This is a GUI; engines are a solved, specialised problem |
| B-035 | idea | rejected | Become an all-in-one online chess platform (play vs. humans, lobbies, ratings) | Explicit non-goal in the vision. Chess.com/Lichess own this |
| B-036 | idea | deferred | Cloud sync / hosted account for the database | Conflicts with local-first data-ownership stance; revisit only if multi-device demand is real. Would trigger auth + infra gates |
| B-037 | idea | deferred | Mobile / tablet clients | Cross-platform means Windows, macOS, Linux desktop for now |
| B-038 | idea | deferred | Web version of the app | Same reason; also complicates local engine execution |
| B-039 | idea | deferred | Social features: sharing, comments, public collections | Out of scope; the product is a personal library |
