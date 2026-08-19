# UI survey — how existing chess GUIs are laid out

> Written at B-087, after two coded layouts were rejected in one session. The purpose is to
> replace "I don't like it" with shared vocabulary, and to replace my guesses with what the
> category has already converged on.

## The finding that matters most

**Every mature product in this category made layout user-configurable, and did so
deliberately.** This is not a detail of their implementations — it is their answer to the same
problem we just hit.

- **ChessBase 18** ships *predefined layouts* for different purposes and lets the user save
  their own. Panes are dragged by their title bar and rearranged freely, and each pane can be
  switched off entirely. Layouts are saved and reloaded from the View menu, including engine
  configuration.
- **Scid vs. PC** offers *five layout slots*, three of them user-defined and savable. The game
  list docks to whichever side has the most width and can be dragged anywhere.
- **Lichess** is the exception that proves it: a fixed layout, and its most recent redesign drew
  sustained complaints precisely because the side panel took space from the board and could no
  longer be easily collapsed. A browser extension exists largely to restore the ability to hide
  panels.

So the conclusion is not "we picked the wrong layout". It is that **layout in this category is
genuinely subjective and workflow-dependent, and the products that survived treat it as a
setting rather than a decision.** Two rejected layouts in one session is the expected outcome of
trying to pick one correct answer to a question that does not have one.

## The structural patterns

### 1. Two contexts — ChessBase

A **database window** (the "control centre": folder tree on the left, databases on the right, a
preview pane showing a games list) and a separate **board window** (board, notation, engine,
reference, book, photos — a dozen optional panes). They are different windows for different
activities. Opening a game moves you from one to the other.

Notation itself is tabbed — full notation, table notation, score sheet, training, book,
reference — which is how ChessBase fits so much into one pane.

### 2. Tabbed documents — Scid vs. PC

A tabbed document interface: game lists and game windows are tabs in one window, in the manner
of a code editor. Multiple games open at once, switchable. Keyboard navigation through a game
is Left/Right/Home/End; double-click or Ctrl+Enter loads a game from the list.

### 3. Single fixed page — Lichess

Board on one side, a stacked side panel on the other holding move list, engine evaluation and
opening explorer. Nothing is dockable. Simple and immediately legible; the complaints are about
inflexibility, not comprehensibility.

### 4. Master–detail — what we built second

List permanently on the left, selection populating board and moves on the right. Common in
mail and file managers; **notably, not what any of the dedicated chess databases actually do.**
Worth recording, since it was asserted in this project as the obvious answer and the survey does
not support that.

## What the criticism says

ChessBase is described in the wider community as convoluted, built on an MS-Word-like design,
unintuitive, and dated-looking despite running on fast hardware — the result of forty years of
accumulated features. Scid vs. PC is described as capable but visually dated. Yet ChessBase
retains its users, because nothing matches its functionality.

**That gap is the opportunity in the product vision, and it is specific rather than vague.** The
complaint is not that these tools lack features. It is that the interface is dense, dated, and
hard to approach. "Modern" for this product therefore means restraint and clarity at a
comparable level of capability — which is a design brief, not an adjective, and goes some way to
answering handover risk 2.

## Implications for chessgui

1. **Do not try to pick the one correct layout.** Pick a good default and offer a small number
   of presets. Full dockable panes are a large feature and not an MVP concern; two or three
   named presets capture most of the benefit for a fraction of the cost.
2. **Panels must be collapsible.** The single loudest complaint about the newest layout in this
   category is a panel that cannot be hidden and steals space from the board.
3. **The board is the thing that should get the space.** Every layout in every product treats
   board size as the scarce resource that everything else competes for.
4. **Keyboard navigation is expected**, not a nicety: Left/Right/Home/End through a game is
   universal (B-086).
5. **Decide the "two contexts vs. one window" question deliberately** — it is the biggest
   structural fork, it is what ChessBase and Scid answer differently, and it is much harder to
   change later than pane proportions.

## Import: where paste lives, and where a failure goes

> Added at B-007 milestone 3, for the same reason as the rest of this file — the question was
> "where does a paste target live", and the honest answer was that nobody here had checked.

