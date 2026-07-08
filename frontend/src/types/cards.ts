// cards.ts — Definisi tipe kartu (Domain types)
//
// Diselaraskan dengan kontrak API backend (backend/schemas.py:
// CardOut & FusionOut) dan data statis backend/data/cards.json.
// Fase 6.3b — struktur dasar tipe TS (bagian dari Fase 6).

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
