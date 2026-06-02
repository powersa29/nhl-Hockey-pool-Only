'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, GolfPin } from '@/components/icons';

interface LiveRound {
  id: number;
  player_name: string;
  course_name: string;
  scores: number[];
  hole_pars: { par: number }[];
  slope_rating: number;
  handicap_index: number | null;
}

const COLORS = ['#15803d','#1d4ed8','#b45309','#7c3aed','#dc2626','#0891b2'];

function vsParStr(n: number) { return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`; }

function ScoreBubble({ score, par }: { score: number; par?: number }) {
  const diff = par != null ? score - par : null;
  const bg = diff == null ? 'var(--chip)'
    : diff <= -2 ? '#1d4ed8' : diff === -1 ? '#15803d'
    : diff === 0 ? 'transparent' : diff === 1 ? '#92400e' : '#991b1b';
  const color = diff == null || diff === 0 ? 'var(--ink)' : 'white';
  return (
    <div style={{
      width: 22, height: 22, borderRadius: diff != null && diff <= 0 ? '50%' : 3,
      background: bg, color, fontWeight: 700, fontSize: 11,
      display: 'grid', placeItems: 'center', margin: '0 auto',
    }}>{score}</div>
  );
}

export default function DiscPage() {
  const [rounds, setRounds] = useState<LiveRound[]>([]);

  useEffect(() => {
    const poll = () =>
      fetch('/api/live-scoring').then(r => r.json()).then(d => setRounds(Array.isArray(d) ? d : [])).catch(() => {});
    poll();
    const t = setInterval(poll, 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <section className="hero">
        <span className="hero-tag"><span className="pulse-dot" /> Disc Golf</span>
        <h1 style={{ marginTop: 14 }}>
          Live Disc<br /><span className="accent">Golf Tracking</span>
        </h1>
        <p className="hero-sub">
          Track your round hole by hole. Scores update live so your crew can follow along.
        </p>
        <div style={{ marginTop: 20 }}>
          <Link href="/disc/live">
            <button className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, width: '100%' }}>
              <GolfPin size={16} color="white" /> Start a Round
            </button>
          </Link>
        </div>
      </section>

      {rounds.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Activity size={16} /> Rounds in Progress
            </h2>
            <span className="tag green" style={{ cursor: 'default' }}>
              <span className="pulse-dot" style={{ background: 'white' }} />
              {rounds.length} live
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rounds.map((r, i) => {
              const scores = r.scores as number[];
              const gross = scores.reduce((a, b) => a + b, 0);
              const holes = r.hole_pars as { par: number }[];
              const parSoFar = holes.slice(0, scores.length).reduce((a, h) => a + h.par, 0);
              const vsPar = scores.length > 0 && parSoFar > 0 ? gross - parSoFar : null;
              const totalPar = holes.reduce((a, h) => a + h.par, 0);

              return (
                <div key={r.id} style={{ border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--ice-2)', borderBottom: scores.length > 0 ? '1px solid var(--line)' : undefined }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: COLORS[i % COLORS.length], color: 'white', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>
                      {r.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{r.player_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.course_name} · {scores.length}/{holes.length || 18}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {scores.length > 0 ? (
                        <>
                          <div style={{ fontWeight: 800, fontSize: 18, color: vsPar !== null && vsPar <= 0 ? 'var(--green)' : 'var(--ink)' }}>
                            {vsPar !== null ? vsParStr(vsPar) : gross}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>{scores.length}/{holes.length || 18} · {gross} strokes</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Starting…</div>
                      )}
                    </div>
                    <span className="pulse-dot" style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: '50%', animation: 'gpulse 1.4s infinite', flexShrink: 0 }} />
                  </div>

                  {holes.length > 0 && scores.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', minWidth: 360, width: '100%', fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: 'var(--green-dark)', color: 'white' }}>
                            <th style={{ padding: '4px 8px', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--green-dark)', minWidth: 52 }}>Hole</th>
                            {holes.map((_, k) => <th key={k} style={{ padding: '4px 5px', textAlign: 'center', minWidth: 26 }}>{k + 1}</th>)}
                            <th style={{ padding: '4px 6px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)', minWidth: 32 }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ background: 'var(--ice-2)' }}>
                            <td style={{ padding: '3px 8px', fontWeight: 600, position: 'sticky', left: 0, background: 'var(--ice-2)', color: 'var(--muted)' }}>Par</td>
                            {holes.map((h, k) => <td key={k} style={{ padding: '3px 5px', textAlign: 'center', fontWeight: 700 }}>{h.par}</td>)}
                            <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 800, borderLeft: '1px solid var(--line)' }}>{totalPar}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '3px 8px', fontWeight: 700, position: 'sticky', left: 0, background: 'var(--bg)', whiteSpace: 'nowrap' }}>
                              {r.player_name.split(' ')[0]}
                            </td>
                            {holes.map((h, k) => {
                              const s = scores[k];
                              const isNext = k === scores.length;
                              return (
                                <td key={k} style={{ padding: '2px 3px', textAlign: 'center', background: isNext ? 'rgba(21,128,61,0.08)' : undefined }}>
                                  {s !== undefined
                                    ? <ScoreBubble score={s} par={h.par} />
                                    : isNext ? <div style={{ width: 22, height: 22, margin: '0 auto', border: '1.5px dashed var(--green)', borderRadius: '50%', opacity: 0.5 }} /> : null}
                                </td>
                              );
                            })}
                            <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 800, borderLeft: '1px solid var(--line)' }}>{gross}</td>
                          </tr>
                        </tbody>
                      </table>
                      {vsPar !== null && (
                        <div style={{ padding: '5px 12px', fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--line)' }}>
                          vs Par <strong style={{ color: vsPar <= 0 ? 'var(--green)' : 'var(--ink)' }}>{vsParStr(vsPar)}</strong>
                          {totalPar > 0 && <span style={{ marginLeft: 12 }}>Course par <strong>{totalPar}</strong></span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rounds.length === 0 && (
        <div className="card">
          <div className="empty-state" style={{ padding: '32px 0' }}>No rounds in progress — start one above.</div>
        </div>
      )}
    </div>
  );
}
