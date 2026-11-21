import React from 'react';
import { GameShell } from '../components/GameShell';
import { GameMetadata, GameSessionProps } from '../types';
import {
  CollectFruits3D,
  EasyPuzzles3D,
  FindAnimals3D,
  LearnColors3D,
  ShapeMatching3D,
} from './GamesAge3to5';
import {
  AnimalWorld3D,
  KartRacing3D,
  MagicIsland3D,
  MathAdventure3D,
  MemoryGame3D,
} from './GamesAge6to9';
import {
  FootballChallenge3D,
  ParkourAdventure3D,
  SpaceExplorer3D,
  SuperRacing3D,
  VoxelBuilder3D,
} from './GamesAge10to15';
import {
  CityDriving3D,
  OpenWorld3D,
  RealisticCarSim3D,
  RealisticFootballSim3D,
  SurvivalExploration3D,
} from './GamesAge16to20';

const GAME_COMPONENTS: Record<string, React.FC<GameSessionProps>> = {
  // 3-5 yosh
  'learn-colors': LearnColors3D,
  'find-animals': FindAnimals3D,
  'shape-matching': ShapeMatching3D,
  'collect-fruits': CollectFruits3D,
  'easy-puzzles': EasyPuzzles3D,
  // 6-9 yosh
  'kart-racing-3d': KartRacing3D,
  'math-adventure': MathAdventure3D,
  'memory-game-3d': MemoryGame3D,
  'animal-world-3d': AnimalWorld3D,
  'magic-island-3d': MagicIsland3D,
  // 10-15 yosh
  'super-racing-3d': SuperRacing3D,
  'voxel-builder-3d': VoxelBuilder3D,
  'football-challenge-3d': FootballChallenge3D,
  'space-explorer-3d': SpaceExplorer3D,
  'parkour-adventure-3d': ParkourAdventure3D,
  // 16-20 yosh
  'realistic-car-sim': RealisticCarSim3D,
  'open-world-3d': OpenWorld3D,
  'realistic-football-sim': RealisticFootballSim3D,
  'city-driving-3d': CityDriving3D,
  'survival-exploration-3d': SurvivalExploration3D,
};

interface ActiveGameModalProps {
  game: GameMetadata;
  initialLevel: number;
  highScore: number;
  soundMuted: boolean;
  musicMuted: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onRecordResult: (gameId: string, score: number, levelCompleted: number, won: boolean) => void;
  onClose: () => void;
}

export const ActiveGamePlayer: React.FC<ActiveGameModalProps> = ({
  game,
  initialLevel,
  highScore,
  soundMuted,
  musicMuted,
  onToggleSound,
  onToggleMusic,
  onRecordResult,
  onClose,
}) => {
  const EngineComponent = GAME_COMPONENTS[game.id] ?? LearnColors3D;

  return (
    <GameShell
      game={game}
      initialLevel={initialLevel}
      highScore={highScore}
      soundMuted={soundMuted}
      musicMuted={musicMuted}
      onToggleSound={onToggleSound}
      onToggleMusic={onToggleMusic}
      onRecordResult={onRecordResult}
      onBackHome={onClose}
      renderEngine={(sessionProps) => <EngineComponent {...sessionProps} />}
    />
  );
};
