/**
 * Game metadata — the second panel tab.
 *
 * **Curated groups over a flat tag dump**, decided from mockups against a real chess.com game
 * after the flat version was reported as formatting the data poorly. It was, and only one of
 * the five reasons was styling: the label column was sized by the longest key in the file
 * (`CurrentPosition`, 42 characters), so every value was squeezed; the fields anyone actually
 * wants — result, both ratings, the time control, how the game ended — were not promoted at
 * all; two 43-character URLs and a FEN wrapped into unreadable blocks; six date and time tags
 * said nearly the same thing six times; and `Round "-"` printed literally.
 *
 * The decisions live in `infoFields.ts` so they can be tested. **None of them are
 * source-specific** — every rule comes from the PGN specification rather than from chess.com,
 * so a Scid export or a hand-typed game renders through the same code with fewer fields.
 *
 * The disclosure at the bottom holds **every** tag, promoted ones included. That is B-060's
 * payoff kept intact while no longer being the bulk of the view.
 */
import { useTranslation } from "react-i18next";

import { formatPgnDate } from "@/i18n/format";
import { GameResult, type Game } from "@/model/game";

import { allTags, moveCount, parseTimeControl, presentTag } from "./infoFields";

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

/** A label and a value, omitted entirely when there is no value. */
function Row({ label, value }: { label: string; value: string | null }) {
  if (value === null) return null;
  return (
    <div className="info-row">
      <span className="info-key">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

export function GameInfo({ game }: { game: Game }) {
  const { t, i18n } = useTranslation();

  const date = formatPgnDate(game.date, i18n.language) ?? presentTag(game.date.raw);
  const moves = moveCount(game.plyCount);
  const timeControl = parseTimeControl(game.tags["TimeControl"]);
  const termination = presentTag(game.tags["Termination"]);
  const tags = allTags(game.tags);

  const timeControlText = (): string | null => {
    switch (timeControl.kind) {
      case "absent":
        return null;
      case "minutes":
        return t("info.timeControl.minutes", { count: timeControl.minutes });
      case "seconds":
        return t("info.timeControl.seconds", { count: timeControl.seconds });
      case "increment":
        return t("info.timeControl.increment", {
          base:
            timeControl.base.kind === "minutes"
              ? t("info.timeControl.minutes", { count: timeControl.base.minutes })
              : t("info.timeControl.seconds", { count: timeControl.base.seconds }),
          increment: timeControl.increment,
        });
      case "raw":
        // A format we do not understand, printed as the file wrote it.
        return timeControl.text;
    }
  };

  return (
    <div className="info-panel">
      <section className="info-group">
        <h3>{t("info.players")}</h3>
        <div className="info-player">
          <span className="info-player-name">{game.white.name}</span>
          <span className="info-player-elo">{game.whiteElo ?? t("info.absent")}</span>
        </div>
        <div className="info-player">
          <span className="info-player-name">{game.black.name}</span>
          <span className="info-player-elo">{game.blackElo ?? t("info.absent")}</span>
        </div>
        <Row label={t("info.result")} value={t(resultKey(game.result))} />
        {/*
          `Termination` is prose written by whoever produced the file — chess.com emits
          "X won by resignation" in English. It is shown verbatim and cannot be localised
          without parsing somebody else's sentence, which is not a trade worth making (B-072).
        */}
        <Row label={t("info.ended")} value={termination} />
      </section>

      <section className="info-group">
        <h3>{t("info.game")}</h3>
        <Row label={t("info.event")} value={presentTag(game.event)} />
        <Row label={t("info.site")} value={presentTag(game.site)} />
        <Row label={t("info.date")} value={date} />
        <Row label={t("info.round")} value={presentTag(game.round)} />
        <Row label={t("info.timeControlLabel")} value={timeControlText()} />
        <Row label={t("info.moves")} value={moves === null ? null : String(moves)} />
      </section>

      {(presentTag(game.eco) !== null || presentTag(game.ecoUrl) !== null) && (
        <section className="info-group">
          <h3>{t("info.opening")}</h3>
          <Row label={t("info.eco")} value={presentTag(game.eco)} />
          {/*
            The URL is text, not a link, and not a name.
            **Not a name** because decoding the slug ships visibly wrong text — B-105, where
            `Kings-Indian-Attack` loses its apostrophe and the colon in a real opening name has
            no slug representation at all. A name comes from an ECO table or not at all.
            **Not a link** because opening one from a Tauri webview needs the opener plugin
            behind `src/shell/` (ADR-0001, B-069); a bare anchor would navigate the app window
            away from the app, which is a worse failure than plain text. That is B-117.
          */}
          <Row label={t("info.openingUrl")} value={presentTag(game.ecoUrl)} />
        </section>
      )}

      {tags.length > 0 && (
        <details className="info-tags">
          <summary>{t("info.allTags", { count: tags.length })}</summary>
          <dl className="info-tag-list">
            {tags.map(([key, value]) => (
              <div key={key} className="info-tag">
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
