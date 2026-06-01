'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity } from './icons';

interface HolePar { hole_number: number; par: number; yards?: number | null }

interface LiveRound {
  id: number;
  player_name: string;
  course_name: string;
  tee_name: string;
  slope_rating: number;
  handicap_index: number | null;
  scores: number[];
  start_hole: number;
  hole_pars: HolePar[];
  updated_at: string;
}

function courseHcp(hi: number | null, slope: number): number {
  if (hi == null) return 0;
  return Math.round((hi * slope) / 113 / 2);
}

function vsParStr(n: number): string {
  if (n === 0) return 'E';
  return n > 0 ? `+${n}` : `${n}`;
}

function ScoreBubble({ score, par }: { score: number; par?: number }) {
  const diff = par != null ? score - par : null;
  const bg = diff == null ? 'var(--chip)'
    : diff <= -2 ? '#1d4ed8'
    : diff === -1 ? '#15803d'
    : diff === 0  ? 'transparent'
    : diff === 1  ? '#92400e'
    : '#991b1b';
  const color = diff == null || diff === 0 ? 'var(--ink)' : 'white';
  const radius = diff == null || diff <= 0 ? '50%' : '3px';
  return (
    <div style={{
      width: 22, height: 22, borderRadius: radius,
      background: bg, color, fontWeight: 700, fontSize: 11,
      display: 'grid', placeItems: 'center', margin: '0 auto',
    }}>{score}</div>
  );
}

const COLORS = ['#15803d','#1d4ed8','#b45309','#7c3aed','#dc2626','#0891b2'];

export default function LiveScoreboard() {
  const [rounds, setRounds]     = useState<LiveRound[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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

  function toggle(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="card live-scoreboard-card" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 7 }}><Activity size={16} /> Rounds in Progress</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="tag green">
            <span className="pulse-dot" style={{ background: 'white' }} />
            {rounds.length} live
          </span>
          <Link href="/live">
            <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }}>+ Join</button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rounds.map((r, i) => {
          const scores   = r.scores as number[];
          const gross    = scores.reduce((a, b) => a + b, 0);
          const hcp      = courseHcp(r.handicap_index, r.slope_rating);
          const net      = gross - hcp;
          const holes    = r.hole_pars as HolePar[];
          const parSoFar = holes.slice(0, scores.length).reduce((a, h) => a + h.par, 0);
          const vsPar    = scores.length > 0 && parSoFar > 0 ? gross - parSoFar : null;
          const isExpanded = expanded.has(r.id);
          const startHole = r.start_hole ?? 1;

          return (
            <div key={r.id} style={{ border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {/* Summary row */}
              <div
                onClick={() => scores.length > 0 && toggle(r.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: 'var(--ice-2)',
                  cursor: scores.length > 0 ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: COLORS[i % COLORS.length], color: 'white',
                  display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
                }}>
                  {r.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.player_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {r.course_name} · {r.tee_name} · {scores.length}/9
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {scores.length > 0 ? (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1 }}>
                        {vsPar !== null
                          ? <span style={{ color: vsPar <= 0 ? 'var(--green)' : 'var(--ink)' }}>{vsParStr(vsPar)}</span>
                          : gross}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                        {vsPar !== null ? `net ${net}` : `net ${net} · gross ${gross}`}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Starting…</div>
                  )}
                </div>
                {scores.length > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                )}
                <span className="pulse-dot" style={{ width: 8, height: 8, background: 'var(--green)', display: 'inline-block', borderRadius: '50%', animation: 'gpulse 1.4s infinite', flexShrink: 0 }} />
              </div>

              {/* Expanded scorecard */}
              {isExpanded && scores.length > 0 && (
                <div style={{ overflowX: 'auto', background: 'var(--chip)', borderTop: '1px solid var(--line)' }}>
                  <table style={{ borderCollapse: 'collapse', minWidth: 400, width: '100%', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: 'var(--green-dark)', color: 'white' }}>
                        <th style={{ padding: '5px 8px', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--green-dark)' }}>Hole</th>
                        {Array.from({ length: 9 }, (_, k) => startHole + k).map(h => (
                          <th key={h} style={{ padding: '5px 6px', textAlign: 'center', minWidth: 28 }}>{h}</th>
                        ))}
                        <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holes.length > 0 && (
                        <tr style={{ background: 'var(--ice-2)' }}>
                          <td style={{ padding: '4px 8px', fontWeight: 600, position: 'sticky', left: 0, background: 'var(--ice-2)', color: 'var(--muted)' }}>Par</td>
                          {holes.map(h => (
                            <td key={h.hole_number} style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>{h.par}</td>
                          ))}
                          <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 800 }}>
                            {holes.reduce((a, h) => a + h.par, 0)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ padding: '4px 8px', fontWeight: 700, position: 'sticky', left: 0, background: 'var(--chip)', whiteSpace: 'nowrap' }}>
                          {r.player_name.split(' ')[0]}
                        </td>
                        {Array.from({ length: 9 }, (_, k) => {
                          const s   = scores[k];
                          const par = holes[k]?.par;
                          return (
                            <td key={k} style={{ padding: '3px 4px', textAlign: 'center' }}>
                              {s !== undefined ? <ScoreBubble score={s} par={par} /> : ''}
                            </td>
                          );
                        })}
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 800 }}>{gross}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', gap: 16, padding: '6px 12px', fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--line)' }}>
                    <span>HCP: <strong style={{ color: 'var(--ink)' }}>-{hcp}</strong></span>
                    <span>Net: <strong style={{ color: 'var(--green)' }}>{net}</strong></span>
                    {vsPar !== null && (
                      <span>vs Par: <strong style={{ color: vsPar <= 0 ? 'var(--green)' : 'var(--ink)' }}>{vsParStr(vsPar)}</strong></span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
