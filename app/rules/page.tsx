import Link from 'next/link';

export default function RulesPage() {
  return (
    <div>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h2>How It Works</h2>
      </div>

      <div className="rules-grid" style={{ marginBottom: 32 }}>
        <div className="rule-card">
          <div className="rule-num">1</div>
          <h3>Join the League</h3>
          <p>
            Create a free player profile with your name and USGA Handicap Index.
            You can update your handicap any time from your profile page — it
            applies to all future rounds.
          </p>
        </div>
        <div className="rule-card">
          <div className="rule-num">2</div>
          <h3>Play &amp; Record</h3>
          <p>
            Play any 9 holes at a course in our directory (NY, MD, PA, VA).
            Select the tee you played from — White, Blue, or Black — enter your
            gross score, and submit. Up to <strong>4 rounds</strong> per calendar week (Mon–Sun).
          </p>
        </div>
        <div className="rule-card">
          <div className="rule-num">3</div>
          <h3>Your Best Score Counts</h3>
          <p>
            Of your 4 rounds, only your <strong>best net score</strong> counts toward
            that week&apos;s standings. No pressure — play more to improve your
            score, and the league automatically uses your lowest net.
          </p>
        </div>
        <div className="rule-card">
          <div className="rule-num">4</div>
          <h3>Net Scoring</h3>
          <p>
            Your <em>course handicap</em> adjusts for the course difficulty and tee selection.
            Net Score = Gross Score − Course Handicap. This equalizes competition
            between all skill levels.
          </p>
        </div>
        <div className="rule-card">
          <div className="rule-num">5</div>
          <h3>Weekly Standings</h3>
          <p>
            Standings update in real time after every round is recorded. Each week
            runs Monday through Sunday. Lower net score = better rank. Ties are
            broken by the number of rounds played.
          </p>
        </div>
        <div className="rule-card">
          <div className="rule-num">6</div>
          <h3>Course Directory</h3>
          <p>
            39 public courses across NY, MD, PA, and VA — all within 55 miles
            of your group&apos;s home zip codes. Each course lists White, Blue, and
            Black tees with official slope and course ratings.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Handicap Calculation</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div style={{ background: 'var(--chip)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)', marginBottom: 8 }}>
              Course HCP (9 holes)
            </div>
            <div style={{ fontSize: 20, fontFamily: 'var(--display)', fontWeight: 800, marginBottom: 6 }}>
              round(HI × Slope ÷ 113 ÷ 2)
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              HI = your Handicap Index<br />
              Slope = tee&apos;s slope rating<br />
              113 = standard slope
            </div>
          </div>
          <div style={{ background: 'var(--chip)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)', marginBottom: 8 }}>
              Net Score
            </div>
            <div style={{ fontSize: 20, fontFamily: 'var(--display)', fontWeight: 800, marginBottom: 6 }}>
              Gross − Course HCP
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Lower net score = better standing.<br />
              Your best net of the week counts.
            </div>
          </div>
          <div style={{ background: 'var(--chip)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)', marginBottom: 8 }}>
              Example
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
              HI = 12.0 · Slope = 120<br />
              Course HCP = round(12 × 120 ÷ 113 ÷ 2) = <strong>6</strong><br />
              Gross 47 → Net <strong>41</strong>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/join"><button className="btn">Join the League →</button></Link>
        <Link href="/courses"><button className="btn ghost">Browse Courses</button></Link>
        <Link href="/record"><button className="btn ghost">Record a Round</button></Link>
      </div>
    </div>
  );
}
