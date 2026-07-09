// CardView.tsx — komponen presentational kartu (Fase 6.7a).
// Ukuran MENGGUNAKAN var(--cw)/var(--ch) (sesuai prototype baris 316-319 & 331):
// tiap container (arena 118/165, deck-builder 112/156, deck-list 46/64) override lewat
// parent. JANGAN hardcode width/height di sini — itu akar penyimpangan visual 6.7a-r2.
// faceDown -> render .card-back (prototype baris 331).

import type { CSSProperties } from 'react';
import { assetUrl } from '../api/client';

// Minimal shape yang dipakai untuk render — cukup field yg dibutuhkan tampilan.
// BoardCard (GameBoard) dan item katalog (DeckBuilder) sama-sama kompatibel.
export type CardLike = {
  id: string;
  name: string;
  image_url: string | null;
  fac: string;
  lv: number;
  atk: number;
  defense: number;
};

const FAC_COLOR: Record<string, string> = {
  Draconis: '#e0552b',
  Abyss: '#8e44ad',
  Machina: '#5dade2',
  Celestia: '#f1c40f',
  Wildlands: '#27ae60',
};

export function CardView({ card, faceDown, onClick }: { card: CardLike; faceDown?: boolean; onClick?: () => void }) {
  if (faceDown) {
    // .card-back (prototype baris 331): ukuran var(--cw)/var(--ch), gradien diagonal.
    return (
      <div
        onClick={onClick}
        className="card-back"
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      />
    );
  }
  const img = assetUrl(card.image_url);
  const color = FAC_COLOR[card.fac] ?? '#888';
  const rootStyle: CSSProperties = {
    width: 'var(--cw)',
    height: 'var(--ch)',
    borderRadius: 12,
    overflow: 'hidden',
    border: `1px solid ${color}`,
    background: '#0d0f16',
    position: 'relative',
    cursor: onClick ? 'pointer' : 'grab',
    flexShrink: 0,
    color: '#eee',
    textAlign: 'center',
  };
  const imgH = 'calc(var(--ch) - 32px)';
  return (
    <div onClick={onClick} className="nc-card" style={rootStyle}>
      {img ? (
        <img src={img} alt={card.name} style={{ width: '100%', height: imgH, objectFit: 'contain', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: imgH, background: '#222', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
          no img
        </div>
      )}
      <div style={{ fontSize: 11, padding: '1px 2px', lineHeight: 1.1 }}>{card.name}</div>
      <div style={{ fontSize: 10, color: '#bbb' }}>{card.fac} · LV{card.lv}</div>
      <div style={{ fontSize: 10, paddingBottom: 2 }}>ATK {card.atk} / DEF {card.defense}</div>
    </div>
  );
}
