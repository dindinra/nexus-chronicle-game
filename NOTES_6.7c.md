# NOTES_6.7c.md — Investigasi Sistem Giliran/Phase (Turn-Phase System)

> File referensi mandiri untuk Fase 6.7c (sistem giliran/turn-phase).
> Dibuat sebelum /reset context (2026-07-11) supaya sesi berikutnya tidak perlu grep ulang dari nol.
> Acuan mengikat: `frontend/_legacy-reference/index.html` (prototype, ~3181 baris).
> Setelah reset, baca file ini + `AGENT_RULES.md` + `PROGRESS.md` untuk sync-check cepat, lalu mulai `6.7c-1`.

---

## ⚠️ BINDING RULES (dari memory — tetap berlaku)
- Prototype = **SPESIFIKASI MENGIKAT**. Jangan improvise/translate dari ingatan. Tiap komponen/interaksi: grep + baca fungsi asli, port LOGIC persis (cuma DOM→state yang berubah, bukan perilaku).
- Perilaku asli yang "aneh" JANGAN diam-diam diubah — laporkan, user yang putuskan.
- Tambahan di luar kode asli wajib alasan eksplisit & sebut ke user duluan.
- Tiap UI besar wajib checklist elemen dari prototype + konfirmasi user sebelum coding.
- **AGENT_RULES.md**: §9 push per fase · §10 visual verify (copy→computedStyle→screenshot→STOP+tunggu user) · §12 proaktif lapor kalau lambat/rate-limited.
- **Vision (gemini-2.5-flash-lite, berbayar via openrouter)**: panggil HANYA saat user minta eksplisit "analisis pakai vision", JANGAN otomatis.
- **STANDING RULE**: jangan delegate_task/subagents tanpa izin user. Kalau warning "sibling subagent" muncul saat file op: STOP, lapor & verifikasi git diff (selalu false-positive).
- **PATH RULE (Windows+MSYS)**: untuk `write_file`/`patch` GUNAKAN absolute Windows path `C:\Users\Dindin\nexus-chronicle-game\...`. JANGAN pakai MSYS `/c/Users/...` untuk path di luar workspace root — rusak jadi `C:\c\Users\...`. Untuk terminal `cd`/`cp`/`rm`, MSYS `/c/...` aman.
- **DECISION PENDING (nf03 & nc13)** — saat porting efek kartu di Fase 6.7d, WAJIB tanya user dulu: nf03 Dragon Emperor `summonFn` cuma placeholder (sysMsg, belum destroy kolom mirror); nc13 Celestia Seraph battle-win draw logic ada di `resolveAttack` (bukan `frontOnceFn`).

---

## 1. STATE GILIRAN (prototype `G`)
Sumber: `initGame()` baris ~1095–1124, `startPlayerTurn()` 1184, `startEnemyTurn()` 1953.

| Field | Arti |
|---|---|
| `G.turn` | nomor turn (naik tiap ganti sisi) |
| `G.isPlayer` | bool — giliran player? |
| `G.phase` | `'draw' \| 'main' \| 'battle' \| 'end'` |
| `G.firstTurn` | true di turn 1 → **dilarang attack** (kedua sisi) |
| `G.playerHasMoved` | flag (ada di state, kurang dipakai di prototype) |
| `G.pEnergy / pEnergyMax / pTurnCount` | energi & counter regen player |
| `G.eEnergy / eEnergyMax / eTurnCount` | energi & counter regen enemy |
| `G._negate / _freeTeleport / _atkBoostPending` | flag efek sementara |
| `G.atk / atkSrc` | flag deklarasi attack + sumber |
| `G._selectedHand / _selectedTrap / _selectedTactic` | kartu dipilih di hand |
| `card._hasAttacked` | flag per kartu, reset tiap giliran |
| `card._tempBoost / _tempDebuff` | buff/debuff sementara per kartu |

**Energi (KEPUTUSAN USER — IKUTI PROTOTYPE VERBATIM):**
- `energyForTurn(ownTurnCount)` (baris 876) → **selalu return 1** (konstan, tidak tumbuh).
- `addEnergy('player'|'enemy')` (1127): `turnCount++`, `energy += gain`, `energyMax += gain`.
- **Mulai dari 0**, +1/turn. Nilai demo React `pEnergy:5 / pEnergyMax:10` itu cuma testing UI 6.7a/b, BUKAN final — jangan pertahankan.
- `HAND_LIMIT` = 6 (lihat `showDiscardModal` baris 1910 "limit is 6"). `drawOne()` (1176) cek `pHand.length >= HAND_LIMIT` → skip.

---

## 2. URUTAN PHASE & setPhase()
Sumber: `PH_ORDER` baris 1153, `setPhase(ph)` 1155–1162.

