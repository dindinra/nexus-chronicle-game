// cards.ts — panggilan API kartu (Fase 6.4).
import type { Card, Fusion } from '../types';
import { fetchJson } from './client';

export function getCards(): Promise<Card[]> {
  return fetchJson<Card[]>('/cards');
}

export function getFusions(): Promise<Fusion[]> {
  return fetchJson<Fusion[]>('/cards/fusions');
}
