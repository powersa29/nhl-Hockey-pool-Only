import { NextRequest, NextResponse } from 'next/server';

interface PdgaCourse {
  CourseID: unknown;
  CourseName: unknown;
  City: unknown;
  StateProv: unknown;
  Holes: unknown;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json([]);

  try {
    const params = new URLSearchParams({
      name: q,
      Country: 'US',
      per_page: '10',
      page: '0',
    });

    const res = await fetch(
      `https://www.pdga.com/apps/course/json?${params}`,
      {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Referer': 'https://www.pdga.com/course-directory',
        },
        signal: AbortSignal.timeout(6000),
      },
    );

    if (!res.ok) return NextResponse.json([]);

    const json = await res.json();
    const data: PdgaCourse[] = Array.isArray(json.data) ? json.data : [];

    return NextResponse.json(
      data.map(c => ({
        id:    c.CourseID,
        name:  c.CourseName,
        city:  c.City,
        state: c.StateProv,
        holes: Number(c.Holes) || 18,
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
