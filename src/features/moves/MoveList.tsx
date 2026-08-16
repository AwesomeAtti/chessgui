/**
 * The move list.
 *
 * Mainline only — variations, comments and NAGs arrive with the game tree (B-009). Clicking
 * a move jumps the board to it; the keyboard is the primary interaction and lives in
 * `GameView`.
 *
 * SAN is rendered verbatim. When B-073 lands, display notation becomes locale-dependent
 * (`Nf3` / `Sf3` / `Cf3`) while storage stays canonical English, and this is one of the
 * places that has to change.
 */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface MoveListProps {
  san: readonly string[];
  currentPly: number;
  truncatedAt: number | null;
  onSelect: (ply: number) => void;
}

export function MoveList({ san, currentPly, truncatedAt, onSelect }: MoveListProps) {
  const { t } = useTranslation();
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Keep the current move in view when navigating by keyboard, or a long game scrolls
  // away from under you.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentPly]);

  if (san.length === 0) {
    return <p className="notice">{t("moves.empty")}</p>;
  }

  const rows: { number: number; white?: string | undefined; black?: string | undefined }[] = [];
  for (let i = 0; i < san.length; i += 2) {
    rows.push({ number: i / 2 + 1, white: san[i], black: san[i + 1] });
  }

  const cell = (label: string | undefined, ply: number) => {
    if (label === undefined) return <span />;
    const isCurrent = ply === currentPly;
    return (
      <button
        type="button"
        ref={isCurrent ? activeRef : undefined}
        className={isCurrent ? "move current" : "move"}
        onClick={() => onSelect(ply)}
      >
        {label}
      </button>
    );
  };

  return (
    <>
      <ol className="move-list">
        {rows.map((row, index) => (
          <li key={row.number}>
            <span className="move-number">{row.number}</span>
            {cell(row.white, index * 2 + 1)}
            {cell(row.black, index * 2 + 2)}
          </li>
        ))}
      </ol>
      {truncatedAt !== null && (
        <p className="notice" role="status">
          {t("moves.truncated", { ply: truncatedAt })}
        </p>
      )}
    </>
  );
}
