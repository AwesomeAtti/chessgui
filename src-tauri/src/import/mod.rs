//! PGN import (B-007 milestone 2) — **a pure module: text in, games and errors out.**
//!
//! No IO, no database, no Tauri. Milestone 3 wraps this in a command; B-011 gives it
//! somewhere to put the rows.
//!
//! # The policy, from ADR-0009
//!
//! 1. One game imports or one game errors. A file is never the unit of failure.
//! 2. Nothing is repaired. A refused game is not stored — the source file is still on disk.
//! 3. **The libraries are the validator and we add nothing.** No spec checker, no
//!    notation-language scan, no zero-moves guard, and above all **no legality walk**:
//!    `pgn-reader` validates syntax, and asking `shakmaty` to play the tokens would be us
//!    adding validation. `shakmaty` is not a direct dependency for exactly this reason.
//! 4. Variants are selected from the `Variant` tag, which is entirely the display side's
//!    job here, because this module builds no position.
//!
//! # What milestone 2 measured, and what it cost the spec
//!
//! **`pgn-reader`'s entire error vocabulary is two messages** — `unterminated tag` and
//! `unterminated comment` — read from the crate source (`reader.rs`), not guessed, plus IO
//! errors that an in-memory string cannot produce. That is why [`model::codes`] is a closed
//! set with one fallback.
//!
//! **Both errors are terminal, and this falsified an acceptance criterion.** The spec
//! promised that a 3,000-game file with 4 bad games imports 2,996 rows and reports 4
//! errors, "no error causes the other games to be lost". Measured: an unterminated `{`
//! swallows the rest of the input into the comment and `has_more()` goes false, so
//! **there is at most one error per input and everything after it is gone**. The crate
//! documents its errors as "irrecoverable" and means it.
//!
//! We do not resynchronise. Scanning forward for the next `[Event ` would recover those
//! games — and every recovered game would still be parsed in full by `pgn-reader`, so it
//! would not weaken rule 3 — but it is us deciding where a game begins, for an event
//! nobody has counted. B-101's un-run half is that count. Until then the importer reports
//! the failure loudly, with the byte offset past which nothing could be read and enough
//! header text to name the game, and the user still has the file. Adding recovery later is
//! fifteen lines and a fixture; removing it once shipped is not.
//!
//! **An unterminated tag mid-file is worse than an error and is not one:** it silently
//! merges two games into one. It only becomes an error at end of input. That is in
//! ADR-0009's accepted risks, measured, not inferred.

mod decode;
mod derive;
mod model;
mod visitor;

use std::collections::HashMap;
use std::io::{Cursor, Seek};

pub use decode::decode;
pub use model::{
    codes, Encoding, Game, GameId, ImportError, ImportSummary, PgnDate, Player, PlayerId,
};

use pgn_reader::Reader;
use visitor::GameVisitor;

/// Assigns identity across successive imports in one process.
///
/// Stateful on purpose: pasting twice must not hand out the same `GameId` twice, and the
/// same player appearing in two pastes should be one player. Everything here is replaced by
/// database identity at B-011 — nothing outside this process should ever persist these
/// numbers.
#[derive(Debug, Default)]
pub struct Importer {
    next_game_id: GameId,
    next_player_id: PlayerId,
    /// Normalised name to the id and the verbatim spelling first seen for it.
    players: HashMap<String, (PlayerId, String)>,
}

impl Importer {
    pub fn new() -> Self {
        Self::default()
    }

    /// Import PGN bytes, decoding UTF-8 with a Latin-1 fallback.
    ///
    /// This is milestone 4's entry point; milestone 3's paste path uses [`Self::import_text`],
    /// because a string that has crossed IPC from JavaScript is already UTF-8.
    pub fn import_bytes(&mut self, bytes: &[u8]) -> (ImportSummary, Encoding) {
        let (text, encoding) = decode(bytes);
        (self.import_text(&text), encoding)
    }

