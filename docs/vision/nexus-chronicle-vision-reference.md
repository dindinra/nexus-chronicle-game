# Nexus Chronicle — Dokumen Referensi Visi & Arah Pengembangan

> **STATUS: REFERENSI, BUKAN INSTRUKSI KERJA.** Dokumen ini adalah gabungan dari 3 sumber (Design Review Game Feel, Game Bible v0.1, Lore Design) untuk disimpan sebagai arsip visi jangka panjang proyek. **Tidak untuk dieksekusi sekarang** — proyek aktif tetap mengikuti rencana Fase 1-10 yang sedang berjalan (lihat `PROGRESS.md`).

---

## Cara Pakai Dokumen Ini

| Bagian | Relevan untuk | Kapan dipakai |
|---|---|---|
| Bagian A — Game Feel & Polish | **Fase 8 (Animasi)** | Dipakai sebagai spesifikasi detail saat mengerjakan Fase 8 nanti |
| Bagian B — Fusion UX | Fase 6.7 & Fase 8 | Ide UX bantuan fusion (auto-glow partner, preview) — pertimbangkan saat porting logic fusion |
| Bagian C — AI Personality | Fase pasca-MVP | JANGAN dikerjakan sekarang — ini penambahan scope besar, evaluasi setelah MVP selesai |
| Bagian D — Game Bible (World/Lore/Campaign) | **Proyek Fase 2 (masa depan)** | Visi jangka panjang skala live-service (150+ kartu, campaign, PvP). Scope-nya jauh melebihi MVP saat ini. Simpan, jangan diimplementasikan sebagian-sebagian. |

**Aturan penting:** Jangan mengambil satu bagian dari dokumen ini dan mulai mengimplementasikannya di tengah-tengah fase yang sedang berjalan tanpa persetujuan eksplisit user. Dokumen ini untuk dibaca dan direncanakan, bukan untuk dieksekusi spontan.

---

# BAGIAN A — Game Feel & Polish (untuk Fase 8)

## Prinsip Utama

Fondasi gameplay (positioning, formation fusion, front/back row) sudah kuat dan **tidak boleh diubah**. Fokus pengembangan berikutnya adalah membuat setiap aksi (draw, summon, fusion, attack) terasa memuaskan lewat animasi, audio, dan feedback visual — bukan menambah fitur baru.

## A.1 — Summon Animation

Setiap kartu yang dimainkan butuh urutan animasi (target durasi 0.6–1.0 detik):

1. Kartu sedikit membesar saat dimainkan
2. Turun ke arena
3. Magic circle muncul di bawah kartu
4. Light beam
5. Camera shake kecil
6. Monster muncul
7. Nama monster tampil
8. Sound impact
9. Idle effect aktif (monster "bernapas"/berkedip halus di posisi diam)

## A.2 — Fusion Animation (Signature Feature — prioritas tertinggi)

Fusion adalah identitas game ini, animasinya harus jadi momen paling memorable:

1. Material (kartu-kartu) terpilih
2. Semua material terbang ke tengah arena
3. Magic circle besar
4. Lightning effect
5. Energy vortex
6. White flash
7. Fusion monster muncul
8. Camera zoom
9. Heavy impact/screen shake
10. Nama monster besar muncul
11. Masuk ke slot arena

## A.3 — Attack Animation

1. Klik attack → arrow indicator muncul
2. Camera zoom sedikit
3. Monster maju ke arah target
4. Slash effect saat kontak
5. Hit spark
6. Damage number popup
7. Screen shake
8. Monster kembali ke posisi

**Destroy sequence** (kartu hancur): card retak → particle → fade → terbang ke Graveyard.

## A.4 — Monster "Hidup" (Idle & Hover State)

Supaya kartu tidak terasa statis:
- Idle: glow, mata menyala, armor berkedip, aura, floating effect, breathing animation, particle kecil
- Hover: kartu tilt mengikuti posisi mouse, glow meningkat, shadow bertambah

## A.5 — Legendary/Fusion Presence

Kartu fusion/legendary butuh treatment visual berbeda dari kartu biasa: border animation khusus, aura berbeda, summon sequence lebih megah, arena berubah sedikit saat kartu ini dimainkan. Tujuannya pemain langsung tahu "ini kartu kuat" tanpa baca stat.

## A.6 — Audio Design (minimal SFX yang dibutuhkan)

