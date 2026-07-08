"""Card & fusion data API (static card database served from backend).

Per the locked architecture decision (Opsi A — client-authoritative), the
game logic stays client-side; the backend simply serves the immutable card
catalog and the card artwork so the future React frontend has a single source.

Route ordering note: the fusion list route ``GET /fusions`` MUST be declared
before the ``GET /{card_id}`` param route, otherwise Starlette matches
``/cards/fusions`` as ``card_id="fusions"`` and 404s.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, status

from ..data.cards_data import CARDS, FUSIONS
from ..schemas import CardOut, FusionOut

router = APIRouter(prefix="/cards", tags=["cards"])


def _image_url(img: str) -> Optional[str]:
    """Map a stored relative path like 'cards/nc01.png' to its served URL."""
    if not img:
        return None
    fname = img.split("/")[-1]
    return f"/static/cards/{fname}"  # served via StaticFiles mounted at /static/cards (see main.py)


def _card_out(c: dict) -> CardOut:
    data = {k: v for k, v in c.items() if k != "img"}
    return CardOut(image_url=_image_url(c.get("img", "")), **data)


def _fusion_out(f: dict) -> FusionOut:
    data = {k: v for k, v in f.items() if k != "img"}
    return FusionOut(image_url=_image_url(f.get("img", "")), **data)


@router.get("", response_model=list[CardOut])
def list_cards():
    """List all (non-fusion) cards."""
    return [_card_out(c) for c in CARDS]


@router.get("/fusions", response_model=list[FusionOut])
def list_fusions():
    """List all fusion cards."""
    return [_fusion_out(f) for f in FUSIONS]


@router.get("/fusions/{fusion_id}", response_model=FusionOut)
def get_fusion(fusion_id: str):
    f = next((f for f in FUSIONS if f["id"] == fusion_id), None)
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fusion not found")
    return _fusion_out(f)


@router.get("/{card_id}", response_model=CardOut)
def get_card(card_id: str):
    c = next((c for c in CARDS if c["id"] == card_id), None)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return _card_out(c)
