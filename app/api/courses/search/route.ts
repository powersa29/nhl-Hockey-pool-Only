import { NextRequest, NextResponse } from 'next/server';

interface NominatimResult {
  name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    'ISO3166-2-lvl4'?: string;
  };
}

function cityFrom(addr: NominatimResult['address']): string {
  const raw = addr.city ?? addr.town ?? addr.village ?? addr.county ?? '';
  return raw.replace(/ County$/, '').replace(/ Parish$/, '').trim();
}

function stateFrom(addr: NominatimResult['address']): string {
  const iso = addr['ISO3166-2-lvl4'] ?? '';
  return iso.startsWith('US-') ? iso.slice(3) : '';
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json([]);

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', `${q} golf`);
  url.searchParams.set('countrycodes', 'us');
  url.searchParams.set('limit', '8');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('featuretype', 'settlement');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'GolfLeagueApp/1.0 (handicap tracker)' },
  });

  if (!res.ok) return NextResponse.json([]);

  const raw: NominatimResult[] = await res.json();

  // Filter to golf-named results and deduplicate by name+state
  const seen = new Set<string>();
  const results: { name: string; city: string; state: string }[] = [];

  for (const r of raw) {
    const name = r.name?.trim();
    if (!name || !name.toLowerCase().includes('golf')) continue;
    const city = cityFrom(r.address);
    const state = stateFrom(r.address);
    const key = `${name}|${state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ name, city, state });
  }

  return NextResponse.json(results);
}
