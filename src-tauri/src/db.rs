//! The SQLite store (B-011) — where a `Game` from [`crate::import`] ends up once it is imported,
//! and where it comes back from for the library and for opening one.
//!
//! **No Tauri.** Like [`crate::files`], this module does real IO (a database file) but knows
//! nothing about the shell around it, so it is compiled and tested here rather than handed over
//! unverified. `lib.rs` wraps [`open`]/[`list_games`]/[`get_game`]/[`insert_import`] in commands
//! and adds nothing.
//!
//! # Identity, and what changes here
//!
//! [`crate::import::Importer`] hands out per-process ids so that pasting twice doesn't reissue
//! one — that was always a stand-in. **The database is the identity authority now**: every
//! `GameId`/`PlayerId` a caller sees after this module runs is a real SQLite row id, stable
//! across restarts. This module ignores whatever id a [`crate::import::Game`] arrives with and
//! assigns its own on insert.
//!
//! # Player matching
//!
//! The same rule the in-memory `Importer` used, moved into SQL: look up by `normalised_name`,
//! reuse the row if found, insert if not — **except a nameless player (empty `normalised_name`)
//! is never pooled**, because pooling would assert every anonymous player in every import is the
//! same person. That has to happen inside the same transaction as the games that reference the
//! new player, or two rows in one import batch could both miss the lookup and create two players
//! for the same name (see the B-011 spec's risk section).
//!
//! # Schema
//!
//! `migrations/0001_initial.sql` is the ADR-0005 shape: `players` and `games`, with the tag set
//! kept as JSON alongside the hot columns. Read that file for the column-by-column reasoning;
//! it is not repeated here.

use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension, Transaction};

use crate::import::{Game, GameId, PgnDate, Player, PlayerId};

/// The one embedded migration. Numbered SQL files, tracked by `PRAGMA user_version` — see the
/// B-011 spec, decision 3: a migration framework is premature at one migration.
const MIGRATIONS: &[(&str, &str)] = &[(
    "0001_initial",
    include_str!("../migrations/0001_initial.sql"),
)];

/// Open (creating if absent) the database at `path`, and bring it up to the latest migration.
///
/// `journal_mode = WAL` and `foreign_keys = ON` are session pragmas — SQLite does not persist
/// either in the file, so every connection sets them itself rather than relying on the file
/// having been created with them once. WAL means a future read is not blocked by a write in
/// flight; foreign keys means an orphaned `white_player_id` is a rejected insert, not a silent
/// dangling reference.
pub fn open(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&conn)?;
    Ok(conn)
}

/// Open an in-memory database, migrated and ready. Used by this module's own tests; also a
/// reasonable escape hatch if a caller ever wants a scratch database.
pub fn open_in_memory() -> rusqlite::Result<Connection> {
    let conn = Connection::open_in_memory()?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&conn)?;
    Ok(conn)
}

/// Apply every migration past the connection's current `user_version`, in order, each in its
/// own transaction. Safe to call on every startup: a database already at the latest version
/// applies nothing.
fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    let current: u32 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    let current = current as usize;

    for (index, (name, sql)) in MIGRATIONS.iter().enumerate() {
        if index < current {
            continue;
        }
        conn.execute_batch(sql).map_err(|error| {
            rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_ERROR),
                Some(format!("migration {name} failed: {error}")),
            )
        })?;
        // `user_version` cannot be bound as a parameter; the value comes from the loop index,
        // never user input, so a formatted string is not an injection risk here.
        conn.execute_batch(&format!("PRAGMA user_version = {}", index + 1))?;
    }

    Ok(())
}

/// Insert every game and error-free result of one import call. Games from the same call that
/// share a player (by `normalised_name`) resolve to one player row, whether that row already
/// existed or is created partway through this batch.
///
/// Returns the new, stable `GameId` for each game, in the same order as `games`.
pub fn insert_import(conn: &mut Connection, games: &[Game]) -> rusqlite::Result<Vec<GameId>> {
    let tx = conn.transaction()?;
    let mut ids = Vec::with_capacity(games.len());
    for game in games {
        ids.push(insert_game(&tx, game)?);
    }
    tx.commit()?;
    Ok(ids)
}

