export default function RulesPage() {
  const rules = [
    {
      t: 'Play up to 4 rounds a week',
      b: 'Record as many rounds as you want each week, up to 4. Play different courses, different tees — it all counts.',
    },
    {
      t: 'We take your best score',
      b: 'Only your best net score from that week goes into the standings. Play more rounds for more chances at a great score.',
    },
    {
      t: 'Points accumulate all season',
      b: 'Weekly finishes earn points that stack up all year long. The leaderboard never resets — play consistently to stay on top.',
    },
  ];

  const points = [
    { place: '1st', pts: 10 },
    { place: '2nd', pts: 7 },
    { place: '3rd', pts: 5 },
    { place: '4th', pts: 4 },
    { place: '5th', pts: 3 },
    { place: '6th', pts: 2 },
    { place: '7th+', pts: 1 },
  ];

  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2>How It Works</h2>
        </div>
        <div className="rules-grid">
          {rules.map((r, i) => (
            <div key={i} className="rule-card">
              <div className="rule-num">{i + 1}</div>
              <h3>{r.t}</h3>
              <p>{r.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2>Weekly Points</h2>
        </div>
        <div className="scoring-grid">
          {points.map((p, i) => (
            <div key={i} className="score-card">
              <div className="n">+{p.pts}</div>
              <div className="l">{p.place} place</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Handicap Formula</h2>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--ink)' }}>
          <p style={{ marginBottom: 12 }}>
            <strong>Course Handicap (9 holes)</strong> = round(Handicap Index × Slope Rating ÷ 113 ÷ 2)
          </p>
          <p style={{ marginBottom: 12 }}>
            <strong>Net Score</strong> = Gross Score − Course Handicap
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Slope Rating and Course Rating for each tee set are listed in the Course Directory.
            Your handicap is applied automatically when you record a round — just enter your gross score.
          </p>
        </div>
      </section>
    </>
  );
}
