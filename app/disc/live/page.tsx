'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Player } from '@/lib/golf-db';
import { GolfPin, MapPin, CheckCircle } from '@/components/icons';

type Step = 'setup' | 'playing' | 'done' | 'submitted';

type CelebrationKind = 'birdie' | 'eagle' | 'ace' | 'snowman' | 'par';
const CELEBRATIONS: Record<CelebrationKind, { emoji: string; label: string; bg: string }> = {
  birdie:  { emoji: '🐦', label: 'Birdie!',  bg: 'rgba(21,128,61,0.92)'  },
  eagle:   { emoji: '🦅', label: 'Eagle!!',   bg: 'rgba(29,78,216,0.92)'  },
  ace:     { emoji: '🃏', label: 'Ace!!!',    bg: 'rgba(109,40,217,0.94)' },
  snowman: { emoji: '☃️', label: 'Snowman…', bg: 'rgba(15,23,42,0.90)'   },
  par:     { emoji: '👍', label: 'Par!',       bg: 'rgba(55,65,81,0.88)'   },
};

function CelebrationOverlay({ kind, onDone }: { kind: CelebrationKind; onDone: () => void }) {
  const cfg = CELEBRATIONS[kind];
  const particles = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => ({
      left:  `${((i * 19 + 11) % 89) + 4}%`,
      top:   `${((i * 13 +  7) % 82) + 4}%`,
      delay: `${((i * 7) % 40) * 0.01}s`,
      dur:   `${(0.7 + (i % 6) * 0.12).toFixed(2)}s`,
      size:  `${22 + (i % 5) * 7}px`,
    })), []);
  return (
    <div onClick={onDone} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: cfg.bg, cursor: 'pointer',
      animation: 'celebrate-bg 2.4s ease-in-out forwards',
    }}>
      {particles.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', left: p.left, top: p.top, lineHeight: 1,
          fontSize: p.size, pointerEvents: 'none', userSelect: 'none',
          animation: `confetti-burst ${p.dur} ${p.delay} ease-out forwards`,
        }}>{cfg.emoji}</span>
      ))}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 88, lineHeight: 1, marginBottom: 12, animation: 'celebrate-pop 0.5s ease-out forwards' }}>
          {cfg.emoji}
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: 'white', textShadow: '0 2px 12px rgba(0,0,0,0.6)', letterSpacing: -0.5 }}>
          {cfg.label}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 10 }}>tap to dismiss</div>
      </div>
    </div>
  );
}

const SCORE_NAMES: Record<number, string> = {
  [-3]: 'Albatross', [-2]: 'Eagle', [-1]: 'Birdie',
  [0]: 'Par', [1]: 'Bogey', [2]: 'Double', [3]: 'Triple',
};

const COLORS = ['#15803d','#1d4ed8','#b45309','#7c3aed','#dc2626','#0891b2'];
const POLL_MS   = 12_000;
const UPDATE_MS = 15_000;
const DEFAULT_PAR = 3;

