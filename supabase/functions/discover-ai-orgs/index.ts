// AI-powered volunteer org discovery.
//
// Region-bucketed to keep this at near-$0 cost: a given metro area is only
// ever searched once (Brave Search + Haiku 4.5 extraction + Mapbox
// geocoding), then reused by every volunteer within that bucket's radius.
// See supabase/migrations/0025_ai_discovered_orgs.sql for the schema.
//
// Requires a signed-in session (default verify_jwt) — this is never meant
// to be publicly invokable, to keep the free-tier Brave/Anthropic quotas
// from being spent by anything outside the app.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_RADIUS_MILES = 17.5;

// Mirrors src/utils/geo.ts's getDistanceMiles exactly, reimplemented locally
// since Deno can't import client TS across the runtime boundary.
const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MIN_DESCRIPTION_LENGTH = 30;

type AiOrgCategory =
  | 'food'
  | 'environment'
  | 'youth'
  | 'seniors'
  | 'animals'
  | 'education'
  | 'health'
  | 'disaster_relief'
  | 'other';

const CATEGORY_VALUES: AiOrgCategory[] = [
  'food',
  'environment',
  'youth',
  'seniors',
  'animals',
  'education',
  'health',
  'disaster_relief',
  'other',
];

type BraveResult = { title: string; url: string; description: string };

type ExtractedOrg = {
  name: string;
  address: string | null;
  contact_info: string | null;
  signup_url: string | null;
  website: string | null;
  time_commitment: string | null;
  eligibility: string | null;
  category: AiOrgCategory;
  description: string;
  source_url: string;
};

type GeocodedOrg = ExtractedOrg & { lat: number | null; lng: number | null };

type DbOrgRow = {
  id: string;
  name: string;
  address: string | null;
  contact_info: string | null;
  signup_url: string | null;
  website: string | null;
  time_commitment: string | null;
  eligibility: string | null;
  lat: number | null;
  lng: number | null;
  category: AiOrgCategory;
  description: string | null;
  source_url: string | null;
  flagged_count: number;
};

const EXTERNAL_CALL_TIMEOUT_MS = 15000;

// None of Brave/Mapbox/Anthropic are guaranteed to respond promptly, and a
// plain `fetch` has no default timeout in Deno — a single slow upstream call
// would otherwise hang the whole request indefinitely instead of failing
// into the function's own error handling.
async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = EXTERNAL_CALL_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request to ${new URL(url).hostname} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function mapOrgRow(row: DbOrgRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    contactInfo: row.contact_info,
    signupUrl: row.signup_url,
    website: row.website,
    timeCommitment: row.time_commitment,
    eligibility: row.eligibility,
    lat: row.lat,
    lng: row.lng,
    category: row.category,
    description: row.description,
    sourceUrl: row.source_url,
    flaggedCount: row.flagged_count,
  };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Reverse-geocodes to a human place name ("Oakland, California") so the
// Brave query has real location context — Brave's web search has no
// native lat/lng param.
async function reverseGeocode(lat: number, lng: number, mapboxToken: string): Promise<string> {
  const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&types=place,locality,neighborhood&access_token=${mapboxToken}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Mapbox reverse geocode failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const props = json.features?.[0]?.properties;
  return props?.place_formatted ?? props?.full_address ?? props?.name ?? `${lat},${lng}`;
}

async function geocodeAddress(address: string | null, mapboxToken: string): Promise<{ lat: number | null; lng: number | null }> {
  if (!address) return { lat: null, lng: null };
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&limit=1&access_token=${mapboxToken}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { lat: null, lng: null };
    const json = await res.json();
    const coords = json.features?.[0]?.geometry?.coordinates;
    return coords ? { lng: coords[0], lat: coords[1] } : { lat: null, lng: null };
  } catch {
    // Non-fatal — the org is still inserted, just without a pin/distance.
    return { lat: null, lng: null };
  }
}

async function braveSearch(placeName: string, braveApiKey: string): Promise<BraveResult[]> {
  const query = `volunteer organizations near ${placeName}`;
  const res = await fetchWithTimeout(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20`, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': braveApiKey },
  });
  if (!res.ok) throw new Error(`Brave search failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.web?.results ?? [];
}

const ORG_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    orgs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: ['string', 'null'] },
          contact_info: { type: ['string', 'null'] },
          signup_url: { type: ['string', 'null'] },
          website: { type: ['string', 'null'] },
          time_commitment: { type: ['string', 'null'] },
          eligibility: { type: ['string', 'null'] },
          category: { type: 'string', enum: CATEGORY_VALUES },
          description: { type: 'string' },
          source_url: { type: 'string' },
        },
        required: [
          'name',
          'address',
          'contact_info',
          'signup_url',
          'website',
          'time_commitment',
          'eligibility',
          'category',
          'description',
          'source_url',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['orgs'],
  additionalProperties: false,
};

