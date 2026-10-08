//! JSON value model, strict parser, lint rules and canonical form (SPEC.md sections 5, 8.1, 9).
//!
//! The model mirrors what the reference implementation sees after `json.loads`: integers of any
//! size, floats kept apart from integers, strings that may carry lone surrogates, and objects
//! whose duplicate keys were collapsed (last wins) with the duplicates reported on the side.
//! Parsing is iterative, so a hostile document cannot overflow the stack.

use std::collections::BTreeMap;

use crate::Fault;

#[derive(Clone, Debug, PartialEq)]
pub enum V {
    Null,
    Bool(bool),
    Int(i128),
    Float(f64),
    Str(String),
    /// A string that carried a lone surrogate escape. The text is lossy (U+FFFD); the variant is
    /// what lint reports as `E_ENCODING`.
    BadStr(String),
    Arr(Vec<V>),
    Obj(BTreeMap<String, V>),
}

/// Dropping a document nested a million levels deep must not recurse a million times.
impl Drop for V {
    fn drop(&mut self) {
        let mut pending: Vec<V> = match self {
            V::Arr(items) => std::mem::take(items),
            V::Obj(map) => std::mem::take(map).into_values().collect(),
            _ => return,
        };
        while let Some(mut next) = pending.pop() {
            match &mut next {
                V::Arr(items) => pending.append(items),
                V::Obj(map) => pending.extend(std::mem::take(map).into_values()),
                _ => {}
            }
        }
    }
}

impl V {
    pub fn get(&self, key: &str) -> Option<&V> {
        match self {
            V::Obj(map) => map.get(key),
            _ => None,
        }
    }

    /// The text of a string value. A string with a lone surrogate is still a string (lint is what
    /// rejects it), exactly as it is in the reference implementation.
    pub fn as_str(&self) -> Option<&str> {
        match self {
            V::Str(s) | V::BadStr(s) => Some(s),
            _ => None,
        }
    }

    pub fn as_obj(&self) -> Option<&BTreeMap<String, V>> {
        match self {
            V::Obj(map) => Some(map),
            _ => None,
        }
    }

    pub fn is_obj(&self) -> bool {
        matches!(self, V::Obj(_))
    }

    /// Follow a chain of object keys; `None` as soon as one is missing or not an object.
    pub fn at(&self, path: &[&str]) -> Option<&V> {
        let mut cur = self;
        for part in path {
            cur = cur.get(part)?;
        }
        Some(cur)
    }

    pub fn obj<const N: usize>(pairs: [(&str, V); N]) -> V {
        V::Obj(pairs.into_iter().map(|(k, v)| (k.to_string(), v)).collect())
    }

    pub fn str(s: &str) -> V {
        V::Str(s.to_string())
    }

    /// Convert for the JSON Schema engine and for output. Only called on values that already
    /// passed lint, so the lossy cases (floats outside serde's range, huge integers) cannot occur.
    pub fn to_serde(&self) -> serde_json::Value {
        use serde_json::Value as S;
        match self {
            V::Null => S::Null,
            V::Bool(b) => S::Bool(*b),
            V::Int(i) => {
                if let Ok(n) = i64::try_from(*i) {
                    S::from(n)
                } else if let Ok(n) = u64::try_from(*i) {
                    S::from(n)
                } else {
                    S::Null
                }
            }
            V::Float(f) => serde_json::Number::from_f64(*f).map_or(S::Null, S::Number),
            V::Str(s) | V::BadStr(s) => S::String(s.clone()),
            V::Arr(items) => S::Array(items.iter().map(V::to_serde).collect()),
            V::Obj(map) => S::Object(map.iter().map(|(k, v)| (k.clone(), v.to_serde())).collect()),
        }
    }
}

/// RFC 6901 pointer from tokens.
pub fn ptr(tokens: &[String]) -> String {
    let mut out = String::new();
    for token in tokens {
        out.push('/');
        for ch in token.chars() {
            match ch {
                '~' => out.push_str("~0"),
                '/' => out.push_str("~1"),
                _ => out.push(ch),
            }
        }
    }
    out
}

pub fn fault(code: &'static str, tokens: &[String]) -> Fault {
    Fault { code, pointer: ptr(tokens) }
}

/// A token list from string-ish parts, for call sites that build pointers inline.
pub fn toks<S: AsRef<str>>(parts: &[S]) -> Vec<String> {
    parts.iter().map(|p| p.as_ref().to_string()).collect()
}