function vsParStr(n: number) { return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`; }
function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
function scoreName(score: number, par: number): string {
  return SCORE_NAMES[score - par] ?? `+${score - par}`;
}
function btnBg(n: number, par: number): string {
  const d = n - par;
  if (d <= -2) return '#1d4ed8';
  if (d === -1) return '#15803d';
  if (d === 0)  return 'var(--green-dark)';
  if (d === 1)  return '#92400e';
  return '#991b1b';
}

function ScoreBubble({ score, par, size = 26 }: { score: number; par: number; size?: number }) {
  const diff = score - par;
  const bg = diff <= -2 ? '#1d4ed8' : diff === -1 ? '#15803d' : diff === 0 ? 'transparent' : diff === 1 ? '#92400e' : '#991b1b';
  const color = diff === 0 ? 'var(--ink)' : 'white';
  return (
    <div style={{
      width: size, height: size, borderRadius: diff <= 0 ? '50%' : 3,
      background: bg, color, fontWeight: 700, fontSize: size * 0.52,
      display: 'grid', placeItems: 'center', margin: '0 auto',
    }}>{score}</div>
  );
}

interface PdgaResult { id: unknown; name: string; city: string; state: string; holes: number }
interface LiveLoc { id: number; player_id: number; player_name: string; course_name: string; updated_at: string }

export default function DiscLivePage() {
  const [players, setPlayers]   = useState<Player[]>([]);
  const [liveList, setLiveList] = useState<LiveLoc[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [courseQuery, setCourseQuery] = useState('');
  const [courseName, setCourseName] = useState('');
  const [pdgaResults, setPdgaResults] = useState<PdgaResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalHoles, setTotalHoles] = useState<9 | 18>(18);
  const [holePars, setHolePars] = useState<number[]>(Array(18).fill(DEFAULT_PAR));

  const [step, setStep]           = useState<Step>('setup');
  const [scores, setScores]       = useState<number[]>([]);
  const [currentHole, setCurrentHole] = useState(0);
  const [flashLabel, setFlashLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sharing, setSharing]     = useState(false);
  const [geoError, setGeoError]   = useState('');
  const [starting, setStarting]   = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationKind | null>(null);

  const watchIdRef   = useRef<number | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPos      = useRef<{ lat: number; lng: number } | null>(null);
  const liveRoundRef = useRef<number | null>(null);
  const playerIdRef  = useRef('');
  const playersRef   = useRef<Player[]>([]);

  useEffect(() => { playersRef.current = players; }, [players]);

  useEffect(() => {
    fetch('/api/players').then(r => r.json()).then(setPlayers);
    pollLive();
    pollTimerRef.current = setInterval(pollLive, POLL_MS);
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('disc-round');
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      if (!d.roundId) return;
      fetch('/api/live-scoring')
        .then(r => r.json())
        .then((list: { id: number }[]) => {
          if (!Array.isArray(list) || !list.find(r => r.id === d.roundId)) {
            localStorage.removeItem('disc-round');
            return;
          }
          liveRoundRef.current = d.roundId;
          playerIdRef.current  = String(d.playerId ?? '');
          setPlayerId(String(d.playerId ?? ''));
          setCourseName(d.courseName ?? '');
          setTotalHoles(d.totalHoles ?? 18);
          setHolePars(d.holePars ?? Array(d.totalHoles ?? 18).fill(DEFAULT_PAR));
          setScores(d.scores ?? []);
          setCurrentHole(d.currentHole ?? 0);
          setStep(d.step ?? 'playing');
        })
        .catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    if (step === 'playing' || step === 'done') {
      localStorage.setItem('disc-round', JSON.stringify({
        roundId: liveRoundRef.current, playerId, courseName,
        totalHoles, holePars, scores, currentHole, step,
      }));
    }
  }, [step, scores, currentHole, playerId, courseName, totalHoles, holePars]);

  async function pollLive() {
    const data = await fetch('/api/live').then(r => r.json()).catch(() => []);
    setLiveList(Array.isArray(data) ? data : []);
  }

  function pushLocation(lat: number, lng: number) {
    const p = playersRef.current.find(p => p.id === Number(playerIdRef.current));
    return fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: Number(playerIdRef.current), player_name: p?.name ?? '',
        course_id: null, course_name: courseName, lat, lng,
      }),
    }).then(() => pollLive());
  }

  async function searchPdga() {
    if (!courseQuery.trim()) return;
    setSearching(true);
    setPdgaResults([]);
    try {
      const res = await fetch(`/api/disc/courses/search?q=${encodeURIComponent(courseQuery)}`);
      const data = await res.json();
      setPdgaResults(Array.isArray(data) ? data : []);
    } finally {
      setSearching(false);
    }
  }

  function selectCourse(c: PdgaResult) {
    setCourseName(c.name);
    setCourseQuery(c.name);
    setPdgaResults([]);
    const h = c.holes === 9 ? 9 : 18;
    setTotalHoles(h as 9 | 18);
    setHolePars(Array(h).fill(DEFAULT_PAR));
  }

  function updateHoles(n: 9 | 18) {
    setTotalHoles(n);
    setHolePars(Array(n).fill(DEFAULT_PAR));
  }

  async function startRound() {
    if (!playerId || !courseName) return;
    setStarting(true);
    setGeoError('');
    playerIdRef.current = playerId;

    const holeParsPayload = holePars.map((par, i) => ({
      hole_number: i + 1, par, yards: null,
    }));

    const p = playersRef.current.find(px => px.id === Number(playerId))!;
    const res = await fetch('/api/live-scoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: p.id, player_name: p.name,
        course_id: null, course_name: courseName,
        tee_name: `${totalHoles}-hole`,
        slope_rating: 113, course_rating: totalHoles * DEFAULT_PAR,
        handicap_index: p.handicap_index,
        start_hole: 1, hole_pars: holeParsPayload,
      }),
    });
    const data = await res.json();
    liveRoundRef.current = data.id;
    setScores([]);
    setCurrentHole(0);
    setStep('playing');
    setStarting(false);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const { latitude: lat, longitude: lng } = pos.coords;
          lastPos.current = { lat, lng };
          await pushLocation(lat, lng);
          setSharing(true);
          watchIdRef.current = navigator.geolocation.watchPosition(
            px => { lastPos.current = { lat: px.coords.latitude, lng: px.coords.longitude }; },
            () => {}, { enableHighAccuracy: true, maximumAge: 5000 },
          );
          sendTimerRef.current = setInterval(() => {
            if (lastPos.current) pushLocation(lastPos.current.lat, lastPos.current.lng);
          }, UPDATE_MS);
        },
        err => setGeoError(err.code === 1 ? 'Location permission denied — scoring only.' : 'Could not get GPS — scoring only.'),
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    }
  }

  function enterScore(score: number) {
    const par = holePars[currentHole] ?? DEFAULT_PAR;
    const diff = score - par;
    setFlashLabel(scoreName(score, par));
    setTimeout(() => setFlashLabel(''), 1400);
    let celebKind: CelebrationKind | null = null;
    if (score === 1)      celebKind = 'ace';
    else if (diff <= -2)  celebKind = 'eagle';
    else if (diff === -1) celebKind = 'birdie';
    else if (diff === 0)  celebKind = 'par';
    else if (score === 8) celebKind = 'snowman';
    if (celebKind) {
      setCelebration(celebKind);
      setTimeout(() => setCelebration(null), 2400);
    }
    const next = [...scores, score];
    setScores(next);
    if (liveRoundRef.current) {
      fetch('/api/live-scoring', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: liveRoundRef.current, scores: next }),
      });
    }
    if (currentHole >= totalHoles - 1) {
      if (celebKind) setTimeout(() => setStep('done'), 2200);
      else setStep('done');
    } else { setCurrentHole(h => h + 1); }
  }

  function undoLast() {
    if (scores.length === 0) return;
    const prev = scores.slice(0, -1);
    setScores(prev);
    setCurrentHole(h => Math.max(0, h - 1));
    if (step === 'done') setStep('playing');
    if (liveRoundRef.current) {
      fetch('/api/live-scoring', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: liveRoundRef.current, scores: prev }),
      });
    }
  }

  async function submitRound() {
    setSubmitting(true);
    const gross = scores.reduce((a, b) => a + b, 0);
    const p = players.find(px => px.id === Number(playerId));
    if (p) {
      // disc golf rounds don't insert into golf_rounds (no tee ID)
    }
    if (liveRoundRef.current) {
      await fetch(`/api/live-scoring?id=${liveRoundRef.current}`, { method: 'DELETE' });
    }
    localStorage.removeItem('disc-round');
    setSubmitting(false);
    setStep('submitted');
    void gross;
  }

  async function stopEverything() {
    if (sendTimerRef.current) { clearInterval(sendTimerRef.current); sendTimerRef.current = null; }
    if (watchIdRef.current != null) { navigator.geolocation?.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (playerIdRef.current) await fetch(`/api/live?playerId=${playerIdRef.current}`, { method: 'DELETE' });
    if (liveRoundRef.current) await fetch(`/api/live-scoring?id=${liveRoundRef.current}`, { method: 'DELETE' });
    localStorage.removeItem('disc-round');
    setSharing(false); setStep('setup'); setScores([]); setCurrentHole(0);
    liveRoundRef.current = null; setConfirmEnd(false); pollLive();
  }

  const gross      = scores.reduce((a, b) => a + b, 0);
  const totalPar   = holePars.slice(0, totalHoles).reduce((a, b) => a + b, 0);
  const parThrough = holePars.slice(0, scores.length).reduce((a, b) => a + b, 0);
  const vsPar      = scores.length > 0 ? gross - parThrough : null;
  const curPar     = holePars[currentHole] ?? DEFAULT_PAR;
  const scoreBtns  = Array.from({ length: Math.min(12, curPar + 6) }, (_, i) => {
    const n = i + 1;
    const d = n - curPar;
    return { n, label: SCORE_NAMES[d] ?? '' };
  });
  const player = players.find(p => p.id === Number(playerId));

  if (step === 'submitted') {
    const finalVsPar = gross - totalPar;
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <CheckCircle size={56} color="var(--green)" strokeWidth={1.5} />
        </div>
        <h2 style={{ marginTop: 12 }}>Round Complete!</h2>
        <p style={{ color: 'var(--muted)' }}>{player?.name} · {courseName} · {totalHoles} holes</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '20px 0' }}>
          {[['Gross', String(gross)], ['vs Par', vsParStr(finalVsPar)]].map(([label, val]) => (
            <div key={label} className="card" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: label === 'vs Par' && finalVsPar <= 0 ? 'var(--green)' : 'var(--ink)' }}>{val}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>
        <button className="btn" style={{ width: '100%' }} onClick={stopEverything}>Done</button>
      </div>
    );
  }

  if (step === 'done') {
    const finalVsPar = gross - totalPar;
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px' }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <h2>Round Complete — {totalHoles} holes</h2>
          <span className="tag green">{totalHoles}/{totalHoles}</span>
        </div>
        <div className="card" style={{ marginBottom: 14, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div><div style={{ fontSize: 28, fontWeight: 800 }}>{gross}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Gross</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 800, color: finalVsPar <= 0 ? 'var(--green)' : 'var(--ink)' }}>{vsParStr(finalVsPar)}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>vs Par</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 800 }}>{totalPar}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Course Par</div></div>
          </div>
        </div>
        <ScorecardTable scores={scores} holePars={holePars} totalHoles={totalHoles} playerName={player?.name ?? 'You'} />
        <button className="btn" style={{ width: '100%', marginBottom: 10, marginTop: 14 }} onClick={submitRound} disabled={submitting}>
          {submitting ? 'Saving…' : '✓ Finish Round'}
        </button>
        <button className="btn ghost" style={{ width: '100%', marginBottom: 10 }} onClick={undoLast}>← Edit Last Hole</button>
        {confirmEnd ? (
          <div style={{ border: '1.5px solid #dc2626', borderRadius: 'var(--radius)', padding: '12px 14px', background: 'color-mix(in oklab, #dc2626 6%, transparent)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Discard this round?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => setConfirmEnd(false)}>Cancel</button>
              <button className="btn danger" style={{ flex: 1 }} onClick={stopEverything}>Yes, Discard</button>
            </div>
          </div>
        ) : (
          <button className="btn danger" style={{ width: '100%' }} onClick={() => setConfirmEnd(true)}>Discard & End</button>
        )}
        {celebration && <CelebrationOverlay kind={celebration} onDone={() => setCelebration(null)} />}
      </div>
    );
  }

  if (step === 'playing') {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 12 }}>
          <div>
            <strong>{player?.name}</strong>
            <span style={{ color: 'var(--muted)', marginLeft: 6 }}>{courseName}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {sharing && <span style={{ color: 'var(--green)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}><MapPin size={11} /> GPS</span>}
            <span style={{ color: 'var(--muted)' }}>{scores.length}/{totalHoles}</span>
          </div>
        </div>

        <div className="card" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
          <ScorecardTable scores={scores} holePars={holePars} totalHoles={totalHoles} playerName={player?.name ?? 'You'} currentHole={currentHole} />
        </div>

        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>
              Hole {currentHole + 1}
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)', marginLeft: 8 }}>Par {curPar}</span>
            </div>
            {flashLabel && <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', marginTop: 4 }}>{flashLabel}</div>}
            {vsPar !== null && (
              <div style={{ fontSize: 13, color: vsPar <= 0 ? 'var(--green)' : 'var(--ink)', fontWeight: 700, marginTop: 4 }}>
                {vsParStr(vsPar)} through {scores.length}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {scoreBtns.map(btn => (
              <button
                key={btn.n}
                onClick={() => enterScore(btn.n)}
                style={{
                  flex: '1 1 0', minWidth: 44, height: 60, borderRadius: 'var(--radius)',
                  border: '2px solid var(--line)',
                  background: btnBg(btn.n, curPar),
                  color: 'white', cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{btn.n}</span>
                {btn.label && <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.5, opacity: 0.85, textTransform: 'uppercase' }}>{btn.label}</span>}
              </button>
            ))}
          </div>
        </div>

        {liveList.filter(l => l.player_id !== Number(playerId)).length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--muted)' }}>Others on course</div>
            {liveList.filter(l => l.player_id !== Number(playerId)).map((l, i) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: COLORS[i % COLORS.length], color: 'white', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                  {l.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: 13 }}><strong>{l.player_name}</strong></span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(l.updated_at)}</span>
              </div>
            ))}
          </div>
        )}

        {confirmEnd ? (
          <div style={{ border: '1.5px solid #dc2626', borderRadius: 'var(--radius)', padding: '12px 14px', background: 'color-mix(in oklab, #dc2626 6%, transparent)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>End this round?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => setConfirmEnd(false)}>Keep Playing</button>
              <button className="btn danger" style={{ flex: 1 }} onClick={stopEverything}>Yes, End Round</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            {scores.length > 0 && <button className="btn ghost" style={{ flex: 1 }} onClick={undoLast}>← Undo</button>}
            <button className="btn danger" style={{ flex: scores.length > 0 ? 1 : undefined, width: scores.length === 0 ? '100%' : undefined }} onClick={() => setConfirmEnd(true)}>End Round</button>
          </div>
        )}
        {geoError && <div className="error-banner" style={{ marginTop: 10, fontSize: 12 }}>{geoError}</div>}
        {celebration && <CelebrationOverlay kind={celebration} onDone={() => setCelebration(null)} />}
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><GolfPin size={20} color="var(--green-dark)" /> Disc Golf — On Course</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>Track your round hole by hole. Scores update live.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
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
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="Search PDGA directory or type a name…"
                value={courseQuery}
                onChange={e => { setCourseQuery(e.target.value); setCourseName(e.target.value); }}
                onKeyDown={e => e.key === 'Enter' && searchPdga()}
              />
              <button className="btn ghost" style={{ padding: '0 14px', flexShrink: 0 }} onClick={searchPdga} disabled={searching}>
                {searching ? '…' : 'Search'}
              </button>
            </div>
            {pdgaResults.length > 0 && (
              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', marginTop: 4, overflow: 'hidden' }}>
                {pdgaResults.map((c, i) => (
                  <button
                    key={String(c.id)}
                    onClick={() => selectCourse(c)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                      background: i % 2 === 0 ? 'var(--ice-2)' : 'var(--bg)',
                      border: 'none', borderBottom: i < pdgaResults.length - 1 ? '1px solid var(--line)' : 'none',
                      cursor: 'pointer', fontSize: 13,
                    }}
                  >
                    <strong>{c.name}</strong>
                    <span style={{ color: 'var(--muted)', marginLeft: 8, fontSize: 11 }}>{c.city}, {c.state} · {c.holes} holes</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label>Holes</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {([9, 18] as const).map(n => (
                <button key={n} onClick={() => updateHoles(n)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 'var(--radius)',
                  border: `2px solid ${totalHoles === n ? 'var(--green)' : 'var(--line)'}`,
                  background: totalHoles === n ? 'var(--green-dark)' : 'var(--chip)',
                  color: totalHoles === n ? 'white' : 'var(--ink)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>{n} holes</button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--ice-2)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
            All holes default to par 3 · Course par {holePars.slice(0, totalHoles).reduce((a, b) => a + b, 0)}
          </div>

          {geoError && <div className="error-banner" style={{ fontSize: 12 }}>⚠️ {geoError}</div>}
          <button className="btn" onClick={startRound} disabled={starting || !playerId || !courseName}>
            {starting ? 'Starting…' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><GolfPin size={15} color="white" />Start Round</span>}
          </button>
        </div>
      </div>

      {liveList.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>On Course Now</h3>
          {liveList.map((l, i) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < liveList.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: COLORS[i % COLORS.length], color: 'white', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                {l.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{l.player_name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.course_name} · {timeAgo(l.updated_at)}</div>
              </div>
              <span className="pulse-dot" style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: '50%', animation: 'gpulse 1.4s infinite' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScorecardTable({ scores, holePars, totalHoles, playerName, currentHole }: {
  scores: number[]; holePars: number[]; totalHoles: number;
  playerName: string; currentHole?: number;
}) {
  const holes = holePars.slice(0, totalHoles);
  const gross = scores.reduce((a, b) => a + b, 0);
  const totalPar = holes.reduce((a, b) => a + b, 0);
  const cellSt: React.CSSProperties = { padding: '6px 3px', textAlign: 'center', borderRight: '1px solid var(--line)', minWidth: 28, fontSize: 11 };
  const stickyLabel: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, position: 'sticky', left: 0, zIndex: 2, background: 'var(--chip)', borderRight: '2px solid var(--line)', whiteSpace: 'nowrap', fontSize: 11 };

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as unknown as undefined }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 380 }}>
        <thead>
          <tr style={{ background: 'var(--green-dark)', color: 'white' }}>
            <th style={{ ...stickyLabel, background: 'var(--green-dark)', color: 'white', borderRight: '2px solid rgba(255,255,255,0.25)' }}>Hole</th>
            {holes.map((_, i) => (
              <th key={i} style={{
                ...cellSt,
                background: currentHole !== undefined && i === currentHole ? '#14532d' : 'var(--green-dark)',
                color: 'white', fontWeight: currentHole !== undefined && i === currentHole ? 800 : 600,
                borderBottom: currentHole !== undefined && i === currentHole ? '3px solid #4ade80' : undefined,
              }}>{i + 1}</th>
            ))}
            <th style={{ ...cellSt, background: '#166534', color: 'white', fontWeight: 700, borderLeft: '2px solid rgba(255,255,255,0.2)' }}>Tot</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: 'var(--ice-2)' }}>
            <td style={{ ...stickyLabel, color: 'var(--muted)', background: 'var(--ice-2)', fontWeight: 600 }}>Par</td>
            {holes.map((par, i) => <td key={i} style={{ ...cellSt }}>{par}</td>)}
            <td style={{ ...cellSt, fontWeight: 800, borderLeft: '2px solid var(--line)' }}>{totalPar}</td>
          </tr>
          <tr style={{ borderTop: '2px solid var(--green)' }}>
            <td style={{ ...stickyLabel, fontWeight: 800, fontSize: 12 }}>{playerName.split(' ')[0]}</td>
            {holes.map((par, i) => {
              const s = scores[i];
              const isActive = currentHole !== undefined && i === currentHole;
              if (s !== undefined) {
                const diff = s - par;
                const bg = diff <= -2 ? '#1d4ed8' : diff === -1 ? '#15803d' : diff === 0 ? 'transparent' : diff === 1 ? '#92400e' : '#991b1b';
                const color = diff === 0 ? 'var(--ink)' : 'white';
                return (
                  <td key={i} style={{ ...cellSt, padding: '3px 2px' }}>
                    <div style={{ width: 22, height: 22, margin: '0 auto', borderRadius: diff <= 0 ? '50%' : 3, background: bg, color, fontWeight: 700, fontSize: 11, display: 'grid', placeItems: 'center' }}>{s}</div>
                  </td>
                );
              }
              if (isActive) {
                return (
                  <td key={i} style={{ ...cellSt, background: 'rgba(21,128,61,0.1)' }}>
                    <div style={{ width: 22, height: 22, margin: '0 auto', border: '2px dashed var(--green)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 10, color: 'var(--green)', fontWeight: 700, animation: 'gpulse 1.4s infinite' }}>▼</div>
                  </td>
                );
              }
              return <td key={i} style={cellSt} />;
            })}
            <td style={{ ...cellSt, fontWeight: 800, fontSize: 13, borderLeft: '2px solid var(--line)' }}>{scores.length > 0 ? gross : ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
