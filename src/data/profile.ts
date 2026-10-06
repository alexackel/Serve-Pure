import { supabase } from '@/lib/supabase';

// profiles UPDATE is column-restricted to avatar_url (migration 0049), so this
// is the only profile field a client can write.
export async function setAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
  if (error) throw error;
}
