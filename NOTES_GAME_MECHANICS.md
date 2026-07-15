## Ide Mekanik Baru (Brainstorm, belum dieksekusi)

### 1. Move/Teleport Completion (prioritas lebih dulu, setelah 6.7d)
Status: SPEK SUDAH ADA di prototype, cuma belum di-port ke UI player.
- Prototype: slotDrop (drag-drop antar row/slot, biaya 1 energy) + Tactic tc01 Teleport (free move via _freeTeleport flag)
- Gap tercatat di NOTES_6.7c.md (dari investigasi 6.7c-5b): field _freeTeleport sudah dideklarasi di GameBoard.tsx tapi belum ada handler drag-drop/aktivasi Teleport
- Rencana: port UI interaksi (drag-drop atau klik-pilih-slot) + aktivasi tc01, sesuai spek prototype yang sudah ada
- Nilai strategis: karena ATK/DEF berbeda tergantung row (front=ATK+passives, back=DEF murni, terverifikasi di effAtk), fitur move ini otomatis jadi mekanik taktis (switch defense↔offense) begitu di-port

### 2. Ambush Trap (versi ringan dari ide Chain, BUKAN full YGO-style)
Status: MEKANIK BARU, belum ada di prototype — perlu spek ditulis dari nol.
- Konsep: Trap bisa diaktifkan SPESIFIK di momen attack declaration (sebelum damage dihitung), bukan auto-trigger seperti sekarang (processTrapQueue)
- BUKAN full recursive chain (tidak ada Spell Speed 1/2/3, tidak ada respons berlapis-lapis) — cukup 1 layer window: attacker declare → defender dapat kesempatan trigger trap → lanjut resolve combat
- Nilai strategis: kasih elemen bluffing (kartu tertutup = ancaman tak diketahui), pemain/AI harus putuskan trigger sekarang atau tahan
- Dependency: butuh window/interrupt point baru di attack flow yang sudah ada (execAttack/resolveAttackInPlace) — kemungkinan bisa reuse sebagian infrastruktur dari implementasi Move kalau sequencing-nya Move dulu

### Catatan: Energy sudah carry-over by design (bukan ide baru)
Dikonfirmasi user: sistem energy SAAT INI sudah tidak reset per giliran — sisa energy ikut terbawa ke giliran berikutnya, konsisten dengan prototype. Ide "Energy Banking" yang sempat dibahas TIDAK RELEVAN karena sudah jadi mekanik existing, bukan fitur baru.

Sequencing disepakati: 6.7d (efek kartu) dulu → Move/Teleport → Ambush Trap.