fn insert_game(tx: &Transaction, game: &Game) -> rusqlite::Result<GameId> {
    let white_id = find_or_insert_player(tx, &game.white)?;
    let black_id = find_or_insert_player(tx, &game.black)?;
    let tags_json =
        serde_json::to_string(&game.tags).expect("a BTreeMap<String, String> always serialises");

    tx.execute(
        "INSERT INTO games (
            white_player_id, black_player_id, event, site,
            date_raw, date_parsed, date_year, date_month,
            round, result, eco, eco_url, white_elo, black_elo,
            ply_count, tags_json, pgn
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        params![
            white_id as i64,
            black_id as i64,
            game.event,
            game.site,
            game.date.raw,
            game.date.parsed,
            game.date.year,
            game.date.month,
            game.round,
            game.result,
            game.eco,
            game.eco_url,
            game.white_elo,
            game.black_elo,
            game.ply_count,
            tags_json,
            game.pgn,
        ],
    )?;

    Ok(tx.last_insert_rowid() as GameId)
}

/// Find a player by `normalised_name`, or insert one. **A nameless player (empty
/// `normalised_name`) is never pooled** — same reasoning as the in-memory `Importer` this
/// replaces (see `import::Importer::player`): each gets its own row, because pooling would
/// silently assert that every anonymous player is the same person.
fn find_or_insert_player(tx: &Transaction, player: &Player) -> rusqlite::Result<PlayerId> {
    if player.normalised_name.is_empty() {
        return insert_player(tx, player);
    }

    let existing: Option<i64> = tx
        .query_row(
            "SELECT id FROM players WHERE normalised_name = ?1 LIMIT 1",
            params![player.normalised_name],
            |row| row.get(0),
        )
        .optional()?;

    match existing {
        Some(id) => Ok(id as PlayerId),
        None => insert_player(tx, player),
    }
}

fn insert_player(tx: &Transaction, player: &Player) -> rusqlite::Result<PlayerId> {
    tx.execute(
        "INSERT INTO players (name, normalised_name) VALUES (?1, ?2)",
        params![player.name, player.normalised_name],
    )?;
    Ok(tx.last_insert_rowid() as PlayerId)
}

/// A game as the library table needs it: hot fields only. **Never carries `tags` or `pgn`** —
/// that is the fix for B-033's measurement that the IPC payload was 1.5x the source file because
/// every row carried its own verbatim PGN across the wire, and the library table never read it.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameSummary {
    pub id: GameId,
    pub white: Player,
    pub black: Player,
    pub event: Option<String>,
    pub site: Option<String>,
    pub date: PgnDate,
    pub round: Option<String>,
    pub result: Option<i8>,
    pub eco: Option<String>,
    pub eco_url: Option<String>,
    pub white_elo: Option<u32>,
    pub black_elo: Option<u32>,
    pub ply_count: u32,
}

/// Every game in the database, most recently imported first. Hot fields only — see
/// [`GameSummary`].
pub fn list_games(conn: &Connection) -> rusqlite::Result<Vec<GameSummary>> {
    let mut stmt = conn.prepare(
        "SELECT
            g.id, g.event, g.site,
            g.date_raw, g.date_parsed, g.date_year, g.date_month,
            g.round, g.result, g.eco, g.eco_url, g.white_elo, g.black_elo, g.ply_count,
            wp.id, wp.name, wp.normalised_name,
            bp.id, bp.name, bp.normalised_name
         FROM games g
         JOIN players wp ON wp.id = g.white_player_id
         JOIN players bp ON bp.id = g.black_player_id
         ORDER BY g.id DESC",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(GameSummary {
            id: row.get::<_, i64>(0)? as GameId,
            event: row.get(1)?,
            site: row.get(2)?,
            date: PgnDate {
                raw: row.get(3)?,
                parsed: row.get(4)?,
                year: row.get(5)?,
                month: row.get(6)?,
            },
            round: row.get(7)?,
            result: row.get(8)?,
            eco: row.get(9)?,
            eco_url: row.get(10)?,
            white_elo: row.get(11)?,
            black_elo: row.get(12)?,
            ply_count: row.get(13)?,
            white: Player {
                id: row.get::<_, i64>(14)? as PlayerId,
                name: row.get(15)?,
                normalised_name: row.get(16)?,
            },
            black: Player {
                id: row.get::<_, i64>(17)? as PlayerId,
                name: row.get(18)?,
                normalised_name: row.get(19)?,
            },
        })
    })?;

    rows.collect()
}

