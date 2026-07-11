// GameBoard.tsx — Fase 6.7a-r2: perbaiki layout ke struktur prototype (badge LP+Energy kedua sisi,
// enemy hand fan card-back, pile di-dalam row-group).
//
// Acuan porting (SPESIFIKASI MENGIKAT): frontend/_legacy-reference/index.html
//   - Struktur arena: baris 729-785 (row-group grid 3 kolom: pile kiri / row-slots tengah / pile kanan)
//   - Grid .row-group: baris 248-254 (grid-template-columns: var(--cw) 1fr var(--cw))
//   - renderFan: baris 1409-1429 (rotasi + translateY per kartu)
//   - .enemy-hand .hand-card-wrapper: baris 309 (transform-origin top center)
//   - .card-back: baris 331
//   - .player-badge / .pb-lp / .pb-energy: baris 156-174
//   - DEVIASI DISENGAJA (putusan user 2026-07-09): .pb-energy JUGA dipasang di enemy-badge
//     (prototype asli cuma di you-badge) -> supaya HUD simetris & energy musuh kelihatan.
//
// 6.7b (interaksi) dipertahankan: klik kartu Hand -> mainkan; klik kartu board player -> kembalikan.
// Engine belum ada (6.7c/6.7d).

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

// ── CSS (port persis dari prototype, di-scope di bawah .nc-board) ──
const BOARD_CSS = `
.nc-board {
  position: relative;
  --cw: 118px; --ch: 165px; --hand-zone-h: 192px;
  --arena-gap: 14px; --radius: 14px;
  --text-muted: #878c9c; --gold: #f0b429; --red: #ff5470;
  --green: #34d399; --purple: #a78bfa;
  --accent: #7c9bff; --line: rgba(255,255,255,0.08);
  --font-display: 'Rajdhani', sans-serif;
  --panel-bg-solid: #10121a; --panel-border: rgba(255,255,255,0.09);
}
.nc-board .hand-row { display:flex; align-items:center; gap:14px; height:var(--hand-zone-h); flex-shrink:0; }
.nc-board .hand-row .hand-zone { flex:1; height:100%; }
.nc-board .player-badge { flex-shrink:0; width:74px; height:74px; border-radius:50%; background:var(--panel-bg-solid); border:2px solid var(--panel-border); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; box-shadow:0 8px 20px rgba(0,0,0,.45); position:relative; }
.nc-board .player-badge.enemy-badge { border-color: rgba(255,84,112,.45); }
.nc-board .player-badge.you-badge { border-color: rgba(52,211,153,.45); }
.nc-board .pb-avatar { font-size:21px; line-height:1; opacity:.9; }
.nc-board .pb-lp { font-family:var(--font-display); font-weight:800; font-size:17px; line-height:1.3; }
.nc-board .enemy-badge .pb-lp { color:var(--red); }
.nc-board .you-badge .pb-lp { color:var(--green); }
.nc-board .pb-label { font-size:7px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.5px; }
.nc-board .pb-energy { position:absolute; bottom:-9px; left:50%; transform:translateX(-50%); background:rgba(6,7,11,.92); border:1px solid var(--gold); border-radius:10px; padding:1px 8px; font-family:var(--font-display); font-weight:700; font-size:10px; color:var(--gold); white-space:nowrap; }
.nc-board .enemy-rows-wrap, .nc-board .player-rows-wrap { display:flex; flex-direction:column; gap:var(--arena-gap); align-items:center; padding:8px 14px; border-radius:14px; border:1px solid transparent; }
.nc-board .row-group { display:grid; grid-template-columns:var(--cw) 1fr var(--cw); align-items:center; gap:var(--arena-gap); position:relative; }
.nc-board .row-slots { display:flex; gap:var(--arena-gap); grid-column:2; justify-self:center; }
.nc-board .row-label { position:absolute; left:-18px; top:50%; transform:translateY(-50%) rotate(180deg); font-family:var(--font-display); font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:2px; writing-mode:vertical-rl; opacity:.45; }
.nc-board .field-pile-slot { grid-column:1; justify-self:end; display:flex; align-items:center; }
.nc-board .field-pile-slot.side-right { grid-column:3; justify-self:start; }
.nc-board .field-pile { width:var(--cw); height:var(--ch); border-radius:var(--radius); background:rgba(255,255,255,0.02); border:1.5px dashed rgba(255,255,255,0.1); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; cursor:pointer; }
.nc-board .field-pile.fusion { border-color:rgba(167,139,250,.35); }
.nc-board .pile-icon { font-size:16px; margin-bottom:4px; opacity:.85; }
.nc-board .pile-count { font-family:var(--font-display); font-size:18px; font-weight:700; }
.nc-board .pile-label { font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.4px; }
.nc-board .field-divider { height:1px; width:60%; margin:14px auto; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent); }
.nc-board .hand-zone { height:var(--hand-zone-h); flex-shrink:0; display:flex; justify-content:center; align-items:center; position:relative; perspective:1000px; z-index:20; }
.nc-board .hand-container { display:flex; justify-content:center; align-items:center; position:relative; width:100%; height:100%; }
.nc-board .hand-card-wrapper { position:relative; margin-left:calc(var(--cw) * -0.42); transition:transform 0.25s cubic-bezier(0.2,0.8,0.2,1), margin 0.25s; transform-origin:bottom center; cursor:pointer; }
.nc-board .hand-card-wrapper:first-child { margin-left:0; }
.nc-board .enemy-hand .hand-card-wrapper { transform-origin:top center; margin-left:calc(var(--cw) * -0.32); }
.nc-board .card-back { width:var(--cw); height:var(--ch); border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:repeating-linear-gradient(135deg, #12131c, #12131c 9px, #1a1c28 9px, #1a1c28 18px); flex-shrink:0; box-shadow:0 6px 16px rgba(0,0,0,0.45); }
.nc-board .empty-slot { width:120px; height:112px; border:1px dashed #333; border-radius:6px; }
.nc-board .deck-list-container { margin-top:16px; padding:12px 14px; border:1px solid var(--line); border-radius:14px; min-width:0; }
.nc-board .deck-list-title { font-family:var(--font-display); font-size:9px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); margin-bottom:6px; }
.nc-board #deck-list-body { display:flex; flex-wrap:wrap; gap:4px; --cw:46px; --ch:64px; }
.nc-board #deck-list-body .c-top { padding: 3px; }
.nc-board #deck-list-body .c-cost { width: 15px; height: 15px; font-size: 8px; border-width: 1px; }
.nc-board #deck-list-body .c-lv { padding: 1px 3px; font-size: 7px; border-radius: 3px; }
.nc-board #deck-list-body .c-name { font-size: 6px; padding: 10px 4px 2px; bottom: 12px; letter-spacing: 0; }
.nc-board #deck-list-body .c-bot { height: 12px; font-size: 7.5px; }
.nc-board #deck-list-body .c-row-tag, .nc-board #deck-list-body .c-fusion-badge { display: none; }

.nc-board .turn-btns { flex-shrink: 0; display: flex; gap: 12px; }
.nc-board .cbtn-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.nc-board .cbtn-label { font-size: 8.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .4px; }
.nc-board .circle-btn {
  width: 58px; height: 58px; border-radius: 50%; flex-shrink: 0;
  background: var(--panel-bg-solid); border: 2px solid var(--line); color: var(--text-muted);
  font-size: 21px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: .18s; box-shadow: 0 8px 18px rgba(0,0,0,.4);
}
.nc-board .circle-btn:disabled { opacity: .3; cursor: not-allowed; }
.nc-board .circle-btn.cb-battle:not(:disabled) { border-color: var(--red); color: var(--red); }
.nc-board .circle-btn.cb-battle:not(:disabled):hover { background: var(--red); color: #fff; transform: translateY(-2px); }
.nc-board .circle-btn.cb-end:not(:disabled) { border-color: var(--green); color: var(--green); }
.nc-board .circle-btn.cb-end:not(:disabled):hover { background: var(--green); color: #06251a; transform: translateY(-2px); }

/* Phase pips — floating on the field, centered between both front rows (plain text, no box) */
.nc-board .phase-strip-field {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  display: flex; gap: 16px; z-index: 22; pointer-events: none;
}
.nc-board .ph {
  font-family: var(--font-display); font-size: 11px; font-weight: 700;
  color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0,0,0,.9), 0 0 10px rgba(0,0,0,.7);
  transition: color .25s, text-shadow .25s;
}
.nc-board .ph.active { color: var(--accent); text-shadow: 0 0 10px rgba(124,155,255,.75), 0 2px 4px rgba(0,0,0,.9); }
`;

