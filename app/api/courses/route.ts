import { NextResponse } from 'next/server';
import { getCourses, getAllTees } from '@/lib/golf-db';

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
