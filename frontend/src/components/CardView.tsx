// CardView.tsx — komponen presentational kartu (Fase 6.7a).
// Struktur & nilai CSS di-port VERBATIM dari prototype cardHTML() + .c-* rules
// (index.html baris 1447 & 334-350): layout ABSOLUTE-OVERLAY supaya teks
// (nama / ATK / DEF) menimpa art full-bleed dan TIDAK ter-clip overflow:hidden.
// Ukuran pakai var(--cw)/var(--ch); tiap container (arena 118/165, deck-builder
// 112/156, deck-list 46/64) override lewat parent. JANGAN hardcode width/height.
// faceDown -> render .card-back (prototype baris 331).

import type { CSSProperties } from 'react';
import { assetUrl } from '../api/client';
import './CardView.css';

const FAC_COLOR: Record<string, string> = {
  Draconis: '#e0552b',
  Abyss: '#8e44ad',
  Machina: '#5dade2',
  Celestia: '#f1c40f',
  Wildlands: '#27ae60',
};

export type CardLike = {
  id: string;
  name: string;
  image_url: string | null;
  fac: string;
  lv: number;
  atk: number;
  defense: number;
  cost?: number;
};

export function CardView({ card, faceDown, onClick, showLv = true }: {
  card: CardLike;
  faceDown?: boolean;
  onClick?: () => void;
  showLv?: boolean;
}) {
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
  };
  return (
    <div onClick={onClick} className="nc-card" style={rootStyle}>
      <div className="c-top">
        {card.cost != null && card.cost > 0 ? <div className="c-cost">{card.cost}</div> : <div />}
        {showLv && <div className="c-lv">Lv {card.lv}</div>}
      </div>
      <div className="c-art">
        {img ? (
          <img src={img} alt={card.name} />
        ) : (
          <span style={{ opacity: 0.4, fontSize: 10 }}>no img</span>
        )}
      </div>
      <div className="c-name">{card.name}</div>
      <div className="c-bot">
        <div className="c-atk">ATK {card.atk}</div>
        <div className="c-def">DEF {card.defense}</div>
      </div>
    </div>
  );
}
