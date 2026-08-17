/**
 * Mock game data for the M1 skeleton.
 *
 * **All players here are invented.** Per AGENTS.md this repository carries no real names,
 * and that includes fixtures — using well-known players would be convenient and is exactly
 * the habit that later puts a real name in a commit. Invented names also let the fixture
 * carry the awkward cases on purpose.
 *
 * This data is deliberately messy, because real PGN is. It exercises every decision in
 * ADR-0005:
 *
 * - accents and a non-Latin script, so byte-order sorting visibly breaks (B-074)
 * - `Lastname, Firstname` and `Firstname Lastname` for the same person (B-058)
 * - a fully unknown date, a year-only date, and a complete one (B-059)
 * - an unfinished game, so `result` is null rather than a string (B-060)
 * - tags we do not promote to columns, retained rather than dropped (B-060)
 * - `ecoUrl` populated on exactly one game, because most sources never emit `ECOUrl` (B-102)
 *
 * Replaced by real imported games at B-007.
 */
import type { Game, Player } from "@/model/game";
import { GameResult } from "@/model/game";

const players: Record<string, Player> = {
  aine: {
    id: 1,
    name: "Ravensbourne, Áine",
    normalisedName: "ravensbourne, aine",
  },
  vaino: { id: 2, name: "Väinö Ökonen", normalisedName: "okonen, vaino" },
  jurgen: { id: 3, name: "Bäcker, Jürgen", normalisedName: "backer, jurgen" },
  joao: { id: 4, name: "João Silva-Moreira", normalisedName: "silva-moreira, joao" },
  dmitri: { id: 5, name: "Дмитрий Ковалёв", normalisedName: "kovalev, dmitrii" },
  // Same human as `aine`, written the other way round — the case B-058 exists for.
  aineAlt: { id: 6, name: "Áine Ravensbourne", normalisedName: "ravensbourne, aine" },
};

function player(key: keyof typeof players): Player {
  const p = players[key];
  if (p === undefined) throw new Error(`unknown mock player: ${key}`);
  return p;
}

export const MOCK_GAMES: readonly Game[] = [
  {
    id: 1,
    white: player("aine"),
    black: player("vaino"),
    event: "Northern Counties Open",
    site: "Harrogate",
    date: { raw: "2024.06.08", parsed: "2024-06-08", year: 2024, month: 6 },
    round: "3",
    result: GameResult.WhiteWin,
    eco: "B90",
    // The only mock game carrying this: most sources never emit `ECOUrl` (B-102).
    ecoUrl: "https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation",
    whiteElo: 2118,
    blackElo: 2074,
    plyCount: 71,
    tags: {
      Event: "Northern Counties Open",
      Site: "Harrogate",
      Date: "2024.06.08",
      Round: "3",
      White: "Ravensbourne, Áine",
      Black: "Väinö Ökonen",
      Result: "1-0",
      ECO: "B90",
      ECOUrl: "https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation",
      WhiteElo: "2118",
      BlackElo: "2074",
      PlyCount: "71",
      // Not promoted to a column, and not thrown away either.
      Annotator: "self",
      TimeControl: "90+30",
    },
    pgn: '[Event "Northern Counties Open"]\n[Site "Harrogate"]\n[Date "2024.06.08"]\n\n1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 1-0\n',
  },
  {
    id: 2,
    white: player("jurgen"),
    black: player("aineAlt"),
    event: "Vereinsmeisterschaft",
    site: "Freiburg",
    // Month and day unknown — the everyday case, not an edge case.
    date: { raw: "2023.??.??", parsed: null, year: 2023, month: null },
    round: "?",
    result: GameResult.Draw,
    eco: "D37",
    ecoUrl: null,
    whiteElo: 2201,
    blackElo: 2118,
    plyCount: 96,
    tags: {
      Event: "Vereinsmeisterschaft",
      Site: "Freiburg",
      Date: "2023.??.??",
      White: "Bäcker, Jürgen",
      Black: "Áine Ravensbourne",
      Result: "1/2-1/2",
      ECO: "D37",
    },
    pgn: '[Event "Vereinsmeisterschaft"]\n[Date "2023.??.??"]\n\n1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Be7 1/2-1/2\n',
  },
  {
    id: 3,
    white: player("dmitri"),
    black: player("joao"),
    event: null,
    site: null,
    // Nothing known at all. `formatPgnDate` returns null and the UI localises "Unknown".
    date: { raw: "????.??.??", parsed: null, year: null, month: null },
    round: null,
    result: GameResult.BlackWin,
    eco: "C65",
    ecoUrl: null,
    whiteElo: null,
    blackElo: 1954,
    plyCount: 54,
    tags: {
      Date: "????.??.??",
      White: "Дмитрий Ковалёв",
      Black: "João Silva-Moreira",
      Result: "0-1",
      ECO: "C65",
    },
    pgn: '[Date "????.??.??"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 0-1\n',
  },
  {
    id: 4,
    white: player("vaino"),
    black: player("jurgen"),
    event: "Correspondence Section B",
    site: "ICCF",
    date: { raw: "2025.01.14", parsed: "2025-01-14", year: 2025, month: 1 },
    round: "1",
    // Still in progress: PGN result `*`. Null, never the string.
    result: null,
    eco: "A45",
    ecoUrl: null,
    whiteElo: 2074,
    blackElo: 2201,
    plyCount: 22,
    tags: {
      Event: "Correspondence Section B",
      Site: "ICCF",
      Date: "2025.01.14",
      White: "Väinö Ökonen",
      Black: "Bäcker, Jürgen",
      Result: "*",
      ECO: "A45",
      Variant: "Standard",
      Termination: "unterminated",
    },
    pgn: '[Event "Correspondence Section B"]\n[Result "*"]\n\n1. d4 Nf6 2. Bg5 e6 3. e4 h6 *\n',
  },
];
