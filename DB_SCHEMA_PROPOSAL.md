# Nexus Chronicle — Database Schema Design (Proposal)

> **Status:** ✅ **APPROVED** (disetujui user 2026-07-08) — implementasi selesai di Fase 2.2; validasi 30/6 di API layer (Fase 5).
> **Target DB:** SQLite (via SQLAlchemy ORM) — mudah migrasi ke PostgreSQL nanti

---

## ER Diagram (Text)

```
┌─────────────┐       ┌─────────────┐       ┌────────────────┐
│    users    │       │    decks    │       │  deck_cards    │
├─────────────┤       ├─────────────┤       ├────────────────┤
│ id (PK)     │◄──────│ id (PK)     │◄──────│ id (PK)        │
│ username    │       │ user_id (FK)│       │ deck_id (FK)   │
│ email       │       │ name        │       │ card_id (str)  │
│ password_hash│      │ is_active   │       │ count (int)    │
│ created_at  │       │ created_at  │       │ is_fusion (bool)│
│ updated_at  │       │ updated_at  │       └────────────────┘
└─────────────┘       └─────────────┘
                            │
                            │ 1:N
                            ▼
                    ┌─────────────────┐
                    │  match_history  │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ user_id (FK)    │
                    │ deck_id (FK)    │
                    │ result (enum)   │  -- 'win' | 'loss' | 'draw'
                    │ opponent_type   │  -- 'ai' | 'pvp' (future)
                    │ opponent_name   │  -- 'AI' or username
                    │ turns_played    │
                    │ player_lp_final │
                    │ enemy_lp_final  │
                    │ duration_sec    │
                    │ created_at      │
                    └─────────────────┘
```

---

## Table Definitions

### 1. `users` — Akun pemain
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Login identifier |
| `email` | VARCHAR(100) | **NULLABLE (opsional)**, UNIQUE bila diisi | **OPSIONAL — boleh NULL.** Hanya untuk account recovery. NULL diperbolehkan (banyak NULL diizinkan); jika diisi, harus unik (tidak boleh sama dgn user lain). |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hash |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE | |

> **KEPUTUSAN KOLOM `email` (tabel users):** OPSIONAL = **NULLABLE**, BUKAN wajib (NOT NULL). `username` adalah identifier login utama. `email` hanya untuk recovery & boleh kosong saat registrasi. Constraint `UNIQUE` berlaku hanya untuk nilai non-NULL (SQLite mengizinkan banyak NULL). Jangan asumsikan email wajib diisi.

### 2. `decks` — Deck builder (satu user bisa punya multiple decks, satu active)
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `user_id` | INTEGER | FK → users.id, NOT NULL | |
| `name` | VARCHAR(100) | NOT NULL | e.g., "Draconis Aggro" |
| `is_active` | BOOLEAN | DEFAULT FALSE | Hanya 1 deck active per user |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE | |

**Index:** `UNIQUE(user_id, is_active) WHERE is_active = TRUE` (partial unique index — SQLite supports via trigger)

### 3. `deck_cards` — Komposisi deck (main deck 30 kartu + fusion pile max 6)
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `deck_id` | INTEGER | FK → decks.id, NOT NULL | |
| `card_id` | VARCHAR(20) | NOT NULL | Ref ke `CARDS`/`FUSIONS` array di frontend (nc01, nf01, dll) |
| `count` | INTEGER | NOT NULL, CHECK 0-2 | Max 2 kopi per kartu (main deck) |
| `is_fusion` | BOOLEAN | DEFAULT FALSE | `TRUE` = fusion pile card, `FALSE` = main deck |

> ⚠ **VALIDASI JUMLAH KARTU = API LAYER (BUKAN DB CONSTRAINT).** Total kartu main deck harus **tepat 30** (`SUM(count) WHERE is_fusion=FALSE = 30`) dan fusion pile maksimal **6** (`SUM(count) WHERE is_fusion=TRUE ≤ 6`). SQL/CHECK constraint **TIDAK BISA** menegakkan agregat lintas-baris ini. Validasi wajib di **kode API** saat `POST/PUT /decks` (Fase 5). Database hanya menyimpan 1 row per kartu (`count` 0–2 per row).

**Constraints (Database Level):**
- Per deck+card_id: unique (satu row per kartu unik) → `UniqueConstraint("deck_id", "card_id")`
- `count` range 0–2 per row → `CheckConstraint("count >= 0 AND count <= 2")`

**Validasi Agregat (API Level — Fase 5):**
> ⚠ **CATATAN PENTING:** Validasi `SUM(count) WHERE is_fusion=FALSE = 30` (main deck 30 kartu) dan `SUM(count) WHERE is_fusion=TRUE ≤ 6` (fusion pile max 6) **TIDAK BISA** ditegakkan lewat SQL CHECK constraint (SQL tidak support agregat lintas-baris). Validasi ini **wajib dilakukan di kode API** saat `POST/PUT /decks` (Fase 5). Database hanya menyimpan row per kartu; logika "total 30 kartu main + max 6 fusion" ada di backend service layer.

