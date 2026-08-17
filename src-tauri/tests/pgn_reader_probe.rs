//! B-007 milestone 1 — **a measurement, not product code.**
//!
//! One question: **what does `pgn-reader` alone do with each fixture in `fixtures/pgn/`?**
//!
//! "Alone" is the whole point. `pgn-reader` validates *syntax* and explicitly does not validate move
//! legality; legality only happens if we ask `shakmaty` to play the moves, and asking is us adding
//! validation, which ADR-0009 declines. The MVP importer therefore never builds a board — legality is
//! checked on the display side by `chessops`, for the one game the user opens, where it is free.
//!
//! So this probe walks no positions and refuses nothing. It reports what the parser hands back, and
//! **the number that matters is how many games it refuses outright**, because under ADR-0009 that is
//! the entire set of import errors.
//!
//! Two things it deliberately does not do:
//!
//! - **It asserts nothing about behaviour.** It prints. Asserting before a human has read the output
//!   would bake in whatever the library happens to do today, which is how a test ends up certifying
//!   a bug. `fixtures/pgn/expected.json` deliberately carries no import expectations until this has
//!   been run and read.
//! - **It does not check legality**, so `illegal-move-midgame.pgn` is expected to look perfectly fine
//!   here. That is the policy working, not a gap: the illegal move surfaces when the game is opened.
//!
//! Run it with output visible:
//!
//! ```text
//! cargo test --manifest-path src-tauri/Cargo.toml --test pgn_reader_probe -- --nocapture
//! ```
use std::fs;
use std::io::Cursor;
use std::ops::ControlFlow;
use std::path::PathBuf;

use pgn_reader::{RawTag, Reader, SanPlus, Visitor};

/// What one game looked like to `pgn-reader`.
#[derive(Default)]
struct Probe {
    tag_names: Vec<String>,
    variant: Option<String>,
    /// Every SAN token **as pgn-reader handed it back**, which is the measurement: if the file said
    /// `Sf3` and this says `f3`, the token was rewritten rather than refused — the behaviour B-099
    /// found in `chessops`, and the open question on this side.
    san: Vec<String>,
}

impl Visitor for Probe {
    type Tags = ();
    type Movetext = ();
    type Output = ();

    fn begin_tags(&mut self) -> ControlFlow<Self::Output, Self::Tags> {
        ControlFlow::Continue(())
    }

    fn tag(
        &mut self,
        _tags: &mut Self::Tags,
        name: &[u8],
        value: RawTag<'_>,
    ) -> ControlFlow<Self::Output> {
        let name = String::from_utf8_lossy(name).into_owned();
        if name == "Variant" {
            self.variant = Some(String::from_utf8_lossy(value.as_bytes()).into_owned());
        }
        self.tag_names.push(name);
        ControlFlow::Continue(())
    }

    fn begin_movetext(&mut self, _tags: Self::Tags) -> ControlFlow<Self::Output, Self::Movetext> {
        ControlFlow::Continue(())
    }

    fn san(
        &mut self,
        _movetext: &mut Self::Movetext,
        san_plus: SanPlus,
    ) -> ControlFlow<Self::Output> {
        self.san.push(san_plus.to_string());
        ControlFlow::Continue(())
    }

    fn end_game(&mut self, _movetext: Self::Movetext) -> Self::Output {}
}

fn corpus_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../fixtures/pgn")
}

/// The move-shaped tokens the file itself contains, so a rewritten or dropped token is visible.
///
/// The first version of this split on whitespace and skipped tokens that merely *started* with `{`,
/// which counted the innards of `{ [%clk 0:10:00] }` as moves and reported false differences. Strip
/// braced comments first instead.
fn raw_move_tokens(text: &str) -> Vec<String> {
    let mut movetext = String::new();
    for line in text.lines() {
        if !line.starts_with('[') {
            movetext.push_str(line);
            movetext.push(' ');
        }
    }

    let mut stripped = String::new();
    let mut depth = 0usize;
    for ch in movetext.chars() {
        match ch {
            '{' => depth += 1,
            '}' => depth = depth.saturating_sub(1),
            _ if depth == 0 => stripped.push(ch),
            _ => {}
        }
    }

    stripped
        .split_whitespace()
        .filter(|token| !token.contains('.') && !matches!(*token, "1-0" | "0-1" | "1/2-1/2" | "*"))
        .map(str::to_owned)
        .collect()
}

#[test]
fn measure_pgn_reader_against_the_shared_corpus() {
    let dir = corpus_dir();
    let mut files: Vec<PathBuf> = fs::read_dir(&dir)
        .expect("fixtures/pgn/ is unreadable")
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|ext| ext == "pgn"))
        .collect();
    files.sort();
    assert!(!files.is_empty(), "the shared corpus is empty");

    println!(
        "\n=== B-007 milestone 1: pgn-reader over {} fixtures ===",
        files.len()
    );
    println!("No legality walk: pgn-reader validates syntax only, and ADR-0009 adds nothing.");
    println!("An import error is a game this refuses. Watch for ALTERED and for refusals.\n");

    for path in &files {
        let bytes = fs::read(path).expect("fixture unreadable");
        // ADR-0009's one tolerance, inline: UTF-8, else Latin-1. Never fail.
        let text = match std::str::from_utf8(&bytes) {
            Ok(utf8) => utf8.to_owned(),
            Err(_) => bytes.iter().copied().map(char::from).collect(),
        };
        let name = path.file_name().unwrap_or_default().to_string_lossy();

        let mut reader = Reader::new(Cursor::new(text.as_bytes()));
        let mut games = 0;
        loop {
            let mut probe = Probe::default();
            match reader.read_game(&mut probe) {
                Err(err) => {
                    println!("{name}: REFUSED by pgn-reader: {err}");
                    break;
                }
                Ok(None) => break,
                Ok(Some(())) => {
                    games += 1;
                    println!(
                        "{name} game {games}: tags={} tokens={}{}",
                        probe.tag_names.len(),
                        probe.san.len(),
                        probe
                            .variant
                            .as_ref()
                            .map(|v| format!(" · Variant={v:?}"))
                            .unwrap_or_default(),
                    );

                    // **Always print both lists.** The first version printed only a count when the
                    // lengths differed, which fired on exactly the fixtures the measurement existed
                    // to explain — German and French SAN — and so answered nothing. Comparing by
                    // `Display` is also approximate: `P@e4` round-trips as `@e4`, which is a
                    // formatting difference and not a parse difference. So show the data and let a
                    // human judge, rather than having the test decide.
                    let raw = raw_move_tokens(&text);
                    if games == 1 {
                        println!("    file:   {}", raw.join(" "));
                        println!("    parser: {}", probe.san.join(" "));
                        if raw.len() != probe.san.len() {
                            println!(
                                "    COUNTS DIFFER: file {} vs parser {}",
                                raw.len(),
                                probe.san.len()
                            );
                        } else if raw != probe.san {
                            println!("    TOKENS DIFFER (may be Display formatting only)");
                        }
                    }
                    if !probe.tag_names.is_empty() {
                        println!("    tags:   {}", probe.tag_names.join(" "));
                    }
                }
            }
        }
        if games == 0 {
            println!("{name}: no games read");
        }
    }
    println!();
}
