import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface FelineHunterTier {
  id: string;
  tierNumber: number;
  title: string;
  minStreakDays: number;
  maxStreakDays: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  badgeBg: string;
  badgeBorder: string;
  accentColor: string;
  tagline: string;
  description: string;
  siaWisdom: string;
}

export const FELINE_TIERS: FelineHunterTier[] = [
  {
    id: 'tier-1',
    tierNumber: 1,
    title: 'Sleepy Stray',
    minStreakDays: 0,
    maxStreakDays: 0,
    icon: 'cat',
    badgeBg: 'bg-zinc-800/80',
    badgeBorder: 'border-zinc-700/80',
    accentColor: '#a1a1aa',
    tagline: 'The Journey Begins',
    description: 'Every great predator starts somewhere. Log your first catch today to awaken your inner hunter.',
    siaWisdom: 'Sia is blinking awake... Log your first meal to ignite your tracking streak!',
  },
  {
    id: 'tier-2',
    tierNumber: 2,
    title: 'Prowling Kitten',
    minStreakDays: 1,
    maxStreakDays: 3,
    icon: 'paw',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    accentColor: '#f59e0b',
    tagline: 'First Paws on the Trail',
    description: 'You have begun the hunt. Building daily habit velocity with acute focus.',
    siaWisdom: 'First catches logged! Your claws are sharpening. Keep the momentum rolling tomorrow.',
  },
  {
    id: 'tier-3',
    tierNumber: 3,
    title: 'Laser Hunter',
    minStreakDays: 4,
    maxStreakDays: 6,
    icon: 'crosshairs-gps',
    badgeBg: 'bg-cyan-500/10',
    badgeBorder: 'border-cyan-500/30',
    accentColor: '#06b6d4',
    tagline: 'Macro Target Acquired',
    description: 'Precision tracking locked. You anticipate meals and balance macros like a focused feline.',
    siaWisdom: 'Laser-focused! You are hitting targets with calculating precision. Just days from Apex status!',
  },
  {
    id: 'tier-4',
    tierNumber: 4,
    title: 'Apex Panther',
    minStreakDays: 7,
    maxStreakDays: 13,
    icon: 'lightning-bolt',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    accentColor: '#10b981',
    tagline: '7-Day Master of the Hunt',
    description: 'A full week of unbroken discipline. Your metabolic engine is operating with feline agility.',
    siaWisdom: '7 days undefeated! Sia purrs with deep respect. You dominate your nutrition routine.',
  },
  {
    id: 'tier-5',
    tierNumber: 5,
    title: 'Emerald Leopard',
    minStreakDays: 14,
    maxStreakDays: 29,
    icon: 'shield-crown',
    badgeBg: 'bg-teal-500/10',
    badgeBorder: 'border-teal-500/30',
    accentColor: '#14b8a6',
    tagline: 'Two Weeks of Sovereignty',
    description: 'Tracking is no longer a chore — it is your biological instinct. Elite consistency.',
    siaWisdom: '14+ days! Nothing escapes your tracking eye. An unstoppable emerald force in the wild.',
  },
  {
    id: 'tier-6',
    tierNumber: 6,
    title: 'Obsidian Lion',
    minStreakDays: 30,
    maxStreakDays: 99999,
    icon: 'crown',
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/30',
    accentColor: '#c084fc',
    tagline: 'Apex Nutritional Sovereignty',
    description: '30+ Days of supreme mastery. You rule your nutrition with unmatched power.',
    siaWisdom: 'All bow to the Obsidian Lion! 30 days of nutritional perfection. Truly legendary.',
  },
];

export interface FelineRankProgress {
  currentTier: FelineHunterTier;
  nextTier: FelineHunterTier | null;
  streakDays: number;
  daysToNextTier: number;
  progressPercent: number;
  isMaxTier: boolean;
}

export function getFelineHunterRank(streakDays: number): FelineRankProgress {
  const safeStreak = Math.max(0, streakDays);

  let currentTier = FELINE_TIERS[0];
  let nextTier: FelineHunterTier | null = FELINE_TIERS[1];

  for (let i = 0; i < FELINE_TIERS.length; i++) {
    const tier = FELINE_TIERS[i];
    if (safeStreak >= tier.minStreakDays && safeStreak <= tier.maxStreakDays) {
      currentTier = tier;
      nextTier = i < FELINE_TIERS.length - 1 ? FELINE_TIERS[i + 1] : null;
      break;
    }
  }

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      streakDays: safeStreak,
      daysToNextTier: 0,
      progressPercent: 100,
      isMaxTier: true,
    };
  }

  const rangeSpan = nextTier.minStreakDays - currentTier.minStreakDays;
  const currentSpan = safeStreak - currentTier.minStreakDays;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentSpan / rangeSpan) * 100)));
  const daysToNextTier = Math.max(1, nextTier.minStreakDays - safeStreak);

  return {
    currentTier,
    nextTier,
    streakDays: safeStreak,
    daysToNextTier,
    progressPercent,
    isMaxTier: false,
  };
}
