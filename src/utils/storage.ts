import { AgeGroupId, UserProfile } from '../types';

const STORAGE_KEY = 'uz_game_world_profile_v1';

export function loadUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed || !parsed.username || !parsed.ageGroup) return null;
    return {
      ...parsed,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recentlyPlayed: Array.isArray(parsed.recentlyPlayed) ? parsed.recentlyPlayed : [],
      highScores: parsed.highScores && typeof parsed.highScores === 'object' ? parsed.highScores : {},
      levelsCompleted:
        parsed.levelsCompleted && typeof parsed.levelsCompleted === 'object' ? parsed.levelsCompleted : {},
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      soundMuted: Boolean(parsed.soundMuted),
      musicMuted: Boolean(parsed.musicMuted),
    };
  } catch {
    return null;
  }
}

export function createUserProfile(username: string, ageGroup: AgeGroupId): UserProfile {
  const profile: UserProfile = {
    username: username.trim(),
    ageGroup,
    createdAt: new Date().toISOString(),
    totalGamesPlayed: 0,
    totalScore: 0,
    favorites: [],
    recentlyPlayed: [],
    highScores: {},
    levelsCompleted: {},
    achievements: [],
    soundMuted: false,
    musicMuted: false,
  };
  saveUserProfile(profile);
  return profile;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function evaluateAchievements(profile: UserProfile): string[] {
  const unlocked = new Set(profile.achievements);
  if (profile.totalGamesPlayed >= 1) unlocked.add('first_game');
  if (profile.totalGamesPlayed >= 5) unlocked.add('five_games');
  if (profile.totalScore >= 500) unlocked.add('score_500');
  if (profile.totalScore >= 2000) unlocked.add('score_2000');
  if (profile.favorites.length >= 3) unlocked.add('favorite_collector');
  return Array.from(unlocked);
}