// ---------------------------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------------------------

#[derive(Clone, Copy, Debug)]
pub struct Limits {
    pub max_json_bytes: usize,
    pub max_nesting_depth: usize,
    pub extends_max_depth: usize,
    pub int_max: i128,
}

impl Limits {
    pub fn from_value(v: &V) -> Result<Limits, String> {
        let num = |key: &str| -> Result<i128, String> {
            match v.get(key) {
                Some(V::Int(i)) if *i >= 0 => Ok(*i),
                _ => Err(format!("limits.{key} missing or not a non-negative integer")),
            }
        };
        let size = |key: &str| -> Result<usize, String> {
            usize::try_from(num(key)?).map_err(|_| format!("limits.{key} out of range"))
        };
        Ok(Limits {
            max_json_bytes: size("max_json_bytes")?,
            max_nesting_depth: size("max_nesting_depth")?,
            extends_max_depth: size("extends_max_depth")?,
            int_max: num("int_max")?,
        })
    }
}

// ---------------------------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------------------------

#[derive(Debug, PartialEq, Eq)]
pub enum ParseFail {
    Syntax,
    NonFinite,
}

/// A duplicate object key: the pointer tokens of the key itself. The object that holds it is the
/// path without the last token, so its depth is the token count (the root object is 1).
#[derive(Debug)]
pub struct Dup {
    pub tokens: Vec<String>,
}

enum Frame {
    Arr(Vec<V>),
    Obj { map: BTreeMap<String, V>, key: Option<String> },
}

struct Parser<'a> {
    text: &'a str,
    b: &'a [u8],
    i: usize,
    stack: Vec<Frame>,
    dups: Vec<Dup>,
}

pub fn parse(text: &str) -> Result<(V, Vec<Dup>), ParseFail> {
    let mut p = Parser { text, b: text.as_bytes(), i: 0, stack: Vec::new(), dups: Vec::new() };
    let value = p.run()?;
    Ok((value, p.dups))
}