Hover, Click, Draw, Summon, Fusion, Attack, Critical, Destroy, Turn Start, Victory, Defeat, Legendary Summon. Catatan dari sumber asli: **audio lebih penting daripada animasi** untuk membangun "feel" — kalau harus prioritaskan salah satu duluan, dahulukan audio dasar.

## A.7 — Visual Feedback per Aksi

| Aksi | Feedback |
|---|---|
| Draw | Card glow → whoosh → energy pulse |
| Attack | Slash → impact → number popup → camera shake |
| Heal | Green particle → floating "+" → sound |
| Buff | Blue aura → arrow up |
| Debuff | Purple smoke → arrow down |

## A.8 — Emotional Moments

- **Victory:** confetti → music → camera → slow motion → MVP card ditampilkan
- **Boss encounter** (relevan untuk masa depan): arena berubah, music berubah, lighting berubah, voice line

## A.9 — UI Polish

Hover: scale + glow + tilt + shadow. Elemen clickable harus selalu terlihat jelas bisa diklik. State "selected" dan "active card" harus lebih mencolok dari sekarang.

---

# BAGIAN B — Fusion UX (pertimbangkan di Fase 6.7 & Fase 8)

Kritik utama: fusion menarik tapi berisiko membingungkan pemain baru. Ide bantuan UX:

- Saat memilih kartu, partner fusion yang valid otomatis glow
- Slot yang diperlukan untuk fusion menyala
- Garis penghubung menunjukkan formasi yang akan terbentuk
- Preview fusion muncul otomatis dengan teks "Fusion Available"
- Saat hover monster, tampilkan panel "Can Fuse Into: [nama fusion] — Need: ✔ Card A, ✔ Card B, ✗ Card C (missing)"

**Catatan implementasi:** ini butuh akses real-time ke state tangan/board pemain untuk cek kombinasi fusion yang mungkin — baru bisa dikerjakan setelah logic fusion (`findFusionMatch`) sudah di-porting ke React state di Fase 6.7.

---

# BAGIAN C — AI Personality (evaluasi PASCA-MVP, bukan sekarang)

Ide: AI lawan punya beberapa "kepribadian" berbeda, bukan cuma satu algoritma optimal:

- **Aggressive** — selalu menekan dengan serangan cepat
- **Defensive** — membangun board dulu sebelum menyerang
- **Fusion AI** — memprioritaskan membentuk fusion
- **Control** — menyimpan trap, mengganggu strategi lawan
- **Boss AI** — pola permainan unik, multi-fase

**Catatan:** ini penambahan scope nyata (refactor `aiMainPhase`/`aiAttackSequence` yang sudah ada), bukan sekadar polish visual. Rencanakan sebagai fase terpisah setelah MVP jalan, jangan disisipkan ke Fase 1-10 yang sedang berjalan.

---

# BAGIAN D — Game Bible: World, Lore, & Roadmap Jangka Panjang

> ⚠️ **Scope bagian ini jauh melebihi MVP saat ini** (28 kartu, single-player vs 1 AI). Ini visi untuk kalau proyek berkembang jadi game skala lebih besar (150+ kartu, campaign, PvP live-service). Simpan sebagai referensi, evaluasi ulang kalau memang mau lanjut ke arah ini setelah MVP selesai.

## D.1 — High Concept

Nexus Chronicle: Tactical Positioning TCG bertema anime semi-realistic. Identitas utama: **Formation Fusion** — sistem fusion berdasarkan posisi unit di arena (baris/kolom/kombinasi), bukan sekadar kombinasi kartu.

**Core Pillars:** Positioning Matters · Formation Fusion · Story Driven TCG · Spectacular Game Feel · Easy to Learn, Hard to Master.

## D.2 — World: The Nexus Heart

Dunia dahulu disatukan oleh The Nexus Heart, yang pecah menjadi lima Nexus Shards, melahirkan lima kerajaan/faksi:

| Faksi | Tema | Nilai | Warna | Tokoh Utama |
|---|---|---|---|---|
| **Draconis** | Dragon Kingdom | Honor, Courage, Sacrifice | Merah & Emas | Lyria Ashbourne (Dragon Binder) |
| **Abyss** | Corrupted Civilization | Survival, Revenge (bukan jahat, ingin merebut hak mereka) | Ungu & Hitam | Noctis Umbra |
| **Machina** | Technology Empire, percaya logika > emosi | — | Biru | Atlas Prime |
| **Celestia** | Heavenly Kingdom, penjaga keseimbangan | — | Putih | Seraphiel |
| **Wildlands** | Nature Civilization, penjaga alam & makhluk purba | — | Hijau | Fenrir |