| Product | Where paste lives | Where a failure goes |
|---|---|---|
| **Scid vs. PC** | Tools ▸ *Import PGN text*, its own window. Separately Edit ▸ *Paste PGN* (clipboard, one game, no dialog) and Tools ▸ *Import PGN file* | **A second frame in the same window, below the text**: "the lower frame provides feedback of any errors or warnings" |
| **ChessBase 18** | **Nowhere — there is no paste target at all.** It watches the clipboard and opens a board window when it sees a game; a FEN opens the position dialog | Not documented. The *clip database* is a staging area for **selecting** games, not for reviewing an import |
| **Lichess** | A dedicated page, `/paste`: text box plus file upload, one game at a time | A message on the same page |
| **En Croissant** | *Add Database* dialog from the Databases page, with **Local / Web / Accounts tabs** — file-oriented, no paste box | Not documented |

**Three findings, and the first two would have been guessed wrong.**

1. **Two of the four have no paste box.** The instinct that "an import feature needs somewhere to
   paste" is not what the category converged on: ChessBase watches the clipboard, En Croissant is
   entirely file-and-account oriented. A paste target is a convenience, not the front door.
2. **The newest product organises import by *source*, as tabs** — which is the shape this project's
   own roadmap already needs (milestone 4 file, B-012 chess.com, B-013 lichess). That is what
   decided the "Add games" dialog over an import tab or an in-place strip.
3. **The only product that documents its failure surface puts it in the same window, under the
   input.** None of the four shows a modal "here is what happened".

### File import: nobody stages, and that is worth knowing before you build a list

> Added at B-007 milestone 4. The question was "does an import dialog let you review the files
> before it acts", and the answer is no — which is the opposite of what the first mockup assumed.

| Product | Choosing files | Staged before importing? |
|---|---|---|
| **Scid vs. PC** | Tools ▸ *Import PGN file*, **multi-select** — "several PGN files can be selected in this dialogue at once" | **No.** The OS dialog is the review step; feedback appears in a frame below |
| **En Croissant** | *Add Database* ▸ "Click to select a PGN file" — **one file** | **No.** Straight to conversion, with a progress readout (games imported, games/sec) |
| **Lichess** | `/paste`: a text box or a single file upload | **No.** It imports and navigates you to the game |
| **ChessBase** | Drag-and-drop is widely described; **not confirmed in its own documentation**, so recorded as unverified rather than repeated | Unknown |

**Three findings.**

1. **No product in this category stages a file list.** The instinct to build one comes from photo
   libraries — Lightroom's import grid exists to choose *which* of 400 card images to take — and a
   PGN import has no equivalent question, because the user already picked the files by name.
2. **Multi-select is the norm where it is documented, and one-at-a-time is not a safety measure**
   — En Croissant's single file is about database size, not caution.
3. **Where feedback goes is settled by the same rule as paste**: in the window, under the input,
   never a modal announcing success.

**What we did anyway, and why it is not a contradiction.** chessgui stages the list, on the owner's
call, because **the drop path has no OS dialog in front of it.** A drag is a gesture that is easy to
make by accident; a file picker is a deliberate act with its own confirm button. Naming what was
caught *is* the confirmation, which is why there is no separate "import 3 files?" prompt in front of
it — and the picker fills the same list so that the two entry points cannot behave differently. The
survey's finding stands for products whose only entry point is a picker.

### The outcome is a separate decision from the entry point

General UX guidance is to match intrusiveness to criticality: simple confirmations get the least
disruptive surface, results needing action get more, dialogs are reserved for the most critical.
**A two-step modal ending in a result screen is the convention of installers and setup wizards** —
one-off linear flows — and importing games into a library is a repeated action.

So the shipped answer is asymmetric on purpose: **every import leaves a record in a strip above the
table, and only an import with something to act on holds the dialog open first.** Stated as a rule
so it does not read as inconsistency: *the strip always records; the dialog additionally stops you
when there is a decision.*

**One caveat recorded rather than buried:** the chess-category evidence here is four products and
their own documentation, not usability data. Better than taste, weaker than a study. Apple's HIG page
on modality could not be read at all — JavaScript-rendered, the fetch returned only the header — so
no Apple guidance is reflected above.

## Sort and filter: where the controls live (B-008/B-010)

> Added ahead of B-008/B-010 (game list sort, column selection, composed filters). The question
> was "header row, header popover, or a separate panel", and the honest answer is that the
> category and general table UX literature converge on **sort** but split three ways on
> **filter**.