    /// Import PGN text.
    ///
    /// Never fails: a refusal is data in [`ImportSummary::errors`], not an `Err`. There is
    /// no input for which this returns nothing useful — bytes that are only PGN by extension
    /// produce one empty junk row, which ADR-0009 accepts as visible and removable.
    pub fn import_text(&mut self, text: &str) -> ImportSummary {
        let mut games = Vec::new();
        let mut errors = Vec::new();
        let mut reader = Reader::new(Cursor::new(text.as_bytes()));
        let mut index = 0usize;

        // `stream_position` on the reader subtracts what it has buffered ahead, so these are
        // true offsets into `text` and not into the parser's lookahead. That is what makes
        // byte-preserved verbatim PGN possible without us re-splitting the file — and
        // re-splitting is exactly the parsing of our own that ADR-0009 declines. Over a
        // `Cursor` it cannot fail; the `while let` is for the type, not for a real branch.
        while let Ok(start) = reader.stream_position() {
            let mut game = GameVisitor::default();
            let outcome = reader.read_game(&mut game);
            let end = reader.stream_position().unwrap_or(start);

            match outcome {
                Ok(None) => break,
                Ok(Some(())) => {
                    let pgn = slice(text, start, end).trim().to_owned();
                    games.push(self.build_game(&game, pgn));
                    index += 1;
                }
                Err(error) => {
                    errors.push(ImportError {
                        game_index: index,
                        code: code_for(&error.to_string()),
                        detail: error.to_string(),
                        byte_offset: end,
                        white: game.tag("White").map(str::to_owned),
                        black: game.tag("Black").map(str::to_owned),
                        date: game.tag("Date").map(str::to_owned),
                    });
                    // Measured: the parser cannot continue past either of its errors, and
                    // `has_more()` agrees. Looping again would spin on the same failure.
                    break;
                }
            }
        }

        ImportSummary { games, errors }
    }

    fn build_game(&mut self, visitor: &GameVisitor, pgn: String) -> Game {
        let id = self.next_game_id;
        self.next_game_id += 1;

        let white = self.player(visitor.tag("White").unwrap_or_default());
        let black = self.player(visitor.tag("Black").unwrap_or_default());

        // **The result rule, decided from the measurement.** The `Result` tag wins, because
        // ADR-0005 derives every hot field from tags and this is a hot field. The movetext
        // termination marker is the fallback for a file with no `Result` tag at all, which
        // `missing-roster-tags.pgn` is. They are not reconciled: on
        // `result-contradicts-final-token.pgn` the tag says `1-0` and the marker says `0-1`,
        // `pgn-reader` reports both without comment, and `chessops` prefers the marker — so
        // the library table and a future chessops-derived view would disagree about that
        // game. Accepted and recorded rather than fixed, because making them agree means one
        // side second-guessing the other, and the verbatim PGN carries both readings.
        let result = visitor
            .tag("Result")
            .and_then(derive::parse_result)
            .or_else(|| {
                visitor
                    .tag("Result")
                    .is_none()
                    .then(|| {
                        visitor
                            .outcome_marker
                            .as_deref()
                            .and_then(derive::parse_result)
                    })
                    .flatten()
            });

        let date = match visitor.tag("Date") {
            Some(raw) => derive::parse_date(raw),
            None => PgnDate::absent(),
        };

        // First occurrence wins; the loser survives in `pgn`. See `Game::tags`.
        let mut tags = std::collections::BTreeMap::new();
        for (name, value) in &visitor.tags {
            tags.entry(name.clone()).or_insert_with(|| value.clone());
        }

        Game {
            id,
            white,
            black,
            event: visitor.tag("Event").and_then(derive::non_empty),
            site: visitor.tag("Site").and_then(derive::non_empty),
            date,
            round: visitor.tag("Round").and_then(derive::non_empty),
            result,
            eco: visitor.tag("ECO").and_then(derive::non_empty),
            eco_url: visitor.tag("ECOUrl").and_then(derive::non_empty),
            white_elo: visitor.tag("WhiteElo").and_then(derive::parse_elo),
            black_elo: visitor.tag("BlackElo").and_then(derive::parse_elo),
            ply_count: visitor.token_count,
            tags,
            pgn,
        }
    }

    /// Look up or create a player.
    ///
    /// **A nameless player is never pooled.** A file with no `White` tag normalises to the
    /// empty string, and pooling those would assert that every anonymous player in every
    /// import is the same person — a silent false merge, which is the exact failure ADR-0008
    /// rule 6 was deleted for preferring against. Each gets its own id instead.
    fn player(&mut self, name: &str) -> Player {
        let normalised = derive::normalise_name(name);

        if normalised.is_empty() {
            let id = self.next_player_id;
            self.next_player_id += 1;
            return Player {
                id,
                name: name.to_owned(),
                normalised_name: normalised,
            };
        }

        let (id, first_spelling) = self
            .players
            .entry(normalised.clone())
            .or_insert_with(|| {
                let id = self.next_player_id;
                self.next_player_id += 1;
                (id, name.to_owned())
            })
            .clone();

        Player {
            id,
            // The first spelling seen wins, so one player is one row. Which spelling is
            // "right" when a file writes the same person two ways is B-022's question, and
            // it needs a user to answer it.
            name: first_spelling,
            normalised_name: normalised,
        }
    }
}

