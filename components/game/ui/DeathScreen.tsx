"use client";
// Death screen — single "Main Menu" button.
// (Respawn / start-new-world options removed per user request. Game-progress
// saves are also disabled, so there is no save to reload.)
import { useGame } from "@/lib/game/store";

export function DeathScreen() {
  const mode = useGame((s) => s.mode);

  if (mode !== "dead") return null;

  function handleMainMenu() {
    // Tear down the engine and return to the StartMenu. Dispatched as a
    // CustomEvent so the Game component (which owns the engine lifecycle)
    // can dispose the Three.js renderer + scene and unmount the canvas.
    if (document.pointerLockElement) document.exitPointerLock();
    useGame.getState().setPaused(false);
    window.dispatchEvent(new CustomEvent("greenblood-quit-to-menu"));
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-rose-950/80 via-black/85 to-black/90 backdrop-blur-md flex items-center justify-center">
      {/* blood vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at center, transparent 30%, rgba(120,0,0,0.4) 100%)" }} />
      <div className="relative text-center max-w-md px-6">
        <div className="text-7xl mb-3 animate-pulse">💀</div>
        <h1 className="text-5xl font-black text-rose-500 mb-2 tracking-wider drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">YOU DIED</h1>
        <p className="text-white/65 mb-8 text-sm leading-relaxed">
          The wilderness claimed another survivor.
        </p>
        <button
          onClick={handleMainMenu}
          className="w-full max-w-sm px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-all shadow-lg hover:scale-105 flex items-center justify-center gap-2"
        >
          <span className="text-xl">🏠</span>
          MAIN MENU
        </button>
      </div>
    </div>
  );
}
