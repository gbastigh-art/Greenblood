"use client";
// Achievement toast popup — slides in from top-right when an achievement is unlocked.
// Reads recentAchievement from the store (set by engine/store on milestone events).
import { useEffect, useState } from "react";
import { useGame, type Achievement } from "@/lib/game/store";

export function AchievementToast() {
  const recent = useGame((s) => s.recentAchievement);
  const dismiss = useGame((s) => s.dismissAchievement);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (recent) {
      // Defer to avoid synchronous setState in effect (lint guideline).
      const showId = requestAnimationFrame(() => setVisible(true));
      const t1 = setTimeout(() => setVisible(false), 5000);
      const t2 = setTimeout(() => dismiss(), 5600);
      return () => {
        cancelAnimationFrame(showId);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [recent, dismiss]);

  if (!recent) return null;

  const tierColor =
    recent.tier === "legendary"
      ? "from-amber-500 to-yellow-600 border-amber-300"
      : recent.tier === "epic"
      ? "from-purple-500 to-fuchsia-600 border-purple-300"
      : recent.tier === "rare"
      ? "from-sky-500 to-blue-600 border-sky-300"
      : "from-emerald-500 to-teal-600 border-emerald-300";

  return (
    <div
      className={`fixed top-20 right-3 z-[55] transition-all duration-500 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className={`relative bg-gradient-to-br ${tierColor} border-2 rounded-lg shadow-2xl p-0.5 min-w-[280px] max-w-[340px]`}>
        <div className="bg-zinc-900/95 rounded-md p-3 flex items-center gap-3">
          <div className="text-3xl shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{recent.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1">
              <span>🏆 Achievement Unlocked</span>
              <span className="text-white/40">· {recent.tier}</span>
            </div>
            <div className="text-sm font-bold text-white truncate">{recent.name}</div>
            <div className="text-[11px] text-white/65 leading-tight mt-0.5">{recent.desc}</div>
          </div>
        </div>
        {/* Shine sweep */}
        <div
          className="absolute inset-0 rounded-md overflow-hidden pointer-events-none"
          style={{
            background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
            animation: "shineSweep 2s ease-in-out infinite",
          }}
        />
      </div>
      <style jsx>{`
        @keyframes shineSweep {
          0% { transform: translateX(-100%); }
          50%, 100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