/// Map `pgn-reader`'s message to a stable code (B-072: the frontend owns the wording).
///
/// The vocabulary is closed because the crate's is: two `InvalidData` messages, read from
/// its source rather than inferred from behaviour. [`codes::PARSE_FAILED`] exists for the
/// version of `pgn-reader` that grows a third (B-063) — the corpus test is what will notice,
/// and until then no game is lost to an unrecognised message.
fn code_for(message: &str) -> &'static str {
    if message.contains("unterminated comment") {
        codes::UNTERMINATED_COMMENT
    } else if message.contains("unterminated tag") {
        codes::UNTERMINATED_TAG
    } else {
        codes::PARSE_FAILED
    }
}

/// Slice `text` by byte offsets, clamped to character boundaries.
///
/// The offsets come from the parser and land on token boundaries in practice; the clamp is
/// here so that a future parser change is a wrong slice rather than a panic in the importer.
fn slice(text: &str, start: u64, end: u64) -> &str {
    let start = floor_boundary(text, start as usize);
    let end = floor_boundary(text, (end as usize).max(start));
    &text[start..end]
}

fn floor_boundary(text: &str, mut index: usize) -> usize {
    index = index.min(text.len());
    while index > 0 && !text.is_char_boundary(index) {
        index -= 1;
    }
    index
}

#[cfg(test)]
mod tests {
    use super::*;

    const CLEAN: &str = "[Event \"Fixture Club Championship\"]\n\
        [Site \"Fixtureville\"]\n\
        [Date \"2024.03.17\"]\n\
        [Round \"4\"]\n\
        [White \"Vasquez, Marta\"]\n\
        [Black \"Oyelaran, Tunde\"]\n\
        [Result \"1-0\"]\n\
        \n\
        1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0\n";

    fn import(text: &str) -> ImportSummary {
        Importer::new().import_text(text)
    }

    #[test]
    fn a_clean_game_fills_every_hot_field() {
        let summary = import(CLEAN);
        assert!(summary.errors.is_empty());
        assert_eq!(summary.games.len(), 1);

        let game = &summary.games[0];
        assert_eq!(game.white.name, "Vasquez, Marta");
        assert_eq!(game.white.normalised_name, "vasquez, marta");
        assert_eq!(game.black.name, "Oyelaran, Tunde");
        assert_eq!(game.event.as_deref(), Some("Fixture Club Championship"));
        assert_eq!(game.site.as_deref(), Some("Fixtureville"));
        assert_eq!(game.round.as_deref(), Some("4"));
        assert_eq!(game.date.raw, "2024.03.17");
        assert_eq!(game.date.parsed.as_deref(), Some("2024-03-17"));
        assert_eq!(game.result, Some(1));
        assert_eq!(game.ply_count, 7);
        assert_eq!(game.tags.len(), 7);
    }

    #[test]
    fn the_verbatim_pgn_is_the_game_and_only_the_game() {
        let two = format!("{CLEAN}\n{CLEAN}");
        let summary = import(&two);
        assert_eq!(summary.games.len(), 2);
        for game in &summary.games {
            assert!(game
                .pgn
                .starts_with("[Event \"Fixture Club Championship\"]"));
            assert!(game.pgn.ends_with("1-0"));
            // One game's text, not two: the second game's tags must not be in the first.
            assert_eq!(game.pgn.matches("[Event ").count(), 1);
        }
    }

    #[test]
    fn ids_are_unique_across_successive_imports() {
        let mut importer = Importer::new();
        let first = importer.import_text(CLEAN);
        let second = importer.import_text(CLEAN);
        assert_ne!(first.games[0].id, second.games[0].id);
        // ...but the same player is the same player.
        assert_eq!(first.games[0].white.id, second.games[0].white.id);
    }

    #[test]
    fn re_importing_the_same_text_duplicates_rows_on_purpose() {
        // ADR-0008 rule 6 was deleted: no content key, no dedupe, duplicates visible and
        // removable rather than silently merged. B-022 owns dedupe. This test exists so
        // nobody "fixes" that into a merge.
        let summary = import(&format!("{CLEAN}\n{CLEAN}"));
        assert_eq!(summary.games.len(), 2);
        assert_eq!(summary.games[0].pgn, summary.games[1].pgn);
        assert_ne!(summary.games[0].id, summary.games[1].id);
    }

    #[test]
    fn the_result_tag_wins_over_a_contradicting_termination_marker() {
        let text = CLEAN.replace("4. Qxf7# 1-0", "4. Qxf7# 0-1");
        let summary = import(&text);
        assert_eq!(summary.games[0].result, Some(1), "the Result tag says 1-0");
    }

    #[test]
    fn the_termination_marker_is_the_fallback_when_there_is_no_result_tag() {
        let text = "[White \"Ferreira, Duarte\"]\n[Black \"Sokolova, Vera\"]\n\n1. e4 e5 2. Nf3 Nc6 1/2-1/2\n";
        let summary = import(text);
        assert_eq!(summary.games[0].result, Some(0));
        assert_eq!(
            summary.games[0].date.raw, "",
            "no Date tag is not a '?' date"
        );
    }

