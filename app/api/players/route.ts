import { NextRequest, NextResponse } from 'next/server';
import { getPlayers, createPlayer } from '@/lib/golf-db';

export async function GET() {
  const players = await getPlayers();
  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = (body.name ?? '').trim();
  const handicap_index = parseFloat(body.handicap_index ?? 0);

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (isNaN(handicap_index) || handicap_index < 0 || handicap_index > 54)
    return NextResponse.json({ error: 'Handicap index must be 0–54' }, { status: 400 });

  const player = await createPlayer(name, handicap_index);
  return NextResponse.json(player, { status: 201 });
}
