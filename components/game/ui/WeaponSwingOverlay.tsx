"use client";
// First-person weapon swing animation overlay.
//
// When the player attacks, the engine sets `weaponSwing = { t, kind }` on the
// store. This overlay renders a sweeping arc trail (melee) or a muzzle flash
// (ranged) for ~400ms and then disappears. The store does NOT auto-clear the
// field, so we compute progress from Date.now() - t and short-circuit render
// once the animation completes.
//
// Visuals:
//   - Melee: a curved SVG trail in the lower-right of the screen (where a held
//     weapon would be), with a bright tip that sweeps along the arc and a
//     transparent tail. Color is chosen per weapon kind.
//   - Ranged (shotgun, bow): a radial gradient muzzle flash centered on the
//     crosshair, with cross-shaped spikes and a hot inner core.
//   - Both: subtle camera shake (1-2px translate) during the swing peak.
import { useEffect, useState } from "react";
import { useGame } from "@/lib/game/store";

const DURATION = 400; // ms — total swing animation length

// Per-weapon visual config. `color` is the trail/flash main color; `glow` is
// the softer drop-shadow glow used for the bloom effect.
const WEAPON_CONFIG: Record<
  string,
  { color: string; glow: string; trailWidth: number }
> = {
  fist: { color: "#fde047", glow: "rgba(253,224,71,0.7)", trailWidth: 10 },
  rock: { color: "#9ca3af", glow: "rgba(156,163,175,0.65)", trailWidth: 12 },
  hatchet: { color: "#e5e7eb", glow: "rgba(229,231,235,0.85)", trailWidth: 14 },
  woodSpear: { color: "#a8a29e", glow: "rgba(168,162,158,0.8)", trailWidth: 12 },
  stoneSpear: { color: "#e5e7eb", glow: "rgba(229,231,235,0.85)", trailWidth: 12 },
  woodKnife: { color: "#a8a29e", glow: "rgba(168,162,158,0.8)", trailWidth: 10 },
  stoneKnife: { color: "#e5e7eb", glow: "rgba(229,231,235,0.85)", trailWidth: 10 },
  stonePickaxe: { color: "#e5e7eb", glow: "rgba(229,231,235,0.85)", trailWidth: 14 },
  woodPickaxe: { color: "#a8a29e", glow: "rgba(168,162,158,0.8)", trailWidth: 14 },
  shotgun: { color: "#fb923c", glow: "rgba(251,146,60,0.95)", trailWidth: 0 },
  bow: { color: "#fbbf24", glow: "rgba(251,191,36,0.95)", trailWidth: 0 },
};

const RANGED_KINDS = new Set(["shotgun", "bow"]);

export function WeaponSwingOverlay() {
  const weaponSwing = useGame((s) => s.weaponSwing);
  const mode = useGame((s) => s.mode);
  const [, forceRender] = useState(0);

  // Re-render every animation frame while a swing is active so we can compute
  // the latest progress from Date.now().
  useEffect(() => {
    if (!weaponSwing) return;
    const id = window.setInterval(
      () => forceRender((n) => (n + 1) & 0xffff),
      16,
    );
    return () => window.clearInterval(id);
  }, [weaponSwing]);

  if (mode === "dead" || mode === "loading" || mode === "menu") return null;
  if (!weaponSwing) return null;

  const elapsed = Date.now() - weaponSwing.t;
  if (elapsed > DURATION) return null;
  if (elapsed < 0) return null; // defensive: clock skew

  const progress = elapsed / DURATION; // 0..1
  const cfg =
    WEAPON_CONFIG[weaponSwing.kind] ?? WEAPON_CONFIG.hatchet;
  const isRanged = RANGED_KINDS.has(weaponSwing.kind);

  // Opacity envelope: snap-in for the first 10%, hold, then ease out for the
  // last 40%. This gives the swing a snappy attack and a soft tail.
  let opacity = 1;
  if (progress < 0.1) opacity = progress / 0.1;
  else if (progress > 0.6) opacity = Math.max(0, (1 - progress) / 0.4);

  // Camera shake — small random translate during the peak of the swing
  // (0.15..0.6 progress). Amplitude follows a sine envelope so it ramps in
  // and out smoothly instead of popping.
  let shakeX = 0;
  let shakeY = 0;
  if (progress > 0.15 && progress < 0.6) {
    const amp = 2.2 * Math.sin(((progress - 0.15) / 0.45) * Math.PI);
    shakeX = (Math.random() - 0.5) * amp * 2;
    shakeY = (Math.random() - 0.5) * amp * 2;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
      style={{
        transform: `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px)`,
      }}
    >
      {isRanged ? (
        <RangedBurst
          progress={progress}
          opacity={opacity}
          color={cfg.color}
          glow={cfg.glow}
        />
      ) : (
        <MeleeSwing
          progress={progress}
          opacity={opacity}
          color={cfg.color}
          glow={cfg.glow}
          trailWidth={cfg.trailWidth}
        />
      )}
    </div>
  );
}

// ----- Melee swing trail ----------------------------------------------------

