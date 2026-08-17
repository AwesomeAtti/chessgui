/**
 * B-101 — measure what is actually in a pile of PGN files.
 *
 * ADR-0008 was written with one unevidenced claim in it: that games needing repair would be
 * common. The owner's objection was that chess.com and lichess exports are machine-generated
 * and clean, so most imports will be fine. Both of those are theories, and the data to settle
 * them is sitting on the developer's own disk. This script counts instead of guessing.
 *
 * It is a measuring instrument, not product code. It does not import, does not write, and
 * knows nothing about the database. Run it, paste the output into the backlog, delete nothing.
 *
 * **Privacy is the load-bearing design constraint here, not a nicety.** The input is the
 * owner's real games, with real names in them, and the output is meant to be pasted into a
 * public repository. So this script reports *shapes and counts only*: tag names but never tag
 * values, move counts but never moves, file indexes but never filenames. The one exception is
 * an explicit `--unsafe-names` flag for reading locally, which prints values and is never to
 * be used for anything that gets committed. Everything about the default output is intended to
 * be boring enough to publish.
 *
 * Usage:
 *   node scripts/survey-pgn.mjs <path> [<path>...] [--unsafe-names]
 *
 * A path may be a .pgn file or a directory, which is searched recursively.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join } from "node:path";

const args = process.argv.slice(2);
const UNSAFE_NAMES = args.includes("--unsafe-names");
const inputs = args.filter((a) => !a.startsWith("--"));

if (inputs.length === 0) {
  console.error("usage: node scripts/survey-pgn.mjs <file-or-dir>... [--unsafe-names]");
  process.exit(2);
}

/** The Seven Tag Roster — the only tags PGN actually requires. */
const SEVEN_TAG_ROSTER = [
  "Event",
  "Site",
  "Date",
  "Round",
  "White",
  "Black",
  "Result",
];

/**
 * Piece letters unique to one notation convention (B-098 / ADR-0008 rule 4).
 *
 * Deliberately excludes the ambiguous ones. `R` is rook in English and *roi* in French; `D` is
 * queen in German and French and nothing in English. Only letters that can belong to exactly
 * one language are evidence, which is the whole point of rule 4 — a per-token guess using an
 * ambiguous letter is how you silently reinterpret a game.
 */
const UNAMBIGUOUS_PIECE_LETTERS = {
  de: ["S", "L", "T"], // Springer, Läufer, Turm
  fr: ["C", "F"], // Cavalier, Fou
  es: ["A"], // Alfil
  // English needs no entry: it is the assumed default.
};

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function collect(path, out) {
  const st = statSync(path);
  if (st.isDirectory()) {
    for (const entry of readdirSync(path)) collect(join(path, entry), out);
  } else if (extname(path).toLowerCase() === ".pgn") {
    out.push(path);
  }
  return out;
}

const files = [];
for (const input of inputs) collect(input, files);

