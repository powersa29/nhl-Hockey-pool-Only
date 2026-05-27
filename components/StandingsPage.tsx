'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { League, StandingRow } from '@/lib/golf-db';
import { weekLabel, netScore } from '@/lib/golf-scoring';

interface Props {
  currentLeague: League;
  allLeagues: League[];
  initialStandings: StandingRow[];
  stats: { playersWithRounds: number; totalRounds: number; totalPlayers: number };
  initialLabel: string;
}

export default function StandingsPage({
  currentLeague,
  allLeagues,
  initialStandings,
  stats,
  initialLabel,
}: Props) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<number>(currentLeague.id);
  const [standings, setStandings] = useState<StandingRow[]>(initialStandings);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState(initialLabel);

  async function switchLeague(id: number) {
    if (id === selectedLeagueId) return;
    setLoading(true);
    setSelectedLeagueId(id);
    const res = await fetch(`/api/standings?leagueId=${id}`);
    const data = await res.json();
    setStandings(data.standings);
    setLabel(data.label);
    setLoading(false);
  }

  const leader = standings.find(r => r.bestNet !== null);

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
          <div className="stat-pill">
            <div className="k">{stats.totalPlayers}</div>
            <div className="l">Players</div>
          </div>
          <div className="stat-pill">
            <div className="k">{stats.totalRounds}</div>
            <div className="l">Rounds this week</div>
          </div>
          {leader && (
            <div className="stat-pill">
              <div className="k">{leader.bestNet}</div>
              <div className="l">Leading net score</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/record"><button className="btn">+ Record a Round</button></Link>
          <Link href="/join"><button className="btn ghost">Join the League</button></Link>
        </div>
      </section>

      <div className="card">
        <div className="card-header">
          <h2>Standings</h2>
          <span className="tag green">{label}</span>
        </div>

        {allLeagues.length > 1 && (
          <div className="week-selector">
            {allLeagues.map(l => (
              <button
                key={l.id}
                className={`week-pill ${l.id === selectedLeagueId ? 'active' : ''}`}
                onClick={() => switchLeague(l.id)}
              >
                {weekLabel(l.start_date)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : standings.length === 0 ? (
          <div className="empty-state">No players yet — <Link href="/join" style={{ color: 'var(--green)' }}>join the league</Link> to get started.</div>
        ) : (
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
                  {row.bestNet !== null ? (
                    <span className="net-score">{row.bestNet}</span>
                  ) : (
                    <span className="net-score none">no rounds</span>
                  )}
                </div>
                <div className="td col-hcp">
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
                    {row.player.handicap_index.toFixed(1)}
                  </span>
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
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
        Net score = Gross − Course Handicap (9 holes). Lower is better.
      </div>
    </>
  );
}
