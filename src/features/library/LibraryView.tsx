/**
 * The library tab: a filter bar and a full-width games table.
 *
 * The table gets the full window width because W5 — reading a tournament or a season as a
 * table — is the workflow that pushes hardest against a narrow list. That requirement is why
 * the library is its own tab rather than living inside the side panel.
 *
 * **No side panel here — the table owns the whole window.** The fixed right panel belongs to
 * the game view only (ADR-0007, amended).
 *
 * Two things were tried in that space and both were removed. A preview board first: every
 * game starts from the same position, so a preview of the starting position is identical for
 * all 3,412 rows and carried no information. Then a details panel: better, but it duplicated
 * what the table columns already show, and it cost the table roughly a fifth of its width in
 * the one view whose entire job is reading many games at once (W5).
 *
 * The table is the artefact in this view. Everything else was competing with it.
 *
 * Single-click selects; Enter or double-click opens the game in a tab.
 *
 * Filtering is a single text match for now. Composed filters — colour, result, ECO, date
 * range — are B-010 (Option C: a "Filter" panel plus chips, not header controls — see
 * `docs/ui-survey.md`), and virtualisation for 10k rows is B-033. The scroll container and the
 * fixed table layout are here already so neither is a restructure.
 *
 * **Sort (B-008, milestone 1) is TanStack Table, for sorting only.** `sorting` defaults to `[]`,
 * which TanStack renders as the underlying array order — identical to what this view rendered
 * before sorting existed, so an unsorted table looks and behaves exactly as it did.
 *
 * **Column visibility (B-008, milestone 2) is right-click-on-header, not a toolbar button.**
 * Surveyed against both web-app tables (MUI X, TanStack's own docs, GitHub Issues, Linear,
 * Notion — all converge on a toolbar "Columns" button) and native desktop tables (Windows
 * Explorer, Outlook, AG Grid/DevExpress-style enterprise grids — all converge on right-click the
 * header). The owner picked the desktop convention since chessgui is a desktop app, not a web
 * app that happens to run in a browser. `White`, `Black`, and `Result` are locked visible
 * (`enableHiding: false`) — they're what makes a row identifiable at all, and their permanent
 * presence is also what guarantees a header is always available to right-click even when every
 * optional column is hidden, so there is never a need for a separate "more columns" affordance.
 * The composed filter panel (B-010) is a later, unrelated milestone — see `docs/ui-survey.md`.
 *
 * **Reorder, resize, default order, and reset (B-008 milestones 3, 6, 5, 4) all landed together**
 * (session 13), because the owner asked for them as one pass rather than one PR per item.
 * Surveyed the same way milestone 2 was, and corrected once during that survey: the first mockup
 * put a Notion/Trello-style grip icon on every header as the drag handle, which turned out to be
 * a web-app habit, not a desktop one — asked, checked, and confirmed against Windows Explorer and
 * Excel. Explorer's own convention is dragging the header cell itself (no grip), which is what's
 * built here (draggable lives on `.th-sort`, not a separate handle). Column resizing follows the
 * same "no new dependency" line as milestones 1–2 — TanStack's built-in `columnSizing` state, a
 * `.col-resizer` strip at each resizable header's trailing edge. `Elo` (both), `Result`, `Date`,
 * and `ECO` are locked (`enableResizing: false`, `size === minSize === maxSize`) per the owner's
 * request — short, fixed-format tokens that never need to flex; `White`, `Black`, and `Event` stay
 * resizable within a min/max range, since free text genuinely varies in how much room it needs.
 * Every column's default `size` is sized generously enough that its own header label never
 * truncates (checked headlessly, not eyeballed — see the verification note in the B-008 backlog
 * entry). **Reordering has no keyboard-accessible alternative** — plain HTML5 drag-and-drop has
 * none, and the owner explicitly chose to skip building one (Explorer's own fallback is a
 * Move-Up/Move-Down button pair in its column chooser) rather than add it this pass. Worth
 * revisiting if it turns out to matter.
 *
 * **Two bugs found on the owner's own machine (session 14), neither visible in the sandbox's
 * headless Chromium, both fixed here:**
 *
 * 1. **Reordering didn't work at all.** Built on native HTML5 drag-and-drop originally, which
 *    worked in headless Chromium (Playwright's synthetic input goes through Chromium's own input
 *    pipeline, which still runs the browser's native DnD state machine) but not in the real app's
 *    WKWebView. The likely cause: this app already registers Tauri's own window-level native
 *    drag-and-drop for PGN file imports (`ImportDialog`'s Files tab, and the paste/drop listener
 *    in `App.tsx`) — Tauri intercepting OS-level drag sessions ahead of the webview is a known
 *    source of conflicts with the browser's own HTML5 `draggable` API, and disabling Tauri's
 *    drag-drop isn't an option here since file-drop import depends on it. Fixed by dropping HTML5
 *    DnD entirely for column reordering and hand-rolling it from `mousedown`/`mousemove`/`mouseup`
 *    instead — the same mechanism already used for resizing (`header.getResizeHandler()`), which
 *    never had this problem for exactly that reason.
 * 2. **Resizing one column moved locked ones too.** A `<table style="table-layout: fixed">` whose
 *    `<colgroup>` gives every column an explicit width, and whose own resolved width (`100%`)
 *    doesn't equal the sum of those widths, is required by the CSS table-layout algorithm to
 *    distribute the difference across *every* column, evenly — locked columns included, since
 *    "locked" isn't a concept CSS tables have. Fixed by giving the `<table>` itself an explicit
 *    pixel width computed in JS (`tableWidth`, the sum of every visible column's rendered width)
 *    instead of `100%`, and giving every `<col>` — `event` included — an explicit pixel width too,
 *    so there is never any slack left for the browser to redistribute. `event` is the designated
 *    fill column: a `ResizeObserver` on the scroll container feeds a live `containerWidth`, and
 *    `event`'s width is `containerWidth` minus every other visible column's width
 *    (`eventFillWidth`) as long as the owner hasn't resized it directly. Once the owner drags
 *    `event`'s own resize handle (`eventManuallyResized` flips true), its width becomes
 *    `max(the size they dragged to, eventFillWidth)` — respecting their chosen minimum while still
 *    growing to fill extra room — via a dedicated hand-rolled resize handler
 *    (`eventResizeRef`/`EVENT_MIN_SIZE`/`EVENT_MAX_SIZE`) rather than TanStack's built-in
 *    `header.getResizeHandler()`, because that handler's drag-delta math starts from the column's
 *    internal `columnDef.size` rather than its actual auto-filled rendered width and so couldn't
 *    grow it correctly. Every other column — locked or not — renders at exactly the pixel width
 *    its own state says, full stop; "Reset columns" also resets `eventManuallyResized`.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnOrderState,
  type ColumnSizingState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useTranslation } from "react-i18next";

import { formatPgnDate } from "@/i18n/format";
import { GameResult, type GameId, type GameSummary } from "@/model/game";

import { ImportStrip } from "./ImportStrip";
import type { ImportReport } from "./importReport";

interface LibraryViewProps {
  games: readonly GameSummary[];
  query: string;
  onQueryChange: (query: string) => void;
  selectedId: GameId | null;
  onSelect: (id: GameId) => void;
  onOpen: (id: GameId) => void;
  /**
   * Open the Add games dialog, optionally prefilled.
   *
   * The prefill is what makes a paste into the library an import: the dialog is the home for
   * importing, and pasting is a shortcut into it rather than a second way of doing it.
   */
  onAddGames: (prefill?: string) => void;
  /**
   * The last import's outcome, or null once dismissed.
   *
   * It sits here rather than in the dialog because dismissing the dialog must not be the end of
   * the record — that was the reported problem. Every import leaves a line above the table; only
   * the ones that need acting on interrupt with the dialog's result step first.
   */
  importReport: ImportReport | null;
  onDismissReport: () => void;
}

