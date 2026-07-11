# TODO_BEFORE_RELEASE.md — Item yang harus dibersihkan sebelum rilis final

> File ini berisi item-item development yang BOLEH ada sekarang (memudahkan testing)
> tapi WAJIB dihapus/disembunyikan SEBELUM rilis publik. Jangan lupa.

## 1. Dev Navbar (App.tsx baris 9-26)
**Lokasi:** `frontend/src/App.tsx` — komponen `<Nav>` dengan 5 link:
- Login, Menu, Deck Builder, Cards, Game Board

**Alasan:** Prototype asli (index.html) adalah full-screen single-page app tanpa navigasi.
Navbar ini hanya untuk development testing dan tidak ada di prototype.

**Tindakan sebelum rilis:**
- [ ] Hapus komponen `<Nav />` dari `App.tsx` render tree
- [ ] Atau sembunyikan dengan conditional berdasarkan env (mis. `import.meta.env.DEV`)
- [ ] Pastikan navigasi manual tetap bisa via URL (BrowserRouter masih jalan)

## 2. Stale Caption Arena Footer (SELESAI — fix #6)
**Lokasi:** `frontend/src/pages/GameBoard.tsx` (sudah dihapus)

**Isi lama:** "(6.7a-r2 — badge LP+Energy kedua sisi; enemy hand fan card-back;
pile di-dalam row-group. 6.7b — klik kartu Hand untuk mainkan; klik kartu board
untuk kembalikan.)"

**Alasan hapus:** Teks development notes tidak relevan untuk user. Mekanisme
"klik kartu board → balik ke hand" sudah dihapus di 6.7b.

**Status:** ✅ Sudah dihapus (commit fix #6).

## 3. Daftar item lain — tambahkan saat ditemukan
- (kosong — isi sesuai kebutuhan)

## 4. Coin Flip Modal (6.7c-2 — DISKIP sementara)
**Lokasi rencana:** `frontend/src/pages/GameBoard.tsx` — `startPlayerTurn()` saat ini
langsung jalan (player selalu duluan) TANPA modal coin flip.

**Alasan diskip (dev-only):** putusan user 2026-07-11 — saat development/testing,
hasil predictable (player duluan) memudahkan verifikasi engine giliran, bukan random tiap reload.

**Yang harus di-port verbatim SEBELUM rilis final:**
- `showCoinFlip()` (prototype baris 1236) — modal animasi lempar koin.
- `afterCoin(pFirst)` (1250) — tentukan first player dari hasil koin.
- `newGame()` (1226) — urutan: coin flip → `afterCoin` → `startPlayerTurn`/`startEnemyTurn`.
- Logika di prototype: `firstTurn=true`, lalu siapa menang koin jalan duluan.

**Status:** ⏸️ Belum dikerjakan (sengaja diskip di 6.7c-2). WAJIB sebelum rilis publik.