import type { useRouter } from 'expo-router';
import type { Profile } from '../../types';

/** After signing in: people with a plan go to Today, everyone else to onboarding. */
export async function routeAfterAuth(router: ReturnType<typeof useRouter>, fetchProfile: () => Promise<Profile | null | undefined>) {
  const profile = await fetchProfile();
  router.replace((profile?.target_calories ? '/(tabs)' : '/(auth)/onboarding') as any);
}
