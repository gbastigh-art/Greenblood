"use client";
// Crosshair + interaction prompt with keybinding hints.
import { useGame } from "@/lib/game/store";

export function Crosshair() {
  const prompt = useGame((s) => s.prompt);
  const mode = useGame((s) => s.mode);
  if (mode === "inventory" || mode === "crafting" || mode === "dead") return null;
  return (
    <>
      {/* Crosshair */}
      <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="relative w-5 h-5">
          {/* Crosshair lines */}
          <div className="absolute top-1/2 left-0 w-1.5 h-px -translate-y-1/2 bg-white/80" />
          <div className="absolute top-1/2 right-0 w-1.5 h-px -translate-y-1/2 bg-white/80" />
          <div className="absolute left-1/2 top-0 h-1.5 w-px -translate-x-1/2 bg-white/80" />
          <div className="absolute left-1/2 bottom-0 h-1.5 w-px -translate-x-1/2 bg-white/80" />
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-amber-400 rounded-full shadow-[0_0_4px_rgba(251,191,36,0.6)]" />
        </div>
      </div>
      {/* Interaction prompt */}
      {prompt && (
        <div className="pointer-events-none fixed top-[58%] left-1/2 -translate-x-1/2 z-20">
          <style>{`
            @keyframes prompt-glow {
              0%, 100% { box-shadow: 0 0 10px rgba(251,191,36,0.3), 0 2px 8px rgba(0,0,0,0.5); }
              50%      { box-shadow: 0 0 18px rgba(251,191,36,0.5), 0 2px 12px rgba(0,0,0,0.6); }
            }
          `}</style>
          <div
            className="flex items-center gap-2 px-3.5 py-2 bg-black/80 border border-amber-400/50 rounded-lg shadow-lg backdrop-blur-sm"
            style={{ animation: "prompt-glow 2s ease-in-out infinite" }}
          >
            {/* [E] key hint */}
            <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-amber-500/20 border border-amber-400/60 rounded text-amber-300 text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              E
            </kbd>
            <span className="text-sm text-amber-100 font-semibold">
              {prompt}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
