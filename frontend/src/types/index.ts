// index.ts — Re-export semua tipe domain dari satu entry point.
// Import di komponen lain cukup: `import type { Card, GameState } from '../types'`
// (verbatimModuleSyntax aktif → semua re-export menggunakan `export type`).

export type {
  Card,
  Fusion,
  CardType,
  Rarity,
  Faction,
  FusionType,
} from './cards';

export type { Deck, DeckCard } from './deck';

export type {
  GameState,
  BoardCard,
  FusionInstance,
  GraveyardCard,
  BoardRow,
  Row,
  Column,
  Side,
  Phase,
} from './game';
