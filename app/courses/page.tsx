'use client';

import { useState, useEffect } from 'react';
import type { Course, Tee } from '@/lib/golf-db';

type CourseWithTees = Course & { tees: Tee[] };

const STATES = ['NY', 'MD', 'PA', 'VA'];
const STATE_LABELS: Record<string, string> = {
  NY: 'New York (near Buffalo)',
  MD: 'Maryland (near White Hall / Baltimore)',
  PA: 'Pennsylvania (near York / Gettysburg)',
  VA: 'Virginia (near Midlothian / Richmond)',
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithTees[]>([]);
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(setCourses);
  }, []);

  const q = search.toLowerCase();
  const filtered = courses.filter(c =>
    (stateFilter === '' || c.state === stateFilter) &&
    (q === '' || c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q))
  );

  const grouped: Record<string, CourseWithTees[]> = {};
  for (const c of filtered) {
    if (!grouped[c.state]) grouped[c.state] = [];
    grouped[c.state].push(c);
  }

  return (
    <div>
      <div className="section-header">
        <h2>Course Directory</h2>
        <span className="tag green">{courses.length} courses</span>
      </div>
      <p style={{ marginBottom: 20, color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.6 }}>
        Public courses within 55 miles of Buffalo NY (14225), White Hall MD (21161), and Midlothian VA (23112).
        Each course lists White, Blue, and Black tee options with slope and course ratings.
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
          outline: 'none',
        }}
      />

      <div className="state-tabs">
        <button className={`state-tab ${stateFilter === '' ? 'active' : ''}`} onClick={() => setStateFilter('')}>
          All States
        </button>
        {STATES.map(s => (
          <button key={s} className={`state-tab ${stateFilter === s ? 'active' : ''}`} onClick={() => setStateFilter(s)}>
            {s} ({courses.filter(c => c.state === s).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">No courses match "{search}"</div>
      )}

      {Object.entries(grouped).map(([state, list]) => (
        <div key={state} style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 12, fontSize: 16, color: 'var(--green-dark)' }}>
            {STATE_LABELS[state] ?? state}
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
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
                      Slope/rating data is for 9-hole play. Course handicap = round(Handicap Index × Slope ÷ 113 ÷ 2).
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
