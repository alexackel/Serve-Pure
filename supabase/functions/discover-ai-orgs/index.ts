// AI-powered volunteer org discovery.
//
// Region-bucketed to keep this at near-$0 cost: a given metro area's first
// search (Brave Search + Haiku 4.5 extraction + Mapbox geocoding) is reused
// by every volunteer within that bucket's radius, and is only re-run every
// few months for buckets that are still seeing real traffic — see
// STALE_MS/ACTIVE_WINDOW_MS below.
// See supabase/migrations/0025_ai_discovered_orgs.sql for the schema.
//
// Requires a signed-in session (default verify_jwt) — this is never meant
// to be publicly invokable, to keep the free-tier Brave/Anthropic quotas
// from being spent by anything outside the app.

import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_RADIUS_MILES = 17.5;

// Once an org's flagged_count (see fn_flag_ai_org, 0025 migration) reaches
// this, it stops being served to anyone — enforced below as a read-side
// filter on the cached-bucket query.
const FLAG_HIDE_THRESHOLD = 5;

// A cached metro bucket is only re-searched once it's this old...
const STALE_MS = 90 * 24 * 60 * 60 * 1000; // ~3 months
// ...and only if it's also seen real traffic this recently — a single
// visit to a long-dormant bucket re-arms last_active_at but doesn't itself
// spend a refresh; a follow-up visit within this window then does.
const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // ~1 month

// Supabase Edge Functions expose this global to run work after the response
// has been sent, so a stale-bucket refresh doesn't make the requester wait.
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void } | undefined;

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

// Address/contact enrichment caps. Tier 1 (fetching an org's own source
// page directly) doesn't touch Brave's quota, so its cap is just a
// latency/reliability bound; Tier 2 (a brand-new per-org Brave query) does
// spend quota, so it's kept deliberately small.
const MAX_ADDRESS_FETCH_TARGETS = 15;
const MAX_ADDRESS_SEARCH_FALLBACK = 5;
const PAGE_TEXT_MAX_CHARS = 4000;

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

type BraveResult = { title: string; url: string; description: string; extra_snippets?: string[] };

// Renders a Brave result (plus any extra_snippets) into the text block fed
// to Haiku. Brave's `description` is a single short, often-truncated
// snippet — a page can clearly list an address further down and still have
// it cut before it ever reaches this description, so extra_snippets (more
// excerpts from the same page, requested below) matter for exactly the
// "the address is right there" case.
function formatBraveResult(result: BraveResult, index: number): string {
  const extra = result.extra_snippets?.length ? `\n${result.extra_snippets.join('\n')}` : '';
  return `[${index}] ${result.title}\nURL: ${result.url}\n${result.description}${extra}`;
}

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

// Grouped so the categories most likely to actually need volunteers (food
// banks/pantries, animal shelters, hospitals/health clinics, senior
// care/nursing homes) each get dedicated search real-estate, without paying
// for one Brave call per category — Haiku's extraction cost is one call
// regardless of query count, so the only added cost per query is Brave's,
// and grouping related categories together (food+animals, health+seniors)
// keeps that at 3 calls instead of 4. There's no dedicated environmental-
// conservation query (it falls back to the generic query, like youth/
// education/disaster_relief) — that budget instead goes to the address/
// contact enrichment pass below, which was worth more in practice.
// "address" is included in each query so Brave is more likely to select
// (and show as the description) the location-bearing portion of a result
// page, rather than some other part of it.
function buildBraveQueries(placeName: string): string[] {
  return [
    `volunteer organizations address near ${placeName}`,
    `food banks food pantries animal shelters volunteer opportunities address near ${placeName}`,
    `hospitals health clinics senior care nursing homes volunteer opportunities address near ${placeName}`,
  ];
}

