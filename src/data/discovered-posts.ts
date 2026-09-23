import { supabase } from '@/lib/supabase';
import type { AiOrgCategory } from '@/data/ai-orgs';

const FLAG_HIDE_THRESHOLD = 5;

export type DiscoveredPost = {
  id: string;
  createdBy: string;
  name: string;
  description: string | null;
  category: AiOrgCategory;
  address: string;
  latitude: number | null;
  longitude: number | null;
  website: string;
  contactEmail: string | null;
  contactPhone: string | null;
  photoUrl: string | null;
  flaggedCount: number;
  createdAt: string;
};

type DiscoveredPostRow = {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  category: AiOrgCategory;
  address: string;
  latitude: number | null;
  longitude: number | null;
  website: string;
  contact_email: string | null;
  contact_phone: string | null;
  photo_url: string | null;
  flagged_count: number;
  created_at: string;
};

function mapDiscoveredPostRow(row: DiscoveredPostRow): DiscoveredPost {
  return {
    id: row.id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    category: row.category,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    website: row.website,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    photoUrl: row.photo_url,
    flaggedCount: row.flagged_count,
    createdAt: row.created_at,
  };
}

export type CreateDiscoveredPostInput = {
  name: string;
  description?: string;
  category: AiOrgCategory;
  address: string;
  latitude?: number;
  longitude?: number;
  website: string;
  contactEmail?: string;
  contactPhone?: string;
  photoUrl?: string;
};

export async function createDiscoveredPost(userId: string, input: CreateDiscoveredPostInput): Promise<DiscoveredPost> {
  const { data, error } = await supabase
    .from('discovered_posts')
    .insert({
      created_by: userId,
      name: input.name,
      description: input.description ?? null,
      category: input.category,
      address: input.address,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      website: input.website,
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      photo_url: input.photoUrl ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapDiscoveredPostRow(data as DiscoveredPostRow);
}

// Excludes posts hidden by the community (flagged_count >= 5, same
// hide-at-5 convention as discover-ai-orgs' FLAG_HIDE_THRESHOLD) — except a
// submitter's own post, which stays visible to them even once hidden from
// everyone else, so they can still find and delete it.
export async function listDiscoveredPosts(currentUserId: string | null): Promise<DiscoveredPost[]> {
  let query = supabase.from('discovered_posts').select().order('created_at', { ascending: false });

  query = currentUserId
    ? query.or(`flagged_count.lt.${FLAG_HIDE_THRESHOLD},created_by.eq.${currentUserId}`)
    : query.lt('flagged_count', FLAG_HIDE_THRESHOLD);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as DiscoveredPostRow[]).map(mapDiscoveredPostRow);
}

// RLS (discovered_posts_delete_own) enforces that only the submitter can
// delete their own post — unrestricted by time/status, since a Discovered
// post has no review workflow acting on it that a later delete could disrupt.
export async function deleteDiscoveredPost(id: string): Promise<void> {
  const { error } = await supabase.from('discovered_posts').delete().eq('id', id);
  if (error) throw error;
}

// Increments a Discovered post's flagged_count. No review queue yet — a soft
// signal only, see fn_flag_discovered_post in the 0034 migration.
export async function reportDiscoveredPost(id: string): Promise<void> {
  const { error } = await supabase.rpc('fn_flag_discovered_post', { p_post_id: id });
  if (error) throw error;
}

// Undoes a volunteer's own report from the Reported Posts screen. See
// fn_unflag_discovered_post in the 0034 migration.
export async function unreportDiscoveredPost(id: string): Promise<void> {
  const { error } = await supabase.rpc('fn_unflag_discovered_post', { p_post_id: id });
  if (error) throw error;
}
