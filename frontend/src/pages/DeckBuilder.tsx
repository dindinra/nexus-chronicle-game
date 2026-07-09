import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
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

  const col: CSSProperties = { flex: 1, minWidth: 260, padding: 12 };
  const wrap: CSSProperties = {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  };
  const btn: CSSProperties = {
    cursor: 'pointer',
    padding: '4px 8px',
    margin: 2,
    borderRadius: 4,
    border: '1px solid #555',
    background: '#222',
    color: '#eee',
  };

  return (
    <section style={{ padding: 24 }}>
      <h1>Deck Builder</h1>
      {message && (
        <p style={{ color: '#6f6', background: '#143', padding: 8, borderRadius: 4 }}>{message}</p>
      )}
      {error && (
        <p style={{ color: '#f66', background: '#311', padding: 8, borderRadius: 4 }}>{error}</p>
      )}

      <div style={wrap}>
        {/* Kolom 1: Daftar deck milik user */}
        <div style={col}>
          <h3>Daftar Deck</h3>
          <button style={btn} data-testid="new-deck" onClick={resetEditor}>
            + Deck Baru
          </button>
          {decks.length === 0 && <p>Belum ada deck.</p>}
          {decks.map((d) => (
            <div
              key={d.id}
              style={{
                border: '1px solid #333',
                borderRadius: 6,
                padding: 8,
                margin: '8px 0',
              }}
            >
              <strong>{d.name}</strong>
              {d.is_active && (
                <span style={{ color: '#6f6', marginLeft: 6 }}>● aktif</span>
              )}
              <div style={{ marginTop: 6 }}>
                <button style={btn} data-testid={`load-${d.id}`} onClick={() => loadDeck(d)}>
                  Edit
                </button>
                <button style={btn} data-testid={`activate-${d.id}`} onClick={() => activate(d.id)}>
                  Aktifkan
                </button>
                <button style={btn} data-testid={`delete-${d.id}`} onClick={() => del(d.id)}>
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Kolom 2: Editor deck */}
        <div style={col}>
          <h3>Editor Deck</h3>
          <input
            data-testid="deck-name"
            placeholder="Nama deck"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            style={{ width: '100%', padding: 6, marginBottom: 8, background: '#111', color: '#eee', border: '1px solid #555', borderRadius: 4 }}
          />
          <p style={{ fontWeight: 'bold', color: isValid ? '#6f6' : '#fc6' }}>
            Main: {mainCount}/{MAIN_TARGET} &nbsp;|&nbsp; Fusion: {fusionCount}/{FUSION_MAX}{' '}
            {isValid ? '✓ valid' : '✗ belum valid'}
          </p>
          <button style={btn} data-testid="save" onClick={save} disabled={busy}>
            {editingId != null ? 'Simpan Perubahan' : 'Buat Deck'}
          </button>
          {editingId != null && (
            <button style={btn} onClick={resetEditor}>
              Batal
            </button>
          )}

          <h4>Main Deck ({mainCount})</h4>
          {Object.entries(selections)
            .filter(([, s]) => !s.is_fusion)
            .map(([id, s]) => (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: 2 }}>
                <span>{id}</span>
                <span>
                  <button style={btn} onClick={() => removeCard(id)}>
                    -
                  </button>
                  {s.qty}
                  <button style={btn} onClick={() => addCard(id, false)} disabled={s.qty >= 2}>
                    +
                  </button>
                </span>
              </div>
            ))}
          {mainCount === 0 && <p style={{ color: '#888' }}>Kosong</p>}

          <h4>Fusion ({fusionCount})</h4>
          {Object.entries(selections)
            .filter(([, s]) => s.is_fusion)
            .map(([id, s]) => (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: 2 }}>
                <span>{id}</span>
                <span>
                  <button style={btn} onClick={() => removeCard(id)}>
                    -
                  </button>
                  {s.qty}
                  <button style={btn} onClick={() => addCard(id, true)} disabled>
                    +
                  </button>
                </span>
              </div>
            ))}
          {fusionCount === 0 && <p style={{ color: '#888' }}>Kosong</p>}
        </div>

        {/* Kolom 3: Katalog kartu */}
        <div style={col}>
          <h3>Katalog Kartu</h3>
          <div style={{ marginBottom: 8 }}>
            <input
              placeholder="Cari nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: 6, width: 140, background: '#111', color: '#eee', border: '1px solid #555', borderRadius: 4 }}
            />{' '}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'main' | 'fusion')}
              style={{ padding: 6, background: '#111', color: '#eee', border: '1px solid #555', borderRadius: 4 }}
            >
              <option value="all">Semua</option>
              <option value="main">Main</option>
              <option value="fusion">Fusion</option>
            </select>
          </div>

              <div className="deck-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {visible.map((it) => {
                    const sel = selections[it.id];
                    return (
                      <div key={it.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <CardView card={it} />
                        <button
                          style={btn}
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
