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
 * **Full detail by default.** An earlier version printed aggregates only, which broke the most
 * useful thing here: same-file content-key collisions are the only direct evidence about
 * ADR-0008 rule 6, and a *count* of them tests nothing — judging whether two colliding games are
 * the same game means looking at them.
 *
 * `--redact` exists for one narrow reason, and it is not about PGN or about the players in it.
 * This output is meant to be pasted into `docs/backlog.md`, and the developer's own handle
 * appears in every White/Black field of their own games. The repo's commit identity is
 * deliberately pseudonymous; pasting the handle in would undo that. So `--redact` protects the
 * repo's anonymity, not the games.
 *
 * Usage:
 *   node scripts/survey-pgn.mjs <path> [<path>...] [--redact]
 *
 * A path may be a .pgn file or a directory, which is searched recursively.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join } from "node:path";

const args = process.argv.slice(2);
const REDACT = args.includes("--redact");
const inputs = args.filter((a) => !a.startsWith("--"));

if (inputs.length === 0) {
  console.error("usage: node scripts/survey-pgn.mjs <file-or-dir>... [--redact]");
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
  } else {
    const ext = extname(path).toLowerCase();
    if (ext === ".pgn" || ext === ".json") out.push(path);
  }
  return out;
}

const files = [];
for (const input of inputs) collect(input, files);

if (files.length === 0) {
  console.error("no .pgn or .json files found");
  process.exit(1);
}

/**
 * A chess.com monthly archive is JSON, and it is a **superset** of that month's PGN endpoint:
 * each game object carries `pgn` plus fields the PGN does not have — `accuracies`, `rules`
 * (the variant), `time_class`, `url`.
 *
 * The reason this script reads it is one specific question it can answer and the PGN cannot.
 * ADR-0008 rule 3b decides what to do about variants **by reading the PGN `Variant` tag.** If
 * chess.com signals a variant only in the JSON `rules` field and omits the tag from the PGN, then
 * rule 3b is blind to chess.com variants and would report them as illegal moves instead — the
 * exact misdiagnosis rule 3b exists to prevent. Comparing the two per game settles it with
 * evidence, which is the only currency this project accepts for a claim like that.
 *
 * Returns null for JSON that is not a chess.com archive, so an unrelated file is skipped rather
 * than crashing the run.
 */