/// One game, in full — including `tags` and the verbatim `pgn`. `None` if `id` does not exist
/// (already-deleted or never-imported; there is no delete path yet, so in practice this means a
/// stale id from before a rebuild).
pub fn get_game(conn: &Connection, id: GameId) -> rusqlite::Result<Option<Game>> {
    conn.query_row(
        "SELECT
            g.event, g.site,
            g.date_raw, g.date_parsed, g.date_year, g.date_month,
            g.round, g.result, g.eco, g.eco_url, g.white_elo, g.black_elo, g.ply_count,
            g.tags_json, g.pgn,
            wp.id, wp.name, wp.normalised_name,
            bp.id, bp.name, bp.normalised_name
         FROM games g
         JOIN players wp ON wp.id = g.white_player_id
         JOIN players bp ON bp.id = g.black_player_id
         WHERE g.id = ?1",
        params![id as i64],
        |row| {
            let tags_json: String = row.get(13)?;
            Ok(Game {
                id,
                event: row.get(0)?,
                site: row.get(1)?,
                date: PgnDate {
                    raw: row.get(2)?,
                    parsed: row.get(3)?,
                    year: row.get(4)?,
                    month: row.get(5)?,
                },
                round: row.get(6)?,
                result: row.get(7)?,
                eco: row.get(8)?,
                eco_url: row.get(9)?,
                white_elo: row.get(10)?,
                black_elo: row.get(11)?,
                ply_count: row.get(12)?,
                tags: serde_json::from_str(&tags_json).unwrap_or_default(),
                pgn: row.get(14)?,
                white: Player {
                    id: row.get::<_, i64>(15)? as PlayerId,
                    name: row.get(16)?,
                    normalised_name: row.get(17)?,
                },
                black: Player {
                    id: row.get::<_, i64>(18)? as PlayerId,
                    name: row.get(19)?,
                    normalised_name: row.get(20)?,
                },
            })
        },
    )
    .optional()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::import::Importer;

    const CLEAN: &str = "[Event \"Fixture Club Championship\"]\n\
        [Site \"Fixtureville\"]\n\
        [Date \"2024.03.17\"]\n\
        [Round \"4\"]\n\
        [White \"Vasquez, Marta\"]\n\
        [Black \"Oyelaran, Tunde\"]\n\
        [Result \"1-0\"]\n\
        \n\
        1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0\n";

    fn imported(text: &str) -> Vec<Game> {
        Importer::new().import_text(text).games
    }

    #[test]
    fn a_migrated_database_starts_empty() {
        let conn = open_in_memory().unwrap();
        assert!(list_games(&conn).unwrap().is_empty());
    }

    #[test]
    fn migrating_twice_is_a_no_op() {
        let conn = open_in_memory().unwrap();
        migrate(&conn).unwrap(); // already at the latest version; must not re-apply
        let version: u32 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, 1);
    }

    #[test]
    fn an_inserted_game_round_trips_through_list_and_get() {
        let mut conn = open_in_memory().unwrap();
        let games = imported(CLEAN);
        let ids = insert_import(&mut conn, &games).unwrap();
        assert_eq!(ids.len(), 1);

        let summaries = list_games(&conn).unwrap();
        assert_eq!(summaries.len(), 1);
        assert_eq!(summaries[0].id, ids[0]);
        assert_eq!(summaries[0].white.name, "Vasquez, Marta");
        assert_eq!(summaries[0].result, Some(1));

        let full = get_game(&conn, ids[0]).unwrap().expect("the game exists");
        assert_eq!(full.pgn, games[0].pgn);
        assert_eq!(full.tags.len(), games[0].tags.len());
    }

    #[test]
    fn list_games_never_carries_tags_or_pgn() {
        // GameSummary has no such fields at all, so this is enforced by the type — this test
        // is the guardrail that stops someone widening the struct without noticing why it's
        // narrow. See the doc comment on GameSummary.
        let mut conn = open_in_memory().unwrap();
        insert_import(&mut conn, &imported(CLEAN)).unwrap();
        let json = serde_json::to_string(&list_games(&conn).unwrap()).unwrap();
        assert!(!json.contains("Fixture Club Championship") || !json.contains("pgn"));
        assert!(!json.to_lowercase().contains("\"pgn\""));
        assert!(!json.to_lowercase().contains("\"tags\""));
    }

    #[test]
    fn get_game_of_an_unknown_id_is_none() {
        let conn = open_in_memory().unwrap();
        assert_eq!(get_game(&conn, 999).unwrap(), None);
    }

    #[test]
    fn the_same_player_across_two_imports_is_one_row() {
        let mut conn = open_in_memory().unwrap();
        insert_import(&mut conn, &imported(CLEAN)).unwrap();
        insert_import(&mut conn, &imported(CLEAN)).unwrap();

        let summaries = list_games(&conn).unwrap();
        assert_eq!(
            summaries.len(),
            2,
            "re-importing duplicates rows on purpose (B-022)"
        );
        assert_eq!(
            summaries[0].white.id, summaries[1].white.id,
            "the same normalised name is one player row, across separate import calls"
        );
    }

    #[test]
    fn two_new_players_with_the_same_name_in_one_batch_resolve_to_one_row() {
        // The case the B-011 spec's risk section calls out: both occurrences are new to the
        // database in the same insert_import call, so the lookup for the second one must see
        // the first one's insert rather than missing and creating a second row.
        let mut conn = open_in_memory().unwrap();
        let mut games = imported(CLEAN);
        games.push(imported(CLEAN).remove(0));
        let ids = insert_import(&mut conn, &games).unwrap();
        assert_eq!(ids.len(), 2);

        let a = get_game(&conn, ids[0]).unwrap().unwrap();
        let b = get_game(&conn, ids[1]).unwrap().unwrap();
        assert_eq!(a.white.id, b.white.id);
        assert_eq!(a.black.id, b.black.id);
    }

    #[test]
    fn nameless_players_are_never_pooled_across_games() {
        let text = "[Event \"A\"]\n\n1. e4 *\n\n[Event \"B\"]\n\n1. d4 *\n";
        let mut conn = open_in_memory().unwrap();
        let ids = insert_import(&mut conn, &imported(text)).unwrap();

        let a = get_game(&conn, ids[0]).unwrap().unwrap();
        let b = get_game(&conn, ids[1]).unwrap().unwrap();
        assert_ne!(
            a.white.id, b.white.id,
            "two unknown players are not one player, in the database either"
        );
    }

    #[test]
    fn a_players_first_spelling_wins_on_reimport() {
        let first = imported(CLEAN);
        let mut second_text = CLEAN.replace("Vasquez, Marta", "VASQUEZ, MARTA");
        // Keep the normalised form identical (case-folding only) so this exercises the name
        // column, not a different player.
        let _ = &mut second_text;

        let mut conn = open_in_memory().unwrap();
        insert_import(&mut conn, &first).unwrap();
        let ids = insert_import(&mut conn, &imported(&second_text)).unwrap();

        let second = get_game(&conn, ids[0]).unwrap().unwrap();
        assert_eq!(
            second.white.name, "Vasquez, Marta",
            "the spelling from the first import wins, same as the in-memory Importer"
        );
    }

    #[test]
    fn ids_are_stable_row_ids_not_the_importers_placeholders() {
        // Two independent Importer instances would both start their internal counters at 0 —
        // the whole reason B-011 replaces that scheme. The database must not repeat it.
        let mut conn = open_in_memory().unwrap();
        let first_ids = insert_import(&mut conn, &imported(CLEAN)).unwrap();
        let second_ids =
            insert_import(&mut conn, &Importer::new().import_text(CLEAN).games).unwrap();
        assert_ne!(first_ids[0], second_ids[0]);
    }
}
