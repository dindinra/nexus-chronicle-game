# backend/models.py
"""SQLAlchemy ORM models for Nexus Chronicle TCG."""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, CheckConstraint,
    UniqueConstraint, Index, func, event, text
)
from sqlalchemy.orm import relationship, declarative_base, declared_attr

Base = declarative_base()


class User(Base):
    """User account for authentication and deck ownership."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=True)  # opsional, unique jika diisi
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    decks = relationship("Deck", back_populates="owner", cascade="all, delete-orphan")
    matches = relationship("MatchHistory", back_populates="player", cascade="all, delete-orphan")


class Deck(Base):
    """Player deck (main 30 cards + fusion pile max 6). One active deck per user."""
    __tablename__ = "decks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="decks")
    cards = relationship("DeckCard", back_populates="deck", cascade="all, delete-orphan")
    matches = relationship("MatchHistory", back_populates="deck")

    # SQLite: enforce single active deck per user via trigger (see init_db.py)


class DeckCard(Base):
    """Composition of a deck: each row = one card ID with count (1-2 for main, 1 for fusion)."""
    __tablename__ = "deck_cards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    deck_id = Column(Integer, ForeignKey("decks.id", ondelete="CASCADE"), nullable=False, index=True)
    card_id = Column(String(20), nullable=False)  # e.g., 'nc01', 'nf03'
    count = Column(Integer, nullable=False)  # 1 or 2 (main), 1 (fusion)
    is_fusion = Column(Boolean, default=False, nullable=False)

    # Relationships
    deck = relationship("Deck", back_populates="cards")

    # Constraints
    __table_args__ = (
        UniqueConstraint("deck_id", "card_id", name="uq_deck_card"),
        CheckConstraint("count >= 0 AND count <= 2", name="ck_count_range"),
    )


class MatchHistory(Base):
    """Record of a completed match (vs AI or future PvP)."""
    __tablename__ = "match_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    deck_id = Column(Integer, ForeignKey("decks.id", ondelete="SET NULL"), nullable=True)
    result = Column(String(10), nullable=False)  # 'win', 'loss', 'draw'
    opponent_type = Column(String(10), nullable=False, default='ai')  # 'ai' | 'pvp'
    opponent_name = Column(String(50), default='AI')
    turns_played = Column(Integer, default=0)
    player_lp_final = Column(Integer, default=0)
    enemy_lp_final = Column(Integer, default=0)
    duration_sec = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    # Relationships
    player = relationship("User", back_populates="matches")
    deck = relationship("Deck", back_populates="matches")

    # Constraints
    __table_args__ = (
        CheckConstraint("result IN ('win','loss','draw')", name="ck_result"),
        CheckConstraint("opponent_type IN ('ai','pvp')", name="ck_opponent_type"),
        Index("ix_match_user_created", "user_id", "created_at"),
    )


# ─── SQLite-specific: Enable FK enforcement & trigger for single active deck ───

@event.listens_for(Base.metadata, "after_create")
def create_sqlite_triggers(target, connection, **kw):
    """Create SQLite-specific triggers after tables are created."""
    # 1. Enable foreign keys (must be set per connection; also set in engine connect event)
    # This is handled in get_engine() via event listener

    # 2. Trigger: ensure only ONE active deck per user
    trigger_sql = text("""
        CREATE TRIGGER IF NOT EXISTS trg_one_active_deck_per_user
        BEFORE UPDATE OF is_active ON decks
        WHEN NEW.is_active = 1
        BEGIN
            UPDATE decks SET is_active = 0
            WHERE user_id = NEW.user_id AND id != NEW.id;
        END;
    """)
    connection.execute(trigger_sql)

    # 3. Trigger: also handle INSERT with is_active = 1
    trigger_insert_sql = text("""
        CREATE TRIGGER IF NOT EXISTS trg_one_active_deck_per_user_insert
        BEFORE INSERT ON decks
        WHEN NEW.is_active = 1
        BEGIN
            UPDATE decks SET is_active = 0
            WHERE user_id = NEW.user_id;
        END;
    """)
    connection.execute(trigger_insert_sql)