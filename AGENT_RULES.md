# AGENT_RULES.md — Aturan Kerja Agent (Nexus Chronicle)

> File ini adalah **sumber kebenaran utama** untuk cara kerja agent di proyek ini.
> Baca file ini + `PROGRESS.md` SEBELUM mengerjakan apa pun. JANGAN bergantung
> pada riwayat chat — chat bisa hilang/berganti model, file ini tidak.

## 1. Siklus Kerja (Wajib)
- **Stop & report dulu sebelum coding.** Satu step per giliran.
- **Berhenti + lapor tiap step.** Selesaikan satu sub-step, VERIFIKASI dengan bukti, lapor, baru lanjut ke sub-step berikutnya. JANGAN kerjakan banyak step sekaligus tanpa lapor.
- **Laporan pakai bukti NYATA**, bukan ringkasan: output perintah terminal, potongan kode relevan, hasil `git log`, response endpoint (curl/TestClient).
- **Update `PROGRESS.md` ke kondisi SEBENARNYA** (bukan yang direncanakan) setelah setiap step.
- **Tunggu instruksi user** setelah lapor — jangan lanjut coding di luar apa yang diminta, kecuali user menyuruh "lanjut selesaikan".

## 2. Anti-Loop / Kejujuran
- **Batas retry:** kalau sebuah operasi gagal >= 3x, BERHENTI, lapor penyebabnya secara jujur. Jangan sembunyikan kegagalan.
- **JANGAN fabrikasi** output (jangan bikin data/respons palsu). Hasil harus dari eksekusi tool sungguhan.
- **Finish the job:** deliverable = artefak yang benar-benar jalan (terverifikasi), bukan deskripsi rencana.

## 3. Keputusan yang SUDAH DIKUNCI (jangan putuskan ulang)
- Arsitektur efek kartu: **Opsi A — Client-Authoritative** (logic game & efek tetap di frontend JS; backend simpan deck/progress/riwayat/auth).
- Backend: **Python + FastAPI + SQLite + SQLAlchemy**.
- Auth: **JWT** (bcrypt untuk hash password).
- Frontend: **React + TypeScript + Vite** (ubah dari "Vanilla JS" pada 2026-07-08).
- **Urutan:** Fase 3 (Auth) & Fase 4/5 (data kartu + deck API) di-backend dulu, BARU Fase 6 scaffold frontend. Jangan loncat ke frontend duluan.

## 4. Keamanan Path (PENTING — akar masalah bug lama)
- Selalu pakai **path MSYS** (`/c/Users/...`), BUKAN path absolut Windows (`C:\Users\...`) untuk semua operasi file/terminal.
- Root cause folder sampah `C:\c\` & `C:\e\` = pemakaian path absolut Windows. Jangan ulangi.
- **TODO pre-release:** bersihkan `C:\c\` & `C:\e\`, pastikan root cause sudah diperbaiki — SEBELUM proyek dianggap selesai/dirilis.

## 5. Cara Menjalankan Backend (verifikasi kesehatan)
```bash
cd /c/Users/Dindin/nexus-chronicle-game
source backend/venv/Scripts/activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port <port kosong>
```
- App dijalankan sebagai package (`backend.main:app`) dari root proyek (DATABASE_URL sqlite relatif ke cwd).
- **Hindari port 8001** — sudah terpakai dev server lama. Pakai 8002/8003/dst.
- Cek sehat: `GET /health` (200), `GET /health/db` (200), `GET /docs` (Swagger UI).
- Tes endpoint via `curl http://127.0.0.1:<port>/<path>` atau `TestClient`.

## 6. Konvensi Git
- Commit per fase/step dengan pesan jelas (bahasa bebas, sebutkan apa yang berubah + bukti singkat).
- `.env`, `venv/`, `*.db` sudah di-`.gitignore` — JANGAN commit rahasia/db.
- Tampilkan `git log --oneline` sebagai bukti tiap commit.

## 7. Kemampuan & Keterbatasan Agent (catat di tiap ganti model)
- Bisa: eksekusi terminal langsung (bash MSYS/git-bash) di venv; akses filesystem langsung (read/write/patch); jalankan & tes backend.
- Model bisa berbeda tiap sesi — **jangan asumsikan ingatan lintas sesi**; selalu baca `AGENT_RULES.md` + `PROGRESS.md` + memory.
- Path absolut Windows harus dihindari (lihat §4).
