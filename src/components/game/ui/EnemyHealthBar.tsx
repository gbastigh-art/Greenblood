"use client";
// Phase 9: Enemy Health Bar — shows HP of the animal/enemy the player is
// currently aiming at (within 30m). Appears as a small card above the
// crosshair area. Color varies by kind: hostile (red), neutral (amber).
// Includes distance readout and a small critical pulse when HP < 25%.
import { useEffect, useState } from "react";
import { useGame } from "@/lib/game/store";

export function EnemyHealthBar() {
  const target = useGame((s) => s.targetedEnemy);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (target) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
    const id = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(id);
  }, [target]);

  if (!target && !mounted) return null;
  if (!target) {
    // Slide-out animation
    return (
      <div
        className="pointer-events-none fixed top-1/2 left-1/2 z-[40] -translate-x-1/2 -translate-y-[8rem]"
        style={{ transition: "transform 0.25s ease-out, opacity 0.25s ease-out", transform: "translate(-50%, -8rem) translateY(-8px) scale(0.92)", opacity: 0 }}
      >
        <EmptyBar />
      </div>
    );
  }

  const pct = target.maxHp > 0 ? Math.max(0, Math.min(1, target.hp / target.maxHp)) : 0;
  const critical = pct > 0 && pct < 0.25;
  const isHostile = target.kind === "wolf" || target.kind === "bear" || target.kind === "boss";
  const isBoss = target.kind === "boss";
  const barWidth = isBoss ? 320 : 220;
  const hpDisplay = Math.max(0, Math.ceil(target.hp));

  // Bar gradient based on type
  const barGradient = isBoss
    ? "linear-gradient(180deg, #fb7185 0%, #e11d48 55%, #9f1239 100%)"
    : isHostile
    ? "linear-gradient(180deg, #f87171 0%, #dc2626 55%, #7f1d1d 100%)"
    : "linear-gradient(180deg, #fbbf24 0%, #d97706 55%, #78350f 100%)";

  const borderColor = isBoss
    ? "border-rose-500/80 shadow-[0_0_18px_rgba(244,63,94,0.55)]"
    : isHostile
    ? "border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.35)]"
    : "border-amber-500/55 shadow-[0_0_10px_rgba(251,191,36,0.3)]";

  return (
    <div
      className="pointer-events-none fixed top-1/2 left-1/2 z-[40] -translate-x-1/2 -translate-y-[8rem]"
      style={{
        transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease",
        transform: mounted ? "translate(-50%, -8rem) scale(1)" : "translate(-50%, -8rem) scale(0.92)",
        opacity: mounted ? 1 : 0,
      }}
    >
      <div
        className={`relative rounded-lg border-2 ${borderColor} bg-zinc-900/92 backdrop-blur-sm px-3 py-1.5`}
        style={{ width: `${barWidth}px` }}
      >
        <style>{`
          @keyframes enemyPulse {
            0%, 100% { filter: brightness(1); }
            50%      { filter: brightness(1.5); }
          }
        `}</style>
        {/* Header row: icon + name + distance */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-base ${isHostile ? "animate-pulse" : ""}`}>{target.icon}</span>
            <span className={`font-bold text-xs uppercase tracking-wider truncate ${
              isHostile ? "text-rose-200" : "text-amber-200"
            }`}>
              {target.name}
            </span>
            {isHostile && (
              <span className="text-[8px] uppercase font-bold bg-rose-600/70 text-white px-1 py-px rounded-sm tracking-wide">
                Hostile
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-white/65 shrink-0">
            <span className="text-white/45">📏</span>
            <span className="tabular-nums">{target.distance.toFixed(1)}m</span>
          </div>
        </div>
        {/* HP bar */}
        <div className={`relative h-3 rounded-full bg-black/70 border ${isHostile ? "border-rose-900/80" : "border-amber-900/70"} overflow-hidden`}>
          {/* Tick marks at 25/50/75% */}
          {[25, 50, 75].map((tick) => (
            <div
              key={tick}
              className="absolute top-0 bottom-0 w-px bg-black/55 z-10"
              style={{ left: `${tick}%` }}
            />
          ))}
          {/* Fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-200 ease-out"
            style={{
              width: `${pct * 100}%`,
              background: barGradient,
              boxShadow: critical
                ? "0 0 10px rgba(244,63,94,0.95), inset 0 1px 0 rgba(255,255,255,0.4)"
                : isHostile
                ? "0 0 6px rgba(244,63,94,0.55), inset 0 1px 0 rgba(255,255,255,0.35)"
                : "0 0 5px rgba(251,191,36,0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
              animation: critical ? "enemyPulse 0.8s ease-in-out infinite" : undefined,
            }}
          >
            {/* Top glossy highlight */}
            <div
              className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)",
              }}
            />
          </div>
          {/* HP numeric overlay */}
          <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
            {hpDisplay} / {target.maxHp}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyBar() {
  return <div style={{ width: 220, height: 50 }} />;
}
