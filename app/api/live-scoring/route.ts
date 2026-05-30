import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

export async function GET() {
  const cutoff = new Date(Date.now() - SIX_HOURS).toISOString();
  const { data } = await db()
    .from('live_rounds')
    .select('*')
    .eq('is_active', true)
    .gte('updated_at', cutoff)
    .order('started_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { player_id, player_name, course_id, course_name, tee_name, slope_rating, course_rating, handicap_index } = body;

  if (!player_name || !course_name || !tee_name || !slope_rating || !course_rating)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  // Deactivate any existing active round for this player
  if (player_id) {
    await db().from('live_rounds').update({ is_active: false }).eq('player_id', player_id).eq('is_active', true);
  }

  const { data, error } = await db()
    .from('live_rounds')
    .insert({ player_id, player_name, course_id, course_name, tee_name, slope_rating, course_rating, handicap_index, scores: [] })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, scores } = body;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const { data, error } = await db()
    .from('live_rounds')
    .update({ scores, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  await db().from('live_rounds').update({ is_active: false }).eq('id', id);
  return NextResponse.json({ ok: true });
}
