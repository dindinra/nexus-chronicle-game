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
- **Terminal (bash MSYS):** pakai path MSYS (`/c/Users/...`) — aman untuk `cd`/`cp`/`rm`/`git`.
- **Tool file Hermes (`write_file`/`patch`):** GUNAKAN **absolute Windows** (`C:\Users\...`), BUKAN MSYS `/c/Users/...` untuk path di LUAR workspace root. write_file mengubah `/c/Users/...` (luar root) jadi `C:\c\Users\...` (bug nyata 2026-07-08).
- Root cause folder sampah `C:\c\` & `C:\e\` = **write_file menerima path MSYS di luar workspace root** (bukan pemakaian absolute Windows). Sudah diperbaiki & folder **DIHAPUS total 2026-07-08** (TODO pre-release SELESAI).

## 5. Cara Menjalankan Backend (verifikasi kesehatan)
```bash
cd /c/Users/Dindin/nexus-chronicle-game
source backend/venv/Scripts/activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port <port kosong>
```
- App dijalankan sebagai package (`backend.main:app`) dari root proyek (DATABASE_URL sqlite relatif ke cwd).
- **Jangan biarkan orphan (PENTING):** SETIAP setelah testing per step, matikan dev server **beserta child `python.exe`-nya**, bukan cuma wrapper bash-nya. `process kill` di Hermes hanya membunuh bash → child python tetap jalan & menumpuk di port (pernah terjadi: 6 instance uvicorn orphan di 8000-8005). Cara benar: `netstat -ano | grep :<port>` → ambil PID listener, lalu `taskkill //F //PID <pid>`. Sebelum mulai, pastikan port bersih (tidak ada instance ganda).
- Default dev port = **8000** — jalankan SATU instance segar, jangan banyak sekaligus.
- Cek sehat: `GET /health` (200), `GET /health/db` (200), `GET /docs` (Swagger UI).
- Tes endpoint via `curl http://127.0.0.1:<port>/<path>` atau `TestClient`.

## 6. Konvensi Git
- Commit per fase/step dengan pesan jelas (bahasa bebas, sebutkan apa yang berubah + bukti singkat).
- `.env`, `venv/`, `*.db` sudah di-`.gitignore` — JANGAN commit rahasia/db.
- Tampilkan `git log --oneline` sebagai bukti tiap commit.

## 7. Kemampuan & Keterbatasan Agent (catat di tiap ganti model)
- Bisa: eksekusi terminal langsung (bash MSYS/git-bash) di venv; akses filesystem langsung (read/write/patch); jalankan & tes backend.
- Model bisa berbeda tiap sesi — **jangan asumsikan ingatan lintas sesi**; selalu baca `AGENT_RULES.md` + `PROGRESS.md` + memory.
- Untuk tool file Hermes (`write_file`/`patch`) GUNAKAN absolute Windows; MSYS `/c/...` hanya aman untuk terminal (lihat §4).

## 8. Warning "Sibling Subagent" — False-Positive (catat 2026-07-08)
- Warning sibling subagent **PERNAH muncul false-positive** (contoh ID: `20260708_131440_231c60`).
- Kalau muncul lagi: **SELALU verifikasi dengan `git diff HEAD -- <file>` dulu SEBELUM panik/rollback**.
- Kalau diff **BERSIH** (cuma perubahan yang agent tulis sendiri, tidak ada baris asing/tertimpa), itu aman lanjut — kemungkinan besar bug di sistem warning tool, bukan sibling beneran.
- Kalau diff **MENUNJUKKAN perubahan asing** yang bukan dari agent → STOP & lapor (jangan di-overwrite).
- Konteks: 2026-07-08 warning muncul saat patch `PROGRESS.md` (6.2), tapi `git diff` membuktikan hanya perubahan agent sendiri → false-positive. Tidak ada data hilang.
