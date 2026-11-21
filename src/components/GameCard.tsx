import React from 'react';
import {
  Apple,
  Award,
  Blocks,
  Brain,
  Building2,
  Calculator,
  Car,
  Compass,
  Flame,
  Footprints,
  Gauge,
  Globe,
  Heart,
  Palette,
  Play,
  Puzzle,
  Rabbit,
  Rocket,
  Shapes,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { GameMetadata } from '../types';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Palette,
  Rabbit,
  Shapes,
  Apple,
  Puzzle,
  Car,
  Calculator,
  Brain,
  Compass,
  Sparkles,
  Gauge,
  Blocks,
  Trophy,
  Rocket,
  Footprints,
  SteeringWheel: Gauge,
  Globe,
  Award,
  Building2,
  Flame,
};

interface GameCardProps {
  game: GameMetadata;
  isFavorite: boolean;
  highScore?: number;
  onPlay: (game: GameMetadata) => void;
  onToggleFavorite: (gameId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  isFavorite,
  highScore = 0,
  onPlay,
  onToggleFavorite,
}) => {
  const IconComp = ICON_MAP[game.iconName] ?? Sparkles;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-[#131822] transition-transform duration-200 hover:-translate-y-1 hover:border-slate-700">
      {/* 3D Stylized Visual Cover */}
      <div
        onClick={() => onPlay(game)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPlay(game);
          }
        }}
        className={`relative aspect-[16/10] w-full cursor-pointer overflow-hidden bg-gradient-to-br ${game.gradientClass} p-5 flex items-center justify-center`}
      >
        {/* Geometric 3D Perspective Grid Accent */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.22) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-[#0B0E14]/70 shadow-xl transition-transform duration-200 group-hover:scale-110"
          style={{ color: game.accentHex }}
        >
          <IconComp className="h-8 w-8" />
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(game.id);
          }}
          aria-label={isFavorite ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo‘shish'}
          title={isFavorite ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo‘shish'}
          className={`absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
            isFavorite
              ? 'border-rose-500/50 bg-rose-500/20 text-rose-400'
              : 'border-white/10 bg-[#0B0E14]/70 text-slate-300 hover:text-white'
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
            <span>{game.categoryLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{game.ageGroup} yosh</span>
            <span aria-hidden="true">·</span>
            <span>{game.difficulty}</span>
          </div>

          <h3 className="mt-1.5 font-display text-lg font-bold text-white line-clamp-1">
            {game.title}
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-300 line-clamp-2">
            {game.shortDesc}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="text-xs text-slate-400 tabular-nums">
            {highScore > 0 ? (
              <span>
                Rekord: <strong className="font-mono text-amber-400">{highScore}</strong>
              </span>
            ) : (
              <span>3D WebGL</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onPlay(game)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>O‘ynash</span>
          </button>
        </div>
      </div>
    </article>
  );
};
