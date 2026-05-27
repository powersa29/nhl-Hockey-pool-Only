'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Course, Tee } from '@/lib/golf-db';

type CourseWithTees = Course & { tees: Tee[] };

const STATE_LABELS: Record<string, string> = {
  NY: 'New York',
  MD: 'Maryland',
  PA: 'Pennsylvania',
  VA: 'Virginia',
};

interface TeeInput {
  tee_name: string;
  slope_rating: string;
  course_rating: string;
  yards_9: string;
}

interface CourseHit { name: string; city: string; state: string; }

const DEFAULT_TEES: TeeInput[] = [
  { tee_name: 'White', slope_rating: '', course_rating: '', yards_9: '' },
  { tee_name: 'Blue',  slope_rating: '', course_rating: '', yards_9: '' },
  { tee_name: 'Black', slope_rating: '', course_rating: '', yards_9: '' },
];

function blankTee(): TeeInput { return { tee_name: '', slope_rating: '', course_rating: '', yards_9: '' }; }

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithTees[]>([]);
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [fName, setFName] = useState('');
  const [fCity, setFCity] = useState('');
  const [fState, setFState] = useState('');
  const [fTees, setFTees] = useState<TeeInput[]>(DEFAULT_TEES.map(t => ({ ...t })));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Course lookup state
  const [lookupQ, setLookupQ] = useState('');
  const [lookupHits, setLookupHits] = useState<CourseHit[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadCourses() {
    const data = await fetch('/api/courses').then(r => r.json());
    setCourses(data);
  }

  useEffect(() => { loadCourses(); }, []);

  // Debounced course lookup
  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (lookupQ.length < 3) { setLookupHits([]); return; }
    lookupTimer.current = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const res = await fetch(`/api/courses/search?q=${encodeURIComponent(lookupQ)}`);
        const hits: CourseHit[] = await res.json();
        setLookupHits(hits);
      } catch { setLookupHits([]); }
      setLookupLoading(false);
    }, 400);
  }, [lookupQ]);

  function selectHit(hit: CourseHit) {
    setFName(hit.name);
    setFCity(hit.city);
    setFState(hit.state);
    setLookupQ('');
    setLookupHits([]);
  }

  function openForm() {
    setFName(''); setFCity(''); setFState('');
    setFTees(DEFAULT_TEES.map(t => ({ ...t })));
    setFormError('');
    setLookupQ('');
    setLookupHits([]);
    setShowForm(true);
  }

  function updateTee(i: number, field: keyof TeeInput, val: string) {
    setFTees(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!fName.trim() || !fCity.trim() || !fState.trim()) {
      setFormError('Course name, city, and state are required.'); return;
    }
    if (fState.trim().length !== 2) {
      setFormError('State must be a 2-letter code (e.g. NY, VA).'); return;
    }
    const validTees = fTees.filter(t => t.tee_name.trim() && t.slope_rating && t.course_rating);
    if (!validTees.length) {
      setFormError('At least one tee with name, slope, and rating is required.'); return;
    }
    if (validTees.some(t => Number(t.slope_rating) < 55 || Number(t.slope_rating) > 155)) {
      setFormError('Slope rating must be between 55 and 155.'); return;
    }
    if (validTees.some(t => Number(t.course_rating) < 20 || Number(t.course_rating) > 50)) {
      setFormError('Course rating should be a 9-hole value between 20.0 and 50.0.'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fName, city: fCity, state: fState, tees: validTees }),
      });
      if (!res.ok) {
        const j = await res.json();
        setFormError(j.error ?? 'Failed to add course.');
        setSubmitting(false);
        return;
      }
      await loadCourses();
      setShowForm(false);
    } catch {
      setFormError('Network error — please try again.');
    }
    setSubmitting(false);
  }

  const q = search.toLowerCase();
  const filtered = courses.filter(c =>
    (stateFilter === '' || c.state === stateFilter) &&
    (q === '' || c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q))
  );

  const stateList = useMemo(() => [...new Set(courses.map(c => c.state))].sort(), [courses]);

  const grouped: Record<string, CourseWithTees[]> = {};
  for (const c of filtered) {
    if (!grouped[c.state]) grouped[c.state] = [];
    grouped[c.state].push(c);
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 style={{ marginBottom: 4 }}>Course Directory</h2>
          <span className="tag green">{courses.length} courses</span>
        </div>
        <button className="btn" onClick={openForm} style={{ flexShrink: 0 }}>
          + Add Course
        </button>
      </div>

      <p style={{ marginBottom: 20, color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.6 }}>
        Courses added by league members. Click a course to see tee details.
        Don&apos;t see your course? Add it with the button above.
      </p>

      <input
        type="search"
        placeholder="Search by course or city name…"
        value={search}
        onChange={e => { setSearch(e.target.value); setExpandedId(null); }}
        style={{
          width: '100%', padding: '10px 14px', marginBottom: 16,
          border: '1.5px solid var(--line)', borderRadius: 'var(--radius)',
          background: 'var(--ice-2)', color: 'var(--ink)', fontSize: 14,
          outline: 'none', boxSizing: 'border-box',
        }}
      />

      <div className="state-tabs">
        <button className={`state-tab ${stateFilter === '' ? 'active' : ''}`} onClick={() => setStateFilter('')}>
          All ({courses.length})
        </button>
        {stateList.map(s => (
          <button key={s} className={`state-tab ${stateFilter === s ? 'active' : ''}`} onClick={() => setStateFilter(s)}>
            {s} ({courses.filter(c => c.state === s).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 && search && (
        <div className="empty-state">No courses match &quot;{search}&quot;</div>
      )}

      {Object.entries(grouped).map(([state, list]) => (
        <div key={state} style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 12, fontSize: 16, color: 'var(--green-dark)' }}>
            {STATE_LABELS[state] ? `${STATE_LABELS[state]} (${state})` : state}
          </h3>
          <div className="course-list">
            {list.map(course => (
              <div key={course.id}>
                <div
                  className={`course-row ${expandedId === course.id ? 'selected' : ''}`}
                  onClick={() => setExpandedId(expandedId === course.id ? null : course.id)}
                >
                  <div>
                    <div className="cr-name">{course.name}</div>
                    <div className="cr-loc">{course.city}, {course.state}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {course.tees.map(t => (
                      <span key={t.id} className="tag gray" style={{ fontSize: 10 }}>
                        {t.tee_name[0]} {t.slope_rating}
                      </span>
                    ))}
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {expandedId === course.id ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {expandedId === course.id && (
                  <div style={{
                    background: 'var(--ice-2)', border: '1.5px solid var(--line)',
                    borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)',
                    padding: '16px',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                      {course.tees.map(t => (
                        <div key={t.id} className={`tee-btn ${t.tee_name.toLowerCase()}`}
                          style={{ cursor: 'default', background: 'var(--chip)' }}>
                          <div className="tee-name">{t.tee_name} Tees</div>
                          <div className="tee-info">
                            <strong>Slope:</strong> {t.slope_rating}<br />
                            <strong>Rating:</strong> {t.course_rating}<br />
                            {t.yards_9 && <><strong>Yards (9):</strong> {t.yards_9.toLocaleString()}</>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>
                      Ratings are for 9-hole play. Course handicap = round(HI × Slope ÷ 113 ÷ 2).
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── Add Course Modal ───────────────────────────────────────────── */}
      {showForm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            zIndex: 1000, padding: '24px 16px', overflowY: 'auto',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div style={{
            background: 'var(--paper)', borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: 580,
            padding: '28px 28px 24px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Add a Course</h2>
              <button onClick={() => setShowForm(false)} style={closeBtnStyle}>×</button>
            </div>

            {/* Course search / lookup */}
            <div style={{
              background: 'color-mix(in oklab, var(--green) 8%, var(--paper))',
              border: '1.5px solid var(--green)',
              borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 22, position: 'relative',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-dark)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Search nationwide to pre-fill
              </div>
              <input
                type="search"
                placeholder="Type a course name (e.g. Pinehurst, Augusta)…"
                value={lookupQ}
                onChange={e => setLookupQ(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
                  border: '1.5px solid var(--line)', borderRadius: 'var(--radius)',
                  background: 'var(--paper)', color: 'var(--ink)', fontSize: 14, outline: 'none',
                }}
              />
              {lookupLoading && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Searching…</div>
              )}
              {lookupHits.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4,
                  background: 'var(--paper)', border: '1.5px solid var(--line)',
                  borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                }}>
                  {lookupHits.map((hit, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectHit(hit)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px', background: 'none', border: 'none',
                        borderBottom: i < lookupHits.length - 1 ? '1px solid var(--line)' : 'none',
                        cursor: 'pointer', fontSize: 13,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ice-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <span style={{ fontWeight: 600 }}>{hit.name}</span>
                      <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{hit.city}{hit.city && hit.state ? ', ' : ''}{hit.state}</span>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                Selects name, city, and state. You&apos;ll still enter slope &amp; rating from your scorecard.
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Course basics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                <label style={labelStyle}>
                  Course Name <Required />
                  <input
                    className="input" type="text" required
                    placeholder="e.g. Birkdale Golf Course"
                    value={fName} onChange={e => setFName(e.target.value)}
                    style={{ marginTop: 6 }}
                  />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px', gap: 12 }}>
                  <label style={labelStyle}>
                    City <Required />
                    <input
                      className="input" type="text" required
                      placeholder="e.g. Midlothian"
                      value={fCity} onChange={e => setFCity(e.target.value)}
                      style={{ marginTop: 6 }}
                    />
                  </label>
                  <label style={labelStyle}>
                    State <Required />
                    <input
                      className="input" type="text" required maxLength={2}
                      placeholder="VA"
                      value={fState}
                      onChange={e => setFState(e.target.value.toUpperCase())}
                      style={{ marginTop: 6, textTransform: 'uppercase' }}
                    />
                  </label>
                </div>
              </div>

              {/* Tees */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 15 }}>Tees</h3>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Enter 9-hole slope &amp; rating (from your scorecard)</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {fTees.map((tee, i) => (
                    <div key={i} style={{
                      background: 'var(--ice-2)', border: '1.5px solid var(--line)',
                      borderRadius: 'var(--radius)', padding: '12px 14px 10px',
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 68px 78px 78px', gap: 8, alignItems: 'end' }}>
                        <label style={labelStyle}>
                          Tee Color / Name
                          <input
                            className="input" type="text"
                            placeholder="White"
                            value={tee.tee_name}
                            onChange={e => updateTee(i, 'tee_name', e.target.value)}
                            style={{ marginTop: 4 }}
                          />
                        </label>
                        <label style={labelStyle}>
                          Slope
                          <input
                            className="input" type="number" min="55" max="155"
                            placeholder="113"
                            value={tee.slope_rating}
                            onChange={e => updateTee(i, 'slope_rating', e.target.value)}
                            style={{ marginTop: 4 }}
                          />
                        </label>
                        <label style={labelStyle}>
                          Rating (9-hole)
                          <input
                            className="input" type="number" min="20" max="50" step="0.1"
                            placeholder="34.5"
                            value={tee.course_rating}
                            onChange={e => updateTee(i, 'course_rating', e.target.value)}
                            style={{ marginTop: 4 }}
                          />
                        </label>
                        <label style={labelStyle}>
                          Yards
                          <input
                            className="input" type="number" min="1000" max="5000"
                            placeholder="opt."
                            value={tee.yards_9}
                            onChange={e => updateTee(i, 'yards_9', e.target.value)}
                            style={{ marginTop: 4 }}
                          />
                        </label>
                      </div>
                      {fTees.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFTees(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', padding: 0 }}
                        >
                          − Remove this tee
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setFTees(prev => [...prev, blankTee()])}
                  className="btn ghost"
                  style={{ marginTop: 10, fontSize: 13, padding: '8px 14px', width: '100%' }}
                >
                  + Add Another Tee
                </button>
              </div>

              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                Slope and rating are printed on your scorecard or at <strong>USGA.org</strong>.
                If you only have 18-hole ratings, divide the course rating by 2 — slope stays the same.
              </p>

              {formError && (
                <div style={{
                  background: 'color-mix(in oklab, #dc2626 10%, transparent)',
                  border: '1px solid #dc2626', borderRadius: 'var(--radius)',
                  padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16,
                }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn ghost" onClick={() => setShowForm(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? 'Adding…' : 'Add Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Required() {
  return <span style={{ color: '#dc2626' }}> *</span>;
}

const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 22, color: 'var(--muted)', lineHeight: 1, padding: '2px 6px',
};

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
  fontSize: 12, fontWeight: 600, color: 'var(--muted)',
};