```
PH_ORDER = ['draw','main','battle','end']
PH_IDS  = ['ph-draw','ph-main','ph-battle','ph-end']
```

`setPhase(ph)`:
- `G.phase = ph`
- toggle `.active` class pada elemen `#ph-draw/#ph-main/#ph-battle/#ph-end` (yang index === cur dapat `.active`).
- `$('btn-battle').disabled = !(isPlayer && ph==='main' && !firstTurn)`
- `$('btn-end').disabled    = !(isPlayer && (ph==='main' || ph==='battle'))`
- panggil `updateFusionGlow()`.

HTML strip (prototype baris 789–792):
```html
<div class="ph" id="ph-draw">DRW</div>
<div class="ph" id="ph-main">MAIN</div>
<div class="ph" id="ph-battle">BTL</div>
<div class="ph" id="ph-end">END</div>
```
Tombol (819/823):
```html
<button class="circle-btn cb-battle" id="btn-battle" onclick="enterBattle()" disabled title="Battle Phase">⚔</button>
<button class="circle-btn cb-end" id="btn-end" onclick="doEnd()" disabled title="End Turn">⏭</button>
```

---

## 3. TRIGGER TIAP FASE
- **DRW (`draw`)**: masuk di awal tiap giliran (`startPlayerTurn` 1184 / `startEnemyTurn` 1953).
  - `addEnergy(...)` (+1), `drawOne(G)` auto-draw 1 kartu.
  - Flash banner "Turn N" (`flashTurnBanner` 1167).
  - **Auto-pindah ke MAIN setelah 600ms** (setTimeout baris 1200 player / 1962 enemy).
- **MAIN (`main`)**: tempat main kartu — summon unit (bayar energi), set trap (back row, gratis), main tactic, fusion.
  - Transisi manual: `enterBattle()` → BTL, `doEnd()` → END.
- **BTL (`battle`)**: deklarasi attacker (klik front-row sendiri → `atk=true, atkSrc`), lalu klik target musuh → `execAttack` (1703).
  - **Diblokir total di `firstTurn`** (cek `enterBattle` 1691: "Cannot attack on Turn 1!"; juga `btn-battle` disabled saat `firstTurn`).
  - `doEnd()` tetap bisa keluar.
- **END (`end`)**: `finishEndPhase()` (1943) → `setPhase('end')` → tunggu **700ms** → giliran lawan.
  - Jika hand > 6 → `showDiscardModal()` (1896) wajib discard dulu, baru `finishEndPhase()`.

---

## 4. INTERAKSI VALID PER FASE
Sumber: `handClick(idx)` 1510, `slotClick(...)` 1555, drag&drop `handDrag` 1628.

**Hand click (`handClick`)** — semua butuh `gs.isPlayer`:
- `c.ctype==='attack'  && phase==='battle'` → useFn ke GY.
- `c.ctype==='tactic'  && phase==='main'`   → useFn ke GY.
- `c.ctype==='trap'    && phase==='main'`   → set `G._selectedTrap=idx`, tunggu klik back-row.
- `c.ctype==='unit'    && phase==='main'`   → cek `pEnergy >= cost`; set `G._selectedHand=idx`, tunggu klik slot.
  - Kasus `_freeSummonPending` (Rapid Deployment): hanya Lv1 (cost≤1), summon gratis.

**Slot click (`slotClick`)** — semua butuh `gs.isPlayer`:
- `phase==='battle' && gs.atk` (sudah pilih target):
  - belum ada `atkSrc` → klik front-row sendiri → set `atkSrc`, cek `_hasAttacked`.
  - sudah ada `atkSrc` → klik musuh → resolve attack (`execAttack`).
- `phase==='battle' && side==='player' && rowType==='front'` (belum atk) → mulai deklarasi attack (set `atk=true, atkSrc`).
- `phase==='main' && side==='player' && rowType==='back' && _selectedTrap!=null` → pasang trap face-down (gratis, ke `pBack[slot]`).
- `phase==='main' && _selectedHand!=null` → summon ke slot (spend energi / free summon), jalankan `frontOnceFn`/`backOnceFn`.

**Drag & drop**: hanya `phase==='main' && isPlayer` (1628, `e.preventDefault()` kalau bukan).

**Aturan attack**: front-row musuh wajib diserang dulu (kecuali `nc11` Storm Hawk atau front musuh kosong). `card._hasAttacked` cegah double-attack.

---

## 5. LOOP GILIRAN PENUH
Sumber: `newGame` 1226 → `showCoinFlip` 1236 → `afterCoin` 1250 → `startPlayerTurn`/`startEnemyTurn`.

