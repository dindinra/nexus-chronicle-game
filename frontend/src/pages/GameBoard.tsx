// GameBoard.tsx — Fase 6.7b: mekanisme mainkan kartu (klik kartu di hand -> slot board).
//
// 6.7a: render-only (state demo statis).
// 6.7b: hand card clickable -> main ke slot player (Front dulu, lalu Back).
//        board card (player) clickable -> kembalikan ke hand.
//        State nyata via useState (bukan demo statis lagi). Engine belum ada (6.7c/6.7d).

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

// State demo awal untuk verifikasi interaksi (bukan engine nyata).
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

function Row({ label, row, faceDown, onCardClick }: {
  label: string;
  row: BoardRow;
  faceDown?: boolean;
  onCardClick?: (c: BoardCard, i: number) => void;
}) {
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
            {c ? (
              <CardView card={c} faceDown={faceDown} onClick={onCardClick ? () => onCardClick(c, i) : undefined} />
            ) : (
              <span style={{ color: '#555' }}>empty</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GameBoard() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [gs, setGs] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getCards()
      .then((cs) => {
        setCards(cs);
        setGs(buildDemoState(cs));
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const playCard = (uid: string) => {
    const prev = gs;
    if (!prev) return;
    const card = prev.pHand.find((c) => c.uid === uid);
    if (!card) return;
    let key: 'pFront' | 'pBack' = 'pFront';
    let idx = prev.pFront.findIndex((s) => s === null);
    if (idx === -1) {
      key = 'pBack';
      idx = prev.pBack.findIndex((s) => s === null);
    }
    if (idx === -1) {
      setMsg('Player Front & Back penuh — tidak bisa mainkan kartu');
      return;
    }
    const newHand = prev.pHand.filter((c) => c.uid !== uid);
    const newRow = [...prev[key]] as BoardRow;
    newRow[idx] = card;
    setMsg(`Mainkan ${card.name} -> ${key === 'pFront' ? 'Front' : 'Back'} slot ${idx + 1}`);
    setGs({ ...prev, pHand: newHand, [key]: newRow });
  };

  const returnCard = (uid: string) => {
    const prev = gs;
    if (!prev) return;
    const fi = prev.pFront.findIndex((c) => c && c.uid === uid);
    const bi = prev.pBack.findIndex((c) => c && c.uid === uid);
    let key: 'pFront' | 'pBack' | null = null;
    let idx = -1;
    if (fi !== -1) {
      key = 'pFront';
      idx = fi;
    } else if (bi !== -1) {
      key = 'pBack';
      idx = bi;
    }
    if (!key) return;
    const card = prev[key][idx] as BoardCard;
    const newRow = [...prev[key]] as BoardRow;
    newRow[idx] = null;
    setMsg(`Kembalikan ${card.name} ke hand`);
    setGs({ ...prev, [key]: newRow, pHand: [...prev.pHand, card] });
  };

  if (error) {
    return (
      <section style={{ padding: 24 }}>
        <h1>Game Board</h1>
        <p style={{ color: '#f66' }}>{error}</p>
      </section>
    );
  }
  if (!cards || !gs) {
    return (
      <section style={{ padding: 24 }}>
        <h1>Game Board</h1>
        <p>Loading…</p>
      </section>
    );
  }

  return (
    <section style={{ padding: 24, minHeight: '100vh', background: '#0f0f0f' }}>
      <h1>Game Board</h1>
      {msg && (
        <p style={{ color: '#6f6', background: '#143', padding: 8, borderRadius: 4 }}>{msg}</p>
      )}
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
      <Row label="Front" row={gs.pFront} onCardClick={(c) => returnCard(c.uid)} />
      <Row label="Back" row={gs.pBack} onCardClick={(c) => returnCard(c.uid)} />
      <h4 style={{ color: '#8cf' }}>Hand (klik untuk mainkan)</h4>
      <div style={{ display: 'flex', gap: 8 }}>
        {gs.pHand.length === 0 ? (
          <span style={{ color: '#555' }}>hand kosong</span>
        ) : (
          gs.pHand.map((c) => <CardView key={c.uid} card={c} onClick={() => playCard(c.uid)} />)
        )}
      </div>

      <p style={{ color: '#666', marginTop: 16, fontSize: 11 }}>
        (6.7b — klik kartu di Hand untuk mainkan ke slot Front/Back; klik kartu di board untuk
        kembalikan ke Hand)
      </p>
    </section>
  );
}
