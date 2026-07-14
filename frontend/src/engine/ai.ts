// src/engine/ai.ts
// 6.7c-5: Enemy AI — pure decision fns + pure apply fn (testable tanpa render).
// Spesifikasi mengikat: frontend/_legacy-reference/index.html
//   - aiMainPhase: line 2001 (trap → heal → summon; fusion DI-SKIP)
//   - aiAttackSequence / aiAttack: line 2064 / 2070 (STEP 2)
//
// Arsitektur: decide* = pure (return rencana, NO mutation, NO React) untuk
// di-unit-test langsung. apply* = pure (return GameState BARU, immutable) yang
// dipakai React via setGs(prev => apply*(prev)). Logic combat TIDAK diduplikat
// di sini — STEP 2 reuse resolveAttackInPlace (GameBoard).

import type { BoardCard, GameState, Row } from '../types/game';

// MAX_LP dari prototype line 862 (global const; React GameState tdk punya field ini).
export const MAX_LP = 50;
export const HEAL_CARD_ID = 'tc02';
export const HEAL_AMOUNT = 15;
export const HEAL_THRESHOLD = MAX_LP * 0.4; // 20
export const BACK_PREF_IDS = ['nc03', 'nc08']; // kartu yg prefer Back Row
export const MAX_SUMMONS = 6;
export const MAX_TRAPS = 3;

// Lookup apakah sebuah card id adalah material fusion (untuk prioritas sort).
// Default: tidak ada (fusion execution di-skip). React mengisi dari DEMO_FUSIONS.
export type FusionMaterialLookup = (cardId: string) => boolean;
export const noFusionMaterials: FusionMaterialLookup = () => false;

// ── Pure decisions (testable) ──

export function decideAiTrapPlacement(gs: GameState): { handIndex: number; slotIndex: number }[] {
  const plan: { handIndex: number; slotIndex: number }[] = [];
  const consumedHand = new Set<number>();
  const consumedSlot = new Set<number>();
  for (let guard = 0; guard < MAX_TRAPS; guard++) {
    let handIndex = -1;
    for (let h = 0; h < gs.eHand.length; h++) {
      if (!consumedHand.has(h) && gs.eHand[h].ctype === 'trap') { handIndex = h; break; }
    }
    let slotIndex = -1;
    for (let s = 0; s < gs.eBack.length; s++) {
      if (!consumedSlot.has(s) && gs.eBack[s] === null) { slotIndex = s; break; }
    }
    if (handIndex < 0 || slotIndex < 0) break;
    plan.push({ handIndex, slotIndex });
    consumedHand.add(handIndex);
    consumedSlot.add(slotIndex);
  }
  return plan;
}

export function decideAiHeal(gs: GameState): number {
  if (gs.eLP >= HEAL_THRESHOLD) return -1;
  return gs.eHand.findIndex((c) => c.id === HEAL_CARD_ID);
}

export function decideAiSummons(
  gs: GameState,
  isFusionMaterial: FusionMaterialLookup = noFusionMaterials,
): { handIndex: number; row: Row; slot: number }[] {
  const plan: { handIndex: number; row: Row; slot: number }[] = [];
  let energy = gs.eEnergy;
  const consumedHand = new Set<number>();
  const frontFilled = gs.eFront.map((c) => c !== null);
  const backFilled = gs.eBack.map((c) => c !== null);
  for (let guard = 0; guard < MAX_SUMMONS; guard++) {
    const candidates: { h: number; c: BoardCard }[] = [];
    for (let h = 0; h < gs.eHand.length; h++) {
      if (consumedHand.has(h)) continue;
      const c = gs.eHand[h];
      if (c.ctype === 'unit' && energy >= c.cost) candidates.push({ h, c });
    }
    if (!candidates.length) break;
    candidates.sort((x, y) => {
      const xFus = isFusionMaterial(x.c.id) ? 1 : 0;
      const yFus = isFusionMaterial(y.c.id) ? 1 : 0;
      if (xFus !== yFus) return yFus - xFus;
      return y.c.atk - x.c.atk;
    });
    const { h: handIndex, c: card } = candidates[0];
    const wantsBack = BACK_PREF_IDS.includes(card.id);
    const frontSlot = frontFilled.findIndex((f) => !f);
    const backSlot = backFilled.findIndex((f) => !f);
    let row: Row;
    let slot: number;
    if (wantsBack && backSlot >= 0) { row = 'back'; slot = backSlot; }
    else if (frontSlot >= 0) { row = 'front'; slot = frontSlot; }
    else if (backSlot >= 0) { row = 'back'; slot = backSlot; }
    else break;
    plan.push({ handIndex, row, slot });
    energy -= card.cost;
    consumedHand.add(handIndex);
    if (row === 'front') frontFilled[slot] = true; else backFilled[slot] = true;
  }
  return plan;
}

