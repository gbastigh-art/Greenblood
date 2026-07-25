"use client";
// Phase 11: Stamina penalty flash — brief amber/red edge glow when out of stamina.
// Triggers when player tries to jump but is too exhausted, or when stamina drops below 20.
import { useEffect, useState } from "react";
import { useGame } from "@/lib/game/store";

export function StaminaPenaltyFlash() {
  const flash = useGame((s) => s.staminaPenaltyFlash);
  const mode = useGame((s) => s.mode);
  const stamina = useGame((s) => s.stats.stamina);
  const [tick, setTick] = useState(0);

  // Re-render at 30fps while active so decay looks smooth
  useEffect(() => {
    if (flash < 0.02) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 1000), 33);
    return () => clearInterval(id);
  }, [flash]);

  if (mode === "dead" || mode === "loading" || mode === "menu") return null;
  if (flash < 0.02) return null;

  // Amber-orange glow — distinct from red low-health vignette
  const opacity = flash * 0.55;
  // "EXHAUSTED" text only at peak flash
  const showText = flash > 0.4;

  return (
    <>
      <style>{`
        @keyframes staminaShake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-1px, 1px); }
          50% { transform: translate(1px, -1px); }
          75% { transform: translate(-1px, 0); }
        }
      `}</style>
      <div
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          background: `radial-gradient(ellipse at center, transparent 60%, rgba(245, 158, 11, ${opacity}) 100%)`,
          animation: flash > 0.7 ? "staminaShake 0.12s linear infinite" : "none",
        }}
      />
      {showText && (
        <div
          className="pointer-events-none fixed top-[55%] left-1/2 -translate-x-1/2 z-40 text-center"
          style={{ opacity: flash }}
        >
          <div
            className="text-lg font-bold tracking-[0.25em] text-amber-400"
            style={{
              textShadow:
                "0 0 8px rgba(245,158,11,0.9), 0 0 16px rgba(245,158,11,0.6), 0 2px 4px rgba(0,0,0,0.9)",
            }}
          >
            EXHAUSTED
          </div>
          <div
            className="mt-0.5 text-[10px] font-semibold tracking-[0.15em] text-amber-200/80"
            style={{ textShadow: "0 0 4px rgba(245,158,11,0.7), 0 1px 2px rgba(0,0,0,0.9)" }}
          >
            Stamina: {Math.ceil(stamina)}
          </div>
        </div>
      )}
    </>
  );
}