// Lingkaran badge LP + Energy (player & enemy). Energy di KEDUA sisi (deviasi disengaja).
function SideBadge({ side, lp, energy, energyMax }: {
  side: 'you' | 'enemy';
  lp: number;
  energy: number;
  energyMax: number;
}) {
  const isYou = side === 'you';
  return (
    <div className={`player-badge ${isYou ? 'you-badge' : 'enemy-badge'}`}>
      <div className="pb-avatar">{isYou ? '🧑' : '👹'}</div>
      <div className="pb-lp">{lp}</div>
      <div className="pb-label">{isYou ? 'You' : 'Enemy'}</div>
      <div className="pb-energy">⚡ {energy}/{energyMax}</div>
    </div>
  );
}

// Pile (GY/Deck/Fusion) di dalam row-group.
function FieldPile({ icon, count, label, fusion, onClick }: {
  icon: string;
  count: number;
  label: string;
  fusion?: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`field-pile ${fusion ? 'fusion' : ''}`} onClick={onClick}>
      <div className="pile-icon">{icon}</div>
      <div className="pile-count">{count}</div>
      <div className="pile-label">{label}</div>
    </div>
  );
}

// Row slot field (Front/Back) — kartu face-up, klik (player) -> returnCard.
function FieldRow({ row, onCardClick }: {
  row: BoardRow;
  onCardClick?: (c: BoardCard, i: number) => void;
}) {
  return (
    <div className="row-slots">
      {row.map((c, i) =>
        c ? (
          <CardView
            key={i}
            card={c}
            onClick={onCardClick ? () => onCardClick(c, i) : undefined}
          />
        ) : (
          <div key={i} className="empty-slot" />
        ),
      )}
    </div>
  );
}

