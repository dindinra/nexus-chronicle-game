# PORTING CHECKLIST — Nexus Chronicle Game Engine

> **Sumber:** `frontend/_legacy-reference/index.html` (prototype, 3181 baris, ~150 KB).
> **Approach:** Opsi A (Client-Authoritative) — seluruh logic game tetap di frontend, backend hanya simpan deck/auth/progress.
> **Tujuan file ini:** inventori lengkap fungsi & efek kartu agar saat porting satu-per-satu di Fase 6.3–6.7 **tidak ada yang kelewat**.
> **Cara pakai:** setiap item `[ ]` = belum diporting ke React+TS. Referensi `Lxxxx` = nomor baris di prototype. Kategori: `[ENG]` engine/logic, `[VIEW]` render DOM, `[UI]` interaksi/modal/drawer, `[UTIL]` helper.

---

## 1. Ringkasan Subsistem

| # | Subsistem | Jml fn | Rentang baris |
|---|----------|--------|---------------|
| A | Lifecycle & State (initGame, newGame, deck build) | ~10 | L1020–1232 |
| B | Deck Builder (persistence localStorage) | ~15 | L1032–1080, L3034–3156 |
| C | Turn / Phase System | ~12 | L1153–1205, L1885–1943, L2824–2843 |
| D | Energy & LP & Win | ~8 | L876–1217 |
| E | Draw / Hand | 2 | L1176, L1184 |
| F | Combat / Attack Resolution | ~14 | L1481–1810 |
| G | Trap System | ~5 | L1703–1795, L2684–2691 |
| H | Fusion System | ~17 | L2182–2536 |
| I | Graveyard (GY) | ~5 | L1880, L2551–2584 |
| J | Card Effect Handlers (dipanggil CARDS/FUSIONS) | ~9 | L2590–2678 |
| K | AI (enemy) | ~5 | L1953–2137, L2536 |
| L | Rendering / View | ~14 | L1257–1481, L2713–2728, L2767 |
| M | Drag & Drop | ~8 | L1627–1653, L2996 |
| N | Arena Camera (pan/zoom/focus) | ~14 | L2907–2973 |
| O | Messages / History / Modal / Tips | ~12 | L2670–2824 |
| P | Menu / Drawer UI | ~4 | L850, L3040–3050 |
| **TOTAL** | | **~159 fn** (138 `function` + 13 arrow + 8 metode/closure) | |

> Catatan: prototype mencampur logic + view dalam 1 file. Saat porting, pisahkan **data** (`cards.ts`, `fusions.ts`) dari **logic** (module engine) dari **view** (komponen React). Lihat §8.

---

## 2. CARD EFFECTS — 28 KARTU (PALING KRITIS)

Trigger tiap kartu:
- **UNIT**: `frontOnceFn` (saat summon ke Front Row, sekali), `backOnceFn` (saat ke Back Row, sekali), `gyFn` (saat masuk GY/dihancurkan), atau **Passive** (terus-menerus, dihitung di `effAtk`).
- **ATTACK/TACTIC**: `useFn` (saat dimainkan dari hand).
- **TRAP**: `trapFn` (saat musuh menyerang, via trap queue).
- **FUSION**: `summonFn` (saat fusion berhasil dipanggil).