// ── Pure apply (canonical port, returns NEW GameState) ──

export function applyAiMainPhase(
  gs: GameState,
  isFusionMaterial: FusionMaterialLookup = noFusionMaterials,
): GameState {
  let eHand = [...gs.eHand];
  let eFront = [...gs.eFront];
  let eBack = [...gs.eBack];
  let eEnergy = gs.eEnergy;
  let eLP = gs.eLP;
  let eGY = [...gs.eGY];

  // 1. Trap placement — prototype 2012-2020
  for (let guard = 0; guard < MAX_TRAPS; guard++) {
    const idx = eHand.findIndex((c) => c.ctype === 'trap');
    const slot = eBack.findIndex((s) => s === null);
    if (idx < 0 || slot < 0) break;
    const c = eHand.splice(idx, 1)[0];
    eBack[slot] = { ...c, uid: c.uid + '_t' + Date.now(), _isTrap: true, _trapReady: true };
  }

  // 2. Heal — prototype 2022-2031
  if (eLP < HEAL_THRESHOLD) {
    const hidx = eHand.findIndex((c) => c.id === HEAL_CARD_ID);
    if (hidx >= 0) {
      const c = eHand.splice(hidx, 1)[0];
      eGY = [...eGY, c];
      eLP = Math.min(MAX_LP, eLP + HEAL_AMOUNT);
    }
  }

  // 3. Summon units — prototype 2033-2056 (fusion SKIP, lihat TODO di bawah)
  for (let guard = 0; guard < MAX_SUMMONS; guard++) {
    const affordable = eHand.filter((c) => c.ctype === 'unit' && eEnergy >= c.cost);
    if (!affordable.length) break;
    affordable.sort((a, b) => {
      const aFus = isFusionMaterial(a.id) ? 1 : 0;
      const bFus = isFusionMaterial(b.id) ? 1 : 0;
      if (aFus !== bFus) return bFus - aFus;
      return b.atk - a.atk;
    });
    const card = affordable[0];
    const wantsBack = BACK_PREF_IDS.includes(card.id);
    const frontSlot = eFront.findIndex((s) => s === null);
    const backSlot = eBack.findIndex((s) => s === null);
    let row: Row | null = null;
    let slot = -1;
    if (wantsBack && backSlot >= 0) { row = 'back'; slot = backSlot; }
    else if (frontSlot >= 0) { row = 'front'; slot = frontSlot; }
    else if (backSlot >= 0) { row = 'back'; slot = backSlot; }
    if (!row) break;
    eEnergy -= card.cost;
    const placed = { ...card, uid: card.uid + 'x' + Date.now() };
    if (row === 'front') eFront[slot] = placed; else eBack[slot] = placed;
    const hi = eHand.indexOf(card);
    if (hi >= 0) eHand.splice(hi, 1);
  }

  // TODO 6.7c-5b (future): fusion AI belum di-port, lihat NOTES_6.7c.md
  return { ...gs, eHand, eFront, eBack, eEnergy, eLP, eGY };
}