impl Parser<'_> {
    fn ws(&mut self) {
        while self.i < self.b.len() && matches!(self.b[self.i], b' ' | b'\t' | b'\n' | b'\r') {
            self.i += 1;
        }
    }

    fn peek(&self) -> Option<u8> {
        self.b.get(self.i).copied()
    }

    fn eat(&mut self, lit: &str) -> bool {
        if self.b[self.i..].starts_with(lit.as_bytes()) {
            self.i += lit.len();
            true
        } else {
            false
        }
    }

    /// The pointer tokens of the position the current innermost container will fill next.
    fn path_of_top(&self) -> Vec<String> {
        let below = self.stack.len().saturating_sub(1);
        self.stack[..below]
            .iter()
            .map(|frame| match frame {
                Frame::Arr(items) => items.len().to_string(),
                Frame::Obj { key, .. } => key.clone().unwrap_or_default(),
            })
            .collect()
    }

    fn run(&mut self) -> Result<V, ParseFail> {
        loop {
            // Expect a value.
            self.ws();
            let first = self.peek().ok_or(ParseFail::Syntax)?;
            let mut value = match first {
                b'{' => {
                    self.i += 1;
                    self.ws();
                    if self.peek() == Some(b'}') {
                        self.i += 1;
                        V::Obj(BTreeMap::new())
                    } else {
                        self.stack.push(Frame::Obj { map: BTreeMap::new(), key: None });
                        self.object_key()?;
                        continue;
                    }
                }
                b'[' => {
                    self.i += 1;
                    self.ws();
                    if self.peek() == Some(b']') {
                        self.i += 1;
                        V::Arr(Vec::new())
                    } else {
                        self.stack.push(Frame::Arr(Vec::new()));
                        continue;
                    }
                }
                b'"' => self.string_value()?,
                b't' if self.eat("true") => V::Bool(true),
                b'f' if self.eat("false") => V::Bool(false),
                b'n' if self.eat("null") => V::Null,
                b'N' if self.eat("NaN") => return Err(ParseFail::NonFinite),
                b'I' if self.eat("Infinity") => return Err(ParseFail::NonFinite),
                b'-' if self.b[self.i..].starts_with(b"-Infinity") => {
                    return Err(ParseFail::NonFinite);
                }
                b'-' | b'0'..=b'9' => self.number()?,
                _ => return Err(ParseFail::Syntax),
            };
            // Attach the finished value to its parent, closing containers as they complete.
            loop {
                let Some(top) = self.stack.last_mut() else {
                    self.ws();
                    return if self.i == self.b.len() { Ok(value) } else { Err(ParseFail::Syntax) };
                };
                match top {
                    Frame::Arr(items) => {
                        items.push(value);
                        self.ws();
                        match self.peek() {
                            Some(b',') => {
                                self.i += 1;
                                break;
                            }
                            Some(b']') => {
                                self.i += 1;
                                let Some(Frame::Arr(done)) = self.stack.pop() else { unreachable!() };
                                value = V::Arr(done);
                            }
                            _ => return Err(ParseFail::Syntax),
                        }
                    }
                    Frame::Obj { map, key } => {
                        let k = key.take().ok_or(ParseFail::Syntax)?;
                        if map.insert(k.clone(), value).is_some() {
                            let mut tokens = self.path_of_top();
                            tokens.push(k);
                            self.dups.push(Dup { tokens });
                        }
                        self.ws();
                        match self.peek() {
                            Some(b',') => {
                                self.i += 1;
                                self.ws();
                                self.object_key()?;
                                break;
                            }
                            Some(b'}') => {
                                self.i += 1;
                                let Some(Frame::Obj { map, .. }) = self.stack.pop() else { unreachable!() };
                                value = V::Obj(map);
                            }
                            _ => return Err(ParseFail::Syntax),
                        }
                    }
                }
            }
        }
    }

    /// Parse `"key" :` and store the key on the innermost object frame.
    fn object_key(&mut self) -> Result<(), ParseFail> {
        if self.peek() != Some(b'"') {
            return Err(ParseFail::Syntax);
        }
        let (key, _) = self.string()?;
        self.ws();
        if self.peek() != Some(b':') {
            return Err(ParseFail::Syntax);
        }
        self.i += 1;
        if let Some(Frame::Obj { key: slot, .. }) = self.stack.last_mut() {
            *slot = Some(key);
        }
        Ok(())
    }

    fn string_value(&mut self) -> Result<V, ParseFail> {
        let (s, bad) = self.string()?;
        Ok(if bad { V::BadStr(s) } else { V::Str(s) })
    }

    fn hex4(&self, at: usize) -> Option<u32> {
        let digits = self.b.get(at..at + 4)?;
        let mut cp = 0u32;
        for d in digits {
            cp = cp * 16 + (*d as char).to_digit(16)?;
        }
        Some(cp)
    }

    /// Returns the decoded text and whether a lone surrogate escape was replaced.
    fn string(&mut self) -> Result<(String, bool), ParseFail> {
        self.i += 1; // opening quote
        let mut out = String::new();
        let mut bad = false;
        loop {
            let start = self.i;
            while self.i < self.b.len() {
                let c = self.b[self.i];
                if c == b'"' || c == b'\\' || c < 0x20 {
                    break;
                }
                self.i += 1;
            }
            out.push_str(&self.text[start..self.i]);
            match self.peek() {
                Some(b'"') => {
                    self.i += 1;
                    return Ok((out, bad));
                }
                Some(b'\\') => {
                    self.i += 1;
                    let esc = self.peek().ok_or(ParseFail::Syntax)?;
                    self.i += 1;
                    match esc {
                        b'"' => out.push('"'),
                        b'\\' => out.push('\\'),
                        b'/' => out.push('/'),
                        b'b' => out.push('\u{8}'),
                        b'f' => out.push('\u{c}'),
                        b'n' => out.push('\n'),
                        b'r' => out.push('\r'),
                        b't' => out.push('\t'),
                        b'u' => {
                            let cp = self.hex4(self.i).ok_or(ParseFail::Syntax)?;
                            self.i += 4;
                            if (0xD800..0xDC00).contains(&cp) {
                                let low = if self.b[self.i..].starts_with(b"\\u") {
                                    self.hex4(self.i + 2).filter(|l| (0xDC00..0xE000).contains(l))
                                } else {
                                    None
                                };
                                if let Some(low) = low {
                                    self.i += 6;
                                    let joined = 0x10000 + ((cp - 0xD800) << 10) + (low - 0xDC00);
                                    out.push(char::from_u32(joined).ok_or(ParseFail::Syntax)?);
                                } else {
                                    out.push('\u{FFFD}');
                                    bad = true;
                                }
                            } else if (0xDC00..0xE000).contains(&cp) {
                                out.push('\u{FFFD}');
                                bad = true;
                            } else {
                                out.push(char::from_u32(cp).ok_or(ParseFail::Syntax)?);
                            }
                        }
                        _ => return Err(ParseFail::Syntax),
                    }
                }
                _ => return Err(ParseFail::Syntax),
            }
        }
    }

    fn number(&mut self) -> Result<V, ParseFail> {
        let start = self.i;
        if self.peek() == Some(b'-') {
            self.i += 1;
        }
        match self.peek() {
            Some(b'0') => self.i += 1,
            Some(b'1'..=b'9') => self.digits(),
            _ => return Err(ParseFail::Syntax),
        }
        let mut is_float = false;
        if self.peek() == Some(b'.') && matches!(self.b.get(self.i + 1), Some(b'0'..=b'9')) {
            is_float = true;
            self.i += 1;
            self.digits();
        }
        if matches!(self.peek(), Some(b'e' | b'E')) {
            let mut j = self.i + 1;
            if matches!(self.b.get(j), Some(b'+' | b'-')) {
                j += 1;
            }
            if matches!(self.b.get(j), Some(b'0'..=b'9')) {
                is_float = true;
                self.i = j;
                self.digits();
            }
        }
        let lit = &self.text[start..self.i];
        if is_float {
            return Ok(V::Float(lit.parse::<f64>().map_err(|_| ParseFail::Syntax)?));
        }
        // Integers of any length are legal JSON. Saturate: anything this large is out of range
        // either way, and lint reports it at its pointer.
        Ok(V::Int(lit.parse::<i128>().unwrap_or(if lit.starts_with('-') { i128::MIN } else { i128::MAX })))
    }

    fn digits(&mut self) {
        while matches!(self.peek(), Some(b'0'..=b'9')) {
            self.i += 1;
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Lint
// ---------------------------------------------------------------------------------------------

fn has_bad_char(s: &str) -> bool {
    s.chars().any(|c| c == '\u{7F}')
}

/// Value-level lint (SPEC 8.1 stage 3). `prefix` is the pointer of the value inside the request.
pub fn lint_value(value: &V, limits: &Limits, prefix: &[String], dups: &[Dup]) -> Vec<Fault> {
    struct Walk<'a> {
        limits: &'a Limits,
        errors: Vec<Fault>,
        too_deep: bool,
    }
    impl Walk<'_> {
        fn visit(&mut self, node: &V, path: &mut Vec<String>, depth: usize) {
            match node {
                V::Obj(map) => {
                    let depth = depth + 1;
                    if depth > self.limits.max_nesting_depth {
                        self.too_deep = true;
                        return;
                    }
                    for (key, val) in map {
                        path.push(key.clone());
                        if !key.is_ascii() {
                            self.errors.push(fault("E_KEY_NONASCII", path));
                        } else if has_bad_char(key) {
                            self.errors.push(fault("E_ENCODING", path));
                        }
                        self.visit(val, path, depth);
                        path.pop();
                    }
                }
                V::Arr(items) => {
                    let depth = depth + 1;
                    if depth > self.limits.max_nesting_depth {
                        self.too_deep = true;
                        return;
                    }
                    for (i, val) in items.iter().enumerate() {
                        path.push(i.to_string());
                        self.visit(val, path, depth);
                        path.pop();
                    }
                }
                V::Null | V::Bool(_) => {}
                V::Int(i) => {
                    if i.unsigned_abs() > self.limits.int_max.unsigned_abs() {
                        self.errors.push(fault("E_INT_RANGE", path));
                    }
                }
                V::Float(_) => self.errors.push(fault("E_FLOAT", path)),
                V::BadStr(_) => self.errors.push(fault("E_ENCODING", path)),
                V::Str(s) => {
                    if has_bad_char(s) {
                        self.errors.push(fault("E_ENCODING", path));
                    }
                }
            }
        }
    }

    let mut walk = Walk { limits, errors: Vec::new(), too_deep: false };
    let mut path: Vec<String> = prefix.to_vec();
    walk.visit(value, &mut path, 0);
    if walk.too_deep {
        walk.errors.push(fault("E_TOO_DEEP", prefix));
    }
    // Every duplicate is reported wherever it occurred, even inside a value that a later
    // duplicate replaced. The object holding it sits `tokens.len()` containers deep.
    for dup in dups.iter().filter(|d| d.tokens.len() <= limits.max_nesting_depth) {
        let mut tokens = prefix.to_vec();
        tokens.extend(dup.tokens.iter().cloned());
        walk.errors.push(fault("E_DUP_KEY", &tokens));
    }
    walk.errors
}