### 2.1 Units (14)
| ID | Nama | Fac | LV | ATK/DEF | Efek | Trigger & Handler |
|----|------|-----|----|---------|------|-------------------|
| nc01 | Lyria, Silver Vanguard | Draconis | 2 | 8/9 | Cari 1 Draconis Lv1 Unit dari Deck→Hand; GY: recover 1 Draconis Lv≤2 | `frontOnceFn`→`searchDeckToHand`, `gyFn`→`gyRecover('Draconis',2)` |
| nc02 | Draconis Whelp | Draconis | 1 | 10/4 | **Passive**: +3 ATK bila ada Draconis lain di field | dihitung `effAtk` |
| nc03 | Iron Sentinel | Machina | 1 | 4/13 | **Passive (Back)**: semua musuh Front Row −5 ATK | dihitung `effAtk` (saat di back row) |
| nc04 | Abyss Specter | Abyss | 2 | 9/6 | GY: draw 1 kartu saat dihancurkan | `gyFn`→`drawOne`+`sysMsg` |
| nc05 | Celestia Archer | Celestia | 1 | 7/5 | **Front/once**: 3 LP damage langsung saat summon | `frontOnceFn`→`G.eLP-=3; redrawLP; checkWin` |
| nc06 | Wildlands Brute | Wildlands | 1 | 13/3 | **Passive**: +5 ATK bila satu-satunya kartu di Front Row | dihitung `effAtk` |
| nc07 | Mechspider Scout | Machina | 1 | 7/8 | GY: draw 1 kartu saat dihancurkan | `gyFn`→`drawOne`+`sysMsg` |
| nc08 | Draconite Knight | Draconis | 2 | 7/10 | **Passive (Back)**: Front Row +5 ATK; **Back/once**: negate serangan berikutnya | `effAtk` (+5 front saat di back), `backOnceFn`→`G._negate=true` |
| nc09 | Shadow Asp | Abyss | 1 | 8/5 | GY: 5 LP damage ke musuh | `gyFn`→`G.eLP-=5; redrawLP; checkWin` |
| nc10 | Silver Paladin | Draconis | 1 | 9/9 | Tidak ada efek | — |
| nc11 | Storm Hawk | Wildlands | 1 | 8/4 | Bisa menyerang Back Row walau musuh punya Front Row | flag di `execAttack` (`atkSrc.card.id!=='nc11'`) |
| nc12 | Vault Golem | Machina | 3 | 6/18 | **Indestructible** (tidak bisa dihancurkan efek); **Front/once**: hancurkan 1 kartu musuh | flag `indestructible`, `frontOnceFn`→`openDestroyTarget` |
| nc13 | Celestia Seraph | Celestia | 3 | 10/10 | **Front/once**: +10 LP; **Battle-win**: draw 1 kartu | `frontOnceFn`→`G.pLP+=10; redrawLP` (battle-win draw → lihat `resolveAttack`/combat, VERIFIKASI saat 6.7) |
| nc14 | Abyss Overlord | Abyss | 3 | 10/8 | **Front/once**: Special Summon 2 Abyss Lv1 dari Deck ke Back Row (gratis) | `frontOnceFn`→`openSpecialSummonFromDeck(Abyss Lv1, 2, 'back')` |

### 2.2 Attack Cards (2)
| ID | Nama | Fac | Efek | Handler |
|----|------|-----|------|---------|
| at01 | Photon Slash | Celestia | Beri 1 kartu penyerang +10 ATK di battle ini | `useFn`→`openAttackBoost(G,10)` |
| at02 | Dragon Fang | Draconis | Beri 1 kartu Draconis penyerang +15 ATK di battle ini | `useFn`→`openAttackBoost(G,15,'Draconis')` |

### 2.3 Tactic Cards (4)
| ID | Nama | Fac | Efek | Handler |
|----|------|-----|------|---------|
| tc01 | Teleport | Machina | Pindahkan 1 unit ke slot kosong apa pun GRATIS (tanpa Energy) | `useFn`→`G._freeTeleport=true` + pesan |
| tc02 | Healing Light | Celestia | +15 LP | `useFn`→`G.pLP+=15; redrawLP` |
| tc03 | Reinforcement Call | Machina | Cari 1 Unit Lv1 dari Deck→Hand | `useFn`→`searchDeckToHand(Lv1 unit)` |
| tc04 | Rapid Deployment | Wildlands | Special Summon 1 Unit Lv1 dari Hand ke field GRATIS | `useFn`→`G._freeSummonPending=true` + pesan |

