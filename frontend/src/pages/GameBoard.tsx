// GameBoard.tsx — Fase 6.7b: mekanisme mainkan kartu (klik kartu di hand -> slot board).
//
// 6.7a-r1: tambah 6 pile (Deck/GY/Fusion x player & enemy) dengan count + klik -> modal placeholder.
// 6.7a: render-only (state demo statis).
// 6.7b: hand card clickable -> main ke slot player (Front dulu, lalu Back).
//        board card (player) clickable -> kembalikan ke hand (AKAN DIHAPUS di r8).
//        State nyata via useState (bukan demo statis lagi). Engine belum ada (6.7c/6.7d).

import { useEffect, useState } from 'react';
import { getCards } from '../api/cards';
import type { Card, Fusion } from '../types/cards';
import type { BoardCard, BoardRow, FusionInstance, GameState } from '../types/game';
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

function instF(f: Fusion, uid: string): FusionInstance {
  return {
    ...f,
    image_url: f.image_url ?? null,
    uid,
    _tempBoost: 0,
    _tempDebuff: 0,
    _frontOnceUsed: false,
    _backOnceUsed: false,
    _setTrap: false,
    _hasAttacked: false,
  };
}

// Beberapa fusion demo (hanya untuk tampilan count pile; data lengkap + logic nanti di 6.7d).
const DEMO_FUSIONS: Fusion[] = [
  { id: 'nf01', name: 'Dragon Sovereign', rarity: 'F', lv: 3, fac: 'Draconis', atk: 40, defense: 30, ctype: 'unit', eff: 'Destroy all enemy Back Row.', img: '', mats: ['nc01', 'nc02'], fusionType: 'contact', formationHint: '', image_url: null },
  { id: 'nf02', name: 'Abyss Reaper', rarity: 'F', lv: 2, fac: 'Abyss', atk: 45, defense: 10, ctype: 'unit', eff: '10 LP damage.', img: '', mats: ['nc04', 'nc09'], fusionType: 'line', formationHint: '', image_url: null },
  { id: 'nf03', name: 'Dragon Emperor', rarity: 'F', lv: 3, fac: 'Draconis', atk: 48, defense: 20, ctype: 'unit', eff: 'Destroy mirrored column.', img: '', mats: ['nc08', 'nc05'], fusionType: 'column', formationHint: '', image_url: null },
  { id: 'nf04', name: 'Machina Titan', rarity: 'F', lv: 3, fac: 'Machina', atk: 35, defense: 35, ctype: 'unit', eff: 'Enemies -10 ATK.', img: '', mats: ['nc03', 'nc12'], fusionType: 'vanguard', formationHint: '', image_url: null },
  { id: 'nf05', name: 'Celestia Dragon', rarity: 'F', lv: 3, fac: 'Celestia', atk: 38, defense: 28, ctype: 'unit', eff: '+15 LP, draw 1.', img: '', mats: ['nc13', 'nc10', 'nc11'], fusionType: 'triangle', formationHint: '', image_url: null },
  { id: 'nf06', name: 'Wildlands Alpha', rarity: 'F', lv: 2, fac: 'Wildlands', atk: 42, defense: 8, ctype: 'unit', eff: 'Destroy 1 enemy Front.', img: '', mats: ['nc06', 'nc07'], fusionType: 'contact', formationHint: '', image_url: null },
];

