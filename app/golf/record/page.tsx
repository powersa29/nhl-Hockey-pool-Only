'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Player, Course, Tee } from '@/lib/golf-db';
import { courseHandicap9, netScore } from '@/lib/golf-scoring';

type CourseWithTees = Course & { tees: Tee[] };

const STATES = ['NY', 'MD', 'PA', 'VA'];

export default function RecordPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [courses, setCourses] = useState<CourseWithTees[]>([]);
  const [stateFilter, setStateFilter] = useState('');

  const [playerId, setPlayerId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [teeId, setTeeId] = useState('');
  const [grossScore, setGrossScore] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [roundsThisWeek, setRoundsThisWeek] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/golf/players').then(r => r.json()).then(setPlayers);
    fetch('/api/golf/courses').then(r => r.json()).then(setCourses);
  }, []);

  const player = players.find(p => p.id === Number(playerId));
  const filteredCourses = stateFilter
    ? courses.filter(c => c.state === stateFilter)
    : courses;
  const course = courses.find(c => c.id === Number(courseId));
  const tee = course?.tees.find(t => t.id === Number(teeId));

  const previewNet = player && tee && grossScore
    ? netScore(Number(grossScore), player.handicap_index, tee.slope_rating)
    : null;

  const chcp = player && tee
    ? courseHandicap9(player.handicap_index, tee.slope_rating)
    : null;

  useEffect(() => {
    if (!playerId) { setRoundsThisWeek(null); return; }
    fetch(`/api/golf/rounds/count?playerId=${playerId}`)
      .then(r => r.json())
      .then(d => setRoundsThisWeek(d.count));
  }, [playerId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!playerId || !courseId || !teeId || !grossScore) {
      setError('Please fill in all fields.'); return;
    }
    setSubmitting(true);
    const res = await fetch('/api/golf/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: Number(playerId),
        course_id: Number(courseId),
        tee_id: Number(teeId),
        gross_score: Number(grossScore),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }
    setDone(true);
  }

  function reset() {
    setDone(false);
    setGrossScore('');
    setTeeId('');
    setCourseId('');
    setError('');
    setRoundsThisWeek(null);
  }

  if (done) {
    return (
      <div style={{ maxWidth: 500 }}>
        <div className="success-banner" style={{ marginBottom: 20 }}>
          ✅ Round recorded! Net score: <strong>{previewNet}</strong>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={reset}>Record Another Round</button>
          <Link href="/golf"><button className="btn ghost">See Standings</button></Link>
          {player && <Link href={`/golf/player/${player.id}`}><button className="btn ghost">My Rounds</button></Link>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2>Record a Round</h2>
        <Link href="/golf/join"><button className="btn ghost" style={{ fontSize: 13 }}>New player? Join first →</button></Link>
      </div>

      <form onSubmit={submit} className="form-card" style={{ maxWidth: 640 }}>
        {/* Player */}
        <div className="form-row">
          <label>Player</label>
          <select
            className="select"
            value={playerId}
            onChange={e => { setPlayerId(e.target.value); setRoundsThisWeek(null); }}
          >
            <option value="">— Select player —</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} (HCP {p.handicap_index.toFixed(1)})
              </option>
            ))}
          </select>
          {roundsThisWeek !== null && (
            <div className={`hint ${roundsThisWeek >= 4 ? 'error-banner' : ''}`} style={{ marginTop: 6 }}>
              {roundsThisWeek >= 4
                ? '⚠️ Maximum 4 rounds already recorded this week.'
                : `${roundsThisWeek}/4 rounds recorded this week. ${4 - roundsThisWeek} remaining.`}
            </div>
          )}
        </div>

        {/* State Filter */}
        <div className="form-row">
          <label>Filter by State</label>
          <div className="state-tabs" style={{ marginBottom: 0 }}>
            <button type="button" className={`state-tab ${stateFilter === '' ? 'active' : ''}`}
              onClick={() => { setStateFilter(''); setCourseId(''); setTeeId(''); }}>
              All
            </button>
            {STATES.map(s => (
              <button key={s} type="button"
                className={`state-tab ${stateFilter === s ? 'active' : ''}`}
                onClick={() => { setStateFilter(s); setCourseId(''); setTeeId(''); }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Course */}
        <div className="form-row">
          <label>Course</label>
          <select
            className="select"
            value={courseId}
            onChange={e => { setCourseId(e.target.value); setTeeId(''); }}
          >
            <option value="">— Select course —</option>
            {filteredCourses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.city}, {c.state}
              </option>
            ))}
          </select>
        </div>

        {/* Tees */}
        {course && (
          <div className="form-row">
            <label>Tees</label>
            <div className="tee-grid">
              {course.tees.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`tee-btn ${t.tee_name.toLowerCase()} ${teeId === String(t.id) ? 'selected' : ''}`}
                  onClick={() => setTeeId(String(t.id))}
                >
                  <div className="tee-name">{t.tee_name} Tees</div>
                  <div className="tee-info">
                    Slope: <strong>{t.slope_rating}</strong><br />
                    Rating: {t.course_rating}<br />
                    {t.yards_9 ? `${t.yards_9} yds` : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Score */}
        <div className="form-row">
          <label>9-Hole Gross Score</label>
          <input
            className="input"
            type="number"
            placeholder="e.g. 47"
            min="18"
            max="72"
            value={grossScore}
            onChange={e => setGrossScore(e.target.value)}
            style={{ maxWidth: 160 }}
          />
          {chcp !== null && (
            <div className="hint">
              Course handicap (9 holes): <strong>{chcp} strokes</strong>
              {grossScore && previewNet !== null && (
                <> &nbsp;·&nbsp; Net score: <strong style={{ color: 'var(--green)' }}>{previewNet}</strong></>
              )}
            </div>
          )}
        </div>

        {error && <div className="error-banner">⚠️ {error}</div>}

        <div style={{ marginTop: 24 }}>
          <button
            type="submit"
            className="btn"
            disabled={submitting || roundsThisWeek === 4}
          >
            {submitting ? 'Saving…' : 'Save Round →'}
          </button>
        </div>
      </form>
    </div>
  );
}
