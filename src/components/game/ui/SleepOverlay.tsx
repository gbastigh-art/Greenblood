"use client";
// Sleep fade-to-black overlay.
// When the player uses a bed, the engine calls startSleep() which sets isSleeping=true.
// The engine then schedules finishSleep() after 2.6s which restores stats and sets
// isSleeping=false. This component purely renders based on isSleeping and uses CSS
// transitions for the fade effect — no internal timer state needed.
import { useGame } from "@/lib/game/store";

export function SleepOverlay() {
  const isSleeping = useGame((s) => s.isSleeping);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-700"
      style={{
        opacity: isSleeping ? 1 : 0,
        background: "radial-gradient(ellipse at center, rgba(20,20,30,0.95) 0%, rgba(0,0,0,1) 100%)",
        pointerEvents: isSleeping ? "auto" : "none",
      }}
    >
      {isSleeping && (
        <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.5s_ease-in]">
          <div className="relative">
            <span className="text-5xl">😴</span>
            {/* Floating z's */}
            <span className="absolute -top-2 -right-6 text-2xl text-white/80 font-bold animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1.6s" }}>z</span>
            <span className="absolute -top-6 -right-2 text-xl text-white/60 font-bold animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1.6s" }}>z</span>
            <span className="absolute -top-10 right-2 text-base text-white/40 font-bold animate-bounce" style={{ animationDelay: "600ms", animationDuration: "1.6s" }}>z</span>
          </div>
          <div className="text-white/70 text-sm font-mono tracking-wider">Sleeping...</div>
        </div>
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
