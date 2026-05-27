export default function RulesPage() {
  const rules = [
    {
      t: 'Join the League',
      b: 'Register with your name and USGA Handicap Index (0–54). Your handicap adjusts your score so players of all skill levels compete fairly.',
    },
    {
      t: 'Play 9 Holes',
      b: 'Record up to 4 rounds per week at any public course in the directory. Only your best net score from that week counts toward standings.',
    },
    {
      t: 'Net Scoring',
      b: 'Your Course Handicap for 9 holes is calculated from your Handicap Index and the tee\'s slope rating. Subtract it from your gross score to get your net score. Lower net is better.',
    },
    {
      t: 'Weekly Points',
      b: 'At the end of each week, players are ranked by their best net score. The top finishers earn points: 1st gets 10, 2nd gets 7, and so on. Everyone who plays earns at least 1 point.',
    },
    {
      t: 'Season Standings',
      b: 'Points accumulate all season — the leaderboard never resets between weeks. Play consistently to climb the standings and stay on top through the year.',
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
