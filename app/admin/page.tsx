'use client';

import { useState, useEffect } from 'react';
import { netScore } from '@/lib/golf-scoring';

interface Round {
  id: number;
  gross_score: number;
  played_at: string;
  golf_players?: { name: string; handicap_index: number };
  golf_courses?: { name: string; city: string; state: string };
  golf_tees?: { tee_name: string; slope_rating: number; course_rating: number };
  golf_leagues?: { name: string; start_date: string };
}

export default function AdminPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/rounds')
      .then(r => r.json())
      .then(data => { setRounds(data); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    setDeleting(id);
    await fetch(`/api/admin/rounds?id=${id}`, { method: 'DELETE' });
    setRounds(prev => prev.filter(r => r.id !== id));
    setConfirmId(null);
    setDeleting(null);
  }

  const q = search.toLowerCase();
  const filtered = rounds.filter(r =>
    q === '' ||
    r.golf_players?.name.toLowerCase().includes(q) ||
    r.golf_courses?.name.toLowerCase().includes(q) ||
    r.golf_leagues?.name.toLowerCase().includes(q)
  );

  // Group by week
  const grouped: Record<string, Round[]> = {};
  for (const r of filtered) {
    const week = r.golf_leagues?.name ?? 'Unknown Week';
    if (!grouped[week]) grouped[week] = [];
    grouped[week].push(r);
  }

  return (
    <div>
      <div className="section-header">
        <h2>Admin — All Rounds</h2>
        <span className="tag gray">{rounds.length} total</span>
      </div>

      <input
        type="search"
        placeholder="Filter by player, course, or week…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', marginBottom: 20,
          border: '1.5px solid var(--line)', borderRadius: 'var(--radius)',
          background: 'var(--ice-2)', color: 'var(--ink)', fontSize: 14, outline: 'none',
        }}
      />

      {loading && <div className="empty-state">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">No rounds found.</div>
      )}

      {Object.entries(grouped).map(([week, weekRounds]) => (
        <div key={week} style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 15, marginBottom: 10, color: 'var(--green-dark)' }}>
            {week}
            <span style={{ marginLeft: 10, fontWeight: 400, fontSize: 13, color: 'var(--muted)' }}>
              {weekRounds.length} round{weekRounds.length !== 1 ? 's' : ''}
            </span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weekRounds.map(r => {
              const hcp = r.golf_players?.handicap_index ?? 0;
              const slope = r.golf_tees?.slope_rating ?? 113;
              const net = netScore(r.gross_score, hcp, slope);
              const isConfirming = confirmId === r.id;

              return (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'var(--ice-2)',
                  border: '1.5px solid var(--line)', borderRadius: 'var(--radius)',
                  gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.golf_players?.name ?? '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {r.golf_courses?.name} · {r.golf_tees?.tee_name} tees · {r.played_at}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
                    <span>Gross <strong>{r.gross_score}</strong></span>
                    <span>Net <strong style={{ color: 'var(--green)' }}>{net}</strong></span>
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>HCP {hcp.toFixed(1)}</span>
                  </div>
                  <div>
                    {isConfirming ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn"
                          style={{ background: 'var(--red, #dc2626)', fontSize: 12, padding: '6px 12px' }}
                          onClick={() => handleDelete(r.id)}
                          disabled={deleting === r.id}
                        >
                          {deleting === r.id ? 'Deleting…' : 'Confirm delete'}
                        </button>
                        <button
                          className="btn ghost"
                          style={{ fontSize: 12, padding: '6px 12px' }}
                          onClick={() => setConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn ghost"
                        style={{ fontSize: 12, padding: '6px 12px', color: 'var(--red, #dc2626)' }}
                        onClick={() => setConfirmId(r.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
