import { supabase } from '@/lib/supabase';
import type { EventDetail } from '@/data/mock-events';
import { formatShortDate } from '@/utils/dates';

export const EVENT_SELECT = '*, organizations(name, verification_status)';

export type EventRow = {
  id: string;
  org_id: string | null;
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
  organizations: { name: string; verification_status: string } | null;
};

function formatEventTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// event_lifecycle_status has 'cancelled'/'completed' states EventCard's
// StatusIndicator doesn't render (Find only ever lists available/full events;
// a single past/cancelled event fetched via getEvent doesn't use this field
// for anything — event/[id].tsx never reads `.status`). Collapse both to
// 'full' rather than widening EventStatus for two states nothing displays.
function mapEventStatus(status: EventRow['status']): EventDetail['status'] {
  return status === 'available' ? 'available' : 'full';
}

export function mapEventRow(row: EventRow): EventDetail {
  const start = new Date(row.start_at);
  const end = new Date(row.end_at);
  const hours = Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 10) / 10;

  return {
    id: row.id,
    title: row.title,
    organization: row.organizations?.name ?? 'Individual event',
    organizationId: row.org_id ?? undefined,
    organizationVerified: row.organizations?.verification_status === 'verified',
    category: row.category ?? undefined,
    date: formatShortDate(start),
    startTime: formatEventTime(row.start_at),
    endTime: formatEventTime(row.end_at),
    hours,
    location: row.address ?? 'Location TBD',
    description: row.description ?? undefined,
    contactInfo: row.contact_email ?? row.contact_phone ?? undefined,
    website: row.website ?? undefined,
    volunteers: row.registered_count,
    maxVolunteers: row.capacity ?? undefined,
    status: mapEventStatus(row.status),
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    postedAt: row.posted_at,
    recurring: row.is_recurring,
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