// State demo awal untuk verifikasi interaksi (bukan engine nyata).
function buildDemoState(cards: Card[]): GameState {
  const byId = (id: string) => cards.find((c) => c.id === id)!;
  const deckCard = (id: string, uid: string) => inst(byId(id), uid);
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
    pDeck: [deckCard('nc04', 'pd1'), deckCard('nc06', 'pd2'), deckCard('nc07', 'pd3'), deckCard('nc09', 'pd4'), deckCard('nc11', 'pd5'), deckCard('nc13', 'pd6')],
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
    pGY: [inst(byId('nc13'), 'pg1')],
    pFusion: DEMO_FUSIONS.map((f, i) => instF(f, 'pf' + (i + 1))),
    eDeck: [deckCard('nc01', 'ed1'), deckCard('nc02', 'ed2'), deckCard('nc03', 'ed3'), deckCard('nc05', 'ed4'), deckCard('nc10', 'ed5'), deckCard('nc13', 'ed6')],
    eHand: [
      inst(byId('nc01'), 'eh1'),
      inst(byId('nc02'), 'eh2'),
      inst(byId('nc04'), 'eh3'),
      inst(byId('nc06'), 'eh4'),
      inst(byId('nc11'), 'eh5'),
    ],
    eFront: [inst(byId('nc04'), 'ef1'), inst(byId('nc06'), 'ef2'), null],
    eBack: [inst(byId('nc07'), 'eb1'), null, inst(byId('nc09'), 'eb3')],
    eGY: [inst(byId('nc09'), 'eg1')],
    eFusion: DEMO_FUSIONS.map((f, i) => instF(f, 'ef' + (i + 1))),
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

// Pile tertutup (Deck/GY/Fusion) — tampilan count + klik buka modal placeholder.
function Pile({ icon, count, label, onClick }: {
  icon: string;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      title={`${label} — klik untuk detail (placeholder)`}
      style={{
        width: 92,
        height: 132,
        border: '1.5px dashed #555',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: '#edeff5' }}>{count}</div>
      <div style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
    </div>
  );
}

// Modal placeholder (detail GY/Fusion/Deck diisi nanti).
function PlaceholderModal({ title, body, onClose }: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(4,5,8,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#10121a', border: '1px solid #2e303a', borderRadius: 16, padding: 22, maxWidth: 420, width: '90%' }}
      >
        <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 21, color: '#f0b429', textTransform: 'uppercase', margin: '0 0 12px' }}>{title}</h2>
        <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>{body}</p>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #2e303a', background: 'rgba(255,255,255,0.05)', color: '#fff', fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function GameBoard() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [gs, setGs] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);

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
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          <Pile icon="💀" count={gs.eGY.length} label="GY" onClick={() => setModal({ title: 'Enemy Graveyard', body: `${gs.eGY.length} kartu di Graveyard musuh. Daftar detail menyusul.` })} />
          <Pile icon="🎴" count={gs.eDeck.length} label="Deck" onClick={() => setModal({ title: 'Enemy Deck', body: `${gs.eDeck.length} kartu tersisa (face-down).` })} />
        </div>
        <div style={{ flex: 1 }}>
          <Row label="Front" row={gs.eFront} />
          <Row label="Back" row={gs.eBack} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          <Pile icon="🌀" count={gs.eFusion.length} label="Fusion" onClick={() => setModal({ title: 'Enemy Fusion', body: `${gs.eFusion.length} kartu fusion musuh (face-down).` })} />
        </div>
      </div>
      <div style={{ margin: '8px 0', color: '#999', fontSize: 12 }}>
        Enemy Hand: {gs.eHand.length} (face-down)
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {gs.eHand.map((c, i) => (
          <CardView key={i} card={c} faceDown />
        ))}
      </div>

      <h3 style={{ color: '#8cf', marginTop: 16 }}>Player</h3>
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          <Pile icon="🌀" count={gs.pFusion.length} label="Fusion" onClick={() => setModal({ title: 'Player Fusion', body: `${gs.pFusion.length} kartu fusion tersedia. Panel fusion menyusul.` })} />
          <Pile icon="💀" count={gs.pGY.length} label="GY" onClick={() => setModal({ title: 'Player Graveyard', body: `${gs.pGY.length} kartu di Graveyard kamu. Daftar detail menyusul.` })} />
        </div>
        <div style={{ flex: 1 }}>
          <Row label="Front" row={gs.pFront} onCardClick={(c) => returnCard(c.uid)} />
          <Row label="Back" row={gs.pBack} onCardClick={(c) => returnCard(c.uid)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          <Pile icon="🎴" count={gs.pDeck.length} label="Deck" onClick={() => setModal({ title: 'Player Deck', body: `${gs.pDeck.length} kartu tersisa (face-down).` })} />
        </div>
      </div>
      <h4 style={{ color: '#8cf' }}>Hand (klik untuk mainkan)</h4>
      <div style={{ display: 'flex', gap: 8 }}>
        {gs.pHand.length === 0 ? (
          <span style={{ color: '#555' }}>hand kosong</span>
        ) : (
          gs.pHand.map((c) => <CardView key={c.uid} card={c} onClick={() => playCard(c.uid)} />)
        )}
      </div>

      <p style={{ color: '#666', marginTop: 16, fontSize: 11 }}>
        (6.7a-r1 — 6 pile: Deck/GY/Fusion x player & enemy, klik buka modal placeholder. 6.7b — klik kartu di Hand untuk mainkan; klik kartu di board untuk kembalikan ke Hand)
      </p>

      {modal && <PlaceholderModal title={modal.title} body={modal.body} onClose={() => setModal(null)} />}
    </section>
  );
}
