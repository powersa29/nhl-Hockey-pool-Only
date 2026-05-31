import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://api.golfcourseapi.com/v1';

function headers() {
  return {
    Authorization: process.env.GOLF_COURSE_API_KEY ?? '',
    'Content-Type': 'application/json',
  };
}

export async function GET(req: NextRequest) {
  if (!process.env.GOLF_COURSE_API_KEY) {
    return NextResponse.json({ error: 'GOLF_COURSE_API_KEY not configured' }, { status: 500 });
  }

  const search      = req.nextUrl.searchParams.get('search');
  const courseApiId = req.nextUrl.searchParams.get('courseApiId');

  if (courseApiId) {
    const res  = await fetch(`${BASE}/courses/${courseApiId}`, { headers: headers() });
    const data = await res.json();
    return NextResponse.json(data);
  }

  if (search) {
    const res  = await fetch(`${BASE}/search?search_query=${encodeURIComponent(search)}`, { headers: headers() });
    const data = await res.json();
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'Pass search or courseApiId' }, { status: 400 });
}
