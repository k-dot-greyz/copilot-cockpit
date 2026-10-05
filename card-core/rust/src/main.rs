//! `cardcore protocol` answers one request on stdin; `cardcore digest FILE` prints the digest of a
//! JSON file (SPEC.md section 9).

use std::io::{Read, Write};
use std::process::ExitCode;

use cardcore::json::{self, V};

fn read_input(path: &str) -> std::io::Result<Vec<u8>> {
    if path == "-" {
        let mut buf = Vec::new();
        std::io::stdin().read_to_end(&mut buf)?;
        Ok(buf)
    } else {
        std::fs::read(path)
    }
}

fn digest(path: &str) -> Result<String, String> {
    let bytes = read_input(path).map_err(|e| format!("{path}: {e}"))?;
    let text = std::str::from_utf8(&bytes).map_err(|_| format!("{path}: not UTF-8"))?;
    let (value, _): (V, _) = json::parse(text).map_err(|e| format!("{path}: {e:?}"))?;
    let canonical = json::canonical(&value).map_err(|e| format!("{path}: {e}"))?;
    Ok(cardcore::sha256_label(canonical.as_bytes()))
}

fn main() -> ExitCode {
    std::panic::set_hook(Box::new(|_| {}));
    let args: Vec<String> = std::env::args().skip(1).collect();
    match args.iter().map(String::as_str).collect::<Vec<_>>().as_slice() {
        ["protocol"] => {
            let mut request = String::new();
            if std::io::stdin().read_to_string(&mut request).is_err() {
                eprintln!("cardcore: request is not UTF-8");
                return ExitCode::from(2);
            }
            let response = cardcore::protocol::handle(&request);
            let mut out = std::io::stdout().lock();
            let _ = out.write_all(response.as_bytes());
            let _ = out.write_all(b"\n");
            ExitCode::SUCCESS
        }
        ["digest", path] => match digest(path) {
            Ok(d) => {
                println!("{d}");
                ExitCode::SUCCESS
            }
            Err(message) => {
                eprintln!("cardcore: {message}");
                ExitCode::from(1)
            }
        },
        _ => {
            eprintln!("usage: cardcore protocol            one JSON request on stdin, one response on stdout");
            eprintln!("       cardcore digest FILE|-       sha256 of the canonical JSON of FILE");
            ExitCode::from(2)
        }
    }
}
