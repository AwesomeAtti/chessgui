/**
 * Game metadata — the second panel tab.
 *
 * Shows the promoted header fields, then everything else from the retained tag set. The
 * "everything else" section is the visible payoff of B-060: tags nobody thought to promote
 * are still here rather than silently discarded on import.
 */
import { useTranslation } from "react-i18next";

import type { Game } from "@/model/game";
import { formatPgnDate } from "@/i18n/format";

const PROMOTED = new Set([
  "White",
  "Black",
  "Event",
  "Site",
  "Date",
  "Round",
  "Result",
  "ECO",
  "WhiteElo",
  "BlackElo",
  "PlyCount",
]);

export function GameInfo({ game }: { game: Game }) {
  const { t, i18n } = useTranslation();
  const date = formatPgnDate(game.date, i18n.language);

  const extra = Object.entries(game.tags).filter(([key]) => !PROMOTED.has(key));

  return (
    <dl className="info-list">
      <dt>{t("info.event")}</dt>
      <dd>{game.event ?? t("info.absent")}</dd>

      <dt>{t("info.site")}</dt>
      <dd>{game.site ?? t("info.absent")}</dd>

      <dt>{t("info.date")}</dt>
      {/* The raw PGN string is shown alongside a formatted date when they differ —
          `2024.??.??` is information the formatted form throws away (B-059). */}
      <dd>{date ?? game.date.raw}</dd>

      <dt>{t("info.round")}</dt>
      <dd>{game.round ?? t("info.absent")}</dd>

      <dt>{t("info.eco")}</dt>
      <dd>{game.eco ?? t("info.absent")}</dd>

      {extra.length > 0 && (
        <>
          <dt className="info-section">{t("info.otherTags")}</dt>
          <dd />
          {extra.map(([key, value]) => (
            <div key={key} className="info-pair">
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </>
      )}
    </dl>
  );
}