if (files.length === 0) {
  console.error("no .pgn files found");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Decoding — ADR-0008 rule 5
// ---------------------------------------------------------------------------

const strictUtf8 = new TextDecoder("utf-8", { fatal: true });
const latin1 = new TextDecoder("latin1");

/**
 * Decode as UTF-8, fall back to Latin-1, never throw. This mirrors the rule the importer will
 * follow, so the survey reports the encoding the importer would actually have picked rather
 * than the one the file claims.
 */
function decode(bytes) {
  try {
    return { text: strictUtf8.decode(bytes), encoding: "utf-8" };
  } catch {
    return { text: latin1.decode(bytes), encoding: "latin1-fallback" };
  }
}

// ---------------------------------------------------------------------------
// Splitting a file into games
// ---------------------------------------------------------------------------

const TAG_LINE = /^\s*\[\s*([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\s*\]\s*$/;

/**
 * Split into games on the "a tag section follows movetext" boundary.
 *
 * Deliberately naive: this is a survey, not the importer, and `pgn-reader` will do the real
 * job. It has to be *robust* rather than correct — it must never throw on garbage, because the
 * files most worth measuring are the malformed ones.
 */
function splitGames(text) {
  const lines = text.split(/\r?\n/);
  const games = [];
  let current = null;
  let seenMovetext = false;

  for (const line of lines) {
    const isTag = TAG_LINE.test(line);
    if (isTag && (current === null || seenMovetext)) {
      if (current !== null) games.push(current);
      current = { tagLines: [], moveLines: [] };
      seenMovetext = false;
    }
    if (current === null) {
      // Movetext before any tag: a headerless fragment. Keep it so it gets counted.
      current = { tagLines: [], moveLines: [] };
    }
    if (isTag && !seenMovetext) current.tagLines.push(line);
    else {
      if (line.trim() !== "") seenMovetext = true;
      current.moveLines.push(line);
    }
  }
  if (current !== null) games.push(current);

  return games.filter(
    (g) => g.tagLines.length > 0 || g.moveLines.join("").trim() !== "",
  );
}

// ---------------------------------------------------------------------------
// Movetext normalisation — the input to the duplicate key, ADR-0008 rule 6
// ---------------------------------------------------------------------------

/**
 * Reduce movetext to a bare sequence of SAN tokens.
 *
 * This is the operation rule 6's content hash depends on, so the survey has to do it the same
 * way the importer will: strip comments, variations, NAGs, move numbers and annotation glyphs,
 * and keep the moves. If two exports of one game differ only in line wrapping or clock
 * comments, they must normalise identically — that is the entire reason the key is not a hash
 * of the raw bytes.
 */
function normaliseMovetext(raw) {
  let s = raw;
  s = s.replace(/\{[^}]*\}/g, " "); // { comments }, including [%eval] and [%clk]
  s = s.replace(/;[^\n]*/g, " "); // ; rest-of-line comments
  s = s.replace(/<[^>]*>/g, " "); // reserved by the spec
  // Recursive variations, innermost first. Bounded so an unbalanced paren cannot spin.
  for (let i = 0; i < 40 && s.includes("("); i += 1) {
    const next = s.replace(/\([^()]*\)/g, " ");
    if (next === s) break;
    s = next;
  }
  s = s.replace(/\$\d+/g, " "); // NAGs
  s = s.replace(/\d+\s*\.(\.\.)?/g, " "); // move numbers, including black continuation
  s = s.replace(/[?!]+/g, ""); // annotation glyphs attached to moves
  s = s.replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, " "); // result token
  return s.split(/\s+/).filter((t) => t !== "");
}

/** ADR-0008 rule 6: hash over the roster plus the normalised moves, never over the bytes. */
function contentKey(tags, sanTokens) {
  const h = createHash("sha256");
  for (const name of SEVEN_TAG_ROSTER) h.update(`${name}=${tags[name] ?? ""}\n`);
  h.update(sanTokens.join(" "));
  return h.digest("hex").slice(0, 32);
}

// ---------------------------------------------------------------------------
// Date classification — ADR-0005 / B-059
// ---------------------------------------------------------------------------

function classifyDate(raw) {
  if (raw === undefined) return "absent";
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(raw)) return "complete";
  if (/^\d{4}\.\d{2}\.\?\?$/.test(raw)) return "year-month";
  if (/^\d{4}\.\?\?\.\?\?$/.test(raw)) return "year-only";
  if (/^\?{4}\.\?\?\.\?\?$/.test(raw)) return "unknown";
  return "malformed";
}

// ---------------------------------------------------------------------------
// The survey
// ---------------------------------------------------------------------------

const stats = {
  files: 0,
  bytes: 0,
  games: 0,
  encodings: new Map(),
  tagCounts: new Map(),
  missingRosterTags: new Map(),
  duplicateRosterTags: 0,
  dateKinds: new Map(),
  results: new Map(),
  variants: new Map(),
  withEval: 0,
  withClk: 0,
  withAnyComment: 0,
  withNags: 0,
  withVariations: 0,
  noMoves: 0,
  noTags: 0,
  unterminatedComment: 0,
  notationEvidence: new Map(),
  plyCounts: [],
  perFile: [],
};

const keyIndex = new Map();

