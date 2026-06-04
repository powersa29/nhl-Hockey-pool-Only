'use client';

import { useState, useEffect } from 'react';
import { netScore } from '@/lib/golf-scoring';

const ADMIN_TOKEN = 'GlizzyAdmin2026';

interface Round {
  id: number;
  gross_score: number;
  played_at: string;
  golf_players?: { name: string; handicap_index: number };
  golf_courses?: { name: string; city: string; state: string };
  golf_tees?: { tee_name: string; slope_rating: number; course_rating: number };
  golf_leagues?: { name: string; start_date: string };
}

function adminFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: { ...(options.headers ?? {}), 'x-admin-token': ADMIN_TOKEN },
  });
}

function LoginGate({ onAuth }: { onAuth: () => void }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (user.trim() === 'admin' && pass === 'Glizzy') {
      sessionStorage.setItem('golf-admin', '1');
      onAuth();
    } else {
      setError('Incorrect username or password.');
      setPass('');
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <div className="form-card" style={{ maxWidth: 360, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Admin Login</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Glizzy Golf League · Admin Area
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <label>Username</label>
            <input
              className="input"
              type="text"
              autoComplete="username"
              value={user}
              onChange={e => { setUser(e.target.value); setError(''); }}
              placeholder="admin"
              style={{ marginTop: 6 }}
            />
          </div>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <label>Password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={e => { setPass(e.target.value); setError(''); }}
              placeholder="••••••"
              style={{ marginTop: 6 }}
            />
          </div>

          {error && (
            <div className="error-banner" style={{ marginTop: 0 }}>⚠️ {error}</div>
          )}

          <button type="submit" className="btn" style={{ marginTop: 6 }}>
            Sign In →
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    // Verify session token is still valid against the server before granting access
    if (sessionStorage.getItem('golf-admin') === '1') {
      adminFetch('/api/admin/rounds')
        .then(r => {
          if (r.ok) {
            setAuthed(true);
            return r.json();
          }
          sessionStorage.removeItem('golf-admin');
          return null;
        })
        .then(data => {
          if (data) { setRounds(data); setLoading(false); }
          setChecked(true);
        })
        .catch(() => { sessionStorage.removeItem('golf-admin'); setChecked(true); });
    } else {
      setChecked(true);
    }
  }, []);

  function handleAuth() {
    setAuthed(true);
    setLoading(true);
    adminFetch('/api/admin/rounds')
      .then(r => r.json())
      .then(data => { setRounds(data); setLoading(false); });
  }

  function logout() {
    sessionStorage.removeItem('golf-admin');
    setAuthed(false);
    setRounds([]);
    setLoading(true);
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    const res = await adminFetch(`/api/admin/rounds?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRounds(prev => prev.filter(r => r.id !== id));
    }
    setConfirmId(null);
    setDeleting(null);
  }

  if (!checked) return null;
  if (!authed) return <LoginGate onAuth={handleAuth} />;

  const q = search.toLowerCase();
  const filtered = rounds.filter(r =>
    q === '' ||
    r.golf_players?.name.toLowerCase().includes(q) ||
    r.golf_courses?.name.toLowerCase().includes(q) ||
    r.golf_leagues?.name.toLowerCase().includes(q)
  );

  const grouped: Record<string, Round[]> = {};
  for (const r of filtered) {
    const week = r.golf_leagues?.name ?? 'Unknown Week';
    if (!grouped[week]) grouped[week] = [];
    grouped[week].push(r);
  }

  return (
    <div>
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2>Admin — All Rounds</h2>
          <span className="tag gray">{rounds.length} total</span>
        </div>
        <button className="btn ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={logout}>
          Sign Out
        </button>
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
          boxSizing: 'border-box',
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
                          className="btn danger"
                          style={{ fontSize: 12, padding: '6px 12px' }}
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
                        style={{ fontSize: 12, padding: '6px 12px', color: 'var(--red, #dc2626)', borderColor: 'var(--red, #dc2626)' }}
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
