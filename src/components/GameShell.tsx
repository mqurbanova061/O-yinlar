import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Music,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameMetadata, GameSessionProps, GameStatus } from '../types';
import { gameAudio } from '../utils/audio';

interface GameShellProps {
  game: GameMetadata;
  initialLevel?: number;
  highScore: number;
  soundMuted: boolean;
  musicMuted: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onRecordResult: (gameId: string, score: number, levelCompleted: number, won: boolean) => void;
  onBackHome: () => void;
  renderEngine: (props: GameSessionProps) => React.ReactNode;
}

export const GameShell: React.FC<GameShellProps> = ({
  game,
  initialLevel = 1,
  highScore,
  soundMuted,
  musicMuted,
  onToggleSound,
  onToggleMusic,
  onRecordResult,
  onBackHome,
  renderEngine,
}) => {
  const [status, setStatus] = useState<GameStatus>('start');
  const [level, setLevel] = useState<number>(initialLevel);
  const [score, setScore] = useState<number>(0);
  const [objective, setObjective] = useState<string>(game.shortDesc);
  const [sessionSeed, setSessionSeed] = useState<number>(1);

  useEffect(() => {
    gameAudio.setMuted(soundMuted, musicMuted);
  }, [soundMuted, musicMuted]);

  useEffect(() => {
    if (status === 'playing' && !musicMuted) {
      gameAudio.startMusic(game.ageGroup === '3-5' ? 540 : 420);
    } else {
      gameAudio.stopMusic();
    }
    return () => {
      gameAudio.stopMusic();
    };
  }, [status, musicMuted, game.ageGroup]);

  const handleStart = () => {
    gameAudio.playClick();
    setScore(0);
    setStatus('playing');
  };

  const handlePause = () => {
    if (status === 'playing') {
      gameAudio.playClick();
      setStatus('paused');
    } else if (status === 'paused') {
      gameAudio.playClick();
      setStatus('playing');
    }
  };

  const handleRestart = () => {
    gameAudio.playClick();
    setScore(0);
    setSessionSeed((s) => s + 1);
    setStatus('playing');
  };

  const handleNextLevel = () => {
    gameAudio.playClick();
    const nextLvl = Math.min(level + 1, game.maxLevels);
    setLevel(nextLvl);
    setSessionSeed((s) => s + 1);
    setStatus('playing');
  };

  const handleScoreChange = useCallback((deltaOrAbs: number, isAbsolute?: boolean) => {
    setScore((prev) => {
      const next = isAbsolute ? deltaOrAbs : Math.max(0, prev + deltaOrAbs);
      return next;
    });
  }, []);

  const handleVictory = useCallback(
    (finalScore?: number) => {
      setScore((prev) => {
        const resolved = finalScore !== undefined ? finalScore : prev;
        onRecordResult(game.id, resolved, level, true);
        return resolved;
      });
      gameAudio.playVictory();
      setStatus('victory');
    },
    [game.id, level, onRecordResult]
  );

  const handleGameOver = useCallback(
    (finalScore?: number) => {
      setScore((prev) => {
        const resolved = finalScore !== undefined ? finalScore : prev;
        onRecordResult(game.id, resolved, Math.max(0, level - 1), false);
        return resolved;
      });
      gameAudio.playError();
      setStatus('gameover');
    },
    [game.id, level, onRecordResult]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (status === 'playing' || status === 'paused')) {
        handlePause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070A10] text-slate-100 select-none">
      {/* Compact Top Game Bar (no backdrop-blur over WebGL) */}
      <header className="relative z-20 flex items-center justify-between gap-4 border-b border-slate-800/90 bg-[#0D121B] px-3 py-2.5 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              gameAudio.playClick();
              gameAudio.stopMusic();
              onBackHome();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Orqaga qaytish</span>
            <span className="sm:hidden">Orqaga</span>
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-sm sm:text-base font-bold text-white">
              {game.title}
            </h1>
            <p className="hidden md:block truncate text-xs text-slate-400">
              {game.categoryLabel} · {game.ageGroup} yosh
            </p>
          </div>
        </div>

        {/* Live Telemetry */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Bosqich</div>
            <div className="font-mono text-sm sm:text-base font-bold text-cyan-400 tabular-nums">
              {level}/{game.maxLevels}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Ball</div>
            <div className="font-mono text-sm sm:text-base font-bold text-amber-400 tabular-nums">
              {score}
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-[11px] text-slate-400">Rekord</div>
            <div className="font-mono text-sm font-semibold text-slate-300 tabular-nums">
              {Math.max(highScore, score)}
            </div>
          </div>
        </div>

        {/* Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onToggleSound}
            title={soundMuted ? 'Ovozni yoqish' : 'Ovozni o‘chirish'}
            aria-label={soundMuted ? 'Ovozni yoqish' : 'Ovozni o‘chirish'}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
              soundMuted
                ? 'border-slate-700 bg-slate-800/60 text-slate-500'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onToggleMusic}
            title={musicMuted ? 'Musiqani yoqish' : 'Musiqani o‘chirish'}
            aria-label={musicMuted ? 'Musiqani yoqish' : 'Musiqani o‘chirish'}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
              musicMuted
                ? 'border-slate-700 bg-slate-800/60 text-slate-500'
                : 'border-slate-700 bg-slate-800 text-amber-400 hover:bg-slate-700'
            }`}
          >
            <Music className="h-4 w-4" />
          </button>
          {(status === 'playing' || status === 'paused') && (
            <>
              <button
                onClick={handlePause}
                title={status === 'paused' ? 'Davom etish' : 'Pauza'}
                aria-label={status === 'paused' ? 'Davom etish' : 'Pauza'}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <button
                onClick={handleRestart}
                title="Qayta boshlash"
                aria-label="Qayta boshlash"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main 3D Viewport Area */}
      <div className="relative flex-1 overflow-hidden bg-[#090D16]">
        {/* Keyed by sessionSeed + level so restarts cleanly reinitialize 3D scene */}
        <div key={`${game.id}-${level}-${sessionSeed}`} className="h-full w-full">
          {renderEngine({
            game,
            level,
            status,
            onScoreChange: handleScoreChange,
            onObjectiveUpdate: setObjective,
            onVictory: handleVictory,
            onGameOver: handleGameOver,
          })}
        </div>

        {/* Live Objective Banner when playing */}
        {status === 'playing' && objective && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-10 max-w-[92vw]">
            <div className="rounded-xl border border-slate-700/80 bg-[#0D131F]/90 px-4 py-2 text-center shadow-lg">
              <p className="text-xs sm:text-sm font-medium text-slate-100">{objective}</p>
            </div>
          </div>
        )}

        {/* START SCREEN OVERLAY */}
        {status === 'start' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#070A10]/85 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#111724] p-6 sm:p-8 shadow-2xl">
              <div className="text-xs font-medium text-amber-400">
                {game.categoryLabel} · {game.ageGroup} yosh · {game.difficulty}
              </div>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white">
                {game.title}
              </h2>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300">
                {game.fullDesc}
              </p>

              <div className="mt-5 space-y-2.5 rounded-xl border border-slate-800 bg-[#0B101A] p-4 text-xs sm:text-sm text-slate-300">
                <div>
                  <span className="font-semibold text-white">Kompyuterda: </span>
                  {game.controlsDesktop}
                </div>
                <div>
                  <span className="font-semibold text-white">Telefonda: </span>
                  {game.controlsMobile}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleStart}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm sm:text-base font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap min-h-[48px]"
                >
                  <Play className="h-5 w-5 fill-current" />
                  <span>O‘ynash</span>
                </button>
                <button
                  onClick={onBackHome}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-5 py-3.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap min-h-[48px]"
                >
                  Orqaga qaytish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PAUSED OVERLAY */}
        {status === 'paused' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#070A10]/82 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#111724] p-6 text-center shadow-2xl">
              <h2 className="font-display text-2xl font-bold text-white">O‘yin to‘xtatildi</h2>
              <p className="mt-2 text-sm text-slate-400">
                Joriy ball: <span className="font-mono font-bold text-amber-400">{score}</span>
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={handlePause}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors min-h-[44px]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Davom etish</span>
                </button>
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors min-h-[44px]"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Qayta boshlash</span>
                </button>
                <button
                  onClick={onBackHome}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-transparent px-5 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors min-h-[44px]"
                >
                  Orqaga qaytish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VICTORY OVERLAY */}
        {status === 'victory' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#070A10]/85 p-4">
            <div className="w-full max-w-md rounded-2xl border border-emerald-500/40 bg-[#111724] p-7 text-center shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <Trophy className="h-8 w-8" />
              </div>
              <h2 className="mt-4 font-display text-2xl sm:text-3xl font-bold text-white">
                G‘alaba! Barakalla!
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                {level}-bosqich muvaffaqiyatli yakunlandi.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-[#0B101A] p-4">
                <div>
                  <div className="text-xs text-slate-400">To‘plangan ball</div>
                  <div className="mt-1 font-mono text-xl font-bold text-amber-400 tabular-nums">
                    {score}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Eng yaxshi natija</div>
                  <div className="mt-1 font-mono text-xl font-bold text-emerald-400 tabular-nums">
                    {Math.max(highScore, score)}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {level < game.maxLevels && (
                  <button
                    onClick={handleNextLevel}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors min-h-[48px]"
                  >
                    <span>Keyingi bosqich</span>
                  </button>
                )}
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors min-h-[44px]"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Qayta boshlash</span>
                </button>
                <button
                  onClick={onBackHome}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-800 px-5 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors min-h-[44px]"
                >
                  Orqaga qaytish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER OVERLAY */}
        {status === 'gameover' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#070A10]/85 p-4">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#111724] p-7 text-center shadow-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                O‘yin tugadi
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Xavotir olmang! Qaytadan urinib ko‘ring va natijangizni yaxshilang.
              </p>
              <div className="mt-5 rounded-xl border border-slate-800 bg-[#0B101A] p-4">
                <div className="text-xs text-slate-400">Natijalar</div>
                <div className="mt-1 font-mono text-2xl font-bold text-amber-400 tabular-nums">
                  {score} ball
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors min-h-[48px]"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Qayta boshlash</span>
                </button>
                <button
                  onClick={onBackHome}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-800 px-5 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors min-h-[44px]"
                >
                  Orqaga qaytish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
