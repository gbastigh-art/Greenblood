"use client";
// XP bar and level indicator — shown above the hotbar.
import { useGame, xpForLevel } from "@/lib/game/store";

export function XpBar() {
  const xp = useGame((s) => s.xp);
  const level = useGame((s) => s.level);
  const xpToNext = useGame((s) => s.xpToNext);
  const totalXp = useGame((s) => s.totalXp);
  const levelUpFlash = useGame((s) => s.levelUpFlash);

  const pct = xpToNext > 0 ? (xp / xpToNext) * 100 : 0;

  return (
    <div className="pointer-events-none fixed bottom-[88px] left-1/2 -translate-x-1/2 z-30 w-[280px] sm:w-[340px]">
      <style>{`
        @keyframes level-up-glow {
          0%   { box-shadow: 0 0 20px rgba(251,191,36,0.8), 0 0 40px rgba(251,191,36,0.4); }
          50%  { box-shadow: 0 0 35px rgba(251,191,36,1), 0 0 60px rgba(251,191,36,0.6), 0 0 80px rgba(251,191,36,0.3); }
          100% { box-shadow: 0 0 20px rgba(251,191,36,0.8), 0 0 40px rgba(251,191,36,0.4); }
        }
      `}</style>
      {/* Level-up flash overlay */}
      {levelUpFlash > 0 && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, rgba(251,191,36,${levelUpFlash * 0.4}) 0%, rgba(251,191,36,${levelUpFlash * 0.1}) 50%, transparent 80%)`,
          }}
        />
      )}
      <div
        className={`flex items-center gap-2 px-2 py-1 bg-black/60 border border-amber-500/30 rounded-lg backdrop-blur-sm transition-all ${levelUpFlash > 0 ? "border-amber-400" : ""}`}
        style={levelUpFlash > 0 ? { animation: "level-up-glow 0.5s ease-in-out infinite" } : undefined}
      >
        {/* Level badge */}
        <div className={`flex items-center justify-center w-8 h-8 rounded-md font-black text-sm transition-all ${
          levelUpFlash > 0
            ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(251,191,36,0.8)]"
            : "bg-amber-900/60 text-amber-300 border border-amber-500/40"
        }`}>
          {level}
        </div>
        {/* XP bar */}
        <div className="flex-1 relative h-3 bg-black/80 border border-white/15 rounded overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          {/* XP fill */}
          <div
            className="h-full bg-gradient-to-r from-amber-700 to-amber-400 transition-all duration-300 ease-out rounded-sm"
            style={{ width: `${pct}%` }}
          />
          {/* Glossy highlight */}
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          {/* XP text */}
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
            {xp}/{xpToNext} XP
          </span>
        </div>
        {/* Total XP indicator */}
        <div className="text-[9px] text-white/50 font-mono whitespace-nowrap">
          {totalXp.toLocaleString()} total
        </div>
      </div>
    </div>
  );
}
