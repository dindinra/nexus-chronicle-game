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
- **HIPOTESIS TERKUAT (2026-07-08):** warning sibling subagent kemungkinan besar terkait **pergantian API key / restart sesi** — platform mendaftarkan sesi/agent baru tanpa riwayat baca file dari sesi sebelumnya (pola sama persis dgn investigasi-investigasi sebelumnya yang selalu berujung "tidak ada konten asing"). Sejauh ini **SELALU** terbukti false-positive lewat `git diff`. Tetap **WAJIB verifikasi `git diff` tiap kali muncul**, tapi **tidak perlu panik-stop total** seperti awal-awal — cukup verifikasi lalu lanjut kalau bersih.

## 9. Auto-Push ke GitHub (setiap FASE selesai)
- **PUSH OTOMATIS:** setiap kali SATU FASE PENUH selesai & sudah di-commit lokal, LANGSUNG push ke GitHub — jangan tunggu user minta.
- **HANYA untuk penyelesaian FASE** (mis. Fase 6.6 selesai penuh), BUKAN sub-step kecil (6.6a, 6.6b, dst) — agar riwayat commit di GitHub rapi per-fase, bukan berantakan.
- **KALAU RAGU** apakah sudah "selesai fase" atau baru sub-step → TANYA user dulu SEBELUM push.
- Sebelum push, SELALU jalankan pengecekan pengaman:
  1. `git status` → pastikan working tree BERSIH (semua yg perlu di-commit sudah di-commit, tidak ada perubahan menggantung).
  2. Cek CEPAT tidak ada file sensitif ikut ter-stage (.env, *.db, credential apa pun) — walau `.gitignore` sudah ada, ini pengecekan ekstra sebelum push publik.
  3. `git push origin master`.
  4. Verifikasi `git ls-remote origin` bahwa commit lokal terbaru MATCH dengan remote.
  5. Di ringkasan "STEP SELESAI", tambahkan baris: `Pushed to GitHub: [commit hash] — [ls-remote match: ya/tidak]`.
- **KALAU PUSH GAGAL** (auth error, conflict, dll): STOP & LAPOR — JANGAN force-push / jangan coba workaround sendiri tanpa persetujuan user.
- Catatan env: `gh` CLI TIDAK terpasang di host ini. Push pakai Personal Access Token (PAT) — buat repo via GitHub REST API, lalu `git push -u https://USER:$TOKEN@github.com/USER/REPO.git master`, lalu reset URL remote ke bentuk tanpa token + `git credential reject` agar token tidak tersisa di `.git/config`.

## 10. Verifikasi Visual (untuk agent tanpa vision/screenshot)

1. CSS WAJIB DI-COPY VERBATIM dari prototype (_legacy-reference/index.html),
 bukan ditulis ulang dari interpretasi. Sesuaikan HANYA selector/className
 ke struktur React, nilai CSS (warna, ukuran, posisi, grid, transform)
 HARUS identik dengan aslinya.

2. Setelah tiap sub-step visual selesai:
 a. Verifikasi computed style via browser_console (getComputedStyle) untuk
    elemen kunci, bandingkan dengan nilai yang sama di prototype asli.
 b. Ambil screenshot ke file (via script terminal, bukan tool bawaan)
    dan simpan di /screenshots/ — walaupun tidak bisa dianalisis sendiri,
    ini WAJIB dilampirkan sebagai bukti untuk direview manusia/Claude.
 c. STOP dan tunggu konfirmasi visual dari saya sebelum lanjut ke
    sub-step berikutnya — jangan asumsikan "DOM benar = visual benar".

3. Kalau ragu suatu elemen visual (posisi, bentuk, animasi) tidak jelas dari
 membaca kode CSS-nya saja, TANYA dulu daripada menebak/improvisasi.
