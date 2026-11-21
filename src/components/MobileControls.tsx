import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

export interface VirtualInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  action: boolean;
  action2: boolean;
}

interface TouchPadProps {
  inputRef: React.MutableRefObject<VirtualInputState>;
  mode: 'lr' | 'dpad' | 'drive' | 'action-only';
  actionLabel?: string;
  action2Label?: string;
  onActionPress?: () => void;
  onAction2Press?: () => void;
}

export const TouchControls: React.FC<TouchPadProps> = ({
  inputRef,
  mode,
  actionLabel = 'Harakat',
  action2Label,
  onActionPress,
  onAction2Press,
}) => {
  const bindHold = (key: keyof VirtualInputState, callback?: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      inputRef.current[key] = true;
      callback?.();
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      inputRef.current[key] = false;
    },
    onPointerLeave: () => {
      inputRef.current[key] = false;
    },
    onPointerCancel: () => {
      inputRef.current[key] = false;
    },
  });

  const btnClass =
    'touch-none-select flex items-center justify-center rounded-2xl border border-white/15 bg-[#0D131F]/80 text-white active:bg-amber-500 active:text-slate-950 transition-colors shadow-lg';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-end justify-between px-4 sm:px-6">
      {/* Left Side: Steering or D-Pad */}
      <div className="pointer-events-auto">
        {mode === 'lr' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Chapga"
              className={`${btnClass} h-14 w-16`}
              {...bindHold('left')}
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="O‘ngga"
              className={`${btnClass} h-14 w-16`}
              {...bindHold('right')}
            >
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        )}

        {(mode === 'dpad' || mode === 'drive') && (
          <div className="grid grid-cols-3 gap-1.5">
            <div />
            <button
              type="button"
              aria-label="Oldinga"
              className={`${btnClass} h-12 w-12 sm:h-13 sm:w-13`}
              {...bindHold('up')}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
            <div />
            <button
              type="button"
              aria-label="Chapga"
              className={`${btnClass} h-12 w-12 sm:h-13 sm:w-13`}
              {...bindHold('left')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Orqaga"
              className={`${btnClass} h-12 w-12 sm:h-13 sm:w-13`}
              {...bindHold('down')}
            >
              <ArrowDown className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="O‘ngga"
              className={`${btnClass} h-12 w-12 sm:h-13 sm:w-13`}
              {...bindHold('right')}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Right Side: Action Buttons */}
      <div className="pointer-events-auto flex items-center gap-2.5">
        {action2Label && (
          <button
            type="button"
            className="touch-none-select rounded-2xl border border-cyan-400/40 bg-cyan-500/20 px-4 py-3.5 text-xs sm:text-sm font-bold text-cyan-200 active:bg-cyan-400 active:text-slate-950 shadow-lg min-h-[48px]"
            {...bindHold('action2', onAction2Press)}
          >
            {action2Label}
          </button>
        )}
        {(mode !== 'lr' || actionLabel !== 'Harakat') && (
          <button
            type="button"
            className="touch-none-select rounded-2xl border border-amber-400/50 bg-amber-500/90 px-5 py-3.5 text-xs sm:text-sm font-bold text-slate-950 active:bg-amber-300 shadow-lg min-h-[52px]"
            {...bindHold('action', onActionPress)}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
