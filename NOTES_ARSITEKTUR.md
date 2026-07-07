# Nexus Chronicle — Arsitektur Prototype (index.html)

> **Sumber:** `C:\Users\Dindin\Downloads\NexusChroniclePrototype\index.html` (3181 baris, ~153 KB)
> **Tujuan:** Referensi *source of truth* selama migrasi ke full-stack. **Jangan dihapus/ditimpa.**

---

## 1. Ringkasan Struktur File

```
index.html (single-file)
├── <style>          → ~1.300 baris CSS (Master UI V4, mobile-responsive, animasi CSS)
├── <body> HTML      → ~170 baris (menu, deck builder, arena, panel kiri/kanan, modal)
├── <script> #1      → Mobile drawer toggle (5 baris)
└── <script> #2      → ~2.800 baris GAME ENGINE (logika lengkap)
```

---

## 2. Data Kartu & Fusion (Source of Truth)

### CARDS Array (38 definisi)
| Kategori | Jumlah | Contoh ID |
|----------|--------|-----------|
| Unit     | 14     | `nc01`–`nc14` |
| Attack   | 2      | `at01`, `at02` |
| Tactic   | 4      | `tc01`–`tc04` |
| Trap     | 2      | `tr01`, `tr02` |

**Field kunci tiap kartu:**
```js
{
  id, name, rarity, lv, cost, fac, atk, def, ctype, img,
  eff,                    // deskripsi teks untuk UI
  frontOnceFn,            // efek saat di-summon ke Front Row (fn once)
  backOnceFn,             // efek saat di-set ke Back Row (fn once)
  gyFn,                   // efek saat kartu masuk GY
  useFn,                  // untuk Attack/Tactic card (klik dari tangan)
  trapFn                  // untuk Trap card (aktivasi saat diserang)
}
```

### FUSIONS Array (6 definisi)
```js
{
  id, name, rarity, lv, fac, atk, def, ctype, img,
  mats: ['nc01','nc02'],           // material IDs (urutan penting untuk column/vanguard/triangle)
  fusionType: 'contact|line|column|vanguard|triangle',
  formationHint: '...',            // teks bantuan UI
  eff: '...',                      // deskripsi efek summon
  summonFn                        // fn dijalankan saat fusion berhasil di-summon
}
```

**5 Tipe Formasi (GDD §15-19):**
| Tipe       | Aturan Posisi Material                          |
|------------|-------------------------------------------------|
| contact    | Bebas di field (front/back, kolom mana saja)    |
| line       | Semua material di **satu row yang sama**        |
| column     | Material 0 di Front + Material 1 di Back, **kolom sama** |
| vanguard   | Material 0 Front (kolom bebas) + Material 1 Back (kolom bebas) |
| triangle   | 2 material di satu row + 1 material di row lain |

---

## 3. Game Engine — Modul Utama (urutan eksekusi)

| Modul | Fungsi Utama | Kunci |
|-------|--------------|-------|
| **State (`G`)** | Single source of truth — semua state game di satu object | `initGame()` |
| **Energy System** | `energyForTurn()` → `addEnergy()` → `spendEnergy()` | 1⚡/turn (sementara) |
| **Phase Manager** | `setPhase()` → `PH_ORDER = ['draw','main','battle','end']` | `startPlayerTurn()` / `startEnemyTurn()` |
| **Draw System** | `drawOne()` — 4 kartu awal, limit tangan 6 | `HAND_LIMIT=6` |
| **Summon Logic** | `handClick()` → `slotClick()` / `slotDrop()` → `spendEnergy()` → trigger `frontOnceFn`/`backOnceFn` | Drag-drop + klik |
| **Trap System** | Set face-down di Back Row → `trapFn(G, ctx)` saat musuh menyerang | Modal konfirmasi |
| **Battle System** | `enterBattle()` → `slotClick` pilih attacker → `slotClick` pilih target → `execAttack()` → animasi `animateAttackLunge()` → `resolveAttack()` | Damage = \|ATK-DEF\|, LP damage, GY flight anim |
| **Fusion System** | `findFusionMatch()` → `computeFusionFieldHints()` → `openFusionPanel()` → `doFusion()` | 5 tipe formasi, visual hint di field |
| **AI Opponent** | `startEnemyTurn()` → `aiMainPhase()` (fusion → trap → heal → summon) → `aiAttackSequence()` | Synchronous main phase, async battle phase |
| **Timer** | `TM` module — 180s +20s/turn, pause saat modal/animasi | `setInterval` 1s |
| **Persistence** | `localStorage` key `nexus_deck_v1` — deck counts + fusion selection | `getDeckState()` / `deckSave()` |

---

## 4. Fungsi Efek Kartu (Client-side JS Functions)

> **KRITIS:** Semua efek tertulis sebagai **fungsi JS inline** di dalam array `CARDS`/`FUSIONS` dan dieksekusi langsung di browser. Ini inti pertanyaan **Opsi A vs B**.

