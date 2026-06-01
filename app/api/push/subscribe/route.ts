import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { playerId, subscription } = await req.json() as {
      playerId: number;
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const { error } = await db()
      .from('push_subscriptions')
      .upsert(
        {
          player_id: playerId ?? null,
          endpoint:  subscription.endpoint,
          p256dh:    subscription.keys.p256dh,
          auth:      subscription.keys.auth,
        },
        { onConflict: 'endpoint' },
      );

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('push subscribe error', err);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json() as { endpoint: string };
    await db().from('push_subscriptions').delete().eq('endpoint', endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('push unsubscribe error', err);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
