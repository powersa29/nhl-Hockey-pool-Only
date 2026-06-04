import { NextRequest, NextResponse } from 'next/server';
import { getAllRounds, deleteRound } from '@/lib/golf-db';

const ADMIN_TOKEN = 'GlizzyAdmin2026';

function isAuthed(req: NextRequest) {
  return req.headers.get('x-admin-token') === ADMIN_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rounds = await getAllRounds();
  return NextResponse.json(rounds);
}

export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  await deleteRound(id);
  return NextResponse.json({ ok: true });
}