    #[test]
    fn a_star_result_is_unknown_rather_than_a_draw() {
        let text = CLEAN.replace("[Result \"1-0\"]", "[Result \"*\"]");
        assert_eq!(import(&text).games[0].result, None);
    }

    #[test]
    fn nameless_players_are_never_pooled_into_one_person() {
        let text = "[Event \"A\"]\n\n1. e4 *\n\n[Event \"B\"]\n\n1. d4 *\n";
        let summary = import(text);
        assert_eq!(summary.games.len(), 2);
        assert_ne!(
            summary.games[0].white.id, summary.games[1].white.id,
            "two unknown players are not one player"
        );
    }

    #[test]
    fn an_unterminated_comment_stops_the_import_and_names_the_game() {
        let bad = "[White \"Aliyev, Kamran\"]\n[Black \"Novak, Petra\"]\n[Date \"2024.05.01\"]\n\n1. e4 e5 { unclosed\n";
        let summary = import(&format!("{CLEAN}\n{bad}{CLEAN}"));

        assert_eq!(summary.games.len(), 1, "games before the failure import");
        assert_eq!(summary.errors.len(), 1, "at most one error per input");

        let error = &summary.errors[0];
        assert_eq!(error.code, codes::UNTERMINATED_COMMENT);
        assert_eq!(error.game_index, 1);
        assert_eq!(error.white.as_deref(), Some("Aliyev, Kamran"));
        assert_eq!(error.black.as_deref(), Some("Novak, Petra"));
        assert_eq!(error.date.as_deref(), Some("2024.05.01"));
        assert!(error.byte_offset > 0);
    }

    #[test]
    fn the_games_after_an_unterminated_comment_are_lost_and_that_is_measured() {
        // Pinning the behaviour that falsified the spec's acceptance criterion. If this ever
        // starts failing, either pgn-reader changed (B-063) or someone added resynchronisation
        // — both are decisions, and this test is where they announce themselves.
        let bad = "[White \"Aliyev, Kamran\"]\n\n1. e4 { unclosed\n";
        let summary = import(&format!("{CLEAN}\n{bad}{CLEAN}{CLEAN}"));
        assert_eq!(summary.games.len(), 1);
        assert_eq!(summary.errors.len(), 1);
    }

    #[test]
    fn bytes_that_are_only_pgn_by_extension_produce_one_junk_row() {
        let summary = import("\u{0}\u{1}not a pgn at all\u{2}\n");
        assert!(
            summary.errors.is_empty(),
            "the library does not refuse this"
        );
        assert_eq!(summary.games.len(), 1);
        assert_eq!(summary.games[0].ply_count, 0);
        assert!(summary.games[0].tags.is_empty());
    }

    #[test]
    fn duplicate_tags_resolve_first_one_wins() {
        let text = "[Event \"First\"]\n[Result \"1-0\"]\n[Result \"0-1\"]\n[Event \"Second\"]\n\n1. e4 1-0\n";
        let game = &import(text).games[0];
        assert_eq!(game.event.as_deref(), Some("First"));
        assert_eq!(game.result, Some(1));
        // Nothing is lost: the verbatim PGN still carries both.
        assert!(game.pgn.contains("Second"));
        assert!(game.pgn.contains("0-1"));
    }

    #[test]
    fn latin1_bytes_import_with_their_accents() {
        let bytes =
            b"[White \"M\xfcller, J\xf6rg\"]\n[Black \"N\xfa\xf1ez, In\xe9s\"]\n\n1. e4 e5 1-0\n";
        let (summary, encoding) = Importer::new().import_bytes(bytes);
        assert_eq!(encoding, Encoding::Latin1);
        assert_eq!(summary.games[0].white.name, "Müller, Jörg");
        assert_eq!(summary.games[0].white.normalised_name, "muller, jorg");
        assert_eq!(summary.games[0].black.name, "Núñez, Inés");
    }

    #[test]
    fn empty_input_is_not_an_error() {
        let summary = import("");
        assert!(summary.games.is_empty());
        assert!(summary.errors.is_empty());
    }

    #[test]
    fn serialisation_uses_the_names_the_frontend_model_declares() {
        let summary = import(CLEAN);
        let json = serde_json::to_value(&summary).expect("serialises");
        let game = &json["games"][0];
        for key in [
            "id", "white", "black", "event", "site", "date", "round", "result", "eco", "ecoUrl",
            "whiteElo", "blackElo", "plyCount", "tags", "pgn",
        ] {
            assert!(!game[key].is_null() || key != "id", "missing key {key}");
            assert!(game.get(key).is_some(), "missing key {key}");
        }
        assert!(game["white"].get("normalisedName").is_some());
        assert!(game["date"].get("parsed").is_some());
    }
}
