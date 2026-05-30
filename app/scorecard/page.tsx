'use client';

import { useState, useEffect } from 'react';
import type { Player, Course, Tee } from '@/lib/golf-db';
import { courseHandicap9 } from '@/lib/golf-scoring';

type CourseWithTees = Course & { tees: Tee[] };
type Step = 'setup' | 'playing' | 'done' | 'submitted';

const SCORE_BTNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function ScorecardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [courses, setCourses] = useState<CourseWithTees[]>([]);

  const [playerId, setPlayerId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [teeId, setTeeId]       = useState('');

  const [step, setStep]               = useState<Step>('setup');
  const [liveRoundId, setLiveRoundId] = useState<number | null>(null);
  const [scores, setScores]           = useState<number[]>([]);
  const [currentHole, setCurrentHole] = useState(0);
  const [starting, setStarting]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    fetch('/api/players').then(r => r.json()).then(setPlayers);
    fetch('/api/courses').then(r => r.json()).then(setCourses);
  }, []);

  const player   = players.find(p => p.id === Number(playerId));
  const course   = courses.find(c => c.id === Number(courseId));
  const tee      = course?.tees.find(t => t.id === Number(teeId));
  const gross    = scores.reduce((a, b) => a + b, 0);
  const hcp      = player && tee ? courseHandicap9(player.handicap_index, tee.slope_rating) : 0;
  const net      = gross - hcp;

  async function startRound() {
    if (!player || !course || !tee) return;
    setStarting(true);
    setError('');
    const res = await fetch('/api/live-scoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id:     player.id,
        player_name:   player.name,
        course_id:     course.id,
        course_name:   course.name,
        tee_name:      tee.tee_name,
        slope_rating:  tee.slope_rating,
        course_rating: tee.course_rating,
        handicap_index: player.handicap_index,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to start round'); setStarting(false); return; }
    setLiveRoundId(data.id);
    setScores([]);
    setCurrentHole(0);
    setStep('playing');
    setStarting(false);
  }

  async function enterScore(score: number) {
    const next = [...scores, score];
    setScores(next);

    if (liveRoundId) {
      fetch('/api/live-scoring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: liveRoundId, scores: next }),
      });
    }

    if (currentHole >= 8) {
      setStep('done');
    } else {
      setCurrentHole(h => h + 1);
    }
  }

  async function undoLast() {
    if (scores.length === 0) return;
    const prev = scores.slice(0, -1);
    setScores(prev);
    setCurrentHole(h => Math.max(0, h - 1));
    if (step === 'done') setStep('playing');
    if (liveRoundId) {
      fetch('/api/live-scoring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: liveRoundId, scores: prev }),
      });
    }
  }

  async function submitRound() {
    if (!player || !course || !tee) return;
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id:   player.id,
        course_id:   course.id,
        tee_id:      tee.id,
        gross_score: gross,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to submit round');
      setSubmitting(false);
      return;
    }

    if (liveRoundId) {
      await fetch(`/api/live-scoring?id=${liveRoundId}`, { method: 'DELETE' });
    }

    setSubmitting(false);
    setStep('submitted');
  }

  async function abandonRound() {
    if (liveRoundId) {
      await fetch(`/api/live-scoring?id=${liveRoundId}`, { method: 'DELETE' });
    }
    setStep('setup');
    setScores([]);
    setCurrentHole(0);
    setLiveRoundId(null);
  }

  function resetAll() {
    setStep('setup');
    setScores([]);
    setCurrentHole(0);
    setLiveRoundId(null);
    setError('');
  }

  // ── Submitted ────────────────────────────────────────────────────────────────
  if (step === 'submitted') {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🌭</div>
        <h2 style={{ marginBottom: 8 }}>Round Submitted!</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 8 }}>
          {player?.name} · {course?.name} · {tee?.tee_name} Tees
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, margin: '24px 0' }}>
          {[['Gross', gross], ['HCP', `-${hcp}`], ['Net', net]].map(([label, val]) => (
            <div key={label as string} className="card" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: label === 'Net' ? 'var(--green)' : 'var(--ink)' }}>{val}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>
        <button className="btn" style={{ width: '100%' }} onClick={resetAll}>Start Another Round</button>
      </div>
    );
  }

  // ── Done — review & submit ───────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 16px' }}>
        <div className="section-header" style={{ marginBottom: 20 }}>
          <h2>Round Complete ⛳</h2>
          <span className="tag green">9/9 holes</span>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Hole-by-hole</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4 }}>
            {scores.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{i + 1}</div>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--green)', color: 'white',
                  display: 'grid', placeItems: 'center',
                  fontWeight: 700, fontSize: 14, margin: '0 auto',
                }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{gross}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Gross</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>-{hcp}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>HCP</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{net}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Net</div>
            </div>
          </div>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: 12 }}>⚠️ {error}</div>}

        <button className="btn" style={{ width: '100%', marginBottom: 10 }} onClick={submitRound} disabled={submitting}>
          {submitting ? 'Submitting…' : '✓ Submit Official Round'}
        </button>
        <button className="btn ghost" style={{ width: '100%', marginBottom: 10 }} onClick={undoLast}>
          ← Edit Last Hole
        </button>
        <button className="btn danger" style={{ width: '100%' }} onClick={abandonRound}>
          Discard Round
        </button>
      </div>
    );
  }

  // ── Playing — hole entry ─────────────────────────────────────────────────────
  if (step === 'playing') {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
            {player?.name} · {course?.name} · {tee?.tee_name} Tees
          </div>
          <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: 'var(--ink)' }}>
            Hole {currentHole + 1}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>of 9</div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} style={{
              height: 10,
              width: i === currentHole ? 24 : 10,
              borderRadius: 5,
              background: i < currentHole
                ? 'var(--green)'
                : i === currentHole
                  ? 'var(--green-dark)'
                  : 'var(--line)',
              transition: 'width 0.2s, background 0.2s',
            }} />
          ))}
        </div>

        {/* Score buttons */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 10, marginBottom: 28,
        }}>
          {SCORE_BTNS.map(n => (
            <button
              key={n}
              onClick={() => enterScore(n)}
              style={{
                height: 68,
                borderRadius: 'var(--radius)',
                border: '2px solid var(--line)',
                background: n >= 3 && n <= 5 ? 'var(--green-dark)' : 'var(--chip)',
                color: n >= 3 && n <= 5 ? 'white' : 'var(--ink)',
                fontSize: n === 10 ? 16 : 24,
                fontWeight: 800,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              {n === 10 ? '10+' : n}
            </button>
          ))}
        </div>

        {/* Running totals */}
        {scores.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: 'var(--ice-2)', borderRadius: 'var(--radius)', border: '1.5px solid var(--line)' }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{gross}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Gross ({scores.length} holes)</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: 'var(--ice-2)', borderRadius: 'var(--radius)', border: '1.5px solid var(--line)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{net}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Est. Net</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {scores.length > 0 && (
            <button className="btn ghost" style={{ flex: 1 }} onClick={undoLast}>← Undo</button>
          )}
          <button className="btn danger" style={{ flex: scores.length > 0 ? 1 : undefined, width: scores.length === 0 ? '100%' : undefined }} onClick={abandonRound}>
            End Round
          </button>
        </div>
      </div>
    );
  }

  // ── Setup ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 16px' }}>
      <div className="section-header">
        <div>
          <h2>Live Scorecard 🏌️</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Track your round hole by hole and submit when done.
          </p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <label>Your name</label>
            <select className="select" value={playerId} onChange={e => setPlayerId(e.target.value)} style={{ marginTop: 6 }}>
              <option value="">— Select your name —</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label>Course</label>
            <select className="select" value={courseId} onChange={e => { setCourseId(e.target.value); setTeeId(''); }} style={{ marginTop: 6 }}>
              <option value="">— Select course —</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} — {c.state}</option>)}
            </select>
          </div>

          {course && (
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label>Tee box</label>
              <select className="select" value={teeId} onChange={e => setTeeId(e.target.value)} style={{ marginTop: 6 }}>
                <option value="">— Select tee —</option>
                {course.tees.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.tee_name} — Slope {t.slope_rating} / Rating {t.course_rating}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="error-banner" style={{ marginTop: 0 }}>⚠️ {error}</div>}

          <button className="btn" onClick={startRound} disabled={starting || !playerId || !courseId || !teeId}>
            {starting ? 'Starting…' : '🏌️ Start Round'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
            Your live score will be visible to others on the home page while your round is in progress.
          </p>
        </div>
      </div>
    </div>
  );
}