function MeleeSwing({
  progress,
  opacity,
  color,
  glow,
  trailWidth,
}: {
  progress: number;
  opacity: number;
  color: string;
  glow: string;
  trailWidth: number;
}) {
  // The trail sweeps along a curved path from upper-right (start of swing) to
  // lower-left (end of swing). We render the path with a fixed-length dash
  // (the trail) and animate stroke-dashoffset to move the trail along the path.
  const PATH_LENGTH = 520; // logical length set via pathLength attr
  const TRAIL_LENGTH = 240; // visible portion length
  const dashOffset = -progress * (PATH_LENGTH - TRAIL_LENGTH);

  // Hit-impact flash: a soft radial burst at the swing's apex (the tip's
  // approximate location when progress is ~0.45). Fades in and out around the
  // peak so it reads as "contact".
  const impactProgress = progress > 0.3 && progress < 0.65
    ? Math.sin(((progress - 0.3) / 0.35) * Math.PI)
    : 0;

  return (
    <div
      className="absolute"
      style={{
        right: "4%",
        bottom: "4%",
        width: "min(52vw, 560px)",
        height: "min(52vw, 560px)",
        opacity,
      }}
    >
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        style={{ filter: `drop-shadow(0 0 16px ${glow})` }}
      >
        <defs>
          {/* Trail gradient: transparent tail -> colored body -> bright white tip.
              The gradient is anchored to the SVG bounding box along the same
              diagonal as the path so it lines up with the sweep direction. */}
          <linearGradient id="ws-trail" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="35%" stopColor={color} stopOpacity="0.45" />
            <stop offset="80%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="ws-impact" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor={color} stopOpacity="0.85" />
            <stop offset="70%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Faint guide arc — gives the eye a path to follow even before the
            trail arrives. */}
        <path
          d="M 380 30 C 260 90 130 180 40 360"
          fill="none"
          stroke={color}
          strokeOpacity="0.07"
          strokeWidth="2"
          pathLength={PATH_LENGTH}
        />

        {/* Main swing trail */}
        <path
          d="M 380 30 C 260 90 130 180 40 360"
          fill="none"
          stroke="url(#ws-trail)"
          strokeWidth={trailWidth}
          strokeLinecap="round"
          strokeDasharray={`${TRAIL_LENGTH} ${PATH_LENGTH}`}
          strokeDashoffset={dashOffset}
          pathLength={PATH_LENGTH}
          style={{ filter: "blur(0.6px)" }}
        />

        {/* Impact flash near the tip's mid-swing position */}
        {impactProgress > 0 && (
          <circle
            cx="130"
            cy="180"
            r={48 * impactProgress + 14}
            fill="url(#ws-impact)"
            opacity={impactProgress}
          />
        )}
      </svg>
    </div>
  );
}

// ----- Ranged muzzle flash --------------------------------------------------

function RangedBurst({
  progress,
  opacity,
  color,
  glow,
}: {
  progress: number;
  opacity: number;
  color: string;
  glow: string;
}) {
  // Muzzle flash expands outward and fades to nothing across the swing
  // duration. Brightest at the very start, gone by ~progress 0.8.
  const fade = Math.max(0, 1 - progress * 1.15);
  const scale = 0.55 + progress * 1.1;

  // Convert hex color (#rrggbb) to an rgba() with alpha for layering. Falls
  // back to the raw color if parsing fails so we never produce invalid CSS.
  const rgba = (alpha: number) => {
    const hex = color.replace("#", "");
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return color;
  };

  return (
    <div
      className="absolute top-1/2 left-1/2"
      style={{
        transform: `translate(-50%, -50%) scale(${scale.toFixed(3)})`,
        opacity: opacity * fade,
      }}
    >
      {/* Outer bloom halo */}
      <div
        className="rounded-full"
        style={{
          width: "260px",
          height: "260px",
          background: `radial-gradient(circle, ${rgba(0.85)} 0%, ${rgba(0.45)} 22%, ${rgba(0.18)} 45%, transparent 65%)`,
          filter: `blur(2px) drop-shadow(0 0 24px ${glow})`,
        }}
      />

      {/* Hot inner core */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: "78px",
          height: "78px",
          background:
            "radial-gradient(circle, #ffffff 0%, #ffe6a8 30%, transparent 75%)",
        }}
      />

      {/* Cross-shaped flash spikes (horizontal + vertical) */}
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: "340px",
          height: "5px",
          background: `linear-gradient(90deg, transparent 0%, ${color} 45%, #ffffff 50%, ${color} 55%, transparent 100%)`,
          opacity: 0.7,
          filter: "blur(1px)",
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: "5px",
          height: "340px",
          background: `linear-gradient(180deg, transparent 0%, ${color} 45%, #ffffff 50%, ${color} 55%, transparent 100%)`,
          opacity: 0.7,
          filter: "blur(1px)",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Diagonal spikes for more "star" feel */}
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: "220px",
          height: "4px",
          background: `linear-gradient(90deg, transparent 0%, ${color} 45%, #ffffff 50%, ${color} 55%, transparent 100%)`,
          opacity: 0.45,
          filter: "blur(1px)",
          transform: "translate(-50%, -50%) rotate(45deg)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: "220px",
          height: "4px",
          background: `linear-gradient(90deg, transparent 0%, ${color} 45%, #ffffff 50%, ${color} 55%, transparent 100%)`,
          opacity: 0.45,
          filter: "blur(1px)",
          transform: "translate(-50%, -50%) rotate(-45deg)",
        }}
      />
    </div>
  );
}
