import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

// Opens the photo library, uploads the pick to the shared `post-photos`
// bucket under the uploader's own path prefix (required by the bucket's
// owner-insert storage policy — see migration 0029), and returns its public
// URL. Returns null if the user cancels the picker.
export async function pickAndUploadPhoto(userId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library access is required to attach a photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  const ext = asset.uri.split('.').pop() ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const response = await fetch(asset.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('post-photos')
    .upload(path, blob, { contentType: asset.mimeType ?? 'image/jpeg' });
  if (error) throw error;

  return supabase.storage.from('post-photos').getPublicUrl(path).data.publicUrl;
}
