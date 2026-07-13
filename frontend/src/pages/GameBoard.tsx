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
// 6.7c-2: engine giliran player (startPlayerTurn: regen energi +1, auto-draw, banner, auto->main 600ms).
//   Coin flip DISKIP (putusan user 2026-07-11): player selalu duluan. Lihat TODO_BEFORE_RELEASE.md.

import { useEffect, useRef, useState } from 'react';
import { getCards } from '../api/cards';
import type { Card, Fusion } from '../types/cards';
import type { BoardCard, BoardRow, FusionInstance, GameState } from '../types/game';
import { CardView } from '../components/CardView';

// Batas hand (prototype HAND_LIMIT = 6, baris 863). drawOne() skip bila >= limit.
const HAND_LIMIT = 6;

// 6.7c-2: guard init SEKALI (StrictMode dev jalanin effect 2x -> cegah
// double getCards / double applyTurnStart / double banner).
let _gameInited = false;

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

// 6.7c-2: PURE turn-start (port startPlayerTurn 1184–1197, tanpa coin flip).
// Reset flag + temp, regen energi +1, auto-draw 1, phase 'draw'.
// PURE -> setGs(applyTurnStart(buildDemoState)) idempoten (StrictMode dev jalanin
// effect 2x; kedua resolve menghasikan state SAMA, tdk saling clobber).
// Dipakai: init load (player turn 1) & nanti enemy/main turn (6.7c-5).
function applyTurnStart(gs: GameState): GameState {
  const gain = 1; // energyForTurn(ownTurnCount) -> 1 (prototype 876)
  const canDraw = gs.pDeck.length > 0 && gs.pHand.length < HAND_LIMIT;
  const drawn = canDraw ? gs.pDeck[0] : null;
  const resetTemp = (row: BoardRow): BoardRow =>
    row.map((c) => (c ? { ...c, _tempBoost: 0, _tempDebuff: 0 } : null));
  const resetAtk = (row: BoardRow): BoardRow =>
    row.map((c) => (c ? { ...c, _hasAttacked: false } : null));
  return {
    ...gs,
    isPlayer: true,
    _negate: false,
    _freeTeleport: false,
    atk: false,
    pTurnCount: gs.pTurnCount + 1,
    pEnergy: gs.pEnergy + gain,
    pEnergyMax: gs.pEnergyMax + gain,
    pFront: resetAtk(resetTemp(gs.pFront)),
    pBack: resetAtk(resetTemp(gs.pBack)),
    eFront: resetTemp(gs.eFront),
    eBack: resetTemp(gs.eBack),
    pHand: canDraw ? [...gs.pHand, { ...drawn! }] : gs.pHand,
    pDeck: canDraw ? gs.pDeck.slice(1) : gs.pDeck,
    phase: 'draw',
  };
}

// PURE mirror applyTurnStart() untuk ENEMY (6.7c-3).
// energyForTurn -> 1; reset temp/atk flag musuh; draw 1 (jika eDeck>0 & eHand<6);
// turn++ (G.turn++ di prototype 1955); isPlayer=false; phase 'draw'.
// firstTurn TIDAK diubah di sini — dilepas jadi false SETELAH enemy selesai turn 1
// (lihat startEnemyTurn loop 6).
function applyEnemyTurnStart(gs: GameState): GameState {
  const gain = 1;
  const canDraw = gs.eDeck.length > 0 && gs.eHand.length < HAND_LIMIT;
  const drawn = canDraw ? gs.eDeck[0] : null;
  const resetTemp = (row: BoardRow): BoardRow =>
    row.map((c) => (c ? { ...c, _tempBoost: 0, _tempDebuff: 0 } : null));
  const resetAtk = (row: BoardRow): BoardRow =>
    row.map((c) => (c ? { ...c, _hasAttacked: false } : null));
  return {
    ...gs,
    isPlayer: false,
    _negate: false,
    _freeTeleport: false,
    atk: false,
    turn: gs.turn + 1,
    eTurnCount: gs.eTurnCount + 1,
    eEnergy: gs.eEnergy + gain,
    eEnergyMax: gs.eEnergyMax + gain,
    eFront: resetAtk(resetTemp(gs.eFront)),
    eBack: resetAtk(resetTemp(gs.eBack)),
    pFront: resetTemp(gs.pFront),
    pBack: resetTemp(gs.pBack),
    eHand: canDraw ? [...gs.eHand, { ...drawn! }] : gs.eHand,
    eDeck: canDraw ? gs.eDeck.slice(1) : gs.eDeck,
    phase: 'draw',
  };
}

