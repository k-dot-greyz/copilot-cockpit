#!/usr/bin/env python3
"""Protocol adapter for the reference implementation (SPEC.md section 11).

Reads one JSON request on stdin and writes one JSON response on stdout. Use it to
check the harness's external-implementation path, or as a template for another
language: run_conformance.py --impl-cmd "python3 tools/ref_cli.py"
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cardcore_ref import Ref  # noqa: E402


def _protocol_error(code: str, pointer: str) -> dict:
    return {"ok": False, "errors": [{"code": code, "pointer": pointer[:200]}]}


def main() -> int:
    raw = sys.stdin.read()
    try:
        request = json.loads(raw)
    except json.JSONDecodeError:
        json.dump(_protocol_error("E_IMPL_PROTOCOL", "request is not a JSON object"), sys.stdout)
        return 0
    if not isinstance(request, dict):
        json.dump(_protocol_error("E_IMPL_PROTOCOL", "request is not a JSON object"), sys.stdout)
        return 0
    try:
        ref = Ref(request["registries"])
        response = ref.run(request["op"], request["input"], request.get("base_dir"), request["limits"])
    except Exception as exc:  # report a crash as a typed failure, never a traceback
        response = _protocol_error("E_IMPL_CRASH", f"{type(exc).__name__}: {exc}")
    json.dump(response, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
