import { NextRequest, NextResponse } from 'next/server';
import { getStandings, getSeasonStandings, getLeagues } from '@/lib/golf-db';
import { weekLabel } from '@/lib/golf-scoring';

export async function GET(req: NextRequest) {
  const season = req.nextUrl.searchParams.get('season') === 'true';

  if (season) {
    const standings = await getSeasonStandings();
    return NextResponse.json({ standings, label: 'Season Standings' });
  }

  const leagueId = Number(req.nextUrl.searchParams.get('leagueId'));
  if (!leagueId) return NextResponse.json({ error: 'missing leagueId' }, { status: 400 });

  const [standings, leagues] = await Promise.all([
    getStandings(leagueId),
    getLeagues(),
  ]);

  const league = leagues.find(l => l.id === leagueId);
  return NextResponse.json({
    standings,
    label: league ? weekLabel(league.start_date) : '',
  });
}
