"use client";
// Buff HUD — small chip row above the hotbar showing active buff meal timers.
// Shows when at least one of buffStrength/buffSwift/buffIronSkin is > 0.
// Each chip shows icon + short name + m:ss countdown + circular progress ring.
// A 1-second interval forces a re-render so the displayed timer ticks smoothly.
// Selectors round up to whole seconds so we don't re-render every frame.
import { useEffect, useState } from "react";
import { useGame } from "@/lib/game/store";

const MAX_BUFF_SECONDS = 90;

interface BuffDef {
  key: "buffStrength" | "buffSwift" | "buffIronSkin" | "buffRegen" | "buffNightVision";
  icon: string;
  name: string;
  grad: string; // tailwind gradient for glow ring
  ring: string; // stroke color class
  text: string; // label color class
}

const BUFFS: BuffDef[] = [
  { key: "buffStrength", icon: "⚔️", name: "STR", grad: "from-rose-500 to-rose-700",  ring: "stroke-rose-400",  text: "text-rose-200" },
  { key: "buffSwift",    icon: "👟", name: "SPD", grad: "from-emerald-500 to-emerald-700", ring: "stroke-emerald-400", text: "text-emerald-200" },
  { key: "buffIronSkin", icon: "🛡️", name: "ARM", grad: "from-sky-500 to-sky-700",   ring: "stroke-sky-400",   text: "text-sky-200" },
  // Phase 6: new buff meals
  { key: "buffRegen",       icon: "💚", name: "REG", grad: "from-green-400 to-green-600", ring: "stroke-green-400", text: "text-green-200" },
  { key: "buffNightVision", icon: "👁️", name: "VIS", grad: "from-purple-400 to-purple-600", ring: "stroke-purple-400", text: "text-purple-200" },
];

export function BuffHud() {
  // Round up so the selector output changes once per second, not every frame.
  const sVal = useGame((st) => Math.ceil(st.buffStrength));
  const wVal = useGame((st) => Math.ceil(st.buffSwift));
  const iVal = useGame((st) => Math.ceil(st.buffIronSkin));
  const rVal = useGame((st) => Math.ceil(st.buffRegen));
  const nvVal = useGame((st) => Math.ceil(st.buffNightVision));
  // 1-second tick to force re-render even if the rounded value hasn't changed
  // (e.g. if engine paused or values decrement on a non-integer schedule).
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(id);
  }, []);

  const active = [
    { def: BUFFS[0], remaining: sVal },
    { def: BUFFS[1], remaining: wVal },
    { def: BUFFS[2], remaining: iVal },
    { def: BUFFS[3], remaining: rVal },
    { def: BUFFS[4], remaining: nvVal },
  ].filter((b) => b.remaining > 0);

  if (active.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-end gap-2 animate-buff-rise">
        {active.map(({ def, remaining }) => {
          const mins = Math.floor(remaining / 60);
          const secs = remaining % 60;
          const pct = Math.max(0, Math.min(1, remaining / MAX_BUFF_SECONDS));
          const r = 14;
          const circumference = 2 * Math.PI * r;
          const offset = circumference * (1 - pct);
          return (
            <div key={def.key} className="relative animate-buff-pop">
              {/* Outer gradient glow */}
              <div
                className={`absolute -inset-[2px] rounded-lg bg-gradient-to-br ${def.grad} opacity-70 blur-[2px] animate-pulse`}
              />
              <div className="relative flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-white/15">
                {/* Circular progress ring with icon center */}
                <div className="relative w-9 h-9 shrink-0">
                  <svg viewBox="0 0 32 32" className="w-9 h-9 -rotate-90">
                    <circle
                      cx="16"
                      cy="16"
                      r={r}
                      className="stroke-white/10"
                      strokeWidth="3"
                      fill="none"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r={r}
                      className={def.ring}
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      style={{ transition: "stroke-dashoffset 0.5s linear" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-base leading-none">
                    {def.icon}
                  </div>
                </div>
                {/* Name + countdown */}
                <div className="flex flex-col pr-0.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${def.text}`}
                  >
                    {def.name}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-white/85 leading-tight">
                    {mins}:{String(secs).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes buffRise {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes buffPop {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        .animate-buff-rise { animation: buffRise 0.3s cubic-bezier(0.16,1,0.3,1) both; }
        .animate-buff-pop  { animation: buffPop  0.25s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
    </div>
  );
}