### 2.4 Trap Cards (2)
| ID | Nama | Fac | Efek | Handler |
|----|------|-----|------|---------|
| tr01 | Mirror Force | Draconis | Saat musuh menyerang — hancurkan semua Front Row musuh + hentikan serangan | `trapFn`→hancurkan `eFront` (kecuali `indestructible`), set `G._negate=true` |
| tr02 | Negate Strike | Machina | Negate 1 serangan sepenuhnya | `trapFn`→`G._negate=true` + modal |

### 2.5 Fusion Monsters (6) — 5 tipe formasi
| ID | Nama | Fac | ATK/DEF | Mats (fusionType) | Summon Effect | Handler |
|----|------|-----|---------|-------------------|--------------|---------|
| nf01 | Dragon Sovereign | Draconis | 40/30 | nc01+nc02 (contact) | Hancurkan semua Back Row musuh | `summonFn`→`G.eBack=[null,null,null]` |
| nf02 | Abyss Reaper | Abyss | 45/10 | nc04+nc09 (line) | 10 LP damage ke musuh | `summonFn`→`G.eLP-=10; redrawLP; checkWin` |
| nf03 | Dragon Emperor | Draconis | 48/20 | nc08+nc05 (column) | **"Destroy both enemy cards in mirrored column"** | ⚠️ **BUG/PLACEHOLDER**: `summonFn` hanya `sysMsg(...)`, **TIDAK ada logika destroy**. Perbaiki saat 6.7 (implement destroy kolom mirror ATAU sesuaikan teks). |
| nf04 | Machina Titan | Machina | 35/35 | nc03+nc12 (vanguard) | Semua kartu musuh −10 ATK turn ini | `summonFn`→`_tempDebuff+=10` ke `eFront+eBack` |
| nf05 | Celestia Dragon | Celestia | 38/28 | nc13+nc10+nc11 (triangle) | +15 LP dan draw 1 | `summonFn`→`G.pLP+=15; drawOne` |
| nf06 | Wildlands Alpha | Wildlands | 42/8 | nc06+nc07 (contact) | Hancurkan 1 Front Row musuh | `summonFn`→hapus `eFront[0]` ke GY |

> **⚠️ Hal yang harus diselesaikan di 6.7:** `nf03` (lihat atas). Plus verifikasi `nc13` battle-win draw (logic ada di `resolveAttack`, bukan `frontOnceFn`).

---

## 3. Game Engine Functions — Inventori Lengkap (semua fungsi)

### A. Lifecycle & State  `[ENG]`
- [ ] `initGame` (L1095) — bangun state `G` awal (deck/hand/field/LP/energy/fusion pile).
- [ ] `newGame` (L1226) — reset TM, initGame, render, coin flip.
- [ ] `mkPlayerDeck` (L1081) — susun deck pemain dari counts (localStorage).
- [ ] `mkDeck` (L1024) — susun deck musuh (shuffle CARDS×2, slice DECK_SIZE).
- [ ] `mkInst` (L1023) — buat instance kartu (uid unik + flag `_tempBoost/_tempDebuff/_frontOnceUsed/_backOnceUsed/_setTrap/_hasAttacked`).
- [ ] `shuf` (L1021) — Fisher–Yates shuffle.
- [ ] `fusionsForCard` (L1020) — cari fusion yang butuh kartu id tertentu.
- [ ] `enterBattle` (L1690) — transisi menu→duel.
- [ ] `menuPlay` (L3040) / `backToMainMenu` (L3050) — navigasi menu.
- [ ] `showCoinFlip` (L1236) / `afterCoin` (L1250) — tentukan first player.

