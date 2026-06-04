import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://api.golfcourseapi.com/v1';

function authHeaders() {
  return {
    Authorization: `Key ${process.env.GOLF_COURSE_API_KEY ?? ''}`,
    'Content-Type': 'application/json',
  };
}

export async function GET(req: NextRequest) {
  if (!process.env.GOLF_COURSE_API_KEY) {
    return NextResponse.json({ error: 'GOLF_COURSE_API_KEY not configured on server' }, { status: 500 });
  }

  const search      = req.nextUrl.searchParams.get('search');
  const courseApiId = req.nextUrl.searchParams.get('courseApiId');

  try {
    if (courseApiId) {
      const res = await fetch(`${BASE}/courses/${courseApiId}`, { headers: authHeaders() });
      if (!res.ok) return NextResponse.json({ error: `Golf API ${res.status}` }, { status: res.status });
      return NextResponse.json(await res.json());
    }

    if (search) {
      const res = await fetch(`${BASE}/search?search_query=${encodeURIComponent(search)}`, { headers: authHeaders() });
      if (!res.ok) return NextResponse.json({ error: `Golf API ${res.status}` }, { status: res.status });
      return NextResponse.json(await res.json());
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ error: 'Pass search or courseApiId' }, { status: 400 });
}