// State demo awal untuk verifikasi interaksi (bukan engine nyata).
// Raw initial (energi 0, hand 4, deck 6, phase 'draw'); turn-start diterapkan
// lewat applyTurnStart() di load effect.
function buildDemoState(cards: Card[]): GameState {
  const byId = (id: string) => cards.find((c) => c.id === id)!;
  const deckCard = (id: string, uid: string) => inst(byId(id), uid);
  return {
    turn: 1,
    isPlayer: true,
    phase: 'draw',
    firstTurn: true,
    playerHasMoved: false,
    pLP: 80,
    eLP: 80,
    pEnergy: 0,
    pEnergyMax: 0,
    pTurnCount: 0,
    eEnergy: 0,
    eEnergyMax: 0,
    eTurnCount: 0,
    pDeck: [deckCard('nc04', 'pd1'), deckCard('nc06', 'pd2'), deckCard('nc07', 'pd3'), deckCard('nc09', 'pd4'), deckCard('nc11', 'pd5'), deckCard('nc13', 'pd6')],
    pHand: [
      inst(byId('nc01'), 'h1'),
      inst(byId('nc05'), 'h2'),
      inst(byId('at01'), 'h3'),
      inst(byId('tc02'), 'h4'),
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

/* Phase pips — FIXED di tepi atas layar (viewport), area kosong, TIDAK overlap row kartu.
   top:50% verbatim prototype tabrak row (proporsi board React beda) -> user minta pindah (2026-07-11).
   + backdrop pill + active filled (kontras jelas, per review user). */
.nc-board .phase-strip-field {
  position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 14px; z-index: 60; pointer-events: none;
  background: rgba(12,14,22,.72); border: 1px solid rgba(255,255,255,.12);
  border-radius: 999px; padding: 7px 16px; backdrop-filter: blur(6px);
  box-shadow: 0 6px 20px rgba(0,0,0,.55);
}
.nc-board .ph {
  font-family: var(--font-display); font-size: 12px; font-weight: 700;
  color: #aeb4c8; text-transform: uppercase; letter-spacing: 1.5px;
  transition: color .2s, background .2s; padding: 2px 9px; border-radius: 6px;
}
.nc-board .ph.active {
  color: #0b0e16; background: var(--accent);
  box-shadow: 0 0 12px rgba(124,155,255,.65);
}

/* Discard modal (port verbatim prototype 381–453) — hand > HAND_LIMIT saat end phase. */
.nc-board .mbg { position: fixed; inset: 0; background: rgba(4,5,8,.82); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
.nc-board .mbox { background: var(--panel-bg-solid); border: 1px solid var(--panel-border); border-radius: 16px; padding: 22px; max-width: 600px; width: 100%; max-height: 84vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,.6); }
.nc-board .mbox h2 { font-family: var(--font-display); font-size: 21px; color: var(--gold); margin-bottom: 12px; text-transform: uppercase; border-bottom: 1px solid var(--line); padding-bottom: 10px; }
.nc-board .mbox p { color: var(--text-muted); font-size: 12px; margin-bottom: 12px; line-height: 1.5; }
.nc-board .mcards { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.nc-board .mbtn { width: 100%; padding: 13px; border-radius: 10px; border: 1px solid var(--line); background: rgba(255,255,255,.05); color: #fff; font-family: var(--font-display); font-size: 15px; font-weight: 700; text-transform: uppercase; cursor: pointer; margin-top: 12px; transition: .18s; }
.nc-board .mbtn:hover { background: rgba(255,255,255,.1); border-color: var(--gold); color: var(--gold); }
.nc-board .mbtn:disabled { opacity: .35; cursor: not-allowed; }
.nc-board .disc-card { background: rgba(255,255,255,.03); border: 1px solid var(--line); border-radius: 10px; padding: 10px; width: 150px; cursor: pointer; font-size: 11px; transition: .15s; }
.nc-board .disc-card:hover { border-color: var(--red); background: rgba(255,84,112,.06); }
.nc-board .disc-card.disc-sel { border-color: var(--red); background: rgba(255,84,112,.14); }
.nc-board .disc-card .dn { font-weight: 700; margin-bottom: 4px; color: #fff; }
.nc-board .disc-card .ds { color: var(--text-muted); font-size: 9px; margin-top: 2px; }

/* Turn banner (prototype baris 217-226) — flashes "Turn N / Your Turn" centered. */
.nc-board .turn-banner {
  position: absolute; inset: 0; z-index: 40; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
  background: rgba(6,7,11,0); pointer-events: none;
  font-family: var(--font-display); font-weight: 800; font-size: 32px; letter-spacing: 3px;
  color: var(--text-main, #ddd8cc); text-transform: uppercase; opacity: 0;
  transition: opacity .35s ease, background .35s ease;
}
.nc-board .turn-banner.show { opacity: 1; background: rgba(6,7,11,.4); }
.nc-board .turn-banner .tb-who { display: block; font-size: 13px; letter-spacing: 4px; color: var(--gold); margin-top: 8px; }
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
  // 6.7c-3: discard modal (hand > HAND_LIMIT saat end phase).
  const [discardSel, setDiscardSel] = useState<Set<number> | null>(null);
  // 6.7c-2: banner giliran + ref mirror gs (dibaca flashTurnBanner).
  const [banner, setBanner] = useState<{ turn: number; who: string } | null>(null);
  const gsRef = useRef<GameState | null>(null);
  const startedRef = useRef(false);

  // Load kartu + set RAW demo (turn-start diterapkan oleh startPlayerTurn via
  // effect [gs] di bawah — satu kali, sesuai prototype startPlayerTurn 1184).
  useEffect(() => {
    if (_gameInited) return;   // StrictMode 2nd invoke -> skip
    _gameInited = true;
    getCards()
      .then((cs) => {
        setCards(cs);
        setGs(buildDemoState(cs));
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  // Sync gsRef tiap gs berubah (dibaca flashTurnBanner).
  useEffect(() => { gsRef.current = gs; }, [gs]);

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
  // ── 6.7c-3: enterBattle() — port 1690 ──
  const enterBattle = () => {
    if (!gs) return;
    if (gs.firstTurn) { setMsg('Cannot attack on Turn 1!'); return; }
    if (gs.phase !== 'main') return;
    setMsg('Battle Phase! Click your Front Row card to attack.');
    setPhase('battle');
  };

  // ── 6.7c-3: doEnd() — port 1885 (clear flag, cek hand>limit -> discard, else finishEndPhase) ──
  const doEnd = () => {
    if (!gs) return;
    if (!gs.isPlayer) return;
    if (!(gs.phase === 'main' || gs.phase === 'battle')) return;
    if (gs.pHand.length > HAND_LIMIT) {
      showDiscardModal();
      return;
    }
    finishEndPhase();
  };

  // ── 6.7c-3: finishEndPhase() — port 1943 (setPhase('end') -> 700ms -> startEnemyTurn) ──
  const finishEndPhase = () => {
    setPhase('end');
    setMsg('End Phase. Passing turn…');
    // prototype 1949: setTimeout(() => startEnemyTurn(), 700)
    setTimeout(() => startEnemyTurn(), 700);
  };

  // ── 6.7c-3: discard modal (port 1896/1919/1929) — hand > HAND_LIMIT saat end phase ──
  const showDiscardModal = () => {
    setDiscardSel(new Set<number>());
  };
  const toggleDiscardSel = (idx: number) => {
    setDiscardSel((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };
  const confirmDiscard = () => {
    if (!gs || !discardSel) return;
    const excess = gs.pHand.length - HAND_LIMIT;
    if (discardSel.size !== excess) return;
    const indices = [...discardSel].sort((a, b) => b - a);
    setGs((prev) => {
      if (!prev) return prev;
      const hand = [...prev.pHand];
      const gy = [...prev.pGY];
      for (const i of indices) {
        const [c] = hand.splice(i, 1);
        if (c) gy.push(c);
      }
      return { ...prev, pHand: hand, pGY: gy };
    });
    setDiscardSel(null);
    finishEndPhase();
  };

  // ── 6.7c-3: startEnemyTurn() — port 1953 (transition MINIMAL, tanpa AI) ──
  // aiMainPhase + aiAttackSequence = 6.7c-5. Sekarang musuh cuma lewat
  // giliran (draw + regen + reset flag) lalu balik ke player (firstTurn=false
  // setelah enemy selesai turn 1, sesuai loop prototype 6).
  const startEnemyTurn = () => {
    const cur = gsRef.current;
    const turn = (cur ? cur.turn : 1) + 1;
    flashTurnBanner(turn, false);
    setGs((prev) => (prev ? applyEnemyTurnStart(prev) : prev));
    // Auto -> MAIN 600ms (prototype 1962)
    setTimeout(() => {
      setPhase('main');
      // 6.7c-5: di sini aiMainPhase() lalu BTL lalu aiAttackSequence (jika !firstTurn).
      // Scaffold: musuh lewat giliran tanpa AI -> 600ms -> END -> balik player.
      setTimeout(() => {
        setPhase('end');
        setTimeout(() => {
          // firstTurn dilepas SETELAH enemy selesai turn 1 (prototype loop 6).
          setGs((prev) => (prev ? { ...prev, firstTurn: false } : prev));
          startPlayerTurn();
        }, 700);
      }, 600);
    }, 600);
  };

  // ── 6.7c-2: flashTurnBanner() — port 1167–1173 (banner "Turn N" 1400ms) ──
  const flashTurnBanner = (turn: number, isPlayer: boolean) => {
    setBanner({ turn, who: isPlayer ? 'Your Turn' : "Enemy's Turn" });
    setTimeout(() => setBanner(null), 1400);
  };

  // ── 6.7c-2: startPlayerTurn() — port 1184–1205 (TANPA coin flip) ──
  // Energi +1/turn (energyForTurn selalu 1, prototype 876), reset flag + temp,
  // auto-draw 1 (bila hand<6 & deck>0), phase 'draw' -> auto 'main' 600ms.
  // State mutasi via PURE applyTurnStart() (lihat atas); gsRef sdh sync
  // di effect sblm-nya sehingga turn/isPlayer akurat.
  const startPlayerTurn = () => {
    const cur = gsRef.current;
    const turn = cur ? cur.turn : 1;
    // startPlayerTurn SELALU = giliran player (applyTurnStart paksa isPlayer:true)
    // -> banner "Your Turn" (bukan cur.isPlayer yang bisa stale=enemy di loop).
    flashTurnBanner(turn, true);
    setGs((prev) => (prev ? applyTurnStart(prev) : prev));
    // Auto -> MAIN setelah 600ms (prototype 1200).
    setTimeout(() => setPhase('main'), 600);
  };

  // 6.7c-2: mulai giliran player langsung di mount (coin flip diskip -> player duluan).
  useEffect(() => {
    if (gs && !startedRef.current) {
      startedRef.current = true;
      startPlayerTurn();
    }
  }, [gs]);

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

      {/* Turn banner (DRW/overlay) — port verbatim prototype 217–226 + #turn-pill 795.
          Flash "Turn N / Your Turn" 1400ms saat giliran berganti. */}
      <div className={`turn-banner ${banner ? 'show' : ''}`}>
        {banner && (
          <>
            Turn {banner.turn}
            <span className="tb-who">{banner.who}</span>
          </>
        )}
      </div>

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

      {/* Discard modal (6.7c-3) — hand > HAND_LIMIT saat end phase. */}
      {discardSel !== null && (
        <div className="mbg">
          <div className="mbox" onClick={(e) => e.stopPropagation()}>
            <h2>⚠ Hand Limit — Discard {gs.pHand.length - HAND_LIMIT} Card{gs.pHand.length - HAND_LIMIT > 1 ? 's' : ''}</h2>
            <p>You have {gs.pHand.length} cards but the limit is 6. Select{' '}
              <strong style={{ color: 'var(--red)' }}>{gs.pHand.length - HAND_LIMIT}</strong>{' '}
              card{gs.pHand.length - HAND_LIMIT > 1 ? 's' : ''} to send to the Graveyard.
            </p>
            <div className="mcards">
              {gs.pHand.map((c, i) => (
                <div
                  key={c.uid}
                  className={`disc-card ${discardSel.has(i) ? 'disc-sel' : ''}`}
                  onClick={() => toggleDiscardSel(i)}
                >
                  <div className="dn">{c.name}</div>
                  <div className="ds">{c.ctype.toUpperCase()} · {c.fac || ''} · {c.rarity ?? ''}</div>
                  {c.ctype === 'unit' && (
                    <div className="ds">ATK {c.atk} · DEF {c.defense} · {c.cost}⚡</div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)' }}>
              Selected: {discardSel.size} / {gs.pHand.length - HAND_LIMIT}
            </div>
            <button
              className="mbtn"
              disabled={discardSel.size !== gs.pHand.length - HAND_LIMIT}
              onClick={confirmDiscard}
              style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
            >
              Confirm Discard
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
