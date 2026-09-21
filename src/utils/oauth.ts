import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Initiates Google OAuth flow across Web and Mobile.
 */
export async function performGoogleOAuth() {
  // 1. Web Platform (Standard browser redirect)
  if (Platform.OS === 'web') {
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    console.log('[OAuth Web] Redirecting to origin:', origin);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin,
      },
    });

    if (error) throw error;
    return data;
  }

  // 2. Mobile Platforms (Custom Scheme Redirect)
  // Ensure no stale or leftover session from another account pollutes this attempt
  try {
    await supabase.auth.signOut();
  } catch {}

  const redirectUrl = makeRedirectUri({
    scheme: 'siamealsnap',
    path: 'auth/callback',
  });

  console.log('[OAuth Mobile] Generated redirect URL:', redirectUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
      },
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

  console.log('[OAuth Mobile] Starting WebBrowser session with:', data.url);

  return new Promise(async (resolve, reject) => {
    let handled = false;

    const handleCallbackUrl = async (callbackUrl: string) => {
      if (handled) return;
      handled = true;

      try {
        console.log('[OAuth Mobile] Processing callback URL:', callbackUrl);
        try {
          WebBrowser.dismissAuthSession();
        } catch {}

        const params = parseOAuthParams(callbackUrl);

        if (params.code) {
          console.log('[OAuth Mobile] Exchanging code for session...');
          const { data: sessionData, error: sessionError } =
            await supabase.auth.exchangeCodeForSession(params.code);

          if (sessionError) throw sessionError;
          resolve(sessionData);
          return;
        }

        if (params.access_token && params.refresh_token) {
          console.log('[OAuth Mobile] Setting session with tokens...');
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });

          if (sessionError) throw sessionError;
          resolve(sessionData);
          return;
        }

        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session) {
          resolve(currentSession);
          return;
        }

        resolve(null);
      } catch (err) {
        console.error('[OAuth Mobile] Callback handling error:', err);
        reject(err);
      }
    };

    const sub = Linking.addEventListener('url', (event) => {
      if (
        event.url &&
        (event.url.includes('code=') ||
          event.url.includes('access_token=') ||
          event.url.includes('auth/callback') ||
          event.url.startsWith('siamealsnap://') ||
          event.url.startsWith('exp://'))
      ) {
        handleCallbackUrl(event.url);
      }
    });

    try {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
        showInRecents: true,
        createTask: false,
      });
      console.log('[OAuth Mobile] WebBrowser finished with result:', result.type);

      if (result.type === 'success' && result.url) {
        await handleCallbackUrl(result.url);
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('[OAuth Mobile] User cancelled or dismissed OAuth session.');
        resolve(null);
      }
    } catch (err) {
      if (!handled) {
        reject(err);
      }
    } finally {
      sub.remove();
    }
  });
}

function parseOAuthParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');

  const hashPart = hashIndex !== -1 ? url.substring(hashIndex + 1) : '';
  const queryPart =
    queryIndex !== -1
      ? hashIndex !== -1 && hashIndex > queryIndex
        ? url.substring(queryIndex + 1, hashIndex)
        : url.substring(queryIndex + 1)
      : '';

  const params: Record<string, string> = {};

  const parseString = (str: string) => {
    str.split('&').forEach((item) => {
      const [k, v] = item.split('=');
      if (k && v) {
        params[k] = decodeURIComponent(v);
      }
    });
  };

  if (queryPart) parseString(queryPart);
  if (hashPart) parseString(hashPart);

  return params;
}