function readChessComArchive(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (parsed === null || !Array.isArray(parsed.games)) return null;
  return parsed.games.map((g) => ({
    pgn: typeof g.pgn === "string" ? g.pgn : "",
    rules: typeof g.rules === "string" ? g.rules : null,
    hasAccuracies: g.accuracies !== undefined && g.accuracies !== null,
    timeClass: typeof g.time_class === "string" ? g.time_class : null,
  }));
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

  // chess.com JSON only — the fields the /pgn endpoint discards.
  jsonGames: 0,
  jsonRules: new Map(),
  jsonWithAccuracies: 0,
  jsonTimeClasses: new Map(),
  /** Non-standard `rules` in the JSON but no `Variant` tag in the PGN — ADR-0008 rule 3b blind. */
  variantOnlyInJson: 0,
  /** Non-standard `rules` *and* a `Variant` tag — rule 3b sees it. */
  variantInBoth: 0,

  /** JSON files that were not chess.com archives, reported rather than silently ignored. */
  skipped: [],
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

  // A chess.com archive supplies the PGN per game, along with the metadata the PGN lacks.
  // Anything else — including JSON that is not an archive — goes through the text splitter.
  const isJson = extname(file).toLowerCase() === ".json";
  const archive = isJson ? readChessComArchive(text) : null;

  // JSON that is not a chess.com archive is not game data. Skip it rather than letting the text
  // splitter treat it as a headerless fragment and inflate the counts — this is a measuring
  // instrument, so a wrong count is worse than a missing one.
  if (isJson && archive === null) {
    stats.files -= 1;
    stats.bytes -= bytes.length;
    stats.encodings.set(encoding, (stats.encodings.get(encoding) ?? 1) - 1);
    if (stats.encodings.get(encoding) === 0) stats.encodings.delete(encoding);
    stats.skipped.push(REDACT ? `file (index withheld)` : file);
    continue;
  }

  const games = [];
  if (archive !== null) {
    for (const entry of archive) {
      stats.jsonGames += 1;
      if (entry.rules !== null) bump(stats.jsonRules, entry.rules);
      if (entry.hasAccuracies) stats.jsonWithAccuracies += 1;
      if (entry.timeClass !== null) bump(stats.jsonTimeClasses, entry.timeClass);

      const split = splitGames(entry.pgn);
      const game = split[0] ?? { tagLines: [], moveLines: [] };

      // The rule 3b question, per game: does the PGN admit to the variant the JSON declares?
      const nonStandard = entry.rules !== null && entry.rules !== "chess";
      if (nonStandard) {
        const taggedVariant = game.tagLines.some((l) => /^\s*\[\s*Variant\s/.test(l));
        if (taggedVariant) stats.variantInBoth += 1;
        else stats.variantOnlyInJson += 1;
      }

      games.push(game);
    }
  } else {
    games.push(...splitGames(text));
  }

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
    //
    // The identifying details are retained deliberately. A count of collisions cannot tell you
    // whether the rule is working or silently merging two different games — only looking at the
    // colliding pair can, so the report has to be able to show it.
    const key = contentKey(tags, san);
    const entry = {
      fileIndex,
      gameIndex: fileGames,
      plies: san.length,
      white: tags.White ?? "?",
      black: tags.Black ?? "?",
      event: tags.Event ?? "?",
      date: tags.Date ?? "?",
      round: tags.Round ?? "?",
      result: tags.Result ?? "?",
      site: tags.Site ?? "?",
      extraTags: Object.keys(tags).length,
    };
    const prior = keyIndex.get(key);
    if (prior === undefined) keyIndex.set(key, [entry]);
    else prior.push(entry);
  }

  stats.perFile.push({
    index: fileIndex,
    games: fileGames,
    kb: Math.round(bytes.length / 102.4) / 10,
    encoding,
    file,
  });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const collisions = [...keyIndex.entries()].filter(([, v]) => v.length > 1);
const sameFile = collisions.filter(
  ([, v]) => new Set(v.map((e) => e.fileIndex)).size === 1,
);
const crossFile = collisions.filter(
  ([, v]) => new Set(v.map((e) => e.fileIndex)).size > 1,
);

/**
 * Show the games behind a set of colliding keys.
 *
 * This is the part the aggregate-only version could not do, and it is the reason the report
 * exists: rule 6 is a *judgement* that identical roster tags plus identical moves mean the same
 * game, and the only way to check a judgement is to look at the cases it decided.
 */
function describeCollisions(entries, limit = 12) {
  if (entries.length === 0) return "    none";
  const lines = [];
  for (const [key, games] of entries.slice(0, limit)) {
    lines.push(`    key ${key.slice(0, 12)} — ${games.length} games`);
    for (const g of games) {
      const who = REDACT ? "(redacted)" : `${g.white} vs ${g.black}`;
      const where = REDACT ? "" : ` · ${g.event} · ${g.site}`;
      lines.push(
        `      file ${g.fileIndex} game ${g.gameIndex}: ${g.plies} plies · ` +
          `${g.date} · R${g.round} · ${g.result} · ${g.extraTags} tags · ${who}${where}`,
      );
    }
  }
  if (entries.length > limit) {
    lines.push(`    ... and ${entries.length - limit} more`);
  }
  return lines.join("\n");
}

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
${REDACT ? "Redacted: names and paths withheld so this can go into the repo without carrying your handle." : "Full detail — the mode for reading. Use --redact for output you intend to commit."}

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

Variants — from the PGN Variant tag (ADR-0008 rule 3b / B-100)
${stats.variants.size === 0 ? "    no Variant tag anywhere" : table(stats.variants, stats.games)}
${
  stats.jsonGames === 0
    ? ""
    : `
chess.com JSON archive — the fields the /pgn endpoint discards
    games from JSON          ${String(stats.jsonGames).padStart(7)}
    with accuracies          ${String(stats.jsonWithAccuracies).padStart(7)}
  rules (the variant, JSON-side)
${table(stats.jsonRules, stats.jsonGames)}
  time_class
${table(stats.jsonTimeClasses, stats.jsonGames)}

  ADR-0008 rule 3b depends on the PGN Variant tag. Does it exist for chess.com?
    non-standard rules WITH a PGN Variant tag      ${String(stats.variantInBoth).padStart(6)}  <- rule 3b works
    non-standard rules WITHOUT a PGN Variant tag   ${String(stats.variantOnlyInJson).padStart(6)}  <- rule 3b BLIND
${
  stats.variantOnlyInJson > 0
    ? "\n    Non-zero above means rule 3b cannot see these variants from the PGN alone, and\n    would report them as illegal moves — the misdiagnosis rule 3b exists to prevent.\n    Fix is to carry the JSON `rules` field into import for the B-012 path (see B-102)."
    : "\n    Zero above is the result rule 3b needs. If the rules table shows only \"chess\",\n    this account has no variant games and the question is untested rather than answered."
}`
}

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
      within a single file   ${String(sameFile.length).padStart(7)}   <- candidate FALSE merges
      across files           ${String(crossFile.length).padStart(7)}   <- expected: overlapping exports

  SAME-FILE collisions — read these individually. One file listing a game twice is
  plausible; two genuinely different games sharing a key is the failure mode ADR-0008
  accepted as rare. If the pairs below look like the same game, the rule holds.
${describeCollisions(sameFile)}

  CROSS-FILE collisions — the rule working as intended: the same game appearing in two
  exports. Differing tag counts or ply counts here are the interesting part, because they
  show the key surviving cosmetic differences, which is exactly why it is not a byte hash.
${describeCollisions(crossFile)}

${stats.skipped.length === 0 ? "" : `Skipped — JSON that is not a chess.com archive\n${stats.skipped.map((s) => `    ${s}`).join("\n")}\n`}
Per file
    idx    games      KB  encoding    ${REDACT ? "" : "path"}
${stats.perFile.map((f) => `    ${String(f.index).padStart(3)} ${String(f.games).padStart(8)} ${String(f.kb).padStart(7)}  ${f.encoding.padEnd(16)}${REDACT ? "" : f.file}`).join("\n")}
${REDACT ? "" : "\nRun with --redact if you intend to paste any of this into the repo."}`);
