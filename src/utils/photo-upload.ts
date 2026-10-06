import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export type PickedPhoto = { uri: string; mimeType: string | null; width: number; height: number };

// Square crop rectangle, in the picked photo's pixel space.
export type SquareCrop = { originX: number; originY: number; size: number };

const AVATAR_OUTPUT_PX = 512;

// Opens the photo library and returns the pick, or null if the user cancels.
export async function pickPhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library access is required to attach a photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType ?? null, width: asset.width, height: asset.height };
}

// Crops the picked photo to a square and re-encodes it as a 512px JPEG, so an
// avatar is always a small, square, upright image regardless of the source.
export async function cropSquare(photo: PickedPhoto, crop: SquareCrop): Promise<PickedPhoto> {
  const rect = {
    originX: Math.round(crop.originX),
    originY: Math.round(crop.originY),
    width: Math.round(crop.size),
    height: Math.round(crop.size),
  };
  const result = await ImageManipulator.manipulateAsync(
    photo.uri,
    [{ crop: rect }, { resize: { width: AVATAR_OUTPUT_PX } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, mimeType: 'image/jpeg', width: result.width, height: result.height };
}

// Uploads a picked photo to the shared `post-photos` bucket under the uploader's
// own path prefix (required by the bucket's owner-insert storage policy — see
// migration 0029) and returns its public URL.
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
};

// Never split the URI on '.' blindly: a URI without an extension (e.g. web
// blob: URIs) would turn the whole URI into the "extension" and put slashes
// and colons into the storage path.
function extensionFor(photo: PickedPhoto): string {
  if (photo.mimeType && EXTENSION_BY_MIME[photo.mimeType]) return EXTENSION_BY_MIME[photo.mimeType];
  const match = photo.uri.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : 'jpg';
}

export async function uploadPhoto(userId: string, photo: PickedPhoto): Promise<string> {
  const path = `${userId}/${Date.now()}.${extensionFor(photo)}`;

  const response = await fetch(photo.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('post-photos')
    .upload(path, blob, { contentType: photo.mimeType ?? 'image/jpeg' });
  if (error) throw error;

  return supabase.storage.from('post-photos').getPublicUrl(path).data.publicUrl;
}

export async function pickAndUploadPhoto(userId: string): Promise<string | null> {
  const photo = await pickPhoto();
  if (!photo) return null;
  return uploadPhoto(userId, photo);
}