### 4. `match_history` — Riwayat pertarungan
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `user_id` | INTEGER | FK → users.id, NOT NULL | |
| `deck_id` | INTEGER | FK → decks.id, NULLABLE | Deck yang dipakai (bisa NULL kalau deck dihapus) |
| `result` | VARCHAR(10) | NOT NULL, CHECK IN ('win','loss','draw') | |
| `opponent_type` | VARCHAR(10) | NOT NULL, DEFAULT 'ai' | 'ai' \| 'pvp' (future) |
| `opponent_name` | VARCHAR(50) | DEFAULT 'AI' | |
| `turns_played` | INTEGER | DEFAULT 0 | |
| `player_lp_final` | INTEGER | DEFAULT 0 | |
| `enemy_lp_final` | INTEGER | DEFAULT 0 | |
| `duration_sec` | INTEGER | DEFAULT 0 | |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

**Index:** `user_id + created_at` (untuk query riwayat user terbaru)

---

## SQLAlchemy Models (Preview)

```python
# backend/models.py (akan dibuat di Fase 2.2)

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, CheckConstraint,
    UniqueConstraint, Index, func
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=True)  # opsional, unique jika diisi
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    decks = relationship("Deck", back_populates="owner", cascade="all, delete-orphan")
    matches = relationship("MatchHistory", back_populates="player", cascade="all, delete-orphan")

class Deck(Base):
    __tablename__ = "decks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    owner = relationship("User", back_populates="decks")
    cards = relationship("DeckCard", back_populates="deck", cascade="all, delete-orphan")
    matches = relationship("MatchHistory", back_populates="deck")
    
    # SQLite: enforce single active deck per user via trigger (see migration)

class DeckCard(Base):
    __tablename__ = "deck_cards"
    id = Column(Integer, primary_key=True, autoincrement=True)
    deck_id = Column(Integer, ForeignKey("decks.id", ondelete="CASCADE"), nullable=False, index=True)
    card_id = Column(String(20), nullable=False)  # e.g., 'nc01', 'nf03'
    count = Column(Integer, nullable=False)  # 1 or 2 (main), 1 (fusion)
    is_fusion = Column(Boolean, default=False, nullable=False)
    
    deck = relationship("Deck", back_populates="cards")
    
    __table_args__ = (
        UniqueConstraint("deck_id", "card_id", name="uq_deck_card"),
        CheckConstraint("count >= 0 AND count <= 2", name="ck_count_range"),
    )

class MatchHistory(Base):
    __tablename__ = "match_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    deck_id = Column(Integer, ForeignKey("decks.id", ondelete="SET NULL"), nullable=True)
    result = Column(String(10), nullable=False)  # 'win', 'loss', 'draw'
    opponent_type = Column(String(10), nullable=False, default='ai')
    opponent_name = Column(String(50), default='AI')
    turns_played = Column(Integer, default=0)
    player_lp_final = Column(Integer, default=0)
    enemy_lp_final = Column(Integer, default=0)
    duration_sec = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    
    player = relationship("User", back_populates="matches")
    deck = relationship("Deck", back_populates="matches")
    
    __table_args__ = (
        CheckConstraint("result IN ('win','loss','draw')", name="ck_result"),
        CheckConstraint("opponent_type IN ('ai','pvp')", name="ck_opponent_type"),
        Index("ix_match_user_created", "user_id", "created_at"),
    )
```

---

## Migration Notes (SQLite)

1. **Partial unique index for active deck** — SQLite tidak support `WHERE` di `UNIQUE INDEX` langsung, butuh **trigger**:
   ```sql
   CREATE TRIGGER trg_one_active_deck_per_user
   BEFORE UPDATE OF is_active ON decks
   WHEN NEW.is_active = 1
   BEGIN
       UPDATE decks SET is_active = 0 WHERE user_id = NEW.user_id AND id != NEW.id;
   END;
   ```

2. **Foreign key enforcement** — SQLite butuh `PRAGMA foreign_keys = ON` per connection (SQLAlchemy event listener).

3. **No ENUM type** — pakai `CHECK CONSTRAINT` + `String` (seperti di atas).

---

## Approval Checklist

- [ ] **Table `users`** — OK / Perlu revisi (**`email` = OPSIONAL/NULLABLE, bukan wajib** ✓)
- [ ] **Table `decks`** — OK / Perlu revisi (apakah butuh multiple deck per user?)
- [ ] **Table `deck_cards`** — OK / Perlu revisi (struktur count + is_fusion cukup? Validasi total 30/6 di API layer ✓)
- [ ] **Table `match_history`** — OK / Perlu revisi (field tambahan?)
- [ ] **Trigger active deck** — Setuju pakai trigger SQLite?
- [ ] **Naming convention** — `snake_case` OK?

- [ ] **Validasi 30/6 di API layer** — Disetujui bahwa validasi total 30 kartu main + max 6 fusion dilakukan di **API (Fase 5)**, BUKAN di DB constraint?

> **Silakan review dan balas dengan: "SETUJUI" atau "REVISI: [detail]"**