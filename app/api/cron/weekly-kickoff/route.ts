import { NextRequest, NextResponse } from 'next/server';
import { sendPushToAll } from '@/lib/push';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sent, failed } = await sendPushToAll({
    title: 'New week, new round!',
    body:  "It's Monday — fire up the league and get out there.",
    url:   '/live',
  });

  console.log(`weekly-kickoff: sent=${sent} failed=${failed}`);
  return NextResponse.json({ sent, failed });
}