| Kategori | Contoh Fungsi | Jumlah Unik |
|----------|---------------|-------------|
| `frontOnceFn` | `searchDeckToHand`, `openDestroyTarget`, `openSpecialSummonFromDeck` | ~10 |
| `backOnceFn`  | `Draconite Knight` negate next attack | 1 |
| `gyFn`        | `drawOne`, `gyRecover`, direct LP damage | ~6 |
| `useFn`       | `openAttackBoost`, `searchDeckToHand`, `heal`, `freeTeleport` | ~6 |
| `trapFn`      | `Mirror Force` (destroy all enemy front), `Negate Strike` | 2 |
| `summonFn`    | Fusion summon effects (destroy row, debuff, heal+draw) | 6 |

**Helper functions yang dipakai efek-efek di atas:**
`searchDeckToHand`, `gyRecover`, `drawOne`, `openDestroyTarget`, `openSpecialSummonFromDeck`, `openAttackBoost`, `applyPendingAttackBoost`, `triggerGY`, `effAtk` (hitung ATK efektif dengan buff/debuff), `findFusionMatch`, `fusionOpportunities`, `computeFusionFieldHints`.

---

## 5. Deck Builder (localStorage)

- **Key:** `nexus_deck_v1`
- **Struktur:**
```js
{
  counts: { 'nc01': 2, 'nc02': 2, ... },  // max 2 kopi per kartu, total 30
  fusions: ['nf01','nf02',...]             // subset dari 6 fusion, max 6
}
```
- **Default:** 2 kopi tiap Unit (14×2=28) + 2 support card = 30
- **Validasi:** `deckCountsValid()`, `deckStateValid()`

---

## 6. Animasi & Visual (CSS-only + vanilla JS)

| Animasi | Implementasi |
|---------|--------------|
| Hand fan (kartu tangan melengkung) | CSS `transform: rotate()` per index |
| Hover lift card | CSS `transform: translateY(-24px) scale(1.14)` |
| Attack lunge | JS `animateAttackLunge()` — `translate` + `scale` + `rotate` |
| GY flight | JS `animateCardToGY()` — `translate` + `scale(0.25)` + `opacity` |
| Fusion glow | CSS `@keyframes pulse` pada `.fusion-glow` |
| Attack arrows | SVG overlay `#attack-arrow-overlay` dengan `marker-end` |
| Turn banner | CSS `.turn-banner.show` fade in/out |
| Timer chip | CSS `.t-warn`/`.t-danger` + blink animation |

**GSAP / PixiJS: BELUM ADA** — semuanya vanilla CSS/JS.

---

## 7. UI Screens & Flow

```
[Menu Screen] → [Deck Builder] ↔ [Main Game]
     ↑              ↑                  ↓
     └──────────────┴──────────────────┘
              (back to menu)
```

**Main Game Layout (3 kolom):**
- **Left Panel:** Battle Log + Card Inspector (hover card → full art + efek)
- **Center:** Arena (Enemy rows → Divider → Player rows) + Hand zones + HUD (LP badges, energy, phase pills, timer, turn banner)
- **Right Panel:** Read-only deck list (mini cards)

**Mobile (<760px):** Left panel → slide-in drawer (FAB), Right panel hidden.

---

## 8. Poin Penting untuk Migrasi

| Aspek | Catatan |
|-------|---------|
| **State mutation** | `G` object di-mutasi langsung di mana-mana (bukan immutable) |
| **UID per instance** | `mkInst(def, tag)` → `uid: 'nc01_p_abc123'` — penting untuk tracking kartu individual |
| **Fungsi efek closure** | Banyak `frontOnceFn`/`useFn` capture `G` via closure — perlu di-serialize kalau pindah ke server |
| **AI synchronous** | `aiMainPhase()` jalan synchronous (tanpa animasi), hanya battle phase yang async |
| **Modal blocking** | `TM.pause()`/`resume()` dipakai saat modal terbuka (timer berhenti) |
| **No WebSocket** | Single-player vs AI — tidak butuh real-time sync |
| **Image assets** | 26 file PNG di folder `cards/` — perlu di-serve static |

---

## 9. Checklist Migrasi (High-Level)

- [ ] **Fase 0** — Baca `index.html` lengkap ✓ (file ini)
- [ ] **Fase 0** — **Tanya Opsi A vs B ke user** ← **NEXT STEP**
- [ ] **Fase 1** — Skeleton `/backend` (FastAPI) + `/frontend` (pecahan index.html)
- [ ] **Fase 2** — DB Schema DB → SQLAlchemy models → SQLite init
- [ ] **Fase 3** — Auth (register, login, JWT, middleware)
- [ ] **Fase 4** — Cards & Fusion ke backend (seed data + API GET)
- [ ] **Fase 5** — Deck Builder → API (ganti localStorage)
- [ ] **Fase 6** — Refactor frontend modular (HTML/CSS/JS terpisah) + login screen
- [ ] **Fase 7** — Match history API + UI
- [ ] **Fase 8** — Animasi GSAP bertahap
- [ ] **Fase 9** — E2E testing
- [ ] **Fase 10** — Deploy prep (env vars, README)