// cards.ts — Definisi tipe kartu (Domain types)
//
// Diselaraskan dengan kontrak API backend (backend/schemas.py:
// CardOut & FusionOut) dan data statis backend/data/cards.json.
// Fase 6.3b — struktur dasar tipe TS (bagian dari Fase 6).

import type { GameState, Row } from './game';

export type CardType = 'unit' | 'attack' | 'tactic' | 'trap';
export type Rarity = 'C' | 'E' | 'L' | 'F';
export type Faction =
  | 'Draconis'
  | 'Abyss'
  | 'Machina'
  | 'Celestia'
  | 'Wildlands';
export type FusionType =
  | 'contact'
  | 'line'
  | 'column'
  | 'vanguard'
  | 'triangle';

// Kartu unit/attack/tactic/trap (mirip CardOut di backend).
export interface Card {
  id: string;
  name: string;
  rarity: Rarity;
  lv: number;
  cost: number;
  fac: Faction;
  atk: number;
  defense: number;
  ctype: CardType;
  eff: string;
  img: string;
  indestructible: boolean;
  image_url: string | null;
  // Fungsi efek kartu (dari prototype mkInst ~1023). OPSIONAL — hanya diisi
  // bila data kartu membawa logika efek. Di 6.7c-4 dipanggil via guard opsional
  // (no-op kalau absen); implementasi efek penuh = scope 6.7d (Efek kartu).
  useFn?: (gs: GameState) => void;
  frontOnceFn?: (gs: GameState) => void;
  backOnceFn?: (gs: GameState) => void;
  trapFn?: (gs: GameState, ctx?: { attacker?: Card; targetRow?: Row }) => void;
  gyFn?: (gs: GameState) => void;
}

// Kartu fusion (mirip FusionOut di backend).
export interface Fusion {
  id: string;
  name: string;
  rarity: Rarity;
  lv: number;
  fac: Faction;
  atk: number;
  defense: number;
  ctype: CardType;
  eff: string;
  img: string;
  mats: string[];
  fusionType: FusionType;
  formationHint: string;
  image_url: string | null;
}
