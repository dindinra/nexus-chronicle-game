// deck.ts — Definisi tipe Deck (Domain types)
//
// Diselaraskan dengan kontrak API backend (backend/schemas.py:
// DeckOut, DeckCardOut). Fase 6.3b — struktur dasar tipe TS.

// Satu entri kartu di dalam sebuah deck (baris di tabel deck_cards).
export interface DeckCard {
  id: number;
  deck_id: number;
  card_id: string;
  qty: number;
  is_fusion: boolean;
}

// Respons penuh sebuah deck (mirip DeckOut di backend).
// created_at dikirim lewat JSON sebagai string ISO 8601.
export interface Deck {
  id: number;
  user_id: number;
  name: string;
  is_active: boolean;
  cards: DeckCard[];
  total_cards: number;
  created_at: string;
}
