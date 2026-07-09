// GameBoard.tsx — Fase 6.7a: render field & hand (tanpa interaksi).
//
// Menampilkan board 3 kolom front/back untuk Enemy & Player, plus hand
// pemain (face-up) dan hand musuh (face-down). State masih demo statis
// (belum ada engine / interaksi — itu 6.7b/6.7c/6.7d).
//
// Data kartu di-fetch dari backend /cards (sama seperti CardList 6.4) sehingga
// gambar & nama asli muncul. Engine state (GameState) baru demo; nanti 6.7c
// akan diganti dengan store nyata.

import { useEffect, useState } from 'react';
import { getCards } from '../api/cards';
import type { Card } from '../types/cards';
import type { BoardCard, BoardRow, GameState } from '../types/game';
import { CardView } from '../components/CardView';

function inst(card: Card, uid: string): BoardCard {
  return {
    ...card,
    uid,
    _tempBoost: 0,
    _tempDebuff: 0,
    _frontOnceUsed: false,
    _backOnceUsed: false,
    _setTrap: false,
    _hasAttacked: false,
  };
}

// State demo untuk verifikasi layout visual (bukan engine nyata).
function buildDemoState(cards: Card[]): GameState {
  const byId = (id: string) => cards.find((c) => c.id === id)!;
  return {
    turn: 1,
    isPlayer: true,
    phase: 'main',
    firstTurn: true,
    playerHasMoved: false,
    pLP: 80,
    eLP: 80,
    pEnergy: 5,
    pEnergyMax: 10,
    pTurnCount: 1,
    eEnergy: 5,
    eEnergyMax: 10,
    eTurnCount: 1,
    pDeck: [],
    pHand: [
      inst(byId('nc01'), 'h1'),
      inst(byId('nc05'), 'h2'),
      inst(byId('at01'), 'h3'),
      inst(byId('tc02'), 'h4'),
      inst(byId('tr01'), 'h5'),
      inst(byId('nc10'), 'h6'),
    ],
    pFront: [inst(byId('nc02'), 'pf1'), inst(byId('nc08'), 'pf2'), null],
    pBack: [inst(byId('nc03'), 'pb1'), null, inst(byId('nc12'), 'pb3')],
    pGY: [],
    pFusion: [],
    eDeck: [],
    eHand: [
      inst(byId('nc01'), 'eh1'),
      inst(byId('nc02'), 'eh2'),
      inst(byId('nc04'), 'eh3'),
      inst(byId('nc06'), 'eh4'),
      inst(byId('nc11'), 'eh5'),
    ],
    eFront: [inst(byId('nc04'), 'ef1'), inst(byId('nc06'), 'ef2'), null],
    eBack: [inst(byId('nc07'), 'eb1'), null, inst(byId('nc09'), 'eb3')],
    eGY: [],
    eFusion: [],
    _negate: false,
    _freeTeleport: false,
    atk: false,
  };
}

function Row({ label, row, faceDown }: { label: string; row: BoardRow; faceDown?: boolean }) {
  return (
    <div style={{ margin: '6px 0' }}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {row.map((c, i) => (
          <div
            key={i}
            style={{
              width: 124,
              minHeight: 112,
              border: '1px dashed #444',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {c ? <CardView card={c} faceDown={faceDown} /> : <span style={{ color: '#555' }}>empty</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GameBoard() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCards()
      .then(setCards)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <section style={{ padding: 24 }}>
        <h1>Game Board</h1>
        <p style={{ color: '#f66' }}>{error}</p>
      </section>
    );
  }
  if (!cards) {
    return (
      <section style={{ padding: 24 }}>
        <h1>Game Board</h1>
        <p>Loading…</p>
      </section>
    );
  }

  const gs = buildDemoState(cards);

  return (
    <section style={{ padding: 24, minHeight: '100vh', background: '#0f0f0f' }}>
      <h1>Game Board</h1>
      <div style={{ marginBottom: 12, color: '#ccc', fontSize: 13 }}>
        Turn {gs.turn} · Phase {gs.phase} · Player LP {gs.pLP} / Enemy LP {gs.eLP} · Energy{' '}
        {gs.pEnergy}/{gs.pEnergyMax}
      </div>

      <h3 style={{ color: '#f88' }}>Enemy</h3>
      <Row label="Front" row={gs.eFront} />
      <Row label="Back" row={gs.eBack} />
      <div style={{ margin: '8px 0', color: '#999', fontSize: 12 }}>
        Enemy Hand: {gs.eHand.length} (face-down)
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {gs.eHand.map((c, i) => (
          <CardView key={i} card={c} faceDown />
        ))}
      </div>

      <h3 style={{ color: '#8cf', marginTop: 16 }}>Player</h3>
      <Row label="Front" row={gs.pFront} />
      <Row label="Back" row={gs.pBack} />
      <h4 style={{ color: '#8cf' }}>Hand</h4>
      <div style={{ display: 'flex', gap: 8 }}>
        {gs.pHand.map((c) => (
          <CardView key={c.uid} card={c} />
        ))}
      </div>

      <p style={{ color: '#666', marginTop: 16, fontSize: 11 }}>
        (6.7a — render-only, belum ada interaksi / engine)
      </p>
    </section>
  );
}
