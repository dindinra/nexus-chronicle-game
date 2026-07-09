// CardView.tsx — komponen presentational kartu (Fase 6.7a).
// Menampilkan 1 kartu (gambar + nama + stat). Tidak ada interaksi.
// Dipakai oleh GameBoard (dan nanti 6.7b+ untuk hand/field berinteraksi).

import type { CSSProperties } from 'react';
import type { Card } from '../types/cards';
import { assetUrl } from '../api/client';

const FAC_COLOR: Record<string, string> = {
  Draconis: '#e0552b',
  Abyss: '#8e44ad',
  Machina: '#5dade2',
  Celestia: '#f1c40f',
  Wildlands: '#27ae60',
};

const backStyle: CSSProperties = {
  width: 120,
  height: 104,
  border: '2px solid #555',
  borderRadius: 6,
  background: '#222',
  color: '#777',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 28,
  fontFamily: 'monospace',
};

export function CardView({ card, faceDown, onClick }: { card: Card; faceDown?: boolean; onClick?: () => void }) {
  if (faceDown) {
    return <div style={backStyle}>?</div>;
  }
  const img = assetUrl(card.image_url);
  const color = FAC_COLOR[card.fac] ?? '#888';
  return (
    <div
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        border: `2px solid ${color}`,
        borderRadius: 6,
        width: 120,
        padding: 4,
        background: '#1a1a1a',
        color: '#eee',
        textAlign: 'center',
      }}
    >
      {img ? (
        <img src={img} alt={card.name} style={{ width: 110, height: 70, objectFit: 'contain' }} />
      ) : (
        <div
          style={{
            width: 110,
            height: 70,
            background: '#222',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          no img
        </div>
      )}
      <div style={{ fontSize: 11 }}>{card.name}</div>
      <div style={{ fontSize: 10, color: '#bbb' }}>
        {card.fac} · LV{card.lv}
      </div>
      <div style={{ fontSize: 10 }}>
        ATK {card.atk} / DEF {card.defense}
      </div>
    </div>
  );
}