// Brave's free tier is rate-limited to 1 request/second.
const BRAVE_QUERY_DELAY_MS = 1100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetches an org's own page directly so Haiku can look for an address in
// the full page text, not just Brave's short search snippet — this costs
// bandwidth and a timeout slot, never Brave quota. Non-fatal: any failure
// (network error, non-HTML response, timeout) just means no enrichment
// text for that org, same as if the fetch had never been attempted.
async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('html') && !contentType.includes('text')) return null;
    const html = await res.text();
    const text = stripHtmlToText(html);
    return text ? text.slice(0, PAGE_TEXT_MAX_CHARS) : null;
  } catch {
    return null;
  }
}

async function braveSearchOne(query: string, braveApiKey: string): Promise<BraveResult[]> {
  // extra_snippets asks Brave for additional excerpts from each result page
  // beyond the single (often-truncated) description — this is what
  // actually surfaces an address that's "clearly listed" on the page but
  // didn't make it into that one short description line. It's a no-op
  // (ignored) rather than an error if the plan doesn't support it.
  const res = await fetchWithTimeout(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20&extra_snippets=1`,
    { headers: { Accept: 'application/json', 'X-Subscription-Token': braveApiKey } },
  );
  if (!res.ok) throw new Error(`Brave search failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.web?.results ?? [];
}

// Runs the grouped queries sequentially (rate-limit friendly) and merges
// their results, de-duplicating by URL so a org page that surfaces under
// multiple queries isn't sent to Haiku twice.
async function braveSearch(placeName: string, braveApiKey: string): Promise<BraveResult[]> {
  const queries = buildBraveQueries(placeName);
  const seenUrls = new Set<string>();
  const merged: BraveResult[] = [];
  for (let i = 0; i < queries.length; i++) {
    const results = await braveSearchOne(queries[i], braveApiKey);
    for (const result of results) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        merged.push(result);
      }
    }
    if (i < queries.length - 1) await sleep(BRAVE_QUERY_DELAY_MS);
  }
  return merged;
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
  const searchContext = braveResults.map(formatBraveResult).join('\n\n');

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
        'address is not stated anywhere, use null rather than guessing. Getting a real street address ' +
        'is a high priority, since it drives the map and distance experience volunteers rely on — before ' +
        'concluding an address is unavailable for a given org, check every snippet that mentions that ' +
        'org, not just the first one, since a later result may state the address a title/description-only ' +
        'result left out. When no street address is stated anywhere, look for a phone number or email ' +
        'address in the snippets instead and put it in contact_info, so a volunteer still has a way to ' +
        'reach the organization; if truly nothing is available, use null. ' +
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
        'multiple search results, preferring whichever result states the most complete information ' +
        '(especially address) about that org. Skip any organization where the search snippets provide ' +
        'only a bare name with no real identifying detail — no address and no specific description of ' +
        'what the organization does or who it serves. Do not emit a placeholder-quality entry just to ' +
        'fill out the list; it is better to return fewer, well-supported organizations. ' +
        'Some results are blog posts or "best of" roundup/listicle articles about volunteering (titles ' +
        'like "Top 10 places to volunteer in ...", "Best volunteer opportunities in ..."), rather than an ' +
        'organization\'s own page — these are often written once and never updated, so an organization ' +
        'they mention may have closed, moved, or changed its programs since. When an org\'s information ' +
        'comes only from this kind of secondary/roundup source, still extract its name, address (if ' +
        'genuinely stated), and a general description, but do not state time_commitment or eligibility ' +
        'from it unless the language clearly reads as current — prefer null for those two fields rather ' +
        'than repeating a listicle\'s possibly-stale claim. If the same organization also appears in a ' +
        'result that looks like its own site (not a roundup), prefer that result\'s details over the ' +
        'listicle\'s wherever they differ.',
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

type AddressContactResult = { address: string | null; contact_info: string | null };

const ADDRESS_ENRICHMENT_SCHEMA = {
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
        },
        required: ['name', 'address', 'contact_info'],
        additionalProperties: false,
      },
    },
  },
  required: ['orgs'],
  additionalProperties: false,
};

