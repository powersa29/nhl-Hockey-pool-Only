'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Player, Course, Tee } from '@/lib/golf-db';
import type { LivePin } from '@/components/GolfMap';
import { courseHandicap9 } from '@/lib/golf-scoring';

const GolfMap = dynamic(() => import('@/components/GolfMap'), { ssr: false });

type CourseWithTees = Course & { tees: Tee[] };
type Step = 'setup' | 'playing' | 'done' | 'submitted';

interface LiveLocation {
  id: number;
  player_id: number;
  player_name: string;
  course_id: number | null;
  course_name: string;
  lat: number;
  lng: number;
  updated_at: string;
}

interface HoleData {
  hole_number: number;
  par: number;
  yards: number | null;
}

const POLL_MS   = 12_000;
const UPDATE_MS = 15_000;
const COLORS    = ['#15803d','#1d4ed8','#b45309','#7c3aed','#dc2626','#0891b2'];

function scoreName(score: number, par: number): string {
  const d = score - par;
  if (d <= -3) return 'Albatross!';
  if (d === -2) return 'Eagle!';
  if (d === -1) return 'Birdie!';
  if (d === 0) return 'Par';
  if (d === 1) return 'Bogey';
  if (d === 2) return 'Double';
  return `+${d}`;
}

function vsParStr(n: number): string {
  if (n === 0) return 'E';
  return n > 0 ? `+${n}` : `${n}`;
}

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function LivePage() {
  const [players, setPlayers]   = useState<Player[]>([]);
  const [courses, setCourses]   = useState<CourseWithTees[]>([]);
  const [liveList, setLiveList] = useState<LiveLocation[]>([]);

  const [playerId, setPlayerId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [teeId, setTeeId]       = useState('');

  const [step, setStep]               = useState<Step>('setup');
  const [sharing, setSharing]         = useState(false);
  const [geoError, setGeoError]       = useState('');
  const [starting, setStarting]       = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);

  const [holes, setHoles]             = useState<HoleData[]>([]);
  const [scores, setScores]           = useState<number[]>([]);
  const [currentHole, setCurrentHole] = useState(0);
  const [submitting, setSubmitting]   = useState(false);
  const [flashLabel, setFlashLabel]   = useState('');

  const watchIdRef   = useRef<number | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPos      = useRef<{ lat: number; lng: number } | null>(null);
  const liveRoundRef = useRef<number | null>(null);
  const playerIdRef  = useRef('');
  const courseIdRef  = useRef('');
  const playersRef   = useRef<Player[]>([]);
  const coursesRef   = useRef<CourseWithTees[]>([]);

  // keep refs in sync with state for use inside intervals
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { coursesRef.current = courses; }, [courses]);

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/players').then(r => r.json()).then(setPlayers);
    fetch('/api/courses').then(r => r.json()).then(setCourses);
    pollLive();
    pollTimerRef.current = setInterval(pollLive, POLL_MS);
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, []);

  useEffect(() => {
    if (!teeId) { setHoles([]); return; }
    fetch(`/api/holes?teeId=${teeId}`)
      .then(r => r.json())
      .then(data => setHoles(Array.isArray(data) ? data : []));
  }, [teeId]);

  useEffect(() => {
    const stop = () => {
      if (sendTimerRef.current) clearInterval(sendTimerRef.current);
      if (watchIdRef.current != null) navigator.geolocation?.clearWatch(watchIdRef.current);
    };
    window.addEventListener('beforeunload', stop);
    return () => window.removeEventListener('beforeunload', stop);
  }, []);

  // ── GPS ──────────────────────────────────────────────────────────────────────
  async function pollLive() {
    const data = await fetch('/api/live').then(r => r.json()).catch(() => []);
    setLiveList(data);
  }

  function pushLocation(lat: number, lng: number) {
    const pId    = playerIdRef.current;
    const cId    = courseIdRef.current;
    const player = playersRef.current.find(p => p.id === Number(pId));
    const course = coursesRef.current.find(c => c.id === Number(cId));
    return fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id:   Number(pId),
        player_name: player?.name ?? '',
        course_id:   course?.id ?? null,
        course_name: course?.name ?? '',
        lat, lng,
      }),
    }).then(() => pollLive());
  }

  // ── Start round ──────────────────────────────────────────────────────────────
  async function startRound() {
    if (!playerId || !courseId || !teeId) return;
    setStarting(true);
    setGeoError('');

    playerIdRef.current = playerId;
    courseIdRef.current = courseId;

    const player = players.find(p => p.id === Number(playerId))!;
    const course = courses.find(c => c.id === Number(courseId))!;
    const tee    = course.tees.find(t => t.id === Number(teeId))!;

    const res = await fetch('/api/live-scoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id:      player.id,
        player_name:    player.name,
        course_id:      course.id,
        course_name:    course.name,
        tee_name:       tee.tee_name,
        slope_rating:   tee.slope_rating,
        course_rating:  tee.course_rating,
        handicap_index: player.handicap_index,
      }),
    });
    const roundData = await res.json();
    liveRoundRef.current = roundData.id;

    setScores([]);
    setCurrentHole(0);
    setMapCollapsed(true);
    setStep('playing');
    setStarting(false);

    // GPS — non-blocking; scoring starts regardless
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const { latitude: lat, longitude: lng } = pos.coords;
          lastPos.current = { lat, lng };
          await pushLocation(lat, lng);
          setSharing(true);

          watchIdRef.current = navigator.geolocation.watchPosition(
            p => { lastPos.current = { lat: p.coords.latitude, lng: p.coords.longitude }; },
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000 },
          );
          sendTimerRef.current = setInterval(() => {
            if (lastPos.current) pushLocation(lastPos.current.lat, lastPos.current.lng);
          }, UPDATE_MS);
        },
        err => setGeoError(
          err.code === 1
            ? 'Location permission denied — GPS pin won\'t show on map.'
            : 'Could not get GPS — scoring only.',
        ),
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    }
  }

  // ── Score entry ──────────────────────────────────────────────────────────────
  function enterScore(score: number) {
    const holePar = holes[currentHole]?.par;
    if (holePar) {
      setFlashLabel(scoreName(score, holePar));
      setTimeout(() => setFlashLabel(''), 1400);
    }

    const next = [...scores, score];
    setScores(next);

    if (liveRoundRef.current) {
      fetch('/api/live-scoring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: liveRoundRef.current, scores: next }),
      });
    }

    if (currentHole >= 8) {
      setStep('done');
    } else {
      setCurrentHole(h => h + 1);
    }
  }

  function undoLast() {
    if (scores.length === 0) return;
    const prev = scores.slice(0, -1);
    setScores(prev);
    setCurrentHole(h => Math.max(0, h - 1));
    if (step === 'done') setStep('playing');
    if (liveRoundRef.current) {
      fetch('/api/live-scoring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: liveRoundRef.current, scores: prev }),
      });
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function submitRound() {
    setSubmitting(true);
    const gross = scores.reduce((a, b) => a + b, 0);
    await fetch('/api/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: Number(playerId), course_id: Number(courseId), tee_id: Number(teeId), gross_score: gross }),
    });
    if (liveRoundRef.current) {
      await fetch(`/api/live-scoring?id=${liveRoundRef.current}`, { method: 'DELETE' });
    }
    setSubmitting(false);
    setStep('submitted');
  }

  // ── End round ────────────────────────────────────────────────────────────────
  async function stopEverything() {
    if (sendTimerRef.current) { clearInterval(sendTimerRef.current); sendTimerRef.current = null; }
    if (watchIdRef.current != null) { navigator.geolocation?.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (playerIdRef.current) await fetch(`/api/live?playerId=${playerIdRef.current}`, { method: 'DELETE' });
    if (liveRoundRef.current) await fetch(`/api/live-scoring?id=${liveRoundRef.current}`, { method: 'DELETE' });
    setSharing(false);
    setStep('setup');
    setScores([]);
    setCurrentHole(0);
    liveRoundRef.current = null;
    setMapCollapsed(false);
    pollLive();
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const player         = players.find(p => p.id === Number(playerId));
  const course         = courses.find(c => c.id === Number(courseId));
  const tee            = course?.tees.find(t => t.id === Number(teeId));
  const gross          = scores.reduce((a, b) => a + b, 0);
  const hcp            = player && tee ? courseHandicap9(player.handicap_index, tee.slope_rating) : 0;
  const net            = gross - hcp;
  const currentHolePar = holes[currentHole]?.par ?? null;
  const parThrough     = holes.slice(0, scores.length).reduce((a, h) => a + h.par, 0);
  const totalCoursePar = holes.reduce((a, h) => a + h.par, 0);
  const vsParNow       = scores.length > 0 && parThrough > 0 ? gross - parThrough : null;

  const pins: LivePin[] = liveList.map(l => ({
    player_id: l.player_id, player_name: l.player_name,
    lat: l.lat, lng: l.lng, course_id: l.course_id,
  }));

  // ════════════════════════════════════════════════════════════════════
  // SUBMITTED
  // ════════════════════════════════════════════════════════════════════
  if (step === 'submitted') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>🌭</div>
        <h2 style={{ marginTop: 12 }}>Round Submitted!</h2>
        <p style={{ color: 'var(--muted)' }}>{player?.name} · {course?.name} · {tee?.tee_name} Tees</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, margin: '20px 0' }}>
          {([['Gross', String(gross)], ['HCP', `-${hcp}`], ['Net', String(net)]] as [string, string][]).map(([label, val]) => (
            <div key={label} className="card" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: label === 'Net' ? 'var(--green)' : 'var(--ink)' }}>{val}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>
        {totalCoursePar > 0 && (
          <p style={{ fontSize: 18, fontWeight: 800, color: gross - totalCoursePar <= 0 ? 'var(--green)' : 'var(--ink)' }}>
            {vsParStr(gross - totalCoursePar)} vs par
          </p>
        )}
        <button className="btn danger" onClick={stopEverything} style={{ width: '100%', marginTop: 8 }}>
          {sharing ? 'Stop GPS & Done' : 'Done'}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // DONE — review before submitting
  // ════════════════════════════════════════════════════════════════════
  if (step === 'done') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
        <div className="section-header" style={{ marginBottom: 20 }}>
          <h2>Round Complete ⛳</h2>
          <span className="tag green">9/9 holes</span>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Hole by hole</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4 }}>
            {scores.map((s, i) => {
              const par  = holes[i]?.par;
              const diff = par != null ? s - par : null;
              const bg   = diff == null ? 'var(--chip)'
                : diff < 0   ? '#15803d'
                : diff === 0  ? 'var(--green-dark)'
                : diff === 1  ? '#b45309'
                : '#dc2626';
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{i + 1}</div>
                  {par && <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 2 }}>P{par}</div>}
                  <div style={{
                    width: 28, height: 28, margin: '0 auto',
                    borderRadius: diff != null && diff <= -2 ? '20%' : diff === -1 ? '6px' : '50%',
                    background: bg, color: 'white', display: 'grid', placeItems: 'center',
                    fontWeight: 700, fontSize: 13,
                  }}>{s}</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{gross}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Gross{totalCoursePar > 0 ? ` / Par ${totalCoursePar}` : ''}</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>-{hcp}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>HCP</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--green)' }}>{net}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Net</div>
            </div>
          </div>
          {totalCoursePar > 0 && (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 18, fontWeight: 800, color: gross - totalCoursePar <= 0 ? 'var(--green)' : 'var(--ink)' }}>
              {vsParStr(gross - totalCoursePar)} vs par
            </div>
          )}
        </div>

        <button className="btn" style={{ width: '100%', marginBottom: 10 }} onClick={submitRound} disabled={submitting}>
          {submitting ? 'Submitting…' : '✓ Submit Official Round'}
        </button>
        <button className="btn ghost" style={{ width: '100%', marginBottom: 10 }} onClick={undoLast}>← Edit Last Hole</button>
        <button className="btn danger" style={{ width: '100%' }} onClick={stopEverything}>Discard & End</button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // PLAYING — hole-by-hole
  // ════════════════════════════════════════════════════════════════════
  if (step === 'playing') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>

        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
            {player?.name} · {course?.name} · {tee?.tee_name}
            {sharing && <span style={{ color: 'var(--green)', marginLeft: 6 }}>📍 GPS on</span>}
          </div>
          <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1 }}>
            Hole {currentHole + 1}
          </div>
          {currentHolePar ? (
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-dark)', marginTop: 2 }}>
              Par {currentHolePar}
              {holes[currentHole]?.yards && (
                <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
                  {holes[currentHole].yards} yds
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>of 9</div>
          )}
          <div style={{ minHeight: 30, marginTop: 4, fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>
            {flashLabel}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} style={{
              height: 10, borderRadius: 5,
              width: i === currentHole ? 24 : 10,
              background: i < currentHole ? 'var(--green)' : i === currentHole ? 'var(--green-dark)' : 'var(--line)',
              transition: 'width 0.2s, background 0.2s',
            }} />
          ))}
        </div>

        {/* Score buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 18 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
            const isPar    = currentHolePar === n;
            const isBirdie = currentHolePar != null && n === currentHolePar - 1;
            return (
              <button
                key={n}
                onClick={() => enterScore(n)}
                style={{
                  height: 66, borderRadius: 'var(--radius)',
                  border: isPar ? '3px solid var(--green)' : isBirdie ? '2px solid #166534' : '2px solid var(--line)',
                  background: isPar ? 'var(--green-dark)' : isBirdie ? '#14532d' : 'var(--chip)',
                  color: isPar || isBirdie ? 'white' : 'var(--ink)',
                  fontSize: n === 10 ? 14 : 24, fontWeight: 800,
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation', position: 'relative',
                }}
              >
                {n === 10 ? '10+' : n}
                {isPar && (
                  <div style={{ position: 'absolute', bottom: 3, left: 0, right: 0, fontSize: 8, color: 'rgba(255,255,255,0.75)', textAlign: 'center', letterSpacing: 1 }}>
                    PAR
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Running score */}
        {scores.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: 'var(--ice-2)', borderRadius: 'var(--radius)', border: '1.5px solid var(--line)' }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{gross}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Gross · {scores.length} holes</div>
            </div>
            {vsParNow !== null && (
              <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: 'var(--ice-2)', borderRadius: 'var(--radius)', border: '1.5px solid var(--line)' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: vsParNow <= 0 ? 'var(--green)' : 'var(--ink)' }}>
                  {vsParStr(vsParNow)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>vs Par</div>
              </div>
            )}
            <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: 'var(--ice-2)', borderRadius: 'var(--radius)', border: '1.5px solid var(--line)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>{net}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Est. Net</div>
            </div>
          </div>
        )}

        {/* Collapsible map */}
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={() => setMapCollapsed(c => !c)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', padding: '2px 0', marginBottom: 4 }}
          >
            {mapCollapsed ? '▶ Show map & group' : '▼ Hide map'}
          </button>
          {!mapCollapsed && (
            <>
              <div style={{ border: '2px solid var(--green-dark)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 10 }}>
                <GolfMap liveLocations={pins} height={200} />
              </div>
              {liveList.filter(l => l.player_id !== Number(playerId)).map((l, i) => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--ice-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS[i % COLORS.length], color: 'white', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {l.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <strong>{l.player_name}</strong>
                    <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 11 }}>{timeAgo(l.updated_at)}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {scores.length > 0 && <button className="btn ghost" style={{ flex: 1 }} onClick={undoLast}>← Undo</button>}
          <button className="btn danger" style={{ flex: scores.length > 0 ? 1 : undefined, width: scores.length === 0 ? '100%' : undefined }} onClick={stopEverything}>
            End Round
          </button>
        </div>

        {geoError && <div className="error-banner" style={{ marginTop: 10, fontSize: 12 }}>📍 {geoError}</div>}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // SETUP
  // ════════════════════════════════════════════════════════════════════
  return (
    <div>
      <div className="section-header">
        <div>
          <h2>On Course 📍⛳</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Share your GPS and score hole by hole — your group sees it all live.
          </p>
        </div>
        {liveList.length > 0 && (
          <span className="tag green">
            <span className="pulse-dot" style={{ background: 'white' }} />
            {liveList.length} on course
          </span>
        )}
      </div>

      <div style={{ marginBottom: 20, border: '2px solid var(--green-dark)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        <GolfMap liveLocations={pins} height={340} />
      </div>

      <div className="live-grid">
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Start Your Round</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    <option key={t.id} value={t.id}>{t.tee_name} — Slope {t.slope_rating}</option>
                  ))}
                </select>
              </div>
            )}
            {teeId && holes.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--ice-2)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                ⛳ Par {totalCoursePar} · {holes.map(h => h.par).join('-')}
              </div>
            )}
            {geoError && <div className="error-banner" style={{ marginTop: 0, fontSize: 12 }}>⚠️ {geoError}</div>}
            <button className="btn" onClick={startRound} disabled={starting || !playerId || !courseId || !teeId}>
              {starting ? 'Starting…' : '⛳ Start Round'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
              Shares your GPS and tracks scores hole by hole — both visible to the group while this page is open.
            </p>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>On Course Now</h3>
          {liveList.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>No one is on course yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {liveList.map((l, i) => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--ice-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: COLORS[i % COLORS.length], color: 'white', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>
                    {l.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.player_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.course_name || 'Unknown course'} · {timeAgo(l.updated_at)}</div>
                  </div>
                  <span className="pulse-dot" style={{ width: 8, height: 8, background: 'var(--green)', display: 'inline-block', borderRadius: '50%', animation: 'gpulse 1.4s infinite', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 12 }}>
        GPS visible while page is open. Scores update each hole. Auto-expires after 30 min of inactivity.
      </p>
    </div>
  );
}
