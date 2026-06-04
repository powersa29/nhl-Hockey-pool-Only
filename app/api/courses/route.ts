import { NextRequest, NextResponse } from 'next/server';
import { getCourses, getAllTees, createCourse, createTee } from '@/lib/golf-db';

export async function GET() {
  const [courses, tees] = await Promise.all([getCourses(), getAllTees()]);
  const result = courses.map(c => ({
    ...c,
    tees: tees
      .filter(t => t.course_id === c.id)
      .sort((a, b) => a.slope_rating - b.slope_rating),
  }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, city, state, tees } = body as {
    name: string; city: string; state: string;
    tees: { tee_name: string; slope_rating: string; course_rating: string; yards_9: string }[];
  };

  if (!name?.trim() || !city?.trim() || !state?.trim() || !tees?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const validTees = tees.filter(t => t.tee_name?.trim() && t.slope_rating && t.course_rating);
  if (!validTees.length) {
    return NextResponse.json({ error: 'At least one complete tee is required' }, { status: 400 });
  }

  const course = await createCourse(name.trim(), city.trim(), state.trim().toUpperCase().slice(0, 2));
  await Promise.all(validTees.map(t => createTee(course.id, {
    tee_name: t.tee_name.trim(),
    slope_rating: Number(t.slope_rating),
    course_rating: Number(t.course_rating),
    yards_9: t.yards_9 ? Number(t.yards_9) : null,
  })));

  return NextResponse.json({ ok: true, id: course.id });
}
