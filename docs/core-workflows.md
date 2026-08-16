# Core workflows

> B-053 — the last Stage 1 deliverable. Written late: it was twice deprioritised as "not on
> the critical path", and the skeleton then got its screen model wrong (B-084). Its stated
> purpose is to feed the screen list, so it now runs ahead of the layout choice (B-087).
>
> Scope: the MVP only — import, find, open, play through (vision §4). Engine analysis,
> annotation and position search appear only where they change a layout decision.

## The user we are designing for

The improving club or tournament player who studies seriously (vision §2). Comfortable with
computers, **not interested in configuring one**. They have a few thousand games accumulated
across online accounts and loose PGN files. They study in sessions of thirty to ninety minutes,
usually with a specific question in mind.

The unit of work is almost never "one game". It is **a question that several games answer.**
That single observation drives most of what follows.

---

## W1 — Get my games in

**Trigger:** first run, or a fresh export from an online account.

1. Open the app for the first time. There is no account, no setup, no configuration wall.
2. Import a PGN file — 3,000 games exported from an online account, or a folder of loose files.
3. Watch it progress; it takes seconds, not minutes.
4. See the games listed, and spot-check that a few look right.

**Must be true:** nothing is silently dropped, malformed games are reported rather than
vanishing (B-049), and re-importing the same file does not create duplicates (B-078).

**Layout demand:** an obvious, first-run-visible way to import, and a progress state that does
not block the window. Low structural demand overall — but this is the moment the "no
configuration wall" success criterion is won or lost.

---

## W2 — Find one game I half-remember

**Trigger:** "the one against that Finnish player where I blundered the exchange — last year
some time, I think I lost."

1. Filter by opponent name. Spelling is uncertain; partial matches must work.
2. Narrow by result and rough date.
3. Scan five or six candidates in the list.
4. Open one. It is the wrong game. Go back and open the next.
5. Recognise it and start studying.

**Must be true:** search is fast enough to explore with rather than query (under 200 ms —
vision §5), and name matching survives spelling and word order (B-058).

**Layout demand — and this is the important one.** Step 4 is a *loop*: scan, open, reject,
open the next. Any layout that makes returning to the filtered list expensive makes this
workflow feel heavy, and this is one of the two most common things the user does.

---

## W3 — Review the game I played last night

**Trigger:** a fresh tournament game, still annoyed about move 27.

1. Find it — it is near the top by date.
2. Open it and play through from the start, following the shape of the game.
3. Jump to the critical moment and go back and forth over it several times.
4. Later (post-MVP) turn on an engine here (B-014), and write a note (B-015).

**Must be true:** move navigation by keyboard is fluid — arrow keys, home, end (B-086). This is
the most repetitive interaction in the whole product and the one most punished by friction.

**Layout demand:** the board wants maximum space, and the move list must be visible next to it
without competing for that space. Nothing else needs to be on screen. This is the workflow that
argues for a dedicated, uncluttered game view.

---

## W4 — Study one opening across many games

**Trigger:** "how do I actually do in the Najdorf as Black?"

1. Filter to games as Black with the relevant ECO codes.
2. Scan the results as a group — how many, how many lost, against what strength.
3. Open one game and play to move 12, where the trouble starts.
4. **Open a second game and compare** the same position handled differently.
5. Move back and forth between the two, and possibly a third.

**Must be true:** filtering composes (player + colour + ECO + result — B-010), and the result
set can be treated as a set rather than a list of unrelated rows.

**Layout demand:** this is the only workflow that genuinely needs **more than one game open at
once**, and it is a core study activity rather than an edge case. It is the strongest argument
for tabs.

---

## W5 — Review a tournament or a period

**Trigger:** "how did the spring season actually go?"

1. Filter by event, or by date range.
2. Scan results and opponents' ratings as a block — the *list itself* is the artefact here.
3. Open two or three games that stand out.

**Must be true:** the list can show the columns that matter and be sorted by them (B-008).

**Layout demand:** the list needs real width — many columns, read as a table. This is the
workflow that pushes hardest *against* a permanently narrow list pane.

---

## W6 — Come back tomorrow

**Trigger:** reopening the app after closing it.

1. It opens where it was left: same window size, same pane proportions, same filter if there
   was one.
2. Pick up without re-navigating.

**Must be true:** window geometry and pane sizes persist (B-085); the database survives restart
(B-011).

**Layout demand:** whatever the layout is, its state must be persistable. Cheap if designed in,
irritating to retrofit.

---

## What this means for the layout (B-087)

Three demands, and they conflict:

| Workflow | Wants |
|---|---|
| W2, W5 | the **list** prominent and wide |
| W3 | the **board** dominant and uncluttered |
| W4 | **several games open at once** |

No single fixed arrangement serves all three well. That is precisely why the products surveyed
in `docs/ui-survey.md` all ended up making layout configurable — the conflict is real, not a
failure of design.

### Testing option C — tabbed documents — against these

- **W4 — excellent.** Tabs are the only option of the four that makes comparing two games
  natural. This is C's reason to exist.
- **W3 — very good.** A game tab is uncluttered and the board gets the space.
- **W5 — very good.** The library tab has the full window width for a wide table.
- **W1 — fine.** Import belongs to the library tab.
- **W6 — fine.** Tab state is persistable, though "restore open tabs" needs deciding.
- **W2 — this is where C strains, and it matters.** The scan → open → reject → next loop
  requires leaving the game tab and returning to the library tab each time. W2 is one of the two
  most frequent workflows, so a small friction is paid constantly.

### The fix — and the first answer was wrong

The initial fix was a **preview board** in the library tab, borrowed from ChessBase's database
window: scan, single-click, see the game, promote to a tab only when it is the right one.

**It was built and then removed.** Every game starts from the same position, so a preview of
the starting position is identical for all 3,412 rows. It looked like information and was not.
Making it useful would mean showing the final position or letting the user scrub — a small game
view, not a preview.

A details panel replaced it, and was removed too: it showed the opponent, event, date and
result that the table's own columns already show, and charged a fifth of the window's width for
the duplication — in the view whose entire job is W5, reading many games at once.

**The answer turned out to be that W2 needs nothing added.** What identifies a half-remembered
game is the opponent, the event, the date and the result, and those are already the table's
columns. The scan loop is: filter, arrow down the rows, Enter on the likely one. Adding a panel
beside the table was solving a problem the table already solved.

**The layout, as built (ADR-0007):**

- a **library tab** — filter bar and a full-width games table, nothing beside it
- **game tabs** — opened deliberately, board dominant, move list beside it, room for an engine
  panel later (B-014)

**Two general lessons.** Borrowing a pattern from a survey is not the same as borrowing the
reason it works — ChessBase's preview earns its place in a product where it can be scrubbed.
And consistency of geometry is worth less than giving each view what it actually needs: a table
and a board want different things, and forcing them into one skeleton cost the table its width.

---

## Deliberately out of scope here

Import from online accounts (B-012, B-013), engine analysis (B-014), annotation (B-015),
position search (B-018), and the reference database (B-040) all have workflows of their own.
They are excluded so that this document describes the MVP rather than the ambition — but W3 and
W4 are written knowing an engine panel arrives later, since retrofitting space for it would
change the layout.
