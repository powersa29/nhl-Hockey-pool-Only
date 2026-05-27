import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const playerId = Number(req.nextUrl.searchParams.get('playerId'));
  if (!playerId) return NextResponse.json([]);

  const { data, error } = await db()
    .from('golf_rounds')
    .select('*, golf_courses(name, city, state), golf_tees(tee_name, slope_rating, course_rating), golf_leagues(name, start_date)')
    .eq('player_id', playerId)
    .order('played_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