// Shared by both enrichment tiers: given a named organization and some text
// about it (a fetched page, or fresh search snippets), pull out just its
// address and contact info — never inventing, borrowing another org's
// details, or adding organizations beyond the ones named.
async function extractAddressContact(
  targets: { name: string; context: string }[],
  anthropicApiKey: string,
): Promise<Map<string, AddressContactResult>> {
  if (targets.length === 0) return new Map();

  const combined = targets.map((t) => `Organization: ${t.name}\n${t.context}`).join('\n\n---\n\n');

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system:
        'For each named organization below, find its street address and any phone number or email in the ' +
        'text provided about it. Only use what that organization\'s own text actually states — never guess, ' +
        'infer, or borrow another organization\'s address or contact info, even if it seems like a reasonable ' +
        'match. Use null for either field if it is not clearly stated. Return exactly one result per ' +
        'organization name given, matched by that exact name — do not add organizations that were not listed.',
      messages: [
        { role: 'user', content: `${combined}\n\nExtract address and contact_info for each organization named above.` },
      ],
      output_config: { format: { type: 'json_schema', schema: ADDRESS_ENRICHMENT_SCHEMA } },
    }),
  }, 25000);
  if (!res.ok) throw new Error(`Address enrichment extraction failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const textBlock = json.content?.find((block: { type: string }) => block.type === 'text');
  if (!textBlock) throw new Error('Address enrichment extraction returned no text block');
  const parsed = JSON.parse(textBlock.text) as { orgs: { name: string; address: string | null; contact_info: string | null }[] };
  return new Map(parsed.orgs.map((o) => [normalize(o.name), { address: o.address, contact_info: o.contact_info }]));
}

// Tier 1: free (no Brave query) — fetches each address-less org's own
// source page directly, since the address is often already on that page
// even though it wasn't in Brave's short snippet.
async function enrichMissingAddressesFromSourcePages(
  orgs: ExtractedOrg[],
  anthropicApiKey: string,
): Promise<Map<string, AddressContactResult>> {
  const targets = orgs.filter((org) => !org.address).slice(0, MAX_ADDRESS_FETCH_TARGETS);
  if (targets.length === 0) return new Map();

  const pages = await Promise.all(
    targets.map(async (org) => ({ org, text: await fetchPageText(org.source_url) })),
  );
  const withText = pages.filter((p): p is { org: ExtractedOrg; text: string } => !!p.text);
  console.log('discover-ai-orgs: source-page enrichment', {
    targeted: targets.length,
    fetchedText: withText.length,
  });
  if (withText.length === 0) return new Map();

  try {
    return await extractAddressContact(
      withText.map((p) => ({ name: p.org.name, context: `Page content:\n${p.text}` })),
      anthropicApiKey,
    );
  } catch (err) {
    console.error('discover-ai-orgs: source-page enrichment extraction failed', err);
    return new Map();
  }
}

// Tier 2: capped Brave fallback for whatever Tier 1 didn't resolve — one
// targeted query per org, sequential and rate-limit-spaced like the main
// grouped queries.
async function enrichMissingAddressesFromSearch(
  orgs: ExtractedOrg[],
  placeName: string,
  braveApiKey: string,
  anthropicApiKey: string,
): Promise<Map<string, AddressContactResult>> {
  const targets = orgs.filter((org) => !org.address).slice(0, MAX_ADDRESS_SEARCH_FALLBACK);
  if (targets.length === 0) return new Map();

  const perOrgContext: { name: string; context: string }[] = [];
  for (let i = 0; i < targets.length; i++) {
    const org = targets[i];
    try {
      const results = await braveSearchOne(`"${org.name}" address near ${placeName}`, braveApiKey);
      const context = results.length ? results.map(formatBraveResult).join('\n') : '(no search results found)';
      perOrgContext.push({ name: org.name, context });
    } catch (err) {
      console.error('discover-ai-orgs: address fallback search failed', { org: org.name, err });
    }
    if (i < targets.length - 1) await sleep(BRAVE_QUERY_DELAY_MS);
  }
  console.log('discover-ai-orgs: search-fallback enrichment', {
    targeted: targets.length,
    searched: perOrgContext.length,
  });
  if (perOrgContext.length === 0) return new Map();

  try {
    return await extractAddressContact(perOrgContext, anthropicApiKey);
  } catch (err) {
    console.error('discover-ai-orgs: search-fallback enrichment extraction failed', err);
    return new Map();
  }
}

function applyEnrichment(orgs: ExtractedOrg[], enrichment: Map<string, AddressContactResult>): ExtractedOrg[] {
  if (enrichment.size === 0) return orgs;
  return orgs.map((org) => {
    const found = enrichment.get(normalize(org.name));
    if (!found) return org;
    return {
      ...org,
      address: org.address ?? found.address,
      contact_info: org.contact_info ?? found.contact_info,
    };
  });
}

// TS infers different default generics for a bare `typeof createClient`
// reference vs. an actual call (createClient has overloaded signatures), so
// `ReturnType<typeof createClient>` doesn't structurally match the client
// built below — route both through this factory so they share one inferred type.
function createSupabaseClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

type ExistingOrgRow = { id: string; name: string; address: string | null };

type ReconcileResult = {
  toInsert: GeocodedOrg[];
  toUpdate: { id: string; address: string; lat: number | null; lng: number | null }[];
};

// Merges the current batch (same org can surface under multiple grouped
// queries, once with an address and once without) and reconciles it against
// everything already stored: exact name+address matches are skipped as
// known duplicates, but a name match where the existing row has no address
// and this candidate does is treated as an enrichment (address backfill via
// update) rather than a duplicate insert or a silent skip.
async function reconcileWithExisting(
  supabase: ReturnType<typeof createSupabaseClient>,
  candidates: GeocodedOrg[],
): Promise<ReconcileResult> {
  const byName = new Map<string, GeocodedOrg>();
  for (const candidate of candidates) {
    const key = normalize(candidate.name);
    const current = byName.get(key);
    if (!current || (!current.address && candidate.address)) {
      byName.set(key, candidate);
    }
  }
  const deduped = [...byName.values()];

  const { data: existing } = await supabase.from('ai_discovered_orgs').select('id, name, address');
  const existingRows = (existing ?? []) as ExistingOrgRow[];
  const existingByName = new Map<string, ExistingOrgRow>();
  const existingExactKeys = new Set<string>();
  for (const row of existingRows) {
    existingByName.set(normalize(row.name), row);
    existingExactKeys.add(`${normalize(row.name)}|${normalize(row.address ?? '')}`);
  }

  const toInsert: GeocodedOrg[] = [];
  const toUpdate: ReconcileResult['toUpdate'] = [];
  const seenInBatch = new Set<string>();

  for (const candidate of deduped) {
    const nameKey = normalize(candidate.name);
    const exactKey = `${nameKey}|${normalize(candidate.address ?? '')}`;
    if (existingExactKeys.has(exactKey) || seenInBatch.has(exactKey)) continue;
    seenInBatch.add(exactKey);

    const existingMatch = existingByName.get(nameKey);
    if (existingMatch && !existingMatch.address && candidate.address) {
      toUpdate.push({ id: existingMatch.id, address: candidate.address, lat: candidate.lat, lng: candidate.lng });
      continue;
    }

    toInsert.push(candidate);
  }

  return { toInsert, toUpdate };
}

type PipelineKeys = { braveApiKey: string; anthropicApiKey: string; mapboxToken: string };

// Shared by both a brand-new bucket's first search and a stale bucket's
// periodic refresh: reverse-geocode -> grouped Brave searches -> Haiku
// extraction -> quality/radius filtering -> reconcile against what's
// already stored -> write. Throws on failure; the caller decides what to
// do with an unsearched/failed bucket (delete vs. reset to idle).
async function runSearchPipeline(
  supabase: ReturnType<typeof createSupabaseClient>,
  metro: { id: string; radius_miles: number },
  lat: number,
  lng: number,
  keys: PipelineKeys,
): Promise<{ inserted: DbOrgRow[]; updatedCount: number }> {
  console.log('discover-ai-orgs: reverse geocoding', { lat, lng, metroId: metro.id });
  const placeName = await reverseGeocode(lat, lng, keys.mapboxToken);
  console.log('discover-ai-orgs: brave search', { placeName, metroId: metro.id });
  const braveResults = await braveSearch(placeName, keys.braveApiKey);
  console.log('discover-ai-orgs: extracting with haiku', { resultCount: braveResults.length, metroId: metro.id });
  const extracted = await extractOrgsWithHaiku(braveResults, keys.anthropicApiKey);
  const qualityFiltered = extracted.filter((org) => org.description.trim().length >= MIN_DESCRIPTION_LENGTH);
  console.log('discover-ai-orgs: quality-filtered', {
    before: extracted.length,
    after: qualityFiltered.length,
    minDescriptionLength: MIN_DESCRIPTION_LENGTH,
  });

  const sourcePageEnrichment = await enrichMissingAddressesFromSourcePages(qualityFiltered, keys.anthropicApiKey);
  const afterSourcePages = applyEnrichment(qualityFiltered, sourcePageEnrichment);
  const searchFallbackEnrichment = await enrichMissingAddressesFromSearch(
    afterSourcePages,
    placeName,
    keys.braveApiKey,
    keys.anthropicApiKey,
  );
  const enriched = applyEnrichment(afterSourcePages, searchFallbackEnrichment);
  console.log('discover-ai-orgs: address enrichment complete', {
    missingBefore: qualityFiltered.filter((org) => !org.address).length,
    missingAfter: enriched.filter((org) => !org.address).length,
  });

  console.log('discover-ai-orgs: geocoding extracted orgs', { orgCount: enriched.length });
  const geocoded: GeocodedOrg[] = await Promise.all(
    enriched.map(async (org) => ({ ...org, ...(await geocodeAddress(org.address, keys.mapboxToken)) })),
  );
  const withinRadius = geocoded.filter((org) => {
    if (org.lat == null || org.lng == null) return true;
    return getDistanceMiles(lat, lng, org.lat, org.lng) <= metro.radius_miles;
  });
  console.log('discover-ai-orgs: distance-filtered', {
    before: geocoded.length,
    after: withinRadius.length,
    radiusMiles: metro.radius_miles,
  });
  const { toInsert, toUpdate } = await reconcileWithExisting(supabase, withinRadius);
  console.log('discover-ai-orgs: reconciled', {
    insertCount: toInsert.length,
    updateCount: toUpdate.length,
    metroId: metro.id,
  });

  for (const update of toUpdate) {
    const { error: updateError } = await supabase
      .from('ai_discovered_orgs')
      .update({ address: update.address, lat: update.lat, lng: update.lng })
      .eq('id', update.id);
    if (updateError) console.error('discover-ai-orgs: failed to backfill address', { id: update.id, updateError });
  }

  const { data: insertedOrgs, error: insertOrgsError } = await supabase
    .from('ai_discovered_orgs')
    .insert(
      toInsert.map((org) => ({
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
        metro_id: metro.id,
      })),
    )
    .select();
  if (insertOrgsError) throw insertOrgsError;

  // Best-effort — orgs are already committed at this point, so a failure
  // marking the bucket idle shouldn't discard them or fall into the
  // caller's failure handling (which, for a brand-new bucket, deletes the
  // row and would cascade-delete these orgs via the metro_id foreign key).
  const { error: markIdleError } = await supabase
    .from('searched_metros')
    .update({ search_status: 'idle', last_searched_at: new Date().toISOString() })
    .eq('id', metro.id);
  if (markIdleError) console.error('discover-ai-orgs: failed to mark metro idle', markIdleError);

  return { inserted: (insertedOrgs ?? []) as DbOrgRow[], updatedCount: toUpdate.length };
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

  const supabase = createSupabaseClient();

  const { data: existingMetroId } = await supabase.rpc('fn_find_metro_for_point', { p_lat: lat, p_lng: lng });

  if (existingMetroId) {
    const { data: metroRow } = await supabase
      .from('searched_metros')
      .select('id, radius_miles, search_status, last_searched_at, last_active_at')
      .eq('id', existingMetroId)
      .single();

    const now = Date.now();
    const wasRecentlyActive =
      !!metroRow?.last_active_at && now - new Date(metroRow.last_active_at).getTime() < ACTIVE_WINDOW_MS;
    const isStale =
      !metroRow || !metroRow.last_searched_at || now - new Date(metroRow.last_searched_at).getTime() >= STALE_MS;

    await supabase.from('searched_metros').update({ last_active_at: new Date().toISOString() }).eq('id', existingMetroId);

    // TODO: no notification exists yet for when an org crosses
    // FLAG_HIDE_THRESHOLD and silently drops out of these results — the
    // team should be notified (e.g. Slack webhook/email) so someone can
    // review it, but that function hasn't been built.
    const { data: orgs, error: orgsError } = await supabase
      .from('ai_discovered_orgs')
      .select('*')
      .eq('metro_id', existingMetroId)
      .lt('flagged_count', FLAG_HIDE_THRESHOLD);
    if (orgsError) {
      return jsonResponse({ status: 'error', metroId: existingMetroId, orgs: [], error: orgsError.message });
    }

    if (metroRow && isStale && wasRecentlyActive && metroRow.search_status === 'idle') {
      const braveApiKey = Deno.env.get('BRAVE_API_KEY');
      const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
      const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
      if (braveApiKey && anthropicApiKey && mapboxToken) {
        // Atomically claim the refresh so two near-simultaneous requests
        // into the same stale-but-active bucket don't both kick it off.
        const { data: claimed } = await supabase
          .from('searched_metros')
          .update({ search_status: 'in_progress' })
          .eq('id', existingMetroId)
          .eq('search_status', 'idle')
          .select()
          .single();
        if (claimed) {
          console.log('discover-ai-orgs: kicking off background refresh', { metroId: existingMetroId });
          const refreshTask = runSearchPipeline(
            supabase,
            { id: existingMetroId, radius_miles: claimed.radius_miles },
            lat,
            lng,
            { braveApiKey, anthropicApiKey, mapboxToken },
          )
            .then((result) =>
              console.log('discover-ai-orgs: background refresh complete', {
                metroId: existingMetroId,
                insertedCount: result.inserted.length,
                updatedCount: result.updatedCount,
              }),
            )
            .catch(async (err) => {
              // Unlike a brand-new bucket, this row already has real orgs
              // attached — reset it to idle instead of deleting so it keeps
              // serving cached results and gets retried on its next
              // eligible refresh window, rather than losing everything.
              console.error('discover-ai-orgs: background refresh failed', err);
              await supabase.from('searched_metros').update({ search_status: 'idle' }).eq('id', existingMetroId);
            });
          if (typeof EdgeRuntime !== 'undefined') {
            EdgeRuntime.waitUntil(refreshTask);
          }
        }
      }
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
    const { inserted } = await runSearchPipeline(
      supabase,
      { id: newMetro.id, radius_miles: newMetro.radius_miles },
      lat,
      lng,
      { braveApiKey, anthropicApiKey, mapboxToken },
    );
    return jsonResponse({ status: 'fresh', metroId: newMetro.id, orgs: inserted.map(mapOrgRow) });
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
