import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

const EXPO_GO_HOST = /^(exps?):\/\/([^/?#]+)/;

/**
 * Where a sign-in link should come back to. If the app was opened through an exp:// address
 * (Expo Go), that address is the one this phone routes back to the app; otherwise the app scheme.
 */
export function returnUrlFrom(candidates: Array<string | null | undefined>, path: string, appUrl: string): string {
  for (const url of candidates) {
    const match = url?.match(EXPO_GO_HOST);
    if (match) return `${match[1]}://${match[2]}/--/${path}`;
  }
  return appUrl;
}

/** The return address for this phone: Expo Go's own address in development, siamealsnap:// in a build. */
export async function appReturnUrl(path: string): Promise<string> {
  const launched = Linking.getLinkingURL() ?? (await Linking.getInitialURL());
  return returnUrlFrom([launched, Constants.linkingUri], path, makeRedirectUri({ scheme: 'siamealsnap', path }));
}
