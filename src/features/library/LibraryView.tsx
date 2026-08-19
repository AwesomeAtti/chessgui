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
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
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
  // Screen position only; which column was right-clicked doesn't matter (see the file doc
  // comment) — the menu always lists every hideable column, not just the one under the cursor.
  const [columnMenuAt, setColumnMenuAt] = useState<{ x: number; y: number } | null>(null);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);

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
      columnHelper.accessor((game) => game.white.name, {
        id: "white",
        header: t("library.columns.white"),
        enableHiding: false,
        cell: (info) => <span title={info.getValue()}>{info.getValue()}</span>,
      }),
      columnHelper.accessor("whiteElo", {
        id: "whiteElo",
        header: t("library.columns.elo"),
        meta: { className: "col-elo" },
        cell: (info) => info.getValue() ?? "",
      }),
      columnHelper.accessor((game) => game.black.name, {
        id: "black",
        header: t("library.columns.black"),
        enableHiding: false,
        cell: (info) => <span title={info.getValue()}>{info.getValue()}</span>,
      }),
      columnHelper.accessor("blackElo", {
        id: "blackElo",
        header: t("library.columns.elo"),
        meta: { className: "col-elo" },
        cell: (info) => info.getValue() ?? "",
      }),
      columnHelper.accessor((game) => game.event ?? "", {
        id: "event",
        header: t("library.columns.event"),
        cell: (info) => <span title={info.getValue()}>{info.getValue()}</span>,
      }),
      columnHelper.accessor((game) => game.date.parsed ?? game.date.raw, {
        id: "date",
        header: t("library.columns.date"),
        meta: { className: "col-date" },
        cell: (info) => formatPgnDate(info.row.original.date, locale) ?? t("date.unknown"),
      }),
      columnHelper.accessor((game) => game.result ?? Number.NEGATIVE_INFINITY, {
        id: "result",
        header: t("library.columns.result"),
        meta: { className: "col-result" },
        enableHiding: false,
        cell: (info) => t(resultKey(info.row.original.result)),
      }),
      columnHelper.accessor((game) => game.eco ?? "", {
        id: "eco",
        header: t("library.columns.eco"),
        meta: { className: "col-eco" },
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
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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

        <div className="table-scroll">
          <table className="game-table">
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
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        className={className}
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
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="sort-arrow" aria-hidden="true">
                            {SORT_GLYPH[sortState === "asc" ? "asc" : sortState === "desc" ? "desc" : "none"]}
                          </span>
                        </button>
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
        </div>
      )}
    </div>
  );
}
