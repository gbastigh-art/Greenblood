"use client";
// Boss health bar — top-center overlay shown only when bossActive is true.
// Renders a red glowing card with HP numbers, tick marks at 25/50/75/100,
// and a critical pulse glow when HP drops below 25%.
import { useEffect, useState } from "react";
import { useGame } from "@/lib/game/store";

export function BossHealthBar() {
  const bossActive = useGame((s) => s.bossActive);
  const bossHp = useGame((s) => s.bossHp);
  const bossMaxHp = useGame((s) => s.bossMaxHp);
  // `mounted` is set true after a tick so the slide-in animation plays when
  // the boss spawns, and plays the slide-out before unmount when killed.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (bossActive) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
    // Boss dead/gone — defer unmount so the slide-out animation has time to
    // play (350ms matches the CSS animation duration).
    const id = setTimeout(() => setMounted(false), 350);
    return () => clearTimeout(id);
  }, [bossActive]);

  if (!bossActive && !mounted) return null;

  const pct = bossMaxHp > 0 ? Math.max(0, Math.min(1, bossHp / bossMaxHp)) : 0;
  const critical = pct > 0 && pct < 0.25;
  const hpDisplay = Math.max(0, Math.ceil(bossHp));

  return (
    <div
      className="pointer-events-none fixed top-16 left-1/2 z-[45] -translate-x-1/2"
      style={{ transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease" }}
    >
      <div
        className={bossActive ? "animate-boss-in" : "animate-boss-out"}
        style={{ width: "min(480px, 90vw)" }}
      >
        <div
          className={`relative rounded-xl border-2 px-4 py-2.5 shadow-2xl ${
            critical
              ? "border-rose-500/80 shadow-[0_0_24px_rgba(244,63,94,0.6)]"
              : "border-rose-500/60 shadow-[0_0_18px_rgba(244,63,94,0.35)]"
          }`}
          style={{
            background:
              "linear-gradient(180deg, rgba(40,8,12,0.96) 0%, rgba(20,4,8,0.96) 100%)",
          }}
        >
          {/* Title row */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl animate-pulse drop-shadow-[0_0_6px_rgba(244,63,94,0.7)]">
                💀
              </span>
              <span className="text-rose-200 font-extrabold tracking-wider text-sm sm:text-base uppercase truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                🐺 Direwolf Alpha
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono tabular-nums text-rose-100 font-bold text-sm">
                {hpDisplay}
              </span>
              <span className="font-mono text-rose-300/60 text-xs">/ {bossMaxHp}</span>
            </div>
          </div>

          {/* HP bar */}
          <div className="relative h-4 rounded-full bg-rose-950 border border-rose-900/80 overflow-hidden">
            {/* Tick marks at 25/50/75% */}
            {[25, 50, 75].map((tick) => (
              <div
                key={tick}
                className="absolute top-0 bottom-0 w-px bg-black/50 z-10"
                style={{ left: `${tick}%` }}
              />
            ))}
            {/* Glossy highlight on fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-200 ease-out"
              style={{
                width: `${pct * 100}%`,
                background:
                  "linear-gradient(180deg, #fb7185 0%, #e11d48 55%, #9f1239 100%)",
                boxShadow: critical
                  ? "0 0 12px rgba(244,63,94,0.95), inset 0 1px 0 rgba(255,255,255,0.4)"
                  : "0 0 8px rgba(244,63,94,0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
                animation: critical ? "bossPulse 0.8s ease-in-out infinite" : undefined,
              }}
            >
              {/* Top glossy highlight */}
              <div
                className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)",
                }}
              />
            </div>
          </div>

          {/* Subtitle */}
          <div className="mt-1.5 text-center text-[10px] uppercase tracking-[0.18em] text-rose-300/70 font-semibold">
            Defeat to claim legendary loot
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bossIn {
          from { transform: translateY(-24px) scale(0.96); opacity: 0; }
          to   { transform: translateY(0)     scale(1);    opacity: 1; }
        }
        @keyframes bossOut {
          from { transform: translateY(0)     scale(1);    opacity: 1; }
          to   { transform: translateY(-24px) scale(0.96); opacity: 0; }
        }
        @keyframes bossPulse {
          0%, 100% { filter: brightness(1); }
          50%      { filter: brightness(1.4); }
        }
        .animate-boss-in  { animation: bossIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .animate-boss-out { animation: bossOut 0.35s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
    </div>
  );
}
