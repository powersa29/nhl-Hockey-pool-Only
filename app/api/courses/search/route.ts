import { NextRequest, NextResponse } from 'next/server';

const STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH',
  'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN',
  Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};

interface PhotonFeature {
  properties: {
    name?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    countrycode?: string;
    osm_key?: string;
    osm_value?: string;
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json([]);

  const url = new URL('https://photon.komoot.io/api');
  url.searchParams.set('q', `${q} golf`);
  url.searchParams.set('limit', '10');
  url.searchParams.set('lang', 'en');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'GolfLeagueApp/1.0' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return NextResponse.json([]);

  const geojson = await res.json();
  const features: PhotonFeature[] = geojson.features ?? [];

  const seen = new Set<string>();
  const results: { name: string; city: string; state: string }[] = [];

  for (const f of features) {
    const p = f.properties;
    if (p.countrycode !== 'US') continue;
    // Keep only golf courses from OSM, or anything with "golf" in the name
    const isGolfCourse = p.osm_key === 'leisure' && p.osm_value === 'golf_course';
    const nameHasGolf = p.name?.toLowerCase().includes('golf') ?? false;
    if (!isGolfCourse && !nameHasGolf) continue;

    const name = p.name?.trim();
    if (!name) continue;

    const city = (p.city ?? p.town ?? p.village ?? p.county ?? '').replace(/ County$/, '').trim();
    const state = STATE_ABBR[p.state ?? ''] ?? p.state ?? '';
    const key = `${name}|${state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ name, city, state });
  }

  return NextResponse.json(results.slice(0, 6));
}
