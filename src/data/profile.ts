import { supabase } from '@/lib/supabase';

// profiles UPDATE is column-restricted to avatar_url (migration 0049) plus
// city (migration 0050), so these are the only profile fields a client can write.
export async function setAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
  if (error) throw error;
}

export async function setCity(userId: string, city: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ city }).eq('id', userId);
  if (error) throw error;
}
