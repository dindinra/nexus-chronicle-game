import { describe, it, expect } from 'vitest';
import type { BoardCard, GameState, Row, BoardRow } from '../../types/game';
import type { CardType } from '../../types/cards';
import {
  applyAiMainPhase,
  decideAiSummons,
  decideAiTrapPlacement,
  decideAiHeal,
  MAX_LP,
} from '../ai';

function mkCard(p: Partial<BoardCard> & { id: string; atk: number; cost: number; ctype: CardType }): BoardCard {
  return {
    id: p.id,
    name: p.name ?? p.id,
    rarity: 'C',
    lv: 1,
    cost: p.cost,
    fac: p.fac ?? 'Draconis',
    atk: p.atk,
    defense: p.defense ?? p.atk,
    ctype: p.ctype,
    eff: '',
    img: '',
    indestructible: false,
    image_url: null,
    uid: p.uid ?? `${p.id}_${Math.random().toString(36).slice(2)}`,
    _tempBoost: 0,
    _tempDebuff: 0,
    _frontOnceUsed: false,
    _backOnceUsed: false,
    _setTrap: false,
    _hasAttacked: false,
    ...(p._isTrap !== undefined ? { _isTrap: p._isTrap } : {}),
    ...(p._trapReady !== undefined ? { _trapReady: p._trapReady } : {}),
  };
}

function row(): BoardRow {
  return [null, null, null];
}

function baseGs(over: Partial<GameState> = {}): GameState {
  const gs: GameState = {
    turn: 2,
    isPlayer: false,
    phase: 'main',
    firstTurn: false,
    playerHasMoved: false,
    pLP: 50,
    eLP: 50,
    pEnergy: 0,
    pEnergyMax: 0,
    pTurnCount: 1,
    eEnergy: 3,
    eEnergyMax: 3,
    eTurnCount: 1,
    pDeck: [],
    pHand: [],
    pFront: row(),
    pBack: row(),
    pGY: [],
    pFusion: [],
    eDeck: [],
    eHand: [],
    eFront: row(),
    eBack: row(),
    eGY: [],
    eFusion: [],
    _negate: false,
    _freeTeleport: false,
    atk: false,
  };
  return { ...gs, ...over };
}

describe('aiMainPhase — trap placement', () => {
  it('places traps face-down into empty Back Row slots (max 3)', () => {
    const t1 = mkCard({ id: 'tr01', ctype: 'trap', cost: 0, atk: 0 });
    const t2 = mkCard({ id: 'tr02', ctype: 'trap', cost: 0, atk: 0 });
    const gs = baseGs({ eHand: [t1, t2], eBack: row() });
    const plan = decideAiTrapPlacement(gs);
    expect(plan).toHaveLength(2);
    const out = applyAiMainPhase(gs);
    expect(out.eBack[0]?._isTrap).toBe(true);
    expect(out.eBack[0]?._trapReady).toBe(true);
    expect(out.eBack[1]?._isTrap).toBe(true);
    expect(out.eHand).toHaveLength(0);
  });
});

describe('aiMainPhase — summon priority', () => {
  it('summons the higher-ATK unit first when energy covers both', () => {
    const cheap = mkCard({ id: 'nc01', atk: 5, cost: 1, ctype: 'unit' });
    const pricey = mkCard({ id: 'nc04', atk: 20, cost: 2, ctype: 'unit' });
    const gs = baseGs({ eEnergy: 5, eHand: [cheap, pricey], eFront: row(), eBack: row() });
    const out = applyAiMainPhase(gs);
    expect(out.eFront[0]?.id).toBe('nc04'); // higher ATK first → front slot 0
    expect(out.eFront[1]?.id).toBe('nc01');
    expect(out.eEnergy).toBe(5 - 2 - 1);
    expect(out.eHand).toHaveLength(0);
    // decision fn agrees: pricey (index 1) chosen first
    const plan = decideAiSummons(gs);
    expect(plan[0].handIndex).toBe(1);
    expect(plan[0].row).toBe('front');
  });

  it('does not summon when energy is insufficient', () => {
    const big = mkCard({ id: 'nc04', atk: 20, cost: 5, ctype: 'unit' });
    const gs = baseGs({ eEnergy: 2, eHand: [big], eFront: row(), eBack: row() });
    const out = applyAiMainPhase(gs);
    expect(out.eFront.every((c) => c === null)).toBe(true);
    expect(out.eEnergy).toBe(2);
    expect(out.eHand).toHaveLength(1);
  });
});

describe('aiMainPhase — heal before summon', () => {
  it('heals with tc02 when eLP < 40% MAX_LP, then summons', () => {
    const heal = mkCard({ id: 'tc02', ctype: 'tactic', cost: 0, atk: 0 });
    const unit = mkCard({ id: 'nc01', atk: 5, cost: 1, ctype: 'unit' });
    const gs = baseGs({ eLP: 10, eEnergy: 3, eHand: [heal, unit], eFront: row(), eBack: row() });
    const out = applyAiMainPhase(gs);
    expect(out.eLP).toBe(Math.min(MAX_LP, 10 + 15)); // 25
    expect(out.eGY.some((c) => c.id === 'tc02')).toBe(true);
    expect(out.eHand.some((c) => c.id === 'tc02')).toBe(false);
    expect(out.eFront[0]?.id).toBe('nc01'); // unit still summoned
    expect(decideAiHeal(gs)).toBe(0); // points at tc02
  });

  it('does NOT heal when eLP >= 40% MAX_LP', () => {
    const heal = mkCard({ id: 'tc02', ctype: 'tactic', cost: 0, atk: 0 });
    const gs = baseGs({ eLP: 40, eHand: [heal] });
    expect(decideAiHeal(gs)).toBe(-1);
    const out = applyAiMainPhase(gs);
    expect(out.eLP).toBe(40);
    expect(out.eGY.some((c) => c.id === 'tc02')).toBe(false);
  });
});
