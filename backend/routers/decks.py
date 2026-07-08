"""Deck API — CRUD deck + validasi 30/6 di API layer.

Aturan 30/6 (dari models.Deck docstring): deck = 30 kartu MAIN + maks 6 kartu
FUSION. Di DB, tiap card_id disimpan 1 baris dengan `count` (1-2 untuk main,
1 untuk fusion) — lihat models.DeckCard. Validasi dilakukan di sini (API layer),
bukan di DB, agar pesan error jelas ke client.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Deck, DeckCard
from ..schemas import DeckCreate, DeckUpdate, DeckOut, DeckCardOut
from .auth import get_current_user
from ..data.cards_data import CARDS, FUSIONS

router = APIRouter(prefix="/decks", tags=["decks"])

_VALID_IDS = {c["id"] for c in CARDS} | {f["id"] for f in FUSIONS}


def _validate_deck(cards):
    """Enforce 30/6: 30 main cards total, <=6 fusion cards, 1-2 per card_id, known ids."""
    if not cards:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Deck cannot be empty")
    main_total = sum(c.qty for c in cards if not c.is_fusion)
    fusion_total = sum(c.qty for c in cards if c.is_fusion)
    if main_total != 30:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Main deck must be exactly 30 cards (got {main_total})")
    if fusion_total > 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Fusion pile must be at most 6 cards (got {fusion_total})")
    for c in cards:
        if c.qty < 1 or c.qty > 2:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail=f"Card {c.card_id}: qty must be 1-2 (got {c.qty})")
        if c.card_id not in _VALID_IDS:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail=f"Unknown card_id: {c.card_id}")


def _deck_to_out(deck: Deck) -> DeckOut:
    return DeckOut(
        id=deck.id,
        user_id=deck.user_id,
        name=deck.name,
        is_active=deck.is_active,
        created_at=deck.created_at,
        total_cards=sum(dc.count for dc in deck.cards),
        cards=[DeckCardOut(id=dc.id, deck_id=dc.deck_id, card_id=dc.card_id,
                           qty=dc.count, is_fusion=dc.is_fusion) for dc in deck.cards],
    )


@router.post("", response_model=DeckOut, status_code=status.HTTP_201_CREATED)
def create_deck(payload: DeckCreate, db: Session = Depends(get_db),
                current_user=Depends(get_current_user)):
    """Create a new deck for the authenticated user (validates 30/6)."""
    _validate_deck(payload.cards)
    deck = Deck(user_id=current_user.id, name=payload.name, is_active=False)
    db.add(deck)
    db.flush()
    for c in payload.cards:
        db.add(DeckCard(deck_id=deck.id, card_id=c.card_id,
                        count=c.qty, is_fusion=c.is_fusion))
    db.commit()
    db.refresh(deck)
    return _deck_to_out(deck)


@router.get("", response_model=list[DeckOut])
def list_decks(db: Session = Depends(get_db),
               current_user=Depends(get_current_user)):
    """List all decks belonging to the authenticated user (newest first)."""
    decks = (
        db.query(Deck)
        .filter(Deck.user_id == current_user.id)
        .order_by(Deck.created_at.desc())
        .all()
    )
    return [_deck_to_out(d) for d in decks]


@router.get("/{deck_id}", response_model=DeckOut)
def get_deck(deck_id: int, db: Session = Depends(get_db),
             current_user=Depends(get_current_user)):
    """Get a single deck by id. 404 if not found or not owned by the user."""
    deck = (
        db.query(Deck)
        .filter(Deck.id == deck_id, Deck.user_id == current_user.id)
        .first()
    )
    if deck is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Deck not found")
    return _deck_to_out(deck)


@router.put("/{deck_id}", response_model=DeckOut)
def update_deck(deck_id: int, payload: DeckUpdate,
                db: Session = Depends(get_db),
                current_user=Depends(get_current_user)):
    """Update a deck's name and/or cards. Owner only (404 if not owned).
    When cards are provided, 30/6 is re-validated exactly like POST."""
    deck = (
        db.query(Deck)
        .filter(Deck.id == deck_id, Deck.user_id == current_user.id)
        .first()
    )
    if deck is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Deck not found")
    if payload.name is not None:
        deck.name = payload.name
    if payload.cards is not None:
        _validate_deck(payload.cards)
        db.query(DeckCard).filter(DeckCard.deck_id == deck.id).delete()
        for c in payload.cards:
            db.add(DeckCard(deck_id=deck.id, card_id=c.card_id,
                            count=c.qty, is_fusion=c.is_fusion))
    db.commit()
    db.refresh(deck)
    return _deck_to_out(deck)


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deck(deck_id: int, db: Session = Depends(get_db),
                current_user=Depends(get_current_user)):
    """Delete a deck (owner only, 404 if not owned).

    Deleting the user's ACTIVE deck is allowed: the user is simply left with
    no active deck. The single-active-deck trigger only fires on INSERT/UPDATE
    of is_active (never on DELETE), so this is a clean, valid state. No
    auto-promotion is done -- the client can let the user activate another deck
    later, keeping the API predictable. Match history referencing the deck is
    preserved with deck_id set to NULL (FK ondelete=SET NULL).
    """
    deck = (
        db.query(Deck)
        .filter(Deck.id == deck_id, Deck.user_id == current_user.id)
        .first()
    )
    if deck is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Deck not found")
    db.delete(deck)
    db.commit()


@router.post("/{deck_id}/activate", response_model=DeckOut)
def activate_deck(deck_id: int, db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    """Set this deck as the user's active deck (owner only, 404 if not owned).

    The SQLite trigger (trg_one_active_deck_per_user) automatically deactivates
    the user's other decks, so exactly one active deck remains. Idempotent:
    activating an already-active deck is a no-op beyond re-affirming it.
    """
    deck = (
        db.query(Deck)
        .filter(Deck.id == deck_id, Deck.user_id == current_user.id)
        .first()
    )
    if deck is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Deck not found")
    deck.is_active = True
    db.commit()
    db.refresh(deck)
    return _deck_to_out(deck)