function resultKey(result: GameSummary["result"]) {
  switch (result) {
    case GameResult.WhiteWin:
      return "notation.whiteWin" as const;
    case GameResult.BlackWin:
      return "notation.blackWin" as const;
    case GameResult.Draw:
      return "notation.draw" as const;
    default:
      return "notation.unknownResult" as const;
  }
}

/** Sort direction glyphs. Bare glyphs, not prose — `check:i18n` only gates letters. */
const SORT_GLYPH = { asc: "▲", desc: "▼", none: "↕" } as const;
/** Checkbox glyphs for the column-visibility menu. Same reasoning as `SORT_GLYPH`. */
const CHECK_GLYPH = { on: "☑", off: "☐" } as const;

const columnHelper = createColumnHelper<GameSummary>();

/**
 * `whiteElo` and `blackElo` share one header label ("Elo") because their position next to
 * `White`/`Black` disambiguates them in the table — that's out of scope here. In the
 * column-visibility menu they're a flat list with no such positional context, so they need
 * distinct labels there. Every other hideable column's own header text is unambiguous alone.
 * Returns the catalogue key to look up, or null to fall back to the column's own header text.
 */
function columnMenuLabelKey(id: string) {
  if (id === "whiteElo") return "library.columnMenu.whiteElo" as const;
  if (id === "blackElo") return "library.columnMenu.blackElo" as const;
  return null;
}

