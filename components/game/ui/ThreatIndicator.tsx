"use client";
// Phase 10: Threat Direction Indicator — tactical radar that renders red
// arrows at the screen edges pointing toward nearby hostile creatures that
// are off-screen. Each threat gets a directional arrow + creature icon +
// distance label. Bosses get a larger indicator with a "!" warning badge.
//
// Geometry:
//   worldAngle  = atan2(threat.x, threat.z)  // 0 = +z/north, π/2 = +x/east
//   screenAngle = worldAngle - (playerYaw + π), normalized to [-π, π]
//   dirX =  sin(screenAngle)   // rightward on screen
//   dirY = -cos(screenAngle)   // upward on screen (screen Y is down)
// The indicator is placed at the edge of an elliptical "radar" around the
// screen center (280px horizontal × 180px vertical). The arrow is rotated
// by `screenAngle` (in degrees) so it points outward toward the threat.
import { useGame } from "@/lib/game/store";

const COLOR_MAP: Record<string, string> = {
  wolf: "#ef4444", // red-500
  bear: "#dc2626", // red-600
  bot: "#f97316", // orange-500
  boss: "#a855f7", // purple-500
};

const ICON_MAP: Record<string, string> = {
  wolf: "🐺",
  bear: "🐻",
  bot: "🤖",
  boss: "👹",
};

// Modes in which the threat radar should be hidden.
const HIDDEN_MODES = new Set(["dead", "loading", "menu"]);

// Elliptical radar radius around the screen center (px).
const MAX_RX = 280;
const MAX_RY = 180;

export function ThreatIndicator() {
  const threats = useGame((s) => s.threats);
  const playerYaw = useGame((s) => s.minimap.playerYaw);
  const mode = useGame((s) => s.mode);

  if (HIDDEN_MODES.has(mode)) return null;
  if (!threats || threats.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {threats.map((t, i) => {
        // World-space angle from player to threat.
        const worldAngle = Math.atan2(t.x, t.z);
        // Screen-relative angle (playerYaw + π flips because yaw=0 means
        // the camera looks toward -z).
        let screenAngle = worldAngle - (playerYaw + Math.PI);
        // Normalize to [-π, π].
        while (screenAngle > Math.PI) screenAngle -= Math.PI * 2;
        while (screenAngle < -Math.PI) screenAngle += Math.PI * 2;

        // Screen-space unit direction (dirX right, dirY up).
        const dirX = Math.sin(screenAngle);
        const dirY = -Math.cos(screenAngle);

        // Place indicator at the edge of the radar ellipse.
        const sx = dirX * MAX_RX;
        const sy = dirY * MAX_RY;

        // Arrow rotation in degrees (0 = pointing up/outward).
        const arrowRot = (screenAngle * 180) / Math.PI;

        const color = COLOR_MAP[t.kind] ?? "#ef4444";
        const icon = ICON_MAP[t.kind] ?? "⚠️";
        const isBoss = t.kind === "boss";

        return (
          <div
            key={`${t.kind}-${i}-${Math.round(t.distance)}`}
            className="absolute"
            style={{
              left: `calc(50% + ${sx}px)`,
              top: `calc(50% + ${sy}px)`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="relative flex flex-col items-center">
              {/* Directional arrow — placed outward along the radial line,
                  rotated to point at the threat. */}
              <div
                className={`absolute select-none leading-none animate-pulse ${
                  isBoss ? "text-2xl" : "text-base"
                }`}
                style={{
                  color,
                  filter: `drop-shadow(0 0 6px ${color})`,
                  left: `${dirX * 24}px`,
                  top: `${dirY * 24}px`,
                  transform: `translate(-50%, -50%) rotate(${arrowRot}deg)`,
                }}
              >
                ▲
              </div>

              {/* Pill: optional "!" warning badge + creature icon + distance. */}
              <div
                className="flex items-center gap-1 rounded-full border bg-black/70 px-2 py-0.5 backdrop-blur-sm"
                style={{
                  borderColor: `${color}99`,
                  boxShadow: `0 0 12px ${color}55, 0 2px 10px rgba(0,0,0,0.6)`,
                }}
              >
                {isBoss && (
                  <span className="animate-pulse rounded-sm bg-red-600 px-1 text-[9px] font-bold leading-none text-white">
                    !
                  </span>
                )}
                <span className={`leading-none ${isBoss ? "text-2xl" : "text-lg"}`}>
                  {icon}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-white/85">
                  {Math.floor(t.distance)}m
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
