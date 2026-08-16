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
 * range — are B-010, and virtualisation for 10k rows is B-033. The scroll container and the
 * fixed table layout are here already so neither is a restructure.
 */
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { formatPgnDate } from "@/i18n/format";
import { GameResult, type Game, type GameId } from "@/model/game";

interface LibraryViewProps {
  games: readonly Game[];
  query: string;
  onQueryChange: (query: string) => void;
  selectedId: GameId | null;
  onSelect: (id: GameId) => void;
  onOpen: (id: GameId) => void;
}

function resultKey(result: Game["result"]) {
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

export function LibraryView({
  games,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  onOpen,
}: LibraryViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const activeRow = useRef<HTMLTableRowElement | null>(null);

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
      if (filtered.length === 0) return;
      const at = filtered.findIndex((game) => game.id === selectedId);
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = at === -1 ? 0 : Math.min(filtered.length - 1, Math.max(0, at + step));
      const game = filtered[next];
      if (game !== undefined) onSelect(game.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, selectedId, onSelect, onOpen]);

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <div className="library-view">
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
            {t("library.count", { shown: filtered.length, total: games.length })}
          </span>
        </div>

        <div className="table-scroll">
          <table className="game-table">
            <thead>
              <tr>
                <th scope="col">{t("library.columns.white")}</th>
                <th scope="col" className="col-elo">{t("library.columns.elo")}</th>
                <th scope="col">{t("library.columns.black")}</th>
                <th scope="col" className="col-elo">{t("library.columns.elo")}</th>
                <th scope="col">{t("library.columns.event")}</th>
                <th scope="col" className="col-date">{t("library.columns.date")}</th>
                <th scope="col" className="col-result">{t("library.columns.result")}</th>
                <th scope="col" className="col-eco">{t("library.columns.eco")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((game) => {
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
                    <td title={game.white.name}>{game.white.name}</td>
                    <td className="col-elo">{game.whiteElo ?? ""}</td>
                    <td title={game.black.name}>{game.black.name}</td>
                    <td className="col-elo">{game.blackElo ?? ""}</td>
                    <td title={game.event ?? ""}>{game.event ?? ""}</td>
                    <td className="col-date">
                      {formatPgnDate(game.date, locale) ?? t("date.unknown")}
                    </td>
                    <td className="col-result">{t(resultKey(game.result))}</td>
                    <td className="col-eco">{game.eco ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <p className="notice">
              {games.length === 0 ? t("library.empty") : t("library.noMatches")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
