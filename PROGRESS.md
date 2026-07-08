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
- [x] **Fase 5** — Deck API (CRUD deck + validasi 30/6 di API layer) — **SELESAI (2026-07-08)**
  - [x] 5.1 Desain: schema `DeckCreate/DeckUpdate/DeckOut/DeckCard` di `schemas.py` + rencana endpoint + aturan validasi 30/6 (30 main + maks 6 fusion)
  - [x] 5.2 `POST /decks` (create) + validasi 30/6 — **SELESAI & terverifikasi**: valid→201, 29 main→422, no-auth→401, unknown id→422. CATATAN: field `format` **PERMANEN di-drop** per keputusan final user (2026-07-08) — Deck TIDAK punya kolom format, TIDAK akan ada migrasi/skema baru untuk format (standard/casual ditunda ke fitur masa depan bila dibutuhkan). Tidak perlu re-approve.
  - [x] 5.3 `GET /decks` (list) + `GET /decks/{id}` — **SELESAI & terverifikasi** (no-auth→401, list→200, by-id→200, nonexistent→404, cross-user→404 ownership). Field `format` TIDAK ada (drop permanen).
  - [x] 5.4 `PUT /decks/{id}` + `DELETE /decks/{id}` — **SELESAI & terverifikasi**. PUT: name-only→200, replace-cards→200, 29 main→422, unknown id→422, other-user→404, no-auth→401. DELETE: active-deck→204 (deck hilang, sisa deck lain tetap ada), match_history.deck_id→NULL (fk SET NULL, tidak ada orphan), other-user→404, nonexistent→404, no-auth→401. **Ownership = 404 di semua endpoint (POST/GET/list/PUT/DELETE)**, tidak bocor info keberadaan deck. Field `format` TIDAK ada.
  - [x] 5.4b `POST /decks/{id}/activate` — **SELESAI & terverifikasi**: set active→200, trigger auto-nonaktifkan deck lain milik user yang sama (bukti: activate A → B auto-deactive), ownership→404, no-auth→401, idempoten. Melengkapi 5.4: user punya cara set deck lain jadi aktif setelah hapus active deck (tanpa auto-promote).
  - [x] 5.5 Verifikasi akhir + commit Fase 5 — **SELESAI** (final integration test: full lifecycle create→activate→put→delete + ownership 404 + no-auth 401 di semua endpoint, ALL PASSED; committed).
- [x] **Fase 6** — Frontend baru: React+TS+Vite — **IN PROGRESS (2026-07-08)**
  - [x] 6.1 Scaffold Vite+React+TS di `/frontend` — **SELESAI & terverifikasi**: `npm run dev` → halaman default Vite+React (HTTP 200 di :5173, terbukti via curl). Prototype lama dipindah ke `frontend/_legacy-reference/` (index.html + cards/) sebagai referensi porting 6.7.
  - [x] 6.2 Porting checklist (inventori 138 fungsi + 28 efek kartu) — **SELESAI**: tersimpan di `PORTING_CHECKLIST.md` (root). Belum mulai porting kodenya (baru mulai 6.3+).
  - [x] 6.3 Struktur dasar frontend (routing + tipe TS) — **SELESAI & terverifikasi** (2026-07-08)
    - [x] 6.3a Routing sederhana (Login/Menu/Deck Builder/Game Board) + `react-router-dom` — **SELESAI**: `npm run build` lolos (tsc -b + vite, 28 modules). `App.tsx` pakai `<BrowserRouter>`+`<Routes>`; 4 halaman placeholder di `src/pages/`.
    - [x] 6.3b Definisi tipe TypeScript (Card, Deck, GameState) — **SELESAI & terverifikasi**: `src/types/` (cards.ts, deck.ts, game.ts, index.ts), diselaraskan dengan `backend/schemas.py` (CardOut/FusionOut/DeckOut) + objek `G` prototype. `npm run build` lolos (tsc -b + vite build, 28 modules).
  - [x] 6.4 Fetch `/cards` & `/cards/fusions` + render daftar kartu (validasi FE↔BE) — **SELESAI & terverifikasi** (2026-07-08)
    - API client fetch-based (`src/api/client.ts` + `src/api/cards.ts`; base URL `http://localhost:8000`; helper `assetUrl` untuk prefix path gambar relatif) + halaman `src/pages/CardList.tsx` (route `/cards` + nav link di `App.tsx`).
    - CORS: dari awal sudah benar (`FRONTEND_URL=http://localhost:5173` di `.env` sudah masuk `allow_origins`). Diperkuat: tambah `http://127.0.0.1:5173` + default port backend disamakan **8001 → 8000** di `backend/main.py` (sesuai ekspektasi user).
    - Verifikasi browser (http://127.0.0.1:5173/cards): render **22 kartu + 6 fusion**, **0 error CORS/network** di console. **20 gambar** unit+fusion load dari `http://localhost:8000/static/cards/...`; 8 "broken" = kartu attack/tactic/trap (memang `img:""` di `cards.json`, bukan kegagalan serving).
    - `npm run build` lolos (tsc -b + vite build, 31 modules). Backend jalan di :8000, Vite dev di 127.0.0.1:5173 (IPv4 — hindari mismatch IPv6 `::1` saat browser).
- [ ] Fase 7..10 — belum

## Decisions Pending (jangan diputuskan sendiri)
- **DECISION PENDING untuk nf03 & nc13** — tunggu keputusan user saat porting efek kartu di 6.7, **JANGAN** diasumsikan/diputuskan sendiri saat itu tiba, **WAJIB tanya dulu**.
  - `nf03 Dragon Emperor`: summonFn placeholder (hanya sysMsg). `nc13 Celestia Seraph`: battle-win draw logic ada di resolveAttack.
  - Detail di `PORTING_CHECKLIST.md` §10.

## Dokumen Referensi Visi (Arsip)
- Dokumen referensi visi (Game Feel + Game Bible + Lore) tersimpan di docs/vision/nexus-chronicle-vision-reference.md. Bagian A (Game Feel) relevan untuk Fase 8 nanti. Bagian D (Game Bible/Lore) adalah visi jangka panjang untuk proyek Fase 2 setelah MVP selesai — TIDAK mempengaruhi scope Fase 1-10 yang sedang berjalan.

## Catatan penting untuk sesi berikutnya
- Prototype `index.html` (3181 baris) di `C:\Users\Dindin\Downloads\NexusChroniclePrototype\index.html` — **JANGAN DIHAPUS**, jadikan referensi source of truth.
- Folder proyek: `C:\Users\Dindin\nexus-chronicle-game\` dengan struktur `/backend` dan `/frontend`.
- 26 file asset kartu PNG di folder `cards/` — perlu di-copy ke frontend/static atau di-serve via backend.
- Semua logic game (efek kartu, AI, fusion, battle) saat ini **client-side JS** di dalam `index.html`.
- **Opsi A (client-authoritative) SUDAH dikunci di Fase 0.2** — tidak perlu keputusan ulang sebelum Fase 4.
- [x] TODO (2026-07-08): folder `C:\c\` & `C:\e\` (akibat bug path MSYS→Windows) **DIHAPUS TOTAL** — isinya diverifikasi: eksperimen awal (TS engine port, scaffold Prisma/socket usang, demo) yang diputus user sebagai junk & dihapus seluruhnya. Root cause sudah diperbaiki (write_file/patch pakai absolute Windows path `C:\Users\...`; MSYS `/c/...` hanya untuk terminal `cd`/`cp`/`rm`).