**Sort is settled — nobody disputes this one.** Every source, chess-specific or general,
converges on the same mechanism: click a column header to sort ascending, click again for
descending, an arrow indicator shows direction. Scid vs. PC does exactly this ("the database can
be permanently sorted by clicking column titles" — though notably its sort *mutates the file*,
which we do not want to copy). The general pattern (ui-patterns.com's Sort By Column) says the
same thing and adds that it's meant for tables over ~10 rows, which describes this one at any
size past the empty state.

**Filter has three real patterns in use, not two.**

1. **Persistent per-column row** (Option A). Not observed in any surveyed chess product. General
   UX sources describe it as the alternative to a dropdown-triggered filter, immediate (no
   "Apply" button needed), but explicitly called out as **the one that scales worst** — a
   commenter on ui-patterns.com's Table Filter pattern notes it gets unwieldy as columns and
   distinct values grow, which is exactly this table's shape at 3,412+ rows.
2. **Per-column header popover** (Option B). Not observed in the chess category either — no
   surveyed product puts filter controls in the header at all. It is a known general-web pattern
   (Material React Table and similar component libraries ship it) but isn't validated by any
   product in this specific category.
3. **A separate filter surface, composed and shown as active-filter state** — what both
   chess-specific products with real search actually do, and what the general "modern app"
   examples (Notion, and by reputation Airtable/Linear) also do. **ChessBase**: a single-line
   quick search by default, with an "Advanced" mode opening a dedicated search mask for composed
   criteria — headers are not involved. **Scid vs. PC**: one combobox with AND-style syntax
   (`Kasparov+Karpov`), Reset/Negate buttons, no per-column UI at all. **Notion**: filters live
   behind a toolbar "Filter" control, each active filter renders as a removable chip, and
   multiple filters compose with AND/OR, nestable up to three groups.

**Reading across all of it:** the chess category has never put filtering in the table headers —
both products that filter well do it through one search surface, quick-search first and
"advanced" for composed criteria second. The general software world's clearest "modern" example
(Notion) does the same shape: one entry point, filters render as chips once applied, not
permanent chrome. That's a third option worth weighing against A and B — call it **Option C**:
keep the existing free-text box as the quick path, add a "Filter" control next to it that opens
composed player/event/date/result/ECO criteria, and render active filters as removable chips in
the filter bar. It reuses the Add-games dialog's own visual language (a small composed form)
rather than inventing header chrome, and it's the only one of the three with a working precedent
in this specific product category.

**Caveat carried over from the import survey:** this is what the products' own documentation
says, not usability research on this table specifically, and Airtable's own docs didn't yield
detail on its sort/filter controls despite being cited by reputation as chip-based — recorded as
unconfirmed rather than repeated.

### Widening past the chess niche: is Option C a chess artifact, or the general pattern?

> Chess database software is a small category — three products is a thin sample to generalise
> from. Checked against issue trackers, project tools, and general table-UX guidance, which
> between them have a far larger user base and more design iteration behind them.

**GitHub Issues.** A hybrid, but header filtering is not part of it: labelled dropdowns
("Filters", "Assignees", "Labels") sit in a bar above the list, plus a text query bar supporting
`AND`/`OR` and parenthesised grouping for power users (`label:"bug" AND assignee:octocat`),
plus a **separate** sort dropdown. Every active filter is reflected in the URL query string, so a
filtered, sorted view is a link. No column-header controls anywhere.

**Linear.** Splits the two concerns explicitly rather than treating them as one feature: a
top-right **"Display options"** menu covers sort/group/which-properties-show, and a **separate
Filters** entry point (sidebar) "refines the list to only issues with certain properties" —
Linear's own docs draw this line in those words. Filters and display settings can each be saved
as a default. Again, nothing lives in a column header.

**General enterprise/SaaS table-UX guidance** (Pencil & Paper's filter-pattern analysis, the
HashiCorp Helios design system's filter patterns) converges on the same three positioning
options, independent of any specific product: a **filter bar** (one or more dropdowns/buttons in
a horizontal strip above the table — rated the common, medium-complexity default), a **sidebar**
(better for many nested categories or page-wide filtering across several components), and
**inline/header filtering** — which both sources treat as a real option for a *wide table with
many columns where each filter needs maximum context*, but neither treats as the default; it's
the specialised choice, not the common one. Every source that discusses applied-filter display
agrees on the same convention regardless of position: show each active filter as a dismissible
chip/tag.

**Conclusion: Option C is not a chess-category artifact — it's the pattern nearly every
mature list/table UI converges on, chess or otherwise.** A filter bar (or, per GitHub/Linear, a
filter entry point plus an independent sort control) with composed criteria and chip-rendered
active filters is what GitHub, Linear, Notion, ChessBase, and general enterprise table-UX
guidance all separately arrive at. Column-header filtering (Option A/B) shows up only in
component-library demos (Material React Table and similar), not in any shipped product surveyed
here across either category — it's a thing table libraries *can* do, not a thing widely-used
products *choose to* do. Sort-by-header-click stays well supported on its own (this table is
genuinely a table, unlike Linear's issue list), but composed filtering should not live in the
headers.

## Sources

- [Board window — ChessBase 18](https://help.chessbase.com/CBase/18/Eng/board_window.htm)
- [Database window — ChessBase 18](https://help.chessbase.com/CBase/18/Eng/database_window.htm)
- [Clip database — ChessBase 18](https://help.chessbase.com/CBase/18/Eng/clip_database.htm)
- [Main menus — Scid vs. PC](https://scidvspc.sourceforge.net/doc/Menus.htm) (the multi-select note)
- [Managing databases — En Croissant](https://encroissant.org/docs/guides/manage-repertoire)
- [Import game — Lichess](https://lichess.org/paste)
- [Automatically paste PGN and FEN — ChessBase](https://help.chessbase.com/cbase/17/eng/automatically_paste_pgn_and_fe.htm)
- [Scid vs. PC — Main Menus](https://scidvspc.sourceforge.net/doc/Menus.htm)
- [Scid vs. PC — the Import window](https://scidvspc.sourceforge.net/doc/Import.htm)
- [En Croissant — Games and databases](https://franciscobsalgueiro-en-croissant.mintlify.app/features/games-and-databases)
- [Scid vs. PC — Sorting the Game List](https://scidvspc.sourceforge.net/doc/GameList.htm) (sort-by-header-click, permanent; unified filter combobox with AND syntax, Reset/Negate)
- [ChessBase — Database search basics](https://en.chessbase.com/post/getting-the-most-out-of-chessbase-15-a-step-by-step-guide-11-database-search-basics) (single-line quick search, Advanced opens a search mask — not header-based)
- [Notion — Database views, filters, sorts & groups](https://www.notion.com/help/views-filters-and-sorts) (toolbar filter menu, chips, AND/OR groups up to 3 deep)
- [Sort By Column — ui-patterns.com](https://ui-patterns.com/patterns/SortByColumn) (click-to-sort, arrow indicator, use above ~10 rows)
- [Table Filter — ui-patterns.com](https://ui-patterns.com/patterns/TableFilter) (dropdown/header-row filter tradeoffs; a persistent per-column row scales worst)
- [Design better data tables — Andrew Coyle](https://www.andrewcoyle.com/blog/design-better-data-tables) (catalogue of table interaction patterns, no scale ranking given)
- [Filtering and searching issues and pull requests — GitHub Docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests) (dropdown filter bar + query syntax + separate sort, URL-persisted)
- [Display options — Linear Docs](https://linear.app/docs/display-options) (sort/group as "Display options", Filters as a separate, distinct entry point)
- [UX Pattern Analysis: Enterprise Filtering — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering) (filter bar vs. sidebar vs. inline/header, scored by scalability and use case)
- [Filter patterns — Helios Design System (HashiCorp)](https://helios.hashicorp.design/patterns/filter-patterns) (filter bar vs. sidebar; dismissible-tag convention for applied filters)
- [Sheets vs. dialogs vs. snackbars: what to use when — LogRocket](https://blog.logrocket.com/ux-design/sheets-dialogs-snackbars/)
- [ChessBase 18 — Standard Layout or Custom Layout](https://en.chessbase.com/post/chessbase-18-beginner-s-tips-part-10-standard-layout-or-custom-layout)
- [Scid vs. PC — README](https://scidvspc.sourceforge.net/README.html)
- [Scid vs. PC — Sorting the Game List](https://scidvspc.sourceforge.net/doc/GameList.htm)
- [SCID — Chess Programming Wiki](https://chessprogramming.org/SCID)
- [Recent Study UI update makes coaching difficult — Lichess feedback](https://lichess.org/forum/lichess-feedback/recent-study-ui-update-makes-coaching-difficult)
- [GUIs compared — Chess.com forums](https://www.chess.com/forum/view/chess-equipment/guis-compared)
- [En Croissant](https://encroissant.org/)
