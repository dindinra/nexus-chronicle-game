// game.ts — Definisi tipe GameState (state board runtime)
//
// Shape diselaraskan dengan objek global `G` di prototype
// (_legacy-reference/index.html, lihat initGame() ~line 1097) dan
// instance kartu dari mkInst() (~line 1023). Fase 6.3b.
//
// CATATAN: flag seleksi UI yang sangat transien di prototype
// (dragSrc, _selectedHand, _selectedTrap, _selectedTactic, atkSrc, ...)
// sengaja TIDAK dimasukkan ke sini — itu state interaksi yang nanti
// dikelola di React component state (Fase 6.7+), bukan bagian model
// game murni. GameState di sini hanya menyimpan model game yang
// persisten: LP, energy, board (front/back), hand, gy, fusion.

import type { Card, Fusion } from './cards';

export type Row = 'front' | 'back';
export type Column = 0 | 1 | 2;
export type Side = 'player' | 'enemy';
export type Phase = 'draw' | 'main' | 'attack' | 'end' | 'gameover';

// Instance kartu di board/hand/gy.
// Card + flag runtime per-instance dari mkInst() prototype.
export interface BoardCard extends Card {
  uid: string;
  _tempBoost: number;
  _tempDebuff: number;
  _frontOnceUsed: boolean;
  _backOnceUsed: boolean;
  _setTrap: boolean;
  _hasAttacked: boolean;
  // Flag opsional untuk kartu trap yang dipasang di board.
  _isTrap?: boolean;
  _trapReady?: boolean;
  _gyFired?: boolean;
}

// Instance kartu fusion di tangan (pFusion / eFusion).
export interface FusionInstance extends Fusion {
  uid: string;
  _tempBoost: number;
  _tempDebuff: number;
  _frontOnceUsed: boolean;
  _backOnceUsed: boolean;
  _setTrap: boolean;
  _hasAttacked: boolean;
}

// Alias: kartu di graveyard bisa berupa unit biasa maupun fusion.
export type GraveyardCard = BoardCard | FusionInstance;

// Baris board selalu 3 kolom (front & back), tiap slot null kalau kosong.
export type BoardRow = (BoardCard | null)[];

export interface GameState {
  // --- Meta turn ---
  turn: number;
  isPlayer: boolean; // true = giliran player, false = giliran enemy
  phase: Phase;
  firstTurn: boolean;
  playerHasMoved: boolean;

  // --- LP & Energy (player / enemy) ---
  pLP: number;
  eLP: number;
  pEnergy: number;
  pEnergyMax: number;
  pTurnCount: number;
  eEnergy: number;
  eEnergyMax: number;
  eTurnCount: number;

  // --- Player ---
  pDeck: BoardCard[];
  pHand: BoardCard[];
  pFront: BoardRow; // 3 slot
  pBack: BoardRow; // 3 slot
  pGY: GraveyardCard[];
  pFusion: FusionInstance[];

  // --- Enemy ---
  eDeck: BoardCard[];
  eHand: BoardCard[];
  eFront: BoardRow; // 3 slot
  eBack: BoardRow; // 3 slot
  eGY: GraveyardCard[];
  eFusion: FusionInstance[];

  // --- Flag battle transien (level game, bukan UI) ---
  _negate: boolean;
  _freeTeleport: boolean;
  atk: boolean;
}
