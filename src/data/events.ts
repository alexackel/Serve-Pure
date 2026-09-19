import { supabase } from '@/lib/supabase';
import type { EventDetail, EventRequirements } from '@/data/mock-events';
import { formatShortDate } from '@/utils/dates';

export const EVENT_SELECT = '*, organizations(name, verification_status), profiles!created_by(full_name)';

export type EventRow = {
  id: string;
  org_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  start_at: string;
  end_at: string;
  capacity: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  is_recurring: boolean;
  status: 'available' | 'full' | 'cancelled' | 'completed';
  registered_count: number;
  posted_at: string;
  min_age: number | null;
  requirements: { skills?: string[]; physical?: string; what_to_bring?: string[] } | null;
  photo_url: string | null;
  organizations: { name: string; verification_status: string } | null;
  profiles: { full_name: string } | null;
};

function formatEventTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// listOrgEvents (below) deliberately fetches an org's full history including
// cancelled/completed events, and that feeds org-events.tsx's Upcoming list
// and org-you.tsx's History tab, both of which render `.status` directly —
// so 'cancelled' must round-trip as 'cancelled', not collapse into 'full'.
// 'completed' still collapses into 'full' for now: EventStatus already has a
// separate 'completed' member used elsewhere for a volunteer's own completed
// registration, a different meaning than an event's lifecycle status.
function mapEventStatus(status: EventRow['status']): EventDetail['status'] {
  if (status === 'available') return 'available';
  if (status === 'cancelled') return 'cancelled';
  return 'full';
}

function mapRequirements(row: EventRow): EventRequirements | undefined {
  const { min_age, requirements } = row;
  const skills = requirements?.skills?.length ? requirements.skills.join(', ') : undefined;
  const whatToBring = requirements?.what_to_bring?.length ? requirements.what_to_bring.join(', ') : undefined;
  const physical = requirements?.physical || undefined;
  const age = min_age != null ? `${min_age}+` : undefined;

  if (!age && !skills && !physical && !whatToBring) return undefined;
  return { age, skills, physical, whatToBring };
}

export function mapEventRow(row: EventRow): EventDetail {
  const start = new Date(row.start_at);
  const end = new Date(row.end_at);
  const hours = Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 10) / 10;

  return {
    id: row.id,
    title: row.title,
    organization: row.organizations?.name ?? 'Individual',
    organizationId: row.org_id ?? undefined,
    organizationVerified: row.organizations?.verification_status === 'verified',
    createdBy: row.created_by,
    creatorName: row.org_id ? undefined : (row.profiles?.full_name ?? undefined),
    category: row.category ?? undefined,
    date: formatShortDate(start),
    startTime: formatEventTime(row.start_at),
    endTime: formatEventTime(row.end_at),
    hours,
    location: row.address ?? 'Location TBD',
    description: row.description ?? undefined,
    requirements: mapRequirements(row),
    contactInfo: row.contact_email ?? row.contact_phone ?? undefined,
    website: row.website ?? undefined,
    volunteers: row.registered_count,
    maxVolunteers: row.capacity ?? undefined,
    status: mapEventStatus(row.status),
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    postedAt: row.posted_at,
    recurring: row.is_recurring,
    photoUrl: row.photo_url ?? undefined,
  };
}

// Find only ever shows events still open for registration — cancelled/
// completed events are excluded at the query level, not filtered client-side.
export async function listEvents(): Promise<EventDetail[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .in('status', ['available', 'full'])
    .order('start_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as EventRow[]).map(mapEventRow);
}

export async function getEvent(id: string): Promise<EventDetail | null> {
  const { data, error } = await supabase.from('events').select(EVENT_SELECT).eq('id', id).maybeSingle();

  if (error) throw error;
  return data ? mapEventRow(data as unknown as EventRow) : null;
}

// An org's own event management view — unlike listEvents(), this includes
// cancelled/completed events too, since an org needs to see its full history.
export async function listOrgEvents(organizationId: string): Promise<EventDetail[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('org_id', organizationId)
    .order('start_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as EventRow[]).map(mapEventRow);
}

export type CreateEventInput = {
  title: string;
  description?: string;
  category?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  startAt: string;
  endAt: string;
  capacity?: number;
  minAge?: number;
  requirements?: { skills?: string[]; physical?: string; whatToBring?: string[] };
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  photoUrl?: string;
  // null = individual/casual post (no organization).
  orgId: string | null;
};

// Used for both an individual's casual post and an org's event — org_id is
// the only thing that differs; the events_insert_own RLS policy already
// allows any authenticated user to insert with created_by = auth.uid(), and
// a DB trigger separately rejects org_id being set unless created_by admins
// that org (see migration 0003).
export async function createEvent(userId: string, input: CreateEventInput): Promise<EventDetail> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      org_id: input.orgId,
      created_by: userId,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      address: input.address ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      start_at: input.startAt,
      end_at: input.endAt,
      capacity: input.capacity ?? null,
      min_age: input.minAge ?? null,
      requirements: input.requirements
        ? {
            skills: input.requirements.skills,
            physical: input.requirements.physical,
            what_to_bring: input.requirements.whatToBring,
          }
        : null,
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      website: input.website ?? null,
      photo_url: input.photoUrl ?? null,
      is_recurring: false,
      status: 'available',
    })
    .select(EVENT_SELECT)
    .single();

  if (error) throw error;
  return mapEventRow(data as unknown as EventRow);
}

export type GeocodedAddress = { latitude: number; longitude: number; formattedAddress: string };

// Validate-on-submit, not live-as-you-type autocomplete (deliberately —
// autocomplete is Mapbox's session-billed Search Box API; this is the much
// cheaper per-request Geocoding API, proxied server-side in
// supabase/functions/geocode-address so the Mapbox token stays secret).
// Returns null (non-throwing) when the address doesn't resolve — the caller
// treats that as "couldn't verify," not a hard failure.
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const { data, error } = await supabase.functions.invoke('geocode-address', { body: { address } });
  if (error || !data || 'error' in data) return null;
  return data as GeocodedAddress;
}

// "Delete" an event means cancel it — events_update_owner RLS already lets
// the creator or an org admin do this, and trg_cascade_event_cancellation
// (migration 0021) auto-cancels every registrant with no penalty the moment
// status flips. No hard delete exists (or is needed) for events.
export async function cancelEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', eventId);
  if (error) throw error;
}
