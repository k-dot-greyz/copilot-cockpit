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


def main() -> int:
    request = json.load(sys.stdin)
    try:
        ref = Ref(request["registries"])
        response = ref.run(request["op"], request["input"], request.get("base_dir"), request["limits"])
    except Exception as exc:  # report a crash as a typed failure, never a traceback
        response = {"ok": False, "errors": [{"code": "E_IMPL_CRASH", "pointer": f"{type(exc).__name__}: {exc}"[:200]}]}
    json.dump(response, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