/**
 * Move `draggedId` to sit where `targetId` currently is, within `order` (every leaf column id,
 * visible or not — see the call site for why it has to be *every* id and not just the visible
 * ones). A no-op, returning the same array, if either id is missing or they're identical.
 */
function reorderColumn(
  draggedId: string,
  targetId: string,
  order: readonly string[],
): string[] {
  if (draggedId === targetId) return order.slice();
  const from = order.indexOf(draggedId);
  const to = order.indexOf(targetId);
  if (from === -1 || to === -1) return order.slice();
  const next = order.slice();
  next.splice(from, 1);
  next.splice(next.indexOf(targetId), 0, draggedId);
  return next;
}

// `event`'s min/max, duplicated as named constants (rather than read off its columnDef at the
// call site) because the hand-rolled resize handler below needs them in an effect registered
// once on mount, before any header object exists to read them from.
const EVENT_MIN_SIZE = 120;
const EVENT_MAX_SIZE = 640;

export function LibraryView({
  games,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  onOpen,
  onAddGames,
  importReport,
  onDismissReport,
}: LibraryViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const activeRow = useRef<HTMLTableRowElement | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  // Empty means "use the column-def order above" (Date first) — also what "Reset columns"
  // restores, so no separate DEFAULT_COLUMN_ORDER constant is needed.
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  // Screen position only; which column was right-clicked doesn't matter (see the file doc
  // comment) — the menu always lists every hideable column, not just the one under the cursor.
  const [columnMenuAt, setColumnMenuAt] = useState<{ x: number; y: number } | null>(null);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  // Drag-to-reorder (session 13, hand-rolled from mouse events since session 14 — see the file
  // doc comment on why HTML5 DnD doesn't work in the real app). `draggedColumnId`/`dropTargetId`
  // are state purely so the dragged/hovered headers can be styled; the drag's actual live state
  // (which column, whether the movement threshold has been crossed yet, which header is under
  // the cursor right now) lives in `dragRef` instead, read fresh by the window-level listeners
  // registered once below — using state there would mean re-subscribing those listeners on every
  // mouse move, or reading stale values through a closure captured when the drag started.
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    active: boolean;
    overId: string | null;
  } | null>(null);
  // Every leaf column id in current order, refreshed every render so the mouseup handler below
  // (registered once, on mount) always reorders against the live order rather than the order at
  // the moment the drag started.
  const allLeafColumnIdsRef = useRef<string[]>([]);
  // The `.table-scroll` pane's live width, for sizing the `event` fill column — see where it's
  // used, below the row-model calculations. JS-measured rather than CSS `100%` on the table
  // itself on purpose (same file doc comment): a `<table>` whose own width isn't an exact number
  // is what let the browser's fixed-layout algorithm redistribute space across every column,
  // locked ones included. `useChessground.ts` measures the board the same way and for the same
  // reason — this isn't a new pattern for the codebase.
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (el === null) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width !== undefined) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Whether `event` has ever been resized directly, vs. just sitting at its auto-fill width —
  // see where `eventWidth` is computed, below, for why this can't be inferred from `columnSizing`
  // alone. Hand-rolled from mouse events rather than TanStack's own `getResizeHandler()`, for the
  // same reason reordering is: `getResizeHandler()` computes its drag delta against the column's
  // internal tracked size, which is `event`'s un-boosted default (e.g. 220) whenever it's sitting
  // at its (larger) auto-fill width instead — dragging would silently do nothing until the delta
  // closed that gap. This starts every drag from wherever the handle is actually rendered.
  const [eventManuallyResized, setEventManuallyResized] = useState(false);
  const [eventResizing, setEventResizing] = useState(false);
  const eventResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const drag = eventResizeRef.current;
      if (drag === null) return;
      const next = Math.min(
        EVENT_MAX_SIZE,
        Math.max(EVENT_MIN_SIZE, drag.startWidth + (event.clientX - drag.startX)),
      );
      setColumnSizing((prev) => ({ ...prev, event: next }));
    };
    const onUp = () => {
      eventResizeRef.current = null;
      setEventResizing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return games;
    return games.filter((game) =>
      [game.white.name, game.black.name, game.event ?? "", game.eco ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [games, query]);

  // Column defs live inside the component: cells need `t` and `locale` (date formatting,
  // result glyphs), and both can change at runtime once a second locale ships (B-075).
  const columns = useMemo(
    () => [
      // Date first (owner's requested default order, session 13) — everything else keeps its
      // prior relative order. Locked: short, fixed-format text ("Aug 2025") never needs to flex.
      columnHelper.accessor((game) => game.date.parsed ?? game.date.raw, {
        id: "date",
        header: t("library.columns.date"),
        meta: { className: "col-date" },
        size: 100,
        minSize: 100,
        maxSize: 100,
        enableResizing: false,
        cell: (info) => formatPgnDate(info.row.original.date, locale) ?? t("date.unknown"),
      }),
      columnHelper.accessor((game) => game.white.name, {
        id: "white",
        header: t("library.columns.white"),
        enableHiding: false,
        size: 160,
        minSize: 110,
        maxSize: 420,
        cell: (info) => <span title={info.getValue()}>{info.getValue()}</span>,
      }),
      columnHelper.accessor("whiteElo", {
        id: "whiteElo",
        header: t("library.columns.elo"),
        meta: { className: "col-elo" },
        size: 56,
        minSize: 56,
        maxSize: 56,
        enableResizing: false,
        cell: (info) => info.getValue() ?? "",
      }),
      columnHelper.accessor((game) => game.black.name, {
        id: "black",
        header: t("library.columns.black"),
        enableHiding: false,
        size: 160,
        minSize: 110,
        maxSize: 420,
        cell: (info) => <span title={info.getValue()}>{info.getValue()}</span>,
      }),
      columnHelper.accessor("blackElo", {
        id: "blackElo",
        header: t("library.columns.elo"),
        meta: { className: "col-elo" },
        size: 56,
        minSize: 56,
        maxSize: 56,
        enableResizing: false,
        cell: (info) => info.getValue() ?? "",
      }),
      columnHelper.accessor((game) => game.event ?? "", {
        id: "event",
        header: t("library.columns.event"),
        size: 220,
        minSize: EVENT_MIN_SIZE,
        maxSize: EVENT_MAX_SIZE,
        cell: (info) => <span title={info.getValue()}>{info.getValue()}</span>,
      }),
      columnHelper.accessor((game) => game.result ?? Number.NEGATIVE_INFINITY, {
        id: "result",
        header: t("library.columns.result"),
        meta: { className: "col-result" },
        enableHiding: false,
        size: 76,
        minSize: 76,
        maxSize: 76,
        enableResizing: false,
        cell: (info) => t(resultKey(info.row.original.result)),
      }),
      columnHelper.accessor((game) => game.eco ?? "", {
        id: "eco",
        header: t("library.columns.eco"),
        meta: { className: "col-eco" },
        size: 56,
        minSize: 56,
        maxSize: 56,
        enableResizing: false,
        cell: (info) => info.getValue(),
      }),
    ],
    [t, locale],
  );

  // TanStack's `data` option wants a mutable array type; `filtered` stays `readonly` all the
  // way from `GameSummary[]` (ADR-0005's derived data is never mutated in place). A shallow
  // copy satisfies the type without weakening that guarantee anywhere else.
  const tableData = useMemo(() => filtered.slice(), [filtered]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, columnVisibility, columnOrder, columnSizing },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function resetColumns() {
    setColumnOrder([]);
    setColumnVisibility({});
    setColumnSizing({});
    setEventManuallyResized(false);
  }

  allLeafColumnIdsRef.current = table.getAllLeafColumns().map((c) => c.id);

  // Drag-to-reorder's actual mechanics (session 14 — see the file doc comment). Registered once,
  // on mount: `mousedown` on a header (below) just seeds `dragRef`, and everything else happens
  // here so a drag can continue even if the cursor leaves the header that started it. A 4px
  // movement threshold is what keeps an ordinary sort click from ever being treated as a drag —
  // native HTML5 DnD used to give this distinction for free; hand-rolling it means rebuilding it.
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const drag = dragRef.current;
      if (drag === null) return;
      if (!drag.active) {
        const dx = Math.abs(event.clientX - drag.startX);
        const dy = Math.abs(event.clientY - drag.startY);
        if (dx < 4 && dy < 4) return;
        drag.active = true;
        setDraggedColumnId(drag.id);
      }
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const th = target instanceof Element ? target.closest("th[data-column-id]") : null;
      const overId = th?.getAttribute("data-column-id") ?? null;
      const resolved = overId !== null && overId !== drag.id ? overId : null;
      if (resolved !== drag.overId) {
        drag.overId = resolved;
        setDropTargetId(resolved);
      }
    };
    const onUp = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDraggedColumnId(null);
      setDropTargetId(null);
      if (drag === null || !drag.active || drag.overId === null) return;
      setColumnOrder(reorderColumn(drag.id, drag.overId, allLeafColumnIdsRef.current));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const rows = table.getRowModel().rows;
  // The order the user actually sees, for keyboard nav and the empty-state check below — the
  // sorted order when a sort is active, the filtered order otherwise (they're the same array
  // when `sorting` is `[]`).
  const visible = rows.map((row) => row.original);

  // W2's scan loop: move the selection with the keyboard, commit with Enter.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target !== null && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);

      if (event.key === "Enter" && selectedId !== null && !typing) {
        event.preventDefault();
        onOpen(selectedId);
        return;
      }
      if (typing) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

      event.preventDefault();
      if (visible.length === 0) return;
      const at = visible.findIndex((game) => game.id === selectedId);
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = at === -1 ? 0 : Math.min(visible.length - 1, Math.max(0, at + step));
      const game = visible[next];
      if (game !== undefined) onSelect(game.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selectedId, onSelect, onOpen]);

  // **The paste listener used to live here and now lives in `App.tsx`** (session 8, found by
  // the owner testing the build). Mounted in this view it existed only while the library was
  // on screen, so pasting on a game tab silently did nothing — not a decision anybody made,
  // just a consequence of where the effect was declared. A dropped file already switched to
  // the library and opened the dialog; a paste now does the same, because the two gestures
  // mean the same thing and differing on which tab you happen to be looking at is not a
  // distinction a user can learn.

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  // Close the column-visibility menu the same three ways any right-click desktop menu closes:
  // Escape, a click outside it (capture phase, so it beats the row/header click that opened or
  // would otherwise fire under it), or the window losing focus/scrolling out from under it.
  useEffect(() => {
    if (columnMenuAt === null) return;
    const close = () => setColumnMenuAt(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onClick = (event: MouseEvent) => {
      if (!(columnMenuRef.current?.contains(event.target as Node) ?? false)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick, true);
    window.addEventListener("blur", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick, true);
      window.removeEventListener("blur", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [columnMenuAt]);

  // Clamp the menu inside the viewport after it renders (its size isn't known until then) —
  // right-clicking a header near the right edge would otherwise open a menu partly off-screen.
  useEffect(() => {
    if (columnMenuAt === null) return;
    const el = columnMenuRef.current;
    if (el === null) return;
    const rect = el.getBoundingClientRect();
    const overflowX = rect.right - window.innerWidth;
    const overflowY = rect.bottom - window.innerHeight;
    if (overflowX > 0) el.style.left = `${columnMenuAt.x - overflowX}px`;
    if (overflowY > 0) el.style.top = `${columnMenuAt.y - overflowY}px`;
  }, [columnMenuAt]);

  const hideableColumns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  // Every visible column's rendered width, computed in JS rather than left to the browser's own
  // fixed-table-layout algorithm — see the file doc comment's bug-fix note. `event` is the one
  // exception: until it's been resized directly, its rendered width is simply "whatever's left of
  // the container after every other visible column" — full stop, not `max`-ed against its own
  // tracked size, because that size is a stale default (`columnDef.size`, 220) that has nothing to
  // do with where the column is actually rendered, and `max`-ing against it created a one-way
  // ratchet: `event` would auto-grow to fill the container but then never auto-shrink again, even
  // after another column's resize freed up room it should have reclaimed. Once the owner *has*
  // dragged `event`'s own handle (`eventManuallyResized`), `columnSizing.event` is real and it's
  // safe to floor `event`'s width at that value while still letting it grow to fill extra room. If
  // `event` itself is hidden, there is currently no fill column and the table simply may not reach
  // the container's full width — a known, minor gap, not solved here.
  const visibleHeaders = table.getHeaderGroups()[0]?.headers ?? [];
  const fixedColumnsTotal = visibleHeaders
    .filter((header) => header.column.id !== "event")
    .reduce((sum, header) => sum + header.getSize(), 0);
  const eventHeader = visibleHeaders.find((header) => header.column.id === "event");
  const eventFillWidth = Math.max(0, containerWidth - fixedColumnsTotal);
  const eventWidth =
    eventHeader === undefined
      ? 0
      : eventManuallyResized
        ? Math.max(columnSizing.event ?? eventHeader.getSize(), eventFillWidth)
        : eventFillWidth;
  const tableWidth = fixedColumnsTotal + eventWidth;

  return (
    <div className="library-view">
      {importReport !== null && (
        <ImportStrip report={importReport} onDismiss={onDismissReport} />
      )}

      <div className="table-region">
        <div className="filter-bar">
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("library.searchPlaceholder")}
            aria-label={t("library.searchPlaceholder")}
          />
          <span className="count">
            {t("library.count", { shown: visible.length, total: games.length })}
          </span>
          <button type="button" onClick={() => onAddGames()}>
            {t("library.addGames")}
          </button>
        </div>

        <div className="table-scroll" ref={tableScrollRef}>
          <table className="game-table" style={{ width: tableWidth || undefined }}>
            <colgroup>
              {/* Every width here is one already computed in JS (`tableWidth`/`eventWidth`
                  above), and the `<table>` itself gets an explicit width too — never `100%`. That
                  combination is what keeps the browser's own fixed-layout algorithm from ever
                  having slack to redistribute (see the file doc comment's bug-fix note): column
                  widths only ever change because our own state changed, never as a side effect of
                  a neighbour's resize. */}
              {visibleHeaders.map((header) => (
                <col
                  key={header.id}
                  style={{ width: header.column.id === "event" ? eventWidth : header.getSize() }}
                />
              ))}
            </colgroup>
            <thead
              onContextMenu={(event) => {
                event.preventDefault();
                setColumnMenuAt({ x: event.clientX, y: event.clientY });
              }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sortState = header.column.getIsSorted();
                    const className = (header.column.columnDef.meta as { className?: string } | undefined)
                      ?.className;
                    const columnId = header.column.id;
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        data-column-id={columnId}
                        className={[
                          className,
                          draggedColumnId === columnId ? "dragging" : "",
                          dropTargetId === columnId && draggedColumnId !== columnId
                            ? "drop-target"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined}
                        aria-sort={
                          sortState === "asc"
                            ? "ascending"
                            : sortState === "desc"
                              ? "descending"
                              : "none"
                        }
                      >
                        <button
                          type="button"
                          className="th-sort"
                          onClick={header.column.getToggleSortingHandler()}
                          // Every header here is authored as a plain translated string (never a
                          // renderer function), so this is safe without going through flexRender.
                          aria-label={t("library.sortToggle", {
                            column: header.column.columnDef.header as string,
                          })}
                          // Drag-to-reorder (session 13; hand-rolled from mouse events since
                          // session 14 — native HTML5 DnD doesn't survive contact with Tauri's
                          // own window-level drag-drop, see the file doc comment). Lives on the
                          // header's own click target rather than a separate grip icon — matches
                          // Explorer/Outlook, not the web-app grip-icon habit. This only *starts*
                          // the drag; the window-level `mousemove`/`mouseup` listeners above do
                          // the rest, including the movement threshold that keeps an ordinary
                          // sort click from ever being mistaken for one.
                          onMouseDown={(event) => {
                            if (event.button !== 0) return;
                            dragRef.current = {
                              id: columnId,
                              startX: event.clientX,
                              startY: event.clientY,
                              active: false,
                              overId: null,
                            };
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="sort-arrow" aria-hidden="true">
                            {SORT_GLYPH[sortState === "asc" ? "asc" : sortState === "desc" ? "desc" : "none"]}
                          </span>
                        </button>
                        {header.column.getCanResize() &&
                          (columnId === "event" ? (
                            // Hand-rolled — see the file doc comment and `eventResizeRef` above
                            // for why `header.getResizeHandler()` can't be used here. No touch
                            // handler: out of scope for the same reason reordering skipped one.
                            <div
                              className={eventResizing ? "col-resizer active" : "col-resizer"}
                              onMouseDown={(event) => {
                                if (event.button !== 0) return;
                                eventResizeRef.current = {
                                  startX: event.clientX,
                                  startWidth: eventWidth,
                                };
                                setEventManuallyResized(true);
                                setEventResizing(true);
                              }}
                            />
                          ) : (
                            <div
                              className={
                                header.column.getIsResizing() ? "col-resizer active" : "col-resizer"
                              }
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                            />
                          ))}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row) => {
                const game = row.original;
                const isSelected = game.id === selectedId;
                return (
                  <tr
                    key={game.id}
                    ref={isSelected ? activeRow : undefined}
                    className={isSelected ? "selected" : undefined}
                    aria-selected={isSelected}
                    onClick={() => onSelect(game.id)}
                    onDoubleClick={() => onOpen(game.id)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const className = (cell.column.columnDef.meta as { className?: string } | undefined)
                        ?.className;
                      return (
                        <td key={cell.id} className={className}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visible.length === 0 &&
            (games.length === 0 ? (
              // Two elements rather than one interpolated string: the catalogue's rule is that
              // sentences are never assembled from fragments at a call site (B-072).
              <>
                <p className="notice">{t("library.empty")}</p>
                <p className="notice">{t("library.emptyHint")}</p>
              </>
            ) : (
              <p className="notice">{t("library.noMatches")}</p>
            ))}
        </div>
      </div>

      {columnMenuAt !== null && (
        <div
          ref={columnMenuRef}
          className="column-menu"
          role="menu"
          aria-label={t("library.columnMenu.title")}
          style={{ left: columnMenuAt.x, top: columnMenuAt.y }}
        >
          <div className="column-menu-title">{t("library.columnMenu.title")}</div>
          {hideableColumns.map((column) => {
            const visible = column.getIsVisible();
            const labelKey = columnMenuLabelKey(column.id);
            const label = labelKey !== null ? t(labelKey) : (column.columnDef.header as string);
            return (
              <button
                key={column.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={visible}
                className="column-menu-item"
                onClick={() => {
                  column.toggleVisibility();
                  setColumnMenuAt(null);
                }}
              >
                <span aria-hidden="true">{CHECK_GLYPH[visible ? "on" : "off"]}</span>
                {label}
              </button>
            );
          })}
          <hr className="column-menu-separator" />
          <button
            type="button"
            className="column-menu-item"
            onClick={() => {
              resetColumns();
              setColumnMenuAt(null);
            }}
          >
            <span aria-hidden="true">↺</span>
            {t("library.columnMenu.reset")}
          </button>
        </div>
      )}
    </div>
  );
}
