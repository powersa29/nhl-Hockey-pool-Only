import { NextRequest, NextResponse } from 'next/server';
import { getAllRounds, deleteRound } from '@/lib/golf-db';

export async function GET() {
  const rounds = await getAllRounds();
  return NextResponse.json(rounds);
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  await deleteRound(id);
  return NextResponse.json({ ok: true });
}
