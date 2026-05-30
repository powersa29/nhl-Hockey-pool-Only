'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LiveRound {
  id: number;
  player_name: string;
  course_name: string;
  tee_name: string;
  slope_rating: number;
  handicap_index: number | null;
  scores: number[];
  updated_at: string;
}

function courseHcp(hi: number | null, slope: number): number {
  if (hi == null) return 0;
  return Math.round((hi * slope) / 113 / 2);
}

const COLORS = ['#15803d','#1d4ed8','#b45309','#7c3aed','#dc2626','#0891b2'];

export default function LiveScoreboard() {
  const [rounds, setRounds] = useState<LiveRound[]>([]);

  async function poll() {
    const data = await fetch('/api/live-scoring').then(r => r.json()).catch(() => []);
    setRounds(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    poll();
    const t = setInterval(poll, 10_000);
    return () => clearInterval(t);
  }, []);

  if (rounds.length === 0) return null;

  return (
    <div className="card live-scoreboard-card" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 16 }}>🏌️ Rounds in Progress</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="tag green">
            <span className="pulse-dot" style={{ background: 'white' }} />
            {rounds.length} live
          </span>
          <Link href="/scorecard">
            <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>+ Join</button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rounds.map((r, i) => {
          const scores = r.scores as number[];
          const gross = scores.reduce((a, b) => a + b, 0);
          const hcp = courseHcp(r.handicap_index, r.slope_rating);
          const net = gross - hcp;
          const holesPlayed = scores.length;

          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', background: 'var(--ice-2)',
              border: '1.5px solid var(--line)', borderRadius: 'var(--radius)',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: COLORS[i % COLORS.length],
                color: 'white', display: 'grid', placeItems: 'center',
                fontSize: 12, fontWeight: 700,
              }}>
                {r.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.player_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {r.course_name} · {r.tee_name} · {holesPlayed}/9 holes
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {holesPlayed > 0 ? (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{net}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>net ({gross} gross)</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Starting…</div>
                )}
              </div>
              <span className="pulse-dot" style={{ width: 8, height: 8, background: 'var(--green)', display: 'inline-block', borderRadius: '50%', animation: 'gpulse 1.4s infinite', flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
