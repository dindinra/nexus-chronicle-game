// decks.ts — panggilan API deck (Fase 6.6).
// Terhubung ke backend Deck API (backend/routers/decks.py):
//   POST /decks, GET /decks, GET /decks/{id}, PUT /decks/{id},
//   DELETE /decks/{id}, POST /decks/{id}/activate
import type { Deck } from '../types/deck';
import { fetchJson, postJson, putJson, deleteJson } from './client';

// Satu entri kartu saat mengirim ke backend (mirip DeckCardBase).
export interface DeckCardInput {
  card_id: string;
  qty?: number;
  is_fusion?: boolean;
}

export interface DeckCreateInput {
  name: string;
  cards: DeckCardInput[];
}

export interface DeckUpdateInput {
  name?: string;
  cards?: DeckCardInput[];
}

export function listDecks(): Promise<Deck[]> {
  return fetchJson<Deck[]>('/decks');
}

export function getDeck(id: number): Promise<Deck> {
  return fetchJson<Deck>(`/decks/${id}`);
}

export function createDeck(payload: DeckCreateInput): Promise<Deck> {
  return postJson<Deck>('/decks', payload);
}

export function updateDeck(id: number, payload: DeckUpdateInput): Promise<Deck> {
  return putJson<Deck>(`/decks/${id}`, payload);
}

export function deleteDeck(id: number): Promise<void> {
  return deleteJson<void>(`/decks/${id}`);
}

export function activateDeck(id: number): Promise<Deck> {
  return postJson<Deck>(`/decks/${id}/activate`, {});
}
