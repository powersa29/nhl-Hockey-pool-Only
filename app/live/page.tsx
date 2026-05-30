'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Player, Course, Tee } from '@/lib/golf-db';
import type { LivePin } from '@/components/GolfMap';

const GolfMap = dynamic(() => import('@/components/GolfMap'), { ssr: false });

type CourseWithTees = Course & { tees: Tee[] };

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

const POLL_MS   = 12_000; // refresh live pins every 12s
const UPDATE_MS = 15_000; // push our location every 15s

export default function LivePage() {
  const [players, setPlayers]   = useState<Player[]>([]);
  const [courses, setCourses]   = useState<CourseWithTees[]>([]);
  const [liveList, setLiveList] = useState<LiveLocation[]>([]);

  const [playerId, setPlayerId] = useState('');
  const [courseId, setCourseId] = useState('');

  const [sharing, setSharing]     = useState(false);
  const [geoError, setGeoError]   = useState('');
  const [starting, setStarting]   = useState(false);

  const watchIdRef   = useRef<number | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPos      = useRef<{ lat: number; lng: number } | null>(null);

  // ── Load players, courses, live list ───────────────────────────────────
  useEffect(() => {
    fetch('/api/players').then(r => r.json()).then(setPlayers);
    fetch('/api/courses').then(r => r.json()).then(setCourses);
    pollLive();
    pollTimerRef.current = setInterval(pollLive, POLL_MS);
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, []);

  async function pollLive() {
    const data = await fetch('/api/live').then(r => r.json()).catch(() => []);
    setLiveList(data);
  }

  // ── Cleanup on unmount / page leave ────────────────────────────────────
  useEffect(() => {
    const stop = () => { if (sharing && playerId) stopSharing(); };
    window.addEventListener('beforeunload', stop);
    return () => window.removeEventListener('beforeunload', stop);
  }, [sharing, playerId]);

  // ── Push location to server ─────────────────────────────────────────────
  async function pushLocation(lat: number, lng: number) {
    const player = players.find(p => p.id === Number(playerId));
    const course = courses.find(c => c.id === Number(courseId));
    await fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id:   Number(playerId),
        player_name: player?.name ?? '',
        course_id:   course?.id ?? null,
        course_name: course?.name ?? '',
        lat, lng,
      }),
    });
    pollLive();
  }

  // ── Start sharing ───────────────────────────────────────────────────────
  async function startSharing() {
    if (!playerId) { setGeoError('Select your name first.'); return; }
    setStarting(true);
    setGeoError('');

    if (!navigator.geolocation) {
      setGeoError('Your browser does not support GPS location.');
      setStarting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        lastPos.current = { lat, lng };
        await pushLocation(lat, lng);
        setSharing(true);
        setStarting(false);

        // Watch position for live updates
        watchIdRef.current = navigator.geolocation.watchPosition(
          p => { lastPos.current = { lat: p.coords.latitude, lng: p.coords.longitude }; },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000 },
        );

        // Send position on interval
        sendTimerRef.current = setInterval(() => {
          if (lastPos.current) pushLocation(lastPos.current.lat, lastPos.current.lng);
        }, UPDATE_MS);
      },
      err => {
        setGeoError(
          err.code === 1
            ? 'Location permission denied. Enable it in your browser settings.'
            : 'Could not get your location. Try again.'
        );
        setStarting(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  // ── Stop sharing ────────────────────────────────────────────────────────
  async function stopSharing() {
    if (sendTimerRef.current) { clearInterval(sendTimerRef.current); sendTimerRef.current = null; }
    if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (playerId) await fetch(`/api/live?playerId=${playerId}`, { method: 'DELETE' });
    setSharing(false);
    pollLive();
  }

  const pins: LivePin[] = liveList.map(l => ({
    player_id:   l.player_id,
    player_name: l.player_name,
    lat:         l.lat,
    lng:         l.lng,
    course_id:   l.course_id,
  }));

  const selectedCourse = courses.find(c => c.id === Number(courseId));

  function timeAgo(ts: string) {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Follow My Round 📍</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Opt in to share your GPS so the group can see you on the course.
          </p>
        </div>
        {liveList.length > 0 && (
          <span className="tag green">
            <span className="pulse-dot" style={{ background: 'white' }} />
            {liveList.length} live now
          </span>
        )}
      </div>

      {/* Map */}
      <div style={{ marginBottom: 20, border: '2px solid var(--green-dark)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        <GolfMap
          liveLocations={pins}
          height={380}
        />
      </div>

      <div className="live-grid">

        {/* Share card */}
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>
            {sharing ? '📍 Sharing your location' : 'Share your location'}
          </h3>

          {sharing ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span className="pulse-dot" style={{ width: 10, height: 10, background: 'var(--green)', display: 'inline-block', borderRadius: '50%' }} />
                <span style={{ fontSize: 14 }}>
                  Live as <strong>{players.find(p => p.id === Number(playerId))?.name}</strong>
                  {selectedCourse && <> at <strong>{selectedCourse.name}</strong></>}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                Your location updates every 15 seconds. Others can see your position on the map above.
              </p>
              <button className="btn danger" onClick={stopSharing}>
                Stop Sharing
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label>Your name</label>
                <select className="select" value={playerId} onChange={e => setPlayerId(e.target.value)} style={{ marginTop: 6 }}>
                  <option value="">— Select your name —</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label>Course you&apos;re playing (optional)</label>
                <select className="select" value={courseId} onChange={e => setCourseId(e.target.value)} style={{ marginTop: 6 }}>
                  <option value="">— Select course —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name} — {c.state}</option>)}
                </select>
              </div>
              {geoError && <div className="error-banner" style={{ marginTop: 0 }}>⚠️ {geoError}</div>}
              <button className="btn" onClick={startSharing} disabled={starting || !playerId}>
                {starting ? 'Getting location…' : '📍 Start Sharing'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                Your browser will ask for location permission. Location is only shared while this page is open.
              </p>
            </div>
          )}
        </div>

        {/* Live now card */}
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Live now</h3>
          {liveList.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              No one is sharing right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {liveList.map((l, i) => (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: 'var(--ice-2)',
                  border: '1.5px solid var(--line)', borderRadius: 'var(--radius)',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: ['#15803d','#1d4ed8','#b45309','#7c3aed','#dc2626','#0891b2'][i % 6],
                    color: 'white', display: 'grid', placeItems: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {l.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.player_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {l.course_name || 'Unknown course'} · {timeAgo(l.updated_at)}
                    </div>
                  </div>
                  <span className="pulse-dot" style={{ width: 8, height: 8, background: 'var(--green)', display: 'inline-block', borderRadius: '50%', animation: 'gpulse 1.4s infinite', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        Location is only visible while your browser has this page open and you have sharing enabled.
        Updates every ~15 seconds. Disappears automatically after 30 minutes of inactivity.
      </p>
    </div>
  );
}
