export function courseHandicap9(handicapIndex: number, slopeRating: number): number {
  return Math.round((handicapIndex * slopeRating) / 113 / 2);
}

export function netScore(grossScore: number, handicapIndex: number, slopeRating: number): number {
  return grossScore - courseHandicap9(handicapIndex, slopeRating);
}

export function weekBounds(date: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function weekLabel(startDate: string): string {
  const d = new Date(startDate + 'T00:00:00Z');
  const end = new Date(d);
  end.setUTCDate(d.getUTCDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(d)} – ${fmt(end)}`;
}
