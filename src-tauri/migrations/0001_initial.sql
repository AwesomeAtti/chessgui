-- Migration 0001: the ADR-0005 schema (players, games).
--
-- Applied once, tracked via PRAGMA user_version (see db::migrate). No migration framework:
-- at one migration a dependency for it is premature (B-011 spec, decision 3).

CREATE TABLE players (
    id               INTEGER PRIMARY KEY,
    -- Verbatim, as it appeared in the PGN tag. Authoritative (ADR-0005, B-058).
    name             TEXT NOT NULL,
    -- Derived and deliberately lossy: case-folded, accent-stripped, canonicalised. Used for
    -- matching and grouping only, never displayed.
    normalised_name  TEXT NOT NULL
);

-- The lookup path for "find or insert" on every game imported.
CREATE INDEX idx_players_normalised_name ON players (normalised_name);

CREATE TABLE games (
    id                INTEGER PRIMARY KEY,
    white_player_id   INTEGER NOT NULL REFERENCES players (id),
    black_player_id   INTEGER NOT NULL REFERENCES players (id),

    -- Hot fields, strictly derived from the tags (ADR-0005, B-060).
    event             TEXT,
    site              TEXT,

    -- Dates stored twice (ADR-0005, B-059): date_raw is the verbatim PGN string, including any
    -- '?' placeholders; the rest are derived so a partially-known date still sorts and filters.
    date_raw          TEXT NOT NULL,
    date_parsed       TEXT,
    date_year         INTEGER,
    date_month        INTEGER,

    round             TEXT,
    -- 1 = white win, 0 = draw, -1 = black win, NULL = unknown/in progress. Never the string
    -- "1-0" (ADR-0005, B-060).
    result            INTEGER,
    eco               TEXT,
    -- chess.com's ECOUrl (B-102). Finer-grained than eco, not a prettier version of it.
    eco_url           TEXT,
    white_elo         INTEGER,
    black_elo         INTEGER,
    -- A count of movetext tokens, not necessarily of legal moves (see import::model::Game).
    ply_count         INTEGER NOT NULL,

    -- The complete tag set (ADR-0005, B-060), including tags never promoted to a column.
    tags_json         TEXT NOT NULL,

    -- The verbatim PGN text of this game. **This is the source of truth**; every column above
    -- is derived from it (ADR-0005; ADR-0004 addendum, session 9, on what that does and doesn't
    -- mean for the original file on disk).
    pgn               TEXT NOT NULL
);

CREATE INDEX idx_games_white_player_id ON games (white_player_id);
CREATE INDEX idx_games_black_player_id ON games (black_player_id);
CREATE INDEX idx_games_date_parsed ON games (date_parsed);