async function extractOrgsWithHaiku(braveResults: BraveResult[], anthropicApiKey: string): Promise<ExtractedOrg[]> {
  const searchContext = braveResults
    .map((r, i) => `[${i}] ${r.title}\nURL: ${r.url}\n${r.description}`)
    .join('\n\n');

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system:
        'You extract real, currently-operating volunteer organizations from web search results. ' +
        'Only include organizations that plausibly accept volunteers. Do not invent organizations, ' +
        'addresses, or descriptions that are not supported by the provided search snippets — if an ' +
        'address is not stated, use null rather than guessing. When no street address is stated, look ' +
        'for a phone number or email address in the snippets instead and put it in contact_info, so a ' +
        'volunteer still has a way to reach the organization; if truly nothing is available, use null. ' +
        'If the snippets identify a specific page where someone can sign up or apply to volunteer, put ' +
        'that URL in signup_url — only when it is distinct from the general source page, otherwise null. ' +
        'If the organization\'s own general homepage is identifiable and different from signup_url and ' +
        'source_url, put it in website; otherwise null. If the snippets clearly state an expected time ' +
        'commitment (e.g. "2 hrs/week ongoing", "one-time, 3 hours"), put a short phrase describing it in ' +
        'time_commitment; otherwise null. If the snippets clearly state an age or eligibility requirement ' +
        '(e.g. "ages 16+", "background check required"), put a short phrase describing it in eligibility; ' +
        'otherwise null. Never guess or infer any of these four fields from general knowledge — only use ' +
        'what the snippets actually state. Assign exactly one category per org ' +
        'from the fixed list. Deduplicate organizations that clearly refer to the same entity across ' +
        'multiple search results. Skip any organization where the search snippets provide only a bare ' +
        'name with no real identifying detail — no address and no specific description of what the ' +
        'organization does or who it serves. Do not emit a placeholder-quality entry just to fill out ' +
        'the list; it is better to return fewer, well-supported organizations.',
      messages: [
        { role: 'user', content: `Search results:\n\n${searchContext}\n\nExtract the volunteer organizations mentioned above.` },
      ],
      output_config: { format: { type: 'json_schema', schema: ORG_EXTRACTION_SCHEMA } },
    }),
  }, 25000); // generation legitimately takes longer than a plain lookup call
  if (!res.ok) throw new Error(`Haiku extraction failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const textBlock = json.content?.find((block: { type: string }) => block.type === 'text');
  if (!textBlock) throw new Error('Haiku extraction returned no text block');
  const parsed = JSON.parse(textBlock.text) as { orgs: ExtractedOrg[] };
  return parsed.orgs;
}

async function dedupeAgainstExisting(
  supabase: ReturnType<typeof createClient>,
  candidates: GeocodedOrg[],
): Promise<GeocodedOrg[]> {
  const { data: existing } = await supabase.from('ai_discovered_orgs').select('name, address');
  const existingKeys = new Set(
    ((existing ?? []) as { name: string; address: string | null }[]).map(
      (o) => `${normalize(o.name)}|${normalize(o.address ?? '')}`,
    ),
  );

  const seenInBatch = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${normalize(candidate.name)}|${normalize(candidate.address ?? '')}`;
    if (existingKeys.has(key) || seenInBatch.has(key)) return false;
    seenInBatch.add(key);
    return true;
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let lat: number, lng: number;
  try {
    const body = await req.json();
    lat = body.lat;
    lng = body.lng;
  } catch {
    return jsonResponse({ status: 'error', metroId: null, orgs: [], error: 'invalid request body' }, 400);
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return jsonResponse({ status: 'error', metroId: null, orgs: [], error: 'lat/lng must be numbers' }, 400);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: existingMetroId } = await supabase.rpc('fn_find_metro_for_point', { p_lat: lat, p_lng: lng });

  if (existingMetroId) {
    await supabase.from('searched_metros').update({ last_active_at: new Date().toISOString() }).eq('id', existingMetroId);
    const { data: orgs, error: orgsError } = await supabase
      .from('ai_discovered_orgs')
      .select('*')
      .eq('metro_id', existingMetroId);
    if (orgsError) {
      return jsonResponse({ status: 'error', metroId: existingMetroId, orgs: [], error: orgsError.message });
    }
    return jsonResponse({ status: 'cached', metroId: existingMetroId, orgs: (orgs as DbOrgRow[]).map(mapOrgRow) });
  }

  const { data: newMetro, error: insertMetroError } = await supabase
    .from('searched_metros')
    .insert({ center_lat: lat, center_lng: lng, radius_miles: DEFAULT_RADIUS_MILES, search_status: 'in_progress' })
    .select()
    .single();
  if (insertMetroError || !newMetro) {
    return jsonResponse({ status: 'error', metroId: null, orgs: [], error: insertMetroError?.message ?? 'insert failed' }, 500);
  }

  const braveApiKey = Deno.env.get('BRAVE_API_KEY');
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
  if (!braveApiKey || !anthropicApiKey || !mapboxToken) {
    await supabase.from('searched_metros').delete().eq('id', newMetro.id);
    const missing = [
      !braveApiKey && 'BRAVE_API_KEY',
      !anthropicApiKey && 'ANTHROPIC_API_KEY',
      !mapboxToken && 'MAPBOX_ACCESS_TOKEN',
    ].filter(Boolean);
    return jsonResponse({ status: 'error', metroId: newMetro.id, orgs: [], error: `Missing secret(s): ${missing.join(', ')}` }, 500);
  }

  try {
    console.log('discover-ai-orgs: reverse geocoding', { lat, lng });
    const placeName = await reverseGeocode(lat, lng, mapboxToken);
    console.log('discover-ai-orgs: brave search', { placeName });
    const braveResults = await braveSearch(placeName, braveApiKey);
    console.log('discover-ai-orgs: extracting with haiku', { resultCount: braveResults.length });
    const extracted = await extractOrgsWithHaiku(braveResults, anthropicApiKey);
    const qualityFiltered = extracted.filter((org) => org.description.trim().length >= MIN_DESCRIPTION_LENGTH);
    console.log('discover-ai-orgs: quality-filtered', {
      before: extracted.length,
      after: qualityFiltered.length,
      minDescriptionLength: MIN_DESCRIPTION_LENGTH,
    });
    console.log('discover-ai-orgs: geocoding extracted orgs', { orgCount: qualityFiltered.length });
    const geocoded: GeocodedOrg[] = await Promise.all(
      qualityFiltered.map(async (org) => ({ ...org, ...(await geocodeAddress(org.address, mapboxToken)) })),
    );
    const withinRadius = geocoded.filter((org) => {
      if (org.lat == null || org.lng == null) return true;
      return getDistanceMiles(lat, lng, org.lat, org.lng) <= newMetro.radius_miles;
    });
    console.log('discover-ai-orgs: distance-filtered', {
      before: geocoded.length,
      after: withinRadius.length,
      radiusMiles: newMetro.radius_miles,
    });
    const deduped = await dedupeAgainstExisting(supabase, withinRadius);
    console.log('discover-ai-orgs: inserting', { insertCount: deduped.length });

    const { data: insertedOrgs, error: insertOrgsError } = await supabase
      .from('ai_discovered_orgs')
      .insert(
        deduped.map((org) => ({
          name: org.name,
          address: org.address,
          contact_info: org.contact_info,
          signup_url: org.signup_url,
          website: org.website,
          time_commitment: org.time_commitment,
          eligibility: org.eligibility,
          lat: org.lat,
          lng: org.lng,
          category: org.category,
          description: org.description,
          source_url: org.source_url,
          metro_id: newMetro.id,
        })),
      )
      .select();
    if (insertOrgsError) throw insertOrgsError;

    // Best-effort — orgs are already committed at this point, so a failure
    // marking the bucket idle shouldn't discard them or fall into the catch
    // block below (which deletes the bucket, which would cascade-delete
    // these orgs via the metro_id foreign key).
    const { error: markIdleError } = await supabase
      .from('searched_metros')
      .update({ search_status: 'idle', last_searched_at: new Date().toISOString() })
      .eq('id', newMetro.id);
    if (markIdleError) console.error('discover-ai-orgs: failed to mark metro idle', markIdleError);

    return jsonResponse({
      status: 'fresh',
      metroId: newMetro.id,
      orgs: ((insertedOrgs ?? []) as DbOrgRow[]).map(mapOrgRow),
    });
  } catch (err) {
    // Reaching here means no orgs were ever successfully inserted for this
    // bucket (the only path that inserts orgs returns above instead of
    // falling through). Delete the bucket entirely rather than just
    // resetting its status — fn_find_metro_for_point matches on location
    // alone, not search_status, so a merely-idle-but-empty bucket would
    // otherwise look "already searched" forever and never be retried.
    await supabase.from('searched_metros').delete().eq('id', newMetro.id);
    console.error('discover-ai-orgs failed', err);
    return jsonResponse({ status: 'error', metroId: null, orgs: [], error: String(err) });
  }
});
