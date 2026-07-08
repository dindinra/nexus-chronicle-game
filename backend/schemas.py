from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CardOut(BaseModel):
    id: str
    name: str
    rarity: str
    lv: int
    cost: int
    fac: str
    atk: int
    defense: int
    ctype: str
    eff: str
    img: str = ""
    indestructible: bool = False
    image_url: Optional[str] = None


class FusionOut(BaseModel):
    id: str
    name: str
    rarity: str
    lv: int
    fac: str
    atk: int
    defense: int
    ctype: str = "unit"
    eff: str
    img: str = ""
    mats: list[str] = []
    fusionType: str = ""
    formationHint: str = ""
    image_url: Optional[str] = None


# ---- Fase 5: Deck API schemas (design) ----
# NOTE: field `format` sengaja di-drop — model Deck (skema DB ter-approve) tidak
# punya kolom format. Tambah via migrasi + re-approve gate bila diperlukan.
class DeckCardBase(BaseModel):
    card_id: str
    qty: int = 1
    is_fusion: bool = False


class DeckCreate(BaseModel):
    name: str
    cards: list[DeckCardBase] = []


class DeckUpdate(BaseModel):
    name: Optional[str] = None
    cards: Optional[list[DeckCardBase]] = None


class DeckCardOut(DeckCardBase):
    id: int
    deck_id: int


class DeckOut(BaseModel):
    id: int
    user_id: int
    name: str
    is_active: bool
    cards: list[DeckCardOut] = []
    total_cards: int = 0
    created_at: datetime
