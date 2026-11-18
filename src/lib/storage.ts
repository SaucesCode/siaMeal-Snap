import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { MEAL_IMAGES_BUCKET, toMealImagePath } from './mealImages';

/**
 * Decodes a base64 string into an ArrayBuffer for Supabase Storage uploads.
 */
function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Uploads a compressed meal photo to the private 'meal-images' bucket and returns its
 * object path ("<userId>/<file>"), which is resolved to a signed URL for display.
 * Falls back to the local URI if the upload fails.
 */
export async function uploadMealPhotoToSupabase(
  localUri: string,
  userId: string
): Promise<string | null> {
  if (!localUri) return null;

  // Already stored, or an external URL
  if (toMealImagePath(localUri) || localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return localUri;
  }

  try {
    const isWebP = localUri.toLowerCase().endsWith('.webp');
    const extension = isWebP ? 'webp' : 'jpg';
    const contentType = isWebP ? 'image/webp' : 'image/jpeg';
    const filename = `${userId}/${Date.now()}.${extension}`;

    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const arrayBuffer = decodeBase64ToArrayBuffer(base64);

    const { data, error } = await supabase.storage
      .from(MEAL_IMAGES_BUCKET)
      .upload(filename, arrayBuffer, {
        contentType,
        upsert: false,
        cacheControl: '31536000',
      });

    if (error) {
      console.warn('Supabase storage upload error, keeping local URI fallback:', error.message);
      return localUri;
    }

    return data.path;
  } catch (err) {
    console.warn('Failed to upload meal photo to Supabase storage:', err);
    return localUri;
  }
}