// Enemy hand = fan kartu back (tanpa label teks), sesuai renderFan prototype (baris 1409-1429).
function EnemyHandFan({ hand }: { hand: BoardCard[] }) {
  const total = hand.length;
  return (
    <div className="hand-container">
      {hand.map((_, i) => {
        const center = (total - 1) / 2;
        const offset = i - center;
        const angle = -(offset * 5);
        const yOff = Math.min(Math.abs(offset) * Math.abs(offset) * 1.5, 15);
        return (
          <div
            key={i}
            className="hand-card-wrapper"
            style={{ transform: `rotate(${angle}deg) translateY(${-yOff}px)`, zIndex: i }}
          >
            <div className="card-back" />
          </div>
        );
      })}
    </div>
  );
}

// Player hand = fan kartu klik-able (6.7b: klik -> mainkan).
function PlayerHandFan({ hand, onPlay }: {
  hand: BoardCard[];
  onPlay: (uid: string) => void;
}) {
  const total = hand.length;
  return (
    <div className="hand-container">
      {hand.map((c, i) => {
        const center = (total - 1) / 2;
        const offset = i - center;
        const angle = offset * 5;
        const yOff = Math.min(Math.abs(offset) * Math.abs(offset) * 1.5, 15);
        return (
          <div
            key={c.uid}
            className="hand-card-wrapper"
            style={{ transform: `rotate(${angle}deg) translateY(${yOff}px)`, zIndex: i }}
          >
            <CardView card={c} onClick={() => onPlay(c.uid)} />
          </div>
        );
      })}
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

  // ── 6.7c-1: Phase strip + setPhase() — port verbatim dari prototype 1153–1162 ──
  // setPhase update phase; .active + disabled tombol diturunkan (derived) dari gs di render.
  const setPhase = (ph: GameState['phase']) => {
    setGs((prev) => (prev ? { ...prev, phase: ph } : prev));
  };
  // Tombol battle/end — wiring minimal agar strip bisa diverifikasi interaktif.
  // Logika penuh enterBattle/doEnd (firstTurn check, finishEndPhase, enemy turn) = 6.7c-3.
  const enterBattle = () => {
    if (gs && gs.isPlayer && gs.phase === 'main' && !gs.firstTurn) setPhase('battle');
  };
  const doEnd = () => {
    if (gs && gs.isPlayer && (gs.phase === 'main' || gs.phase === 'battle')) setPhase('end');
  };

  if (error) {
    return (
      <section className="nc-board" style={{ padding: 24 }}>
        <h1>Game Board</h1>
        <p style={{ color: '#f66' }}>{error}</p>
      </section>
    );
  }
  if (!cards || !gs) {
    return (
      <section className="nc-board" style={{ padding: 24 }}>
        <h1>Game Board</h1>
        <p>Loading…</p>
      </section>
    );
  }

  // Disabled tombol — diturunkan dari gs (setara baris 1159–1160 prototype setPhase).
  const battleDisabled = !(gs.isPlayer && gs.phase === 'main' && !gs.firstTurn);
  const endDisabled = !(gs.isPlayer && (gs.phase === 'main' || gs.phase === 'battle'));

  return (
    <section className="nc-board" style={{ padding: 24, minHeight: '100vh', background: '#0f0f0f' }}>
      <style>{BOARD_CSS}</style>

      {/* Phase strip (DRW/MAIN/BTL/END) — port verbatim prototype 789–792 + .ph CSS 196–202.
          .active + disabled tombol diturunkan dari gs (setara setPhase prototype 1155–1162). */}
      <div className="phase-strip-field">
        <div className={`ph ${gs.phase === 'draw' ? 'active' : ''}`}>DRW</div>
        <div className={`ph ${gs.phase === 'main' ? 'active' : ''}`}>MAIN</div>
        <div className={`ph ${gs.phase === 'battle' ? 'active' : ''}`}>BTL</div>
        <div className={`ph ${gs.phase === 'end' ? 'active' : ''}`}>END</div>
      </div>

      <h1>Game Board</h1>
      {msg && (
        <p style={{ color: '#6f6', background: '#143', padding: 8, borderRadius: 4 }}>{msg}</p>
      )}
      <div style={{ marginBottom: 12, color: '#ccc', fontSize: 13 }}>
        Turn {gs.turn}
      </div>

      {/* Enemy hand row: badge (LP+Energy) + fan card-back */}
      <div className="hand-row enemy-hand-row">
        <SideBadge side="enemy" lp={gs.eLP} energy={gs.eEnergy} energyMax={gs.eEnergyMax} />
        <div className="hand-zone enemy-hand">
          <EnemyHandFan hand={gs.eHand} />
        </div>
      </div>

      {/* Arena: enemy rows */}
      <div className="enemy-rows-wrap">
        <div className="row-group">
          <div className="row-label">DEF</div>
          <div className="field-pile-slot">
            <FieldPile icon="💀" count={gs.eGY.length} label="GY" onClick={() => setModal({ title: 'Enemy Graveyard', body: `${gs.eGY.length} kartu di Graveyard musuh.` })} />
          </div>
          <FieldRow row={gs.eBack} />
          <div className="field-pile-slot side-right">
            <FieldPile icon="🎴" count={gs.eDeck.length} label="Deck" onClick={() => setModal({ title: 'Enemy Deck', body: `${gs.eDeck.length} kartu tersisa (face-down).` })} />
          </div>
        </div>
        <div className="row-group">
          <div className="row-label" style={{ color: 'var(--red)' }}>ATK</div>
          <div className="field-pile-slot">
            <FieldPile icon="🌀" count={gs.eFusion.length} label="Fusion" fusion onClick={() => setModal({ title: 'Enemy Fusion', body: `${gs.eFusion.length} kartu fusion musuh (face-down).` })} />
          </div>
          <FieldRow row={gs.eFront} />
        </div>
      </div>

      <div className="field-divider" />

      {/* Arena: player rows */}
      <div className="player-rows-wrap">
        <div className="row-group">
          <div className="row-label" style={{ color: 'var(--red)' }}>ATK</div>
          <div className="field-pile-slot">
            <FieldPile icon="🌀" count={gs.pFusion.length} label="Fusion" fusion onClick={() => setModal({ title: 'Player Fusion', body: `${gs.pFusion.length} kartu fusion tersedia.` })} />
          </div>
          <FieldRow row={gs.pFront} onCardClick={(c) => returnCard(c.uid)} />
        </div>
        <div className="row-group">
          <div className="row-label">DEF</div>
          <div className="field-pile-slot">
            <FieldPile icon="💀" count={gs.pGY.length} label="GY" onClick={() => setModal({ title: 'Player Graveyard', body: `${gs.pGY.length} kartu di Graveyard kamu.` })} />
          </div>
          <FieldRow row={gs.pBack} onCardClick={(c) => returnCard(c.uid)} />
          <div className="field-pile-slot side-right">
            <FieldPile icon="🎴" count={gs.pDeck.length} label="Deck" onClick={() => setModal({ title: 'Player Deck', body: `${gs.pDeck.length} kartu tersisa (face-down).` })} />
          </div>
        </div>
      </div>

      {/* Player hand row: badge (LP+Energy) + fan kartu klik-able */}
      <div className="hand-row player-hand-row">
        <SideBadge side="you" lp={gs.pLP} energy={gs.pEnergy} energyMax={gs.pEnergyMax} />
        <div className="hand-zone">
          <PlayerHandFan hand={gs.pHand} onPlay={playCard} />
        </div>
        <div className="turn-btns">
          <div className="cbtn-wrap">
            <button className="circle-btn cb-battle" disabled={battleDisabled} title="Battle Phase" onClick={enterBattle}>⚔</button>
            <div className="cbtn-label">Battle</div>
          </div>
          <div className="cbtn-wrap">
            <button className="circle-btn cb-end" disabled={endDisabled} title="End Turn" onClick={doEnd}>⏭</button>
            <div className="cbtn-label">End</div>
          </div>
        </div>
      </div>

      {/* Deck list panel (prototype #deck-list-body 46x64) — target screenshot ke-3 */}
      <div className="deck-list-container">
        <div className="deck-list-title">Your Deck (in play)</div>
        <div id="deck-list-body">
          {gs.pDeck.map((c, i) => (
            <CardView key={i} card={c} />
          ))}
        </div>
      </div>

      

      {modal && <PlaceholderModal title={modal.title} body={modal.body} onClose={() => setModal(null)} />}
    </section>
  );
}