### B. Deck Builder (persistence)  `[UI]`+`[ENG]`
- [ ] `deckDefaultCounts` (L1037) / `deckCountsTotal` (L1048) / `deckCountsValid` (L1049) — validasi 30 kartu (max 2 copy).
- [ ] `deckDefaultFusions` (L1060) / `deckStateValid` (L1061) — validasi selection fusion.
- [ ] `getDeckState` (L1069) / `getDeckCounts` (L1079) / `getFusionSelection` (L1080) — baca localStorage (`nexus_deck_v1`) dgn fallback default.
- [ ] `deckResetDefault` (L3099) / `deckSave` (L3104) / `deckAdjust` (L3111) / `deckToggleFusion` (L3124) — edit & simpan deck.
- [ ] `deckCardTile` (L3134) / `renderDeckBuilder` (L3156) / `renderDeckListPanel` (L3064) / `openDeckBuilder` (L3087) / `closeDeckBuilder` (L3094) / `updateMenuDeckCount` (L3034) — UI builder.
- Konstanta: `DECK_STORAGE_KEY`, `MAX_COPIES=2`, `DECK_SIZE=30` (L1032–1034).

### C. Turn / Phase System  `[ENG]`
- [ ] `PH_ORDER`/`PH_IDS` (L1153) — urutan phase: `draw→main→battle→end`.
- [ ] `setPhase` (L1155) — set `G.phase`, update UI phase, `updateFusionGlow`.
- [ ] `flashTurnBanner` (L1167) — banner "Turn N" transien.
- [ ] `startPlayerTurn` (L1184) — reset flag/boost, `addEnergy`, draw, phase draw→main (setTimeout).
- [ ] `startEnemyTurn` (L1953) — increment turn, draw, `aiMainPhase`, battle, end (setTimeout chain).
- [ ] `doEnd` (L1885) / `finishEndPhase` (L1943) — akhiri turn pemain.
- [ ] `showDiscardModal` (L1896) / `confirmDiscard` (L1929) / `toggleDiscardSel` (L1919) — buang kartu bila melebihi HAND_LIMIT di end phase.
- [ ] Turn Manager `TM`: `onTurnStart` (L1189), `stop`/`resume`/`pause`/`reset`, `_tick` (L2824), `_draw` (L2831), `_onTimeout` (L2843) — koordinator timer/animasi (ganti dgn async di React).

### D. Energy & LP & Win  `[ENG]`
- [ ] `energyForTurn` (L876) — kurva gain energy per turn count.
- [ ] `addEnergy` (L1127) / `spendEnergy` (L1141) / `redrawEnergy` (L1146) — sistem energy.
- [ ] `redrawLP` (L1208) — update UI LP.
- [ ] `checkWin` (L1213) — cek eLP/pLP ≤ 0.
- [ ] `showResult` (L1217) — modal VICTORY/DEFEAT + tombol Play Again / Main Menu.

### E. Draw / Hand  `[ENG]`
- [ ] `drawOne` (L1176) — draw 1 (cek deck-out & HAND_LIMIT). Konstanta `HAND_LIMIT` (6).

### F. Combat / Attack Resolution  `[ENG]`
- [ ] `effAtk` (L1481) — **ATK efektif** incl. passive (nc02/nc03/nc06/nc08) + `_tempBoost/_tempDebuff`. **PENTING**: encode semua passive di sini.
- [ ] `handClick` (L1510) — klik kartu di hand (main/summon/play).
- [ ] `attackTargetHint` (L1546) / `slotClick` (L1555) — pemilihan target serangan.
- [ ] `execAttack` (L1703) — validasi front-row-first (kecuali nc11), siapkan `_pendingAttack` + trap queue.
- [ ] `resolveAttack` (L1811) — **math combat**: atkVal vs def → destroy/reduce, direct LP bila kosong. (Baca lengkap L1811–1880 saat 6.7.)
- [ ] `triggerGY` (L1880) — picu `gyFn` saat kartu masuk GY.
- [ ] `animateAttackLunge` (L1316) / `animateCardToGY` (L1336) / `animateMultipleToGY` (L1803) — animasi serangan/GY. `[VIEW]`
- [ ] `getArrowOverlay` (L1277) / `hideAttackArrows` (L1287) / `renderAttackArrows` (L1291) — indikator panah serang. `[VIEW]`

