import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCards, getFusions } from '../api/cards';
import {
  listDecks,
  createDeck,
  updateDeck,
  deleteDeck,
  activateDeck,
} from '../api/decks';
import type { Card, Fusion } from '../types/cards';
import type { Deck } from '../types/deck';
import { CardView } from '../components/CardView';
import './DeckBuilder.css';

interface Selection {
  qty: number;
  is_fusion: boolean;
}

const MAIN_TARGET = 30;
const FUSION_MAX = 6;

interface CatalogItem {
  id: string;
  name: string;
  image_url: string | null;
  is_fusion: boolean;
  sub: string;
  fac: string;
  lv: number;
  atk: number;
  defense: number;
}

export default function DeckBuilder() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [fusions, setFusions] = useState<Fusion[]>([]);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [deckName, setDeckName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'main' | 'fusion'>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [d, c, f] = await Promise.all([
        listDecks(),
        getCards(),
        getFusions(),
      ]);
      setDecks(d);
      setCards(c);
      setFusions(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const mainCount = useMemo(
    () =>
      Object.values(selections)
        .filter((s) => !s.is_fusion)
        .reduce((a, s) => a + s.qty, 0),
    [selections]
  );
  const fusionCount = useMemo(
    () =>
      Object.values(selections)
        .filter((s) => s.is_fusion)
        .reduce((a, s) => a + s.qty, 0),
    [selections]
  );
  const isValid = mainCount === MAIN_TARGET && fusionCount <= FUSION_MAX;

  const addCard = (card_id: string, is_fusion: boolean) => {
    setSelections((prev) => {
      const cur = prev[card_id];
      if (!cur) return { ...prev, [card_id]: { qty: 1, is_fusion } };
      const max = is_fusion ? 1 : 2;
      if (cur.qty >= max) return prev;
      return { ...prev, [card_id]: { qty: cur.qty + 1, is_fusion } };
    });
  };

  const removeCard = (card_id: string) => {
    setSelections((prev) => {
      const cur = prev[card_id];
      if (!cur) return prev;
      if (cur.qty <= 1) {
        const next = { ...prev };
        delete next[card_id];
        return next;
      }
      return { ...prev, [card_id]: { qty: cur.qty - 1, is_fusion: cur.is_fusion } };
    });
  };

  const resetEditor = () => {
    setSelections({});
    setDeckName('');
    setEditingId(null);
    setMessage(null);
    setError(null);
  };

  const loadDeck = (deck: Deck) => {
    const sel: Record<string, Selection> = {};
    for (const dc of deck.cards) {
      sel[dc.card_id] = { qty: dc.qty, is_fusion: dc.is_fusion };
    }
    setSelections(sel);
    setDeckName(deck.name);
    setEditingId(deck.id);
    setMessage(null);
    setError(null);
  };

  const toPayloadCards = () =>
    Object.entries(selections).map(([card_id, s]) => ({
      card_id,
      qty: s.qty,
      is_fusion: s.is_fusion,
    }));

  const save = async () => {
    if (!deckName.trim()) {
      setError('Nama deck wajib diisi');
      return;
    }
    if (!isValid) {
      setError(
        `Deck belum valid: main ${mainCount}/${MAIN_TARGET}, fusion ${fusionCount}/${FUSION_MAX}`
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editingId != null) {
        await updateDeck(editingId, { name: deckName.trim(), cards: toPayloadCards() });
        setMessage('Deck diperbarui');
      } else {
        const created = await createDeck({ name: deckName.trim(), cards: toPayloadCards() });
        setEditingId(created.id);
        setMessage('Deck dibuat');
      }
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const activate = async (id: number) => {
    setBusy(true);
    setError(null);
    try {
      await activateDeck(id);
      setMessage('Deck diaktifkan');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: number) => {
    if (!window.confirm('Hapus deck ini?')) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDeck(id);
      if (editingId === id) resetEditor();
      setMessage('Deck dihapus');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const catalog: CatalogItem[] = useMemo(() => {
    const main: CatalogItem[] = cards.map((c) => ({
      id: c.id,
      name: c.name,
      image_url: c.image_url,
      is_fusion: false,
      sub: `${c.cost}⚡ ${c.atk}/${c.defense}`,
      fac: c.fac,
      lv: c.lv,
      atk: c.atk,
      defense: c.defense,
    }));
    const fus: CatalogItem[] = fusions.map((f) => ({
      id: f.id,
      name: f.name,
      image_url: f.image_url,
      is_fusion: true,
      sub: 'Fusion',
      fac: f.fac,
      lv: f.lv,
      atk: f.atk,
      defense: f.defense,
    }));
    return [...main, ...fus];
  }, [cards, fusions]);

  const visible = catalog.filter((it) => {
    if (filter === 'main' && it.is_fusion) return false;
    if (filter === 'fusion' && !it.is_fusion) return false;
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <section className="deck-wrap">
      <div className="deck-header">
        <div className="deck-title">🃏 Deck Builder</div>
        <div className={`deck-count ${isValid ? 'ok' : 'bad'}`}>
          {mainCount}/{MAIN_TARGET} · Fusion {fusionCount}/{FUSION_MAX}
        </div>
        <div className="deck-actions">
          <button className="deck-btn" data-testid="new-deck" onClick={resetEditor}>
            + Deck Baru
          </button>
          <button className="deck-btn deck-save" onClick={save} disabled={busy}>
            {editingId != null ? 'Simpan Perubahan' : 'Buat Deck'}
          </button>
          {editingId != null && (
            <button className="deck-btn" onClick={resetEditor}>
              Batal
            </button>
          )}
        </div>
      </div>

      <div className="deck-body">
        {message && (
          <p style={{ color: '#6f6', background: '#143', padding: 8, borderRadius: 4 }}>{message}</p>
        )}
        {error && (
          <p style={{ color: '#f66', background: '#311', padding: 8, borderRadius: 4 }}>{error}</p>
        )}

        <div className="deck-cols">
          {/* Kolom 1: Daftar deck milik user */}
          <div className="deck-col">
            <div className="deck-section-title">Daftar Deck</div>
            {decks.length === 0 && <p className="deck-empty">Belum ada deck.</p>}
            {decks.map((d) => (
              <div key={d.id} className="deck-row">
                <div className="drk-info">
                  <div className="drk-name">
                    {d.name}
                    {d.is_active && <span className="drk-active">● aktif</span>}
                  </div>
                </div>
                <div className="deck-actions">
                  <button className="deck-btn" data-testid={`load-${d.id}`} onClick={() => loadDeck(d)}>
                    Edit
                  </button>
                  <button className="deck-btn" data-testid={`activate-${d.id}`} onClick={() => activate(d.id)}>
                    Aktifkan
                  </button>
                  <button className="deck-btn" data-testid={`delete-${d.id}`} onClick={() => del(d.id)}>
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Kolom 2: Editor deck */}
          <div className="deck-col">
            <div className="deck-section-title">Editor Deck</div>
            <input
              data-testid="deck-name"
              className="deck-input"
              placeholder="Nama deck"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              style={{ marginBottom: 8, width: '100%' }}
            />
            <p style={{ fontWeight: 'bold', color: isValid ? '#6f6' : '#fc6' }}>
              Main: {mainCount}/{MAIN_TARGET} &nbsp;|&nbsp; Fusion: {fusionCount}/{FUSION_MAX}{' '}
              {isValid ? '✓ valid' : '✗ belum valid'}
            </p>
            <div className="deck-actions" style={{ marginBottom: 8 }}>
              <button className="deck-btn deck-save" data-testid="save" onClick={save} disabled={busy}>
                {editingId != null ? 'Simpan Perubahan' : 'Buat Deck'}
              </button>
              {editingId != null && (
                <button className="deck-btn" onClick={resetEditor}>
                  Batal
                </button>
              )}
            </div>

            <div className="deck-section-title">Main Deck ({mainCount})</div>
            {Object.entries(selections)
              .filter(([, s]) => !s.is_fusion)
              .map(([id, s]) => (
                <div key={id} className="deck-row">
                  <div className="drk-info">
                    <div className="drk-name">{id}</div>
                  </div>
                  <div className="deck-stepper">
                    <button onClick={() => removeCard(id)} disabled={s.qty <= 1}>
                      −
                    </button>
                    <span className="drk-n">{s.qty}</span>
                    <button onClick={() => addCard(id, false)} disabled={s.qty >= 2}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            {mainCount === 0 && <p className="deck-empty">Kosong</p>}

            <div className="deck-section-title">Fusion ({fusionCount})</div>
            {Object.entries(selections)
              .filter(([, s]) => s.is_fusion)
              .map(([id, s]) => (
                <div key={id} className="deck-row">
                  <div className="drk-info">
                    <div className="drk-name">{id}</div>
                  </div>
                  <div className="deck-stepper">
                    <button onClick={() => removeCard(id)} disabled={s.qty <= 1}>
                      −
                    </button>
                    <span className="drk-n">{s.qty}</span>
                    <button onClick={() => addCard(id, true)} disabled>
                      +
                    </button>
                  </div>
                </div>
              ))}
            {fusionCount === 0 && <p className="deck-empty">Kosong</p>}
          </div>

          {/* Kolom 3: Katalog kartu */}
          <div className="deck-col">
            <div className="deck-section-title">Katalog Kartu</div>
            <div className="deck-actions deck-toolbar">
              <input
                className="deck-input"
                style={{ flex: 1 }}
                placeholder="Cari nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="deck-input"
                style={{ width: 'auto' }}
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'main' | 'fusion')}
              >
                <option value="all">Semua</option>
                <option value="main">Main</option>
                <option value="fusion">Fusion</option>
              </select>
            </div>

            <div className="deck-grid">
              {visible.map((it) => {
                const sel = selections[it.id];
                return (
                  <div key={it.id} className="deck-card-tile">
                    <div className="deck-card-visual">
                      <CardView card={it} />
                    </div>
                    <button
                      className="deck-btn"
                      data-add={it.id}
                      data-fusion={it.is_fusion ? '1' : '0'}
                      onClick={() => addCard(it.id, it.is_fusion)}
                    >
                      + Tambah{sel ? ` (${sel.qty})` : ''}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
