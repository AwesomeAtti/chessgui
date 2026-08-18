//! The corpus as a guard rather than a record (B-007 milestone 2).
//!
//! `fixtures/pgn/expected.json` carried measurements taken by milestone 1's probe, which
//! asserted nothing — deliberately, because asserting before a human has read the output is
//! how a test ends up certifying a bug. A human has now read it, so these numbers become
//! assertions, and the manifest starts failing when the importer or `pgn-reader` (B-063)
//! changes underneath it.
//!
//! Four measured columns are checked here:
//!
//! - `importOutcome` — `imports` or `refused`. Exactly one of eighteen is refused.
//! - `importErrorCode` — the stable code the frontend will localise (B-072).
//! - `importTokens` — movetext tokens the parser handed back, which becomes `plyCount`.
//! - `importedTags` — how many tags survive the importer's first-one-wins map. It differs
//!   from `importTags` on exactly one fixture, and **the difference is the point**:
//!   `pgn-reader` reports every tag pair including repeats, and choosing between them is
//!   ours. Recording both keeps the parser's truth and our decision separate.
//!
//! The display-side columns (`plies`, `truncatedAtPly`) belong to `chessops` and are
//! asserted by the TypeScript suite. Two libraries, two suites, one corpus.

use std::fs;
use std::path::PathBuf;

use chessgui_lib::import::Importer;
use serde_json::Value;

fn corpus_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../fixtures/pgn")
}

#[test]
fn the_importer_reproduces_every_measured_value_in_the_manifest() {
    let dir = corpus_dir();
    let text = fs::read_to_string(dir.join("expected.json"))
        .expect("fixtures/pgn/expected.json is unreadable — has the corpus moved?");
    let parsed: Value = serde_json::from_str(&text).expect("expected.json is not valid JSON");
    let fixtures = parsed["fixtures"]
        .as_array()
        .expect("expected.json must hold a `fixtures` array");

    // Without this, a moved corpus is zero iterations and a green suite — the failure a
    // harness is supposed to remove rather than introduce (B-106).
    assert_eq!(
        fixtures.len(),
        18,
        "the corpus changed size; update this number deliberately"
    );

    for entry in fixtures {
        let name = entry["file"].as_str().expect("every entry needs a `file`");
        let bytes = fs::read(dir.join(name)).unwrap_or_else(|_| panic!("missing fixture: {name}"));

        // Bytes rather than text: `latin1-no-declaration.pgn` is not valid UTF-8, and going
        // through the same door as milestone 4 is the point of having the fallback here.
        let (summary, _encoding) = Importer::new().import_bytes(&bytes);

        let expected_outcome = entry["importOutcome"]
            .as_str()
            .unwrap_or_else(|| panic!("{name} has no importOutcome"));
        let expected_code = entry["importErrorCode"].as_str();

        match expected_outcome {
            "refused" => {
                assert_eq!(
                    summary.errors.len(),
                    1,
                    "{name}: expected one error, got {:?}",
                    summary.errors
                );
                assert!(
                    summary.games.is_empty(),
                    "{name}: a refused fixture must not also yield a game"
                );
                assert_eq!(
                    Some(summary.errors[0].code),
                    expected_code,
                    "{name}: error code changed"
                );
                // The error must be able to name the game, or the import report cannot
                // (B-097). Measured: the roster tags arrive before the parser gives up.
                assert!(
                    summary.errors[0].white.is_some(),
                    "{name}: an error that cannot name its game is not actionable"
                );
            }
            "imports" => {
                assert!(
                    summary.errors.is_empty(),
                    "{name}: expected no errors, got {:?}",
                    summary.errors
                );
                assert_eq!(
                    expected_code, None,
                    "{name}: importing fixtures have no code"
                );
                // Every fixture in the corpus holds exactly one game, which is what makes
                // the single-game assertions below meaningful.
                assert_eq!(summary.games.len(), 1, "{name}: expected exactly one game");

                let game = &summary.games[0];
                let expected_tokens = entry["importTokens"].as_u64().unwrap_or_else(|| {
                    panic!("{name} has no importTokens");
                });
                assert_eq!(
                    u64::from(game.ply_count),
                    expected_tokens,
                    "{name}: token count changed"
                );

                let expected_tags = entry["importedTags"]
                    .as_u64()
                    .unwrap_or_else(|| panic!("{name} has no importedTags"));
                assert_eq!(
                    game.tags.len() as u64,
                    expected_tags,
                    "{name}: the tags the importer keeps changed"
                );

                // The verbatim PGN is the source of truth, so it is not allowed to be empty
                // for a game that imported — except for bytes that are only PGN by extension,
                // which have no game text to preserve and are an accepted risk, not a bug.
                if expected_tags > 0 {
                    assert!(!game.pgn.is_empty(), "{name}: verbatim PGN was lost");
                }
            }
            other => panic!("{name}: unknown importOutcome {other:?}"),
        }
    }
}

#[test]
fn the_whole_corpus_imports_as_one_input_and_loses_everything_after_the_bad_game() {
    // The corpus concatenated is the closest thing to the acceptance criterion's
    // "3,000 games, 4 of them bad" — and it is where that criterion was falsified. One
    // unterminated comment ends the import, so the games after it never arrive.
    //
    // This asserts the measured behaviour rather than the wished-for one. If someone adds
    // resynchronisation, this test is where the decision announces itself.
    let dir = corpus_dir();
    let mut files: Vec<PathBuf> = fs::read_dir(&dir)
        .expect("fixtures/pgn/ is unreadable")
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|ext| ext == "pgn"))
        .collect();
    files.sort();

    let mut combined = Vec::new();
    for path in &files {
        combined.extend_from_slice(&fs::read(path).expect("unreadable fixture"));
        combined.push(b'\n');
    }

    let (summary, _) = Importer::new().import_bytes(&combined);

    assert_eq!(
        summary.errors.len(),
        1,
        "at most one error per input, because pgn-reader's errors are irrecoverable"
    );
    assert_eq!(
        summary.errors[0].code,
        chessgui_lib::import::codes::UNTERMINATED_COMMENT
    );

    // Sorted alphabetically, `unterminated-comment.pgn` is the 15th of 18 fixtures, so the
    // games before it import and the rest are swallowed by the unclosed brace.
    assert_eq!(
        summary.games.len(),
        summary.errors[0].game_index,
        "every game before the failure imports"
    );
    assert!(
        summary.games.len() < files.len() - 1,
        "the games after the failure are lost — that is the measured cost of no resynchronisation"
    );
}
