import { NextRequest, NextResponse } from 'next/server';
import { insertRound, deleteRound, getOrCreateCurrentLeague, countPlayerRoundsThisWeek, getRoundsForLeague } from '@/lib/golf-db';
import { toDateStr, weekBounds } from '@/lib/golf-scoring';

export async function GET(req: NextRequest) {
  const leagueId = Number(req.nextUrl.searchParams.get('leagueId'));
  if (!leagueId) return NextResponse.json({ error: 'missing leagueId' }, { status: 400 });
  const rounds = await getRoundsForLeague(leagueId);
  return NextResponse.json(rounds);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { player_id, course_id, tee_id, gross_score } = body;

  if (!player_id || !course_id || !tee_id || !gross_score)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  if (gross_score < 18 || gross_score > 72)
    return NextResponse.json({ error: 'Gross score must be between 18 and 72' }, { status: 400 });

  const league = await getOrCreateCurrentLeague();
  const count = await countPlayerRoundsThisWeek(Number(player_id), league.id);
  if (count >= 4)
    return NextResponse.json({ error: 'Maximum 4 rounds per week reached' }, { status: 400 });

  const round = await insertRound({
    player_id: Number(player_id),
    course_id: Number(course_id),
    tee_id: Number(tee_id),
    league_id: league.id,
    gross_score: Number(gross_score),
    played_at: toDateStr(new Date()),
  });

  return NextResponse.json(round, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  await deleteRound(id);
  return NextResponse.json({ ok: true });
}
