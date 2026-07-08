# Progress — Nexus Chronicle Full-Stack Migration

## Keputusan yang sudah dikunci
- Arsitektur efek kartu: **Opsi A — Client-Authoritative** (logic game & efek kartu tetap di frontend JS, backend hanya simpan deck/progress/riwayat/auth)
- Backend: Python + FastAPI ✓
- Database: SQLite + SQLAlchemy ORM ✓
- Auth: JWT-based login/akun user ✓
- **Frontend: React + TypeScript + Vite** ✅ — *DIUBAH dari "Vanilla HTML/CSS/JS (modular)" pada 2026-07-08. Keputusan sebelumnya (Vanilla JS) resmi dibatalkan.*
- Animasi: GSAP (akan ditambahkan) ✓
- **Urutan pengembangan:** Fase 3 (Auth) & Fase 4/5 (data kartu + deck API) diselesaikan dulu di **backend yang sudah ada**, BARU setelah itu Fase 6.1 scaffold frontend React+TS+Vite. Jangan loncat ke frontend duluan.

## Status Fase
- [x] **Fase 0.1** — Baca `index.html`, buat `NOTES_ARSITEKTUR.md` (2026-07-07)
- [x] **Fase 0.2** — Ajukan pertanyaan Opsi A vs B ke user → **Diputuskan: Opsi A (Client-Authoritative)**
- [x] **Fase 0.3** — Buat `PROGRESS.md` awal
- [x] **Fase 1** — Skeleton Proyek **SELESAI** (2026-07-07)
  - [x] 1.1 Buat struktur folder `/backend` (FastAPI) dan `/frontend` (hasil pecahan index.html)
  - [x] 1.2 Setup FastAPI (`main.py`, endpoint `/health`, `/health/db`), pastikan bisa jalan
  - [x] 1.3 Setup virtual env + `requirements.txt` (fastapi, uvicorn, sqlalchemy, passlib, python-jose, dsb)
- [x] **Fase 2** — Database Schema & ORM **SELESAI & terverifikasi** (2026-07-08)
  - [x] 2.1 Desain skema (lihat `DB_SCHEMA_PROPOSAL.md`)
  - [x] 2.2 Implementasi: `models.py` (4 tabel + trigger active-deck), `database.py` (engine/session/init_db/get_db + FK pragma), `config.py` (Pydantic settings + JWT)
  - [x] Verifikasi: `init_db()` terbukti bentuk tabel `users, decks, deck_cards, match_history` di `nexus_chronicle.db`
  - ✅ Approval skema: **SETUJUI** (2026-07-08) — `DB_SCHEMA_PROPOSAL.md` status = APPROVED.
- [x] **Fase 3** — Auth (register/login + JWT) — **SELESAI & terverifikasi** (2026-07-08)
  - [x] 3.1 `POST /auth/register` (bcrypt hash) — ✅ sudah ada sejak awal
  - [x] 3.2 `POST /auth/login` → return JWT (`access_token`, `token_type=bearer`) via `python-jose`
  - [x] 3.3 `get_current_user` dependency (decode JWT `sub` → user, 401 jika invalid/expired)
  - [x] 3.4 `GET /auth/me` (protected, butuh Bearer token)
  - [x] Verifikasi end-to-end (TestClient): register 201, dup 409, login salah 401, login benar 200+token, /me no-token 401, /me+token 200, token rusak 401 — **ALL PASSED**
  - Files: `security.py` (+`create_access_token`/`decode_token`), `schemas.py` (+`UserLogin`/`Token`), `routers/auth.py` (+login/me/get_current_user)
- [x] **Fase 4** — Data kartu (static card data / API kartu) — **SELESAI & terverifikasi** (2026-07-08)
  - [x] 4.1 Data statis `backend/data/cards.json` (28 kartu: 22 `CARDS` + 6 `FUSIONS`, tanpa fungsi JS) + `cards_data.py` loader
  - [x] 4.2 Schema `CardOut` + `FusionOut` (`schemas.py`)
  - [x] 4.3 Router `backend/routers/cards.py`: `GET /cards`, `GET /cards/{id}`, `GET /cards/fusions`, `GET /cards/fusions/{id}`
  - [x] 4.4 Wire `cards_router` ke `main.py` → `/cards` ter-serve (verifikasi: /cards 22, /cards/fusions 6, id salah 404)
  - [x] 4.5 Copy 26 PNG → `backend/static/cards/` + mount `StaticFiles` di `/static/cards` → gambar bisa diakses (curl 200 image/png)
  - [x] 4.6 Commit Fase 4 lengkap (lihat git log)
  - Catatan: `image_url` = `/static/cards/<file>` (bukan `/cards`) agar tidak menabrak API router `/cards`. Route `/cards/fusions` didahulukan sebelum `/cards/{id}` (bug routing 404 sudah diperbaiki). Port 8001 tetap dihuni dev server lama — tes pakai 8003/8004/8005.
- [ ] **Fase 5** — Deck API (CRUD deck + validasi 30/6 di API layer) — **IN PROGRESS (2026-07-08)**
  - [x] 5.1 Desain: schema `DeckCreate/DeckUpdate/DeckOut/DeckCard` di `schemas.py` + rencana endpoint + aturan validasi 30/6 (30 main + maks 6 fusion)
  - [x] 5.2 `POST /decks` (create) + validasi 30/6 — **SELESAI & terverifikasi**: valid→201, 29 main→422, no-auth→401, unknown id→422. CATATAN: field `format` di-drop (model Deck tdk punya kolom format; butuh migrasi + re-approve gate bila mau)
  - [ ] 5.3 `GET /decks` (list) + `GET /decks/{id}`
  - [ ] 5.4 `PUT /decks/{id}` + `DELETE /decks/{id}`
  - [ ] 5.5 Verifikasi akhir + commit Fase 5
- [ ] **Fase 6** — Frontend baru: scaffold React+TS+Vite (Fase 6.1) — SETELAH Fase 3/4/5
- [ ] Fase 7..10 — belum

## Catatan penting untuk sesi berikutnya
- Prototype `index.html` (3181 baris) di `C:\Users\Dindin\Downloads\NexusChroniclePrototype\index.html` — **JANGAN DIHAPUS**, jadikan referensi source of truth.
- Folder proyek: `C:\Users\Dindin\nexus-chronicle-game\` dengan struktur `/backend` dan `/frontend`.
- 26 file asset kartu PNG di folder `cards/` — perlu di-copy ke frontend/static atau di-serve via backend.
- Semua logic game (efek kartu, AI, fusion, battle) saat ini **client-side JS** di dalam `index.html`.
- **Opsi A (client-authoritative) SUDAH dikunci di Fase 0.2** — tidak perlu keputusan ulang sebelum Fase 4.
- TODO: ada folder sampah `C:\c\` dan `C:\e\` akibat bug path MSYS→Windows yang belum dibersihkan. Periksa isinya, hapus kalau aman, dan pastikan root cause-nya (path absolut Windows untuk semua file operation) sudah diperbaiki — SEBELUM proyek dianggap selesai/dirilis.