1. Coin flip (`showCoinFlip`) → `afterCoin(pFirst)` set `firstTurn=true`, mulai player atau enemy duluan.
2. **Player turn** (`startPlayerTurn` 1184):
   - `isPlayer=true`, reset flag (`_negate`, `atk`, `_selected*`, `_hasAttacked`, `_tempBoost/_tempDebuff`).
   - `addEnergy('player')` (+1), `setPhase('draw')`, `drawOne` 1 kartu.
   - setelah 600ms → `setPhase('main')`.
3. **MAIN**: player main kartu / `enterBattle()` (kalau `!firstTurn`) / `doEnd()`.
4. **BTL** (opsional): attack.
5. **END**: `doEnd()` → `finishEndPhase()` → 700ms → `startEnemyTurn()`.
6. **Enemy turn** (`startEnemyTurn` 1953):
   - `isPlayer=false`, `turn++`, reset `_hasAttacked` enemy, `addEnergy('enemy')` (+1), `setPhase('draw')`, draw 1.
   - 600ms → MAIN → `aiMainPhase()` → 600ms → BTL → **`aiAttackSequence` HANYA jika `!firstTurn`** → END → `firstTurn=false; turn++` → `startPlayerTurn()`.

> Catatan: `firstTurn` dilepas (jadi false) hanya setelah enemy selesai turn 1. Jadi turn 1 = tidak ada serangan sama sekali dari kedua sisi.

---

## 6. STATUS REACT SAAT INI (`frontend/src/pages/GameBoard.tsx`, ~459 baris)
- **TIDAK ADA phase strip DRW/MAIN/BTL/END** — cuma teks `Turn {gs.turn} · Phase {gs.phase}` (baris 381). ⚠️ Koreksi penting: strip harus DIBANGUN dari nol (port HTML `#ph-*` + CSS `.ph.active`), bukan cuma wiring.
- `buildDemoState` (61): `phase:'main'`, `turn:1`, `firstTurn:true`, `pEnergy:5/pEnergyMax:10` (demo, buang di 6.7c), `atk:false`.
- `playCard` (312): klik hand → taruh ke slot kosong **tanpa cek phase/energi/tipe** (perilaku demo 6.7b). Harus di-gate per phase di 6.7c.
- `returnCard` (334): klik board player → kembalikan ke hand. **Tetap dipertahankan**.
- Tidak ada engine: tidak ada draw, regen, end turn, enemy turn, battle.
- `inst()`/`instF()` (23/36) sudah bikin BoardCard dengan field `_hasAttacked`, `_frontOnceUsed`, dll — cocok untuk engine.

---

## 7. RENCANA SUB-STEP 6.7c (commit kecil per langkah, sesuai §9)
1. **6.7c-1** — Phase strip UI (DRW/MAIN/BTL/END) + tombol battle/end + `setPhase()` React (highlight `.active` + disabled logic dari prototype 1155–1162).
2. **6.7c-2** — Engine giliran player: `startPlayerTurn` (DRW: energi mulai 0 +1/turn, auto-draw 1, banner "Turn N", auto→MAIN 600ms). *Keputusan coin flip: port modal coin flip atau langsung player duluan — TANYA user saat sub-step ini.*
3. **6.7c-3** — `enterBattle()` + `doEnd()` + `finishEndPhase()` (gate tombol per `setPhase`).
4. **6.7c-4** — Gate `playCard`/slot per phase + tipe kartu + cek energi (port `handClick`/`slotClick`).
5. **6.7c-5** — Giliran musuh: `startEnemyTurn` + `aiMainPhase` (basic) + loop balik ke player.
6. **6.7c-6** — Verifikasi computed style + screenshot (user review, pola §10), commit tiap sub-step.

---

## 8. QUICK REFERENCE — baris prototype penting
- `initGame` / state: 1095
- `addEnergy` / `spendEnergy`: 1127 / 1141
- `energyForTurn` (return 1): 876
- `setPhase` + PH_ORDER/PH_IDS: 1153–1162
- `flashTurnBanner`: 1167
- `drawOne`: 1176
- `startPlayerTurn`: 1184
- `render` (arrow battle): 1257
- `handClick`: 1510
- `slotClick`: 1555
- `handDrag` (phase gate): 1628
- `enterBattle`: 1690
- `execAttack`: 1703
- `doEnd` / `showDiscardModal` / `confirmDiscard`: 1885 / 1896 / 1929
- `finishEndPhase`: 1943
- `startEnemyTurn`: 1953
- `aiMainPhase`: 2001
- HTML strip #ph-*: 789–792 · tombol 819/823

---

*File ini self-contained. Setelah /reset, baca NOTES_6.7c.md + AGENT_RULES.md + PROGRESS.md, lalu mulai 6.7c-1.*
