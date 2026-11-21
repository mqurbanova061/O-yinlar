export type AgeGroupId = '3-5' | '6-9' | '10-15' | '16-20';

export type PortalPage =
  | 'home'
  | 'games'
  | 'favorites'
  | 'profile'
  | 'category';

export interface AgeGroupInfo {
  id: AgeGroupId;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  accentColor: string;
  difficultyLabel: string;
  safetyNote: string;
}

export interface GameMetadata {
  id: string;
  title: string;
  ageGroup: AgeGroupId;
  categoryLabel: string;
  shortDesc: string;
  fullDesc: string;
  controlsDesktop: string;
  controlsMobile: string;
  difficulty: 'Oson' | 'O‘rtacha' | 'Qiyin' | 'Simulyator';
  isPopular?: boolean;
  isNew?: boolean;
  accentHex: string;
  gradientClass: string;
  iconName: string;
  maxLevels: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  conditionText: string;
}

export interface UserProfile {
  username: string;
  ageGroup: AgeGroupId;
  createdAt: string;
  totalGamesPlayed: number;
  totalScore: number;
  favorites: string[];
  recentlyPlayed: string[];
  highScores: Record<string, number>;
  levelsCompleted: Record<string, number>;
  achievements: string[];
  soundMuted: boolean;
  musicMuted: boolean;
}

export type GameStatus = 'start' | 'playing' | 'paused' | 'victory' | 'gameover';

export interface GameSessionProps {
  game: GameMetadata;
  level: number;
  status: GameStatus;
  onScoreChange: (deltaOrAbsolute: number, isAbsolute?: boolean) => void;
  onObjectiveUpdate: (text: string) => void;
  onVictory: (finalScore?: number) => void;
  onGameOver: (finalScore?: number) => void;
}
