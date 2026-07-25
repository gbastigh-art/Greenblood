"use client";
// Phase 11: Waypoint HUD — renders custom waypoint markers around the screen edge,
// pointing toward off-screen waypoints with distance labels.
// Also shows nearby waypoints as small badges near the crosshair.
import { useEffect, useState } from "react";
import { useGame } from "@/lib/game/store";

export function WaypointHud() {
  const waypoints = useGame((s) => s.waypoints);
  const minimap = useGame((s) => s.minimap);
  const mode = useGame((s) => s.mode);
  const [tick, setTick] = useState(0);

  // Smooth re-render at ~20fps for distance updates
  useEffect(() => {
    if (waypoints.length === 0) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 1000), 50);
    return () => clearInterval(id);
  }, [waypoints.length]);

  if (mode === "dead" || mode === "loading" || mode === "menu") return null;
  if (waypoints.length === 0) return null;

  const playerX = minimap.playerX;
  const playerZ = minimap.playerZ;
  const yaw = minimap.playerYaw;

  // Render off-screen indicators at the screen edges pointing toward waypoints
  // For each waypoint, compute world angle relative to player facing
  const indicators = waypoints.map((wp) => {
    const dx = wp.x - playerX;
    const dz = wp.z - playerZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // World angle: 0 = north (-z), positive = clockwise
    const worldAngle = Math.atan2(dx, -dz);
    // Screen angle: shift by player yaw (player yaw 0 = facing -z = north)
    let screenAngle = worldAngle - yaw;
    // Normalize to [-π, π]
    while (screenAngle > Math.PI) screenAngle -= 2 * Math.PI;
    while (screenAngle < -Math.PI) screenAngle += 2 * Math.PI;

    // Direction vector on screen (where the indicator should point)
    const dirX = Math.sin(screenAngle);
    const dirY = -Math.cos(screenAngle);

    // If waypoint is essentially in front of camera (within ~30° of center),
    // we render it as a small floating marker near the crosshair instead.
    const inFront = Math.abs(screenAngle) < Math.PI / 6 && distance < 200;

    return {
      id: wp.id,
      label: wp.label,
      color: wp.color,
      distance,
      screenAngle,
      dirX,
      dirY,
      inFront,
    };
  });

  // Off-screen indicators (those NOT in front)
  const offScreen = indicators.filter((i) => !i.inFront);
  // Near crosshair indicators (in front, close)
  const inFrontList = indicators.filter((i) => i.inFront).slice(0, 3);

  // Place off-screen indicators at elliptical screen edge
  // 280px horizontal, 180px vertical radius around screen center
  const RX = 280;
  const RY = 170;

  return (
    <>
      <style>{`
        @keyframes wpPulse {
          0%, 100% { opacity: 0.85; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes wpArrowBounce {
          0%, 100% { transform: translate(var(--tx), var(--ty)) scale(1); }
          50% { transform: translate(var(--tx), var(--ty)) scale(1.12); }
        }
      `}</style>
      {/* Off-screen directional indicators */}
      {offScreen.map((wp) => {
        const px = 50 + (wp.dirX * RX / window.innerWidth) * 100;
        const py = 50 + (wp.dirY * RY / window.innerHeight) * 100;
        return (
          <div
            key={wp.id}
            className="pointer-events-none fixed z-30"
            style={{
              left: `${px}%`,
              top: `${py}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              style={{
                transform: `rotate(${wp.screenAngle}rad)`,
                filter: `drop-shadow(0 0 6px ${wp.color})`,
              }}
            >
              {/* Arrow pointing in direction of waypoint */}
              <svg width="28" height="28" viewBox="0 0 28 28" style={{ display: "block" }}>
                <path
                  d="M 14 2 L 24 22 L 14 18 L 4 22 Z"
                  fill={wp.color}
                  stroke="rgba(0,0,0,0.7)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="14" cy="14" r="2" fill="white" opacity="0.9" />
              </svg>
            </div>
            <div
              className="mt-1 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-sm border text-[10px] font-bold whitespace-nowrap"
              style={{
                borderColor: wp.color + "80",
                color: wp.color,
                textShadow: "0 0 4px rgba(0,0,0,0.9)",
              }}
            >
              {wp.label} · {Math.round(wp.distance)}m
            </div>
          </div>
        );
      })}

      {/* In-front indicators near crosshair (floating diamonds) */}
      {inFrontList.map((wp) => {
        // Position the diamond at a distance from crosshair based on world distance
        // Closer = bigger diamond, farther = smaller
        const size = Math.max(12, Math.min(28, 32 - wp.distance * 0.08));
        const yOffset = -60 - wp.distance * 0.3;
        return (
          <div
            key={wp.id}
            className="pointer-events-none fixed left-1/2 z-30"
            style={{
              top: `calc(50% + ${yOffset}px)`,
              transform: "translateX(-50%)",
              animation: "wpPulse 2s ease-in-out infinite",
            }}
          >
            {/* Diamond shape */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: `${size / 2}px solid transparent`,
                borderRight: `${size / 2}px solid transparent`,
                borderBottom: `${size}px solid ${wp.color}`,
                filter: `drop-shadow(0 0 6px ${wp.color})`,
              }}
            />
            {/* Inner highlight */}
            <div
              style={{
                width: 0,
                height: 0,
                marginLeft: `${-size / 4}px`,
                marginTop: `${size * 0.3}px`,
                borderLeft: `${size / 4}px solid transparent`,
                borderRight: `${size / 4}px solid transparent`,
                borderBottom: `${size / 2}px solid rgba(255,255,255,0.7)`,
              }}
            />
            <div
              className="mt-1 px-1.5 py-0.5 rounded-full bg-black/80 backdrop-blur-sm border text-[9px] font-bold whitespace-nowrap text-center"
              style={{
                borderColor: wp.color + "80",
                color: wp.color,
                textShadow: "0 0 4px rgba(0,0,0,0.9)",
              }}
            >
              {wp.label} · {Math.round(wp.distance)}m
            </div>
          </div>
        );
      })}

      {/* Bottom-center waypoint count badge */}
      <div className="pointer-events-none fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
        <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-amber-500/30 text-[10px] font-bold text-amber-300/90 flex items-center gap-1.5 shadow-md">
          <span className="text-amber-400">📍</span>
          <span>{waypoints.length} waypoint{waypoints.length === 1 ? "" : "s"}</span>
          <span className="text-amber-500/50">·</span>
          <span className="text-amber-200/70">[M] drop · [N] remove · [⇧M] clear</span>
        </div>
      </div>
    </>
  );
}
