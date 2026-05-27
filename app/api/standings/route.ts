import { NextRequest, NextResponse } from 'next/server';
import { getStandings, getLeagues } from '@/lib/golf-db';
import { weekLabel } from '@/lib/golf-scoring';

export async function GET(req: NextRequest) {
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
