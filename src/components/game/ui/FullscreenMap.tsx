"use client";
// Full-screen map overlay — press M to toggle.
// Shows the entire world (top-down), player position/heading, all key landmarks.
// Phase 8: Added scroll-wheel zoom + click-drag pan.
import { useEffect, useRef, useState, useCallback } from "react";
import { useGame } from "@/lib/game/store";
import { BUILDS } from "@/lib/game/buildables";

export function FullscreenMap() {
  const minimap = useGame((s) => s.minimap);
  const mode = useGame((s) => s.mode);
  const placed = useGame((s) => s.placed);
  const dayCount = useGame((s) => s.dayCount);
  const timeOfDay = useGame((s) => s.timeOfDay);
  const weather = useGame((s) => s.weather);
  const unlockedAchievements = useGame((s) => s.unlockedAchievements);
  // Phase 11: waypoints for full map rendering
  const waypoints = useGame((s) => s.waypoints);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Drag state (useState for cursor rendering, ref for performance during drag)
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startOffX: number; startOffY: number }>({
    startX: 0,
    startY: 0,
    startOffX: 0,
    startOffY: 0,
  });

  const resetZoom = useCallback(() => {
    setZoom(1.0);
    setOffset({ x: 0, y: 0 });
  }, []);

  // U key toggle (Phase 11: changed from M to U to free up M for waypoints)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "u") {
        const m = useGame.getState().mode;
        if (m === "play") {
          e.preventDefault();
          setOpen((o) => {
            if (!o) {
              // Reset zoom on open
              setZoom(1.0);
              setOffset({ x: 0, y: 0 });
            }
            return !o;
          });
        }
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Draw the map when open (or when zoom/offset changes)
  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const W = c.width;
    const H = c.height;

    // Clear with dark forest background
    ctx.fillStyle = "#0a120a";
    ctx.fillRect(0, 0, W, H);

    // Apply zoom and offset transform
    ctx.save();
    ctx.translate(W / 2 + offset.x, H / 2 + offset.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);

    const cx = W / 2;
    const cy = H / 2;

    // World size (map shows full world)
    const worldSize = minimap.worldSize || 600;
    const scale = (W / worldSize) * 0.9; // slight margin

    // Subtle terrain noise pattern (procedural-looking)
    ctx.fillStyle = "rgba(40, 60, 35, 0.4)";
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = Math.random() * 30 + 10;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grid lines every 50m
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let i = -worldSize; i <= worldSize; i += 50) {
      const x = cx + i * scale;
      const y = cy + i * scale;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, H);
      ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.stroke();
    }

    // World border
    ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(cx - worldSize * scale / 2, cy - worldSize * scale / 2, worldSize * scale, worldSize * scale);
    ctx.setLineDash([]);

    // Helper: world coords -> canvas coords
    const toCanvas = (wx: number, wz: number) => ({
      x: cx + wx * scale,
      y: cy + wz * scale,
    });

    // Trees — small dark green dots
    ctx.fillStyle = "rgba(60, 130, 60, 0.7)";
    for (const t of minimap.trees) {
      const p = toCanvas(minimap.playerX + t.x, minimap.playerZ + t.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cave entrances — purple circles
    for (const cv of minimap.caveEntrances) {
      const p = toCanvas(minimap.playerX + cv.x, minimap.playerZ + cv.z);
      ctx.fillStyle = "rgba(20, 10, 30, 0.95)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(168, 85, 247, 0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Loot containers — yellow diamonds
    for (const l of minimap.loot) {
      const p = toCanvas(minimap.playerX + l.x, minimap.playerZ + l.z);
      ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 4);
      ctx.lineTo(p.x + 4, p.y);
      ctx.lineTo(p.x, p.y + 4);
      ctx.lineTo(p.x - 4, p.y);
      ctx.closePath();
      ctx.fill();
    }

    // Placed builds — colored squares
    for (const b of placed) {
      const def = BUILDS[b.kind];
      const hex = "#" + def.color.toString(16).padStart(6, "0");
      const p = toCanvas(b.worldX, b.worldZ);
      ctx.fillStyle = hex;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x - 3, p.y - 3, 6, 6);
    }

    // Animals — color-coded dots
    for (const a of minimap.animals) {
      const p = toCanvas(minimap.playerX + a.x, minimap.playerZ + a.z);
      let color = "#c8a064";
      let size = 3;
      if (a.kind === "bear") { color = "#b43c1e"; size = 5; }
      else if (a.kind === "boar") { color = "#785032"; size = 4; }
      else if (a.kind === "rabbit") { color = "#d2aa6e"; size = 2; }
      else if (a.kind === "wolf") { color = "#505050"; size = 3.5; }
      else if (a.kind === "deer") { color = "#c8a064"; size = 3; }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bots — red triangles
    for (const b of minimap.bots) {
      const p = toCanvas(minimap.playerX + b.x, minimap.playerZ + b.z);
      ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 5);
      ctx.lineTo(p.x + 4, p.y + 4);
      ctx.lineTo(p.x - 4, p.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Phase 11: Custom waypoint markers — 5-point stars with labels
    for (const wp of waypoints) {
      const p = toCanvas(wp.x, wp.z);
      // Pulsing outer ring
      const pulse = (Date.now() % 1500) / 1500;
      ctx.strokeStyle = wp.color + Math.floor((1 - pulse) * 200).toString(16).padStart(2, "0");
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10 + pulse * 8, 0, Math.PI * 2);
      ctx.stroke();
      // Star body
      ctx.fillStyle = wp.color;
      ctx.beginPath();
      const starR = 8;
      const innerR = 3.5;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? starR : innerR;
        const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const sx = p.x + Math.cos(ang) * r;
        const sy = p.y + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // White center
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      // Label
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      // Background pill
      const labelW = ctx.measureText(wp.label).width + 8;
      ctx.fillRect(p.x - labelW / 2, p.y + 12, labelW, 16);
      ctx.fillStyle = wp.color;
      ctx.fillText(wp.label, p.x, p.y + 14);
    }

    // Player — center arrow showing heading
    const pCanvas = toCanvas(minimap.playerX, minimap.playerZ);
    ctx.save();
    ctx.translate(pCanvas.x, pCanvas.y);
    ctx.rotate(minimap.playerYaw);
    ctx.fillStyle = "rgba(251, 191, 36, 1)";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Player pulse ring
    const pulse = (Date.now() % 2000) / 2000;
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.6 * (1 - pulse)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8 + pulse * 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Compass markers at edges (drawn in transformed space, but at fixed canvas edges)
    ctx.fillStyle = "rgba(251, 191, 36, 0.8)";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", cx, 14);
    ctx.fillText("S", cx, H - 14);
    ctx.fillText("W", 14, cy);
    ctx.fillText("E", W - 14, cy);

    ctx.restore(); // Undo zoom/pan transform
  }, [open, minimap, placed, zoom, offset, waypoints]);

  // Wheel handler for zoom
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1; // scroll up = zoom in
      setZoom((z) => {
        const next = delta > 0 ? Math.min(z * 1.15, 3.0) : Math.max(z / 1.15, 0.3);
        return Math.round(next * 100) / 100; // smooth rounding
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  // Mouse drag handler for panning (only when zoomed in > 1.2)
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      if (zoom <= 1.2) return;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startOffX: offset.x,
        startOffY: offset.y,
      };
      setIsDragging(true);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setOffset({
        x: dragRef.current.startOffX + dx,
        y: dragRef.current.startOffY + dy,
      });
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [open, zoom, offset, isDragging]);

  // Double-click to reset zoom
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const onDblClick = () => {
      resetZoom();
    };

    el.addEventListener("dblclick", onDblClick);
    return () => el.removeEventListener("dblclick", onDblClick);
  }, [open, resetZoom]);

  if (mode === "loading" || mode === "menu" || mode === "dead") return null;

  if (!open) {
    return (
      <div className="pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-black/55 px-2.5 py-1 rounded-full border border-white/15 text-[10px] text-white/65 font-mono backdrop-blur-sm flex items-center gap-1.5">
          <kbd className="bg-white/15 px-1 rounded text-[9px]">U</kbd>
          <span>Map</span>
        </div>
      </div>
    );
  }

  const hours = Math.floor(timeOfDay * 24);
  const mins = Math.floor((timeOfDay * 24 - hours) * 60);
  const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-lg border-2 border-amber-500/40 bg-zinc-900/95 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-zinc-800/80 to-zinc-900/80 px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <div className="text-amber-200 font-bold text-base tracking-wide">World Map</div>
              <div className="text-white/55 text-[11px] font-mono">
                Day {dayCount} · {timeStr} · {weather}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-white/55 bg-black/40 px-2 py-1 rounded border border-white/10">
              🏆 {unlockedAchievements.length} achievements
            </div>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white border border-white/15 transition-colors"
            >
              ✕ Close [U / Esc]
            </button>
          </div>
        </div>

        {/* Map canvas with zoom/pan */}
        <div
          ref={containerRef}
          className="relative bg-black flex items-center justify-center p-2"
          style={{ cursor: zoom > 1.2 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          <canvas
            ref={canvasRef}
            width={720}
            height={540}
            className="max-w-full max-h-[60vh] rounded border border-amber-500/20"
          />

          {/* Zoom indicator + controls (bottom-right of map area) */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-lg border border-white/15 px-2 py-1.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.3, Math.round((z / 1.15) * 100) / 100))}
              className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors"
              title="Zoom out"
            >
              −
            </button>
            <span className="text-[11px] text-amber-200 font-mono min-w-[36px] text-center">
              {zoom.toFixed(1)}x
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3.0, Math.round((z * 1.15) * 100) / 100))}
              className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={resetZoom}
              className="ml-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[9px] font-mono transition-colors"
              title="Reset zoom (double-click)"
            >
              ↺
            </button>
          </div>

          {/* Pan hint when zoomed in */}
          {zoom > 1.2 && (
            <div className="absolute top-4 right-4 text-[9px] text-white/50 bg-black/50 px-2 py-1 rounded border border-white/10 font-mono">
              Drag to pan · Dbl-click reset
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-black/40 px-4 py-2 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-white/70">
          <LegendItem color="bg-amber-400" label="You" />
          <LegendItem color="bg-red-500" label="Bot" />
          <LegendItem color="bg-purple-500" label="Cave" />
          <LegendItem color="bg-amber-300" label="Loot" />
          <LegendItem color="bg-emerald-600" label="Tree" />
          <LegendItem color="bg-orange-600" label="Bear" />
          <LegendItem color="bg-gray-500" label="Wolf" />
          <LegendItem color="bg-yellow-700" label="Build" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />
      <span>{label}</span>
    </div>
  );
}