### G. Trap System  `[ENG]`
- [ ] `processTrapQueue` (L1717) — iterasi trap yg siap, tampilkan prompt aktif/skip.
- [ ] `confirmTrapActivate` (L1748) — jalankan `trapFn`, tangani `_negate`, lanjut/hentikan serangan.
- [ ] `skipTrapActivate` (L1797) — lewati trap.
- [ ] `showModal` (L2684) / `closeModal` (L2691) — modal trap/umum. `[UI]`

### H. Fusion System  `[ENG]`
- [ ] `findFusionMatch` (L2182) — cari slot untuk 5 tipe: `contact/line/column/vanguard/triangle`. **Inti aturan fusion.**
- [ ] `findInRow` (L2187 & L2301) — helper cari id di row.
- [ ] `updateFusionGlow` (L2264) / `checkAvailFusions` (L2287) — status "fusion ready" di UI.
- [ ] `fusionOpportunities` (L2296) / `computeFusionFieldHints` (L2371) — highlight slot kosong yg melengkapi formasi.
- [ ] `openFusionPanel` (L2396) / `fusionLayoutCells` (L2413) / `fusionDiagramHTML` (L2441) / `cell` (L2446) / `fusionLegendHTML` (L2458) / `fusionPanelHTML` (L2468) — UI panel fusion. `[VIEW]`
- [ ] `doFusion` (L2507) — eksekusi fusion pemain (hapus material, summon nfXX, jalankan `summonFn`).
- [ ] `showEnemyFusion` (L2529) / `doFusionAI` (L2536) — fusion musuh.

### I. Graveyard (GY)  `[ENG]`
- [ ] `showGY` (L2551) / `activateGY` (L2569) / `gyRecover` (L2576) / `gyAddHand` (L2584) — lihat & recover kartu dari GY.

### J. Card Effect Handlers (dipanggil CARDS/FUSIONS)  `[ENG]`
- [ ] `searchDeckToHand` (L2614) / `deckSearchPick` (L2622) — cari kartu di deck→hand (nc01, tc03).
- [ ] `openSpecialSummonFromDeck` (L2636) / `specialSummonPick` (L2651) — special summon dari deck (nc14, tc04).
- [ ] `openDestroyTarget` (L2670) / `destroyTarget` (L2678) — pilih & hancurkan 1 kartu musuh (nc12).
- [ ] `openAttackBoost` (L2590) / `applyPendingAttackBoost` (L2600) — boost ATK penyerang (at01, at02).

### K. AI (enemy)  `[ENG]`
- [ ] `aiMainPhase` (L2001) — alur main phase musuh: tryFusion → set trap face-down → heal bila LP<40% → summon unit (prioritas fusion-mat & back-row-passive) → tryFusion lagi.
- [ ] `aiAttackSequence` (L2064) — serang berurutan tiap Front Row yg belum menyerang.
- [ ] `aiAttack` (L2070) — 1 serangan musuh (dgn animasi/trap).
- [ ] `resolveAiCombat` (L2137) — resolve combat musuh vs player.
- [ ] `BACK_PREF_IDS=['nc03','nc08']` (L2034) — preferensi row AI.

### L. Rendering / View  `[VIEW]`
- [ ] `render` (L1257) — render ulang seluruh arena.
- [ ] `renderRow` (L1357) / `renderHand` (L1406) / `renderFan` (L1409) — baris field & hand.
- [ ] `cardHTML` (L1447) / `cardBorderColor` (L1437) — markup & border kartu.
- [ ] `renderInspectorCard` (L2767) — panel detail kartu.
- [ ] `fusionPartnerIds` (L2713) / `highlightFusionPartners` (L2721) / `clearFusionPartnerHighlight` (L2728) — highlight pasangan fusion.

