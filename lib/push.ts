import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function setupVapid() {
  webpush.setVapidDetails(
    'mailto:admin@glizzygolf.app',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToAll(
  payload: PushPayload,
  opts?: { excludePlayerId?: number },
): Promise<{ sent: number; failed: number }> {
  setupVapid();

  const query = db().from('push_subscriptions').select('endpoint, p256dh, auth, player_id');
  const subs = (await query).data ?? [];

  const filtered = opts?.excludePlayerId
    ? subs.filter(s => s.player_id !== opts.excludePlayerId)
    : subs;

  const staleEndpoints: string[] = [];

  const results = await Promise.allSettled(
    filtered.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          staleEndpoints.push(sub.endpoint);
        }
        throw err;
      }
    }),
  );

  if (staleEndpoints.length > 0) {
    await db().from('push_subscriptions').delete().in('endpoint', staleEndpoints);
  }

  return {
    sent:   results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
  };
}
