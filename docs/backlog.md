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
| B-004 | chore | P0 | done | Decision Gate: local storage / database engine | **SQLite. See ADR-0004.** Also **downgraded from hard stop to notify-and-proceed**: PGN files are retained as source of truth and the MVP is read-only (B-050), so the DB holds nothing that exists only there — abandoning it costs a re-import, not data. Gate re-hardens at **B-015** (annotations), when that stops being true. Conditions: DB stays derivable, import idempotent, verbatim PGN in the row, stable row IDs from the first migration. Schema questions B-058 – B-060 are *not* downgraded — decide at B-054 |
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
| B-046 | chore | P1 | proposed | CI on GitHub Actions: build + test matrix across Windows, macOS, Linux | **Promoted from P2 by B-068.** Now the primary guardrail: shipping macOS-first is only reversible if the other two keep *compiling*. GitHub's Windows and Linux runners are free, so build-level divergence gets caught at zero cost even though interactive testing is deferred |
| B-047 | chore | P3 | proposed | Distribute releases via GitHub Releases (installers per platform) | Distribution channel decision is separate from repo hosting; revisit at B-032 |
| B-048 | chore | P0 | done | Spike: board render + move interaction while a UCI engine floods stdout | **Passed — ADR-0001 stands.** Frame time median/p95 17.0 ms (vsync) *identical* engine-stopped vs engine-running; worst frame was lower under load. Events pinned at 10.0/sec, zero drops. Findings in `docs/tech-stack.md`. **Main finding is that the premise was wrong:** Stockfish bursts (~44 lines/sec peak, MultiPV 8) then goes near-silent at depth — no sustained flood. Spike code discarded. Linux half remains B-066 |
| B-066 | chore | P2 | deferred | Repeat the B-048 spike on Linux / WebKitGTK | The actual close-out of handover risk 1. Deferred by B-068 (macOS-first). Until it runs, ADR-0001's Linux assumption is untested, not validated |
| B-068 | chore | P0 | proposed | Release sequencing: all three platforms remain the target; release order gated by testing capacity | **Not a scope reduction.** Cross-platform stays a first-class goal per the vision. The constraint is *verification*, not architecture: only macOS can currently be tested, so macOS releases first. Windows and Linux release as testers become available. All three build in CI from day one (B-046) |
| B-069 | tech-debt | P0 | proposed | Portability guardrails so the untested platforms stay shippable | Leak points: path handling, file dialogs, Cmd vs Ctrl shortcuts, menu-bar conventions, engine binary discovery, line endings. Keep behind abstractions from the start. Cheap now; expensive after a year of implicit macOS assumptions |
| B-070 | chore | P1 | proposed | Recruit Windows and Linux testers | **The actual dependency behind B-068, and previously unrecorded anywhere.** Nothing else unblocks Windows/Linux release. Natural source is the chess community the project already intends to open-source to (B-031) — which gives public-repo timing a functional reason to happen earlier, not just an ideological one |
| B-071 | chore | P1 | proposed | Headless smoke tests on Windows/Linux in CI: app launches, DB opens, PGN imports | Reduces the tester dependency without removing it. Catches the crashes and missing-runtime failures that dominate first-run problems on an untested platform; cannot catch anything about how it looks or feels |
| B-067 | tech-debt | P1 | proposed | Throttle high-frequency backend→frontend streams in Rust, not the frontend | **Validated by B-048 and written up in `docs/tech-stack.md`.** Parse in Rust, keep latest state (overwrite, never append — flat memory by construction), emit on a fixed timer. Measured 10.0 events/sec with zero drops while source rate varied 0–44 lines/sec. Kept at P1 despite the flood being smaller than feared: it costs almost nothing and removes a class of failure. Applies to import progress too, not just engine output. Carry into `docs/architecture.md` when it exists |
| B-049 | chore | P1 | proposed | Decide PGN import fidelity policy: accept / repair / reject malformed input | Vision open question 2. Notify-and-proceed, but must be written down before B-007 is built |
| B-050 | chore | P1 | done | Decide whether MVP is read-only or writes annotations | **MVP is read-only.** Its job is to validate the import path and the look and feel; neither needs writes. Vision §4 and open question 1 amended. **Condition attached:** read-only is a build-order choice, not a schema shape — stable row IDs, verbatim PGN as source of truth, header columns strictly derived, so B-015 can be added without migration. Simplifies the B-004 gate: no edit/drift path to design for at MVP |
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
| B-072 | tech-debt | P1 | proposed | i18n foundation: externalise every user-facing string from commit one | **English is the only locale in MVP; the point is that adding a second is a translation job, not a refactor.** Three guardrails: (1) no user-facing string literals in components — everything through a message catalogue with ICU plural/gender support; (2) the Rust backend returns *error codes*, never English prose — the frontend owns all wording; (3) a pseudo-locale build in CI proves no string escaped and no layout clips. Same economics as B-069: near-free now, a year-long grind later. Sits alongside B-024 (design system) since layout must tolerate ~35% text expansion for German |
| B-073 | tech-debt | P2 | proposed | Separate storage notation from display notation (localised SAN + figurine) | **The chess-specific half of i18n, and the part that would be missed.** SAN piece letters are language-dependent — `Nf3` / `Sf3` (de) / `Cf3` (fr). PGN mandates English SAN on disk, but real exports from German software do not always comply, so import must *tolerate* localised SAN (B-049 fidelity policy) while storage stays canonical English. Display then renders per-locale, with figurine notation as the escape hatch that sidesteps language entirely. Getting this wrong means notation strings leak into the schema |
| B-074 | tech-debt | P2 | proposed | Locale-aware collation, dates, and number formatting | Player-name sorting must use locale collation, not byte order — accents and non-Latin scripts sort wrongly otherwise. Ties directly to B-058 (name normalisation) and B-059 (partial dates): store canonical, format at the edge. Never hand-roll date strings |
| B-075 | chore | P3 | proposed | Decide which locales ship after English | Not urgent — B-072 makes it cheap whenever it happens. Natural first candidates follow the chess world rather than general market size: German, Spanish, Russian, French |
| B-076 | tech-debt | P2 | proposed | Re-test engine output rate under the *realistic* pattern: rapid position changes | B-048 ran one long analysis, which is the quiet case — Stockfish only floods during the shallow-depth phase. A real GUI restarts the search on every move, so clicking quickly through a game replays the burst continuously. That is the untested case, and it is the normal one. Cheap to fold into B-014 |
| B-078 | tech-debt | P1 | proposed | Keep the database derivable: idempotent import, PGN retained as source of truth | **This is the condition ADR-0004 rests on, so it needs an owner rather than good intentions.** Re-importing the same PGN must not duplicate games; dropping the DB and rebuilding must be a supported, tested path. The moment this quietly stops being true, the storage gate re-hardens and nobody notices. A "rebuild database from source PGNs" command is the cheapest way to keep it honest |
| B-079 | chore | P1 | proposed | Build PGN export (B-017) alongside annotation (B-015), not after | Falls out of ADR-0004: annotations are the first data that exists only in the database, which is what re-hardens the storage gate. Export defuses it again by making the DB derivable-in-reverse. Shipping annotation without export creates a window where the user's only copy is in a schema we reserved the right to change |
| B-077 | chore | P2 | proposed | Performance criteria must be median/p95 plus a control, never an absolute max | Lesson from B-048: the agreed "max frame < 16.7 ms" threshold was unattainable by construction at 60 Hz vsync, and macOS Low Power Mode silently capped the machine to 30 fps, nearly producing a false negative against ADR-0001. A plain-browser control on the same machine is what caught it. Record power state and Low Power Mode with any benchmark |

## Rejected / deferred (kept on purpose)

| ID | Type | Status | Description | Why |
|-------|---------|----------|-------------|-----|
| B-034 | idea | rejected | Build our own chess engine | Explicit non-goal. This is a GUI; engines are a solved, specialised problem |
| B-035 | idea | rejected | Become an all-in-one online chess platform (play vs. humans, lobbies, ratings) | Explicit non-goal in the vision. Chess.com/Lichess own this |
| B-036 | idea | deferred | Cloud sync / hosted account for the database | Conflicts with local-first data-ownership stance; revisit only if multi-device demand is real. Would trigger auth + infra gates |
| B-037 | idea | deferred | Mobile / tablet clients | Cross-platform means Windows, macOS, Linux desktop for now |
| B-038 | idea | deferred | Web version of the app | Same reason; also complicates local engine execution |
| B-039 | idea | deferred | Social features: sharing, comments, public collections | Out of scope; the product is a personal library |
