# Progress — Nexus Chronicle Full-Stack Migration

## Keputusan yang sudah dikunci
- Arsitektur efek kartu: **Opsi A — Client-Authoritative** (logic game & efek kartu tetap di frontend JS, backend hanya simpan deck/progress/riwayat/auth)
- Backend: Python + FastAPI ✓
- Database: SQLite + SQLAlchemy ORM ✓
- Auth: JWT-based login/akun user ✓
- Frontend: Vanilla HTML/CSS/JS (modular) ✓
- Animasi: GSAP (akan ditambahkan) ✓

## Status Fase
- [x] **Fase 0.1** — Baca `index.html`, buat `NOTES_ARSITEKTUR.md` (2026-07-07)
- [x] **Fase 0.2** — Ajukan pertanyaan Opsi A vs B ke user → **Diputuskan: Opsi A (Client-Authoritative)**
- [x] **Fase 0.3** — Buat `PROGRESS.md` awal
- [x] **Fase 1** — Skeleton Proyek **SELESAI** (2026-07-07)
  - [x] 1.1 Buat struktur folder `/backend` (FastAPI) dan `/frontend` (hasil pecahan index.html)
  - [x] 1.2 Setup FastAPI kosong (`main.py`, endpoint `/health`), pastikan bisa jalan
  - [x] 1.3 Setup virtual env + `requirements.txt` (fastapi, uvicorn, sqlalchemy, passlib, python-jose, dsb)
- [ ] **Fase 2** — Desain Database, step terakhir: 2.1 (sedang dikerjakan)
- [ ] Fase 3..10 — belum

## Catatan penting untuk sesi berikutnya
- Prototype `index.html` (3181 baris) di `C:\Users\Dindin\Downloads\NexusChroniclePrototype\index.html` — **JANGAN DIHAPUS**, jadikan referensi source of truth.
- Folder proyek: `C:\Users\Dindin\nexus-chronicle-game\` dengan struktur `/backend` dan `/frontend`.
- 26 file asset kartu PNG di folder `cards/` — perlu di-copy ke frontend/static atau di-serve via backend.
- Semua logic game (efek kartu, AI, fusion, battle) saat ini **client-side JS** di dalam `index.html`.
- **KEPUTUSAN KRITIS DIPERLUKAN SEBELUM FASE 4:** Opsi A (client-authoritative) vs Opsi B (server-authoritative). Lihat `NOTES_ARSITEKTUR.md` bagian 4 & 8.