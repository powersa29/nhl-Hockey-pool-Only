import { NextRequest, NextResponse } from 'next/server';
import { addNextLeagueWeek } from '@/lib/golf-db';

// Vercel cron: runs every Monday at 6am UTC (see vercel.json)
// Adds the upcoming week to golf_leagues if it doesn't already exist.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await addNextLeagueWeek();
    if (result.alreadyExists) {
      return NextResponse.json({ message: 'Week already exists' });
    }
    return NextResponse.json({ created: result.created });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
