from typing import Optional

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
