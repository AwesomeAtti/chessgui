//! Bytes to text: UTF-8, falling back to Latin-1.
//!
//! **Latin-1 is not a guess, it is what the PGN specification names** (ISO 8859-1), and
//! real exports predate everyone agreeing on UTF-8. The fallback cannot fail: every byte
//! sequence is valid Latin-1, which is exactly why it makes a good last resort and a bad
//! first one.
//!
//! There is no encoding *detection* here and there should not be. Detection is a guess
//! dressed as a measurement, and ADR-0009's whole posture is that we add no judgement of
//! our own to what the file says.

use super::model::Encoding;

/// Decode PGN bytes, preferring UTF-8.
///
/// Returns the text and which decoder produced it. A UTF-8 BOM is left in place —
/// `pgn-reader` skips it itself, and removing it here would shift every byte offset the
/// importer uses to slice verbatim game text.
pub fn decode(bytes: &[u8]) -> (String, Encoding) {
    match std::str::from_utf8(bytes) {
        Ok(text) => (text.to_owned(), Encoding::Utf8),
        // Latin-1 is the identity map onto the first 256 code points, so this is the whole
        // conversion. Note the result is a *different byte sequence* from the input, which
        // is why offsets are only ever taken against the decoded string.
        Err(_) => (
            bytes.iter().copied().map(char::from).collect(),
            Encoding::Latin1,
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn utf8_is_preferred() {
        let (text, encoding) = decode("Müller, Jörg".as_bytes());
        assert_eq!(text, "Müller, Jörg");
        assert_eq!(encoding, Encoding::Utf8);
    }

    #[test]
    fn latin1_bytes_decode_rather_than_fail() {
        // 0xFC is ü in Latin-1 and an invalid UTF-8 lead byte.
        let (text, encoding) = decode(b"M\xfcller");
        assert_eq!(text, "Müller");
        assert_eq!(encoding, Encoding::Latin1);
    }

    #[test]
    fn every_byte_sequence_decodes() {
        let all_bytes: Vec<u8> = (0u8..=255).collect();
        let (text, encoding) = decode(&all_bytes);
        assert_eq!(encoding, Encoding::Latin1);
        assert_eq!(text.chars().count(), 256);
    }
}
