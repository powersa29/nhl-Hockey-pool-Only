import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = db();

  const [rounds, locations] = await Promise.all([
    client.from('live_rounds').update({ is_active: false }).eq('is_active', true),
    client.from('golf_live_locations').update({ is_active: false }).eq('is_active', true),
  ]);

  const roundsError = rounds.error?.message ?? null;
  const locsError   = locations.error?.message ?? null;

  console.log('end-rounds cron: live_rounds closed, locations cleared', { roundsError, locsError });
  return NextResponse.json({ ok: true, roundsError, locsError });
}
