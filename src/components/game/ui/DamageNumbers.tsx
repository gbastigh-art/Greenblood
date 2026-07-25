"use client";
// Phase 6: Floating damage numbers — shows damage dealt to boss.
import { useGame } from "@/lib/game/store";

export function DamageNumbers() {
  const numbers = useGame((s) => s.damageNumbers);
  const mode = useGame((s) => s.mode);

  if (mode !== "play") return null;
  if (numbers.length === 0) return null;

  // Project 3D positions to screen coordinates using simple approximation
  // We use the minimap's player position as a rough center reference
  const minimap = useGame.getState().minimap;

  return (
    <div className="pointer-events-none fixed inset-0 z-[35]">
      {numbers.map((d) => {
        // Simple screen-space approximation: offset from center based on direction to boss
        const dx = d.x - minimap.playerX;
        const dz = d.z - minimap.playerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 80) return null;
        // Project to screen center + offset
        const yaw = minimap.playerYaw;
        const cos = Math.cos(-yaw);
        const sin = Math.sin(-yaw);
        const rx = dx * cos - dz * sin;
        const rz = dx * sin + dz * cos;
        // Map to screen position (center is 50%, map to ±30%)
        const screenX = 50 + (rx / 40) * 25;
        const screenY = 45 + (rz / 40) * 15;

        // Animate: float upward + fade
        const age = (Date.now() - d.t) / 1500; // 0→1
        const opacity = 1 - age;
        const offsetY = -age * 40;

        return (
          <div
            key={d.id}
            className="absolute text-rose-400 font-bold text-lg tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            style={{
              left: `${screenX}%`,
              top: `${screenY + offsetY * 0.5}%`,
              transform: `translate(-50%, -50%) translateY(${offsetY}px)`,
              opacity: Math.max(0, opacity),
              textShadow: "0 0 8px rgba(239,68,68,0.6), 0 2px 4px rgba(0,0,0,0.8)",
              fontSize: d.value > 20 ? "24px" : "18px",
            }}
          >
            -{d.value}
          </div>
        );
      })}
    </div>
  );
}
