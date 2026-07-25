"use client";
// Day/Night phase transition notification.
//
// When the day phase changes (dawn / day / dusk / night), the engine sets
// `dayNightNotify = { text, icon, t }` on the store. The store auto-clears the
// field after 3500ms via tickDayNightNotify, but we also compute progress from
// Date.now() - t so the visual fades out gracefully even if the clear races.
//
// Layout: top-center, just below the compass. Big phase icon on top, glassy
// pill with the message below. Color glow is keyed to the phase icon:
//   dawn  -> amber
//   day   -> yellow
//   dusk  -> orange
//   night -> indigo (glow only; primary text stays white for readability)
import { useEffect, useState } from "react";
import { useGame } from "@/lib/game/store";

const DURATION = 3500; // ms — matches store's tickDayNightNotify clear window

// Phase visual config keyed by the emoji set in engine.ts updateDayNightNotify.
// `glow` is the border/drop-shadow tint; `tintTop`/`tintBottom` form a subtle
// vertical gradient wash inside the pill.
const PHASE_CONFIG: Record<
  string,
  { glow: string; tintTop: string; tintBottom: string; accent: string }
> = {
  "🌅": {
    glow: "rgba(252,211,77,0.55)",
    tintTop: "rgba(252,211,77,0.30)",
    tintBottom: "rgba(120,53,15,0)",
    accent: "#fcd34d",
  },
  "☀️": {
    glow: "rgba(253,224,71,0.55)",
    tintTop: "rgba(253,224,71,0.30)",
    tintBottom: "rgba(69,26,3,0)",
    accent: "#fde047",
  },
  "🌆": {
    glow: "rgba(251,146,60,0.55)",
    tintTop: "rgba(251,146,60,0.30)",
    tintBottom: "rgba(67,20,7,0)",
    accent: "#fb923c",
  },
  "🌙": {
    glow: "rgba(129,140,248,0.55)",
    tintTop: "rgba(129,140,248,0.30)",
    tintBottom: "rgba(30,27,75,0)",
    accent: "#a5b4fc",
  },
};

const DEFAULT_CONFIG = PHASE_CONFIG["☀️"];

export function DayNightNotify() {
  const dayNightNotify = useGame((s) => s.dayNightNotify);
  const mode = useGame((s) => s.mode);
  const [, forceRender] = useState(0);

  // Tick at 50ms to update fade/slide progress. Cheap and matches the spec.
  useEffect(() => {
    if (!dayNightNotify) return;
    const id = window.setInterval(
      () => forceRender((n) => (n + 1) & 0xffff),
      50,
    );
    return () => window.clearInterval(id);
  }, [dayNightNotify]);

  if (mode === "dead" || mode === "loading" || mode === "menu") return null;
  if (!dayNightNotify) return null;

  const elapsed = Date.now() - dayNightNotify.t;
  if (elapsed > DURATION) return null;
  if (elapsed < 0) return null; // defensive: clock skew

  const progress = elapsed / DURATION; // 0..1

  // Animation phases:
  //   0   - 0.085 : fade in + slide down from above
  //   0.085 - 0.857: hold (fully visible)
  //   0.857 - 1    : fade out + slide back up
  let opacity = 1;
  let translateY = 0;
  if (progress < 0.085) {
    opacity = progress / 0.085;
    translateY = -28 * (1 - opacity);
  } else if (progress > 0.857) {
    opacity = (1 - progress) / 0.143;
    translateY = -28 * (1 - opacity);
  }

  const cfg = PHASE_CONFIG[dayNightNotify.icon] ?? DEFAULT_CONFIG;

  return (
    <div
      className="pointer-events-none fixed top-20 left-1/2 z-40 flex flex-col items-center"
      style={{
        opacity,
        transform: `translate(-50%, ${translateY.toFixed(2)}px)`,
        filter: `drop-shadow(0 4px 20px ${cfg.glow})`,
      }}
    >
      <style>{`
        @keyframes dnn-sheen {
          0%   { transform: translateX(-130%) skewX(-14deg); }
          55%, 100% { transform: translateX(130%) skewX(-14deg); }
        }
        @keyframes dnn-pulse {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 6px ${cfg.glow}); }
          50%      { filter: brightness(1.12) drop-shadow(0 0 14px ${cfg.glow}); }
        }
        @keyframes dnn-rise {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
      `}</style>

      {/* Large phase icon with subtle breathing glow */}
      <div
        className="text-5xl mb-1"
        style={{
          animation: "dnn-pulse 2.6s ease-in-out infinite, dnn-rise 3.4s ease-in-out infinite",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.7))",
        }}
      >
        {dayNightNotify.icon}
      </div>

      {/* Message pill */}
      <div className="relative overflow-visible">
        {/* Pill container — relative so inner layers can stack */}
        <div
          className="relative px-6 py-2 rounded-full bg-black/75 backdrop-blur-md border text-white font-bold text-lg tracking-wide whitespace-nowrap shadow-[0_6px_22px_rgba(0,0,0,0.55)]"
          style={{ borderColor: cfg.glow }}
        >
          {/* Phase-tinted vertical wash inside the pill */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, ${cfg.tintTop}, ${cfg.tintBottom})`,
            }}
          />
          {/* Sheen sweep — clipped to pill shape */}
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <div
              className="absolute inset-y-0 -left-1/2 w-1/2"
              style={{
                background:
                  "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)",
                animation: "dnn-sheen 3s ease-in-out infinite",
              }}
            />
          </div>
          {/* Text on top */}
          <span
            className="relative"
            style={{ textShadow: `0 0 12px ${cfg.glow}, 0 1px 2px rgba(0,0,0,0.85)` }}
          >
            {dayNightNotify.text}
          </span>
        </div>

        {/* Small accent underline dot beneath the pill */}
        <div
          className="mx-auto mt-1.5 h-1 w-1 rounded-full"
          style={{
            background: cfg.accent,
            boxShadow: `0 0 8px ${cfg.accent}`,
          }}
        />
      </div>
    </div>
  );
}
