import { describe, it, expect } from 'vitest';
import type { BoardCard, GameState } from '../../types/game';
import { applyNc13WinDraw, applyNc13Heal, applyAiMainPhase, HAND_LIMIT, MAX_LP } from '../ai';

function mk(id: string): BoardCard {
  return {
    id, name: id, rarity: 'C', lv: 1, cost: 1, fac: 'Celestia', atk: 1, defense: 1, ctype: 'unit',
    img: '', eff: '', indestructible: false, image_url: null,
    uid: id + '_u',
    _tempBoost: 0, _tempDebuff: 0, _frontOnceUsed: false, _backOnceUsed: false,
    _setTrap: false, _hasAttacked: false,
  };
}

function gs(over: Partial<GameState> = {}): GameState {
  return {
    turn: 1, isPlayer: true, phase: 'battle', firstTurn: false, playerHasMoved: false,
    pLP: 50, eLP: 50, pEnergy: 1, pEnergyMax: 1, pTurnCount: 0,
    eEnergy: 1, eEnergyMax: 1, eTurnCount: 0,
    pDeck: [], pHand: [], pFront: [null, null, null], pBack: [null, null, null], pGY: [], pFusion: [],
    eDeck: [], eHand: [], eFront: [null, null, null], eBack: [null, null, null], eGY: [], eFusion: [],
    _negate: false, _freeTeleport: false, atk: false,
    ...over,
  } as GameState;
}

describe('nc13 Celestia Seraph — symmetric battle-win draw', () => {
  it('player wins → draws from pDeck to pHand (faithful prototype 1842)', () => {
    const g = gs({ pDeck: [mk('a')], pHand: [mk('h1'), mk('h2')] });
    applyNc13WinDraw(g, 'player');
    expect(g.pHand).toHaveLength(3);
    expect(g.pDeck).toHaveLength(0);
    expect(g.eHand).toHaveLength(0);
    expect(g.eDeck).toHaveLength(0);
  });

  it('enemy wins → draws from eDeck to eHand (SIMETRIS — deviasi disetujui §10.2)', () => {
    const g = gs({ eDeck: [mk('a')], eHand: [mk('h1'), mk('h2')] });
    applyNc13WinDraw(g, 'enemy');
    expect(g.eHand).toHaveLength(3);
    expect(g.eDeck).toHaveLength(0);
    expect(g.pHand).toHaveLength(0);
    expect(g.pDeck).toHaveLength(0);
  });

  it('player wins but pHand at HAND_LIMIT → no draw (gate dipertahankan)', () => {
    const hand = Array.from({ length: HAND_LIMIT }, (_, i) => mk('h' + i));
    const g = gs({ pDeck: [mk('a')], pHand: hand });
    applyNc13WinDraw(g, 'player');
    expect(g.pHand).toHaveLength(HAND_LIMIT);
    expect(g.pDeck).toHaveLength(1);
  });

  it('enemy wins but eDeck empty → no draw', () => {
    const g = gs({ eDeck: [], eHand: [mk('h1')] });
    applyNc13WinDraw(g, 'enemy');
    expect(g.eHand).toHaveLength(1);
    expect(g.eDeck).toHaveLength(0);
  });
});

describe('nc13 Celestia Seraph — frontOnceFn heal +10 LP (player-only, prototype 932)', () => {
  it('heal +10 normal: pLP 30 → 40', () => {
    const g = gs({ pLP: 30 });
    applyNc13Heal(g);
    expect(g.pLP).toBe(40);
  });

  it('heal caps at MAX_LP=50 (faithful Math.min): pLP 45 → 50 (not 55), and stays at 50 if already max', () => {
    const g = gs({ pLP: 45 });
    applyNc13Heal(g);
    expect(g.pLP).toBe(MAX_LP); // 50, clamped — NOT 55

    const g2 = gs({ pLP: MAX_LP });
    applyNc13Heal(g2);
    expect(g2.pLP).toBe(MAX_LP); // already at max → unchanged
  });

  it('NO heal when ENEMY summons nc13 (player-only enforced at summon site)', () => {
    // Even with frontOnceFn ATTACHED to the enemy card, the AI summon path
    // (applyAiMainPhase) must NOT invoke it — heal is player-only.
    const enemyNc13: BoardCard = {
      ...mk('nc13'),
      frontOnceFn: (gg: GameState) => { gg.pLP = Math.min(MAX_LP, gg.pLP + 10); },
    };
    const g = gs({ eHand: [enemyNc13, mk('x')], eEnergy: 5, pLP: 30 });
    const out = applyAiMainPhase(g);
    expect(out.pLP).toBe(30); // unchanged — enemy summon does NOT heal player
    // sanity: enemy actually summoned nc13 somewhere on its board
    expect(out.eFront.some(Boolean) || out.eBack.some(Boolean)).toBe(true);
  });
});
