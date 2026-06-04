'use client';

'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { League, StandingRow, WeeklyWinner } from '@/lib/golf-db';
import { weekLabel } from '@/lib/golf-scoring';
import LiveScoreboard from './LiveScoreboard';
import { NotifyRow } from './NotifyBell';
import { GolfPin, TrophyCup, Medal } from './icons';

interface Props {
  currentLeague: League;
  allLeagues: League[];
  initialStandings: StandingRow[];
  weeklyWinners: WeeklyWinner[];
  stats: { playersWithRounds: number; totalRounds: number; totalPlayers: number };
  initialLabel: string;
}

export default function GolfStandingsPage({
  currentLeague, allLeagues, initialStandings, weeklyWinners, stats, initialLabel,
}: Props) {
  const [view, setView]           = useState<number>(currentLeague.id);
  const [weekStandings, setWeekStandings] = useState<StandingRow[]>(initialStandings);
  const [weekLabel_, setWeekLabel] = useState(initialLabel);
  const [loading, setLoading]     = useState(false);

  async function switchToWeek(leagueId: number) {
    if (view === leagueId) return;
    setLoading(true);
    setView(leagueId);
    const res = await fetch(`/api/standings?leagueId=${leagueId}`);
    const data = await res.json();
    setWeekStandings(data.standings);
    setWeekLabel(data.label);
    setLoading(false);
  }

  const topWinner = weeklyWinners[0];

  return (
    <>
      <section className="hero">
        <span className="hero-tag"><span className="pulse-dot" /> Live Standings</span>
        <h1 style={{ marginTop: 14 }}>
          Weekly<br /><span className="accent">Golf League</span>
        </h1>
        <p className="hero-sub">
          9-hole stroke play, handicap-adjusted net scoring. Up to 4 rounds per week —
          your best net score counts.
        </p>
        <div className="hero-stats">
          <div className="stat-pill"><div className="k">{stats.totalPlayers}</div><div className="l">Players</div></div>
          <div className="stat-pill"><div className="k">{stats.totalRounds}</div><div className="l">Rounds this week</div></div>
          {topWinner && (
            <div className="stat-pill">
              <div className="k">{weeklyWinners.length}</div>
              <div className="l">Weeks played</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/live"><button className="btn" style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', gap: 7 }}><GolfPin size={16} color="white" /> On Course</button></Link>
          <Link href="/record" style={{ flex: '1 1 auto' }}><button className="btn ghost" style={{ width: '100%' }}>+ Record a Round</button></Link>
        </div>
      </section>

      <LiveScoreboard />

      {/* Weekly Champions */}
      {weeklyWinners.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ marginBottom: 10 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrophyCup size={20} color="var(--gold)" /> Weekly Champions</h2>
            <span className="tag green">{weeklyWinners.length} week{weeklyWinners.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {weeklyWinners.map((w, i) => (
              <div key={w.league.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', background: 'var(--ice-2)',
                border: `1.5px solid ${i === 0 ? 'var(--green)' : 'var(--line)'}`,
                borderRadius: 'var(--radius)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: i === 0 ? 'var(--green-dark)' : 'var(--chip)',
                  color: i === 0 ? 'white' : 'var(--muted)',
                  display: 'grid', placeItems: 'center', fontSize: i === 0 ? 16 : 13,
                  fontWeight: 800, flexShrink: 0,
                }}>
                  {i <= 2
                    ? <Medal rank={(i + 1) as 1 | 2 | 3} size={28} />
                    : <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, color: 'var(--muted)' }}>{i + 1}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{w.player.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{weekLabel(w.league.start_date)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--green)' }}>{w.net} net</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{w.gross} gross</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly leaderboard */}
      <div className="card">
        <div className="card-header">
          <h2>{weekLabel_}</h2>
          <span className="tag green">{view === currentLeague.id ? 'This Week' : 'Past Week'}</span>
        </div>

        <div className="week-selector">
          {allLeagues.map(l => (
            <button
              key={l.id}
              className={`week-pill ${view === l.id ? 'active' : ''}`}
              onClick={() => switchToWeek(l.id)}
            >
              {l.id === currentLeague.id
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><GolfPin size={13} color="currentColor" /> This Week</span>
                : weekLabel(l.start_date)
              }
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : weekStandings.every(r => r.roundsPlayed === 0) ? (
          <div className="empty-state">
            No rounds yet this week — <Link href="/live" style={{ color: 'var(--green)' }}>get on course</Link> to start.
          </div>
        ) : (
          <WeekTable standings={weekStandings} />
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <NotifyRow />
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
        Net = Gross − Course Handicap (9 holes)
      </div>
    </>
  );
}

function WeekTable({ standings }: { standings: StandingRow[] }) {
  return (
    <div className="lb">
      <div className="th">Rank</div>
      <div className="th">Player</div>
      <div className="th">Best Net</div>
      <div className="th col-hcp">Handicap</div>
      <div className="th col-rounds">Rounds</div>
      <div className="th col-course"></div>

      {standings.map((row, i) => (
        <div key={row.player.id} className={`row ${i === 0 && row.bestNet !== null ? 'top1' : i === 1 && row.bestNet !== null ? 'top2' : i === 2 && row.bestNet !== null ? 'top3' : ''}`}>
          <div className="td">
            <div className={`rank-badge ${row.bestNet === null ? 'no-score' : i === 0 ? 'rank1' : i === 1 ? 'rank2' : i === 2 ? 'rank3' : ''}`}>
              {row.rank}
            </div>
          </div>
          <div className="td">
            <div className="name-cell">
              <Link href={`/player/${row.player.id}`} className="n" style={{ color: 'inherit' }}>
                {row.player.name}
              </Link>
              {row.rounds.length > 0 && row.rounds[0].golf_courses && (
                <span className="sub">{row.rounds[0].golf_courses.name}</span>
              )}
            </div>
          </div>
          <div className="td">
            {row.bestNet !== null
              ? <span className="net-score">{row.bestNet}</span>
              : <span className="net-score none">no rounds</span>}
          </div>
          <div className="td col-hcp">
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{row.player.handicap_index.toFixed(1)}</span>
          </div>
          <div className="td col-rounds">
            <span style={{ color: row.roundsPlayed >= 4 ? 'var(--green)' : 'var(--ink)', fontWeight: 600 }}>
              {row.roundsPlayed}/4
            </span>
          </div>
          <div className="td col-course">
            <Link href={`/player/${row.player.id}`}>
              <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }}>View</button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
