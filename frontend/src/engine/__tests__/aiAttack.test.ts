import { describe, it, expect } from 'vitest';
import type { BoardCard, GameState, BoardRow } from '../../types/game';
import type { CardType } from '../../types/cards';
import { decideAiAttackTarget } from '../ai';

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
    ...(p._isTactic !== undefined ? { _isTactic: p._isTactic } : {}),
    ...(p._trapReady !== undefined ? { _trapReady: p._trapReady } : {}),
  };
}

function row(): BoardRow { return [null, null, null]; }

function baseGs(over: Partial<GameState> = {}): GameState {
  const gs: GameState = {
    turn: 2, isPlayer: false, phase: 'battle', firstTurn: false, playerHasMoved: false,
    pLP: 50, eLP: 50, pEnergy: 0, pEnergyMax: 0, pTurnCount: 1,
    eEnergy: 3, eEnergyMax: 3, eTurnCount: 1,
    pDeck: [], pHand: [], pFront: row(), pBack: row(), pGY: [], pFusion: [],
    eDeck: [], eHand: [], eFront: row(), eBack: row(), eGY: [], eFusion: [],
    _negate: false, _freeTeleport: false, atk: false,
    ...over,
  };
  return gs;
}

// effAtk mock: pakai atk mentah (cukup utk menguji logika SELEKSI target).
const effAtkMock = (_g: GameState, c: BoardCard, _pos: 'front' | 'back') => c.atk;

describe('decideAiAttackTarget', () => {
  it('pilih direct attack kalau player TIDAK punya front/back non-trap', () => {
    const gs = baseGs({
      eFront: [mkCard({ id: 'atk1', atk: 5, cost: 1, ctype: 'unit' }), null, null],
      pFront: row(),
      pBack: row(),
    });
    expect(decideAiAttackTarget(gs, 0, effAtkMock)).toEqual({ kind: 'direct' });
  });

  it('pilih direct attack kalau back player hanya berisi trap', () => {
    const gs = baseGs({
      eFront: [mkCard({ id: 'atk1', atk: 5, cost: 1, ctype: 'unit' }), null, null],
      pFront: row(),
      pBack: [mkCard({ id: 'tr1', atk: 0, cost: 1, ctype: 'trap', _isTrap: true, _trapReady: true }), null, null],
    });
    expect(decideAiAttackTarget(gs, 0, effAtkMock)).toEqual({ kind: 'direct' });
  });

  it('prefer trade yg MENANG — bunuh ancaman terbesar (def atk < attacker atk)', () => {
    const gs = baseGs({
      eFront: [mkCard({ id: 'atk1', atk: 5, cost: 1, ctype: 'unit' }), null, null],
      pFront: [
        mkCard({ id: 'd1', atk: 3, cost: 1, ctype: 'unit' }),
        mkCard({ id: 'd2', atk: 4, cost: 1, ctype: 'unit' }),
        mkCard({ id: 'd3', atk: 6, cost: 1, ctype: 'unit' }),
      ],
    });
    expect(decideAiAttackTarget(gs, 0, effAtkMock)).toEqual({ kind: 'attack', row: 'front', idx: 1 });
  });

  it('kalau TIDAK ada trade menang, serang defender terlemah', () => {
    const gs = baseGs({
      eFront: [mkCard({ id: 'atk1', atk: 5, cost: 1, ctype: 'unit' }), null, null],
      pFront: [
        mkCard({ id: 'd1', atk: 6, cost: 1, ctype: 'unit' }),
        mkCard({ id: 'd2', atk: 7, cost: 1, ctype: 'unit' }),
      ],
    });
    expect(decideAiAttackTarget(gs, 0, effAtkMock)).toEqual({ kind: 'attack', row: 'front', idx: 0 });
  });

  it('kalau ada back non-trap tapi TIDAK ada front → target back pertama', () => {
    const gs = baseGs({
      eFront: [mkCard({ id: 'atk1', atk: 5, cost: 1, ctype: 'unit' }), null, null],
      pFront: row(),
      pBack: [mkCard({ id: 'b1', atk: 4, cost: 1, ctype: 'unit' }), null, null],
    });
    expect(decideAiAttackTarget(gs, 0, effAtkMock)).toEqual({ kind: 'attack', row: 'back', idx: 0 });
  });

  it('return none kalau attacker index invalid', () => {
    const gs = baseGs({ eFront: row() });
    expect(decideAiAttackTarget(gs, 0, effAtkMock)).toEqual({ kind: 'none' });
  });
});
