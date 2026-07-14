## Ide: Frame Break / OOB Effect (Fase Visual Polish, belum prioritas)

Referensi istilah:
- Out of Bounds (OOB) — art keluar batas kanvas, ilusi kedalaman (istilah umum desain grafis/Photoshop)
- Frame Break / Border Break — istilah TCG spesifik (contoh: Marvel Snap "upgrade" card art)
- 3D Pop-out — efek dari drop shadow + layering yang bikin art terasa "melompat" dari kartu

Kandidat implementasi (urutan dari termurah):
1. CSS-only: art PNG transparan (perlu bg-removal step di ComfyUI/rembg) diposisikan absolute z-index di atas frame, digeser keluar border (mis. kepala/senjata menembus atas). Border mungkin perlu clip-path/notch biar rapi di titik tembus.
2. + drop-shadow filter di elemen yang menembus → efek pop-out 3D.
3. Baked-in di ComfyUI (outpainting/extend) — kompleks, cocok cuma buat key art statis, kurang praktis untuk 26 kartu sistematis.

Kandidat use-case: kartu spesial/legendary (misal nf03 Dragon Emperor, hasil fusion) — bukan semua kartu.

Referensi visual (deskripsi, gambar belum di-upload ke repo):
Contoh kartu "Lyria, Princess of Draconis" (gaya mirip Marvel Snap/LoR) — full-bleed art sampai tepi kartu, stat badge melayang di 3 pojok (cost kiri-atas, power kanan-atas, defense kanan-bawah), nama+subtitle overlay di atas art bagian bawah, 2 ability block dengan icon bulat. Beda gaya dari "ornate frame" yang sudah ada di prototype saat ini — dicatat sebagai referensi alternatif, bukan keputusan ganti arah desain.

Status: idea capture only, belum dieksekusi. Ditunda sampai semua logic Fase 6.7 solid (sesuai kesepakatan Fase Visual Polish terpisah).
