"""Load static card data (CARDS + FUSIONS) extracted from the prototype.

The source of truth is ``cards.json`` (transcribed from index.html's CARDS /
FUSIONS arrays, with JS effect functions stripped — only static data remains).
"""
import json
import os

_HERE = os.path.dirname(__file__)

with open(os.path.join(_HERE, "cards.json"), encoding="utf-8") as _f:
    _DATA = json.load(_f)

CARDS: list[dict] = _DATA["cards"]
FUSIONS: list[dict] = _DATA["fusions"]
