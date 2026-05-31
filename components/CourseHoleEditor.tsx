'use client';

import { useState, useEffect } from 'react';
import type { Tee } from '@/lib/golf-db';

interface HoleRow {
  hole_number: number;
  par: number;
  yards: number | null;
  handicap: number | null;
}

type Nine = 'front' | 'back';

// ── GolfCourseAPI shapes (field names vary by course) ────────────────────────
interface ApiHole {
  par?: number;
  yardage?: number; yards?: number; distance?: number;
  handicap?: number; stroke_index?: number; hdcp?: number;
}
interface ApiTee {
  tee_name?: string; name?: string;
  holes?: ApiHole[];
}
interface ApiCourse {
  id: string;
  club_name?: string; course_name?: string;
  city?: string; state?: string;
}

function mapHole(h: ApiHole, i: number): HoleRow {
  return {
    hole_number: i + 1,
    par:      h.par ?? 4,
    yards:    h.yardage ?? h.yards ?? h.distance ?? null,
    handicap: h.handicap ?? h.stroke_index ?? h.hdcp ?? null,
  };
}

function emptyNine(startHole: number): HoleRow[] {
  return Array.from({ length: 9 }, (_, i) => ({
    hole_number: startHole + i, par: 4, yards: null, handicap: null,
  }));
}

function fillHoles(existing: HoleRow[], startHole: number): HoleRow[] {
  return emptyNine(startHole).map(h => {
    const found = existing.find(e => e.hole_number === h.hole_number);
    return found ? { ...h, ...found } : h;
  });
}

type FetchStep = 'idle' | 'searching' | 'selecting' | 'previewing' | 'importing' | 'done' | 'error';

