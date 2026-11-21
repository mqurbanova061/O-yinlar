import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  Heart,
  Home,
  Play,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { GameCard } from './components/GameCard';
import { OnboardingFlow } from './components/OnboardingFlow';
import { ProfileDashboard } from './components/ProfileDashboard';
import { AGE_GROUPS, GAMES, HERO_BANNER_IMAGE, getAgeGroupInfo } from './data/games';
import { ActiveGamePlayer } from './games/GameRegistry';
import { AgeGroupId, GameMetadata, PortalPage, UserProfile } from './types';
import { gameAudio } from './utils/audio';
import {
  createUserProfile,
  evaluateAchievements,
  loadUserProfile,
  saveUserProfile,
} from './utils/storage';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadUserProfile());
  const [page, setPage] = useState<PortalPage>('home');
  const [selectedCategory, setSelectedCategory] = useState<AgeGroupId>('3-5');
  const [gamesFilter, setGamesFilter] = useState<AgeGroupId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGame, setActiveGame] = useState<GameMetadata | null>(null);

  const handleOnboardingComplete = (username: string, ageGroup: AgeGroupId) => {
    const newProfile = createUserProfile(username, ageGroup);
    setProfile(newProfile);
    setSelectedCategory(ageGroup);
    setPage('home');
  };

  const updateProfileState = (updater: (prev: UserProfile) => UserProfile) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      updated.achievements = evaluateAchievements(updated);
      saveUserProfile(updated);
      return updated;
    });
  };

  const handleUpdateUser = (username: string, ageGroup: AgeGroupId) => {
    gameAudio.playSuccess();
    updateProfileState((prev) => ({
      ...prev,
      username,
      ageGroup,
    }));
  };

  const handleToggleFavorite = (gameId: string) => {
    gameAudio.playClick();
    updateProfileState((prev) => {
      const exists = prev.favorites.includes(gameId);
      const favorites = exists
        ? prev.favorites.filter((id) => id !== gameId)
        : [gameId, ...prev.favorites];
      return { ...prev, favorites };
    });
  };

  const handlePlayGame = (game: GameMetadata) => {
    gameAudio.playClick();
    updateProfileState((prev) => {
      const recentlyPlayed = [game.id, ...prev.recentlyPlayed.filter((id) => id !== game.id)].slice(0, 6);
      return { ...prev, recentlyPlayed };
    });
    setActiveGame(game);
  };

  const handleRecordResult = (gameId: string, score: number, levelCompleted: number, won: boolean) => {
    updateProfileState((prev) => {
      const prevHigh = prev.highScores[gameId] ?? 0;
      const prevLvl = prev.levelsCompleted[gameId] ?? 0;
      return {
        ...prev,
        totalGamesPlayed: prev.totalGamesPlayed + 1,
        totalScore: prev.totalScore + score,
        highScores: {
          ...prev.highScores,
          [gameId]: Math.max(prevHigh, score),
        },
        levelsCompleted: {
          ...prev.levelsCompleted,
          [gameId]: won ? Math.max(prevLvl, levelCompleted) : prevLvl,
        },
      };
    });
  };

  const handleToggleSound = () => {
    updateProfileState((prev) => {
      const soundMuted = !prev.soundMuted;
      gameAudio.setMuted(soundMuted, prev.musicMuted);
      return { ...prev, soundMuted };
    });
  };

  const handleToggleMusic = () => {
    updateProfileState((prev) => {
      const musicMuted = !prev.musicMuted;
      gameAudio.setMuted(prev.soundMuted, musicMuted);
      return { ...prev, musicMuted };
    });
  };

  const navigateTo = (target: PortalPage, catId?: AgeGroupId) => {
    gameAudio.playClick();
    if (catId) setSelectedCategory(catId);
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return GAMES.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.shortDesc.toLowerCase().includes(q) ||
        g.categoryLabel.toLowerCase().includes(q) ||
        g.ageGroup.includes(q)
    );
  }, [searchQuery]);

  // First-time user onboarding
  if (!profile) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  const userAgeInfo = getAgeGroupInfo(profile.ageGroup);
  const recommendedGames = GAMES.filter((g) => g.ageGroup === profile.ageGroup);
  const featuredGame = recommendedGames[0] ?? GAMES[0];
  const popularGames = GAMES.filter((g) => g.isPopular);
  const newGames = GAMES.filter((g) => g.isNew);
  const recentGames = profile.recentlyPlayed
    .map((id) => GAMES.find((g) => g.id === id))
    .filter((g): g is GameMetadata => Boolean(g));
  const favoriteGames = GAMES.filter((g) => profile.favorites.includes(g.id));

  const filteredAllGames =
    gamesFilter === 'all' ? GAMES : GAMES.filter((g) => g.ageGroup === gamesFilter);

  const activeCategoryInfo = getAgeGroupInfo(selectedCategory);
  const categoryGames = GAMES.filter((g) => g.ageGroup === selectedCategory);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 pb-20 md:pb-8">
      {/* Three-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#0B0E14]/95 px-4 py-3.5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
              <Gamepad2 className="h-5 w-5" />
            </span>
            <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-white">
              UZ GAME WORLD
            </span>
          </button>

          {/* Zone 2: Clean Typography Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                page === 'home' ? 'text-amber-400 underline underline-offset-8 decoration-2' : ''
              }`}
            >
              Bosh sahifa
            </button>
            <button
              type="button"
              onClick={() => navigateTo('games')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                page === 'games' || page === 'category'
                  ? 'text-amber-400 underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              O‘yinlar
            </button>
            <button
              type="button"
              onClick={() => navigateTo('favorites')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                page === 'favorites' ? 'text-amber-400 underline underline-offset-8 decoration-2' : ''
              }`}
            >
              Sevimlilar
            </button>
            <button
              type="button"
              onClick={() => navigateTo('profile')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                page === 'profile' ? 'text-amber-400 underline underline-offset-8 decoration-2' : ''
              }`}
            >
              Profilim
            </button>
          </nav>

          {/* Zone 3: Single Primary Action (User Profile Button) */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('profile')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#131822] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:border-amber-500/60 transition-colors whitespace-nowrap min-h-[40px]"
            >
              <User className="h-4 w-4 text-amber-400" />
              <span className="max-w-[110px] truncate">{profile.username}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8 space-y-10">
        {/* Global Search Bar (on Home & Games views) */}
        {(page === 'home' || page === 'games') && (
          <div className="relative max-w-2xl">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="O‘yin qidirish"
              aria-label="O‘yin qidirish"
              className="w-full rounded-2xl border border-slate-800 bg-[#131822] py-3.5 pr-11 pl-12 text-sm sm:text-base text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Qidiruvni tozalash"
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Active Search Results Override */}
        {searchResults !== null ? (
          <section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-bold text-white">
                Qidiruv natijalari ({searchResults.length})
              </h2>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-sm font-medium text-amber-400 hover:underline"
              >
                Tozalash
              </button>
            </div>
            {searchResults.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-[#131822] p-8 text-center">
                <p className="text-base text-slate-300">
                  “{searchQuery}” bo‘yicha o‘yin topilmadi. Boshqa nom kiriting.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {searchResults.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    isFavorite={profile.favorites.includes(g.id)}
                    highScore={profile.highScores[g.id] ?? 0}
                    onPlay={handlePlayGame}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* ================= HOME PAGE ================= */}
            {page === 'home' && (
              <>
                {/* Personalized Hero Section */}
                <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#131822]">
                  <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                    <div className="relative z-10 flex flex-col justify-between p-6 sm:p-10 lg:col-span-6">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-amber-400">
                          {userAgeInfo.label} · {userAgeInfo.title}
                        </p>
                        <h1 className="mt-2 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white text-balance">
                          Xush kelibsiz, {profile.username}!
                        </h1>
                        <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-slate-300">
                          {userAgeInfo.description}
                        </p>
                      </div>

                      <div className="mt-8 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handlePlayGame(featuredGame)}
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm sm:text-base font-bold text-slate-950 hover:bg-amber-400 transition-colors min-h-[48px]"
                        >
                          <Play className="h-5 w-5 fill-current" />
                          <span>O‘ynash: {featuredGame.title}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateTo('category', profile.ageGroup)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors min-h-[48px]"
                        >
                          <span>Mening toifam</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="relative min-h-[240px] lg:min-h-[360px] lg:col-span-6">
                      <img
                        src={HERO_BANNER_IMAGE}
                        alt="UZ GAME WORLD 3D o‘yinlar olami"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#131822] via-[#131822]/35 to-transparent" />
                    </div>
                  </div>
                </section>

                {/* Age-Based Categories (Dedicated Category Pages) */}
                <section>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                        Yosh toifalari bo‘yicha 3D o‘yinlar
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Har bir yosh guruhi uchun maxsus yaratilgan 5 tadan real 3D o‘yin
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {AGE_GROUPS.map((group) => {
                      const isCurrent = group.id === profile.ageGroup;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => navigateTo('category', group.id)}
                          className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-transform duration-200 hover:-translate-y-1 ${
                            isCurrent
                              ? 'border-amber-500/70 bg-[#151C28]'
                              : 'border-slate-800 bg-[#131822] hover:border-slate-700'
                          }`}
                        >
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                            <img
                              src={group.image}
                              alt={group.label}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#131822] via-transparent to-transparent" />
                          </div>
                          <div className="p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-display text-xl font-bold text-white">
                                {group.label}
                              </span>
                              {isCurrent && (
                                <span className="text-xs font-semibold text-amber-400">
                                  Sizning yoshingiz
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm font-medium text-slate-200">
                              {group.title}
                            </div>
                            <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">
                              {group.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Recommended For Selected Age Group */}
                <section>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                        Siz uchun tavsiya etilgan ({userAgeInfo.label})
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {userAgeInfo.safetyNote}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateTo('category', profile.ageGroup)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-amber-400 hover:underline whitespace-nowrap shrink-0"
                    >
                      <span>Barchasi</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {recommendedGames.map((g) => (
                      <GameCard
                        key={g.id}
                        game={g}
                        isFavorite={profile.favorites.includes(g.id)}
                        highScore={profile.highScores[g.id] ?? 0}
                        onPlay={handlePlayGame}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </section>

                {/* Popular Games */}
                <section>
                  <h2 className="font-display text-2xl font-bold text-white">
                    Ommabop o‘yinlar
                  </h2>
                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {popularGames.slice(0, 4).map((g) => (
                      <GameCard
                        key={g.id}
                        game={g}
                        isFavorite={profile.favorites.includes(g.id)}
                        highScore={profile.highScores[g.id] ?? 0}
                        onPlay={handlePlayGame}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </section>

                {/* New Games */}
                <section>
                  <h2 className="font-display text-2xl font-bold text-white">
                    Yangi 3D o‘yinlar
                  </h2>
                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {newGames.slice(0, 4).map((g) => (
                      <GameCard
                        key={g.id}
                        game={g}
                        isFavorite={profile.favorites.includes(g.id)}
                        highScore={profile.highScores[g.id] ?? 0}
                        onPlay={handlePlayGame}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </section>

                {/* Recently Played & Favorites Preview */}
                {(recentGames.length > 0 || favoriteGames.length > 0) && (
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {recentGames.length > 0 && (
                      <section className="rounded-2xl border border-slate-800 bg-[#131822] p-6">
                        <h2 className="font-display text-xl font-bold text-white">
                          Yaqinda o‘ynalganlar
                        </h2>
                        <div className="mt-4 space-y-3">
                          {recentGames.slice(0, 3).map((g) => (
                            <div
                              key={g.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0B0E14] px-4 py-3"
                            >
                              <div className="min-w-0">
                                <div className="truncate font-display text-sm font-bold text-white">
                                  {g.title}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {g.categoryLabel} · {g.ageGroup} yosh
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handlePlayGame(g)}
                                className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 whitespace-nowrap shrink-0"
                              >
                                O‘ynash
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {favoriteGames.length > 0 && (
                      <section className="rounded-2xl border border-slate-800 bg-[#131822] p-6">
                        <div className="flex items-center justify-between">
                          <h2 className="font-display text-xl font-bold text-white">
                            Sevimli o‘yinlaringiz
                          </h2>
                          <button
                            type="button"
                            onClick={() => navigateTo('favorites')}
                            className="text-xs font-semibold text-amber-400 hover:underline"
                          >
                            Barchasi
                          </button>
                        </div>
                        <div className="mt-4 space-y-3">
                          {favoriteGames.slice(0, 3).map((g) => (
                            <div
                              key={g.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0B0E14] px-4 py-3"
                            >
                              <div className="min-w-0">
                                <div className="truncate font-display text-sm font-bold text-white">
                                  {g.title}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {g.categoryLabel} · {g.ageGroup} yosh
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handlePlayGame(g)}
                                className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 whitespace-nowrap shrink-0"
                              >
                                O‘ynash
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ================= DEDICATED AGE CATEGORY PAGE ================= */}
            {page === 'category' && (
              <section className="space-y-8">
                <button
                  type="button"
                  onClick={() => navigateTo('home')}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Bosh sahifaga qaytish</span>
                </button>

                <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#131822] grid grid-cols-1 lg:grid-cols-12 items-stretch">
                  <div className="p-6 sm:p-10 lg:col-span-7 flex flex-col justify-center">
                    <div className="text-xs font-semibold text-amber-400">
                      {activeCategoryInfo.label} · {activeCategoryInfo.difficultyLabel}
                    </div>
                    <h1 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold text-white">
                      {activeCategoryInfo.title}
                    </h1>
                    <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300">
                      {activeCategoryInfo.description}
                    </p>
                    <p className="mt-4 text-xs text-emerald-400">
                      {activeCategoryInfo.safetyNote}
                    </p>
                  </div>
                  <div className="relative min-h-[200px] lg:col-span-5">
                    <img
                      src={activeCategoryInfo.image}
                      alt={activeCategoryInfo.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#131822] via-transparent to-transparent" />
                  </div>
                </div>

                {/* Quick switch between 4 age pages */}
                <div className="flex flex-wrap items-center gap-2">
                  {AGE_GROUPS.map((ag) => (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() => setSelectedCategory(ag.id)}
                      className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                        selectedCategory === ag.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'border border-slate-800 bg-[#131822] text-slate-300 hover:text-white'
                      }`}
                    >
                      {ag.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryGames.map((g) => (
                    <GameCard
                      key={g.id}
                      game={g}
                      isFavorite={profile.favorites.includes(g.id)}
                      highScore={profile.highScores[g.id] ?? 0}
                      onPlay={handlePlayGame}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ================= ALL GAMES PAGE ================= */}
            {page === 'games' && (
              <section className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="font-display text-3xl font-bold text-white">
                      Barcha 3D o‘yinlar ({filteredAllGames.length})
                    </h1>
                    <p className="mt-1 text-sm text-slate-400">
                      Istalgan yosh toifasini tanlang va darhol o‘ynashni boshlang
                    </p>
                  </div>

                  {/* Interactive Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-[#131822] p-1">
                    <button
                      type="button"
                      onClick={() => setGamesFilter('all')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        gamesFilter === 'all'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Barchasi
                    </button>
                    {AGE_GROUPS.map((ag) => (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => setGamesFilter(ag.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                          gamesFilter === ag.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {ag.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredAllGames.map((g) => (
                    <GameCard
                      key={g.id}
                      game={g}
                      isFavorite={profile.favorites.includes(g.id)}
                      highScore={profile.highScores[g.id] ?? 0}
                      onPlay={handlePlayGame}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ================= FAVORITES PAGE ================= */}
            {page === 'favorites' && (
              <section className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl font-bold text-white">
                    Sevimli o‘yinlar ({favoriteGames.length})
                  </h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Siz tanlagan eng yaxshi 3D o‘yinlar ro‘yxati
                  </p>
                </div>

                {favoriteGames.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-[#131822] p-10 text-center">
                    <Heart className="mx-auto h-10 w-10 text-slate-600" />
                    <h2 className="mt-4 font-display text-xl font-bold text-white">
                      Sevimlilar ro‘yxati bo‘sh
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      O‘yin kartochkasidagi yurakcha tugmasini bosib o‘yinlarni saqlab qo‘ying.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTo('games')}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>O‘yinlarni ko‘rish</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {favoriteGames.map((g) => (
                      <GameCard
                        key={g.id}
                        game={g}
                        isFavorite={true}
                        highScore={profile.highScores[g.id] ?? 0}
                        onPlay={handlePlayGame}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ================= PROFILE PAGE ================= */}
            {page === 'profile' && (
              <ProfileDashboard
                profile={profile}
                onUpdateProfile={handleUpdateUser}
                onPlayGame={handlePlayGame}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
          </>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="mx-auto mt-12 max-w-7xl border-t border-slate-800/80 px-4 py-6 text-center text-xs text-slate-500 sm:px-8">
        UZ GAME WORLD · Barcha 3D o‘yinlar xavfsiz, ta’limiy va barcha qurilmalar uchun moslashtirilgan
      </footer>

      {/* Mobile Bottom Navigation Bar (<= 15% mobile height) */}
      <nav
        aria-label="Mobil navigatsiya"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-800 bg-[#0D121B]/95 px-2 py-2 md:hidden"
      >
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium ${
            page === 'home' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Home className="h-5 w-5" />
          <span>Bosh sahifa</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo('games')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium ${
            page === 'games' || page === 'category' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Gamepad2 className="h-5 w-5" />
          <span>O‘yinlar</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo('favorites')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium ${
            page === 'favorites' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Heart className="h-5 w-5" />
          <span>Sevimlilar</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo('profile')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium ${
            page === 'profile' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <User className="h-5 w-5" />
          <span>Profilim</span>
        </button>
      </nav>

      {/* Active 3D Game Modal */}
      {activeGame && (
        <ActiveGamePlayer
          game={activeGame}
          initialLevel={Math.min(
            (profile.levelsCompleted[activeGame.id] ?? 0) + 1,
            activeGame.maxLevels
          )}
          highScore={profile.highScores[activeGame.id] ?? 0}
          soundMuted={profile.soundMuted}
          musicMuted={profile.musicMuted}
          onToggleSound={handleToggleSound}
          onToggleMusic={handleToggleMusic}
          onRecordResult={handleRecordResult}
          onClose={() => setActiveGame(null)}
        />
      )}
    </div>
  );
}
