"use client";
// Loading screen shown while the engine initializes.
import { useGame } from "@/lib/game/store";

export function LoadingScreen() {
  const mode = useGame((s) => s.mode);
  if (mode !== "loading") return null;
  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🌲</div>
        <div className="text-2xl font-black text-white tracking-wider">GREENBLOOD</div>
        <div className="text-sm text-white/55 mt-1">Generating world…</div>
        <div className="mt-4 w-48 h-1 bg-white/10 rounded mx-auto overflow-hidden">
          <div className="h-full bg-amber-500 animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  );
}
