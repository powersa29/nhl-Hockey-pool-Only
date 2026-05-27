import { NextRequest, NextResponse } from 'next/server';
import { updateHandicap, getPlayer } from '@/lib/golf-db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const handicap_index = parseFloat(body.handicap_index);

  if (isNaN(handicap_index) || handicap_index < 0 || handicap_index > 54)
    return NextResponse.json({ error: 'Handicap index must be 0–54' }, { status: 400 });

  await updateHandicap(Number(id), handicap_index);
  const player = await getPlayer(Number(id));
  return NextResponse.json(player);
}
