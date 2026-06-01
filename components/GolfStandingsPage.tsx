'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { League, StandingRow, SeasonStandingRow, WeeklyWinner } from '@/lib/golf-db';
import { weekLabel } from '@/lib/golf-scoring';
import LiveScoreboard from './LiveScoreboard';

interface Props {
  currentLeague: League;
  allLeagues: League[];
  initialStandings: StandingRow[];
  initialSeasonStandings: SeasonStandingRow[];
  weeklyWinners: WeeklyWinner[];
  stats: { playersWithRounds: number; totalRounds: number; totalPlayers: number };
  initialLabel: string;
}

type View = 'season' | number;

export default function GolfStandingsPage({
  currentLeague, allLeagues, initialStandings, initialSeasonStandings, weeklyWinners, stats, initialLabel,
}: Props) {
  const [view, setView] = useState<View>(currentLeague.id);
  const [weekStandings, setWeekStandings] = useState<StandingRow[]>(initialStandings);
  const [weekLabel_, setWeekLabel] = useState(initialLabel);
  const [seasonStandings, setSeasonStandings] = useState<SeasonStandingRow[]>(initialSeasonStandings);
  const [loading, setLoading] = useState(false);

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

  async function switchToSeason() {
    if (view === 'season') return;
    setLoading(true);
    setView('season');
    const res = await fetch('/api/standings?season=true');
    const data = await res.json();
    setSeasonStandings(data.standings);
    setLoading(false);
  }

  const isSeason = view === 'season';
  const topSeason = seasonStandings.find(r => r.points > 0);

  return (
    <>
      <section className="hero">
        <span className="hero-tag"><span className="pulse-dot" /> Live Standings</span>
        <h1 style={{ marginTop: 14 }}>
          Weekly<br /><span className="accent">Golf League</span> <span style={{ fontSize: '0.7em' }}>🌭</span>
        </h1>
        <p className="hero-sub">
          9-hole stroke play, handicap-adjusted net scoring. Up to 4 rounds per week —
          your best net score counts. Points accumulate all season.
        </p>
        <div className="hero-stats">
          <div className="stat-pill"><div className="k">{stats.totalPlayers}</div><div className="l">Players</div></div>
          <div className="stat-pill"><div className="k">{stats.totalRounds}</div><div className="l">Rounds this week</div></div>
          {topSeason && <div className="stat-pill"><div className="k">{topSeason.points}</div><div className="l">Season leader pts</div></div>}
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/live"><button className="btn" style={{ flex: '1 1 auto' }}>⛳ On Course</button></Link>
          <Link href="/record" style={{ flex: '1 1 auto' }}><button className="btn ghost" style={{ width: '100%' }}>+ Record a Round</button></Link>
        </div>
      </section>

      <LiveScoreboard />

      {/* Weekly Champions shelf */}
      {weeklyWinners.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ marginBottom: 10 }}>
            <h2>🏆 Weekly Champions</h2>
            <span className="tag green">{weeklyWinners.length} week{weeklyWinners.length !== 1 ? 's' : ''} played</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {weeklyWinners.map(w => (
              <div key={w.league.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', background: 'var(--ice-2)',
                border: '1.5px solid var(--line)', borderRadius: 'var(--radius)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--green-dark)', color: 'white',
                  display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0,
                }}>
                  🥇
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{w.player.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{weekLabel(w.league.start_date)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--green)' }}>
                    {w.net} net
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>+{w.pointsAwarded} pts</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>{isSeason ? 'Season Standings' : weekLabel_}</h2>
          <span className="tag green">{isSeason ? '2026 Season' : view === currentLeague.id ? 'This Week' : 'Past Week'}</span>
        </div>

        <div className="week-selector">
          {allLeagues.map(l => (
            <button
              key={l.id}
              className={`week-pill ${view === l.id ? 'active' : ''}`}
              onClick={() => switchToWeek(l.id)}
            >
              {l.id === currentLeague.id ? '⛳ This Week' : weekLabel(l.start_date)}
            </button>
          ))}
          <button className={`week-pill ${isSeason ? 'active' : ''}`} onClick={switchToSeason}>
            Season Pts
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : isSeason ? (
          <SeasonTable standings={seasonStandings} />
        ) : weekStandings.every(r => r.roundsPlayed === 0) ? (
          <div className="empty-state">
            No rounds yet this week — <Link href="/live" style={{ color: 'var(--green)' }}>get on course</Link> to start.
          </div>
        ) : (
          <WeekTable standings={weekStandings} />
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
        Season points: 1st=10 · 2nd=7 · 3rd=5 · 4th=4 · 5th=3 · 6th=2 · 7th+=1 &nbsp;|&nbsp;
        Net = Gross − Course Handicap (9 holes)
      </div>
    </>
  );
}

function SeasonTable({ standings }: { standings: SeasonStandingRow[] }) {
  if (standings.every(r => r.points === 0)) {
    return (
      <div className="empty-state">
        No rounds recorded yet — <Link href="/record" style={{ color: 'var(--green)' }}>record a round</Link> to start the season.
      </div>
    );
  }

  return (
    <div className="lb">
      <div className="th">Rank</div>
      <div className="th">Player</div>
      <div className="th">Points</div>
      <div className="th col-hcp">Weeks</div>
      <div className="th col-rounds">Rounds</div>
      <div className="th col-course"></div>

      {standings.map((row, i) => (
        <div key={row.player.id} className={`row ${i === 0 && row.points > 0 ? 'top1' : i === 1 && row.points > 0 ? 'top2' : i === 2 && row.points > 0 ? 'top3' : ''}`}>
          <div className="td">
            <div className={`rank-badge ${row.points === 0 ? 'no-score' : i === 0 ? 'rank1' : i === 1 ? 'rank2' : i === 2 ? 'rank3' : ''}`}>
              {row.rank}
            </div>
          </div>
          <div className="td">
            <div className="name-cell">
              <Link href={`/player/${row.player.id}`} className="n" style={{ color: 'inherit' }}>
                {row.player.name}
              </Link>
            </div>
          </div>
          <div className="td">
            {row.points > 0
              ? <span className="net-score">{row.points} pts</span>
              : <span className="net-score none">no rounds</span>}
          </div>
          <div className="td col-hcp">
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{row.weeksPlayed}</span>
          </div>
          <div className="td col-rounds">
            <span style={{ fontWeight: 600 }}>{row.totalRounds}</span>
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