/// Byte-level and parse-level lint (SPEC 8.1 stages 1 to 3).
pub fn lint_bytes(data: &[u8], limits: &Limits) -> Result<V, Vec<Fault>> {
    let root = |code| vec![fault(code, &[])];
    if data.len() > limits.max_json_bytes {
        return Err(root("E_TOO_LARGE"));
    }
    if data.starts_with(&[0xEF, 0xBB, 0xBF]) {
        return Err(root("E_BOM"));
    }
    let Ok(text) = std::str::from_utf8(data) else {
        return Err(root("E_ENCODING"));
    };
    let (value, dups) = match parse(text) {
        Ok(parsed) => parsed,
        Err(ParseFail::NonFinite) => return Err(root("E_NONFINITE")),
        Err(ParseFail::Syntax) => return Err(root("E_PARSE")),
    };
    let errors = lint_value(&value, limits, &[], &dups);
    if errors.is_empty() { Ok(value) } else { Err(errors) }
}

// ---------------------------------------------------------------------------------------------
// Canonical form (SPEC 9)
// ---------------------------------------------------------------------------------------------

/// Canonical JSON: keys sorted, no whitespace, integers only, RFC 8785 string escapes.
pub fn canonical(value: &V) -> Result<String, String> {
    fn write(value: &V, out: &mut String) -> Result<(), String> {
        match value {
            V::Null => out.push_str("null"),
            V::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
            V::Int(i) => out.push_str(&i.to_string()),
            V::Float(_) => return Err("canonical form has no floats".to_string()),
            V::Str(s) | V::BadStr(s) => string(s, out),
            V::Arr(items) => {
                out.push('[');
                for (n, item) in items.iter().enumerate() {
                    if n > 0 {
                        out.push(',');
                    }
                    write(item, out)?;
                }
                out.push(']');
            }
            V::Obj(map) => {
                out.push('{');
                for (n, (key, val)) in map.iter().enumerate() {
                    if n > 0 {
                        out.push(',');
                    }
                    string(key, out);
                    out.push(':');
                    write(val, out)?;
                }
                out.push('}');
            }
        }
        Ok(())
    }
    fn string(s: &str, out: &mut String) {
        out.push('"');
        for ch in s.chars() {
            match ch {
                '"' => out.push_str("\\\""),
                '\\' => out.push_str("\\\\"),
                '\n' => out.push_str("\\n"),
                '\r' => out.push_str("\\r"),
                '\t' => out.push_str("\\t"),
                '\u{8}' => out.push_str("\\b"),
                '\u{c}' => out.push_str("\\f"),
                c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
                c => out.push(c),
            }
        }
        out.push('"');
    }
    let mut out = String::new();
    write(value, &mut out)?;
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn limits() -> Limits {
        Limits { max_json_bytes: 1 << 20, max_nesting_depth: 32, extends_max_depth: 8, int_max: 9_007_199_254_740_991 }
    }

    fn codes(data: &[u8]) -> Vec<(String, String)> {
        match lint_bytes(data, &limits()) {
            Ok(_) => vec![],
            Err(errs) => errs.into_iter().map(|f| (f.code.to_string(), f.pointer)).collect(),
        }
    }

    fn one(code: &str, pointer: &str) -> Vec<(String, String)> {
        vec![(code.to_string(), pointer.to_string())]
    }

    #[test]
    fn clean_document_has_no_errors() {
        assert!(codes(br#"{"a":1,"b":{"c":[1,2,3]}}"#).is_empty());
    }

    #[test]
    fn duplicate_keys_are_reported_at_the_key() {
        assert_eq!(codes(br#"{"a":1,"a":2}"#), one("E_DUP_KEY", "/a"));
        assert_eq!(codes(br#"{"x":{"b":1,"b":2}}"#), one("E_DUP_KEY", "/x/b"));
        assert_eq!(codes(br#"{"l":[{"k":1,"k":2}]}"#), one("E_DUP_KEY", "/l/0/k"));
    }

    #[test]
    fn non_finite_stops_before_later_syntax_errors() {
        assert_eq!(codes(b"{\"a\":NaN,"), one("E_NONFINITE", ""));
        assert_eq!(codes(b"[-Infinity]"), one("E_NONFINITE", ""));
        assert_eq!(codes(b"{,NaN}"), one("E_PARSE", ""));
    }

    #[test]
    fn floats_and_big_integers_are_reported_at_their_pointer() {
        assert_eq!(codes(br#"{"a":2.0}"#), one("E_FLOAT", "/a"));
        assert_eq!(codes(br#"{"a":1e3}"#), one("E_FLOAT", "/a"));
        assert_eq!(codes(br#"{"a":9007199254740993}"#), one("E_INT_RANGE", "/a"));
        assert_eq!(codes(br#"{"a":123456789012345678901234567890123456789012345}"#), one("E_INT_RANGE", "/a"));
        assert!(codes(br#"{"a":9007199254740991,"b":-9007199254740991}"#).is_empty());
    }

    #[test]
    fn strings_surrogates_and_del() {
        assert_eq!(codes(br#"{"a":"\ud800"}"#), one("E_ENCODING", "/a"));
        assert_eq!(codes(br#"{"a":"\udc00x"}"#), one("E_ENCODING", "/a"));
        assert!(codes(b"{\"a\":\"\\ud83d\\ude00\"}").is_empty());
        assert_eq!(codes(b"{\"a\":\"x\x7fy\"}"), one("E_ENCODING", "/a"));
        assert_eq!(codes("{\"\u{e9}\":1}".as_bytes()), one("E_KEY_NONASCII", "/\u{e9}"));
    }

    #[test]
    fn byte_level_rules() {
        assert_eq!(codes(b"\xef\xbb\xbf{}"), one("E_BOM", ""));
        assert_eq!(codes(b"{\"a\":\"\xff\"}"), one("E_ENCODING", ""));
        assert_eq!(codes(b""), one("E_PARSE", ""));
        assert_eq!(codes(b"{\"a\":1}\x00"), one("E_PARSE", ""));
        assert_eq!(codes(b"{\"a\":1,}"), one("E_PARSE", ""));
        assert_eq!(codes(b"{\"a\":1} x"), one("E_PARSE", ""));
        assert_eq!(codes(b"[01]"), one("E_PARSE", ""));
        assert_eq!(codes(b"[1.]"), one("E_PARSE", ""));
        assert_eq!(codes(b"\"a\nb\""), one("E_PARSE", ""));
    }

    #[test]
    fn depth_limit_counts_containers() {
        let mut small = limits();
        small.max_nesting_depth = 2;
        let err = lint_bytes(br#"{"a":{"b":{"c":1}}}"#, &small).unwrap_err();
        assert_eq!(err.len(), 1);
        assert_eq!(err[0].code, "E_TOO_DEEP");
        small.max_nesting_depth = 3;
        assert!(lint_bytes(br#"{"a":{"b":{"c":1}}}"#, &small).is_ok());
    }

    #[test]
    fn a_million_open_brackets_is_a_typed_failure_not_a_crash() {
        let doc = "[".repeat(1 << 20);
        let mut big = limits();
        big.max_json_bytes = usize::MAX;
        assert_eq!(codes_with(doc.as_bytes(), &big), one("E_PARSE", ""));
        let doc = format!("{}{}", "[".repeat(500_000), "]".repeat(500_000));
        assert_eq!(codes_with(doc.as_bytes(), &big), one("E_TOO_DEEP", ""));
    }

    fn codes_with(data: &[u8], limits: &Limits) -> Vec<(String, String)> {
        match lint_bytes(data, limits) {
            Ok(_) => vec![],
            Err(errs) => errs.into_iter().map(|f| (f.code.to_string(), f.pointer)).collect(),
        }
    }

    #[test]
    fn canonical_form_is_sorted_and_compact() {
        let (v, _) = parse(r#"{ "b": [1, 2], "a": {"y": "x\n\u0001", "x": null}, "c": true }"#).unwrap();
        assert_eq!(canonical(&v).unwrap(), "{\"a\":{\"x\":null,\"y\":\"x\\n\\u0001\"},\"b\":[1,2],\"c\":true}");
    }
}
