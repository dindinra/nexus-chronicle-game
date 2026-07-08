import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Card, Fusion } from '../types';
import { getCards, getFusions } from '../api/cards';
import { assetUrl } from '../api/client';

function CardTile({ card }: { card: Card }) {
  return (
    <div style={{ border: '1px solid #333', borderRadius: 8, padding: 10, background: '#16181d' }}>
      <img
        src={assetUrl(card.image_url) ?? undefined}
        alt={card.name}
        style={{ width: '100%', height: 96, objectFit: 'contain', background: '#0c0d10', borderRadius: 6 }}
        onError={(e) => (e.currentTarget.style.opacity = '0.25')}
      />
      <div style={{ marginTop: 6, fontWeight: 700 }}>{card.name}</div>
      <div style={{ fontSize: 12, color: '#9aa0aa' }}>{card.fac} · {card.ctype} · LV{card.lv}</div>
      <div style={{ fontSize: 12 }}>ATK {card.atk} · DEF {card.defense} · ⚡{card.cost}</div>
      <div style={{ fontSize: 10, color: '#5a606b' }}>{card.id}</div>
    </div>
  );
}

function FusionTile({ fusion }: { fusion: Fusion }) {
  return (
    <div style={{ border: '1px solid #5a3a8a', borderRadius: 8, padding: 10, background: '#1a1422' }}>
      <img
        src={assetUrl(fusion.image_url) ?? undefined}
        alt={fusion.name}
        style={{ width: '100%', height: 96, objectFit: 'contain', background: '#0c0d10', borderRadius: 6 }}
        onError={(e) => (e.currentTarget.style.opacity = '0.25')}
      />
      <div style={{ marginTop: 6, fontWeight: 700 }}>{fusion.name}</div>
      <div style={{ fontSize: 12, color: '#b9a0e0' }}>{fusion.fac} · FUSION · LV{fusion.lv}</div>
      <div style={{ fontSize: 12 }}>ATK {fusion.atk} · DEF {fusion.defense}</div>
      <div style={{ fontSize: 10, color: '#5a606b' }}>mats: {fusion.mats.join(', ')}</div>
    </div>
  );
}

export default function CardList() {
  const [cards, setCards] = useState<Card[]>([]);
  const [fusions, setFusions] = useState<Fusion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getCards(), getFusions()])
      .then(([c, f]) => {
        if (!active) return;
        setCards(c);
        setFusions(f);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <section style={{ padding: 24 }}>
        <p>Loading cards from backend…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section style={{ padding: 24 }}>
        <h1>Card Catalog</h1>
        <p style={{ color: '#ff5470' }}>Failed to load: {error}</p>
        <p style={{ color: '#9aa0aa', fontSize: 13 }}>
          Pastikan backend FastAPI jalan di http://localhost:8000 dan CORS mengizinkan origin Vite (5173).
        </p>
      </section>
    );
  }

  const grid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: 12,
    marginTop: 12,
  };

  return (
    <section style={{ padding: 24 }}>
      <h1>Card Catalog</h1>
      <p style={{ color: '#9aa0aa', fontSize: 13 }}>
        Validasi koneksi FE↔BE — {cards.length} kartu + {fusions.length} fusion dari{' '}
        <code>GET /cards</code> &amp; <code>GET /cards/fusions</code>.
      </p>

      <h2 style={{ marginTop: 20 }}>Cards ({cards.length})</h2>
      <div style={grid}>
        {cards.map((c) => (
          <CardTile key={c.id} card={c} />
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>Fusions ({fusions.length})</h2>
      <div style={grid}>
        {fusions.map((f) => (
          <FusionTile key={f.id} fusion={f} />
        ))}
      </div>
    </section>
  );
}