### M. Drag & Drop  `[UI]`
- [ ] `handDrag` (L1627) / `fieldDrag` (L1637) / `dragEnd` (L1649) / `slotOver` (L1650) / `slotLeave` (L1651) / `slotDrop` (L1653) / `endDrag` (L2996) — drag kartu antar slot/hand/field.

### N. Arena Camera (pan/zoom/focus)  `[VIEW]`
- [ ] `arenaEls` (L2907) / `applyArenaTransform` (L2909) / `clampArenaPan` (L2915) / `fitZoomFor` (L2923) / `focusElementById` (L2929) / `focusEnemyRows` (L2941) / `focusPlayerRows` (L2946) / `focusArenaOverview` (L2951) / `refreshArenaCamera` (L2960) / `arenaZoomBy` (L2965) / `arenaZoomIn` (L2969) / `arenaZoomOut` (L2970) / `initArenaCamera` (L2973).

### O. Messages / History / Modal / Tips  `[UI]`
- [ ] `addHist` (L2694) / `clearHist` (L2702) — battle log.
- [ ] `sysMsg` (L2703) / `showMsg` (L2707) — toast.
- [ ] `tipShow` (L2734) / `tipShowCard` (L2760) / `tipHide` (L2807) — tooltip.
- [ ] `nameOf` (L2445) / `findIn0` (L2740) / `findIn` (L2749) — helper lookup.
- [ ] `toggleLeftDrawer` (L850) — drawer info. `[UI]`

---

## 4. State Model (`G`) — bentuk yang harus dibuat ulang di store
Field dari `initGame` (L1097–1123) + instance (`mkInst`):
- Meta: `turn, isPlayer, phase, firstTurn, playerHasMoved`.
- LP: `pLP, eLP` (MAX_LP). Energy: `pEnergy, pEnergyMax, pTurnCount, eEnergy, eEnergyMax, eTurnCount`.
- Player: `pDeck, pHand, pFront[3], pBack[3], pGY, pFusion[]`.
- Enemy: `eDeck, eHand, eFront[3], eBack[3], eGY, eFusion[]`.
- Flags temp: `_negate, _freeTeleport, _atkBoostPending, atk, atkSrc, dragSrc, _selectedHand, _selectedTrap, _selectedTactic`.
- Per-instance kartu: `uid, _tempBoost, _tempDebuff, _frontOnceUsed, _backOnceUsed, _setTrap, _hasAttacked, _isTrap, _trapReady`.
- Konstanta: `MAX_LP, DECK_SIZE=30, HAND_LIMIT=6, MAX_COPIES=2`.

---

## 5. Turn / Phase Flow (untuk direplika di 6.7)
1. `startPlayerTurn`: reset boost/debuff/negate → `addEnergy('player')` → phase `draw` → `drawOne` → (setTimeout) phase `main`.
2. Pemain: summon unit (bayar energy), main tactic/attack/trap, set trap, lakukan fusion (bila `checkAvailFusions`), lalu `doEnd`/`finishEndPhase` (buang ke GY bila hand>6).
3. `startEnemyTurn`: turn++, draw → `aiMainPhase` (fusion→trap→heal→summon) → phase `battle` → `aiAttackSequence` → `proceedToEnd` (buang hand>6) → `startPlayerTurn`.
4. Battle: `execAttack` → `processTrapQueue` (trap musuh) → `resolveAttack` (math) → `triggerGY` bila kartu hancur.
5. `checkWin` tiap perubahan LP.

---

## 6. Combat Resolution (catatan porting)
- `effAtk(card, row, gs, attackerGs)` = ATK dasar + passive (nc02/nc03/nc06/nc08) + `_tempBoost` − `_tempDebuff`.
- `resolveAttack` (L1811–1880): bandingkan `atkVal` vs `def` target → bila menang, hancurkan (→GY, `triggerGY`); bila tidak, kurangi `def`; bila target kosong → direct LP damage. Tangani `_negate`. **Baca lengkap saat 6.7.**
- nc11 = satu-satunya yg boleh serang Back Row walau ada Front Row (`execAttack` L1705).
- nc12 `indestructible` → abaikan destroy by effect.

