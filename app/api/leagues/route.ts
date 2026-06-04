import { NextResponse } from 'next/server';
import { getLeagues, getOrCreateCurrentLeague } from '@/lib/golf-db';

export async function GET() {
  const [leagues, current] = await Promise.all([getLeagues(), getOrCreateCurrentLeague()]);
  return NextResponse.json({ leagues, current });
}
