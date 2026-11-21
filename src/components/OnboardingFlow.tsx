import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Gamepad2, ShieldCheck } from 'lucide-react';
import { AGE_GROUPS } from '../data/games';
import { AgeGroupId } from '../types';
import { gameAudio } from '../utils/audio';

interface OnboardingFlowProps {
  onComplete: (username: string, ageGroup: AgeGroupId) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'age' | 'name'>('age');
  const [selectedAge, setSelectedAge] = useState<AgeGroupId | null>(null);
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAgeSelect = (id: AgeGroupId) => {
    gameAudio.playClick();
    setSelectedAge(id);
    setStep('name');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setErrorMsg('Iltimos, kamida 2 ta harfdan iborat ismingizni kiriting.');
      return;
    }
    if (!selectedAge) return;
    gameAudio.playSuccess();
    onComplete(trimmed, selectedAge);
  };

  const chosenInfo = AGE_GROUPS.find((g) => g.id === selectedAge);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col justify-between px-4 py-8 sm:px-8 lg:px-12">
      {/* Top Brand Header */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
            <Gamepad2 className="h-6 w-6" />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-white">
            UZ GAME WORLD
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Xavfsiz 3D o‘yinlar olami</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto my-8 w-full max-w-6xl">
        {step === 'age' ? (
          <div>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wide text-amber-400">
                1-qadam · Shaxsiy moslashuv
              </p>
              <h1 className="mt-2 font-display text-3xl sm:text-5xl font-bold tracking-tight text-white text-balance">
                Yoshingiz nechida?
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                O‘yinlar, qiyinlik darajasi va 3D dunyolar sizning yoshingizga moslab tanlanadi.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {AGE_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleAgeSelect(group.id)}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#131822] text-left transition-transform duration-200 hover:-translate-y-1 hover:border-amber-500/60 focus-visible:outline-2 focus-visible:outline-amber-400"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                    <img
                      src={group.image}
                      alt={group.label}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131822] via-[#131822]/25 to-transparent" />
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="font-display text-2xl font-extrabold text-white">
                        {group.label}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-amber-400">
                        {group.title}
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">
                        {group.subtitle}
                      </p>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-semibold text-slate-200 group-hover:text-amber-400">
                      <span>Tanlash</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-[#131822] p-6 sm:p-10 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                setStep('age');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Yosh toifasini o‘zgartirish</span>
            </button>

            <div className="mt-5">
              <div className="text-xs font-medium text-amber-400">
                2-qadam · Tanlangan toifa: {chosenInfo?.label}
              </div>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">
                Ismingiz nima?
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Ismingiz va yoshingiz qurilmangizda saqlanadi, keyingi safar qayta kiritish shart bo‘lmaydi.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="uz-username" className="block text-xs font-medium text-slate-300 mb-2">
                  Foydalanuvchi ismi
                </label>
                <input
                  id="uz-username"
                  type="text"
                  autoFocus
                  maxLength={24}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Masalan: Jasur yoki Madina"
                  className="w-full rounded-xl border border-slate-700 bg-[#0B0E14] px-4 py-3.5 text-base text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
                {errorMsg && (
                  <p className="mt-2 text-xs text-rose-400">{errorMsg}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-4 text-base font-bold text-slate-950 hover:bg-amber-400 transition-colors min-h-[52px]"
              >
                <span>Boshlash</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          </div>
        )}
      </main>

      <footer className="mx-auto w-full max-w-6xl text-center text-xs text-slate-500">
        UZ GAME WORLD · 3–20 yoshli foydalanuvchilar uchun xavfsiz 3D o‘yinlar platformasi
      </footer>
    </div>
  );
};
