"use client";
// Minimap component — top-right corner circular radar.
// Shows nearby trees, bots, animals, placed builds, loot, cave entrances, waypoints.
// Player is always at center, facing up.
import { useEffect, useRef } from "react";
import { useGame } from "@/lib/game/store";
import { BUILDS } from "@/lib/game/buildables";

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimap = useGame((s) => s.minimap);
  const mode = useGame((s) => s.mode);
  const timeOfDay = useGame((s) => s.timeOfDay);
  const waypoints = useGame((s) => s.waypoints);
  // Phase 3: night factor — 1 at deep night (timeOfDay > 0.78 or < 0.22), 0 at full day
  const minimapNightFactor = (timeOfDay > 0.78 || timeOfDay < 0.22) ? 1 : (timeOfDay > 0.68 || timeOfDay < 0.32 ? Math.max(0, Math.min((0.78 - timeOfDay) / 0.10, (timeOfDay - 0.22) / 0.10)) : 0);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    const cx = W / 2;
    const cy = H / 2;
    const RANGE = 80; // world meters shown across radius
    const scale = (W / 2) / RANGE;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background — dark with subtle gradient
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, W / 2);
    grad.addColorStop(0, "rgba(20, 30, 20, 0.85)");
    grad.addColorStop(0.7, "rgba(15, 20, 15, 0.85)");
    grad.addColorStop(1, "rgba(8, 10, 8, 0.85)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, W / 2, 0, Math.PI * 2);
    ctx.fill();

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, W / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    // Grid lines (cardinal)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    for (let r = 20; r < RANGE; r += 20) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.stroke();

    // Helper to plot a world-relative point (already player-relative dx, dz)
    // Rotate by -yaw so player faces up
    const yaw = minimap.playerYaw;
    const cos = Math.cos(-yaw);
    const sin = Math.sin(-yaw);
    const plot = (dx: number, dz: number, draw: (x: number, y: number) => void) => {
      // world: x east, z south. We want north up = -z.
      // After rotating by -yaw, north (-z) maps to up.
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      const px = cx + rx * scale;
      const py = cy + rz * scale; // rz positive = south = down
      draw(px, py);
    };

    // Trees — small dark green dots
    for (const t of minimap.trees) {
      plot(t.x, t.z, (x, y) => {
        ctx.fillStyle = "rgba(60, 120, 50, 0.85)";
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Placed builds — colored squares
    for (const p of minimap.placed) {
      const def = BUILDS[p.kind];
      const hex = "#" + def.color.toString(16).padStart(6, "0");
      plot(p.x, p.z, (x, y) => {
        ctx.fillStyle = hex;
        ctx.fillRect(x - 2, y - 2, 4, 4);
      });
    }

    // Loot containers — yellow diamonds
    for (const l of minimap.loot) {
      plot(l.x, l.z, (x, y) => {
        ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x + 3, y);
        ctx.lineTo(x, y + 3);
        ctx.lineTo(x - 3, y);
        ctx.closePath();
        ctx.fill();
      });
    }

    // Cave entrances — dark circles with purple ring
    for (const c of minimap.caveEntrances) {
      plot(c.x, c.z, (x, y) => {
        ctx.fillStyle = "rgba(20, 10, 30, 0.95)";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(168, 85, 247, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // Animals — colored dots by kind (Phase 3: rabbit + wolf)
    const isNightMinimap = minimapNightFactor > 0.5;
    for (const a of minimap.animals) {
      let color = "rgba(200, 160, 100, 0.9)"; // deer default (light tan)
      let size = 2.5;
      let isTriangle = false;
      if (a.kind === "bear") {
        color = "rgba(180, 60, 30, 0.95)";
        size = 4;
      } else if (a.kind === "boar") {
        color = "rgba(120, 80, 50, 0.9)";
        size = 3;
      } else if (a.kind === "rabbit") {
        // Light-brown dot, small
        color = "rgba(210, 170, 110, 0.95)";
        size = 2;
      } else if (a.kind === "wolf") {
        // Dark-gray triangle; red at night (hostile)
        color = isNightMinimap ? "rgba(239, 68, 68, 0.98)" : "rgba(80, 80, 80, 0.95)";
        size = 3.2;
        isTriangle = true;
      }
      plot(a.x, a.z, (x, y) => {
        ctx.fillStyle = color;
        if (isTriangle) {
          // Triangle pointing in the direction of motion / up
          ctx.beginPath();
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size * 0.9, y + size * 0.7);
          ctx.lineTo(x - size * 0.9, y + size * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.6)";
          ctx.lineWidth = 0.6;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Bots — red triangles
    for (const b of minimap.bots) {
      plot(b.x, b.z, (x, y) => {
        ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x + 3.5, y + 3);
        ctx.lineTo(x - 3.5, y + 3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
    }

    // Phase 11: Custom waypoint markers — pulsing stars with colored ring
    for (const wp of waypoints) {
      plot(wp.x, wp.z, (x, y) => {
        // Outer pulsing glow ring
        const pulse = (Date.now() % 1500) / 1500;
        const ringR = 6 + pulse * 5;
        const ringAlpha = (1 - pulse) * 0.7;
        ctx.strokeStyle = wp.color + Math.floor(ringAlpha * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, ringR, 0, Math.PI * 2);
        ctx.stroke();
        // Star body — 5-point star
        ctx.fillStyle = wp.color;
        ctx.beginPath();
        const starR = 5;
        const innerR = 2;
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? starR : innerR;
          const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const sx = x + Math.cos(ang) * r;
          const sy = y + Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // White center dot
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Player — center arrow (always pointing up since we rotate world)
    ctx.restore();
    ctx.fillStyle = "rgba(251, 191, 36, 1)";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // pulse ring
    const pulse = (Date.now() % 2000) / 2000;
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.6 * (1 - pulse)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 6 + pulse * 14, 0, Math.PI * 2);
    ctx.stroke();

    // N marker at top
    ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", cx, 8);
  }, [minimap, mode, minimapNightFactor, waypoints]);

  if (mode === "loading" || mode === "menu" || mode === "dead") return null;

  return (
    <div className="pointer-events-none fixed top-24 right-3 z-30">
      <div className="relative p-1.5 rounded-full bg-black/40 border border-amber-500/30 shadow-[0_0_18px_rgba(0,0,0,0.7)] backdrop-blur-sm">
        <canvas
          ref={canvasRef}
          width={170}
          height={170}
          className="rounded-full"
          style={{ background: "rgba(0,0,0,0.4)" }}
        />
        {/* Cardinal direction labels — N/E/S/W around minimap edge */}
        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">N</span>
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/55 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">S</span>
        <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/55 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">W</span>
        <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/55 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">E</span>
        {/* Legend */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/80 rounded-full px-2.5 py-0.5 border border-white/15 shadow-md whitespace-nowrap">
          <LegendDot color="bg-amber-400" title="You" />
          <LegendDot color="bg-red-500" title="Bot / hostile" />
          <LegendDot color="bg-amber-300" title="Loot" />
          <LegendDot color="bg-purple-500" title="Cave" />
          <LegendDot color="bg-emerald-500" title="Tree" />
          <LegendDot color="bg-pink-400" title="Waypoint" />
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, title }: { color: string; title: string }) {
  return (
    <div
      className={`w-1.5 h-1.5 rounded-full ${color}`}
      title={title}
    />
  );
}
