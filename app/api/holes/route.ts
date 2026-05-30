import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const teeId = req.nextUrl.searchParams.get('teeId');
  if (!teeId) return NextResponse.json({ error: 'missing teeId' }, { status: 400 });

  const { data, error } = await db()
    .from('golf_holes')
    .select('*')
    .eq('tee_id', Number(teeId))
    .order('hole_number');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { teeId, holes } = await req.json();
  if (!teeId || !holes?.length) return NextResponse.json({ error: 'missing data' }, { status: 400 });

  const rows = holes.map((h: { hole_number: number; par: number; yards?: number | null; handicap?: number | null }) => ({
    tee_id: Number(teeId),
    hole_number: h.hole_number,
    par: h.par,
    yards: h.yards ?? null,
    handicap: h.handicap ?? null,
  }));

  const { error } = await db()
    .from('golf_holes')
    .upsert(rows, { onConflict: 'tee_id,hole_number' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
