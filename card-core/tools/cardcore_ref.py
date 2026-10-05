"""Card Core reference implementation (STUB, red phase).

Every operation reports 'not implemented' so the conformance suite starts red.
"""
from __future__ import annotations


class Ref:
    def __init__(self, registries, mutate=None):
        self.registries = registries
        self.mutate = mutate

    def run(self, op, input, base_dir, limits):
        return {"ok": False, "errors": [{"code": "E_NOT_IMPLEMENTED", "pointer": ""}]}
