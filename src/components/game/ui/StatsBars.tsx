"use client";
// Bottom-right status bars: Health, Food, Water.
// (Stamina and Warmth systems have been removed — only 3 bars remain.)
// Includes critical-state visual warnings (pulsing red glow) + status-effect badges.
import { useGame } from "@/lib/game/store";

function Bar({ value, max, color, icon, label, critical, glow, pulseColor }: { value: number; max: number; color: string; icon: string; label: string; critical?: boolean; glow?: string; pulseColor?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const isCritical = critical && pct < 25;
  const isLow = pct < 50;
  // Critical pulse ring color (defaults to rose red) — used for the box-shadow ring around the bar.
  const ringRgb = pulseColor ?? "244,63,94";
  return (
    <div className={`flex items-center gap-2 ${isCritical ? "animate-pulse" : ""}`}>
      <style>{`
        @keyframes bar-icon-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1px); }
        }
        .bar-icon { animation: bar-icon-bob 2.4s ease-in-out infinite; }
      `}</style>
      <div
        className={`bar-icon w-7 h-7 flex items-center justify-center text-sm rounded-md bg-black/40 border ${isCritical ? "border-rose-500/70 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "border-white/15"} backdrop-blur-sm transition-transform hover:scale-110`}
        title={label}
      >
        {icon}
      </div>
      <div
        className={`relative w-48 sm:w-56 h-6 bg-black/75 border-2 overflow-hidden rounded-md transition-all ${
          isCritical ? "border-rose-500" : "border-white/20"
        }`}
        style={isCritical ? { boxShadow: `0 0 12px rgba(${ringRgb},0.85), 0 0 22px rgba(${ringRgb},0.55), inset 0 0 6px rgba(${ringRgb},0.35)` } : undefined}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-25 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        {/* Sheen sweep on bar — moves slowly across */}
        <div
          className="absolute inset-y-0 w-1/4 opacity-30 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
            animation: "sheen-sweep 4s linear infinite",
            left: 0,
          }}
        />
        <style>{`
          @keyframes sheen-sweep {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
        `}</style>
        <div
          className={`h-full transition-all duration-200 ${color} ${isCritical ? "animate-pulse" : ""} ${glow ?? ""}`}
          style={{ width: `${pct}%` }}
        />
        {/* Glossy inner highlight — top 30% of bar lighter for a 3D glossy look */}
        <div className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
        {/* 1px inner top border for depth */}
        <div className="absolute top-0 left-0 right-0 h-px bg-white/10 pointer-events-none" />
        {/* Tick marks every 25% */}
        <div className="absolute inset-0 flex">
          {[25, 50, 75].map((p) => (
            <div key={p} className="absolute top-0 bottom-0 w-px bg-black/45" style={{ left: `${p}%` }} />
          ))}
        </div>
        {/* Left-aligned label, right-aligned value — consistent across all bars */}
        <span className="absolute inset-0 flex items-center justify-between px-2 text-[11px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
          <span className={`uppercase tracking-wide text-[9px] ${isCritical ? "text-rose-100" : "text-white/85"}`}>{label}</span>
          <span className={`font-mono tabular-nums ${isCritical ? "text-rose-100" : isLow ? "text-amber-100" : "text-white"}`} style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}>
            {Math.round(value)}<span className="text-white/55 text-[9px] ml-0.5">/{max}</span>
          </span>
        </span>
        {isCritical && (
          <div className="absolute inset-0 bg-rose-500/15 animate-pulse" />
        )}
        {/* Low-state warning indicator — small ⚠ icon at right edge when low but not critical */}
        {isLow && !isCritical && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-amber-300/80 animate-pulse pointer-events-none">⚠</div>
        )}
      </div>
    </div>
  );
}

