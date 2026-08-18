//! The `pgn-reader` visitor. It collects and it counts; it decides nothing.
//!
//! Note what is missing: no `shakmaty`, no position, no legality. ADR-0009 rule 3 —
//! `pgn-reader` validates syntax, and asking a board to play the tokens would be us adding
//! validation. Legality is `chessops`' job on the display side, for the one game the user
//! opens.

use std::ops::ControlFlow;

use pgn_reader::{Outcome, RawTag, SanPlus, Visitor};

/// Everything the parser handed back for one game.
#[derive(Debug, Default)]
pub struct GameVisitor {
    /// Tag pairs in file order, duplicates included. The importer decides which wins; the
    /// visitor must not, because "first one wins" is a documented choice and not a fact.
    pub tags: Vec<(String, String)>,
    /// Movetext tokens, counted rather than kept — the MVP has no move list (B-009 does).
    pub token_count: u32,
    /// The movetext termination marker, if the game had one, as its PGN text.
    ///
    /// Reported **separately from the `Result` tag and never reconciled with it**. Measured
    /// on `result-contradicts-final-token.pgn`: the tag says `1-0` and this says `0-1`.
    pub outcome_marker: Option<String>,
}

impl GameVisitor {
    /// First occurrence wins, matching `chessops`, so the two sides agree on a file that
    /// repeats a tag. The losing value survives in the verbatim PGN.
    pub fn tag(&self, name: &str) -> Option<&str> {
        self.tags
            .iter()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.as_str())
    }
}

impl Visitor for GameVisitor {
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
        // Lossy conversion is correct here rather than merely convenient: the bytes have
        // already been decoded once (UTF-8 or Latin-1), so anything still unrepresentable
        // is genuinely damaged, and a damaged tag must not fail an import.
        self.tags.push((
            String::from_utf8_lossy(name).into_owned(),
            String::from_utf8_lossy(value.as_bytes()).into_owned(),
        ));
        ControlFlow::Continue(())
    }

    fn begin_movetext(&mut self, _tags: Self::Tags) -> ControlFlow<Self::Output, Self::Movetext> {
        ControlFlow::Continue(())
    }

    fn san(
        &mut self,
        _movetext: &mut Self::Movetext,
        _san_plus: SanPlus,
    ) -> ControlFlow<Self::Output> {
        self.token_count += 1;
        ControlFlow::Continue(())
    }

    fn outcome(
        &mut self,
        _movetext: &mut Self::Movetext,
        outcome: Outcome,
    ) -> ControlFlow<Self::Output> {
        self.outcome_marker = Some(outcome.to_string());
        ControlFlow::Continue(())
    }

    fn end_game(&mut self, _movetext: Self::Movetext) -> Self::Output {}
}
