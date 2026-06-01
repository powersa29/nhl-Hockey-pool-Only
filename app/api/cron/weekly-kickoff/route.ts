import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@glizzygolf.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function GET(req: NextRequest) {
  // Vercel Cron sets this header; guard against public access in production
  const authHeader = req.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: subs, error } = await db()
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth');

  if (error) {
    console.error('weekly-kickoff fetch error', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const payload = JSON.stringify({
    title: '⛳ New week, new round!',
    body:  "It's Monday — fire up the league and get out there.",
    url:   '/live',
  });

  const results = await Promise.allSettled(
    (subs ?? []).map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ),
    ),
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`weekly-kickoff: sent=${sent} failed=${failed}`);

  return NextResponse.json({ sent, failed });
}
