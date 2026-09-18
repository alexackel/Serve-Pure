import { supabase } from '@/lib/supabase';

export type AiOrgCategory =
  | 'food'
  | 'environment'
  | 'youth'
  | 'seniors'
  | 'animals'
  | 'education'
  | 'health'
  | 'disaster_relief'
  | 'other';

export type AiDiscoveredOrg = {
  id: string;
  name: string;
  address: string | null;
  contactInfo: string | null;
  signupUrl: string | null;
  website: string | null;
  timeCommitment: string | null;
  eligibility: string | null;
  lat: number | null;
  lng: number | null;
  category: AiOrgCategory;
  description: string | null;
  sourceUrl: string | null;
  flaggedCount: number;
};

export type DiscoverAiOrgsResult = {
  orgs: AiDiscoveredOrg[];
  metroId: string | null;
  status: 'cached' | 'fresh' | 'error';
};

type AiOrgResponse = {
  id: string;
  name: string;
  address: string | null;
  contactInfo: string | null;
  signupUrl: string | null;
  website: string | null;
  timeCommitment: string | null;
  eligibility: string | null;
  lat: number | null;
  lng: number | null;
  category: AiOrgCategory;
  description: string | null;
  sourceUrl: string | null;
  flaggedCount: number;
};

function mapAiOrgResponse(raw: AiOrgResponse): AiDiscoveredOrg {
  return {
    id: raw.id,
    name: raw.name,
    address: raw.address,
    contactInfo: raw.contactInfo,
    signupUrl: raw.signupUrl,
    website: raw.website,
    timeCommitment: raw.timeCommitment,
    eligibility: raw.eligibility,
    lat: raw.lat,
    lng: raw.lng,
    category: raw.category,
    description: raw.description,
    sourceUrl: raw.sourceUrl,
    flaggedCount: raw.flaggedCount,
  };
}

// Checks for an already-searched metro bucket near (lat, lng) and returns
// its cached orgs, or triggers a fresh Brave+Haiku+Mapbox search if none
// exists yet. See supabase/functions/discover-ai-orgs for the server side.
export async function discoverAiOrgs(lat: number, lng: number): Promise<DiscoverAiOrgsResult> {
  const { data, error } = await supabase.functions.invoke('discover-ai-orgs', { body: { lat, lng } });
  if (error) {
    // FunctionsHttpError's `context` is the raw Response — the default
    // error.message is just "Edge Function returned a non-2xx status code",
    // which hides the actual server-side failure reason.
    let serverMessage: string | null = null;
    if (error.context?.json) {
      try {
        const body = await error.context.clone().json();
        serverMessage = body.error ?? JSON.stringify(body);
      } catch {
        // context wasn't JSON (e.g. a crash before our own error handling ran)
      }
    }
    throw serverMessage ? new Error(`discover-ai-orgs failed: ${serverMessage}`) : error;
  }

  return {
    orgs: ((data?.orgs ?? []) as AiOrgResponse[]).map(mapAiOrgResponse),
    metroId: data?.metroId ?? null,
    status: data?.status ?? 'error',
  };
}

// Increments an AI-discovered org's flagged_count. No review queue yet —
// this is a soft signal only, see fn_flag_ai_org in the 0025 migration.
export async function reportAiOrg(orgId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_flag_ai_org', { p_org_id: orgId });
  if (error) throw error;
}

// Undoes a volunteer's own report from the Reported Posts screen. See
// fn_unflag_ai_org in the 0028 migration.
export async function unreportAiOrg(orgId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_unflag_ai_org', { p_org_id: orgId });
  if (error) throw error;
}