export default function CourseHoleEditor({
  tees, courseName = '',
}: {
  tees: Tee[];
  courseName?: string;
}) {
  const [selectedTeeId, setSelectedTeeId] = useState<number | null>(tees[0]?.id ?? null);
  const [nine, setNine]                   = useState<Nine>('front');
  const [holeData, setHoleData]           = useState<Record<string, HoleRow[]>>({});
  const [editing, setEditing]             = useState(false);
  const [editRows, setEditRows]           = useState<HoleRow[]>(emptyNine(1));
  const [saving, setSaving]               = useState(false);
  const [loaded, setLoaded]               = useState<Set<number>>(new Set());

  // ── Auto-fill state ────────────────────────────────────────────────────────
  const [fetchStep, setFetchStep]         = useState<FetchStep>('idle');
  const [fetchError, setFetchError]       = useState('');
  const [searchResults, setSearchResults] = useState<ApiCourse[]>([]);
  const [apiDetail, setApiDetail]         = useState<{ male: ApiTee[]; female: ApiTee[] } | null>(null);
  const [matchCount, setMatchCount]       = useState(0);

  useEffect(() => {
    if (!selectedTeeId || loaded.has(selectedTeeId)) return;
    fetch(`/api/holes?teeId=${selectedTeeId}`)
      .then(r => r.json())
      .then((data: HoleRow[]) => {
        const allRows = Array.isArray(data) ? data : [];
        setHoleData(prev => ({ ...prev, [String(selectedTeeId)]: allRows }));
        setLoaded(prev => new Set(prev).add(selectedTeeId));
      });
  }, [selectedTeeId, loaded]);

  const key      = String(selectedTeeId);
  const allRows  = holeData[key] ?? [];
  const front    = allRows.filter(h => h.hole_number <= 9).sort((a, b) => a.hole_number - b.hole_number);
  const back     = allRows.filter(h => h.hole_number >= 10).sort((a, b) => a.hole_number - b.hole_number);
  const display  = nine === 'front' ? front : back;
  const startH   = nine === 'front' ? 1 : 10;
  const hasData  = display.length > 0;
  const totalPar = display.reduce((a, h) => a + h.par, 0);

  function startEditing() {
    setEditRows(fillHoles(display, startH));
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
    const allExcept = allRows.filter(h =>
      nine === 'front' ? h.hole_number > 9 : h.hole_number < 10
    );
    setHoleData(prev => ({ ...prev, [key]: [...allExcept, ...editRows] }));
    setEditing(false);
    setSaving(false);
  }

  // ── Auto-fill from GolfCourseAPI ──────────────────────────────────────────
  async function startFetch() {
    setFetchStep('searching');
    setFetchError('');
    const query = courseName || 'golf course';
    const res   = await fetch(`/api/courses/scorecard?search=${encodeURIComponent(query)}`).catch(() => null);
    if (!res?.ok) {
      setFetchError(res ? `API error ${res.status}` : 'Network error — is GOLF_COURSE_API_KEY set?');
      setFetchStep('error');
      return;
    }
    const data = await res.json();
    if (data.error) { setFetchError(data.error); setFetchStep('error'); return; }
    const courses: ApiCourse[] = data.courses ?? [];
    if (courses.length === 0) {
      setFetchError('No courses found — add holes manually or check the course name.');
      setFetchStep('error');
      return;
    }
    if (courses.length === 1) {
      await loadDetail(courses[0].id);
    } else {
      setSearchResults(courses);
      setFetchStep('selecting');
    }
  }

  async function loadDetail(apiId: string) {
    setFetchStep('previewing');
    const res = await fetch(`/api/courses/scorecard?courseApiId=${encodeURIComponent(apiId)}`).catch(() => null);
    if (!res?.ok) { setFetchError('Failed to load course detail'); setFetchStep('error'); return; }
    const data = await res.json();
    const detail = {
      male:   (data.tees?.male   ?? []) as ApiTee[],
      female: (data.tees?.female ?? []) as ApiTee[],
    };
    setApiDetail(detail);
    const allApiTees = [...detail.male, ...detail.female];
    const matched = tees.filter(lt =>
      allApiTees.some(at =>
        (at.tee_name ?? at.name ?? '').toLowerCase() === lt.tee_name.toLowerCase()
      )
    );
    setMatchCount(matched.length);
  }

  async function importHoles() {
    if (!apiDetail) return;
    setFetchStep('importing');
    const allApiTees = [...apiDetail.male, ...apiDetail.female];
    for (const localTee of tees) {
      const apiTee = allApiTees.find(at =>
        (at.tee_name ?? at.name ?? '').toLowerCase() === localTee.tee_name.toLowerCase()
      );
      if (!apiTee?.holes?.length) continue;
      const holes = apiTee.holes.map(mapHole);
      await fetch('/api/holes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teeId: localTee.id, holes }),
      });
      setHoleData(prev => ({ ...prev, [String(localTee.id)]: holes }));
      setLoaded(prev => new Set(prev).add(localTee.id));
    }
    setFetchStep('done');
    setTimeout(() => setFetchStep('idle'), 2500);
  }

  function cancelFetch() {
    setFetchStep('idle');
    setSearchResults([]);
    setApiDetail(null);
    setFetchError('');
  }

  const cellSt: React.CSSProperties = { padding: '4px 2px', textAlign: 'center', fontSize: 12 };
  const inputSt: React.CSSProperties = {
    width: 38, textAlign: 'center', border: '1px solid var(--line)',
    borderRadius: 3, background: 'var(--chip)', color: 'var(--ink)', fontSize: 11, padding: '2px',
  };

  return (
    <div style={{ marginTop: 16, borderTop: '1.5px dashed var(--line)', paddingTop: 14 }}>

      {/* ── Auto-fill banner ────────────────────────────────────────────── */}
      {fetchStep === 'idle' && (
        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={startFetch}
            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 4, border: '1.5px solid var(--line)', background: 'var(--chip)', cursor: 'pointer', color: 'var(--ink)' }}
          >
            🔍 Auto-fill from Golf Database
          </button>
        </div>
      )}

      {fetchStep === 'searching' && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
          Searching for &quot;{courseName}&quot;…
        </div>
      )}

      {fetchStep === 'selecting' && (
        <div style={{ marginBottom: 10, background: 'var(--ice-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Multiple matches — pick the right one:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {searchResults.slice(0, 8).map(c => (
              <button key={c.id} onClick={() => loadDetail(c.id)}
                style={{ textAlign: 'left', fontSize: 12, padding: '5px 8px', borderRadius: 4, border: '1.5px solid var(--line)', background: 'var(--chip)', cursor: 'pointer', color: 'var(--ink)' }}>
                {c.club_name || c.course_name}{c.city && c.state ? ` — ${c.city}, ${c.state}` : ''}
              </button>
            ))}
          </div>
          <button onClick={cancelFetch} style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Cancel</button>
        </div>
      )}

      {fetchStep === 'previewing' && apiDetail && (
        <div style={{ marginBottom: 10, background: 'var(--ice-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            {matchCount > 0
              ? <>✅ <strong>{matchCount}</strong> of {tees.length} tee boxes matched — holes 1–18 will be imported.</>
              : <>⚠️ No tee names matched. API tees: {[...apiDetail.male, ...apiDetail.female].map(t => t.tee_name ?? t.name).join(', ')}.</>
            }
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {matchCount > 0 && (
              <button onClick={importHoles} className="btn" style={{ fontSize: 12, padding: '5px 12px' }}>✓ Import Holes</button>
            )}
            <button onClick={cancelFetch} className="btn ghost" style={{ fontSize: 12, padding: '5px 12px' }}>Cancel</button>
          </div>
        </div>
      )}

      {fetchStep === 'importing' && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Importing holes…</div>
      )}

      {fetchStep === 'done' && (
        <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginBottom: 10 }}>✓ Holes imported!</div>
      )}

      {fetchStep === 'error' && (
        <div style={{ fontSize: 12, color: '#991b1b', marginBottom: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 4, padding: '6px 10px' }}>
          {fetchError}
          <button onClick={cancelFetch} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#991b1b' }}>✕</button>
        </div>
      )}

      {/* ── Scorecard tabs ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Scorecard</span>

        {tees.length > 1 && tees.map(t => (
          <button key={t.id} onClick={() => { setSelectedTeeId(t.id); setEditing(false); }} style={{
            padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
            border: '1.5px solid var(--line)',
            background: selectedTeeId === t.id ? 'var(--green-dark)' : 'var(--chip)',
            color: selectedTeeId === t.id ? 'white' : 'var(--ink)',
          }}>{t.tee_name}</button>
        ))}

        {(['front', 'back'] as Nine[]).map(n => (
          <button key={n} onClick={() => { setNine(n); setEditing(false); }} style={{
            padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
            border: '1.5px solid var(--line)',
            background: nine === n ? 'var(--chip)' : 'transparent',
            color: 'var(--ink)', fontWeight: nine === n ? 700 : 400,
          }}>
            {n === 'front' ? 'Front 9' : 'Back 9'}
          </button>
        ))}

        {!editing && (
          <button onClick={startEditing} style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1.5px solid var(--line)', background: 'var(--chip)', cursor: 'pointer', color: 'var(--ink)' }}>
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
                  <th style={{ ...cellSt, textAlign: 'left', color: 'var(--muted)', fontWeight: 600, paddingRight: 8 }} />
                  {editRows.map(h => <th key={h.hole_number} style={{ ...cellSt, color: 'var(--muted)', minWidth: 40 }}>{h.hole_number}</th>)}
                  <th style={{ ...cellSt, color: 'var(--muted)' }}>Tot</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...cellSt, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>Par</td>
                  {editRows.map((h, i) => (
                    <td key={h.hole_number} style={cellSt}>
                      <select value={h.par} onChange={e => { const n = [...editRows]; n[i] = { ...n[i], par: Number(e.target.value) }; setEditRows(n); }} style={inputSt}>
                        <option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
                      </select>
                    </td>
                  ))}
                  <td style={{ ...cellSt, fontWeight: 800, color: 'var(--green)' }}>
                    {editRows.reduce((a, h) => a + h.par, 0)}
                  </td>
                </tr>
                <tr>
                  <td style={{ ...cellSt, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>Yds</td>
                  {editRows.map((h, i) => (
                    <td key={h.hole_number} style={cellSt}>
                      <input type="number" value={h.yards ?? ''} placeholder="—" onChange={e => { const n = [...editRows]; n[i] = { ...n[i], yards: e.target.value ? Number(e.target.value) : null }; setEditRows(n); }} style={inputSt} />
                    </td>
                  ))}
                  <td style={{ ...cellSt, fontWeight: 700 }}>
                    {editRows.reduce((a, h) => a + (h.yards ?? 0), 0) || '—'}
                  </td>
                </tr>
                <tr>
                  <td style={{ ...cellSt, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>HCP</td>
                  {editRows.map((h, i) => (
                    <td key={h.hole_number} style={cellSt}>
                      <input type="number" value={h.handicap ?? ''} placeholder="—" min={1} max={18} onChange={e => { const n = [...editRows]; n[i] = { ...n[i], handicap: e.target.value ? Number(e.target.value) : null }; setEditRows(n); }} style={inputSt} />
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
                <th style={{ ...cellSt, textAlign: 'left', color: 'var(--muted)', fontWeight: 600, paddingRight: 8 }} />
                {display.map(h => <th key={h.hole_number} style={{ ...cellSt, color: 'var(--muted)', minWidth: 28 }}>{h.hole_number}</th>)}
                <th style={{ ...cellSt, color: 'var(--muted)' }}>Tot</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...cellSt, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>Par</td>
                {display.map(h => <td key={h.hole_number} style={{ ...cellSt, fontWeight: 700 }}>{h.par}</td>)}
                <td style={{ ...cellSt, fontWeight: 800, color: 'var(--green)' }}>{totalPar}</td>
              </tr>
              {display.some(h => h.yards) && (
                <tr>
                  <td style={{ ...cellSt, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>Yds</td>
                  {display.map(h => <td key={h.hole_number} style={{ ...cellSt, color: 'var(--muted)' }}>{h.yards ?? '—'}</td>)}
                  <td style={{ ...cellSt, color: 'var(--muted)' }}>{display.reduce((a, h) => a + (h.yards ?? 0), 0)}</td>
                </tr>
              )}
              {display.some(h => h.handicap) && (
                <tr>
                  <td style={{ ...cellSt, textAlign: 'left', fontWeight: 600, paddingRight: 8 }}>HCP</td>
                  {display.map(h => <td key={h.hole_number} style={{ ...cellSt, color: 'var(--muted)' }}>{h.handicap ?? '—'}</td>)}
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : loaded.has(selectedTeeId!) ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
          No {nine === 'front' ? 'Front 9' : 'Back 9'} data yet — click &quot;Auto-fill&quot; above or &quot;+ Add Holes&quot; to enter manually.
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</div>
      )}
    </div>
  );
}