---

## 7. Fusion Rules (5 tipe, `findFusionMatch`)
- `contact`: semua material di field (front/back bebas).
- `line`: semua material di ROW yang sama (semua front ATAU semua back).
- `column`: mat[0] Front + mat[1] Back, INDEX kolom SAMA.
- `vanguard`: mat[0] Front (kolom bebas) + mat[1] Back (kolom bebas).
- `triangle`: mat[0]+mat[1] di satu row, mat[2] di row lain.
- Material terpakai dihapus dari field, summon `nfXX` ke field, jalankan `summonFn`.

---

## 8. Porting Recommendations / Gotchas
1. **Pisahkan data ↔ logic ↔ view.** `CARDS`/`FUSIONS` → `src/data/cards.ts` + `fusions.ts`. Engine → `src/engine/` (pure TS, tanpa DOM). View → komponen React.
2. **Effect dispatch bertipe.** Kartu saat ini membawa fungsi handler (`frontOnceFn`, `gyFn`, `useFn`, `trapFn`, `summonFn`) langsung di objek data. Di TS, buat `EffectRegistry` (map id→handler) atau model discriminated-union agar type-safe & testable. JANGAN copy fungsi ke dalam data.
3. **Global `G` → store.** Pakai Zustand/Context + reducer dengan update immutable (bukan mutate global). Setiap mutasi = action.
4. **`TM` setTimeout-spaghetti → scheduler async.** Ganti rantai `setTimeout` dgn `async/await` atau state machine fase; jangan pakai `setTimeout` global di React.
5. **Render via `innerHTML`/`$()` → komponen React.** `render()`/`cardHTML()` jadi komponen; drag&drop pakai HTML5 DnD atau library (dnd-kit).
6. **localStorage deck** — `getDeckState`/`deckStateValid` sudah punya validasi; pertahankan, tapi di 6.5/6.6 deck juga disinkron ke backend (`POST /decks`, `is_active`).
7. **Belum ada integrasi backend** di prototype (auth/deck murni lokal). Fase 6.3–6.6 akan wiring API; engine di sini murni client.
8. **Animasi GSAP** (dijadwalkan) — `animateAttackLunge`/`animateCardToGY` saat ini CSS/JS; migrasi ke GSAP nanti.

---

## 9. Known Gaps — PERLU DEEP-READ SAAT 6.7
- ⚠️ **nf03 Dragon Emperor**: `summonFn` hanya `sysMsg`, tidak ada destroy kolom mirror (placeholder). Putuskan: implement atau ubah teks.
- 🔎 **nc13 battle-win draw**: efek "Battle-win: Draw 1" tidak ada di `frontOnceFn`; cari logic di `resolveAttack`/combat saat porting.
- 🔎 **`effAtk` (L1481)**: baca lengkap untuk memastikan semua passive (nc02/nc03/nc06/nc08) + boost/debuff ter-cover.
- 🔎 **`resolveAttack` (L1811–1880)**: baca lengkap math destroy/reduce/direct-LP + interaksi `_negate`/`_tempBoost`.
- 🔎 **`TM` internals** (`_tick`/`_draw`/`_onTimeout`): pahami kontrak timer sebelum ganti scheduler.
- 🔎 **Drag & drop** (L1627–1653 + `endDrag`): pahami aturan drop (front/back, free teleport, free summon) sebelum porting ke dnd-kit.
- 🔎 **Arena camera** (L2907–2973): logika pan/zoom/focus — porting ke transform CSS pada container React.

---
*Generated 2026-07-08 — inventori untuk Fase 6.2 (belum porting). Update checklist ini saat tiap fungsi selesai diporting di 6.3–6.7.*
