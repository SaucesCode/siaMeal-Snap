import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export const MEAL_IMAGES_BUCKET = 'meal-images';

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const LEGACY_PUBLIC_URL_MARKER = `/storage/v1/object/public/${MEAL_IMAGES_BUCKET}/`;
const OBJECT_PATH_PATTERN = /^[0-9a-f-]{36}\/[^/]+$/i;

type Waiter = { resolve: (uri: string) => void; reject: (err: Error) => void };

const signedUrlCache = new Map<string, { uri: string; expiresAt: number }>();
let pendingPaths = new Map<string, Waiter[]>();
let flushScheduled = false;

/**
 * Returns the storage object path for a meal photo stored in the private bucket, or null
 * when the value is something else (a local file URI, or an external URL).
 * Accepts both bare object paths ("<userId>/<file>") and legacy public bucket URLs.
 */
export function toMealImagePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const markerIndex = imageUrl.indexOf(LEGACY_PUBLIC_URL_MARKER);
  if (markerIndex !== -1) {
    const path = imageUrl.slice(markerIndex + LEGACY_PUBLIC_URL_MARKER.length).split('?')[0];
    return decodeURIComponent(path);
  }
  return OBJECT_PATH_PATTERN.test(imageUrl) ? imageUrl : null;
}

async function flushPendingPaths() {
  const batch = pendingPaths;
  pendingPaths = new Map();
  flushScheduled = false;

  const paths = [...batch.keys()];
  const { data, error } = await supabase.storage
    .from(MEAL_IMAGES_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    const failure = new Error(error?.message ?? 'Could not load meal photos.');
    batch.forEach((waiters) => waiters.forEach((w) => w.reject(failure)));
    return;
  }

  const expiresAt = Date.now() + SIGNED_URL_TTL_SECONDS * 1000;
  for (const item of data) {
    const waiters = item.path ? batch.get(item.path) : undefined;
    if (!waiters) continue;
    batch.delete(item.path as string);
    if (item.signedUrl) {
      signedUrlCache.set(item.path as string, { uri: item.signedUrl, expiresAt });
      waiters.forEach((w) => w.resolve(item.signedUrl as string));
    } else {
      const failure = new Error(item.error ?? 'Meal photo not found.');
      waiters.forEach((w) => w.reject(failure));
    }
  }

  // Paths the API did not echo back.
  const missing = new Error('Meal photo not found.');
  batch.forEach((waiters) => waiters.forEach((w) => w.reject(missing)));
}

/**
 * Resolves a private object path to a signed URL. Requests made in the same tick are
 * batched into one createSignedUrls call, and URLs are cached until shortly before expiry.
 */
function getSignedMealImageUrl(path: string): Promise<string> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return Promise.resolve(cached.uri);
  }

  return new Promise((resolve, reject) => {
    const waiters = pendingPaths.get(path) ?? [];
    waiters.push({ resolve, reject });
    pendingPaths.set(path, waiters);
    if (!flushScheduled) {
      flushScheduled = true;
      setTimeout(() => {
        flushPendingPaths().catch((err: unknown) => {
          console.warn('Meal photo signing failed:', err);
        });
      }, 0);
    }
  });
}

/**
 * expo-image source for a meal's image_url. Private bucket paths resolve to signed URLs
 * cached under the object path, so the disk cache survives hourly URL rotation; local file
 * URIs and other URLs pass through. Returns null while resolving or when the photo cannot
 * be loaded, so callers show their placeholder.
 */
export function useMealImageSource(
  imageUrl: string | null | undefined
): { uri: string; cacheKey?: string } | null {
  const path = toMealImagePath(imageUrl);
  const [signedUri, setSignedUri] = useState<string | null>(null);

  useEffect(() => {
    setSignedUri(null);
    if (!path) return;

    let active = true;
    getSignedMealImageUrl(path)
      .then((uri) => {
        if (active) setSignedUri(uri);
      })
      .catch((err: unknown) => {
        console.warn('Could not load meal photo:', err instanceof Error ? err.message : err);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (!imageUrl) return null;
  if (!path) return { uri: imageUrl };
  return signedUri ? { uri: signedUri, cacheKey: path } : null;
}