## D.3 — Karakter Utama per Faksi (referensi nama untuk kartu masa depan)

- **Draconis:** Lyria Ashbourne, Kael Ignis, Elder Arcturus, Ember, Ignivar
- **Abyss:** Noctis Umbra, Morrigan, Azrael, Nyx, Oblivion Dragon
- **Machina:** Atlas Prime, Nova, Titan MK-IV, Omega Core
- **Celestia:** Seraphiel, Aurora, Uriel, Solarius
- **Wildlands:** Fenrir, Sylva, Elder Treant, Gaia Behemoth

**Karakter hero:** Lyria Ashbourne (Main Hero — Brave, Kind, Optimistic; senjata Dragon Spear; partner Ember; evolusi akhir "Dragon Empress Lyria"). **Antagonis:** Noctis Umbra (Leader of Abyss, goal: "Reunite the world at any cost").

## D.4 — Story Roadmap (8 chapter)

1. The First Flame
2. Broken Alliance
3. Fragments
4. The Truth
5. Civil War
6. Awakening
7. The Last Nexus
8. Nexus Rebirth

## D.5 — Card Categories & Contoh Nama (untuk ekspansi kartu masa depan)

- **Unit:** Dragon Apprentice, Flame Lancer, Royal Dragonguard, Void Cultist, Steel Soldier, dll.
- **Fusion:** Dragon Sovereign Ignivar, Chrono Wyvern, Void Leviathan, Titan Omega, Ancient Nexus Guardian, Astral Dragon Emperor, Crimson Dragon Queen, Eclipse Phoenix
- **Attack:** Flame Burst, Meteor Strike, Shadow Slash, Thunder Crash, Dragon Breath, Void Explosion, Titan Smash
- **Trap:** Dragon's Ambush, Mirror Formation, Soul Barrier, Shadow Prison, Counter Pulse, Void Collapse, Emergency Shield
- **Tactic:** Dragon Pact, Battle Formation, Mana Surge, Rapid Deployment, Emergency Repair, Holy Blessing, Perfect Synchronization, Forbidden Ritual

## D.6 — Campaign Bible (7 chapter gameplay)

Tutorial → Abyss Invasion → Machina Alliance → Truth of Nexus → Civil War → Awakening → Final Battle

## D.7 — Expansion Roadmap (live-service, jangka sangat panjang)

Season 1 (150 kartu) → Season 2 (story arc baru) → Season 3 (PvP Ranked) → Season 4 (faksi baru)

## D.8 — Art & Audio Direction

- **Art style:** Anime, semi-realistic, cinematic lighting. UI: futuristic, minimal, glassmorphism.
- **Audio:** Music per kategori (Battle/Boss/Victory/Faction Theme); SFX dasar (Draw/Hover/Summon/Fusion/Attack/Destroy) — selaras dengan Bagian A.6 di atas.

## D.9 — "Dream Card" — Monster Ikonik

Game butuh monster yang jadi "wajah" game & tujuan koleksi pemain, contoh nama: Astral Dragon, Void Emperor, Chrono Titan, Nexus Guardian, Eclipse Phoenix.

## D.10 — Retention Features (masa depan, pasca-PvP)

Challenge, Achievement, Card Mastery, Skin/Avatar Unlock, Fusion Encyclopedia, Bestiary, Collection Progress, Statistics, Combo Tracker.

## D.11 — Urutan Roadmap yang Disarankan (dari sumber asli)

1. Game Feel & Audio (prioritas tertinggi — lihat Bagian A)
2. Fusion UX & Onboarding (Bagian B)
3. AI dengan berbagai personality (Bagian C)
4. Balancing kartu & faksi
5. Single Player Campaign
6. Collection & Progression
7. PvP Online
8. Season, Ranked, Event

---

## Hal yang HARUS Dipertahankan (dari semua dokumen sumber)

Jangan pernah mengubah core mechanic berikut — ini kekuatan/identitas utama game:

- ✅ Formation-based Fusion
- ✅ Front Row / Back Row positioning
- ✅ Positioning Strategy
- ✅ Arena sederhana yang fokus pada kartu
- ✅ Inspector Panel
- ✅ Battle Log
- ✅ Modern Minimalist UI
