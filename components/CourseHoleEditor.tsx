'use client';

import { useState, useEffect } from 'react';
import type { Tee } from '@/lib/golf-db';

interface HoleRow {
  hole_number: number;
  par: number;
  yards: number | null;
  handicap: number | null;
}

function emptyHoles(): HoleRow[] {
  return Array.from({ length: 9 }, (_, i) => ({
    hole_number: i + 1, par: 4, yards: null, handicap: null,
  }));
}

export default function CourseHoleEditor({ tees }: { tees: Tee[] }) {
  const [selectedTeeId, setSelectedTeeId] = useState<number | null>(tees[0]?.id ?? null);
  const [holeData, setHoleData]           = useState<Record<number, HoleRow[]>>({});
  const [editing, setEditing]             = useState(false);
  const [editRows, setEditRows]           = useState<HoleRow[]>(emptyHoles());
  const [saving, setSaving]               = useState(false);
  const [loaded, setLoaded]               = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!selectedTeeId || loaded.has(selectedTeeId)) return;
    fetch(`/api/holes?teeId=${selectedTeeId}`)
      .then(r => r.json())
      .then(data => {
        setHoleData(prev => ({ ...prev, [selectedTeeId]: Array.isArray(data) ? data : [] }));
        setLoaded(prev => new Set(prev).add(selectedTeeId));
      });
  }, [selectedTeeId, loaded]);

  function startEditing() {
    const existing = holeData[selectedTeeId!] ?? [];
    const merged = emptyHoles().map(h => {
      const found = existing.find(e => e.hole_number === h.hole_number);
      return found ? { ...h, ...found } : h;
    });
    setEditRows(merged);
    setEditing(true);
  }

  async function saveHoles() {
    if (!selectedTeeId) return;
    setSaving(true);
    await fetch('/api/holes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teeId: selectedTeeId, holes: editRows }),
    });
    setHoleData(prev => ({ ...prev, [selectedTeeId]: [...editRows] }));
    setEditing(false);
    setSaving(false);
  }

  const displayRows = selectedTeeId ? (holeData[selectedTeeId] ?? []) : [];
  const hasData     = displayRows.length > 0;
  const totalPar    = displayRows.reduce((a, h) => a + h.par, 0);
  const editPar     = editRows.reduce((a, h) => a + h.par, 0);
  const editYds     = editRows.reduce((a, h) => a + (h.yards ?? 0), 0);

  const cellStyle: React.CSSProperties = {
    padding: '4px 2px', textAlign: 'center', fontSize: 12,
  };
  const inputStyle: React.CSSProperties = {
    width: 38, textAlign: 'center', border: '1px solid var(--line)', borderRadius: 3,
    background: 'var(--chip)', color: 'var(--ink)', fontSize: 11, padding: '2px',
  };

  return (
    <div style={{ marginTop: 16, borderTop: '1.5px dashed var(--line)', paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Scorecard</span>
        {tees.length > 1 && tees.map(t => (
          <button
            key={t.id}
            onClick={() => { setSelectedTeeId(t.id); setEditing(false); }}
            style={{
              padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
              border: '1.5px solid var(--line)',
              background: selectedTeeId === t.id ? 'var(--green-dark)' : 'var(--chip)',
              color: selectedTeeId === t.id ? 'white' : 'var(--ink)',
            }}
          >
            {t.tee_name}
          </button>
        ))}
        {!editing && (
          <button
            onClick={startEditing}
            style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1.5px solid var(--line)', background: 'var(--chip)', cursor: 'pointer', color: 'var(--ink)' }}
          >
            {hasData ? '✏ Edit' : '+ Add Holes'}
          </button>
        )}
      </div>

      {editing ? (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ ...cellStyle, textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}></th>
                  {editRows.map(h => <th key={h.hole_number} style={{ ...cellStyle, color: 'var(--muted)', minWidth: 40 }}>{h.hole_number}</th>)}
                  <th style={{ ...cellStyle, color: 'var(--muted)' }}>Tot</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...cellStyle, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>Par</td>
                  {editRows.map((h, i) => (
                    <td key={h.hole_number} style={cellStyle}>
                      <select value={h.par} onChange={e => { const n = [...editRows]; n[i] = { ...n[i], par: Number(e.target.value) }; setEditRows(n); }} style={inputStyle}>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </td>
                  ))}
                  <td style={{ ...cellStyle, fontWeight: 800, color: 'var(--green)' }}>{editPar}</td>
                </tr>
                <tr>
                  <td style={{ ...cellStyle, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>Yds</td>
                  {editRows.map((h, i) => (
                    <td key={h.hole_number} style={cellStyle}>
                      <input type="number" value={h.yards ?? ''} placeholder="—" onChange={e => { const n = [...editRows]; n[i] = { ...n[i], yards: e.target.value ? Number(e.target.value) : null }; setEditRows(n); }} style={inputStyle} />
                    </td>
                  ))}
                  <td style={{ ...cellStyle, fontWeight: 700 }}>{editYds || '—'}</td>
                </tr>
                <tr>
                  <td style={{ ...cellStyle, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>HCP</td>
                  {editRows.map((h, i) => (
                    <td key={h.hole_number} style={cellStyle}>
                      <input type="number" value={h.handicap ?? ''} placeholder="—" min={1} max={9} onChange={e => { const n = [...editRows]; n[i] = { ...n[i], handicap: e.target.value ? Number(e.target.value) : null }; setEditRows(n); }} style={inputStyle} />
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn" style={{ flex: 1, padding: '8px' }} onClick={saveHoles} disabled={saving}>
              {saving ? 'Saving…' : '✓ Save'}
            </button>
            <button className="btn ghost" style={{ flex: 1, padding: '8px' }} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </>
      ) : hasData ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ ...cellStyle, textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}></th>
                {displayRows.map(h => <th key={h.hole_number} style={{ ...cellStyle, color: 'var(--muted)', minWidth: 28 }}>{h.hole_number}</th>)}
                <th style={{ ...cellStyle, color: 'var(--muted)' }}>Tot</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...cellStyle, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>Par</td>
                {displayRows.map(h => <td key={h.hole_number} style={{ ...cellStyle, fontWeight: 700 }}>{h.par}</td>)}
                <td style={{ ...cellStyle, fontWeight: 800, color: 'var(--green)' }}>{totalPar}</td>
              </tr>
              {displayRows.some(h => h.yards) && (
                <tr>
                  <td style={{ ...cellStyle, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>Yds</td>
                  {displayRows.map(h => <td key={h.hole_number} style={{ ...cellStyle, color: 'var(--muted)' }}>{h.yards ?? '—'}</td>)}
                  <td style={{ ...cellStyle, color: 'var(--muted)' }}>{displayRows.reduce((a, h) => a + (h.yards ?? 0), 0)}</td>
                </tr>
              )}
              {displayRows.some(h => h.handicap) && (
                <tr>
                  <td style={{ ...cellStyle, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>HCP</td>
                  {displayRows.map(h => <td key={h.hole_number} style={{ ...cellStyle, color: 'var(--muted)' }}>{h.handicap ?? '—'}</td>)}
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : loaded.has(selectedTeeId!) ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
          No hole data yet — click &quot;+ Add Holes&quot; to enter the scorecard.
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</div>
      )}
    </div>
  );
}