function bump(map, key, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

for (const [fileIndex, file] of files.entries()) {
  const bytes = readFileSync(file);
  const { text, encoding } = decode(bytes);

  stats.files += 1;
  stats.bytes += bytes.length;
  bump(stats.encodings, encoding);

  const games = splitGames(text);
  let fileGames = 0;

  for (const game of games) {
    const tags = {};
    const seen = new Set();
    for (const line of game.tagLines) {
      const m = TAG_LINE.exec(line);
      if (m === null) continue;
      const [, name, value] = m;
      if (seen.has(name)) stats.duplicateRosterTags += 1;
      seen.add(name);
      tags[name] = value;
      bump(stats.tagCounts, name);
    }

    const movetext = game.moveLines.join("\n");
    const san = normaliseMovetext(movetext);

    stats.games += 1;
    fileGames += 1;

    if (game.tagLines.length === 0) stats.noTags += 1;
    if (san.length === 0) stats.noMoves += 1;
    else stats.plyCounts.push(san.length);

    for (const name of SEVEN_TAG_ROSTER) {
      if (tags[name] === undefined) bump(stats.missingRosterTags, name);
    }

    bump(stats.dateKinds, classifyDate(tags.Date));
    bump(stats.results, tags.Result ?? "absent");
    if (tags.Variant !== undefined) bump(stats.variants, tags.Variant);

    if (movetext.includes("[%eval")) stats.withEval += 1;
    if (movetext.includes("[%clk")) stats.withClk += 1;
    if (movetext.includes("{")) stats.withAnyComment += 1;
    if (/\$\d+/.test(movetext)) stats.withNags += 1;
    if (movetext.includes("(")) stats.withVariations += 1;

    const opens = (movetext.match(/\{/g) ?? []).length;
    const closes = (movetext.match(/\}/g) ?? []).length;
    if (opens !== closes) stats.unterminatedComment += 1;

    // Notation-language evidence, using unambiguous letters only (rule 4).
    for (const [lang, letters] of Object.entries(UNAMBIGUOUS_PIECE_LETTERS)) {
      if (san.some((tok) => letters.includes(tok[0]) && /^[A-Z][a-h1-8x=+#-]/.test(tok))) {
        bump(stats.notationEvidence, lang);
        break;
      }
    }

    // Rule 6's actual load: how often does one content key cover more than one game?
    const key = contentKey(tags, san);
    const prior = keyIndex.get(key);
    if (prior === undefined) keyIndex.set(key, [{ fileIndex }]);
    else prior.push({ fileIndex });
  }

  stats.perFile.push({
    index: fileIndex,
    games: fileGames,
    kb: Math.round(bytes.length / 102.4) / 10,
    encoding,
    ...(UNSAFE_NAMES ? { file } : {}),
  });
}

// ---------------------------------------------------------------------------
// Report — counts and shapes only
// ---------------------------------------------------------------------------

const collisions = [...keyIndex.values()].filter((v) => v.length > 1);
const sameFileCollisions = collisions.filter(
  (v) => new Set(v.map((e) => e.fileIndex)).size === 1,
).length;
const crossFileCollisions = collisions.length - sameFileCollisions;

function table(map, total) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => {
      const pct = total > 0 ? ` (${((n / total) * 100).toFixed(1)}%)` : "";
      return `    ${k.padEnd(24)} ${String(n).padStart(7)}${pct}`;
    })
    .join("\n");
}

const plies = stats.plyCounts.slice().sort((a, b) => a - b);
const median = plies.length > 0 ? plies[Math.floor(plies.length / 2)] : 0;

const extraTags = new Map(
  [...stats.tagCounts.entries()].filter(([k]) => !SEVEN_TAG_ROSTER.includes(k)),
);

console.log(`
PGN survey — B-101
==================
Counts and shapes only; no player names, game text, or filenames are printed.
${UNSAFE_NAMES ? "\n!! --unsafe-names is ON: output contains real values. Do not commit it.\n" : ""}
Corpus
    files                    ${String(stats.files).padStart(7)}
    games                    ${String(stats.games).padStart(7)}
    total size               ${String(Math.round(stats.bytes / 1024)).padStart(7)} KB
    median plies per game    ${String(median).padStart(7)}

Encoding (ADR-0008 rule 5)
${table(stats.encodings, stats.files)}

Seven Tag Roster — games missing each required tag
${stats.missingRosterTags.size === 0 ? "    none missing" : table(stats.missingRosterTags, stats.games)}
    duplicated tags in one game: ${stats.duplicateRosterTags}

Non-roster tags present (names only — these are the schema surface B-060 must retain)
${extraTags.size === 0 ? "    none" : table(extraTags, stats.games)}

Dates (ADR-0005 / B-059)
${table(stats.dateKinds, stats.games)}

Results (B-060 stores these as integers)
${table(stats.results, stats.games)}

Variants (ADR-0008 rule 3b / B-100)
${stats.variants.size === 0 ? "    no Variant tag anywhere" : table(stats.variants, stats.games)}

Movetext features
    with { comments }        ${String(stats.withAnyComment).padStart(7)}
    with [%eval             ${String(stats.withEval).padStart(8)}
    with [%clk              ${String(stats.withClk).padStart(8)}
    with NAGs ($n)           ${String(stats.withNags).padStart(7)}
    with variations          ${String(stats.withVariations).padStart(7)}
    unbalanced braces        ${String(stats.unterminatedComment).padStart(7)}
    headers but no moves     ${String(stats.noMoves).padStart(7)}
    moves but no headers     ${String(stats.noTags).padStart(7)}

Notation language evidence (B-098; unambiguous letters only)
${stats.notationEvidence.size === 0 ? "    none — consistent with English SAN throughout" : table(stats.notationEvidence, stats.games)}

Duplicate content keys (ADR-0008 rule 6 — the highest-regret rule)
    distinct keys            ${String(keyIndex.size).padStart(7)}
    keys covering >1 game    ${String(collisions.length).padStart(7)}
      within a single file   ${String(sameFileCollisions).padStart(7)}   <- candidate FALSE merges
      across files           ${String(crossFileCollisions).padStart(7)}   <- expected: overlapping exports

    Cross-file collisions are the re-import case and are what the rule is for.
    Same-file collisions are the ones worth eyeballing: one file listing a game
    twice is plausible, but two genuinely different games sharing a key is the
    failure mode ADR-0008 accepted on the grounds that it would be rare. This
    number is the first evidence either way.

Per file
    idx    games      KB  encoding
${stats.perFile.map((f) => `    ${String(f.index).padStart(3)} ${String(f.games).padStart(8)} ${String(f.kb).padStart(7)}  ${f.encoding}${f.file ? `  ${f.file}` : ""}`).join("\n")}
`);