export function StatsBars() {
  const s = useGame((st) => st.stats);
  const fps = useGame((st) => st.fps);
  const timeOfDay = useGame((st) => st.timeOfDay);
  const bleeding = useGame((st) => st.bleeding);
  const poisoning = useGame((st) => st.poisoning);
  const wellRested = useGame((st) => st.wellRested);
  const hydrated = useGame((st) => st.hydrated);
  const dehydrated = useGame((st) => st.dehydrated);
  const radiation = useGame((st) => st.radiation);
  const radiationZoneActive = useGame((st) => st.radiationZoneActive);
  const killCount = useGame((st) => st.killCount);

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-30 flex flex-col gap-1.5">
      <Bar value={s.health} max={100} color="bg-gradient-to-r from-emerald-600 to-emerald-400" icon="❤️" label="Health" critical glow="shadow-[inset_0_0_8px_rgba(255,255,255,0.25)]" pulseColor="16,185,129" />
      <Bar value={s.food} max={100} color="bg-gradient-to-r from-orange-600 to-orange-400" icon="🍖" label="Food" pulseColor="249,115,22" />
      <Bar value={s.water} max={100} color="bg-gradient-to-r from-sky-600 to-sky-400" icon="💧" label="Water" critical pulseColor="14,165,233" />
      {/* Radiation bar — only shows when radiation > 0 or in a radiation zone */}
      {(radiation > 0 || radiationZoneActive) && (
        <Bar value={radiation} max={100} color="bg-gradient-to-r from-lime-600 to-lime-300" icon="☢️" label="Radiation" critical pulseColor="132,204,22" />
      )}

      {/* Status effect badges — name only (no hint text) */}
      <div className="flex flex-col gap-1 mt-1">
        {dehydrated && (
          <StatusBadge color="sky" icon="🏜️" text="Dehydrated" />
        )}
        {bleeding > 0 && (
          <StatusBadge color="rose" icon="🩸" text="Bleeding" />
        )}
        {poisoning > 0 && (
          <StatusBadge color="emerald" icon="☠️" text="Poisoned" />
        )}
        {wellRested > 0 && (
          <StatusBadge color="amber" icon="💪" text="Well-Rested" positive />
        )}
        {hydrated > 0 && (
          <StatusBadge color="sky" icon="💦" text="Hydrated" positive />
        )}
        {radiationZoneActive && (
          <StatusBadge color="lime" icon="☢️" text="Radiation Zone" />
        )}
        {radiation > 30 && !radiationZoneActive && (
          <StatusBadge color="lime" icon="☢️" text="Radiation Sickness" />
        )}
      </div>

      {/* Time + FPS + kill count — weather display removed per user request. */}
      <div className="mt-1 flex justify-end gap-2 text-[11px] text-white/65 font-mono bg-black/50 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
        <span className={timeOfDay > 0.78 || timeOfDay < 0.22 ? "text-sky-300" : ""}>🕒 {formatTime(timeOfDay)}</span>
        <span className="text-white/30">|</span>
        <span className={fps < 30 ? "text-rose-300" : "text-emerald-300/80"}>{fps} FPS</span>
        {killCount > 0 && (
          <>
            <span className="text-white/30">|</span>
            <span className="text-rose-300/85">⚔ {killCount}</span>
          </>
        )}
      </div>
    </div>
  );
}

function formatTime(t: number): string {
  const hours = Math.floor(t * 24);
  const mins = Math.floor((t * 24 - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function StatusBadge({ color, icon, text, positive }: { color: "rose" | "emerald" | "sky" | "amber" | "lime"; icon: string; text: string; positive?: boolean }) {
  const colorMap = {
    rose: "bg-rose-900/70 text-rose-200 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.4)]",
    emerald: "bg-emerald-900/70 text-emerald-200 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
    sky: "bg-sky-900/70 text-sky-200 border-sky-500/50 shadow-[0_0_8px_rgba(14,165,233,0.4)]",
    amber: "bg-amber-900/70 text-amber-200 border-amber-500/50 shadow-[0_0_8px_rgba(251,191,36,0.4)]",
    lime: "bg-lime-900/70 text-lime-200 border-lime-500/50 shadow-[0_0_8px_rgba(132,204,22,0.4)]",
  };
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold ${colorMap[color]} ${positive ? "" : "animate-pulse"}`}>
      <span className="text-xs">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
