// Validates/geocodes a single address for the create-event form — confirms
// it resolves to a real place and returns coordinates so the event shows up
// on the Map tab. Deliberately the plain (per-request) Geocoding API, not
// the session-billed Search Box/autocomplete API: no live suggestions while
// typing, just one resolve call on submit. Mirrors discover-ai-orgs'
// geocodeAddress() helper and reuses the same MAPBOX_ACCESS_TOKEN secret
// already configured for that function.
//
// Requires a signed-in session (default verify_jwt), same as discover-ai-orgs.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTERNAL_CALL_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, timeoutMs = EXTERNAL_CALL_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let address: string;
  try {
    const body = await req.json();
    address = body.address;
  } catch {
    return jsonResponse({ error: 'invalid request body' }, 400);
  }
  if (typeof address !== 'string' || !address.trim()) {
    return jsonResponse({ error: 'address must be a non-empty string' }, 400);
  }

  const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
  if (!mapboxToken) {
    return jsonResponse({ error: 'MAPBOX_ACCESS_TOKEN not configured' }, 500);
  }

  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&limit=1&access_token=${mapboxToken}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      return jsonResponse({ error: `geocoding failed: ${res.status}` }, 502);
    }
    const json = await res.json();
    const feature = json.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords) {
      return jsonResponse({ error: 'could not resolve this address' }, 404);
    }
    const formattedAddress = feature.properties?.full_address ?? feature.properties?.place_formatted ?? address;
    return jsonResponse({ latitude: coords[1], longitude: coords[0], formattedAddress });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'geocoding request failed' }, 502);
  }
});
