"use client";
// Damage direction indicator — renders a red arc/chevron around the screen center
// pointing toward the source of incoming damage (AAA FPS-style, like CoD/Battlefield).
//
// Each entry in `damageDirections` has:
//   - id:     unique id
//   - angle:  screen-relative angle in radians (0 = front of player, positive = right/clockwise).
//             The engine already factors in playerYaw, so we just rotate by this value.
//   - t:      timestamp (ms)
//   - value:  damage amount
//
// Entries are expired automatically by the store's `tickDamageDirections()` after 1500ms;
// we still render-time filter to avoid a single stale frame flash.
import { useEffect, useState } from "react";
import { useGame } from "@/lib/game/store";

const LIFETIME_MS = 1500;
const RADIUS_PX = 110;

export function DamageDirectionIndicator() {
  const damageDirections = useGame((s) => s.damageDirections);
  const mode = useGame((s) => s.mode);
  const [, forceRender] = useState(0);

  // Re-render frequently so the opacity fade stays smooth between store ticks (~30fps).
  useEffect(() => {
    if (!damageDirections || damageDirections.length === 0) return;
    const id = window.setInterval(() => forceRender((n) => (n + 1) & 0xfffff), 33);
    return () => window.clearInterval(id);
  }, [damageDirections.length]);

  if (mode === "dead" || mode === "loading" || mode === "menu") return null;
  if (!damageDirections || damageDirections.length === 0) return null;

  const now = Date.now();

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {damageDirections.map((d) => {
        const age = now - d.t;
        const lifeFrac = age / LIFETIME_MS; // 0 → 1 over the entry's lifetime
        if (lifeFrac >= 1) return null;

        // Fade: hold near-full opacity for the first ~35%, then ease out to 0.
        const opacity =
          lifeFrac < 0.35 ? 1 : Math.max(0, 1 - (lifeFrac - 0.35) / 0.65);

        // Quick scale-in over the first 120ms for a snappy "hit" feel.
        const scale = 0.75 + 0.25 * Math.min(1, age / 120);

        return (
          <div
            key={d.id}
            className="absolute left-1/2 top-1/2 flex flex-col items-center"
            style={{
              transform: `translate(-50%, -50%) rotate(${d.angle}rad) translateY(${-RADIUS_PX}px) scale(${scale})`,
              opacity,
              willChange: "transform, opacity",
            }}
          >
            <svg
              width="76"
              height="52"
              viewBox="-38 -26 76 52"
              aria-hidden="true"
              style={{ filter: "drop-shadow(0 0 8px #ef4444)", display: "block" }}
            >
              {/* Outer faint glow chevron — broader & transparent, gives the "arc ring" feel */}
              <path
                d="M -30 10 L 0 -22 L 30 10"
                stroke="#ef4444"
                strokeWidth="3"
                fill="none"
                strokeOpacity="0.28"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Main V chevron — tip at top (outward, toward threat), wings open down (toward player) */}
              <path
                d="M -22 6 L 0 -16 L 22 6"
                stroke="#ef4444"
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Inner accent — bright thin highlight for crispness */}
              <path
                d="M -15 4 L 0 -10 L 15 4"
                stroke="#fecaca"
                strokeWidth="1.25"
                fill="none"
                strokeOpacity="0.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {/* Damage value — placed below the chevron in local space (radially inward,
                toward screen center after the parent rotation) */}
            <div
              className="-mt-0.5 text-center text-sm font-extrabold tabular-nums text-rose-300"
              style={{
                textShadow:
                  "0 0 6px #ef4444, 0 0 12px rgba(239,68,68,0.6), 0 1px 2px rgba(0,0,0,1)",
              }}
            >
              -{d.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
