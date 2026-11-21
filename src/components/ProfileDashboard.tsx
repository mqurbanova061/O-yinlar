import React, { useState } from 'react';
import { Award, Check, Edit3, Gamepad2, Heart, History, Trophy } from 'lucide-react';
import { ACHIEVEMENTS, AGE_GROUPS, GAMES, getAgeGroupInfo } from '../data/games';
import { AgeGroupId, GameMetadata, UserProfile } from '../types';
import { GameCard } from './GameCard';

interface ProfileDashboardProps {
  profile: UserProfile;
  onUpdateProfile: (username: string, ageGroup: AgeGroupId) => void;
  onPlayGame: (game: GameMetadata) => void;
  onToggleFavorite: (gameId: string) => void;
}

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
  profile,
  onUpdateProfile,
  onPlayGame,
  onToggleFavorite,
}) => {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.username);
  const [draftAge, setDraftAge] = useState<AgeGroupId>(profile.ageGroup);

  const ageInfo = getAgeGroupInfo(profile.ageGroup);
  const favoriteGames = GAMES.filter((g) => profile.favorites.includes(g.id));
  const recentGames = profile.recentlyPlayed
    .map((id) => GAMES.find((g) => g.id === id))
    .filter((g): g is GameMetadata => Boolean(g));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftName.trim().length < 2) return;
    onUpdateProfile(draftName.trim(), draftAge);
    setEditing(false);
  };

  return (
    <div className="space-y-10">
      {/* Profile Header & Stats */}
      <section className="rounded-2xl border border-slate-800 bg-[#131822] p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-medium text-amber-400">Shaxsiy kabinet</div>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-white">
              {profile.username}
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              Yosh toifasi: <span className="font-semibold text-white">{ageInfo.label}</span> ·{' '}
              {ageInfo.title}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDraftName(profile.username);
              setDraftAge(profile.ageGroup);
              setEditing((v) => !v);
            }}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700 transition-colors min-h-[44px]"
          >
            <Edit3 className="h-4 w-4" />
            <span>{editing ? 'Bekor qilish' : 'Profilni tahrirlash'}</span>
          </button>
        </div>

        {editing && (
          <form
            onSubmit={handleSave}
            className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-800 pt-6 sm:grid-cols-3 sm:items-end"
          >
            <div>
              <label htmlFor="edit-name" className="block text-xs text-slate-400 mb-1.5">
                Ismingiz
              </label>
              <input
                id="edit-name"
                type="text"
                maxLength={24}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0B0E14] px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="edit-age" className="block text-xs text-slate-400 mb-1.5">
                Yosh toifasi
              </label>
              <select
                id="edit-age"
                value={draftAge}
                onChange={(e) => setDraftAge(e.target.value as AgeGroupId)}
                className="w-full rounded-xl border border-slate-700 bg-[#0B0E14] px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                {AGE_GROUPS.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.label} — {ag.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors min-h-[44px]"
            >
              <Check className="h-4 w-4" />
              <span>Saqlash</span>
            </button>
          </form>
        )}

        {/* Quantitative Metrics Strip */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-800 pt-6 sm:grid-cols-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Gamepad2 className="h-4 w-4 text-cyan-400" />
              <span>O‘ynalgan o‘yinlar</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
              {profile.totalGamesPlayed}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>Umumiy ball</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-400 tabular-nums">
              {profile.totalScore}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Heart className="h-4 w-4 text-rose-400" />
              <span>Sevimli o‘yinlar</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
              {profile.favorites.length}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Award className="h-4 w-4 text-emerald-400" />
              <span>Yutuqlar</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
              {profile.achievements.length}/{ACHIEVEMENTS.length}
            </div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section>
        <h2 className="font-display text-2xl font-bold text-white">Yutuqlar</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = profile.achievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`rounded-2xl border p-5 transition-colors ${
                  unlocked
                    ? 'border-emerald-500/40 bg-[#131822]'
                    : 'border-slate-800/80 bg-[#0F131C] opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-base font-bold text-white">{ach.title}</span>
                  <span
                    className={`text-xs font-semibold ${
                      unlocked ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {unlocked ? 'Ochilgan' : 'Yopiq'}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{ach.description}</p>
                <div className="mt-3 text-[11px] text-slate-400">{ach.conditionText}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recently Played */}
      <section>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-cyan-400" />
          <h2 className="font-display text-2xl font-bold text-white">Yaqinda o‘ynalganlar</h2>
        </div>
        {recentGames.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Hali birorta o‘yin o‘ynalmagan. Bosh sahifadan istalgan 3D o‘yinni tanlang!
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentGames.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                isFavorite={profile.favorites.includes(g.id)}
                highScore={profile.highScores[g.id] ?? 0}
                onPlay={onPlayGame}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </section>

      {/* Favorites */}
      <section>
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-400" />
          <h2 className="font-display text-2xl font-bold text-white">Sevimli o‘yinlar</h2>
        </div>
        {favoriteGames.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            O‘yin kartochkasidagi yurakcha belgisini bosib sevimlilarni qo‘shishingiz mumkin.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteGames.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                isFavorite={true}
                highScore={profile.highScores[g.id] ?? 0}
                onPlay={onPlayGame}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
